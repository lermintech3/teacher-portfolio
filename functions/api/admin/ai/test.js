// POST /api/admin/ai/test — ลองเรียก AI ด้วยคีย์ที่บันทึกไว้
import { handle, json } from "../../../../src/server.js";
import { testConnection } from "../../../../src/ai.js";

export const onRequestPost = handle(async ({ env, data: { site } }) => json(await testConnection(env, env.DB, site)));
