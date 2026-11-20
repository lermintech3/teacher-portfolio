// POST   /api/admin/storage/:id — ทดสอบการเชื่อมต่อ คืนชื่อโฟลเดอร์หลักและพื้นที่ที่ใช้/เหลือ
// PUT    /api/admin/storage/:id { name?, url?, secret?, primary? } — แก้ไข / ตั้งเป็นที่หลัก
// DELETE /api/admin/storage/:id — เลิกใช้ที่เก็บนี้ (ไฟล์ใน Drive ไม่ถูกลบ ลิงก์เดิมยังเปิดได้)
// id = "env" คือที่เก็บกลางของเว็บ (ตั้งใน Cloudflare) แก้/ลบไม่ได้ ตั้งเป็นที่หลักได้
import { handle, json, readJson, HttpError, storageLocations, storageLoc, publicLoc, driveTarget, callDrive, SCRIPT_URL_RE, setPref } from "../../../../src/server.js";

const list = async (env, site) => (await storageLocations(env, site)).map(publicLoc);

export const onRequestPost = handle(async ({ env, params, data: { site } }) => {
  const loc = await storageLoc(env, site, params.id);
  const r = await callDrive(driveTarget(loc, site, { action: "ping" }));
  return json({ ok: true, root: r.root, used: r.used, limit: r.limit, version: r.version || 1 });
});

export const onRequestPut = handle(async ({ request, env, params, data: { site } }) => {
  const loc = await storageLoc(env, site, params.id);
  const b = await readJson(request);
  if (!loc.builtin && (b.name !== undefined || b.url !== undefined || b.secret !== undefined)) {
    const name = b.name !== undefined ? String(b.name).trim().slice(0, 60) || loc.name : loc.name;
    const url = b.url ? String(b.url).trim() : loc.url;
    const secret = b.secret ? String(b.secret).trim() : loc.secret;
    if (!SCRIPT_URL_RE.test(url)) throw new HttpError(400, "Web app URL ไม่ถูกต้อง");
    if (url !== loc.url || secret !== loc.secret) await callDrive(driveTarget({ url, secret }, site, { action: "ping" }));
    await env.DB.prepare(`UPDATE storage SET name = ?, url = ?, secret = ? WHERE id = ? AND site = ?`).bind(name, url, secret, Number(loc.id), site).run();
  }
  if (b.primary) await setPref(env.DB, site, "storage_primary", loc.id);
  return json({ ok: true, locations: await list(env, site) });
});

export const onRequestDelete = handle(async ({ env, params, data: { site } }) => {
  const loc = await storageLoc(env, site, params.id);
  if (loc.builtin) throw new HttpError(400, "ที่เก็บกลางของเว็บลบจากที่นี่ไม่ได้");
  const locs = await storageLocations(env, site);
  if (loc.primary && locs.length > 1) throw new HttpError(400, "ตั้งที่เก็บอื่นเป็นที่หลักก่อน แล้วค่อยลบที่นี้");
  await env.DB.prepare(`DELETE FROM storage WHERE id = ? AND site = ?`).bind(Number(loc.id), site).run();
  return json({ ok: true, locations: await list(env, site) });
});
