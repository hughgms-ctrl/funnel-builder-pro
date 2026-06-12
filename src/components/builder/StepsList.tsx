import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { GripVertical, MoreVertical, Plus } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export function StepsList() {
  const t = useT();
  const funnel = useFunnelStore((s) => s.funnel);
  const selectedStepId = useFunnelStore((s) => s.selectedStepId);
  const selectStep = useFunnelStore((s) => s.selectStep);
  const addStep = useFunnelStore((s) => s.addStep);
  const duplicateStep = useFunnelStore((s) => s.duplicateStep);
  const deleteStep = useFunnelStore((s) => s.deleteStep);
  const renameStep = useFunnelStore((s) => s.renameStep);
  const reorderSteps = useFunnelStore((s) => s.reorderSteps);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.steps}
        </span>
      </div>
      <div className="overflow-y-auto flex-1">
        {funnel.steps.map((step, idx) => {
          const active = step.id === selectedStepId;
          return (
            <div
              key={step.id}
              draggable
              onDragStart={() => setDragIdx(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIdx !== null && dragIdx !== idx) reorderSteps(dragIdx, idx);
                setDragIdx(null);
              }}
              onClick={() => selectStep(step.id)}
              className={`group flex items-center gap-1 px-2 py-2 cursor-pointer border-b border-border/40 ${
                active ? "bg-accent" : "hover:bg-accent/50"
              }`}
              style={
                active
                  ? { borderLeft: "3px solid var(--color-primary)" }
                  : { borderLeft: "3px solid transparent" }
              }
            >
              <GripVertical className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              {editingId === step.id ? (
                <Input
                  autoFocus
                  className="h-7 text-sm"
                  defaultValue={step.title}
                  onBlur={(e) => {
                    renameStep(step.id, e.target.value || step.title);
                    setEditingId(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                />
              ) : (
                <span className="text-sm truncate flex-1">{step.title}</span>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-background">
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingId(step.id)}>
                    {t.rename}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => duplicateStep(step.id)}>
                    {t.duplicate}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => {
                      if (confirm(t.confirmDelete)) deleteStep(step.id);
                    }}
                  >
                    {t.delete}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        })}
      </div>
      <div className="border-t p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={addStep}>
          <Plus className="h-3.5 w-3.5 mr-1" /> {t.addStep}
        </Button>
      </div>
    </div>
  );
}
