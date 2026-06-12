import type { ComponentData, Funnel, Step } from "@/lib/types";
import { useFunnelStore } from "@/lib/store";
import { useT } from "@/lib/i18n";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  funnel: Funnel;
  startStepId?: string;
  onExit?: () => void;
  embedded?: boolean;
}

export function QuizPreview({ funnel, startStepId, onExit, embedded }: Props) {
  const t = useT();
  const addLead = useFunnelStore((s) => s.addLead);
  const [stepId, setStepId] = useState<string>(startStepId || funnel.steps[0]?.id);
  const [history, setHistory] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    setStepId(startStepId || funnel.steps[0]?.id);
    setHistory([]);
    setAnswers({});
    setDone(false);
  }, [funnel.id, startStepId]);

  const step = funnel.steps.find((s) => s.id === stepId);
  const stepIndex = funnel.steps.findIndex((s) => s.id === stepId);
  const progress = funnel.steps.length
    ? Math.round(((stepIndex + 1) / funnel.steps.length) * 100)
    : 0;

  const goNext = (nextStepId?: string) => {
    setHistory((h) => [...h, stepId]);
    if (nextStepId) {
      setStepId(nextStepId);
      return;
    }
    const idx = funnel.steps.findIndex((s) => s.id === stepId);
    if (idx >= 0 && idx < funnel.steps.length - 1) {
      setStepId(funnel.steps[idx + 1].id);
    } else {
      addLead({ id: Math.random().toString(36).slice(2), createdAt: Date.now(), answers });
      setDone(true);
    }
  };

  const goBack = () => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setStepId(prev);
      return h.slice(0, -1);
    });
  };

  if (done) {
    return (
      <div
        className={`${embedded ? "" : "min-h-screen"} flex items-center justify-center p-8`}
        style={{ background: "var(--background)" }}
      >
        <div className="max-w-md text-center space-y-4">
          <div
            className="mx-auto h-16 w-16 rounded-full grid place-items-center text-2xl"
            style={{ background: funnel.primaryColor, color: "white" }}
          >
            ✓
          </div>
          <h2 className="text-2xl font-bold">{t.completed}</h2>
          <p className="text-muted-foreground">{t.completedMsg}</p>
          {onExit && <Button onClick={onExit}>{t.exitPreview}</Button>}
        </div>
      </div>
    );
  }

  if (!step) return null;

  return (
    <div
      className={`${embedded ? "" : "min-h-screen"} flex flex-col`}
      style={{ background: "var(--background)" }}
    >
      {/* Header */}
      <div className="border-b">
        <div className="mx-auto max-w-xl px-4 py-3">
          <div className="flex items-center justify-between text-sm">
            {step.showBack ? (
              <button
                onClick={goBack}
                disabled={history.length === 0}
                className="text-muted-foreground hover:text-foreground disabled:opacity-30"
              >
                ← {t.back}
              </button>
            ) : (
              <span />
            )}
            {onExit && (
              <button onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground">
                {t.exitPreview}
              </button>
            )}
          </div>
          {step.showLogo && (
            <div className="flex justify-center pt-3">
              {funnel.logoUrl ? (
                <img src={funnel.logoUrl} alt="logo" className="h-10" />
              ) : (
                <div
                  className="text-lg font-bold tracking-wide"
                  style={{ color: funnel.primaryColor }}
                >
                  {funnel.name}
                </div>
              )}
            </div>
          )}
          {step.showProgress && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full transition-all"
                style={{ width: `${progress}%`, background: funnel.primaryColor }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 mx-auto w-full max-w-xl px-4 py-6 space-y-5">
        {step.components.map((c) => (
          <RenderComponent
            key={c.id}
            data={c}
            funnel={funnel}
            step={step}
            onAnswer={(value, nextStepId) => {
              setAnswers((a) => ({ ...a, [c.id]: value }));
              goNext(nextStepId);
            }}
            onSubmitCapture={(values, nextStepId) => {
              setAnswers((a) => ({ ...a, ...values }));
              goNext(nextStepId);
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface RenderProps {
  data: ComponentData;
  funnel: Funnel;
  step: Step;
  onAnswer: (value: unknown, nextStepId?: string) => void;
  onSubmitCapture: (values: Record<string, unknown>, nextStepId?: string) => void;
}

function RenderComponent({ data, funnel, onAnswer, onSubmitCapture }: RenderProps) {
  const t = useT();
  const primary = funnel.primaryColor;

  switch (data.type) {
    case "text":
      return <h2 className="text-2xl font-bold text-center">{data.text}</h2>;
    case "alert": {
      const bg = {
        info: "#dbeafe",
        success: "#dcfce7",
        warning: "#fef3c7",
        danger: "#fee2e2",
      }[data.variant || "info"];
      return (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ background: bg }}>
          {data.text}
        </div>
      );
    }
    case "arguments":
      return (
        <div className="space-y-2">
          {data.title && <h3 className="font-semibold">{data.title}</h3>}
          <ul className="space-y-1.5">
            {data.priceFeatures?.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span style={{ color: primary }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    case "level":
      return (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">{data.text || t.progress}</div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full"
              style={{ width: `${data.level || 0}%`, background: primary }}
            />
          </div>
        </div>
      );
    case "testimonials":
      return (
        <div className="space-y-3">
          {data.title && <h3 className="font-semibold text-center">{data.title}</h3>}
          {data.testimonials?.map((tt) => (
            <div key={tt.id} className="rounded-lg border p-3">
              <p className="text-sm italic">"{tt.text}"</p>
              <p className="mt-1 text-xs text-muted-foreground">— {tt.author}</p>
            </div>
          ))}
        </div>
      );
    case "button":
      return (
        <button
          onClick={() => onAnswer(data.buttonText, data.nextStepId)}
          className="w-full rounded-lg py-3 font-semibold text-white transition-transform active:scale-95"
          style={{ background: primary }}
        >
          {data.buttonText}
        </button>
      );
    case "capture":
      return (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const values: Record<string, unknown> = {};
            data.fields?.forEach((f) => (values[f.label] = fd.get(f.label)));
            onSubmitCapture(values, data.nextStepId);
          }}
          className="space-y-3"
        >
          {data.title && <h3 className="text-xl font-bold text-center">{data.title}</h3>}
          {data.fields?.map((f) => (
            <div key={f.id} className="space-y-1">
              <Label>{f.label}</Label>
              <Input name={f.label} type={f.type} required={f.required} />
            </div>
          ))}
          <button
            type="submit"
            className="w-full rounded-lg py-3 font-semibold text-white"
            style={{ background: primary }}
          >
            {data.buttonText || t.submit}
          </button>
        </form>
      );
    case "space":
      return <div style={{ height: data.height || 24 }} />;
    case "image":
      return data.imageUrl ? (
        <img src={data.imageUrl} alt={data.alt || ""} className="mx-auto max-h-64 rounded-lg" />
      ) : (
        <div className="grid h-32 place-items-center rounded-lg border-2 border-dashed text-xs text-muted-foreground">
          {t.imageUrl}
        </div>
      );
    case "loading":
      return (
        <div className="flex flex-col items-center gap-3 py-6">
          <div
            className="h-10 w-10 rounded-full border-4 border-muted animate-spin"
            style={{ borderTopColor: primary }}
          />
          <p className="text-sm text-muted-foreground">{data.text}</p>
        </div>
      );
    case "options": {
      const cols = data.columns || 2;
      return (
        <div className="space-y-3">
          {data.title && <h2 className="text-xl font-bold text-center">{data.title}</h2>}
          {data.subtitle && (
            <p className="text-sm text-muted-foreground text-center">{data.subtitle}</p>
          )}
          <div
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {data.options?.map((opt) => (
              <button
                key={opt.id}
                onClick={() => onAnswer(opt.label, opt.nextStepId)}
                className="overflow-hidden rounded-xl border-2 transition hover:scale-[1.02]"
                style={{ borderColor: primary }}
              >
                {opt.image && (
                  <img src={opt.image} alt={opt.label} className="aspect-square w-full object-cover" />
                )}
                <div
                  className="py-3 px-2 font-semibold text-white text-center"
                  style={{ background: primary }}
                >
                  {opt.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      );
    }
    case "price":
      return (
        <div className="rounded-xl border p-5 space-y-4 text-center">
          {data.title && <h3 className="text-lg font-semibold">{data.title}</h3>}
          <div>
            <span className="text-4xl font-bold" style={{ color: primary }}>
              {data.price}
            </span>
            <span className="text-sm text-muted-foreground">{data.pricePeriod}</span>
          </div>
          <ul className="space-y-1.5 text-left">
            {data.priceFeatures?.map((f, i) => (
              <li key={i} className="flex gap-2 text-sm">
                <span style={{ color: primary }}>✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <button
            onClick={() => onAnswer(data.price, data.nextStepId)}
            className="w-full rounded-lg py-3 font-semibold text-white"
            style={{ background: primary }}
          >
            {data.buttonText || t.continue}
          </button>
        </div>
      );
    case "timer":
      return <TimerView seconds={data.seconds || 60} label={data.text} color={primary} />;
    case "charts":
    case "cartesian": {
      const max = Math.max(...(data.chartData?.map((d) => d.value) || [1]));
      return (
        <div className="space-y-3">
          {data.title && <h3 className="font-semibold">{data.title}</h3>}
          <div className="flex items-end gap-2 h-32">
            {data.chartData?.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t"
                  style={{ height: `${(d.value / max) * 100}%`, background: primary }}
                />
                <span className="text-[10px] text-muted-foreground">{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }
}

function TimerView({ seconds, label, color }: { seconds: number; label?: string; color: string }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    const t = setInterval(() => setLeft((l) => (l > 0 ? l - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [seconds]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");
  return (
    <div className="text-center">
      {label && <div className="text-sm text-muted-foreground">{label}</div>}
      <div className="text-3xl font-mono font-bold" style={{ color }}>
        {mm}:{ss}
      </div>
    </div>
  );
}
