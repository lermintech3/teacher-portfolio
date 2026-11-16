// POST /api/admin/drive/delete { id } — ย้ายไฟล์ไปถังขยะของ Drive (กู้คืนได้ 30 วัน)
import { handle, json, readJson, HttpError, driveTarget, callDrive } from "../../../../src/server.js";

export const onRequestPost = handle(async ({ request, env, data: { site } }) => {
  const { id } = await readJson(request);
  if (!/^[\w-]{10,}$/.test(id || "")) throw new HttpError(400, "รหัสไฟล์ไม่ถูกต้อง");
  return json(await callDrive(driveTarget(env, site, { action: "delete", id })));
});
