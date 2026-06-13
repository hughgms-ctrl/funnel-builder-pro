import type { ComponentType } from "@/lib/types";
import { useT } from "@/lib/i18n";
import { useFunnelStore } from "@/lib/store";
import {
  AlertTriangle,
  MessageSquareQuote,
  BarChart3,
  Star,
  MousePointerClick,
  Mail,
  ArrowUpDown,
  PieChart,
  LineChart,
  Image as ImageIcon,
  Loader2,
  ListChecks,
  DollarSign,
  Type,
  Timer,
  Split,
  Play,
  CreditCard,
} from "lucide-react";

const items: { type: ComponentType; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: "alert", icon: AlertTriangle },
  { type: "arguments", icon: MessageSquareQuote },
  { type: "level", icon: BarChart3 },
  { type: "testimonials", icon: Star },
  { type: "button", icon: MousePointerClick },
  { type: "capture", icon: Mail },
  { type: "space", icon: ArrowUpDown },
  { type: "charts", icon: PieChart },
  { type: "cartesian", icon: LineChart },
  { type: "image", icon: ImageIcon },
  { type: "loading", icon: Loader2 },
  { type: "options", icon: ListChecks },
  { type: "price", icon: DollarSign },
  { type: "text", icon: Type },
  { type: "timer", icon: Timer },
  { type: "compare", icon: Split },
  { type: "video", icon: Play },
  { type: "plans", icon: CreditCard },
];

export function ComponentsPalette() {
  const t = useT();
  const selectedStepId = useFunnelStore((s) => s.selectedStepId);
  const addComponent = useFunnelStore((s) => s.addComponent);

  return (
    <div className="flex flex-col">
      <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground border-b">
        {t.components}
      </div>
      <div className="overflow-y-auto">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.type}
              disabled={!selectedStepId}
              onClick={() => selectedStepId && addComponent(selectedStepId, it.type)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition disabled:opacity-40 disabled:cursor-not-allowed border-b border-border/40"
            >
              <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate">{t.componentLabels[it.type]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
