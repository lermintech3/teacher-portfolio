// โหมดครู (ต้นแบบ) — ทุกหน้าใช้ข้อมูลตัวอย่างจาก demo.json
// ปุ่ม "+ เพิ่ม" เพิ่มเข้าหน่วยความจำชั่วคราว ระยะ 2 จะบันทึกลงฐานข้อมูล D1

const VIS_OPTS = ["ส่วนตัว", "สาธารณะ"];
const VIS_CODE = { "ส่วนตัว": "private", "สาธารณะ": "public" };
const visField = { key: "vis", label: "แสดงในหน้าสาธารณะไหม", options: VIS_OPTS };
const arr = (key) => (App.DATA[key] = App.DATA[key] || []);
const addTo = (key, rec) => arr(key).unshift({ ...rec, ...(rec.vis ? { vis: VIS_CODE[rec.vis] || rec.vis } : {}) });
const addBtn = (key, label) => `<button class="btn" data-add="${key}">+ ${label}</button>`;
const today = () => new Date().toISOString().slice(0, 10);

// ---------- ตัวชี้วัด PA (ว 9/2564 สำหรับตำแหน่งครู) ปรับตามแบบฟอร์มโรงเรียนได้ ----------
const PA = [
  { no: "1", title: "ด้านการจัดการเรียนรู้", items: [
    ["1.1", "สร้างและหรือพัฒนาหลักสูตร"], ["1.2", "ออกแบบการจัดการเรียนรู้"], ["1.3", "จัดกิจกรรมการเรียนรู้"],
    ["1.4", "สร้างและหรือพัฒนาสื่อ นวัตกรรม เทคโนโลยี และแหล่งเรียนรู้"], ["1.5", "วัดและประเมินผลการเรียนรู้"],
    ["1.6", "ศึกษา วิเคราะห์ และสังเคราะห์ เพื่อแก้ปัญหาหรือพัฒนาการเรียนรู้"], ["1.7", "จัดบรรยากาศที่ส่งเสริมการเรียนรู้"],
    ["1.8", "อบรมและพัฒนาคุณลักษณะที่ดีของผู้เรียน"],
  ] },
  { no: "2", title: "ด้านการส่งเสริมและสนับสนุนการจัดการเรียนรู้", items: [
    ["2.1", "จัดทำข้อมูลสารสนเทศของผู้เรียนและรายวิชา"], ["2.2", "ดำเนินการตามระบบดูแลช่วยเหลือผู้เรียน"],
    ["2.3", "ปฏิบัติงานวิชาการ และงานอื่นๆ ของสถานศึกษา"], ["2.4", "ประสานความร่วมมือกับผู้ปกครอง ภาคีเครือข่าย"],
  ] },
  { no: "3", title: "ด้านการพัฒนาตนเองและวิชาชีพ", items: [
    ["3.1", "พัฒนาตนเองอย่างเป็นระบบและต่อเนื่อง"], ["3.2", "มีส่วนร่วมในการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ (PLC)"],
    ["3.3", "นำความรู้และทักษะจากการพัฒนาตนเองมาใช้พัฒนาการเรียนรู้"],
  ] },
];
const PA_CODES = PA.flatMap((d) => d.items.map(([c]) => c));

// ---------- หน้ารายการทั่วไป ----------
const listPage = ({ key, title, sub, cols, filter, add }) => ({ q }) => {
  const rows = list(key);
  const vals = filter ? [...new Set(rows.map((r) => r[filter]).filter(Boolean))] : [];
  const cur = q.type || "ทั้งหมด";
  const shown = filter ? rows.filter((r) => cur === "ทั้งหมด" || r[filter] === cur) : rows;
  return head(title, typeof sub === "function" ? sub(rows) : sub, add ? addBtn(key, add) : "") +
    (filter ? filterBar(vals, cur, "type") : "") + table(cols, shown);
};
const visCol = { label: "การมองเห็น", render: (r) => visBadge(r.vis), cls: "nowrap" };
const dateCol = (key = "date", label = "วันที่") => ({ label, render: (r) => thDate(r[key]), cls: "nowrap" });

