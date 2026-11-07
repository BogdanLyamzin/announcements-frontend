import { NextRequest, NextResponse } from "next/server";
import { backendUrl, isAllowedRoute, isSameOrigin } from "@/lib/gateway";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ACCESS = "board_access";
const REFRESH = "board_refresh";
type Context = { params: Promise<{ path: string[] }> };

function clearTokens(response: NextResponse) {
  for (const name of [ACCESS, REFRESH]) response.cookies.set(name, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

async function proxy(request: NextRequest, context: Context) {
  const { path: segments } = await context.params;
  const path = segments.join("/");
  if (!isAllowedRoute(path, request.method)) return NextResponse.json({ message: "Route not found" }, { status: 404 });

  const origin = request.headers.get("origin");
  // NextURL normalizes loopback hostnames; Host preserves the browser's origin.
  if (request.method !== "GET" && origin && !isSameOrigin(origin, request.headers.get("host"), request.nextUrl.protocol)) {
    return NextResponse.json({ message: "Origin not allowed" }, { status: 403 });
  }

  const access = request.cookies.get(ACCESS)?.value;
  const refresh = request.cookies.get(REFRESH)?.value;
  if ((path === "auth/me" || path === "auth/refresh") && !access && !refresh) {
    return NextResponse.json({ message: "Увійдіть до облікового запису.", code: "NO_SESSION" }, { status: 401 });
  }

  const headers = new Headers({ Accept: "application/json" });
  if (access) headers.set("Authorization", `Bearer ${access}`);
  const contentType = request.headers.get("content-type");
  let body: BodyInit | undefined;
  if (path === "auth/refresh") {
    if (!refresh) return NextResponse.json({ message: "Сесія завершилася.", code: "NO_SESSION" }, { status: 401 });
    headers.set("Content-Type", "application/json");
    body = JSON.stringify({ refreshToken: refresh });
  } else if (request.method !== "GET" && request.method !== "DELETE") {
    if (contentType) headers.set("Content-Type", contentType);
    body = await request.arrayBuffer();
  }

  try {
    const target = backendUrl(process.env.BACKEND_URL || "http://127.0.0.1:3000", path, request.nextUrl.search);
    const upstream = await fetch(target, {
      method: request.method, headers, body, cache: "no-store",
      redirect: "manual", signal: AbortSignal.timeout(15_000),
    });
    const responseHeaders = new Headers({ "Cache-Control": "no-store" });
    for (const key of ["content-type", "retry-after"]) {
      const value = upstream.headers.get(key);
      if (value) responseHeaders.set(key, value);
    }

    let response: NextResponse;
    if (["auth/register", "auth/login", "auth/refresh"].includes(path) && upstream.ok) {
      const data = await upstream.json();
      if (typeof data.accessToken !== "string" || typeof data.refreshToken !== "string") {
        return NextResponse.json({ message: "API має повернути accessToken і refreshToken згідно з ДЗ." }, { status: 502 });
      }
      response = NextResponse.json(data.user ? { user: data.user } : { ok: true }, { status: upstream.status, headers: responseHeaders });
      const cookie = { httpOnly: true, sameSite: "lax" as const, secure: request.nextUrl.protocol === "https:", path: "/" };
      response.cookies.set(ACCESS, data.accessToken, { ...cookie, maxAge: 15 * 60 });
      response.cookies.set(REFRESH, data.refreshToken, { ...cookie, maxAge: 7 * 24 * 60 * 60 });
    } else {
      response = new NextResponse(upstream.status === 204 ? null : await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
    }

    if ((path === "auth/logout" && (upstream.ok || upstream.status === 401)) || (path === "auth/refresh" && upstream.status === 401)) clearTokens(response);
    return response;
  } catch {
    return NextResponse.json({ message: "Сервер тимчасово недоступний. Спробуйте ще раз пізніше." }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
