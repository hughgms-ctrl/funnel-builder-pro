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

// ─── CORS Proxies ─────────────────────────────────────────────────────────────
const CORS_PROXIES = [
  (u: string) => ({
    proxyUrl: `https://corsproxy.io/?${encodeURIComponent(u)}`,
    extract: (r: Response) => r.text(),
  }),
  (u: string) => ({
    proxyUrl: `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    extract: async (r: Response) => {
      const j = await r.json();
      return j.contents || "";
    },
  }),
  (u: string) => ({
    proxyUrl: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    extract: (r: Response) => r.text(),
  }),
];

// ─── Detect if page is a SPA (body has no meaningful text) ───────────────────
function isSPAPage(html: string): boolean {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    doc.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());
    const text = (doc.body?.innerText || doc.body?.textContent || "").trim();
    return text.length < 150;
  } catch {
    return true;
  }
}

// ─── Extract __NEXT_DATA__ and other embedded JSON ───────────────────────────
function extractEmbeddedData(html: string): Record<string, any> {
  const result: Record<string, any> = {};
  
  // Next.js __NEXT_DATA__
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      result.nextData = JSON.parse(nextDataMatch[1]);
    } catch {}
  }
  
  // Nuxt / Vue SSR __NUXT__
  const nuxtMatch = html.match(/__NUXT__\s*=\s*(\{[\s\S]*?\});/);
  if (nuxtMatch) {
    try {
      result.nuxtData = JSON.parse(nuxtMatch[1]);
    } catch {}
  }
  
  // JSON-LD structured data
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
  const jsonLd: any[] = [];
  for (const match of jsonLdMatches) {
    try { jsonLd.push(JSON.parse(match[1])); } catch {}
  }
  if (jsonLd.length) result.jsonLd = jsonLd;

  // window.__STATE__ or window.__STORE__ patterns
  const storeMatch = html.match(/window\.__(?:STATE|STORE|DATA|INITIAL_STATE)__\s*=\s*(\{[\s\S]{10,5000}?\});/);
  if (storeMatch) {
    try { result.storeData = JSON.parse(storeMatch[1]); } catch {}
  }

  return result;
}

// ─── Fetch HTML with CORS proxies ─────────────────────────────────────────────
async function fetchHtml(url: string): Promise<{ html: string; baseUrl: string }> {
  for (const makeProxy of CORS_PROXIES) {
    try {
      const { proxyUrl, extract } = makeProxy(url);
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12_000) });
      if (!res.ok) continue;
      const html = await extract(res);
      if (html && html.length > 200) {
        return { html, baseUrl: url };
      }
    } catch {}
  }
  throw new Error("Todos os proxies falharam ao buscar a página.");
}

// ─── Extract page metadata from HTML ──────────────────────────────────────────
function extractPageMeta(html: string, baseUrl: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());

  const title = doc.title || doc.querySelector("h1")?.textContent?.trim() || "";
  const bodyText = (doc.body?.innerText || doc.body?.textContent || "").slice(0, 8000);

  const images: string[] = [];
  doc.querySelectorAll("img").forEach((img) => {
    const src = img.src || img.getAttribute("data-src") || "";
    if (src && !src.startsWith("data:") && src.length > 10) {
      try { images.push(new URL(src, baseUrl).href); } catch {}
    }
  });

  const colors: string[] = [];
  (html.match(/(?:background-color|color|background):\s*(#[0-9a-f]{3,8})/gi) || []).forEach((m) => {
    const hex = m.match(/#[0-9a-f]{6}/i);
    if (hex) colors.push(hex[0]);
  });

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

// ─── Microlink Screenshot API (free, no key needed) ──────────────────────────
async function getMicrolinkScreenshot(url: string): Promise<string | null> {
  try {
    const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&waitFor=2000`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data?.screenshot?.url || null;
  } catch {
    return null;
  }
}

// ─── Analyze screenshot with GPT-4o Vision ───────────────────────────────────
async function analyzeScreenshotWithVision(
  apiKey: string,
  screenshotUrl: string,
  pageUrl: string,
): Promise<string> {
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
          role: "user",
          content: [
            {
              type: "text",
              text: `You are analyzing a screenshot of a quiz/sales funnel page from: ${pageUrl}

Extract and list ALL visible text content VERBATIM, including:
- Main headline and subheadline
- Body text and descriptions  
- Button text
- Any option labels if it's a question
- Progress bar status if visible
- Any pricing, testimonials, or guarantees visible

Also identify:
- The primary topic/niche of this funnel
- The dominant brand colors (hex codes if visible)
- The overall funnel type (quiz, sales page, etc.)
- The apparent language (Portuguese, English, etc.)

Be exhaustive. Include ALL text you can read, word by word.`,
            },
            {
              type: "image_url",
              image_url: { url: screenshotUrl },
            },
          ],
        },
      ],
      max_tokens: 1500,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GPT-4 Vision error: ${(err as any)?.error?.message || res.status}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || "";
}

