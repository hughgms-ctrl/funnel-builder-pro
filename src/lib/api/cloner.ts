import type { Funnel, Step, ComponentData } from "@/lib/types";
import { getActiveSupabaseClient } from "@/lib/supabase";

const uid = () => Math.random().toString(36).slice(2, 10);

export interface CloneProgress {
  stage: "idle" | "fetching" | "analyzing" | "building" | "done" | "error";
  message: string;
  percent: number;
}
export type ProgressCallback = (p: CloneProgress) => void;

export async function generateImage(prompt: string): Promise<string> {
  const supabase = getActiveSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.functions.invoke("generate-image", { body: { prompt } });
  if (error) throw new Error(error.message);
  if (data?.error) throw new Error(data.error);
  return data?.imageUrl || "";
}

interface ScrapedStep {
  stepNumber: number;
  screenshot: string;
  content: {
    allText: string;
    title: string;
    subtitle: string;
    options: Array<{ text: string; hasImage: boolean; imageUrl: string; href?: string }>;
    inputs: Array<{ type: string; placeholder: string; name: string }>;
    buttons: Array<string | { text: string; href?: string }>;
    images: Array<{ src: string; alt: string }>;
    pageType: string;
    primaryColor: string;
    url: string;
  };
}

async function invokeFn<T>(name: string, body: any): Promise<T> {
  const supabase = getActiveSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado");
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw new Error(`${name}: ${error.message}`);
  if (data?.error) throw new Error(`${name}: ${data.error}`);
  return data as T;
}


function inferStepTitle(step: ScrapedStep, index: number): string {
  const { pageType, title } = step.content;
  if (title) return title;
  switch (pageType) {
    case "intro": return "Início";
    case "options": return `Pergunta ${index}`;
    case "capture": return "Seus Dados";
    case "loading": return "Analisando...";
    case "offer": return "Oferta Especial";
    case "result": return "Seu Resultado";
    default: return `Etapa ${index + 1}`;
  }
}

function normalizeComponents(components: any[], step: ScrapedStep): ComponentData[] {
  const getBtnText = (b: any) => (typeof b === "string" ? b : b?.text);
  const getBtnHref = (b: any) => (typeof b === "string" ? undefined : b?.href);
  const firstHref = (step.content.buttons || []).map(getBtnHref).find(Boolean);
  let btnIdx = 0;

  return components.map((c: any) => {
    const base: any = {
      id: c.id || uid(),
      aesthetic: "simple",
      borders: "medium",
      width: 100,
      animation: "none",
      fixedFooter: false,
      displayRule: "",
      ...c,
    };

    if (base.type === "image") {
      return { ...base, href: undefined };
    }

    if (base.type === "button" || base.type === "price") {
      const b = step.content.buttons?.[btnIdx++];
      return {
        ...base,
        buttonText: base.buttonText || getBtnText(b) || "Continuar",
        href: base.href || getBtnHref(b) || firstHref,
        openInNewTab: base.openInNewTab ?? false,
      };
    }

    if (base.type === "options" && Array.isArray(base.options)) {
      base.options = base.options.map((opt: any) => {
        const scraped = step.content.options?.find(
          (s) => s.text === opt.label || s.text?.includes(opt.label) || opt.label?.includes(s.text),
        );
        return {
          ...opt,
          id: opt.id || uid(),
          image: opt.image || scraped?.imageUrl || undefined,
          href: opt.href || scraped?.href || undefined,
          openInNewTab: opt.openInNewTab ?? false,
        };
      });
    }

    return base;
  }) as ComponentData[];
}

