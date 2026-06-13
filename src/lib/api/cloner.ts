import type { Funnel, Step, ComponentData } from "@/lib/types";

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

// ─── CORS Proxy List ──────────────────────────────────────────────────────────
// Multiple proxies for resilience — tries each one in order
const CORS_PROXIES: Array<(url: string) => { proxyUrl: string; extractHtml: (r: Response) => Promise<string> }> = [
  (url) => ({
    proxyUrl: `https://corsproxy.io/?${encodeURIComponent(url)}`,
    extractHtml: (r) => r.text(),
  }),
  (url) => ({
    proxyUrl: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
    extractHtml: async (r) => {
      const json = await r.json();
      return json.contents || "";
    },
  }),
  (url) => ({
    proxyUrl: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    extractHtml: (r) => r.text(),
  }),
];

// ─── Fetch page content via CORS proxies ──────────────────────────────────────
async function fetchPageContent(url: string): Promise<{ html: string; baseUrl: string }> {
  const errors: string[] = [];

  for (const makeProxy of CORS_PROXIES) {
    try {
      const { proxyUrl, extractHtml } = makeProxy(url);
      const res = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(10_000), // 10s timeout per proxy
      });

      if (!res.ok) {
        errors.push(`${proxyUrl}: HTTP ${res.status}`);
        continue;
      }

      const html = await extractHtml(res);
      if (html && html.length > 100) {
        return { html, baseUrl: url };
      }
      errors.push(`${proxyUrl}: empty response`);
    } catch (err: any) {
      errors.push(`${err?.message || "unknown error"}`);
    }
  }

  throw new Error(`All proxies failed:\n${errors.join("\n")}`);
}

// ─── Extract readable text & structure from HTML ──────────────────────────────
function extractPageData(html: string, baseUrl: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove script/style noise
  doc.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());

  const title = doc.title || doc.querySelector("h1")?.textContent?.trim() || "";
  const bodyText = (doc.body?.innerText || doc.body?.textContent || "").slice(0, 8000);

  // Extract images
  const images: string[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.src || img.getAttribute("data-src") || "";
    if (src && !src.startsWith("data:") && src.length > 10) {
      try {
        const abs = new URL(src, baseUrl).href;
        images.push(abs);
      } catch {}
    }
  });

  // Extract colors from inline styles
  const colors: string[] = [];
  const styleAttr = html.match(/(?:background-color|color|background):\s*(#[0-9a-f]{3,8}|rgb[^;)]+)/gi) || [];
  styleAttr.forEach((m) => {
    const hex = m.match(/#[0-9a-f]{6}/i);
    if (hex) colors.push(hex[0]);
  });

  // Extract links to subpages / steps
  const links: string[] = [];
  doc.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href && !href.startsWith("#") && !href.startsWith("javascript")) {
      try {
        const abs = new URL(href, baseUrl).href;
        if (abs.startsWith(baseUrl)) links.push(abs);
      } catch {}
    }
  });

  return { title, bodyText, images: images.slice(0, 10), colors, links: links.slice(0, 5) };
}

// ─── Build AI prompt ──────────────────────────────────────────────────────────
function buildFunnelPrompt(pageData: ReturnType<typeof extractPageData>, allPagesText: string, isFallback: boolean) {
  const schemaDescription = `
Funnel JSON schema:
{
  "id": "random8chars",
  "name": "string",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "fontFamily": "Inter",
  "steps": [
    {
      "id": "random8chars",
      "title": "string",
      "showLogo": true,
      "showProgress": true,
      "showBack": true,
      "components": [
        // Types available: "text", "image", "options", "button", "capture", "timer", "testimonials", "price", "plans", "video", "loading", "level", "alert", "space", "compare", "arguments", "charts"
        // "text": { id, type:"text", text }
        // "options": { id, type:"options", title, subtitle, columns(1-2), options:[{id,label,score?}] }
        // "capture": { id, type:"capture", title, fields:[{id, type("text"|"email"|"tel"), label, required}], buttonText }
        // "button": { id, type:"button", buttonText }
        // "price": { id, type:"price", title, price, pricePeriod, priceFeatures:[], buttonText }
        // "plans": { id, type:"plans", title, plans:[{id,name,originalPrice,promoPrice,period,popular?}] }
        // "testimonials": { id, type:"testimonials", title, testimonials:[{id,author,text}] }
        // "loading": { id, type:"loading", text, loadingDuration:3 }
        // "timer": { id, type:"timer", seconds, text }
      ]
    }
  ]
}

RULES:
- Generate ALL ids as random 8-char alphanumeric strings
- Create a complete, high-converting funnel with 4-7 steps
- Include: opener step, 2-3 question steps (options type), capture step, loading step, result/plans step
- Preserve ALL original text, questions, options, prices if available
- Return ONLY valid JSON, no markdown or explanation`;

  const systemPrompt = `You are an expert conversion funnel builder. ${isFallback ? "Generate a complete high-converting funnel based on the given theme." : "Reconstruct the funnel from the extracted page content."}\n${schemaDescription}`;

  const userPrompt = isFallback
    ? allPagesText
    : `Reconstruct this funnel as JSON:

PAGE TITLE: ${pageData.title}
DETECTED COLORS: ${pageData.colors.join(", ") || "none"}
IMAGES: ${pageData.images.slice(0, 5).join("\n") || "none"}

CONTENT:
${allPagesText}`;

  return { systemPrompt, userPrompt };
}

