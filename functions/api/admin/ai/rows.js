// POST /api/admin/ai/rows { title, fields, files?, text?, hint?, max? }
// ให้ AI อ่านเอกสารที่มีหลายรายการ (ตารางสอน คำสั่ง) คืนเป็นแถว ครูเลือกแถวก่อนบันทึก
import { handle, json, HttpError } from "../../../../src/server.js";
import { extractRows, MAX_AI_BODY } from "../../../../src/ai.js";

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const text = await request.text();
  if (text.length > MAX_AI_BODY) throw new HttpError(413, "ไฟล์ใหญ่เกินไป (รวมไม่เกินราว 10 MB) ลองถ่ายรูปใหม่หรือใช้ไฟล์ที่เล็กลง");
  let body;
  try { body = JSON.parse(text); } catch { throw new HttpError(400, "รูปแบบข้อมูลไม่ถูกต้อง"); }
  return json(await extractRows(env, env.DB, site, body));
});
