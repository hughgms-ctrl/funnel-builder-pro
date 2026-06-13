import type { ComponentData, Funnel, Step } from "@/lib/types";
import { useFunnelStore } from "@/lib/store";
import { saveLeadToSupabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  funnel: Funnel;
  startStepId?: string;
  onExit?: () => void;
  embedded?: boolean;
}

// Função utilitária para substituir variáveis {{var}} e avaliar cálculos matemáticos {{calc ...}}
export function parseTemplateText(text: string, variables: Record<string, any>): string {
  if (!text) return text;
  
  let result = text;
  let iterations = 0;
  // Substitui chaves mais internas primeiro para processar variáveis simples e expressões internas
  while (result.includes("{{") && iterations < 15) {
    iterations++;
    const match = result.match(/\{\{([^{}]+)\}\}/);
    if (!match) break;
    
    const token = match[0]; // ex: "{{peso}}"
    const varName = match[1].trim(); // ex: "peso"
    
    if (varName.startsWith("calc ")) {
      const expression = varName.substring(5).trim();
      const evaluated = evaluateMathExpression(expression);
      result = result.replace(token, String(evaluated));
    } else {
      const value = variables[varName] !== undefined ? variables[varName] : "";
      result = result.replace(token, String(value));
    }
  }
  
  return result;
}

// Função para avaliar expressão matemática básica de forma segura
function evaluateMathExpression(expr: string): number {
  try {
    // Sanitização rigorosa: apenas números, operadores básicos, pontos, parênteses e espaços
    const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, "");
    const fn = new Function(`return (${sanitized});`);
    const val = fn();
    if (typeof val === "number" && !isNaN(val)) {
      return Math.round(val * 100) / 100; // Até 2 casas decimais
    }
    return 0;
  } catch (e) {
    console.error("Erro no cálculo da expressão matemática:", expr, e);
    return 0;
  }
}

