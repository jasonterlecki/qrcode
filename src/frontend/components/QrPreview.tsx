import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import type { DownloadFormat, LogoSettings, QrDesignState } from "../types";
import { useLogoImage } from "../hooks/useLogoImage";
import {
  exportRasterImage,
  exportSvgMarkup,
  renderQrToCanvas,
} from "../lib/qrRenderer";
import { Archive, Download } from "lucide-react";

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
  contentReady: boolean;
  contentMessage?: string;
  qrValue: string;
  contentSummary: string;
  warnings: string[];
}

export function QrPreview({
  design,
  logo,
  contentReady,
  contentMessage,
  qrValue,
  contentSummary,
  warnings,
}: QrPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [batchInput, setBatchInput] = useState("");
  const [isBatching, setIsBatching] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
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
      text: qrValue,
      style: design.style,
      foreground: design.foreground,
      background: design.background,
      transparentBackground: design.transparentBackground,
      label: labelPayload,
      logo: logoPayload,
    };
  }, [
    qrValue,
    design.style,
    design.foreground,
    design.background,
    design.transparentBackground,
    design.label.text,
    design.label.size,
    design.label.weight,
    design.label.align,
    design.label.invert,
    logo.asset?.dataUrl,
    logo.size,
    logo.safeZone,
    logoImage,
  ]);
  const summarySlug = useMemo(
    () => createSlug(contentSummary || "qr"),
    [contentSummary],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (!contentReady || !qrValue) {
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
  }, [baseOptions, contentReady, qrValue]);

  const handleDownload = async (format: DownloadFormat) => {
    if (!contentReady) return;
    setDownloading(format.id);
    try {
      if (format.id === "svg") {
        const svgMarkup = await exportSvgMarkup({
          ...baseOptions,
          size: EXPORT_SIZE,
        });
        triggerDownload(
          svgMarkup,
          format.mime,
          format.id,
          design.style,
          summarySlug,
        );
      } else {
        const blob = await exportRasterImage(format.id, {
          ...baseOptions,
          size: EXPORT_SIZE,
        });
        triggerBlobDownload(
          blob,
          format.mime,
          format.id,
          design.style,
          summarySlug,
        );
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
    !contentReady || isRendering || (logo.asset && logoStatus === "loading");

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

  const handleBatchGenerate = async () => {
    if (design.contentType !== "url") {
      setBatchMessage("Batch generation currently supports URL content only.");
      return;
    }
    const jobs = parseBatchInput(batchInput);
    if (jobs.length === 0) {
      setBatchMessage("Add at least one URL or CSV row.");
      return;
    }
    setIsBatching(true);
    setBatchMessage("Preparing ZIP...");
    try {
      const zip = new JSZip();
      for (const job of jobs) {
        const jobLabel =
          job.label !== undefined
            ? { ...design.label, text: job.label }
            : baseOptions.label;
        const labelPayload =
          jobLabel && jobLabel.text.trim() ? jobLabel : undefined;
        const blob = await exportRasterImage("png", {
          ...baseOptions,
          text: job.url,
          label: labelPayload,
          size: EXPORT_SIZE,
        });
        zip.file(
          buildFilename("png", design.style, job.slug),
          blob,
        );
      }
      const zipBlob = await zip.generateAsync({ type: "blob" });
      triggerZipDownload(zipBlob);
      setBatchMessage(`Generated ${jobs.length} PNGs.`);
    } catch (error) {
      setBatchMessage(
        error instanceof Error
          ? error.message
          : "Unable to generate the requested batch.",
      );
    } finally {
      setIsBatching(false);
    }
  };

  return (
    <section className="panel panel--preview">
      <h2>Preview</h2>

      <div className="preview-card">
        <canvas
          ref={canvasRef}
          className="qr-preview__canvas"
          aria-label="QR preview"
        />
        {!contentReady && (
          <p className="hint">
            {contentMessage ||
              "Complete the selected content fields to generate your QR code."}
          </p>
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
            <span className="download-button__icon" aria-hidden="true">
              <Download size={16} />
            </span>
            <span>
              {downloading === format.id
                ? `Preparing ${format.label}...`
                : `Download ${format.label}`}
            </span>
          </button>
        ))}
      </div>

      {design.contentType === "url" && (
        <div className="batch-tools">
          <div className="section-heading">
            <Archive size={18} />
            <span>Batch URLs (CSV or list)</span>
          </div>
          <textarea
            rows={4}
            placeholder="One URL per line, or CSV rows formatted as Label,URL"
            value={batchInput}
            onChange={(event) => setBatchInput(event.target.value)}
          />
          <p className="hint">
            We'll generate PNG files using the current design. CSV rows let you
            attach a caption per URL.
          </p>
          <button
            type="button"
            className="download-button"
            disabled={
              isBatching ||
              !batchInput.trim() ||
              !contentReady ||
              design.contentType !== "url"
            }
            onClick={handleBatchGenerate}
          >
            {isBatching ? "Preparing ZIP..." : "Generate PNG ZIP"}
          </button>
          {batchMessage && <p className="hint">{batchMessage}</p>}
        </div>
      )}
    </section>
  );
}

function triggerDownload(
  content: string,
  mime: string,
  formatId: string,
  style: string,
  slug: string,
) {
  const blob = new Blob([content], { type: mime });
  triggerBlobDownload(blob, mime, formatId, style, slug);
}

function triggerBlobDownload(
  blob: Blob,
  mime: string,
  formatId: string,
  style: string,
  slug: string,
) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildFilename(formatId, style, slug);
  anchor.click();
  URL.revokeObjectURL(url);
}

function triggerZipDownload(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = buildBatchZipName();
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildFilename(formatId: string, style: string, slug: string) {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}-${String(
    now.getHours(),
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
  return `qr-${slug}-${style}-${timestamp}.${formatId}`;
}

function buildBatchZipName() {
  const now = new Date();
  const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}${String(now.getDate()).padStart(2, "0")}-${String(
    now.getHours(),
  ).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(
    now.getSeconds(),
  ).padStart(2, "0")}`;
  return `qr-crafter-batch-${timestamp}.zip`;
}

function parseBatchInput(raw: string) {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const jobs: Array<{ url: string; label?: string; slug: string }> = [];
  lines.forEach((line) => {
    let label: string | undefined;
    let urlCandidate = line;
    const csvParts = line.split(",");
    if (csvParts.length > 1) {
      label = csvParts[0].trim();
      urlCandidate = csvParts.slice(1).join(",").trim();
    }
    const normalized = normalizeUrl(urlCandidate);
    if (!normalized) return;
    const labelText = label && label.length > 0 ? label : undefined;
    const slugSource =
      labelText || tryGetHost(normalized) || normalized;
    jobs.push({
      url: normalized,
      label: labelText,
      slug: createSlug(slugSource),
    });
  });
  return jobs;
}

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z]+:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(candidate).toString();
  } catch {
    return null;
  }
}

function tryGetHost(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function createSlug(value: string, fallback = "qr") {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return slug || fallback;
}
