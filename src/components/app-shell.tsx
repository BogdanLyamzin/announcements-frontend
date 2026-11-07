"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, LayoutGrid, LogOut, Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "./auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function handleLogout() {
    setBusy(true); setError("");
    try { await logout(); }
    catch (error) { setError(error instanceof Error ? error.message : "Не вдалося вийти."); }
    finally { setBusy(false); }
  }
  return <>
    <header className="site-header"><div className="container header-inner">
      <Link href="/" className="brand" aria-label="Сусіди — головна"><span className="brand-symbol"><LayoutGrid size={23} strokeWidth={2.5} /></span>сусіди<span className="brand-dot">.</span></Link>
      <nav className="main-nav" aria-label="Головна навігація"><Link href="/" className={pathname === "/" ? "nav-link active" : "nav-link"}>Дошка оголошень</Link></nav>
      <div className="header-actions">
        {loading ? <span className="auth-skeleton" /> : user ? <>
          <span className="user-pill"><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span>{user.name}</span></span>
          <button className="icon-button logout-button" onClick={handleLogout} disabled={busy} title="Вийти" aria-label="Вийти"><LogOut size={18} /></button>
        </> : <Link className="login-link" href="/login">Увійти <ArrowUpRight size={15} /></Link>}
        <Link href="/announcements/new" className="button primary header-create"><Plus size={18} /><span>Додати оголошення</span></Link>
      </div>
    </div></header>
    {error && <div className="container shell-error" role="alert">{error}</div>}
    <main className="container main-content">{children}</main>
    <footer className="site-footer"><div className="container footer-inner"><Link href="/" className="footer-brand">сусіди.</Link><span>Речі, послуги й можливості поруч.</span><span className="footer-note">Дошка оголошень спільноти</span></div></footer>
  </>;
}
