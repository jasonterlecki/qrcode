import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type {
  LabelOptions,
  LabelSize,
  LabelWeight,
  LogoAsset,
  LogoSettings,
  PaymentContent,
  QrContentType,
  QrDesignState,
  SmsContent,
  SocialContent,
  SocialPlatform,
  VcardContent,
  WifiContent,
  ThemePreset,
  DesignPresetFile,
} from "../types";
import type { LucideIcon } from "lucide-react";
import type { ContentPayload } from "../lib/content";
import { LogoUploader } from "./LogoUploader";
import {
  DownloadCloud,
  ImageIcon,
  Package,
  Palette,
  QrCode,
  Sparkles,
  Shapes,
  Type as TypeIcon,
  UploadCloud,
} from "lucide-react";
import { THEME_PRESETS } from "../lib/themes";

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
  { id: "phone", label: "Phone call" },
  { id: "sms", label: "SMS" },
  { id: "social", label: "Social profile" },
  { id: "payment", label: "Payment" },
] as const;

const WIFI_SECURITIES = [
  { id: "WPA", label: "WPA/WPA2" },
  { id: "WEP", label: "WEP" },
  { id: "nopass", label: "Open (no password)" },
] as const;

const SOCIAL_PLATFORMS: { id: SocialPlatform; label: string }[] = [
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "twitter", label: "X / Twitter" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "tiktok", label: "TikTok" },
  { id: "youtube", label: "YouTube" },
  { id: "threads", label: "Threads" },
];

const LABEL_SIZES: LabelSize[] = ["sm", "md", "lg"];
const LABEL_WEIGHTS: LabelWeight[] = ["regular", "bold"];
const LABEL_ALIGNS: LabelOptions["align"][] = ["left", "center", "right"];

