import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Page } from "./page-types";
import { uid } from "./page-types";

interface PageStore {
  pages: Page[];
  createPage: (init?: Partial<Page>) => string;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;
  updatePage: (id: string, patch: Partial<Page>) => void;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "pagina";
}

export function uniqueSlug(base: string, pages: Page[], excludeId?: string): string {
  let slug = slugify(base);
  let n = 1;
  while (pages.some((p) => p.slug === slug && p.id !== excludeId)) {
    n += 1;
    slug = `${slugify(base)}-${n}`;
  }
  return slug;
}

export function normalizeHtml(raw: string): string {
  if (typeof window === "undefined") return raw;
  try {
    const doc = new DOMParser().parseFromString(raw, "text/html");
    const styles = Array.from(doc.querySelectorAll("style"))
      .map((s) => s.outerHTML)
      .join("\n");
    const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'))
      .map((l) => l.outerHTML)
      .join("\n");
    const body = doc.body?.innerHTML ?? raw;
    return `${links}\n${styles}\n${body}`.trim();
  } catch {
    return raw;
  }
}

export function buildStandaloneHtml(page: Page): string {
  if (typeof window === "undefined") return page.html;
  const wrapper = document.createElement("div");
  wrapper.innerHTML = page.html;
  assignEditorIds(wrapper);
  applyOverrides(wrapper, page.content);

  wrapper.querySelectorAll("[data-eid]").forEach((el) => el.removeAttribute("data-eid"));
  wrapper.querySelectorAll(".lp-eid-text").forEach((el) => el.classList.remove("lp-eid-text"));
  wrapper.querySelectorAll(".lp-eid-img").forEach((el) => el.classList.remove("lp-eid-img"));

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(page.name)}</title>
</head>
<body>
${wrapper.innerHTML}
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export function assignEditorIds(root: HTMLElement) {
  let maxId = -1;
  root.querySelectorAll("[data-eid]").forEach((el) => {
    const eid = el.getAttribute("data-eid") || "";
    const num = parseInt(eid.slice(1), 10);
    if (!isNaN(num) && num > maxId) {
      maxId = num;
    }
  });
  let counter = maxId + 1;

  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => {
      const v = node.nodeValue || "";
      if (!v.trim()) return NodeFilter.FILTER_REJECT;
      const p = (node as Text).parentElement;
      if (!p) return NodeFilter.FILTER_REJECT;
      
      const tag = p.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return NodeFilter.FILTER_REJECT;
      if (p.hasAttribute("data-eid") || p.classList.contains("lp-eid-text")) return NodeFilter.FILTER_REJECT;
      
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n: Node | null;
  while ((n = walker.nextNode())) textNodes.push(n as Text);
  
  textNodes.forEach((tn) => {
    const span = document.createElement("span");
    span.setAttribute("data-eid", `t${counter++}`);
    span.className = "lp-eid-text";
    span.textContent = tn.nodeValue || "";
    tn.parentNode?.replaceChild(span, tn);
  });

  root.querySelectorAll("img").forEach((img) => {
    if (!img.hasAttribute("data-eid")) {
      img.setAttribute("data-eid", `i${counter++}`);
      img.classList.add("lp-eid-img");
    }
  });
}

export function applyOverrides(root: HTMLElement, content: Record<string, string>) {
  Object.entries(content).forEach(([eid, value]) => {
    const el = root.querySelector(`[data-eid="${cssEscape(eid)}"]`);
    if (!el) return;
    if (eid.startsWith("t")) {
      if (document.activeElement === el) return;
      if (el.textContent !== value) el.textContent = value;
    } else if (eid.startsWith("i")) {
      (el as HTMLImageElement).src = value;
    }
  });
}

function cssEscape(s: string) {
  return (window.CSS && (window.CSS as any).escape) ? (window.CSS as any).escape(s) : s.replace(/"/g, '\\"');
}

const emptyPage = (name = "Nova página", pages: Page[] = []): Page => ({
  id: uid(),
  name,
  slug: uniqueSlug(name, pages),
  html: `<header style="padding: 4rem 2rem; text-align: center; font-family: system-ui, sans-serif; background: #f9fafb; border-bottom: 1px solid #e5e7eb;">
  <h1 style="font-size: 2.5rem; font-weight: 700; color: #111; margin-bottom: 1rem;">${name}</h1>
  <p style="font-size: 1.1rem; color: #6b7280; max-width: 600px; margin: 0 auto;">Clique em qualquer elemento para editá-lo. Use o painel lateral para adicionar novos blocos.</p>
</header>
<main style="padding: 4rem 2rem; max-width: 900px; margin: 0 auto; font-family: system-ui, sans-serif;">
  <section style="text-align: center;">
    <p style="color: #9ca3af; font-size: 1rem;">✨ Arraste blocos do painel esquerdo para começar a construir sua página.</p>
  </section>
</main>`,
  css: "",
  content: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const usePageStore = create<PageStore>()(
  persist(
    (set, get) => ({
      pages: [],

      createPage: (init) => {
        const currentPages = get().pages;
        const p: Page = {
          ...emptyPage(init?.name || "Nova página", currentPages),
          ...init,
          id: init?.id ?? uid(),
        };
        set((s) => ({ pages: [p, ...s.pages] }));
        return p.id;
      },

      deletePage: (id) => set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),

      renamePage: (id, name) => set((s) => {
        const pages = s.pages.map((p) => {
          if (p.id === id) {
            return {
              ...p,
              name,
              slug: uniqueSlug(name, s.pages, id),
              updatedAt: Date.now(),
            };
          }
          return p;
        });
        return { pages };
      }),

      duplicatePage: (id) => set((s) => {
        const src = s.pages.find((p) => p.id === id);
        if (!src) return s;
        const copy: Page = {
          ...src,
          id: uid(),
          name: src.name + " (cópia)",
          slug: uniqueSlug(src.name + " (cópia)", s.pages),
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return { pages: [copy, ...s.pages] };
      }),

      updatePage: (id, patch) => set((s) => ({
        pages: s.pages.map((p) => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p),
      })),
    }),
    { name: "page-store" }
  )
);
