import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export function FlowPanel() {
  const t = useT();
  const funnel = useFunnelStore((s) => s.funnel);
  const selectStep = useFunnelStore((s) => s.selectStep);

  // Compute outgoing branches from each step (from options/button/capture/price nextStepId)
  const outgoing = (stepId: string) => {
    const s = funnel.steps.find((x) => x.id === stepId);
    if (!s) return [];
    const targets: { label: string; to: string }[] = [];
    s.components.forEach((c) => {
      if (c.type === "options") {
        c.options?.forEach((o) => {
          if (o.nextStepId) targets.push({ label: o.label, to: o.nextStepId });
        });
      } else if (c.nextStepId) {
        targets.push({ label: c.buttonText || c.type, to: c.nextStepId });
      }
    });
    return targets;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl space-y-3">
        <div>
          <h2 className="text-lg font-semibold">{t.flowTitle}</h2>
          <p className="text-sm text-muted-foreground">{t.flowHint}</p>
        </div>
        <div className="space-y-2">
          {funnel.steps.map((s, idx) => {
            const branches = outgoing(s.id);
            const nextDefault = funnel.steps[idx + 1];
            return (
              <div key={s.id} className="rounded-lg border bg-background p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">#{idx + 1}</div>
                    <div className="font-semibold">{s.title}</div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => selectStep(s.id)}>
                    Editar
                  </Button>
                </div>
                <div className="mt-2 space-y-1 text-sm">
                  {branches.length === 0 && nextDefault && (
                    <div className="text-muted-foreground">
                      → {nextDefault.title} <span className="text-xs">(padrão)</span>
                    </div>
                  )}
                  {branches.map((b, i) => {
                    const target = funnel.steps.find((x) => x.id === b.to);
                    return (
                      <div key={i}>
                        <span className="font-medium">{b.label}</span> →{" "}
                        <span className="text-muted-foreground">{target?.title || "?"}</span>
                      </div>
                    );
                  })}
                  {branches.length === 0 && !nextDefault && (
                    <div className="text-muted-foreground">— Fim do funil</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
