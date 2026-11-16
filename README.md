# แฟ้มสะสมผลงานครู (Teacher Portfolio)

เว็บไซต์ All-in-One สำหรับครู พัฒนาทีละระยะตามแผนในเอกสาร "แผนพัฒนาเว็บไซต์ครู All-in-One"

**สถานะ:** ระยะ 1 — หน้า Portfolio สาธารณะ (ข้อมูลจากไฟล์ JSON)

## โครงสร้าง

```
public/              ← ไฟล์ทั้งหมดที่ขึ้นเว็บ (Cloudflare Pages ใช้โฟลเดอร์นี้)
  index.html
  css/style.css
  js/app.js
  data/profile.json  ← แก้ข้อมูลของครูที่ไฟล์นี้
functions/           ← (ระยะ 2) API ที่ต่อกับฐานข้อมูล D1
```

## ตั้งค่า Cloudflare Pages (ทำครั้งเดียว)

1. Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. เลือก repo `teacher-portfolio`
3. ตั้งค่า build:
   - Framework preset: **None**
   - Build command: *(เว้นว่าง)*
   - Build output directory: **public**
4. กด **Save and Deploy** — ทุกครั้งที่มีโค้ดใหม่เข้า `main` เว็บจะอัปเดตเอง

## แก้ข้อมูลของครู (ระยะ 1)

แก้ไฟล์ `public/data/profile.json` ผ่านหน้าเว็บ GitHub ได้เลย (กดไอคอนดินสอ → แก้ → Commit changes)

- รายการที่ขึ้นต้นด้วย `(ตัวอย่าง)` ให้แก้เป็นข้อมูลจริงหรือลบทิ้ง
- วันที่ใช้รูปแบบ `ปี ค.ศ.-เดือน-วัน` เช่น `2026-11-16` (เว็บแสดงเป็น พ.ศ. ให้เอง)
- รูปและไฟล์ ใส่เป็นลิงก์ (`https://...`) ระยะ 3 จะมีระบบอัปโหลดลง Google Drive

> ⚠️ ไฟล์นี้ทุกคนเปิดดูได้ ห้ามใส่ข้อมูลนักเรียน เลขบัตรประชาชน เบอร์โทร หรือที่อยู่