// Função para avaliar regras condicionais de exibição
export function evaluateDisplayRule(rule: string | undefined, variables: Record<string, any>): boolean {
  if (!rule || rule.trim() === "") return true;
  
  try {
    // Substitui variáveis e realiza cálculos matemáticos se houver
    let processed = parseTemplateText(rule, variables);
    
    // Tratamento de comparações envolvendo strings não quotadas para evitar erros de sintaxe JS
    // Exemplo: 'masculino == masculino' ou 'idade == 18-29'
    // Se a regra contiver comparações do tipo 'var == string' onde string não tem aspas, adicionamos.
    // Para simplificar a execução de forma segura:
    // Permitir letras, números, operadores básicos e strings com/sem aspas.
    // Ex: "idade == Homem" vira "'Homem' == 'Homem'" na hora de avaliar, ou se contiver aspas já processadas.
    // Uma forma simples é substituir comparadores lógicos por expressões avaliáveis.
    
    // Vamos sanitizar a expressão
    const sanitized = processed.replace(/[^a-zA-Z0-9\s=!<>&|()+\-*/.'"]/g, "");
    
    // Se a expressão for uma igualdade simples como "Homem == Homem" (sem aspas), ela falharia no JS puro
    // Vamos tentar resolver igualdades literais básicas caso dê erro
    try {
      const fn = new Function(`return (${sanitized});`);
      return !!fn();
    } catch {
      // Fallback em caso de strings literais sem aspas: 
      // Divide por == ou != e limpa os espaços
      if (sanitized.includes("==")) {
        const parts = sanitized.split("==").map(p => p.trim().replace(/['"]/g, ""));
        return parts[0] === parts[1];
      }
      if (sanitized.includes("!=")) {
        const parts = sanitized.split("!=").map(p => p.trim().replace(/['"]/g, ""));
        return parts[0] !== parts[1];
      }
      return false;
    }
  } catch (e) {
    console.error("Erro ao avaliar displayRule:", rule, e);
    return false;
  }
}

// Helper para obter classes de estilo Inlead
function getComponentStyles(data: ComponentData, defaultBorder = "rounded-lg", defaultBg = "bg-background border") {
  const aesthetic = data.aesthetic || "simple";
  const borders = data.borders || "medium";
  
  let borderClass = defaultBorder;
  switch (borders) {
    case "none":
      borderClass = "rounded-none";
      break;
    case "medium":
      borderClass = "rounded-md";
      break;
    case "large":
      borderClass = "rounded-xl";
      break;
    case "extra":
      borderClass = "rounded-3xl";
      break;
  }
  
  let aestheticClass = defaultBg;
  switch (aesthetic) {
    case "simple":
      break;
    case "highlight":
      aestheticClass = "bg-purple-50/70 border border-purple-200/50 shadow-sm dark:bg-purple-950/20 dark:border-purple-900/40 text-foreground";
      break;
    case "emboss":
      aestheticClass = "border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] bg-card dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.1)] text-foreground";
      break;
    case "contrast":
      aestheticClass = "border-2 border-purple-600 bg-background text-foreground font-semibold dark:border-purple-400";
      break;
  }
  
  return `${borderClass} ${aestheticClass}`;
}

export function QuizPreview({ funnel, startStepId, onExit, embedded }: Props) {
  const t = useT();
  const addLead = useFunnelStore((s) => s.addLead);
  const supabaseConfig = useFunnelStore((s) => s.supabaseConfig);
  const [leadId] = useState(() => Math.random().toString(36).slice(2));
  const [stepId, setStepId] = useState<string>(startStepId || funnel.steps[0]?.id);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [componentScores, setComponentScores] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  // Inject tracking pixels
  useEffect(() => {
    if (funnel.metaPixelId && !document.getElementById('meta-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'meta-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${funnel.metaPixelId}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }

    if (funnel.googleTagId && !document.getElementById('gtm-script')) {
      const script = document.createElement('script');
      script.id = 'gtm-script';
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtm.js?id=${funnel.googleTagId}`;
      document.head.appendChild(script);
    }
  }, [funnel.metaPixelId, funnel.googleTagId]);

  useEffect(() => {
    setStepId(startStepId || funnel.steps[0]?.id);
    setHistory([]);
    setAnswers({});
    setComponentScores({});
    setDone(false);
  }, [funnel.id, startStepId]);

  const step = funnel.steps.find((s) => s.id === stepId);
  const stepIndex = funnel.steps.findIndex((s) => s.id === stepId);
  const progress = funnel.steps.length
    ? Math.round(((stepIndex + 1) / funnel.steps.length) * 100)
    : 0;

  const totalScore = Object.values(componentScores).reduce((sum, val) => sum + val, 0);

  // Variáveis disponíveis nos templates e regras
  const variables = {
    ...answers,
    score: totalScore,
  };

  const fireLead = async (vars: Record<string, unknown>, isSale = false) => {
    const updatedAnswers = { ...vars };
    if (isSale) {
      updatedAnswers.converted = true;
      updatedAnswers.isSale = true;
      updatedAnswers._converted = true;
    }
    const lead = { id: leadId, createdAt: Date.now(), answers: updatedAnswers };
    addLead(lead);

    // Fire webhook
    if (isSale) {
      if (funnel.saleWebhookUrl) {
        try {
          await fetch(funnel.saleWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...lead, funnelName: funnel.name, funnelId: funnel.id, converted: true }),
            mode: 'no-cors',
          });
        } catch { /* silent */ }
      }
      // Fire Meta pixel Purchase event
      if (funnel.metaPixelId && typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Purchase', { currency: 'BRL', value: 0 });
      }
    } else {
      if (funnel.leadWebhookUrl) {
        try {
          await fetch(funnel.leadWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...lead, funnelName: funnel.name, funnelId: funnel.id }),
            mode: 'no-cors',
          });
        } catch { /* silent */ }
      }
      // Fire Meta pixel lead event
      if (funnel.metaPixelId && typeof window !== 'undefined' && (window as any).fbq) {
        (window as any).fbq('track', 'Lead');
      }
    }

    // Save to Supabase
    if (funnel.supabaseEnabled) {
      try {
        await saveLeadToSupabase(funnel.id, lead);
      } catch (err) {
        console.error("Erro ao salvar lead no Supabase:", err);
      }
    }
  };

  const goNext = (nextStepId?: string) => {
    setHistory((h) => [...h, stepId]);

    // Find what step we're going to
    const targetStepId = nextStepId ||
      (() => {
        const idx = funnel.steps.findIndex((s) => s.id === stepId);
        return idx >= 0 && idx < funnel.steps.length - 1 ? funnel.steps[idx + 1].id : null;
      })();

    const targetStep = targetStepId ? funnel.steps.find((s) => s.id === targetStepId) : null;

    // If the target step is a sale step — fire conversion events
    if (targetStep?.isSaleStep) {
      fireLead(variables, true);
    }

    if (nextStepId) {
      setStepId(nextStepId);
      return;
    }
    const idx = funnel.steps.findIndex((s) => s.id === stepId);
    if (idx >= 0 && idx < funnel.steps.length - 1) {
      setStepId(funnel.steps[idx + 1].id);
    } else {
      fireLead(variables);
      setDone(true);
    }
  };

  const goBack = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setStepId(prev);
      return h.slice(0, -1);
    });
  };

  if (done) {
    return (
      <div
        className={`${embedded ? "" : "min-h-screen"} flex items-center justify-center p-8`}
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-md text-center space-y-4">
          <div
            className="mx-auto h-16 w-16 rounded-full grid place-items-center text-2xl animate-bounce"
            style={{ background: funnel.primaryColor, color: "white" }}
          >
            ✓
          </div>
          <h2 className="text-2xl font-bold">{t.completed}</h2>
          <p className="text-muted-foreground">{t.completedMsg}</p>
          <div className="p-3 bg-muted rounded-lg text-xs font-mono text-left space-y-1">
            <div className="font-bold border-b pb-1 mb-1">Dados Capturados (Lead):</div>
            {Object.entries(variables).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span>{k}:</span>
                <span className="font-bold">{String(v)}</span>
              </div>
            ))}
          </div>
          {onExit && <Button onClick={onExit}>{t.exitPreview}</Button>}
        </div>
      </div>
    );
  }

  if (!step) return null;

  // Filtrar componentes visíveis com base nas displayRules
  const visibleComponents = step.components.filter((c) => evaluateDisplayRule(c.displayRule, variables));

  // Encontrar se existe um botão fixado no rodapé visível
  const footerButton = visibleComponents.find((c) => c.type === "button" && c.fixedFooter);

  // Agrupar componentes visíveis adjacentes de 50% de largura
  const renderedElements: any[] = [];
  let tempRow: ComponentData[] = [];

  const RenderComponentWrapper = ({ c }: { c: ComponentData }) => (
    <RenderComponent
      data={c}
      funnel={funnel}
      step={step}
      variables={variables}
      fireLead={fireLead}
      onAnswer={(value, nextStepId, scoreValue, optVarName) => {
        if (scoreValue !== undefined) {
          setComponentScores((s) => ({ ...s, [c.id]: scoreValue }));
        } else {
          setComponentScores((s) => ({ ...s, [c.id]: 0 }));
        }
        
        setAnswers((a) => {
          const nextAnswers = { ...a, [c.id]: value };
          if (c.idName) nextAnswers[c.idName] = value;
          if (optVarName) nextAnswers[optVarName] = value;
          return nextAnswers;
        });
        
        goNext(nextStepId);
      }}
      onSubmitCapture={(values, fieldVars, nextStepId) => {
        setAnswers((a) => ({
          ...a,
          ...values,
          ...fieldVars,
        }));
        goNext(nextStepId);
      }}
    />
  );

  const flushRow = () => {
    if (tempRow.length === 0) return;
    if (tempRow.length === 1) {
      const c = tempRow[0];
      renderedElements.push(
        <div key={c.id} className="w-full">
          <RenderComponentWrapper c={c} />
        </div>
      );
    } else {
      renderedElements.push(
        <div key={tempRow[0].id + "_row"} className="flex gap-3 items-stretch w-full">
          {tempRow.map((c) => (
            <div key={c.id} className="flex-1 min-w-0" style={{ width: "50%" }}>
              <RenderComponentWrapper c={c} />
            </div>
          ))}
        </div>
      );
    }
    tempRow = [];
  };

  visibleComponents.forEach((c) => {
    // Pula o botão fixado no rodapé para que seja renderizado externamente na barra fixa
    if (footerButton && c.id === footerButton.id) {
      return;
    }

    if (c.width === 50) {
      tempRow.push(c);
      if (tempRow.length === 2) {
        flushRow();
      }
    } else {
      flushRow();
      renderedElements.push(
        <div key={c.id} className="w-full">
          <RenderComponentWrapper c={c} />
        </div>
      );
    }
  });
  flushRow();

  return (
    <div
      className={`${embedded ? "" : "min-h-screen"} flex flex-col relative`}
      style={{ background: "var(--background)" }}
    >
      {/* Header */}
      <div className="border-b bg-background/90 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto max-w-xl px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            {step.showBack ? (
              <button
                onClick={goBack}
                disabled={history.length === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30 transition font-medium"
              >
                ← {t.back}
              </button>
            ) : (
              <span />
            )}
            {onExit && (
              <button onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground transition">
                {t.exitPreview}
              </button>
            )}
          </div>
          {step.showLogo && (
            <div className="flex justify-center pt-3">
              {funnel.logoUrl ? (
                <img src={funnel.logoUrl} alt="logo" className="h-10 object-contain" />
              ) : (
                <div
                  className="text-lg font-bold tracking-wide"
                  style={{ color: funnel.primaryColor }}
                >
                  {funnel.name}
                </div>
              )}
            </div>
          )}
          {step.showProgress && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, background: funnel.primaryColor }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div 
        className="flex-1 mx-auto w-full max-w-xl px-4 py-6 space-y-5"
        style={{ paddingBottom: footerButton ? "5rem" : "1.5rem" }} // espaço para o botão fixo
      >
        {renderedElements}
      </div>

      {/* Botão Fixo no Rodapé */}
      {footerButton && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] z-50">
          <div className="mx-auto max-w-xl">
            <RenderComponentWrapper c={footerButton} />
          </div>
        </div>
      )}
    </div>
  );
}

interface RenderProps {
  data: ComponentData;
  funnel: Funnel;
  step: Step;
  variables: Record<string, any>;
  onAnswer: (value: unknown, nextStepId?: string, scoreValue?: number, optVarName?: string) => void;
  onSubmitCapture: (values: Record<string, unknown>, fieldVars: Record<string, unknown>, nextStepId?: string) => void;
  fireLead: (vars: Record<string, unknown>, isSale?: boolean) => Promise<void>;
}

function RenderComponent({ data, funnel, variables, onAnswer, onSubmitCapture, fireLead }: RenderProps) {
  const t = useT();
  const primary = funnel.primaryColor;

  const appliedStyles = getComponentStyles(data);

  // Helper de animação
  const getAnimationClass = () => {
    if (data.animation === "pulsating") return "animate-inlead-pulse";
    if (data.animation === "auto-emboss") return "hover:scale-[1.02] active:scale-[0.98] transition-all duration-200";
    return "";
  };

  switch (data.type) {
    case "text":
      return (
        <h2 className={`text-2xl font-bold text-center px-4 py-3 ${appliedStyles}`}>
          {parseTemplateText(data.text || "", variables)}
        </h2>
      );
    case "alert": {
      const variantBg = {
        info: "bg-blue-50 border border-blue-200/50 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-200",
        success: "bg-green-50 border border-green-200/50 text-green-800 dark:bg-green-950/20 dark:border-green-900/40 dark:text-green-200",
        warning: "bg-yellow-50 border border-yellow-200/50 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-900/40 dark:text-yellow-200",
        danger: "bg-red-50 border border-red-200/50 text-red-800 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-200",
      }[data.variant || "info"];
      
      const customStyles = getComponentStyles(data, "rounded-lg", variantBg);
      
      return (
        <div className={`px-4 py-3 text-sm leading-relaxed ${customStyles}`}>
          {parseTemplateText(data.text || "", variables)}
        </div>
      );
    }
    case "arguments":
      return (
        <div className={`p-4 ${appliedStyles}`}>
          {data.title && <h3 className="font-bold mb-3">{parseTemplateText(data.title, variables)}</h3>}
          <ul className="space-y-2.5">
            {data.priceFeatures?.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-bold" style={{ color: primary }}>✓</span>
                <span>{parseTemplateText(f, variables)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "level":
      return (
        <div className={`p-3 ${appliedStyles}`}>
          <div className="text-xs text-muted-foreground mb-1.5 font-medium">
            {parseTemplateText(data.text || t.progress, variables)}
          </div>
          <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{ width: `${data.level || 0}%`, background: primary }}
            />
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className={`p-4 space-y-4 ${appliedStyles}`}>
          {data.title && <h3 className="font-bold text-center border-b pb-2">{parseTemplateText(data.title, variables)}</h3>}
          <div className="space-y-3.5">
            {data.testimonials?.map((tt) => (
              <div key={tt.id} className="rounded-lg border p-3.5 bg-background/50 space-y-1.5 shadow-sm">
                <p className="text-sm italic leading-relaxed text-foreground/90">"{parseTemplateText(tt.text, variables)}"</p>
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-muted-foreground">— {parseTemplateText(tt.author, variables)}</p>
                  <span className="text-amber-500 text-xs">★★★★★</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    case "button":
      return (
        <button
          onClick={() => {
            if (data.href) {
              // External link — open URL, don't advance
              fireLead(variables, true);
              window.open(data.href, data.openInNewTab !== false ? '_blank' : '_self');
            } else {
              onAnswer(data.buttonText, data.nextStepId);
            }
          }}
          className={`w-full py-3.5 px-4 font-semibold text-white transition-transform active:scale-95 shadow-md ${getAnimationClass()} ${appliedStyles}`}
          style={{ background: primary }}
        >
          {parseTemplateText(data.buttonText || "", variables)}
        </button>
      );
    case "capture":
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const values: Record<string, unknown> = {};
            const fieldVars: Record<string, unknown> = {};
            data.fields?.forEach((f) => {
              const val = fd.get(f.label);
              values[f.label] = val;
              if (f.idName) {
                fieldVars[f.idName] = val;
              }
            });
            onSubmitCapture(values, fieldVars, data.nextStepId);
          }}
          className={`p-5 space-y-4 ${appliedStyles}`}
        >
          {data.title && (
            <h3 className="text-xl font-bold text-center text-foreground">
              {parseTemplateText(data.title, variables)}
            </h3>
          )}
          <div className="space-y-3">
            {data.fields?.map((f) => (
              <div key={f.id} className="space-y-1">
                <Label className="text-sm font-medium">{parseTemplateText(f.label, variables)}</Label>
                <Input name={f.label} type={f.type} required={f.required} className="w-full bg-background" />
              </div>
            ))}
          </div>
          <button
            type="submit"
            className="w-full py-3.5 px-4 rounded-lg font-semibold text-white shadow-md transition hover:brightness-105 active:scale-95 mt-2"
            style={{ background: primary }}
          >
            {parseTemplateText(data.buttonText || t.submit, variables)}
          </button>
        </form>
      );
    case "space":
      return <div style={{ height: data.height || 24 }} />;
    case "image":
      return data.imageUrl ? (
        <div className={`p-1.5 overflow-hidden ${appliedStyles}`}>
          <img src={data.imageUrl} alt={data.alt || ""} className="mx-auto max-h-64 object-cover w-full rounded-md" />
        </div>
      ) : (
        <div className="grid h-32 place-items-center rounded-lg border-2 border-dashed text-xs text-muted-foreground">
          {t.imageUrl}
        </div>
      );
    case "loading":
      return (
        <div className={`flex flex-col items-center gap-3 py-6 px-4 text-center ${appliedStyles}`}>
          <div
            className="h-10 w-10 rounded-full border-4 border-muted animate-spin"
            style={{ borderTopColor: primary }}
          />
          <p className="text-sm font-medium text-muted-foreground">{parseTemplateText(data.text || "", variables)}</p>
        </div>
      );
    case "options": {
      const cols = data.columns || 2;
      return (
        <div className={`p-4 space-y-4 ${appliedStyles}`}>
          {data.title && <h2 className="text-xl font-bold text-center text-foreground">{parseTemplateText(data.title, variables)}</h2>}
          {data.subtitle && (
            <p className="text-sm text-muted-foreground text-center">{parseTemplateText(data.subtitle, variables)}</p>
          )}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {data.options?.map((opt) => {
              // Obtemos os estilos específicos das alternativas, herdando ou não a estética Inlead
              const optStyles = getComponentStyles({ 
                ...data, 
                aesthetic: data.aesthetic || "simple", 
                borders: data.borders || "medium" 
              }, "rounded-xl", "border-2 bg-background text-foreground");
              
              return (
                <button
                  key={opt.id}
                  onClick={() => {
                    if (opt.href) {
                      fireLead(variables, true);
                      window.open(opt.href, opt.openInNewTab !== false ? '_blank' : '_self');
                    } else {
                      onAnswer(opt.label, opt.nextStepId, opt.score, opt.idName);
                    }
                  }}
                  className={`overflow-hidden flex flex-col items-stretch transition hover:scale-[1.02] hover:shadow-md cursor-pointer ${optStyles}`}
                  style={{ borderColor: primary }}
                >
                  {opt.image && (
                    <img src={opt.image} alt={opt.label} className="aspect-square w-full object-cover border-b" />
                  )}
                  <div
                    className="py-3.5 px-3 font-semibold text-center text-sm flex-1 flex items-center justify-center"
                  >
                    {parseTemplateText(opt.label, variables)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    case "price":
      return (
        <div className={`p-6 space-y-5 text-center ${appliedStyles}`}>
          {data.title && <h3 className="text-lg font-bold">{parseTemplateText(data.title, variables)}</h3>}
          <div className="flex flex-col items-center">
            <span className="text-4xl font-extrabold" style={{ color: primary }}>
              {parseTemplateText(data.price || "", variables)}
            </span>
            <span className="text-xs text-muted-foreground mt-0.5">{parseTemplateText(data.pricePeriod || "", variables)}</span>
          </div>
          <ul className="space-y-2 text-left border-t border-b py-4">
            {data.priceFeatures?.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span className="font-bold" style={{ color: primary }}>✓</span>
                <span>{parseTemplateText(f, variables)}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              const link = data.href || funnel.saleUrl;
              if (link) {
                fireLead(variables, true);
                window.open(link, data.openInNewTab !== false ? '_blank' : '_self');
              }
              onAnswer(data.price, data.nextStepId);
            }}
            className="w-full py-3.5 px-4 rounded-lg font-semibold text-white shadow-md transition active:scale-95"
            style={{ background: primary }}
          >
            {parseTemplateText(data.buttonText || t.continue, variables)}
          </button>
        </div>
      );
    case "timer":
      return (
        <div className={`p-4 ${appliedStyles}`}>
          <TimerView seconds={data.seconds || 60} label={parseTemplateText(data.text || "", variables)} color={primary} />
        </div>
      );
    case "charts":
    case "cartesian": {
      const chartValues = data.chartData?.map((d) => d.value) || [1];
      const max = Math.max(...chartValues, 1);
      return (
        <div className={`p-5 space-y-4 ${appliedStyles}`}>
          {data.title && <h3 className="font-bold text-center">{parseTemplateText(data.title, variables)}</h3>}
          <div className="flex items-end gap-3.5 h-36 border-b pb-2 px-2">
            {data.chartData?.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[10px] font-bold text-muted-foreground">{d.value}</span>
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{ height: `${(d.value / max) * 100}%`, background: primary }}
                />
                <span className="text-[10px] font-medium text-muted-foreground text-ellipsis overflow-hidden whitespace-nowrap w-full text-center">
                  {parseTemplateText(d.label, variables)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "compare":
      return (
        <div className={`p-4 space-y-3 ${appliedStyles}`}>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative rounded-lg overflow-hidden border bg-muted/20">
              {data.beforeImageUrl ? (
                <img src={data.beforeImageUrl} alt={data.beforeLabel || "Antes"} className="w-full aspect-[4/5] object-cover" />
              ) : (
                <div className="w-full aspect-[4/5] grid place-items-center text-xs text-muted-foreground bg-muted/40">Imagem Antes</div>
              )}
              <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded">
                {parseTemplateText(data.beforeLabel || "Antes", variables)}
              </div>
            </div>
            <div className="relative rounded-lg overflow-hidden border bg-muted/20">
              {data.afterImageUrl ? (
                <img src={data.afterImageUrl} alt={data.afterLabel || "Depois"} className="w-full aspect-[4/5] object-cover" />
              ) : (
                <div className="w-full aspect-[4/5] grid place-items-center text-xs text-muted-foreground bg-muted/40">Imagem Depois</div>
              )}
              <div className="absolute top-2 left-2 bg-green-600 text-white text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded">
                {parseTemplateText(data.afterLabel || "Seu objetivo", variables)}
              </div>
            </div>
          </div>
        </div>
      );
    case "video": {
      let embedUrl = data.videoUrl || "";
      if (embedUrl.includes("youtube.com/watch?v=")) {
        const id = embedUrl.split("v=")[1]?.split("&")[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      } else if (embedUrl.includes("youtu.be/")) {
        const id = embedUrl.split("youtu.be/")[1]?.split("?")[0];
        embedUrl = `https://www.youtube.com/embed/${id}`;
      } else if (embedUrl.includes("vimeo.com/")) {
        const id = embedUrl.split("vimeo.com/")[1]?.split("?")[0];
        embedUrl = `https://player.vimeo.com/video/${id}`;
      }
      
      return (
        <div className={`p-2 overflow-hidden ${appliedStyles}`}>
          {embedUrl ? (
            embedUrl.includes("embed") || embedUrl.includes("player.vimeo") ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden">
                <iframe
                  src={embedUrl}
                  title="Vídeo Resposta"
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <video src={embedUrl} controls className="w-full rounded-lg" />
            )
          ) : (
            <div className="grid h-32 place-items-center rounded-lg border-2 border-dashed text-xs text-muted-foreground">
              Insira a URL do vídeo nas propriedades
            </div>
          )}
        </div>
      );
    }
    case "plans":
      return (
        <div className={`p-4 space-y-4 ${appliedStyles}`}>
          {data.title && <h3 className="text-xl font-bold text-center text-foreground">{parseTemplateText(data.title, variables)}</h3>}
          <div className="space-y-3.5">
            {data.plans?.map((plan) => {
              const isPopular = !!plan.popular;
              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    // Use plan-specific href, or fall back to funnel.saleUrl
                    const link = plan.href || funnel.saleUrl;
                    if (link) {
                      fireLead(variables, true);
                      window.open(link, plan.openInNewTab !== false ? '_blank' : '_self');
                    }
                    onAnswer(plan.name, plan.nextStepId);
                  }}
                  className={`relative cursor-pointer transition hover:scale-[1.01] rounded-xl border-2 flex flex-col items-stretch overflow-hidden bg-background ${
                    isPopular ? "border-green-600 shadow-md" : "border-border hover:border-foreground/30"
                  }`}
                >
                  {isPopular && (
                    <div className="bg-green-600 text-white text-[10px] font-black uppercase text-center py-1 tracking-wider">
                      {plan.popularText || "★ MAIS POPULAR ★"}
                    </div>
                  )}
                  <div className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`h-5 w-5 rounded-full border-2 grid place-items-center shrink-0 ${
                        isPopular ? "border-green-600" : "border-muted-foreground"
                      }`}>
                        <div className={`h-2.5 w-2.5 rounded-full ${isPopular ? "bg-green-600" : ""}`} />
                      </div>
                      <span className="font-bold text-foreground text-sm sm:text-base">{parseTemplateText(plan.name, variables)}</span>
                    </div>
                    
                    <div className="text-right flex flex-col">
                      <span className="text-[10px] text-muted-foreground line-through">
                        De {parseTemplateText(plan.originalPrice, variables)} por
                      </span>
                      <span className="text-lg font-black text-foreground" style={{ color: isPopular ? "#16a34a" : primary }}>
                        {parseTemplateText(plan.promoPrice, variables)}
                      </span>
                      {plan.period && (
                        <span className="text-[9px] text-muted-foreground font-medium">{parseTemplateText(plan.period, variables)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    default:
      return null;
  }
}

function TimerView({ seconds, label, color }: { seconds: number; label?: string; color: string }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const t = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="text-center space-y-1">
      {label && <div className="text-sm text-muted-foreground font-medium">{label}</div>}
      <div className="text-4xl font-mono font-black tracking-wider animate-pulse" style={{ color }}>
        {mm}:{ss}
      </div>
    </div>
  );
}
