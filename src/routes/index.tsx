import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useFunnelStore } from "@/lib/store";
import { useEffect, useState } from "react";
import { Loader2, Plus, Sparkles, Edit3, Copy, Trash2, LayoutGrid, LogOut, ExternalLink, Clock, Layers, Settings as SettingsIcon, Database, Key, Check, Info, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Funnel } from "@/lib/types";
import { toast } from "sonner";
import { testSupabaseConnection, ensureSchema } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meus Funis — QuizFunnel" },
      { name: "description", content: "Gerencie e edite seus funis de quiz." },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-[#09090b]">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (!user) return null;

  return <FunnelsDashboard onLogout={logout} userEmail={user.email} />;
}

function FunnelsDashboard({ onLogout, userEmail }: { onLogout: () => void; userEmail: string }) {
  const navigate = useNavigate();
  const savedFunnels = useFunnelStore((s) => s.savedFunnels);
  const currentFunnel = useFunnelStore((s) => s.funnel);
  const createFunnel = useFunnelStore((s) => s.createFunnel);
  const loadFunnel = useFunnelStore((s) => s.loadFunnel);
  const deleteSavedFunnel = useFunnelStore((s) => s.deleteSavedFunnel);
  const duplicateSavedFunnel = useFunnelStore((s) => s.duplicateSavedFunnel);
  const saveCurrentFunnel = useFunnelStore((s) => s.saveCurrentFunnel);

  const apiKeys = useFunnelStore((s) => s.apiKeys);
  const supabaseConfig = useFunnelStore((s) => s.supabaseConfig);
  const setApiKeys = useFunnelStore((s) => s.setApiKeys);
  const setSupabaseConfig = useFunnelStore((s) => s.setSupabaseConfig);

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameSavedFunnel = useFunnelStore((s) => s.renameSavedFunnel);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [localOpenai, setLocalOpenai] = useState("");
  const [localAnthropic, setLocalAnthropic] = useState("");
  const [dbTestState, setDbTestState] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [schemaSetupState, setSchemaSetupState] = useState<"idle" | "setting_up" | "success" | "error">("idle");

  // Merge current funnel into savedFunnels list if not present
  const allFunnels: Funnel[] = (() => {
    const inList = savedFunnels.some((f) => f.id === currentFunnel.id);
    if (!inList && currentFunnel.steps.length > 0) {
      return [currentFunnel, ...savedFunnels];
    }
    return savedFunnels;
  })();

  const handleCreate = () => {
    // Save current before creating
    saveCurrentFunnel();
    createFunnel();
    navigate({ to: "/builder" });
  };

  const handleEdit = (id: string) => {
    saveCurrentFunnel();
    loadFunnel(id);
    navigate({ to: "/builder" });
  };

  const handleDuplicate = (id: string) => {
    duplicateSavedFunnel(id);
    toast.success("Funil duplicado com sucesso!");
  };

  const handleDeleteConfirm = (id: string) => {
    deleteSavedFunnel(id);
    setDeleteConfirm(null);
    toast.success("Funil excluído.");
  };

  const handleRenameStart = (funnel: Funnel) => {
    setRenaming(funnel.id);
    setRenameValue(funnel.name);
  };

  const handleRenameConfirm = () => {
    if (renaming && renameValue.trim()) {
      renameSavedFunnel(renaming, renameValue.trim());
    }
    setRenaming(null);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top nav */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-40 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 grid place-items-center">
            <LayoutGrid className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-sm tracking-tight">QuizFunnel</span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/20">Pro</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs text-zinc-500 hidden sm:block">
            {userEmail}
          </div>
          <Button
            onClick={() => {
              setLocalOpenai(apiKeys.openai || "");
              setLocalAnthropic(apiKeys.anthropic || "");
              setDbTestState("idle");
              setSchemaSetupState("idle");
              setSettingsOpen(true);
            }}
            variant="outline"
            size="sm"
            className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center gap-1.5 h-8 text-xs font-semibold"
          >
            <SettingsIcon className="h-3.5 w-3.5 animate-spin-hover" />
            Configurações
          </Button>
          <Button
            onClick={handleCreate}
            size="sm"
            className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-lg shadow-violet-600/15 flex items-center gap-1.5 h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Novo Funil
          </Button>
          <button
            onClick={onLogout}
            className="text-zinc-500 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Hero header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight">Meus Funis</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {allFunnels.length === 0
              ? "Crie seu primeiro funil de quiz para começar."
              : `${allFunnels.length} funil${allFunnels.length > 1 ? "s" : ""} criado${allFunnels.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Empty state */}
        {allFunnels.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center space-y-5">
            <div className="h-20 w-20 rounded-2xl bg-zinc-900 border border-zinc-800 grid place-items-center">
              <Sparkles className="h-9 w-9 text-violet-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-zinc-100">Nenhum funil ainda</h2>
              <p className="text-sm text-zinc-400 max-w-sm">
                Comece criando um funil do zero ou clone um funil existente pela URL.
              </p>
            </div>
            <Button
              onClick={handleCreate}
              className="bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 text-white shadow-lg shadow-violet-600/15 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Criar meu primeiro funil
            </Button>
          </div>
        )}

        {/* Funnels grid */}
        {allFunnels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* "Create New" card */}
            <button
              onClick={handleCreate}
              className="group relative h-[200px] rounded-2xl border-2 border-dashed border-zinc-800 hover:border-violet-500/50 bg-zinc-900/20 hover:bg-violet-500/5 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-zinc-500 hover:text-violet-400"
            >
              <div className="h-12 w-12 rounded-xl bg-zinc-900 border border-zinc-800 group-hover:border-violet-500/30 grid place-items-center transition-all duration-200">
                <Plus className="h-5 w-5 transition-transform duration-200 group-hover:rotate-90 group-hover:scale-110" />
              </div>
              <span className="text-sm font-medium">Novo Funil</span>
            </button>

            {/* Funnel cards */}
            {allFunnels.map((funnel) => (
              <FunnelCard
                key={funnel.id}
                funnel={funnel}
                isActive={funnel.id === currentFunnel.id}
                onEdit={() => handleEdit(funnel.id)}
                onDuplicate={() => handleDuplicate(funnel.id)}
                onDeleteRequest={() => setDeleteConfirm(funnel.id)}
                onRename={() => handleRenameStart(funnel)}
                isDeleteConfirming={deleteConfirm === funnel.id}
                onDeleteCancel={() => setDeleteConfirm(null)}
                onDeleteConfirm={() => handleDeleteConfirm(funnel.id)}
                isRenaming={renaming === funnel.id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameConfirm={handleRenameConfirm}
                onRenameCancel={() => setRenaming(null)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Platform Settings Modal */}
      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5 text-violet-500 animate-pulse" />
                <h2 className="text-base font-bold text-white">Configurações da Ferramenta</h2>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-zinc-400 hover:text-white transition text-sm font-semibold"
              >
                Fechar
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-zinc-300">
              
              {/* ── API KEYS ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Key className="h-4 w-4 text-violet-400" />
                  <h3 className="font-semibold text-zinc-200">Chaves de API</h3>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">OpenAI API Key</label>
                  <input
                    type="password"
                    placeholder="sk-proj-..."
                    value={localOpenai}
                    onChange={(e) => setLocalOpenai(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs font-mono focus:border-violet-500 focus:outline-none transition"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Necessária para clonar layouts via IA e gerar imagens alternativas.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-zinc-400 font-medium">Anthropic API Key</label>
                  <input
                    type="password"
                    placeholder="sk-ant-..."
                    value={localAnthropic}
                    onChange={(e) => setLocalAnthropic(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 text-xs font-mono focus:border-violet-500 focus:outline-none transition"
                  />
                  <p className="text-[10px] text-zinc-500">
                    Para análises opcionais no processamento secundário de funis.
                  </p>
                </div>
              </div>

              {/* ── SUPABASE CONFIG ── */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                  <Database className="h-4 w-4 text-violet-400" />
                  <h3 className="font-semibold text-zinc-200">Banco de Dados (Supabase)</h3>
                </div>

                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 flex items-start gap-2.5">
                  <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-emerald-400">Supabase Conectado Automaticamente</p>
                    <p className="text-[10px] text-zinc-400 leading-relaxed">
                      Sua conta do Supabase está vinculada à Lovable por meio das chaves nativas do sistema. Não é necessário preenchimento manual.
                    </p>
                  </div>
                </div>

                {/* DB actions & validation */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    onClick={async () => {
                      setDbTestState("testing");
                      const ok = await testSupabaseConnection();
                      if (ok) {
                        setDbTestState("success");
                        toast.success("Conexão com o Supabase efetuada com sucesso!");
                      } else {
                        setDbTestState("error");
                        toast.error("Falha ao se conectar com as chaves injetadas do Supabase. Verifique sua integração Lovable.");
                      }
                    }}
                    disabled={dbTestState === "testing"}
                    variant="outline"
                    size="sm"
                    className="text-xs border-zinc-700 bg-zinc-950 hover:bg-zinc-800 flex items-center gap-1.5"
                  >
                    {dbTestState === "testing" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : dbTestState === "success" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Database className="h-3.5 w-3.5 text-violet-400" />
                    )}
                    Testar Conexão
                  </Button>

                  <Button
                    onClick={async () => {
                      setSchemaSetupState("setting_up");
                      try {
                        await ensureSchema();
                        setSchemaSetupState("success");
                        toast.success("Tabelas 'funnels' e 'leads' configuradas no Supabase!");
                      } catch {
                        setSchemaSetupState("error");
                        toast.error("Erro ao criar tabelas. Verifique a integração.");
                      }
                    }}
                    disabled={
                      schemaSetupState === "setting_up" ||
                      dbTestState !== "success"
                    }
                    variant="outline"
                    size="sm"
                    className="text-xs border-zinc-700 bg-zinc-950 hover:bg-zinc-800 flex items-center gap-1.5"
                  >
                    {schemaSetupState === "setting_up" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : schemaSetupState === "success" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Plus className="h-3.5 w-3.5 text-violet-400" />
                    )}
                    Configurar Tabelas (SQL)
                  </Button>
                </div>

                <div className="flex gap-2 text-[10px] text-zinc-500 bg-zinc-950/60 rounded-lg p-3 border border-zinc-800/50">
                  <Info className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />
                  <span>
                    O Supabase gerencia e persiste seus funis e dados de leads. Clique em "Configurar Tabelas" para criar a estrutura no seu banco.
                  </span>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 flex items-center justify-end gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSettingsOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                className="bg-violet-600 hover:bg-violet-700 text-white font-semibold"
                onClick={() => {
                  setApiKeys({ openai: localOpenai.trim(), anthropic: localAnthropic.trim() });
                  toast.success("Configurações atualizadas!");
                  setSettingsOpen(false);
                }}
              >
                Salvar Configurações
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FunnelCard({
  funnel,
  isActive,
  onEdit,
  onDuplicate,
  onDeleteRequest,
  onRename,
  isDeleteConfirming,
  onDeleteCancel,
  onDeleteConfirm,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
}: {
  funnel: Funnel;
  isActive: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDeleteRequest: () => void;
  onRename: () => void;
  isDeleteConfirming: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameConfirm: () => void;
  onRenameCancel: () => void;
}) {
  const stepCount = funnel.steps.length;
  const componentCount = funnel.steps.reduce((sum, s) => sum + s.components.length, 0);

  return (
    <div
      className={`group relative h-[200px] rounded-2xl border bg-zinc-900 overflow-hidden transition-all duration-200 hover:shadow-xl hover:shadow-black/30 hover:-translate-y-0.5 flex flex-col ${
        isActive
          ? "border-violet-500/50 shadow-md shadow-violet-500/10"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {/* Color band top */}
      <div
        className="h-1.5 w-full shrink-0"
        style={{ background: `linear-gradient(to right, ${funnel.primaryColor}, ${funnel.accentColor})` }}
      />

      {/* Card body */}
      <div className="flex-1 p-4 flex flex-col justify-between min-h-0">
        <div className="flex items-start justify-between gap-2">
          {/* Funnel icon + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold shadow-sm"
              style={{ background: funnel.primaryColor }}
            >
              {funnel.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              {isRenaming ? (
                <input
                  autoFocus
                  value={renameValue}
                  onChange={(e) => onRenameChange(e.target.value)}
                  onBlur={onRenameConfirm}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onRenameConfirm();
                    if (e.key === "Escape") onRenameCancel();
                  }}
                  className="text-sm font-semibold bg-zinc-800 border border-violet-500 rounded px-1.5 py-0.5 text-white w-full outline-none"
                />
              ) : (
                <h3
                  className="text-sm font-semibold text-zinc-100 truncate cursor-pointer hover:text-violet-300 transition-colors"
                  onClick={onRename}
                  title="Clique para renomear"
                >
                  {funnel.name}
                </h3>
              )}
              {isActive && (
                <span className="text-[9px] text-violet-400 font-semibold tracking-wide uppercase">
                  Ativo no editor
                </span>
              )}
            </div>
          </div>

          {/* Action buttons (visible on hover) */}
          {!isDeleteConfirming && !isRenaming && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={onDuplicate}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Duplicar"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={onDeleteRequest}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <Layers className="h-3 w-3" />
            <span>{stepCount} etapa{stepCount !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-500">
            <LayoutGrid className="h-3 w-3" />
            <span>{componentCount} componente{componentCount !== 1 ? "s" : ""}</span>
          </div>
          {funnel.primaryColor && (
            <div className="flex items-center gap-1 ml-auto">
              <div
                className="h-3 w-3 rounded-full border border-zinc-700"
                style={{ backgroundColor: funnel.primaryColor }}
              />
              <div
                className="h-3 w-3 rounded-full border border-zinc-700"
                style={{ backgroundColor: funnel.accentColor }}
              />
            </div>
          )}
        </div>

        {/* Delete confirm state */}
        {isDeleteConfirming ? (
          <div className="mt-3 flex items-center gap-2">
            <p className="text-xs text-red-400 flex-1">Confirmar exclusão?</p>
            <button
              onClick={onDeleteCancel}
              className="text-[11px] px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
            >
              Não
            </button>
            <button
              onClick={onDeleteConfirm}
              className="text-[11px] px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Excluir
            </button>
          </div>
        ) : (
          /* Edit button */
          <button
            onClick={onEdit}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-800/60 border border-zinc-700/50 text-xs font-semibold text-zinc-300 hover:bg-violet-600 hover:border-violet-600 hover:text-white transition-all duration-200"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar Funil
          </button>
        )}
      </div>
    </div>
  );
}
