// GET /api/admin/drive/list — ไฟล์ทั้งหมดในโฟลเดอร์ของครูที่ล็อกอิน แยกตามหมวด
import { handle, json, driveTarget, callDrive } from "../../../../src/server.js";

export const onRequestGet = handle(async ({ env, data: { site } }) => json(await callDrive(driveTarget(env, site, { action: "list" }))));
