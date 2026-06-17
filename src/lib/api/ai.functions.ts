import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as cheerio from "cheerio";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const fetchAndCloneUrl = createServerFn({ method: "POST" })
  .inputValidator(z.object({ url: z.string().url() }))
  .handler(async ({ data }) => {
    try {
      const res = await fetch(data.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      
      if (!res.ok) throw new Error(`Falha ao buscar URL: ${res.statusText}`);
      
      const htmlString = await res.text();
      const $ = cheerio.load(htmlString);

      // Remove scripts and unnecessary tags for safety/cleanliness
      $("script").remove();
      $("noscript").remove();
      $("iframe").remove();

      // Inline styles can be kept, but let's grab the body's HTML
      const bodyHtml = $("body").html() || htmlString;

      // Also grab styles from <head> to inject
      let styles = "";
      $("style").each((_, el) => {
        styles += $(el).html() + "\n";
      });

      return {
        success: true,
        html: bodyHtml,
        css: styles,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

export const askGeminiToEditHtml = createServerFn({ method: "POST" })
  .inputValidator(z.object({ 
    prompt: z.string(), 
    html: z.string(),
    css: z.string().optional()
  }))
  .handler(async ({ data }) => {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return { success: false, error: "GEMINI_API_KEY não configurada no servidor." };
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // Fast and cheap for UI edits

      const systemInstruction = `Você é um desenvolvedor frontend especialista em UI/UX.
Sua tarefa é modificar um pedaço de HTML/CSS de acordo com o pedido do usuário.
RETORNE APENAS código HTML e CSS. Sem blocos markdown \`\`\`html, sem explicações. Se você alterar o CSS (adicionar classes e estilos correspondentes), coloque a tag <style> e as regras CSS no início do HTML retornado, seguidas pelo HTML. Mantenha as classes originais a menos que seja solicitado mudá-las. USE ESTILOS INLINE (style="...") sempre que for simples e não houver necessidade de responsividade.`;

      const promptText = `
${systemInstruction}

Pedido do usuário: "${data.prompt}"

HTML ATUAL:
${data.html}

${data.css ? `CSS ATUAL:\n${data.css}\n` : ""}

NOVO CÓDIGO HTML (e CSS se necessário):`;

      const result = await model.generateContent(promptText);
      const responseText = result.response.text();
      
      // Clean up markdown block if the model ignores the instruction
      let cleanCode = responseText.replace(/^```html\s*/i, '').replace(/^```\s*/, '').replace(/```\s*$/g, '').trim();

      return {
        success: true,
        code: cleanCode,
      };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });
