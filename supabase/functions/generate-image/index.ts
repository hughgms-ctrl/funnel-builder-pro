// Image generation via Lovable AI Gateway (Gemini Nano Banana)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!KEY) throw new Error("LOVABLE_API_KEY missing");
    const { prompt } = await req.json();
    if (!prompt) throw new Error("prompt required");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": KEY || "",
        "X-Lovable-AIG-SDK": "edge-function",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Gateway ${res.status}: ${txt.slice(0, 300)}`);
    }
    const data = await res.json();
    const imageUrl =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url ||
      data.choices?.[0]?.message?.images?.[0]?.url ||
      "";
    if (!imageUrl) throw new Error("No image returned");

    return new Response(JSON.stringify({ imageUrl }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
