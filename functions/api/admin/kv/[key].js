// PUT /api/admin/kv/:key — บันทึกค่าเดี่ยว เช่น โปรไฟล์ ตารางสอน คะแนน การเช็กชื่อ การตั้งค่าเว็บ
import { handle, json, readJson, KV_KEYS, HttpError } from "../../../../src/server.js";

export const onRequestPut = handle(async ({ request, env, params, data: { site } }) => {
  if (!KV_KEYS.includes(params.key)) throw new HttpError(404, "ไม่รู้จักข้อมูลนี้");
  const value = await readJson(request);
  await env.DB.prepare(`INSERT OR REPLACE INTO kv (site, key, value, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)`)
    .bind(site, params.key, JSON.stringify(value)).run();
  return json({ ok: true });
});
