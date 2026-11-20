/**
 * แฟ้มสะสมผลงานครู — ตัวรับไฟล์ลง Google Drive
 *
 * วิธีติดตั้ง (ทำครั้งเดียว ดูรายละเอียดใน docs/คู่มือการใช้งาน.md หัวข้อ Google Drive)
 * 1. script.google.com → New project → วางโค้ดทั้งไฟล์นี้แทนของเดิม → บันทึก
 * 2. Project Settings → Script Properties → Add property
 *      SECRET = รหัสลับยาวๆ (ตัวเดียวกับ DRIVE_SECRET ใน Cloudflare)
 * 3. Deploy → New deployment → ชนิด Web app
 *      Execute as: Me   |   Who has access: Anyone
 *    → Authorize access (อนุญาตให้เข้าถึง Drive) → คัดลอก Web app URL
 * 4. ใส่ Web app URL ใน Cloudflare ชื่อ DRIVE_SCRIPT_URL แล้ว deploy เว็บใหม่
 *
 * สคริปต์นี้ทำงานในนามเจ้าของบัญชี จึงไม่ต้องแชร์โฟลเดอร์ให้ใคร
 * เว็บเรียกสคริปต์นี้ผ่าน Cloudflare เท่านั้น (ต้องมี SECRET ถูกต้อง)
 */

// โฟลเดอร์หลัก (จากลิงก์ drive.google.com/drive/folders/<ID>)
var ROOT_FOLDER_ID = '1bnLe62mvOmopg8mYMEl13vHlKNwd35GL';
var MAX_LIST = 300;

function doPost(e) { return handle_(e); }
function doGet(e) { return handle_(e); }

