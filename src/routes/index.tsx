import { createFileRoute } from "@tanstack/react-router";
import { BuilderApp } from "@/components/builder/BuilderApp";

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
  component: BuilderApp,
});
