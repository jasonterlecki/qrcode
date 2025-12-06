interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function getContrastRatio(foreground: string, background: string) {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);

  if (!fg || !bg) {
    return 21;
  }

  const l1 = getRelativeLuminance(fg);
  const l2 = getRelativeLuminance(bg);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);

  return Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));
}

function hexToRgb(color: string): Rgb | null {
  const normalized = color.replace("#", "");
  if (normalized.length === 3) {
    const [r, g, b] = normalized.split("");
    return {
      r: parseInt(r + r, 16),
      g: parseInt(g + g, 16),
      b: parseInt(b + b, 16),
    };
  }

  if (normalized.length === 6) {
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16),
    };
  }

  return null;
}

function getRelativeLuminance({ r, g, b }: Rgb) {
  const [rr, gg, bb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rr + 0.7152 * gg + 0.0722 * bb;
}
