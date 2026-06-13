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
    const { url } = await req.json();
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

    // Puppeteer code: navigate quiz step-by-step, capture screenshot + text of each step
    const puppeteerCode = `
module.exports = async ({ page, context }) => {
  const { url } = context;
  const steps = [];

  await page.setViewport({ width: 414, height: 896 }); // Mobile viewport (quiz optimized)
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForTimeout(3000);

  for (let stepNum = 0; stepNum < 15; stepNum++) {
    // Capture screenshot of current step
    const screenshotBase64 = await page.screenshot({
      encoding: 'base64',
      type: 'png',
      fullPage: false,
    });

    // Extract text content of the step
    const stepContent = await page.evaluate(() => {
      const body = document.body;
      
      // Get all visible text
      const allText = body.innerText.trim();
      
      // Get title
      const titleCandidates = [
        body.querySelector('h1'),
        body.querySelector('h2'),
        body.querySelector('[class*="title"]'),
        body.querySelector('[class*="heading"]'),
        body.querySelector('[class*="question"]'),
      ].filter(Boolean);
      const title = titleCandidates[0]?.innerText?.trim() || '';
      
      // Get subtitle
      const subtitleCandidates = [
        body.querySelector('[class*="subtitle"]'),
        body.querySelector('[class*="description"]'),
        body.querySelector('p'),
      ].filter(Boolean);
      const subtitle = subtitleCandidates[0]?.innerText?.trim() || '';

      // Extract clickable options
      const optionSelectors = [
        '[class*="option-background"]',
        '[class*="option-button"]',
        '[class*="option-card"]',
        '[class*="answer-button"]',
        '[class*="choice"]',
        '[data-option]',
        '[role="radio"]',
        '[role="option"]',
      ];
      
      let options = [];
      for (const sel of optionSelectors) {
        const els = Array.from(body.querySelectorAll(sel));
        if (els.length > 0) {
          options = els.map(el => ({
            text: el.innerText?.trim() || '',
            hasImage: el.querySelector('img') !== null,
            imageUrl: el.querySelector('img')?.src || '',
          })).filter(o => o.text.length > 0);
          break;
        }
      }
      
      // Extract input fields
      const inputs = Array.from(body.querySelectorAll('input[type="text"], input[type="email"], input[type="tel"], input[type="number"]'))
        .map(el => ({
          type: el.getAttribute('type') || 'text',
          placeholder: el.getAttribute('placeholder') || '',
          name: el.getAttribute('name') || '',
        }));
      
      // Extract all buttons
      const buttons = Array.from(body.querySelectorAll('button:not([disabled])'))
        .filter(el => el.offsetParent !== null && el.innerText?.trim().length > 0)
        .map(el => el.innerText?.trim());
      
      // Extract images
      const images = Array.from(body.querySelectorAll('img'))
        .filter(img => img.offsetParent !== null && img.src && !img.src.startsWith('data:'))
        .map(img => ({ src: img.src, alt: img.alt || '' }));

      // Page type detection
      let pageType = 'unknown';
      if (options.length > 0) pageType = 'options';
      else if (inputs.length > 0) pageType = 'capture';
      else if (body.querySelector('[class*="loading"], [class*="spinner"]')) pageType = 'loading';
      else if (body.querySelector('[class*="price"], [class*="checkout"], [class*="plan"]')) pageType = 'offer';
      else if (body.querySelector('[class*="result"], [class*="score"]')) pageType = 'result';
      else if (buttons.some(b => b.toLowerCase().includes('começ') || b.toLowerCase().includes('iniciar') || b.toLowerCase().includes('start'))) pageType = 'intro';
      
      // CSS variables / colors
      const computedStyle = window.getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue('--theme-highlight-color')?.trim()
        || computedStyle.getPropertyValue('--primary')?.trim()
        || '#7c3aed';
      
      return {
        allText: allText.slice(0, 3000),
        title,
        subtitle,
        options,
        inputs,
        buttons,
        images: images.slice(0, 5),
        pageType,
        primaryColor,
        url: window.location.href,
      };
    });

    steps.push({
      stepNumber: stepNum + 1,
      screenshot: 'data:image/png;base64,' + screenshotBase64,
      content: stepContent,
    });

    // Check for terminal states (offer/result pages with no navigation)
    if (stepContent.pageType === 'offer' || stepContent.pageType === 'result') {
      // Capture but don't click further
      break;
    }

    // Navigate to next step
    const navigated = await page.evaluate(() => {
      // Priority 1: Click first quiz option
      const optionSelectors = [
        '[class*="option-background"]:not([disabled])',
        '[class*="option-button"]:not([disabled])',
        '[class*="option-card"]:not([disabled])',
        '[class*="answer-button"]:not([disabled])',
        '[data-option]:not([disabled])',
        '[role="radio"]:not([disabled])',
      ];

      for (const sel of optionSelectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          el.click();
          return { clicked: true, type: 'option', text: el.innerText?.trim() };
        }
      }

      // Priority 2: Navigation/CTA buttons
      const ctaKeywords = ['próx', 'continuar', 'avançar', 'next', 'continue', 'iniciar', 'começ', 'start', 'ver', 'resultado', 'enviar', 'submit'];
      const allButtons = Array.from(document.querySelectorAll('button:not([disabled])'))
        .filter(el => el.offsetParent !== null);

      for (const btn of allButtons) {
        const text = btn.innerText?.toLowerCase() || '';
        if (ctaKeywords.some(k => text.includes(k))) {
          btn.click();
          return { clicked: true, type: 'cta', text: btn.innerText?.trim() };
        }
      }

      // Priority 3: First visible button (fallback)
      if (allButtons.length > 0) {
        allButtons[0].click();
        return { clicked: true, type: 'first-button', text: allButtons[0].innerText?.trim() };
      }

      return { clicked: false };
    });

    if (!navigated.clicked) break;

    // Wait for transition/animation
    await page.waitForTimeout(2000);

    // Detect if page changed (compare body text instead of fragile titles)
    const newText = await page.evaluate(() => document.body.innerText.trim().slice(0, 1000));
    if (steps.length > 0 && newText === steps[steps.length - 1]?.content?.allText?.slice(0, 1000)) {
      break; // No change in page content — quiz ended or click did not work
    }
  }

  return { steps, totalSteps: steps.length };
};
`;

    // Try v2 endpoint first, fall back to v1 (legacy)
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
            context: { url },
          }),
          signal: AbortSignal.timeout(120000), // 2 min for full quiz navigation
        });
        if (res.ok) break;
        lastErr = `${endpoint}: HTTP ${res.status}`;
        res = null;
      } catch (e: any) {
        lastErr = e.message;
        res = null;
      }
    }
    if (!res) throw new Error(`Browserless unreachable: ${lastErr}`);

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Browserless error ${res.status}: ${errText.slice(0, 500)}`);
    }

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});
