// GET    /api/admin/survey/:id — สรุปผลแบบประเมิน (ค่าเฉลี่ยรายข้อ จำนวนผู้ตอบ ความคิดเห็น)
// DELETE /api/admin/survey/:id — ล้างคำตอบทั้งหมดของแบบประเมินนี้
import { handle, json, getItem, surveyQuestions, HttpError } from "../../../../src/server.js";

const load = async (env, site, params) => {
  const id = Number(params.id);
  const row = await getItem(env.DB, site, id);
  if (row.collection !== "surveys") throw new HttpError(404, "ไม่พบแบบประเมิน");
  return { id, survey: JSON.parse(row.data) };
};

export const onRequestGet = handle(async ({ env, params, data: { site } }) => {
  const { id, survey } = await load(env, site, params);
  const qs = surveyQuestions(survey);
  const rows = (await env.DB.prepare(`SELECT answers, comment, created_at FROM survey_responses WHERE site = ? AND survey_id = ? ORDER BY created_at DESC`).bind(site, id).all()).results || [];
  const sums = qs.map(() => 0), dist = qs.map(() => [0, 0, 0, 0, 0]);
  let counted = 0;
  for (const r of rows) {
    const a = JSON.parse(r.answers);
    if (a.length !== qs.length) continue; // คำถามถูกแก้ภายหลัง ข้ามคำตอบชุดเก่า
    counted++;
    a.forEach((v, i) => { sums[i] += v; dist[i][v - 1]++; });
  }
  const avg = sums.map((x) => (counted ? Math.round((x / counted) * 100) / 100 : 0));
  return json({
    count: rows.length, counted, questions: qs.map((q, i) => ({ q, avg: avg[i], dist: dist[i] })),
    overall: counted ? Math.round((avg.reduce((a, b) => a + b, 0) / qs.length) * 100) / 100 : 0,
    comments: rows.filter((r) => r.comment).slice(0, 100).map((r) => ({ text: r.comment, at: r.created_at })),
  });
});

export const onRequestDelete = handle(async ({ env, params, data: { site } }) => {
  const { id } = await load(env, site, params);
  await env.DB.prepare(`DELETE FROM survey_responses WHERE site = ? AND survey_id = ?`).bind(site, id).run();
  return json({ ok: true });
});
