// POST /api/admin/items/:collection — เพิ่มรายการใหม่
import { handle, json, readJson, cleanItem, getItem } from "../../../../src/server.js";

export const onRequestPost = handle(async ({ request, env, params }) => {
  const { vis, data } = cleanItem(params.collection, await readJson(request));
  const r = await env.DB.prepare(`INSERT INTO items (collection, vis, data) VALUES (?, ?, ?)`).bind(params.collection, vis, data).run();
  const row = await getItem(env.DB, r.meta.last_row_id);
  return json({ ...JSON.parse(row.data), id: row.id, vis: row.vis }, 201);
});
