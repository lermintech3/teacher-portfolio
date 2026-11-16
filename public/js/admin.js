// หน้าครู (/admin/) — บันทึกลงฐานข้อมูล D1 ผ่าน API ต้องล็อกอินด้วยรหัสผ่าน
// ไฟล์นี้โหลดทั้งหน้าสาธารณะและหน้าครู (หน้าสาธารณะใช้แค่หน้า PA)

const VIS_OPTS = ["ส่วนตัว", "สาธารณะ"];
const VIS_CODE = { "ส่วนตัว": "private", "สาธารณะ": "public" };
const VIS_LABEL = { private: "ส่วนตัว", public: "สาธารณะ" };
const visField = { key: "vis", label: "แสดงในหน้าสาธารณะ", hint: "ปิด = เห็นเฉพาะครู", toggle: { on: "สาธารณะ", off: "ส่วนตัว" }, value: "ส่วนตัว" };
// ปีการศึกษา (พ.ศ.) ให้เลือกด้วยวงล้อ ไม่ต้องพิมพ์
const BE_NOW = new Date().getFullYear() + 543 - (new Date().getMonth() < 4 ? 1 : 0);
const YEARS = Array.from({ length: 10 }, (_, i) => String(BE_NOW - 6 + i));
const yearField = { key: "year", label: "ปีการศึกษา", options: YEARS, wheel: true, value: String(BE_NOW) };
// ต้องตรงกับ PRIVATE_ONLY ใน src/server.js
const PRIVATE_ONLY = new Set(["todos", "deadlines", "students", "care", "documents", "meetings", "leaves", "career", "swaps"]);
const arr = (key) => (App.DATA[key] = App.DATA[key] || []);
const addBtn = (key, label) => `<button class="btn" data-add="${key}">+ ${label}</button>`;
const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD ตามเวลาเครื่อง
const splitList = (s) => String(s || "").split(/[,\n]+/).map((x) => x.trim()).filter(Boolean);

