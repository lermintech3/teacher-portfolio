// GET /api/admin/ai/config — การตั้งค่า AI ของครูที่ล็อกอิน (ไม่มี API key จริง มีแค่ตัวย่อ)
// PUT /api/admin/ai/config { provider, model, key?, clearKey?, limit, enabled }
import { handle, json, readJson } from "../../../../src/server.js";
import { publicConfig, saveConfig } from "../../../../src/ai.js";

export const onRequestGet = handle(async ({ env, data: { site } }) => json(await publicConfig(env, env.DB, site)));
export const onRequestPut = handle(async ({ request, env, data: { site } }) => json(await saveConfig(env, env.DB, site, await readJson(request))));
