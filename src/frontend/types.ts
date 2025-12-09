export type QrStyle = "classic" | "rounded" | "dots" | "pills" | "outline";
export type QrContentType = "url" | "text" | "wifi" | "vcard";

export type LabelSize = "sm" | "md" | "lg";
export type LabelWeight = "regular" | "bold";
export type LabelAlign = "left" | "center" | "right";

export interface LabelOptions {
  text: string;
  size: LabelSize;
  weight: LabelWeight;
  align: LabelAlign;
}

export interface LogoAsset {
  dataUrl: string;
  fileName: string;
  type: string;
}

export interface LogoSettings {
  asset: LogoAsset | null;
  size: number;
  safeZone: boolean;
}

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface WifiContent {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export interface VcardContent {
  name: string;
  organization: string;
  title: string;
  phone: string;
  email: string;
  url: string;
  note: string;
}

export interface QrContentState {
  url: string;
  text: string;
  wifi: WifiContent;
  vcard: VcardContent;
}

export interface QrDesignState {
  contentType: QrContentType;
  content: QrContentState;
  style: QrStyle;
  foreground: string;
  background: string;
  transparentBackground: boolean;
  label: LabelOptions;
}

export interface DownloadFormat {
  id: "png" | "jpeg" | "svg" | "webp";
  label: string;
  mime: string;
  supportsTransparency: boolean;
}
