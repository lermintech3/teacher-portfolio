// โค้ดฝั่งเซิร์ฟเวอร์ที่ใช้ร่วมกัน (Cloudflare Pages Functions + D1)
// ต้องมี binding: DB (D1) และ secret: ADMIN_PASSWORD

// ---------- เจ้าของเว็บ (แต่ละคนมีข้อมูลและรหัสผ่านแยกกัน) ----------
// เพิ่มคนใหม่: เพิ่มแถวที่นี่ + ตั้ง Secret PASSWORD_<SLUG> ใน Cloudflare + สร้างโฟลเดอร์ public/<slug>/
// defaults = ค่าโปรไฟล์ตั้งต้น ใช้ตอนเริ่มต้นและแทนชื่อ/โรงเรียนตัวอย่าง
const BAN_RAI = { school: "โรงเรียนบ้านไร่ อำเภอดอยเต่า จังหวัดเชียงใหม่", office: "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเชียงใหม่ เขต 5" };
export const SITES = [
  { slug: "chalermphon", name: "เฉลิมพล จันทร์แดง", passwordVars: ["PASSWORD_CHALERMPHON", "ADMIN_PASSWORD"], defaults: { name: "เฉลิมพล จันทร์แดง", ...BAN_RAI } },
  { slug: "waraporn", name: "วราภรณ์ สุขหยอม", passwordVars: ["PASSWORD_WARAPORN"], defaults: { name: "วราภรณ์ สุขหยอม", ...BAN_RAI } },
];
// ค่าตัวอย่างใน demo.json ที่ต้องแทนด้วยค่าจริงของเจ้าของ
export const DEMO_PLACEHOLDERS = { name: ["", "ชื่อ นามสกุล"], school: ["", "โรงเรียนตัวอย่างวิทยา"], office: ["", "สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา...", "สำนักงานเขตพื้นที่การศึกษาประถมศึกษาเชียงใหม่ เขต 5"] };
export const withDefaults = (profile = {}, site) => {
  const out = { ...profile };
  for (const [k, v] of Object.entries(siteBySlug(site).defaults || {})) {
    if (out[k] === undefined || (DEMO_PLACEHOLDERS[k] || [""]).includes(out[k])) out[k] = v;
  }
  return out;
};
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
  "albums", "videos", "surveys",
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
    // รหัสผ่านที่ครูเปลี่ยนเองจากหน้าเว็บ (เก็บแบบ PBKDF2 ไม่เก็บรหัสจริง)
    // คำตอบแบบประเมินความพึงพอใจ (ส่งจากหน้าสาธารณะ ไม่เก็บ IP จริง เก็บแค่ค่าแฮชไว้กันส่งซ้ำ)
    db.prepare(`CREATE TABLE IF NOT EXISTS survey_responses (id INTEGER PRIMARY KEY AUTOINCREMENT, site TEXT NOT NULL, survey_id INTEGER NOT NULL,
      answers TEXT NOT NULL, comment TEXT NOT NULL DEFAULT '', ip_hash TEXT NOT NULL, created_at INTEGER NOT NULL)`),
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_survey ON survey_responses (site, survey_id)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS auth (site TEXT PRIMARY KEY, salt TEXT NOT NULL, hash TEXT NOT NULL, env_fp TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
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
// ---------- รหัสผ่าน ----------
// ตั้งต้นจาก Cloudflare (ADMIN_PASSWORD / PASSWORD_<SLUG>) ครูเปลี่ยนเองได้จากหน้าเว็บ (เก็บในตาราง auth)
// ลืมรหัส: เปลี่ยนค่าใน Cloudflare แล้ว deploy ใหม่ → รหัสที่ตั้งเองถูกยกเลิก กลับไปใช้ค่าใน Cloudflare
const PBKDF2_ITER = 5000; // พอสำหรับเว็บนี้ และไม่เกินเวลา CPU ของ Workers แพ็กเกจฟรี
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
async function pbkdf2(password, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" }, key, 256));
}
const envFingerprint = async (env, site) => hmac("env-fp", passwordOf(env, site) || "");

// คืน { custom, key } ของครูคนนั้น: key ใช้ลงชื่อคุกกี้
async function authOf(env, db, site) {
  const envPw = passwordOf(env, site);
  const row = db ? await db.prepare(`SELECT salt, hash, env_fp FROM auth WHERE site = ?`).bind(site.slug).first() : null;
  if (row && row.env_fp === (await envFingerprint(env, site))) return { custom: row, key: `db:${row.hash}` };
  return envPw ? { custom: null, key: envPw } : null;
}
async function matchesPassword(env, db, site, given) {
  const a = await authOf(env, db, site);
  if (!a) return false;
  if (a.custom) return safeEqual(await pbkdf2(given, a.custom.salt), a.custom.hash);
  return safeEqual(await hmac("pw-check", String(given ?? "")), await hmac("pw-check", passwordOf(env, site)));
}

// รหัสผ่านบอกว่าเป็นใคร
export async function siteForPassword(env, given, db) {
  if (!SITES.some((s) => passwordOf(env, s))) throw new HttpError(500, "ยังไม่ได้ตั้งรหัสผ่านใน Cloudflare (Settings → Variables and Secrets)");
  const matches = [];
  for (const s of SITES) if (await matchesPassword(env, db, s, given)) matches.push(s);
  if (matches.length > 1) throw new HttpError(500, "รหัสผ่านของสองบัญชีซ้ำกัน ตั้งใน Cloudflare ให้ต่างกัน");
  return matches[0]?.slug || null;
}

export async function sessionCookie(env, slug, db) {
  const exp = Date.now() + SESSION_DAYS * 864e5;
  const { key } = await authOf(env, db, siteBySlug(slug));
  const sig = await hmac(key, `session:${slug}:${exp}`);
  return `${COOKIE}=${slug}.${exp}.${sig}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
}
export const clearCookie = () => `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;

// คืนชื่อเจ้าของ (slug) ถ้าคุกกี้ถูกต้อง  เปลี่ยนรหัสผ่าน = เครื่องอื่นต้องล็อกอินใหม่
export async function sessionSite(request, env, db) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  if (!m) return null;
  const [slug, exp, sig] = m[1].split(".");
  const site = siteBySlug(slug);
  if (!site || !exp || !sig || Number(exp) < Date.now()) return null;
  const a = await authOf(env, db, site);
  return a && safeEqual(sig, await hmac(a.key, `session:${slug}:${exp}`)) ? slug : null;
}

// ครูเปลี่ยนรหัสผ่านของตัวเอง
export async function changePassword(env, db, slug, current, next) {
  const site = siteBySlug(slug);
  if (!(await matchesPassword(env, db, site, current))) throw new HttpError(400, "รหัสผ่านปัจจุบันไม่ถูกต้อง");
  next = String(next || "");
  if (next.length < 8) throw new HttpError(400, "รหัสผ่านใหม่ต้องยาวอย่างน้อย 8 ตัวอักษร");
  if (next === String(current)) throw new HttpError(400, "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม");
  for (const other of SITES) {
    if (other.slug !== slug && (await matchesPassword(env, db, other, next))) throw new HttpError(400, "ใช้รหัสนี้ไม่ได้ ลองตั้งรหัสอื่น");
  }
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await db.prepare(`INSERT OR REPLACE INTO auth (site, salt, hash, env_fp, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(slug, salt, await pbkdf2(next, salt), await envFingerprint(env, site)).run();
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

// เรียก Apps Script แล้วแปลงผลเป็น JSON
// Apps Script ตอบ POST ด้วย 302 ไปอีกที่อยู่ ต้องตามไปด้วย GET เอง (ปลอดภัยกว่าให้ fetch ตามเอง)
export async function callDrive(url, init = {}) {
  let res;
  try {
    res = await fetch(url, { ...init, redirect: "manual" });
    for (let hop = 0; hop < 3 && res.status >= 300 && res.status < 400 && res.headers.get("location"); hop++) {
      res = await fetch(new URL(res.headers.get("location"), url), { redirect: "manual" });
    }
  } catch (e) {
    console.error("drive fetch", e);
    throw new HttpError(502, `ติดต่อ Google Drive ไม่ได้ (${e.message || e}) ลองใหม่อีกครั้ง`);
  }
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch {
    const hint = /accounts\.google|ServiceLogin/i.test(text) ? "Apps Script ขอให้ล็อกอิน: ตั้ง Who has access เป็น Anyone แล้ว deploy ใหม่"
      : res.status === 404 ? "ไม่พบ Apps Script: ตรวจ DRIVE_SCRIPT_URL ว่าคัดลอกครบและลงท้าย /exec"
      : "ตรวจว่า deploy เป็น Web app แบบ Anyone และใช้ URL ล่าสุด";
    throw new HttpError(502, `Google Apps Script ตอบกลับไม่ถูกต้อง (${res.status}) ${hint}`);
  }
  if (data.error) throw new HttpError(502, `Google Drive: ${data.error}`);
  return data;
}

// ---------- แบบประเมินความพึงพอใจ ----------
export const surveyQuestions = (data) => String(data.questions || "").split("\n").map((q) => q.trim()).filter(Boolean).slice(0, 20);
export async function publicSurvey(db, site, id) {
  const row = await db.prepare(`SELECT data FROM items WHERE id = ? AND site = ? AND collection = 'surveys' AND vis = 'public'`).bind(id, site).first();
  if (!row) throw new HttpError(404, "แบบประเมินนี้ปิดรับคำตอบแล้ว หรือไม่มีอยู่");
  return JSON.parse(row.data);
}
export const ipHash = (request, salt) => hmac(`ip:${salt}`, clientIp(request));