// ---------- ตัวชี้วัด PA (ว 9/2564 สำหรับตำแหน่งครู) ปรับตามแบบฟอร์มโรงเรียนได้ ----------
const DEFAULT_PA = [
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
let PA = DEFAULT_PA;
let PA_CODES = PA.flatMap((d) => d.items.map(([c]) => c));

// ตัวชี้วัด PA ที่ครูแก้เอง: บรรทัดที่ขึ้นต้นด้วย # = ชื่อด้าน, บรรทัดอื่น = รหัส | ชื่อตัวชี้วัด
const paToText = (pa) => pa.map((d) => [`# ${d.title}`, ...d.items.map(([c, n]) => `${c} | ${n}`)].join("\n")).join("\n");
const paFromText = (text) => {
  const out = [];
  for (const line of String(text || "").split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("#")) out.push({ no: String(out.length + 1), title: line.replace(/^#+\s*/, ""), items: [] });
    else {
      const [code, ...rest] = line.split("|");
      if (!out.length) out.push({ no: "1", title: "ตัวชี้วัด", items: [] });
      out.at(-1).items.push([code.trim(), rest.join("|").trim() || code.trim()]);
    }
  }
  return out.filter((d) => d.items.length);
};
App.onData = () => {
  const custom = App.DATA?.settings?.paText ? paFromText(App.DATA.settings.paText) : null;
  PA = custom?.length ? custom : DEFAULT_PA;
  PA_CODES = PA.flatMap((d) => d.items.map(([c]) => c));
};
// ตัวเลือกในฟอร์มที่ครูแก้เอง เช่น ประเภทของแผนการสอน
const optionsFor = (key, f) => App.DATA?.settings?.options?.[`${key}.${f.key}`] || f.options;

// ---------- ฟอร์มของแต่ละเมนู ----------
const FORMS = {
  todos: { name: "งานที่ต้องทำ", fields: [{ key: "title", label: "งาน", required: true }, { key: "due", label: "กำหนดส่ง", type: "date" }, { key: "done", label: "ทำเสร็จแล้ว", type: "check" }] },
  deadlines: { name: "กำหนดส่งสำคัญ", fields: [{ key: "title", label: "เรื่อง", required: true }, { key: "date", label: "วันกำหนดส่ง", type: "date", required: true }] },
  swaps: { name: "การสอนแทน / แลกคาบ", fields: [
    { key: "date", label: "วันที่", type: "date", required: true }, { key: "kind", label: "ประเภท", options: ["สอนแทน", "ให้ครูอื่นสอนแทน", "แลกคาบ"] },
    { key: "detail", label: "คาบ / ห้อง" }, { key: "with", label: "ครูที่เกี่ยวข้อง" }] },
  plans: { name: "แผนการสอน / สื่อ", fields: [
    { key: "subject", label: "รหัสวิชา", required: true }, { key: "unit", label: "หน่วยการเรียนรู้" }, { key: "title", label: "ชื่อ", required: true },
    { key: "type", label: "ประเภท", options: ["แผนการสอน", "สื่อ", "ใบงาน", "ข้อสอบ"] }, { key: "link", label: "ไฟล์แผน / สื่อ", type: "file", category: "plans" }, visField] },
  reflections: { name: "บันทึกหลังสอน", fields: [
    { key: "date", label: "วันที่", type: "date", required: true, value: "today" }, { key: "subject", label: "วิชา" }, { key: "room", label: "ห้อง" },
    { key: "topic", label: "เรื่องที่สอน", required: true }, { key: "result", label: "ผลการสอน", type: "textarea" },
    { key: "problem", label: "ปัญหาที่พบ", type: "textarea" }, { key: "solution", label: "แนวทางแก้ไข", type: "textarea" },
    { key: "file", label: "รูปหรือไฟล์ประกอบ", type: "file", category: "reflections" }, visField] },
  supervision: { name: "ผลการนิเทศ", fields: [
    { key: "date", label: "วันที่", type: "date", required: true }, { key: "type", label: "ประเภท", options: ["นิเทศชั้นเรียน", "Open Class", "Lesson Study"] },
    { key: "by", label: "ผู้นิเทศ" }, { key: "topic", label: "เรื่อง" }, { key: "result", label: "ผล / ข้อเสนอแนะ", type: "textarea" },
    { key: "file", label: "แบบบันทึกการนิเทศ / รูป", type: "file", category: "supervision" }, visField] },
  students: { name: "นักเรียน", fields: [{ key: "no", label: "เลขที่", type: "number", min: 1, max: 60, required: true }, { key: "name", label: "ชื่อ-นามสกุล", required: true }, { key: "room", label: "ห้อง" }] },
  care: { name: "บันทึกการดูแลช่วยเหลือ", fields: [
    { key: "student", label: "นักเรียน", required: true }, { key: "sdq", label: "ผล SDQ", options: ["ปกติ", "เสี่ยง", "มีปัญหา"] },
    { key: "screen", label: "ผลคัดกรอง", options: ["กลุ่มปกติ", "กลุ่มเสี่ยง", "กลุ่มมีปัญหา"] }, { key: "visit", label: "วันที่เยี่ยมบ้าน", type: "date" },
    { key: "note", label: "บันทึก", type: "textarea" }, { key: "file", label: "รูปเยี่ยมบ้าน / เอกสาร (ส่วนตัว ไม่แชร์)", type: "file", category: "care" }] },
  activities: { name: "กิจกรรมพัฒนาผู้เรียน", fields: [
    { key: "title", label: "ชื่อกิจกรรม", required: true }, { key: "type", label: "ประเภท", options: ["ลูกเสือ/เนตรนารี", "ชุมนุม", "แนะแนว", "กิจกรรมเพื่อสังคม"] },
    { key: "room", label: "ชั้น" }, { key: "hours", label: "ชั่วโมง", type: "number", min: 0, max: 200, unit: "ชม.", start: 20 }, { key: "passed", label: "ผ่าน (เช่น 30/32)" },
    { key: "file", label: "รูปกิจกรรม / เอกสาร", type: "file", category: "activities" }, visField] },
  responsibilities: { name: "งานที่รับผิดชอบ", fields: [
    { key: "title", label: "ชื่องาน", required: true }, { key: "type", label: "ประเภท", options: ["คำสั่ง", "งานฝ่าย", "งานที่ปรึกษา", "เวร", "โครงการ"] },
    yearField, { key: "detail", label: "รายละเอียด / เลขที่คำสั่ง" },
    { key: "file", label: "ไฟล์คำสั่ง", type: "file", category: "responsibilities" }, visField] },
  projects: { name: "โครงการ", fields: [
    { key: "title", label: "ชื่อโครงการ", required: true }, { key: "budget", label: "งบประมาณ (บาท)", type: "number", wheel: false }, { key: "used", label: "ใช้ไปแล้ว (บาท)", type: "number", wheel: false },
    { key: "status", label: "สถานะ", options: ["ยังไม่เริ่ม", "กำลังดำเนินการ", "เสร็จสิ้น"] }, { key: "result", label: "ผลการดำเนินงาน", type: "textarea" },
    { key: "file", label: "ไฟล์โครงการ / รูป", type: "file", category: "projects" }, visField] },
  documents: { name: "หนังสือราชการ", fields: [
    { key: "no", label: "เลขที่", required: true }, { key: "date", label: "ลงวันที่", type: "date" }, { key: "kind", label: "ประเภท", options: ["หนังสือรับ", "หนังสือส่ง", "คำสั่ง"] },
    { key: "from", label: "จาก" }, { key: "title", label: "เรื่อง", required: true }, { key: "link", label: "ไฟล์หนังสือ (ส่วนตัว ไม่แชร์)", type: "file", category: "documents" }] },
  meetings: { name: "บันทึกการประชุม", fields: [
    { key: "date", label: "วันที่", type: "date", required: true, value: "today" }, { key: "title", label: "การประชุม", required: true }, { key: "summary", label: "สรุป / มติ", type: "textarea" },
    { key: "file", label: "ไฟล์รายงานการประชุม", type: "file", category: "meetings" }] },
  trainings: { name: "การอบรม / PLC", fields: [
    { key: "title", label: "หลักสูตร / หัวข้อ", required: true }, { key: "organizer", label: "หน่วยงานที่จัด" }, { key: "date", label: "วันที่", type: "date" },
    { key: "hours", label: "จำนวนชั่วโมง", type: "number", min: 0.5, max: 120, step: 0.5, unit: "ชม.", start: 6 }, { key: "format", label: "รูปแบบ", options: ["ออนไซต์", "ออนไลน์", "PLC"] },
    { key: "certificate", label: "เกียรติบัตร (รูปหรือ PDF)", type: "file", category: "trainings" }, visField] },
  certificates: { name: "เกียรติบัตร / รางวัล", fields: [
    { key: "title", label: "ชื่อเกียรติบัตร / รางวัล", required: true }, { key: "issuer", label: "ผู้มอบ" }, { key: "date", label: "วันที่", type: "date" },
    { key: "type", label: "ประเภท", options: ["เกียรติบัตร", "รางวัล", "รางวัลนักเรียน"] }, { key: "level", label: "ระดับ", options: ["โรงเรียน", "เขตพื้นที่", "จังหวัด", "ภาค", "ประเทศ"] },
    { key: "image", label: "รูปเกียรติบัตร", type: "file", category: "certificates", store: "img", accept: "image/*" }, visField] },
  works: { name: "ผลงาน", fields: [
    { key: "title", label: "ชื่อผลงาน", required: true }, { key: "type", label: "ประเภท", options: ["นวัตกรรม", "วิจัยในชั้นเรียน", "สื่อการสอน", "บทความ"] },
    yearField, { key: "description", label: "รายละเอียด", type: "textarea" },
    { key: "link", label: "ไฟล์หรือลิงก์ผลงาน", type: "file", category: "works" }, visField] },
  reports: { name: "รายงาน SAR / PA", fields: [
    { key: "title", label: "ชื่อรายงาน", required: true }, { key: "type", label: "ประเภท", options: ["SAR", "PA"] }, yearField,
    { key: "link", label: "ไฟล์รายงาน (PDF)", type: "file", category: "reports", accept: ".pdf,application/pdf" }, visField] },
  evidence: { name: "หลักฐาน", fields: [
    { key: "title", label: "ชื่อหลักฐาน", required: true },
    { key: "source", label: "มาจากเมนู", options: ["แผนการสอน", "บันทึกหลังสอน", "สื่อ", "การวัดผล", "นิเทศ", "ดูแลช่วยเหลือ", "การพัฒนาตนเอง", "อื่นๆ"] },
    { key: "pa", label: "ตัวชี้วัด PA", hint: "คั่นด้วยจุลภาค เช่น 1.3, 1.6" },
    { key: "sar", label: "หัวข้อ SAR", options: ["การจัดการเรียนการสอน", "ผลสัมฤทธิ์ทางการเรียน", "งานที่ได้รับมอบหมาย", "การพัฒนาตนเอง", "ผลงาน"] },
    { key: "link", label: "ไฟล์หลักฐาน", type: "file", category: "evidence" }, visField],
    map: (r) => ({ ...r, pa: splitList(r.pa).filter((c) => PA_CODES.includes(c)) }) },
  leaves: { name: "การลา", fields: [
    { key: "type", label: "ประเภท", options: ["ลาป่วย", "ลากิจ", "ลาพักผ่อน", "ไปราชการ"] }, { key: "from", label: "ตั้งแต่", type: "date", required: true },
    { key: "to", label: "ถึง", type: "date" }, { key: "days", label: "จำนวนวัน", type: "number", min: 0.5, max: 60, step: 0.5, unit: "วัน", start: 1 }, { key: "reason", label: "เหตุผล" },
    { key: "file", label: "ใบลา / เอกสาร (ส่วนตัว ไม่แชร์)", type: "file", category: "leaves" }] },
  career: { name: "เหตุการณ์ในประวัติ", fields: [
    { key: "date", label: "วันที่", type: "date", required: true }, { key: "event", label: "เหตุการณ์", required: true, hint: "เช่น เลื่อนวิทยฐานะ ย้ายโรงเรียน" }] },
};

// ---------- เพิ่ม / แก้ / ลบ / สลับการมองเห็น ----------
const findItem = (key, id) => arr(key).find((i) => String(i.id) === String(id));
const formValue = (f, item) => {
  if (!item) return f.value === "today" ? today() : f.value;
  if (f.key === "vis") return VIS_LABEL[item.vis] || "ส่วนตัว";
  return Array.isArray(item[f.key]) ? item[f.key].join(", ") : item[f.key];
};

App.editItem = (key, item) => {
  const F = FORMS[key];
  const fields = F.fields
    .filter((f) => !(f.key === "vis" && PRIVATE_ONLY.has(key)))
    .map((f) => {
      const options = f.key === "vis" ? f.options : optionsFor(key, f);
      const value = formValue(f, item);
      // ค่าเดิมที่ไม่อยู่ในตัวเลือกใหม่ ยังเลือกได้ ไม่หาย
      return { ...f, options: options && value && !options.includes(value) ? [value, ...options] : options, value };
    });
  openForm(`${item ? "แก้ไข" : "เพิ่ม"}${F.name}`, fields, async (rec) => {
    let body = F.map ? F.map(rec, item) : rec;
    if (body.vis) body.vis = VIS_CODE[body.vis] || "private";
    if (item) {
      const { id, ...old } = item;
      const saved = await api("PUT", `/api/admin/item/${id}`, { ...old, ...body });
      Object.assign(item, saved);
    } else {
      arr(key).unshift(await api("POST", `/api/admin/items/${key}`, body));
    }
  });
};
for (const key of Object.keys(FORMS)) App.adders[key] = () => App.editItem(key);

App.itemTools = (key, item) => {
  if (!item || item.id === undefined) return "";
  const vis = PRIVATE_ONLY.has(key)
    ? ""
    : `<button class="vis ${item.vis === "public" ? "v-public" : "v-private"}" data-act="vis" data-key="${key}" data-id="${item.id}" title="แตะเพื่อสลับ">${VIS_LABEL[item.vis] || "ส่วนตัว"}</button>`;
  const file = safeUrl(item.file);
  const att = file ? `<a class="ico" href="${esc(file)}" target="_blank" rel="noopener">ไฟล์แนบ</a>` : "";
  return `<span class="acts">${vis}${att}<button class="ico" data-act="edit" data-key="${key}" data-id="${item.id}">แก้ไข</button><button class="ico del" data-act="del" data-key="${key}" data-id="${item.id}">ลบ</button></span>`;
};
App.actions.edit = (b) => App.editItem(b.dataset.key, findItem(b.dataset.key, b.dataset.id));
App.actions.del = async (b) => {
  const item = findItem(b.dataset.key, b.dataset.id);
  if (!item || !confirm(`ลบ "${item.title || item.name || item.event || item.no || "รายการนี้"}" ใช่ไหม? ลบแล้วกู้คืนไม่ได้`)) return;
  try {
    await api("DELETE", `/api/admin/item/${item.id}`);
    App.DATA[b.dataset.key] = arr(b.dataset.key).filter((i) => i !== item);
    toast("ลบแล้ว");
    render();
  } catch (e) { toast(e.message); }
};
App.actions.vis = async (b) => {
  const item = findItem(b.dataset.key, b.dataset.id);
  try {
    Object.assign(item, await api("PATCH", `/api/admin/item/${item.id}`, { vis: item.vis === "public" ? "private" : "public" }));
    toast(item.vis === "public" ? "แสดงในหน้าสาธารณะแล้ว" : "ซ่อนจากหน้าสาธารณะแล้ว");
    render();
  } catch (e) { toast(e.message); }
};

// ค่าเดี่ยว (โปรไฟล์ ตารางสอน คะแนน การเช็กชื่อ SAR)
const saveKV = (key) => api("PUT", `/api/admin/kv/${key}`, App.DATA[key]);
const saveTimers = {};
const saveKVLater = (key) => {
  clearTimeout(saveTimers[key]);
  saveTimers[key] = setTimeout(() => saveKV(key).catch((e) => toast(`บันทึกไม่สำเร็จ: ${e.message}`)), 700);
};
const editKV = (title, key, fields, apply) => {
  const obj = (App.DATA[key] = App.DATA[key] || {});
  openForm(title, fields.map((f) => ({ ...f, value: f.get ? f.get(obj) : obj[f.key] })), async (rec) => {
    const backup = JSON.stringify(obj);
    apply ? apply(obj, rec) : Object.assign(obj, rec);
    try { await saveKV(key); } catch (e) { App.DATA[key] = JSON.parse(backup); throw e; }
    if (key === "profile" || key === "settings") App.setData(App.DATA);
  });
};

// ---------- หน้ารายการทั่วไป ----------
const listPage = ({ key, title, sub, cols, filter }) => ({ q }) => {
  const rows = list(key);
  const vals = filter ? [...new Set(rows.map((r) => r[filter]).filter(Boolean))] : [];
  const cur = q.type || "ทั้งหมด";
  const shown = filter ? rows.filter((r) => cur === "ทั้งหมด" || r[filter] === cur) : rows;
  return head(title, typeof sub === "function" ? sub(rows) : sub, addBtn(key, `เพิ่ม${FORMS[key].name}`)) +
    (filter ? filterBar(vals, cur, "type") : "") + table([...cols, { label: "", render: (r) => tools(key, r), cls: "nowrap" }], shown);
};
const dateCol = (key = "date", label = "วันที่") => ({ label, render: (r) => thDate(r[key]), cls: "nowrap" });
const tagCol = (label, key) => ({ label, render: (r) => (r[key] ? `<span class="tag">${esc(r[key])}</span>` : "") });

// ---------- แดชบอร์ด ----------
App.pages.admin = () => {
  const p = App.DATA.profile || {};
  const now = new Date();
  const dayName = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"][now.getDay()];
  const s = App.DATA.schedule || {};
  const todays = (s.classes || []).filter((c) => c.day === dayName).sort((a, b) => a.period - b.period);
  const time = (no) => (s.periods || []).find((x) => Number(x.no) === Number(no))?.time || "";
  const todos = [...arr("todos")].sort((a, b) => a.done - b.done || String(a.due || "9").localeCompare(String(b.due || "9")));
  const hours = list("trainings").reduce((a, t) => a + (Number(t.hours) || 0), 0);
  const covered = PA_CODES.filter((c) => list("evidence").some((e) => (e.pa || []).includes(c))).length;
  const deadlines = arr("deadlines").map((d) => ({ d, left: daysUntil(d.date) })).sort((a, b) => a.left - b.left);
  const first = (p.name || "").split(" ")[0];

  return head(`สวัสดี${first ? ` คุณครู${esc(first)}` : ""}`, `วัน${dayName}ที่ ${thDate(today())}`, addBtn("todos", "เพิ่มงานที่ต้องทำ")) + `
    <div class="stats">
      <a class="stat" style="--sc:${C.sky}" href="#/schedule"><b>${todays.length}</b><span>คาบสอนวันนี้</span></a>
      <a class="stat" style="--sc:${C.coral}" href="#/"><b>${todos.filter((t) => !t.done).length}</b><span>งานค้าง</span></a>
      <a class="stat" style="--sc:${C.mint}" href="#/trainings"><b>${hours}</b><span>ชั่วโมงพัฒนาตนเอง</span></a>
      <a class="stat" style="--sc:${C.indigo}" href="#/pa"><b>${covered}/${PA_CODES.length}</b><span>ตัวชี้วัด PA ที่มีหลักฐาน</span></a>
    </div>
    <div class="cols">
      <section class="panel" style="--c:${C.sky}">
        <h2>คาบสอนวันนี้</h2>
        ${todays.length ? `<div class="stack">${todays.map((c) => `
          <div class="slot"><b>คาบ ${esc(c.period)}</b><span class="meta">${esc(time(c.period))}</span><span>${esc(c.subject)} ${esc(c.room)}</span>
          <a class="mini" href="#/reflections">บันทึกหลังสอน</a></div>`).join("")}</div>` : empty("วันนี้ไม่มีคาบสอน")}
      </section>
      <section class="panel" style="--c:${C.coral}">
        <h2>งานที่ต้องทำ</h2>
        ${todos.length ? `<div class="stack">${todos.map((t) => `
          <div class="todo ${t.done ? "done" : ""}"><input type="checkbox" class="ios-check" aria-label="ทำเสร็จแล้ว" data-act="todo" data-id="${t.id}" ${t.done ? "checked" : ""}>
          <span>${esc(t.title)}</span><span class="meta">${t.due ? thDate(t.due) : ""}</span>${tools("todos", t)}</div>`).join("")}</div>` : empty("ไม่มีงานค้าง")}
      </section>
    </div>
    <section class="panel" style="--c:${C.indigo}">
      <h2 class="row-head">กำหนดส่งสำคัญ <button class="btn ghost small" data-add="deadlines">+ เพิ่ม</button></h2>
      ${deadlines.length ? `<div class="deadlines">${deadlines.map(({ d, left }) => `
        <div class="deadline ${left <= 30 ? "soon" : ""}"><b>${left >= 0 ? `อีก ${left} วัน` : "เลยกำหนด"}</b><span>${esc(d.title)}</span><span class="meta">${thDate(d.date)}</span>${tools("deadlines", d)}</div>`).join("")}</div>` : empty("ยังไม่มีกำหนดส่ง")}
    </section>`;
};
App.actions.todo = async (el) => {
  const t = findItem("todos", el.dataset.id);
  const { id, ...rest } = t;
  try { Object.assign(t, await api("PUT", `/api/admin/item/${id}`, { ...rest, done: !t.done })); } catch (e) { toast(e.message); }
  render();
};

// ---------- การสอน ----------
App.pages["admin/schedule"] = () => {
  const s = (App.DATA.schedule = App.DATA.schedule || { term: "", periods: [], classes: [] });
  const order = (c) => DAYS.indexOf(c.day) * 100 + Number(c.period);
  const classes = (s.classes || []).map((c, i) => ({ ...c, i })).sort((a, b) => order(a) - order(b));
  return head("ตารางสอน", `ภาคเรียนที่ ${esc(s.term || "-")} สอน ${(s.classes || []).length} คาบต่อสัปดาห์`,
    `<button class="btn" data-act="addClass">+ เพิ่มคาบสอน</button><button class="btn ghost" data-act="editTerm">ภาคเรียนและเวลาคาบ</button>`) +
    App.scheduleTable() + `<h2>คาบสอนทั้งหมด</h2>` +
    table([{ label: "วัน", key: "day" }, { label: "คาบ", key: "period", cls: "num" }, { label: "วิชา", key: "subject" }, { label: "ห้อง", key: "room" },
      { label: "", cls: "nowrap", render: (c) => `<span class="acts"><button class="ico del" data-act="delClass" data-i="${c.i}">ลบ</button></span>` }], classes) +
    `<h2 class="row-head">สอนแทนและแลกคาบ <button class="btn ghost small" data-add="swaps">+ บันทึก</button></h2>` +
    table([dateCol(), { label: "ประเภท", key: "kind" }, { label: "คาบ / ห้อง", key: "detail" }, { label: "กับครู", key: "with" },
      { label: "", render: (r) => tools("swaps", r), cls: "nowrap" }], arr("swaps"));
};
App.actions.addClass = () => {
  const s = App.DATA.schedule;
  openForm("เพิ่มคาบสอน", [
    { key: "day", label: "วัน", options: DAYS, value: DAYS[Math.min(4, Math.max(0, new Date().getDay() - 1))] },
    { key: "period", label: "คาบที่", type: "number", min: 1, max: 10, required: true },
    { key: "subject", label: "วิชา", required: true }, { key: "room", label: "ห้อง" },
  ], async (r) => {
    s.classes = s.classes || [];
    s.classes.push({ ...r, period: Number(r.period) });
    try { await saveKV("schedule"); } catch (e) { s.classes.pop(); throw e; }
  });
};
App.actions.delClass = async (b) => {
  const s = App.DATA.schedule;
  const [removed] = s.classes.splice(Number(b.dataset.i), 1);
  try { await saveKV("schedule"); toast("ลบแล้ว"); } catch (e) { s.classes.splice(Number(b.dataset.i), 0, removed); toast(e.message); }
  render();
};
App.actions.editTerm = () => {
  const periods = App.DATA.schedule?.periods || [];
  editKV("ภาคเรียนและเวลาคาบ", "schedule", [
    { key: "term", label: "ภาคเรียน", options: YEARS.flatMap((y) => [`1/${y}`, `2/${y}`]), wheel: true, get: (o) => o.term || `${new Date().getMonth() >= 4 && new Date().getMonth() < 10 ? 1 : 2}/${BE_NOW}` },
    ...Array.from({ length: 10 }, (_, i) => ({ key: `p${i}`, label: `คาบ ${i + 1}`, type: "timerange", placeholder: "ไม่มีคาบนี้", get: () => periods[i]?.time || "" })),
  ], (o, r) => {
    o.term = r.term;
    o.periods = Array.from({ length: 10 }, (_, i) => r[`p${i}`]).map((time, i) => ({ no: i + 1, time })).filter((p) => p.time);
  });
};

App.pages["admin/plans"] = listPage({
  key: "plans", title: "แผนการสอนและสื่อ", sub: (r) => `${r.length} รายการ แยกตามวิชาและหน่วย`, filter: "type",
  cols: [{ label: "วิชา", key: "subject", cls: "nowrap" }, { label: "หน่วย", key: "unit" },
    { label: "ชื่อ", render: (r) => (safeUrl(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)) }, tagCol("ประเภท", "type")],
});

App.pages["admin/reflections"] = () => {
  const rows = [...list("reflections")].sort(byDateDesc);
  return head("บันทึกหลังสอน", `${rows.length} บันทึก ใช้เป็นหลักฐาน PA ตัวชี้วัด 1.3 และ 1.6`, addBtn("reflections", "เขียนบันทึกหลังสอน")) +
    (rows.length ? `<div class="stack">${rows.map((r) => `
      <article class="card note"><div class="note-head"><b>${thDate(r.date)}</b><span class="tag">${esc(r.subject)} ${esc(r.room)}</span>${tools("reflections", r)}</div>
      <h3>${esc(r.topic)}</h3>
      <dl><dt>ผลการสอน</dt><dd>${esc(r.result) || "-"}</dd><dt>ปัญหา</dt><dd>${esc(r.problem) || "-"}</dd><dt>แนวทางแก้ไข</dt><dd>${esc(r.solution) || "-"}</dd></dl>
      </article>`).join("")}</div>` : empty("ยังไม่มีบันทึก กด \"เขียนบันทึกหลังสอน\" หลังสอนเสร็จ"));
};

const gradeOf = (t) => (t >= 80 ? "4" : t >= 75 ? "3.5" : t >= 70 ? "3" : t >= 65 ? "2.5" : t >= 60 ? "2" : t >= 55 ? "1.5" : t >= 50 ? "1" : "0");
const DEFAULT_PARTS = [{ label: "เก็บก่อนกลางภาค", max: 30 }, { label: "กลางภาค", max: 20 }, { label: "เก็บหลังกลางภาค", max: 20 }, { label: "ปลายภาค", max: 30 }];
const studentsSorted = () => [...arr("students")].sort((a, b) => Number(a.no) - Number(b.no));
App.pages["admin/grades"] = () => {
  const g = (App.DATA.grades = App.DATA.grades || { subject: "", room: "", parts: DEFAULT_PARTS, scores: {} });
  g.parts = g.parts?.length ? g.parts : DEFAULT_PARTS;
  g.scores = g.scores || {};
  const rows = studentsSorted().map((s) => {
    const sc = g.scores[s.no] || [];
    const total = sc.reduce((a, b) => a + (Number(b) || 0), 0);
    return { ...s, sc, total, grade: sc.length ? gradeOf(total) : "-" };
  });
  const graded = rows.filter((r) => r.grade !== "-");
  const dist = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"].map((k) => [k, graded.filter((r) => r.grade === k).length]);
  const maxN = Math.max(1, ...dist.map((d) => d[1]));
  const avg = graded.length ? (graded.reduce((a, r) => a + r.total, 0) / graded.length).toFixed(1) : "-";
  return head("การวัดผล (ปพ.5)", `${esc(g.subject || "ยังไม่ได้ตั้งวิชา")} ห้อง ${esc(g.room || "-")} คะแนนเฉลี่ย ${avg} จาก 100 ตัดเกรดอัตโนมัติ`,
    `<button class="btn ghost" data-act="editCourse">ตั้งค่าวิชา</button>`) +
    (rows.length ? table([{ label: "เลขที่", key: "no", cls: "num" }, { label: "ชื่อ", key: "name" },
      ...g.parts.map((p, i) => ({ label: `${esc(p.label)} (${p.max})`, cls: "num", render: (r) => esc(r.sc[i] ?? "") })),
      { label: "รวม", cls: "num strong", render: (r) => (r.sc.length ? r.total : "") },
      { label: "เกรด", cls: "num", render: (r) => (r.grade === "-" ? "" : `<span class="grade g${r.grade.replace(".", "")}">${r.grade}</span>`) },
      { label: "", cls: "nowrap", render: (r) => `<span class="acts"><button class="ico" data-act="editScore" data-no="${esc(r.no)}">กรอกคะแนน</button></span>` }], rows)
      : empty(`ยังไม่มีรายชื่อนักเรียน เพิ่มได้ที่เมนู <a href="#/attendance">รายชื่อและเช็กชื่อ</a>`)) +
    (graded.length ? `<h2>การกระจายเกรด</h2><div class="bars">${dist.map(([k, n]) => `
      <div class="bar-row"><span>${k}</span><div class="bar"><i style="width:${(n / maxN) * 100}%"></i></div><b>${n}</b></div>`).join("")}</div>` : "") +
    `<p class="meta">เกณฑ์: 80 ขึ้นไป = 4, 75 = 3.5, 70 = 3, 65 = 2.5, 60 = 2, 55 = 1.5, 50 = 1, ต่ำกว่า 50 = 0 ระยะ 9 จะเพิ่มคุณลักษณะอันพึงประสงค์ อ่าน คิดวิเคราะห์ เขียน และติดตาม 0 ร มส.</p>`;
};
App.actions.editScore = (b) => {
  const g = App.DATA.grades;
  const s = arr("students").find((x) => String(x.no) === b.dataset.no);
  const sc = g.scores[s.no] || [];
  openForm(`คะแนน เลขที่ ${s.no} ${s.name}`, g.parts.map((p, i) => ({ key: `p${i}`, label: `${p.label} (เต็ม ${p.max})`, type: "number", min: 0, max: Number(p.max), step: 0.5, unit: "คะแนน", start: Math.round(p.max * 0.7), value: sc[i] ?? "" })),
    async (r) => {
      const old = g.scores[s.no];
      g.scores[s.no] = g.parts.map((p, i) => Math.min(Number(p.max), Math.max(0, Number(r[`p${i}`]) || 0)));
      try { await saveKV("grades"); } catch (e) { g.scores[s.no] = old; throw e; }
    });
};
App.actions.editCourse = () => editKV("ตั้งค่าวิชา", "grades", [
  { key: "subject", label: "รหัสและชื่อวิชา", hint: "เช่น ค31102 คณิตศาสตร์พื้นฐาน" }, { key: "room", label: "ห้อง" },
  { key: "partsText", label: "สัดส่วนคะแนน", type: "textarea", rows: 5, hint: "บรรทัดละส่วน รูปแบบ ชื่อ = คะแนนเต็ม รวมกันควรได้ 100",
    get: (o) => (o.parts?.length ? o.parts : DEFAULT_PARTS).map((p) => `${p.label} = ${p.max}`).join("\n") },
], (o, r) => {
  o.subject = r.subject;
  o.room = r.room;
  const parts = splitList(r.partsText.replace(/,/g, "\n")).map((line) => {
    const [label, max] = line.split("=").map((x) => x.trim());
    return { label, max: Number(max) || 0 };
  }).filter((p) => p.label && p.max > 0);
  if (parts.length) o.parts = parts;
});

App.pages["admin/supervision"] = listPage({
  key: "supervision", title: "นิเทศ / Open Class", sub: "ผลการนิเทศจากผู้บริหารและเพื่อนครู",
  cols: [dateCol(), tagCol("ประเภท", "type"), { label: "ผู้นิเทศ", key: "by" }, { label: "เรื่อง", key: "topic" }, { label: "ผล / ข้อเสนอแนะ", key: "result" }],
});

// ---------- นักเรียน ----------
const ATT = ["มา", "สาย", "ลา", "ขาด"];
const attCls = { "มา": "a-ok", "สาย": "a-late", "ลา": "a-leave", "ขาด": "a-miss" };
App.pages["admin/attendance"] = () => {
  const dates = (App.DATA.attendanceDates = App.DATA.attendanceDates || []);
  const att = (App.DATA.attendance = App.DATA.attendance || {});
  const studs = studentsSorted();
  const recent = dates.slice(-10);
  const offset = dates.length - recent.length;
  return head("รายชื่อและเช็กชื่อ", `${studs.length} คน แตะช่องเพื่อเปลี่ยนสถานะ บันทึกอัตโนมัติ`,
    `<button class="btn" data-act="addDay">+ เช็กชื่อวันนี้</button><button class="btn ghost" data-add="students">+ เพิ่มนักเรียน</button>`) +
    `<p class="private-note">ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคล (PDPA) ระบบเก็บแบบส่วนตัวเสมอ ไม่แสดงในหน้าสาธารณะ</p>` +
    (studs.length ? `<div class="table-wrap"><table class="data att"><thead><tr><th class="num">เลขที่</th><th>ชื่อ</th>${recent.map((d) => `<th class="num">${thDate(d).replace(/ \d{4}$/, "")}</th>`).join("")}<th class="num">มาเรียน</th><th></th></tr></thead><tbody>
    ${studs.map((s) => {
      const row = att[s.no] || [];
      const marked = row.filter(Boolean);
      const pct = marked.length ? Math.round((marked.filter((x) => x === "มา" || x === "สาย").length / marked.length) * 100) : null;
      return `<tr><td class="num">${esc(s.no)}</td><td>${esc(s.name)}</td>${recent.map((d, j) => `<td class="num"><button class="att-btn ${attCls[row[offset + j]] || ""}" data-act="att" data-s="${esc(s.no)}" data-j="${offset + j}">${esc(row[offset + j] || "-")}</button></td>`).join("")}<td class="num ${pct !== null && pct < 80 ? "warn" : ""}">${pct === null ? "-" : pct + "%"}</td><td class="nowrap">${tools("students", s)}</td></tr>`;
    }).join("")}</tbody></table></div>
    <p class="meta">แสดง 10 วันล่าสุด มาเรียนต่ำกว่า 80% จะขึ้นสีแดง เพื่อเตือนเรื่องสิทธิ์สอบ (มส.)</p>` : empty("ยังไม่มีรายชื่อ กด \"+ เพิ่มนักเรียน\""));
};
App.actions.att = (b) => {
  const att = App.DATA.attendance;
  const row = (att[b.dataset.s] = att[b.dataset.s] || []);
  row[b.dataset.j] = ATT[(ATT.indexOf(row[b.dataset.j]) + 1) % ATT.length];
  saveKVLater("attendance");
  render();
};
App.actions.addDay = async () => {
  const dates = App.DATA.attendanceDates;
  const d = today();
  if (dates.includes(d)) return toast("มีคอลัมน์ของวันนี้แล้ว");
  dates.push(d);
  for (const s of arr("students")) {
    const row = (App.DATA.attendance[s.no] = App.DATA.attendance[s.no] || []);
    row[dates.length - 1] = "มา";
  }
  try { await Promise.all([saveKV("attendanceDates"), saveKV("attendance")]); toast("เพิ่มวันนี้แล้ว ทุกคนเริ่มที่ \"มา\""); } catch (e) { toast(e.message); }
  render();
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
    table([{ label: "นักเรียน", key: "student" }, { label: "SDQ", key: "sdq" }, tagCol("คัดกรอง", "screen"),
      { label: "เยี่ยมบ้าน", render: (r) => (r.visit ? thDate(r.visit) : `<span class="meta">ยังไม่เยี่ยม</span>`), cls: "nowrap" }, { label: "บันทึก", key: "note" },
      { label: "", render: (r) => tools("care", r), cls: "nowrap" }], rows);
};

App.pages["admin/activities"] = listPage({
  key: "activities", title: "กิจกรรมพัฒนาผู้เรียน", sub: "ลูกเสือ ชุมนุม แนะแนว กิจกรรมเพื่อสังคม", filter: "type",
  cols: [{ label: "กิจกรรม", key: "title" }, tagCol("ประเภท", "type"), { label: "ชั้น", key: "room" },
    { label: "ชั่วโมง", key: "hours", cls: "num" }, { label: "ผ่าน", key: "passed", cls: "num" }],
});

// ---------- งานในหน้าที่ ----------
App.pages["admin/responsibilities"] = listPage({
  key: "responsibilities", title: "งานที่รับผิดชอบ", sub: "คำสั่งแต่งตั้ง งานฝ่าย เวร และงานที่ปรึกษา", filter: "type",
  cols: [{ label: "งาน", key: "title" }, tagCol("ประเภท", "type"), { label: "ปีการศึกษา", key: "year", cls: "num" }, { label: "รายละเอียด", key: "detail" }],
});

App.pages["admin/projects"] = () => {
  const rows = list("projects");
  const baht = (n) => Number(n || 0).toLocaleString("th-TH");
  return head("โครงการและงบประมาณ", `${rows.length} โครงการ`, addBtn("projects", "เพิ่มโครงการ")) +
    (rows.length ? `<div class="grid">${rows.map((r) => {
      const pct = r.budget ? Math.min(100, Math.round((r.used / r.budget) * 100)) : 0;
      return `<div class="card"><span class="tag">${esc(r.status)}</span><h3 style="margin-top:8px">${esc(r.title)}</h3>
        <div class="meter"><i style="width:${pct}%"></i></div>
        <div class="meta">ใช้ไป ${baht(r.used)} จาก ${baht(r.budget)} บาท (${pct}%)</div>
        ${r.result ? `<p class="meta">${esc(r.result)}</p>` : ""}${tools("projects", r)}</div>`;
    }).join("")}</div>` : empty());
};

App.pages["admin/documents"] = listPage({
  key: "documents", title: "หนังสือราชการ", sub: "หนังสือรับ หนังสือส่ง และคำสั่ง", filter: "kind",
  cols: [dateCol(), { label: "เลขที่", key: "no", cls: "nowrap" }, tagCol("ประเภท", "kind"), { label: "จาก", key: "from" },
    { label: "เรื่อง", render: (r) => (safeUrl(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)) }],
});

App.pages["admin/meetings"] = () => {
  const rows = [...arr("meetings")].sort(byDateDesc);
  return head("บันทึกการประชุม", `${rows.length} ครั้ง`, addBtn("meetings", "บันทึกการประชุม")) +
    (rows.length ? `<div class="stack">${rows.map((r) => `<div class="card item"><div class="item-body"><h3>${esc(r.title)}</h3><div class="meta">${esc(r.summary)}</div>${tools("meetings", r)}</div>
      <div class="item-side meta">${thDate(r.date)}</div></div>`).join("")}</div>` : empty());
};

// ---------- ประเมิน ----------
App.pages["admin/evidence"] = ({ q }) => {
  const rows = list("evidence");
  const cur = q.tag || "ทั้งหมด";
  const shown = rows.filter((r) => cur === "ทั้งหมด" || (r.pa || []).includes(cur));
  return head("คลังหลักฐาน", "หลักฐานทุกชิ้นแท็กไว้ว่าใช้กับตัวชี้วัด PA และหัวข้อ SAR ข้อไหน", addBtn("evidence", "เพิ่มหลักฐาน")) +
    filterBar(PA_CODES.filter((c) => rows.some((r) => (r.pa || []).includes(c))), cur, "tag") +
    table([{ label: "หลักฐาน", render: (r) => (safeUrl(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)) },
      { label: "มาจาก", key: "source" },
      { label: "ตัวชี้วัด PA", render: (r) => (r.pa || []).map((c) => `<span class="tag">${esc(c)}</span>`).join(" ") },
      { label: "หัวข้อ SAR", key: "sar" }, { label: "", render: (r) => tools("evidence", r), cls: "nowrap" }], shown);
};

App.pages["admin/pa"] = () => {
  const ev = list("evidence");
  const covered = PA_CODES.filter((c) => ev.some((e) => (e.pa || []).includes(c))).length;
  const pct = Math.round((covered / PA_CODES.length) * 100);
  const isAdmin = App.mode === "admin";
  return head(isAdmin ? "PA ข้อตกลงในการพัฒนางาน" : "หลักฐานตามตัวชี้วัด PA", `มีหลักฐานแล้ว ${covered} จาก ${PA_CODES.length} ตัวชี้วัด`,
    isAdmin ? `<a class="btn ghost" href="#/evidence">ไปที่คลังหลักฐาน</a><a class="btn ghost" href="#/settings">แก้ตัวชี้วัด</a>` : "") +
    `<div class="meter big"><i style="width:${pct}%"></i></div>` +
    PA.map((d) => `<section class="panel"><h2>ด้านที่ ${d.no} ${esc(d.title)}</h2>
      <div class="stack">${d.items.map(([code, name]) => {
        const items = ev.filter((e) => (e.pa || []).includes(code));
        return `<div class="pa-row ${items.length ? "has" : ""}"><span class="pa-code">${code}</span><div class="item-body"><b>${esc(name)}</b>
          ${items.length ? `<ul>${items.map((e) => `<li>${safeUrl(e.link) ? `<a href="${esc(e.link)}" target="_blank" rel="noopener">${esc(e.title)}</a>` : esc(e.title)} ${isAdmin ? `<span class="vis ${e.vis === "public" ? "v-public" : "v-private"}">${VIS_LABEL[e.vis]}</span>` : ""}</li>`).join("")}</ul>` : `<div class="meta">ยังไม่มีหลักฐาน</div>`}</div>
          <span class="pa-count">${items.length}</span></div>`;
      }).join("")}</div></section>`).join("") +
    `<p class="meta">${PA === DEFAULT_PA ? "ตัวชี้วัดตามเกณฑ์ ว 9/2564 สำหรับตำแหน่งครู" : "ตัวชี้วัดที่ครูกำหนดเอง"}</p>`;
};
App.pages.pa = App.pages["admin/pa"];

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
  return head("SAR รายงานการประเมินตนเอง", "ข้อมูลดึงจากทุกเมนูอัตโนมัติ",
    `<button class="btn" data-act="print">พิมพ์ / บันทึกเป็น PDF</button><button class="btn ghost" data-act="editSar">แก้จุดเด่น จุดที่ควรพัฒนา</button>`) +
    sec("1", "ข้อมูลพื้นฐาน", `<dl class="kv"><dt>ชื่อ</dt><dd>${esc(p.name)}</dd><dt>ตำแหน่ง</dt><dd>${esc(p.position)} ${esc(p.academicStanding)}</dd>
      <dt>โรงเรียน</dt><dd>${esc(p.school)}</dd><dt>กลุ่มสาระ</dt><dd>${esc(p.learningArea)}</dd><dt>หน้าที่พิเศษ</dt><dd>${esc(p.homeroom)}</dd></dl>`) +
    sec("2", "ภาระงานสอน", `<p>ภาคเรียนที่ ${esc(s.term)} สอน ${(s.classes || []).length} คาบต่อสัปดาห์ ในรายวิชา ${esc((p.subjects || []).join(", "))}</p>`) +
    sec("3", "ผลสัมฤทธิ์ทางการเรียน", totals.length
      ? `<p>${esc(g.subject)} ห้อง ${esc(g.room)} นักเรียน ${totals.length} คน ได้ผลการเรียน 3 ขึ้นไป ${good} คน (${Math.round((good / totals.length) * 100)}%)</p>` : empty("ยังไม่มีคะแนน")) +
    sec("4", "งานที่ได้รับมอบหมาย", ul(list("responsibilities").map((r) => esc(r.title)))) +
    sec("5", "การดูแลช่วยเหลือนักเรียน", `<p>คัดกรองนักเรียน ${care.length} คน เยี่ยมบ้าน ${care.filter((c) => c.visit).length} คน ส่งต่อ ${care.filter((c) => c.screen === "กลุ่มมีปัญหา").length} คน</p>`) +
    sec("6", "การพัฒนาตนเอง", `<p>รวม ${hours} ชั่วโมง ${tr.length} รายการ</p>` + ul(tr.map((t) => `${esc(t.title)} (${esc(t.hours)} ชม.)`))) +
    sec("7", "ผลงานและรางวัล", ul([...list("works").map((w) => esc(w.title)), ...list("certificates").filter((c) => c.type !== "เกียรติบัตร").map((c) => esc(c.title))])) +
    sec("8", "จุดเด่น จุดที่ควรพัฒนา และแนวทางพัฒนา", `<dl class="kv"><dt>จุดเด่น</dt><dd>${esc(notes.strengths) || "-"}</dd><dt>จุดที่ควรพัฒนา</dt><dd>${esc(notes.improve) || "-"}</dd><dt>แนวทางพัฒนา</dt><dd>${esc(notes.plan) || "-"}</dd></dl>`) +
    `<p class="meta">หัวข้อจะปรับให้ตรงกับแบบฟอร์ม SAR ของโรงเรียนในระยะ 8 ระยะ 10 จะมี AI ช่วยร่างข้อความ</p>`;
};
App.actions.print = () => window.print();
App.actions.editSar = () => editKV("จุดเด่น จุดที่ควรพัฒนา และแนวทางพัฒนา", "sarNotes", [
  { key: "strengths", label: "จุดเด่น", type: "textarea", rows: 4 }, { key: "improve", label: "จุดที่ควรพัฒนา", type: "textarea", rows: 4 },
  { key: "plan", label: "แนวทางพัฒนา", type: "textarea", rows: 4 },
]);

// ---------- ส่วนตัวและตั้งค่า ----------
App.pages["admin/leaves"] = () => {
  const rows = arr("leaves");
  const sum = (t) => rows.filter((r) => r.type === t).reduce((a, r) => a + (Number(r.days) || 0), 0);
  return head("การลา", "สถิติวันลาสะสม", addBtn("leaves", "บันทึกการลา")) +
    `<div class="stats">${["ลาป่วย", "ลากิจ", "ลาพักผ่อน", "ไปราชการ"].map((t, i) =>
      `<div class="stat" style="--sc:${[C.coral, C.gold, C.mint, C.sky][i]}"><b>${sum(t)}</b><span>${t} (วัน)</span></div>`).join("")}</div>` +
    table([tagCol("ประเภท", "type"), dateCol("from", "ตั้งแต่"), dateCol("to", "ถึง"),
      { label: "วัน", key: "days", cls: "num" }, { label: "เหตุผล", key: "reason" }, { label: "", render: (r) => tools("leaves", r), cls: "nowrap" }], rows);
};

App.pages["admin/profile"] = () => {
  const p = App.DATA.profile || {};
  const rowsKV = [["ชื่อ-นามสกุล", p.name], ["ตำแหน่ง", p.position], ["วิทยฐานะ", p.academicStanding], ["โรงเรียน", p.school], ["สังกัด", p.office],
    ["กลุ่มสาระ", p.learningArea], ["วิชาที่สอน", (p.subjects || []).join(", ")], ["หน้าที่พิเศษ", p.homeroom], ["อีเมลติดต่อ (แสดงสาธารณะ)", p.contactEmail],
    ["ลิงก์รูปโปรไฟล์", p.photo], ["ปรัชญาการสอน", p.philosophy]];
  return head("โปรไฟล์", "ข้อมูลนี้แสดงในหน้าแรกของหน้าสาธารณะ", `<button class="btn" data-act="editProfile">แก้ไขโปรไฟล์</button>`) +
    `<section class="panel"><dl class="kv">${rowsKV.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v) || `<span class="meta">-</span>`}</dd>`).join("")}</dl></section>
    <h2>ประวัติการศึกษา</h2>` +
    table([{ label: "วุฒิ", key: "degree" }, { label: "สถาบัน", key: "institution" }, { label: "ปี", key: "year", cls: "num" }], p.education || []) +
    `<p class="meta">ห้ามใส่เลขบัตรประชาชน เบอร์โทร หรือที่อยู่ เพราะโปรไฟล์ทั้งหมดแสดงในหน้าสาธารณะ</p>`;
};
App.actions.editProfile = () => editKV("แก้ไขโปรไฟล์", "profile", [
  { key: "name", label: "ชื่อ-นามสกุล", required: true }, { key: "position", label: "ตำแหน่ง", hint: "เช่น ครู" },
  { key: "academicStanding", label: "วิทยฐานะ", hint: "เช่น ครูชำนาญการ" }, { key: "school", label: "โรงเรียน" }, { key: "office", label: "สังกัด" },
  { key: "learningArea", label: "กลุ่มสาระ" }, { key: "subjects", label: "วิชาที่สอน", hint: "คั่นด้วยจุลภาค", get: (o) => (o.subjects || []).join(", ") },
  { key: "homeroom", label: "หน้าที่พิเศษ", hint: "เช่น ครูที่ปรึกษา ม.4/2" }, { key: "contactEmail", label: "อีเมลติดต่อ (แสดงสาธารณะ เว้นว่างได้)", type: "email" },
  { key: "photo", label: "รูปโปรไฟล์", type: "file", category: "profile", store: "img", accept: "image/*" }, { key: "philosophy", label: "ปรัชญาการสอน", type: "textarea" },
  { key: "education", label: "ประวัติการศึกษา", type: "textarea", rows: 4, hint: "บรรทัดละวุฒิ รูปแบบ วุฒิ | สถาบัน | ปี",
    get: (o) => (o.education || []).map((e) => [e.degree, e.institution, e.year].join(" | ")).join("\n") },
], (o, r) => {
  Object.assign(o, r, {
    subjects: splitList(r.subjects),
    education: String(r.education || "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0])
      .map(([degree, institution = "", year = ""]) => ({ degree, institution, year })),
  });
});

App.pages["admin/career"] = () => {
  const p = App.DATA.profile || {};
  const rows = [...arr("career")].sort(byDateDesc);
  return head("ประวัติและวิทยฐานะ", `${esc(p.position)} ${esc(p.academicStanding)}`, addBtn("career", "เพิ่มเหตุการณ์")) +
    (rows.length ? `<ol class="timeline">${rows.map((r) => `<li><b>${thDate(r.date)}</b><span>${esc(r.event)}</span>${tools("career", r)}</li>`).join("")}</ol>` : empty()) +
    `<p class="meta">ระยะ 10 จะเพิ่มเครื่องราชอิสริยาภรณ์และเส้นทางเลื่อนวิทยฐานะ</p>`;
};

const SHARE_KEYS = [["responsibilities", "งานที่รับผิดชอบ"], ["plans", "แผนการสอนและสื่อ"], ["reflections", "บันทึกหลังสอน"], ["supervision", "ผลการนิเทศ"],
  ["activities", "กิจกรรมพัฒนาผู้เรียน"], ["projects", "โครงการ"], ["trainings", "อบรม / PLC"], ["certificates", "เกียรติบัตรและรางวัล"],
  ["works", "ผลงาน"], ["evidence", "หลักฐาน"], ["reports", "รายงาน SAR / PA"]];
App.pages["admin/sharing"] = () => {
  const n = (k, v) => arr(k).filter((i) => i.vis === v).length;
  const site = `${location.origin}/${SITE}`;
  return head("การเผยแพร่", "แตะป้าย \"ส่วนตัว / สาธารณะ\" ในแต่ละรายการเพื่อสลับ ค่าเริ่มต้นของรายการใหม่คือส่วนตัว", addBtn("reports", "เพิ่มรายงาน SAR / PA")) +
    `<div class="cols">
      <section class="panel"><h2>หน้าสาธารณะ</h2>
        <p>ทุกคนที่มีลิงก์เปิดดูได้ รวมถึงผู้บริหารและกรรมการประเมิน</p>
        <p class="meta">ลิงก์: <a href="${esc(site)}/" target="_blank" rel="noopener">${esc(site)}/</a></p>
        <a class="btn ghost" href="/${esc(SITE)}/" target="_blank" rel="noopener">เปิดหน้าสาธารณะ</a></section>
      <section class="panel"><h2>QR Code</h2>
        <div class="qr-ph">QR Code<br><span class="meta">สร้างอัตโนมัติในระยะ 6</span></div>
        <p class="meta">ใช้ติดหน้าแฟ้มหรือสไลด์นำเสนอ สแกนแล้วเปิดหน้าสาธารณะ</p></section>
    </div>
    <h2>รายงาน SAR / PA ที่เผยแพร่</h2>` +
    table([{ label: "รายงาน", render: (r) => (safeUrl(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)) },
      tagCol("ประเภท", "type"), { label: "ปีการศึกษา", key: "year", cls: "num" }, { label: "", render: (r) => tools("reports", r), cls: "nowrap" }], arr("reports")) +
    `<h2>สรุปการเผยแพร่แต่ละเมนู</h2>` +
    table([{ label: "เมนู", render: (r) => r[1] }, { label: "สาธารณะ", cls: "num", render: (r) => n(r[0], "public") },
      { label: "ส่วนตัว", cls: "num", render: (r) => n(r[0], "private") }], SHARE_KEYS) +
    `<p class="meta">ข้อมูลนักเรียน คะแนน การเช็กชื่อ การดูแลช่วยเหลือ การลา หนังสือราชการ และบันทึกการประชุม เป็นส่วนตัวเสมอ</p>`;
};

App.pages["admin/backup"] = () =>
  head("สำรองข้อมูล", "ดาวน์โหลดข้อมูลทั้งหมดเก็บไว้ แนะนำเดือนละครั้ง") +
  `<div class="cols">
    <section class="panel"><h2>ดาวน์โหลดไฟล์สำรอง</h2>
      <p>ได้ไฟล์ .json หนึ่งไฟล์ เก็บไว้ใน Google Drive ได้ ไฟล์นี้มีข้อมูลส่วนตัวทั้งหมด อย่าแชร์ให้คนอื่น</p>
      <a class="btn" href="/api/admin/export" download>ดาวน์โหลดไฟล์สำรอง</a></section>
    <section class="panel"><h2>กู้คืนจากไฟล์สำรอง</h2>
      <p>ข้อมูลทั้งหมดตอนนี้จะถูก<b>แทนที่</b>ด้วยข้อมูลในไฟล์</p>
      <label class="field">เลือกไฟล์ .json<input type="file" id="restoreFile" accept="application/json,.json"></label>
      <button class="btn ghost" data-act="restore">กู้คืนข้อมูล</button></section>
  </div>
  <section class="panel"><h2>เริ่มใหม่ด้วยข้อมูลตัวอย่าง</h2>
    <p>ลบข้อมูลทั้งหมดแล้วใส่ข้อมูลตัวอย่างแทน ใช้ตอนอยากลองระบบ</p>
    <button class="btn ghost danger" data-act="resetDemo">ลบทั้งหมดแล้วใส่ข้อมูลตัวอย่าง</button></section>`;
App.actions.restore = async () => {
  const f = $("#restoreFile").files[0];
  if (!f) return toast("เลือกไฟล์สำรองก่อน");
  let data;
  try { data = JSON.parse(await f.text()); } catch { return toast("ไฟล์นี้ไม่ใช่ไฟล์สำรองที่ถูกต้อง"); }
  if (!confirm("ข้อมูลทั้งหมดตอนนี้จะถูกแทนที่ด้วยข้อมูลในไฟล์ ดำเนินการต่อไหม?")) return;
  try { await api("POST", "/api/admin/import?replace=1", data); toast("กู้คืนแล้ว"); await App.bootAdmin(); } catch (e) { toast(e.message); }
};
App.actions.resetDemo = async () => {
  if (!confirm("ข้อมูลทั้งหมดจะถูกลบและแทนด้วยข้อมูลตัวอย่าง แนะนำให้ดาวน์โหลดไฟล์สำรองก่อน ดำเนินการต่อไหม?")) return;
  try {
    await api("POST", "/api/admin/import?replace=1", await demoForMe());
    toast("ใส่ข้อมูลตัวอย่างแล้ว");
    await App.bootAdmin();
  } catch (e) { toast(e.message); }
};

// ---------- ไฟล์ใน Google Drive ----------
const fmtSize = (n) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
App.pages["admin/files"] = () => {
  setTimeout(App.loadFiles, 0);
  const cats = App.driveCats || {};
  return head("ไฟล์ใน Google Drive", "ไฟล์ที่แนบจากทุกเมนู แยกโฟลเดอร์ตามหมวดงาน", `<button class="btn ghost" data-act="reloadFiles">โหลดใหม่</button>`) +
    `<div id="driveBox">${empty("กำลังโหลดรายการไฟล์…")}</div>
    <section class="panel"><h2>อัปโหลดไฟล์</h2>
      <label class="field">เก็บในโฟลเดอร์<select id="upCat">${Object.entries(cats).map(([k, v]) => `<option value="${k}" ${k === "other" ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
      <div class="drop page-drop"><input type="file" hidden multiple><div class="drop-ui"><b>ลากไฟล์มาวางที่นี่ (หลายไฟล์ได้)</b><span> หรือ </span><button type="button" class="link-btn">เลือกไฟล์</button>
      <small>ไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์ รูปจะถูกย่อให้อัตโนมัติ</small></div><div class="drop-status" id="upStatus"></div></div>
    </section>`;
};
const DRIVE_SETUP = `<section class="panel"><h2>ยังไม่ได้เชื่อม Google Drive</h2>
  <ol class="steps">
    <li>เปิด <a href="https://script.google.com" target="_blank" rel="noopener">script.google.com</a> ด้วยบัญชี Google ที่เป็นเจ้าของโฟลเดอร์ → New project</li>
    <li>คัดลอกโค้ดจากไฟล์ <code>google-apps-script/Code.gs</code> ใน GitHub ไปวางแทนทั้งหมด แล้วกดบันทึก</li>
    <li>Project Settings → Script Properties → เพิ่ม <code>SECRET</code> = รหัสลับยาวๆ ที่คิดเอง</li>
    <li>Deploy → New deployment → Web app → Execute as: <b>Me</b>, Who has access: <b>Anyone</b> → อนุญาตสิทธิ์ → คัดลอก Web app URL</li>
    <li>Cloudflare → โปรเจกต์ → Settings → Variables and Secrets: <code>DRIVE_SCRIPT_URL</code> = Web app URL, <code>DRIVE_SECRET</code> (Secret) = รหัสลับเดียวกับข้อ 3 แล้ว deploy ใหม่</li>
  </ol><p class="meta">ทำครั้งเดียว ใช้ร่วมกันทั้งสองคน ไฟล์ของแต่ละคนแยกโฟลเดอร์ตามชื่อ ระหว่างนี้วางลิงก์ไฟล์ในฟอร์มแทนได้</p></section>`;
App.loadFiles = async () => {
  const box = $("#driveBox");
  if (!box) return;
  const zone = main.querySelector(".page-drop");
  if (zone && !zone.dataset.wired) wirePageDrop(zone);
  try {
    if (!App.drive) App.drive = await api("GET", "/api/admin/drive/status");
    if (!App.drive.connected) { box.innerHTML = DRIVE_SETUP + (App.drive.error ? `<p class="private-note">${esc(App.drive.error)}</p>` : ""); return; }
    const d = await api("GET", "/api/admin/drive/list");
    box.innerHTML = `<p><a class="btn ghost" href="${esc(d.url)}" target="_blank" rel="noopener">เปิดโฟลเดอร์ของฉันใน Google Drive</a></p>` +
      (d.folders.length ? d.folders.map((f) => `<details class="panel folder" open><summary><b>${esc(f.name)}</b> <span class="meta">${f.files.length} ไฟล์</span>
        <a class="mini" href="${esc(f.url)}" target="_blank" rel="noopener">เปิดใน Drive</a></summary>
        ${f.files.length ? `<div class="files">${f.files.map((x) => `<div class="file">
          <a class="thumb" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img ? `<img src="${esc(x.img.replace("sz=w1600", "sz=w400"))}" alt="" loading="lazy">` : `<span>${esc((x.name.split(".").pop() || "ไฟล์").slice(0, 4).toUpperCase())}</span>`}</a>
          <div class="file-name" title="${esc(x.name)}">${esc(x.name)}</div><div class="meta">${fmtSize(x.size)} ${x.shared ? "" : "· ไม่แชร์"}</div>
          <span class="acts"><button class="ico" data-act="copyLink" data-url="${esc(x.img || x.url)}">คัดลอกลิงก์</button><button class="ico del" data-act="trashFile" data-id="${esc(x.id)}" data-name="${esc(x.name)}">ลบ</button></span>
        </div>`).join("")}</div>` : empty("ยังไม่มีไฟล์")}</details>`).join("") : empty("ยังไม่มีไฟล์ แนบไฟล์จากฟอร์มในเมนูต่างๆ หรืออัปโหลดด้านล่าง")) +
      (d.truncated ? `<p class="meta">แสดง 300 ไฟล์แรก ดูทั้งหมดได้ใน Google Drive</p>` : "");
  } catch (e) {
    box.innerHTML = `<p class="private-note">${esc(e.message)}</p>`;
  }
};
function wirePageDrop(zone) {
  zone.dataset.wired = "1";
  const input = zone.querySelector("input[type=file]");
  const status = zone.querySelector(".drop-status");
  const go = async (files) => {
    if (App.drive && !App.drive.connected) return toast("ยังไม่ได้เชื่อม Google Drive");
    let done = 0;
    for (const f of files) {
      try { await App.uploadFile(f, $("#upCat").value, (m) => (status.textContent = `${f.name}: ${m}`)); done++; }
      catch (e) { toast(`${f.name}: ${e.message}`); }
    }
    status.textContent = `อัปโหลดแล้ว ${done} จาก ${files.length} ไฟล์`;
    App.loadFiles();
  };
  zone.querySelector(".link-btn").onclick = () => input.click();
  input.onchange = () => go([...input.files]);
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("over"));
  zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); go([...e.dataTransfer.files]); });
}
App.actions.reloadFiles = () => { App.drive = null; App.loadFiles(); };
App.actions.copyLink = async (b) => {
  try { await navigator.clipboard.writeText(b.dataset.url); toast("คัดลอกลิงก์แล้ว"); } catch { prompt("คัดลอกลิงก์นี้", b.dataset.url); }
};
App.actions.trashFile = async (b) => {
  if (!confirm(`ย้าย "${b.dataset.name}" ไปถังขยะของ Google Drive? (กู้คืนได้ใน Drive ภายใน 30 วัน)`)) return;
  try { await api("POST", "/api/admin/drive/delete", { id: b.dataset.id }); toast("ย้ายไปถังขยะแล้ว"); App.loadFiles(); } catch (e) { toast(e.message); }
};

