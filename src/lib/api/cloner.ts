import type { Funnel, Step, ComponentData } from "@/lib/types";
import { getActiveSupabaseClient } from "@/lib/supabase";

const uid = () => Math.random().toString(36).slice(2, 10);

export type AIProvider = "openai" | "anthropic";

export interface CloneProgress {
  stage:
    | "idle"
    | "fetching"
    | "analyzing"
    | "extracting"
    | "generating_images"
    | "building"
    | "done"
    | "error";
  message: string;
  percent: number;
}

export type ProgressCallback = (p: CloneProgress) => void;

// ─── Type for scraped step data ───────────────────────────────────────────────
interface ScrapedStep {
  stepNumber: number;
  screenshot: string; // data:image/png;base64,...
  content: {
    allText: string;
    title: string;
    subtitle: string;
    options: Array<{ text: string; hasImage: boolean; imageUrl: string; href?: string }>;
    inputs: Array<{ type: string; placeholder: string; name: string }>;
    buttons: Array<string | { text: string; href?: string }>;
    images: Array<{ src: string; alt: string }>;
    pageType: "intro" | "options" | "capture" | "loading" | "offer" | "result" | "unknown";
    primaryColor: string;
    url: string;
  };
}

// ─── Call quiz-scraper Edge Function ──────────────────────────────────────────
async function callQuizScraperEdgeFunction(url: string): Promise<ScrapedStep[]> {
  const supabase = getActiveSupabaseClient();
  if (!supabase) throw new Error("Supabase não configurado");

  const { data, error } = await supabase.functions.invoke("quiz-scraper", {
    body: { url, maxSteps: 25 },
  });

  if (error) throw new Error(`Edge Function error: ${error.message}`);
  // Check for function-level error in response body
  if (data?.error) throw new Error(`Scraper error: ${data.error}`);
  if (!data?.steps?.length) throw new Error("Nenhuma etapa capturada pelo scraper — verifique a chave BROWSERLESS_API_KEY no Supabase");

  return data.steps as ScrapedStep[];
}

// ─── Microlink screenshot fallback (free, no key) ────────────────────────────
async function getMicrolinkScreenshot(url: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&waitFor=2000`,
      { signal: AbortSignal.timeout(20_000) },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url || null;
  } catch {
    return null;
  }
}

// ─── Analyze a single step screenshot with GPT-4 Vision ──────────────────────
async function analyzeStepWithVision(
  apiKey: string,
  step: ScrapedStep,
  funnelContext: string,
): Promise<ComponentData[]> {
  const isBase64 = step.screenshot.startsWith("data:");
  const knownContent = step.content;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing quiz funnel screenshots and converting them to structured JSON components.

Return a JSON array of components. Each component is one of these types:
- { "type": "text", "text": "..." }
- { "type": "image", "imageUrl": "url or empty", "alt": "..." }
- { "type": "options", "title": "...", "subtitle": "...", "columns": 1 or 2, "options": [{ "id": "rand8", "label": "...", "image": "imageUrl or empty", "href": "checkout/link if this option button redirects" }] }
- { "type": "capture", "title": "...", "fields": [{ "id": "rand8", "type": "text|email|tel", "label": "...", "required": true }], "buttonText": "..." }
- { "type": "button", "buttonText": "...", "href": "external link only when the CTA button redirects" }
- { "type": "loading", "text": "...", "loadingDuration": 3 }
- { "type": "price", "title": "...", "price": "R$ XX", "pricePeriod": "/único", "priceFeatures": ["..."], "buttonText": "..." }
- { "type": "plans", "title": "...", "plans": [{ "id": "rand8", "name": "...", "originalPrice": "R$ XX", "promoPrice": "R$ XX", "period": "/mês", "popular": false }] }
- { "type": "testimonials", "title": "...", "testimonials": [{ "id": "rand8", "author": "...", "text": "..." }] }
- { "type": "timer", "seconds": 600, "text": "Oferta expira em" }
- { "type": "alert", "text": "...", "variant": "info" }

RULES:
- Extract ALL text VERBATIM from the image (Brazilian Portuguese)
- For options: list EVERY visible option label
- Preserve image URLs that are inside option buttons/cards. Put those URLs in option.image, never in a separate linked image component.
- If a visible CTA/option redirects to a page/checkout, put the URL in button.href or option.href. Do NOT attach links to image components.
- For capture forms: list ALL visible fields
- For prices: extract EXACT price values
- Generate 8-char random alphanumeric ids for id fields
- Return ONLY a JSON array, no markdown or explanation`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this screenshot of step ${step.stepNumber} of a quiz funnel.
Context: ${funnelContext}
Page type detected: ${knownContent.pageType}
Known title: "${knownContent.title}"
Known options count: ${knownContent.options.length}
Known options with images/links: ${JSON.stringify(knownContent.options).slice(0, 1200)}
Known buttons/links: ${JSON.stringify(knownContent.buttons).slice(0, 800)}
Known text: "${knownContent.allText.slice(0, 800)}"

Extract ALL components you see in this screenshot. Be extremely accurate and verbose.`,
            },
            {
              type: "image_url",
              image_url: {
                url: step.screenshot,
                detail: "high",
              },
            },
          ],
        },
      ],
      max_tokens: 2000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GPT-4V error: ${(err as any)?.error?.message || res.status}`);
  }

  const data = await res.json();
  const content = data.choices[0]?.message?.content || "[]";

  // Clean up JSON response
  const jsonStr = content
    .replace(/^```(?:json)?\n?/m, "")
    .replace(/\n?```$/m, "")
    .trim();

  try {
    const components = JSON.parse(jsonStr);
    return (Array.isArray(components) ? components : [components]).map((c: any) => ({
      id: c.id || uid(),
      aesthetic: "simple",
      borders: "medium",
      width: 100,
      animation: "none",
      fixedFooter: false,
      displayRule: "",
      ...c,
    })) as ComponentData[];
  } catch {
    // Fallback: create text component from known content
    return [{ id: uid(), type: "text" as const, text: knownContent.title || knownContent.allText.slice(0, 200) } as ComponentData];
  }
}

