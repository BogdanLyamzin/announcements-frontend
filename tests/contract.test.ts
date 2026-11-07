import test from "node:test";
import assert from "node:assert/strict";
import { backendUrl, isAllowedRoute, isSameOrigin } from "../src/lib/gateway.ts";
import { validateAnnouncement, validatePhoto } from "../src/lib/validation.ts";
import { isOwner } from "../src/lib/types.ts";
import { api } from "../src/lib/api.ts";

test("only homework endpoints and methods are forwarded", () => {
  assert.equal(isAllowedRoute("announcements", "GET"), true);
  assert.equal(isAllowedRoute("announcements/12", "PATCH"), true);
  for (const path of ["announcements/../auth/login", "http://example.com", "announcements/0", "announcements/abc", "auth/current"]) assert.equal(isAllowedRoute(path, "GET"), false);
  assert.equal(isAllowedRoute("announcements/12", "PUT"), false);
  assert.equal(backendUrl("http://localhost:3000/api/", "announcements", "?search=hello&page=2").href, "http://localhost:3000/api/announcements?search=hello&page=2");
});

test("origin validation preserves loopback address and port", () => {
  assert.equal(isSameOrigin("http://127.0.0.1:3001", "127.0.0.1:3001", "http:"), true);
  assert.equal(isSameOrigin("http://localhost:3001", "localhost:3001", "http:"), true);
  assert.equal(isSameOrigin("http://foreign.example", "localhost:3001", "http:"), false);
  assert.equal(isSameOrigin("http://localhost:3002", "localhost:3001", "http:"), false);
  assert.equal(isSameOrigin("null", "localhost:3001", "http:"), false);
});

test("form validation follows homework constraints", () => {
  const valid = { title: "Велосипед", description: "Міський велосипед у доброму стані", price: 2000, category: "sale" as const };
  assert.equal(validateAnnouncement(valid), null);
  for (const input of [{ ...valid, price: 0 }, { ...valid, price: NaN }, { ...valid, title: "    a" }, { ...valid, description: "Коротко" }]) assert.ok(validateAnnouncement(input));
  assert.equal(validatePhoto({ size: 1024, type: "image/jpeg" }), null);
  assert.ok(validatePhoto({ size: 6 * 1024 * 1024, type: "image/jpeg" }));
  assert.ok(validatePhoto({ size: 1024, type: "image/svg+xml" }));
});

test("ownership is based on author id, including serialized ids", () => {
  const user = { id: 1, name: "Олена", username: "olena", email: "olena@example.com" };
  const item = { id: 1, title: "Назва", description: "Опис", price: 10, category: "sale" as const, createdAt: "", updatedAt: "", user };
  assert.equal(isOwner(item, user), true);
  assert.equal(isOwner(item, { ...user, id: 2 }), false);
  assert.equal(isOwner(item, null), false);
});

test("concurrent requests share token refresh and retry the original requests", async () => {
  const originalFetch = globalThis.fetch;
  let refreshed = false;
  let refreshCalls = 0;
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/auth/refresh")) {
      refreshCalls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      refreshed = true;
      return Response.json({ ok: true });
    }
    return refreshed ? Response.json({ id: 1 }) : Response.json({ message: "Expired" }, { status: 401 });
  };
  try {
    const responses = await Promise.all([api.me(), api.me()]);
    assert.equal(refreshCalls, 1);
    assert.equal(responses[0].id, 1);
    assert.equal(responses[1].id, 1);
  } finally { globalThis.fetch = originalFetch; }
});
