"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { categories, isOwner, type Announcement, type AnnouncementInput, type Category } from "@/lib/types";
import { validateAnnouncement, validatePhoto } from "@/lib/validation";
import { useAuth } from "./auth-provider";
import { BackLink, ErrorMessage, safeImageUrl, Spinner } from "./ui";

const uploadsEnabled = process.env.NEXT_PUBLIC_UPLOADS_ENABLED !== "false";

export function AnnouncementForm({ id }: { id?: number }) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [original, setOriginal] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [loadError, setLoadError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<Category>("sale");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    api.announcement(id, controller.signal).then((item) => {
      setOriginal(item); setTitle(item.title); setDescription(item.description); setPrice(String(item.price)); setCategory(item.category);
    }).catch((error) => { if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Не вдалося завантажити оголошення."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!photo) { setPreview(""); return; }
    const url = URL.createObjectURL(photo); setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function choosePhoto(file: File | undefined) {
    setError("");
    if (!file) { setPhoto(null); return; }
    const invalid = validatePhoto(file);
    if (invalid) { setError(invalid); setPhoto(null); setFileKey((value) => value + 1); return; }
    setPhoto(file);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("");
    const input: AnnouncementInput = { title: title.trim(), description: description.trim(), price: Number(price), category };
    const invalid = validateAnnouncement(input);
    if (invalid) { setError(invalid); return; }
    const changes = Object.fromEntries(Object.entries(input).filter(([key, value]) => !original || value !== original[key as keyof AnnouncementInput]));
    if (!Object.keys(changes).length && !photo) { setError("Ви ще нічого не змінили."); return; }
    setBusy(true);
    try {
      let body: FormData | string;
      if (uploadsEnabled) {
        const form = new FormData();
        for (const [key, value] of Object.entries(changes)) form.set(key, String(value));
        if (photo) form.set(process.env.NEXT_PUBLIC_UPLOAD_FIELD || "image", photo);
        body = form;
      } else body = JSON.stringify(changes);
      const saved = id ? await api.update(id, body) : await api.create(body);
      router.push(`/announcements/${saved.id}`);
    } catch (error) {
      setError(error instanceof ApiError && error.status === 401 ? "Сесія завершилася. Увійдіть знову, щоб зберегти оголошення." : error instanceof Error ? error.message : "Не вдалося зберегти оголошення.");
    } finally { setBusy(false); }
  }

  if (authLoading || loading) return <div className="page-loading"><Spinner /> Завантажуємо…</div>;
  if (loadError) return <><BackLink /><ErrorMessage message={loadError} /></>;
  if (!user) return <div className="access-state"><BackLink /><div className="empty-state"><span className="empty-icon"><ImagePlus size={28} /></span><h1>Спочатку познайомимося</h1><p>Увійдіть або створіть акаунт, щоб розмістити своє оголошення.</p><Link className="button primary" href={`/login?next=${encodeURIComponent(id ? `/announcements/${id}/edit` : "/announcements/new")}`}>Увійти</Link></div></div>;
  if (original && !isOwner(original, user)) return <><BackLink /><div className="empty-state"><h1>Це оголошення іншого автора</h1><p>Редагувати можна лише власні оголошення.</p><Link className="button secondary" href={`/announcements/${id}`}>Переглянути оголошення</Link></div></>;

  const image = preview || safeImageUrl(original?.imageUrl);
  return <div className="editor-page"><BackLink /><div className="page-heading"><span className="overline">{id ? "ВАШЕ ОГОЛОШЕННЯ" : "ПОДІЛІТЬСЯ КОРИСНИМ"}</span><h1>{id ? "Редагувати оголошення" : "Нове оголошення"}</h1><p>{id ? "Оновіть деталі, щоб усе було актуально." : "Додайте кілька деталей — і вас знайдуть ті, кому це потрібно."}</p></div>
    <div className="editor-layout"><form className="form-card stack-form" onSubmit={submit}><ErrorMessage message={error} />
      <label>Назва оголошення<input value={title} onChange={(event) => setTitle(event.target.value)} minLength={5} maxLength={50} placeholder="Наприклад, продам міський велосипед" required /><span className="field-hint">Від 5 до 50 символів <span>{title.length}/50</span></span></label>
      <div className="form-row"><label>Категорія<select value={category} onChange={(event) => setCategory(event.target.value as Category)}>{Object.entries(categories).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label>Ціна, грн<input type="number" inputMode="decimal" min="0.01" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="0,00" required /></label></div>
      <label>Опис<textarea rows={6} value={description} onChange={(event) => setDescription(event.target.value)} minLength={10} placeholder="Розкажіть про стан, особливості та все, що варто знати." required /><span className="field-hint">Щонайменше 10 символів</span></label>
      {uploadsEnabled && <div className="photo-section"><span className="field-label">Фотографія <span className="optional">необов’язково</span></span><label className={`upload-field ${image ? "has-preview" : ""}`}>
        {image ? <img src={image} alt="Попередній перегляд фото оголошення" /> : <><Camera size={31} /><strong>Додайте фото</strong><span>JPG, PNG або WebP · до 5 МБ</span></>}
        <input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => choosePhoto(event.target.files?.[0])} aria-label="Завантажити фотографію" />
        {image && <span className="replace-photo"><ImagePlus size={16} /> Замінити фото</span>}
      </label>{photo && <button type="button" className="text-button remove-photo" onClick={() => { setPhoto(null); setFileKey((value) => value + 1); }}><X size={15} /> Скасувати вибір фото</button>}</div>}
      <div className="form-actions"><Link className="button secondary" href={id ? `/announcements/${id}` : "/"}>Скасувати</Link><button className="button primary" disabled={busy}>{busy ? <Spinner /> : <Check size={17} />}{id ? "Зберегти зміни" : "Опублікувати"}</button></div>
    </form><aside className="editor-help"><span className="help-number">01 / ВДАЛЕ ОГОЛОШЕННЯ</span><h2>Деталі мають<br />значення.</h2><ul><li><Check size={17} /><span>Зрозуміла назва допоможе знайти вас у пошуку.</span></li><li><Check size={17} /><span>Чесний опис заощадить час вам і покупцеві.</span></li><li><Check size={17} /><span>Фото допоможе роздивитися найважливіше.</span></li></ul><div className="help-author">Автор оголошення<strong>{user.name}</strong><span>@{user.username}</span></div></aside></div>
  </div>;
}
