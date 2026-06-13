import { useState } from "react";
import { useFunnelStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Globe,
  Webhook,
  BarChart2,
  ExternalLink,
  ShoppingCart,
  Info,
} from "lucide-react";

function SectionHeader({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 rounded-lg bg-muted border">
        <Icon className="h-4 w-4 text-foreground" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Divider() {
  return <div className="border-t my-6" />;
}

export function SettingsPanel() {
  const funnel = useFunnelStore((s) => s.funnel);
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);
  const updateStep = useFunnelStore((s) => s.updateStep);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
      <div className="mx-auto max-w-2xl space-y-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Configurações do Funil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pixels, webhooks, links de venda e integrações deste funil específico.
            <span className="ml-1 text-violet-600 font-medium">
              As chaves de API ficam nas ⚙️ Configurações da Plataforma (no painel principal).
            </span>
          </p>
        </div>

        {/* ── PUBLICAÇÃO DO FUNIL ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={Globe}
            title="Link de Venda / Checkout"
            desc="Link padrão de checkout. Pode ser sobrescrito por plano ou por botão individualmente."
          />

          <Field
            label="URL de Venda (fallback global)"
            hint="Usado quando o componente Price/Button não tem um link próprio definido."
          >
            <div className="relative">
              <Input
                value={funnel.saleUrl || ""}
                onChange={(e) => updateFunnel({ saleUrl: e.target.value })}
                placeholder="https://checkout.exemplo.com/produto"
                className="pr-9"
              />
              {funnel.saleUrl && (
                <a
                  href={funnel.saleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </Field>
        </div>

        <Divider />

        {/* ── ETAPA DE VENDA ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={ShoppingCart}
            title="Etapa de Venda / Conversão"
            desc="Marque qual etapa representa uma venda concluída. Leads que chegam até ela serão contabilizados como conversões."
          />

          <div className="space-y-2">
            {funnel.steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma etapa criada ainda.</p>
            ) : (
              funnel.steps.map((step) => (
                <div key={step.id} className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
                  <div>
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.components.length} componente(s)</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {step.isSaleStep && (
                      <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        💰 VENDA
                      </span>
                    )}
                    <Switch
                      checked={!!step.isSaleStep}
                      onCheckedChange={(v) => {
                        // Only one sale step at a time — unmark others
                        if (v) {
                          funnel.steps.forEach((s) => {
                            if (s.id !== step.id && s.isSaleStep) {
                              updateStep(s.id, { isSaleStep: false });
                            }
                          });
                        }
                        updateStep(step.id, { isSaleStep: v });
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Quando um lead completa todas as etapas até a etapa marcada como Venda, ele aparece como conversão no painel de Leads &amp; Métricas.
            </span>
          </div>
        </div>

        <Divider />

        {/* ── LEADS WEBHOOK ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={Webhook}
            title="Webhooks"
            desc="Conecte seu funil ao CRM, Make, Zapier ou n8n."
          />

          <Field
            label="Webhook de Leads"
            hint="POST com JSON {id, funnelName, createdAt, answers} para cada lead capturado"
          >
            <div className="relative">
              <Input
                value={funnel.leadWebhookUrl || ""}
                onChange={(e) => updateFunnel({ leadWebhookUrl: e.target.value })}
                placeholder="https://hook.make.com/leads-webhook"
                className="pr-9 font-mono text-xs"
              />
              {funnel.leadWebhookUrl && (
                <a
                  href={funnel.leadWebhookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </Field>

          <Field
            label="Webhook de Vendas / Conversões"
            hint="POST disparado quando o lead chega na etapa marcada como Venda"
          >
            <div className="relative">
              <Input
                value={funnel.saleWebhookUrl || ""}
                onChange={(e) => updateFunnel({ saleWebhookUrl: e.target.value })}
                placeholder="https://hook.make.com/vendas-webhook"
                className="pr-9 font-mono text-xs"
              />
              {funnel.saleWebhookUrl && (
                <a
                  href={funnel.saleWebhookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </Field>

          <div className="flex items-center gap-2">
            <input
              id="supabase-leads"
              type="checkbox"
              checked={funnel.supabaseEnabled ?? false}
              onChange={(e) => updateFunnel({ supabaseEnabled: e.target.checked })}
              className="h-4 w-4 accent-violet-600"
            />
            <Label htmlFor="supabase-leads" className="text-sm cursor-pointer">
              Salvar leads no Supabase (Necessário ter conexão ativa)
            </Label>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Payload enviado ao webhook:</p>
            <pre className="font-mono text-[11px]">
              {`{
  "id": "abc123",
  "funnelName": "${funnel.name}",
  "createdAt": "2025-01-01T00:00:00Z",
  "answers": { "nome": "João", "email": "j@ex.com" },
  "converted": false
}`}
            </pre>
          </div>
        </div>

        <Divider />

        {/* ── PIXELS ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={BarChart2}
            title="Pixels de Rastreamento"
            desc="Rastreie conversões e otimize seus anúncios com pixels de retargeting."
          />

          <Field
            label="Meta Pixel ID (Facebook / Instagram)"
            hint="Apenas o número do ID, ex: 123456789012345"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#1877F2] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">f</span>
              </div>
              <Input
                value={funnel.metaPixelId || ""}
                onChange={(e) => updateFunnel({ metaPixelId: e.target.value })}
                placeholder="123456789012345"
                className="font-mono"
              />
            </div>
          </Field>

          <Field
            label="Google Tag Manager ID"
            hint="ID do container GTM, ex: GTM-XXXXXX"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#4285F4] flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">G</span>
              </div>
              <Input
                value={funnel.googleTagId || ""}
                onChange={(e) => updateFunnel({ googleTagId: e.target.value })}
                placeholder="GTM-XXXXXX"
                className="font-mono"
              />
            </div>
          </Field>

          <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
            Os pixels são injetados automaticamente quando o funil é exibido para o usuário final (modo preview e publicado).
          </div>
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
