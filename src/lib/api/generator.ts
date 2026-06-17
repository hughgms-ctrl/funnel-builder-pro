import type { Funnel, Step } from "@/lib/types";
import { getActiveSupabaseClient } from "@/lib/supabase";

export interface GenerationProgress {
  stage: "idle" | "submitting" | "generating" | "refining" | "done" | "error";
  message: string;
  percent: number;
}

export type GenerationProgressCallback = (p: GenerationProgress) => void;

async function invokeFn<T>(name: string, body: any): Promise<T> {
  const supabase = getActiveSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(`${name}: ${error.message}`);
  if (data?.error) throw new Error(`${name}: ${data.error}`);
  return data as T;
}

export async function generateFunnelWithAI(
  prompt: string,
  onProgress: GenerationProgressCallback
): Promise<Funnel> {
  onProgress({
    stage: "submitting",
    message: "🔌 Enviando briefing para a Inteligência Artificial...",
    percent: 10,
  });

  try {
    onProgress({
      stage: "generating",
      message: "🧠 Gerando a estrutura completa do quiz (esta etapa pode levar alguns segundos)...",
      percent: 40,
    });

    const funnel = await invokeFn<Funnel>("funnel-generator", { prompt });

    onProgress({
      stage: "refining",
      message: "✨ Refinando textos persuasivos, cores e fluxos de navegação...",
      percent: 85,
    });

    // Make sure we have standard fallbacks for any missing attributes
    const verifiedFunnel: Funnel = {
      ...funnel,
      id: funnel.id || Math.random().toString(36).slice(2, 10),
      name: funnel.name || `Funil Gerado por IA`,
      primaryColor: funnel.primaryColor || "#7c3aed",
      accentColor: funnel.accentColor || "#ec4899",
      fontFamily: funnel.fontFamily || "Inter",
      steps: (funnel.steps || []).flatMap((step, idx): Step[] => {
        const optionsComponents = (step.components || []).filter((c: any) => c.type === "options");
        
        if (optionsComponents.length <= 1) {
          return [{
            ...step,
            id: step.id || Math.random().toString(36).slice(2, 10),
            title: step.title || `Etapa ${idx + 1}`,
            showLogo: step.showLogo ?? true,
            showProgress: step.showProgress ?? true,
            showBack: step.showBack ?? (idx > 0),
            components: (step.components || []).map((comp: any) => ({
              aesthetic: "simple",
              borders: "medium",
              width: 100,
              animation: "none",
              fixedFooter: false,
              displayRule: "",
              ...comp,
              id: comp.id || Math.random().toString(36).slice(2, 10),
            })),
          }];
        }
        
        // Split this step into multiple steps, one for each options component!
        return optionsComponents.map((optComp, oIdx) => {
          const compIdxInOriginal = step.components.indexOf(optComp);
          const precedingComponents = step.components
            .slice(0, compIdxInOriginal)
            .filter((c: any) => c.type === "text" || c.type === "image");
            
          return {
            id: Math.random().toString(36).slice(2, 10),
            title: optComp.title || `${step.title} - Q${oIdx + 1}`,
            showLogo: step.showLogo ?? true,
            showProgress: step.showProgress ?? true,
            showBack: true,
            components: [
              ...precedingComponents,
              optComp
            ].map((comp: any) => ({
              aesthetic: "simple",
              borders: "medium",
              width: 100,
              animation: "none",
              fixedFooter: false,
              displayRule: "",
              ...comp,
              id: comp.id || Math.random().toString(36).slice(2, 10),
            })),
          };
        });
      }),
    };

    onProgress({
      stage: "done",
      message: "🎉 Funil criado com sucesso!",
      percent: 100,
    });

    return verifiedFunnel;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido ao gerar o funil";
    onProgress({
      stage: "error",
      message: msg,
      percent: 0,
    });
    throw new Error(msg);
  }
}