// ---------- แดชบอร์ด ----------
App.pages.admin = () => {
  const p = App.DATA.profile || {};
  const now = new Date();
  const dayName = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"][now.getDay()];
  const s = App.DATA.schedule || {};
  const todays = (s.classes || []).filter((c) => c.day === dayName).sort((a, b) => a.period - b.period);
  const time = (no) => (s.periods || []).find((x) => Number(x.no) === Number(no))?.time || "";
  const todos = arr("todos").map((t, i) => ({ ...t, i })).sort((a, b) => a.done - b.done || String(a.due).localeCompare(String(b.due)));
  const hours = list("trainings").reduce((a, t) => a + (Number(t.hours) || 0), 0);
  const covered = PA_CODES.filter((c) => list("evidence").some((e) => (e.pa || []).includes(c))).length;
  const deadlines = arr("deadlines").map((d) => ({ ...d, left: daysUntil(d.date) })).sort((a, b) => a.left - b.left);

  return head(`สวัสดี คุณครู${esc((p.name || "").split(" ")[0])}`, `วัน${dayName}ที่ ${thDate(today())}`, addBtn("todos", "เพิ่มงานที่ต้องทำ")) + `
    <div class="stats">
      <a class="stat" style="--sc:${C.sky}" href="#/admin/schedule"><b>${todays.length}</b><span>คาบสอนวันนี้</span></a>
      <a class="stat" style="--sc:${C.coral}" href="#/admin/responsibilities"><b>${todos.filter((t) => !t.done).length}</b><span>งานค้าง</span></a>
      <a class="stat" style="--sc:${C.mint}" href="#/admin/trainings"><b>${hours}</b><span>ชั่วโมงพัฒนาตนเอง</span></a>
      <a class="stat" style="--sc:${C.indigo}" href="#/admin/pa"><b>${covered}/${PA_CODES.length}</b><span>ตัวชี้วัด PA ที่มีหลักฐาน</span></a>
    </div>
    <div class="cols">
      <section class="panel" style="--c:${C.sky}">
        <h2>คาบสอนวันนี้</h2>
        ${todays.length ? `<div class="stack">${todays.map((c) => `
          <div class="slot"><b>คาบ ${esc(c.period)}</b><span class="meta">${esc(time(c.period))}</span><span>${esc(c.subject)} ${esc(c.room)}</span>
          <a class="mini" href="#/admin/reflections">บันทึกหลังสอน</a></div>`).join("")}</div>` : empty("วันนี้ไม่มีคาบสอน")}
      </section>
      <section class="panel" style="--c:${C.coral}">
        <h2>งานที่ต้องทำ</h2>
        <div class="stack">${todos.map((t) => `
          <label class="todo ${t.done ? "done" : ""}"><input type="checkbox" data-act="todo" data-i="${t.i}" ${t.done ? "checked" : ""}>
          <span>${esc(t.title)}</span><span class="meta">${t.due ? thDate(t.due) : ""}</span></label>`).join("")}</div>
      </section>
    </div>
    <section class="panel" style="--c:${C.indigo}">
      <h2>กำหนดส่งสำคัญ</h2>
      <div class="deadlines">${deadlines.map((d) => `
        <div class="deadline ${d.left <= 30 ? "soon" : ""}"><b>${d.left >= 0 ? `อีก ${d.left} วัน` : "เลยกำหนด"}</b><span>${esc(d.title)}</span><span class="meta">${thDate(d.date)}</span></div>`).join("")}</div>
    </section>`;
};
App.actions.todo = (el) => { const t = arr("todos")[el.dataset.i]; t.done = !t.done; App.render(); };
App.adders.todos = () => openForm("เพิ่มงานที่ต้องทำ", [
  { key: "title", label: "งาน", required: true }, { key: "due", label: "กำหนดส่ง", type: "date" },
], (r) => arr("todos").unshift({ ...r, done: false }));

// ---------- การสอน ----------
App.pages["admin/schedule"] = () => {
  const s = App.DATA.schedule || {};
  return head("ตารางสอน", `ภาคเรียนที่ ${esc(s.term)} สอน ${(s.classes || []).length} คาบต่อสัปดาห์`, addBtn("swaps", "บันทึกสอนแทน / แลกคาบ")) +
    App.scheduleTable() + `<h2>สอนแทนและแลกคาบ</h2>` +
    table([dateCol(), { label: "ประเภท", key: "kind" }, { label: "คาบ / ห้อง", key: "detail" }, { label: "กับครู", key: "with" }], arr("swaps"));
};
App.adders.swaps = () => openForm("บันทึกสอนแทน / แลกคาบ", [
  { key: "date", label: "วันที่", type: "date", required: true }, { key: "kind", label: "ประเภท", options: ["สอนแทน", "ให้ครูอื่นสอนแทน", "แลกคาบ"] },
  { key: "detail", label: "คาบ / ห้อง" }, { key: "with", label: "ครูที่เกี่ยวข้อง" },
], (r) => arr("swaps").unshift(r));

App.pages["admin/plans"] = listPage({
  key: "plans", title: "แผนการสอนและสื่อ", sub: (r) => `${r.length} รายการ แยกตามวิชาและหน่วย`, filter: "type", add: "เพิ่มแผน/สื่อ",
  cols: [{ label: "วิชา", key: "subject", cls: "nowrap" }, { label: "หน่วย", key: "unit" }, { label: "ชื่อ", key: "title" },
    { label: "ประเภท", render: (r) => `<span class="tag">${esc(r.type)}</span>` }, visCol],
});
App.adders.plans = () => openForm("เพิ่มแผนการสอน / สื่อ", [
  { key: "subject", label: "รหัสวิชา", required: true }, { key: "unit", label: "หน่วยการเรียนรู้" }, { key: "title", label: "ชื่อ", required: true },
  { key: "type", label: "ประเภท", options: ["แผนการสอน", "สื่อ", "ใบงาน", "ข้อสอบ"] }, { key: "link", label: "ลิงก์ไฟล์ (Google Drive)", type: "url" }, visField,
], (r) => addTo("plans", r));

