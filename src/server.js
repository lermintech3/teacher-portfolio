// โค้ดฝั่งเซิร์ฟเวอร์ที่ใช้ร่วมกัน (Cloudflare Pages Functions + D1)
// ต้องมี binding: DB (D1) และ secret: ADMIN_PASSWORD

// ---------- เจ้าของเว็บ (แต่ละคนมีข้อมูลและรหัสผ่านแยกกัน) ----------
// เพิ่มคนใหม่: เพิ่มแถวที่นี่ + ตั้ง Secret PASSWORD_<SLUG> ใน Cloudflare + สร้างโฟลเดอร์ public/<slug>/
export const SITES = [
  { slug: "chalermphon", name: "เฉลิมพล จันทร์แดง", passwordVars: ["PASSWORD_CHALERMPHON", "ADMIN_PASSWORD"] },
  { slug: "waraporn", name: "วราภรณ์ สุขหยอม", passwordVars: ["PASSWORD_WARAPORN"] },
];
const DEFAULT_SITE = SITES[0].slug; // ข้อมูลเดิมก่อนแยกสองคนเป็นของคนแรก
export const siteBySlug = (slug) => SITES.find((s) => s.slug === slug);
export const requireSite = (slug) => {
  if (!siteBySlug(slug)) throw new HttpError(404, "ไม่พบเจ้าของเว็บนี้");
  return slug;
};
const passwordOf = (env, site) => site.passwordVars.map((v) => env[v]).find(Boolean);

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
const columns = async (db, table) => ((await db.prepare(`PRAGMA table_info(${table})`).all()).results || []).map((c) => c.name);

