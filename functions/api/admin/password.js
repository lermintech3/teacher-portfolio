// POST /api/admin/password { current, next } — ครูเปลี่ยนรหัสผ่านของตัวเอง
// สำเร็จแล้วออกคุกกี้ใหม่ให้เครื่องนี้ เครื่องอื่นที่เคยล็อกอินต้องล็อกอินใหม่
import { handle, json, readJson, changePassword, sessionCookie } from "../../../src/server.js";

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const { current, next } = await readJson(request);
  await changePassword(env, env.DB, site, current, next);
  return json({ ok: true }, 200, { "set-cookie": await sessionCookie(env, site, env.DB) });
});
