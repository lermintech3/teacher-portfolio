// POST /api/admin/drive/upload?category=<key>&name=<ชื่อไฟล์>&mime=<ชนิด>
// body = ข้อมูลไฟล์แบบ base64 (ข้อความล้วน) ส่งต่อไป Apps Script ทันทีโดยไม่แปลง (ประหยัด CPU)
import { handle, json, HttpError, DRIVE_CATEGORIES, DRIVE_PRIVATE, MAX_UPLOAD_BYTES, driveTarget, callDrive } from "../../../../src/server.js";

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const q = new URL(request.url).searchParams;
  const category = DRIVE_CATEGORIES[q.get("category")] ? q.get("category") : "other";
  const name = (q.get("name") || "ไฟล์").slice(0, 200);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > MAX_UPLOAD_BYTES) throw new HttpError(413, "ไฟล์ใหญ่เกิน 20 MB");
  const target = driveTarget(env, site, {
    action: "upload", category: DRIVE_CATEGORIES[category], name,
    mime: q.get("mime") || "application/octet-stream", share: DRIVE_PRIVATE.has(category) ? "0" : "1",
  });
  // อ่านเป็น ArrayBuffer (ไม่แปลงข้อความ ใช้ CPU น้อย) แล้วส่งต่อ
  const body = await request.arrayBuffer();
  if (!body.byteLength) throw new HttpError(400, "ไม่มีข้อมูลไฟล์");
  return json(await callDrive(target, { method: "POST", headers: { "content-type": "text/plain" }, body }));
});
