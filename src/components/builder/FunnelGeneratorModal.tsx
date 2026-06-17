import { useState, useCallback, useEffect, useRef } from "react";
import { useFunnelStore } from "@/lib/store";
import { generateFunnelWithAI, type GenerationProgress } from "@/lib/api/generator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Terminal,
  Cpu,
  Eye,
  CheckSquare,
  Flame,
  MousePointer,
} from "lucide-react";
import type { Funnel, Step } from "@/lib/types";

interface FunnelGeneratorModalProps {
  open: boolean;
  onClose: () => void;
}

const SUGGESTIONS = [
  {
    title: "🔥 Emagrecimento para Mães",
    prompt: "Um quiz de emagrecimento focado em mães ocupadas que querem perder barriga em 30 dias sem academia. Pergunte sobre tempo livre, hábitos alimentares e idade. Venda um plano de receitas digital por R$ 37.",
  },
  {
    title: "💰 Liberdade Financeira",
    prompt: "Um quiz de educação financeira para jovens endividados descobrirem qual seu perfil de investidor. Pergunte sobre dívidas, renda mensal e objetivos. Capture lead e venda um e-book de organização financeira por R$ 27.",
  },
  {
    title: "💅 Rotina de Skin Care",
    prompt: "Um quiz de skincare personalizado. Pergunte tipo de pele (seca, oleosa), principal problema (acne, rugas) e quanto tempo gasta se cuidando. Venda um cronograma capilar/pele por R$ 47.",
  },
  {
    title: "🚀 Tráfego para Negócios",
    prompt: "Um quiz para donos de negócios locais descobrirem por que não estão vendendo na internet. Pergunte sobre nicho de atuação, orçamento de anúncios e se já investem em tráfego. Capture lead e venda consultoria de R$ 97.",
  },
];

