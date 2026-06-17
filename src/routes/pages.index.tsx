import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { usePageStore } from "@/lib/page-store";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy, Edit3, LayoutGrid, ArrowLeft, Loader2, FileText } from "lucide-react";
import { NewPageModal } from "@/components/pages/NewPageModal";
import { toast } from "sonner";

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

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  if (loading) return <div className="h-screen grid place-items-center bg-zinc-950"><Loader2 className="h-8 w-8 animate-spin text-violet-500" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="h-14 border-b border-zinc-800 px-6 flex items-center justify-between sticky top-0 bg-zinc-950/90 backdrop-blur z-40">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
          <span className="text-zinc-700">|</span>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center"><FileText className="h-3.5 w-3.5 text-white" /></div>
            <span className="font-bold text-sm">Páginas</span>
          </div>
        </div>
        <Button onClick={() => setOpen(true)} size="sm" className="bg-violet-600 hover:bg-violet-700 text-white"><Plus className="h-4 w-4 mr-1" />Nova página</Button>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {pages.length === 0 ? (
          <div className="text-center py-24">
            <div className="h-20 w-20 mx-auto rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center mb-4"><FileText className="h-9 w-9 text-violet-500" /></div>
            <h2 className="text-lg font-semibold mb-1">Nenhuma página ainda</h2>
            <p className="text-sm text-zinc-400 mb-5">Crie em branco, gere com IA ou cole um HTML existente.</p>
            <Button onClick={() => setOpen(true)} className="bg-violet-600 hover:bg-violet-700 text-white"><Plus className="h-4 w-4 mr-1" />Criar página</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <button onClick={() => setOpen(true)} className="h-[180px] rounded-2xl border-2 border-dashed border-zinc-800 hover:border-violet-500/50 grid place-items-center text-zinc-500 hover:text-violet-400">
              <div className="text-center"><Plus className="h-6 w-6 mx-auto mb-1" /><span className="text-sm">Nova página</span></div>
            </button>
            {pages.map((p) => (
              <div key={p.id} className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 flex flex-col">
                <div className="flex-1">
                  <h3 className="font-semibold text-white truncate">{p.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1">{p.blocks.length} blocos</p>
                </div>
                <div className="flex gap-1 mt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate({ to: "/pages/$pageId", params: { pageId: p.id } })}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { duplicatePage(p.id); toast.success("Duplicada"); }}><Copy className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => { if (confirm("Excluir página?")) deletePage(p.id); }}><Trash2 className="h-3.5 w-3.5 text-red-400" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <NewPageModal open={open} onClose={() => setOpen(false)} onCreate={(init) => {
        const id = createPage(init);
        navigate({ to: "/pages/$pageId", params: { pageId: id } });
      }} />
    </div>
  );
}
