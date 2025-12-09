import type {
  LabelOptions,
  LabelSize,
  LabelWeight,
  LogoAsset,
  LogoSettings,
  QrContentType,
  QrDesignState,
  VcardContent,
  WifiContent,
} from "../types";
import type { ContentPayload } from "../lib/content";
import { LogoUploader } from "./LogoUploader";

const QR_STYLES = [
  { id: "classic", label: "Classic" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "pills", label: "Pills" },
  { id: "outline", label: "Outline" },
] as const;

const CONTENT_TYPES: { id: QrContentType; label: string }[] = [
  { id: "url", label: "URL" },
  { id: "text", label: "Plain text" },
  { id: "wifi", label: "Wi-Fi login" },
  { id: "vcard", label: "vCard contact" },
] as const;

const WIFI_SECURITIES = [
  { id: "WPA", label: "WPA/WPA2" },
  { id: "WEP", label: "WEP" },
  { id: "nopass", label: "Open (no password)" },
] as const;

const LABEL_SIZES: LabelSize[] = ["sm", "md", "lg"];
const LABEL_WEIGHTS: LabelWeight[] = ["regular", "bold"];
const LABEL_ALIGNS: LabelOptions["align"][] = ["left", "center", "right"];

interface ControlsPanelProps {
  design: QrDesignState;
  contentStatus: ContentPayload;
  contrastRatio: number;
  logoSettings: LogoSettings;
  onContentTypeChange: (value: QrContentType) => void;
  onUrlChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onWifiChange: (partial: Partial<WifiContent>) => void;
  onVcardChange: (partial: Partial<VcardContent>) => void;
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
  contentStatus,
  contrastRatio,
  logoSettings,
  onContentTypeChange,
  onUrlChange,
  onTextChange,
  onWifiChange,
  onVcardChange,
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

      <div className="field">
        <span>Content type</span>
        <div className="style-grid">
          {CONTENT_TYPES.map((option) => (
            <button
              key={option.id}
              type="button"
              className={chipClass(design.contentType === option.id)}
              onClick={() => onContentTypeChange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {renderContentFields(
        design.contentType,
        design.content,
        { onUrlChange, onTextChange, onWifiChange, onVcardChange },
      )}

      <p className="hint">
        Payload preview: {contentStatus.summary || "—"}
      </p>
      {contentStatus.message && (
        <p className="hint hint--warning">{contentStatus.message}</p>
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

function renderContentFields(
  type: QrContentType,
  content: QrDesignState["content"],
  handlers: {
    onUrlChange: (value: string) => void;
    onTextChange: (value: string) => void;
    onWifiChange: (partial: Partial<WifiContent>) => void;
    onVcardChange: (partial: Partial<VcardContent>) => void;
  },
) {
  if (type === "url") {
    return (
      <label className="field">
        <span>Destination URL</span>
        <input
          type="url"
          placeholder="https://your-domain.com"
          value={content.url}
          onChange={(event) => handlers.onUrlChange(event.target.value)}
        />
      </label>
    );
  }

  if (type === "text") {
    return (
      <label className="field">
        <span>Plain text</span>
        <textarea
          rows={3}
          placeholder="Add any text, promo code, or short message."
          value={content.text}
          onChange={(event) => handlers.onTextChange(event.target.value)}
        />
      </label>
    );
  }

  if (type === "wifi") {
    return (
      <div className="content-card">
        <label className="field">
          <span>Wi-Fi network (SSID)</span>
          <input
            type="text"
            placeholder="MyNetwork"
            value={content.wifi.ssid}
            onChange={(event) => handlers.onWifiChange({ ssid: event.target.value })}
          />
        </label>

        <label className="field">
          <span>Security</span>
          <select
            value={content.wifi.security}
            onChange={(event) =>
              handlers.onWifiChange({
                security: event.target.value as WifiContent["security"],
              })
            }
          >
            {WIFI_SECURITIES.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {content.wifi.security !== "nopass" && (
          <label className="field">
            <span>Password</span>
            <input
              type="text"
              placeholder="Password"
              value={content.wifi.password}
              onChange={(event) =>
                handlers.onWifiChange({ password: event.target.value })
              }
            />
          </label>
        )}

        <label className="field field--checkbox">
          <input
            type="checkbox"
            checked={content.wifi.hidden}
            onChange={(event) =>
              handlers.onWifiChange({ hidden: event.target.checked })
            }
          />
          <span>Hidden network</span>
        </label>
      </div>
    );
  }

  return (
    <div className="content-card">
      <label className="field">
        <span>Full name</span>
        <input
          type="text"
          placeholder="Jordan Sample"
          value={content.vcard.name}
          onChange={(event) =>
            handlers.onVcardChange({ name: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>Organization</span>
        <input
          type="text"
          placeholder="Studio / Company"
          value={content.vcard.organization}
          onChange={(event) =>
            handlers.onVcardChange({ organization: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>Title</span>
        <input
          type="text"
          placeholder="Role or title"
          value={content.vcard.title}
          onChange={(event) =>
            handlers.onVcardChange({ title: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>Phone</span>
        <input
          type="tel"
          placeholder="+1 555-123-4567"
          value={content.vcard.phone}
          onChange={(event) =>
            handlers.onVcardChange({ phone: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>Email</span>
        <input
          type="email"
          placeholder="you@example.com"
          value={content.vcard.email}
          onChange={(event) =>
            handlers.onVcardChange({ email: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>Website</span>
        <input
          type="url"
          placeholder="https://your-site.com"
          value={content.vcard.url}
          onChange={(event) =>
            handlers.onVcardChange({ url: event.target.value })
          }
        />
      </label>

      <label className="field">
        <span>Notes</span>
        <textarea
          rows={2}
          placeholder="Any additional info"
          value={content.vcard.note}
          onChange={(event) =>
            handlers.onVcardChange({ note: event.target.value })
          }
        />
      </label>
    </div>
  );
}
