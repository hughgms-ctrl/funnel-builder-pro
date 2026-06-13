import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ComponentData, ComponentType, Funnel, Step } from "./types";

const uid = () => Math.random().toString(36).slice(2, 10);

const componentDefaults = (type: ComponentType): ComponentData => {
  const base: ComponentData = { 
    id: uid(), 
    type,
    aesthetic: "simple",
    borders: "medium",
    width: 100,
    animation: "none",
    fixedFooter: false,
    displayRule: "",
  };
  switch (type) {
    case "alert":
      return { ...base, text: "Mensagem importante", variant: "info" };
    case "arguments":
      return {
        ...base,
        title: "Por que escolher?",
        priceFeatures: ["Argumento 1", "Argumento 2", "Argumento 3"],
      };
    case "level":
      return { ...base, level: 50 };
    case "testimonials":
      return {
        ...base,
        title: "Depoimentos",
        testimonials: [
          { id: uid(), author: "Maria", text: "Mudou minha vida!" },
          { id: uid(), author: "João", text: "Recomendo demais." },
        ],
      };
    case "button":
      return { ...base, buttonText: "Continuar" };
    case "capture":
      return {
        ...base,
        title: "Quase lá!",
        fields: [
          { id: uid(), type: "text", label: "Nome", required: true, idName: "nome" },
          { id: uid(), type: "email", label: "E-mail", required: true, idName: "email" },
        ],
        buttonText: "Enviar",
      };
    case "space":
      return { ...base, height: 24 };
    case "charts":
    case "cartesian":
      return {
        ...base,
        title: "Resultado",
        chartData: [
          { label: "Jan", value: 30 },
          { label: "Fev", value: 55 },
          { label: "Mar", value: 80 },
          { label: "Abr", value: 95 },
        ],
      };
    case "image":
      return { ...base, imageUrl: "", alt: "" };
    case "loading":
      return { ...base, text: "Analisando suas respostas...", loadingDuration: 3 };
    case "options":
      return {
        ...base,
        title: "Qual a sua idade?",
        subtitle: "Utilizamos sua idade apenas para personalizar seu plano",
        columns: 2,
        options: [
          { id: uid(), label: "18-29", score: 10 },
          { id: uid(), label: "29-39", score: 20 },
          { id: uid(), label: "39-49", score: 30 },
          { id: uid(), label: "50+", score: 40 },
        ],
        idName: "idade",
      };
    case "price":
      return {
        ...base,
        title: "Seu Plano Personalizado",
        price: "R$ 27",
        pricePeriod: "/mês",
        priceFeatures: ["Acesso completo", "Suporte 24/7", "Cancelamento fácil"],
        buttonText: "Quero meu plano",
      };
    case "text":
      return { ...base, text: "Digite seu texto aqui" };
    case "timer":
      return { ...base, seconds: 300, text: "Oferta expira em" };
    case "compare":
      return {
        ...base,
        beforeImageUrl: "",
        beforeLabel: "Antes",
        afterImageUrl: "",
        afterLabel: "Seu objetivo",
      };
    case "video":
      return {
        ...base,
        videoUrl: "",
      };
    case "plans":
      return {
        ...base,
        title: "O seu plano personalizado está pronto!",
        plans: [
          {
            id: uid(),
            name: "Plano De 7 Dias",
            originalPrice: "R$ 99,90",
            promoPrice: "R$ 49,90",
            period: "à vista",
          },
          {
            id: uid(),
            name: "Plano De 1 Mês",
            originalPrice: "R$ 199,90",
            promoPrice: "R$ 99,90",
            period: "à vista",
            popular: true,
            popularText: "★ MAIS POPULAR ★",
          },
          {
            id: uid(),
            name: "Plano De 3 Meses",
            originalPrice: "R$ 299,90",
            promoPrice: "R$ 149,90",
            period: "à vista",
          },
        ],
        idName: "plano_selecionado",
      };
  }
};

const initialFunnel = (): Funnel => {
  const step1: Step = {
    id: uid(),
    title: "Etapa 1",
    showLogo: true,
    showProgress: true,
    showBack: true,
    components: [
      { ...componentDefaults("image"), imageUrl: "" },
      { ...componentDefaults("text"), text: "Plano Anti Procrastinação" },
      {
        ...componentDefaults("options"),
        title: "Selecione seu gênero para continuar.",
        subtitle: "O questionário leva poucos minutos.",
        columns: 2,
        options: [
          { id: uid(), label: "Homem" },
          { id: uid(), label: "Mulher" },
        ],
      },
    ],
  };
  const step2: Step = {
    id: uid(),
    title: "Etapa 2 - Homem",
    showLogo: true,
    showProgress: true,
    showBack: true,
    components: [componentDefaults("options")],
  };
  const step3: Step = {
    id: uid(),
    title: "Etapa 3 - Mulher",
    showLogo: true,
    showProgress: true,
    showBack: true,
    components: [componentDefaults("options")],
  };
  return {
    id: uid(),
    name: "Meu Funil",
    primaryColor: "#7c3aed",
    accentColor: "#ec4899",
    fontFamily: "Inter",
    steps: [step1, step2, step3],
  };
};

export interface Lead {
  id: string;
  createdAt: number;
  answers: Record<string, unknown>;
}

export interface ApiKeys {
  openai?: string;
  anthropic?: string;
}

export interface SupabaseConfig {
  url?: string;
  anonKey?: string;
}

