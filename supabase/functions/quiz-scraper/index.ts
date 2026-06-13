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
    const { url, maxSteps = 20 } = await req.json();
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
module.exports = async ({ page, context }) => {
  const { url, maxSteps } = context;
  const steps = [];
  const seenHashes = new Set();

  // Helper: simple hash of a string
  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < Math.min(s.length, 500); i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return String(h);
  }

  // Helper: wait for DOM to settle after a click (SPA transitions)
  async function waitForSettle(ms = 2500) {
    await page.waitForTimeout(ms);
  }

  await page.setViewport({ width: 430, height: 932 }); // iPhone 14 Pro
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');

  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  await waitForSettle(4000); // Extra wait for SPA hydration

  const CLICK_SELECTORS = [
    // Common quiz option wrappers
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
    '[role="option"]',
    // Inlead specific
    '[class*="alternativa"]',
    '[class*="opcao"]',
  ];

  const CTA_KEYWORDS = [
    'próx', 'proximo', 'continuar', 'avançar', 'prosseguir',
    'next', 'continue', 'proceed', 'start', 'iniciar', 'começ',
    'ver resultado', 'quero', 'enviar', 'submit', 'confirmar', 'ok',
    'ir para', 'acessar', 'cadastrar', 'participar',
  ];

  for (let stepNum = 0; stepNum < maxSteps; stepNum++) {
    // Capture screenshot
    let screenshotBase64 = '';
    try {
      screenshotBase64 = await page.screenshot({
        encoding: 'base64',
        type: 'jpeg',
        quality: 80,
        fullPage: false,
        clip: { x: 0, y: 0, width: 430, height: 932 },
      });
    } catch (e) {
      screenshotBase64 = '';
    }

    // Extract step content
    const stepContent = await page.evaluate(() => {
      const body = document.body;
      const allText = body.innerText?.trim() || '';

      // Title: try multiple strategies
      const titleEl = body.querySelector('h1') || body.querySelector('h2')
        || body.querySelector('[class*="title"]') || body.querySelector('[class*="question"]')
        || body.querySelector('[class*="heading"]') || body.querySelector('[class*="pergunta"]');
      const title = titleEl?.innerText?.trim() || '';

      const subtitleEl = body.querySelector('[class*="subtitle"]') || body.querySelector('[class*="description"]')
        || body.querySelector('[class*="subheading"]');
      const subtitle = subtitleEl?.innerText?.trim() || '';

      // Options: wide selector sweep
      const optSelectors = [
        '[class*="option-background"]', '[class*="option_background"]', '[class*="optionBackground"]',
        '[class*="option-button"]', '[class*="option_button"]',
        '[class*="option-card"]', '[class*="option_card"]',
        '[class*="answer-button"]', '[class*="answer_button"]',
        '[class*="quiz-option"]', '[class*="quiz_option"]', '[class*="quizOption"]',
        '[class*="choice-item"]', '[class*="choice-button"]',
        '[data-option]', '[data-answer]',
        '[role="radio"]', '[role="option"]',
        '[class*="alternativa"]', '[class*="opcao"]',
      ];

      let options = [];
      for (const sel of optSelectors) {
        const els = Array.from(body.querySelectorAll(sel));
        if (els.length > 0) {
          options = els.map(el => ({
            text: el.innerText?.trim() || '',
            hasImage: el.querySelector('img') !== null,
            imageUrl: el.querySelector('img')?.src || '',
            selector: sel,
          })).filter(o => o.text.length > 0 && o.text.length < 200);
          if (options.length > 0) break;
        }
      }

      // Inputs
      const inputs = Array.from(body.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type])'
      )).filter(el => el.offsetParent !== null).map(el => ({
        type: el.getAttribute('type') || 'text',
        placeholder: el.getAttribute('placeholder') || '',
        name: el.getAttribute('name') || el.getAttribute('id') || '',
      }));

      // Buttons
      const buttons = Array.from(body.querySelectorAll('button:not([disabled])'))
        .filter(el => el.offsetParent !== null && el.innerText?.trim().length > 0 && el.innerText?.trim().length < 100)
        .map(el => el.innerText?.trim());

      // Images
      const images = Array.from(body.querySelectorAll('img'))
        .filter(img => img.offsetParent !== null && img.src && !img.src.startsWith('data:') && img.width > 30)
        .slice(0, 6)
        .map(img => ({ src: img.src, alt: img.alt || '' }));

      // Page type detection
      let pageType = 'unknown';
      const bodyText = allText.toLowerCase();
      if (options.length > 0) pageType = 'options';
      else if (inputs.length > 0) pageType = 'capture';
      else if (body.querySelector('[class*="loading"], [class*="spinner"], [class*="carregand"]')) pageType = 'loading';
      else if (body.querySelector('[class*="price"], [class*="checkout"], [class*="plan"], [class*="valor"]')) pageType = 'offer';
      else if (body.querySelector('[class*="result"], [class*="score"], [class*="resultado"]')) pageType = 'result';
      else if (buttons.some(b => ['começ', 'iniciar', 'start', 'quero', 'participar'].some(k => b.toLowerCase().includes(k)))) pageType = 'intro';
      else if (bodyText.includes('parabéns') || bodyText.includes('obrigado') || bodyText.includes('sucesso')) pageType = 'result';

      // Primary color from CSS vars
      const cs = window.getComputedStyle(document.documentElement);
      const primaryColor = cs.getPropertyValue('--theme-highlight-color')?.trim()
        || cs.getPropertyValue('--primary')?.trim()
        || cs.getPropertyValue('--color-primary')?.trim()
        || '#7c3aed';

      return {
        allText: allText.slice(0, 3000),
        title,
        subtitle,
        options,
        inputs,
        buttons,
        images,
        pageType,
        primaryColor,
        url: window.location.href,
      };
    });

    // Deduplication: skip if we've seen this exact content
    const contentHash = hashStr(stepContent.allText);
    if (steps.length > 0 && seenHashes.has(contentHash)) {
      console.log('Duplicate content at step', stepNum, '— stopping');
      break;
    }
    seenHashes.add(contentHash);

    steps.push({
      stepNumber: stepNum + 1,
      screenshot: 'data:image/jpeg;base64,' + screenshotBase64,
      content: stepContent,
      debug: { contentHash, stepNum },
    });

    console.log('Step', stepNum + 1, ':', stepContent.pageType, '—', stepContent.title || stepContent.allText.slice(0, 60));

    // Stop at offer/result
    if (stepContent.pageType === 'offer' || stepContent.pageType === 'result') {
      console.log('Terminal page reached');
      break;
    }

    // — NAVIGATION STRATEGY —
    // 1) Try clicking a quiz option
    let clickedSomething = false;

    const clickResult = await page.evaluate((CLICK_SELECTORS) => {
      for (const sel of CLICK_SELECTORS) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          el.click();
          return { clicked: true, type: 'option', text: el.innerText?.trim() || '', selector: sel };
        }
      }
      return { clicked: false };
    }, CLICK_SELECTORS);

    if (clickResult.clicked) {
      clickedSomething = true;
      console.log('Clicked option:', clickResult.text, 'via', clickResult.selector);
      await waitForSettle(2500);
    } else {
      // 2) Try clicking a CTA button
      const ctaResult = await page.evaluate((CTA_KEYWORDS) => {
        const allButtons = Array.from(document.querySelectorAll('button:not([disabled]), [role="button"]:not([disabled]), a[href]'))
          .filter(el => el.offsetParent !== null);
        for (const btn of allButtons) {
          const text = btn.innerText?.toLowerCase() || btn.getAttribute('aria-label')?.toLowerCase() || '';
          if (CTA_KEYWORDS.some(k => text.includes(k))) {
            btn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
            btn.click();
            return { clicked: true, text: btn.innerText?.trim() || '' };
          }
        }
        // Fallback: click first visible button
        if (allButtons.length > 0) {
          const first = allButtons[0];
          first.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          first.click();
          return { clicked: true, text: first.innerText?.trim() || 'first-button', fallback: true };
        }
        return { clicked: false };
      }, CTA_KEYWORDS);

      if (ctaResult.clicked) {
        clickedSomething = true;
        console.log('Clicked CTA:', ctaResult.text, ctaResult.fallback ? '(fallback)' : '');
        await waitForSettle(3000);
      }
    }

    if (!clickedSomething) {
      console.log('Nothing clickable found — stopping at step', stepNum + 1);
      break;
    }
  }

  return { steps, totalSteps: steps.length };
};
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
          signal: AbortSignal.timeout(150000), // 2.5 min — enough for 20 steps
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
