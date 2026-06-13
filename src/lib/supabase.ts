import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Funnel } from "./types";
import type { Lead } from "./store";
import { useFunnelStore } from "./store";

let _client: SupabaseClient | null = null;
let _currentUrl: string | null = null;

export function getSupabaseClient(url?: string, anonKey?: string): SupabaseClient | null {
  const finalUrl = url || import.meta.env.VITE_SUPABASE_URL || useFunnelStore.getState()?.supabaseConfig?.url;
  const finalKey = anonKey || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || useFunnelStore.getState()?.supabaseConfig?.anonKey;

  if (!finalUrl || !finalKey) {
    return null;
  }

  if (_client && _currentUrl === finalUrl) {
    return _client;
  }

  _client = createClient(finalUrl, finalKey);
  _currentUrl = finalUrl;
  return _client;
}

export function getActiveSupabaseClient(): SupabaseClient | null {
  return getSupabaseClient();
}

// SQL to create required tables
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS public.funnels (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leads (
  id TEXT PRIMARY KEY,
  funnel_id TEXT NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clone_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  progress INTEGER NOT NULL DEFAULT 0,
  message TEXT,
  screenshots JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
`;

export async function testSupabaseConnection(url?: string, anonKey?: string): Promise<boolean> {
  try {
    const client = getSupabaseClient(url, anonKey);
    if (!client) return false;
    const { error } = await client.from("funnels").select("id").limit(1);
    // If table doesn't exist, that's ok — we'll create it
    return !error || error.code === "42P01"; // 42P01 = table not found (acceptable)
  } catch {
    return false;
  }
}

export async function ensureSchema(url?: string, anonKey?: string): Promise<void> {
  const client = getSupabaseClient(url, anonKey);
  if (!client) return;
  // Try to create tables via rpc exec_sql if available, otherwise skip
  try {
    await client.rpc("exec_sql", { sql: SCHEMA_SQL });
  } catch {
    // Silently fail — user may need to run SQL manually
  }
}

export async function saveFunnelToSupabase(
  funnel: Funnel,
  url?: string,
  anonKey?: string,
): Promise<void> {
  const client = getSupabaseClient(url, anonKey);
  if (!client) throw new Error("Supabase não configurado");
  const { error } = await client.from("funnels").upsert({
    id: funnel.id,
    name: funnel.name,
    data: funnel,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function loadFunnelFromSupabase(
  funnelId: string,
  url?: string,
  anonKey?: string,
): Promise<Funnel | null> {
  const client = getSupabaseClient(url, anonKey);
  if (!client) return null;
  const { data, error } = await client
    .from("funnels")
    .select("data")
    .eq("id", funnelId)
    .single();
  if (error || !data) return null;
  return data.data as Funnel;
}

export async function listFunnelsFromSupabase(
  url?: string,
  anonKey?: string,
): Promise<{ id: string; name: string; updated_at: string }[]> {
  const client = getSupabaseClient(url, anonKey);
  if (!client) return [];
  const { data, error } = await client
    .from("funnels")
    .select("id, name, updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return data;
}

export async function saveLeadToSupabase(
  funnelId: string,
  lead: Lead,
  url?: string,
  anonKey?: string,
): Promise<void> {
  const client = getSupabaseClient(url, anonKey);
  if (!client) throw new Error("Supabase não configurado");
  const { error } = await client.from("leads").upsert({
    id: lead.id,
    funnel_id: funnelId,
    answers: lead.answers,
    created_at: new Date(lead.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function loadLeadsFromSupabase(
  funnelId: string,
  url?: string,
  anonKey?: string,
): Promise<Lead[]> {
  const client = getSupabaseClient(url, anonKey);
  if (!client) return [];
  const { data, error } = await client
    .from("leads")
    .select("*")
    .eq("funnel_id", funnelId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    createdAt: new Date(row.created_at).getTime(),
    answers: row.answers,
  }));
}

export const SUPABASE_SCHEMA_SQL = SCHEMA_SQL;
