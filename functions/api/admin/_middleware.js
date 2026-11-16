// ทุกเส้นทางใต้ /api/admin/* ต้องล็อกอินก่อน
import { fail, isLoggedIn } from "../../../src/server.js";

export async function onRequest({ request, env, next }) {
  try {
    if (!(await isLoggedIn(request, env))) return fail(401, "กรุณาเข้าสู่ระบบ");
  } catch (e) {
    return fail(e.status || 500, e.message);
  }
  // กันการส่งคำสั่งแก้ข้อมูลจากเว็บอื่น
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return fail(403, "ไม่อนุญาต");
  }
  return next();
}
