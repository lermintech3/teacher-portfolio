// AI ผู้ช่วย: ครูแต่ละคนใส่ API key ของตัวเองในหน้าตั้งค่า เลือกค่ายได้ (Claude / ChatGPT / Gemini)
// - คีย์เก็บในตาราง ai_config แบบเข้ารหัส AES-GCM ด้วย Secret AI_SECRET ของ Cloudflare ไม่ส่งกลับไปหน้าเว็บ
// - เรียก AI จากเซิร์ฟเวอร์เท่านั้น (ผ่าน /api/admin/ai/*) ต้องล็อกอินหน้าครู
// - นับจำนวนครั้งต่อเดือน และหยุดเมื่อถึงเพดานที่ครูตั้ง
import { HttpError } from "./server.js";

// รุ่นแนะนำ (ชื่อรุ่นเปลี่ยนบ่อย ครูพิมพ์ชื่อรุ่นอื่นเองได้ในหน้าตั้งค่า)
export const PROVIDERS = {
  anthropic: { name: "Claude (Anthropic)", keyUrl: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant-",
    models: [["claude-sonnet-5-5", "Sonnet 5.5 — อ่านเอกสารไทยแม่น (แนะนำ)"], ["claude-haiku-5-5", "Haiku 5.5 — เร็วและประหยัด"]] },
  openai: { name: "ChatGPT (OpenAI)", keyUrl: "https://platform.openai.com/api-keys", keyPrefix: "sk-",
    models: [["gpt-6.1-terra", "GPT-6.1 Terra — สมดุล อ่านภาพดี (แนะนำ)"], ["gpt-6-luna", "GPT-6 Luna — ประหยัดที่สุด"]] },
  gemini: { name: "Gemini (Google)", keyUrl: "https://aistudio.google.com/apikey", keyPrefix: "",
    models: [["gemini-flash-latest", "Gemini Flash รุ่นล่าสุด (แนะนำ มีโควตาฟรี)"], ["gemini-flash-lite-latest", "Gemini Flash-Lite (เร็ว คนใช้น้อยกว่า มีโควตาฟรี)"], ["gemini-3.8-flash", "Gemini 3.8 Flash"]] },
};
export const DEFAULT_LIMIT = 300;
const MAX_FILES = 4;
export const MAX_AI_BODY = 14 * 1024 * 1024; // base64 ของไฟล์รวมราว 10 MB

