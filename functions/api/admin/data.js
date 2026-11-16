// GET /api/admin/data — ข้อมูลทั้งหมดของครูที่ล็อกอิน (ทั้งสาธารณะและส่วนตัว)
import { handle, json, loadAll, siteBySlug } from "../../../src/server.js";

export const onRequestGet = handle(async ({ env, data: { site } }) => {
  const all = await loadAll(env.DB, site);
  const n = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM items WHERE site = ?1) + (SELECT COUNT(*) FROM kv WHERE site = ?1) AS n`).bind(site).first();
  return json({ ...all, _empty: n.n === 0, _site: site, _siteName: siteBySlug(site).name });
});
