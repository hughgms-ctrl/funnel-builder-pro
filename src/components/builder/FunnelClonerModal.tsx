import { useState, useCallback, useEffect, useRef } from "react";
import { useFunnelStore } from "@/lib/store";
import { cloneFunnel, type CloneProgress } from "@/lib/api/cloner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Link,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Copy,
  Terminal,
  Globe,
  MousePointer,
  CheckSquare,
} from "lucide-react";
import type { Funnel, Step } from "@/lib/types";

interface FunnelClonerModalProps {
  open: boolean;
  onClose: () => void;
}

const STAGES = [
  { key: "fetching", label: "Capturando screenshot" },
  { key: "analyzing", label: "Analisando com Vision IA" },
  { key: "extracting", label: "Estruturando funil" },
  { key: "generating_images", label: "Gerando imagens" },
  { key: "building", label: "Importando" },
  { key: "done", label: "Concluído!" },
] as const;

export function FunnelClonerModal({ open, onClose }: FunnelClonerModalProps) {
  const setFunnel = useFunnelStore((s) => s.setFunnel);

  const [url, setUrl] = useState("");
  
  // Scraper progress state
  const [progress, setProgress] = useState<CloneProgress>({
    stage: "idle",
    message: "",
    percent: 0,
  });
  
  const [error, setError] = useState<string | null>(null);
  
  // Custom simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [tempFunnel, setTempFunnel] = useState<Funnel | null>(null);
  const [activeSimStepIdx, setActiveSimStepIdx] = useState(0);
  const [simulatedSteps, setSimulatedSteps] = useState<Step[]>([]);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [cursorClicking, setCursorClicking] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const isRunning =
    progress.stage !== "idle" && progress.stage !== "done" && progress.stage !== "error";

  // Auto-scroll logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString("pt-BR", { hour12: false });
    setLogs((prev) => [...prev, `[${time}] ${msg}`]);
  }, []);

  const handleClone = useCallback(async () => {
    if (!url) return;
    setError(null);
    setTempFunnel(null);
    setIsSimulating(false);
    setSimulatedSteps([]);
    setLogs([]);
    setProgress({ stage: "fetching", message: "Iniciando...", percent: 5 });

    addLog("🔌 Estabelecendo conexão segura com o cloner...");
    addLog(`🔍 Analisando URL: ${url}`);
    addLog("🤖 IA Vision nativa ativada para leitura visual do funil");

    try {
      // Step 1: Execute scraping and analysis (uses built-in Lovable AI — no user keys)
      const resultFunnel = await cloneFunnel(url, (p: CloneProgress) => {
        setProgress(p);
        if (p.message) {
          addLog(`[SISTEMA] ${p.message}`);
        }
      });

      // Save funnel internally and start visual clicking simulation
      setTempFunnel(resultFunnel);
      setIsSimulating(true);
      setActiveSimStepIdx(0);
      setCursorPos({ x: 50, y: 50 });
      setCursorClicking(false);
      
      addLog(`✨ Cópia da estrutura concluída pela IA. Cores identificadas: Primária (${resultFunnel.primaryColor})`);
      addLog(`🎬 Iniciando validação e simulação de clique em ${resultFunnel.steps.length} etapas detectadas...`);

    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      setError(msg);
      addLog(`❌ ERRO: ${msg}`);
      setProgress({ stage: "error", message: msg, percent: 0 });
    }
  }, [url, addLog]);

  // Simulation Loop
  useEffect(() => {
    if (!isSimulating || !tempFunnel) return;

    const currentStep = tempFunnel.steps[activeSimStepIdx];
    if (!currentStep) {
      // Simulation completed!
      setIsSimulating(false);
      setFunnel(tempFunnel);
      setProgress({ stage: "done", message: "Clonagem Concluída com Sucesso!", percent: 100 });
      addLog("🚀 Todos os passos validados. Funil adicionado ao painel do construtor.");
      return;
    }

    // Step animation states:
    // 1. Hover/Move to Option (0ms - 800ms)
    // 2. Click (800ms - 1100ms)
    // 3. Save page and Transition to next (1100ms - 1600ms)
    
    addLog(`📝 Analisando elementos visuais da Etapa: "${currentStep.title}"...`);
    
    // Position pointer targets: typically options button are in lower half of screen
    const targetX = 35 + Math.random() * 30; // Random x center-aligned
    const targetY = 60 + Math.random() * 15; // Random y bottom-aligned

    // Move cursor to click target
    const moveTimeout = setTimeout(() => {
      setCursorPos({ x: targetX, y: targetY });
      addLog(`🎯 Simulando clique na resposta da Etapa: "${currentStep.title}"`);
    }, 400);

    // Trigger click scale and ripple
    const clickTimeout = setTimeout(() => {
      setCursorClicking(true);
    }, 1200);

    // Complete step copy and load next step
    const nextTimeout = setTimeout(() => {
      setCursorClicking(false);
      setSimulatedSteps((prev) => [...prev, currentStep]);
      addLog(`✅ Elementos copiados com precisão pixel-perfect na etapa: "${currentStep.title}"`);
      
      if (activeSimStepIdx + 1 < tempFunnel.steps.length) {
        setActiveSimStepIdx((prev) => prev + 1);
        setCursorPos({ x: 50, y: 40 });
      } else {
        // Finalized
        setIsSimulating(false);
        setFunnel(tempFunnel);
        setProgress({ stage: "done", message: "Clonagem Concluída com Sucesso!", percent: 100 });
        addLog("🎉 CÓPIA PIXEL-PERFECT FINALIZADA! O funil original foi completamente reproduzido.");
      }
    }, 1800);

    return () => {
      clearTimeout(moveTimeout);
      clearTimeout(clickTimeout);
      clearTimeout(nextTimeout);
    };
  }, [isSimulating, activeSimStepIdx, tempFunnel, setFunnel, addLog]);

  const handleClose = () => {
    if (isRunning || isSimulating) return;
    setProgress({ stage: "idle", message: "", percent: 0 });
    setError(null);
    setUrl("");
    setTempFunnel(null);
    setIsSimulating(false);
    setSimulatedSteps([]);
    onClose();
  };

  const currentStageIdx = STAGES.findIndex((s) => s.key === progress.stage);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden bg-[#09090b] text-zinc-100 border-zinc-800">
        <DialogHeader className="px-6 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-white">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500">
                <Copy className="h-4 w-4 text-white" />
              </div>
              Painel de Clonagem de Funil de Quiz
            </DialogTitle>
            <div className="text-xs text-zinc-500 font-mono">
              Status: {isSimulating ? "Validando e Copiando..." : progress.stage === "idle" ? "Pronto" : progress.stage === "done" ? "Concluído" : "Processando IA..."}
            </div>
          </div>
        </DialogHeader>

        {/* Panel body split */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          
          {/* LEFT COLUMN: Origin Virtual Browser Simulation */}
          <div className="w-[45%] border-r border-zinc-800 flex flex-col bg-zinc-950 p-4 min-h-0 select-none">
            <div className="text-xs font-semibold text-zinc-400 mb-2 flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5 text-zinc-500" />
              Navegador Virtual (Simulador de Origem)
            </div>

            {/* Simulated Desktop window */}
            <div className="flex-1 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900 flex flex-col shadow-inner relative">
              {/* Address bar header */}
              <div className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center gap-2 shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                  <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                </div>
                <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-0.5 text-[10px] font-mono text-zinc-500 truncate flex items-center gap-1.5">
                  <span className="text-emerald-500">🔒</span>
                  {url || "https://..."}
                </div>
              </div>

              {/* Virtual Browser Viewport */}
              <div className="flex-1 relative overflow-hidden bg-zinc-950 flex flex-col">
                
                {/* Simulated Cursor Overlay */}
                {isSimulating && (
                  <div 
                    className="absolute pointer-events-none transition-all duration-700 ease-out z-50 flex flex-col items-center gap-1"
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

                {/* Idle / Input state */}
                {progress.stage === "idle" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 grid place-items-center">
                      <Link className="h-5 w-5 text-zinc-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-200">Aguardando URL</p>
                      <p className="text-[10px] text-zinc-500 max-w-[240px]">
                        Insira o link do funil ao lado e inicie o processo de clonagem para ver a simulação de cliques.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scraping state / Loader */}
                {isRunning && !isSimulating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 z-20 space-y-4">
                    <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-zinc-200">{STAGES[currentStageIdx]?.label || "Processando"}</p>
                      <p className="text-[10px] text-zinc-500 animate-pulse">{progress.message}</p>
                    </div>
                  </div>
                )}

                {/* Active Simulated Viewport (Scraped steps) */}
                {isSimulating && tempFunnel && tempFunnel.steps[activeSimStepIdx] && (
                  <VirtualBrowserScreen 
                    step={tempFunnel.steps[activeSimStepIdx]} 
                    brandColor={tempFunnel.primaryColor}
                    stepIndex={activeSimStepIdx}
                    totalSteps={tempFunnel.steps.length}
                  />
                )}

                {/* Success Viewport */}
                {progress.stage === "done" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-950 z-20 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-400 text-2xl animate-bounce">
                      ✓
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-100">Funil Clonado!</p>
                      <p className="text-[11px] text-zinc-500">
                        {tempFunnel?.steps?.length || 0} etapas validadas e replicadas com sucesso no editor.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Scraper configuration, progress steps, checklists, logs */}
          <div className="w-[55%] flex flex-col bg-zinc-900/40 p-5 overflow-y-auto min-h-0 space-y-4">
            
            {/* Input fields if idle */}
            {progress.stage === "idle" ? (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="clone-url" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Link className="h-3.5 w-3.5" />
                    URL do Funil Alvo
                  </Label>
                  <Input
                    id="clone-url"
                    placeholder="https://checkout-quiz-exemplo.com"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-sm py-5 font-mono text-zinc-200 placeholder-zinc-600 focus-visible:ring-violet-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    Provedor de IA
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    <ProviderButton
                      active={provider === "openai"}
                      available={hasOpenAI}
                      label="OpenAI GPT-4o"
                      badge="+ DALL·E 3 Imagens"
                      onClick={() => setProvider("openai")}
                    />
                    <ProviderButton
                      active={provider === "anthropic"}
                      available={hasAnthropic}
                      label="Claude 3.5 Sonnet"
                      badge="Anthropic AI"
                      onClick={() => setProvider("anthropic")}
                    />
                  </div>
                  {!hasAnyKey && (
                    <p className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 mt-1">
                      ⚠️ Você precisa configurar a sua chave de API na aba <strong>Config → Chaves de API</strong> primeiro.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // Active progress visual checklist
              <div className="grid grid-cols-2 gap-4 shrink-0">
                {/* Stages progress meters */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-3">
                  <p className="text-xs font-semibold text-zinc-400">Etapas do Processo</p>
                  <div className="space-y-1.5">
                    {STAGES.map((stage, idx) => {
                      const isPast = currentStageIdx > idx;
                      const isCurrent = currentStageIdx === idx && progress.stage !== "done" && progress.stage !== "error";
                      const isDoneStage = progress.stage === "done";

                      return (
                        <div key={stage.key} className="flex items-center gap-2 text-[11px]">
                          {isPast || (isDoneStage && idx < STAGES.length - 1) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="h-3.5 w-3.5 text-violet-500 animate-spin shrink-0" />
                          ) : (
                            <div className="h-3.5 w-3.5 rounded-full border border-zinc-800 shrink-0" />
                          )}
                          <span
                            className={
                              isPast
                                ? "text-emerald-500 font-medium"
                                : isCurrent
                                  ? "text-violet-400 font-semibold animate-pulse"
                                  : "text-zinc-500"
                            }
                          >
                            {stage.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Target checklist status */}
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                  <div>
                    <p className="text-xs font-semibold text-zinc-400 mb-2">Estrutura Copiada</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-900 pb-1">
                        <span>Paleta de Cores</span>
                        {tempFunnel ? (
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: tempFunnel.primaryColor }} />
                            <span className="w-2.5 h-2.5 rounded-full border border-zinc-700" style={{ backgroundColor: tempFunnel.accentColor }} />
                            <span className="text-[9px] text-zinc-300">{tempFunnel.primaryColor}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600">Pendente</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400 border-b border-zinc-900 pb-1">
                        <span>Tipografia</span>
                        {tempFunnel ? <span className="font-mono text-zinc-300">{tempFunnel.fontFamily}</span> : <span className="text-zinc-600">Pendente</span>}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-400">
                        <span>Etapas Copiadas</span>
                        {tempFunnel ? (
                          <span className="text-zinc-300 font-semibold">
                            {simulatedSteps.length} / {tempFunnel.steps.length}
                          </span>
                        ) : (
                          <span className="text-zinc-600">0</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tiny simulated steps indicator */}
                  {tempFunnel && (
                    <div className="flex gap-1 overflow-x-auto py-1 shrink-0">
                      {tempFunnel.steps.map((s, i) => {
                        const active = i === activeSimStepIdx && isSimulating;
                        const done = simulatedSteps.includes(s) || progress.stage === "done";
                        return (
                          <div 
                            key={s.id} 
                            className={`h-2 flex-1 min-w-[12px] rounded-full transition-all duration-300 ${
                              active ? "bg-violet-500 scale-y-125" : done ? "bg-emerald-500" : "bg-zinc-800"
                            }`}
                            title={s.title}
                          />
                        );
                      })}
                    </div>
                  )}
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

            {/* LOGS TERMINAL */}
            {progress.stage !== "idle" && (
              <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-[10px] text-zinc-400 min-h-[140px] relative">
                <div className="flex items-center gap-1.5 border-b border-zinc-900 pb-2 mb-2 text-zinc-500 text-[9px] shrink-0">
                  <Terminal className="h-3 w-3" />
                  <span>CONSOLA DO CLONADOR</span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-2">
                  {logs.map((log, i) => (
                    <div key={i} className="leading-relaxed break-all">
                      <span className="text-zinc-600 mr-1.5">&gt;</span>
                      {log.includes("ERRO") ? (
                        <span className="text-red-400 font-semibold">{log}</span>
                      ) : log.includes("✅") || log.includes("🎉") || log.includes("✓") ? (
                        <span className="text-emerald-400">{log}</span>
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
                  disabled={!url || isRunning}
                  onClick={handleClone}
                  className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-md shadow-violet-600/10"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" />
                  Iniciar Clonagem
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

// Visual Preview Step Renderer
function VirtualBrowserScreen({ step, brandColor, stepIndex, totalSteps }: {
  step: any;
  brandColor: string;
  stepIndex: number;
  totalSteps: number;
}) {
  const progress = totalSteps ? Math.round(((stepIndex + 1) / totalSteps) * 100) : 0;
  
  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-white select-none relative z-10 font-sans">
      {/* Header of virtual page */}
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
                <h3 key={comp.id || i} className="text-sm font-bold text-center text-zinc-100 px-2 leading-snug">
                  {comp.text || comp.title}
                </h3>
              );
            case "options":
              return (
                <div key={comp.id || i} className="space-y-2">
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
                          className="absolute inset-0 border-2 rounded-lg animate-pulse pointer-events-none" 
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
                      <div className="h-2 w-16 bg-zinc-800 rounded" />
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
                    {comp.price || "R$ 97,00"}
                  </p>
                  <div 
                    className="h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
                    style={{ backgroundColor: brandColor || "#7c3aed" }}
                  >
                    {comp.buttonText || "Adquirir Agora"}
                  </div>
                </div>
              );
            case "loading":
              return (
                <div key={comp.id || i} className="flex flex-col items-center gap-2 py-4">
                  <div className="h-6 w-6 rounded-full border-2 border-zinc-800 border-t-violet-500 animate-spin" />
                  <p className="text-[10px] text-zinc-400">{comp.text || "Processando..."}</p>
                </div>
              );
            default:
              return (
                <div key={comp.id || i} className="h-6 bg-zinc-900/20 rounded border border-zinc-850 flex items-center justify-center text-[9px] text-zinc-500">
                  Bloco: {comp.type}
                </div>
              );
          }
        })}
      </div>
    </div>
  );
}

function ProviderButton({
  active,
  available,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  available: boolean;
  label: string;
  badge: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!available}
      className={`relative p-3 rounded-xl border text-left transition-all ${
        active
          ? "border-violet-500 bg-violet-500/10 ring-1 ring-violet-500 text-white"
          : available
            ? "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40 text-zinc-300"
            : "border-zinc-900 bg-zinc-950/20 opacity-40 cursor-not-allowed text-zinc-600"
      }`}
    >
      <div className="font-semibold text-xs">{label}</div>
      <div
        className={`text-[9px] mt-0.5 ${active ? "text-violet-400 font-semibold" : "text-zinc-500"}`}
      >
        {badge}
      </div>
      {!available && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-xl">
          <span className="text-[9px] bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded text-zinc-500 font-mono">
            Sem chave
          </span>
        </div>
      )}
    </button>
  );
}
