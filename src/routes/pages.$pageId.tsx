import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState, useMemo } from "react";
import { usePageStore, buildStandaloneHtml } from "@/lib/page-store";
import { HtmlPage } from "@/components/pages/HtmlPage";
import { AddElementsPanel } from "@/components/pages/AddElementsPanel";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, Monitor, Tablet, Smartphone, Download, Eye, Loader2,
  RotateCcw, Link2, Check, Sparkles 
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pages/$pageId")({
  component: PageEditor,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  const page = usePageStore((s) => s.pages.find((p) => p.id === pageId));
  const updatePage = usePageStore((s) => s.updatePage);
  
  const [content, setContent] = useState<Record<string, string>>(page?.content ?? {});
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Auto-save overrides (debounced)
  useEffect(() => {
    if (!page) return;
    const t = setTimeout(() => {
      // Check if content actually changed to avoid loop
      if (JSON.stringify(page.content) !== JSON.stringify(content)) {
        updatePage(page.id, { content, updatedAt: Date.now() });
        setSavedAt(Date.now());
      }
    }, 400);
    return () => clearTimeout(t);
  }, [content, page, updatePage]);

  // Sync state if page changes externally
  useEffect(() => {
    if (page) {
      setContent(page.content);
    }
  }, [pageId]);

  if (loading) return <div className="h-screen grid place-items-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  if (!user) return null;
  if (!page) {
    return (
      <div className="h-screen grid place-items-center bg-zinc-950 text-zinc-400">
        <div className="text-center">
          <p className="mb-4">Página não encontrada.</p>
          <Link to="/pages" className="text-violet-400 underline">Voltar para listagem</Link>
        </div>
      </div>
    );
  }

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/p/${page.slug}`;

  const handleDownload = () => {
    const standaloneHtml = buildStandaloneHtml({ ...page, content });
    const blob = new Blob([standaloneHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${page.slug || "page"}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo HTML baixado com sucesso!");
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link público copiado!");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copie o link:", publicUrl);
    }
  };

  const handleReset = () => {
    if (!confirm("Restaurar conteúdo original da página? Todas as suas edições de textos e imagens nesta sessão serão perdidas.")) return;
    setContent({});
    updatePage(page.id, { content: {}, updatedAt: Date.now() });
    toast.success("Conteúdo restaurado!");
  };

  const handleAddElementHtml = (htmlSnippet: string) => {
    // Append the block to page's HTML
    updatePage(page.id, { 
      html: page.html + "\n" + htmlSnippet,
      updatedAt: Date.now() 
    });
    toast.success("Elemento adicionado! Role até o fim para ver.");
  };

  // Dimensions of viewport classes
  const viewportWidth = {
    desktop: "w-full",
    tablet: "w-[768px]",
    mobile: "w-[375px]",
  }[viewport];

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="h-14 border-b border-zinc-850 px-4 flex items-center justify-between shrink-0 bg-zinc-950/90 backdrop-blur z-40">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild size="sm" variant="ghost" className="text-zinc-400 hover:text-white hover:bg-zinc-900 shrink-0">
            <Link to="/pages"><ArrowLeft className="h-4 w-4 mr-1" /> Páginas</Link>
          </Button>
          <span className="text-zinc-850">|</span>
          <input
            className="bg-transparent text-sm font-semibold text-white px-2 py-1 rounded hover:bg-zinc-900 focus:bg-zinc-900 focus:outline-none truncate min-w-[150px] max-w-[300px]"
            value={page.name}
            onChange={(e) => updatePage(page.id, { name: e.target.value })}
            placeholder="Nome da página"
          />
          {savedAt && (
            <span className="text-[10px] text-zinc-500 hidden sm:inline-block">
              Salvo {new Date(savedAt).toLocaleTimeString("pt-BR")}
            </span>
          )}
        </div>

        {/* Viewport controls */}
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
          {[
            { v: "desktop" as const, I: Monitor, label: "Desktop" },
            { v: "tablet" as const, I: Tablet, label: "Tablet" },
            { v: "mobile" as const, I: Smartphone, label: "Celular" },
          ].map(({ v, I, label }) => (
            <button 
              key={v} 
              onClick={() => setViewport(v)} 
              title={label}
              className={`p-1.5 rounded transition-all ${viewport === v ? "bg-violet-650 text-white shadow" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <I className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Edit/Preview Toggle */}
          <div className="inline-flex rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs font-semibold mr-1.5">
            <button
              onClick={() => setMode("edit")}
              className={`px-3 py-1 rounded-md transition ${mode === "edit" ? "bg-violet-650 text-white" : "text-zinc-400 hover:text-white"}`}
            >Editar</button>
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1 rounded-md transition ${mode === "preview" ? "bg-violet-650 text-white" : "text-zinc-400 hover:text-white"}`}
            >Preview</button>
          </div>

          <Button size="sm" variant="outline" onClick={handleReset} className="border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white">
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden md:inline ml-1">Resetar</span>
          </Button>

          <Button size="sm" variant="outline" onClick={handleCopyLink} className="border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-900 hover:text-white">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
            <span className="hidden md:inline ml-1">{copied ? "Link Copiado" : "Copiar Link"}</span>
          </Button>

          <Button size="sm" onClick={handleDownload} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold shadow">
            <Download className="h-3.5 w-3.5 mr-1" /> Baixar HTML
          </Button>
        </div>
      </header>

      {/* Editing notice banner */}
      {mode === "edit" && (
        <div className="bg-violet-500/10 border-b border-violet-900/40 text-violet-300 text-xs px-4 py-1.5 text-center shrink-0">
          ✨ Clique em qualquer texto para editar · Clique nas imagens para alterar · Todas as mudanças são salvas automaticamente
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Left Elements Sidebar - visible in edit mode */}
        {mode === "edit" ? (
          <aside className="w-80 border-r border-zinc-850 bg-zinc-950 shrink-0">
            <AddElementsPanel onAdd={handleAddElementHtml} />
          </aside>
        ) : null}

        {/* Center Canvas */}
        <main className="flex-1 overflow-y-auto bg-zinc-900 flex justify-center p-4">
          <div className={`transition-all duration-300 ${viewportWidth} shadow-2xl h-fit border border-zinc-850 rounded-xl bg-white text-zinc-900 overflow-hidden`}>
            <HtmlPage
              html={page.html}
              content={content}
              editable={mode === "edit"}
              onChange={setContent}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