App.pages["admin/reflections"] = () => {
  const rows = [...list("reflections")].sort(byDateDesc);
  return head("บันทึกหลังสอน", `${rows.length} บันทึก ใช้เป็นหลักฐาน PA ตัวชี้วัด 1.3 และ 1.6`, addBtn("reflections", "เขียนบันทึกหลังสอน")) +
    (rows.length ? `<div class="stack">${rows.map((r) => `
      <article class="card note"><div class="note-head"><b>${thDate(r.date)}</b><span class="tag">${esc(r.subject)} ${esc(r.room)}</span>${visBadge(r.vis)}</div>
      <h3>${esc(r.topic)}</h3>
      <dl><dt>ผลการสอน</dt><dd>${esc(r.result)}</dd><dt>ปัญหา</dt><dd>${esc(r.problem)}</dd><dt>แนวทางแก้ไข</dt><dd>${esc(r.solution)}</dd></dl>
      </article>`).join("")}</div>` : empty());
};
App.adders.reflections = () => openForm("บันทึกหลังสอน", [
  { key: "date", label: "วันที่", type: "date", value: today(), required: true }, { key: "subject", label: "วิชา" }, { key: "room", label: "ห้อง" },
  { key: "topic", label: "เรื่องที่สอน", required: true }, { key: "result", label: "ผลการสอน", type: "textarea" },
  { key: "problem", label: "ปัญหาที่พบ", type: "textarea" }, { key: "solution", label: "แนวทางแก้ไข", type: "textarea" }, visField,
], (r) => addTo("reflections", r));

const gradeOf = (t) => (t >= 80 ? "4" : t >= 75 ? "3.5" : t >= 70 ? "3" : t >= 65 ? "2.5" : t >= 60 ? "2" : t >= 55 ? "1.5" : t >= 50 ? "1" : "0");
App.pages["admin/grades"] = () => {
  const g = App.DATA.grades || {};
  const parts = g.parts || [];
  const studs = arr("students");
  const rows = studs.map((s) => {
    const sc = g.scores?.[s.no] || [];
    const total = sc.reduce((a, b) => a + (Number(b) || 0), 0);
    return { ...s, sc, total, grade: gradeOf(total) };
  });
  const dist = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"].map((k) => [k, rows.filter((r) => r.grade === k).length]);
  const maxN = Math.max(1, ...dist.map((d) => d[1]));
  const avg = rows.length ? (rows.reduce((a, r) => a + r.total, 0) / rows.length).toFixed(1) : 0;
  return head("การวัดผล (ปพ.5)", `${esc(g.subject)} ห้อง ${esc(g.room)} คะแนนเฉลี่ย ${avg} จาก 100 ตัดเกรดอัตโนมัติ`) +
    table([{ label: "เลขที่", key: "no", cls: "num" }, { label: "ชื่อ", key: "name" },
      ...parts.map((p, i) => ({ label: `${esc(p.label)} (${p.max})`, cls: "num", render: (r) => esc(r.sc[i] ?? "") })),
      { label: "รวม", cls: "num strong", render: (r) => r.total }, { label: "เกรด", cls: "num", render: (r) => `<span class="grade g${r.grade.replace(".", "")}">${r.grade}</span>` }], rows) +
    `<h2>การกระจายเกรด</h2><div class="bars">${dist.map(([k, n]) => `
      <div class="bar-row"><span>${k}</span><div class="bar"><i style="width:${(n / maxN) * 100}%"></i></div><b>${n}</b></div>`).join("")}</div>
    <p class="meta">เกณฑ์: 80 ขึ้นไป = 4, 75 = 3.5, 70 = 3, 65 = 2.5, 60 = 2, 55 = 1.5, 50 = 1, ต่ำกว่า 50 = 0 ระยะ 9 จะเพิ่มคุณลักษณะอันพึงประสงค์ อ่าน คิดวิเคราะห์ เขียน และติดตาม 0 ร มส.</p>`;
};

App.pages["admin/supervision"] = listPage({
  key: "supervision", title: "นิเทศ / Open Class", sub: "ผลการนิเทศจากผู้บริหารและเพื่อนครู", add: "เพิ่มผลการนิเทศ",
  cols: [dateCol(), { label: "ประเภท", render: (r) => `<span class="tag">${esc(r.type)}</span>` }, { label: "ผู้นิเทศ", key: "by" },
    { label: "เรื่อง", key: "topic" }, { label: "ผล / ข้อเสนอแนะ", key: "result" }, visCol],
});
App.adders.supervision = () => openForm("เพิ่มผลการนิเทศ", [
  { key: "date", label: "วันที่", type: "date", required: true }, { key: "type", label: "ประเภท", options: ["นิเทศชั้นเรียน", "Open Class", "Lesson Study"] },
  { key: "by", label: "ผู้นิเทศ" }, { key: "topic", label: "เรื่อง" }, { key: "result", label: "ผล / ข้อเสนอแนะ", type: "textarea" }, visField,
], (r) => addTo("supervision", r));

