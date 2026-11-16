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
    if (p.action === 'list') return out_(list_(p.person));
    if (p.action === 'delete') return out_(remove_(p.person, p.id));
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
  var folder = child_(personFolder_(p.person), p.category || 'อื่นๆ');
  var bytes = Utilities.base64Decode(base64);
  var name = String(p.name || 'ไฟล์').slice(0, 200);
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
  var root = personFolder_(person);
  var result = { ok: true, url: root.getUrl(), folders: [] };
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
  return result;
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
