import { getActiveSupabaseClient } from "@/lib/supabase";

const SYSTEM_PROMPT = `Você é um gerador de páginas web para um editor visual estilo Framer.
Sua tarefa é criar HTML e CSS modular que possa ser convertido em camadas editáveis no canvas.

Regras:
- Use HTML5 semântico (header, main, section, footer).
- Estruture o layout em blocos independentes com classes descritivas.
- NÃO use estilos inline. Crie classes e organize o CSS separado.
- Cada bloco deve ser modular e independente (hero, conteúdo, call-to-action, footer).
- O CSS deve ser simples e desacoplado, sem frameworks externos.
- Responda APENAS com JSON válido no formato { "html": "...", "css": "..." } sem markdown.

Estrutura mínima:
1. Cabeçalho com logo e menu.
2. Seção hero com título, subtítulo e botão.
3. Área de conteúdo (texto e imagens).
4. Rodapé simples com links.`;

export async function generatePageWithAI(prompt: string): Promise<{ html: string; css: string }> {
  // Try to use Supabase Edge Function (page-generator) if available
  const supabase = getActiveSupabaseClient();
  
  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke("page-generator", {
        body: { prompt },
      });
      if (!error && data?.html) {
        return { html: data.html ?? "", css: data.css ?? "" };
      }
    } catch {
      // Fall through to direct AI Gateway call
    }
  }

  // Fallback: call AI Gateway directly with the anon key
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase não configurado. Configure nas Configurações do painel.");
  }

  const res = await fetch(`${supabaseUrl}/functions/v1/page-generator`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseKey}`,
      apikey: supabaseKey,
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    // If the edge function doesn't exist yet, call the AI gateway directly
    // using the funnel-analyzer pattern (which we know works)
    const res2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res2.ok) {
      const t = await res2.text();
      throw new Error(`AI Gateway ${res2.status}: ${t.slice(0, 200)}`);
    }

    const j = await res2.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { html?: string; css?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    return { html: parsed.html ?? "", css: parsed.css ?? "" };
  }

  const j = await res.json();
  return { html: j.html ?? "", css: j.css ?? "" };
}