// ---------- นักเรียน ----------
const ATT = ["มา", "สาย", "ลา", "ขาด"];
const attCls = { "มา": "a-ok", "สาย": "a-late", "ลา": "a-leave", "ขาด": "a-miss" };
App.pages["admin/attendance"] = () => {
  const dates = arr("attendanceDates");
  const att = App.DATA.attendance || {};
  const studs = arr("students");
  return head("รายชื่อและเช็กชื่อ", `${esc(studs[0]?.room || "")} ${studs.length} คน แตะช่องเพื่อเปลี่ยนสถานะ`) +
    `<p class="private-note">ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคล (PDPA) ระบบจะเก็บแบบส่วนตัวเสมอ ไม่แสดงในหน้าสาธารณะ</p>` +
    `<div class="table-wrap"><table class="data att"><thead><tr><th class="num">เลขที่</th><th>ชื่อ</th>${dates.map((d) => `<th class="num">${thDate(d).replace(/ \d{4}$/, "")}</th>`).join("")}<th class="num">มาเรียน</th></tr></thead><tbody>
    ${studs.map((s) => {
      const row = att[s.no] || [];
      const pct = row.length ? Math.round((row.filter((x) => x === "มา" || x === "สาย").length / row.length) * 100) : 0;
      return `<tr><td class="num">${s.no}</td><td>${esc(s.name)}</td>${dates.map((d, j) => `<td class="num"><button class="att-btn ${attCls[row[j]] || ""}" data-act="att" data-s="${s.no}" data-j="${j}">${esc(row[j] || "-")}</button></td>`).join("")}<td class="num ${pct < 80 ? "warn" : ""}">${pct}%</td></tr>`;
    }).join("")}</tbody></table></div>
    <p class="meta">มาเรียนต่ำกว่า 80% จะขึ้นสีแดง เพื่อเตือนเรื่องสิทธิ์สอบ (มส.)</p>`;
};
App.actions.att = (b) => {
  const row = (App.DATA.attendance[b.dataset.s] = App.DATA.attendance[b.dataset.s] || []);
  row[b.dataset.j] = ATT[(ATT.indexOf(row[b.dataset.j]) + 1) % ATT.length];
  App.render();
};

App.pages["admin/care"] = () => {
  const rows = list("care");
  const count = (k) => rows.filter((r) => r.screen === k).length;
  return head("ดูแลช่วยเหลือนักเรียน", "SDQ คัดกรอง เยี่ยมบ้าน และการส่งต่อ", addBtn("care", "เพิ่มบันทึก")) +
    `<p class="private-note">ข้อมูลส่วนนี้เป็นความลับ เก็บแบบส่วนตัวเสมอ</p>
    <div class="stats">
      <div class="stat" style="--sc:${C.mint}"><b>${count("กลุ่มปกติ")}</b><span>กลุ่มปกติ</span></div>
      <div class="stat" style="--sc:${C.gold}"><b>${count("กลุ่มเสี่ยง")}</b><span>กลุ่มเสี่ยง</span></div>
      <div class="stat" style="--sc:${C.coral}"><b>${count("กลุ่มมีปัญหา")}</b><span>กลุ่มมีปัญหา</span></div>
      <div class="stat" style="--sc:${C.sky}"><b>${rows.filter((r) => r.visit).length}</b><span>เยี่ยมบ้านแล้ว</span></div>
    </div>` +
    table([{ label: "นักเรียน", key: "student" }, { label: "SDQ", key: "sdq" }, { label: "คัดกรอง", render: (r) => `<span class="tag">${esc(r.screen)}</span>` },
      { label: "เยี่ยมบ้าน", render: (r) => (r.visit ? thDate(r.visit) : `<span class="meta">ยังไม่เยี่ยม</span>`), cls: "nowrap" }, { label: "บันทึก", key: "note" }], rows);
};
App.adders.care = () => openForm("บันทึกการดูแลช่วยเหลือ", [
  { key: "student", label: "นักเรียน", required: true }, { key: "sdq", label: "ผล SDQ", options: ["ปกติ", "เสี่ยง", "มีปัญหา"] },
  { key: "screen", label: "ผลคัดกรอง", options: ["กลุ่มปกติ", "กลุ่มเสี่ยง", "กลุ่มมีปัญหา"] }, { key: "visit", label: "วันที่เยี่ยมบ้าน", type: "date" },
  { key: "note", label: "บันทึก", type: "textarea" },
], (r) => arr("care").unshift({ ...r, vis: "private" }));

