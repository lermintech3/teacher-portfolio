// PUT    /api/admin/item/:id  — แก้ทั้งรายการ
// PATCH  /api/admin/item/:id  { vis } — สลับสาธารณะ/ส่วนตัว
// DELETE /api/admin/item/:id
import { handle, json, readJson, cleanItem, getItem, HttpError, PRIVATE_ONLY } from "../../../../src/server.js";

const idOf = (params) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, "รหัสรายการไม่ถูกต้อง");
  return id;
};
const out = (row) => json({ ...JSON.parse(row.data), id: row.id, vis: row.vis });

export const onRequestPut = handle(async ({ request, env, params }) => {
  const id = idOf(params);
  const row = await getItem(env.DB, id);
  const { vis, data } = cleanItem(row.collection, await readJson(request));
  await env.DB.prepare(`UPDATE items SET vis = ?, data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(vis, data, id).run();
  return out(await getItem(env.DB, id));
});

export const onRequestPatch = handle(async ({ request, env, params }) => {
  const id = idOf(params);
  const row = await getItem(env.DB, id);
  const { vis } = await readJson(request);
  if (PRIVATE_ONLY.has(row.collection) && vis === "public") throw new HttpError(400, "เมนูนี้เป็นส่วนตัวเสมอ");
  await env.DB.prepare(`UPDATE items SET vis = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(vis === "public" ? "public" : "private", id).run();
  return out(await getItem(env.DB, id));
});

export const onRequestDelete = handle(async ({ env, params }) => {
  const id = idOf(params);
  await getItem(env.DB, id);
  await env.DB.prepare(`DELETE FROM items WHERE id = ?`).bind(id).run();
  return json({ ok: true });
});
