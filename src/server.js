// โค้ดฝั่งเซิร์ฟเวอร์ที่ใช้ร่วมกัน (Cloudflare Pages Functions + D1)
// ต้องมี binding: DB (D1) และ secret: ADMIN_PASSWORD

// ---------- ชนิดข้อมูล ----------
// รายการแบบหลายแถว (เก็บในตาราง items)
export const COLLECTIONS = [
  "responsibilities", "certificates", "trainings", "works", "reports", "evidence",
  "plans", "reflections", "supervision", "activities", "projects",
  "todos", "deadlines", "students", "care", "documents", "meetings", "leaves", "career", "swaps",
];
// เมนูที่เป็นส่วนตัวเสมอ ตั้งเป็นสาธารณะไม่ได้ (PDPA และข้อมูลส่วนตัว)
export const PRIVATE_ONLY = new Set(["todos", "deadlines", "students", "care", "documents", "meetings", "leaves", "career", "swaps"]);
// ค่าเดี่ยว (เก็บในตาราง kv)
// settings = การตั้งค่าเว็บที่ครูปรับเอง (ชื่อเว็บ เมนู สี ตัวเลือกในฟอร์ม ตัวชี้วัด PA) หน้าสาธารณะต้องใช้ด้วย
export const KV_KEYS = ["profile", "schedule", "grades", "attendance", "attendanceDates", "sarNotes", "settings"];
export const PUBLIC_KV = ["profile", "schedule", "settings"];

const MAX_BODY = 1_000_000; // 1 MB

// ---------- ตอบกลับ ----------
export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
export const fail = (status, message) => json({ error: message }, status);

export async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError(413, "ข้อมูลใหญ่เกิน 1 MB");
  try { return text ? JSON.parse(text) : {}; } catch { throw new HttpError(400, "รูปแบบข้อมูลไม่ถูกต้อง"); }
}
export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

// ห่อ handler: แปลง error เป็นข้อความที่อ่านเข้าใจ
export const handle = (fn) => async (ctx) => {
  try {
    if (!ctx.env.DB) return fail(500, "ยังไม่ได้ผูกฐานข้อมูล D1 กับโปรเจกต์ (Settings → Bindings → D1 ชื่อ DB)");
    await ensureSchema(ctx.env.DB);
    return await fn(ctx);
  } catch (e) {
    if (e instanceof HttpError) return fail(e.status, e.message);
    console.error(e);
    return fail(500, "เกิดข้อผิดพลาดในเซิร์ฟเวอร์");
  }
};

