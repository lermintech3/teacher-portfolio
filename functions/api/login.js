// POST /api/login { password } — ตั้งคุกกี้เข้าสู่ระบบ 30 วัน
import { handle, json, fail, readJson, passwordMatches, sessionCookie, checkLock, recordFail, clearFails, clientIp, MAX_FAILS } from "../../src/server.js";

export const onRequestPost = handle(async ({ request, env }) => {
  const ip = clientIp(request);
  const prev = await checkLock(env.DB, ip);
  const { password } = await readJson(request);
  if (!(await passwordMatches(env, password))) {
    const n = await recordFail(env.DB, ip, prev);
    return fail(401, n >= MAX_FAILS ? "ใส่รหัสผิดหลายครั้ง ลองใหม่ได้ในอีก 15 นาที" : `รหัสผ่านไม่ถูกต้อง (เหลืออีก ${MAX_FAILS - n} ครั้ง)`);
  }
  await clearFails(env.DB, ip);
  return json({ ok: true }, 200, { "set-cookie": await sessionCookie(env) });
});