// ---------- ตั้งค่าเว็บ: ครูปรับแต่งเองได้ทั้งหมด ----------
const settingsObj = () => (App.DATA.settings = App.DATA.settings || {});
const saveSettings = async (mutate) => {
  const st = settingsObj();
  const backup = JSON.stringify(st);
  mutate(st);
  try { await saveKV("settings"); } catch (e) { App.DATA.settings = JSON.parse(backup); throw e; }
  App.setData(App.DATA);
};
const MODE_LABEL = { public: "หน้าสาธารณะ", admin: "หน้าครู" };
const menuRows = () => Object.entries(App.navBase()).flatMap(([mode, groups]) =>
  groups.flatMap((g) => g.items.map((i) => ({ ...i, mode, group: g.group || "" }))));

App.pages["admin/settings"] = () => {
  const st = settingsObj();
  const menus = st.menus || {};
  const optionFields = Object.entries(FORMS).flatMap(([key, F]) =>
    F.fields.filter((f) => f.options && f.key !== "vis").map((f) => ({ key, f, name: F.name, custom: !!st.options?.[`${key}.${f.key}`] })));
  return head("ตั้งค่าเว็บ", "ปรับชื่อเว็บ เมนู สี ตัวเลือกในฟอร์ม และตัวชี้วัด PA ได้เอง การตั้งค่าบันทึกทันที") +
    `<section class="panel"><h2 class="row-head">ชื่อเว็บ <button class="btn ghost small" data-act="setTitle">แก้ไข</button></h2>
      <p>${esc(st.siteTitle || "") || `<span class="meta">ยังไม่ได้ตั้ง (ใช้ชื่อครูแทน)</span>`}</p>
      <p class="meta">แสดงบนแท็บเบราว์เซอร์และตอนแชร์ลิงก์</p></section>` +
    `<h2>เมนู</h2><p class="meta">เปลี่ยนชื่อ เปลี่ยนสี หรือซ่อนเมนูที่ไม่ใช้ เมนูที่ซ่อนจะหายจากแถบด้านข้าง ข้อมูลข้างในยังอยู่ครบ</p>` +
    table([{ label: "หน้า", render: (r) => MODE_LABEL[r.mode] }, { label: "กลุ่ม", key: "group" },
      { label: "ชื่อเมนู", render: (r) => `<span class="swatch" style="background:${esc(menus[r.route]?.c || r.c)}"></span>${esc(menus[r.route]?.label || r.label)}` },
      { label: "แสดง", render: (r) => (LOCKED_ROUTES.has(r.route) ? `<span class="meta">ซ่อนไม่ได้</span>`
        : `<button type="button" class="ios-switch sm" role="switch" aria-checked="${!menus[r.route]?.hidden}" aria-label="แสดงเมนู ${esc(r.label)}" data-act="toggleMenu" data-route="${esc(r.route)}"><span></span></button>`) },
      { label: "", cls: "nowrap", render: (r) => `<span class="acts"><button class="ico" data-act="setMenu" data-route="${esc(r.route)}">ปรับ</button></span>` }], menuRows()) +
    `<h2>ตัวเลือกในฟอร์ม</h2><p class="meta">เพิ่มหรือแก้รายการให้เลือก เช่น ประเภทงาน ระดับรางวัล ให้ตรงกับโรงเรียน</p>` +
    table([{ label: "เมนู", key: "name" }, { label: "ช่อง", render: (r) => esc(r.f.label) },
      { label: "ตัวเลือก", render: (r) => optionsFor(r.key, r.f).map((o) => `<span class="tag">${esc(o)}</span>`).join(" ") + (r.custom ? ` <span class="meta">(แก้แล้ว)</span>` : "") },
      { label: "", cls: "nowrap", render: (r) => `<span class="acts"><button class="ico" data-act="setOptions" data-key="${r.key}" data-field="${r.f.key}">แก้ไข</button></span>` }], optionFields) +
    `<section class="panel" style="margin-top:20px"><h2 class="row-head">ตัวชี้วัด PA <button class="btn ghost small" data-act="setPA">แก้ไข</button></h2>
      <p>${PA === DEFAULT_PA ? "ใช้ค่าตั้งต้นตาม ว 9/2564 (15 ตัวชี้วัด)" : `กำหนดเอง ${PA_CODES.length} ตัวชี้วัด`}</p>
      <p class="meta">ถ้าโรงเรียนใช้แบบฟอร์มต่างจากนี้ แก้ให้ตรงได้ หลักฐานที่แท็กรหัสเดิมไว้ยังอยู่</p></section>` +
    `<section class="panel"><h2>คืนค่าตั้งต้น</h2><p>ล้างการตั้งค่าทั้งหมดในหน้านี้ ข้อมูลอื่นไม่หาย</p>
      <button class="btn ghost danger" data-act="resetSettings">คืนค่าตั้งต้นทั้งหมด</button></section>`;
};
App.actions.setTitle = () => editKV("ชื่อเว็บ", "settings", [{ key: "siteTitle", label: "ชื่อเว็บ", hint: "เช่น แฟ้มสะสมผลงาน ครูสมศรี" }],
  (o, r) => { o.siteTitle = r.siteTitle; });
