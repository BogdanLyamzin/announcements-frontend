"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "./auth-provider";
import { BackLink, ErrorMessage, Spinner } from "./ui";

export function AuthForm({ mode, next = "/" }: { mode: "login" | "register"; next?: string }) {
  const register = mode === "register";
  const router = useRouter();
  const { setUser } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [visible, setVisible] = useState(false);
  const destination = next.startsWith("/") && !next.startsWith("//") && !next.includes("\\") ? next : "/";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username")).trim();
    const password = String(form.get("password"));
    try {
      const response = register
        ? await api.register({ username, password, name: String(form.get("name")).trim(), email: String(form.get("email")).trim() })
        : await api.login({ username, password });
      setUser(response.user);
      router.replace(destination);
    } catch (error) { setError(error instanceof Error ? error.message : "Спробуйте ще раз."); }
    finally { setBusy(false); }
  }
  return <div className="auth-page"><BackLink /><section className="auth-layout"><aside className="auth-aside"><div className="eyebrow">ВАШЕ КОЛО МОЖЛИВОСТЕЙ</div><h1>Знайомі речі.<br />Нові історії.</h1><p>Зберіть вдома більше простору,<br />а поруч — більше можливостей.</p><div className="auth-illustration" aria-hidden="true"><span>продати</span><span>знайти ↗</span><span>допомогти</span></div><div className="auth-aside-footer"><ShieldCheck size={19} /> Кожне оголошення має свого автора</div></aside>
      <div className="auth-form-panel"><span className="overline">РАДІ ВАС БАЧИТИ</span><h2>{register ? "Приєднуйтеся до сусідів" : "З поверненням!"}</h2><p className="form-intro">{register ? "Створіть акаунт, щоб розмістити своє перше оголошення." : "Увійдіть, щоб керувати своїми оголошеннями."}</p>
        <form onSubmit={submit} className="stack-form"><ErrorMessage message={error} />
          {register && <label>Ваше ім’я<input name="name" placeholder="Наприклад, Олена" autoComplete="name" required minLength={2} /></label>}
          <label>Ім’я користувача<input name="username" placeholder="Ваш логін" autoComplete="username" required minLength={register ? 3 : 1} maxLength={register ? 30 : undefined} /></label>
          {register && <label>Email<input name="email" type="email" placeholder="you@example.com" autoComplete="email" required /></label>}
          <label>Пароль<div className="password-field"><input name="password" type={visible ? "text" : "password"} placeholder={register ? "Щонайменше 6 символів" : "Ваш пароль"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 6 : 1} /><button type="button" className="icon-button" aria-label={visible ? "Приховати пароль" : "Показати пароль"} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>
          <button className="button primary full-width" disabled={busy}>{busy ? <Spinner /> : <>{register ? "Створити акаунт" : "Увійти"}<ArrowRight size={18} /></>}</button>
        </form>
        <p className="auth-switch">{register ? "Уже маєте акаунт?" : "Ще немає акаунту?"} <Link href={`${register ? "/login" : "/register"}?next=${encodeURIComponent(destination)}`}>{register ? "Увійти" : "Зареєструватися"}</Link></p>
      </div></section></div>;
}