export async function ensureSchema(db) {
  if (schemaReady) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      collection TEXT NOT NULL,
      vis TEXT NOT NULL DEFAULT 'private',
      data TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      site TEXT NOT NULL DEFAULT '${DEFAULT_SITE}')`),
    db.prepare(`CREATE TABLE IF NOT EXISTS kv (
      site TEXT NOT NULL DEFAULT '${DEFAULT_SITE}', key TEXT NOT NULL, value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (site, key))`),
    db.prepare(`CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT PRIMARY KEY, fails INTEGER NOT NULL, last INTEGER NOT NULL)`),
  ]);
  // ย้ายตารางรุ่นแรก (ยังไม่มีช่อง site) ข้อมูลเดิมเป็นของคนแรก
  if (!(await columns(db, "items")).includes("site")) {
    await db.prepare(`ALTER TABLE items ADD COLUMN site TEXT NOT NULL DEFAULT '${DEFAULT_SITE}'`).run();
  }
  if (!(await columns(db, "kv")).includes("site")) {
    await db.batch([
      db.prepare(`CREATE TABLE kv_new (site TEXT NOT NULL DEFAULT '${DEFAULT_SITE}', key TEXT NOT NULL, value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (site, key))`),
      db.prepare(`INSERT INTO kv_new (site, key, value, updated_at) SELECT '${DEFAULT_SITE}', key, value, updated_at FROM kv`),
      db.prepare(`DROP TABLE kv`),
      db.prepare(`ALTER TABLE kv_new RENAME TO kv`),
    ]);
  }
  await db.prepare(`CREATE INDEX IF NOT EXISTS idx_items_site ON items (site, collection, vis)`).run();
  schemaReady = true;
}

const rowToItem = (r) => ({ ...JSON.parse(r.data), id: r.id, vis: r.vis });

export async function loadAll(db, site, { publicOnly = false } = {}) {
  const out = {};
  const items = publicOnly
    ? await db.prepare(`SELECT id, collection, vis, data FROM items WHERE site = ? AND vis = 'public' ORDER BY id DESC`).bind(site).all()
    : await db.prepare(`SELECT id, collection, vis, data FROM items WHERE site = ? ORDER BY id DESC`).bind(site).all();
  for (const c of COLLECTIONS) out[c] = [];
  for (const r of items.results || []) {
    if (!out[r.collection]) continue;
    if (publicOnly && PRIVATE_ONLY.has(r.collection)) continue; // กันพลาดสองชั้น
    out[r.collection].push(rowToItem(r));
  }
  const kv = await db.prepare(`SELECT key, value FROM kv WHERE site = ?`).bind(site).all();
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

export async function getItem(db, site, id) {
  const r = await db.prepare(`SELECT id, collection, vis, data FROM items WHERE id = ? AND site = ?`).bind(id, site).first();
  if (!r) throw new HttpError(404, "ไม่พบรายการนี้");
  return r;
}

// นำเข้าข้อมูลรูปแบบเดียวกับ demo.json / ไฟล์สำรอง
export async function importAll(db, site, src, { replace = false } = {}) {
  const count = await db.prepare(`SELECT (SELECT COUNT(*) FROM items WHERE site = ?1) + (SELECT COUNT(*) FROM kv WHERE site = ?1) AS n`).bind(site).first();
  if (count.n > 0 && !replace) throw new HttpError(409, "มีข้อมูลอยู่แล้ว ต้องเลือกแทนที่ข้อมูลเดิม");
  const stmts = [];
  if (replace) stmts.push(db.prepare(`DELETE FROM items WHERE site = ?`).bind(site), db.prepare(`DELETE FROM kv WHERE site = ?`).bind(site));
  for (const c of COLLECTIONS) {
    const arr = Array.isArray(src[c]) ? [...src[c]].reverse() : []; // เก็บลำดับเดิม (แสดงใหม่สุดก่อน)
    for (const it of arr) {
      const { vis, data } = cleanItem(c, it);
      stmts.push(db.prepare(`INSERT INTO items (site, collection, vis, data) VALUES (?, ?, ?, ?)`).bind(site, c, vis, data));
    }
  }
  for (const k of KV_KEYS) {
    if (src[k] !== undefined) stmts.push(db.prepare(`INSERT OR REPLACE INTO kv (site, key, value) VALUES (?, ?, ?)`).bind(site, k, JSON.stringify(src[k])));
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
// รหัสผ่านบอกว่าเป็นใคร: เทียบกับรหัสของทุกคน (ผ่าน HMAC ใช้เวลาคงที่)
export async function siteForPassword(env, given) {
  const configured = SITES.filter((s) => passwordOf(env, s));
  if (!configured.length) throw new HttpError(500, "ยังไม่ได้ตั้งรหัสผ่านใน Cloudflare (Settings → Variables and Secrets)");
  const g = await hmac("pw-check", String(given ?? ""));
  const matches = [];
  for (const s of configured) if (safeEqual(g, await hmac("pw-check", passwordOf(env, s)))) matches.push(s);
  if (matches.length > 1) throw new HttpError(500, "รหัสผ่านของสองบัญชีซ้ำกัน ตั้งใน Cloudflare ให้ต่างกัน");
  return matches[0]?.slug || null;
}

export async function sessionCookie(env, slug) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const sig = await hmac(passwordOf(env, siteBySlug(slug)), `session:${slug}:${exp}`);
  return `${COOKIE}=${slug}.${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// คืนชื่อเจ้าของ (slug) ถ้าคุกกี้ถูกต้อง  เปลี่ยนรหัสผ่านใน Cloudflare = เครื่องเดิมต้องล็อกอินใหม่
export async function sessionSite(request, env) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [slug, exp, sig] = m[1].split(".");
  const site = siteBySlug(slug);
  const pw = site && passwordOf(env, site);
  if (!pw || !exp || !sig || Number(exp) < Date.now()) return null;
  return safeEqual(sig, await hmac(pw, `session:${slug}:${exp}`)) ? slug : null;
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

// ---------- Google Drive (ผ่าน Google Apps Script ของครู) ----------
// ต้องตั้งใน Cloudflare: DRIVE_SCRIPT_URL (Web app URL) และ Secret DRIVE_SECRET
// โฟลเดอร์ใน Drive: <โฟลเดอร์หลัก>/<ชื่อครู>/<หมวด>/ไฟล์
export const DRIVE_CATEGORIES = {
  profile: "รูปโปรไฟล์", certificates: "เกียรติบัตรและรางวัล", trainings: "การอบรมและพัฒนาตนเอง",
  plans: "แผนการสอนและสื่อ", reflections: "บันทึกหลังสอน", supervision: "การนิเทศ",
  works: "ผลงาน วิจัย นวัตกรรม", reports: "รายงาน SAR และ PA", evidence: "หลักฐาน PA",
  projects: "โครงการ", activities: "กิจกรรมพัฒนาผู้เรียน", responsibilities: "งานที่รับผิดชอบ",
  documents: "หนังสือราชการ", meetings: "บันทึกการประชุม", care: "ดูแลช่วยเหลือนักเรียน", leaves: "การลา",
  other: "อื่นๆ",
};
// หมวดที่ไม่เปิดลิงก์แชร์ (ข้อมูลส่วนตัว/นักเรียน)
export const DRIVE_PRIVATE = new Set(["documents", "meetings", "care", "leaves"]);
export const MAX_UPLOAD_BYTES = 28 * 1024 * 1024; // base64 ของไฟล์ราว 20 MB

export function driveTarget(env, site, params) {
  if (!env.DRIVE_SCRIPT_URL || !env.DRIVE_SECRET) {
    throw new HttpError(503, "ยังไม่ได้เชื่อม Google Drive (ตั้ง DRIVE_SCRIPT_URL และ DRIVE_SECRET ใน Cloudflare)");
  }
  const url = new URL(env.DRIVE_SCRIPT_URL);
  url.searchParams.set("secret", env.DRIVE_SECRET);
  url.searchParams.set("person", siteBySlug(site).name);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url;
}

// เรียก Apps Script แล้วแปลงผลเป็น JSON (Apps Script ตอบกลับผ่านการ redirect)
export async function callDrive(url, init = {}) {
  let res;
  try { res = await fetch(url, { redirect: "follow", ...init }); } catch { throw new HttpError(502, "ติดต่อ Google Drive ไม่ได้ ลองใหม่อีกครั้ง"); }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    throw new HttpError(502, "Google Apps Script ตอบกลับไม่ถูกต้อง ตรวจว่า deploy เป็น Web app แบบ Anyone และใช้ URL ล่าสุด");
  }
  if (data.error) throw new HttpError(502, `Google Drive: ${data.error}`);
  return data;
}
