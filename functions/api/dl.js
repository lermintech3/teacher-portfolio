// GET /api/dl?site=<slug>&id=<id> — นับจำนวนดาวน์โหลดสื่อสาธารณะ แล้วพาไปที่ไฟล์
import { handle, requireSite, HttpError } from "../../src/server.js";

export const onRequestGet = handle(async ({ request, env }) => {
  const q = new URL(request.url).searchParams;
  const site = requireSite(q.get("site"));
  const id = Number(q.get("id"));
  const row = await env.DB.prepare(`SELECT data FROM items WHERE id = ? AND site = ? AND collection = 'plans' AND vis = 'public'`).bind(id, site).first();
  const link = row && JSON.parse(row.data).link;
  if (!link || !/^https?:\/\//i.test(link)) throw new HttpError(404, "ไม่พบไฟล์นี้");
  await env.DB.prepare(`UPDATE items SET data = json_set(data, '$.downloads', COALESCE(json_extract(data, '$.downloads'), 0) + 1) WHERE id = ? AND site = ?`).bind(id, site).run();
  return Response.redirect(link, 302);
});
