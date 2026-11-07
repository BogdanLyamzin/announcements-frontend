export type Category = "sale" | "service" | "job" | "other";
export type Sort = "newest" | "oldest";

export interface User {
  id: number;
  username: string;
  email: string;
  name: string;
  createdAt?: string;
}

export interface Announcement {
  id: number;
  title: string;
  description: string;
  price: number;
  category: Category;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface AnnouncementsResponse {
  data: Announcement[];
  pagination: { total: number; page: number; totalPages: number; perPage: number };
}

export interface AnnouncementInput {
  title: string;
  description: string;
  price: number;
  category: Category;
}

export interface Credentials { username: string; password: string }
export interface Registration extends Credentials { email: string; name: string }

export const categories: Record<Category, string> = {
  sale: "Продаж",
  service: "Послуги",
  job: "Робота",
  other: "Інше",
};

export function isOwner(announcement: Announcement, user: User | null): boolean {
  return user !== null && String(announcement.user.id) === String(user.id);
}
