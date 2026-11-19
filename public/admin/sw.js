// Service worker ของแอปหน้าครู: ทำให้ติดตั้งลงมือถือได้ และเปิดหน้าแอปได้แม้เน็ตหลุดชั่วคราว
// ดึงจากเน็ตก่อนเสมอ (ได้ของใหม่ทุกครั้งที่มีเน็ต) ใช้ของในเครื่องเฉพาะตอนออฟไลน์
// ไม่เก็บ /api/ เด็ดขาด เพราะเป็นข้อมูลส่วนตัวที่ต้องล็อกอิน
const CACHE = "teacher-app-v1";
const SHELL = ["/admin/", "/css/style.css", "/css/ios.css", "/js/app.js", "/js/admin.js", "/admin/icons/icon-192.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => null).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/admin/") : Response.error())))
  );
});