function componentsFromScrape(step: ScrapedStep): ComponentData[] {
  const content = step.content;
  const components: ComponentData[] = [];

  if (content.title && content.title !== content.allText) {
    components.push({ id: uid(), type: "text", text: content.title });
  }

  const mainImage = content.images?.[0];
  if (mainImage?.src) {
    components.push({ id: uid(), type: "image", imageUrl: mainImage.src, alt: mainImage.alt || content.title || "Imagem do quiz" });
  }

  if (content.options?.length) {
    components.push({
      id: uid(),
      type: "options",
      title: content.title || "Escolha uma opção",
      subtitle: content.subtitle,
      columns: content.options.some((option) => option.imageUrl) ? 2 : 1,
      options: content.options.map((option) => ({
        id: uid(),
        label: option.text,
        image: option.imageUrl || undefined,
        href: option.href || undefined,
        openInNewTab: false,
      })),
    });
  }

  if (content.inputs?.length) {
    components.push({
      id: uid(),
      type: "capture",
      title: content.title || "Preencha seus dados",
      fields: content.inputs.map((input) => ({
        id: uid(),
        type: input.type === "tel" || input.type === "email" ? input.type : "text",
        label: input.placeholder || input.name || "Campo",
        required: true,
      })),
      buttonText: typeof content.buttons?.[0] === "string" ? content.buttons[0] : content.buttons?.[0]?.text || "Continuar",
    });
  }

  for (const button of content.buttons || []) {
    const text = typeof button === "string" ? button : button.text;
    const href = typeof button === "string" ? undefined : button.href;
    if (text) components.push({ id: uid(), type: "button", buttonText: text, href, openInNewTab: false });
  }

  if (!components.length) {
    components.push({ id: uid(), type: "text", text: content.allText.slice(0, 600) || `Etapa ${step.stepNumber}` });
  }

  return components;
}

export async function cloneFunnel(
  url: string,
  onProgress: ProgressCallback,
): Promise<Funnel> {
  // PHASE 1: Scrape all steps
  onProgress({ stage: "fetching", message: "🌐 Navegando pelo funil — capturando screenshots...", percent: 5 });

  const scrapeRes = await invokeFn<{ steps: ScrapedStep[] }>("quiz-scraper", { url, maxSteps: 20 });
  const scrapedSteps = scrapeRes.steps || [];

  if (!scrapedSteps.length) {
    throw new Error("Nenhuma etapa capturada. Verifique a URL ou tente novamente.");
  }

  onProgress({
    stage: "fetching",
    message: `✅ ${scrapedSteps.length} etapas capturadas.`,
    percent: 25,
  });

  // PHASE 2: Analyze each screenshot with Gemini Vision
  const primaryColor = scrapedSteps[0]?.content?.primaryColor || "#7c3aed";
  const funnelTheme =
    new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || "quiz";
  const context = `"${funnelTheme}" — quiz de vendas em pt-BR`;

  const analyzedSteps: Step[] = [];

  for (let i = 0; i < scrapedSteps.length; i++) {
    const step = scrapedSteps[i];
    const percent = 25 + Math.round(((i + 1) / scrapedSteps.length) * 65);

    onProgress({
      stage: "analyzing",
      message: `🧠 Analisando etapa ${i + 1}/${scrapedSteps.length} com IA Vision...`,
      percent,
    });

    let components: ComponentData[] = [];
    try {
      const res = await invokeFn<{ components: any[] }>("funnel-analyzer", {
        screenshot: step.screenshot,
        content: step.content,
        context,
      });
      components = normalizeComponents(res.components || [], step);
      if (!components.length) components = componentsFromScrape(step);
    } catch (err: any) {
      console.error(`Step ${i + 1} analysis failed:`, err.message);
      components = componentsFromScrape(step);
    }

    analyzedSteps.push({
      id: uid(),
      title: inferStepTitle(step, i),
      showLogo: true,
      showProgress: true,
      showBack: i > 0,
      isSaleStep: step.content.pageType === "offer" || step.content.pageType === "result",
      components,
    });
  }

  onProgress({ stage: "building", message: "🛠️ Montando funil...", percent: 95 });

  const funnel: Funnel = {
    id: uid(),
    name: `Clone de ${funnelTheme}`,
    primaryColor,
    accentColor: primaryColor,
    fontFamily: "Inter",
    steps: analyzedSteps,
  };

  onProgress({ stage: "done", message: "🎉 Clonagem concluída!", percent: 100 });
  return funnel;
}
