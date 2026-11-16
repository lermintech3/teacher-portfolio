// แฟ้มสะสมผลงานครู — 2 มุมมอง: หน้าสาธารณะ (/) และหน้าครู (/admin/ ต้องใส่รหัสผ่าน)
// แกนหลัก: เมนู, router, ส่วนประกอบที่ใช้ร่วมกัน, หน้าสาธารณะ
// ข้อมูลมาจาก API (Cloudflare D1)  ถ้าฐานข้อมูลยังว่าง หน้าสาธารณะจะแสดงข้อมูลตัวอย่างจาก /data/demo.json
const IS_ADMIN = !!window.IS_ADMIN;
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
    { route: "pa", label: "หลักฐานตามตัวชี้วัด PA", c: C.indigo },
    { route: "reports", label: "SAR / PA", c: C.indigo },
  ] }],
  admin: [
    { group: "ภาพรวม", items: [{ route: "admin", label: "แดชบอร์ด", c: C.violet }] },
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
      { route: "admin/responsibilities", label: "งานที่รับผิดชอบ", c: C.coral },
      { route: "admin/projects", label: "โครงการและงบประมาณ", c: C.coral },
      { route: "admin/documents", label: "หนังสือราชการ", c: C.coral },
      { route: "admin/meetings", label: "บันทึกการประชุม", c: C.coral },
    ] },
    { group: "พัฒนาตนเองและผลงาน", items: [
      { route: "admin/trainings", label: "อบรม / PLC", c: C.mint },
      { route: "admin/certificates", label: "เกียรติบัตรและรางวัล", c: C.gold },
      { route: "admin/works", label: "ผลงาน วิจัย นวัตกรรม", c: C.pink },
    ] },
    { group: "ประเมิน", items: [
      { route: "admin/evidence", label: "คลังหลักฐาน", c: C.indigo },
      { route: "admin/pa", label: "PA ข้อตกลงพัฒนางาน", c: C.indigo },
      { route: "admin/sar", label: "SAR ประเมินตนเอง", c: C.indigo },
    ] },
    { group: "ส่วนตัวและตั้งค่า", items: [
      { route: "admin/leaves", label: "การลา", c: C.pink },
      { route: "admin/profile", label: "โปรไฟล์", c: C.violet },
      { route: "admin/career", label: "ประวัติและวิทยฐานะ", c: C.pink },
      { route: "admin/sharing", label: "การเผยแพร่", c: C.teal },
      { route: "admin/settings", label: "ตั้งค่าเว็บ", c: C.slate },
      { route: "admin/backup", label: "สำรองข้อมูล", c: C.slate },
    ] },
  ],
};

