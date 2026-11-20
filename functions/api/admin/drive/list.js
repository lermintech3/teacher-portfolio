// GET /api/admin/drive/list?loc=<ที่เก็บ> — ไฟล์ทั้งหมดในโฟลเดอร์ของครูที่ล็อกอิน แยกตามหมวด (ไม่ระบุ = ที่เก็บหลัก)
import { handle, json, storageLoc, driveTarget, callDrive, publicLoc } from "../../../../src/server.js";

export const onRequestGet = handle(async ({ request, env, data: { site } }) => {
  const loc = await storageLoc(env, site, new URL(request.url).searchParams.get("loc"));
  return json({ ...(await callDrive(driveTarget(loc, site, { action: "list" }))), loc: publicLoc(loc) });
});
