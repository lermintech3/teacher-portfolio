// POST /api/admin/ai/fill { title, fields: [{key,label,type,options}], files: [{mime,data,name}], hint? }
// ให้ AI อ่านรูป/PDF แล้วคืนค่าที่จะกรอกลงฟอร์ม (ยังไม่บันทึก ครูตรวจแล้วกดบันทึกเอง)
import { handle, json, HttpError } from "../../../../src/server.js";
import { fillForm, MAX_AI_BODY } from "../../../../src/ai.js";

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const text = await request.text();
  if (text.length > MAX_AI_BODY) throw new HttpError(413, "ไฟล์ใหญ่เกินไป (รวมไม่เกินราว 10 MB) ลองถ่ายรูปใหม่หรือใช้ไฟล์ที่เล็กลง");
  let body;
  try { body = JSON.parse(text); } catch { throw new HttpError(400, "รูปแบบข้อมูลไม่ถูกต้อง"); }
  return json(await fillForm(env, env.DB, site, body));
});
