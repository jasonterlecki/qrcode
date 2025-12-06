import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
import type { LogoAsset } from "../types";

const ACCEPTED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
];

const MAX_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB

interface LogoUploaderProps {
  logo: LogoAsset | null;
  size: number;
  safeZone: boolean;
  onLogoChange: (asset: LogoAsset | null) => void;
  onSizeChange: (value: number) => void;
  onSafeZoneChange: (value: boolean) => void;
}

export function LogoUploader({
  logo,
  size,
  safeZone,
  onLogoChange,
  onSizeChange,
  onSafeZoneChange,
}: LogoUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Please upload PNG, JPEG, SVG, or WEBP files.");
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("Logo file must be 4MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onLogoChange({
        dataUrl: reader.result as string,
        fileName: file.name,
        type: file.type,
      });
      setError(null);
    };
    reader.onerror = () => {
      setError("Unable to read this file.");
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onLogoChange(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="logo-uploader">
      <label className="field">
        <span>Brand logo</span>
        <input
          type="file"
          ref={inputRef}
          accept={ACCEPTED_TYPES.join(",")}
          onChange={handleFileChange}
        />
      </label>

      {error && <p className="hint hint--danger">{error}</p>}

      {logo ? (
        <div className="logo-preview">
          <img src={logo.dataUrl} alt="Uploaded logo preview" />
          <div className="logo-preview__meta">
            <p>{logo.fileName}</p>
            <button
              type="button"
              onClick={handleRemove}
              className="link-button"
            >
              Remove logo
            </button>
          </div>
        </div>
      ) : (
        <p className="hint">Upload a logo to unlock sizing options.</p>
      )}

      <label className="field">
        <span>Logo size ({size}%)</span>
        <input
          type="range"
          min={10}
          max={40}
          step={1}
          value={size}
          disabled={!logo}
          onChange={(event) => onSizeChange(Number(event.target.value))}
        />
      </label>

      <label className="field field--checkbox">
        <input
          type="checkbox"
          checked={safeZone}
          disabled={!logo}
          onChange={(event) => onSafeZoneChange(event.target.checked)}
        />
        <span>Keep a white safe zone behind the logo</span>
      </label>
    </div>
  );
}
