import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import net from "node:net";
import { startFixture } from "./fixture-api.mjs";

const fixture = await startFixture();
const portProbe = net.createServer();
await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
const port = portProbe.address().port;
await new Promise((resolve) => portProbe.close(resolve));
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(port)], {
  cwd: process.cwd(), env: { ...process.env, BACKEND_URL: `${fixture.url}/api` }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
});
let logs = "";
child.stdout.on("data", (data) => { logs += data; });
child.stderr.on("data", (data) => { logs += data; });
const cookies = new Map();
async function request(path, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("Origin", base);
  headers.set("Cookie", [...cookies].map(([key, value]) => `${key}=${value}`).join("; "));
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(`${base}/api/backend${path}`, { ...options, headers });
  for (const cookie of response.headers.getSetCookie()) {
    const [name, ...value] = cookie.split(";")[0].split("=");
    if (/Max-Age=0/i.test(cookie)) cookies.delete(name); else cookies.set(name, value.join("="));
  }
  return response;
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt++) {
    if (child.exitCode !== null) throw new Error(logs);
    try { ready = (await fetch(base)).ok; } catch {}
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(ready, `Next.js did not start: ${logs}`);
  for (const path of ["/", "/login", "/register", "/announcements/new", "/announcements/1", "/announcements/1/edit"]) assert.equal((await fetch(`${base}${path}`)).status, 200, path);
  assert.equal((await fetch(`${base}/announcements/abc`)).status, 404);
  let response = await request("/auth/me");
  assert.equal(response.status, 401);
  assert.equal((await response.json()).code, "NO_SESSION");
  assert.equal(fixture.requests.length, 0, "anonymous me should not consume backend auth rate limits");

  response = await request("/announcements?page=2&sort=oldest&search=");
  let body = await response.json();
  assert.equal(body.data.length, 2);
  assert.equal(body.pagination.total, 12);
  assert.equal(fixture.requests.at(-1).path, "/api/announcements");
  assert.equal((await request("/announcements/9999")).status, 404);

  response = await request("/auth/login", { method: "POST", body: JSON.stringify({ username: "olena", password: "wrong" }) });
  assert.equal(response.status, 401);
  response = await request("/auth/login", { method: "POST", body: JSON.stringify({ username: "olena", password: "secret123" }) });
  body = await response.json();
  assert.equal(body.user.username, "olena");
  assert.equal(body.accessToken, undefined);
  assert.equal(body.refreshToken, undefined);
  assert.equal(cookies.size, 2);
  assert.ok(response.headers.getSetCookie().every((cookie) => /HttpOnly/i.test(cookie) && /SameSite=lax/i.test(cookie)));
  assert.equal((await (await request("/auth/me")).json()).id, 1);

  const photo = new FormData();
  photo.set("title", "Мій новий велосипед"); photo.set("description", "Велосипед у чудовому стані"); photo.set("price", "5000"); photo.set("category", "sale");
  photo.set("image", new File(["fixture-file"], "photo.png", { type: "image/png" }));
  response = await request("/announcements", { method: "POST", body: photo });
  assert.equal(response.status, 201);
  body = await response.json();
  const createdId = body.id;
  assert.equal(fixture.requests.at(-1).multipart, true);
  assert.equal(fixture.requests.at(-1).body.image.name, "photo.png");
  assert.equal(body.price, 5000);
  assert.equal((await request("/announcements/2", { method: "PATCH", body: JSON.stringify({ title: "Чуже оголошення" }) })).status, 403);
  response = await request(`/announcements/${createdId}`, { method: "PATCH", body: JSON.stringify({ price: 4500 }) });
  assert.equal((await response.json()).price, 4500);

  cookies.set("board_access", "expired-token");
  assert.equal((await request("/auth/me")).status, 401);
  assert.equal((await request("/auth/refresh", { method: "POST" })).status, 200);
  assert.equal(fixture.refreshCount, 1);
  assert.equal((await request("/auth/me")).status, 200);
  response = await request(`/announcements/${createdId}`, { method: "DELETE" });
  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.equal((await request(`/announcements/${createdId}`)).status, 404);

  const callsBefore = fixture.requests.length;
  assert.equal((await request("/admin/secrets")).status, 404);
  response = await fetch(`${base}/api/backend/announcements`, { method: "POST", headers: { Origin: "https://foreign.example", "Content-Type": "application/json" }, body: "{}" });
  assert.equal(response.status, 403);
  assert.equal(fixture.requests.length, callsBefore);
  assert.equal((await request("/auth/logout", { method: "POST" })).status, 204);
  assert.equal(cookies.size, 0);

  response = await request("/auth/register", { method: "POST", body: JSON.stringify({ username: "newstudent", password: "secret123", name: "Студент", email: "student@example.com" }) });
  assert.equal(response.status, 201);
  assert.equal((await response.json()).user.username, "newstudent");
  cookies.set("board_refresh", "expired-refresh");
  assert.equal((await request("/auth/refresh", { method: "POST" })).status, 401);
  assert.equal(cookies.size, 0);

  fixture.server.closeAllConnections();
  await fixture.close();
  assert.equal((await request("/announcements")).status, 502);
  console.log("PASS: pages, public list, search/pagination, login/register, HttpOnly cookies, multipart, ownership errors, token rotation, delete/logout, route/origin restrictions, unavailable backend.");
} finally {
  if (child.exitCode === null) { child.kill(); await once(child, "exit"); }
  fixture.server.closeAllConnections();
  if (fixture.server.listening) await fixture.close();
}
