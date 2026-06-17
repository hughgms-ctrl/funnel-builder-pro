import { useState } from "react";
import { fetchAndCloneUrl } from "@/lib/api/ai.functions";
import * as Dialog from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Link2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export function CloneUrlModal({ editor }: { editor: any }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleClone = async () => {
    if (!url) return;
    setLoading(true);
    try {
      const result = await fetchAndCloneUrl({ data: { url } });
      if (result.success && result.html) {
        editor.setComponents(result.html);
        if (result.css) {
          editor.setStyle(result.css);
        }
        toast.success("Página importada com sucesso!");
        setOpen(false);
      } else {
        toast.error(result.error || "Falha ao importar.");
      }
    } catch (e: any) {
      toast.error("Erro na clonagem: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          title="Importar de URL"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            background: "transparent",
            border: "1px solid #3f3f46",
            borderRadius: "8px",
            color: "#a1a1aa",
            fontSize: "12px",
            fontWeight: 500,
            padding: "5px 12px",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#8b5cf6";
            (e.currentTarget as HTMLButtonElement).style.color = "#c4b5fd";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = "#3f3f46";
            (e.currentTarget as HTMLButtonElement).style.color = "#a1a1aa";
          }}
        >
          <Link2 style={{ width: 13, height: 13 }} />
          Clonar URL
        </button>
      </Dialog.Trigger>
      
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2 bg-zinc-950 border border-zinc-800 rounded-xl p-6 shadow-2xl z-[101] text-zinc-100">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-bold">Clonar Página via URL</Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-zinc-500 hover:text-zinc-300"><X className="h-5 w-5" /></button>
            </Dialog.Close>
          </div>
          
          <Dialog.Description className="text-sm text-zinc-400 mb-6">
            Cole a URL de um site estático. Extrairemos o HTML e os estilos básicos (sem JS dinâmico) direto para o editor GrapesJS.
          </Dialog.Description>
          
          <div className="space-y-4">
            <input 
              type="url"
              placeholder="https://exemplo.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
            />
            
            <div className="flex justify-end gap-3 pt-2">
              <Dialog.Close asChild>
                <Button variant="ghost" className="text-zinc-400 hover:text-white">Cancelar</Button>
              </Dialog.Close>
              <Button 
                onClick={handleClone} 
                disabled={loading || !url}
                className="bg-violet-600 hover:bg-violet-700 text-white min-w-[120px]"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
                Importar Site
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
