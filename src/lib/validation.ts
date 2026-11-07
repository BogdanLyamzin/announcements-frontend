import type { AnnouncementInput } from "./types.ts";

export function validateAnnouncement(input: AnnouncementInput): string | null {
  if (input.title.trim().length < 5 || input.title.trim().length > 50) return "Назва має містити від 5 до 50 символів.";
  if (input.description.trim().length < 10) return "Опис має містити щонайменше 10 символів.";
  if (!Number.isFinite(input.price) || input.price <= 0) return "Вкажіть ціну, більшу за нуль.";
  if (!["sale", "service", "job", "other"].includes(input.category)) return "Оберіть категорію.";
  return null;
}

export function validatePhoto(file: Pick<File, "size" | "type">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Оберіть фото JPG, PNG або WebP.";
  if (file.size > 5 * 1024 * 1024) return "Розмір фото має бути не більше 5 МБ.";
  return null;
}
