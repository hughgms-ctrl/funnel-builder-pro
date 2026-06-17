// Funnel Generator Edge Function
// Generates a complete quiz funnel structure (JSON) from a user prompt using Lovable AI Gateway (Gemini 2.5 Flash).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

const SYSTEM_PROMPT = `Você é um especialista em marketing digital e engenharia de funis de vendas tipo quiz.
Seu objetivo é gerar um funil de quiz completo, persuasivo e esteticamente harmonioso em formato JSON, baseado no prompt ou nicho do usuário.

Estrutura do JSON do Funil:
{
  "name": "Nome do Funil (chamativo e comercial)",
  "primaryColor": "Código HEX de cor primária (ex: #7c3aed) que combine com o nicho",
  "accentColor": "Código HEX de cor de destaque (ex: #ec4899) que combine",
  "fontFamily": "Uma fonte do Google Fonts apropriada (ex: Inter, Montserrat, Outfit, Roboto)",
  "steps": [
    // Uma lista contendo de 4 a 8 etapas. Cada etapa segue a estrutura de Step:
    {
      "id": "8 caracteres alfanuméricos aleatórios",
      "title": "Título curto da etapa (ex: Pergunta 1, Dados, Oferta, Analisando)",
      "showLogo": true,
      "showProgress": true,
      "showBack": true, // false no primeiro passo
      "isSaleStep": true, // ou false, true para etapa de planos/preço/oferta
      "components": [
        // Lista de componentes. Cada componente deve seguir rigorosamente um destes formatos de ComponentData:
        // 1. TEXT: { "id": "rand8", "type": "text", "text": "...", "fontSize": 16, "fontWeight": "normal|semibold|bold", "textAlign": "left|center|right" }
        // 2. IMAGE: { "id": "rand8", "type": "image", "imageUrl": "", "alt": "..." } (deixe imageUrl vazio)
        // 3. OPTIONS: { "id": "rand8", "type": "options", "title": "Pergunta principal do quiz?", "subtitle": "Legenda descritiva opcional", "columns": 1 ou 2, "options": [{ "id": "rand8", "label": "Rótulo da opção", "score": 10 }] }
        // 4. CAPTURE: { "id": "rand8", "type": "capture", "title": "Título da captura (ex: Quase lá!)", "fields": [{ "id": "rand8", "type": "text|email|tel", "label": "Rótulo do campo", "required": true }], "buttonText": "Texto do botão de envio" }
        // 5. BUTTON: { "id": "rand8", "type": "button", "buttonText": "Texto do CTA", "href": "link se for redirecionamento" }
        // 6. LOADING: { "id": "rand8", "type": "loading", "text": "Mensagem de progresso (ex: Calculando seu perfil...)", "loadingDuration": 3 }
        // 7. PRICE: { "id": "rand8", "type": "price", "title": "Título da oferta", "price": "R$ 97,00", "pricePeriod": "/único", "priceFeatures": ["Acesso imediato", "Suporte VIP"], "buttonText": "Comprar Agora" }
        // 8. PLANS: { "id": "rand8", "type": "plans", "title": "Escolha o melhor plano", "plans": [{ "id": "rand8", "name": "Plano Básico", "originalPrice": "R$ 97", "promoPrice": "R$ 47", "period": "único", "popular": false }] }
        // 9. TESTIMONIALS: { "id": "rand8", "type": "testimonials", "title": "O que dizem os alunos", "testimonials": [{ "id": "rand8", "author": "Nome da Pessoa", "text": "Texto do depoimento..." }] }
        // 10. TIMER: { "id": "rand8", "type": "timer", "seconds": 600, "text": "Oferta expira em" }
        // 11. ALERT: { "id": "rand8", "type": "alert", "text": "Alerta importante", "variant": "info|success|warning|danger" }
      ]
    }
  ]
}

REGRAS CRÍTICAS PARA A ESTRUTURA DO FUNIL:
1. O funil gerado DEVE seguir esta sequência lógica e completa de etapas:
   - ETAPA 1 (Apresentação/Intro): Uma tela de boas-vindas com título atraente, texto explicativo e um botão para iniciar o quiz.
   - ETAPAS INTERMEDIÁRIAS (Perguntas do Quiz): De 3 a 5 etapas contendo perguntas relevantes ao nicho, usando o componente 'options' com respostas plausíveis.
   - ETAPA DE CAPTURA DE LEAD: Um formulário ('capture') com campos como Nome e E-mail, preparando o usuário para receber o resultado.
   - ETAPA DE PROCESSAMENTO/CARREGAMENTO: Uma tela de animação ('loading') mostrando que a IA está analisando os dados do quiz.
   - ETAPA FINAL (Oferta / Resultados / Vendas): Uma tela com preços, planos ('plans' ou 'price'), depoimentos de clientes ('testimonials') e um cronômetro de urgência ('timer') para incentivar a compra do produto/solução.
2. Todo o texto gerado DEVE ser em Português do Brasil (pt-BR), altamente persuasivo, aplicando gatilhos mentais (autoridade, escassez, urgência, especificidade).
3. Cores e tipografia devem combinar com o tema (ex: fitness = verde/laranja, finanças = verde escuro/azul escuro, beleza = rosa/roxo, negócios = azul/cinza).
4. IDs: Sempre gere IDs alfanuméricos aleatórios únicos com 8 caracteres para cada etapa, componente, opção ou plano (ex: x7h9f2s4).
5. Deixe URLs de imagens vazias ("") ou use URLs genéricas de mockup que o usuário possa substituir.
6. CADA pergunta do quiz DEVE ser uma etapa (Step) independente e separada na lista de 'steps'. Nunca agrupe múltiplas perguntas (componentes do tipo 'options') dentro de uma única etapa. Cada 'Step' do questionário deve conter no máximo UM componente do tipo 'options' e ser uma tela separada.
7. Retorne APENAS o JSON do Funil, sem delimitadores markdown ou blocos de código, sem explicações adicionais, e sem texto fora do JSON.`;

async function generateFunnel(prompt: string) {
  const body = {
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Crie um funil de quiz completo de alta conversão para o seguinte tema ou instruções:
"${prompt}"

Siga rigorosamente a estrutura JSON e todas as regras fornecidas.`,
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
  let raw = data.choices?.[0]?.message?.content || "{}";
  
  raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start !== -1 && end !== -1) raw = raw.slice(start, end + 1);

  try {
    const parsed = JSON.parse(raw);
    if (!parsed.steps || !Array.isArray(parsed.steps)) {
      throw new Error("JSON gerado não possui estrutura de etapas válida.");
    }
    return parsed;
  } catch (err: any) {
    console.error("Failed parsing generated funnel JSON:", raw);
    throw new Error(`Erro ao estruturar JSON da IA: ${err.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY ausente nas variáveis de ambiente");

    const { prompt } = await req.json();
    if (!prompt) throw new Error("Parâmetro 'prompt' é obrigatório");

    const funnel = await generateFunnel(prompt);

    return new Response(JSON.stringify(funnel), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("funnel-generator error:", err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
