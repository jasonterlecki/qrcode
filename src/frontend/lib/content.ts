import type {
  QrContentState,
  QrContentType,
  VcardContent,
  WifiContent,
} from "../types";

export interface ContentPayload {
  value: string;
  valid: boolean;
  summary: string;
  message?: string;
}

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