// เก็บเมนูตั้งต้นไว้ แล้วปรับตามที่ครูตั้งค่า (ชื่อเมนู สี ซ่อน/แสดง)
const NAV_BASE = JSON.parse(JSON.stringify(App.NAV));
const LOCKED_ROUTES = new Set(["", "admin", "admin/settings"]); // ซ่อนไม่ได้ กันเข้าหน้าตั้งค่าไม่ได้
App.applySettings = () => {
  const menus = App.DATA?.settings?.menus || {};
  App.NAV = {};
  for (const [mode, groups] of Object.entries(NAV_BASE)) {
    App.NAV[mode] = groups.map((g) => ({
      ...g,
      items: g.items
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

const initials = (name) => (name || "?").trim().charAt(0);
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
  $("#sheetFields").innerHTML = fields.map((f) => {
    const id = `f_${f.key}`;
    const req = f.required ? "required" : "";
    const val = f.value ?? "";
    const input = f.options
      ? `<select id="${id}" name="${f.key}" ${req}>${f.options.map((o) => `<option ${String(o) === String(val) ? "selected" : ""}>${esc(o)}</option>`).join("")}</select>`
      : f.type === "textarea"
        ? `<textarea id="${id}" name="${f.key}" rows="${f.rows || 3}" ${req}>${esc(val)}</textarea>`
        : `<input id="${id}" name="${f.key}" type="${f.type || "text"}" ${f.type === "number" ? 'step="any"' : ""} ${req} value="${esc(val)}">`;
    return `<label for="${id}">${f.label}${f.hint ? `<small>${f.hint}</small>` : ""}${input}</label>`;
  }).join("");
  const dlg = $("#sheet");
  const form = $("#sheetForm");
  const okBtn = form.querySelector("button[value=ok]");
  okBtn.disabled = false;
  form.onsubmit = async (e) => {
    if (e.submitter?.value !== "ok") return;
    e.preventDefault();
    const fd = new FormData(form);
    const rec = Object.fromEntries(fields.map((f) => [f.key, f.type === "number" ? Number(fd.get(f.key)) || 0 : String(fd.get(f.key) ?? "").trim()]));
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
  dlg.querySelector("input, select, textarea")?.focus();
};

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
App.pages[""] = () => {
  const p = App.DATA.profile || {};
  const hours = list("trainings").reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const photo = safeUrl(p.photo);
  return `
    <header class="band hero">
      <div class="hero-photo ${photo ? "photo" : ""}" style="${photo ? `background-image:url('${esc(photo)}')` : ""}">${photo ? "" : esc(initials(p.name))}</div>
      <div>
        <h1>${esc(p.name)}</h1>
        <div class="who">${esc([p.position, p.academicStanding].filter(Boolean).join(" "))}<br>${esc(p.school)}${p.office ? `<br><span class="meta">${esc(p.office)}</span>` : ""}</div>
        <div class="chips">
          ${[p.learningArea, ...(p.subjects || []), p.homeroom].filter(Boolean).map((s) => `<span class="tag solid">${esc(s)}</span>`).join("")}
        </div>
      </div>
    </header>
    ${p.philosophy ? `<blockquote class="quote"><b>ปรัชญาการสอน</b>${esc(p.philosophy)}</blockquote>` : ""}
    <div class="stats">
      <a class="stat" style="--sc:${C.coral}" href="#/responsibilities"><b>${list("responsibilities").length}</b><span>งานที่รับผิดชอบ</span></a>
      <a class="stat" style="--sc:${C.gold}" href="#/certificates"><b>${list("certificates").length}</b><span>เกียรติบัตรและรางวัล</span></a>
      <a class="stat" style="--sc:${C.mint}" href="#/trainings"><b>${hours}</b><span>ชั่วโมงพัฒนาตนเอง</span></a>
      <a class="stat" style="--sc:${C.pink}" href="#/works"><b>${list("works").length}</b><span>ผลงานเด่น</span></a>
    </div>
    ${(p.education || []).length ? `
      <h2>ประวัติการศึกษา</h2>
      <div class="stack">${p.education.map((e) => `
        <div class="card item"><div class="item-body"><h3>${esc(e.degree)}</h3><div class="meta">${esc(e.institution)}</div></div>
        <div class="item-side meta">${esc(e.year)}</div></div>`).join("")}</div>` : ""}
    ${p.contactEmail ? `<p class="meta" style="margin-top:24px">ติดต่อ: <a href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a></p>` : ""}
  `;
};

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
            ${cert ? `<a href="${esc(cert)}" target="_blank" rel="noopener">ดูเกียรติบัตร</a>` : ""}${tools("trainings", i)}</div>
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
          return `<div class="card"><span class="tag">${esc(i.type)}</span> <span class="meta">ปีการศึกษา ${esc(i.year)}</span>
            <h3 style="margin-top:8px">${esc(i.title)}</h3>${i.description ? `<p class="meta">${esc(i.description)}</p>` : ""}
            ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">ดูผลงาน</a>` : ""}${tools("works", i)}</div>`;
        }).join("")}</div>`
      : empty());
};

App.pages.reports = () => {
  const items = [...list("reports")].sort((a, b) => String(b.year).localeCompare(String(a.year)));
  return head("SAR / PA", "รายงานการประเมินตนเองและรายงานผลตามข้อตกลงในการพัฒนางาน") +
    (items.length
      ? `<div class="stack">${items.map((i) => {
          const link = safeUrl(i.link);
          return `<div class="card item"><div class="item-body"><h3>${esc(i.title)}</h3><div class="meta">ปีการศึกษา ${esc(i.year)}</div></div>
            <div class="item-side"><span class="tag">${esc(i.type)}</span><br>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">เปิดเอกสาร</a>` : `<span class="meta">ยังไม่เผยแพร่</span>`}</div></div>`;
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

function buildNav() {
  $("#nav").innerHTML = App.NAV[App.mode].map((g) =>
    `${g.group ? `<div class="nav-group">${g.group}</div>` : ""}${g.items.map((i) =>
      `<a href="${hrefOf(i.route)}" data-route="${i.route}" style="--c:${i.c}">${i.label}</a>`).join("")}`).join("");
}

function render() {
  if (!App.DATA) return;
  const { route, q } = parseHash();
  if (!$("#nav").children.length) buildNav();
  document.body.dataset.mode = App.mode;
  document.body.style.setProperty("--c", COLOR(route));
  const page = pageFor(route);
  main.innerHTML = (App.banner ? App.banner() : "") + (page ? page({ q, route }) : empty("ไม่พบหน้านี้"));
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

// หน้าสาธารณะ: ดึงจาก API ถ้าฐานข้อมูลยังไม่มีโปรไฟล์หรือ API ใช้ไม่ได้ ใช้ข้อมูลตัวอย่างแทน
App.loadPublic = async () => {
  let data = null;
  try { data = await api("GET", "/api/public"); } catch { /* ใช้ข้อมูลตัวอย่าง */ }
  if (!data || !data.profile) data = await (await fetch(DEMO_URL, { cache: "no-cache" })).json();
  return data;
};

App.boot = async () => {
  try {
    if (IS_ADMIN) return App.bootAdmin();
    App.setData(await App.loadPublic());
    render();
  } catch {
    main.innerHTML = `<p class="empty">โหลดข้อมูลไม่สำเร็จ ตรวจการเชื่อมต่ออินเทอร์เน็ตแล้วรีเฟรชหน้านี้</p>`;
  }
};
