import Link from "next/link";
export default function NotFound() {
  return <div className="empty-state"><span className="overline">404</span><h1>Тут поки що порожньо</h1><p>Сторінку не знайдено. Але на дошці ще багато цікавого.</p><Link className="button primary" href="/">На головну</Link></div>;
}
