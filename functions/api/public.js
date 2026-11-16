// GET /api/public?site=<slug> — ข้อมูลเฉพาะรายการสาธารณะของครูคนนั้น (ไม่ต้องล็อกอิน)
import { handle, json, loadAll, requireSite } from "../../src/server.js";

export const onRequestGet = handle(async ({ request, env }) => {
  const site = requireSite(new URL(request.url).searchParams.get("site"));
  return json(await loadAll(env.DB, site, { publicOnly: true }), 200, { "cache-control": "public, max-age=30" });
});
