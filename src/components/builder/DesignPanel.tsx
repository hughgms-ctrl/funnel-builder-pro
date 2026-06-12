import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function DesignPanel() {
  const t = useT();
  const funnel = useFunnelStore((s) => s.funnel);
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="mx-auto max-w-md space-y-4">
        <h2 className="text-lg font-semibold">{t.designTitle}</h2>
        <Field label={t.funnelName}>
          <Input value={funnel.name} onChange={(e) => updateFunnel({ name: e.target.value })} />
        </Field>
        <Field label={t.logoUrl}>
          <Input
            value={funnel.logoUrl || ""}
            onChange={(e) => updateFunnel({ logoUrl: e.target.value })}
          />
        </Field>
        <Field label={t.primaryColor}>
          <div className="flex gap-2">
            <input
              type="color"
              value={funnel.primaryColor}
              onChange={(e) => updateFunnel({ primaryColor: e.target.value })}
              className="h-10 w-14 rounded border"
            />
            <Input
              value={funnel.primaryColor}
              onChange={(e) => updateFunnel({ primaryColor: e.target.value })}
            />
          </div>
        </Field>
        <Field label={t.accentColor}>
          <div className="flex gap-2">
            <input
              type="color"
              value={funnel.accentColor}
              onChange={(e) => updateFunnel({ accentColor: e.target.value })}
              className="h-10 w-14 rounded border"
            />
            <Input
              value={funnel.accentColor}
              onChange={(e) => updateFunnel({ accentColor: e.target.value })}
            />
          </div>
        </Field>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
