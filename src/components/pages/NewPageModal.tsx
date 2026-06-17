import { useState } from "react";
import { Sparkles, FileCode, FilePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generatePageWithAI } from "@/lib/api/page-generator.client";
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

  if (!open) return null;

  const submit = async () => {
    try {
      setBusy(true);
      if (mode === "blank") {
        onCreate({ name });
      } else if (mode === "ai") {
        if (!prompt.trim()) { toast.error("Descreva a página"); return; }
        const r = await generatePageWithAI(prompt.trim());
        const blocks = htmlToBlocks(r.html || "");
        onCreate({ name, blocks, css: r.css || "" });
        toast.success("Página gerada!");
      } else {
        const blocks = htmlToBlocks(html || "");
        onCreate({ name, blocks, css });
      }
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar página");
    } finally {
      setBusy(false);
    }
  };

  const Tab = ({ id, icon: Icon, label }: { id: "blank" | "ai" | "paste"; icon: any; label: string }) => (
    <button
      onClick={() => setMode(id)}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold rounded-lg transition-colors ${
        mode === id
          ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
          : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />{label}
    </button>
  );

  const inputCls = "w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-violet-500 placeholder:text-zinc-500";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-semibold text-white">Nova página</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-2">
            <Tab id="blank" icon={FilePlus} label="Em branco" />
            <Tab id="ai" icon={Sparkles} label="Gerar com IA" />
            <Tab id="paste" icon={FileCode} label="Colar HTML" />
          </div>

          {/* Name field */}
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Nome da página</label>
            <input
              className={inputCls}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Landing Page Principal"
            />
          </div>

          {/* AI mode */}
          {mode === "ai" && (
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Descreva a página</label>
              <textarea
                className={inputCls}
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Ex: Landing page para curso de inglês com hero moderno, seção de depoimentos, benefícios e CTA. Cores azul e branco."
              />
              <p className="text-[11px] text-zinc-500 mt-1.5">
                ✨ A IA vai gerar o HTML e CSS da página pronta para editar.
              </p>
            </div>
          )}

          {/* Paste HTML mode */}
          {mode === "paste" && (
            <>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">HTML</label>
                <textarea
                  className={inputCls + " font-mono text-xs"}
                  rows={7}
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  placeholder={"<header>\n  <h1>Minha Página</h1>\n</header>\n<main>\n  ...\n</main>"}
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">CSS (opcional)</label>
                <textarea
                  className={inputCls + " font-mono text-xs"}
                  rows={4}
                  value={css}
                  onChange={(e) => setCss(e.target.value)}
                  placeholder={"h1 { font-size: 2rem; color: #111; }\n.hero { background: #f0f4ff; }"}
                />
              </div>
            </>
          )}

          {/* Blank mode hint */}
          {mode === "blank" && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-4 text-center">
              <FilePlus className="h-8 w-8 text-zinc-600 mx-auto mb-2" />
              <p className="text-sm text-zinc-400">
                Uma página em branco será criada. Use a paleta de blocos para adicionar elementos.
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
          <Button
            onClick={submit}
            disabled={busy}
            className="bg-violet-600 hover:bg-violet-700 text-white min-w-[90px]"
          >
            {busy ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {mode === "ai" ? "Gerando..." : "Criando..."}
              </span>
            ) : (
              "Criar"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
