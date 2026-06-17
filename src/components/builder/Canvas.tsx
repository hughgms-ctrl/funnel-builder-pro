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

  const selectedIndex = step.components.findIndex((c) => c.id === selectedComponentId);

  const handleComponentClick = (componentId: string) => {
    selectComponent(componentId);
  };

  const handleCanvasClick = () => {
    // Clicking the canvas background deselects
    selectComponent(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-muted/30 p-6" onClick={handleCanvasClick}>
      {/* Floating action toolbar for selected component */}
      {selectedComponentId && selectedIndex >= 0 && (
        <div className="mx-auto max-w-xl mb-2 flex items-center justify-between bg-background border rounded-lg shadow-md px-3 py-1.5 text-xs gap-2 sticky top-2 z-30">
          <span className="font-semibold text-primary">
            {t.componentLabels[step.components[selectedIndex].type]}
          </span>
          <div className="flex items-center gap-1">
            <ActionBtn
              title="Mover para cima"
              disabled={selectedIndex === 0}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedIndex > 0) moveComponent(step.id, selectedIndex, selectedIndex - 1);
              }}
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </ActionBtn>
            <ActionBtn
              title="Mover para baixo"
              disabled={selectedIndex >= step.components.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                if (selectedIndex < step.components.length - 1)
                  moveComponent(step.id, selectedIndex, selectedIndex + 1);
              }}
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </ActionBtn>
            <ActionBtn
              title="Duplicar"
              onClick={(e) => {
                e.stopPropagation();
                duplicateComponent(step.id, selectedComponentId);
              }}
            >
              <Copy className="h-3.5 w-3.5" />
            </ActionBtn>
            <ActionBtn
              title="Deletar"
              onClick={(e) => {
                e.stopPropagation();
                deleteComponent(step.id, selectedComponentId);
              }}
              danger
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ActionBtn>
          </div>
        </div>
      )}

      {/* Interactive canvas — the preview IS the editor */}
      <div
        className="mx-auto max-w-xl bg-background rounded-xl shadow-sm border overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {step.components.length === 0 ? (
          <div className="grid place-items-center h-64 text-sm text-muted-foreground">
            {t.emptyCanvas}
          </div>
        ) : (
          <QuizPreview
            funnel={funnel}
            startStepId={step.id}
            embedded
            onComponentClick={handleComponentClick}
            selectedComponentId={selectedComponentId}
          />
        )}
      </div>

      {/* Hint when nothing selected */}
      {!selectedComponentId && step.components.length > 0 && (
        <p className="mx-auto max-w-xl mt-4 text-center text-xs text-muted-foreground/60 select-none">
          Clique em qualquer elemento para selecioná-lo e editar
        </p>
      )}
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`p-1.5 rounded hover:bg-accent disabled:opacity-30 transition-colors ${
        danger ? "hover:text-destructive hover:bg-destructive/10" : ""
      }`}
    >
      {children}
    </button>
  );
}
