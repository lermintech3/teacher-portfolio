// GET /api/admin/data — ข้อมูลทั้งหมดทั้งสาธารณะและส่วนตัว
import { handle, json, loadAll } from "../../../src/server.js";

export const onRequestGet = handle(async ({ env }) => {
  const data = await loadAll(env.DB);
  const n = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM items) + (SELECT COUNT(*) FROM kv) AS n`).first();
  return json({ ...data, _empty: n.n === 0 });
});
