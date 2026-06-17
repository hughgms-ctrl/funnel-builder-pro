export type BlockTag =
  | "header" | "main" | "section" | "footer" | "div" | "nav" | "ul" | "li"
  | "h1" | "h2" | "h3" | "h4" | "p" | "span" | "a" | "button" | "img" | "hr";

export interface Block {
  id: string;
  tag: BlockTag;
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  styles?: Record<string, string>;
  children?: Block[];
}

export interface PageMeta {
  title: string;
  description: string;
  ogImage?: string;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  html: string;
  content: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export const uid = () => Math.random().toString(36).slice(2, 10);