// ---------- ฐานข้อมูล: สร้างตารางอัตโนมัติครั้งแรก ----------
let schemaReady = false;
export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection TEXT NOT NULL,
      vis TEXT NOT NULL DEFAULT 'private',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_collection ON items (collection, vis)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL, last INTEGER NOT NULL)`),
  ]);
  schemaReady = true;
}

const rowToItem = (r) => ({ ...JSON.parse(r.data), id: r.id, vis: r.vis });

export async function loadAll(db, { publicOnly = false } = {}) {
  const out = {};
  const items = publicOnly
    ? await db.prepare(`SELECT id, collection, vis, data FROM items WHERE vis = 'public' ORDER BY id DESC`).all()
    : await db.prepare(`SELECT id, collection, vis, data FROM items ORDER BY id DESC`).all();
  for (const c of COLLECTIONS) out[c] = [];
  for (const r of items.results || []) {
    if (!out[r.collection]) continue;
    if (publicOnly && PRIVATE_ONLY.has(r.collection)) continue; // กันพลาดสองชั้น
    out[r.collection].push(rowToItem(r));
  }
  const kv = await db.prepare(`SELECT key, value FROM kv`).all();
  for (const r of kv.results || []) {
    if (publicOnly && !PUBLIC_KV.includes(r.key)) continue;
    out[r.key] = JSON.parse(r.value);
  }
  if (publicOnly) for (const c of PRIVATE_ONLY) delete out[c];
  return out;
}

export function cleanItem(collection, body) {
  if (!COLLECTIONS.includes(collection)) throw new HttpError(404, "ไม่รู้จักเมนูนี้");
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "รูปแบบข้อมูลไม่ถูกต้อง");
  const { id, vis, ...data } = body;
  const v = PRIVATE_ONLY.has(collection) ? "private" : vis === "public" ? "public" : "private";
  return { vis: v, data: JSON.stringify(data) };
}

export async function getItem(db, id) {
  const r = await db.prepare(`SELECT id, collection, vis, data FROM items WHERE id = ?`).bind(id).first();
  if (!r) throw new HttpError(404, "ไม่พบรายการนี้");
  return r;
}

// นำเข้าข้อมูลรูปแบบเดียวกับ demo.json / ไฟล์สำรอง
export async function importAll(db, src, { replace = false } = {}) {
  const count = await db.prepare(`SELECT COUNT(*) AS n FROM items`).first();
  if (count.n > 0 && !replace) throw new HttpError(409, "มีข้อมูลอยู่แล้ว ต้องเลือกแทนที่ข้อมูลเดิม");
  const stmts = [];
  if (replace) stmts.push(db.prepare(`DELETE FROM items`), db.prepare(`DELETE FROM kv`));
  for (const c of COLLECTIONS) {
    const arr = Array.isArray(src[c]) ? [...src[c]].reverse() : []; // เก็บลำดับเดิม (แสดงใหม่สุดก่อน)
    for (const it of arr) {
      const { vis, data } = cleanItem(c, it);
      stmts.push(db.prepare(`INSERT INTO items (collection, vis, data) VALUES (?, ?, ?)`).bind(c, vis, data));
    }
  }
  for (const k of KV_KEYS) {
    if (src[k] !== undefined) stmts.push(db.prepare(`INSERT OR REPLACE INTO kv (key, value) VALUES (?, ?)`).bind(k, JSON.stringify(src[k])));
  }
  for (let i = 0; i < stmts.length; i += 50) await db.batch(stmts.slice(i, i + 50));
  return stmts.length;
}

// ---------- ระบบรหัสผ่าน ----------
const COOKIE = "tp_session";
const SESSION_DAYS = 30;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;
const enc = new TextEncoder();

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const secretOf = (env) => {
  if (!env.ADMIN_PASSWORD) throw new HttpError(500, "ยังไม่ได้ตั้งรหัสผ่าน ADMIN_PASSWORD ใน Cloudflare (Settings → Variables and Secrets)");
  return env.ADMIN_PASSWORD;
};

export async function passwordMatches(env, given) {
  const secret = secretOf(env);
  // เทียบผ่าน HMAC เพื่อให้ความยาวเท่ากันและใช้เวลาคงที่
  return safeEqual(await hmac("pw-check", String(given ?? "")), await hmac("pw-check", secret));
}

export async function sessionCookie(env) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const sig = await hmac(secretOf(env), `session:${exp}`);
  return `${COOKIE}=${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

export async function isLoggedIn(request, env) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return false;
  const [exp, sig] = m[1].split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  // เปลี่ยนรหัสผ่านใน Cloudflare = ทุกเครื่องต้องล็อกอินใหม่
  return safeEqual(sig, await hmac(secretOf(env), `session:${exp}`));
}

export async function checkLock(db, ip) {
  const r = await db.prepare(`SELECT fails, last FROM login_attempts WHERE ip = ?`).bind(ip).first();
  if (r && r.fails >= MAX_FAILS && Date.now() - r.last < LOCK_MS) {
    const mins = Math.ceil((LOCK_MS - (Date.now() - r.last)) / 60000);
    throw new HttpError(429, `ใส่รหัสผิดหลายครั้ง ลองใหม่ได้ในอีก ${mins} นาที`);
  }
  return r;
}
export async function recordFail(db, ip, prev) {
  const fresh = !prev || Date.now() - prev.last >= LOCK_MS;
  await db.prepare(`INSERT OR REPLACE INTO login_attempts (ip, fails, last) VALUES (?, ?, ?)`)
    .bind(ip, fresh ? 1 : prev.fails + 1, Date.now()).run();
  return fresh ? 1 : prev.fails + 1;
}
export const clearFails = (db, ip) => db.prepare(`DELETE FROM login_attempts WHERE ip = ?`).bind(ip).run();
export const clientIp = (request) => request.headers.get("CF-Connecting-IP") || "local";
export { MAX_FAILS };
