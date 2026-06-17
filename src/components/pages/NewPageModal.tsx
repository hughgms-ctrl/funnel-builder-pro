import { useState } from "react";
import { Sparkles, FileCode, FilePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { generatePageWithAI } from "@/lib/api/page-generator.functions";
import { htmlToBlocks } from "@/lib/page-html";
import type { Page } from "@/lib/page-types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: (init: Partial<Page>) => void;
}

export function NewPageModal({ open, onClose, onCreate }: Props) {
  const [mode, setMode] = useState<"blank" | "ai" | "paste">("blank");
  const [name, setName] = useState("Nova página");
  const [prompt, setPrompt] = useState("");
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");
  const [busy, setBusy] = useState(false);
  const gen = useServerFn(generatePageWithAI);

  if (!open) return null;

  const submit = async () => {
    try {
      setBusy(true);
      if (mode === "blank") {
        onCreate({ name });
      } else if (mode === "ai") {
        if (!prompt.trim()) { toast.error("Descreva a página"); return; }
        const r = await gen({ data: { prompt } });
        const blocks = htmlToBlocks(r.html || "");
        onCreate({ name, blocks, css: r.css || "" });
        toast.success("Página gerada!");
      } else {
        const blocks = htmlToBlocks(html || "");
        onCreate({ name, blocks, css });
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro");
    } finally {
      setBusy(false);
    }
  };

  const Tab = ({ id, icon: Icon, label }: any) => (
    <button onClick={() => setMode(id)} className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg ${mode === id ? "bg-violet-500/15 text-violet-300 border border-violet-500/30" : "text-zinc-400 hover:text-zinc-200"}`}>
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );
  const input = "w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white">Nova página</h3>
          <button onClick={onClose}><X className="h-4 w-4 text-zinc-400" /></button>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex gap-2">
            <Tab id="blank" icon={FilePlus} label="Em branco" />
            <Tab id="ai" icon={Sparkles} label="Gerar com IA" />
            <Tab id="paste" icon={FileCode} label="Colar HTML" />
          </div>
          <div>
            <label className="text-xs text-zinc-400">Nome</label>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {mode === "ai" && (
            <div>
              <label className="text-xs text-zinc-400">Descreva a página</label>
              <textarea className={input} rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex: landing page para curso de inglês com hero, depoimentos e CTA." />
            </div>
          )}
          {mode === "paste" && (
            <>
              <div>
                <label className="text-xs text-zinc-400">HTML</label>
                <textarea className={input + " font-mono"} rows={6} value={html} onChange={(e) => setHtml(e.target.value)} placeholder="<header>...</header>" />
              </div>
              <div>
                <label className="text-xs text-zinc-400">CSS (opcional)</label>
                <textarea className={input + " font-mono"} rows={4} value={css} onChange={(e) => setCss(e.target.value)} placeholder=".hero { ... }" />
              </div>
            </>
          )}
        </div>
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={busy} className="bg-violet-600 hover:bg-violet-700 text-white">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
          </Button>
        </div>
      </div>
    </div>
  );
}
