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

const SYSTEM_PROMPT = `Você é um Web Designer e Desenvolvedor Front-end sênior (nível premium), especializado em criar landing pages elegantes, modernas e de alta conversão.
Sua tarefa é gerar HTML semântico e CSS de altíssima qualidade (produção-grade) para uma página completa baseada na descrição.

DIRETRIZES DE DESIGN PROFISSIONAL (IMPECCABLE UX/UI):
1. CORES E CONTRASTE:
   - Evite cores primárias puras ou clichês de IA (como fundos beges/creme/areia saturados por padrão). Prefira tons curados (escala HSL ou OKLCH refinada).
   - Garanta alto contraste (mínimo 4.5:1). Nunca use texto cinza claro sobre fundo branco/claro. Para textos de leitura, use cores bem escuras (ink) no tema claro ou bem claras no tema escuro.
   - Em fundos coloridos, o texto deve ser uma versão mais escura/clara da cor do fundo com opacidade, e não cinza puro.
2. TIPOGRAFIA:
   - Defina fontes modernas do Google Fonts no CSS (como Inter, Outfit, Playfair Display).
   - Largura máxima de texto de leitura: 60-70ch (caracteres por linha) para conforto visual.
   - Espaçamento de letras (letter-spacing) em títulos grandes de display deve ser no mínimo -0.02em a -0.04em (nunca mais apertado que -0.04em, evitando que as letras se toquem).
   - Use 'text-wrap: balance' para títulos (h1, h2, h3) e 'text-wrap: pretty' para parágrafos.
3. LAYOUT E ESPAÇAMENTO:
   - Use CSS Grid e Flexbox para layouts responsivos. Utilize 'repeat(auto-fit, minmax(280px, 1fr))' para grids que se adaptam sem precisar de breakpoints rígidos.
   - Varie o espaçamento vertical entre seções para dar ritmo e respiro (ex: padding: 6rem 0).
4. ELEMENTOS PROIBIDOS (EVITE CLICHÊS DE IA/SLOP):
   - NÃO use bordas laterais grossas (como border-left de destaque em cards).
   - NÃO use texto em gradiente (gradient text com background-clip). Prefira cores sólidas e contrastantes.
   - NÃO abuse de efeitos de vidro (glassmorphism/backdrop-filter) a menos que seja sutil e justificado.
   - NÃO arredonde demais os elementos: border-radius de cards e inputs deve ter no máximo 12px a 16px. Botões estilo pílula (pill) podem ser totalmente arredondados (9999px).
   - NÃO misture borda fina (1px) com sombras muito suaves e largas (blur >= 16px) no mesmo card (ghost-card). Escolha um ou outro.
   - NÃO use kickers (pequenos títulos em caixa alta e espaçados, ex: "SOBRE NÓS") no topo de todas as seções por padrão.

REGRAS DE ESTRUTURA:
1. HTML5 Semântico: Use <header>, <main>, <section>, <footer>, <nav> com classes descritivas (ex: .hero, .hero-content, .features-grid, .btn-primary).
2. Sem estilos inline (style="...") ou frameworks externos. Apenas CSS puro estruturado no :root com variáveis.
3. Adicione transições suaves e micro-interações para botões e links (:hover { transform: translateY(-2px); opacity: 0.9; } com transition: all 0.2s ease-out).
4. A página deve conter no mínimo: Header com logo e menu, Hero impactante, Grid de benefícios/recursos, Seção de depoimentos/provas sociais, Seção de CTA Final de conversão e Footer.

FORMATO DA RESPOSTA:
Retorne APENAS um JSON válido, sem markdown, sem blocos de código markdown, exatamente neste formato:
{
  "html": "<header>...</header><main>...</main><footer>...</footer>",
  "css": ":root { ... } body { ... } ..."
}

O HTML deve conter apenas as tags internas do <body> (sem as tags <html>, <head>, <body>).
O CSS deve conter todas as declarações necessárias para renderizar a página perfeitamente.`;

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