function handle_(e) {
  var p = (e && e.parameter) || {};
  var secret = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!secret || p.secret !== secret) return out_({ error: 'รหัสลับไม่ถูกต้อง (SECRET ใน Apps Script กับ DRIVE_SECRET ใน Cloudflare ต้องตรงกัน)' });
  try {
    if (p.action === 'ping') return out_({ ok: true, root: DriveApp.getFolderById(ROOT_FOLDER_ID).getName() });
    if (p.action === 'upload') return out_(upload_(p, e.postData ? e.postData.contents : ''));
    if (p.action === 'list') return out_(list_(param_(p, 'person')));
    if (p.action === 'delete') return out_(remove_(param_(p, 'person'), p.id));
    return out_({ error: 'ไม่รู้จักคำสั่ง' });
  } catch (err) {
    return out_({ error: String(err && err.message || err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// หาโฟลเดอร์ลูกตามชื่อ ถ้าไม่มีให้สร้าง
function child_(parent, name) {
  var it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function personFolder_(person) {
  if (!person) throw new Error('ไม่ระบุเจ้าของไฟล์');
  return child_(DriveApp.getFolderById(ROOT_FOLDER_ID), person);
}

function upload_(p, base64) {
  if (!base64) throw new Error('ไม่มีข้อมูลไฟล์');
  var folder = child_(personFolder_(param_(p, 'person')), param_(p, 'category') || 'อื่นๆ');
  var bytes = Utilities.base64Decode(base64);
  var name = String(param_(p, 'name') || 'ไฟล์').slice(0, 200);
  var blob = Utilities.newBlob(bytes, p.mime || 'application/octet-stream', name);
  var file = folder.createFile(blob);
  file.setDescription('อัปโหลดจากแฟ้มสะสมผลงานครู');
  // หมวดที่อาจแสดงในหน้าสาธารณะ: เปิดให้ "ทุกคนที่มีลิงก์ดูได้" (หมวดส่วนตัวไม่แชร์)
  if (p.share === '1') {
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (err) { /* บัญชีองค์กรบางแห่งไม่อนุญาต */ }
  }
  return info_(file, folder);
}

function info_(file, folder) {
  var id = file.getId();
  var mime = file.getMimeType();
  return {
    ok: true, id: id, name: file.getName(), mime: mime, size: file.getSize(),
    url: file.getUrl(),
    img: mime.indexOf('image/') === 0 ? 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600' : '',
    updated: file.getLastUpdated().toISOString(),
    folder: folder ? folder.getName() : '',
    shared: file.getSharingAccess() === DriveApp.Access.ANYONE_WITH_LINK,
  };
}

function list_(person) {
  var repaired = 0;
  try { repaired = repair_(DriveApp.getFolderById(ROOT_FOLDER_ID), person); } catch (err) { /* ซ่อมไม่ได้ก็แสดงรายการตามปกติ */ }
  var root = personFolder_(person);
  var result = { ok: true, url: root.getUrl(), folders: [], repaired: repaired };
  var count = 0;
  var folders = root.getFolders();
  while (folders.hasNext()) {
    var f = folders.next();
    var entry = { name: f.getName(), url: f.getUrl(), files: [] };
    var files = f.getFiles();
    while (files.hasNext() && count < MAX_LIST) { entry.files.push(info_(files.next(), null)); count++; }
    entry.files.sort(function (a, b) { return a.updated < b.updated ? 1 : -1; });
    result.folders.push(entry);
  }
  result.folders.sort(function (a, b) { return a.name < b.name ? -1 : 1; });
  result.truncated = count >= MAX_LIST;
  result.usage = usage_(root);
  return result;
}

// พื้นที่ Google Drive ของบัญชีเจ้าของสคริปต์ + ขนาดโฟลเดอร์ของครูคนนี้ (นับทุกไฟล์ ไม่จำกัด 300)
function usage_(root) {
  var u = { mine: 0, files: 0 };
  try {
    var folders = root.getFolders();
    while (folders.hasNext()) {
      var files = folders.next().getFiles();
      while (files.hasNext()) { u.mine += files.next().getSize(); u.files++; }
    }
    var loose = root.getFiles();
    while (loose.hasNext()) { u.mine += loose.next().getSize(); u.files++; }
  } catch (err) { u.mineError = String(err && err.message || err); }
  try { u.used = DriveApp.getStorageUsed(); u.limit = DriveApp.getStorageLimit(); }
  catch (err) { u.error = String(err && err.message || err); }
  return u;
}

// ย้ายไฟล์ไปถังขยะ (กู้คืนได้ใน Drive 30 วัน) เฉพาะไฟล์ในโฟลเดอร์ของคนนั้น
function remove_(person, id) {
  var root = personFolder_(person);
  var file = DriveApp.getFileById(id);
  var parents = file.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    var up = parent.getParents();
    if (parent.getId() === root.getId() || (up.hasNext() && up.next().getId() === root.getId())) {
      file.setTrashed(true);
      return { ok: true };
    }
  }
  throw new Error('ลบได้เฉพาะไฟล์ในโฟลเดอร์ของตัวเอง');
}

// ---------- แก้ชื่อภาษาไทยเพี้ยน ----------
// สคริปต์รุ่นก่อน: ตอนอัปโหลด (POST) Apps Script อ่านชื่อภาษาไทยผิดรหัส ได้โฟลเดอร์ชื่อแบบ "à¹€à¸‰à¸¥..."
// ตอนนี้เว็บส่งชื่อแบบ base64 มาด้วย (person_b64, category_b64, name_b64) จึงไม่เพี้ยนอีก
// และทุกครั้งที่เปิดหน้า "ไฟล์" สคริปต์จะย้ายไฟล์จากโฟลเดอร์ชื่อเพี้ยนกลับเข้าโฟลเดอร์ที่ถูกต้องให้เอง (ลิงก์ไฟล์เดิมใช้ได้เหมือนเดิม)
var CATEGORY_NAMES = ['รูปโปรไฟล์', 'เกียรติบัตรและรางวัล', 'การอบรมและพัฒนาตนเอง', 'แผนการสอนและสื่อ', 'บันทึกหลังสอน', 'การนิเทศ',
  'ผลงาน วิจัย นวัตกรรม', 'รายงาน SAR และ PA', 'หลักฐาน PA', 'โครงการ', 'กิจกรรมพัฒนาผู้เรียน', 'งานที่รับผิดชอบ',
  'หนังสือราชการ', 'บันทึกการประชุม', 'ดูแลช่วยเหลือนักเรียน', 'การลา', 'อื่นๆ'];
var CP1252_ = { 0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85, 0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88,
  0x2030: 0x89, 0x0160: 0x8A, 0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92, 0x201C: 0x93, 0x201D: 0x94,
  0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97, 0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C, 0x017E: 0x9E, 0x0178: 0x9F };

// อ่านค่าที่เว็บส่งมา: ใช้แบบ base64 (ไม่เพี้ยน) ถ้ามี
function param_(p, k) {
  if (p[k + '_b64']) {
    try { return Utilities.newBlob(Utilities.base64DecodeWebSafe(p[k + '_b64'])).getDataAsString('UTF-8'); } catch (err) { /* ใช้ค่าปกติ */ }
  }
  return p[k];
}
function garbled_(s) { return /à[¸¹]/.test(String(s)); }
// เทียบชื่อเพี้ยนกับชื่อจริง โดยไม่สนไบต์ช่วง 0x80–0x9F (ช่วงที่อาจหายไปตอนเพี้ยน)
function keyThai_(s) {
  var b = Utilities.newBlob(String(s)).getBytes(), out = [];
  for (var i = 0; i < b.length; i++) { var x = b[i] & 255; if (x < 0x80 || x >= 0xA0) out.push(x); }
  return out.join(',');
}
function keyGarbled_(s) {
  var out = [];
  for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c < 0x80 || (c >= 0xA0 && c <= 0xFF)) out.push(c); }
  return out.join(',');
}
// แปลงกลับแบบตรงตัว ถ้าข้อมูลหายบางส่วนคืน null
function unGarble_(s) {
  var bytes = [];
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i), b = c <= 0xFF ? c : CP1252_[c];
    if (b === undefined) return null;
    bytes.push(b > 127 ? b - 256 : b);
  }
  var out = Utilities.newBlob(bytes).getDataAsString('UTF-8');
  return out.indexOf('\uFFFD') >= 0 ? null : out;
}
function fixName_(s, known) {
  var k = keyGarbled_(s);
  for (var i = 0; i < known.length; i++) if (keyThai_(known[i]) === k) return known[i];
  return unGarble_(s);
}
function fixFile_(file) {
  var n = file.getName();
  if (!garbled_(n)) return;
  var fixed = unGarble_(n);
  if (fixed) file.setName(fixed);
}
function empty_(folder) { return !folder.getFiles().hasNext() && !folder.getFolders().hasNext(); }
// ย้ายไฟล์จากโฟลเดอร์ชื่อเพี้ยนของครูคนนี้ ไปโฟลเดอร์ชื่อถูก แล้วย้ายโฟลเดอร์เพี้ยนที่ว่างไปถังขยะ
function repair_(top, person) {
  if (!person) return 0;
  var bad = [], it = top.getFolders(), want = keyThai_(person), moved = 0;
  while (it.hasNext()) { var f = it.next(); if (garbled_(f.getName()) && keyGarbled_(f.getName()) === want) bad.push(f); }
  if (!bad.length) return 0;
  var target = child_(top, person);
  bad.forEach(function (g) {
    var subs = g.getFolders();
    while (subs.hasNext()) {
      var sub = subs.next(), nm = sub.getName();
      var dest = child_(target, garbled_(nm) ? (fixName_(nm, CATEGORY_NAMES) || nm) : nm);
      var files = sub.getFiles();
      while (files.hasNext()) { var file = files.next(); fixFile_(file); file.moveTo(dest); moved++; }
      if (empty_(sub)) sub.setTrashed(true);
    }
    var loose = g.getFiles();
    while (loose.hasNext()) { var lf = loose.next(); fixFile_(lf); lf.moveTo(target); moved++; }
    if (empty_(g)) g.setTrashed(true);
  });
  return moved;
}
