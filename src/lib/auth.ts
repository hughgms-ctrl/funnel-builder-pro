import { useState, useEffect } from "react";
import { getActiveSupabaseClient } from "./supabase";

export interface User {
  id: string;
  email: string;
  role: "admin";
}

// Check if a session exists in localStorage for mock auth
const MOCK_SESSION_KEY = "quiz_funnel_mock_session";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = getActiveSupabaseClient();
    
    if (!client) {
      // Offline/Mock Dev Mode
      const storedUser = localStorage.getItem(MOCK_SESSION_KEY);
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser(null);
        }
      }
      setLoading(false);
      return;
    }

    // Supabase Auth Mode
    const checkSession = async () => {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || "",
            role: "admin",
          });
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("Erro ao carregar sessão do Supabase:", err);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          role: "admin",
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const client = getActiveSupabaseClient();
    
    if (!client) {
      // Mock login for developer Hugo
      if (email.toLowerCase() === "hugo-gms@hotmail.com" && password === "Hugo@81157087") {
        const mockUser: User = {
          id: "mock-hugo",
          email: "hugo-gms@hotmail.com",
          role: "admin",
        };
        localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(mockUser));
        setUser(mockUser);
        return { success: true };
      } else {
        return { success: false, error: "Credenciais de desenvolvimento incorretas (Use hugo-gms@hotmail.com / Hugo@81157087)" };
      }
    }

    // Real Supabase login
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return { success: false, error: error.message };
      }
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || "",
          role: "admin",
        });
        return { success: true };
      }
      return { success: false, error: "Nenhum usuário retornado." };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Erro inesperado ao autenticar" };
    }
  };

  const logout = async () => {
    const client = getActiveSupabaseClient();
    if (client) {
      await client.auth.signOut();
    } else {
      localStorage.removeItem(MOCK_SESSION_KEY);
    }
    setUser(null);
  };

  return { user, loading, login, logout };
}
