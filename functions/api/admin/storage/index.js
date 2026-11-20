// GET  /api/admin/storage — ที่เก็บไฟล์ทั้งหมดของครูที่ล็อกอิน (ไม่ส่งรหัสลับ)
// POST /api/admin/storage { name, url, secret } — เพิ่มที่เก็บใหม่ (ทดสอบเชื่อมต่อก่อนบันทึก) { primary: false } = เพิ่มไว้เฉยๆ ไม่ใช้เป็นที่หลัก
import { handle, json, readJson, HttpError, storageLocations, publicLoc, driveTarget, callDrive, SCRIPT_URL_RE, setPref } from "../../../../src/server.js";

export const onRequestGet = handle(async ({ env, data: { site } }) =>
  json({ locations: (await storageLocations(env, site)).map(publicLoc) }));

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const b = await readJson(request);
  const name = String(b.name || "").trim().slice(0, 60) || "Google Drive ของฉัน";
  const url = String(b.url || "").trim();
  const secret = String(b.secret || "").trim();
  if (!SCRIPT_URL_RE.test(url)) throw new HttpError(400, "Web app URL ไม่ถูกต้อง ต้องขึ้นต้น https://script.google.com/macros/s/ และลงท้าย /exec");
  if (secret.length < 8) throw new HttpError(400, "รหัสลับ (SECRET) ต้องยาวอย่างน้อย 8 ตัว");
  const locs = await storageLocations(env, site);
  if (locs.filter((l) => !l.builtin).length >= 10) throw new HttpError(400, "เพิ่มได้สูงสุด 10 ที่");
  if (locs.some((l) => l.url === url)) throw new HttpError(400, "เพิ่มที่เก็บนี้ไว้แล้ว");
  // ทดสอบก่อนบันทึก จะได้รู้ทันทีว่าวาง URL/รหัสลับถูกไหม
  const ping = await callDrive(driveTarget({ url, secret }, site, { action: "ping" }));
  const r = await env.DB.prepare(`INSERT INTO storage (site, name, url, secret) VALUES (?, ?, ?, ?)`).bind(site, name, url, secret).run();
  const id = String(r.meta.last_row_id);
  // ตั้งเป็นที่หลักทันที (ค่าเริ่มต้น) ยกเว้นครูเอาติ๊กออก
  if (b.primary !== false) await setPref(env.DB, site, "storage_primary", id);
  return json({ ok: true, id, root: ping.root, locations: (await storageLocations(env, site)).map(publicLoc) });
});
