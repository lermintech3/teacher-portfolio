// GET /api/public — ข้อมูลเฉพาะรายการสาธารณะ (ไม่ต้องล็อกอิน)
import { handle, json, loadAll } from "../../src/server.js";

export const onRequestGet = handle(async ({ env }) =>
  json(await loadAll(env.DB, { publicOnly: true }), 200, { "cache-control": "public, max-age=30" }));
