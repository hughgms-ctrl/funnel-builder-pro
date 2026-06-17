import { useEffect, useRef } from "react";
import { assignEditorIds, applyOverrides } from "@/lib/page-store";

type Props = {
  html: string;
  content: Record<string, string>;
  editable: boolean;
  onChange?: (next: Record<string, string>) => void;
};

export function HtmlPage({ html, content, editable, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  // Mount HTML and assign editor IDs (only when html changes)
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = html;
    assignEditorIds(ref.current);
    applyOverrides(ref.current, contentRef.current);
  }, [html]);

  // Re-apply overrides when content prop changes externally
  useEffect(() => {
    if (!ref.current) return;
    applyOverrides(ref.current, content);
  }, [content]);

  // Wire up edit handlers
  useEffect(() => {
    const root = ref.current;
    if (!root || !editable || !onChange) return;

    const pickImage = (cb: (dataUrl: string) => void) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = () => {
        const f = input.files?.[0];
        if (!f) return;
        if (f.size > 4 * 1024 * 1024) {
          alert("Imagem grande demais (máx 4MB). Otimize antes de enviar.");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => cb(String(reader.result));
        reader.readAsDataURL(f);
      };
      input.click();
    };

    const swallowLinks = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (a) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      const img = t.closest('img[data-eid^="i"]') as HTMLImageElement | null;
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        pickImage((url) => {
          onChange({ ...contentRef.current, [img.dataset.eid!]: url });
        });
        return;
      }
      const txt = t.closest('[data-eid^="t"]') as HTMLElement | null;
      if (txt) {
        txt.contentEditable = "true";
        txt.focus();
        // select all for quick replace
        const range = document.createRange();
        range.selectNodeContents(txt);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    };

    const onBlur = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t.matches && t.matches('[data-eid^="t"]')) {
        t.contentEditable = "false";
        const eid = t.dataset.eid!;
        const value = (t.textContent || "").replace(/\u00a0/g, " ");
        if (value !== contentRef.current[eid]) {
          onChange({ ...contentRef.current, [eid]: value });
        }
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.matches && t.matches('[data-eid^="t"]')) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          (t as HTMLElement).blur();
        }
        if (e.key === "Escape") (t as HTMLElement).blur();
      }
    };

    root.addEventListener("click", swallowLinks, true);
    root.addEventListener("click", onClick);
    root.addEventListener("blur", onBlur, true);
    root.addEventListener("keydown", onKey);
    return () => {
      root.removeEventListener("click", swallowLinks, true);
      root.removeEventListener("click", onClick);
      root.removeEventListener("blur", onBlur, true);
      root.removeEventListener("keydown", onKey);
    };
  }, [editable, onChange]);

  return (
    <>
      <style>{`
        .lp-host .lp-eid-text { outline: none; border-radius: 3px; }
        .lp-host.editing .lp-eid-text { cursor: text; transition: box-shadow .12s, background .12s; }
        .lp-host.editing .lp-eid-text:hover { box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.4); background: rgba(139, 92, 246, 0.08); }
        .lp-host.editing .lp-eid-text:focus { box-shadow: 0 0 0 2px #8b5cf6; background: #fff; color: #111; }
        .lp-host.editing .lp-eid-img { cursor: pointer; outline: 2px dashed transparent; transition: outline .12s, filter .12s; }
        .lp-host.editing .lp-eid-img:hover { outline-color: #8b5cf6; filter: brightness(.92); }
      `}</style>
      <div ref={ref} className={"lp-host " + (editable ? "editing" : "")} />
    </>
  );
}
