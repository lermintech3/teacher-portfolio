// GET /api/admin/me — ใช้เช็กว่ายังล็อกอินอยู่
import { json } from "../../../src/server.js";

export const onRequestGet = () => json({ ok: true });