App.actions.setMenu = (b) => {
  const route = b.dataset.route;
  const base = menuRows().find((r) => r.route === route);
  const cur = settingsObj().menus?.[route] || {};
  const fields = [
    { key: "label", label: "ชื่อเมนู", value: cur.label || base.label, required: true },
    { key: "c", label: "สีประจำเมนู", type: "color", value: cur.c || base.c },
  ];
  if (!LOCKED_ROUTES.has(route)) fields.push({ key: "show", label: "แสดงเมนูนี้", toggle: { on: "แสดง", off: "ซ่อน" }, value: cur.hidden ? "ซ่อน" : "แสดง" });
  openForm(`ปรับเมนู "${base.label}"`, fields, (r) => saveSettings((st) => {
    st.menus = st.menus || {};
    st.menus[route] = {
      ...(r.label !== base.label ? { label: r.label } : {}),
      ...(r.c.toLowerCase() !== base.c.toLowerCase() ? { c: r.c } : {}),
      ...(r.show === "ซ่อน" ? { hidden: true } : {}),
    };
    if (!Object.keys(st.menus[route]).length) delete st.menus[route];
  }));
};
App.actions.toggleMenu = async (b) => {
  const route = b.dataset.route;
  const show = b.getAttribute("aria-checked") !== "true";
  b.setAttribute("aria-checked", String(show)); // ขยับทันที ให้รู้สึกลื่น
  try {
    await new Promise((r) => setTimeout(r, 220));
    await saveSettings((st) => {
      st.menus = st.menus || {};
      const m = { ...(st.menus[route] || {}) };
      if (show) delete m.hidden; else m.hidden = true;
      if (Object.keys(m).length) st.menus[route] = m; else delete st.menus[route];
    });
    toast(show ? "แสดงเมนูแล้ว" : "ซ่อนเมนูแล้ว");
    render();
  } catch (e) { b.setAttribute("aria-checked", String(!show)); toast(e.message); }
};
App.actions.setOptions = (b) => {
  const { key, field } = b.dataset;
  const f = FORMS[key].fields.find((x) => x.key === field);
  openForm(`ตัวเลือก: ${FORMS[key].name} / ${f.label}`, [
    { key: "list", label: "ตัวเลือก", type: "textarea", rows: 8, hint: "บรรทัดละตัวเลือก เว้นว่างทั้งหมด = กลับไปใช้ค่าตั้งต้น", value: optionsFor(key, f).join("\n") },
  ], (r) => saveSettings((st) => {
    st.options = st.options || {};
    const list = r.list.split("\n").map((x) => x.trim()).filter(Boolean);
    if (list.length && list.join("|") !== f.options.join("|")) st.options[`${key}.${field}`] = list;
    else delete st.options[`${key}.${field}`];
  }));
};
App.actions.setPA = () => openForm("ตัวชี้วัด PA", [
  { key: "pa", label: "ตัวชี้วัด", type: "textarea", rows: 18, value: paToText(PA),
    hint: "บรรทัดที่ขึ้นต้นด้วย # คือชื่อด้าน บรรทัดอื่นคือ รหัส | ชื่อตัวชี้วัด เว้นว่างทั้งหมด = กลับไปใช้ ว 9/2564" },
], (r) => saveSettings((st) => {
  const parsed = paFromText(r.pa);
  if (parsed.length && r.pa.trim() !== paToText(DEFAULT_PA).trim()) st.paText = r.pa; else delete st.paText;
}));
App.actions.resetSettings = async () => {
  if (!confirm("คืนค่าตั้งต้นของชื่อเว็บ เมนู ตัวเลือก และตัวชี้วัด PA ทั้งหมดใช่ไหม?")) return;
  try { await saveSettings((st) => { for (const k of Object.keys(st)) delete st[k]; }); toast("คืนค่าตั้งต้นแล้ว"); render(); } catch (e) { toast(e.message); }
};