// ---------- ตาราง ----------
let ready = false;
export async function ensureAiSchema(db) {
  if (ready) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS ai_config (site TEXT PRIMARY KEY, provider TEXT NOT NULL, model TEXT NOT NULL,
      key_enc TEXT NOT NULL DEFAULT '', key_hint TEXT NOT NULL DEFAULT '', monthly_limit INTEGER NOT NULL DEFAULT ${DEFAULT_LIMIT},
      enabled INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)`),
    db.prepare(`CREATE TABLE IF NOT EXISTS ai_usage (site TEXT NOT NULL, month TEXT NOT NULL, calls INTEGER NOT NULL DEFAULT 0, PRIMARY KEY (site, month))`),
  ]);
  ready = true;
}
const month = () => new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 7); // เดือนตามเวลาไทย

// ---------- เข้ารหัสคีย์ ----------
const enc = new TextEncoder(), dec = new TextDecoder();
const b64 = (u8) => btoa(String.fromCharCode(...u8));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function cryptoKey(env) {
  if (!env.AI_SECRET || String(env.AI_SECRET).length < 16) {
    throw new HttpError(503, "เจ้าของเว็บยังไม่ได้ตั้ง Secret ชื่อ AI_SECRET ใน Cloudflare (ข้อความสุ่มยาวอย่างน้อย 16 ตัว) ดูวิธีในหน้าตั้งค่า → AI ผู้ช่วย");
  }
  const raw = await crypto.subtle.digest("SHA-256", enc.encode(`ai-key:${env.AI_SECRET}`));
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
async function encryptKey(env, site, plain) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: enc.encode(site) }, await cryptoKey(env), enc.encode(plain)));
  return `${b64(iv)}.${b64(ct)}`;
}
async function decryptKey(env, site, stored) {
  const [iv, ct] = String(stored).split(".");
  try {
    return dec.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(iv), additionalData: enc.encode(site) }, await cryptoKey(env), unb64(ct)));
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw new HttpError(409, "ถอดรหัส API key ไม่ได้ (AI_SECRET อาจถูกเปลี่ยน) กรุณาใส่ API key ใหม่ในหน้าตั้งค่า");
  }
}
const hintOf = (k) => (k.length > 10 ? `${k.slice(0, 6)}…${k.slice(-4)}` : "••••");

// ---------- การตั้งค่า ----------
async function rowOf(db, site) {
  await ensureAiSchema(db);
  return db.prepare(`SELECT * FROM ai_config WHERE site = ?`).bind(site).first();
}
async function usedOf(db, site) {
  const r = await db.prepare(`SELECT calls FROM ai_usage WHERE site = ? AND month = ?`).bind(site, month()).first();
  return r?.calls || 0;
}
// ข้อมูลที่ส่งกลับหน้าเว็บ: ไม่มีคีย์จริง มีแค่ตัวย่อ
export async function publicConfig(env, db, site) {
  const r = await rowOf(db, site);
  return {
    provider: r?.provider || "", model: r?.model || "", keyHint: r?.key_hint || "", hasKey: !!r?.key_enc,
    limit: r?.monthly_limit ?? DEFAULT_LIMIT, enabled: r ? !!r.enabled : true, used: await usedOf(db, site),
    secretSet: !!(env.AI_SECRET && String(env.AI_SECRET).length >= 16),
    providers: Object.fromEntries(Object.entries(PROVIDERS).map(([k, p]) => [k, { name: p.name, keyUrl: p.keyUrl, models: p.models }])),
  };
}
export async function saveConfig(env, db, site, body) {
  const cur = await rowOf(db, site);
  const provider = String(body.provider || cur?.provider || "");
  if (!PROVIDERS[provider]) throw new HttpError(400, "กรุณาเลือกค่าย AI");
  const model = String(body.model || "").trim() || PROVIDERS[provider].models[0][0];
  if (!/^[\w.\-:/]{2,80}$/.test(model)) throw new HttpError(400, "ชื่อรุ่นไม่ถูกต้อง");
  const limit = Math.max(0, Math.min(5000, Math.round(Number(body.limit ?? cur?.monthly_limit ?? DEFAULT_LIMIT)) || 0));
  const enabled = body.enabled === undefined ? (cur ? cur.enabled : 1) : body.enabled ? 1 : 0;
  let keyEnc = cur?.key_enc || "", keyHint = cur?.key_hint || "";
  if (body.clearKey || (cur && cur.provider !== provider && !body.key)) { keyEnc = ""; keyHint = ""; } // เปลี่ยนค่าย = คีย์เดิมใช้ไม่ได้
  const key = String(body.key || "").trim();
  if (key) {
    if (key.length < 20 || key.length > 300 || /\s/.test(key)) throw new HttpError(400, "API key ดูไม่ถูกต้อง ตรวจว่าคัดลอกมาครบ");
    keyEnc = await encryptKey(env, site, key);
    keyHint = hintOf(key);
  }
  await db.prepare(`INSERT OR REPLACE INTO ai_config (site, provider, model, key_enc, key_hint, monthly_limit, enabled, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(site, provider, model, keyEnc, keyHint, limit, enabled).run();
  return publicConfig(env, db, site);
}

// ---------- เรียก AI ----------
// parts: [{ text }] หรือ [{ mime, data(base64), name }]
// รุ่นสำรองเมื่อรุ่นที่เลือก "คนใช้เยอะ" (503/529) — ลองรุ่นเดิมซ้ำก่อน แล้วค่อยสลับ
const FALLBACK = {
  gemini: ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-3.8-flash"],
  anthropic: [], openai: [],
};
const BUSY = new Set([500, 502, 503, 504, 529]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callProvider(provider, model, key, system, parts, opts = {}) {
  const models = [model, ...(FALLBACK[provider] || []).filter((m) => m !== model)].slice(0, 3);
  let last;
  for (let i = 0; i < models.length; i++) {
    for (let attempt = 0; attempt < (i === 0 ? 3 : 2); attempt++) {
      try {
        return await callOnce(provider, models[i], key, system, parts, opts);
      } catch (e) {
        last = e;
        if (!e.busy) throw e;
        await sleep(attempt === 0 ? 1200 : 2500);
      }
    }
  }
  throw new HttpError(503, `ตอนนี้ AI ของผู้ให้บริการมีคนใช้เยอะมาก (ลองซ้ำและสลับรุ่นสำรองแล้ว) รอสัก 1-2 นาทีแล้วกดใหม่ ${last?.detail ? `(${last.detail})` : ""}`.trim());
}

async function callOnce(provider, model, key, system, parts, { json = true, maxTokens = 2000 } = {}) {
  const files = parts.filter((p) => p.data);
  const text = parts.filter((p) => p.text).map((p) => p.text).join("\n\n");
  let url, init, pick;
  if (provider === "anthropic") {
    url = "https://api.anthropic.com/v1/messages";
    const content = [
      ...files.map((f) => f.mime === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: f.mime, data: f.data } }
        : { type: "image", source: { type: "base64", media_type: f.mime, data: f.data } }),
      { type: "text", text },
    ];
    init = { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, body: { model, max_tokens: maxTokens, system, messages: [{ role: "user", content }] } };
    pick = (d) => (d.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
  } else if (provider === "openai") {
    url = "https://api.openai.com/v1/responses";
    const content = [
      ...files.map((f) => f.mime === "application/pdf"
        ? { type: "input_file", filename: f.name || "document.pdf", file_data: `data:${f.mime};base64,${f.data}` }
        : { type: "input_image", image_url: `data:${f.mime};base64,${f.data}` }),
      { type: "input_text", text },
    ];
    init = { headers: { authorization: `Bearer ${key}` }, body: { model, instructions: system, input: [{ role: "user", content }], max_output_tokens: maxTokens, ...(json ? { text: { format: { type: "json_object" } } } : {}) } };
    pick = (d) => d.output_text || (d.output || []).flatMap((o) => o.content || []).filter((c) => c.type === "output_text").map((c) => c.text).join("");
  } else if (provider === "gemini") {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const p = [...files.map((f) => ({ inline_data: { mime_type: f.mime, data: f.data } })), { text }];
    init = { headers: { "x-goog-api-key": key }, body: { system_instruction: { parts: [{ text: system }] }, contents: [{ role: "user", parts: p }], generationConfig: { maxOutputTokens: maxTokens, ...(json ? { responseMimeType: "application/json" } : {}) } } };
    pick = (d) => (d.candidates?.[0]?.content?.parts || []).map((x) => x.text || "").join("");
  } else throw new HttpError(400, "ไม่รู้จักค่าย AI นี้");

  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...init.headers }, body: JSON.stringify(init.body), signal: AbortSignal.timeout(90_000) });
  } catch {
    throw Object.assign(new HttpError(504, "ติดต่อผู้ให้บริการ AI ไม่ได้ หรือใช้เวลานานเกินไป ลองใหม่อีกครั้ง"), { busy: true, detail: "timeout" });
  }
  let data = {};
  try { data = await res.json(); } catch { /* */ }
  if (!res.ok) {
    const msg = data.error?.message || data.message || "";
    if (res.status === 401 || res.status === 403) throw new HttpError(400, `API key ใช้ไม่ได้ หรือไม่มีสิทธิ์ใช้รุ่นนี้ (${msg.slice(0, 120)})`);
    if (res.status === 404) throw new HttpError(400, `ไม่พบรุ่น "${model}" ลองเลือกรุ่นอื่นในหน้าตั้งค่า`);
    if (res.status === 429) throw new HttpError(429, "ใช้ AI ถี่เกินไปหรือเครดิต/โควตาหมด รอสักครู่ หรือตรวจยอดเงินในบัญชีผู้ให้บริการ");
    if (res.status === 402 || /credit|billing|quota/i.test(msg)) throw new HttpError(402, "เครดิตในบัญชีผู้ให้บริการ AI หมด กรุณาเติมเงิน");
    const err = new HttpError(502, `AI ตอบกลับผิดพลาด (${res.status}) ${msg.slice(0, 160)}`);
    if (BUSY.has(res.status) || /overloaded|high demand|unavailable/i.test(msg)) Object.assign(err, { busy: true, detail: `${model} ${res.status}` });
    throw err;
  }
  return pick(data) || "";
}