interface ControlsPanelProps {
  design: QrDesignState;
  contentStatus: ContentPayload;
  contrastRatio: number;
  logoSettings: LogoSettings;
  activeThemeId: string | null;
  onApplyTheme: (theme: ThemePreset) => void;
  onPresetImport: (preset: DesignPresetFile) => void;
  onContentTypeChange: (value: QrContentType) => void;
  onUrlChange: (value: string) => void;
  onTextChange: (value: string) => void;
  onWifiChange: (partial: Partial<WifiContent>) => void;
  onVcardChange: (partial: Partial<VcardContent>) => void;
  onPhoneChange: (partial: { number: string }) => void;
  onSmsChange: (partial: Partial<SmsContent>) => void;
  onSocialChange: (partial: Partial<SocialContent>) => void;
  onPaymentChange: (partial: Partial<PaymentContent>) => void;
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
  activeThemeId,
  onApplyTheme,
  onPresetImport,
  onContentTypeChange,
  onUrlChange,
  onTextChange,
  onWifiChange,
  onVcardChange,
  onPhoneChange,
  onSmsChange,
  onSocialChange,
  onPaymentChange,
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
  const presetInputRef = useRef<HTMLInputElement | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const handleExportPreset = () => {
    const payload: DesignPresetFile = {
      version: 1,
      design,
      logo: logoSettings,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    triggerJsonDownload(blob, "qr-crafter-preset.json");
  };

  const handleImportClick = () => {
    presetInputRef.current?.click();
  };

  const handlePresetFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as DesignPresetFile;
        if (!parsed.design) {
          throw new Error("Design missing");
        }
        onPresetImport(parsed);
        setImportError(null);
      } catch (error) {
        setImportError("Invalid preset file. Please select a file exported by QR Crafter.");
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  return (
    <section className="panel panel--controls">
      <h2>Controls</h2>
      <input
        ref={presetInputRef}
        type="file"
        accept="application/json"
        hidden
        onChange={handlePresetFileChange}
      />

      <div className="controls-grid">
        <div className="controls-card controls-card--wide">
          <SectionHeading icon={QrCode} text="Content" />
          <p className="hint">
            Choose the payload type and fill out the contextual fields. Downloads
            unlock once the payload is valid.
          </p>
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
          {renderContentFields(
            design.contentType,
            design.content,
            {
              onUrlChange,
              onTextChange,
              onWifiChange,
              onVcardChange,
              onPhoneChange,
              onSmsChange,
              onSocialChange,
              onPaymentChange,
            },
          )}
          <p className="hint">
            Payload preview: {contentStatus.summary || "—"}
          </p>
          {contentStatus.message && (
            <p className="hint hint--warning">{contentStatus.message}</p>
          )}
        </div>

        <div className="controls-card">
          <SectionHeading icon={Shapes} text="Style" />
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

          <SectionHeading icon={Palette} text="Colors" />
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
        </div>

        <div className="controls-card">
          <SectionHeading icon={TypeIcon} text="Label" />
          <label className="field">
            <span>Caption text</span>
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

          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={design.label.invert}
              onChange={(event) =>
                onLabelChange({ invert: event.target.checked })
              }
            />
            <span>Reverse label colors</span>
          </label>
          <p className="hint">
            Swaps the label text/background colors to match the QR palette.
          </p>
        </div>

        <div className="controls-card">
          <SectionHeading icon={ImageIcon} text="Logo" />
          <p className="hint">
            Upload a PNG/JPEG/SVG/WEBP up to 4&nbsp;MB. Adjust the size slider
            and enable the safe-zone if the logo blends with modules.
          </p>
          <LogoUploader
            logo={logoSettings.asset}
            size={logoSettings.size}
            safeZone={logoSettings.safeZone}
            onLogoChange={onLogoAssetChange}
            onSizeChange={onLogoSizeChange}
            onSafeZoneChange={onLogoSafeZoneChange}
          />
        </div>

        <div className="controls-card controls-card--wide">
          <SectionHeading icon={Sparkles} text="Theme presets" />
          <div className="theme-grid">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={`theme-card ${
                  activeThemeId === preset.id ? "theme-card--active" : ""
                }`}
                onClick={() => onApplyTheme(preset)}
              >
                <div className="theme-card__swatch">
                  <span style={{ background: preset.foreground }} />
                  <span style={{ background: preset.background }} />
                </div>
                <div className="theme-card__body">
                  <strong>{preset.name}</strong>
                  <p>{preset.description}</p>
                </div>
              </button>
            ))}
          </div>

          <SectionHeading icon={Package} text="Preset files" />
          <div className="preset-actions">
            <button type="button" onClick={handleExportPreset}>
              <DownloadCloud size={16} />
              Export preset
            </button>
            <button type="button" onClick={handleImportClick}>
              <UploadCloud size={16} />
              Import preset
            </button>
          </div>
          {importError && <p className="hint hint--danger">{importError}</p>}
          <p className="hint">
            Presets capture every design setting (content, colors, style, logo) for
            quick reuse or sharing.
          </p>
        </div>
      </div>
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
    onPhoneChange: (partial: { number: string }) => void;
    onSmsChange: (partial: Partial<SmsContent>) => void;
    onSocialChange: (partial: Partial<SocialContent>) => void;
    onPaymentChange: (partial: Partial<PaymentContent>) => void;
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

  if (type === "phone") {
    return (
      <div className="content-card">
        <label className="field">
          <span>Phone number</span>
          <input
            type="tel"
            placeholder="+1 555 123 4567"
            value={content.phone.number}
            onChange={(event) =>
              handlers.onPhoneChange({ number: event.target.value })
            }
          />
        </label>
        <p className="hint">Include the country code for best compatibility.</p>
      </div>
    );
  }

  if (type === "sms") {
    return (
      <div className="content-card">
        <label className="field">
          <span>Recipient number</span>
          <input
            type="tel"
            placeholder="+1 555 123 4567"
            value={content.sms.number}
            onChange={(event) =>
              handlers.onSmsChange({ number: event.target.value })
            }
          />
        </label>
        <label className="field">
          <span>Message (optional)</span>
          <textarea
            rows={3}
            placeholder="Add the message body to prefill the SMS."
            value={content.sms.message}
            onChange={(event) =>
              handlers.onSmsChange({ message: event.target.value })
            }
          />
        </label>
      </div>
    );
  }

  if (type === "social") {
    return (
      <div className="content-card">
        <label className="field">
          <span>Platform</span>
          <select
            value={content.social.platform}
            onChange={(event) =>
              handlers.onSocialChange({
                platform: event.target.value as SocialContent["platform"],
              })
            }
          >
            {SOCIAL_PLATFORMS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Handle / username</span>
          <input
            type="text"
            placeholder="@yourname"
            value={content.social.handle}
            onChange={(event) =>
              handlers.onSocialChange({ handle: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Custom URL (optional)</span>
          <input
            type="url"
            placeholder="https://social.example/yourname"
            value={content.social.customUrl}
            onChange={(event) =>
              handlers.onSocialChange({ customUrl: event.target.value })
            }
          />
        </label>
        <p className="hint">Provide either a handle or a custom link.</p>
      </div>
    );
  }

  if (type === "payment") {
    return (
      <div className="content-card">
        <label className="field">
          <span>Payment link URL</span>
          <input
            type="url"
            placeholder="https://checkout.yourstore.com"
            value={content.payment.url}
            onChange={(event) =>
              handlers.onPaymentChange({ url: event.target.value })
            }
          />
        </label>

        <label className="field">
          <span>Payee / business name</span>
          <input
            type="text"
            placeholder="Studio One"
            value={content.payment.payee}
            onChange={(event) =>
              handlers.onPaymentChange({ payee: event.target.value })
            }
          />
        </label>

        <div className="field field--dual">
          <label>
            <span>Amount</span>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="49.00"
              value={content.payment.amount}
              onChange={(event) =>
                handlers.onPaymentChange({ amount: event.target.value })
              }
            />
          </label>

          <label>
            <span>Currency</span>
            <input
              type="text"
              placeholder="USD"
              value={content.payment.currency}
              onChange={(event) =>
                handlers.onPaymentChange({ currency: event.target.value })
              }
            />
          </label>
        </div>

        <label className="field">
          <span>Reference / memo</span>
          <input
            type="text"
            placeholder="Invoice 123"
            value={content.payment.reference}
            onChange={(event) =>
              handlers.onPaymentChange({ reference: event.target.value })
            }
          />
        </label>
        <p className="hint">
          The QR links to your payment URL and appends the optional details
          above.
        </p>
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

function triggerJsonDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

interface SectionHeadingProps {
  icon: LucideIcon;
  text: string;
}

function SectionHeading({ icon: Icon, text }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <Icon aria-hidden="true" size={18} />
      <span>{text}</span>
    </div>
  );
}