// ---------- เข้าสู่ระบบ และเริ่มต้นครั้งแรก ----------
App.banner = () =>
  App.mode === "admin" && JSON.stringify(App.DATA).includes("(ตัวอย่าง)")
    ? `<div class="notice">ยังมีข้อมูลตัวอย่างอยู่ แก้หรือลบรายการที่ขึ้นต้นด้วย "(ตัวอย่าง)" ก่อนให้คนอื่นดูหน้าสาธารณะ</div>`
    : "";

const screen = (html) => {
  document.body.dataset.auth = "out";
  main.innerHTML = `<div class="auth-wrap"><div class="auth-card">${html}</div></div>`;
};

App.showLogin = (msg = "") => {
  screen(`<div class="avatar big">ค</div><h1>หน้าครู</h1><p class="meta">ใส่รหัสผ่านของคุณ ระบบจะเปิดแฟ้มผลงานของเจ้าของรหัสให้เอง</p>
    <form id="loginForm"><label class="field">รหัสผ่าน<input type="password" id="pw" autocomplete="current-password" required></label>
    <p class="auth-err" id="loginErr">${esc(msg)}</p><button class="btn wide">เข้าสู่ระบบ</button></form>
    <a class="meta" href="/">กลับหน้าสาธารณะ</a>`);
  $("#pw").focus();
  $("#loginForm").onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector("button");
    btn.disabled = true;
    try {
      await api("POST", "/api/login", { password: $("#pw").value });
      await App.bootAdmin();
    } catch (err) {
      $("#loginErr").textContent = err.message;
      btn.disabled = false;
    }
  };
};