// ─── Analyze with OpenAI ──────────────────────────────────────────────────────
async function analyzeWithOpenAI(
  apiKey: string,
  pageData: ReturnType<typeof extractPageData>,
  allPagesText: string,
  isFallback: boolean,
): Promise<Funnel> {
  const { systemPrompt, userPrompt } = buildFunnelPrompt(pageData, allPagesText, isFallback);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${(err as any)?.error?.message || res.status}`);
  }

  const data = await res.json();
  const content = data.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as Funnel;
}

// ─── Analyze with Anthropic Claude ───────────────────────────────────────────
async function analyzeWithAnthropic(
  apiKey: string,
  pageData: ReturnType<typeof extractPageData>,
  allPagesText: string,
  isFallback: boolean,
): Promise<Funnel> {
  const { systemPrompt, userPrompt } = buildFunnelPrompt(pageData, allPagesText, isFallback);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude error: ${(err as any)?.error?.message || res.status}`);
  }

  const data = await res.json();
  const content = data.content[0]?.text || "{}";
  // Strip markdown code blocks if present
  const jsonStr = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();
  return JSON.parse(jsonStr) as Funnel;
}

// ─── Generate image with DALL·E 3 ─────────────────────────────────────────────
async function generateImageWithDalle(apiKey: string, description: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: description,
      size: "1024x1024",
      quality: "standard",
      n: 1,
    }),
  });

  if (!res.ok) throw new Error("DALL·E generation failed");
  const data = await res.json();
  return data.data[0]?.url || "";
}

// ─── Normalize & fix generated funnel ─────────────────────────────────────────
function normalizeFunnel(raw: Partial<Funnel>): Funnel {
  const newId = uid();
  return {
    id: raw.id || newId,
    name: raw.name || "Funil Clonado",
    primaryColor: raw.primaryColor || "#7c3aed",
    accentColor: raw.accentColor || "#ec4899",
    fontFamily: raw.fontFamily || "Inter",
    steps: (raw.steps || []).map((s) => ({
      id: s.id || uid(),
      title: s.title || "Etapa",
      showLogo: s.showLogo ?? true,
      showProgress: s.showProgress ?? true,
      showBack: s.showBack ?? true,
      components: (s.components || []).map((c) => ({
        id: c.id || uid(),
        type: c.type || "text",
        ...c,
      })) as ComponentData[],
    })) as Step[],
  };
}

// ─── Build AI fallback prompt from URL ────────────────────────────────────────
function buildFallbackFromUrl(url: string) {
  let theme = "vendas de produto digital";
  try {
    const urlObj = new URL(url);
    const slug = urlObj.pathname.split("/").filter(Boolean).pop() || urlObj.hostname;
    theme = slug.replace(/[-_]/g, " ").slice(0, 80).trim() || urlObj.hostname;
  } catch {}

  const pageData = {
    title: theme.charAt(0).toUpperCase() + theme.slice(1),
    bodyText: `Tema principal: ${theme}\nOrigem: ${url}`,
    images: [] as string[],
    colors: ["#6d28d9", "#db2777"],
    links: [] as string[],
  };

  const allPagesText = `O usuário quer clonar um funil de quiz de alta conversão sobre o tema: "${theme}" (URL original: ${url}).
Por favor, crie um funil de quiz COMPLETO, PROFISSIONAL e com 5 etapas:
1. Etapa de abertura: título impactante, subtítulo e botão "Começar".
2. Pergunta 1: múltipla escolha com 4 opções relevantes ao tema.
3. Pergunta 2: outra múltipla escolha com 4 opções relevantes.
4. Etapa de captura: solicitar nome, e-mail e telefone com botão "Quero meu resultado!".
5. Etapa de loading: texto "Analisando seu perfil..." com loading de 3 segundos.
6. Etapa final de planos: mostrar 2-3 opções de planos/preços com botão de compra.
Use linguagem persuasiva em português do Brasil. Crie preços e depoimentos realistas para o tema.`;

  return { pageData, allPagesText };
}

