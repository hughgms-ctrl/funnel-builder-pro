import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BuilderApp } from "@/components/builder/BuilderApp";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/builder")({
  head: () => ({
    meta: [
      { title: "Editor de Funil — QuizFunnel" },
      { name: "description", content: "Editor visual de funil de quiz" },
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

  if (!user) return null;

  return <BuilderApp />;
}
