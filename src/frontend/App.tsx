import { useMemo, useState } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { QrPreview } from "./components/QrPreview";
import type {
  LabelOptions,
  LogoAsset,
  LogoSettings,
  QrDesignState,
} from "./types";
import { getContrastRatio } from "./lib/color";

const initialDesign: QrDesignState = {
  url: "https://example.com",
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

  const urlValid = useMemo(() => isLikelyUrl(design.url), [design.url]);
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

  const handleLabelChange = (partial: Partial<LabelOptions>) => {
    setDesign((prev) => ({
      ...prev,
      label: { ...prev.label, ...partial },
    }));
  };

  const handleLogoAssetChange = (asset: LogoAsset | null) => {
    setLogoSettings((prev) => ({ ...prev, asset }));
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
          urlValid={urlValid}
          contrastRatio={contrastRatio}
          logoSettings={logoSettings}
          onUrlChange={(value) =>
            setDesign((prev) => ({
              ...prev,
              url: value,
            }))
          }
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
          urlValid={urlValid}
          warnings={contrastWarnings}
        />
      </main>
    </div>
  );
}

function isLikelyUrl(value: string) {
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    return false;
  }
}
