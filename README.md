# แฟ้มสะสมผลงานครู (Teacher Portfolio)

เว็บไซต์ All-in-One สำหรับครู พัฒนาทีละระยะตามแผนในเอกสาร "แผนพัฒนาเว็บไซต์ครู All-in-One"

**สถานะ:** ระยะ 2 เสร็จ ใช้งานจริงได้ บันทึกลงฐานข้อมูล Cloudflare D1 หน้าครูล็อกด้วยรหัสผ่าน

📘 วิธีใช้งานทั้งหมด: [docs/คู่มือการใช้งาน.md](docs/คู่มือการใช้งาน.md)

| หน้า | ลิงก์ | เห็นอะไร |
| --- | --- | --- |
| หน้าแรก | `/` | โปรไฟล์ครูทุกคน (ตอนนี้ 2 คน) |
| แฟ้มผลงานแต่ละคน | `/chalermphon/`, `/waraporn/` | เฉพาะรายการที่ครูคนนั้นตั้งเป็น "สาธารณะ" |
| ครู | `/admin/` | รหัสผ่านบอกว่าเป็นใคร เห็นและแก้ได้เฉพาะข้อมูลตัวเอง |

## โครงสร้าง

```
public/                 ← หน้าเว็บ (Cloudflare Pages: Build output directory = public)
  index.html            ← หน้าแรก (โปรไฟล์ทุกคน) + js/landing.js + css/landing.css
  chalermphon/, waraporn/  ← หน้าแฟ้มผลงานสาธารณะของแต่ละคน (ไฟล์เหมือนกัน แยกคนจากชื่อโฟลเดอร์)
  admin/index.html      ← หน้าครู
  js/app.js             ← แกนหลัก เมนู router หน้าสาธารณะ
  js/admin.js           ← หน้าครูทุกเมนู ฟอร์ม ตั้งค่าเว็บ ล็อกอิน
  js/ai.js, css/ai.css, src/ai.js, functions/api/admin/ai/ ← AI ผู้ช่วย (ครูใส่ API key เอง: Claude / ChatGPT / Gemini)
  js/sar.js, css/sar.css ← เมนู SAR ตามแบบฟอร์มโรงเรียน ดูตัวอย่าง A4 แบ่งหน้าเอง และพิมพ์/บันทึก PDF
  js/ios.js, css/ios.css ← ส่วนประกอบแบบ iOS: Wheel/Date/Time/Number Picker, Switch, Segmented, Checkbox, Radio, Text Field
  css/style.css
  data/demo.json        ← ข้อมูลตัวอย่าง (ใช้ตอนเริ่มต้นและตอนฐานข้อมูลยังว่าง)
functions/api/          ← API (Cloudflare Pages Functions)
  public.js             GET  /api/public?site=<slug> ข้อมูลสาธารณะของคนนั้นเท่านั้น
  sites.js              GET  /api/sites             รายชื่อและโปรไฟล์ทุกคน (หน้าแรก)
  login.js, logout.js   POST /api/login, /api/logout
  admin/_middleware.js  ตรวจการล็อกอินทุกเส้นทาง /api/admin/*
  admin/data.js         GET  /api/admin/data         ข้อมูลทั้งหมด
  admin/items/[collection].js  POST เพิ่มรายการ
  admin/item/[id].js    PUT แก้ / PATCH สลับสาธารณะ / DELETE ลบ
  admin/kv/[key].js     PUT ค่าเดี่ยว (profile schedule grades attendance attendanceDates sarNotes settings)
  admin/import.js       POST นำเข้า (?replace=1 แทนที่ทั้งหมด)
  admin/export.js       GET  ดาวน์โหลดไฟล์สำรอง
  admin/drive/          upload / list / delete / status — ส่งต่อไป Google Apps Script
google-apps-script/Code.gs  ← ตัวรับไฟล์ลง Google Drive (ครูติดตั้งเองใน script.google.com)
src/server.js           ← โค้ดฝั่งเซิร์ฟเวอร์ที่ใช้ร่วมกัน (สร้างตารางอัตโนมัติ, ล็อกอิน, กันเดารหัส)
```

## ตั้งค่า Cloudflare (ทำครั้งเดียว)

1. Pages เชื่อม repo นี้ Build output directory = `public`
2. Storage & Databases → D1 → สร้าง `teacher-db`
3. โปรเจกต์ → Settings → Bindings → D1 database ชื่อตัวแปร `DB` → `teacher-db`
4. โปรเจกต์ → Settings → Variables and Secrets → Secret: `ADMIN_PASSWORD` (เฉลิมพล) และ `PASSWORD_WARAPORN` (วราภรณ์) ต้องไม่ซ้ำกัน

5. (ไฟล์) `DRIVE_SCRIPT_URL` และ Secret `DRIVE_SECRET` ดูคู่มือหัวข้อ 5
6. (AI ผู้ช่วย ไม่บังคับ) Secret `AI_SECRET` ข้อความสุ่มยาว 16 ตัวขึ้นไป ใช้เข้ารหัส API key ที่ครูใส่เอง ดูคู่มือหัวข้อ 5.3

ตารางในฐานข้อมูลสร้างเองอัตโนมัติตอนเรียก API ครั้งแรก ไม่ต้องรัน SQL ฐานข้อมูลรุ่นแรก (ก่อนแยกสองคน) ย้ายเองอัตโนมัติ ข้อมูลเดิมเป็นของคนแรก

## ความปลอดภัย

- ทุกแถวในฐานข้อมูลมี `site` ทุกคำสั่งกรองตามคนที่ล็อกอิน แก้ข้อมูลข้ามคนไม่ได้
- รหัสผ่านอยู่ใน Cloudflare Secret เท่านั้น คุกกี้ระบุเจ้าของและลงชื่อด้วย HMAC จากรหัสของคนนั้น, HttpOnly, Secure, SameSite=Strict อายุ 30 วัน
- ครูเปลี่ยนรหัสเองได้ (`/api/admin/password`) เก็บ PBKDF2 + salt ในตาราง `auth` ถ้าค่าใน Cloudflare เปลี่ยน รหัสที่ตั้งเองถูกยกเลิก (ใช้กู้คืนเมื่อลืมรหัส)
- ใส่รหัสผิด 5 ครั้ง ล็อก 15 นาที
- `/api/public` ส่งเฉพาะรายการ vis = public และไม่ส่งเมนูส่วนตัวเสมอ (นักเรียน คะแนน เช็กชื่อ ดูแลช่วยเหลือ การลา ฯลฯ)
- คำสั่งแก้ข้อมูลจากโดเมนอื่นถูกปฏิเสธ
- อัปโหลดไฟล์ต้องล็อกอิน เซิร์ฟเวอร์กำหนดโฟลเดอร์เจ้าของเอง และส่ง DRIVE_SECRET ไป Apps Script (เบราว์เซอร์ไม่เห็น)
