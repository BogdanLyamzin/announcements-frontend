import type { Announcement, AnnouncementsResponse, Credentials, Registration, Sort, User } from "./types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; this.name = "ApiError"; }
}

const messages: Record<string, string> = {
  "Invalid credentials": "Неправильне ім’я користувача або пароль.",
  "Username or email already taken": "Це ім’я користувача або email вже зайняті.",
  "Access denied": "Змінювати можна лише власні оголошення.",
  "Too many requests, please try again later": "Забагато спроб. Спробуйте пізніше.",
  "Validation failed": "Перевірте правильність заповнення полів.",
};

let refreshing: Promise<void> | null = null;

export async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  let response: Response;
  try {
    response = await fetch(`/api/backend${path}`, { ...init, headers, credentials: "same-origin", cache: "no-store" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError(0, "Немає з’єднання. Перевірте мережу та спробуйте знову.");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  const canRefresh = !["/auth/login", "/auth/register", "/auth/refresh"].includes(path);
  if (response.status === 401 && retry && canRefresh && data?.code !== "NO_SESSION") {
    if (!refreshing) refreshing = request<void>("/auth/refresh", { method: "POST" }, false).finally(() => { refreshing = null; });
    try { await refreshing; }
    catch (error) {
      if (error instanceof ApiError && error.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event("board:session-expired"));
      throw error;
    }
    return request<T>(path, init, false);
  }
  if (!response.ok) {
    if (response.status === 401 && canRefresh && typeof window !== "undefined") window.dispatchEvent(new Event("board:session-expired"));
    const raw = typeof data?.message === "string" ? data.message : typeof data?.error === "string" ? data.error : "Не вдалося виконати запит.";
    const details = data?.details?.fieldErrors ?? data?.errors?.fieldErrors;
    const firstDetail = details ? Object.values(details).flat().find((value) => typeof value === "string") : null;
    throw new ApiError(response.status, firstDetail ? `${messages[raw] ?? raw} ${firstDetail}` : messages[raw] ?? raw);
  }
  return data as T;
}

export const api = {
  me: () => request<User>("/auth/me"),
  login: (body: Credentials) => request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body: Registration) => request<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  announcements: (search: string, sort: Sort, page: number, signal?: AbortSignal) => request<AnnouncementsResponse>(`/announcements?${new URLSearchParams({ search, sort, page: String(page) })}`, { signal }),
  announcement: (id: number, signal?: AbortSignal) => request<Announcement>(`/announcements/${id}`, { signal }),
  create: (body: FormData | string) => request<Announcement>("/announcements", { method: "POST", body }),
  update: (id: number, body: FormData | string) => request<Announcement>(`/announcements/${id}`, { method: "PATCH", body }),
  remove: (id: number) => request<void>(`/announcements/${id}`, { method: "DELETE" }),
};