// ─── Analyze screenshot with Claude Vision ────────────────────────────────────
async function analyzeScreenshotWithClaude(
  apiKey: string,
  screenshotUrl: string,
  pageUrl: string,
): Promise<string> {
  // Fetch image and convert to base64 (required by Claude)
  const imgRes = await fetch(screenshotUrl, { signal: AbortSignal.timeout(15_000) });
  if (!imgRes.ok) throw new Error("Falha ao baixar screenshot para Claude");
  const blob = await imgRes.blob();
  const base64 = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.readAsDataURL(blob);
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: base64 },
            },
            {
              type: "text",
              text: `Analyze this screenshot of a quiz/sales funnel from ${pageUrl}. Extract ALL visible text VERBATIM (headlines, body, buttons, options). Identify the topic, language, color scheme and funnel type. Be exhaustive.`,
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) throw new Error("Claude Vision error");
  const data = await res.json();
  return data.content[0]?.text || "";
}

// ─── Build the generation prompt ──────────────────────────────────────────────
function buildGenerationPrompt(
  url: string,
  visualContent: string,
  htmlMeta: { title: string; colors: string[] } | null,
  isFallback: boolean,
): { systemPrompt: string; userPrompt: string } {
  const schema = `FUNNEL JSON SCHEMA (return ONLY this JSON, no markdown):
{
  "id": "random8chars",
  "name": "Nome do Funil",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",  
  "fontFamily": "Inter",
  "steps": [
    {
      "id": "random8chars",
      "title": "Título da Etapa",
      "showLogo": true,
      "showProgress": true,
      "showBack": false,
      "isSaleStep": false,
      "components": [
        // COMPONENT TYPES AND THEIR REQUIRED FIELDS:
        // text: { id, type:"text", text:"string" }
        // image: { id, type:"image", imageUrl:"url or empty string", alt:"string" }
        // options: { id, type:"options", title:"string", subtitle:"string", columns:2, options:[{id,label,score?}], idName:"variable_name" }
        // capture: { id, type:"capture", title:"string", fields:[{id,type:"text"|"email"|"tel",label,required:true,idName:"variable"}], buttonText:"string" }
        // button: { id, type:"button", buttonText:"string" }
        // loading: { id, type:"loading", text:"string", loadingDuration:3 }
        // price: { id, type:"price", title:"string", price:"R$ 97", pricePeriod:"/único", priceFeatures:["feature1","feature2"], buttonText:"string" }
        // plans: { id, type:"plans", title:"string", plans:[{id,name,originalPrice,promoPrice,period,popular:true|false}] }
        // testimonials: { id, type:"testimonials", title:"string", testimonials:[{id,author,text}] }
        // timer: { id, type:"timer", seconds:600, text:"Oferta expira em" }
        // alert: { id, type:"alert", text:"string", variant:"info"|"success"|"warning"|"danger" }
        // level: { id, type:"level", text:"string", level:75 }
      ]
    }
  ]
}`;

  const systemPrompt = `You are a world-class conversion funnel specialist fluent in Brazilian Portuguese. Your task is to reconstruct a quiz funnel with EXCEPTIONAL quality and accuracy.

${schema}

CRITICAL RULES:
- Generate ALL ids as random 8-char alphanumeric strings  
- Write ALL text in Brazilian Portuguese (informal, warm, persuasive tone)
- Create a COMPLETE funnel with 6-8 steps following this structure:
  1. Opening step: compelling headline + subheadline + CTA button (showBack:false)
  2. Questions (2-4 steps): options type with 4 options each, relevant to topic
  3. Capture step: name + email + phone fields
  4. Loading step: "Analisando suas respostas..." with 3s duration
  5. Result/VSL step (optional): testimonials or comparison
  6. Plans/Offer step (isSaleStep:true): 2-3 pricing plans with real Brazilian prices
- Use EXACT text from the visual analysis when available
- Preserve brand colors detected from the page
- Return ONLY valid JSON, no explanation`;

  const userPrompt = isFallback
    ? `Reconstruct a high-quality quiz funnel based on this URL: ${url}
    
Topic extracted from URL slug: "${url.split("/").filter(Boolean).pop()?.replace(/-/g, " ")}"

${visualContent ? `VISUAL CONTENT FROM PAGE SCREENSHOT:\n${visualContent}` : ""}

Generate a complete, professional, high-converting quiz funnel in Brazilian Portuguese matching the detected topic. Make it extremely persuasive and accurate to the niche.`
    : `Reconstruct this quiz funnel as JSON.

ORIGINAL URL: ${url}
PAGE TITLE: ${htmlMeta?.title || ""}
BRAND COLORS: ${htmlMeta?.colors?.join(", ") || "auto-detect from visual"}

VISUAL CONTENT EXTRACTED FROM PAGE:
${visualContent}

Generate a COMPLETE funnel matching exactly the topic, style and content from the visual analysis above. Fill in all steps with specific, relevant content for this niche.`;

  return { systemPrompt, userPrompt };
}