export function FunnelGeneratorModal({ open, onClose }: FunnelGeneratorModalProps) {
  const setFunnel = useFunnelStore((s) => s.setFunnel);

  const [prompt, setPrompt] = useState("");
  const [progress, setProgress] = useState<GenerationProgress>({
    stage: "idle",
    message: "",
    percent: 0,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [generatedFunnel, setGeneratedFunnel] = useState<Funnel | null>(null);
  
  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeSimStepIdx, setActiveSimStepIdx] = useState(0);
  const [simulatedSteps, setSimulatedSteps] = useState<Step[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [cursorClicking, setCursorClicking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const isRunning =
    progress.stage !== "idle" && progress.stage !== "done" && progress.stage !== "error";

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    setError(null);
    setGeneratedFunnel(null);
    setIsSimulating(false);
    setSimulatedSteps([]);
    setLogs([]);
    setProgress({ stage: "submitting", message: "Iniciando inteligência artificial...", percent: 5 });

    addLog("🤖 Inicializando gerador de funil baseado em IA...");
    addLog(`📝 Briefing do usuário: "${prompt.slice(0, 100)}${prompt.length > 100 ? "..." : ""}"`);

    try {
      const funnel = await generateFunnelWithAI(prompt, (p: GenerationProgress) => {
        setProgress(p);
        if (p.message) {
          addLog(p.message);
        }
      });

      setGeneratedFunnel(funnel);
      setIsSimulating(true);
      setActiveSimStepIdx(0);
      setCursorPos({ x: 50, y: 50 });
      setCursorClicking(false);
      
      addLog(`✨ Funil gerado com sucesso!`);
      addLog(`🎨 Cores definidas: Primária (${funnel.primaryColor}) | Contraste (${funnel.accentColor})`);
      addLog(`📏 Fonte selecionada: ${funnel.fontFamily}`);
      addLog(`🎬 Simulando renderização e validação de ${funnel.steps.length} etapas...`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      addLog(`❌ ERRO NA GERAÇÃO: ${msg}`);
      setProgress({ stage: "error", message: msg, percent: 0 });
    }
  }, [prompt, addLog]);

  // Simulation Loop to preview generated steps
  useEffect(() => {
    if (!isSimulating || !generatedFunnel) return;

    const currentStep = generatedFunnel.steps[activeSimStepIdx];
    if (!currentStep) {
      setIsSimulating(false);
      setFunnel(generatedFunnel);
      setProgress({ stage: "done", message: "Geração Concluída!", percent: 100 });
      addLog("🚀 Todos os passos validados. O funil de alta conversão foi carregado no construtor.");
      return;
    }

    addLog(`👁️ Renderizando passo: "${currentStep.title}"`);
    
    const targetX = 40 + Math.random() * 20;
    const targetY = 60 + Math.random() * 15;

    // Move cursor to click target inside simulation
    const moveTimeout = setTimeout(() => {
      setCursorPos({ x: targetX, y: targetY });
      addLog(`🎯 Validando cliques e inputs na etapa: "${currentStep.title}"`);
    }, 450);

    const clickTimeout = setTimeout(() => {
      setCursorClicking(true);
    }, 1100);

    const nextTimeout = setTimeout(() => {
      setCursorClicking(false);
      setSimulatedSteps((prev) => [...prev, currentStep]);
      addLog(`✅ Etapa validada: "${currentStep.title}"`);
      
      if (activeSimStepIdx + 1 < generatedFunnel.steps.length) {
        setActiveSimStepIdx((prev) => prev + 1);
        setCursorPos({ x: 50, y: 40 });
      } else {
        setIsSimulating(false);
        setFunnel(generatedFunnel);
        setProgress({ stage: "done", message: "Geração Concluída!", percent: 100 });
        addLog("🎉 PROCESSO CONCLUÍDO! O funil está pronto para edição.");
      }
    }, 1600);

    return () => {
      clearTimeout(moveTimeout);
      clearTimeout(clickTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isSimulating, activeSimStepIdx, generatedFunnel, setFunnel, addLog]);

  const handleClose = () => {
    if (isRunning || isSimulating) return;
    setProgress({ stage: "idle", message: "", percent: 0 });
    setError(null);
    setPrompt("");
    setGeneratedFunnel(null);
    setIsSimulating(false);
    setSimulatedSteps([]);
    onClose();
  };

  const getStatusText = () => {
    if (isSimulating) return "Validando estrutura...";
    if (progress.stage === "submitting") return "Enviando briefings...";
    if (progress.stage === "generating") return "Pensando e construindo...";
    if (progress.stage === "refining") return "Estilizando...";
    if (progress.stage === "done") return "Pronto!";
    return "Aguardando prompt";
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-[#09090b] text-zinc-100 border-zinc-800">
        <DialogHeader className="px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500">
                <Sparkles className="h-4 w-4 text-white animate-pulse" />
              </div>
              Criar Funil com Inteligência Artificial
            </DialogTitle>
            <div className="text-xs text-zinc-500 font-mono flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-violet-400" />
              Status: {getStatusText()}
            </div>
          </div>
        </DialogHeader>

        {/* Panel body split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: Visual Live Simulation of Generated Funnel */}
          <div className="w-[45%] border-r border-zinc-800 flex flex-col bg-zinc-950 p-4 min-h-0 select-none">
            <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-zinc-500" />
              Simulador Visual da Geração
            </div>

            {/* Simulated Mobile screen */}
            <div className="flex-1 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 flex flex-col shadow-inner relative">
              <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center justify-center shrink-0">
                <div className="h-4 w-20 bg-zinc-950 border border-zinc-800 rounded-full text-[8px] font-mono text-zinc-500 flex items-center justify-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-ping" />
                  PREVIEW-IA
                </div>
              </div>

              {/* Viewport content */}
              <div className="flex-1 relative overflow-hidden bg-zinc-950 flex flex-col">
                
                {/* Simulated Cursor */}
                {isSimulating && (
                  <div 
                    className="absolute pointer-events-none transition-all duration-500 ease-out z-50 flex flex-col items-center gap-1"
                    style={{ 
                      left: `${cursorPos.x}%`, 
                      top: `${cursorPos.y}%`,
                      transform: `translate(-50%, -50%) ${cursorClicking ? 'scale(0.85)' : 'scale(1)'}`
                    }}
                  >
                    <MousePointer className="h-5 w-5 text-violet-400 fill-violet-400 drop-shadow-[0_2px_8px_rgba(124,58,237,0.5)] stroke-white stroke-[1.5]" />
                    {cursorClicking && (
                      <span className="absolute -top-3 -left-3 h-10 w-10 rounded-full border-2 border-violet-500 animate-ping opacity-85" />
                    )}
                  </div>
                )}

                {/* Idle / Input */}
                {progress.stage === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 grid place-items-center">
                      <Sparkles className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-200">Aguardando seu Prompt</p>
                      <p className="text-[10px] text-zinc-500 max-w-[240px]">
                        Digite um nicho ou objetivo ao lado e a IA criará uma estrutura de funil customizada.
                      </p>
                    </div>
                  </div>
                )}

                {/* AI Thinking Screen */}
                {isRunning && !isSimulating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 z-20 space-y-5">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full border border-violet-500/20 bg-violet-500/5 flex items-center justify-center">
                        <Cpu className="h-6 w-6 text-violet-400 animate-pulse" />
                      </div>
                      <div className="absolute -inset-1 rounded-full border border-violet-500/30 animate-ping opacity-50" />
                    </div>
                    <div className="space-y-1.5 max-w-[260px]">
                      <p className="text-xs font-semibold text-zinc-200">{getStatusText()}</p>
                      <p className="text-[10px] text-zinc-500 animate-pulse leading-normal">{progress.message}</p>
                    </div>
                  </div>
                )}

                {/* Active Simulated Viewport */}
                {isSimulating && generatedFunnel && generatedFunnel.steps[activeSimStepIdx] && (
                  <VirtualPreviewScreen 
                    step={generatedFunnel.steps[activeSimStepIdx]} 
                    brandColor={generatedFunnel.primaryColor}
                    stepIndex={activeSimStepIdx}
                    totalSteps={generatedFunnel.steps.length}
                  />
                )}

                {/* Success Screen */}
                {progress.stage === "done" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 z-20 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-400 text-2xl animate-bounce">
                      ✓
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-100">Funil Gerado!</p>
                      <p className="text-[11px] text-zinc-500">
                        {generatedFunnel?.steps?.length || 0} etapas criadas e enviadas ao painel de edição.
                      </p>
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Configurations & Action buttons */}
          <div className="w-[55%] flex flex-col bg-zinc-900/40 p-5 overflow-y-auto min-h-0 space-y-4">
            
            {/* Input state */}
            {progress.stage === "idle" ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="generation-prompt" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-violet-400" />
                      Instruções para o Quiz (Prompt)
                    </Label>
                    <Textarea
                      id="generation-prompt"
                      placeholder="Descreva o que deseja vender ou quais perguntas seu quiz deve ter (Ex: Crie um quiz de vendas para um produto de skincare de alta conversão. Venda um plano no final...)"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={5}
                      className="bg-zinc-900 border-zinc-800 text-sm py-3 font-sans text-zinc-200 placeholder-zinc-650 focus-visible:ring-violet-500 resize-none"
                    />
                  </div>

                  {/* Suggestion tags */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-zinc-400">Sugestões de Temas Rápidos:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {SUGGESTIONS.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => setPrompt(sug.prompt)}
                          className="p-3 text-left border border-zinc-800 rounded-xl hover:border-zinc-700 bg-zinc-900/40 hover:bg-zinc-800/40 transition text-xs space-y-1 cursor-pointer"
                        >
                          <span className="font-semibold text-zinc-200 block">{sug.title}</span>
                          <span className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{sug.prompt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="text-[11px] text-zinc-400 bg-zinc-950/40 border border-zinc-800 rounded-lg p-3 flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-400 shrink-0" />
                  <span>A IA criará a estrutura completa: textos persuasivos, imagens representativas em branco, opções de quiz com lógica e uma oferta irresistível no final.</span>
                </div>
              </div>
            ) : (
              // Running state checklist & logs
              <div className="flex-1 flex flex-col space-y-4 min-h-0">
                <div className="grid grid-cols-2 gap-4 shrink-0">
                  
                  {/* Progress milestones */}
                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                    <p className="text-xs font-semibold text-zinc-400 mb-2">Checklist de Criação</p>
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex items-center gap-2">
                        {progress.stage !== "submitting" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin" />
                        )}
                        <span className={progress.stage !== "submitting" ? "text-emerald-500 font-medium" : "text-violet-400"}>Briefing recebido</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {progress.stage === "refining" || progress.stage === "done" || isSimulating ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : progress.stage === "generating" ? (
                          <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-zinc-800" />
                        )}
                        <span className={progress.stage === "refining" || progress.stage === "done" || isSimulating ? "text-emerald-500 font-medium" : "text-zinc-500"}>Modelagem da estrutura</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {progress.stage === "done" || isSimulating ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : progress.stage === "refining" ? (
                          <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin" />
                        ) : (
                          <div className="h-3.5 w-3.5 rounded-full border border-zinc-800" />
                        )}
                        <span className={progress.stage === "done" || isSimulating ? "text-emerald-500 font-medium" : "text-zinc-500"}>Refinamento estético</span>
                      </div>
                    </div>
                  </div>

                  {/* Generated Funnel Stats */}
                  <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-2">
                    <p className="text-xs font-semibold text-zinc-400">Características</p>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-500">Cores da Marca</span>
                        {generatedFunnel ? (
                          <div className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded-full border border-zinc-800" style={{ backgroundColor: generatedFunnel.primaryColor }} />
                            <span className="w-3 h-3 rounded-full border border-zinc-800" style={{ backgroundColor: generatedFunnel.accentColor }} />
                            <span className="text-zinc-300 font-mono">{generatedFunnel.primaryColor}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-650">Processando...</span>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between border-b border-zinc-900 pb-1">
                        <span className="text-zinc-500">Etapas Construídas</span>
                        {generatedFunnel ? (
                          <span className="text-zinc-200 font-semibold">{simulatedSteps.length} / {generatedFunnel.steps.length}</span>
                        ) : (
                          <span className="text-zinc-650">Aguardando...</span>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* LOGS TERMINAL */}
                <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-400 min-h-[140px] relative overflow-hidden">
                  <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2 mb-2 text-zinc-500 text-[9px] shrink-0">
                    <Terminal className="h-3 w-3" />
                    <span>LOG DE CRIAÇÃO DA IA</span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                    {logs.map((log, i) => (
                      <div key={i} className="leading-relaxed break-all">
                        <span className="text-zinc-600 mr-1.5">&gt;</span>
                        {log.includes("ERRO") ? (
                          <span className="text-red-400 font-semibold">{log}</span>
                        ) : log.includes("✅") || log.includes("🎉") || log.includes("✓") ? (
                          <span className="text-emerald-400 font-semibold">{log}</span>
                        ) : log.includes("🎯") || log.includes("✨") ? (
                          <span className="text-violet-400">{log}</span>
                        ) : (
                          <span>{log}</span>
                        )}
                      </div>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-950/20 border border-red-900/50 text-red-400 text-xs">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {/* ACTION FOOTER */}
            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800/80 shrink-0">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClose} 
                disabled={isRunning || isSimulating}
                className="border-zinc-800 hover:bg-zinc-800 hover:text-white"
              >
                {progress.stage === "done" ? "Concluir" : "Cancelar"}
              </Button>
              {progress.stage === "idle" && (
                <Button
                  size="sm"
                  disabled={!prompt.trim() || isRunning}
                  onClick={handleGenerate}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md shadow-violet-650/10 cursor-pointer"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Gerar Funil com IA
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
              )}
            </div>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Visual Preview Step Renderer for Generated Funnel
function VirtualPreviewScreen({ step, brandColor, stepIndex, totalSteps }: {
  step: any;
  brandColor: string;
  stepIndex: number;
  totalSteps: number;
}) {
  const progress = totalSteps ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0;
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-white select-none relative z-10 font-sans">
      {/* Header */}
      <div className="border-b border-zinc-900 bg-zinc-900/80 px-4 py-2 flex items-center justify-between text-[10px] text-zinc-400">
        <span>Etapa {stepIndex + 1} de {totalSteps}</span>
        <span className="font-semibold text-zinc-300 truncate max-w-[120px]">{step.title}</span>
        <span className="w-8" />
      </div>
      
      {/* Progress Bar */}
      {step.showProgress && (
        <div className="h-1 bg-zinc-900 w-full shrink-0">
          <div 
            className="h-full transition-all duration-500" 
            style={{ width: `${progress}%`, backgroundColor: brandColor || "#7c3aed" }}
          />
        </div>
      )}
      
      {/* Viewport Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col justify-center max-w-sm mx-auto w-full">
        {step.components.map((comp: any, i: number) => {
          switch (comp.type) {
            case "text":
              return (
                <div key={comp.id || i} className="text-center px-2">
                  <h3 className="text-sm font-bold text-zinc-100 leading-snug">
                    {comp.text || comp.title}
                  </h3>
                </div>
              );
            case "options":
              return (
                <div key={comp.id || i} className="space-y-2">
                  {comp.title && <p className="text-xs font-semibold text-center text-zinc-200 mb-1">{comp.title}</p>}
                  {comp.options?.map((opt: any, idx: number) => (
                    <div 
                      key={opt.id} 
                      className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/40 text-center text-xs font-semibold transition-colors relative"
                      style={{ borderColor: idx === 0 ? brandColor : undefined }}
                    >
                      {opt.label}
                      {/* Highlight click target for cursor simulation */}
                      {idx === 0 && (
                        <div 
                          className="absolute inset-0 border rounded-lg animate-pulse pointer-events-none" 
                          style={{ borderColor: brandColor || "#7c3aed" }} 
                        />
                      )}
                    </div>
                  ))}
                </div>
              );
            case "capture":
              return (
                <div key={comp.id || i} className="space-y-3 p-3 rounded-lg border border-zinc-800 bg-zinc-900/30">
                  {comp.title && <p className="text-[11px] font-semibold text-center text-zinc-300">{comp.title}</p>}
                  {comp.fields?.map((f: any) => (
                    <div key={f.id} className="space-y-1">
                      <div className="h-2 w-16 bg-zinc-800 rounded animate-pulse" />
                      <div className="h-7 bg-zinc-900 rounded border border-zinc-850 w-full" />
                    </div>
                  ))}
                  <div 
                    className="h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white shadow"
                    style={{ backgroundColor: brandColor || "#7c3aed" }}
                  >
                    {comp.buttonText || "Continuar"}
                  </div>
                </div>
              );
            case "price":
            case "plans":
              return (
                <div key={comp.id || i} className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 text-center space-y-3">
                  <p className="text-[11px] text-zinc-400 font-medium">{comp.title || "Oferta Especial"}</p>
                  <p className="text-xl font-extrabold" style={{ color: brandColor || "#7c3aed" }}>
                    {comp.price || comp.plans?.[0]?.promoPrice || "R$ 97,00"}
                  </p>
                  {comp.plans && (
                    <div className="space-y-1.5">
                      {comp.plans.map((p: any) => (
                        <div key={p.id} className="text-[10px] border border-zinc-850 p-1.5 rounded bg-zinc-950/20 text-zinc-300">
                          {p.name} - <span className="font-bold text-white">{p.promoPrice}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div 
                    className="h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white cursor-pointer"
                    style={{ backgroundColor: brandColor || "#7c3aed" }}
                  >
                    {comp.buttonText || "Adquirir Agora"}
                  </div>
                </div>
              );
            case "loading":
              return (
                <div key={comp.id || i} className="flex flex-col items-center gap-2 py-4">
                  <div className="h-6 w-6 rounded-full border-2 border-zinc-850 border-t-violet-500 animate-spin" />
                  <p className="text-[10px] text-zinc-400">{comp.text || "Analisando dados..."}</p>
                </div>
              );
            case "testimonials":
              return (
                <div key={comp.id || i} className="space-y-2 p-2.5 rounded-lg border border-zinc-850 bg-zinc-950/30">
                  <p className="text-[10px] font-semibold text-zinc-450 text-center uppercase tracking-wider">{comp.title || "Depoimentos"}</p>
                  {comp.testimonials?.slice(0, 1).map((t: any) => (
                    <div key={t.id} className="space-y-1">
                      <p className="text-[10px] italic text-zinc-300">"{t.text}"</p>
                      <p className="text-[9px] text-right font-semibold text-zinc-500">- {t.author}</p>
                    </div>
                  ))}
                </div>
              );
            case "timer":
              return (
                <div key={comp.id || i} className="py-1 px-2 border border-orange-500/25 bg-orange-500/5 text-orange-400 text-[10px] rounded text-center font-mono animate-pulse">
                  ⏰ {comp.text || "Oferta expira em"}: 09:59
                </div>
              );
            case "alert":
              return (
                <div key={comp.id || i} className="p-2 border border-zinc-800 rounded text-[10px] text-center text-zinc-400 bg-zinc-900/10">
                  {comp.text}
                </div>
              );
            default:
              return (
                <div key={comp.id || i} className="h-6 bg-zinc-900/20 rounded border border-zinc-850 flex items-center justify-center text-[9px] text-zinc-500">
                  {comp.type}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}
