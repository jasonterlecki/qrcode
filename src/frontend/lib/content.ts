import type {
  PaymentContent,
  QrContentState,
  QrContentType,
  SocialContent,
  SocialPlatform,
  VcardContent,
  WifiContent,
} from "../types";

export interface ContentPayload {
  value: string;
  valid: boolean;
  summary: string;
  message?: string;
}

const SOCIAL_PLATFORM_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "X / Twitter",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
};

const SOCIAL_URL_BUILDERS: Record<SocialPlatform, (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${encodeURIComponent(handle)}`,
  facebook: (handle) => `https://facebook.com/${encodeURIComponent(handle)}`,
  twitter: (handle) => `https://twitter.com/${encodeURIComponent(handle)}`,
  linkedin: (handle) =>
    `https://www.linkedin.com/in/${encodeURIComponent(handle)}`,
  tiktok: (handle) => `https://www.tiktok.com/@${encodeURIComponent(handle)}`,
  youtube: (handle) =>
    `https://www.youtube.com/@${encodeURIComponent(handle)}`,
  threads: (handle) => `https://www.threads.net/@${encodeURIComponent(handle)}`,
};

export function buildContentPayload(
  type: QrContentType,
  content: QrContentState,
): ContentPayload {
  switch (type) {
    case "url": {
      const url = content.url.trim();
      const valid = isLikelyUrl(url);
      return {
        value: url,
        valid,
        summary: url || "URL",
        message: valid ? undefined : "Enter a valid URL (https://example.com).",
      };
    }
    case "text": {
      const text = content.text.trim();
      const valid = text.length > 0;
      return {
        value: text,
        valid,
        summary: text ? `${text.slice(0, 32)}${text.length > 32 ? "…" : ""}` : "Text",
        message: valid ? undefined : "Add some text to encode.",
      };
    }
    case "wifi": {
      const ssid = content.wifi.ssid.trim();
      const password = content.wifi.password.trim();
      const valid =
        Boolean(ssid) &&
        (content.wifi.security === "nopass" || Boolean(password));
      return {
        value: valid ? buildWifiString(content.wifi) : "",
        valid,
        summary: ssid ? `Wi-Fi: ${ssid}` : "Wi-Fi network",
        message: !ssid
          ? "Enter the Wi-Fi network name (SSID)."
          : content.wifi.security !== "nopass" && !password
            ? "Password is required for secured networks."
            : undefined,
      };
    }
    case "vcard": {
      const fullName = content.vcard.name.trim();
      const valid = Boolean(fullName);
      return {
        value: valid ? buildVcard(content.vcard) : "",
        valid,
        summary: fullName || "Contact card",
        message: valid ? undefined : "Add at least a full name for the contact.",
      };
    }
    case "phone": {
      const normalized = normalizePhoneNumber(content.phone.number);
      const valid = Boolean(normalized);
      return {
        value: valid ? `tel:${normalized}` : "",
        valid,
        summary: normalized ? `Call ${normalized}` : "Phone call",
        message: valid
          ? undefined
          : "Enter a phone number (ideally with country code).",
      };
    }
    case "sms": {
      const normalized = normalizePhoneNumber(content.sms.number);
      const valid = Boolean(normalized);
      const message = content.sms.message.trim();
      const payload = valid
        ? `sms:${normalized}${message ? `?body=${encodeURIComponent(message)}` : ""}`
        : "";
      return {
        value: payload,
        valid,
        summary: normalized ? `SMS ${normalized}` : "SMS message",
        message: valid ? undefined : "Enter a phone number for the SMS.",
      };
    }
    case "social": {
      const url = buildSocialUrl(content.social);
      const platformLabel = SOCIAL_PLATFORM_LABELS[content.social.platform];
      const handle = sanitizeHandle(content.social.handle);
      const valid = Boolean(url);
      return {
        value: url,
        valid,
        summary: valid
          ? `${platformLabel}${handle ? ` • @${handle}` : ""}`
          : "Social profile link",
        message: valid
          ? undefined
          : "Provide a handle or custom link for this social profile.",
      };
    }
    case "payment": {
      const paymentUrl = buildPaymentUrl(content.payment);
      const payee = content.payment.payee.trim();
      const amount = sanitizeAmount(content.payment.amount);
      const summaryParts = [];
      if (payee) summaryParts.push(payee);
      if (amount) {
        const currency = (content.payment.currency || "USD").toUpperCase();
        summaryParts.push(`${currency} ${amount}`);
      }
      return {
        value: paymentUrl ?? "",
        valid: Boolean(paymentUrl),
        summary: summaryParts.length > 0 ? `Pay ${summaryParts.join(" • ")}` : "Payment link",
        message: paymentUrl ? undefined : "Enter a valid payment link URL.",
      };
    }
    default:
      return {
        value: "",
        valid: false,
        summary: "Unknown content",
        message: "Select a content type.",
      };
  }
}

