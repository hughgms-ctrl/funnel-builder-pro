import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathParts = url.pathname.split("/");
  // Expected path format: /serve-funnel/[slug] or /serve-funnel?slug=[slug]
  let slug = pathParts[pathParts.length - 1];

  if (!slug || slug === "serve-funnel") {
    slug = url.searchParams.get("slug") || "";
  }

  if (!slug) {
    return new Response("Slug não informado.", { status: 400, headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch the funnel data by publishedSlug or ID
  // Note: Assuming a table "funnels" exists with a column "publishedSlug" or similar.
  // Since we want this to be extremely robust, if the database doesn't have it, we can return a fallback template
  // or return the HTML build script generator.
  // To keep it simple and standalone, we will build a function that fetches from the database:
  let funnelData: any = null;
  try {
    const { data, error } = await supabase
      .from("funnels")
      .select("*")
      .or(`publishedSlug.eq.${slug},id.eq.${slug}`)
      .single();

    if (error || !data) {
      // If table doesn't exist or not found, search the state in public profiles or return demo
      throw new Error(error?.message || "Funnel not found");
    }
    funnelData = typeof data.raw_json === "string" ? JSON.parse(data.raw_json) : data.raw_json || data;
  } catch (err) {
    return new Response(`Funil com o slug/id "${slug}" não foi encontrado ou tabela 'funnels' não configurada. Erro: ${err.message}`, {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const html = generateStandaloneHtml(funnelData);

  return new Response(html, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
    },
  });
});

function generateStandaloneHtml(funnel: any): string {
  const primary = funnel.primaryColor || "#7c3aed";
  const accent = funnel.accentColor || "#ec4899";
  const name = funnel.name || "QuizFunnel";
  const logoUrl = funnel.logoUrl || "";

  // Prepare standard components inject / assets
  // Injected Tailwind and icons
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${name}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f9fafb;
      color: #111827;
    }
    .animate-pulse-slow {
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .8; transform: scale(1.02); }
    }
  </style>
  
  <!-- Meta Pixel Code -->
  ${funnel.metaPixelId ? `
  <script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
    n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t,s)}(window, document,'script',
    'https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${funnel.metaPixelId}');
    fbq('track', 'PageView');
  </script>
  ` : ""}

  <!-- Google Tag Manager -->
  ${funnel.googleTagId ? `
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${funnel.googleTagId}');</script>
  ` : ""}

  <!-- TikTok Pixel -->
  ${funnel.tiktokPixelId ? `
  <script>
    !function (w, d, t) {
      w.TiktokSdkObject = t; var ttq = w[t] = w[t] || []; ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "cleanCookie"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))) } }; for (var e = 0; e < ttq.methods.length; e++) ttq.setAndDefer(ttq, ttq.methods[e]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e }; ttq.load = function (e, n) {
        var i = "https://analytics.tiktok.com/i18n/pixel/events.js"; ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {};
        var o = d.createElement("script"); o.type = "text/javascript", o.async = !0, o.src = i; var a = d.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a)
      };
      ttq.load('${funnel.tiktokPixelId}');
      ttq.page();
    }(window, document, 'ttq');
  </script>
  ` : ""}
</head>
<body class="flex flex-col min-h-screen">
  ${funnel.googleTagId ? `<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${funnel.googleTagId}" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>` : ""}

  <div id="app" class="flex-1 flex flex-col mx-auto w-full max-w-xl bg-white shadow-md min-h-screen relative">
    <!-- Header -->
    <header id="header" class="border-b bg-white/90 backdrop-blur sticky top-0 z-40 px-4 py-3">
      <div class="flex items-center justify-between text-sm">
        <button id="btn-back" onclick="goBack()" class="text-gray-500 hover:text-gray-900 transition font-medium">← voltar</button>
        <span />
      </div>
      <div id="logo-container" class="flex justify-center pt-3">
        ${logoUrl ? `<img src="${logoUrl}" alt="logo" class="h-10 object-contain" />` : `<div class="text-lg font-bold tracking-wide" style="color: ${primary}">${name}</div>`}
      </div>
      <div id="progress-bar-container" class="mt-3 h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div id="progress-bar" class="h-full transition-all duration-300" style="width: 0%; background-color: ${primary}"></div>
      </div>
    </header>

    <!-- Main Content -->
    <main id="content" class="flex-1 px-4 py-6 space-y-5"></main>

    <!-- Fixed Footer Button Container -->
    <div id="fixed-footer" class="hidden fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur p-4 shadow-lg z-50">
      <div class="mx-auto max-w-xl" id="fixed-footer-content"></div>
    </div>
  </div>

  <script>
    const funnel = ${JSON.stringify(funnel)};
    let currentStepId = funnel.steps[0]?.id;
    const history = [];
    const answers = {};
    let scores = {};

    function evaluateDisplayRule(rule, variables) {
      if (!rule || rule.trim() === "") return true;
      try {
        let processed = parseTemplateText(rule, variables);
        const sanitized = processed.replace(/[^a-zA-Z0-9\\s=!<>&|()+\\-*/.'"]/g, "");
        try {
          const fn = new Function("return (" + sanitized + ");");
          return !!fn();
        } catch {
          if (sanitized.includes("==")) {
            const parts = sanitized.split("==").map(p => p.trim().replace(/['"]/g, ""));
            return parts[0] === parts[1];
          }
          if (sanitized.includes("!=")) {
            const parts = sanitized.split("!=").map(p => p.trim().replace(/['"]/g, ""));
            return parts[0] !== parts[1];
          }
          return false;
        }
      } catch (e) {
        console.error("Error evaluating displayRule:", rule, e);
        return false;
      }
    }

    function parseTemplateText(text, variables) {
      if (!text) return text;
      let result = text;
      let iterations = 0;
      while (result.includes("{{") && iterations < 15) {
        iterations++;
        const match = result.match(/\\{\\{([^{}]+)\\}\\}/);
        if (!match) break;
        const token = match[0];
        const varName = match[1].trim();
        if (varName.startsWith("calc ")) {
          const expression = varName.substring(5).trim();
          const evaluated = evaluateMathExpression(expression);
          result = result.replace(token, String(evaluated));
        } else {
          const value = variables[varName] !== undefined ? variables[varName] : "";
          result = result.replace(token, String(value));
        }
      }
      return result;
    }

    function evaluateMathExpression(expr) {
      try {
        const sanitized = expr.replace(/[^0-9+\\-*/().\\s]/g, "");
        const fn = new Function("return (" + sanitized + ");");
        const val = fn();
        if (typeof val === "number" && !isNaN(val)) {
          return Math.round(val * 100) / 100;
        }
        return 0;
      } catch (e) {
        return 0;
      }
    }

    function goBack() {
      if (history.length > 0) {
        const prev = history.pop();
        currentStepId = prev;
        render();
      }
    }

    function selectOption(value, nextStepId, score, varName) {
      if (varName) {
        answers[varName] = value;
      }
      if (score !== undefined) {
        scores[currentStepId] = score;
      }
      advance(nextStepId);
    }

    function advance(nextStepId) {
      if (nextStepId) {
        history.push(currentStepId);
        currentStepId = nextStepId;
        render();
      } else {
        // Find next step in flow sequence
        const idx = funnel.steps.findIndex(s => s.id === currentStepId);
        if (idx >= 0 && idx + 1 < funnel.steps.length) {
          history.push(currentStepId);
          currentStepId = funnel.steps[idx + 1].id;
          render();
        } else {
          finishFunnel();
        }
      }
    }

    async function finishFunnel() {
      // Fire pixels / leads
      const finalAnswers = { ...answers, score: getScore() };
      
      // Meta Lead Pixel
      if (funnel.metaPixelId && window.fbq) {
        fbq('track', 'Lead');
      }
      // TikTok SubmitForm
      if (funnel.tiktokPixelId && window.ttq) {
        ttq.track('SubmitForm');
      }

      if (funnel.leadWebhookUrl) {
        try {
          await fetch(funnel.leadWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Math.random().toString(36).slice(2), funnelName: funnel.name, createdAt: new Date().toISOString(), answers: finalAnswers }),
            mode: 'no-cors'
          });
        } catch(e) {}
      }

      alert("Obrigado por participar! Suas respostas foram enviadas.");
    }

    async function trackPurchase() {
      const finalAnswers = { ...answers, score: getScore(), converted: true };
      if (funnel.metaPixelId && window.fbq) {
        fbq('track', 'Purchase', { currency: 'BRL', value: 0 });
      }
      if (funnel.tiktokPixelId && window.ttq) {
        ttq.track('CompletePayment', { value: 0, currency: 'BRL' });
      }
      if (funnel.saleWebhookUrl) {
        try {
          await fetch(funnel.saleWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: Math.random().toString(36).slice(2), funnelName: funnel.name, createdAt: new Date().toISOString(), answers: finalAnswers, converted: true }),
            mode: 'no-cors'
          });
        } catch(e) {}
      }
    }

    function getScore() {
      return Object.values(scores).reduce((a, b) => a + b, 0);
    }

    function render() {
      const step = funnel.steps.find(s => s.id === currentStepId);
      if (!step) return;

      const idx = funnel.steps.findIndex(s => s.id === currentStepId);
      const progressPercent = Math.round(((idx + 1) / funnel.steps.length) * 100);

      // Back button
      document.getElementById("btn-back").style.visibility = step.showBack && history.length > 0 ? "visible" : "hidden";
      // Logo
      document.getElementById("logo-container").style.display = step.showLogo ? "flex" : "none";
      // Progress
      document.getElementById("progress-bar-container").style.display = step.showProgress ? "block" : "none";
      document.getElementById("progress-bar").style.width = progressPercent + "%";

      // Meta Pixel ViewContent event
      if (funnel.metaPixelId && window.fbq) {
        fbq('track', 'ViewContent', { content_name: step.title, step_index: idx });
      }
      if (funnel.tiktokPixelId && window.ttq) {
        ttq.track('PageView');
      }

      const container = document.getElementById("content");
      container.innerHTML = "";
      
      const fixedFooter = document.getElementById("fixed-footer");
      const fixedFooterContent = document.getElementById("fixed-footer-content");
      fixedFooter.className = "hidden";
      fixedFooterContent.innerHTML = "";

      const variables = { ...answers, score: getScore() };

      step.components.forEach(c => {
        if (!evaluateDisplayRule(c.displayRule, variables)) return;

        const el = document.createElement("div");
        el.className = "w-full";

        // Handle alignment & spacing
        let alignClass = "text-center";
        if (c.textAlign === "left") alignClass = "text-left";
        if (c.textAlign === "right") alignClass = "text-right";

        let textStyles = "";
        if (c.fontSize) textStyles += "font-size: " + c.fontSize + "px; ";
        if (c.textColor) textStyles += "color: " + c.textColor + "; ";
        if (c.fontWeight === "bold") textStyles += "font-weight: 700; ";
        if (c.fontWeight === "semibold") textStyles += "font-weight: 600; ";
        if (c.fontWeight === "medium") textStyles += "font-weight: 500; ";
        if (c.italic) textStyles += "font-style: italic; ";

        // Outer borders & aesthetic wrapper
        let boxStyles = "rounded-lg border bg-white p-4 ";
        if (c.aesthetic === "highlight") boxStyles = "rounded-lg bg-purple-50/70 border border-purple-200/50 shadow-sm p-4 ";
        if (c.aesthetic === "emboss") boxStyles = "rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.15)] bg-white p-4 ";
        if (c.borders === "none") boxStyles = boxStyles.replace("rounded-lg", "rounded-none");
        if (c.borders === "large") boxStyles = boxStyles.replace("rounded-lg", "rounded-xl");
        if (c.borders === "extra") boxStyles = boxStyles.replace("rounded-lg", "rounded-3xl");

        switch (c.type) {
          case "text":
            el.innerHTML = '<div class="' + boxStyles + alignClass + '" style="' + textStyles + '">' + parseTemplateText(c.text || "", variables) + '</div>';
            break;
          case "alert":
            let alertBg = "bg-blue-50 text-blue-800 border-blue-200 ";
            if (c.variant === "success") alertBg = "bg-green-50 text-green-800 border-green-200 ";
            if (c.variant === "warning") alertBg = "bg-yellow-50 text-yellow-800 border-yellow-200 ";
            if (c.variant === "danger") alertBg = "bg-red-50 text-red-800 border-red-200 ";
            el.innerHTML = '<div class="' + boxStyles + alertBg + 'text-sm p-4 border rounded-lg">' + parseTemplateText(c.text || "", variables) + '</div>';
            break;
          case "image":
            el.innerHTML = '<div class="' + boxStyles + '"><img src="' + (c.imageUrl || '') + '" alt="' + (c.alt || 'img') + '" class="w-full h-auto rounded-lg object-cover" /></div>';
            break;
          case "options":
            let optsHtml = '<div class="' + boxStyles + '"><h3 class="font-bold text-lg mb-2">' + parseTemplateText(c.title || "", variables) + '</h3>';
            if (c.subtitle) optsHtml += '<p class="text-sm text-gray-500 mb-4">' + parseTemplateText(c.subtitle, variables) + '</p>';
            
            const cols = c.columns || 1;
            optsHtml += '<div class="grid gap-3" style="grid-template-columns: repeat(' + cols + ', minmax(0, 1fr))">';
            c.options?.forEach(opt => {
              optsHtml += '<button onclick="selectOption(\\'' + opt.label + '\\', \\'' + (opt.nextStepId || '') + '\\', ' + (opt.score || 0) + ', \\'' + (c.idName || '') + '\\')" class="border rounded-lg p-3 hover:bg-gray-50 font-medium text-sm text-center flex flex-col items-center justify-center transition">';
              if (opt.image) {
                optsHtml += '<img src="' + opt.image + '" class="w-full aspect-square object-cover mb-2 rounded" />';
              }
              optsHtml += '<span>' + parseTemplateText(opt.label, variables) + '</span></button>';
            });
            optsHtml += '</div></div>';
            el.innerHTML = optsHtml;
            break;
          case "button":
            let btnAnim = "";
            if (c.animation === "pulsating") btnAnim = " animate-pulse-slow ";
            const btnOnClick = c.href ? 'onclick="trackPurchase(); window.open(\\'' + c.href + '\\', \\'' + (c.openInNewTab ? '_blank' : '_self') + '\\')"' : 'onclick="advance(\\'' + (c.nextStepId || '') + '\\')"';
            const btnElStr = '<button ' + btnOnClick + ' class="w-full py-3 px-4 font-semibold text-white rounded-lg transition active:scale-95' + btnAnim + '" style="background-color: ${primary}">' + parseTemplateText(c.buttonText || "Continuar", variables) + '</button>';
            
            if (c.fixedFooter) {
              fixedFooter.className = "fixed bottom-0 left-0 right-0 border-t bg-white/95 backdrop-blur p-4 shadow-lg z-50 block";
              fixedFooterContent.innerHTML = btnElStr;
              return;
            } else {
              el.innerHTML = btnElStr;
            }
            break;
          case "price":
            let priceHtml = '<div class="' + boxStyles + ' text-center space-y-4">';
            if (c.title) priceHtml += '<h3 class="text-lg font-bold">' + parseTemplateText(c.title, variables) + '</h3>';
            priceHtml += '<div><span class="text-4xl font-extrabold" style="color: ${primary}">' + parseTemplateText(c.price || "", variables) + '</span>';
            if (c.pricePeriod) priceHtml += '<span class="text-xs text-gray-500 block">' + parseTemplateText(c.pricePeriod, variables) + '</span>';
            priceHtml += '</div>';
            
            if (c.priceFeatures?.length) {
              priceHtml += '<ul class="space-y-2 text-left border-t border-b py-4">';
              c.priceFeatures.forEach(f => {
                priceHtml += '<li class="flex gap-2 text-sm"><span class="font-bold" style="color: ${primary}">✓</span><span>' + parseTemplateText(f, variables) + '</span></li>';
              });
              priceHtml += '</ul>';
            }
            const checkoutLink = c.href || funnel.saleUrl || "#";
            priceHtml += '<button onclick="trackPurchase(); window.open(\\'' + checkoutLink + '\\', \\'' + (c.openInNewTab ? '_blank' : '_self') + '\\'); advance(\\'' + (c.nextStepId || '') + '\\')" class="w-full py-3.5 px-4 rounded-lg font-semibold text-white transition active:scale-95" style="background-color: ${primary}">' + parseTemplateText(c.buttonText || "Adquirir agora", variables) + '</button>';
            priceHtml += '</div>';
            el.innerHTML = priceHtml;
            break;
          case "plans":
            let plansHtml = '<div class="' + boxStyles + ' space-y-4">';
            if (c.title) plansHtml += '<h3 class="text-xl font-bold text-center">' + parseTemplateText(c.title, variables) + '</h3>';
            c.plans?.forEach(plan => {
              const borderCol = plan.popular ? "border-green-600 shadow-md" : "border-gray-200";
              const dotCol = plan.popular ? "bg-green-600" : "";
              const planLink = plan.href || funnel.saleUrl || "#";
              plansHtml += '<div onclick="trackPurchase(); window.open(\\'' + planLink + '\\', \\'' + (plan.openInNewTab ? '_blank' : '_self') + '\\'); selectOption(\\'' + plan.name + '\\', \\'' + (plan.nextStepId || '') + '\\', 0, \\'' + (c.idName || '') + '\\')" class="border-2 ' + borderCol + ' rounded-xl p-4 cursor-pointer relative flex flex-col justify-between">';
              if (plan.popular) {
                plansHtml += '<div class="absolute top-0 left-0 right-0 bg-green-600 text-white text-[9px] font-black text-center py-0.5 uppercase">' + (plan.popularText || "MAIS POPULAR") + '</div>';
              }
              plansHtml += '<div class="flex items-center justify-between mt-2"><div class="flex items-center gap-3"><div class="h-4 w-4 rounded-full border grid place-items-center"><div class="h-2 w-2 rounded-full ' + dotCol + '"></div></div><span class="font-bold text-sm">' + parseTemplateText(plan.name, variables) + '</span></div><div class="text-right flex flex-col"><span class="text-[9px] text-gray-400 line-through">De ' + parseTemplateText(plan.originalPrice, variables) + ' por</span><span class="text-base font-extrabold text-green-600">' + parseTemplateText(plan.promoPrice, variables) + '</span></div></div></div>';
            });
            plansHtml += '</div>';
            el.innerHTML = plansHtml;
            break;
          case "progress-chart":
            const days = c.chartDays || 7;
            const pos = c.chartPosition || 40;
            const tLabels = c.chartLabels || ["Sem rotina", "Começando", "Estabelecida", "Ideal"];
            const curr = c.chartCurrentLabel || "Você hoje";
            const fut = (c.chartFutureLabel || "Você daqui a X dias").replace("X", String(days));
            
            const W = 340; const H = 180;
            const tVal = pos / 100;
            const bx = (1 - tVal) * (1 - tVal) * 0 + 2 * (1 - tVal) * tVal * 170 + tVal * tVal * W;
            const by = (1 - tVal) * (1 - tVal) * 160 + 2 * (1 - tVal) * tVal * 160 + tVal * tVal * 20;

            let graphHtml = '<div class="' + boxStyles + ' flex flex-col space-y-3"><div class="relative w-full" style="max-width: 360px; margin: 0 auto;">';
            graphHtml += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="w-full" style="overflow: visible;">';
            graphHtml += '<defs><linearGradient id="chartGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#ef4444" /><stop offset="40%" stop-color="#eab308" /><stop offset="70%" stop-color="#84cc16" /><stop offset="100%" stop-color="#22c55e" /></linearGradient></defs>';
            graphHtml += '<path d="M 0 160 Q 170 160 ' + W + ' 20 L ' + W + ' ' + H + ' L 0 ' + H + ' Z" fill="url(#chartGrad)" opacity="0.18" />';
            graphHtml += '<path d="M 0 160 Q 170 160 ' + W + ' 20" fill="none" stroke="url(#chartGrad)" stroke-width="3.5" />';
            graphHtml += '<circle cx="' + W + '" cy="20" r="6" fill="white" stroke="#6b7280" stroke-width="2" />';
            graphHtml += '<rect x="' + (W - 80) + '" y="0" width="80" height="20" rx="10" fill="white" stroke="#d1d5db" stroke-width="1" />';
            graphHtml += '<text x="' + (W - 40) + '" y="14" text-anchor="middle" font-size="10" fill="#374151" font-weight="600">' + fut + '</text>';
            graphHtml += '<circle cx="' + bx + '" cy="' + by + '" r="7" fill="${primary}" stroke="white" stroke-width="2.5" />';
            graphHtml += '<rect x="' + (bx - 38) + '" y="' + (by - 30) + '" width="76" height="22" rx="11" fill="${primary}" />';
            graphHtml += '<text x="' + bx + '" y="' + (by - 15) + '" text-anchor="middle" font-size="11" fill="white" font-weight="700">' + curr + '</text>';
            graphHtml += '</svg>';
            graphHtml += '<div class="flex justify-between mt-2 px-1">';
            tLabels.forEach(l => {
              graphHtml += '<span class="text-[9px] text-gray-400 text-center" style="width: ' + (100 / tLabels.length) + '%">' + l + '</span>';
            });
            graphHtml += '</div></div>';
            if (c.chartNote) graphHtml += '<p class="text-[10px] text-gray-400 text-center italic mt-1">' + c.chartNote + '</p>';
            graphHtml += '</div>';
            el.innerHTML = graphHtml;
            break;
          case "loading":
            el.innerHTML = '<div class="' + boxStyles + ' flex flex-col items-center gap-3 py-6"><div class="h-8 w-8 rounded-full border-4 border-gray-100 border-t-purple-600 animate-spin"></div><p class="text-sm font-semibold text-gray-700 animate-pulse">' + parseTemplateText(c.text || "Carregando...", variables) + '</p></div>';
            setTimeout(() => advance(), (c.loadingDuration || 3) * 1000);
            break;
          case "capture":
            let capHtml = '<div class="' + boxStyles + '"><h3 class="font-bold text-lg mb-4 text-center">' + parseTemplateText(c.title || "", variables) + '</h3><form onsubmit="event.preventDefault(); handleCaptureSubmit(this, \\'' + (c.nextStepId || '') + '\\')" class="space-y-3">';
            c.fields?.forEach(f => {
              const reqAttr = f.required ? "required" : "";
              const fType = f.type || "text";
              capHtml += '<div><label class="block text-xs font-semibold text-gray-600 mb-1">' + f.label + '</label><input type="' + fType + '" name="' + (f.idName || f.id) + '" ' + reqAttr + ' class="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-600" /></div>';
            });
            capHtml += '<button type="submit" class="w-full py-3 px-4 font-semibold text-white rounded-lg transition" style="background-color: ${primary}">' + (c.buttonText || "Continuar") + '</button></form></div>';
            el.innerHTML = capHtml;
            break;
          case "timer":
            el.innerHTML = '<div class="' + boxStyles + ' text-center space-y-1"><p class="text-xs font-medium text-gray-400">' + parseTemplateText(c.text || "", variables) + '</p><div class="text-3xl font-mono font-black" style="color: ${primary}">05:00</div></div>';
            break;
          case "testimonials":
            let testHtml = '<div class="' + boxStyles + ' space-y-4">';
            if (c.title) testHtml += '<h3 class="text-base font-bold text-center border-b pb-2">' + parseTemplateText(c.title, variables) + '</h3>';
            c.testimonials?.forEach(t => {
              testHtml += '<div class="rounded-lg border p-3.5 bg-gray-50/50 space-y-2"><p class="text-sm italic text-gray-700">\\"' + parseTemplateText(t.text, variables) + '\\"</p><div class="flex justify-between items-center"><span class="text-xs text-gray-500 font-semibold">— ' + parseTemplateText(t.author, variables) + '</span><span class="text-amber-500 text-xs">★★★★★</span></div></div>';
            });
            testHtml += '</div>';
            el.innerHTML = testHtml;
            break;
          case "compare":
            el.innerHTML = '<div class="' + boxStyles + ' grid grid-cols-2 gap-3"><div class="relative rounded-lg overflow-hidden border bg-gray-50"><img src="' + (c.beforeImageUrl || '') + '" class="w-full aspect-[4/5] object-cover" /><div class="absolute top-2 left-2 bg-black/60 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded">' + (c.beforeLabel || "Antes") + '</div></div><div class="relative rounded-lg overflow-hidden border bg-gray-50"><img src="' + (c.afterImageUrl || '') + '" class="w-full aspect-[4/5] object-cover" /><div class="absolute top-2 left-2 bg-green-600 text-white text-[9px] uppercase font-bold px-2 py-0.5 rounded">' + (c.afterLabel || "Depois") + '</div></div></div>';
            break;
          case "video":
            let vidUrl = c.videoUrl || "";
            if (vidUrl.includes("youtube.com") || vidUrl.includes("youtu.be")) {
              const vidId = vidUrl.includes("v=") ? vidUrl.split("v=")[1].split("&")[0] : vidUrl.split("youtu.be/")[1];
              vidUrl = "https://www.youtube.com/embed/" + vidId;
            }
            if (vidUrl.includes("embed") || vidUrl.includes("player.vimeo")) {
              el.innerHTML = '<div class="' + boxStyles + ' overflow-hidden"><div class="aspect-video w-full rounded-lg overflow-hidden"><iframe src="' + vidUrl + '" class="w-full h-full border-0" allow="accelerometer; autoplay; encrypted-media; gyroscope" allowfullscreen></iframe></div></div>';
            } else if (vidUrl) {
              el.innerHTML = '<div class="' + boxStyles + ' overflow-hidden"><video src="' + vidUrl + '" controls class="w-full rounded-lg"></video></div>';
            } else {
              el.innerHTML = '<div class="h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-xs text-gray-400">Vídeo não configurado</div>';
            }
            break;
          case "space":
            el.innerHTML = '<div style="height: ' + (c.height || 24) + 'px"></div>';
            break;
        }

        container.appendChild(el);
      });
    }

    function handleCaptureSubmit(form, nextStepId) {
      const formData = new FormData(form);
      for (const [key, value] of formData.entries()) {
        answers[key] = value;
      }
      advance(nextStepId);
    }

    // Initialize
    render();
  </script>
</body>
</html>`;
}
