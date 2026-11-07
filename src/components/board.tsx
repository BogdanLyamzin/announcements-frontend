"use client";

import Link from "next/link";
import { ArrowDownUp, ArrowLeft, ArrowRight, ArrowUpRight, BriefcaseBusiness, Check, Package, Plus, RefreshCw, Search, Sparkles, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useAnnouncements } from "@/hooks/use-announcements";
import type { Sort } from "@/lib/types";
import { AnnouncementCard } from "./announcement-card";

export function Board() {
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(1);
  const { result, loading, error, updatedAt, refreshAnnouncements } = useAnnouncements(search, sort, page);

  useEffect(() => {
    const timer = setTimeout(() => { setSearch(input.trim()); setPage(1); }, 350);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    if (!loading && !error && result && page > Math.max(1, result.pagination.totalPages)) setPage(Math.max(1, result.pagination.totalPages));
  }, [result, loading, error, page]);

  return <>
    <section className="hero">
      <div className="hero-copy"><div className="eyebrow"><span /> МІСЦЕ ДЛЯ КОРИСНИХ ЗНАХІДОК</div><h1>Хороші речі.<br /><span>Поруч із вами.</span></h1><p>Знайдіть потрібне, запропонуйте своє.<br className="desktop-break" /> Тут починаються маленькі вдалі домовленості.</p><div className="hero-categories"><span><Package size={15} /> Речі</span><span><Wrench size={15} /> Послуги</span><span><BriefcaseBusiness size={15} /> Робота</span></div></div>
      <div className="hero-art" aria-hidden="true"><div className="art-grid" /><span className="art-spark"><Sparkles size={33} /></span><div className="art-note note-back"><span className="note-pin" /><Package size={39} /><span>Комусь саме<br />цього бракує.</span></div><div className="art-note note-front"><span className="note-label">ЗНАЙШЛОСЯ ПОРУЧ</span><span className="note-heart">↗</span><strong>Ваше наступне<br />«саме те».</strong><span className="note-line" /><span className="note-check"><Check size={13} /> Більше можливостей</span></div><span className="art-sticker">ДІЛІТЬСЯ<br />КОРИСНИМ</span></div>
    </section>
    <section className="board-section" aria-labelledby="board-heading">
      <div className="board-heading"><div className="section-title"><h2 id="board-heading">Усі оголошення</h2>{result && <span className="count-badge">{result.pagination.total}</span>}</div><button className="text-button refresh-button" onClick={() => void refreshAnnouncements()} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} /> Оновити список</button></div>
      <div className="filters"><div className="search-field"><Search size={20} /><input aria-label="Пошук оголошень за назвою" placeholder="Що ви шукаєте?" value={input} onChange={(event) => setInput(event.target.value)} />{input && <button className="icon-button" aria-label="Очистити пошук" onClick={() => setInput("")}><X size={16} /></button>}</div><label className="sort-field"><ArrowDownUp size={17} /><span className="sr-only">Порядок сортування</span><select value={sort} onChange={(event) => { setSort(event.target.value as Sort); setPage(1); }}><option value="newest">Спочатку нові</option><option value="oldest">Спочатку старі</option></select></label></div>
      <div className="list-status" aria-live="polite"><span>{search ? <>Результати пошуку «{search}»</> : "Від людей для людей"}</span><span className="updated-status">{loading ? "Завантажуємо…" : error ? "Не вдалося оновити" : updatedAt ? `Оновлено о ${updatedAt.toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" })}` : ""}</span></div>
      {error ? <div className="empty-state error-state" role="alert"><span className="empty-icon"><RefreshCw size={28} /></span><h3>Не вдалося завантажити оголошення</h3><p>{error}</p><button className="button secondary" onClick={() => void refreshAnnouncements()}>Спробувати ще раз <ArrowRight size={17} /></button></div>
        : loading ? <div className="cards-grid" aria-label="Завантаження оголошень" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="skeleton-card" key={i}><div /><span /><span /><span /></div>)}</div>
        : !result?.data.length ? <div className="empty-state"><span className="empty-icon">{search ? <Search size={29} /> : <Package size={29} />}</span><h3>{search ? "Поки що нічого не знайшли" : "Перше оголошення може бути вашим"}</h3><p>{search ? "Спробуйте іншу назву або очистіть пошук." : "Запропонуйте річ, послугу чи можливість — нехай про неї дізнаються інші."}</p>{search ? <button className="button secondary" onClick={() => setInput("")}>Очистити пошук</button> : <Link href="/announcements/new" className="button primary"><Plus size={18} /> Створити оголошення</Link>}</div>
        : <div className="cards-grid">{result.data.map((announcement) => <AnnouncementCard key={announcement.id} announcement={announcement} />)}</div>}
      {!error && result && result.pagination.totalPages > 1 && <nav className="pagination" aria-label="Сторінки оголошень"><button className="button secondary" disabled={loading || page === 1} onClick={() => setPage(page - 1)}><ArrowLeft size={16} /> Назад</button><span>Сторінка <strong>{page}</strong> з {result.pagination.totalPages}</span><button className="button secondary" disabled={loading || page >= result.pagination.totalPages} onClick={() => setPage(page + 1)}>Далі <ArrowRight size={16} /></button></nav>}
    </section>
    <aside className="join-banner"><span className="banner-icon"><Sparkles size={25} /></span><div><h3>У вас є щось корисне?</h3><p>Можливо, хтось поруч саме це шукає.</p></div><Link href="/announcements/new" className="text-button">Розмістити оголошення <ArrowUpRight size={18} /></Link></aside>
  </>;
}
