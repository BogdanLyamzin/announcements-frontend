"use client";

import { AlertCircle, ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Spinner() { return <LoaderCircle size={18} className="spin" aria-hidden="true" />; }

export function ErrorMessage({ message }: { message: string }) {
  return message ? <div className="error-message" role="alert"><AlertCircle size={19} /><span>{message}</span></div> : null;
}

export function BackLink() { return <Link className="back-link" href="/"><ArrowLeft size={17} /> До всіх оголошень</Link>; }

export function safeImageUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  try { const url = new URL(value); return ["http:", "https:"].includes(url.protocol) ? url.href : undefined; }
  catch { return undefined; }
}

export function ListingImage({ url, title, category, large = false }: { url?: string | null; title: string; category: string; large?: boolean }) {
  const source = safeImageUrl(url);
  const [failed, setFailed] = useImageError(source);
  return source && !failed
    ? <img className={large ? "detail-image" : "card-image"} src={source} alt={title} loading="lazy" onError={() => setFailed(true)} />
    : <div className={`image-placeholder ${category} ${large ? "large" : ""}`} aria-label="Фото не додано"><span className="placeholder-shape" /><span className="placeholder-caption">Без фото</span></div>;
}

// Reset the image fallback when an announcement receives a different photo.
function useImageError(source: string | undefined) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [source]);
  return [failed, setFailed] as const;
}
