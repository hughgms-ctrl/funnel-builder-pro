import type { Block, BlockTag } from "@/lib/page-types";
import { uid } from "@/lib/page-types";
import { Plus } from "lucide-react";

interface Preset {
  label: string;
  build: () => Block;
}

const presets: Preset[] = [
  { label: "Seção", build: () => ({ id: uid(), tag: "section", className: "section", styles: { padding: "64px 24px" } }) },
  { label: "Container", build: () => ({ id: uid(), tag: "div", styles: { maxWidth: "1100px", margin: "0 auto" } }) },
  { label: "Título H1", build: () => ({ id: uid(), tag: "h1", text: "Título principal", styles: { fontSize: "48px", fontWeight: "700", margin: "0 0 16px" } }) },
  { label: "Título H2", build: () => ({ id: uid(), tag: "h2", text: "Subtítulo", styles: { fontSize: "32px", fontWeight: "600", margin: "0 0 12px" } }) },
  { label: "Parágrafo", build: () => ({ id: uid(), tag: "p", text: "Texto do parágrafo aqui.", styles: { fontSize: "16px", lineHeight: "1.6", margin: "0 0 16px" } }) },
  { label: "Botão", build: () => ({ id: uid(), tag: "a", text: "Clique aqui", attrs: { href: "#" }, styles: { display: "inline-block", padding: "12px 24px", background: "#8b5cf6", color: "#fff", borderRadius: "8px", textDecoration: "none", fontWeight: "600" } }) },
  { label: "Link", build: () => ({ id: uid(), tag: "a", text: "Saiba mais", attrs: { href: "#" }, styles: { color: "#8b5cf6" } }) },
  { label: "Imagem", build: () => ({ id: uid(), tag: "img", attrs: { src: "https://placehold.co/600x400", alt: "" }, styles: { maxWidth: "100%", display: "block" } }) },
  { label: "Cabeçalho", build: () => ({ id: uid(), tag: "header", styles: { padding: "16px 24px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }, children: [
    { id: uid(), tag: "span", text: "Logo", styles: { fontWeight: "700", fontSize: "20px" } },
    { id: uid(), tag: "nav", children: [
      { id: uid(), tag: "a", text: "Home", attrs: { href: "#" }, styles: { margin: "0 12px", color: "#111", textDecoration: "none" } },
      { id: uid(), tag: "a", text: "Sobre", attrs: { href: "#" }, styles: { margin: "0 12px", color: "#111", textDecoration: "none" } },
      { id: uid(), tag: "a", text: "Contato", attrs: { href: "#" }, styles: { margin: "0 12px", color: "#111", textDecoration: "none" } },
    ] },
  ] }) },
  { label: "Rodapé", build: () => ({ id: uid(), tag: "footer", styles: { padding: "32px 24px", textAlign: "center", background: "#111", color: "#aaa" }, children: [
    { id: uid(), tag: "p", text: "© 2026 Sua marca", styles: { margin: "0" } },
  ] }) },
  { label: "Divisor", build: () => ({ id: uid(), tag: "hr", styles: { border: "none", borderTop: "1px solid #eee", margin: "24px 0" } }) },
];

export function BlockPalette({ onAdd }: { onAdd: (b: Block) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {presets.map((p) => (
        <button
          key={p.label}
          onClick={() => onAdd(p.build())}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs"
        >
          <Plus className="h-3.5 w-3.5 text-violet-400" />
          {p.label}
        </button>
      ))}
    </div>
  );
}
