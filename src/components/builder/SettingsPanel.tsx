import { useState } from "react";
import { useFunnelStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Key,
  Globe,
  Webhook,
  BarChart2,
  Eye,
  EyeOff,
  ExternalLink,
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

function SecretInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-9 font-mono text-xs"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function Divider() {
  return <div className="border-t my-6" />;
}

type ConnectionStatus = "idle" | "testing" | "ok" | "error";

export function SettingsPanel() {
  const apiKeys = useFunnelStore((s) => s.apiKeys);
  const funnel = useFunnelStore((s) => s.funnel);
  const setApiKeys = useFunnelStore((s) => s.setApiKeys);
  const updateFunnel = useFunnelStore((s) => s.updateFunnel);

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
      <div className="mx-auto max-w-2xl space-y-0">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-bold">Configurações</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Chaves de API, integrações, pixels e configurações de publicação do funil.
          </p>
        </div>

        {/* ── API KEYS ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={Key}
            title="Chaves de API"
            desc="Necessárias para o clonador de funis e geração de imagens com IA."
          />

          <Field
            label="OpenAI API Key"
            hint="Necessária para GPT-4o Vision + DALL·E 3 (geração de imagens)"
          >
            <SecretInput
              id="openai-key"
              value={apiKeys.openai || ""}
              onChange={(v) => setApiKeys({ openai: v })}
              placeholder="sk-..."
            />
          </Field>

          <Field
            label="Anthropic API Key"
            hint="Necessária para Claude 3.5 Sonnet (análise alternativa de funis)"
          >
            <SecretInput
              id="anthropic-key"
              value={apiKeys.anthropic || ""}
              onChange={(v) => setApiKeys({ anthropic: v })}
              placeholder="sk-ant-..."
            />
          </Field>

          <div className="flex gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
            <span>🔒</span>
            <span>As chaves são salvas localmente no seu navegador e nunca enviadas para nossos servidores.</span>
          </div>
        </div>

        <Divider />

        {/* ── PUBLICAÇÃO DO FUNIL ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={Globe}
            title="Publicação do Funil"
            desc="Configure o link de venda, redirecionamentos e destino dos leads."
          />

          <Field
            label="Link de Venda / Checkout"
            hint="Usuário é redirecionado para este link ao clicar em Comprar (componente Price/Plans)"
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

        {/* ── LEADS WEBHOOK ── */}
        <div className="rounded-xl border bg-background p-5 shadow-sm space-y-4">
          <SectionHeader
            icon={Webhook}
            title="Webhook de Leads"
            desc="Receba os leads automaticamente no seu CRM, Make, Zapier ou n8n."
          />

          <Field
            label="URL do Webhook"
            hint="POST com JSON {id, createdAt, answers} para cada lead capturado"
          >
            <div className="relative">
              <Input
                value={funnel.leadWebhookUrl || ""}
                onChange={(e) => updateFunnel({ leadWebhookUrl: e.target.value })}
                placeholder="https://hook.make.com/seu-webhook"
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
  "answers": { "nome": "João", "email": "j@ex.com" }
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