const BLANK = {
  profile: { name: "", position: "ครู", academicStanding: "", school: "", subjects: [], education: [] },
  schedule: { term: "", classes: [], periods: ["08:30–09:20", "09:20–10:10", "10:20–11:10", "11:10–12:00", "13:00–13:50", "13:50–14:40", "14:40–15:30"].map((time, i) => ({ no: i + 1, time })) },
  grades: { subject: "", room: "", parts: DEFAULT_PARTS, scores: {} },
  attendance: {}, attendanceDates: [], sarNotes: {},
};
// ค่าตัวอย่างที่ต้องแทนด้วยค่าจริง (ตรงกับ DEMO_PLACEHOLDERS ใน src/server.js)
const PLACEHOLDERS = { name: ["", "ชื่อ นามสกุล"], school: ["", "โรงเรียนตัวอย่างวิทยา"], office: ["", "สำนักงานเขตพื้นที่การศึกษามัธยมศึกษา..."] };
const withDefaults = (profile = {}) => {
  const out = { ...profile };
  for (const [k, v] of Object.entries(App.defaults || {})) if (out[k] === undefined || (PLACEHOLDERS[k] || [""]).includes(out[k])) out[k] = v;
  return out;
};
const demoForMe = async () => {
  const d = await (await fetch(DEMO_URL, { cache: "no-cache" })).json();
  return { ...d, profile: withDefaults({ ...d.profile, name: "", school: "", office: "" }) };
};
const showSetup = () => {
  screen(`<h1>ยินดีต้อนรับ</h1><p>คุณ${esc(App.siteName || "")}<br>แฟ้มผลงานยังว่าง เลือกวิธีเริ่มต้น</p>
    <div class="stack">
      <button class="btn wide" data-setup="blank">เริ่มจากว่าง แล้วกรอกข้อมูลจริง</button>
      <button class="btn ghost wide" data-setup="demo">เริ่มด้วยข้อมูลตัวอย่าง (ลองใช้ก่อน ลบทีหลังได้)</button>
    </div>`);
  main.querySelectorAll("[data-setup]").forEach((b) => (b.onclick = async () => {
    b.disabled = true;
    try {
      const src = b.dataset.setup === "demo" ? await demoForMe() : { ...BLANK, profile: withDefaults(BLANK.profile) };
      await api("POST", "/api/admin/import", src);
      if (b.dataset.setup === "blank") location.hash = "#/profile";
      await App.bootAdmin();
    } catch (e) { toast(e.message); b.disabled = false; }
  }));
};

