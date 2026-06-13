export type ComponentType =
  | "alert"
  | "arguments"
  | "level"
  | "testimonials"
  | "button"
  | "capture"
  | "space"
  | "charts"
  | "cartesian"
  | "image"
  | "loading"
  | "options"
  | "price"
  | "text"
  | "timer"
  | "compare"
  | "video"
  | "plans";

export interface OptionItem {
  id: string;
  label: string;
  image?: string;
  nextStepId?: string; // conditional branching
  score?: number;      // scoring for this option
  idName?: string;     // optional variable value to store when selected
}

export interface CaptureField {
  id: string;
  type: "text" | "email" | "tel";
  label: string;
  required?: boolean;
  idName?: string;     // variable identifier (e.g., 'nome', 'peso')
}

export interface PlanItem {
  id: string;
  name: string;
  originalPrice: string;
  promoPrice: string;
  period?: string;
  popular?: boolean;
  popularText?: string;
  nextStepId?: string;
}

export interface ComponentData {
  id: string;
  type: ComponentType;
  // shared
  text?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  // alert
  variant?: "info" | "success" | "warning" | "danger";
  // button
  buttonText?: string;
  nextStepId?: string;
  // capture
  fields?: CaptureField[];
  // image
  imageUrl?: string;
  alt?: string;
  // options
  options?: OptionItem[];
  columns?: number;
  // price
  price?: string;
  pricePeriod?: string;
  priceFeatures?: string[];
  // testimonials
  testimonials?: { id: string; author: string; text: string; avatar?: string }[];
  // timer
  seconds?: number;
  // loading
  loadingDuration?: number;
  // level / progress
  level?: number;
  // space
  height?: number;
  // charts
  chartData?: { label: string; value: number }[];
  
  // compare component (Antes/Depois)
  beforeImageUrl?: string;
  beforeLabel?: string;
  afterImageUrl?: string;
  afterLabel?: string;
  
  // video component
  videoUrl?: string;

  // plans component
  plans?: PlanItem[];
  
  // Advanced styling & logic (Inlead style)
  aesthetic?: 'simple' | 'highlight' | 'emboss' | 'contrast';
  borders?: 'medium' | 'large' | 'extra' | 'none';
  width?: number; // e.g. 50 or 100
  animation?: 'none' | 'pulsating' | 'auto-emboss';
  fixedFooter?: boolean;
  idName?: string;     // Variable name bound to this component (useful for Options)
  displayRule?: string; // Conditional logic rule (e.g. '{{score}} == 10')
}

export interface Step {
  id: string;
  title: string;
  components: ComponentData[];
  showLogo: boolean;
  showProgress: boolean;
  showBack: boolean;
}

export interface Funnel {
  id: string;
  name: string;
  logoUrl?: string;
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  steps: Step[];
  // Publication & Integration
  saleUrl?: string;          // Link do produto/checkout
  leadWebhookUrl?: string;   // Webhook para envio automático de leads
  metaPixelId?: string;      // ID do Pixel da Meta (Facebook)
  googleTagId?: string;      // Google Tag Manager ID
  tiktokPixelId?: string;    // TikTok Pixel ID
  supabaseEnabled?: boolean; // Salvar leads no Supabase
}
