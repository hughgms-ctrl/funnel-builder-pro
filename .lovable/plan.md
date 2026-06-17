# Plano: Page Builder visual + IA + Editor estilo Framer

Vou adicionar um **segundo módulo** ao app, ao lado do Quiz Builder: um **Page Builder** completo com 3 modos de criação e um canvas de edição visual.

## 1. Nova arquitetura de navegação

- Tela inicial (após login) com 2 cards: **Quiz Builder** (existente) e **Page Builder** (novo).
- Rota nova `/pages` → lista de páginas + botão "Nova página".
- Rota `/pages/$pageId` → editor visual.
- Store separada `usePageStore` (Zustand + persist) com `Page[]`, `currentPageId`, ações CRUD.

## 2. Modelo de dados

```ts
type Page = {
  id: string;
  name: string;
  slug: string;
  blocks: Block[];      // árvore de camadas
  css: string;          // CSS global da página
  meta: { title; description; ogImage };
  createdAt; updatedAt;
};

type Block = {
  id: string;
  tag: 'header'|'main'|'section'|'footer'|'div'|'h1'|'h2'|'p'|'button'|'img'|'a'|'nav'|'ul'|'li';
  className?: string;
  text?: string;
  attrs?: Record<string,string>;   // href, src, alt...
  styles?: Record<string,string>;  // overrides por bloco (mapeados pra classe gerada)
  children?: Block[];
};
```

Conversores bidirecionais: `blocksToHtml(blocks)` / `htmlToBlocks(html)` (usando `DOMParser`) e `mergeCss(css, blockStyles)`.

## 3. Três modos de criação

Na criação de página, modal com 3 abas:

**A. Em branco** — página vazia, adiciona blocos da paleta.

**B. Gerar com IA** — campo de prompt + botão "Gerar". Chama `createServerFn` `generatePageWithAI` que usa **Lovable AI Gateway** (`google/gemini-3-flash-preview`) com o system prompt exato do usuário (HTML5 semântico, classes descritivas, CSS separado, sem inline, blocos modulares: header, hero, conteúdo, footer). Resposta parseada em `{ html, css }` → convertida em `Block[]` via `htmlToBlocks`.

**C. Colar HTML** — textarea aceita HTML+CSS, parseia em blocos editáveis.

## 4. Editor visual (estilo Framer/Elementor)

Layout em 3 colunas dentro de `/pages/$pageId`:

**Esquerda — Paleta + Árvore de camadas**
- Paleta de blocos: Seção, Container, Heading (H1–H3), Parágrafo, Imagem, Botão, Link, Navbar, Spacer, Divider, HTML embed, Quiz embed.
- Árvore hierárquica clicável (com drag-reorder simples: ↑/↓ + duplicar + deletar, mesmo padrão do `Canvas.tsx` atual).

**Centro — Canvas**
- `iframe` sandbox renderizando `blocksToHtml + <style>{css}</style>` em tempo real.
- Overlay absoluto com bounding boxes: hover destaca, click seleciona (postMessage do iframe envia `data-block-id`).
- Toolbar de viewport: Desktop / Tablet / Mobile (muda largura do iframe).

**Direita — Painel de propriedades**
Para o bloco selecionado, abas:
- **Conteúdo**: texto, href, src (upload de imagem ou gerar com IA — reusa `generateImage` existente).
- **Estilo**: cor texto, cor fundo, padding, margin, border-radius, font-size, font-weight, text-align, width, height, display (flex/grid/block), gap, justify/align. Cada controle grava em `block.styles` e atualiza o CSS gerado.
- **Avançado**: className, tag (select), atributos custom, CSS livre por bloco.

Aba global "CSS" no topo: editor de texto pro `page.css`.

## 5. Server function de IA

`src/lib/api/page-generator.functions.ts`:
- `createServerFn POST` com `inputValidator` Zod `{ prompt: string }`.
- Lê `process.env.LOVABLE_API_KEY`, monta provider Gateway, chama `generateText` com `Output.object({ html: string, css: string })` e o system prompt fornecido.
- Retorna `{ html, css }`.

## 6. Publicação / preview

- Botão "Preview" abre rota `/pages/$pageId/preview` que renderiza HTML+CSS finais em tela cheia (sem chrome).
- Botão "Exportar" baixa `.html` standalone (HTML + `<style>` inline embutido).
- Persistência: local (Zustand persist) v1. Backend Supabase fica pra próxima iteração.

## 7. i18n

Adicionar chaves PT/EN: `pages.title`, `pages.new`, `pages.aiPrompt`, `pages.pasteHtml`, `pages.blank`, `pages.generate`, `pages.preview`, `pages.export`, `pages.blocks.*`, `pages.props.*`, `pages.viewport.*`.

## Detalhes técnicos

- **Stack**: TanStack Start + Zustand (já no projeto) + Lovable AI Gateway via `createServerFn` (já tem `attachSupabaseAuth` global; essa função fica pública, sem `requireSupabaseAuth`, pra evitar problemas de SSR).
- **Parser HTML→Block**: `new DOMParser().parseFromString(html, 'text/html')` rodando só no client (canvas é client-only). Recursão mapeando `Element` → `Block`, ignorando `<script>`.
- **Sandbox do iframe**: `sandbox="allow-same-origin"` (sem `allow-scripts`) pra segurança; comunicação via `postMessage` num pequeno script injetado para seleção/hover.
- **Geração de classes**: cada bloco com `styles` recebe uma classe `lb-{id}` e o CSS é concatenado no `<style>` do iframe — mantém regra "sem inline styles" do prompt do usuário.
- **Arquivos novos**:
  - `src/lib/page-store.ts`
  - `src/lib/page-types.ts`
  - `src/lib/page-html.ts` (conversores)
  - `src/lib/api/page-generator.functions.ts`
  - `src/routes/pages.tsx` (lista)
  - `src/routes/pages.$pageId.tsx` (editor)
  - `src/routes/pages.$pageId.preview.tsx`
  - `src/components/pages/PageEditor.tsx`
  - `src/components/pages/BlockPalette.tsx`
  - `src/components/pages/LayersTree.tsx`
  - `src/components/pages/CanvasFrame.tsx`
  - `src/components/pages/PropsPanel.tsx`
  - `src/components/pages/NewPageModal.tsx`
- **Arquivos editados**:
  - `src/routes/index.tsx` (hub Quiz vs Pages)
  - `src/lib/i18n.ts` (chaves novas)

## Fora do escopo desta entrega
- Animações/timeline tipo Framer (Motion).
- Multi-page com roteamento próprio.
- Salvar páginas no Supabase (fica local com Zustand persist).
- Colaboração em tempo real.

Posso seguir e implementar?