// ─── AI generation: OpenAI ────────────────────────────────────────────────────
async function generateWithOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Funnel> {
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
  return JSON.parse(data.choices[0]?.message?.content || "{}") as Funnel;
}

// ─── AI generation: Anthropic ─────────────────────────────────────────────────
async function generateWithAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<Funnel> {
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
  if (!res.ok) throw new Error("DALL·E failed");
  const data = await res.json();
  return data.data[0]?.url || "";
}

// ─── Normalize & validate generated funnel ────────────────────────────────────
function normalizeFunnel(raw: Partial<Funnel>): Funnel {
  return {
    id: raw.id || uid(),
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
      isSaleStep: s.isSaleStep ?? false,
      components: (s.components || []).map((c) => ({
        id: c.id || uid(),
        type: c.type || "text",
        aesthetic: "simple",
        borders: "medium",
        width: 100,
        animation: "none",
        fixedFooter: false,
        displayRule: "",
        ...c,
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
    throw new Error("Chave da API OpenAI não configurada. Vá em ⚙️ Configurações para adicioná-la.");
  }
  if (provider === "anthropic" && !apiKeys.anthropic) {
    throw new Error("Chave da API Anthropic não configurada. Vá em ⚙️ Configurações para adicioná-la.");
  }

  // ── FASE 1: Tentar buscar HTML ───────────────────────────────────────────────
  onProgress({ stage: "fetching", message: "🌐 Acessando URL do funil...", percent: 8 });

  let htmlMeta: { title: string; colors: string[]; bodyText: string } | null = null;
  let isSPA = false;

  try {
    const { html, baseUrl } = await fetchHtml(url);
    isSPA = isSPAPage(html);

    if (!isSPA) {
      // Static site — extract content directly
      const meta = extractPageMeta(html, baseUrl);
      htmlMeta = meta;
      onProgress({ stage: "fetching", message: `✅ Conteúdo HTML encontrado: "${meta.title}"`, percent: 20 });
    } else {
      // SPA detected — try to extract meta from embedded data
      const embedded = extractEmbeddedData(html);
      const title = embedded?.nextData?.props?.pageProps?.title ||
        embedded?.nextData?.props?.pageProps?.name ||
        html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1] || "";
      const colors = (html.match(/#[0-9a-f]{6}/gi) || []).slice(0, 10);
      htmlMeta = { title, colors, bodyText: "" };
      onProgress({ stage: "fetching", message: `🔍 Site renderizado por JavaScript detectado. Capturando screenshot...`, percent: 15 });
    }
  } catch {
    isSPA = true;
    onProgress({ stage: "fetching", message: "⚠️ Acesso direto bloqueado. Tentando screenshot visual...", percent: 15 });
  }

  // ── FASE 2: Capturar e analisar screenshot ────────────────────────────────
  let visualContent = "";

  if (isSPA || !htmlMeta?.bodyText || htmlMeta.bodyText.length < 100) {
    onProgress({ stage: "fetching", message: "📸 Capturando screenshot da página com Microlink...", percent: 22 });

    const screenshotUrl = await getMicrolinkScreenshot(url);

    if (screenshotUrl) {
      onProgress({ stage: "analyzing", message: "🔍 Analisando visualmente o funil com IA...", percent: 30 });

      try {
        if (provider === "openai" && apiKeys.openai) {
          visualContent = await analyzeScreenshotWithVision(apiKeys.openai, screenshotUrl, url);
        } else if (provider === "anthropic" && apiKeys.anthropic) {
          visualContent = await analyzeScreenshotWithClaude(apiKeys.anthropic, screenshotUrl, url);
        }
        onProgress({ stage: "analyzing", message: "✅ Conteúdo visual extraído com sucesso!", percent: 38 });
      } catch (visionErr: any) {
        onProgress({ stage: "analyzing", message: `⚠️ Vision API: ${visionErr?.message}. Usando análise por tema...`, percent: 35 });
      }
    } else {
      onProgress({ stage: "analyzing", message: "⚠️ Screenshot indisponível. Gerando por análise de tema da URL...", percent: 30 });
    }
  } else {
    // Static site — use HTML text as visual content
    visualContent = `PAGE CONTENT:\n${htmlMeta.bodyText}`;
    onProgress({ stage: "analyzing", message: "📄 Conteúdo extraído do HTML estático.", percent: 35 });
  }

  // ── FASE 3: Gerar funil com IA ───────────────────────────────────────────
  const isFallback = !visualContent && (!htmlMeta?.bodyText || htmlMeta.bodyText.length < 100);
  onProgress({
    stage: "analyzing",
    message: isFallback
      ? "🤖 Gerando funil completo por análise de tema (modo criativo)..."
      : "🧠 IA reconstruindo funil a partir do conteúdo extraído...",
    percent: 45,
  });

  const { systemPrompt, userPrompt } = buildGenerationPrompt(
    url,
    visualContent,
    htmlMeta,
    isFallback,
  );

  let rawFunnel: Funnel;
  try {
    if (provider === "openai") {
      rawFunnel = await generateWithOpenAI(apiKeys.openai!, systemPrompt, userPrompt);
    } else {
      rawFunnel = await generateWithAnthropic(apiKeys.anthropic!, systemPrompt, userPrompt);
    }
  } catch (aiErr: any) {
    throw new Error(`Falha na geração com IA: ${aiErr?.message}`);
  }

  // ── FASE 4: Normalizar estrutura ────────────────────────────────────────────
  onProgress({ stage: "extracting", message: "⚙️ Estruturando etapas e componentes...", percent: 65 });
  const funnel = normalizeFunnel(rawFunnel);

  // ── FASE 5: Gerar imagens faltando (opcional) ────────────────────────────────
  const emptyImages = funnel.steps
    .flatMap((s) => s.components.filter((c) => c.type === "image" && !c.imageUrl));

  if (emptyImages.length > 0 && apiKeys.openai) {
    onProgress({ stage: "generating_images", message: "🎨 Gerando imagens com DALL·E...", percent: 72 });
    for (let i = 0; i < Math.min(emptyImages.length, 2); i++) {
      try {
        const comp = emptyImages[i];
        const stepTitle = funnel.steps.find((s) => s.components.includes(comp))?.title || "";
        const prompt = `Professional marketing image for: "${funnel.name}" – ${stepTitle}. Clean, modern style, high quality.`;
        comp.imageUrl = await generateImageWithDalle(apiKeys.openai, prompt);
        onProgress({
          stage: "generating_images",
          message: `🖼️ Imagem ${i + 1}/${Math.min(emptyImages.length, 2)} gerada...`,
          percent: 72 + (i / Math.min(emptyImages.length, 2)) * 15,
        });
      } catch {
        // Non-fatal
      }
    }
  }

  onProgress({ stage: "done", message: "✅ Funil clonado com sucesso!", percent: 100 });
  return funnel;
}
