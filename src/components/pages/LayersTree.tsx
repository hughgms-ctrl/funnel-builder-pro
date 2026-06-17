import type { Block } from "@/lib/page-types";
import { ChevronRight, ChevronDown, Trash2, Copy, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";

interface Props {
  blocks: Block[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}

function Node({ b, depth, ...p }: { b: Block; depth: number } & Omit<Props, "blocks">) {
  const [open, setOpen] = useState(true);
  const hasChildren = !!b.children?.length;
  const sel = p.selectedId === b.id;
  return (
    <div>
      <div
        className={`group flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer ${sel ? "bg-violet-500/20 text-violet-300" : "text-zinc-300 hover:bg-zinc-800"}`}
        style={{ paddingLeft: 8 + depth * 12 }}
        onClick={() => p.onSelect(b.id)}
      >
        <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }} className="w-4 shrink-0">
          {hasChildren ? (open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />) : null}
        </button>
        <span className="flex-1 truncate font-mono">{b.tag}{b.className ? `.${b.className.split(" ")[0]}` : ""}</span>
        <div className="opacity-0 group-hover:opacity-100 flex gap-1">
          <button onClick={(e) => { e.stopPropagation(); p.onMove(b.id, -1); }}><ArrowUp className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); p.onMove(b.id, 1); }}><ArrowDown className="h-3 w-3" /></button>
          <button onClick={(e) => { e.stopPropagation(); p.onDelete(b.id); }}><Trash2 className="h-3 w-3 text-red-400" /></button>
        </div>
      </div>
      {hasChildren && open && (
        <div>{b.children!.map((c) => <Node key={c.id} b={c} depth={depth + 1} {...p} />)}</div>
      )}
    </div>
  );
}

export function LayersTree(p: Props) {
  if (!p.blocks.length) return <div className="text-xs text-zinc-500 px-2 py-3">Nenhuma camada. Adicione blocos abaixo.</div>;
  return <div className="space-y-0.5">{p.blocks.map((b) => <Node key={b.id} b={b} depth={0} {...p} />)}</div>;
}
