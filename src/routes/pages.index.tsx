import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { usePageStore } from "@/lib/page-store";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, Edit3, ArrowLeft, Loader2, FileText, Eye, ExternalLink } from "lucide-react";
import { NewPageModal } from "@/components/pages/NewPageModal";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/pages/")({
  head: () => ({ meta: [{ title: "Páginas — QuizFunnel" }] }),
  component: PagesList,
});

function PagesList() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const pages = usePageStore((s) => s.pages);
  const createPage = usePageStore((s) => s.createPage);
  const deletePage = usePageStore((s) => s.deletePage);
  const duplicatePage = usePageStore((s) => s.duplicatePage);
  const [open, setOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  if (loading) return <div className="h-screen grid place-items-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  if (!user) return null;

  const targetPage = pages.find((p) => p.id === deleteConfirmId);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="h-14 border-b border-zinc-850 px-6 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-40">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
          <span className="text-zinc-800">|</span>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center"><FileText className="h-3.5 w-3.5 text-white" /></div>
            <span className="font-bold text-sm">Páginas</span>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white font-medium"><Plus className="h-4 w-4 mr-1" />Nova página</Button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">Minhas Páginas</h1>
          <p className="text-zinc-400 mt-1.5 text-sm">
            Cole ou gere com IA landing pages completas e edite textos e imagens em tempo real. Exportáveis com um único clique.
          </p>
        </div>

        {pages.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center mb-4"><FileText className="h-9 w-9 text-violet-500" /></div>
            <h2 className="text-lg font-semibold mb-1">Nenhuma página criada</h2>
            <p className="text-sm text-zinc-400 mb-6">Crie uma nova em branco, gere com IA ou cole um HTML existente.</p>
            <Button onClick={() => setOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"><Plus className="h-4 w-4 mr-1" />Criar primeira página</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <button onClick={() => setOpen(true)} className="h-[280px] rounded-2xl border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-900/10 hover:bg-violet-950/5 grid place-items-center text-zinc-500 hover:text-violet-400 transition group">
              <div className="text-center"><Plus className="h-8 w-8 mx-auto mb-2 text-zinc-600 group-hover:text-violet-400 transition" /><span className="text-sm font-medium">Criar nova página</span></div>
            </button>
            {pages.map((p) => {
              const previewDoc = `<!doctype html><html><head><base target="_blank"><style>html,body{margin:0;padding:0;overflow:hidden;}::-webkit-scrollbar{display:none;}</style></head><body>${p.html}</body></html>`;
              return (
                <div key={p.id} className="group rounded-2xl border border-zinc-850 bg-zinc-900/50 hover:border-violet-500/30 transition overflow-hidden flex flex-col shadow-lg">
                  <Link
                    to="/p/$slug"
                    params={{ slug: p.slug }}
                    target="_blank"
                    className="aspect-[16/10] bg-zinc-950 border-b border-zinc-850 overflow-hidden relative block"
                  >
                    <div className="absolute inset-0 origin-top-left scale-[0.32] pointer-events-none w-[312%] h-[312%]">
                      <iframe
                        title={p.name}
                        srcDoc={previewDoc}
                        className="w-full h-full border-0 pointer-events-none"
                        sandbox="allow-same-origin"
                      />
                    </div>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity grid place-items-center">
                      <div className="h-9 w-9 rounded-full bg-violet-600 grid place-items-center text-white"><Eye className="size-4" /></div>
                    </div>
                  </Link>
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-semibold text-white truncate text-sm" title={p.name}>{p.name}</h3>
                      <p className="text-[11px] text-zinc-500 mt-1 truncate">/p/{p.slug}</p>
                    </div>
                    <div className="mt-4">
                      <div className="flex gap-1.5">
                        <Button size="sm" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-medium" onClick={() => navigate({ to: "/pages/$pageId", params: { pageId: p.id } })}>
                          <Edit3 className="h-3.5 w-3.5 mr-1" />Editar
                        </Button>
                        <Button size="icon" variant="outline" className="border-zinc-800 bg-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800" onClick={() => { duplicatePage(p.id); toast.success("Página duplicada!"); }}><Copy className="h-3.5 w-3.5" /></Button>
                        <Button size="icon" variant="outline" className="border-zinc-800 bg-transparent text-zinc-400 hover:text-red-400 hover:bg-red-950/20 hover:border-red-900/30" onClick={() => setDeleteConfirmId(p.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <NewPageModal open={open} onClose={() => setOpen(false)} onCreate={(init) => {
        const id = createPage(init);
        navigate({ to: "/pages/$pageId", params: { pageId: id } });
      }} />

      <Dialog open={!!deleteConfirmId} onOpenChange={(v) => !v && setDeleteConfirmId(null)}>
        <DialogContent className="bg-zinc-900 border border-zinc-800 text-zinc-100 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Excluir página</DialogTitle>
            <DialogDescription className="text-zinc-400 text-xs mt-1.5">
              Tem certeza que deseja excluir "{targetPage?.name}"? Esta ação removerá os dados do navegador e não poderá ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button variant="outline" className="border-zinc-800 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button
              className="bg-red-650 hover:bg-red-600 text-white"
              onClick={() => {
                if (deleteConfirmId) {
                  deletePage(deleteConfirmId);
                  toast.success("Página excluída");
                  setDeleteConfirmId(null);
                }
              }}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
