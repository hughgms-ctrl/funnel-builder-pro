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
  | "plans"
  | "progress-chart";

export interface OptionItem {
  id: string;
  label: string;
  image?: string;
  nextStepId?: string;
  score?: number;
  idName?: string;
  href?: string;
  openInNewTab?: boolean;
}

export interface CaptureField {
  id: string;
  type: "text" | "email" | "tel";
  label: string;
  required?: boolean;
  idName?: string;
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
  href?: string;
  openInNewTab?: boolean;
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
  href?: string;
  openInNewTab?: boolean;
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
  // compare
  beforeImageUrl?: string;
  beforeLabel?: string;
  afterImageUrl?: string;
  afterLabel?: string;
  // video
  videoUrl?: string;
  // plans
  plans?: PlanItem[];

  // progress-chart (curva de progresso colorida)
  chartDays?: number;         // Ex: 7
  chartPosition?: number;     // 0-100, posição do "Você hoje"
  chartLabels?: string[];     // Ex: ["Sem rotina","Começando","Estabelecida","Ideal"]
  chartCurrentLabel?: string; // Ex: "Você hoje"
  chartFutureLabel?: string;  // Ex: "Você daqui a X dias"
  chartNote?: string;         // Ex: "Imagem meramente ilustrativa*"

  // Text styling
  fontSize?: number;
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  textColor?: string;
  textAlign?: "left" | "center" | "right";
  italic?: boolean;

  // Advanced styling & logic
  aesthetic?: "simple" | "highlight" | "emboss" | "contrast";
  borders?: "medium" | "large" | "extra" | "none";
  width?: number;
  animation?: "none" | "pulsating" | "auto-emboss";
  fixedFooter?: boolean;
  idName?: string;
  displayRule?: string;
}

export interface Step {
  id: string;
  title: string;
  components: ComponentData[];
  showLogo: boolean;
  showProgress: boolean;
  showBack: boolean;
  isSaleStep?: boolean;
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
  publishedSlug?: string;
  publishedAt?: string;
  saleUrl?: string;
  leadWebhookUrl?: string;
  saleWebhookUrl?: string;
  metaPixelId?: string;
  googleTagId?: string;
  tiktokPixelId?: string;
  supabaseEnabled?: boolean;
}
