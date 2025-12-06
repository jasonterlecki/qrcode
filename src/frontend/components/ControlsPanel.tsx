import type {
  LabelOptions,
  LabelSize,
  LabelWeight,
  LogoAsset,
  LogoSettings,
  QrDesignState,
} from "../types";
import { LogoUploader } from "./LogoUploader";

const QR_STYLES = [
  { id: "classic", label: "Classic" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "pills", label: "Pills" },
  { id: "outline", label: "Outline" },
] as const;

const LABEL_SIZES: LabelSize[] = ["sm", "md", "lg"];
const LABEL_WEIGHTS: LabelWeight[] = ["regular", "bold"];
const LABEL_ALIGNS: LabelOptions["align"][] = ["left", "center", "right"];

interface ControlsPanelProps {
  design: QrDesignState;
  urlValid: boolean;
  contrastRatio: number;
  logoSettings: LogoSettings;
  onUrlChange: (value: string) => void;
  onStyleChange: (value: QrDesignState["style"]) => void;
  onForegroundChange: (value: string) => void;
  onBackgroundChange: (value: string) => void;
  onTransparentToggle: (value: boolean) => void;
  onLabelChange: (partial: Partial<LabelOptions>) => void;
  onLogoAssetChange: (asset: LogoAsset | null) => void;
  onLogoSizeChange: (value: number) => void;
  onLogoSafeZoneChange: (value: boolean) => void;
}

export function ControlsPanel({
  design,
  urlValid,
  contrastRatio,
  logoSettings,
  onUrlChange,
  onStyleChange,
  onForegroundChange,
  onBackgroundChange,
  onTransparentToggle,
  onLabelChange,
  onLogoAssetChange,
  onLogoSizeChange,
  onLogoSafeZoneChange,
}: ControlsPanelProps) {
  const ratioLabel = contrastRatio.toFixed(2);

  return (
    <section className="panel panel--controls">
      <h2>Controls</h2>

      <label className="field">
        <span>Destination URL</span>
        <input
          type="url"
          placeholder="https://your-domain.com"
          value={design.url}
          onChange={(event) => onUrlChange(event.target.value)}
        />
      </label>
      {!urlValid && (
        <p className="hint hint--warning">
          Enter a full URL (including https://) to enable downloads.
        </p>
      )}

      <div className="field">
        <span>QR style</span>
        <div className="style-grid">
          {QR_STYLES.map((option) => (
            <button
              type="button"
              key={option.id}
              className={chipClass(design.style === option.id)}
              onClick={() => onStyleChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field field--dual">
        <label>
          <span>Foreground</span>
          <input
            type="color"
            value={design.foreground}
            aria-label="Foreground color"
            onChange={(event) => onForegroundChange(event.target.value)}
          />
        </label>

        <label>
          <span>Background</span>
          <input
            type="color"
            value={design.background}
            aria-label="Background color"
            disabled={design.transparentBackground}
            onChange={(event) => onBackgroundChange(event.target.value)}
          />
        </label>
      </div>

      <p
        className={`hint ${
          contrastRatio < 3 && !design.transparentBackground
            ? "hint--warning"
            : ""
        }`}
      >
        Contrast ratio: {ratioLabel}:1
      </p>

      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={design.transparentBackground}
          onChange={(event) => onTransparentToggle(event.target.checked)}
        />
        <span>Transparent background (PNG, WEBP, SVG)</span>
      </label>

      <label className="field">
        <span>Optional label</span>
        <input
          type="text"
          placeholder="Add a caption"
          value={design.label.text}
          onChange={(event) => onLabelChange({ text: event.target.value })}
        />
      </label>

      <div className="field">
        <span>Label size</span>
        <div className="style-grid">
          {LABEL_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={chipClass(design.label.size === size)}
              onClick={() => onLabelChange({ size })}
            >
              {size === "sm" ? "Small" : size === "md" ? "Medium" : "Large"}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Label weight</span>
        <div className="style-grid">
          {LABEL_WEIGHTS.map((weight) => (
            <button
              key={weight}
              type="button"
              className={chipClass(design.label.weight === weight)}
              onClick={() => onLabelChange({ weight })}
            >
              {weight}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Label alignment</span>
        <div className="style-grid">
          {LABEL_ALIGNS.map((align) => (
            <button
              key={align}
              type="button"
              className={chipClass(design.label.align === align)}
              onClick={() => onLabelChange({ align })}
            >
              {align}
            </button>
          ))}
        </div>
      </div>

      <LogoUploader
        logo={logoSettings.asset}
        size={logoSettings.size}
        safeZone={logoSettings.safeZone}
        onLogoChange={onLogoAssetChange}
        onSizeChange={onLogoSizeChange}
        onSafeZoneChange={onLogoSafeZoneChange}
      />
    </section>
  );
}

function chipClass(active: boolean) {
  return `chip ${active ? "chip--active" : ""}`;
}
