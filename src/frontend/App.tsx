import { useMemo, useState } from "react";

const QR_STYLES = [
  { id: "classic", label: "Classic" },
  { id: "rounded", label: "Rounded" },
  { id: "dots", label: "Dots" },
  { id: "pills", label: "Pills" },
  { id: "outline", label: "Outline" },
];

const LABEL_SIZES = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Medium" },
  { id: "lg", label: "Large" },
];

export default function App() {
  const [url, setUrl] = useState("https://example.com");
  const [style, setStyle] = useState(QR_STYLES[0].id);
  const [foreground, setForeground] = useState("#111111");
  const [background, setBackground] = useState("#ffffff");
  const [transparentBg, setTransparentBg] = useState(false);
  const [label, setLabel] = useState("");
  const [labelSize, setLabelSize] = useState(LABEL_SIZES[1].id);
  const [labelWeight, setLabelWeight] = useState<"regular" | "bold">("regular");

  const canDownload = useMemo(
    () => url.trim().length > 0 && isLikelyUrl(url),
    [url],
  );

  return (
    <div className="app-shell">
      <header className="app-shell__header">
        <div>
          <p className="eyebrow">QR Crafter</p>
          <h1>Design branded QR codes in seconds.</h1>
          <p className="lede">
            Enter a URL, experiment with visual styles, adjust colors, and get
            a quick preview. All downloads will stay disabled until a valid URL
            is provided.
          </p>
        </div>
      </header>

      <main className="app-shell__main">
        <section className="panel panel--controls">
          <h2>Controls</h2>

          <label className="field">
            <span>Destination URL</span>
            <input
              type="url"
              placeholder="https://your-domain.com"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </label>

          <div className="field">
            <span>QR Style</span>
            <div className="style-grid">
              {QR_STYLES.map((option) => (
                <button
                  type="button"
                  key={option.id}
                  className={`chip ${style === option.id ? "chip--active" : ""}`}
                  onClick={() => setStyle(option.id)}
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
                value={foreground}
                aria-label="Foreground color"
                onChange={(event) => setForeground(event.target.value)}
              />
            </label>

            <label>
              <span>Background</span>
              <input
                type="color"
                value={background}
                aria-label="Background color"
                onChange={(event) => setBackground(event.target.value)}
                disabled={transparentBg}
              />
            </label>
          </div>

  <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(event) => setTransparentBg(event.target.checked)}
            />
            <span>Transparent background (PNG/WEBP/SVG)</span>
          </label>

          <label className="field">
            <span>Optional label</span>
            <input
              type="text"
              placeholder="Add a caption"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>

          <div className="field">
            <span>Label size</span>
            <div className="style-grid">
              {LABEL_SIZES.map((size) => (
                <button
                  type="button"
                  key={size.id}
                  className={`chip ${labelSize === size.id ? "chip--active" : ""}`}
                  onClick={() => setLabelSize(size.id)}
                >
                  {size.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span>Label weight</span>
            <div className="style-grid">
              {["regular", "bold"].map((weight) => (
                <button
                  type="button"
                  key={weight}
                  className={`chip ${
                    labelWeight === weight ? "chip--active" : ""
                  }`}
                  onClick={() =>
                    setLabelWeight(weight as "regular" | "bold")
                  }
                >
                  {weight}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel panel--preview">
          <h2>Preview</h2>

          <div className="preview-card">
            <div
              className="mock-qr"
              style={{
                "--mock-qr-foreground": foreground,
                "--mock-qr-background": transparentBg ? "transparent" : background,
              } as React.CSSProperties}
            >
              <div className="mock-qr__logo">Logo</div>
            </div>

            {label && (
              <p
                className={`preview-label preview-label--${labelSize} preview-label--${labelWeight}`}
              >
                {label}
              </p>
            )}
          </div>

          <div className="downloads">
            {["jpeg", "png", "svg", "webp"].map((format) => (
              <button
                key={format}
                className="download-button"
                type="button"
                disabled={!canDownload}
              >
                Download {format.toUpperCase()}
              </button>
            ))}
          </div>

          {!canDownload && (
            <p className="hint">
              Enter a valid URL to unlock the download buttons.
            </p>
          )}
        </section>
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