// ─── Analyze a single step screenshot with Claude Vision ──────────────────────
async function analyzeStepWithClaude(
  apiKey: string,
  step: ScrapedStep,
  funnelContext: string,
): Promise<ComponentData[]> {
  // Convert base64 screenshot for Claude
  const base64Data = step.screenshot.replace(/^data:image\/[a-z]+;base64,/, "");
  const knownContent = step.content;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: base64Data },
            },
            {
              type: "text",
              text: `Analyze this screenshot of step ${step.stepNumber} of a quiz funnel (${funnelContext}).
Page type: ${knownContent.pageType}. Known title: "${knownContent.title}". Options found: ${knownContent.options.length}.

Return a JSON array of components. Types: text, image, options, capture, button, loading, price, plans, testimonials, timer, alert.
- options: { type:"options", title, subtitle, columns(1-2), options:[{id,label,image,href}] }
- capture: { type:"capture", title, fields:[{id,type,label,required}], buttonText }
- button: { type:"button", buttonText, href } where href is only for CTA redirects
- price: { type:"price", title, price, pricePeriod, priceFeatures:[], buttonText, href }
- plans: { type:"plans", title, plans:[{id,name,originalPrice,promoPrice,period,popular}] }
Use 8-char random alphanumeric ids. Extract ALL text VERBATIM in Brazilian Portuguese. Preserve option button images in option.image, and put redirect URLs on buttons/options, never on image components. Return ONLY valid JSON array.`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error("Claude Vision error");
  const data = await res.json();
  const content = data.content[0]?.text || "[]";
  const jsonStr = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

  try {
    const components = JSON.parse(jsonStr);
    return (Array.isArray(components) ? components : [components]).map((c: any) => ({
      id: c.id || uid(),
      aesthetic: "simple",
      borders: "medium",
      width: 100,
      animation: "none",
      fixedFooter: false,
      displayRule: "",
      ...c,
    })) as ComponentData[];
  } catch {
    return [{ id: uid(), type: "text" as const, text: knownContent.title || knownContent.allText.slice(0, 200) } as ComponentData];
  }
}

// ─── Determine step title from detected page type ─────────────────────────────
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

function getButtonText(button: string | { text: string; href?: string }): string {
  return typeof button === "string" ? button : button.text;
}

function getButtonHref(button: string | { text: string; href?: string }): string | undefined {
  return typeof button === "string" ? undefined : button.href;
}

function normalizeScrapedComponents(components: ComponentData[], step: ScrapedStep): ComponentData[] {
  const firstHref = step.content.buttons.map(getButtonHref).find(Boolean);
  let buttonIndex = 0;

  return components.map((component) => {
    if (component.type === "image") {
      return { ...component, href: undefined, nextStepId: component.nextStepId };
    }

    if (component.type === "button" || component.type === "price") {
      const button = step.content.buttons[buttonIndex++];
      return {
        ...component,
        buttonText: component.buttonText || getButtonText(button || "") || "Continuar",
        href: component.href || getButtonHref(button) || firstHref,
        openInNewTab: component.openInNewTab ?? false,
      };
    }

    if (component.type === "options") {
      const options = (component.options || []).map((option) => {
        const scraped = step.content.options.find((item) => item.text === option.label)
          || step.content.options.find((item) => item.text.includes(option.label) || option.label.includes(item.text));

        return {
          ...option,
          image: option.image || scraped?.imageUrl || undefined,
          href: option.href || scraped?.href || undefined,
          openInNewTab: option.openInNewTab ?? false,
        };
      });

      return { ...component, options };
    }

    return component;
  });
}

