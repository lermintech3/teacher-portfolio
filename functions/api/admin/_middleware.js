// ทุกเส้นทางใต้ /api/admin/* ต้องล็อกอินก่อน และทำงานกับข้อมูลของคนที่ล็อกอินเท่านั้น
import { fail, sessionSite, ensureSchema } from "../../../src/server.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  let site;
  try {
    if (!env.DB) return fail(500, "ยังไม่ได้ผูกฐานข้อมูล D1 กับโปรเจกต์ (Settings → Bindings → D1 ชื่อ DB)");
    await ensureSchema(env.DB);
    site = await sessionSite(request, env, env.DB);
  } catch (e) { return fail(e.status || 500, e.message); }
  if (!site) return fail(401, "กรุณาเข้าสู่ระบบ");
  // กันการส่งคำสั่งแก้ข้อมูลจากเว็บอื่น
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return fail(403, "ไม่อนุญาต");
  }
  context.data.site = site;
  return next();
}
