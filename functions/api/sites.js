// GET /api/sites — รายชื่อครูทุกคนสำหรับหน้าแรก (เฉพาะข้อมูลโปรไฟล์ที่เป็นสาธารณะอยู่แล้ว)
import { handle, json, SITES, withDefaults } from "../../src/server.js";

export const onRequestGet = handle(async ({ env }) => {
  const rows = (await env.DB.prepare(`SELECT site, key, value FROM kv WHERE key IN ('profile', 'settings')`).all()).results || [];
  const get = (slug, key) => { const r = rows.find((x) => x.site === slug && x.key === key); return r ? JSON.parse(r.value) : {}; };
  const sites = SITES.map(({ slug, name }) => {
    const raw = get(slug, "profile");
    const p = withDefaults(raw, slug); // ยังเป็นชื่อตัวอย่างอยู่ → แสดงชื่อจริงแทน
    return {
      slug, name: p.name || name, ready: !!raw.name,
      position: p.position || "", academicStanding: p.academicStanding || "", school: p.school || "",
      learningArea: p.learningArea || "", subjects: p.subjects || [], photo: p.photo || "",
      siteTitle: get(slug, "settings").siteTitle || "",
    };
  });
  return json({ sites }, 200, { "cache-control": "public, max-age=30" });
});
