// GET /api/admin/me — ใช้เช็กว่ายังล็อกอินอยู่ และเป็นใคร
import { json } from "../../../src/server.js";

export const onRequestGet = ({ data }) => json({ ok: true, site: data.site });
