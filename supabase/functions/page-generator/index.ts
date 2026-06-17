// Page Generator Edge Function
// Generates complete HTML + CSS for a landing page from a user prompt
// using the Lovable AI Gateway (Gemini 2.5 Flash).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é um especialista em design web e desenvolvimento front-end, especializado em criar páginas de alta conversão.
Sua tarefa é gerar HTML semântico e CSS moderno para uma página web completa, baseada na descrição do usuário.

REGRAS OBRIGATÓRIAS:
1. Use HTML5 semântico com tags apropriadas: <header>, <main>, <section>, <footer>, <nav>, <article>, <aside>.
2. NÃO use estilos inline (style="..."). Todo estilo vai no CSS separado.
3. NÃO use frameworks externos (Bootstrap, Tailwind, etc). CSS puro apenas.
4. Estruture em blocos independentes e modulares com classes descritivas (ex: .hero, .hero-title, .features-grid).
5. O design deve ser moderno, profissional e responsivo (use CSS Grid e Flexbox).
6. Use variáveis CSS (custom properties) para cores e tipografia no :root.
7. Todo texto deve ser em Português do Brasil (pt-BR), persuasivo e voltado ao tema solicitado.
8. A página deve ter no mínimo: Header com navegação, Hero section, Seção de benefícios/features, Seção de CTA, Footer.
9. Use uma paleta de cores coesa e moderna que combine com o tema/nicho.
10. Use Google Fonts (apenas font-family no CSS, sem @import — o usuário adicionará o link).

ESTRUTURA MÍNIMA OBRIGATÓRIA:
- Header: Logo (texto), menu de navegação com links âncora
- Hero: Título grande e impactante, subtítulo, botão CTA principal, imagem/visual hero (use um div estilizado como placeholder se necessário)
- Features/Benefícios: Grid de 3-4 cards com ícone (emoji), título e descrição
- Depoimentos (se fizer sentido): 2-3 cards de testimonial
- CTA Final: Seção destacada com chamada para ação e botão
- Footer: Links, copyright

FORMATO DA RESPOSTA:
Responda APENAS com JSON válido, sem markdown, sem blocos de código, neste formato exato:
{
  "html": "<header>...</header><main>...</main><footer>...</footer>",
  "css": ":root { ... } .hero { ... } ..."
}

O HTML deve conter apenas o conteúdo do <body> (sem <html>, <head>, <body> tags).
O CSS deve ser completo e auto-suficiente para estilizar toda a página.`;

async function generatePage(prompt: string): Promise<{ html: string; css: string }> {
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Crie uma página web completa de alta conversão para o seguinte tema/produto/serviço:\n\n"${prompt}"\n\nSiga todas as regras e retorne apenas o JSON com "html" e "css".`,
      },
    ],
    response_format: { type: "json_object" },
  };

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": LOVABLE_API_KEY || "",
      "X-Lovable-AIG-SDK": "edge-function",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`AI Gateway ${res.status}: ${txt.slice(0, 300)}`);
  }

  const data = await res.json();
  let raw: string = data.choices?.[0]?.message?.content || "{}";

  // Strip markdown code fences if present
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  // Extract outermost JSON object
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

  try {
    const parsed: { html?: string; css?: string } = JSON.parse(raw);

    if (!parsed.html && !parsed.css) {
      throw new Error("JSON gerado não contém campos 'html' ou 'css' válidos.");
    }

    return {
      html: parsed.html ?? "",
      css: parsed.css ?? "",
    };
  } catch (err: any) {
    console.error("Failed parsing generated page JSON:", raw.slice(0, 500));
    throw new Error(`Erro ao estruturar JSON da IA: ${err.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY ausente nas variáveis de ambiente da Edge Function");
    }

    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      throw new Error("Parâmetro 'prompt' é obrigatório e deve ser uma string");
    }
    if (prompt.trim().length < 5) {
      throw new Error("Prompt muito curto. Descreva melhor a página que deseja criar.");
    }

    console.log(`page-generator: generating page for prompt: "${prompt.slice(0, 100)}..."`);

    const result = await generatePage(prompt.trim().slice(0, 4000));

    console.log(`page-generator: success — html=${result.html.length} chars, css=${result.css.length} chars`);

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("page-generator error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...CORS, "Content-Type": "application/json" },
      }
    );
  }
});
