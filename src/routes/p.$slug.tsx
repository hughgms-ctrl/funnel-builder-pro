import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { usePageStore } from "@/lib/page-store";
import { HtmlPage } from "@/components/pages/HtmlPage";
import type { Page } from "@/lib/page-types";

export const Route = createFileRoute("/p/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: params.slug },
      { property: "og:title", content: params.slug },
    ],
  }),
  component: PublicPage,
});

function PublicPage() {
  const { slug } = Route.useParams();
  const [page, setPage] = useState<Page | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Find page by slug from client-side page store
    const found = usePageStore.getState().pages.find((p) => p.slug === slug);
    setPage(found);
    setHydrated(true);

    const unsub = usePageStore.subscribe((state) => {
      const updated = state.pages.find((p) => p.slug === slug);
      setPage(updated);
    });
    return () => unsub();
  }, [slug]);

  if (!hydrated) return null;

  if (!page) {
    return (
      <div className="min-h-screen grid place-items-center bg-zinc-950 text-zinc-400 font-sans">
        <div className="text-center max-w-md p-8 border border-zinc-900 rounded-2xl bg-zinc-900/40">
          <h1 className="text-xl font-semibold text-white mb-2">Página não encontrada</h1>
          <p className="text-xs text-zinc-500 mb-6">
            Esta página só existe localmente neste navegador. Para publicá-la em outros dispositivos ou na web, baixe o HTML no editor e hospede-o.
          </p>
          <Link to="/pages" className="text-violet-400 hover:text-violet-300 underline text-xs">Voltar ao painel</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <HtmlPage html={page.html} content={page.content} editable={false} />
    </div>
  );
}
