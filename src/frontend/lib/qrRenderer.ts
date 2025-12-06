import QRCode from "qrcode";
import type { LabelOptions, QrStyle } from "../types";

const QUIET_ZONE_MODULES = 4;
const LABEL_FONT_SIZES: Record<NonNullable<LabelOptions["size"]>, number> = {
  sm: 18,
  md: 22,
  lg: 28,
};
const STYLE_SCALE: Record<QrStyle, number> = {
  classic: 1,
  rounded: 0.78,
  dots: 0.58,
  pills: 0.64,
  outline: 0.6,
};

export interface LogoRenderOptions {
  image?: HTMLImageElement | null;
  dataUrl?: string;
  sizePercent: number;
  safeZone: boolean;
}

export interface QrRenderOptions {
  text: string;
  size: number;
  style: QrStyle;
  foreground: string;
  background: string;
  transparentBackground: boolean;
  label?: LabelOptions;
  logo?: LogoRenderOptions;
  pixelRatio?: number;
}

export type RasterFormat = "png" | "jpeg" | "webp";

interface ModuleMatrix {
  size: number;
  rows: boolean[][];
}

interface LabelLayout {
  lines: string[];
  height: number;
  font: string;
  maxWidth: number;
  lineHeight: number;
}

export async function renderQrToCanvas(
  canvas: HTMLCanvasElement,
  options: QrRenderOptions,
) {
  const { labelLayout, matrix } = await prepareCommonPieces(
    options,
    options.size,
  );

  const devicePixelRatio = options.pixelRatio ?? window.devicePixelRatio ?? 1;
  const canvasHeight = options.size + labelLayout.height;
  canvas.width = Math.round(options.size * devicePixelRatio);
  canvas.height = Math.round(canvasHeight * devicePixelRatio);
  canvas.style.width = `${options.size}px`;
  canvas.style.height = `${canvasHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context unavailable");
  }

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  ctx.clearRect(0, 0, options.size, canvasHeight);

  if (!options.transparentBackground) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, options.size, canvasHeight);
  }

  drawModules(ctx, matrix, options);
  drawLogo(ctx, matrix, options);
  drawLabel(ctx, labelLayout, options);
}

export async function exportRasterImage(
  format: RasterFormat,
  options: QrRenderOptions,
) {
  const canvas = document.createElement("canvas");
  const safeOptions =
    format === "jpeg"
      ? { ...options, transparentBackground: false }
      : options;

  await renderQrToCanvas(canvas, {
    ...safeOptions,
    pixelRatio: 1,
  });

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Unable to generate image blob"));
        }
      },
      `image/${format}`,
      format === "jpeg" ? 0.92 : 0.95,
    );
  });
}

export async function exportSvgMarkup(options: QrRenderOptions) {
  const { labelLayout, matrix } = await prepareCommonPieces(
    options,
    options.size,
  );
  const { moduleSize, offset } = computeModuleSize(matrix.size, options.size);
  const labelStart = options.size;
  const totalHeight = options.size + labelLayout.height;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${totalHeight}" viewBox="0 0 ${options.size} ${totalHeight}" role="img" aria-label="QR code">`,
  );

  if (!options.transparentBackground) {
    parts.push(
      `<rect width="100%" height="${totalHeight}" fill="${escapeAttribute(
        options.background,
      )}"/>`,
    );
  }

  const fillColor = escapeAttribute(options.foreground);
  const styleScale = getStyleScale(options.style);
  parts.push(`<g fill="${fillColor}" stroke="${fillColor}">`);

  matrix.rows.forEach((row, y) => {
    if (options.style === "pills") {
      appendPillRowSvg(
        parts,
        row,
        y,
        moduleSize,
        offset,
        matrix.size,
        styleScale,
      );
      return;
    }

    row.forEach((isDark, x) => {
      if (!isDark) return;
      const baseX = offset + x * moduleSize;
      const baseY = offset + y * moduleSize;

      if (isFinderModule(x, y, matrix.size)) {
        parts.push(
          `<rect x="${baseX}" y="${baseY}" width="${moduleSize}" height="${moduleSize}"/>`,
        );
        return;
      }

      switch (options.style) {
        case "dots": {
          const radius = (moduleSize * styleScale) / 2;
          const cx = baseX + moduleSize / 2;
          const cy = baseY + moduleSize / 2;
          parts.push(`<circle cx="${cx}" cy="${cy}" r="${radius}"/>`);
          break;
        }
        case "rounded": {
          const size = moduleSize * styleScale;
          const inset = (moduleSize - size) / 2;
          parts.push(
            `<rect x="${baseX + inset}" y="${baseY + inset}" width="${size}" height="${size}" rx="${
              size * 0.35
            }" ry="${size * 0.35}"/>`,
          );
          break;
        }
        case "outline": {
          const size = moduleSize * styleScale;
          const inset = (moduleSize - size) / 2;
          const strokeWidth = Math.max(1, size * 0.3);
          parts.push(
            `<rect x="${baseX + inset}" y="${baseY + inset}" width="${size}" height="${size}" fill="none" stroke="${fillColor}" stroke-width="${strokeWidth}" rx="${strokeWidth / 1.5}"/>`,
          );
          break;
        }
        default: {
          parts.push(
            `<rect x="${baseX}" y="${baseY}" width="${moduleSize}" height="${moduleSize}"/>`,
          );
        }
      }
    });
  });
  parts.push("</g>");

  if (options.logo?.dataUrl) {
    const logoSize = (matrix.size * moduleSize * options.logo.sizePercent) / 100;
    const x = options.size / 2 - logoSize / 2;
    const y = options.size / 2 - logoSize / 2;
    if (options.logo.safeZone) {
      parts.push(
        `<rect x="${x - 10}" y="${y - 10}" width="${logoSize + 20}" height="${logoSize + 20}" rx="${(logoSize + 20) / 5}" fill="#ffffff"/>`,
      );
    }
    parts.push(
      `<image href="${escapeAttribute(
        options.logo.dataUrl,
      )}" x="${x}" y="${y}" width="${logoSize}" height="${logoSize}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  const labelOptions = options.label;
  if (labelLayout.lines.length > 0 && labelOptions) {
    const padding = 18;
    const textY = labelStart + 12;
    const textAnchor = mapLabelAlign(labelOptions.align);

    labelLayout.lines.forEach((line, index) => {
      const y = textY + index * labelLayout.lineHeight;
      const x = computeLabelX(options.size, padding, labelOptions.align);
      parts.push(
        `<text x="${x}" y="${y}" font-family="Inter, 'Segoe UI', sans-serif" font-size="${LABEL_FONT_SIZES[labelOptions.size]}" font-weight="${
          labelOptions.weight === "bold" ? 700 : 500
        }" text-anchor="${textAnchor}" fill="${escapeAttribute(
          options.foreground,
        )}">${escapeXml(line)}</text>`,
      );
    });
  }

  parts.push("</svg>");

  return parts.join("");
}