export function isLikelyUrl(value: string) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return Boolean(parsed.protocol && parsed.hostname);
  } catch {
    return false;
  }
}

function buildWifiString(wifi: WifiContent) {
  const parts = [
    "WIFI:",
    `T:${wifi.security};`,
    `S:${escapeWifiField(wifi.ssid)};`,
  ];
  if (wifi.security !== "nopass") {
    parts.push(`P:${escapeWifiField(wifi.password)};`);
  }
  if (wifi.hidden) {
    parts.push("H:true;");
  }
  parts.push(";");
  return parts.join("");
}

function escapeWifiField(input: string) {
  return input.replace(/([\\;,:\"])/g, "\\$1");
}

function buildVcard(vcard: VcardContent) {
  const lines = ["BEGIN:VCARD", "VERSION:3.0"];
  const escapedName = escapeVcardField(vcard.name);
  lines.push(`FN:${escapedName}`);
  if (vcard.organization.trim()) {
    lines.push(`ORG:${escapeVcardField(vcard.organization)}`);
  }
  if (vcard.title.trim()) {
    lines.push(`TITLE:${escapeVcardField(vcard.title)}`);
  }
  if (vcard.phone.trim()) {
    lines.push(`TEL;TYPE=CELL:${escapeVcardField(vcard.phone)}`);
  }
  if (vcard.email.trim()) {
    lines.push(`EMAIL:${escapeVcardField(vcard.email)}`);
  }
  if (vcard.url.trim()) {
    lines.push(`URL:${escapeVcardField(vcard.url)}`);
  }
  if (vcard.note.trim()) {
    lines.push(`NOTE:${escapeVcardField(vcard.note)}`);
  }
  lines.push("END:VCARD");
  return lines.join("\n");
}

function escapeVcardField(input: string) {
  return input.replace(/\n/g, "\\n").replace(/,/g, "\\,");
}

function normalizePhoneNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (!digits) return "";
  return `${hasPlus ? "+" : ""}${digits}`;
}

function sanitizeHandle(input: string) {
  return input.trim().replace(/^@/, "");
}

function buildSocialUrl(social: SocialContent) {
  const custom = sanitizeUrl(social.customUrl);
  if (custom) return custom;
  const handle = sanitizeHandle(social.handle);
  if (!handle) return "";
  const builder = SOCIAL_URL_BUILDERS[social.platform];
  return builder ? builder(handle) : "";
}

function sanitizeUrl(value: string) {
  const input = value.trim();
  if (!input) return "";
  const normalized = /^[a-zA-Z]+:\/\//.test(input)
    ? input
    : `https://${input}`;
  return isLikelyUrl(normalized) ? normalized : "";
}

function sanitizeAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const amount = Number(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  return amount.toString();
}

function buildPaymentUrl(payment: PaymentContent) {
  const baseUrl = sanitizeUrl(payment.url);
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    const amount = sanitizeAmount(payment.amount);
    if (amount) {
      url.searchParams.set("amount", amount);
    }
    if (payment.currency.trim()) {
      url.searchParams.set("currency", payment.currency.trim().toUpperCase());
    }
    if (payment.payee.trim()) {
      url.searchParams.set("payee", payment.payee.trim());
    }
    if (payment.reference.trim()) {
      url.searchParams.set("reference", payment.reference.trim());
    }
    return url.toString();
  } catch {
    return null;
  }
}
