import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ComponentData, OptionItem, CaptureField } from "@/lib/types";
import { Trash2 } from "lucide-react";

const uid = () => Math.random().toString(36).slice(2, 10);

export function PropertiesPanel() {
  const t = useT();
  const funnel = useFunnelStore((s) => s.funnel);
  const selectedStepId = useFunnelStore((s) => s.selectedStepId);
  const selectedComponentId = useFunnelStore((s) => s.selectedComponentId);
  const updateStep = useFunnelStore((s) => s.updateStep);
  const updateComponent = useFunnelStore((s) => s.updateComponent);

  const step = funnel.steps.find((s) => s.id === selectedStepId);
  const component = step?.components.find((c) => c.id === selectedComponentId);

  if (!step) {
    return (
      <div className="p-4 text-sm text-muted-foreground">{t.selectStep}</div>
    );
  }

  if (component) {
    return (
      <div className="p-4 space-y-4">
        <Tabs defaultValue="component">
          <TabsList className="w-full">
            <TabsTrigger value="component" className="flex-1">
              {t.component}
            </TabsTrigger>
            <TabsTrigger value="style" className="flex-1">
              {t.style}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="component" className="space-y-3 pt-3">
            <ComponentEditor
              data={component}
              onChange={(patch) => updateComponent(step.id, component.id, patch)}
            />
          </TabsContent>
          <TabsContent value="style" className="pt-3 text-xs text-muted-foreground">
            {t.advanced}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1.5">
        <Label>{t.stepTitle}</Label>
        <Input
          value={step.title}
          onChange={(e) => updateStep(step.id, { title: e.target.value })}
        />
      </div>
      <div className="space-y-3 pt-2 border-t">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          {t.header}
        </Label>
        <ToggleRow
          label={t.showLogo}
          checked={step.showLogo}
          onChange={(v) => updateStep(step.id, { showLogo: v })}
        />
        <ToggleRow
          label={t.showProgress}
          checked={step.showProgress}
          onChange={(v) => updateStep(step.id, { showProgress: v })}
        />
        <ToggleRow
          label={t.showBack}
          checked={step.showBack}
          onChange={(v) => updateStep(step.id, { showBack: v })}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ComponentEditor({
  data,
  onChange,
}: {
  data: ComponentData;
  onChange: (patch: Partial<ComponentData>) => void;
}) {
  const t = useT();
  const funnel = useFunnelStore((s) => s.funnel);
  const selectedStepId = useFunnelStore((s) => s.selectedStepId);
  const nextStepOptions = funnel.steps.filter((s) => s.id !== selectedStepId);

  const NextSelect = ({ value, onSet }: { value?: string; onSet: (v?: string) => void }) => (
    <div className="space-y-1.5">
      <Label>{t.nextStep}</Label>
      <Select
        value={value || "__none"}
        onValueChange={(v) => onSet(v === "__none" ? undefined : v)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">{t.none}</SelectItem>
          {nextStepOptions.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  switch (data.type) {
    case "text":
      return (
        <Field label={t.label}>
          <Textarea value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
      );
    case "alert":
      return (
        <>
          <Field label={t.label}>
            <Textarea value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
          <Field label="Variant">
            <Select value={data.variant || "info"} onValueChange={(v) => onChange({ variant: v as ComponentData["variant"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="info">info</SelectItem>
                <SelectItem value="success">success</SelectItem>
                <SelectItem value="warning">warning</SelectItem>
                <SelectItem value="danger">danger</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </>
      );
    case "image":
      return (
        <>
          <Field label={t.imageUrl}>
            <Input value={data.imageUrl || ""} onChange={(e) => onChange({ imageUrl: e.target.value })} />
          </Field>
          <Field label="Alt">
            <Input value={data.alt || ""} onChange={(e) => onChange({ alt: e.target.value })} />
          </Field>
        </>
      );
    case "button":
      return (
        <>
          <Field label={t.buttonText}>
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ buttonText: e.target.value })} />
          </Field>
          <NextSelect value={data.nextStepId} onSet={(v) => onChange({ nextStepId: v })} />
        </>
      );
    case "options":
      return (
        <>
          <Field label={t.title}>
            <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label={t.subtitle}>
            <Input value={data.subtitle || ""} onChange={(e) => onChange({ subtitle: e.target.value })} />
          </Field>
          <Field label={t.columns}>
            <Input
              type="number"
              min={1}
              max={4}
              value={data.columns || 2}
              onChange={(e) => onChange({ columns: Number(e.target.value) })}
            />
          </Field>
          <div className="space-y-2">
            <Label>{t.componentLabels.options}</Label>
            {data.options?.map((opt, i) => (
              <div key={opt.id} className="rounded-lg border p-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder={t.label}
                    value={opt.label}
                    onChange={(e) => {
                      const arr = [...(data.options || [])];
                      arr[i] = { ...opt, label: e.target.value };
                      onChange({ options: arr });
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onChange({ options: data.options?.filter((o) => o.id !== opt.id) })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder={t.imageUrl}
                  value={opt.image || ""}
                  onChange={(e) => {
                    const arr = [...(data.options || [])];
                    arr[i] = { ...opt, image: e.target.value };
                    onChange({ options: arr });
                  }}
                />
                <Select
                  value={opt.nextStepId || "__none"}
                  onValueChange={(v) => {
                    const arr = [...(data.options || [])];
                    arr[i] = { ...opt, nextStepId: v === "__none" ? undefined : v };
                    onChange({ options: arr });
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={t.nextStep} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t.none}</SelectItem>
                    {nextStepOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const newOpt: OptionItem = { id: uid(), label: "Nova opção" };
                onChange({ options: [...(data.options || []), newOpt] });
              }}
            >
              {t.addOption}
            </Button>
          </div>
        </>
      );
    case "capture":
      return (
        <>
          <Field label={t.title}>
            <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label={t.buttonText}>
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ buttonText: e.target.value })} />
          </Field>
          <NextSelect value={data.nextStepId} onSet={(v) => onChange({ nextStepId: v })} />
          <div className="space-y-2">
            <Label>Fields</Label>
            {data.fields?.map((f, i) => (
              <div key={f.id} className="rounded-lg border p-2 space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={f.label}
                    onChange={(e) => {
                      const arr = [...(data.fields || [])];
                      arr[i] = { ...f, label: e.target.value };
                      onChange({ fields: arr });
                    }}
                  />
                  <Button size="icon" variant="ghost" onClick={() => onChange({ fields: data.fields?.filter((x) => x.id !== f.id) })}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Select
                  value={f.type}
                  onValueChange={(v) => {
                    const arr = [...(data.fields || [])];
                    arr[i] = { ...f, type: v as CaptureField["type"] };
                    onChange({ fields: arr });
                  }}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">text</SelectItem>
                    <SelectItem value="email">email</SelectItem>
                    <SelectItem value="tel">tel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                const f: CaptureField = { id: uid(), type: "text", label: "Campo" };
                onChange({ fields: [...(data.fields || []), f] });
              }}
            >
              {t.addField}
            </Button>
          </div>
        </>
      );
    case "price":
      return (
        <>
          <Field label={t.title}>
            <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label={t.price}>
            <Input value={data.price || ""} onChange={(e) => onChange({ price: e.target.value })} />
          </Field>
          <Field label={t.period}>
            <Input value={data.pricePeriod || ""} onChange={(e) => onChange({ pricePeriod: e.target.value })} />
          </Field>
          <Field label={t.features}>
            <Textarea
              rows={4}
              value={(data.priceFeatures || []).join("\n")}
              onChange={(e) => onChange({ priceFeatures: e.target.value.split("\n") })}
            />
          </Field>
          <Field label={t.buttonText}>
            <Input value={data.buttonText || ""} onChange={(e) => onChange({ buttonText: e.target.value })} />
          </Field>
          <NextSelect value={data.nextStepId} onSet={(v) => onChange({ nextStepId: v })} />
        </>
      );
    case "arguments":
      return (
        <>
          <Field label={t.title}>
            <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label={t.features}>
            <Textarea
              rows={4}
              value={(data.priceFeatures || []).join("\n")}
              onChange={(e) => onChange({ priceFeatures: e.target.value.split("\n") })}
            />
          </Field>
        </>
      );
    case "level":
      return (
        <>
          <Field label={t.label}>
            <Input value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
          <Field label={t.progress}>
            <Input
              type="number"
              min={0}
              max={100}
              value={data.level || 0}
              onChange={(e) => onChange({ level: Number(e.target.value) })}
            />
          </Field>
        </>
      );
    case "space":
      return (
        <Field label={t.height}>
          <Input
            type="number"
            value={data.height || 24}
            onChange={(e) => onChange({ height: Number(e.target.value) })}
          />
        </Field>
      );
    case "timer":
      return (
        <>
          <Field label={t.label}>
            <Input value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
          </Field>
          <Field label={t.seconds}>
            <Input
              type="number"
              value={data.seconds || 60}
              onChange={(e) => onChange({ seconds: Number(e.target.value) })}
            />
          </Field>
        </>
      );
    case "loading":
      return (
        <Field label={t.label}>
          <Input value={data.text || ""} onChange={(e) => onChange({ text: e.target.value })} />
        </Field>
      );
    case "testimonials":
      return (
        <>
          <Field label={t.title}>
            <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <div className="space-y-2">
            {data.testimonials?.map((tt, i) => (
              <div key={tt.id} className="rounded-lg border p-2 space-y-2">
                <Input
                  placeholder="Autor"
                  value={tt.author}
                  onChange={(e) => {
                    const arr = [...(data.testimonials || [])];
                    arr[i] = { ...tt, author: e.target.value };
                    onChange({ testimonials: arr });
                  }}
                />
                <Textarea
                  placeholder="Texto"
                  value={tt.text}
                  onChange={(e) => {
                    const arr = [...(data.testimonials || [])];
                    arr[i] = { ...tt, text: e.target.value };
                    onChange({ testimonials: arr });
                  }}
                />
                <Button size="sm" variant="ghost" onClick={() => onChange({ testimonials: data.testimonials?.filter((x) => x.id !== tt.id) })}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                onChange({
                  testimonials: [
                    ...(data.testimonials || []),
                    { id: uid(), author: "Nome", text: "Depoimento..." },
                  ],
                })
              }
            >
              {t.addTestimonial}
            </Button>
          </div>
        </>
      );
    case "charts":
    case "cartesian":
      return (
        <>
          <Field label={t.title}>
            <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
          </Field>
          <Field label="Dados (label:valor por linha)">
            <Textarea
              rows={5}
              value={(data.chartData || []).map((d) => `${d.label}:${d.value}`).join("\n")}
              onChange={(e) =>
                onChange({
                  chartData: e.target.value
                    .split("\n")
                    .map((line) => {
                      const [label, value] = line.split(":");
                      return { label: label?.trim() || "", value: Number(value) || 0 };
                    })
                    .filter((d) => d.label),
                })
              }
            />
          </Field>
        </>
      );
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
