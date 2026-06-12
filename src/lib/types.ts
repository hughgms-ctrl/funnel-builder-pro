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
  | "timer";

export interface OptionItem {
  id: string;
  label: string;
  image?: string;
  nextStepId?: string; // conditional branching
}

export interface CaptureField {
  id: string;
  type: "text" | "email" | "tel";
  label: string;
  required?: boolean;
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
}
