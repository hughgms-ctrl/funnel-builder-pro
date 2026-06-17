import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Page, Block } from "./page-types";
import { uid } from "./page-types";
import {
  blocksToCss, blocksToHtml, buildDocument, deleteBlock, findBlock,
  insertBlock, moveBlock, updateBlock,
} from "./page-html";

interface PageStore {
  pages: Page[];
  selectedBlockId: string | null;

  createPage: (init?: Partial<Page>) => string;
  deletePage: (id: string) => void;
  renamePage: (id: string, name: string) => void;
  duplicatePage: (id: string) => void;

  updatePage: (id: string, patch: Partial<Page>) => void;

  selectBlock: (id: string | null) => void;
  addBlock: (pageId: string, block: Block, parentId?: string | null) => void;
  patchBlock: (pageId: string, id: string, patch: Partial<Block>) => void;
  removeBlock: (pageId: string, id: string) => void;
  reorderBlock: (pageId: string, id: string, dir: -1 | 1) => void;
}

const emptyPage = (name = "Nova página"): Page => ({
  id: uid(),
  name,
  slug: name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
  blocks: [],
  css: "",
  meta: { title: name, description: "" },
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

export const usePageStore = create<PageStore>()(
  persist(
    (set, get) => ({
      pages: [],
      selectedBlockId: null,

      createPage: (init) => {
        const p = { ...emptyPage(init?.name), ...init, id: init?.id ?? uid() };
        set((s) => ({ pages: [p, ...s.pages] }));
        return p.id;
      },
      deletePage: (id) => set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),
      renamePage: (id, name) => set((s) => ({
        pages: s.pages.map((p) => p.id === id ? { ...p, name, updatedAt: Date.now() } : p),
      })),
      duplicatePage: (id) => set((s) => {
        const src = s.pages.find((p) => p.id === id);
        if (!src) return s;
        const copy: Page = { ...src, id: uid(), name: src.name + " (cópia)", createdAt: Date.now(), updatedAt: Date.now() };
        return { pages: [copy, ...s.pages] };
      }),

      updatePage: (id, patch) => set((s) => ({
        pages: s.pages.map((p) => p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p),
      })),

      selectBlock: (id) => set({ selectedBlockId: id }),

      addBlock: (pageId, block, parentId = null) => set((s) => ({
        pages: s.pages.map((p) => p.id === pageId
          ? { ...p, blocks: insertBlock(p.blocks, parentId, block), updatedAt: Date.now() }
          : p),
        selectedBlockId: block.id,
      })),

      patchBlock: (pageId, id, patch) => set((s) => ({
        pages: s.pages.map((p) => p.id === pageId
          ? { ...p, blocks: updateBlock(p.blocks, id, patch), updatedAt: Date.now() }
          : p),
      })),

      removeBlock: (pageId, id) => set((s) => ({
        pages: s.pages.map((p) => p.id === pageId
          ? { ...p, blocks: deleteBlock(p.blocks, id), updatedAt: Date.now() }
          : p),
        selectedBlockId: s.selectedBlockId === id ? null : s.selectedBlockId,
      })),

      reorderBlock: (pageId, id, dir) => set((s) => ({
        pages: s.pages.map((p) => p.id === pageId
          ? { ...p, blocks: moveBlock(p.blocks, id, dir), updatedAt: Date.now() }
          : p),
      })),
    }),
    { name: "page-store" }
  )
);

export { blocksToHtml, blocksToCss, buildDocument, findBlock };
