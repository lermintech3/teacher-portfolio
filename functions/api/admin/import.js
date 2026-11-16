// POST /api/admin/import?replace=1 — นำเข้าข้อมูล (ข้อมูลตัวอย่าง หรือไฟล์สำรอง)
import { handle, json, readJson, importAll } from "../../../src/server.js";

export const onRequestPost = handle(async ({ request, env }) => {
  const replace = new URL(request.url).searchParams.get("replace") === "1";
  const n = await importAll(env.DB, await readJson(request), { replace });
  return json({ ok: true, written: n });
});
