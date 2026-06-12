import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { QuizPreview } from "./QuizPreview";
import { Copy, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export function Canvas() {
  const t = useT();
  const funnel = useFunnelStore((s) => s.funnel);
  const selectedStepId = useFunnelStore((s) => s.selectedStepId);
  const selectedComponentId = useFunnelStore((s) => s.selectedComponentId);
  const selectComponent = useFunnelStore((s) => s.selectComponent);
  const deleteComponent = useFunnelStore((s) => s.deleteComponent);
  const duplicateComponent = useFunnelStore((s) => s.duplicateComponent);
  const moveComponent = useFunnelStore((s) => s.moveComponent);

  const step = funnel.steps.find((s) => s.id === selectedStepId);

  if (!step) {
    return (
      <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
        {t.selectStep}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
      <div className="mx-auto max-w-xl bg-background rounded-xl shadow-sm border overflow-hidden">
        {step.components.length === 0 ? (
          <div className="grid place-items-center h-64 text-sm text-muted-foreground">
            {t.emptyCanvas}
          </div>
        ) : (
          <div className="relative">
            <QuizPreview funnel={funnel} startStepId={step.id} embedded />
            {/* Overlay click targets per component */}
            <div className="absolute inset-0 pointer-events-none">
              {/* visual selection via separate render below */}
            </div>
          </div>
        )}
      </div>

      {/* Editor list (clickable selection / actions) */}
      <div className="mx-auto max-w-xl mt-4 space-y-1">
        {step.components.map((c, i) => {
          const active = c.id === selectedComponentId;
          return (
            <div
              key={c.id}
              onClick={() => selectComponent(c.id)}
              className={`flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-xs cursor-pointer ${
                active ? "ring-2 ring-primary" : "hover:border-primary/40"
              }`}
            >
              <span className="font-medium">{t.componentLabels[c.type]}</span>
              <div className="flex items-center gap-1">
                <IconBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i > 0) moveComponent(step.id, i, i - 1);
                  }}
                >
                  <ArrowUp className="h-3 w-3" />
                </IconBtn>
                <IconBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    if (i < step.components.length - 1) moveComponent(step.id, i, i + 1);
                  }}
                >
                  <ArrowDown className="h-3 w-3" />
                </IconBtn>
                <IconBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateComponent(step.id, c.id);
                  }}
                >
                  <Copy className="h-3 w-3" />
                </IconBtn>
                <IconBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteComponent(step.id, c.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-destructive" />
                </IconBtn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IconBtn({ children, onClick }: { children: React.ReactNode; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button onClick={onClick} className="p-1 rounded hover:bg-accent">
      {children}
    </button>
  );
}