App.pages["admin/activities"] = listPage({
  key: "activities", title: "กิจกรรมพัฒนาผู้เรียน", sub: "ลูกเสือ ชุมนุม แนะแนว กิจกรรมเพื่อสังคม", filter: "type", add: "เพิ่มกิจกรรม",
  cols: [{ label: "กิจกรรม", key: "title" }, { label: "ประเภท", render: (r) => `<span class="tag">${esc(r.type)}</span>` }, { label: "ชั้น", key: "room" },
    { label: "ชั่วโมง", key: "hours", cls: "num" }, { label: "ผ่าน", key: "passed", cls: "num" }, visCol],
});
App.adders.activities = () => openForm("เพิ่มกิจกรรม", [
  { key: "title", label: "ชื่อกิจกรรม", required: true }, { key: "type", label: "ประเภท", options: ["ลูกเสือ/เนตรนารี", "ชุมนุม", "แนะแนว", "กิจกรรมเพื่อสังคม"] },
  { key: "room", label: "ชั้น" }, { key: "hours", label: "ชั่วโมง", type: "number" }, { key: "passed", label: "ผ่าน (เช่น 30/32)" }, visField,
], (r) => addTo("activities", r));

// ---------- งานในหน้าที่ ----------
App.pages["admin/responsibilities"] = listPage({
  key: "responsibilities", title: "งานที่รับผิดชอบ", sub: "คำสั่งแต่งตั้ง งานฝ่าย เวร และงานที่ปรึกษา", filter: "type", add: "เพิ่มงาน",
  cols: [{ label: "งาน", key: "title" }, { label: "ประเภท", render: (r) => `<span class="tag">${esc(r.type)}</span>` },
    { label: "ปีการศึกษา", key: "year", cls: "num" }, { label: "รายละเอียด", key: "detail" }, visCol],
});
App.adders.responsibilities = () => openForm("เพิ่มงานที่รับผิดชอบ", [
  { key: "title", label: "ชื่องาน", required: true }, { key: "type", label: "ประเภท", options: ["คำสั่ง", "งานฝ่าย", "งานที่ปรึกษา", "เวร", "โครงการ"] },
  { key: "year", label: "ปีการศึกษา", value: "2569" }, { key: "detail", label: "รายละเอียด / เลขที่คำสั่ง" }, visField,
], (r) => addTo("responsibilities", r));

App.pages["admin/projects"] = () => {
  const rows = list("projects");
  const baht = (n) => Number(n || 0).toLocaleString("th-TH");
  return head("โครงการและงบประมาณ", `${rows.length} โครงการ`, addBtn("projects", "เพิ่มโครงการ")) +
    `<div class="grid">${rows.map((r) => {
      const pct = r.budget ? Math.min(100, Math.round((r.used / r.budget) * 100)) : 0;
      return `<div class="card"><span class="tag">${esc(r.status)}</span> ${visBadge(r.vis)}<h3 style="margin-top:8px">${esc(r.title)}</h3>
        <div class="meter"><i style="width:${pct}%"></i></div>
        <div class="meta">ใช้ไป ${baht(r.used)} จาก ${baht(r.budget)} บาท (${pct}%)</div>
        ${r.result ? `<p class="meta">${esc(r.result)}</p>` : ""}</div>`;
    }).join("")}</div>`;
};
App.adders.projects = () => openForm("เพิ่มโครงการ", [
  { key: "title", label: "ชื่อโครงการ", required: true }, { key: "budget", label: "งบประมาณ (บาท)", type: "number" }, { key: "used", label: "ใช้ไปแล้ว (บาท)", type: "number" },
  { key: "status", label: "สถานะ", options: ["ยังไม่เริ่ม", "กำลังดำเนินการ", "เสร็จสิ้น"] }, { key: "result", label: "ผลการดำเนินงาน", type: "textarea" }, visField,
], (r) => addTo("projects", r));

App.pages["admin/documents"] = listPage({
  key: "documents", title: "หนังสือราชการ", sub: "หนังสือรับ หนังสือส่ง และคำสั่ง", filter: "kind", add: "เพิ่มหนังสือ",
  cols: [dateCol(), { label: "เลขที่", key: "no", cls: "nowrap" }, { label: "ประเภท", render: (r) => `<span class="tag">${esc(r.kind)}</span>` },
    { label: "จาก", key: "from" }, { label: "เรื่อง", key: "title" }],
});
App.adders.documents = () => openForm("เพิ่มหนังสือราชการ", [
  { key: "no", label: "เลขที่", required: true }, { key: "date", label: "ลงวันที่", type: "date" }, { key: "kind", label: "ประเภท", options: ["หนังสือรับ", "หนังสือส่ง", "คำสั่ง"] },
  { key: "from", label: "จาก" }, { key: "title", label: "เรื่อง", required: true }, { key: "link", label: "ลิงก์ไฟล์", type: "url" },
], (r) => arr("documents").unshift(r));

App.pages["admin/meetings"] = () => {
  const rows = [...arr("meetings")].sort(byDateDesc);
  return head("บันทึกการประชุม", `${rows.length} ครั้ง`, addBtn("meetings", "บันทึกการประชุม")) +
    `<div class="stack">${rows.map((r) => `<div class="card item"><div class="item-body"><h3>${esc(r.title)}</h3><div class="meta">${esc(r.summary)}</div></div>
      <div class="item-side meta">${thDate(r.date)}</div></div>`).join("")}</div>`;
};
App.adders.meetings = () => openForm("บันทึกการประชุม", [
  { key: "date", label: "วันที่", type: "date", value: today() }, { key: "title", label: "การประชุม", required: true }, { key: "summary", label: "สรุป / มติ", type: "textarea" },
], (r) => arr("meetings").unshift(r));

