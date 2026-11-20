// แฟ้มสะสมผลงานครู — หน้าสาธารณะของแต่ละคน (/<slug>/) และหน้าครู (/admin/ ต้องใส่รหัสผ่าน)
// แกนหลัก: เมนู, router, ส่วนประกอบที่ใช้ร่วมกัน, หน้าสาธารณะ
// ข้อมูลมาจาก API (Cloudflare D1)
const IS_ADMIN = !!window.IS_ADMIN;
// หน้าสาธารณะ: เจ้าของดูจากโฟลเดอร์ เช่น /waraporn/  หน้าครู: รู้จากการล็อกอิน
let SITE = IS_ADMIN ? "" : location.pathname.split("/")[1];
const DEMO_URL = "/data/demo.json";
const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];

const App = { DATA: null, pages: {}, mode: IS_ADMIN ? "admin" : "public" };

// ---------- เมนูของแต่ละโหมด (สีประจำหมวด) ----------
const C = {
  violet: "#6c4cf1", coral: "#ff5c4d", sky: "#1a9fe8", gold: "#f2a900", mint: "#12b886",
  pink: "#e8459b", indigo: "#3d4fd8", orange: "#f57c1f", teal: "#0e9fb0", slate: "#64748b",
};

App.NAV = {
  public: [{ items: [
    { route: "", label: "หน้าแรก", c: C.violet },
    { route: "responsibilities", label: "งานที่รับผิดชอบ", c: C.coral },
    { route: "schedule", label: "ตารางสอน", c: C.sky },
    { route: "certificates", label: "เกียรติบัตรและรางวัล", c: C.gold },
    { route: "trainings", label: "การพัฒนาตนเอง", c: C.mint },
    { route: "works", label: "ผลงานเด่น", c: C.pink },
    { route: "albums", label: "อัลบั้มภาพกิจกรรม", c: C.orange },
    { route: "videos", label: "วิดีโอการสอน", c: C.coral },
    { route: "facebook", label: "กิจกรรมจาก Facebook", c: C.sky },
    { route: "media", label: "คลังสื่อการสอน", c: C.teal },
    { route: "pa", label: "หลักฐานตามตัวชี้วัด PA", c: C.indigo },
    { route: "reports", label: "SAR / PA", c: C.indigo },
  ] }],
  admin: [
    { group: "ภาพรวม", items: [{ route: "admin", label: "แดชบอร์ด", c: C.violet }, { route: "admin/home", label: "จัดหน้าแรก", c: C.violet }] },
    { group: "การสอน", items: [
      { route: "admin/schedule", label: "ตารางสอน", c: C.sky },
      { route: "admin/plans", label: "แผนการสอนและสื่อ", c: C.sky },
      { route: "admin/reflections", label: "บันทึกหลังสอน", c: C.sky },
      { route: "admin/grades", label: "การวัดผล (ปพ.5)", c: C.sky },
      { route: "admin/supervision", label: "นิเทศ / Open Class", c: C.sky },
    ] },
    { group: "นักเรียน", items: [
      { route: "admin/attendance", label: "รายชื่อและเช็กชื่อ", c: C.orange },
      { route: "admin/care", label: "ดูแลช่วยเหลือนักเรียน", c: C.orange },
      { route: "admin/activities", label: "กิจกรรมพัฒนาผู้เรียน", c: C.orange },
    ] },
    { group: "งานในหน้าที่", items: [
      { route: "admin/orders", label: "คำสั่ง", c: C.coral },
      { route: "admin/responsibilities", label: "งานที่รับผิดชอบ", c: C.coral },
      { route: "admin/projects", label: "โครงการและงบประมาณ", c: C.coral },
      { route: "admin/documents", label: "หนังสือราชการ", c: C.coral },
      { route: "admin/meetings", label: "บันทึกการประชุม", c: C.coral },
    ] },
    { group: "พัฒนาตนเองและผลงาน", items: [
      { route: "admin/trainings", label: "อบรม / PLC", c: C.mint },
      { route: "admin/certificates", label: "เกียรติบัตรและรางวัล", c: C.gold },
      { route: "admin/works", label: "ผลงาน วิจัย นวัตกรรม", c: C.pink },
      { route: "admin/albums", label: "อัลบั้มภาพกิจกรรม", c: C.orange },
      { route: "admin/videos", label: "วิดีโอการสอน", c: C.coral },
      { route: "admin/facebook", label: "กิจกรรมจาก Facebook", c: C.sky },
    ] },
    { group: "ประเมิน", items: [
      { route: "admin/evidence", label: "คลังหลักฐาน", c: C.indigo },
      { route: "admin/pa", label: "PA ข้อตกลงพัฒนางาน", c: C.indigo },
      { route: "admin/sar", label: "SAR ประเมินตนเอง", c: C.indigo },
      { route: "admin/surveys", label: "แบบประเมินความพึงพอใจ", c: C.indigo },
    ] },
    { group: "ส่วนตัวและตั้งค่า", items: [
      { route: "admin/leaves", label: "การลา", c: C.pink },
      { route: "admin/profile", label: "โปรไฟล์", c: C.violet },
      { route: "admin/career", label: "ประวัติและวิทยฐานะ", c: C.pink },
      { route: "admin/sharing", label: "การเผยแพร่", c: C.teal },
      { route: "admin/files", label: "ไฟล์ใน Google Drive", c: C.teal },
      { route: "admin/settings", label: "ตั้งค่าเว็บ", c: C.slate },
      { route: "admin/backup", label: "สำรองข้อมูล", c: C.slate },
    ] },
  ],
};