// ─── Generate DALL-E image ────────────────────────────────────────────────────
export async function generateImage(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "dall-e-3", prompt, size: "1024x1024", quality: "standard", n: 1 }),
  });
  if (!res.ok) throw new Error("DALL-E failed");
  const data = await res.json();
  return data.data[0]?.url || "";
}

// ─── Normalize funnel structure ───────────────────────────────────────────────
function normalizeFunnel(funnel: Partial<Funnel>): Funnel {
  return {
    id: funnel.id || uid(),
    name: funnel.name || "Funil Clonado",
    primaryColor: funnel.primaryColor || "#7c3aed",
    accentColor: funnel.accentColor || "#ec4899",
    fontFamily: funnel.fontFamily || "Inter",
    steps: (funnel.steps || []).map((s) => ({
      id: s.id || uid(),
      title: s.title || "Etapa",
      showLogo: s.showLogo ?? true,
      showProgress: s.showProgress ?? true,
      showBack: s.showBack ?? false,
      isSaleStep: s.isSaleStep ?? false,
      components: (s.components || []).map((c) => ({
        aesthetic: "simple",
        borders: "medium",
        width: 100,
        animation: "none",
        fixedFooter: false,
        displayRule: "",
        ...c,
        id: c.id || uid(),
      })) as ComponentData[],
    })) as Step[],
  };
}