// ---------- พัฒนาตนเองและผลงาน (หน้าใช้ร่วมกับผู้เข้าชม) ----------
App.adders.trainings = () => openForm("เพิ่มการอบรม / PLC", [
  { key: "title", label: "หลักสูตร / หัวข้อ", required: true }, { key: "organizer", label: "หน่วยงานที่จัด" }, { key: "date", label: "วันที่", type: "date" },
  { key: "hours", label: "จำนวนชั่วโมง", type: "number" }, { key: "format", label: "รูปแบบ", options: ["ออนไซต์", "ออนไลน์", "PLC"] },
  { key: "certificate", label: "ลิงก์เกียรติบัตร", type: "url" }, visField,
], (r) => addTo("trainings", r));
App.adders.certificates = () => openForm("เพิ่มเกียรติบัตร / รางวัล", [
  { key: "title", label: "ชื่อเกียรติบัตร / รางวัล", required: true }, { key: "issuer", label: "ผู้มอบ" }, { key: "date", label: "วันที่", type: "date" },
  { key: "type", label: "ประเภท", options: ["เกียรติบัตร", "รางวัล", "รางวัลนักเรียน"] }, { key: "level", label: "ระดับ", options: ["โรงเรียน", "เขตพื้นที่", "จังหวัด", "ภาค", "ประเทศ"] },
  { key: "image", label: "ลิงก์ภาพ (ระยะ 3 จะอัปโหลดได้)", type: "url" }, visField,
], (r) => addTo("certificates", r));
App.adders.works = () => openForm("เพิ่มผลงาน", [
  { key: "title", label: "ชื่อผลงาน", required: true }, { key: "type", label: "ประเภท", options: ["นวัตกรรม", "วิจัยในชั้นเรียน", "สื่อการสอน", "บทความ"] },
  { key: "year", label: "ปีการศึกษา", value: "2569" }, { key: "description", label: "รายละเอียด", type: "textarea" }, { key: "link", label: "ลิงก์", type: "url" }, visField,
], (r) => addTo("works", r));

// ---------- ประเมิน ----------
App.pages["admin/evidence"] = ({ q }) => {
  const rows = list("evidence");
  const cur = q.tag || "ทั้งหมด";
  const shown = rows.filter((r) => cur === "ทั้งหมด" || (r.pa || []).includes(cur));
  return head("คลังหลักฐาน", "หลักฐานทุกชิ้นแท็กไว้ว่าใช้กับตัวชี้วัด PA และหัวข้อ SAR ข้อไหน", addBtn("evidence", "เพิ่มหลักฐาน")) +
    filterBar(PA_CODES.filter((c) => rows.some((r) => (r.pa || []).includes(c))), cur, "tag") +
    table([{ label: "หลักฐาน", key: "title" }, { label: "มาจาก", key: "source" },
      { label: "ตัวชี้วัด PA", render: (r) => (r.pa || []).map((c) => `<span class="tag">${esc(c)}</span>`).join(" ") },
      { label: "หัวข้อ SAR", key: "sar" }, visCol], shown);
};
App.adders.evidence = () => openForm("เพิ่มหลักฐาน", [
  { key: "title", label: "ชื่อหลักฐาน", required: true }, { key: "source", label: "มาจากเมนู", options: ["แผนการสอน", "บันทึกหลังสอน", "สื่อ", "การวัดผล", "นิเทศ", "ดูแลช่วยเหลือ", "การพัฒนาตนเอง", "อื่นๆ"] },
  { key: "pa", label: "ตัวชี้วัด PA (คั่นด้วยจุลภาค เช่น 1.3, 1.6)" },
  { key: "sar", label: "หัวข้อ SAR", options: ["การจัดการเรียนการสอน", "ผลสัมฤทธิ์ทางการเรียน", "งานที่ได้รับมอบหมาย", "การพัฒนาตนเอง", "ผลงาน"] }, visField,
], (r) => addTo("evidence", { ...r, pa: String(r.pa).split(/[,\s]+/).filter((c) => PA_CODES.includes(c)) }));