App.bootAdmin = async () => {
  let data;
  try {
    data = await api("GET", "/api/admin/data");
  } catch (e) {
    if (e.status === 401) return App.showLogin();
    return screen(`<h1>เชื่อมต่อฐานข้อมูลไม่ได้</h1><p>${esc(e.message)}</p><button class="btn" onclick="location.reload()">ลองใหม่</button>`);
  }
  SITE = data._site;
  App.siteName = data._siteName;
  App.defaults = data._defaults || {};
  const pub = $("#publicLink");
  if (pub) pub.href = `/${SITE}/`;
  App.drive = null;
  api("GET", "/api/admin/drive/status").then((d) => { App.drive = d; App.driveCats = d.categories; }).catch(() => { App.drive = { connected: false }; });
  if (data._empty) return showSetup();
  for (const k of ["_empty", "_site", "_siteName", "_defaults"]) delete data[k];
  // โปรไฟล์ยังเป็นชื่อ/โรงเรียนตัวอย่าง → ใส่ค่าจริงของเจ้าของให้ แล้วบันทึก
  const fixed = withDefaults(data.profile);
  if (JSON.stringify(fixed) !== JSON.stringify(data.profile || {})) {
    data.profile = fixed;
    api("PUT", "/api/admin/kv/profile", fixed).then(() => toast("ใส่ชื่อและโรงเรียนในโปรไฟล์ให้แล้ว")).catch(() => {});
  }
  document.body.dataset.auth = "in";
  App.setData(data);
  render();
};

$("#logoutBtn")?.addEventListener("click", async () => {
  await api("POST", "/api/logout").catch(() => {});
  App.DATA = null;
  App.showLogin("ออกจากระบบแล้ว");
});

App.boot();
