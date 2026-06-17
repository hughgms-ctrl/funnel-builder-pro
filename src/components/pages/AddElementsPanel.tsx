import { 
  Heading, 
  Type, 
  Square, 
  Image, 
  LayoutTemplate, 
  MessageSquare, 
  CreditCard, 
  Sparkles 
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Template {
  name: string;
  description: string;
  icon: any;
  html: string;
}

const TEMPLATES: Template[] = [
  {
    name: "Hero Section Premium",
    description: "Cabeçalho principal com título grande, subtítulo e botão CTA.",
    icon: LayoutTemplate,
    html: `
<section class="hero-sec" style="padding: 6rem 2rem; background: linear-gradient(135deg, #09090b 0%, #18181b 100%); color: #fff; text-align: center; border-bottom: 1px solid #27272a; font-family: system-ui, sans-serif;">
  <div style="max-width: 800px; margin: 0 auto;">
    <h1 style="font-size: 3.5rem; font-weight: 800; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 1.5rem; color: #ffffff;">Transforme sua ideia em realidade digital</h1>
    <p style="font-size: 1.25rem; color: #a1a1aa; line-height: 1.6; max-width: 600px; margin: 0 auto 2.5rem;">Crie landing pages profissionais de alta conversão sem complicação. Tudo editável de forma visual e intuitiva.</p>
    <div style="display: flex; gap: 1rem; justify-content: center;">
      <a href="#cta" style="background: #8b5cf6; color: #fff; padding: 0.75rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s;">Começar Agora</a>
      <a href="#features" style="background: transparent; color: #fff; border: 1px solid #3f3f46; padding: 0.75rem 2rem; border-radius: 9999px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s;">Saber Mais</a>
    </div>
  </div>
</section>
`
  },
  {
    name: "Seção de Benefícios",
    description: "Grid responsivo com 3 colunas de benefícios/features.",
    icon: Sparkles,
    html: `
<section id="features" class="features-sec" style="padding: 5rem 2rem; background: #ffffff; color: #18181b; border-bottom: 1px solid #e4e4e7; font-family: system-ui, sans-serif;">
  <div style="max-width: 1000px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 4rem;">
      <h2 style="font-size: 2.25rem; font-weight: 700; letter-spacing: -0.01em; margin-bottom: 1rem;">Por que escolher nosso produto?</h2>
      <p style="color: #71717a; font-size: 1.1rem;">Três pilares fundamentais para o sucesso do seu negócio.</p>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem;">
      <div style="padding: 2rem; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">⚡</div>
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Velocidade Incrível</h3>
        <p style="color: #71717a; font-size: 0.95rem; line-height: 1.5;">Páginas otimizadas que carregam em menos de um segundo para seus clientes.</p>
      </div>
      <div style="padding: 2rem; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">🎨</div>
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Design Impecável</h3>
        <p style="color: #71717a; font-size: 0.95rem; line-height: 1.5;">Visual elegante e refinado, seguindo as melhores tendências do mercado.</p>
      </div>
      <div style="padding: 2rem; border: 1px solid #e4e4e7; border-radius: 12px; background: #fafafa;">
        <div style="font-size: 2rem; margin-bottom: 1rem;">📈</div>
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 0.75rem;">Alta Conversão</h3>
        <p style="color: #71717a; font-size: 0.95rem; line-height: 1.5;">Estruturas testadas para maximizar o número de leads e vendas.</p>
      </div>
    </div>
  </div>
</section>
`
  },
  {
    name: "Seção de Depoimento",
    description: "Bloco elegante para exibir prova social ou citação de cliente.",
    icon: MessageSquare,
    html: `
<section class="testimonial-sec" style="padding: 5rem 2rem; background: #fafafa; color: #18181b; border-bottom: 1px solid #e4e4e7; font-family: system-ui, sans-serif; text-align: center;">
  <div style="max-width: 800px; margin: 0 auto;">
    <div style="font-size: 3rem; color: #e4e4e7; line-height: 1; margin-bottom: 1.5rem;">“</div>
    <p style="font-size: 1.5rem; font-weight: 500; font-style: italic; line-height: 1.6; margin-bottom: 2rem; color: #27272a;">Este editor superou todas as expectativas. Consegui importar o código da minha agência e fazer todas as edições de texto e imagem em poucos minutos. Excelente ferramenta!</p>
    <div style="display: flex; flex-direction: column; align-items: center; gap: 0.5rem;">
      <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover;" alt="Foto do Cliente" />
      <div style="font-weight: 600; font-size: 1rem; color: #18181b;">Mariana Costa</div>
      <div style="font-size: 0.85rem; color: #71717a;">CEO, Costa Design</div>
    </div>
  </div>
</section>
`
  },
  {
    name: "Chamada para Ação (CTA)",
    description: "Seção focada em conversão com fundo contrastante.",
    icon: CreditCard,
    html: `
<section id="cta" class="cta-sec" style="padding: 6rem 2rem; background: #8b5cf6; color: #ffffff; text-align: center; font-family: system-ui, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto;">
    <h2 style="font-size: 2.5rem; font-weight: 800; margin-bottom: 1rem; letter-spacing: -0.01em;">Pronto para decolar?</h2>
    <p style="font-size: 1.15rem; opacity: 0.9; margin-bottom: 2.5rem; line-height: 1.5;">Aproveite nossa oferta de lançamento por tempo limitado. Crie sua conta hoje mesmo.</p>
    <a href="#comprar" style="background: #ffffff; color: #8b5cf6; padding: 0.85rem 2.5rem; border-radius: 9999px; text-decoration: none; font-weight: 700; font-size: 1.05rem; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.2s;">Garantir Acesso</a>
  </div>
</section>
`
  },
  {
    name: "Título Simples",
    description: "Um título H2 padrão com subtítulo.",
    icon: Heading,
    html: `
<div style="padding: 3rem 2rem; text-align: center; font-family: system-ui, sans-serif; background: #ffffff;">
  <h2 style="font-size: 2rem; font-weight: 700; color: #18181b; margin-bottom: 0.5rem;">Subtítulo da Seção</h2>
  <p style="color: #71717a; font-size: 0.95rem;">Descrição de apoio ao título principal.</p>
</div>
`
  },
  {
    name: "Parágrafo de Texto",
    description: "Bloco de parágrafo formatado para leitura confortável.",
    icon: Type,
    html: `
<div style="padding: 2rem 2rem; max-width: 700px; margin: 0 auto; font-family: system-ui, sans-serif; background: #ffffff;">
  <p style="font-size: 1.05rem; line-height: 1.7; color: #3f3f46;">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
</div>
`
  },
  {
    name: "Botão CTA Simples",
    description: "Botão isolado para chamadas de ação.",
    icon: Square,
    html: `
<div style="padding: 1.5rem; text-align: center; font-family: system-ui, sans-serif; background: #ffffff;">
  <a href="#" style="display: inline-block; background: #8b5cf6; color: #fff; padding: 0.75rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s;">Clique Aqui</a>
</div>
`
  },
  {
    name: "Imagem de Destaque",
    description: "Imagem responsiva com cantos arredondados.",
    icon: Image,
    html: `
<div style="padding: 2rem; text-align: center; background: #ffffff;">
  <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800&auto=format&fit=crop&q=80" style="max-width: 100%; height: auto; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);" alt="Imagem demonstrativa" />
</div>
`
  }
];

interface Props {
  onAdd: (html: string) => void;
}

export function AddElementsPanel({ onAdd }: Props) {
  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-300">
      <div className="p-4 border-b border-zinc-800 shrink-0">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Adicionar Elemento</h3>
        <p className="text-[11px] text-zinc-500 mt-1">Clique para inserir um bloco no final da sua página.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {TEMPLATES.map((tmpl) => {
          const Icon = tmpl.icon;
          return (
            <button
              key={tmpl.name}
              onClick={() => onAdd(tmpl.html)}
              className="w-full text-left p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:border-violet-500/40 hover:bg-violet-950/10 transition flex items-start gap-3 group"
            >
              <div className="size-8 rounded-lg bg-zinc-800 grid place-items-center group-hover:bg-violet-900/20 group-hover:text-violet-400 shrink-0 text-zinc-400">
                <Icon className="size-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-200 group-hover:text-violet-300 transition truncate">{tmpl.name}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">{tmpl.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
