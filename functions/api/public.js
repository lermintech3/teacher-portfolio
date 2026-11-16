// GET /api/public?site=<slug> — ข้อมูลเฉพาะรายการสาธารณะของครูคนนั้น (ไม่ต้องล็อกอิน)
import { handle, json, loadAll, requireSite, withDefaults } from "../../src/server.js";

export const onRequestGet = handle(async ({ request, env }) => {
  const site = requireSite(new URL(request.url).searchParams.get("site"));
  const data = await loadAll(env.DB, site, { publicOnly: true });
  if (data.profile) data.profile = withDefaults(data.profile, site);
  return json(data, 200, { "cache-control": "public, max-age=30" });
});
