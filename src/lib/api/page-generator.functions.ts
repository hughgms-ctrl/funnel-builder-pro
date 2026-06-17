import { createServerFn } from "@tanstack/react-start";

const SYSTEM_PROMPT = `Você é um gerador de páginas web para um editor visual estilo Framer.
Sua tarefa é criar HTML e CSS modular que possa ser convertido em camadas editáveis no canvas.

Regras:
- Use HTML5 semântico (header, main, section, footer).
- Estruture o layout em blocos independentes com classes descritivas.
- NÃO use estilos inline. Crie classes e organize o CSS separado.
- Cada bloco deve ser modular e independente (hero, conteúdo, call-to-action, footer).
- O CSS deve ser simples e desacoplado, sem frameworks externos.
- Responda APENAS com JSON válido no formato { "html": "...", "css": "..." } sem markdown.

Estrutura mínima:
1. Cabeçalho com logo e menu.
2. Seção hero com título, subtítulo e botão.
3. Área de conteúdo (texto e imagens).
4. Rodapé simples com links.`;

export const generatePageWithAI = createServerFn({ method: "POST" })
  .inputValidator((input: { prompt: string }) => {
    if (!input?.prompt || typeof input.prompt !== "string") throw new Error("prompt obrigatório");
    return { prompt: input.prompt.slice(0, 4000) };
  })
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY ausente");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: data.prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      throw new Error(`AI Gateway ${res.status}: ${t}`);
    }
    const j = await res.json();
    const raw: string = j?.choices?.[0]?.message?.content ?? "{}";
    let parsed: { html?: string; css?: string };
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }
    return { html: parsed.html ?? "", css: parsed.css ?? "" };
  });
