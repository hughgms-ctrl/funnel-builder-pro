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

// ─── Fetch page content via a CORS-compatible proxy ───────────────────────────
async function fetchPageContent(url: string): Promise<{ html: string; baseUrl: string }> {
  // Use allorigins.win as a CORS proxy
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxyUrl);
  if (!res.ok) throw new Error(`Falha ao acessar URL: ${res.status}`);
  const json = await res.json();
  return { html: json.contents as string, baseUrl: url };
}

// ─── Extract readable text & structure from HTML ──────────────────────────────
function extractPageData(html: string, baseUrl: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Remove script/style noise
  doc.querySelectorAll("script, style, noscript, svg").forEach((el) => el.remove());

  const title = doc.title || doc.querySelector("h1")?.textContent?.trim() || "";
  const bodyText = doc.body?.innerText?.slice(0, 8000) || "";

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

// ─── Analyze with OpenAI ──────────────────────────────────────────────────────
async function analyzeWithOpenAI(
  apiKey: string,
  pageData: ReturnType<typeof extractPageData>,
  allPagesText: string,
): Promise<Funnel> {
  const systemPrompt = `You are an expert funnel analyzer. Given raw HTML text from a quiz/sales funnel, reconstruct it as a JSON Funnel object.

Funnel JSON schema:
{
  "id": "string",
  "name": "string",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "fontFamily": "string",
  "steps": [
    {
      "id": "string",
      "title": "string",
      "showLogo": true,
      "showProgress": true,
      "showBack": true,
      "components": [
        // Each component must have an id and type.
        // Types: "text", "image", "options", "button", "capture", "timer", "testimonials", "price", "plans", "video", "loading", "level", "alert", "space", "compare", "arguments", "charts"
        // "options" must have: title, subtitle, columns (1 or 2), options: [{id, label}]
        // "capture" must have: title, fields: [{id, type ("text"|"email"|"tel"), label, required}], buttonText
        // "button" must have: buttonText
        // "text" must have: text
        // "image" must have: imageUrl (use original URL or "" if needs AI generation), alt
        // "price" must have: title, price, pricePeriod, priceFeatures, buttonText
        // "plans" must have: title, plans: [{id, name, originalPrice, promoPrice, period, popular}]
        // "timer" must have: seconds, text
        // "testimonials" must have: title, testimonials: [{id, author, text}]
        // "loading" must have: text, loadingDuration (seconds)
      ]
    }
  ]
}

CRITICAL RULES:
- Generate ALL IDs as random 8-char alphanumeric strings
- Reconstruct the funnel's logical flow step by step
- Preserve all original text, prices, and testimonials
- Detect the primary brand color from the content
- Return ONLY valid JSON, no explanation`;

  const userPrompt = `Here is the extracted content from a funnel at ${pageData.title}:

=== PAGE CONTENT ===
${allPagesText}

=== DETECTED COLORS ===
${pageData.colors.join(", ") || "none"}

=== IMAGES FOUND ===
${pageData.images.join("\n") || "none"}

Reconstruct this as a complete Funnel JSON. Include ALL steps, questions, options, and text visible in the content.`;

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
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI error: ${err?.error?.message || res.status}`);
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
): Promise<Funnel> {
  const systemPrompt = `You are an expert funnel analyzer. Given raw HTML text from a quiz/sales funnel, reconstruct it as a JSON Funnel object and return ONLY valid JSON.

Funnel JSON schema:
{
  "id": "string",
  "name": "string",
  "primaryColor": "#hexcolor",
  "accentColor": "#hexcolor",
  "fontFamily": "Inter",
  "steps": [
    {
      "id": "string",
      "title": "string",
      "showLogo": true,
      "showProgress": true,
      "showBack": true,
      "components": [
        // Types: text, image, options, button, capture, timer, testimonials, price, plans, video, loading, level, alert, space, compare, arguments, charts
        // options: {id, type:"options", title, subtitle, columns, options:[{id,label}]}
        // capture: {id, type:"capture", title, fields:[{id, type, label, required}], buttonText}
        // button: {id, type:"button", buttonText}
        // text: {id, type:"text", text}
        // image: {id, type:"image", imageUrl, alt}
        // price: {id, type:"price", title, price, pricePeriod, priceFeatures, buttonText}
      ]
    }
  ]
}

Generate ALL IDs as random 8-char strings. Return ONLY valid JSON, no markdown or explanation.`;

  const userContent = `Reconstruct this funnel as JSON:

PAGE TITLE: ${pageData.title}
DETECTED COLORS: ${pageData.colors.join(", ") || "none"}
IMAGES: ${pageData.images.slice(0, 5).join("\n") || "none"}

CONTENT:
${allPagesText}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude error: ${err?.error?.message || res.status}`);
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

// ─── Main clone function ───────────────────────────────────────────────────────
export async function cloneFunnel(
  url: string,
  provider: AIProvider,
  apiKeys: { openai?: string; anthropic?: string },
  onProgress: ProgressCallback,
): Promise<Funnel> {
  // Stage 1: Fetch
  onProgress({ stage: "fetching", message: "Acessando URL do funil...", percent: 10 });
  const { html, baseUrl } = await fetchPageContent(url);
  const pageData = extractPageData(html, baseUrl);

  // Try to fetch linked subpages (funnel steps)
  onProgress({ stage: "fetching", message: "Explorando páginas do funil...", percent: 20 });
  let allPagesText = `=== PÁGINA PRINCIPAL: ${pageData.title} ===\n${pageData.bodyText}\n\n`;

  for (const link of pageData.links.slice(0, 3)) {
    try {
      const sub = await fetchPageContent(link);
      const subData = extractPageData(sub.html, link);
      allPagesText += `=== PÁGINA: ${subData.title} ===\n${subData.bodyText}\n\n`;
    } catch {
      // Skip failed subpages
    }
  }

  // Stage 2: AI Analysis
  onProgress({ stage: "analyzing", message: "IA analisando estrutura do funil...", percent: 40 });

  let rawFunnel: Funnel;
  if (provider === "openai") {
    if (!apiKeys.openai) throw new Error("Chave OpenAI não configurada");
    rawFunnel = await analyzeWithOpenAI(apiKeys.openai, pageData, allPagesText);
  } else {
    if (!apiKeys.anthropic) throw new Error("Chave Anthropic não configurada");
    rawFunnel = await analyzeWithAnthropic(apiKeys.anthropic, pageData, allPagesText);
  }

  // Stage 3: Normalize
  onProgress({ stage: "extracting", message: "Estruturando etapas e componentes...", percent: 60 });
  const funnel = normalizeFunnel(rawFunnel);

  // Stage 4: Generate images for components that need it
  onProgress({ stage: "generating_images", message: "Gerando imagens com IA...", percent: 70 });

  const imageComponents = funnel.steps.flatMap((s) =>
    s.components.filter((c) => c.type === "image" && !c.imageUrl),
  );

  if (imageComponents.length > 0 && apiKeys.openai) {
    for (let i = 0; i < Math.min(imageComponents.length, 3); i++) {
      const comp = imageComponents[i];
      try {
        const stepTitle =
          funnel.steps.find((s) => s.components.includes(comp))?.title || "funnel step";
        const prompt = `Professional marketing image for: "${funnel.name}" - ${stepTitle}. Clean, modern, high quality.`;
        comp.imageUrl = await generateImageWithDalle(apiKeys.openai, prompt);
        onProgress({
          stage: "generating_images",
          message: `Gerando imagem ${i + 1}/${imageComponents.length}...`,
          percent: 70 + (i / imageComponents.length) * 20,
        });
      } catch {
        // Skip failed image generation
      }
    }
  }

  // Stage 5: Done
  onProgress({ stage: "done", message: "Funil clonado com sucesso!", percent: 100 });
  return funnel;
}
