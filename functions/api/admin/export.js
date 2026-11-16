// GET /api/admin/export — ดาวน์โหลดไฟล์สำรองของครูที่ล็อกอิน (.json) นำกลับเข้าได้ด้วย import
import { handle, json, loadAll, COLLECTIONS } from "../../../src/server.js";

export const onRequestGet = handle(async ({ env, data: { site } }) => {
  const data = await loadAll(env.DB, site);
  for (const c of COLLECTIONS) data[c] = data[c].map(({ id, ...rest }) => rest);
  const day = new Date().toISOString().slice(0, 10);
  return json({ _backup: day, _site: site, ...data }, 200, { "content-disposition": `attachment; filename="backup-${site}-${day}.json"` });
});
