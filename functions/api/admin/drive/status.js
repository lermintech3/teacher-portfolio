// GET /api/admin/drive/status — เช็กว่าเชื่อม Google Drive แล้วหรือยัง (ทดสอบที่เก็บหลัก) และรายชื่อที่เก็บทั้งหมด
import { handle, json, storageLocations, publicLoc, driveTarget, callDrive, DRIVE_CATEGORIES } from "../../../../src/server.js";

export const onRequestGet = handle(async ({ env, data: { site } }) => {
  const locs = await storageLocations(env, site);
  const primary = locs.find((l) => l.primary);
  const base = { categories: DRIVE_CATEGORIES, locations: locs.map(publicLoc) };
  if (!primary) return json({ ...base, connected: false });
  try {
    const r = await callDrive(driveTarget(primary, site, { action: "ping" }));
    return json({ ...base, connected: true, root: r.root, used: r.used, limit: r.limit, version: r.version || 1 });
  } catch (e) {
    return json({ ...base, connected: false, error: e.message });
  }
});