interface FunnelState {
  funnel: Funnel;
  selectedStepId: string | null;
  selectedComponentId: string | null;
  leads: Lead[];
  apiKeys: ApiKeys;
  supabaseConfig: SupabaseConfig;
  // actions
  setFunnel: (f: Funnel) => void;
  updateFunnel: (patch: Partial<Funnel>) => void;
  selectStep: (id: string | null) => void;
  selectComponent: (id: string | null) => void;
  addStep: () => void;
  duplicateStep: (id: string) => void;
  deleteStep: (id: string) => void;
  reorderSteps: (from: number, to: number) => void;
  renameStep: (id: string, title: string) => void;
  updateStep: (id: string, patch: Partial<Step>) => void;
  addComponent: (stepId: string, type: ComponentType) => void;
  updateComponent: (stepId: string, componentId: string, patch: Partial<ComponentData>) => void;
  deleteComponent: (stepId: string, componentId: string) => void;
  duplicateComponent: (stepId: string, componentId: string) => void;
  moveComponent: (stepId: string, from: number, to: number) => void;
  addLead: (lead: Lead) => void;
  clearLeads: () => void;
  setApiKeys: (keys: Partial<ApiKeys>) => void;
  setSupabaseConfig: (cfg: Partial<SupabaseConfig>) => void;
}

export const useFunnelStore = create<FunnelState>()(
  persist(
    (set, get) => ({
      funnel: initialFunnel(),
      selectedStepId: null,
      selectedComponentId: null,
      leads: [],
      apiKeys: {},
      supabaseConfig: {},
      setFunnel: (funnel) => set({ funnel }),
      updateFunnel: (patch) => set((s) => ({ funnel: { ...s.funnel, ...patch } })),
      selectStep: (id) => set({ selectedStepId: id, selectedComponentId: null }),
      selectComponent: (id) => set({ selectedComponentId: id }),
      addStep: () =>
        set((s) => {
          const step: Step = {
            id: uid(),
            title: `Etapa ${s.funnel.steps.length + 1}`,
            showLogo: true,
            showProgress: true,
            showBack: true,
            components: [],
          };
          return {
            funnel: { ...s.funnel, steps: [...s.funnel.steps, step] },
            selectedStepId: step.id,
          };
        }),
      duplicateStep: (id) =>
        set((s) => {
          const idx = s.funnel.steps.findIndex((st) => st.id === id);
          if (idx < 0) return s;
          const orig = s.funnel.steps[idx];
          const copy: Step = {
            ...orig,
            id: uid(),
            title: `${orig.title} (cópia)`,
            components: orig.components.map((c) => ({ ...c, id: uid() })),
          };
          const steps = [...s.funnel.steps];
          steps.splice(idx + 1, 0, copy);
          return { funnel: { ...s.funnel, steps } };
        }),
      deleteStep: (id) =>
        set((s) => {
          const steps = s.funnel.steps.filter((st) => st.id !== id);
          return {
            funnel: { ...s.funnel, steps },
            selectedStepId: s.selectedStepId === id ? null : s.selectedStepId,
          };
        }),
      reorderSteps: (from, to) =>
        set((s) => {
          const steps = [...s.funnel.steps];
          const [m] = steps.splice(from, 1);
          steps.splice(to, 0, m);
          return { funnel: { ...s.funnel, steps } };
        }),
      renameStep: (id, title) =>
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) => (st.id === id ? { ...st, title } : st)),
          },
        })),
      updateStep: (id, patch) =>
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) => (st.id === id ? { ...st, ...patch } : st)),
          },
        })),
      addComponent: (stepId, type) => {
        const comp = componentDefaults(type);
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) =>
              st.id === stepId ? { ...st, components: [...st.components, comp] } : st,
            ),
          },
          selectedComponentId: comp.id,
        }));
      },
      updateComponent: (stepId, componentId, patch) =>
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) =>
              st.id === stepId
                ? {
                    ...st,
                    components: st.components.map((c) =>
                      c.id === componentId ? { ...c, ...patch } : c,
                    ),
                  }
                : st,
            ),
          },
        })),
      deleteComponent: (stepId, componentId) =>
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) =>
              st.id === stepId
                ? { ...st, components: st.components.filter((c) => c.id !== componentId) }
                : st,
            ),
          },
          selectedComponentId:
            s.selectedComponentId === componentId ? null : s.selectedComponentId,
        })),
      duplicateComponent: (stepId, componentId) =>
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) => {
              if (st.id !== stepId) return st;
              const idx = st.components.findIndex((c) => c.id === componentId);
              if (idx < 0) return st;
              const copy = { ...st.components[idx], id: uid() };
              const arr = [...st.components];
              arr.splice(idx + 1, 0, copy);
              return { ...st, components: arr };
            }),
          },
        })),
      moveComponent: (stepId, from, to) =>
        set((s) => ({
          funnel: {
            ...s.funnel,
            steps: s.funnel.steps.map((st) => {
              if (st.id !== stepId) return st;
              const arr = [...st.components];
              const [m] = arr.splice(from, 1);
              arr.splice(to, 0, m);
              return { ...st, components: arr };
            }),
          },
        })),
      addLead: (lead) => set((s) => ({ leads: [lead, ...s.leads] })),
      clearLeads: () => set({ leads: [] }),
      setApiKeys: (keys) => set((s) => ({ apiKeys: { ...s.apiKeys, ...keys } })),
      setSupabaseConfig: (cfg) => set((s) => ({ supabaseConfig: { ...s.supabaseConfig, ...cfg } })),
    }),
    { name: "quizfunnel-state" },
  ),
);

export { componentDefaults };


