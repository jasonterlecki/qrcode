import { useEffect, useState } from "react";

export function useLogoImage(source?: string | null) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [status, setStatus] =
    useState<"idle" | "loading" | "ready" | "error">("idle");

  useEffect(() => {
    if (!source) {
      setImage(null);
      setStatus("idle");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      setImage(img);
      setStatus("ready");
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setStatus("error");
    };
    img.src = source;

    return () => {
      cancelled = true;
    };
  }, [source]);

  return { image, status };
}
