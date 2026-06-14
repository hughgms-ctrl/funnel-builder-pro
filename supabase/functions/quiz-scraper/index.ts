import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BROWSERLESS_KEY = Deno.env.get("BROWSERLESS_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { action, url, maxSteps = 20, apiKey, prompt, step, funnelContext } = body;

    // 1. Action: Generate Image (DALL-E 3)
    if (action === "generate-image") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OpenAI API Key required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (!prompt) {
        return new Response(JSON.stringify({ error: "Prompt required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const openAiRes = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "dall-e-3",
          prompt,
          size: "1024x1024",
          quality: "standard",
          n: 1,
        }),
      });

      if (!openAiRes.ok) {
        const errObj = await openAiRes.json().catch(() => ({}));
        const errMsg = errObj?.error?.message || `Status ${openAiRes.status}`;
        return new Response(JSON.stringify({ error: `DALL-E error: ${errMsg}` }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const data = await openAiRes.json();
      return new Response(JSON.stringify(data), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // 2. Action: Vision OpenAI (GPT-4o)
    if (action === "analyze-vision-openai") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "OpenAI API Key required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (!step || !step.screenshot) {
        return new Response(JSON.stringify({ error: "Step screenshot required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const knownContent = step.content || {};
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert at analyzing quiz funnel screenshots and converting them to structured JSON components.

Return a JSON array of components. Each component is one of these types:
- { "type": "text", "text": "..." }
- { "type": "image", "imageUrl": "url or empty", "alt": "..." }
- { "type": "options", "title": "...", "subtitle": "...", "columns": 1 or 2, "options": [{ "id": "rand8", "label": "...", "image": "imageUrl or empty" }] }
- { "type": "capture", "title": "...", "fields": [{ "id": "rand8", "type": "text|email|tel", "label": "...", "required": true }], "buttonText": "..." }
- { "type": "button", "buttonText": "..." }
- { "type": "loading", "text": "...", "loadingDuration": 3 }
- { "type": "price", "title": "...", "price": "R$ XX", "pricePeriod": "/Ãºnico", "priceFeatures": ["..."], "buttonText": "..." }
- { "type": "plans", "title": "...", "plans": [{ "id": "rand8", "name": "...", "originalPrice": "R$ XX", "promoPrice": "R$ XX", "period": "/mÃªs", "popular": false }] }
- { "type": "testimonials", "title": "...", "testimonials": [{ "id": "rand8", "author": "...", "text": "..." }] }
- { "type": "timer", "seconds": 600, "text": "Oferta expira em" }
- { "type": "alert", "text": "...", "variant": "info" }

RULES:
- Extract ALL text VERBATIM from the image (Brazilian Portuguese)
- For options: list EVERY visible option label
- For capture forms: list ALL visible fields
- For prices: extract EXACT price values
- Generate 8-char random alphanumeric ids for id fields
- Return ONLY a JSON array, no markdown or explanation`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this screenshot of step ${step.stepNumber} of a quiz funnel.
Context: ${funnelContext}
Page type detected: ${knownContent.pageType}
Known title: "${knownContent.title}"
Known options count: ${knownContent.options?.length || 0}
Known text: "${(knownContent.allText || "").slice(0, 800)}"

Extract ALL components you see in this screenshot. Be extremely accurate and verbose.`,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: step.screenshot,
                    detail: "high",
                  },
                },
              ],
            },
          ],
          max_tokens: 2000,
        }),
      });

      if (!res.ok) {
        const errObj = await res.json().catch(() => ({}));
        const errMsg = errObj?.error?.message || `Status ${res.status}`;
        return new Response(JSON.stringify({ error: `GPT-4V error: ${errMsg}` }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const content = data.choices[0]?.message?.content || "[]";
      const jsonStr = content
        .replace(/^```(?:json)?\n?/m, "")
        .replace(/\n?```$/m, "")
        .trim();

      try {
        const components = JSON.parse(jsonStr);
        return new Response(JSON.stringify({ components }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse JSON response from GPT-4V" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    // 3. Action: Vision Anthropic (Claude 3.5 Sonnet)
    if (action === "analyze-vision-claude") {
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "Anthropic API Key required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      if (!step || !step.screenshot) {
        return new Response(JSON.stringify({ error: "Step screenshot required" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const base64Data = step.screenshot.replace(/^data:image\/[a-z]+;base64,/, "");
      const knownContent = step.content || {};

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: { type: "base64", media_type: "image/png", data: base64Data },
                },
                {
                  type: "text",
                  text: `Analyze this screenshot of step ${step.stepNumber} of a quiz funnel (${funnelContext}).
Page type: ${knownContent.pageType}. Known title: "${knownContent.title}". Options found: ${knownContent.options?.length || 0}.

Return a JSON array of components. Types: text, image, options, capture, button, loading, price, plans, testimonials, timer, alert.
- options: { type:"options", title, subtitle, columns(1-2), options:[{id,label,image}] }
- capture: { type:"capture", title, fields:[{id,type,label,required}], buttonText }
- price: { type:"price", title, price, pricePeriod, priceFeatures:[], buttonText }
- plans: { type:"plans", title, plans:[{id,name,originalPrice,promoPrice,period,popular}] }
Use 8-char random alphanumeric ids. Extract ALL text VERBATIM in Brazilian Portuguese. Return ONLY valid JSON array.`,
                },
              ],
            },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return new Response(JSON.stringify({ error: `Claude error: ${errText}` }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      const data = await res.json();
      const content = data.content[0]?.text || "[]";
      const jsonStr = content.replace(/^```(?:json)?\n?/m, "").replace(/\n?```$/m, "").trim();

      try {
        const components = JSON.parse(jsonStr);
        return new Response(JSON.stringify({ components }), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch {
        return new Response(JSON.stringify({ error: "Failed to parse JSON response from Claude" }), {
          status: 500,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
    }

    if (!url) {
      return new Response(JSON.stringify({ error: "URL required" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    if (!BROWSERLESS_KEY) {
      return new Response(JSON.stringify({ error: "BROWSERLESS_API_KEY not set" }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Puppeteer code: navigate quiz step-by-step, capture screenshot + text at each step
    const puppeteerCode = `
export default async function ({ page, context }) {
  const { url, maxSteps } = context;
  const steps = [];
  const seenHashes = new Set();
  const seenUrls = new Set();

  // --- Helpers ---
  function hashStr(s) {
    // Use full string hash, not just first 500 chars
    let h = 5381;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return String(h >>> 0);
  }

  async function waitForSettle(ms) {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Dispatch full React-compatible pointer + click sequence
  async function reactClick(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
    el.dispatchEvent(new PointerEvent('pointerover', opts));
    el.dispatchEvent(new PointerEvent('pointerenter', { ...opts, bubbles: false }));
    el.dispatchEvent(new MouseEvent('mouseover', opts));
    el.dispatchEvent(new MouseEvent('mouseenter', { ...opts, bubbles: false }));
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
    el.click();
  }

  await page.setViewport({ width: 430, height: 932 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

  // Disable images to speed up loading
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (['image', 'font', 'media'].includes(req.resourceType()) && req.url().includes('cdn')) {
      req.abort();
    } else {
      req.continue();
    }
  });

  console.log('Navigating to:', url);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
  } catch(e) {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  }
  await waitForSettle(4000);

  const OPTION_SELECTORS = [
    '[class*="option-background"]',
    '[class*="option_background"]',
    '[class*="optionBackground"]',
    '[class*="option-button"]',
    '[class*="option_button"]',
    '[class*="option-card"]',
    '[class*="option_card"]',
    '[class*="answer-button"]',
    '[class*="answer_button"]',
    '[class*="quiz-option"]',
    '[class*="quiz_option"]',
    '[class*="quizOption"]',
    '[class*="choice-item"]',
    '[class*="choice_item"]',
    '[class*="choice-button"]',
    '[data-option]',
    '[data-answer]',
    '[data-quiz-option]',
    '[role="radio"]',
    '[class*="alternativa"]',
    '[class*="opcao"]',
    // Generic list items that might be options
    'li[class*="item"]',
    'li[class*="option"]',
  ];

  const CTA_KEYWORDS = [
    'prÃ³x', 'proximo', 'prÃ³ximo', 'continuar', 'avanÃ§ar', 'prosseguir',
    'next', 'continue', 'proceed', 'start', 'iniciar', 'comeÃ§',
    'ver result', 'quero', 'enviar', 'submit', 'confirmar', 'ok',
    'ir para', 'acessar', 'cadastrar', 'participar', 'ver meu',
  ];

  async function extractContent() {
    return await page.evaluate((OPTION_SELECTORS) => {
      const body = document.body;
      const allText = body.innerText?.trim() || '';

      const titleEl = body.querySelector('h1') || body.querySelector('h2')
        || body.querySelector('[class*="title"]') || body.querySelector('[class*="question"]')
        || body.querySelector('[class*="heading"]') || body.querySelector('[class*="pergunta"]')
        || body.querySelector('[class*="titulo"]');
      const title = titleEl?.innerText?.trim() || '';

      const subtitleEl = body.querySelector('[class*="subtitle"]') || body.querySelector('[class*="description"]')
        || body.querySelector('[class*="subheading"]') || body.querySelector('[class*="subtitulo"]');
      const subtitle = subtitleEl?.innerText?.trim() || '';

      let options = [];
      for (const sel of OPTION_SELECTORS) {
        const els = Array.from(body.querySelectorAll(sel));
        if (els.length >= 2) { // At least 2 options = real choice screen
          options = els.map(el => ({
            text: el.innerText?.trim() || '',
            hasImage: el.querySelector('img') !== null,
            imageUrl: el.querySelector('img')?.src || '',
            href: el.closest('a[href]')?.href || el.querySelector('a[href]')?.href || '',
          })).filter(o => o.text.length > 0 && o.text.length < 200);
          if (options.length >= 2) break;
        }
      }

      const inputs = Array.from(body.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])'
      )).filter(el => el.offsetParent !== null).map(el => ({
        type: el.getAttribute('type') || 'text',
        placeholder: el.getAttribute('placeholder') || '',
        name: el.getAttribute('name') || el.getAttribute('id') || '',
      }));

      const buttons = Array.from(body.querySelectorAll('button:not([disabled])'))
        .filter(el => el.offsetParent !== null && el.innerText?.trim().length > 0 && el.innerText?.trim().length < 120)
        .map(el => ({
          text: el.innerText?.trim(),
          href: el.closest('a[href]')?.href || el.querySelector('a[href]')?.href || '',
        }));

      const images = Array.from(body.querySelectorAll('img'))
        .filter(img => img.offsetParent !== null && img.src && !img.src.startsWith('data:') && img.width > 30)
        .slice(0, 6)
        .map(img => ({ src: img.src, alt: img.alt || '' }));

      const bodyText = allText.toLowerCase();
      let pageType = 'unknown';
      if (options.length >= 2) pageType = 'options';
      else if (inputs.length > 0) pageType = 'capture';
      else if (body.querySelector('[class*="loading"], [class*="spinner"], [class*="carregand"], [class*="aguard"]')) pageType = 'loading';
      else if (body.querySelector('[class*="price"], [class*="checkout"], [class*="plan"], [class*="valor"], [class*="oferta"]')) pageType = 'offer';
      else if (body.querySelector('[class*="result"], [class*="score"], [class*="resultado"]')) pageType = 'result';
      else if (bodyText.includes('parabÃ©ns') || bodyText.includes('obrigado') || bodyText.includes('sucesso')) pageType = 'result';
      else if (buttons.some(b => ['comeÃ§', 'iniciar', 'start', 'quero', 'participar'].some(k => (b?.text || '').toLowerCase().includes(k)))) pageType = 'intro';

      const cs = window.getComputedStyle(document.documentElement);
      const primaryColor = cs.getPropertyValue('--theme-highlight-color')?.trim()
        || cs.getPropertyValue('--primary')?.trim()
        || cs.getPropertyValue('--color-primary')?.trim()
        || '#7c3aed';

      return { allText: allText.slice(0, 5000), title, subtitle, options, inputs, buttons, images, pageType, primaryColor, url: window.location.href };
    }, OPTION_SELECTORS);
  }

  for (let stepNum = 0; stepNum < maxSteps; stepNum++) {
    let stepContent = await extractContent();

    // --- Deduplication: use URL + content hash ---
    const currentUrl = stepContent.url;
    // Only hash meaningful content (title + options text, not the full allText which may include nav/footer)
    const fingerprint = stepContent.title + '|||' + stepContent.options.map(o => o.text).join('|') + '|||' + stepContent.pageType;
    const contentHash = hashStr(fingerprint);

    if (steps.length > 0 && seenHashes.has(contentHash)) {
      console.log('Duplicate content at step', stepNum + 1, 'â€” waiting 4s...');
      await waitForSettle(4000);
      stepContent = await extractContent();
      const newFingerprint = stepContent.title + '|||' + stepContent.options.map(o => o.text).join('|') + '|||' + stepContent.pageType;
      const newHash = hashStr(newFingerprint);
      if (seenHashes.has(newHash)) {
        console.log('Still duplicate â€” crawler stopped.');
        break;
      }
      seenHashes.add(newHash);
    } else {
      seenHashes.add(contentHash);
    }

    seenUrls.add(currentUrl);

    // Take screenshot
    let screenshotBase64 = '';
    try {
      screenshotBase64 = await page.screenshot({
        encoding: 'base64', type: 'jpeg', quality: 75,
        fullPage: false, clip: { x: 0, y: 0, width: 430, height: 932 },
      });
    } catch(e) { screenshotBase64 = ''; }

    steps.push({
      stepNumber: stepNum + 1,
      screenshot: 'data:image/jpeg;base64,' + screenshotBase64,
      content: stepContent,
    });

    console.log('âœ… Step', stepNum + 1, '[' + stepContent.pageType + ']', stepContent.title.slice(0, 60) || stepContent.allText.slice(0, 60));

    // Stop at terminal pages
    if (stepContent.pageType === 'offer' || stepContent.pageType === 'result') {
      console.log('ðŸ Terminal page â€” stopping.');
      break;
    }

    // --- Auto-fill inputs before clicking ---
    if (stepContent.inputs.length > 0) {
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="radio"]):not([type="checkbox"]):not([type="button"])'));
        for (const input of inputs) {
          if (!input.offsetParent) continue;
          const t = (input.getAttribute('type') || 'text').toLowerCase();
          const n = (input.getAttribute('name') || input.getAttribute('id') || '').toLowerCase();
          const p = (input.getAttribute('placeholder') || '').toLowerCase();
          if (t === 'email' || n.includes('email') || p.includes('email')) input.value = 'teste@email.com';
          else if (t === 'tel' || n.includes('tel') || n.includes('fone') || n.includes('whatsapp') || n.includes('celular') || p.includes('whatsapp') || p.includes('celular')) input.value = '11999999999';
          else if (n.includes('nome') || n.includes('name') || p.includes('nome')) input.value = 'Teste Silva';
          else input.value = 'teste';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Auto-check checkboxes (terms, etc.)
        Array.from(document.querySelectorAll('input[type="checkbox"]')).forEach(cb => {
          if (cb.offsetParent && !cb.checked) { cb.click(); cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); }
        });
      });
      await waitForSettle(500);
    }

    // --- Navigation: Click option OR CTA ---
    let clickedSomething = false;

    // 1) Try clicking the first visible quiz option
    if (stepContent.options.length > 0) {
      const clicked = await page.evaluate(async (OPTION_SELECTORS) => {
        function fullClick(el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
          ['pointerover','pointerenter','mouseover','mouseenter','pointerdown','mousedown','pointerup','mouseup','click'].forEach(evtName => {
            const isEnter = evtName.includes('enter');
            el.dispatchEvent(evtName.startsWith('pointer') ? new PointerEvent(evtName, { ...opts, bubbles: !isEnter }) : new MouseEvent(evtName, { ...opts, bubbles: !isEnter }));
          });
          el.click();
        }
        for (const sel of OPTION_SELECTORS) {
          const els = Array.from(document.querySelectorAll(sel)).filter(e => e.offsetParent !== null);
          if (els.length >= 2) {
            fullClick(els[0]);
            return { sel, text: els[0].innerText?.trim() || '' };
          }
        }
        return null;
      }, OPTION_SELECTORS);

      if (clicked) {
        clickedSomething = true;
        console.log('ðŸ‘† Clicked option:', clicked.text.slice(0, 40), 'via', clicked.sel);
        await waitForSettle(800);

        // After clicking option, look for "Next/Continue" CTA
        const ctaClicked = await page.evaluate((CTA_KEYWORDS) => {
          function fullClick(el) {
            const rect = el.getBoundingClientRect();
            const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
            const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
            ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(e => el.dispatchEvent(e.startsWith('pointer') ? new PointerEvent(e,opts) : new MouseEvent(e,opts)));
            el.click();
          }
          const btns = Array.from(document.querySelectorAll('button:not([disabled]), [role="button"]:not([disabled])'))
            .filter(e => e.offsetParent !== null);
          for (const btn of btns) {
            const txt = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
            if (CTA_KEYWORDS.some(k => txt.includes(k))) { fullClick(btn); return btn.innerText?.trim(); }
          }
          return null;
        }, CTA_KEYWORDS);

        if (ctaClicked) {
          console.log('ðŸ‘† Also clicked CTA:', ctaClicked);
          await waitForSettle(2500);
        } else {
          await waitForSettle(2000);
        }
      }
    }

    // 2) No option found â€” try CTA (intro screen, loading, etc.)
    if (!clickedSomething) {
      const ctaResult = await page.evaluate((CTA_KEYWORDS) => {
        function fullClick(el) {
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width / 2; const cy = rect.top + rect.height / 2;
          const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, view: window };
          ['pointerdown','mousedown','pointerup','mouseup','click'].forEach(e => el.dispatchEvent(e.startsWith('pointer') ? new PointerEvent(e,opts) : new MouseEvent(e,opts)));
          el.click();
        }
        const btns = Array.from(document.querySelectorAll('button:not([disabled]), [role="button"]:not([disabled]), a[href]:not([href="#"]):not([href=""])'))
          .filter(e => e.offsetParent !== null);
        for (const btn of btns) {
          const txt = (btn.innerText || btn.getAttribute('aria-label') || '').toLowerCase();
          if (CTA_KEYWORDS.some(k => txt.includes(k))) { fullClick(btn); return { text: btn.innerText?.trim(), type: 'keyword' }; }
        }
        if (btns.length > 0) { fullClick(btns[0]); return { text: btns[0].innerText?.trim() || 'first', type: 'fallback' }; }
        return null;
      }, CTA_KEYWORDS);

      if (ctaResult) {
        clickedSomething = true;
        console.log('ðŸ‘† Clicked CTA (' + ctaResult.type + '):', ctaResult.text?.slice(0, 40));
        await waitForSettle(3000);
      }
    }

    // 3) Loading screen â€” just wait
    if (!clickedSomething && stepContent.pageType === 'loading') {
      console.log('â³ Loading screen â€” waiting 7s...');
      await waitForSettle(7000);
      clickedSomething = true;
    }

    if (!clickedSomething) {
      console.log('âš ï¸ Nothing clickable at step', stepNum + 1, 'â€” stopping.');
      break;
    }
  }

  return { steps, totalSteps: steps.length };
}
`;

    // Try Browserless /function endpoint (v2 API)
    const browserlessEndpoints = [
      `https://production-sfo.browserless.io/function?token=${BROWSERLESS_KEY}`,
      `https://chrome.browserless.io/function?token=${BROWSERLESS_KEY}`,
    ];

    let res: Response | null = null;
    let lastErr = "";
    for (const endpoint of browserlessEndpoints) {
      try {
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: puppeteerCode,
            context: { url, maxSteps },
          }),
          signal: AbortSignal.timeout(240000), // 4 min — enough for 20+ steps
        });
        if (res.ok) break;
        lastErr = `${endpoint}: HTTP ${res.status} — ${await res.text().catch(() => "")}`;
        res = null;
      } catch (e: any) {
        lastErr = e.message;
        res = null;
      }
    }

    if (!res) throw new Error(`Browserless unreachable: ${lastErr}`);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Browserless error ${res.status}: ${errText.slice(0, 800)}`);
    }

    const data = await res.json();
    console.log("quiz-scraper: captured", data?.steps?.length ?? 0, "steps");

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("quiz-scraper error:", err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
