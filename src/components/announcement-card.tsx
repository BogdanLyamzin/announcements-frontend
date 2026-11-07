"use client";

import Link from "next/link";
import { ArrowUpRight, Pencil } from "lucide-react";
import { categories, isOwner, type Announcement } from "@/lib/types";
import { formatDate, formatPrice } from "@/lib/format";
import { useAuth } from "./auth-provider";
import { ListingImage } from "./ui";

export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  const { user } = useAuth();
  return <article className="announcement-card">
    <Link href={`/announcements/${announcement.id}`} className="card-visual" aria-label={`Переглянути: ${announcement.title}`}>
      <ListingImage url={announcement.imageUrl} title={announcement.title} category={announcement.category} />
      <span className={`category-badge ${announcement.category}`}>{categories[announcement.category]}</span>
      {isOwner(announcement, user) && <span className="owner-badge">Ваше</span>}
      <span className="card-arrow"><ArrowUpRight size={20} /></span>
    </Link>
    <div className="card-body"><div className="card-meta"><span>{formatDate(announcement.createdAt)}</span></div>
      <Link href={`/announcements/${announcement.id}`} className="card-title">{announcement.title}</Link>
      <p className="card-description">{announcement.description}</p>
      <p className="card-price">{formatPrice(announcement.price)}</p>
      <div className="card-footer"><span className="card-author"><span className="mini-avatar">{announcement.user.name.slice(0, 1).toUpperCase()}</span>{announcement.user.name}</span>
        {isOwner(announcement, user) && <Link className="card-edit" href={`/announcements/${announcement.id}/edit`} title="Редагувати" aria-label={`Редагувати: ${announcement.title}`}><Pencil size={15} /></Link>}
      </div>
    </div>
  </article>;
}
