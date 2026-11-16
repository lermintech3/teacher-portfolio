// POST /api/survey { site, id, answers: [1..5], comment } — ส่งคำตอบแบบประเมิน (ไม่ต้องล็อกอิน)
import { handle, json, readJson, requireSite, publicSurvey, surveyQuestions, ipHash, HttpError } from "../../src/server.js";

export const onRequestPost = handle(async ({ request, env }) => {
  const body = await readJson(request);
  const site = requireSite(body.site);
  const id = Number(body.id);
  if (!Number.isInteger(id)) throw new HttpError(400, "ไม่พบแบบประเมิน");
  const survey = await publicSurvey(env.DB, site, id);
  const n = surveyQuestions(survey).length;
  const answers = Array.isArray(body.answers) ? body.answers.map(Number) : [];
  if (answers.length !== n || answers.some((a) => !Number.isInteger(a) || a < 1 || a > 5)) throw new HttpError(400, "กรุณาให้คะแนนให้ครบทุกข้อ");
  const comment = String(body.comment || "").slice(0, 500);
  const ip = await ipHash(request, `${site}:${id}`);
  const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM survey_responses WHERE site = ? AND survey_id = ? AND ip_hash = ? AND created_at > ?`)
    .bind(site, id, ip, Date.now() - 60 * 1000).first();
  if (recent.n > 0) throw new HttpError(429, "ส่งคำตอบแล้ว ขอบคุณครับ/ค่ะ (ส่งซ้ำได้อีกครั้งในอีก 1 นาที)");
  await env.DB.prepare(`INSERT INTO survey_responses (site, survey_id, answers, comment, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(site, id, JSON.stringify(answers), comment, ip, Date.now()).run();
  return json({ ok: true });
});
