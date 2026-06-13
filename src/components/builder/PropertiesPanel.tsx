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
          <TabsContent value="style" className="space-y-3 pt-3">
            <StyleEditor
              data={component}
              onChange={(patch) => updateComponent(step.id, component.id, patch)}
            />
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

  const renderFields = () => {
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
            <Field label="Link Externo (URL)" hint="Se preenchido, abre este link em vez de avançar de etapa">
              <Input
                placeholder="https://seusite.com/pagina"
                value={data.href || ""}
                onChange={(e) => onChange({ href: e.target.value })}
              />
            </Field>
            {data.href && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Abrir em nova aba</span>
                <Switch
                  checked={!!data.openInNewTab}
                  onCheckedChange={(v) => onChange({ openInNewTab: v })}
                />
              </div>
            )}
            {!data.href && (
              <NextSelect value={data.nextStepId} onSet={(v) => onChange({ nextStepId: v })} />
            )}
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
                  
                  {/* Score e idName da alternativa */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Pontos (Score)</Label>
                      <Input
                        type="number"
                        placeholder="Pontos"
                        value={opt.score ?? ""}
                        onChange={(e) => {
                          const arr = [...(data.options || [])];
                          arr[i] = { ...opt, score: e.target.value === "" ? undefined : Number(e.target.value) };
                          onChange({ options: arr });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Valor Variável</Label>
                      <Input
                        placeholder="Ex: masculino"
                        value={opt.idName || ""}
                        onChange={(e) => {
                          const arr = [...(data.options || [])];
                          arr[i] = { ...opt, idName: e.target.value };
                          onChange({ options: arr });
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-muted-foreground flex items-center gap-1">🖼️ Imagem da Opção</Label>
                    {opt.image && (
                      <img src={opt.image} alt={opt.label} className="w-full h-24 object-cover rounded-lg border" />
                    )}
                    <Input
                      placeholder="https://... (URL da imagem)"
                      value={opt.image || ""}
                      onChange={(e) => {
                        const arr = [...(data.options || [])];
                        arr[i] = { ...opt, image: e.target.value };
                        onChange({ options: arr });
                      }}
                    />
                  </div>
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
              <Label>Campos do Formulário</Label>
              {data.fields?.map((f, i) => (
                <div key={f.id} className="rounded-lg border p-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Label"
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
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Tipo</Label>
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
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="tel">Telefone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">ID da Variável</Label>
                      <Input
                        placeholder="Ex: nome"
                        value={f.idName || ""}
                        onChange={(e) => {
                          const arr = [...(data.fields || [])];
                          arr[i] = { ...f, idName: e.target.value };
                          onChange({ fields: arr });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const f: CaptureField = { id: uid(), type: "text", label: "Campo", idName: `campo_${uid().slice(0, 4)}` };
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
            <Field label="Link Externo (URL)" hint="Se preenchido, abre este link ao clicar em comprar">
              <Input
                placeholder="https://checkout.exemplo.com/comprar"
                value={data.href || ""}
                onChange={(e) => onChange({ href: e.target.value })}
              />
            </Field>
            {data.href && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Abrir em nova aba</span>
                <Switch
                  checked={!!data.openInNewTab}
                  onCheckedChange={(v) => onChange({ openInNewTab: v })}
                />
              </div>
            )}
            {!data.href && (
              <NextSelect value={data.nextStepId} onSet={(v) => onChange({ nextStepId: v })} />
            )}
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
      case "compare":
        return (
          <>
            <Field label="URL da Imagem 'Antes'">
              <Input value={data.beforeImageUrl || ""} onChange={(e) => onChange({ beforeImageUrl: e.target.value })} />
            </Field>
            <Field label="Legenda 'Antes'">
              <Input value={data.beforeLabel || ""} onChange={(e) => onChange({ beforeLabel: e.target.value })} />
            </Field>
            <Field label="URL da Imagem 'Depois/Objetivo'">
              <Input value={data.afterImageUrl || ""} onChange={(e) => onChange({ afterImageUrl: e.target.value })} />
            </Field>
            <Field label="Legenda 'Depois/Objetivo'">
              <Input value={data.afterLabel || ""} onChange={(e) => onChange({ afterLabel: e.target.value })} />
            </Field>
          </>
        );
      case "video":
        return (
          <Field label="URL do Vídeo (YouTube/Vimeo/Direct)">
            <Input value={data.videoUrl || ""} onChange={(e) => onChange({ videoUrl: e.target.value })} />
          </Field>
        );
      case "plans":
        return (
          <>
            <Field label={t.title}>
              <Input value={data.title || ""} onChange={(e) => onChange({ title: e.target.value })} />
            </Field>
            
            <div className="space-y-3">
              <Label>Planos Disponíveis</Label>
              {data.plans?.map((plan, i) => (
                <div key={plan.id} className="rounded-lg border p-2 space-y-2 bg-muted/20">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome do Plano"
                      value={plan.name}
                      onChange={(e) => {
                        const arr = [...(data.plans || [])];
                        arr[i] = { ...plan, name: e.target.value };
                        onChange({ plans: arr });
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onChange({ plans: data.plans?.filter((p) => p.id !== plan.id) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Preço Original</Label>
                      <Input
                        placeholder="Ex: R$ 99,90"
                        value={plan.originalPrice}
                        onChange={(e) => {
                          const arr = [...(data.plans || [])];
                          arr[i] = { ...plan, originalPrice: e.target.value };
                          onChange({ plans: arr });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Preço Promo</Label>
                      <Input
                        placeholder="Ex: R$ 49,90"
                        value={plan.promoPrice}
                        onChange={(e) => {
                          const arr = [...(data.plans || [])];
                          arr[i] = { ...plan, promoPrice: e.target.value };
                          onChange({ plans: arr });
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px]">Período</Label>
                      <Input
                        placeholder="Ex: à vista"
                        value={plan.period || ""}
                        onChange={(e) => {
                          const arr = [...(data.plans || [])];
                          arr[i] = { ...plan, period: e.target.value };
                          onChange({ plans: arr });
                        }}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px]">Próxima Etapa</Label>
                      <Select
                        value={plan.nextStepId || "__none"}
                        onValueChange={(v) => {
                          const arr = [...(data.plans || [])];
                          arr[i] = { ...plan, nextStepId: v === "__none" ? undefined : v };
                          onChange({ plans: arr });
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Ir para..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">{t.none}</SelectItem>
                          {nextStepOptions.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payment link per plan */}
                  <div className="space-y-1 border-t pt-2 mt-1">
                    <Label className="text-[10px] text-violet-600 font-semibold">💳 Link de Pagamento do Plano</Label>
                    <Input
                      placeholder="https://checkout.exemplo.com/plano-7-dias"
                      value={plan.href || ""}
                      onChange={(e) => {
                        const arr = [...(data.plans || [])];
                        arr[i] = { ...plan, href: e.target.value };
                        onChange({ plans: arr });
                      }}
                      className="font-mono text-xs"
                    />
                    {plan.href && (
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">Abrir em nova aba</span>
                        <Switch
                          checked={!!plan.openInNewTab}
                          onCheckedChange={(v) => {
                            const arr = [...(data.plans || [])];
                            arr[i] = { ...plan, openInNewTab: v };
                            onChange({ plans: arr });
                          }}
                        />
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground">
                      Sobrescreve o Link de Venda padrão do funil para este plano específico.
                    </p>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2 mt-1">
                    <span className="text-xs font-semibold">Destaque "Mais Popular"</span>
                    <Switch
                      checked={!!plan.popular}
                      onCheckedChange={(v) => {
                        const arr = [...(data.plans || [])];
                        if (v) {
                          arr.forEach((p, idx) => {
                            arr[idx] = { ...p, popular: idx === i };
                          });
                        } else {
                          arr[i] = { ...plan, popular: false };
                        }
                        onChange({ plans: arr });
                      }}
                    />
                  </div>

                  {plan.popular && (
                    <Input
                      placeholder="Texto da Tag (Ex: ★ MAIS POPULAR ★)"
                      value={plan.popularText || ""}
                      onChange={(e) => {
                        const arr = [...(data.plans || [])];
                        arr[i] = { ...plan, popularText: e.target.value };
                        onChange({ plans: arr });
                      }}
                      className="text-xs"
                    />
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  const newPlan = {
                    id: uid(),
                    name: "Novo Plano",
                    originalPrice: "R$ 99,90",
                    promoPrice: "R$ 49,90",
                    period: "à vista",
                  };
                  onChange({ plans: [...(data.plans || []), newPlan] });
                }}
              >
                + Adicionar Plano
              </Button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {renderFields()}
      
      <div className="border-t pt-3 mt-3 space-y-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">
          Lógica & Variáveis
        </Label>
        <div className="space-y-1.5">
          <Label>Regra de Exibição (Condicional)</Label>
          <Input
            placeholder="Ex: {{score}} == 10"
            value={data.displayRule || ""}
            onChange={(e) => onChange({ displayRule: e.target.value })}
          />
        </div>
        {(data.type === "options" || data.type === "plans") && (
          <div className="space-y-1.5">
            <Label>ID da Variável do Componente</Label>
            <Input
              placeholder="Ex: idade"
              value={data.idName || ""}
              onChange={(e) => onChange({ idName: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function StyleEditor({
  data,
  onChange,
}: {
  data: ComponentData;
  onChange: (patch: Partial<ComponentData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Estética Inlead</Label>
        <Select
          value={data.aesthetic || "simple"}
          onValueChange={(v) => onChange({ aesthetic: v as ComponentData["aesthetic"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="simple">Simples (Padrão)</SelectItem>
            <SelectItem value="highlight">Destacar (Leve)</SelectItem>
            <SelectItem value="emboss">Relevo (3D)</SelectItem>
            <SelectItem value="contrast">Contraste</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Bordas</Label>
        <Select
          value={data.borders || "medium"}
          onValueChange={(v) => onChange({ borders: v as ComponentData["borders"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem borda</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="large">Grande</SelectItem>
            <SelectItem value="extra">Extra grande</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Largura</Label>
        <Select
          value={String(data.width || 100)}
          onValueChange={(v) => onChange({ width: Number(v) })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">Largura Total (100%)</SelectItem>
            <SelectItem value="50">Metade da tela (50%)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {data.type === "button" && (
        <>
          <div className="space-y-1.5">
            <Label>Animação</Label>
            <Select
              value={data.animation || "none"}
              onValueChange={(v) => onChange({ animation: v as ComponentData["animation"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem animação</SelectItem>
                <SelectItem value="pulsating">Pulsante</SelectItem>
                <SelectItem value="auto-emboss">Auto relevo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-medium">Fixar no rodapé</span>
            <Switch
              checked={!!data.fixedFooter}
              onCheckedChange={(v) => onChange({ fixedFooter: v })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {hint && <p className="text-[10px] text-muted-foreground leading-snug -mt-0.5">{hint}</p>}
      {children}
    </div>
  );
}
