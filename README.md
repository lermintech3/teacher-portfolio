# แฟ้มสะสมผลงานครู (Teacher Portfolio)

เว็บไซต์ All-in-One สำหรับครู พัฒนาทีละระยะตามแผนในเอกสาร "แผนพัฒนาเว็บไซต์ครู All-in-One"

**สถานะ:** ระยะ 2 เสร็จ ใช้งานจริงได้ บันทึกลงฐานข้อมูล Cloudflare D1 หน้าครูล็อกด้วยรหัสผ่าน

📘 วิธีใช้งานทั้งหมด: [docs/คู่มือการใช้งาน.md](docs/คู่มือการใช้งาน.md)

| หน้า | ลิงก์ | เห็นอะไร |
| --- | --- | --- |
| สาธารณะ | `/` | เฉพาะรายการที่ครูตั้งเป็น "สาธารณะ" |
| ครู | `/admin/` | ทุกเมนู เพิ่ม แก้ ลบ สลับสาธารณะ/ส่วนตัว ตั้งค่าเว็บ สำรองข้อมูล |

## โครงสร้าง

```
public/                 ← หน้าเว็บ (Cloudflare Pages: Build output directory = public)
  index.html            ← หน้าสาธารณะ
  admin/index.html      ← หน้าครู
  js/app.js             ← แกนหลัก เมนู router หน้าสาธารณะ
  js/admin.js           ← หน้าครูทุกเมนู ฟอร์ม ตั้งค่าเว็บ ล็อกอิน
  css/style.css
  data/demo.json        ← ข้อมูลตัวอย่าง (ใช้ตอนเริ่มต้นและตอนฐานข้อมูลยังว่าง)
functions/api/          ← API (Cloudflare Pages Functions)
  public.js             GET  /api/public            ข้อมูลสาธารณะเท่านั้น
  login.js, logout.js   POST /api/login, /api/logout
  admin/_middleware.js  ตรวจการล็อกอินทุกเส้นทาง /api/admin/*
  admin/data.js         GET  /api/admin/data         ข้อมูลทั้งหมด
  admin/items/[collection].js  POST เพิ่มรายการ
  admin/item/[id].js    PUT แก้ / PATCH สลับสาธารณะ / DELETE ลบ
  admin/kv/[key].js     PUT ค่าเดี่ยว (profile schedule grades attendance attendanceDates sarNotes settings)
  admin/import.js       POST นำเข้า (?replace=1 แทนที่ทั้งหมด)
  admin/export.js       GET  ดาวน์โหลดไฟล์สำรอง
src/server.js           ← โค้ดฝั่งเซิร์ฟเวอร์ที่ใช้ร่วมกัน (สร้างตารางอัตโนมัติ, ล็อกอิน, กันเดารหัส)
```

## ตั้งค่า Cloudflare (ทำครั้งเดียว)

1. Pages เชื่อม repo นี้ Build output directory = `public`
2. Storage & Databases → D1 → สร้าง `teacher-db`
3. โปรเจกต์ → Settings → Bindings → D1 database ชื่อตัวแปร `DB` → `teacher-db`
4. โปรเจกต์ → Settings → Variables and Secrets → Secret ชื่อ `ADMIN_PASSWORD`

ตารางในฐานข้อมูลสร้างเองอัตโนมัติตอนเรียก API ครั้งแรก ไม่ต้องรัน SQL

## ความปลอดภัย

- รหัสผ่านอยู่ใน Cloudflare Secret เท่านั้น คุกกี้ลงชื่อด้วย HMAC, HttpOnly, Secure, SameSite=Strict อายุ 30 วัน
- ใส่รหัสผิด 5 ครั้ง ล็อก 15 นาที
- `/api/public` ส่งเฉพาะรายการ vis = public และไม่ส่งเมนูส่วนตัวเสมอ (นักเรียน คะแนน เช็กชื่อ ดูแลช่วยเหลือ การลา ฯลฯ)
- คำสั่งแก้ข้อมูลจากโดเมนอื่นถูกปฏิเสธ
