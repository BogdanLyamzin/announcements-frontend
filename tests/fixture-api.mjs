// Test fixture only. This is never imported by the application.
import http from "node:http";
import { pathToFileURL } from "node:url";

export async function startFixture(port = 0) {
  let id = 20;
  let userId = 10;
  let sequence = 0;
  let refreshCount = 0;
  const users = new Map();
  const accessTokens = new Map();
  const refreshTokens = new Map();
  const requests = [];
  const owner = { id: 1, name: "Олена Коваль", username: "olena", email: "olena@example.com", createdAt: "2026-11-01T10:00:00.000Z" };
  users.set("olena", { ...owner, password: "secret123" });
  const author2 = { id: 2, name: "Андрій", username: "andrii", email: "andrii@example.com" };
  const titles = ["Міський велосипед у гарному стані", "Допоможу з доглядом за рослинами", "Шукаємо баристу до кав’ярні", "Настільна лампа з теплим світлом", "Книги для затишних вечорів", "Налаштую ваш ноутбук", "Зручне крісло для роботи", "Уроки гри на гітарі", "Керамічні горщики для квітів", "Дерев’яна полиця для книжок", "Шукаємо дизайнера на проєкт", "Рюкзак для щоденних пригод"];
  const items = titles.map((title, index) => ({ id: index + 1, title, description: "Тестове оголошення для перевірки інтерфейсу. Усі деталі можна уточнити в автора.", price: [4200, 350, 18000, 650, 300, 500][index % 6], category: ["sale", "service", "job", "sale", "other", "service"][index % 6], imageUrl: null, createdAt: new Date(Date.UTC(2026, 10, 6, 12, index)).toISOString(), updatedAt: new Date(Date.UTC(2026, 10, 6, 12, index)).toISOString(), user: index % 2 ? author2 : owner }));
  function tokens(user) {
    const accessToken = `test-access-${++sequence}`;
    const refreshToken = `test-refresh-${sequence}`;
    accessTokens.set(accessToken, user); refreshTokens.set(refreshToken, user);
    return { accessToken, refreshToken };
  }
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const path = url.pathname.replace(/^\/api/, "");
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks);
    let body = {};
    const multipart = req.headers["content-type"]?.startsWith("multipart/");
    try {
      if (raw.length && multipart) {
        const parsed = await new Request("http://localhost", { method: "POST", headers: { "Content-Type": req.headers["content-type"] }, body: raw }).formData();
        body = Object.fromEntries(parsed.entries());
      } else if (raw.length) body = JSON.parse(raw.toString());
    } catch { res.writeHead(400).end(); return; }
    requests.push({ path: url.pathname, method: req.method, body, multipart });
    const respond = (status, value) => { res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" }); res.end(status === 204 ? undefined : JSON.stringify(value)); };
    const auth = req.headers.authorization?.replace("Bearer ", "");
    const current = accessTokens.get(auth);
    if (path === "/auth/register" && req.method === "POST") {
      if (users.has(body.username)) return respond(409, { message: "Username or email already taken" });
      const user = { id: ++userId, username: body.username, name: body.name, email: body.email };
      users.set(body.username, { ...user, password: body.password });
      return respond(201, { user, ...tokens(user) });
    }
    if (path === "/auth/login" && req.method === "POST") {
      const found = users.get(body.username);
      if (!found || found.password !== body.password) return respond(401, { message: "Invalid credentials" });
      const { password, ...user } = found;
      return respond(200, { user, ...tokens(user) });
    }
    if (path === "/auth/refresh" && req.method === "POST") {
      const user = refreshTokens.get(body.refreshToken);
      if (!user) return respond(401, { message: "Invalid refresh token" });
      refreshCount++; refreshTokens.delete(body.refreshToken);
      return respond(200, tokens(user));
    }
    if (path === "/auth/me") return current ? respond(200, current) : respond(401, { message: "Unauthorized" });
    if (path === "/auth/logout") {
      if (!current) return respond(401, { message: "Unauthorized" });
      for (const [token, user] of refreshTokens) if (user.id === current.id) refreshTokens.delete(token);
      return respond(204);
    }
    if (path === "/announcements" && req.method === "GET") {
      if (url.searchParams.get("search") === "fixture-error") return respond(500, { message: "Fixture server error" });
      let data = items.filter((item) => item.title.toLowerCase().includes((url.searchParams.get("search") || "").toLowerCase()));
      data = [...data].sort((a, b) => url.searchParams.get("sort") === "oldest" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
      const total = data.length;
      const page = Number(url.searchParams.get("page") || 1);
      return respond(200, { data: data.slice((page - 1) * 10, page * 10), pagination: { total, page, totalPages: Math.ceil(total / 10), perPage: 10 } });
    }
    if (path === "/announcements" && req.method === "POST") {
      if (!current) return respond(401, { message: "Unauthorized" });
      if (Number(body.price) <= 0) return respond(422, { error: "Validation failed" });
      const item = { id: ++id, title: body.title, description: body.description, price: Number(body.price), category: body.category, imageUrl: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), user: current };
      items.push(item); return respond(201, item);
    }
    const match = path.match(/^\/announcements\/(\d+)$/);
    if (match) {
      const item = items.find((value) => value.id === Number(match[1]));
      if (!item) return respond(404, { message: "Announcement not found" });
      if (req.method === "GET") return respond(200, item);
      if (!current) return respond(401, { message: "Unauthorized" });
      if (current.id !== item.user.id) return respond(403, { message: "Access denied" });
      if (req.method === "DELETE") { items.splice(items.indexOf(item), 1); return respond(204); }
      if (req.method === "PATCH") { for (const key of ["title", "description", "price", "category"]) if (key in body) item[key] = key === "price" ? Number(body[key]) : body[key]; item.updatedAt = new Date().toISOString(); return respond(200, item); }
    }
    return respond(404, { message: "Not found" });
  });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}`, requests, get refreshCount() { return refreshCount; }, close: () => new Promise((resolve) => server.close(resolve)) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const fixture = await startFixture(4000);
  console.log(`Test fixture listening at ${fixture.url} (not the student backend)`);
}