// แปลงคำตอบเป็น JSON (บางรุ่นใส่ ```json มาด้วย)
export function parseJson(text) {
  const t = String(text || "").replace(/```(?:json)?/gi, "").trim();
  try { return JSON.parse(t); } catch { /* */ }
  const a = t.indexOf("{"), b = t.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch { /* */ } }
  throw new HttpError(502, "AI ตอบกลับในรูปแบบที่อ่านไม่ได้ ลองใหม่อีกครั้ง");
}

async function prepare(env, db, site) {
  const r = await rowOf(db, site);
  if (!r || !r.key_enc) throw new HttpError(412, "ยังไม่ได้ตั้งค่า AI ใส่ API key ได้ที่ ตั้งค่าเว็บ → AI ผู้ช่วย");
  if (!r.enabled) throw new HttpError(412, "ปิดการใช้ AI อยู่ เปิดได้ที่ ตั้งค่าเว็บ → AI ผู้ช่วย");
  const used = await usedOf(db, site);
  if (r.monthly_limit && used >= r.monthly_limit) throw new HttpError(429, `ใช้ AI ครบ ${r.monthly_limit} ครั้งของเดือนนี้แล้ว เพิ่มเพดานได้ที่หน้าตั้งค่า`);
  return { provider: r.provider, model: r.model, key: await decryptKey(env, site, r.key_enc) };
}
const countUse = (db, site) => db.prepare(`INSERT INTO ai_usage (site, month, calls) VALUES (?, ?, 1)
  ON CONFLICT(site, month) DO UPDATE SET calls = calls + 1`).bind(site, month()).run();

export async function testConnection(env, db, site) {
  const c = await prepare(env, db, site);
  const out = await callProvider(c.provider, c.model, c.key, "ตอบเป็น JSON เท่านั้น", [{ text: 'ตอบกลับเป็น JSON {"ok": true, "reply": "<ทักทายครูสั้น ๆ เป็นภาษาไทย 1 ประโยค>"}' }], { maxTokens: 200 });
  await countUse(db, site);
  const j = parseJson(out);
  return { ok: true, reply: String(j.reply || "").slice(0, 200), model: c.model };
}

// ---------- อ่านเอกสารแล้วกรอกฟอร์ม ----------
// fields: [{ key, label, type: text|date|number|textarea, options?: [] }] มาจากฟอร์มในหน้าเว็บ
const cleanFields = (fields) => (Array.isArray(fields) ? fields : []).slice(0, 20).map((f) => ({
  key: String(f.key || "").replace(/[^\w]/g, "").slice(0, 40),
  label: String(f.label || "").slice(0, 80),
  type: ["text", "date", "number", "textarea", "multi"].includes(f.type) ? f.type : "text",
  options: Array.isArray(f.options) ? f.options.slice(0, 60).map((o) => String(o).slice(0, 160)) : undefined,
})).filter((f) => f.key);
const cleanFiles = (files) => {
  const list = (Array.isArray(files) ? files : []).slice(0, MAX_FILES);
  for (const f of list) {
    if (!/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/.test(f.mime || "")) throw new HttpError(400, "รองรับเฉพาะรูป (JPG, PNG, WebP) และ PDF");
    if (typeof f.data !== "string" || !/^[A-Za-z0-9+/=]+$/.test(f.data.slice(0, 200))) throw new HttpError(400, "ไฟล์ไม่ถูกต้อง");
  }
  return list.map((f) => ({ mime: f.mime, data: f.data, name: String(f.name || "file").slice(0, 80) }));
};

const SYSTEM_FILL = `คุณเป็นผู้ช่วยครูไทย ทำหน้าที่อ่านเอกสารราชการ เกียรติบัตร วุฒิบัตร คำสั่ง และรูปถ่ายเอกสาร แล้วดึงข้อมูลไปกรอกแบบฟอร์ม
กติกา:
- ตอบเป็น JSON อย่างเดียว ไม่มีข้อความอื่น
- ใส่เฉพาะข้อมูลที่เห็นในเอกสารจริง ห้ามเดา ถ้าไม่พบให้ใส่ "" (ตัวเลขใส่ null)
- ยกเว้นช่องที่เป็นการจัดหมวด (ประเภท หมวด ตัวชี้วัด หัวข้อ) ให้เลือกตัวเลือกที่เหมาะกับเนื้อหาที่สุด แม้เอกสารไม่ได้เขียนไว้ตรง ๆ
- วันที่ให้แปลงเป็นรูปแบบ YYYY-MM-DD แบบคริสต์ศักราช (พ.ศ. ลบ 543) เช่น 15 มีนาคม 2569 → 2026-03-15 ถ้ามีหลายวันให้ใช้วันสุดท้ายของกิจกรรม หรือวันที่ออกเอกสารถ้าไม่มีวันกิจกรรม
- ช่องที่มีตัวเลือก ต้องตอบเป็นหนึ่งในตัวเลือกที่ให้ไว้เท่านั้น ถ้าไม่ตรงข้อใดให้ใส่ ""
- ชื่อเรื่อง/หลักสูตร/รางวัล ให้คัดลอกตามเอกสาร ตัดคำว่า "เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า" และชื่อผู้รับออก
- ช่องไหนอ่านไม่ชัดหรือไม่แน่ใจ ให้ใส่ชื่อช่องนั้นใน "_uncertain"
- ใส่สรุปสั้น ๆ ว่าเป็นเอกสารอะไรใน "_note" (ไม่เกิน 1 ประโยค)`;

const specText = (F) => F.map((f) => `- "${f.key}": ${f.label}${f.type === "date" ? " (YYYY-MM-DD)" : f.type === "number" ? " (ตัวเลข)" : f.type === "multi" ? " (อาร์เรย์ เลือกได้หลายค่า ใส่เฉพาะรหัสหน้าเครื่องหมาย :)" : ""}${f.options ? ` ตัวเลือก: ${f.options.map((o) => `"${o}"`).join(", ")}` : ""}`).join("\n");
// ตรวจค่าที่ AI ตอบให้อยู่ในรูปแบบของแต่ละช่อง ค่าที่ผิดรูปแบบตัดทิ้ง
function cleanValues(F, j) {
  const values = {};
  for (const f of F) {
    let v = j?.[f.key];
    if (v === null || v === undefined) continue;
    if (f.type === "multi") {
      const codes = (f.options || []).map((o) => o.split(":")[0].trim());
      v = (Array.isArray(v) ? v : String(v).split(/[,\s]+/)).map((x) => String(x).split(":")[0].trim()).filter((x) => codes.includes(x));
      if (v.length) values[f.key] = [...new Set(v)].join(", ");
      continue;
    }
    if (f.type === "number") { v = Number(String(v).replace(/[^\d.]/g, "")); if (!isFinite(v) || !v) continue; }
    else v = String(v).trim().slice(0, f.type === "textarea" ? 3000 : 300);
    if (f.type === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(v)) continue;
    if (f.type === "date") { const y = Number(v.slice(0, 4)); if (y > 2400) v = `${y - 543}${v.slice(4)}`; } // เผื่อ AI ลืมแปลง พ.ศ.
    if (f.options && !f.options.includes(v)) continue;
    if (v === "") continue;
    values[f.key] = v;
  }
  return values;
}
// สิ่งที่ส่งให้ AI อ่าน: ไฟล์ และ/หรือ ข้อความ (เช่น ชื่อและคำอธิบายหลักฐาน)
function inputsOf(body) {
  const docs = Array.isArray(body.files) && body.files.length ? cleanFiles(body.files) : [];
  const text = String(body.text || "").trim().slice(0, 6000);
  if (!docs.length && !text) throw new HttpError(400, "ยังไม่ได้แนบรูปหรือไฟล์ให้ AI อ่าน");
  return { docs, text };
}

export async function fillForm(env, db, site, body) {
  const { title, fields, hint } = body;
  const F = cleanFields(fields);
  if (!F.length) throw new HttpError(400, "ไม่มีช่องให้กรอก");
  const { docs, text } = inputsOf(body);
  const c = await prepare(env, db, site);
  const prompt = `แบบฟอร์ม: ${String(title || "").slice(0, 80)}
${hint ? `ข้อมูลเพิ่มเติม: ${String(hint).slice(0, 400)}\n` : ""}${text ? `ข้อความจากครู:\n"""\n${text}\n"""\n` : ""}อ่าน${docs.length ? "เอกสารที่แนบ" : "ข้อความ"} แล้วตอบ JSON ที่มีช่องต่อไปนี้
${specText(F)}
- "_uncertain": [ชื่อช่องที่ไม่แน่ใจ]
- "_note": "สรุปสั้น ๆ"`;
  const out = await callProvider(c.provider, c.model, c.key, SYSTEM_FILL, [...docs, { text: prompt }], { maxTokens: 1500 });
  await countUse(db, site);
  const j = parseJson(out);
  const uncertain = (Array.isArray(j._uncertain) ? j._uncertain : []).map(String).filter((k) => F.some((f) => f.key === k));
  return { values: cleanValues(F, j), uncertain, note: String(j._note || "").slice(0, 200), model: c.model };
}

// อ่านเอกสารที่มีหลายรายการ (ตารางสอน คำสั่งที่มีหลายหน้าที่) คืนเป็นแถว ๆ ให้ครูเลือกก่อนบันทึก
export async function extractRows(env, db, site, body) {
  const { title, fields, hint } = body;
  const F = cleanFields(fields);
  if (!F.length) throw new HttpError(400, "ไม่มีช่องให้กรอก");
  const { docs, text } = inputsOf(body);
  const max = Math.max(1, Math.min(120, Number(body.max) || 60));
  const H = cleanFields(body.header); // ข้อมูลหัวเอกสาร เช่น เลขที่คำสั่ง วันที่ เรื่อง (ไม่บังคับ)
  const c = await prepare(env, db, site);
  const prompt = `งาน: ${String(title || "").slice(0, 80)}
${hint ? `คำแนะนำ: ${String(hint).slice(0, 800)}\n` : ""}${text ? `ข้อความ:\n"""\n${text}\n"""\n` : ""}อ่าน${docs.length ? "เอกสารที่แนบ" : "ข้อความ"} แล้วแยกเป็นรายการ ตอบ JSON รูปแบบ {${H.length ? `"header": {...}, ` : ""}"rows": [ {...}, ... ], "_note": "สรุปสั้น ๆ"}
${H.length ? `"header" คือข้อมูลของเอกสารทั้งฉบับ มีช่องต่อไปนี้\n${specText(H)}\n` : ""}
แต่ละรายการมีช่องต่อไปนี้
${specText(F)}
ไม่เกิน ${max} รายการ ถ้าไม่พบรายการที่ตรงให้ตอบ {"rows": [], "_note": "เหตุผล"}`;
  const out = await callProvider(c.provider, c.model, c.key, SYSTEM_FILL, [...docs, { text: prompt }], { maxTokens: 6000 });
  await countUse(db, site);
  const j = parseJson(out);
  const rows = (Array.isArray(j.rows) ? j.rows : []).slice(0, max).map((r) => cleanValues(F, r)).filter((r) => Object.keys(r).length);
  return { rows, header: H.length ? cleanValues(H, j.header || {}) : undefined, note: String(j._note || "").slice(0, 300), model: c.model };
}