App.pages["admin/pa"] = () => {
  const ev = list("evidence");
  const covered = PA_CODES.filter((c) => ev.some((e) => (e.pa || []).includes(c))).length;
  const pct = Math.round((covered / PA_CODES.length) * 100);
  const isAdmin = App.mode === "admin";
  return head(isAdmin ? "PA ข้อตกลงในการพัฒนางาน" : "หลักฐานตามตัวชี้วัด PA", `ปีการศึกษา 2569 มีหลักฐานแล้ว ${covered} จาก ${PA_CODES.length} ตัวชี้วัด`,
    isAdmin ? `<a class="btn ghost" href="#/admin/evidence">ไปที่คลังหลักฐาน</a>` : "") +
    `<div class="meter big"><i style="width:${pct}%"></i></div>` +
    PA.map((d) => `<section class="panel"><h2>ด้านที่ ${d.no} ${esc(d.title)}</h2>
      <div class="stack">${d.items.map(([code, name]) => {
        const items = ev.filter((e) => (e.pa || []).includes(code));
        return `<div class="pa-row ${items.length ? "has" : ""}"><span class="pa-code">${code}</span><div class="item-body"><b>${esc(name)}</b>
          ${items.length ? `<ul>${items.map((e) => `<li>${esc(e.title)} ${isAdmin ? visBadge(e.vis) : ""}</li>`).join("")}</ul>` : `<div class="meta">ยังไม่มีหลักฐาน</div>`}</div>
          <span class="pa-count">${items.length}</span></div>`;
      }).join("")}</div></section>`).join("") +
    `<p class="meta">ตัวชี้วัดตามเกณฑ์ ว 9/2564 สำหรับตำแหน่งครู ปรับให้ตรงกับแบบฟอร์มของโรงเรียนได้ในระยะ 7</p>`;
};

App.pages["admin/sar"] = () => {
  const p = App.DATA.profile || {};
  const s = App.DATA.schedule || {};
  const tr = list("trainings");
  const hours = tr.reduce((a, t) => a + (Number(t.hours) || 0), 0);
  const g = App.DATA.grades || {};
  const totals = Object.values(g.scores || {}).map((sc) => sc.reduce((a, b) => a + (Number(b) || 0), 0));
  const good = totals.filter((t) => t >= 70).length;
  const care = arr("care");
  const notes = App.DATA.sarNotes || {};
  const sec = (no, title, body) => `<section class="panel sar"><h2><span class="pa-code">${no}</span>${title}</h2>${body}</section>`;
  const ul = (xs) => (xs.length ? `<ul>${xs.map((x) => `<li>${x}</li>`).join("")}</ul>` : empty());
  return head("SAR รายงานการประเมินตนเอง", `ปีการศึกษา 2569 ข้อมูลดึงจากทุกเมนูอัตโนมัติ`,
    `<button class="btn" data-act="print">พิมพ์ / บันทึกเป็น PDF</button>`) +
    sec("1", "ข้อมูลพื้นฐาน", `<dl class="kv"><dt>ชื่อ</dt><dd>${esc(p.name)}</dd><dt>ตำแหน่ง</dt><dd>${esc(p.position)} ${esc(p.academicStanding)}</dd>
      <dt>โรงเรียน</dt><dd>${esc(p.school)}</dd><dt>กลุ่มสาระ</dt><dd>${esc(p.learningArea)}</dd><dt>หน้าที่พิเศษ</dt><dd>${esc(p.homeroom)}</dd></dl>`) +
    sec("2", "ภาระงานสอน", `<p>ภาคเรียนที่ ${esc(s.term)} สอน ${(s.classes || []).length} คาบต่อสัปดาห์ ในรายวิชา ${esc((p.subjects || []).join(", "))}</p>`) +
    sec("3", "ผลสัมฤทธิ์ทางการเรียน", totals.length
      ? `<p>${esc(g.subject)} ห้อง ${esc(g.room)} นักเรียน ${totals.length} คน ได้ผลการเรียน 3 ขึ้นไป ${good} คน (${Math.round((good / totals.length) * 100)}%)</p>` : empty()) +
    sec("4", "งานที่ได้รับมอบหมาย", ul(list("responsibilities").map((r) => esc(r.title)))) +
    sec("5", "การดูแลช่วยเหลือนักเรียน", `<p>คัดกรองนักเรียน ${care.length} คน เยี่ยมบ้าน ${care.filter((c) => c.visit).length} คน ส่งต่อ ${care.filter((c) => c.screen === "กลุ่มมีปัญหา").length} คน</p>`) +
    sec("6", "การพัฒนาตนเอง", `<p>รวม ${hours} ชั่วโมง ${tr.length} รายการ</p>` + ul(tr.map((t) => `${esc(t.title)} (${esc(t.hours)} ชม.)`))) +
    sec("7", "ผลงานและรางวัล", ul([...list("works").map((w) => esc(w.title)), ...list("certificates").filter((c) => c.type !== "เกียรติบัตร").map((c) => esc(c.title))])) +
    sec("8", "จุดเด่น จุดที่ควรพัฒนา และแนวทางพัฒนา", `<dl class="kv"><dt>จุดเด่น</dt><dd>${esc(notes.strengths)}</dd><dt>จุดที่ควรพัฒนา</dt><dd>${esc(notes.improve)}</dd><dt>แนวทางพัฒนา</dt><dd>${esc(notes.plan)}</dd></dl>`) +
    `<p class="meta">หัวข้อจะปรับให้ตรงกับแบบฟอร์ม SAR ของโรงเรียนในระยะ 8 ระยะ 10 จะมี AI ช่วยร่างข้อความ</p>`;
};
App.actions.print = () => window.print();

