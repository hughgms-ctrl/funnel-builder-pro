import { useState, useEffect } from "react";

export interface User {
  id: string;
  email: string;
  role: "admin";
}

const SESSION_KEY = "quiz_funnel_session";

// ─── Credentials (single-admin tool) ─────────────────────────────────────────
// Login sempre funciona por credenciais locais — não depende do Supabase Auth.
// O Supabase é usado apenas para armazenamento de dados (funnels, leads).
const ADMIN_CREDENTIALS: Array<{ email: string; password: string }> = [
  { email: "hugo-gms@hotmail.com", password: "Hugo@81157087" },
  { email: "admin@quizfunnel.com", password: "Admin@2025!" },
];

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const login = async (
    email: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> => {
    const match = ADMIN_CREDENTIALS.find(
      (c) =>
        c.email.toLowerCase() === email.toLowerCase().trim() &&
        c.password === password,
    );

    if (match) {
      const user: User = {
        id: `admin-${email.split("@")[0]}`,
        email: email.toLowerCase().trim(),
        role: "admin",
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      setUser(user);
      return { success: true };
    }

    return {
      success: false,
      error: "Email ou senha incorretos. Verifique suas credenciais.",
    };
  };

  const logout = () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
  };

  return { user, loading, login, logout };
}
