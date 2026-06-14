// Funnel Analyzer Edge Function
// Receives a screenshot + scraped DOM content and returns structured ComponentData[]
// Uses Lovable AI Gateway (Gemini 2.5 Flash with vision) — no user API key required.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é um especialista em analisar prints de funis de quiz e convertê-los em JSON estruturado.

Retorne APENAS um array JSON. Cada item é um componente de um destes tipos:
- { "type": "text", "text": "..." }
- { "type": "image", "imageUrl": "url ou vazio", "alt": "..." }
- { "type": "options", "title": "...", "subtitle": "...", "columns": 1 ou 2, "options": [{ "id": "abc12345", "label": "...", "image": "imageUrl ou vazio", "href": "link de redirect se houver" }] }
- { "type": "capture", "title": "...", "fields": [{ "id": "abc12345", "type": "text|email|tel", "label": "...", "required": true }], "buttonText": "..." }
- { "type": "button", "buttonText": "...", "href": "link externo se for CTA de redirect" }
- { "type": "loading", "text": "...", "loadingDuration": 3 }
- { "type": "price", "title": "...", "price": "R$ XX", "pricePeriod": "/único", "priceFeatures": ["..."], "buttonText": "..." }
- { "type": "plans", "title": "...", "plans": [{ "id": "abc12345", "name": "...", "originalPrice": "R$ XX", "promoPrice": "R$ XX", "period": "/mês", "popular": false }] }
- { "type": "testimonials", "title": "...", "testimonials": [{ "id": "abc12345", "author": "...", "text": "..." }] }
- { "type": "timer", "seconds": 600, "text": "Oferta expira em" }
- { "type": "alert", "text": "...", "variant": "info" }

REGRAS:
- Extraia TODO o texto VERBATIM da imagem (português do Brasil)
- Para options: liste TODAS as opções visíveis
- Preserve URLs de imagens dentro de option buttons no option.image
- Se houver redirect, coloque a URL em button.href ou option.href (nunca em image)
- IDs: 8 caracteres alfanuméricos aleatórios
- Retorne APENAS o array JSON, sem markdown, sem explicação`;

async function analyzeStep(screenshot: string, content: any, context: string) {
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analise este print do funil "${context}". 
Tipo detectado: ${content.pageType}
Título conhecido: "${content.title}"
Opções detectadas: ${JSON.stringify(content.options || []).slice(0, 1500)}
Botões: ${JSON.stringify(content.buttons || []).slice(0, 600)}
Inputs: ${JSON.stringify(content.inputs || []).slice(0, 400)}
Texto: "${(content.allText || "").slice(0, 800)}"

Retorne array JSON dos componentes.`,
          },
          { type: "image_url", image_url: { url: screenshot } },
        ],
      },
    ],
  };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  let raw = data.choices?.[0]?.message?.content || "[]";
  // Strip markdown fences if any
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  // Find array boundaries defensively
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [{ type: "text", text: content.title || (content.allText || "").slice(0, 200) }];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const { screenshot, content, context } = await req.json();
    if (!screenshot) throw new Error("screenshot required");

    const components = await analyzeStep(screenshot, content || {}, context || "quiz");

    return new Response(JSON.stringify({ components }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("funnel-analyzer error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