async function prepareCommonPieces(options: QrRenderOptions, size: number) {
  const matrix = await buildMatrix(
    options.text,
    Boolean(options.logo?.image || options.logo?.dataUrl),
  );
  const labelLayout = computeLabelLayout(options.label, size);
  return { matrix, labelLayout };
}

function computeLabelLayout(
  label: LabelOptions | undefined,
  width: number,
): LabelLayout {
  if (!label || !label.text.trim()) {
    return { lines: [], height: 0, font: "", maxWidth: width, lineHeight: 0 };
  }

  const fontSize = LABEL_FONT_SIZES[label.size];
  const lineHeight = fontSize + 6;
  const font = `${label.weight === "bold" ? 700 : 500} ${fontSize}px Inter, 'Segoe UI', sans-serif`;
  const measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) {
    return { lines: [label.text], height: lineHeight + 16, font, maxWidth: width, lineHeight };
  }
  ctx.font = font;
  const maxWidth = width - 32;
  const words = label.text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const tentative = current ? `${current} ${word}` : word;
    if (ctx.measureText(tentative).width <= maxWidth || !current) {
      current = tentative;
    } else {
      lines.push(current);
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  const trimmedLines = lines.slice(0, 3);
  const height = trimmedLines.length * lineHeight + 24;
  return { lines: trimmedLines, height, font, maxWidth, lineHeight };
}

