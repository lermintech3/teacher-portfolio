// POST /api/logout — ลบคุกกี้
import { json, clearCookie } from "../../src/server.js";

export const onRequestPost = () => json({ ok: true }, 200, { "set-cookie": clearCookie() });