// ---------- ส่วนตัวและตั้งค่า ----------
App.pages["admin/leaves"] = () => {
  const rows = arr("leaves");
  const sum = (t) => rows.filter((r) => r.type === t).reduce((a, r) => a + (Number(r.days) || 0), 0);
  return head("การลา", "สถิติวันลาสะสมในปีงบประมาณ", addBtn("leaves", "บันทึกการลา")) +
    `<div class="stats">${["ลาป่วย", "ลากิจ", "ลาพักผ่อน", "ไปราชการ"].map((t, i) =>
      `<div class="stat" style="--sc:${[C.coral, C.gold, C.mint, C.sky][i]}"><b>${sum(t)}</b><span>${t} (วัน)</span></div>`).join("")}</div>` +
    table([{ label: "ประเภท", render: (r) => `<span class="tag">${esc(r.type)}</span>` }, dateCol("from", "ตั้งแต่"), dateCol("to", "ถึง"),
      { label: "วัน", key: "days", cls: "num" }, { label: "เหตุผล", key: "reason" }], rows);
};
App.adders.leaves = () => openForm("บันทึกการลา", [
  { key: "type", label: "ประเภท", options: ["ลาป่วย", "ลากิจ", "ลาพักผ่อน", "ไปราชการ"] }, { key: "from", label: "ตั้งแต่", type: "date", required: true },
  { key: "to", label: "ถึง", type: "date" }, { key: "days", label: "จำนวนวัน", type: "number" }, { key: "reason", label: "เหตุผล" },
], (r) => arr("leaves").unshift(r));

App.pages["admin/career"] = () => {
  const p = App.DATA.profile || {};
  const rows = [...arr("career")].sort(byDateDesc);
  return head("ประวัติและวิทยฐานะ", `${esc(p.position)} ${esc(p.academicStanding)}`, addBtn("career", "เพิ่มเหตุการณ์")) +
    `<ol class="timeline">${rows.map((r) => `<li><b>${thDate(r.date)}</b><span>${esc(r.event)}</span></li>`).join("")}</ol>
    <h2>ประวัติการศึกษา</h2>` +
    table([{ label: "วุฒิ", key: "degree" }, { label: "สถาบัน", key: "institution" }, { label: "ปี", key: "year", cls: "num" }], p.education || []) +
    `<p class="meta">ระยะ 10 จะเพิ่มเครื่องราชอิสริยาภรณ์และเส้นทางเลื่อนวิทยฐานะ</p>`;
};
App.adders.career = () => openForm("เพิ่มเหตุการณ์", [
  { key: "date", label: "วันที่", type: "date", required: true }, { key: "event", label: "เหตุการณ์ (เช่น เลื่อนวิทยฐานะ ย้ายโรงเรียน)", required: true },
], (r) => arr("career").unshift(r));

const SHARE_KEYS = [["responsibilities", "งานที่รับผิดชอบ"], ["plans", "แผนการสอนและสื่อ"], ["reflections", "บันทึกหลังสอน"], ["supervision", "ผลการนิเทศ"],
  ["activities", "กิจกรรมพัฒนาผู้เรียน"], ["projects", "โครงการ"], ["trainings", "อบรม / PLC"], ["certificates", "เกียรติบัตรและรางวัล"],
  ["works", "ผลงาน"], ["evidence", "หลักฐาน"], ["reports", "SAR / PA"]];
App.pages["admin/sharing"] = () => {
  const n = (k, v) => arr(k).filter((i) => i.vis === v).length;
  const site = location.origin;
  return head("การเผยแพร่", "เลือกว่ารายการไหนแสดงในหน้าสาธารณะ ค่าเริ่มต้นของรายการใหม่คือส่วนตัว") +
    `<div class="cols">
      <section class="panel"><h2>หน้าสาธารณะ</h2>
        <p>ทุกคนที่มีลิงก์เปิดดูได้ รวมถึงผู้บริหารและกรรมการประเมิน</p>
        <p class="meta">ลิงก์: <a href="${esc(site)}/">${esc(site)}/</a></p>
        <a class="btn ghost" href="#/">ดูหน้าสาธารณะ</a></section>
      <section class="panel"><h2>QR Code</h2>
        <div class="qr-ph">QR Code<br><span class="meta">สร้างอัตโนมัติในระยะ 6</span></div>
        <p class="meta">ใช้ติดหน้าแฟ้มหรือสไลด์นำเสนอ สแกนแล้วเปิดหน้าสาธารณะ</p></section>
    </div>
    <h2>สรุปการเผยแพร่แต่ละเมนู</h2>` +
    table([{ label: "เมนู", render: (r) => r[1] }, { label: "สาธารณะ", cls: "num", render: (r) => n(r[0], "public") },
      { label: "ส่วนตัว", cls: "num", render: (r) => n(r[0], "private") }], SHARE_KEYS) +
    `<p class="meta">ข้อมูลนักเรียน คะแนน การเช็กชื่อ การดูแลช่วยเหลือ การลา และหนังสือราชการ เป็นส่วนตัวเสมอ</p>`;
};

App.pages.pa = App.pages["admin/pa"];

App.boot();
