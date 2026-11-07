const routes: Record<string, readonly string[]> = {
  "auth/register": ["POST"], "auth/login": ["POST"],
  "auth/refresh": ["POST"], "auth/logout": ["POST"], "auth/me": ["GET"],
  announcements: ["GET", "POST"],
};

export function isAllowedRoute(path: string, method: string): boolean {
  const methods = routes[path] ?? (/^announcements\/[1-9]\d*$/.test(path) ? ["GET", "PATCH", "DELETE"] : []);
  return methods.includes(method);
}

export function backendUrl(base: string, path: string, query = ""): URL {
  const url = new URL(`${base.replace(/\/+$/, "")}/${path}`);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("BACKEND_URL must use HTTP or HTTPS");
  url.search = query;
  return url;
}

export function isSameOrigin(origin: string, host: string | null, protocol: string): boolean {
  try {
    const url = new URL(origin);
    return url.origin === origin && url.host === host && url.protocol === protocol;
  } catch { return false; }
}