async function buildMatrix(text: string, preferHighEcc: boolean) {
  const qr = QRCode.create(text, {
    errorCorrectionLevel: preferHighEcc ? "H" : "Q",
  });

  if (!qr.modules || !qr.modules.data) {
    throw new Error("Failed to create QR matrix");
  }

  const { size, data } = qr.modules;
  const rows: boolean[][] = [];

  for (let y = 0; y < size; y += 1) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x += 1) {
      const index = y * size + x;
      row.push(Boolean((data as boolean[])[index]));
    }
    rows.push(row);
  }

  return { size, rows };
}

function drawModules(
  ctx: CanvasRenderingContext2D,
  matrix: ModuleMatrix,
  options: QrRenderOptions,
) {
  const { moduleSize, offset } = computeModuleSize(matrix.size, options.size);
  const styleScale = getStyleScale(options.style);
  ctx.fillStyle = options.foreground;
  ctx.strokeStyle = options.foreground;

  matrix.rows.forEach((row, y) => {
    if (options.style === "pills") {
      drawPillRow(ctx, row, y, moduleSize, offset, matrix.size, styleScale);
      return;
    }

    row.forEach((isDark, x) => {
      if (!isDark) return;
      const drawX = offset + x * moduleSize;
      const drawY = offset + y * moduleSize;

      if (isFinderModule(x, y, matrix.size)) {
        ctx.fillRect(drawX, drawY, moduleSize, moduleSize);
        return;
      }

      switch (options.style) {
        case "dots": {
          const radius = (moduleSize * styleScale) / 2;
          ctx.beginPath();
          ctx.arc(drawX + moduleSize / 2, drawY + moduleSize / 2, radius, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "rounded": {
          const size = moduleSize * styleScale;
          const inset = (moduleSize - size) / 2;
          drawRoundedRect(
            ctx,
            drawX + inset,
            drawY + inset,
            size,
            size,
            size * 0.35,
          );
          break;
        }
        case "outline": {
          const size = moduleSize * styleScale;
          const inset = (moduleSize - size) / 2;
          ctx.lineWidth = Math.max(1, size * 0.3);
          ctx.strokeRect(drawX + inset, drawY + inset, size, size);
          break;
        }
        default: {
          ctx.fillRect(drawX, drawY, moduleSize, moduleSize);
        }
      }
    });
  });
}

function drawPillRow(
  ctx: CanvasRenderingContext2D,
  row: boolean[],
  rowIndex: number,
  moduleSize: number,
  offset: number,
  matrixSize: number,
  styleScale: number,
) {
  let runStart = -1;
  const verticalInset = (moduleSize - moduleSize * styleScale) / 2;
  const horizontalInset = (moduleSize - moduleSize * styleScale) / 2;
  const height = moduleSize * styleScale;

  const flushRun = (runEnd: number) => {
    const widthUnits = runEnd - runStart;
    if (widthUnits <= 0) {
      runStart = -1;
      return;
    }
    const width =
      widthUnits * moduleSize - horizontalInset * 2;
    const drawX = offset + runStart * moduleSize + horizontalInset;
    const drawY = offset + rowIndex * moduleSize + verticalInset;
    drawRoundedRect(
      ctx,
      drawX,
      drawY,
      Math.max(width, moduleSize * 0.35),
      height,
      height / 2,
    );
    runStart = -1;
  };

  row.forEach((isDark, x) => {
    if (isDark && isFinderModule(x, rowIndex, matrixSize)) {
      if (runStart !== -1) {
        flushRun(x);
      }
      const drawX = offset + x * moduleSize;
      const drawY = offset + rowIndex * moduleSize;
      ctx.fillRect(drawX, drawY, moduleSize, moduleSize);
      return;
    }

    if (isDark) {
      if (runStart === -1) {
        runStart = x;
      }
      const isLast = x === row.length - 1;
      if (isLast) {
        flushRun(x + 1);
      }
      return;
    }

    if (!isDark && runStart !== -1) {
      flushRun(x);
    }
  });
}

function appendPillRowSvg(
  parts: string[],
  row: boolean[],
  rowIndex: number,
  moduleSize: number,
  offset: number,
  matrixSize: number,
  styleScale: number,
) {
  let runStart = -1;
  const verticalInset = (moduleSize - moduleSize * styleScale) / 2;
  const horizontalInset = (moduleSize - moduleSize * styleScale) / 2;
  const height = moduleSize * styleScale;

  const flushRun = (runEnd: number) => {
    const widthUnits = runEnd - runStart;
    if (widthUnits <= 0) {
      runStart = -1;
      return;
    }
    const width =
      widthUnits * moduleSize - horizontalInset * 2;
    const drawX = offset + runStart * moduleSize + horizontalInset;
    const drawY = offset + rowIndex * moduleSize + verticalInset;
    const rx = height / 2;
    parts.push(
      `<rect x="${drawX}" y="${drawY}" width="${Math.max(width, moduleSize * 0.35)}" height="${height}" rx="${rx}" ry="${rx}"/>`,
    );
    runStart = -1;
  };

  row.forEach((isDark, x) => {
    if (isDark && isFinderModule(x, rowIndex, matrixSize)) {
      if (runStart !== -1) {
        flushRun(x);
      }
      const baseX = offset + x * moduleSize;
      const baseY = offset + rowIndex * moduleSize;
      parts.push(
        `<rect x="${baseX}" y="${baseY}" width="${moduleSize}" height="${moduleSize}"/>`,
      );
      return;
    }

    if (isDark) {
      if (runStart === -1) {
        runStart = x;
      }
      const isLast = x === row.length - 1;
      if (isLast) {
        flushRun(x + 1);
      }
      return;
    }

    if (!isDark && runStart !== -1) {
      flushRun(x);
    }
  });
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  matrix: ModuleMatrix,
  options: QrRenderOptions,
) {
  if (!options.logo?.image) {
    return;
  }

  const { moduleSize } = computeModuleSize(matrix.size, options.size);
  const qrArea = matrix.size * moduleSize;
  const logoSize = (qrArea * options.logo.sizePercent) / 100;
  const x = options.size / 2 - logoSize / 2;
  const y = options.size / 2 - logoSize / 2;

  if (options.logo.safeZone) {
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(ctx, x - 12, y - 12, logoSize + 24, logoSize + 24, (logoSize + 24) * 0.2);
  }

  ctx.drawImage(options.logo.image, x, y, logoSize, logoSize);
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  layout: LabelLayout,
  options: QrRenderOptions,
) {
  if (!options.label || layout.lines.length === 0) {
    return;
  }

  const padding = 18;
  const baseY = options.size + 12;
  ctx.fillStyle = options.foreground;
  ctx.font = layout.font;
  ctx.textBaseline = "top";
  ctx.textAlign = options.label.align as CanvasTextAlign;

  const x = computeLabelX(options.size, padding, options.label.align);
  layout.lines.forEach((line, index) => {
    ctx.fillText(line, x, baseY + index * layout.lineHeight);
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function computeModuleSize(moduleCount: number, size: number) {
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const moduleSize = size / totalModules;
  const offset = moduleSize * QUIET_ZONE_MODULES;
  return { moduleSize, offset };
}

function isFinderModule(x: number, y: number, size: number) {
  const inTop = y < 7;
  const inBottom = y >= size - 7;
  const inLeft = x < 7;
  const inRight = x >= size - 7;
  return (inTop && inLeft) || (inTop && inRight) || (inBottom && inLeft);
}

function getStyleScale(style: QrStyle) {
  return STYLE_SCALE[style] ?? 1;
}

function escapeXml(value: string) {
  return value.replace(/[<>&"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}

function escapeAttribute(value: string) {
  return value.replace(/["']/g, (char) => (char === '"' ? "&quot;" : "&apos;"));
}

function mapLabelAlign(align: LabelOptions["align"]) {
  switch (align) {
    case "left":
      return "start";
    case "right":
      return "end";
    default:
      return "middle";
  }
}

function computeLabelX(
  size: number,
  padding: number,
  align: LabelOptions["align"],
) {
  if (align === "left") {
    return padding;
  }
  if (align === "right") {
    return size - padding;
  }
  return size / 2;
}
