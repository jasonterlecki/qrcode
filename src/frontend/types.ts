export type QrStyle = "classic" | "rounded" | "dots" | "pills" | "outline";

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

export interface QrDesignState {
  url: string;
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
