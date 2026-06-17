import type { Block, BlockTag } from "./page-types";
import { uid } from "./page-types";

const VOID = new Set(["img", "hr", "br", "input", "meta", "link"]);
const ALLOWED: BlockTag[] = [
  "header","main","section","footer","div","nav","ul","li",
  "h1","h2","h3","h4","p","span","a","button","img","hr"
];

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

function styleObjToCss(styles?: Record<string, string>) {
  if (!styles) return "";
  return Object.entries(styles)
    .map(([k, v]) => `  ${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}: ${v};`)
    .join("\n");
}

export function blocksToHtml(blocks: Block[]): string {
  const render = (b: Block): string => {
    const cls = [b.className, b.styles && Object.keys(b.styles).length ? `lb-${b.id}` : null]
      .filter(Boolean).join(" ");
    const attrs: string[] = [`data-lb-id="${b.id}"`];
    if (cls) attrs.push(`class="${cls}"`);
    if (b.attrs) for (const [k, v] of Object.entries(b.attrs)) attrs.push(`${k}="${escapeHtml(v)}"`);
    const open = `<${b.tag} ${attrs.join(" ")}>`;
    if (VOID.has(b.tag)) return `<${b.tag} ${attrs.join(" ")} />`;
    const inner = (b.children && b.children.length)
      ? b.children.map(render).join("")
      : (b.text ? escapeHtml(b.text) : "");
    return `${open}${inner}</${b.tag}>`;
  };
  return blocks.map(render).join("\n");
}

export function blocksToCss(blocks: Block[]): string {
  const out: string[] = [];
  const walk = (b: Block) => {
    if (b.styles && Object.keys(b.styles).length) {
      out.push(`.lb-${b.id} {\n${styleObjToCss(b.styles)}\n}`);
    }
    b.children?.forEach(walk);
  };
  blocks.forEach(walk);
  return out.join("\n\n");
}

export function htmlToBlocks(html: string): Block[] {
  if (typeof window === "undefined") return [];
  const doc = new DOMParser().parseFromString(`<div id="__root">${html}</div>`, "text/html");
  const root = doc.getElementById("__root");
  if (!root) return [];

  const styleMap = new Map<string, Record<string, string>>();

  const convert = (el: Element): Block | null => {
    const tagRaw = el.tagName.toLowerCase();
    if (tagRaw === "script" || tagRaw === "style") return null;
    const tag = (ALLOWED.includes(tagRaw as BlockTag) ? tagRaw : "div") as BlockTag;

    const block: Block = { id: uid(), tag };
    const className = el.getAttribute("class");
    if (className) block.className = className;

    const attrs: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) {
      if (a.name === "class" || a.name === "style") continue;
      attrs[a.name] = a.value;
    }
    if (Object.keys(attrs).length) block.attrs = attrs;

    // inline style -> styles
    const style = el.getAttribute("style");
    if (style) {
      const obj: Record<string, string> = {};
      style.split(";").forEach((p) => {
        const [k, ...v] = p.split(":");
        if (k && v.length) obj[k.trim()] = v.join(":").trim();
      });
      if (Object.keys(obj).length) block.styles = obj;
    }

    const children: Block[] = [];
    let textOnly = true;
    let textBuf = "";
    el.childNodes.forEach((n) => {
      if (n.nodeType === 3) { textBuf += n.textContent ?? ""; }
      else if (n.nodeType === 1) {
        textOnly = false;
        const c = convert(n as Element);
        if (c) children.push(c);
      }
    });
    if (children.length) block.children = children;
    else if (textOnly && textBuf.trim()) block.text = textBuf.trim();

    // Apply CSS rules from styleMap for matching classes
    if (block.className) {
      for (const cls of block.className.split(/\s+/)) {
        const rule = styleMap.get("." + cls);
        if (rule) block.styles = { ...rule, ...(block.styles || {}) };
      }
    }
    return block;
  };

  // Parse separate <style> tags found anywhere
  doc.querySelectorAll("style").forEach((s) => {
    const txt = s.textContent || "";
    const re = /([^{}]+)\{([^}]+)\}/g;
    let m;
    while ((m = re.exec(txt))) {
      const selector = m[1].trim();
      const body = m[2];
      const obj: Record<string, string> = {};
      body.split(";").forEach((p) => {
        const [k, ...v] = p.split(":");
        if (k && v.length) obj[k.trim()] = v.join(":").trim();
      });
      if (Object.keys(obj).length) styleMap.set(selector, obj);
    }
  });

  const blocks: Block[] = [];
  root.childNodes.forEach((n) => {
    if (n.nodeType === 1) {
      const c = convert(n as Element);
      if (c) blocks.push(c);
    }
  });
  return blocks;
}

export function buildDocument(blocks: Block[], css: string, meta?: { title?: string }) {
  const inline = blocksToCss(blocks);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>${meta?.title ?? "Page"}</title>
<style>
*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#111;background:#fff}
${css}
${inline}
</style>
</head><body>
${blocksToHtml(blocks)}
</body></html>`;
}

// Find/update/delete block in tree
export function findBlock(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) { const f = findBlock(b.children, id); if (f) return f; }
  }
  return null;
}

export function updateBlock(blocks: Block[], id: string, patch: Partial<Block>): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, ...patch };
    if (b.children) return { ...b, children: updateBlock(b.children, id, patch) };
    return b;
  });
}

export function deleteBlock(blocks: Block[], id: string): Block[] {
  return blocks.filter((b) => b.id !== id).map((b) =>
    b.children ? { ...b, children: deleteBlock(b.children, id) } : b
  );
}

export function insertBlock(blocks: Block[], parentId: string | null, block: Block): Block[] {
  if (!parentId) return [...blocks, block];
  return blocks.map((b) => {
    if (b.id === parentId) return { ...b, children: [...(b.children || []), block] };
    if (b.children) return { ...b, children: insertBlock(b.children, parentId, block) };
    return b;
  });
}

export function moveBlock(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  const arr = [...blocks];
  const i = arr.findIndex((b) => b.id === id);
  if (i >= 0) {
    const j = i + dir;
    if (j < 0 || j >= arr.length) return blocks;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    return arr;
  }
  return blocks.map((b) => b.children ? { ...b, children: moveBlock(b.children, id, dir) } : b);
}
