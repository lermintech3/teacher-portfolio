// ทุกเส้นทางใต้ /api/admin/* ต้องล็อกอินก่อน และทำงานกับข้อมูลของคนที่ล็อกอินเท่านั้น
import { fail, sessionSite } from "../../../src/server.js";

export async function onRequest(context) {
  const { request, env, next } = context;
  let site;
  try { site = await sessionSite(request, env); } catch (e) { return fail(e.status || 500, e.message); }
  if (!site) return fail(401, "กรุณาเข้าสู่ระบบ");
  // กันการส่งคำสั่งแก้ข้อมูลจากเว็บอื่น
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return fail(403, "ไม่อนุญาต");
  }
  context.data.site = site;
  return next();
}
