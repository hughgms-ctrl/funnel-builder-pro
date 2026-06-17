import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useT, useLangStore } from "@/lib/i18n";
import { useFunnelStore } from "@/lib/store";
import { StepsList } from "@/components/builder/StepsList";
import { ComponentsPalette } from "@/components/builder/ComponentsPalette";
import { Canvas } from "@/components/builder/Canvas";
import { PropertiesPanel } from "@/components/builder/PropertiesPanel";
import { DesignPanel } from "@/components/builder/DesignPanel";
import { LeadsPanel } from "@/components/builder/LeadsPanel";
import { FlowPanel } from "@/components/builder/FlowPanel";
import { SettingsPanel } from "@/components/builder/SettingsPanel";
import { FunnelClonerModal } from "@/components/builder/FunnelClonerModal";
import { FunnelGeneratorModal } from "@/components/builder/FunnelGeneratorModal";
import { QuizPreview } from "@/components/builder/QuizPreview";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import {
  LayoutPanelLeft,
  Workflow,
  Palette,
  Users,
  Settings as SettingsIcon,
  Play,
  Check,
  Sparkles,
  LogOut,
  ChevronLeft,
  Save,
  Copy,
} from "lucide-react";

type Tab = "builder" | "flow" | "design" | "leads" | "settings";

export function BuilderApp() {
  const t = useT();
  const lang = useLangStore((s) => s.lang);
  const setLang = useLangStore((s) => s.setLang);
  const funnel = useFunnelStore((s) => s.funnel);
  const saveCurrentFunnel = useFunnelStore((s) => s.saveCurrentFunnel);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("builder");
  const [preview, setPreview] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [clonerOpen, setClonerOpen] = useState(false);
  const [generatorOpen, setGeneratorOpen] = useState(false);

  const handleSave = () => {
    saveCurrentFunnel();
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const handleBackToDashboard = () => {
    saveCurrentFunnel();
    navigate({ to: "/" });
  };

  const TabButton = ({
    id,
    icon: Icon,
    label,
  }: {
    id: Tab;
    icon: React.ComponentType<{ className?: string }>;
    label: string;
  }) => (
    <button
      onClick={() => setTab(id)}
      className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm transition ${
        tab === id ? "bg-accent font-medium" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );

  if (preview) {
    return <QuizPreview funnel={funnel} onExit={() => setPreview(false)} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <div className="h-12 border-b flex items-center justify-between px-3 shrink-0">
        {/* Left: back + funnel name */}
        <div className="flex items-center gap-2 w-72">
          <button
            onClick={handleBackToDashboard}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors text-sm px-2 py-1 rounded-md hover:bg-accent"
            title="Voltar ao painel de funis"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Funis</span>
          </button>
          <div className="w-px h-4 bg-border" />
          <span
            className="font-semibold text-sm truncate max-w-[160px]"
            title={funnel.name}
          >
            {funnel.name}
          </span>
        </div>

        {/* Center: tabs */}
        <div className="flex items-center gap-1">
          <TabButton id="builder" icon={LayoutPanelLeft} label={t.tabs.builder} />
          <TabButton id="flow" icon={Workflow} label={t.tabs.flow} />
          <TabButton id="design" icon={Palette} label={t.tabs.design} />
          <TabButton id="leads" icon={Users} label={t.tabs.leads} />
          <TabButton id="settings" icon={SettingsIcon} label="Config" />
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {/* AI Generator Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setGeneratorOpen(true)}
            className="flex items-center gap-1.5 text-indigo-600 border-indigo-300 hover:bg-indigo-50 font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Criar com IA
          </Button>

          {/* Clone funnel button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setClonerOpen(true)}
            className="flex items-center gap-1.5 text-zinc-650 border-zinc-300 hover:bg-zinc-50"
          >
            <Copy className="h-3.5 w-3.5" />
            Clonar Funil
          </Button>

          <button
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            className="text-xs px-2 py-1 rounded border hover:bg-accent uppercase"
          >
            {lang}
          </button>
          <Button variant="ghost" size="sm" onClick={() => setPreview(true)}>
            <Play className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            className="bg-foreground text-background hover:bg-foreground/90 flex items-center gap-1.5"
            onClick={handleSave}
          >
            {savedFlash ? (
              <>
                <Check className="h-4 w-4" /> {t.saved}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" /> {t.save}
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            title="Sair da plataforma"
            className="text-zinc-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left rail: Steps */}
        {(tab === "builder" || tab === "flow") && (
          <div className="w-48 border-r flex flex-col shrink-0">
            <StepsList />
          </div>
        )}

        {/* Components palette (only on builder tab) */}
        {tab === "builder" && (
          <div className="w-44 border-r flex flex-col shrink-0">
            <ComponentsPalette />
          </div>
        )}

        {/* Center */}
        <div className="flex-1 flex flex-col min-w-0">
          {tab === "builder" && <Canvas />}
          {tab === "flow" && <FlowPanel />}
          {tab === "design" && <DesignPanel />}
          {tab === "leads" && <LeadsPanel />}
          {tab === "settings" && <SettingsPanel />}
        </div>

        {/* Right: Properties (only on builder tab) */}
        {tab === "builder" && (
          <div className="w-80 border-l flex flex-col shrink-0 overflow-y-auto">
            <div className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.properties}
            </div>
            <PropertiesPanel />
          </div>
        )}
      </div>

      {/* Cloner Modal */}
      <FunnelClonerModal open={clonerOpen} onClose={() => setClonerOpen(false)} />

      {/* Generator Modal */}
      <FunnelGeneratorModal open={generatorOpen} onClose={() => setGeneratorOpen(false)} />
    </div>
  );
}
