import { useState, useEffect, useRef } from "react";
import { askGeminiToEditHtml } from "@/lib/api/ai.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Send, Wand2, X } from "lucide-react";
import { toast } from "sonner";

export function AiAssistantPanel({ 
  editor,
  onClose 
}: { 
  editor: any;
  onClose: () => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<any>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Track selection in GrapesJS
  useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const selected = editor.getSelected();
      setSelectedComponent(selected);
    };

    editor.on("component:selected", updateSelection);
    editor.on("component:deselected", updateSelection);
    
    updateSelection();

    return () => {
      editor.off("component:selected", updateSelection);
      editor.off("component:deselected", updateSelection);
    };
  }, [editor]);

  const handleAskAi = async () => {
    if (!prompt.trim() || !editor) return;
    
    // Determine what to edit: the selected component, or the whole page
    const target = selectedComponent || editor.getWrapper();
    
    const htmlToEdit = target.toHTML();
    const cssToEdit = editor.getCss({ component: target });

    setLoading(true);
    const userPrompt = prompt;
    setPrompt(""); // clear input early for UX

    try {
      const result = await askGeminiToEditHtml({
        data: {
          prompt: userPrompt,
          html: htmlToEdit,
          css: cssToEdit
        }
      });

      if (result.success && result.code) {
        // We get back new HTML (which may contain inline styles or <style> tags)
        
        // If replacing the wrapper, we use setComponents
        if (target === editor.getWrapper()) {
          editor.setComponents(result.code);
        } else {
          // If replacing a specific component
          target.replaceWith(result.code);
        }
        
        toast.success("O assistente aplicou as mudanças!");
      } else {
        toast.error(result.error || "A IA falhou em gerar o código.");
      }
    } catch (e: any) {
      toast.error("Erro ao chamar IA: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0f0f12] border-r border-[#27272a] w-80 shrink-0 text-zinc-100">
      <div className="flex items-center justify-between p-4 border-b border-[#27272a]">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h3 className="font-semibold text-sm">Assistente IA</h3>
        </div>
        <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-violet-900/20 border border-violet-500/20 rounded-lg p-3 text-sm text-violet-200">
          Olá! Descreva o que você quer modificar na página ou no elemento selecionado.
        </div>
        
        {selectedComponent ? (
          <div className="text-xs text-zinc-400 bg-[#18181b] p-2 rounded border border-[#27272a]">
            🎯 Foco atual: <strong className="text-zinc-200">{selectedComponent.get("tagName") || "Elemento"}</strong> selecionado.
          </div>
        ) : (
          <div className="text-xs text-zinc-400 bg-[#18181b] p-2 rounded border border-[#27272a]">
            📄 Foco atual: <strong className="text-zinc-200">Página inteira</strong>. (Selecione um elemento para editar apenas ele).
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#0f0f12] border-t border-[#27272a]">
        <div className="relative flex items-end gap-2 bg-[#18181b] border border-[#3f3f46] rounded-xl focus-within:border-violet-500 focus-within:ring-1 focus-within:ring-violet-500 transition-all p-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAskAi();
              }
            }}
            placeholder="Mude o texto para azul e aplique negrito..."
            className="w-full bg-transparent border-none focus:outline-none resize-none text-sm p-1 placeholder:text-zinc-500 min-h-[44px] max-h-32"
            rows={2}
          />
          <button 
            onClick={handleAskAi}
            disabled={loading || !prompt.trim() || !editor}
            className="shrink-0 h-8 w-8 rounded-lg bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-[10px] text-zinc-500 text-center mt-2">
          Pressione Enter para enviar. Shift+Enter para nova linha.
        </p>
      </div>
    </div>
  );
}
