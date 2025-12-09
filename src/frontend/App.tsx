import { useMemo, useState } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { QrPreview } from "./components/QrPreview";
import type {
  LabelOptions,
  LogoAsset,
  LogoSettings,
  QrContentState,
  QrDesignState,
} from "./types";
import { getContrastRatio } from "./lib/color";
import { buildContentPayload } from "./lib/content";

const initialContent: QrContentState = {
  url: "https://example.com",
  text: "",
  wifi: {
    ssid: "",
    password: "",
    security: "WPA",
    hidden: false,
  },
  vcard: {
    name: "",
    organization: "",
    title: "",
    phone: "",
    email: "",
    url: "",
    note: "",
  },
};

const initialDesign: QrDesignState = {
  contentType: "url",
  content: initialContent,
  style: "classic",
  foreground: "#111111",
  background: "#ffffff",
  transparentBackground: false,
  label: {
    text: "",
    size: "md",
    weight: "regular",
    align: "center",
  },
};

const initialLogo: LogoSettings = {
  asset: null,
  size: 18,
  safeZone: false,
};

export default function App() {
  const [design, setDesign] = useState<QrDesignState>(initialDesign);
  const [logoSettings, setLogoSettings] = useState<LogoSettings>(initialLogo);
  const debugEnabled = import.meta.env.VITE_DEBUG_UI === "true";

  const contentPayload = useMemo(
    () => buildContentPayload(design.contentType, design.content),
    [design.contentType, design.content],
  );
  const contrastRatio = useMemo(
    () => getContrastRatio(design.foreground, design.background),
    [design.foreground, design.background],
  );
  const contrastWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!design.transparentBackground && contrastRatio < 3) {
      warnings.push(
        "Foreground and background colors have low contrast. Increase contrast for better scans.",
      );
    }
    return warnings;
  }, [design.transparentBackground, contrastRatio]);
  const contentReady = contentPayload.valid && Boolean(contentPayload.value);

  const handleLabelChange = (partial: Partial<LabelOptions>) => {
    setDesign((prev) => ({
      ...prev,
      label: { ...prev.label, ...partial },
    }));
  };

  const handleLogoAssetChange = (asset: LogoAsset | null) => {
    setLogoSettings((prev) => ({ ...prev, asset }));
  };

  const setSimpleContent = (key: "url" | "text", value: string) => {
    setDesign((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: value,
      },
    }));
  };

  const setStructuredContent = <K extends "wifi" | "vcard">(
    key: K,
    partial: Partial<QrContentState[K]>,
  ) => {
    setDesign((prev) => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: {
          ...prev.content[key],
          ...partial,
        },
      },
    }));
  };

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">QR Crafter</p>
          <h1>Design branded QR codes in seconds.</h1>
          <p className="lede">
            Customize module styles, color palettes, logos, and labels. Preview
            everything instantly and export to JPEG, PNG, SVG, or WEBP.
          </p>
        </div>
      </header>

      <main className="app-shell__main">
        <ControlsPanel
          design={design}
          contentStatus={contentPayload}
          contrastRatio={contrastRatio}
          logoSettings={logoSettings}
          onContentTypeChange={(value) =>
            setDesign((prev) => ({
              ...prev,
              contentType: value,
            }))
          }
          onUrlChange={(value) => setSimpleContent("url", value)}
          onTextChange={(value) => setSimpleContent("text", value)}
          onWifiChange={(partial) => setStructuredContent("wifi", partial)}
          onVcardChange={(partial) => setStructuredContent("vcard", partial)}
          onStyleChange={(value) =>
            setDesign((prev) => ({
              ...prev,
              style: value,
            }))
          }
          onForegroundChange={(value) =>
            setDesign((prev) => ({
              ...prev,
              foreground: value,
            }))
          }
          onBackgroundChange={(value) =>
            setDesign((prev) => ({
              ...prev,
              background: value,
            }))
          }
          onTransparentToggle={(value) =>
            setDesign((prev) => ({
              ...prev,
              transparentBackground: value,
            }))
          }
          onLabelChange={handleLabelChange}
          onLogoAssetChange={handleLogoAssetChange}
          onLogoSizeChange={(value) =>
            setLogoSettings((prev) => ({
              ...prev,
              size: value,
            }))
          }
          onLogoSafeZoneChange={(value) =>
            setLogoSettings((prev) => ({
              ...prev,
              safeZone: value,
            }))
          }
        />

        <QrPreview
          design={design}
          logo={logoSettings}
          contentReady={contentReady}
          contentMessage={contentPayload.message}
          qrValue={contentPayload.value}
          warnings={contrastWarnings}
        />
      </main>

      {debugEnabled && (
        <aside className="debug-panel" aria-live="polite">
          <div>
            <h2>Debug: Design state</h2>
            <pre>{JSON.stringify(design, null, 2)}</pre>
          </div>
          <div>
            <h2>Debug: Logo settings</h2>
            <pre>{JSON.stringify(logoSettings, null, 2)}</pre>
          </div>
          <div>
            <h2>Debug: Content payload</h2>
            <pre>{JSON.stringify(contentPayload, null, 2)}</pre>
          </div>
        </aside>
      )}
    </div>
  );
}
