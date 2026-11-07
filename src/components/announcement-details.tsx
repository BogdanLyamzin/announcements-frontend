"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarDays, Mail, Pencil, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { categories, isOwner, type Announcement } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { BackLink, ErrorMessage, ListingImage, Spinner } from "./ui";

export function AnnouncementDetails({ id }: { id: number }) {
  const { user } = useAuth();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    api.announcement(id, controller.signal).then(setItem).catch((error) => {
      if (!controller.signal.aborted) { setMissing(error instanceof ApiError && error.status === 404); setError(error instanceof Error ? error.message : "Не вдалося завантажити оголошення."); }
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);
  async function remove() {
    setBusy(true); setDeleteError("");
    try { await api.remove(id); dialog.current?.close(); router.push("/"); }
    catch (error) { setDeleteError(error instanceof Error ? error.message : "Не вдалося видалити оголошення."); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="page-loading"><Spinner /> Завантажуємо оголошення…</div>;
  if (!item) return <><BackLink /><div className="empty-state"><h1>{missing ? "Оголошення вже немає" : "Не вдалося відкрити оголошення"}</h1><p>{missing ? "Можливо, автор його видалив. Подивіться інші пропозиції." : error}</p><Link href="/" className="button secondary">До оголошень</Link></div></>;
  const own = isOwner(item, user);
  return <div className="detail-page"><BackLink /><div className="detail-layout"><section><div className="detail-visual"><ListingImage url={item.imageUrl} title={item.title} category={item.category} large /><span className={`category-badge ${item.category}`}>{categories[item.category]}</span></div><div className="detail-description"><h2>Про оголошення</h2><p>{item.description}</p><div className="detail-dates"><CalendarDays size={16} /><span>Опубліковано {formatDate(item.createdAt)}{item.updatedAt !== item.createdAt && ` · Оновлено ${formatDate(item.updatedAt)}`}</span></div></div></section>
    <aside className="detail-sidebar"><span className="overline">{own ? "ВАШЕ ОГОЛОШЕННЯ" : "ЗНАЙДЕНО НА СУСІДАХ"}</span><h1>{item.title}</h1><p className="detail-price">{formatPrice(item.price)}</p><div className="author-panel"><span className="avatar large-avatar">{item.user.name.slice(0, 1).toUpperCase()}</span><div><strong>{item.user.name}</strong><span>@{item.user.username}</span></div>{own && <span className="you-tag">Це ви</span>}</div>
      <a className="button primary full-width" href={`mailto:${encodeURIComponent(item.user.email)}?subject=${encodeURIComponent(item.title)}`}><Mail size={18} /> Написати автору</a><p className="contact-note">Відкриється ваш поштовий застосунок.</p>
      {own && <div className="owner-actions"><Link href={`/announcements/${id}/edit`} className="button secondary full-width"><Pencil size={17} /> Редагувати оголошення</Link><button className="text-button danger" onClick={() => { setDeleteError(""); dialog.current?.showModal(); }}><Trash2 size={16} /> Видалити оголошення</button></div>}
      <div className="detail-reference">Оголошення № {item.id}</div>
    </aside></div>
    <dialog ref={dialog} className="confirm-dialog" aria-labelledby="delete-title" onCancel={(event) => { if (busy) event.preventDefault(); }}><span className="delete-icon"><Trash2 size={25} /></span><h2 id="delete-title">Видалити оголошення?</h2><p>«{item.title}» зникне з дошки. Цю дію неможливо скасувати.</p><ErrorMessage message={deleteError} /><div className="dialog-actions"><button className="button secondary" disabled={busy} onClick={() => dialog.current?.close()}>Залишити</button><button className="button destructive" disabled={busy} onClick={() => void remove()}>{busy ? <Spinner /> : <Trash2 size={16} />} Видалити</button></div></dialog>
  </div>;
}
