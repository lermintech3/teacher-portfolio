// GET /api/admin/drive/status — เช็กว่าเชื่อม Google Drive แล้วหรือยัง
import { handle, json, driveTarget, callDrive, DRIVE_CATEGORIES } from "../../../../src/server.js";

export const onRequestGet = handle(async ({ env, data: { site } }) => {
  if (!env.DRIVE_SCRIPT_URL || !env.DRIVE_SECRET) return json({ connected: false, categories: DRIVE_CATEGORIES });
  try {
    const r = await callDrive(driveTarget(env, site, { action: "ping" }));
    return json({ connected: true, root: r.root, categories: DRIVE_CATEGORIES });
  } catch (e) {
    return json({ connected: false, error: e.message, categories: DRIVE_CATEGORIES });
  }
});
