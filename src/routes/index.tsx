import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BuilderApp } from "@/components/builder/BuilderApp";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuizFunnel — Construtor de Funis de Quiz" },
      {
        name: "description",
        content:
          "Plataforma visual para criar funis de quiz interativos com lógica condicional, captura de leads e publicação.",
      },
      { property: "og:title", content: "QuizFunnel — Construtor de Funis" },
      {
        property: "og:description",
        content: "Crie quizzes com ramificações, captura de leads e exportação CSV.",
      },
    ],
  }),
  component: ProtectedBuilderRoute,
});

function ProtectedBuilderRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <BuilderApp />;
}
