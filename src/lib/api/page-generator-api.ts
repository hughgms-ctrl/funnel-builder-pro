import { getActiveSupabaseClient } from "@/lib/supabase";

/**
 * Calls the `page-generator` Supabase Edge Function to generate HTML + CSS
 * for a landing page from a natural-language prompt.
 */
export async function generatePageWithAI(prompt: string): Promise<{ html: string; css: string }> {
  const supabase = getActiveSupabaseClient();

  if (!supabase) {
    throw new Error(
      "Supabase não configurado. Acesse Configurações e informe a URL e a chave anônima do seu projeto."
    );
  }

  const { data, error } = await supabase.functions.invoke("page-generator", {
    body: { prompt },
  });

  if (error) {
    throw new Error(`page-generator: ${error.message}`);
  }

  if (data?.error) {
    throw new Error(`page-generator: ${data.error}`);
  }

  if (!data?.html && !data?.css) {
    throw new Error("A IA não retornou HTML ou CSS válido. Tente novamente com uma descrição mais detalhada.");
  }

  return {
    html: (data.html as string) ?? "",
    css: (data.css as string) ?? "",
  };
}
