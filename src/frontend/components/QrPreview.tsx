import { useEffect, useMemo, useRef, useState } from "react";
import type { DownloadFormat, LogoSettings, QrDesignState } from "../types";
import { useLogoImage } from "../hooks/useLogoImage";
import {
  exportRasterImage,
  exportSvgMarkup,
  renderQrToCanvas,
} from "../lib/qrRenderer";

const PREVIEW_SIZE = 360;
const EXPORT_SIZE = 1024;

const DOWNLOAD_FORMATS: DownloadFormat[] = [
  { id: "png", label: "PNG", mime: "image/png", supportsTransparency: true },
  { id: "jpeg", label: "JPEG", mime: "image/jpeg", supportsTransparency: false },
  { id: "svg", label: "SVG", mime: "image/svg+xml", supportsTransparency: true },
  { id: "webp", label: "WEBP", mime: "image/webp", supportsTransparency: true },
];

interface QrPreviewProps {
  design: QrDesignState;
  logo: LogoSettings;
  urlValid: boolean;
  warnings: string[];
}

export function QrPreview({
  design,
  logo,
  urlValid,
  warnings,
}: QrPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const { image: logoImage, status: logoStatus } = useLogoImage(
    logo.asset?.dataUrl,
  );

  const baseOptions = useMemo(() => {
    const logoPayload = logo.asset
      ? {
          image: logoImage,
          dataUrl: logo.asset.dataUrl,
          sizePercent: logo.size,
          safeZone: logo.safeZone,
        }
      : undefined;
    const labelPayload = design.label.text.trim()
      ? design.label
      : undefined;
    return {
      text: design.url.trim(),
      style: design.style,
      foreground: design.foreground,
      background: design.background,
      transparentBackground: design.transparentBackground,
      label: labelPayload,
      logo: logoPayload,
    };
  }, [
    design.url,
    design.style,
    design.foreground,
    design.background,
    design.transparentBackground,
    design.label.text,
    design.label.size,
    design.label.weight,
    design.label.align,
    logo.asset?.dataUrl,
    logo.size,
    logo.safeZone,
    logoImage,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!urlValid) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let cancelled = false;
    setIsRendering(true);
    renderQrToCanvas(canvas, {
      ...baseOptions,
      size: PREVIEW_SIZE,
    })
      .then(() => {
        if (!cancelled) {
          setRenderError(null);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setRenderError(
          error instanceof Error ? error.message : "Unable to render preview.",
        );
      })
      .finally(() => {
        if (!cancelled) {
          setIsRendering(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [baseOptions, urlValid]);

  const handleDownload = async (format: DownloadFormat) => {
    if (!urlValid) return;
    setDownloading(format.id);
    try {
      if (format.id === "svg") {
        const svgMarkup = await exportSvgMarkup({
          ...baseOptions,
          size: EXPORT_SIZE,
        });
        triggerDownload(svgMarkup, format.mime, format.id, design.style);
      } else {
        const blob = await exportRasterImage(format.id, {
          ...baseOptions,
          size: EXPORT_SIZE,
        });
        triggerBlobDownload(blob, format.mime, format.id, design.style);
      }
    } catch (error) {
      setRenderError(
        error instanceof Error
          ? error.message
          : "Unable to create the requested file.",
      );
    } finally {
      setDownloading(null);
    }
  };

  const disableDownloads =
    !urlValid || isRendering || (logo.asset && logoStatus === "loading");

  const aggregatedWarnings = [...warnings];
  if (logoStatus === "error") {
    aggregatedWarnings.push("Logo could not be loaded. Please try another file.");
  }
  if (logo.asset && logo.size >= 32) {
    aggregatedWarnings.push(
      "Large logos reduce scannability. Keep it under ~30% if possible.",
    );
  }
  if (design.transparentBackground) {
    aggregatedWarnings.push(
      "JPEG does not support transparency. We'll fall back to a solid background.",
    );
  }

  return (
    <section className="panel panel--preview">
      <h2>Preview</h2>

      <div className="preview-card">
        <canvas
          ref={canvasRef}
          className="qr-preview__canvas"
          aria-label="QR preview"
        />
        {!urlValid && (
          <p className="hint">Add a valid URL to generate your QR code.</p>
        )}
        {logoStatus === "loading" && (
          <p className="hint">Loading logo...</p>
        )}
      </div>

      {renderError && <p className="hint hint--danger">{renderError}</p>}

      {aggregatedWarnings.length > 0 && (
        <ul className="warning-list">
          {aggregatedWarnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}

      <div className="downloads">
        {DOWNLOAD_FORMATS.map((format) => (
          <button
            key={format.id}
            type="button"
            className="download-button"
            disabled={disableDownloads || downloading === format.id}
            onClick={() => handleDownload(format)}
          >
            {downloading === format.id
              ? `Preparing ${format.label}...`
              : `Download ${format.label}`}
          </button>
        ))}
      </div>
    </section>
  );
}

function triggerDownload(
  content: string,
  mime: string,
  formatId: string,
  style: string,
) {
  const blob = new Blob([content], { type: mime });
  triggerBlobDownload(blob, mime, formatId, style);
}

function triggerBlobDownload(
  blob: Blob,
  mime: string,
  formatId: string,
  style: string,
) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildFilename(formatId, style);
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildFilename(formatId: string, style: string) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}-${String(
    now.getHours(),
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
  return `qr-crafter-${style}-${timestamp}.${formatId}`;
}
