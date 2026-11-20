// ย้ายไฟล์จากที่เก็บหนึ่งไปอีกที่ แล้วแก้ลิงก์ในเว็บให้อัตโนมัติ (หน้าเว็บสั่งทีละไฟล์ จะได้ไม่เกินเวลาที่ Cloudflare/Apps Script ให้)
// GET  /api/admin/storage/migrate?from=&to=  — รายการไฟล์ในที่เก็บต้นทาง + ไฟล์ไหนย้ายไปแล้ว
// POST /api/admin/storage/migrate { from, to, id, name, mime, folder } — คัดลอกหนึ่งไฟล์ แล้วเปลี่ยนลิงก์ทุกเมนูให้ชี้ไฟล์ใหม่
// ไฟล์ต้นทางไม่ถูกลบ (ลบเองทีหลังได้ใน Google Drive)
import { handle, json, readJson, HttpError, storageLoc, driveTarget, callDrive, fetchDrive, DRIVE_CATEGORIES, DRIVE_PRIVATE } from "../../../../src/server.js";

const MAX_MOVE = 25 * 1024 * 1024; // Apps Script รับ/ส่งข้อมูลได้จำกัด
const pair = async (env, site, from, to) => {
  const src = await storageLoc(env, site, from), dst = await storageLoc(env, site, to);
  if (src.id === dst.id) throw new HttpError(400, "ต้นทางกับปลายทางต้องเป็นคนละที่");
  return { src, dst };
};

export const onRequestGet = handle(async ({ request, env, data: { site } }) => {
  const q = new URL(request.url).searchParams;
  const { src, dst } = await pair(env, site, q.get("from"), q.get("to"));
  const r = await callDrive(driveTarget(src, site, { action: "files" })).catch((e) => {
    throw new HttpError(e.status || 502, /ไม่รู้จักคำสั่ง/.test(e.message) ? `ที่เก็บ "${src.name}" ใช้ Code.gs รุ่นเก่า: อัปเดตโค้ดแล้ว Deploy เวอร์ชันใหม่ก่อน` : e.message);
  });
  const moved = new Set(((await env.DB.prepare(`SELECT old_id FROM storage_moves WHERE site = ? AND to_loc = ?`).bind(site, dst.id).all()).results || []).map((x) => x.old_id));
  const files = (r.files || []).map((f) => ({ ...f, done: moved.has(f.id), tooBig: f.size > MAX_MOVE }));
  return json({ from: src.name, to: dst.name, files, truncated: !!r.truncated });
});

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const b = await readJson(request);
  const { src, dst } = await pair(env, site, b.from, b.to);
  const id = String(b.id || "");
  if (!/^[\w-]{10,}$/.test(id)) throw new HttpError(400, "รหัสไฟล์ไม่ถูกต้อง");
  const done = await env.DB.prepare(`SELECT new_id FROM storage_moves WHERE site = ? AND old_id = ? AND to_loc = ?`).bind(site, id, dst.id).first();
  if (done) return json({ ok: true, skipped: true, old: id, new: done.new_id });

  // 1) อ่านไฟล์จากต้นทาง (ข้อความ base64) ไม่แปลงข้อมูล ประหยัด CPU
  const res = await fetchDrive(driveTarget(src, site, { action: "raw", id }));
  const body = await res.arrayBuffer();
  const head = new TextDecoder().decode(body.slice(0, 200));
  if (!res.ok || head.startsWith("{") || head.startsWith("<")) {
    let msg = `อ่านไฟล์จากต้นทางไม่ได้ (${res.status})`;
    try { msg = JSON.parse(new TextDecoder().decode(body)).error || msg; } catch { /* ไม่ใช่ JSON */ }
    throw new HttpError(502, /ไม่รู้จักคำสั่ง/.test(msg) ? `ที่เก็บ "${src.name}" ใช้ Code.gs รุ่นเก่า: อัปเดตโค้ดแล้ว Deploy เวอร์ชันใหม่ก่อน` : msg);
  }
  if (!body.byteLength) throw new HttpError(400, "ไฟล์ว่าง");

  // 2) อัปโหลดไปปลายทาง โฟลเดอร์หมวดเดิม การแชร์ตามหมวด
  const folder = String(b.folder || "อื่นๆ").slice(0, 100);
  const key = Object.keys(DRIVE_CATEGORIES).find((k) => DRIVE_CATEGORIES[k] === folder);
  const up = await callDrive(driveTarget(dst, site, {
    action: "upload", category: folder, name: String(b.name || "ไฟล์").slice(0, 200),
    mime: String(b.mime || "application/octet-stream").slice(0, 100), share: key && DRIVE_PRIVATE.has(key) ? "0" : "1",
  }), { method: "POST", headers: { "content-type": "text/plain; charset=utf-8" }, body }).catch((e) => {
    throw new HttpError(e.status || 502, `ปลายทาง "${dst.name}": ${e.message}`);
  });
  if (!up.id) throw new HttpError(502, "ปลายทางไม่ได้ส่งรหัสไฟล์ใหม่กลับมา");

  // 3) เปลี่ยนลิงก์ทุกที่ในเว็บของครูคนนี้ (รหัสไฟล์ของ Google ไม่ซ้ำกัน แทนที่ตรงๆ ได้ปลอดภัย)
  const [items, kv] = await env.DB.batch([
    env.DB.prepare(`UPDATE items SET data = REPLACE(data, ?1, ?2), updated_at = CURRENT_TIMESTAMP WHERE site = ?3 AND instr(data, ?1) > 0`).bind(id, up.id, site),
    env.DB.prepare(`UPDATE kv SET value = REPLACE(value, ?1, ?2), updated_at = CURRENT_TIMESTAMP WHERE site = ?3 AND instr(value, ?1) > 0`).bind(id, up.id, site),
    env.DB.prepare(`INSERT OR REPLACE INTO storage_moves (site, old_id, to_loc, new_id) VALUES (?, ?, ?, ?)`).bind(site, id, dst.id, up.id),
  ]);
  return json({ ok: true, old: id, new: up.id, url: up.url, relinked: (items.meta.changes || 0) + (kv.meta.changes || 0) });
});
