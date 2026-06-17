import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { usePageStore } from "@/lib/page-store";
import { findBlock, buildDocument } from "@/lib/page-html";
import { CanvasFrame } from "@/components/pages/CanvasFrame";
import { BlockPalette } from "@/components/pages/BlockPalette";
import { LayersTree } from "@/components/pages/LayersTree";
import { PropsPanel } from "@/components/pages/PropsPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Monitor, Tablet, Smartphone, Download, Eye, Loader2 } from "lucide-react";

export const Route = createFileRoute("/pages/$pageId")({
  component: PageEditor,
});

function PageEditor() {
  const { pageId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const page = usePageStore((s) => s.pages.find((p) => p.id === pageId));
  const addBlock = usePageStore((s) => s.addBlock);
  const patchBlock = usePageStore((s) => s.patchBlock);
  const removeBlock = usePageStore((s) => s.removeBlock);
  const reorderBlock = usePageStore((s) => s.reorderBlock);
  const updatePage = usePageStore((s) => s.updatePage);
  const selectedId = usePageStore((s) => s.selectedBlockId);
  const selectBlock = usePageStore((s) => s.selectBlock);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [showCss, setShowCss] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);
  useEffect(() => () => selectBlock(null), [selectBlock]);

  if (loading) return <div className="h-screen grid place-items-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  if (!user) return null;
  if (!page) return <div className="h-screen grid place-items-center bg-zinc-950 text-zinc-400">Página não encontrada. <Link to="/pages" className="text-violet-400 ml-2">Voltar</Link></div>;

  const selected = selectedId ? findBlock(page.blocks, selectedId) : null;

  const handleExport = () => {
    const doc = buildDocument(page.blocks, page.css, { title: page.meta.title });
    const blob = new Blob([doc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${page.slug || "page"}.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const handlePreview = () => {
    const doc = buildDocument(page.blocks, page.css, { title: page.meta.title });
    const w = window.open("", "_blank");
    if (w) { w.document.write(doc); w.document.close(); }
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100">
      <header className="h-12 border-b border-zinc-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/pages" className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" />Páginas</Link>
          <span className="text-zinc-700">|</span>
          <input
            className="bg-transparent text-sm font-semibold text-white px-2 py-1 rounded hover:bg-zinc-800 focus:bg-zinc-800 focus:outline-none"
            value={page.name}
            onChange={(e) => updatePage(page.id, { name: e.target.value })}
          />
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 rounded-lg p-0.5">
          {[
            { v: "desktop" as const, I: Monitor },
            { v: "tablet" as const, I: Tablet },
            { v: "mobile" as const, I: Smartphone },
          ].map(({ v, I }) => (
            <button key={v} onClick={() => setViewport(v)} className={`p-1.5 rounded ${viewport === v ? "bg-violet-500/20 text-violet-300" : "text-zinc-500"}`}>
              <I className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowCss(!showCss)}>CSS</Button>
          <Button size="sm" variant="outline" onClick={handlePreview}><Eye className="h-3.5 w-3.5 mr-1" />Preview</Button>
          <Button size="sm" onClick={handleExport} className="bg-violet-600 hover:bg-violet-700 text-white"><Download className="h-3.5 w-3.5 mr-1" />Exportar</Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: layers + palette */}
        <aside className="w-64 border-r border-zinc-800 bg-zinc-950 flex flex-col">
          <div className="p-3 border-b border-zinc-800">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-2">Camadas</div>
            <LayersTree
              blocks={page.blocks}
              selectedId={selectedId}
              onSelect={selectBlock}
              onDelete={(id) => removeBlock(page.id, id)}
              onMove={(id, dir) => reorderBlock(page.id, id, dir)}
            />
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold mb-2">Adicionar bloco</div>
            <BlockPalette onAdd={(b) => addBlock(page.id, b, null)} />
          </div>
        </aside>

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          {showCss && (
            <div className="border-b border-zinc-800 p-2 bg-zinc-900">
              <textarea
                className="w-full bg-zinc-950 border border-zinc-800 rounded p-2 text-xs font-mono text-zinc-300"
                rows={6}
                value={page.css}
                onChange={(e) => updatePage(page.id, { css: e.target.value })}
                placeholder="/* CSS global da página */"
              />
            </div>
          )}
          <CanvasFrame blocks={page.blocks} css={page.css} selectedId={selectedId} onSelect={selectBlock} viewport={viewport} />
        </div>

        {/* Right: props */}
        <aside className="w-72 border-l border-zinc-800 bg-zinc-950">
          <PropsPanel block={selected} onChange={(patch) => selectedId && patchBlock(page.id, selectedId, patch)} />
        </aside>
      </div>
    </div>
  );
}
