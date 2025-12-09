import QRCode from "qrcode";
import type { LabelOptions, QrStyle } from "../types";

const QUIET_ZONE_MODULES = 4;
const LABEL_FONT_SCALE: Record<NonNullable<LabelOptions["size"]>, number> = {
  sm: 0.045,
  md: 0.06,
  lg: 0.08,
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

interface LogoClip {
  x: number;
  y: number;
  size: number;
  contentSize: number;
  padding: number;
}

interface LabelLayout {
  lines: string[];
  lineWidths: number[];
  contentWidth: number;
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
  const geometry = computeModuleSize(matrix.size, options.size);
  const logoClip = computeLogoClip(matrix.size, geometry.moduleSize, options);
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
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, options.size, canvasHeight);

  if (!options.transparentBackground) {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, options.size, canvasHeight);
  }

  drawFinderPatterns(ctx, matrix.size, geometry, options);
  drawModules(ctx, matrix, options, geometry, logoClip);
  drawLogo(ctx, options, logoClip);
  drawLabel(ctx, labelLayout, options, geometry, matrix.size);
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
  const geometry = computeModuleSize(matrix.size, options.size);
  const logoClip = computeLogoClip(matrix.size, geometry.moduleSize, options);
  const { moduleSize, offset } = geometry;
  const totalHeight = options.size + labelLayout.height;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${options.size}" height="${totalHeight}" viewBox="0 0 ${options.size} ${totalHeight}" role="img" aria-label="QR code" shape-rendering="crispEdges">`,
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
  appendFinderPatternsSvg(parts, matrix.size, geometry, options);

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
        logoClip,
      );
      return;
    }

    row.forEach((isDark, x) => {
      if (!isDark) return;
      const baseX = offset + x * moduleSize;
      const baseY = offset + y * moduleSize;

      if (isFinderModule(x, y, matrix.size)) {
        return;
      }
      if (
        logoClip &&
        moduleWithinClip(baseX, baseY, moduleSize, moduleSize, logoClip)
      ) {
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

  if (options.logo?.dataUrl && logoClip) {
    if (options.logo.safeZone && logoClip.padding > 0) {
      parts.push(
        `<rect x="${logoClip.x}" y="${logoClip.y}" width="${logoClip.size}" height="${logoClip.size}" rx="${logoClip.size * 0.15}" fill="#ffffff"/>`,
      );
    }
    const logoX = logoClip.x + logoClip.padding;
    const logoY = logoClip.y + logoClip.padding;
    parts.push(
      `<image href="${escapeAttribute(
        options.logo.dataUrl,
      )}" x="${logoX}" y="${logoY}" width="${logoClip.contentSize}" height="${logoClip.contentSize}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }

  const labelOptions = options.label;
  if (labelLayout.lines.length > 0 && labelOptions) {
    const padding = 18;
    const paddingX = Math.max(
      10,
      Math.round(labelLayout.lineHeight * 0.55),
    );
    const paddingY = Math.max(
      6,
      Math.round(labelLayout.lineHeight * 0.2),
    );
    const qrBottom =
      geometry.offset + geometry.moduleSize * matrix.size;
    const baseY =
      qrBottom - Math.max(4, Math.round(labelLayout.lineHeight * 0.25));
    const textAnchor = mapLabelAlign(labelOptions.align);
    const textColor = escapeAttribute(
      labelOptions.invert ? options.background : options.foreground,
    );
    const backgroundColor = escapeAttribute(options.foreground);

    labelLayout.lines.forEach((line, index) => {
      const y = baseY + index * labelLayout.lineHeight;
      const x = computeLabelX(options.size, padding, labelOptions.align);
      const lineWidth = labelLayout.lineWidths[index] ?? labelLayout.contentWidth;

      if (labelOptions.invert) {
        const rectWidth = lineWidth + paddingX * 2;
        const rectHeight = labelLayout.lineHeight + paddingY;
        const rectX = computeLabelRectX(
          x,
          rectWidth,
          paddingX,
          labelOptions.align,
        );
        parts.push(
          `<rect x="${rectX}" y="${y - paddingY / 2}" width="${rectWidth}" height="${rectHeight}" fill="${backgroundColor}"${buildRadiusAttr(rectHeight * 0.4)}/>`,
        );
      }

      parts.push(
        `<text x="${x}" y="${y}" font-family="Inter, 'Segoe UI', sans-serif" font-size="${LABEL_FONT_SCALE[labelOptions.size] * options.size}" font-weight="${
          labelOptions.weight === "bold" ? 700 : 500
        }" text-anchor="${textAnchor}" fill="${textColor}">${escapeXml(line)}</text>`,
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
    return {
      lines: [],
      lineWidths: [],
      contentWidth: 0,
      height: 0,
      font: "",
      maxWidth: width,
      lineHeight: 0,
    };
  }

  const fontSize = Math.round(
    LABEL_FONT_SCALE[label.size] * width,
  );
  const lineHeight = fontSize + Math.max(8, fontSize * 0.12);
  const font = `${label.weight === "bold" ? 700 : 500} ${fontSize}px Inter, 'Segoe UI', sans-serif`;
  const measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) {
    const fallbackWidth = Math.min(width - 32, label.text.length * fontSize * 0.45);
    return {
      lines: [label.text],
      lineWidths: [fallbackWidth],
      contentWidth: fallbackWidth,
      height: lineHeight + 24,
      font,
      maxWidth: width,
      lineHeight,
    };
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
  const lineWidths = trimmedLines.map((line) =>
    Math.min(maxWidth, ctx.measureText(line).width),
  );
  const contentWidth = lineWidths.reduce((max, value) => Math.max(max, value), 0);
  const height = trimmedLines.length * lineHeight + 8;
  return {
    lines: trimmedLines,
    lineWidths,
    contentWidth,
    height,
    font,
    maxWidth,
    lineHeight,
  };
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
  geometry: { moduleSize: number; offset: number },
  logoClip: LogoClip | null,
) {
  const { moduleSize, offset } = geometry;
  const styleScale = getStyleScale(options.style);
  ctx.fillStyle = options.foreground;
  ctx.strokeStyle = options.foreground;

  matrix.rows.forEach((row, y) => {
    if (options.style === "pills") {
      drawPillRow(
        ctx,
        row,
        y,
        moduleSize,
        offset,
        matrix.size,
        styleScale,
        logoClip,
      );
      return;
    }

    row.forEach((isDark, x) => {
      if (!isDark) return;
      const baseX = offset + x * moduleSize;
      const baseY = offset + y * moduleSize;
      if (
        logoClip &&
        moduleWithinClip(baseX, baseY, moduleSize, moduleSize, logoClip)
      ) {
        return;
      }
      const rect = getAlignedRect(baseX, baseY, moduleSize);

      if (isFinderModule(x, y, matrix.size)) {
        return;
      }

      switch (options.style) {
        case "dots": {
          const radius = (rect.width * styleScale) / 2;
          const centerX = rect.x + rect.width / 2;
          const centerY = rect.y + rect.height / 2;
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case "rounded": {
          const size = moduleSize * styleScale;
          const inset = (moduleSize - size) / 2;
          const adjusted = getAlignedRect(baseX + inset, baseY + inset, size);
          drawRoundedRect(
            ctx,
            adjusted.x,
            adjusted.y,
            adjusted.width,
            adjusted.height,
            size * 0.35,
          );
          break;
        }
        case "outline": {
          const size = moduleSize * styleScale;
          const inset = (moduleSize - size) / 2;
          const adjusted = getAlignedRect(baseX + inset, baseY + inset, size);
          ctx.lineWidth = Math.max(1, size * 0.3);
          ctx.strokeRect(adjusted.x, adjusted.y, adjusted.width, adjusted.height);
          break;
        }
        default: {
          ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
        }
      }
    });
  });
}

function drawFinderPatterns(
  ctx: CanvasRenderingContext2D,
  matrixSize: number,
  geometry: { moduleSize: number; offset: number },
  options: QrRenderOptions,
) {
  const { moduleSize, offset } = geometry;
  const maxIndex = matrixSize - 7;
  const positions: Array<[number, number]> = [
    [offset, offset],
    [offset + maxIndex * moduleSize, offset],
    [offset, offset + maxIndex * moduleSize],
  ];
  positions.forEach(([x, y]) => {
    drawFinderPattern(ctx, x, y, moduleSize, options);
  });
}

function drawFinderPattern(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  moduleSize: number,
  options: QrRenderOptions,
) {
  const outerSize = moduleSize * 7;
  const middleSize = moduleSize * 5;
  const centerSize = moduleSize * 3;
  const radius = getFinderRadius(options.style, outerSize);

  const outerRect = getAlignedRect(x, y, outerSize);
  drawRoundedRect(
    ctx,
    outerRect.x,
    outerRect.y,
    outerRect.width,
    outerRect.height,
    radius,
    options.foreground,
  );

  const middleRect = getAlignedRect(
    x + moduleSize,
    y + moduleSize,
    middleSize,
  );
  if (options.transparentBackground) {
    ctx.clearRect(middleRect.x, middleRect.y, middleRect.width, middleRect.height);
  } else {
    drawRoundedRect(
      ctx,
      middleRect.x,
      middleRect.y,
      middleRect.width,
      middleRect.height,
      Math.min(radius * 0.8, middleRect.width / 2),
      options.background,
    );
  }

  const centerRect = getAlignedRect(
    x + moduleSize * 2,
    y + moduleSize * 2,
    centerSize,
  );
  drawRoundedRect(
    ctx,
    centerRect.x,
    centerRect.y,
    centerRect.width,
    centerRect.height,
    Math.min(radius * 0.6, centerRect.width / 2),
    options.foreground,
  );
}

function drawPillRow(
  ctx: CanvasRenderingContext2D,
  row: boolean[],
  rowIndex: number,
  moduleSize: number,
  offset: number,
  matrixSize: number,
  styleScale: number,
  logoClip: LogoClip | null,
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
      return;
    }

    if (isDark) {
      const baseX = offset + x * moduleSize;
      const baseY = offset + rowIndex * moduleSize;
      if (
        logoClip &&
        moduleWithinClip(baseX, baseY, moduleSize, moduleSize, logoClip)
      ) {
        if (runStart !== -1) {
          flushRun(x);
        }
        return;
      }
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

function appendFinderPatternsSvg(
  parts: string[],
  matrixSize: number,
  geometry: { moduleSize: number; offset: number },
  options: QrRenderOptions,
) {
  const { moduleSize, offset } = geometry;
  const maxIndex = matrixSize - 7;
  const positions: Array<[number, number]> = [
    [offset, offset],
    [offset + maxIndex * moduleSize, offset],
    [offset, offset + maxIndex * moduleSize],
  ];
  const foreground = escapeAttribute(options.foreground);
  positions.forEach(([x, y]) => {
    appendFinderPatternSvg(parts, x, y, moduleSize, options, foreground);
  });
}

function appendFinderPatternSvg(
  parts: string[],
  x: number,
  y: number,
  moduleSize: number,
  options: QrRenderOptions,
  foreground: string,
) {
  const outerSize = moduleSize * 7;
  const middleSize = moduleSize * 5;
  const centerSize = moduleSize * 3;
  const radius = getFinderRadius(options.style, outerSize);
  const outerAttr = buildRadiusAttr(radius);
  const middleAttr = buildRadiusAttr(Math.min(radius * 0.8, middleSize / 2));
  const innerAttr = buildRadiusAttr(Math.min(radius * 0.6, centerSize / 2));

  parts.push(
    `<rect x="${x}" y="${y}" width="${outerSize}" height="${outerSize}" fill="${foreground}"${outerAttr}/>`,
  );

  if (!options.transparentBackground) {
    parts.push(
      `<rect x="${x + moduleSize}" y="${y + moduleSize}" width="${middleSize}" height="${middleSize}" fill="${escapeAttribute(options.background)}"${middleAttr}/>`,
    );
  }

  parts.push(
    `<rect x="${x + moduleSize * 2}" y="${y + moduleSize * 2}" width="${centerSize}" height="${centerSize}" fill="${foreground}"${innerAttr}/>`,
  );
}

function appendPillRowSvg(
  parts: string[],
  row: boolean[],
  rowIndex: number,
  moduleSize: number,
  offset: number,
  matrixSize: number,
  styleScale: number,
  logoClip: LogoClip | null,
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
      return;
    }

    if (isDark) {
      const baseX = offset + x * moduleSize;
      const baseY = offset + rowIndex * moduleSize;
      if (
        logoClip &&
        moduleWithinClip(baseX, baseY, moduleSize, moduleSize, logoClip)
      ) {
        if (runStart !== -1) {
          flushRun(x);
        }
        return;
      }
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
  options: QrRenderOptions,
  logoClip: LogoClip | null,
) {
  if (!options.logo?.image || !logoClip) {
    return;
  }

  if (options.logo.safeZone && logoClip.padding > 0) {
    ctx.fillStyle = "#ffffff";
    drawRoundedRect(
      ctx,
      logoClip.x,
      logoClip.y,
      logoClip.size,
      logoClip.size,
      logoClip.size * 0.15,
    );
  }

  ctx.drawImage(
    options.logo.image,
    logoClip.x + logoClip.padding,
    logoClip.y + logoClip.padding,
    logoClip.contentSize,
    logoClip.contentSize,
  );
}

function drawLabel(
  ctx: CanvasRenderingContext2D,
  layout: LabelLayout,
  options: QrRenderOptions,
  geometry: { moduleSize: number; offset: number },
  matrixSize: number,
) {
  if (!options.label || layout.lines.length === 0) {
    return;
  }

  const paddingX = Math.max(10, Math.round(layout.lineHeight * 0.55));
  const paddingY = Math.max(6, Math.round(layout.lineHeight * 0.2));
  const paddingOffset = 18;
  const qrBottom =
    geometry.offset + geometry.moduleSize * matrixSize;
  const baseY = qrBottom - Math.max(4, Math.round(layout.lineHeight * 0.25));
  const labelOptions = options.label;
  const textColor = labelOptions.invert
    ? options.background
    : options.foreground;
  ctx.font = layout.font;
  ctx.textBaseline = "top";
  ctx.textAlign = labelOptions.align as CanvasTextAlign;

  const anchorX = computeLabelX(options.size, paddingOffset, labelOptions.align);
  layout.lines.forEach((line, index) => {
    const lineWidth = layout.lineWidths[index] ?? layout.contentWidth;
    const lineY = baseY + index * layout.lineHeight;

    if (labelOptions.invert) {
      const rectWidth = lineWidth + paddingX * 2;
      const rectHeight = layout.lineHeight + paddingY;
      const rectX = computeLabelRectX(
        anchorX,
        rectWidth,
        paddingX,
        labelOptions.align,
      );
      drawRoundedRect(
        ctx,
        rectX,
        lineY - paddingY / 2,
        rectWidth,
        rectHeight,
        rectHeight * 0.45,
        options.foreground,
      );
    }

    ctx.fillStyle = textColor;
    ctx.fillText(line, anchorX, lineY);
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle?: string,
) {
  const previousFill = fillStyle !== undefined ? ctx.fillStyle : null;
  if (fillStyle !== undefined) {
    ctx.fillStyle = fillStyle;
  }
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
  if (previousFill !== null && fillStyle !== undefined) {
    ctx.fillStyle = previousFill;
  }
}

function computeModuleSize(moduleCount: number, size: number) {
  const totalModules = moduleCount + QUIET_ZONE_MODULES * 2;
  const moduleSize = size / totalModules;
  const offset = moduleSize * QUIET_ZONE_MODULES;
  return { moduleSize, offset };
}

function computeLogoClip(
  matrixSize: number,
  moduleSize: number,
  options: QrRenderOptions,
): LogoClip | null {
  const hasLogo =
    options.logo &&
    (options.logo.image || options.logo.dataUrl) &&
    options.logo.sizePercent > 0;
  if (!hasLogo) {
    return null;
  }
  const qrPixelArea = matrixSize * moduleSize;
  const contentSize = (qrPixelArea * options.logo!.sizePercent) / 100;
  const padding = options.logo!.safeZone ? Math.max(moduleSize * 1.5, 8) : 0;
  const size = contentSize + padding * 2;
  const start = options.size / 2 - size / 2;
  return { x: start, y: start, size, contentSize, padding };
}

function moduleWithinClip(
  moduleX: number,
  moduleY: number,
  width: number,
  height: number,
  clip: LogoClip,
) {
  const right = moduleX + width;
  const bottom = moduleY + height;
  return (
    moduleX < clip.x + clip.size &&
    right > clip.x &&
    moduleY < clip.y + clip.size &&
    bottom > clip.y
  );
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

function buildRadiusAttr(radius: number) {
  if (!radius || radius <= 0) {
    return "";
  }
  const value = Number(radius.toFixed(2));
  return ` rx="${value}" ry="${value}"`;
}

function getFinderRadius(style: QrStyle, size: number) {
  switch (style) {
    case "dots":
      return size / 2;
    case "rounded":
      return size * 0.2;
    case "pills":
      return size * 0.25;
    default:
      return 0;
  }
}

function getAlignedRect(x: number, y: number, size: number) {
  const precise = size === Math.round(size);
  if (precise) {
    const snapped = Math.round(x);
    return {
      x: snapped,
      y: Math.round(y),
      width: Math.max(1, Math.round(size)),
      height: Math.max(1, Math.round(size)),
    };
  }

  const x1 = Math.floor(x + 0.5);
  const y1 = Math.floor(y + 0.5);
  const x2 = Math.floor(x + size + 0.5);
  const y2 = Math.floor(y + size + 0.5);
  return {
    x: x1,
    y: y1,
    width: Math.max(1, x2 - x1),
    height: Math.max(1, y2 - y1),
  };
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

function computeLabelRectX(
  anchorX: number,
  rectWidth: number,
  paddingX: number,
  align: LabelOptions["align"],
) {
  if (align === "left") {
    return anchorX - paddingX;
  }
  if (align === "right") {
    return anchorX - rectWidth + paddingX;
  }
  return anchorX - rectWidth / 2;
}
