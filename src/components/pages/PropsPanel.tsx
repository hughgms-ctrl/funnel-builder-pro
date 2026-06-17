import type { Block } from "@/lib/page-types";
import { useState } from "react";

interface Props {
  block: Block | null;
  onChange: (patch: Partial<Block>) => void;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">{label}</label>
      {children}
    </div>
  );
}

const input = "w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-violet-500";

export function PropsPanel({ block, onChange }: Props) {
  const [tab, setTab] = useState<"content" | "style" | "adv">("content");

  if (!block) {
    return <div className="text-xs text-zinc-500 p-4">Selecione um bloco no canvas ou na árvore.</div>;
  }

  const styles = block.styles || {};
  const setStyle = (k: string, v: string) => {
    const ns = { ...styles };
    if (v) ns[k] = v; else delete ns[k];
    onChange({ styles: ns });
  };
  const attrs = block.attrs || {};
  const setAttr = (k: string, v: string) => {
    const na = { ...attrs };
    if (v) na[k] = v; else delete na[k];
    onChange({ attrs: na });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-zinc-800">
        {(["content", "style", "adv"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 px-3 py-2 text-xs font-medium ${tab === t ? "text-violet-400 border-b-2 border-violet-500" : "text-zinc-500"}`}
          >
            {t === "content" ? "Conteúdo" : t === "style" ? "Estilo" : "Avançado"}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {tab === "content" && (
          <>
            <Field label="Tag"><div className="text-xs text-zinc-400 font-mono">{block.tag}</div></Field>
            {!block.children?.length && (
              <Field label="Texto">
                <textarea className={input} rows={3} value={block.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
              </Field>
            )}
            {(block.tag === "a" || block.tag === "button") && (
              <Field label="Link (href)">
                <input className={input} value={attrs.href || ""} onChange={(e) => setAttr("href", e.target.value)} placeholder="https://..." />
              </Field>
            )}
            {block.tag === "img" && (
              <>
                <Field label="URL da imagem">
                  <input className={input} value={attrs.src || ""} onChange={(e) => setAttr("src", e.target.value)} />
                </Field>
                <Field label="Alt">
                  <input className={input} value={attrs.alt || ""} onChange={(e) => setAttr("alt", e.target.value)} />
                </Field>
              </>
            )}
          </>
        )}

        {tab === "style" && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Cor texto"><input type="color" className="h-8 w-full bg-zinc-800 border border-zinc-700 rounded" value={styles.color || "#000000"} onChange={(e) => setStyle("color", e.target.value)} /></Field>
              <Field label="Fundo"><input type="color" className="h-8 w-full bg-zinc-800 border border-zinc-700 rounded" value={styles.background || "#ffffff"} onChange={(e) => setStyle("background", e.target.value)} /></Field>
            </div>
            <Field label="Font size"><input className={input} value={styles["font-size"] || styles.fontSize || ""} onChange={(e) => setStyle("font-size", e.target.value)} placeholder="16px" /></Field>
            <Field label="Font weight">
              <select className={input} value={styles["font-weight"] || styles.fontWeight || ""} onChange={(e) => setStyle("font-weight", e.target.value)}>
                <option value="">-</option>
                <option value="400">400</option><option value="500">500</option><option value="600">600</option><option value="700">700</option><option value="800">800</option>
              </select>
            </Field>
            <Field label="Text align">
              <select className={input} value={styles["text-align"] || ""} onChange={(e) => setStyle("text-align", e.target.value)}>
                <option value="">-</option><option>left</option><option>center</option><option>right</option>
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Padding"><input className={input} value={styles.padding || ""} onChange={(e) => setStyle("padding", e.target.value)} placeholder="16px" /></Field>
              <Field label="Margin"><input className={input} value={styles.margin || ""} onChange={(e) => setStyle("margin", e.target.value)} placeholder="0" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Width"><input className={input} value={styles.width || ""} onChange={(e) => setStyle("width", e.target.value)} placeholder="auto" /></Field>
              <Field label="Height"><input className={input} value={styles.height || ""} onChange={(e) => setStyle("height", e.target.value)} placeholder="auto" /></Field>
            </div>
            <Field label="Border radius"><input className={input} value={styles["border-radius"] || ""} onChange={(e) => setStyle("border-radius", e.target.value)} placeholder="8px" /></Field>
            <Field label="Display">
              <select className={input} value={styles.display || ""} onChange={(e) => setStyle("display", e.target.value)}>
                <option value="">-</option><option>block</option><option>flex</option><option>grid</option><option>inline-block</option><option>none</option>
              </select>
            </Field>
            {(styles.display === "flex" || styles.display === "grid") && (
              <>
                <Field label="Gap"><input className={input} value={styles.gap || ""} onChange={(e) => setStyle("gap", e.target.value)} placeholder="16px" /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Justify"><select className={input} value={styles["justify-content"] || ""} onChange={(e) => setStyle("justify-content", e.target.value)}><option value="">-</option><option>flex-start</option><option>center</option><option>space-between</option><option>flex-end</option></select></Field>
                  <Field label="Align"><select className={input} value={styles["align-items"] || ""} onChange={(e) => setStyle("align-items", e.target.value)}><option value="">-</option><option>flex-start</option><option>center</option><option>stretch</option><option>flex-end</option></select></Field>
                </div>
              </>
            )}
          </>
        )}

        {tab === "adv" && (
          <>
            <Field label="Class name"><input className={input} value={block.className || ""} onChange={(e) => onChange({ className: e.target.value })} /></Field>
            <Field label="CSS livre (key: value; ...)">
              <textarea
                className={input}
                rows={6}
                value={Object.entries(styles).map(([k, v]) => `${k}: ${v}`).join(";\n")}
                onChange={(e) => {
                  const obj: Record<string, string> = {};
                  e.target.value.split(";").forEach((p) => {
                    const [k, ...v] = p.split(":");
                    if (k && v.length) obj[k.trim()] = v.join(":").trim();
                  });
                  onChange({ styles: obj });
                }}
              />
            </Field>
          </>
        )}
      </div>
    </div>
  );
}
