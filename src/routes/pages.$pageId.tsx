import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { usePageStore } from "@/lib/page-store";
import { GrapesEditor } from "@/components/pages/GrapesEditor";
import { AiAssistantPanel } from "@/components/pages/AiAssistantPanel";
import { CloneUrlModal } from "@/components/pages/CloneUrlModal";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft, Download, Check, Link2, Loader2, Sparkles, Rocket
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pages/$pageId")({
  component: PageEditor,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const { user, loading } = useAuth();

  const page = usePageStore((s) => s.pages.find((p) => p.id === pageId));
  const updatePage = usePageStore((s) => s.updatePage);

  const [copied, setCopied] = useState(false);
  const [editorInstance, setEditorInstance] = useState<any>(null);
  const [showAi, setShowAi] = useState(false);

  if (loading) {
    return (
      <div className="h-screen grid place-items-center bg-zinc-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }
  if (!user) return null;
  if (!page) {
    return (
      <div className="h-screen grid place-items-center bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <p className="mb-4">Página não encontrada.</p>
          <Link to="/pages" className="text-violet-400 underline">
            Voltar para listagem
          </Link>
        </div>
      </div>
    );
  }

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${page.slug}`;

  const handleDownload = () => {
    const fullHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${page.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; }
    ${page.css || ""}
  </style>
</head>
<body>
  ${page.html || ""}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.slug || "page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("HTML baixado com sucesso!");
  };

  const handlePublish = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link público copiado e página publicada!");
      window.open(publicUrl, "_blank");
    } catch {
      window.open(publicUrl, "_blank");
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#09090b",
        color: "#e4e4e7",
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{
          height: "52px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid #27272a",
          background: "#09090b",
          flexShrink: 0,
          zIndex: 50,
          gap: "12px",
        }}
      >
        {/* Left: back + page name */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
          <Link
            to="/pages"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: "#71717a",
              fontSize: "13px",
              textDecoration: "none",
              padding: "4px 10px",
              borderRadius: "6px",
              transition: "all 0.15s",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#18181b";
              (e.currentTarget as HTMLAnchorElement).style.color = "#e4e4e7";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              (e.currentTarget as HTMLAnchorElement).style.color = "#71717a";
            }}
          >
            <ArrowLeft style={{ width: 14, height: 14 }} />
            Páginas
          </Link>

          <span style={{ color: "#3f3f46", userSelect: "none" }}>|</span>

          <input
            value={page.name}
            onChange={(e) => updatePage(page.id, { name: e.target.value })}
            placeholder="Nome da página"
            style={{
              background: "transparent",
              border: "none",
              outline: "none",
              color: "#e4e4e7",
              fontSize: "14px",
              fontWeight: 600,
              padding: "4px 8px",
              borderRadius: "6px",
              minWidth: "140px",
              maxWidth: "320px",
              cursor: "text",
            }}
            onFocus={(e) => (e.currentTarget.style.background = "#18181b")}
            onBlur={(e) => (e.currentTarget.style.background = "transparent")}
          />
        </div>

        {/* Right: actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          {editorInstance && <CloneUrlModal editor={editorInstance} />}

          <button
            onClick={() => setShowAi(!showAi)}
            title="Assistente IA"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: showAi ? "#8b5cf6" : "transparent",
              border: "1px solid",
              borderColor: showAi ? "#8b5cf6" : "#3f3f46",
              borderRadius: "8px",
              color: showAi ? "#fff" : "#a1a1aa",
              fontSize: "12px",
              fontWeight: 500,
              padding: "5px 12px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              if (!showAi) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#8b5cf6";
                (e.currentTarget as HTMLButtonElement).style.color = "#c4b5fd";
              }
            }}
            onMouseLeave={(e) => {
              if (!showAi) {
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#3f3f46";
                (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa";
              }
            }}
          >
            <Sparkles style={{ width: 13, height: 13 }} />
            IA
          </button>

          <button
            onClick={handlePublish}
            title="Publicar e Abrir Link"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#22c55e",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              padding: "5px 14px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#16a34a")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#22c55e")}
          >
            <Rocket style={{ width: 13, height: 13 }} />
            Publicar
          </button>

          <button
            onClick={handleDownload}
            title="Baixar HTML"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "#7c3aed",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontSize: "12px",
              fontWeight: 600,
              padding: "5px 14px",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#6d28d9")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = "#7c3aed")}
          >
            <Download style={{ width: 13, height: 13 }} />
            Baixar HTML
          </button>
        </div>
      </header>

      {/* ── Main Content (AI Sidebar + Editor) ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex" }}>
        {showAi && editorInstance && (
          <AiAssistantPanel editor={editorInstance} onClose={() => setShowAi(false)} />
        )}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <GrapesEditor pageId={pageId} onEditorInit={setEditorInstance} />
        </div>
      </div>
    </div>
  );
}