// ─── Main clone function ───────────────────────────────────────────────────────
export async function cloneFunnel(
  url: string,
  provider: AIProvider,
  apiKeys: { openai?: string; anthropic?: string },
  onProgress: ProgressCallback,
): Promise<Funnel> {
  // Stage 1: Attempt to fetch page content
  onProgress({ stage: "fetching", message: "Tentando acessar URL do funil...", percent: 10 });

  let pageData: ReturnType<typeof extractPageData>;
  let allPagesText: string;
  let isFallback = false;

  try {
    const fetched = await fetchPageContent(url);
    const extracted = extractPageData(fetched.html, fetched.baseUrl);
    pageData = extracted;
    allPagesText = `=== PÁGINA PRINCIPAL: ${extracted.title} ===\n${extracted.bodyText}\n\n`;

    onProgress({ stage: "fetching", message: "Explorando subpáginas do funil...", percent: 20 });

    // Try to fetch linked subpages
    for (const link of extracted.links.slice(0, 3)) {
      try {
        const sub = await fetchPageContent(link);
        const subData = extractPageData(sub.html, link);
        allPagesText += `=== PÁGINA: ${subData.title} ===\n${subData.bodyText}\n\n`;
      } catch {
        // Skip failed subpages silently
      }
    }
  } catch (err: any) {
    // All proxies failed — use AI to generate from theme
    onProgress({
      stage: "fetching",
      message: "Site bloqueado por CORS. Usando IA para gerar funil baseado no tema da URL...",
      percent: 25,
    });
    const fallback = buildFallbackFromUrl(url);
    pageData = fallback.pageData;
    allPagesText = fallback.allPagesText;
    isFallback = true;
  }

  // Stage 2: AI Analysis
  onProgress({
    stage: "analyzing",
    message: isFallback
      ? "Gerando funil completo com IA (modo criativo)..."
      : "IA analisando estrutura do funil...",
    percent: 40,
  });

  if (provider === "openai" && !apiKeys.openai) throw new Error("Chave da API OpenAI não configurada. Vá em Configurações para adicioná-la.");
  if (provider === "anthropic" && !apiKeys.anthropic) throw new Error("Chave da API Anthropic não configurada. Vá em Configurações para adicioná-la.");

  let rawFunnel: Funnel;
  try {
    if (provider === "openai") {
      rawFunnel = await analyzeWithOpenAI(apiKeys.openai!, pageData, allPagesText, isFallback);
    } else {
      rawFunnel = await analyzeWithAnthropic(apiKeys.anthropic!, pageData, allPagesText, isFallback);
    }
  } catch (aiErr: any) {
    throw new Error(`Erro na IA: ${aiErr?.message || aiErr}`);
  }

  // Stage 3: Normalize
  onProgress({ stage: "extracting", message: "Estruturando etapas e componentes...", percent: 60 });
  const funnel = normalizeFunnel(rawFunnel);

  // Stage 4: Generate images for components that need it (optional, non-blocking)
  onProgress({ stage: "generating_images", message: "Verificando imagens...", percent: 70 });

  const imageComponents = funnel.steps.flatMap((s) =>
    s.components.filter((c) => c.type === "image" && !c.imageUrl),
  );

  if (imageComponents.length > 0 && apiKeys.openai) {
    for (let i = 0; i < Math.min(imageComponents.length, 2); i++) {
      const comp = imageComponents[i];
      try {
        const stepTitle =
          funnel.steps.find((s) => s.components.includes(comp))?.title || "step";
        const prompt = `Professional marketing image for: "${funnel.name}" – ${stepTitle}. Clean, modern, high quality.`;
        comp.imageUrl = await generateImageWithDalle(apiKeys.openai, prompt);
        onProgress({
          stage: "generating_images",
          message: `Gerando imagem ${i + 1}/${Math.min(imageComponents.length, 2)}...`,
          percent: 70 + (i / Math.min(imageComponents.length, 2)) * 20,
        });
      } catch {
        // Non-fatal — skip
      }
    }
  }

  // Stage 5: Done
  onProgress({ stage: "done", message: "Funil clonado com sucesso! ✅", percent: 100 });
  return funnel;
}