// ─── MAIN CLONE FUNCTION ──────────────────────────────────────────────────────
export async function cloneFunnel(
  url: string,
  provider: AIProvider,
  apiKeys: { openai?: string; anthropic?: string },
  onProgress: ProgressCallback,
): Promise<Funnel> {
  if (provider === "openai" && !apiKeys.openai) {
    throw new Error("Chave da API OpenAI não configurada. Vá em ⚙️ Configurações.");
  }
  if (provider === "anthropic" && !apiKeys.anthropic) {
    throw new Error("Chave da API Anthropic não configurada. Vá em ⚙️ Configurações.");
  }

  // ── FASE 1: Capturar screenshots de cada etapa ────────────────────────────
  onProgress({ stage: "fetching", message: "🌐 Iniciando navegador headless...", percent: 5 });

  let scrapedSteps: ScrapedStep[] = [];
  let usedFallback = false;

  try {
    onProgress({ stage: "fetching", message: "📸 Navegando pelo funil — capturando screenshot de cada etapa...", percent: 10 });
    scrapedSteps = await callQuizScraperEdgeFunction(url);
    onProgress({
      stage: "fetching",
      message: `✅ ${scrapedSteps.length} etapas capturadas com sucesso!`,
      percent: 30,
    });
  } catch (edgeErr: any) {
    onProgress({
      stage: "fetching",
      message: `⚠️ Edge Function indisponível: ${edgeErr.message}. Usando Microlink...`,
      percent: 15,
    });

    // Fallback: Microlink screenshot (only step 1)
    const screenshotUrl = await getMicrolinkScreenshot(url);
    if (screenshotUrl) {
      // Download and convert to base64 for Vision
      try {
        const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(15_000) });
        const blob = await imgRes.blob();
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        scrapedSteps = [{
          stepNumber: 1,
          screenshot: base64,
          content: {
            allText: `Funil: ${new URL(url).pathname.split("/").filter(Boolean).pop() || url}`,
            title: "",
            subtitle: "",
            options: [],
            inputs: [],
            buttons: [],
            images: [],
            pageType: "unknown",
            primaryColor: "#7c3aed",
            url,
          },
        }];
        usedFallback = true;
        onProgress({ stage: "fetching", message: "📸 Screenshot da página inicial capturada via Microlink.", percent: 25 });
      } catch {
        scrapedSteps = [];
      }
    }
  }

  if (scrapedSteps.length === 0) {
    throw new Error(
      "Não foi possível capturar nenhuma etapa do funil.\n\n" +
      "Para clonar funnels com JavaScript, configure a variável BROWSERLESS_API_KEY na Edge Function do Supabase.\n" +
      "Crie uma conta gratuita em browserless.io"
    );
  }

  // ── FASE 2: Analisar cada screenshot com Vision AI ───────────────────────
  const primaryColor = scrapedSteps[0]?.content?.primaryColor || "#7c3aed";
  const funnelTheme = new URL(url).pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") || url;
  const funnelContext = `"${funnelTheme}" — quiz de vendas em português do Brasil`;

  const analyzedSteps: Step[] = [];

  for (let i = 0; i < scrapedSteps.length; i++) {
    const step = scrapedSteps[i];
    const percent = 30 + Math.round((i / scrapedSteps.length) * 40);

    onProgress({
      stage: "analyzing",
      message: `🔍 Analisando etapa ${i + 1}/${scrapedSteps.length} com Vision IA...`,
      percent,
    });

    try {
      let components: ComponentData[];

      if (provider === "openai") {
        components = await analyzeStepWithVision(apiKeys.openai!, step, funnelContext);
      } else {
        components = await analyzeStepWithClaude(apiKeys.anthropic!, step, funnelContext);
      }
      components = normalizeScrapedComponents(components, step);

      const isSaleStep = step.content.pageType === "offer";

      analyzedSteps.push({
        id: uid(),
        title: inferStepTitle(step, i),
        showLogo: true,
        showProgress: step.content.pageType !== "offer" && step.content.pageType !== "result",
        showBack: i > 0 && step.content.pageType !== "offer",
        isSaleStep,
        components,
      } as Step);

    } catch (visionErr: any) {
      onProgress({ stage: "analyzing", message: `⚠️ Etapa ${i + 1}: ${visionErr.message}`, percent });
      // Add placeholder step
      analyzedSteps.push({
        id: uid(),
        title: inferStepTitle(step, i),
        showLogo: true,
        showProgress: true,
        showBack: i > 0,
        isSaleStep: false,
        components: [{
          id: uid(),
          type: "text" as const,
          text: step.content.title || step.content.allText.slice(0, 200),
          aesthetic: "simple",
          borders: "medium",
          width: 100,
          animation: "none",
          fixedFooter: false,
          displayRule: "",
        } as ComponentData],
      } as Step);
    }
  }

  // ── FASE 3: Montar funil ─────────────────────────────────────────────────
  onProgress({ stage: "extracting", message: "⚙️ Montando estrutura do funil...", percent: 72 });

  const rawFunnel: Partial<Funnel> = {
    id: uid(),
    name: funnelTheme.charAt(0).toUpperCase() + funnelTheme.slice(1),
    primaryColor,
    accentColor: "#ec4899",
    fontFamily: "Inter",
    steps: analyzedSteps,
  };

  const funnel = normalizeFunnel(rawFunnel);

  // ── FASE 4: Gerar imagens com DALL-E ────────────────────────────────────
  if (apiKeys.openai) {
    // 4a. Image components without URL
    const emptyImages = funnel.steps.flatMap((s) =>
      s.components.filter((c) => c.type === "image" && !c.imageUrl)
    );

    // 4b. Option items that looked like image cards but whose image could not be extracted
    const emptyOptionImages = funnel.steps.flatMap((s) =>
      s.components
        .filter((c) => c.type === "options")
        .flatMap((c) => (c.options || []).filter((o: any) => !o.image && scrapedSteps.some((step) =>
          step.content.options.some((scraped) => scraped.hasImage && (scraped.text === o.label || scraped.text.includes(o.label) || o.label.includes(scraped.text)))
        )))
    );

    const totalImages = Math.min(emptyImages.length + emptyOptionImages.length, 6);

    if (totalImages > 0) {
      onProgress({ stage: "generating_images", message: `🎨 Gerando ${totalImages} imagens com DALL-E 3...`, percent: 75 });

      let generated = 0;

      // Generate for image components
      for (const comp of emptyImages.slice(0, 3)) {
        try {
          const stepTitle = funnel.steps.find((s) => s.components.includes(comp))?.title || "";
          comp.imageUrl = await generateImage(
            apiKeys.openai,
            `Professional marketing photo for "${funnel.name}" – ${stepTitle}. Warm, lifestyle, Brazilian family, clean background, no text.`,
          );
          generated++;
          onProgress({ stage: "generating_images", message: `🖼️ Imagem ${generated}/${totalImages} gerada...`, percent: 75 + (generated / totalImages) * 15 });
        } catch {}
      }

      // Generate for option images (quiz cards with photos)
      for (const opt of emptyOptionImages.slice(0, 4)) {
        try {
          const label = (opt as any).label || "";
          (opt as any).image = await generateImage(
            apiKeys.openai,
            `Warm lifestyle photo representing "${label}" in context of "${funnel.name}". Real photo, natural lighting, no text, no watermark.`,
          );
          generated++;
          onProgress({ stage: "generating_images", message: `🖼️ Imagem da opção "${label}" gerada...`, percent: 75 + (generated / totalImages) * 15 });
        } catch {}
      }
    }
  }

  onProgress({
    stage: "done",
    message: usedFallback
      ? `✅ Funil clonado! (${funnel.steps.length} etapas via screenshot + Vision IA)`
      : `✅ Funil clonado com perfeição! (${funnel.steps.length} etapas navegadas)`,
    percent: 100,
  });

  return funnel;
}