// ชุดสี: สีสดเดิม หรือพาสเทล (เปลี่ยนค่าใน C ตรง ๆ ทุกหน้าที่ใช้ C จึงเปลี่ยนตาม)
const BASE_C = { ...C };
// ชุดสีสำเร็จรูป: แต่ละชุดกำหนดสี 10 ช่องเดียวกับ C (ช่องไหนใช้กับเมนูไหนดูได้ในหน้าตั้งค่า → ธีมและไอคอน)
App.THEMES = {
  bright: { name: "ม่วงสดใส", note: "สีสดแบบเดิม", palette: BASE_C },
  pastel: { name: "พาสเทล", note: "อ่อนโยน สบายตา", palette: { violet: "#a99bf6", coral: "#f5a39b", sky: "#86c7ef", gold: "#f2cb72", mint: "#85d5b4", pink: "#f1a6ca", indigo: "#9ca8ef", orange: "#f6b886", teal: "#7fd0d9", slate: "#aab4c6" } },
  sea: { name: "ทะเลคราม", note: "สุภาพ ดูเป็นทางการ", palette: { violet: "#0f5f8c", coral: "#e4572e", sky: "#1aa6b7", gold: "#e2a72e", mint: "#2a9d8f", pink: "#c8507a", indigo: "#2b4c9b", orange: "#f08a24", teal: "#0e8f9e", slate: "#5b6b7f" } },
  forest: { name: "ป่าเขียว", note: "ธรรมชาติ ดอยเต่า", palette: { violet: "#2f7d4f", coral: "#c8553d", sky: "#4f8fb0", gold: "#c9a227", mint: "#8bb33d", pink: "#b35c7a", indigo: "#3b6e5a", orange: "#d98e2b", teal: "#3a9188", slate: "#7a6a58" } },
  orange: { name: "ส้มอบอุ่น", note: "สดชื่น เป็นกันเอง", palette: { violet: "#e8590c", coral: "#d6336c", sky: "#0b84a5", gold: "#e0a100", mint: "#5c940d", pink: "#c2255c", indigo: "#c2410c", orange: "#f59f00", teal: "#0f9b8e", slate: "#7c6f64" } },
  lanna: { name: "ล้านนา", note: "แดงครั่ง ทองเก่า", palette: { violet: "#7b2d26", coral: "#b5462f", sky: "#3d6f8e", gold: "#c08a2d", mint: "#3e5641", pink: "#9c4a5e", indigo: "#5a3a6e", orange: "#c0782d", teal: "#3e7c74", slate: "#7d6b57" } },
  rose: { name: "ชมพูกุหลาบ", note: "หวาน สดใส", palette: { violet: "#c2185b", coral: "#f0605d", sky: "#4ba3d9", gold: "#e9a23b", mint: "#4caf8a", pink: "#f06292", indigo: "#7e57c2", orange: "#f28b50", teal: "#26a69a", slate: "#8e7d8a" } },
  flag: { name: "ธงชาติ", note: "น้ำเงิน แดง ขาว", palette: { violet: "#1e3a8a", coral: "#b91c1c", sky: "#2563eb", gold: "#ca8a04", mint: "#15803d", pink: "#be185d", indigo: "#1e40af", orange: "#c2410c", teal: "#0e7490", slate: "#64748b" } },
  emerald: { name: "มรกต", note: "เขียวน้ำทะเล ทันสมัย", palette: { violet: "#0f766e", coral: "#f97316", sky: "#0ea5e9", gold: "#eab308", mint: "#10b981", pink: "#e11d48", indigo: "#155e75", orange: "#fb923c", teal: "#14b8a6", slate: "#64748b" } },
  rainbow: { name: "สายรุ้ง", note: "สีจัด สนุกแบบห้องเรียน", palette: { violet: "#4338ca", coral: "#dc2626", sky: "#0284c7", gold: "#f59e0b", mint: "#10b981", pink: "#db2777", indigo: "#6d28d9", orange: "#ea580c", teal: "#0d9488", slate: "#64748b" } },
  graphite: { name: "เทาเรียบหรู", note: "นิ่ง สุขุม มืออาชีพ", palette: { violet: "#475569", coral: "#b45353", sky: "#0284c7", gold: "#a8892a", mint: "#4d7c63", pink: "#9d5c7a", indigo: "#334155", orange: "#b7791f", teal: "#0f766e", slate: "#94a3b8" } },
  gold: { name: "ทองพระราชทาน", note: "ทอง เหลือง น้ำตาล", palette: { violet: "#a16207", coral: "#b45309", sky: "#9a7b4f", gold: "#eab308", mint: "#65803a", pink: "#9f4f3c", indigo: "#7c2d12", orange: "#d97706", teal: "#6b7d3a", slate: "#8b7d6b" } },
};
// ไอคอนเมนู: line = เส้น (ค.), tile = เส้นในกรอบสีอ่อน (ก.), solid = ทึบสีเต็ม (ข.), bar = แถบสีแบบเดิม
App.ICON_STYLES = { line: "เส้นเรียบ", tile: "เส้นในกรอบสีอ่อน", solid: "ทึบสีเต็ม", bar: "แถบสี (ไม่มีไอคอน)" };
// ความสว่างเฉลี่ยของชุดสี: สว่างมาก (เช่น พาสเทล) → ตัวอักษรบนพื้นสีใช้สีเข้มแทนสีขาว
const lum = (hex) => {
  const n = parseInt(String(hex).slice(1), 16);
  if (isNaN(n)) return 0;
  return [n >> 16, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
};
App.paletteTone = (pal) => { const v = Object.values(pal); return v.reduce((a, c) => a + lum(c), 0) / v.length > 0.33 ? "light" : "normal"; };
// ชุดสีที่ใช้อยู่ (ชุดสำเร็จรูป หรือ "custom" = กำหนดเอง)
App.activePalette = (st = App.DATA?.settings || {}) => {
  if (st.theme === "custom" && st.palette) return { ...BASE_C, ...Object.fromEntries(Object.entries(st.palette).filter(([k, v]) => k in BASE_C && /^#[0-9a-f]{6}$/i.test(v))) };
  return (App.THEMES[st.theme] || App.THEMES.bright).palette;
};
const themeColor = (hex) => { // สีเมนูตั้งต้น → สีเดียวกันในชุดสีที่เลือก (สีที่ครูตั้งเองไม่เปลี่ยน)
  const key = Object.keys(BASE_C).find((k) => BASE_C[k].toLowerCase() === String(hex).toLowerCase());
  return key ? C[key] : hex;
};

// เก็บเมนูตั้งต้นไว้ แล้วปรับตามที่ครูตั้งค่า (ชื่อเมนู สี ซ่อน/แสดง)
const NAV_BASE = JSON.parse(JSON.stringify(App.NAV));
const LOCKED_ROUTES = new Set(["", "admin", "admin/settings"]); // ซ่อนไม่ได้ กันเข้าหน้าตั้งค่าไม่ได้
App.applySettings = () => {
  const menus = App.DATA?.settings?.menus || {};
  const st = App.DATA?.settings || {};
  Object.assign(C, App.activePalette(st));
  const root = document.documentElement;
  root.dataset.theme = st.theme === "custom" ? "custom" : App.THEMES[st.theme] ? st.theme : "bright";
  root.dataset.tone = App.paletteTone(C);
  root.dataset.icons = App.ICON_STYLES[st.iconStyle] ? st.iconStyle : "line";
  root.style.setProperty("--c", C.violet);
  root.style.setProperty("--brand2", C.pink);
  root.style.setProperty("--brand3", C.gold);
  App.NAV = {};
  for (const [mode, groups] of Object.entries(NAV_BASE)) {
    App.NAV[mode] = groups.map((g) => ({
      ...g,
      items: g.items
        .map((i) => ({ ...i, c: themeColor(i.c), ...(menus[i.route]?.icon ? { icon: menus[i.route].icon } : {}) }))
        .map((i) => ({ ...i, ...(menus[i.route]?.label ? { label: menus[i.route].label } : {}), ...(menus[i.route]?.c ? { c: menus[i.route].c } : {}) }))
        .filter((i) => LOCKED_ROUTES.has(i.route) || !menus[i.route]?.hidden),
    })).filter((g) => g.items.length);
  }
};
App.navBase = () => NAV_BASE;
const navItems = (mode) => App.NAV[mode].flatMap((g) => g.items);
const navItem = (route) => Object.keys(App.NAV).flatMap(navItems).find((i) => i.route === route);
const COLOR = (route) => navItem(route)?.c || C.violet;

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const main = $("#main");

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^(https?:\/\/|\/)/i.test(u || "") ? u : "");

const thDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? esc(iso) : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};
const daysUntil = (iso) => Math.round((new Date(iso + "T00:00:00") - new Date(new Date().toDateString())) / 864e5);

// ปีการศึกษาไทย: 16 พ.ค. – 15 พ.ค. ปีถัดไป
const academicYear = (iso) => {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return "";
  const y = d.getFullYear() + 543;
  return String(d.getMonth() < 4 || (d.getMonth() === 4 && d.getDate() < 16) ? y - 1 : y);
};

const initials = (name) => String(name || "?").trim().replace(/^[เแโใไ]/, "").charAt(0) || "?"; // ข้ามสระหน้า
const byDateDesc = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
const empty = (msg = "ยังไม่มีข้อมูล") => `<p class="empty">${msg}</p>`;

// ข้อมูลตามสิทธิ์ของโหมด: หน้าสาธารณะเห็นเฉพาะ public, ครูเห็นทั้งหมด
const VIS_ALLOWED = { public: ["public"], admin: ["public", "private"] };
const list = (key) => {
  const arr = Array.isArray(App.DATA?.[key]) ? App.DATA[key] : [];
  return arr.filter((i) => !i.vis || VIS_ALLOWED[App.mode].includes(i.vis));
};

const VIS = { public: ["สาธารณะ", "v-public"], private: ["ส่วนตัว", "v-private"] };
const visBadge = (v) => (v && VIS[v] ? `<span class="vis ${VIS[v][1]}">${VIS[v][0]}</span>` : "");

const head = (title, sub = "", actions = "") =>
  `<header class="band"><div class="band-text"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</div>${actions ? `<div class="band-actions">${actions}</div>` : ""}</header>`;

const filterBar = (values, current, attr) =>
  values.length < 2
    ? ""
    : `<div class="filters">${["ทั้งหมด", ...values]
        .map((v) => `<button data-${attr}="${esc(v)}" class="${v === current ? "on" : ""}">${esc(v)}</button>`)
        .join("")}</div>`;

// ตารางทั่วไป: cols = [{label, key | render, cls}]
const table = (cols, rows) =>
  rows.length
    ? `<div class="table-wrap"><table class="data"><thead><tr>${cols.map((c) => `<th class="${c.cls || ""}">${c.label}</th>`).join("")}</tr></thead>
       <tbody>${rows.map((r, i) => `<tr>${cols.map((c) => `<td class="${c.cls || ""}" data-label="${esc(c.label)}">${c.render ? c.render(r, i) : esc(r[c.key])}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : empty();

let toastTimer;
const toast = (msg) => {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
};

// ฟอร์มเพิ่ม/แก้ข้อมูล: fields = [{key, label, type?, options?, required?, value?}]
// onSave(rec) คืน Promise — บันทึกสำเร็จแล้วค่อยปิดฟอร์ม
const openForm = (title, fields, onSave) => {
  $("#sheetTitle").textContent = title;
  $("#sheetFields").innerHTML = fields.map((f) => iOS.field(f, `f_${f.key}`, f.value ?? "")).join("");
  const dlg = $("#sheet");
  const form = $("#sheetForm");
  const okBtn = form.querySelector("button[value=ok]");
  okBtn.disabled = false;
  iOS.wire(form);
  form.querySelectorAll(".drop:not([data-multi])").forEach((z) => wireDrop(z, okBtn));
  App.wireExtras?.(form, okBtn);
  form.onsubmit = async (e) => {
    if (e.submitter?.value !== "ok") return;
    e.preventDefault();
    const missing = iOS.missingRequired(form)
      || [...form.querySelectorAll("input[required], textarea[required]")].find((i) => !i.value.trim())?.closest(".ios-cell")?.querySelector(".ios-label")?.textContent.replace("*", "").trim();
    if (missing) return toast(`กรุณากรอก "${missing}"`);
    const fd = new FormData(form);
    const rec = Object.fromEntries(fields.map((f) => {
      const raw = String(fd.get(f.key) ?? "").trim();
      if (f.type === "gallery") { try { return [f.key, JSON.parse(raw || "[]")]; } catch { return [f.key, []]; } }
      return [f.key, f.type === "number" ? Number(raw.replace(/,/g, "")) || 0 : f.type === "check" ? raw === "1" : raw];
    }));
    okBtn.disabled = true;
    try {
      await onSave(rec);
      dlg.close();
      toast("บันทึกแล้ว");
      render();
    } catch (err) {
      toast(err.message || "บันทึกไม่สำเร็จ");
    } finally {
      okBtn.disabled = false;
    }
  };
  dlg.showModal();
  if (matchMedia("(pointer: fine)").matches) dlg.querySelector(".sheet-body input:not([type=hidden]), .sheet-body textarea")?.focus();
};

// ---------- แนบไฟล์: ลากวาง / เลือกไฟล์ / วางลิงก์ → เก็บใน Google Drive ----------
const MAX_FILE_MB = 20;
const fileField = (f, id, val) => {
  const img = f.store === "img" && safeUrl(val);
  return `<div class="field-block"><span class="field-label">${f.label}${f.hint ? `<small>${f.hint}</small>` : ""}</span>
    <div class="drop" data-cat="${esc(f.category || "other")}" data-store="${f.store || "url"}" data-target="${id}">
      <input type="file" hidden ${f.accept ? `accept="${esc(f.accept)}"` : ""}>
      <div class="drop-preview">${img ? `<img src="${esc(val)}" alt="">` : ""}</div>
      <div class="drop-ui"><b>ลากไฟล์มาวางที่นี่</b><span> หรือ </span><button type="button" class="link-btn">เลือกไฟล์</button>
        <small>เก็บลง Google Drive โฟลเดอร์ "${esc(App.driveCats?.[f.category] || f.category || "อื่นๆ")}" รูปจะถูกย่อให้อัตโนมัติ ไม่เกิน ${MAX_FILE_MB} MB</small></div>
      <div class="drop-status" role="status"></div>
    </div>
    <input id="${id}" name="${f.key}" type="url" placeholder="หรือวางลิงก์ เช่น ลิงก์ Google Drive / YouTube" value="${esc(val)}">
  </div>`;
};

// ย่อรูปก่อนอัปโหลด: ด้านยาวไม่เกิน 1280px (แบนเนอร์ 1600px ให้คมบนจอคอม) คุณภาพ 80% บันทึกเป็น JPEG
const shrinkImage = (file, max = 1280) => new Promise((resolve) => {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return resolve(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    if (scale === 1 && file.size < 300 * 1024) return resolve(file);
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    c.toBlob((b) => resolve(b && b.size < file.size ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.8);
    URL.revokeObjectURL(img.src);
  };
  img.onerror = () => resolve(file);
  img.src = URL.createObjectURL(file);
});

const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(",")[1] || "");
  r.onerror = () => reject(new Error("อ่านไฟล์ไม่สำเร็จ"));
  r.readAsDataURL(file);
});

// อัปโหลดหนึ่งไฟล์ คืน { url, img, name, ... } จาก Google Drive
App.uploadFile = async (raw, category, onProgress = () => {}) => {
  if (raw.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`ไฟล์ใหญ่เกิน ${MAX_FILE_MB} MB`);
  onProgress("กำลังเตรียมไฟล์…");
  const file = await shrinkImage(raw, category === "banner" ? 1600 : 1280);
  const b64 = await toBase64(file);
  const qs = new URLSearchParams({ category, name: file.name, mime: file.type || "application/octet-stream" });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/drive/upload?${qs}`);
    xhr.setRequestHeader("content-type", "text/plain");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(`กำลังอัปโหลด ${Math.round((e.loaded / e.total) * 100)}%`);
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* */ }
      if (xhr.status === 401 && App.showLogin) App.showLogin();
      xhr.status < 300 ? resolve(data) : reject(new Error(data.error || `อัปโหลดไม่สำเร็จ (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("อัปโหลดไม่สำเร็จ ตรวจอินเทอร์เน็ต"));
    onProgress("กำลังอัปโหลด 0%");
    xhr.send(b64);
  });
};

let uploading = 0;
function wireDrop(zone, okBtn) {
  const input = zone.querySelector("input[type=file]");
  const target = document.getElementById(zone.dataset.target);
  const status = zone.querySelector(".drop-status");
  const preview = zone.querySelector(".drop-preview");
  const setPreview = (url) => { preview.innerHTML = zone.dataset.store === "img" && safeUrl(url) ? `<img src="${esc(url)}" alt="">` : ""; };
  target.addEventListener("input", () => setPreview(target.value));
  const go = async (file) => {
    if (!file) return;
    if (App.drive && !App.drive.connected) {
      status.className = "drop-status err";
      status.textContent = "ยังไม่ได้เชื่อม Google Drive ดูวิธีที่เมนู \"ไฟล์ใน Google Drive\" ระหว่างนี้วางลิงก์แทนได้";
      return;
    }
    uploading++; okBtn.disabled = true; zone.classList.add("busy");
    status.className = "drop-status";
    try {
      const r = await App.uploadFile(file, zone.dataset.cat, (m) => (status.textContent = m));
      target.value = zone.dataset.store === "img" && r.img ? r.img : r.url;
      setPreview(target.value);
      status.className = "drop-status ok";
      status.innerHTML = `อัปโหลดแล้ว: <a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)}</a>`;
    } catch (e) {
      status.className = "drop-status err";
      status.textContent = e.message;
    } finally {
      uploading--; zone.classList.remove("busy");
      if (!uploading) okBtn.disabled = false;
    }
  };
  zone.querySelector(".link-btn").onclick = () => input.click();
  input.onchange = () => go(input.files[0]);
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); go(e.dataTransfer.files[0]); });
}

// เรียก API: โยน Error พร้อมข้อความภาษาไทยเมื่อไม่สำเร็จ
const api = async (method, path, body) => {
  const res = await fetch(path, {
    method, credentials: "same-origin",
    headers: body !== undefined ? { "content-type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ไม่ใช่ JSON */ }
  if (!res.ok) {
    const err = new Error(data?.error || `เชื่อมต่อไม่สำเร็จ (${res.status})`);
    err.status = res.status;
    if (res.status === 401 && IS_ADMIN && App.showLogin && path !== "/api/login") App.showLogin();
    throw err;
  }
  return data;
};

// เครื่องมือในแต่ละรายการ (แก้ไข ลบ สลับสาธารณะ) — หน้าครูเท่านั้น admin.js เป็นผู้กำหนด
const tools = (key, item) => (App.mode === "admin" && App.itemTools ? App.itemTools(key, item) : "");

// ---------- หน้าสาธารณะ (โหมดครูใช้ซ้ำบางหน้า) ----------
// หน้าแรกสาธารณะ (แบบบล็อก จัดเองได้) อยู่ใน homepage.js

App.pages.responsibilities = ({ q }) => {
  const items = list("responsibilities");
  const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
  const cur = q.type || "ทั้งหมด";
  const shown = items.filter((i) => cur === "ทั้งหมด" || i.type === cur);
  return head("งานที่รับผิดชอบ", "งานตามคำสั่งแต่งตั้ง งานฝ่าย และโครงการ") +
    filterBar(types, cur, "type") +
    (shown.length
      ? `<div class="stack">${shown.map((i) => `
        <div class="card item"><div class="item-body"><h3>${esc(i.title)}</h3>${i.detail ? `<div class="meta">${esc(i.detail)}</div>` : ""}</div>
        <div class="item-side"><span class="tag">${esc(i.type)}</span><div class="meta">ปีการศึกษา ${esc(i.year)}</div></div></div>`).join("")}</div>`
      : empty());
};

App.scheduleTable = () => {
  const s = App.DATA.schedule || {};
  const periods = s.periods || [];
  const classes = s.classes || [];
  if (!periods.length) return empty();
  const cell = (day, no) => {
    const c = classes.filter((x) => x.day === day && Number(x.period) === no);
    return c.length ? `<td class="has">${c.map((x) => `<b>${esc(x.subject)}</b>${esc(x.room)}`).join("<br>")}</td>` : "<td></td>";
  };
  return `<div class="table-wrap"><table class="sched">
      <thead><tr><th>วัน</th>${periods.map((p) => `<th>คาบ ${esc(p.no)}<small>${esc(p.time)}</small></th>`).join("")}</tr></thead>
      <tbody>${DAYS.map((d) => `<tr><th>${d}</th>${periods.map((p) => cell(d, Number(p.no))).join("")}</tr>`).join("")}</tbody>
    </table></div>`;
};

App.pages.schedule = () => {
  const s = App.DATA.schedule || {};
  return head("ตารางสอน", `ภาคเรียนที่ ${esc(s.term)} สอน ${(s.classes || []).length} คาบต่อสัปดาห์`) + App.scheduleTable();
};

App.pages.certificates = ({ q }) => {
  const items = [...list("certificates")].sort(byDateDesc);
  const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
  const years = [...new Set(items.map((i) => academicYear(i.date)).filter(Boolean))].sort().reverse();
  const ct = q.type || "ทั้งหมด", cy = q.year || "ทั้งหมด";
  const shown = items.filter((i) => (ct === "ทั้งหมด" || i.type === ct) && (cy === "ทั้งหมด" || academicYear(i.date) === cy));
  const add = App.mode === "admin" ? `<button class="btn" data-add="certificates">+ เพิ่มเกียรติบัตร</button>` : "";
  return head("เกียรติบัตรและรางวัล", `ทั้งหมด ${items.length} รายการ`, add) +
    filterBar(types, ct, "type") + filterBar(years, cy, "year") +
    (shown.length
      ? `<div class="grid">${shown.map((i) => {
          const img = safeUrl(i.image);
          return `<div class="card cert">
            <button class="cert-img ${img ? "has-img" : ""}" ${img ? `data-img="${esc(img)}" data-cap="${esc(i.title)}" style="background-image:url('${esc(img)}')"` : "disabled"} aria-label="ดูภาพ ${esc(i.title)}">${img ? "" : "ยังไม่มีภาพ"}</button>
            <div class="cert-body"><span class="tag">${esc(i.type)}</span>${i.level ? ` <span class="tag solid">${esc(i.level)}</span>` : ""}
            <h3>${esc(i.title)}</h3><div class="meta">${esc(i.issuer)}<br>${thDate(i.date)}</div>${tools("certificates", i)}</div></div>`;
        }).join("")}</div>`
      : empty());
};

App.pages.trainings = ({ q }) => {
  const items = [...list("trainings")].sort(byDateDesc);
  const years = [...new Set(items.map((i) => academicYear(i.date)).filter(Boolean))].sort().reverse();
  const cy = q.year || "ทั้งหมด";
  const shown = items.filter((i) => cy === "ทั้งหมด" || academicYear(i.date) === cy);
  const hours = shown.reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const add = App.mode === "admin" ? `<button class="btn" data-add="trainings">+ เพิ่มการอบรม</button>` : "";
  return head(App.mode === "admin" ? "อบรม / PLC" : "การพัฒนาตนเอง", `${shown.length} รายการ รวม ${hours} ชั่วโมง${cy !== "ทั้งหมด" ? ` (ปีการศึกษา ${esc(cy)})` : ""}`, add) +
    filterBar(years, cy, "year") +
    (shown.length
      ? `<div class="stack">${shown.map((i) => {
          const cert = safeUrl(i.certificate);
          return `<div class="card item"><div class="item-body"><h3>${esc(i.title)}</h3>
            <div class="meta">${esc(i.organizer)}<br>${thDate(i.date)}${i.format ? `, ${esc(i.format)}` : ""}</div>
            ${cert ? `<a href="${esc(cert)}" target="_blank" rel="noopener" ${App.docAttrs({ title: i.title, tag: "เกียรติบัตรการอบรม", sub: i.organizer })}>ดูเกียรติบัตร</a>` : ""}${tools("trainings", i)}</div>
            <div class="item-side"><div class="hours">${esc(i.hours)} ชม.</div></div></div>`;
        }).join("")}</div>`
      : empty());
};

App.pages.works = () => {
  const items = list("works");
  const add = App.mode === "admin" ? `<button class="btn" data-add="works">+ เพิ่มผลงาน</button>` : "";
  return head(App.mode === "admin" ? "ผลงาน วิจัย นวัตกรรม" : "ผลงานเด่น", "นวัตกรรม วิจัยในชั้นเรียน และสื่อการสอน", add) +
    (items.length
      ? `<div class="grid">${items.map((i) => {
          const link = safeUrl(i.link);
          const doc = { link, title: i.title, tag: i.type, sub: i.year ? `ปีการศึกษา ${i.year}` : "", desc: i.description };
          return `<div class="card work-card">${App.docCover({ ...doc, cls: "work-cover" })}<div class="work-body"><span class="tag">${esc(i.type)}</span> <span class="meta">ปีการศึกษา ${esc(i.year)}</span>
            <h3 style="margin-top:8px">${esc(i.title)}</h3>${i.description ? `<p class="meta">${esc(i.description)}</p>` : ""}
            ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener" ${App.docAttrs(doc)}>ดูผลงาน</a>` : ""}${tools("works", i)}</div></div>`;
        }).join("")}</div>`
      : empty());
};

App.pages.reports = () => {
  const items = [...list("reports")].sort((a, b) => String(b.year).localeCompare(String(a.year)));
  return head("SAR / PA", "รายงานการประเมินตนเองและรายงานผลตามข้อตกลงในการพัฒนางาน") +
    (items.length
      ? `<div class="stack">${items.map((i) => {
          const link = safeUrl(i.link);
          const doc = { link, title: i.title, tag: i.type, sub: i.year ? `ปีการศึกษา ${i.year}` : "" };
          return `<div class="card item report-item">${link ? App.docCover({ ...doc, cls: "report-thumb" }) : ""}<div class="item-body"><h3>${esc(i.title)}</h3><div class="meta">ปีการศึกษา ${esc(i.year)}</div></div>
            <div class="item-side"><span class="tag">${esc(i.type)}</span><br>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener" ${App.docAttrs(doc)}>เปิดเอกสาร</a>` : `<span class="meta">ยังไม่เผยแพร่</span>`}</div></div>`;
        }).join("")}</div>`
      : empty());
};

// ---------- router ----------
// หน้าสาธารณะ: /#/certificates   หน้าครู: /admin/#/plans (ภายในใช้ชื่อ admin/plans)
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  let [path, qs = ""] = raw.split("?");
  if (IS_ADMIN && !path.startsWith("admin")) path = path ? `admin/${path}` : "admin";
  if (!IS_ADMIN && path.startsWith("admin")) path = "";
  const hidden = App.DATA?.settings?.menus?.[path]?.hidden && !LOCKED_ROUTES.has(path);
  const route = !hidden && (navItem(path) || App.pages[path]) ? path : IS_ADMIN ? "admin" : "";
  return { route, mode: App.mode, q: Object.fromEntries(new URLSearchParams(qs)) };
}
const hrefOf = (route) => `#/${IS_ADMIN ? route.replace(/^admin\/?/, "") : route}`;

// หน้าที่ใช้ร่วมกัน: admin/certificates → certificates
const pageFor = (route) => App.pages[route] || App.pages[route.replace(/^admin\//, "")];

// ไอคอนเมนูแบบเส้น (24x24 stroke) วาดเอง ไม่ต้องโหลดไฟล์เพิ่ม สีตามสีประจำเมนู
const ICON_PATHS = {
  "": '<path d="M4 11l8-6.5 8 6.5"/><path d="M6 9.5V20h4.5v-5h3v5H18V9.5"/>',
  admin: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="4.5" rx="1.5"/><rect x="13" y="10.5" width="7" height="9.5" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/>',
  home: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9h17"/><path d="M9 9v10.5"/>',
  schedule: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M8 14h2M12 14h2M16 14h0M8 17h2M12 17h2"/>',
  plans: '<path d="M6 4h11a1 1 0 0 1 1 1v15H7a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1z"/><path d="M5 18a2 2 0 0 1 2-2h11"/><path d="M9 8h6M9 11h4"/>',
  reflections: '<path d="M14.5 5.5l4 4L8 20H4v-4z"/><path d="M12.5 7.5l4 4"/>',
  grades: '<path d="M4 20h16"/><rect x="5.5" y="12" width="3" height="6" rx=".8"/><rect x="10.5" y="8" width="3" height="10" rx=".8"/><rect x="15.5" y="4.5" width="3" height="13.5" rx=".8"/>',
  supervision: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  attendance: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0"/><circle cx="17" cy="9.5" r="2.3"/><path d="M16 14.2A4.5 4.5 0 0 1 21 18.5"/>',
  care: '<path d="M12 19.5s-7.5-4.5-7.5-10A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 7.5 2.5c0 5.5-7.5 10-7.5 10z"/>',
  activities: '<path d="M5.5 20.5V4"/><path d="M5.5 4.5h11l-2.5 4 2.5 4h-11"/>',
  orders: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h4"/><path d="M14 3.5L19 8.5V11"/><path d="M14 3.5v5h5"/><path d="M8.5 9h3M8.5 12.5h5"/><circle cx="17" cy="16" r="2.5"/><path d="M15.7 18.2l-.7 3 2-1 2 1-.7-3"/>',
  responsibilities: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5"/><path d="M3.5 12.5h17"/>',
  projects: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2"/>',
  documents: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
  meetings: '<path d="M4 6.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3H6a2 2 0 0 1-2-2z"/><path d="M17 9h1a2 2 0 0 1 2 2v4.5a2 2 0 0 1-2 2h-.5v2.5L15 17.5h-3.5"/>',
  trainings: '<path d="M2.5 9L12 4.5 21.5 9 12 13.5z"/><path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11"/><path d="M21.5 9v5"/>',
  certificates: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 5.5H5a3 3 0 0 0 3 4M16 5.5h3a3 3 0 0 1-3 4"/><path d="M12 13v3.5M8.5 20h7M9.5 20l.5-3.5h4l.5 3.5"/>',
  works: '<path d="M9 17.5h6M10 20.5h4"/><path d="M12 3.5a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3.5z"/>',
  albums: '<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M3.5 16.5l5-4.5 4 3.5 2.5-2 5.5 4.5"/>',
  videos: '<rect x="3.5" y="6" width="12" height="12" rx="2"/><path d="M15.5 10.5l5-3v9l-5-3"/>',
  facebook: '<path d="M7.5 10.5v9H5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z"/><path d="M7.5 10.5l3.5-6.5a2 2 0 0 1 2 2.5l-.7 3h5.4a2 2 0 0 1 2 2.4l-1.3 6a2 2 0 0 1-2 1.6H7.5"/>',
  evidence: '<rect x="3.5" y="4.5" width="17" height="4.5" rx="1.2"/><path d="M5 9v9.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9"/><path d="M10 13h4"/>',
  pa: '<path d="M9.5 6.5h10M9.5 12h10M9.5 17.5h10"/><path d="M4 6.5l1.3 1.3L7.5 5.3M4 12l1.3 1.3L7.5 10.8M4 17.5l1.3 1.3 2.2-2.5"/>',
  sar: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10z"/><path d="M14 3.5v5h5"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
  reports: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-10z"/><path d="M14 3.5v5h5"/><path d="M9 17v-3M12 17v-5M15 17v-2"/>',
  surveys: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14.5s1.2 2 3.5 2 3.5-2 3.5-2"/><path d="M9 9.5h.01M15 9.5h.01" stroke-width="2.6"/>',
  leaves: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/><path d="M10 13.5l4 4M14 13.5l-4 4"/>',
  profile: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  career: '<circle cx="12" cy="9" r="5"/><path d="M9 13.2L7.5 20.5l4.5-2.3 4.5 2.3-1.5-7.3"/>',
  sharing: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6"/>',
  files: '<path d="M3.5 7a2 2 0 0 1 2-2h4l2 2.5h7a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  media: '<path d="M4.5 4.5h3v15h-3zM9.5 4.5h3v15h-3z"/><path d="M14.3 5.4l2.9-.8 3.9 14.5-2.9.8z"/>',
  settings: '<path d="M4 6.5h9M17 6.5h3M4 12h3M11 12h9M4 17.5h11M19 17.5h1"/><circle cx="15" cy="6.5" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="17.5" r="2"/>',
  backup: '<path d="M7 18.5a4.5 4.5 0 0 1-.8-8.9 6 6 0 0 1 11.6 1.4A3.8 3.8 0 0 1 17 18.5z"/><path d="M12 16v-5M9.8 13l2.2-2.2 2.2 2.2"/>',
};
// ไอคอนเพิ่มเติมให้ครูเลือกใช้กับเมนูไหนก็ได้
Object.assign(ICON_PATHS, {
  "x-star": '<path d="M12 4l2.4 5 5.4.6-4 3.8 1.1 5.4L12 16.1 7.1 18.8l1.1-5.4-4-3.8 5.4-.6z"/>',
  "x-book": '<path d="M12 7c-2-1.5-5-2-8-1.5V18c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5.5C17 5 14 5.5 12 7z"/><path d="M12 7v12.5"/>',
  "x-music": '<circle cx="7" cy="17" r="2.5"/><circle cx="17" cy="15" r="2.5"/><path d="M9.5 17V6l10-2v11"/>',
  "x-ball": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5l3.5 2.5-1.3 4h-4.4l-1.3-4z"/><path d="M12 3.5v4M15.5 10l4.5-1.5M14.2 14l2.6 4M9.8 14l-2.6 4M8.5 10L4 8.5"/>',
  "x-globe": '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5c-2.5-2.5-3.5-5.5-3.5-8.5s1-6 3.5-8.5z"/>',
  "x-leaf": '<path d="M5 19c0-8 5-13.5 14-14 .5 9-5 14-13 14z"/><path d="M5 19l7-7"/>',
  "x-flask": '<path d="M9.5 3.5h5M10.5 3.5v6L5 18.5a1.5 1.5 0 0 0 1.3 2h11.4a1.5 1.5 0 0 0 1.3-2l-5.5-9v-6"/><path d="M7.5 14.5h9"/>',
  "x-calc": '<rect x="5" y="3.5" width="14" height="17" rx="2"/><rect x="8" y="6.5" width="8" height="3.5" rx=".8"/><path d="M8.5 13.5h.01M12 13.5h.01M15.5 13.5h.01M8.5 17h.01M12 17h.01M15.5 17h.01" stroke-width="2.4"/>',
  "x-palette": '<path d="M12 3.5a8.5 8.5 0 0 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.2-.9-1.5-.9-2.5 0-1 .8-1.8 1.8-1.8h2.1a3.7 3.7 0 0 0 3.7-3.7C20.5 7 16.7 3.5 12 3.5z"/><path d="M7.5 11h.01M10 7.5h.01M14.5 7.5h.01" stroke-width="2.6"/>',
  "x-lang": '<path d="M4 6h8M8 4v2M10.5 6c-.5 3-3 6-6.5 7.5M6 9.5c1 1.8 2.8 3.2 5 4"/><path d="M12.5 20l3.5-8.5 3.5 8.5M13.7 17.2h4.6"/>',
  "x-laptop": '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 18.5h18"/>',
  "x-camera": '<path d="M4 8.5a2 2 0 0 1 2-2h2l1.5-2h5l1.5 2h2a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><circle cx="12" cy="12.5" r="3.3"/>',
  "x-mic": '<rect x="9" y="3.5" width="6" height="10" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5v3"/>',
  "x-bell": '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  "x-bookmark": '<path d="M7 3.5h10a1 1 0 0 1 1 1v16l-6-4-6 4v-16a1 1 0 0 1 1-1z"/>',
  "x-rocket": '<path d="M12.5 15.5l-4-4c1.5-4.5 5-7.5 11-8-.5 6-3.5 9.5-7 12z"/><path d="M8.5 11.5L5 11l2.5-3.5h4M12.5 15.5l.5 3.5 3.5-2.5v-4"/><path d="M6.5 15.5c-1.5.5-2.5 2-2.5 4.5 2.5 0 4-1 4.5-2.5"/>',
  "x-puzzle": '<path d="M5 8h3a2 2 0 1 1 4 0h3v3a2 2 0 1 1 0 4v3h-3a2 2 0 1 0-4 0H5v-3a2 2 0 1 0 0-4z"/>',
  "x-sun": '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>',
  "x-clock": '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  "x-pin": '<path d="M12 20.5s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="9.5" r="2.3"/>',
  "x-gift": '<rect x="4" y="9" width="16" height="4" rx="1"/><path d="M5.5 13v6.5h13V13M12 9v10.5"/><path d="M12 9c-1.5-3.5-5-4-5-1.5S12 9 12 9zM12 9c1.5-3.5 5-4 5-1.5S12 9 12 9z"/>',
  "x-apple": '<path d="M12 7.5c-1-1.5-3-2-4.5-1C4.5 8 5 13 7 16.5c1.2 2 2.5 3.5 4 3 .5-.2.7-.3 1-.3s.5.1 1 .3c1.5.5 2.8-1 4-3 2-3.5 2.5-8.5-.5-10-1.5-1-3.5-.5-4.5 1z"/><path d="M12 7.5c0-2 1-3.5 3-4"/>',
  "x-school": '<path d="M3.5 20.5h17M5.5 20.5v-9l6.5-4 6.5 4v9"/><path d="M12 7.5V3.5l3 1.5-3 1.5"/><path d="M10 20.5v-4h4v4"/>',
  "x-check": '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/>',
});
App.ICON_PATHS = ICON_PATHS;
const navIcon = (route) => {
  const p = ICON_PATHS[route] ?? ICON_PATHS[String(route).replace(/^admin\//, "")];
  return p ? `<svg class="nav-ico" viewBox="0 0 24 24" aria-hidden="true">${p}</svg>` : "";
};

function buildNav() {
  $("#nav").innerHTML = App.NAV[App.mode].map((g) =>
    `${g.group ? `<div class="nav-group">${g.group}</div>` : ""}${g.items.map((i) =>
      `<a href="${hrefOf(i.route)}" data-route="${i.route}" style="--c:${i.c}">${navIcon(i.icon || i.route)}<span>${i.label}</span></a>`).join("")}`).join("");
}

function render() {
  if (!App.DATA) return;
  const { route, q } = parseHash();
  if (!$("#nav").children.length) buildNav();
  document.body.dataset.mode = App.mode;
  document.body.style.setProperty("--c", COLOR(route));
  const page = pageFor(route);
  main.innerHTML = (App.banner ? App.banner() : "") + (page ? page({ q, route }) : empty("ไม่พบหน้านี้"));
  App.wireSlideshow?.();
  App.afterRender?.();
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
  const label = navItem(route)?.label || "";
  $("#topbarTitle").textContent = label;
  document.title = `${label} | ${App.DATA.settings?.siteTitle || App.DATA.profile?.name || "แฟ้มสะสมผลงานครู"}`;
  document.body.classList.remove("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
}
App.render = render;

// ---------- events ----------
App.actions = {}; // ปุ่ม data-act="ชื่อ" → App.actions[ชื่อ](btn)
App.adders = {};  // ปุ่ม data-add="key" → App.adders[key]()

main.addEventListener("click", (e) => {
  // ลิงก์เอกสาร: เปิดอ่านในหน้าเว็บ (กด Ctrl/⌘ ค้างไว้ = เปิดแท็บใหม่ตามปกติ)
  const doc = e.target.closest("a[data-doc]");
  if (doc && !e.ctrlKey && !e.metaKey && !e.shiftKey && App.openDoc?.({ link: doc.getAttribute("href"), title: doc.dataset.title, tag: doc.dataset.tag, sub: doc.dataset.sub, desc: doc.dataset.desc })) { e.preventDefault(); return; }
  const btn = e.target.closest("button, [data-act]");
  if (!btn) return;
  if (btn.dataset.img) {
    $("#lightboxImg").src = btn.dataset.img;
    $("#lightboxImg").alt = btn.dataset.cap || "";
    $("#lightboxCaption").textContent = btn.dataset.cap || "";
    $("#lightbox").showModal();
    return;
  }
  if (btn.dataset.add && App.adders[btn.dataset.add]) return App.adders[btn.dataset.add]();
  if (btn.dataset.act && App.actions[btn.dataset.act]) return App.actions[btn.dataset.act](btn);
  const key = btn.dataset.type !== undefined ? "type" : btn.dataset.year !== undefined ? "year" : btn.dataset.tag !== undefined ? "tag" : null;
  if (!key) return;
  const { route, q } = parseHash();
  const val = btn.dataset[key];
  if (val === "ทั้งหมด") delete q[key]; else q[key] = val;
  const qs = new URLSearchParams(q).toString();
  location.hash = `#/${route}${qs ? "?" + qs : ""}`;
});

$("#lightboxClose").addEventListener("click", () => $("#lightbox").close());
$("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") $("#lightbox").close(); });
$("#menuBtn").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", String(open));
});
$("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));
window.addEventListener("hashchange", () => { render(); window.scrollTo(0, 0); });

App.setData = (data) => {
  App.DATA = data;
  App.applySettings();
  if (App.onData) App.onData();
  $("#nav").innerHTML = "";
  const p = data.profile || {};
  $("#sideName").textContent = p.name || "ยังไม่ได้ใส่ชื่อ";
  $("#sideRole").textContent = [p.position, p.academicStanding].filter(Boolean).join(" ");
  const photo = safeUrl(p.photo);
  const av = $("#sideAvatar");
  av.classList.toggle("photo", !!photo);
  av.style.backgroundImage = photo ? `url('${photo}')` : "";
  av.textContent = photo ? "" : initials(p.name);
};

// หน้าสาธารณะของครูคนหนึ่ง ถ้ายังไม่ได้กรอกโปรไฟล์ แสดงข้อความ "กำลังจัดทำ"
App.loadPublic = () => api("GET", `/api/public?site=${encodeURIComponent(SITE)}`);

App.boot = async () => {
  try {
    if (IS_ADMIN) return App.bootAdmin();
    const data = await App.loadPublic();
    if (!data.profile?.name) {
      document.body.dataset.auth = "out";
      main.innerHTML = `<div class="auth-wrap"><div class="auth-card"><h1>กำลังจัดทำ</h1><p>แฟ้มสะสมผลงานนี้ยังไม่ได้เผยแพร่</p><a class="btn" href="/">กลับหน้าแรก</a></div></div>`;
      return;
    }
    App.setData(data);
    render();
  } catch (e) {
    main.innerHTML = `<p class="empty">${e.status === 404 ? "ไม่พบแฟ้มผลงานนี้ <a href=\"/\">กลับหน้าแรก</a>" : "โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้านี้"}</p>`;
  }
};
