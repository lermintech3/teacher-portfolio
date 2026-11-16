// GET /api/admin/export — ดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมด (.json) นำกลับเข้าได้ด้วย import
import { handle, json, loadAll, COLLECTIONS } from "../../../src/server.js";

export const onRequestGet = handle(async ({ env }) => {
  const data = await loadAll(env.DB);
  for (const c of COLLECTIONS) data[c] = data[c].map(({ id, ...rest }) => rest);
  const day = new Date().toISOString().slice(0, 10);
  return json({ _backup: day, ...data }, 200, { "content-disposition": `attachment; filename="teacher-backup-${day}.json"` });
});
