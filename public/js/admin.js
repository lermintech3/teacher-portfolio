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
const PRIVATE_ONLY = new Set(["todos", "deadlines", "students", "care", "documents", "meetings", "leaves", "career", "swaps", "orders"]);
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
    { key: "status", label: "สถานะ", options: ["ยังไม่ทำ", "กำลังทำ", "เสร็จ", "ทั้งปี"], hint: "งานที่ทำตลอดปี เช่น เวร ครูที่ปรึกษา เลือก \"ทั้งปี\"" },
    { key: "due", label: "กำหนดเสร็จ", type: "date" },
    { key: "file", label: "ไฟล์คำสั่ง", type: "file", category: "responsibilities" }, visField] },
  // คำสั่งโรงเรียน: เก็บเฉพาะข้อมูล ไม่เก็บไฟล์ (ครูเลือกให้ AI อ่านแล้วทิ้ง) งานที่ได้รับมอบหมายอยู่ใน responsibilities ผูกด้วย orderId
  orders: { name: "คำสั่ง", fields: [
    { key: "no", label: "เลขที่คำสั่ง", placeholder: "เช่น 45/2569", required: true }, { key: "date", label: "ลงวันที่", type: "date" },
    { key: "title", label: "เรื่อง", placeholder: "เช่น แต่งตั้งคณะกรรมการดำเนินงานวันเด็กแห่งชาติ", required: true },
    { key: "from", label: "ผู้ออกคำสั่ง", placeholder: "เช่น โรงเรียนบ้านไร่" }, yearField, { key: "note", label: "หมายเหตุ", type: "textarea" }] },
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
    { key: "pa", label: "ตัวชี้วัด PA", type: "chips", groups: () => PA.map((d) => ({ title: `ด้านที่ ${d.no} ${d.title}`, items: d.items })), hint: "แตะเลือกได้หลายข้อ" },
    { key: "date", label: "วันที่", type: "date", value: "today" },
    { key: "description", label: "คำอธิบายสั้นๆ", type: "textarea", rows: 2, hint: "แสดงใต้ชื่อหลักฐานในหน้าสาธารณะ เช่น ใช้กับนักเรียน ม.4/2 ภาคเรียนที่ 1" },
    { key: "source", label: "มาจากเมนู", options: ["แผนการสอน", "บันทึกหลังสอน", "สื่อ", "การวัดผล", "นิเทศ", "ดูแลช่วยเหลือ", "การพัฒนาตนเอง", "อื่นๆ"] },
    { key: "sar", label: "หัวข้อ SAR", options: ["การจัดการเรียนการสอน", "ผลสัมฤทธิ์ทางการเรียน", "งานที่ได้รับมอบหมาย", "การพัฒนาตนเอง", "ผลงาน"] },
    { key: "link", label: "ไฟล์หลักฐาน", type: "file", category: "evidence" }, visField],
    map: (r) => ({ ...r, pa: splitList(r.pa).filter((c) => PA_CODES.includes(c)) }) },
  leaves: { name: "การลา", fields: [
    { key: "type", label: "ประเภท", options: ["ลาป่วย", "ลากิจ", "ลาพักผ่อน", "ไปราชการ", "ลาคลอด", "ลาอุปสมบท", "มาสาย"], wheel: true }, { key: "from", label: "ตั้งแต่", type: "date", required: true },
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

App.editItem = (key, item, preset = {}) => {
  const F = FORMS[key];
  const fields = F.fields
    .filter((f) => !(f.key === "vis" && PRIVATE_ONLY.has(key)))
    .map((f) => {
      const options = f.key === "vis" ? f.options : optionsFor(key, f);
      const value = !item && preset[f.key] !== undefined ? preset[f.key] : formValue(f, item);
      // ค่าเดิมที่ไม่อยู่ในตัวเลือกใหม่ ยังเลือกได้ ไม่หาย
      return { ...f, options: options && value && !options.includes(value) ? [value, ...options] : options, value };
    });
  const formTitle = `${item ? "แก้ไข" : "เพิ่ม"}${F.name}`;
  openForm(formTitle, fields, async (rec) => {
    let body = F.map ? await F.map(rec, item) : rec;
    if (body.vis) body.vis = VIS_CODE[body.vis] || "private";
    if (item) {
      const { id, ...old } = item;
      const saved = await api("PUT", `/api/admin/item/${id}`, { ...old, ...body });
      Object.assign(item, saved);
    } else {
      // preset._extra: ค่าที่ไม่มีช่องในฟอร์ม แต่ต้องติดไปกับรายการใหม่ (เช่น orderId ของงานในคำสั่ง)
      arr(key).unshift(await api("POST", `/api/admin/items/${key}`, { ...(preset._extra || {}), ...body }));
    }
  });
  App.aiAttach?.(key, fields, F.name); // ปุ่ม "✨ อ่านด้วย AI" (ai.js)
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
    ${App.dashCharts ? App.dashCharts() : ""}
    <section class="panel" style="--c:${C.indigo}">
      <h2 class="row-head">กำหนดส่งสำคัญ <button class="btn ghost small" data-add="deadlines">+ เพิ่ม</button></h2>
      ${deadlines.length ? `<div class="deadlines">${deadlines.map(({ d, left }) => `
        <div class="deadline ${left <= 30 ? "soon" : ""}"><b>${left >= 0 ? `อีก ${left} วัน` : "เลยกำหนด"}</b><span>${esc(d.title)}</span><span class="meta">${thDate(d.date)}</span>${tools("deadlines", d)}</div>`).join("")}</div>` : empty("ยังไม่มีกำหนดส่ง")}
    </section>
    ${App.badgesHTML ? App.badgesHTML(false) : ""}`;
};
App.actions.todo = async (el) => {
  const t = findItem("todos", el.dataset.id);
  const { id, ...rest } = t;
  try { Object.assign(t, await api("PUT", `/api/admin/item/${id}`, { ...rest, done: !t.done })); } catch (e) { toast(e.message); }
  render();
};

// ---------- การสอน: แตะช่องในตารางเพื่อเพิ่ม/แก้/ลบ ----------
// ภาคเรียน: schedule = { term: ภาคเรียนปัจจุบัน, periods, classes, terms: { "1/2569": { periods, classes } }, autoTerm }
// ภาคเรียนปัจจุบันอยู่ชั้นบนสุดเหมือนเดิม (หน้าสาธารณะ หน้าแรก ใช้ต่อได้) ภาคเรียนอื่นเก็บใน terms
const schedBase = () => (App.DATA.schedule = App.DATA.schedule || { term: "", periods: [], classes: [] });
let VIEW_TERM = ""; // ภาคเรียนที่กำลังดู/แก้ในหน้าตารางสอน
// ภาคเรียนตามวันที่: 1 = 16 พ.ค.–31 ต.ค., 2 = 1 พ.ย.–15 พ.ค.
const termGuess = () => { const d = new Date(), m = d.getMonth(); return `${(m > 4 || (m === 4 && d.getDate() >= 16)) && m <= 9 ? 1 : 2}/${BE_NOW}`; };
const termKey = (t) => { const [a, y] = String(t).split("/"); return Number(y || 0) * 10 + Number(a || 0); };
const schedTerms = () => { const s = schedBase(); return [...new Set([s.term, ...Object.keys(s.terms || {})].filter(Boolean))].sort((a, b) => termKey(b) - termKey(a)); };
const termData = (t) => { const s = schedBase(); return !t || t === s.term ? s : s.terms?.[t] || null; };
const schedOf = () => {
  const s = schedBase();
  if (!VIEW_TERM || VIEW_TERM === s.term) return s;
  s.terms = s.terms || {};
  return (s.terms[VIEW_TERM] = s.terms[VIEW_TERM] || { periods: (s.periods || []).map((p) => ({ ...p })), classes: [] });
};
// สลับภาคเรียนปัจจุบัน: เก็บของเดิมเข้า terms แล้วยกภาคเรียน t ขึ้นมาชั้นบน
const setActiveTerm = (t) => {
  const s = schedBase();
  if (!t || t === s.term) return;
  s.terms = s.terms || {};
  if (s.term) s.terms[s.term] = { periods: s.periods || [], classes: s.classes || [] };
  const n = s.terms[t] || { periods: (s.periods || []).map((p) => ({ ...p })), classes: [] };
  delete s.terms[t];
  s.term = t; s.periods = n.periods || []; s.classes = n.classes || [];
};
const cellOf = (day, no) => (schedOf().classes || []).filter((x) => x.day === day && Number(x.period) === Number(no));
// แก้ในหน่วยความจำก่อน แล้วบันทึก ถ้าบันทึกไม่สำเร็จให้ย้อนกลับ
const saveSched = async (mutate) => {
  const backup = JSON.stringify(schedBase());
  const s = schedOf();
  s.classes = s.classes || [];
  s.periods = s.periods || [];
  mutate(s);
  try { await saveKV("schedule"); } catch (e) { App.DATA.schedule = JSON.parse(backup); throw e; }
};
const uniq = (xs) => [...new Set(xs.map((x) => String(x || "").trim()).filter(Boolean))];

App.scheduleEditor = () => {
  const periods = schedOf().periods || [];
  if (!periods.length) return `<p class="empty">ยังไม่ได้ตั้งเวลาคาบ กดปุ่ม "ภาคเรียนและเวลาคาบ" ก่อน</p>`;
  const cell = (day, no) => {
    const c = cellOf(day, no);
    const body = c.length ? c.map((x) => `<b>${esc(x.subject)}</b>${esc(x.room)}`).join("<br>") : `<span class="plus">+</span>`;
    return `<td class="${c.length ? "has" : ""}${c.length > 1 ? " clash" : ""}"><button type="button" class="cell" data-act="editCell" data-day="${esc(day)}" data-period="${no}" aria-label="${esc(day)} คาบ ${no}">${body}</button></td>`;
  };
  return `<div class="table-wrap"><table class="sched edit">
    <thead><tr><th>วัน</th>${periods.map((p) => `<th><button type="button" class="th-btn" data-act="editPeriod" data-no="${esc(p.no)}">คาบ ${esc(p.no)}<small>${esc(p.time)}</small></button></th>`).join("")}</tr></thead>
    <tbody>${DAYS.map((d) => `<tr><th>${d}</th>${periods.map((p) => cell(d, Number(p.no))).join("")}</tr>`).join("")}</tbody>
  </table></div>`;
};

const schedProblems = () => {
  const s = schedOf();
  const nos = new Set((s.periods || []).map((p) => Number(p.no)));
  const classes = s.classes || [];
  const orphans = classes.filter((c) => !DAYS.includes(c.day) || !nos.has(Number(c.period)));
  const count = {};
  classes.filter((c) => !orphans.includes(c)).forEach((c) => { const k = `${c.day}|${c.period}`; count[k] = (count[k] || 0) + 1; });
  return { orphans, clashes: Object.values(count).filter((n) => n > 1).length };
};

App.pages["admin/schedule"] = ({ q }) => {
  const base = schedBase();
  if (!base.term && ((base.classes || []).length || (base.periods || []).length)) base.term = termGuess(); // ข้อมูลเก่าที่ยังไม่ระบุภาคเรียน
  const terms = schedTerms();
  VIEW_TERM = q.term && terms.includes(q.term) ? q.term : base.term;
  const s = schedOf();
  const total = (s.classes || []).length;
  const { orphans, clashes } = schedProblems();
  const isCur = VIEW_TERM === base.term;
  const termBar = `<div class="filters term-bar">${terms.map((t) => `<button data-act="viewTerm" data-t="${esc(t)}" class="${t === VIEW_TERM ? "on" : ""}">ภาคเรียน ${esc(t)}${t === base.term ? " · ปัจจุบัน" : ""}</button>`).join("")}
    <button class="term-new" data-act="newTerm">+ ภาคเรียนใหม่</button></div>`;
  const curNote = isCur ? `<p class="meta">ภาคเรียนนี้เป็น<b>ภาคเรียนปัจจุบัน</b> ใช้แสดงในหน้าแรกและหน้าสาธารณะ${base.autoTerm === false ? "" : " · เปลี่ยนให้เองตามวันที่ เมื่อภาคเรียนถัดไปมีตารางแล้ว"}</p>`
    : `<p class="meta warn">กำลังดูภาคเรียน ${esc(VIEW_TERM)} ซึ่งไม่ใช่ภาคเรียนปัจจุบัน (${esc(base.term)}) <button class="btn ghost small" data-act="setTerm" data-t="${esc(VIEW_TERM)}">ตั้งเป็นภาคเรียนปัจจุบัน</button></p>`;
  return head("ตารางสอน", `ภาคเรียนที่ ${esc(VIEW_TERM || "-")} สอน ${total} คาบต่อสัปดาห์`,
    `<button class="btn" data-act="editTerm">ภาคเรียนและเวลาคาบ</button><button class="btn ghost" data-act="print">พิมพ์</button><button class="btn ghost" data-act="clearSched">ล้างทั้งหมด</button>`) +
    (terms.length ? termBar : "") + (terms.length > 1 || !isCur ? curNote : "") +
    `<p class="meta">แตะช่องว่างเพื่อเพิ่มวิชา · แตะวิชาเดิมเพื่อแก้หรือลบ · แตะหัวคาบเพื่อเปลี่ยนเวลา</p>` +
    App.scheduleEditor() +
    (clashes ? `<p class="meta warn">มี ${clashes} ช่องที่มีหลายวิชาซ้อนกัน (กรอบสีแดง) แตะช่องนั้นเพื่อแก้หรือลบทีละรายการ</p>` : "") +
    (orphans.length ? `<p class="meta warn">มี ${orphans.length} คาบที่ไม่อยู่ในตาราง (คาบนั้นถูกลบออกจากเวลาคาบแล้ว) <button class="btn ghost small" data-act="dropOrphans">ลบรายการเหล่านี้</button></p>` : "") +
    `<h2 class="row-head">สอนแทนและแลกคาบ <button class="btn ghost small" data-add="swaps">+ บันทึก</button></h2>` +
    table([dateCol(), { label: "ประเภท", key: "kind" }, { label: "คาบ / ห้อง", key: "detail" }, { label: "กับครู", key: "with" },
      { label: "", render: (r) => tools("swaps", r), cls: "nowrap" }], arr("swaps"));
};

App.actions.editCell = (b) => {
  const day = b.dataset.day;
  const no = Number(b.dataset.period);
  const cur = cellOf(day, no)[0];
  const time = (schedOf().periods || []).find((p) => Number(p.no) === no)?.time || "";
  const others = DAYS.filter((d) => d !== day);
  const fields = [
    { key: "subject", label: "วิชา", placeholder: "เช่น ค15101", value: cur?.subject || "" },
    { key: "room", label: "ห้อง / ชั้น", placeholder: "เช่น ป.5/1", value: cur?.room || "" },
    ...others.map((d) => {
      const there = cellOf(d, no)[0];
      return { key: `d_${DAYS.indexOf(d)}`, label: `ใส่คาบ ${no} วัน${d} ด้วย${there ? ` (ทับ ${there.subject})` : ""}`, type: "check" };
    }),
    ...(cur ? [{ key: "del", label: "ลบคาบนี้", type: "check" }] : []),
  ];
  openForm(`${day} คาบ ${no}${time ? ` · ${time}` : ""}`, fields, async (r) => {
    if (r.del) { await saveSched((s) => { s.classes = s.classes.filter((c) => c !== cur); }); return; }
    if (!r.subject) throw new Error(cur ? "กรอกชื่อวิชา หรือติ๊ก \"ลบคาบนี้\"" : "กรอกชื่อวิชา");
    const targets = [day, ...others.filter((d) => r[`d_${DAYS.indexOf(d)}`])];
    await saveSched((s) => {
      targets.forEach((d) => {
        const hit = s.classes.find((c) => c.day === d && Number(c.period) === no);
        if (hit) { hit.subject = r.subject; hit.room = r.room; } else s.classes.push({ day: d, period: no, subject: r.subject, room: r.room });
      });
    });
  });
  // ปุ่มลัด: แตะวิชา/ห้องที่เคยใช้แล้วเติมให้ทันที
  const chips = (key, values) => {
    const input = document.getElementById(`f_${key}`);
    if (!input || !values.length) return;
    const row = document.createElement("div");
    row.className = "chips";
    row.innerHTML = values.map((v) => `<button type="button" class="chip" data-v="${esc(v)}">${esc(v)}</button>`).join("");
    row.addEventListener("click", (e) => {
      const chip = e.target.closest(".chip");
      if (!chip) return;
      input.value = chip.dataset.v;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    input.closest(".ios-cell").after(row);
  };
  const all = schedOf().classes || [];
  chips("room", uniq(all.map((c) => c.room)).slice(0, 12));
  chips("subject", uniq(all.map((c) => c.subject)).slice(0, 12));
};

App.actions.editPeriod = (b) => {
  const no = Number(b.dataset.no);
  const p = (schedOf().periods || []).find((x) => Number(x.no) === no);
  openForm(`เวลาคาบ ${no}`, [{ key: "time", label: "เวลา", type: "timerange", required: true, value: p?.time || "" }], async (r) => {
    await saveSched((s) => { const t = s.periods.find((x) => Number(x.no) === no); if (t) t.time = r.time; });
  });
};

App.actions.clearSched = async () => {
  if (!(schedOf().classes || []).length) return toast("ตารางยังว่างอยู่");
  if (!confirm("ล้างวิชาทั้งหมดในตารางสอนใช่ไหม? (ภาคเรียนและเวลาคาบยังอยู่) ลบแล้วกู้คืนไม่ได้")) return;
  try { await saveSched((s) => { s.classes = []; }); toast("ล้างตารางแล้ว"); } catch (e) { toast(e.message); }
  render();
};

App.actions.dropOrphans = async () => {
  const { orphans } = schedProblems();
  if (!orphans.length || !confirm(`ลบ ${orphans.length} คาบที่ไม่แสดงในตารางใช่ไหม?`)) return;
  try { await saveSched((s) => { s.classes = s.classes.filter((c) => !orphans.includes(c)); }); toast("ลบแล้ว"); } catch (e) { toast(e.message); }
  render();
};

const goTerm = (t) => { location.hash = `#/schedule?term=${encodeURIComponent(t)}`; };
App.actions.viewTerm = (b) => goTerm(b.dataset.t);
App.actions.setTerm = async (b) => {
  const t = b.dataset.t, backup = JSON.stringify(schedBase());
  setActiveTerm(t);
  schedBase().lastGuess = termGuess(); // ครูเลือกเอง: ไม่ให้ระบบสลับกลับจนกว่าจะขึ้นภาคเรียนถัดไป
  try { await saveKV("schedule"); toast(`ตั้งภาคเรียน ${t} เป็นภาคเรียนปัจจุบันแล้ว`); } catch (e) { App.DATA.schedule = JSON.parse(backup); toast(e.message); }
  render();
};
// เริ่มภาคเรียนใหม่: คัดลอกจากภาคเรียนที่กำลังดู หรือเริ่มจากตารางว่าง (ใช้เวลาคาบเดิม)
App.actions.newTerm = () => {
  const s = schedBase(), have = schedTerms();
  const opts = YEARS.flatMap((y) => [`1/${y}`, `2/${y}`]).filter((t) => !have.includes(t));
  const latest = have[0];
  const next = latest ? (latest.startsWith("1/") ? `2/${latest.split("/")[1]}` : `1/${Number(latest.split("/")[1]) + 1}`) : termGuess();
  const from = VIEW_TERM || s.term;
  openForm("เริ่มภาคเรียนใหม่", [
    { key: "term", label: "ภาคเรียน", options: opts, wheel: true, value: opts.includes(next) ? next : opts.includes(termGuess()) ? termGuess() : opts[0] },
    ...(from ? [{ key: "src", label: "ตาราง", options: [`คัดลอกจากภาคเรียน ${from} แล้วแก้ต่อ`, "เริ่มจากตารางว่าง (ใช้เวลาคาบเดิม)"], value: "เริ่มจากตารางว่าง (ใช้เวลาคาบเดิม)" }] : []),
    { key: "cur", label: "ตั้งเป็นภาคเรียนปัจจุบันเลย", type: "check", value: false, hint: "ถ้าไม่ติ๊ก ระบบจะเปลี่ยนให้เองเมื่อถึงวันเปิดภาคเรียนตามวันที่" },
  ], async (r) => {
    const backup = JSON.stringify(schedBase());
    const src = termData(from) || { periods: [], classes: [] };
    s.terms = s.terms || {};
    const copy = String(r.src || "").startsWith("คัดลอก");
    const fresh = { periods: (src.periods || []).map((p) => ({ ...p })), classes: copy ? (src.classes || []).map((c) => ({ ...c })) : [] };
    if (!s.term) { s.term = r.term; s.periods = fresh.periods; s.classes = fresh.classes; } else s.terms[r.term] = fresh;
    if (r.cur) setActiveTerm(r.term);
    try { await saveKV("schedule"); } catch (e) { App.DATA.schedule = JSON.parse(backup); throw e; }
    goTerm(r.term);
    toast(`เพิ่มภาคเรียน ${r.term} แล้ว${copy ? "" : " แตะช่องในตาราง หรือกด ✨ นำเข้าจากรูป"}`);
  });
};
// ภาคเรียนที่กำลังดู: เปลี่ยนชื่อ เวลาคาบ ลบ และการเปลี่ยนภาคเรียนอัตโนมัติ
App.actions.editTerm = () => {
  const s = schedBase();
  const view = VIEW_TERM || s.term || termGuess();
  const periods = schedOf().periods || [];
  const others = schedTerms().filter((t) => t !== view);
  const opts = YEARS.flatMap((y) => [`1/${y}`, `2/${y}`]).filter((t) => !others.includes(t));
  openForm("ภาคเรียนและเวลาคาบ", [
    { key: "term", label: "ภาคเรียน", options: opts, wheel: true, value: view },
    ...Array.from({ length: 10 }, (_, i) => ({ key: `p${i}`, label: `คาบ ${i + 1}`, type: "timerange", placeholder: "ไม่มีคาบนี้", value: periods.find((p) => Number(p.no) === i + 1)?.time || "" })),
    { key: "auto", label: "เปลี่ยนภาคเรียนปัจจุบันให้เองตามวันที่", type: "check", value: s.autoTerm !== false, hint: "ภาคเรียนที่ 1 = 16 พ.ค.–31 ต.ค. ภาคเรียนที่ 2 = 1 พ.ย.–15 พ.ค. เปลี่ยนเมื่อภาคเรียนนั้นมีตารางแล้วเท่านั้น" },
    ...(others.length ? [{ key: "del", label: `ลบภาคเรียน ${view} ทั้งภาคเรียน`, type: "check", value: false }] : []),
  ], async (r) => {
    const backup = JSON.stringify(schedBase());
    try {
      if (r.del) {
        if (!confirm(`ลบตารางสอนภาคเรียน ${view} ทั้งหมดใช่ไหม? ลบแล้วกู้คืนไม่ได้`)) throw new Error("ยกเลิกการลบ");
        if (view === s.term) setActiveTerm(others[0]);
        delete s.terms[view];
        s.autoTerm = r.auto;
        await saveKV("schedule");
        return goTerm(schedBase().term);
      }
      const t = schedOf();
      t.periods = Array.from({ length: 10 }, (_, i) => r[`p${i}`]).map((time, i) => ({ no: i + 1, time })).filter((p) => p.time);
      s.autoTerm = r.auto;
      if (r.term !== view) { // เปลี่ยนชื่อภาคเรียน
        if (view === s.term) s.term = r.term;
        else { s.terms[r.term] = s.terms[view]; delete s.terms[view]; }
      }
      await saveKV("schedule");
      if (r.term !== view) goTerm(r.term);
    } catch (e) { App.DATA.schedule = JSON.parse(backup); throw e; }
  });
};
// เปิดหน้าครูครั้งแรกของวัน: ถ้าถึงภาคเรียนใหม่แล้วและภาคเรียนนั้นมีตาราง ให้เป็นภาคเรียนปัจจุบันเอง
App.autoTerm = async () => {
  const s = App.DATA?.schedule;
  if (!s || s.autoTerm === false || !s.term) return;
  const g = termGuess();
  if (s.lastGuess === g) return; // เปลี่ยนเฉพาะตอนเพิ่งขึ้นภาคเรียนใหม่ ไม่ทับที่ครูเลือกเอง
  if (!s.lastGuess) { s.lastGuess = g; return; } // ครั้งแรก: จำไว้เฉย ๆ ไม่สลับ
  if (g === s.term || termKey(g) < termKey(s.term) || !(s.terms?.[g]?.classes || []).length) { s.lastGuess = g; saveKVLater("schedule"); return; }
  const backup = JSON.stringify(s);
  s.lastGuess = g;
  setActiveTerm(g);
  try { await saveKV("schedule"); toast(`ขึ้นภาคเรียน ${g} แล้ว ตารางสอนเปลี่ยนเป็นภาคเรียนใหม่ให้`); render(); } catch { App.DATA.schedule = JSON.parse(backup); }
};

App.pages["admin/plans"] = listPage({
  key: "plans", title: "แผนการสอนและสื่อ", sub: (r) => `${r.length} รายการ รายการที่เป็นสาธารณะและมีไฟล์ จะอยู่ใน "คลังสื่อการสอน" ให้คนอื่นดาวน์โหลด`, filter: "type",
  cols: [{ label: "วิชา", key: "subject", cls: "nowrap" }, { label: "หน่วย", key: "unit" },
    { label: "ชื่อ", render: (r) => (safeUrl(r.link) ? `<a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.title)}</a>` : esc(r.title)) }, tagCol("ประเภท", "type"),
    { label: "ดาวน์โหลด", cls: "num", render: (r) => (r.vis === "public" && safeUrl(r.link) ? (Number(r.downloads) || 0).toLocaleString("th-TH") : `<span class="meta">-</span>`) }],
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

// ---------- หน้า PA: สาธารณะ = โชว์เฉพาะข้อที่มีหลักฐานแบบการ์ด / ครู = ภาพรวมสถานะ + เพิ่มหลักฐานรายข้อ ----------
// แปลงลิงก์หลักฐานเป็น { kind, thumb, embed } เพื่อทำภาพตัวอย่างและเปิดดูในหน้าเดียว
const paMedia = (url) => {
  const u = safeUrl(url);
  if (!u) return { kind: "none" };
  const yt = (u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/) || [])[1];
  if (yt) return { kind: "video", thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, embed: `https://www.youtube-nocookie.com/embed/${yt}?rel=0` };
  const dId = (u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:.*&)?id=|thumbnail\?(?:.*&)?id=)([\w-]{20,})/) || [])[1];
  if (dId) return { kind: "drive", thumb: `https://drive.google.com/thumbnail?id=${dId}&sz=w640`, embed: `https://drive.google.com/file/d/${dId}/preview` };
  const gDoc = u.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]{20,})/);
  if (gDoc) return { kind: gDoc[1] === "presentation" ? "slides" : gDoc[1] === "spreadsheets" ? "sheet" : "doc", embed: `https://docs.google.com/${gDoc[1]}/d/${gDoc[2]}/preview` };
  if (/\.(jpe?g|png|webp|gif)(\?|#|$)/i.test(u) || /googleusercontent\.com/i.test(u)) return { kind: "image", thumb: u, img: u };
  if (/\.pdf(\?|#|$)/i.test(u)) return { kind: "pdf", embed: `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(u)}` }; // มือถือเปิด PDF ใน iframe ตรงๆ ไม่ได้
  return { kind: "link" };
};
const PA_SVG = {
  video: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" stroke="none"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><text x="12" y="17.5" text-anchor="middle" font-size="5.5" font-weight="700" fill="currentColor" stroke="none" font-family="system-ui">PDF</text>',
  slides: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8M8 12l3-3 2 2 3-3"/>',
  sheet: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 10h16M4 15h16M10 4v16"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h7M8 11h5"/>',
  pen: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  media: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M10 8l4 2-4 2z" fill="currentColor" stroke="none"/>',
  assess: '<path d="M5 20V11M11 20V5M17 20v-7M3 20h18"/>',
  supervise: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 13l2 2 4-4"/>',
  care: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  develop: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5M22 9v6"/>',
};
const paIcon = (k, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PA_SVG[k]}</svg>`;
// ชนิด → [ป้าย, ไอคอน, สี]
const PA_KIND = { video: ["วิดีโอ", "video", "#e5484d"], drive: ["ไฟล์", "file", "#4f63d2"], doc: ["เอกสาร", "file", "#2f6fde"], slides: ["สไลด์", "slides", "#e08a00"],
  sheet: ["ตาราง", "sheet", "#1f9d61"], image: ["รูปภาพ", "image", "#0e9aa7"], pdf: ["PDF", "pdf", "#d14343"], link: ["ลิงก์", "link", "#6c4cf1"], none: ["หลักฐาน", "folder", "#7c7a99"] };

// หลักฐานที่ไม่มีไฟล์แนบ: ใช้ไอคอนและสีตามเมนูที่มา ทำเป็นหน้าปกเต็มกรอบ
const PA_SRC = { "แผนการสอน": ["book", "#6c4cf1"], "บันทึกหลังสอน": ["pen", "#0e9aa7"], "สื่อ": ["media", "#e08a00"], "การวัดผล": ["assess", "#d9480f"],
  "นิเทศ": ["supervise", "#1f9d61"], "ดูแลช่วยเหลือ": ["care", "#d6336c"], "การพัฒนาตนเอง": ["develop", "#2f6fde"] };
const evLook = (e) => {
  const m = paMedia(e.link);
  const [kindLabel, kIcon, kColor] = PA_KIND[m.kind];
  const src = m.kind === "none" ? PA_SRC[e.source] : null;
  return { m, kindLabel, label: src ? e.source : kindLabel, icon: src ? src[0] : kIcon, color: src ? src[1] : kColor };
};
const evCover = (l) => `<span class="ev-cover" aria-hidden="true">${paIcon(l.icon, "ev-cover-art")}<small>หลักฐาน PA</small><b>${esc(l.label)}</b></span>`;

let EV_CUR = []; // หลักฐานของหน้าที่แสดงอยู่ ใช้หาข้อมูลตอนเปิดแผงรายละเอียด
const evCard = (e, isAdmin, i = 0) => {
  const l = evLook(e), { m, kindLabel, color } = l;
  const thumb = m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "";
  const date = e.date ? `<span>${paIcon("cal", "ev-mi")}${esc(thDate(e.date))}</span>` : "";
  const src = e.source && e.source !== "อื่นๆ" ? `<span>${esc(e.source)}</span>` : "";
  const body = `<div class="ev-thumb k-${m.kind}${thumb ? " has-img" : ""}">${evCover(l)}${thumb}${m.kind === "video" ? '<span class="ev-play" aria-hidden="true"></span>' : ""}<span class="ev-kind">${kindLabel}</span></div>
    <div class="ev-body"><b class="ev-title">${esc(e.title)}</b>${e.description ? `<p class="ev-desc">${esc(e.description)}</p>` : ""}
      ${date || src ? `<div class="ev-meta">${date}${src}</div>` : ""}
      ${!isAdmin ? `<span class="ev-cta">${m.kind === "video" ? "ดูวิดีโอ" : "ดูรายละเอียด"}<i aria-hidden="true">→</i></span>` : ""}</div>`;
  return `<article class="ev-card" style="--k:${color};--i:${i}"><button type="button" class="ev-open" data-act="evView" data-i="${EV_CUR.indexOf(e)}" aria-haspopup="dialog">${body}</button>${isAdmin ? `<div class="ev-tools">${tools("evidence", e)}</div>` : ""}</article>`;
};
// ภาพย่อเล็กซ้อนกันในแถวตัวชี้วัดที่ยังพับอยู่
const evStack = (items) => `<span class="ev-stack" aria-hidden="true">${items.slice(0, 3).map((e) => {
  const { m, icon, color } = evLook(e);
  return `<span style="--k:${color}">${paIcon(icon)}${m.thumb ? `<img src="${esc(m.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ""}</span>`;
}).join("")}${items.length > 3 ? `<span class="more">+${items.length - 3}</span>` : ""}</span>`;
const PA_OPEN = new Set();
// สีประจำแต่ละด้าน (วนซ้ำถ้าครูกำหนดด้านเพิ่ม)
const PA_COLORS = ["#6c4cf1", "#0b9f8f", "#f0603a", "#d6409f", "#2f80ed"];
const paColor = (no) => PA_COLORS[Math.max(0, PA.findIndex((d) => d.no === no)) % PA_COLORS.length];
const paColorOf = (code) => paColor((PA.find((d) => d.items.some(([c]) => c === code)) || {}).no);
let paOpenInit = false;
const evSort = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));

App.pages["admin/pa"] = ({ q }) => {
  const isAdmin = App.mode === "admin";
  const ev = list("evidence");
  EV_CUR = ev;
  const of = (code) => ev.filter((e) => (e.pa || []).includes(code)).sort(evSort);
  const status = (code) => { const it = of(code); return !it.length ? "none" : it.some((e) => e.vis === "public") ? "public" : "private"; };
  const cur = PA.some((d) => d.no === q.d) ? q.d : "all";
  const tabs = (aspects, count) => aspects.length < 2 ? "" : `<div class="pa-tabs" role="tablist" style="--n:${aspects.length}">${[{ no: "all", title: "ทั้งหมด" }, ...aspects].map((d) =>
    `<button role="tab" class="${d.no === "all" ? "pa-tab-all" : ""}"${d.no === "all" ? "" : ` style="--a:${paColor(d.no)}"`} aria-selected="${d.no === cur}" data-act="paTab" data-d="${d.no}">${d.no === "all"
      ? `<span class="pa-tab-t">ทั้งหมด</span>`
      : `<span class="pa-tab-no">${d.no}</span><span class="pa-tab-t">${esc(d.title.replace(/^ด้าน/, ""))}</span>`}<i>${count(d)}</i></button>`).join("")}</div>`;
  const shownAspects = (aspects) => aspects.filter((d) => cur === "all" || d.no === cur);

  if (!isAdmin) {
    // หน้าสาธารณะ: ไม่แสดงข้อที่ยังไม่มีหลักฐาน และไม่โชว์เปอร์เซ็นต์ความครบ
    const aspects = PA.map((d) => ({ ...d, items: d.items.filter(([c]) => of(c).length) })); // แสดงครบทุกด้าน ด้านที่ยังว่างจะมีข้อความแจ้ง
    const codes = aspects.flatMap((d) => d.items.map(([c]) => c));
    const total = new Set(ev.filter((e) => (e.pa || []).some((c) => codes.includes(c)))).size;
    if (!total) return head("หลักฐานตามตัวชี้วัด PA", "ข้อตกลงในการพัฒนางาน") + `<div class="panel pa-empty"><b>กำลังรวบรวมหลักฐาน</b><p class="meta">หลักฐานตามตัวชี้วัดจะแสดงที่นี่เมื่อครูเผยแพร่</p></div>`;
    const cnt = (d) => d.no === "all" ? total : new Set(d.items.flatMap(([c]) => of(c))).size;
    const p = App.DATA.profile || {};
    const last = ev.map((e) => e.date).filter(Boolean).sort().at(-1);
    const who = [p.academicStanding || p.position, p.school].filter(Boolean).map(esc).join(" · ");
    const hero = `<header class="pa-hero">
      <div class="pa-hero-main">
        <span class="pa-eyebrow">Performance Agreement${PA === DEFAULT_PA ? " · ว 9/2564" : ""}</span>
        <h1>หลักฐานตามตัวชี้วัด PA</h1>
        <p class="pa-hero-who">${p.name ? `<b>${esc(p.name)}</b>` : ""}${who ? `<span>${who}</span>` : ""}</p>
        ${p.learningArea || last ? `<p class="pa-hero-sub">${[p.learningArea && esc(p.learningArea), last && `อัปเดตล่าสุด ${esc(thDate(last))}`].filter(Boolean).join(" · ")}</p>` : ""}
      </div>
      <dl class="pa-hero-stats"><div><dt>หลักฐาน</dt><dd>${total}</dd></div><div><dt>ตัวชี้วัด</dt><dd>${codes.length}</dd></div><div><dt>ด้าน</dt><dd>${PA.length}</dd></div></dl>
    </header>`;
    if (!paOpenInit) { paOpenInit = true; if (codes[0]) PA_OPEN.add(codes[0]); } // เปิดข้อแรกไว้ให้เห็นว่ากดได้
    const vis = shownAspects(aspects).flatMap((d) => d.items.map(([c]) => c));
    const allOpen = vis.every((c) => PA_OPEN.has(c));
    return hero + `<div class="pa-bar">${tabs(aspects, cnt)}</div>` +
      (vis.length ? `<div class="pa-tools"><span>แตะตัวชี้วัดเพื่อดูหลักฐาน</span><button class="pa-all" data-act="paAll" aria-pressed="${allOpen}">${allOpen ? "ย่อทั้งหมด" : "ขยายทั้งหมด"}</button></div>` : "") +
      shownAspects(aspects).map((d) => `<section class="pa-aspect" style="--a:${paColor(d.no)}"><header class="pa-aspect-head"><span class="pa-aspect-no">${esc(d.no)}</span><div><span class="pa-eyebrow">ด้านที่ ${esc(d.no)}${d.items.length ? ` · ${d.items.length} ตัวชี้วัด` : ""}</span><h2>${esc(d.title)}</h2></div></header>
        ${d.items.length ? "" : `<div class="pa-aspect-empty"><b>อยู่ระหว่างรวบรวมหลักฐาน</b><span>หลักฐานของด้านนี้จะแสดงที่นี่เมื่อครูเผยแพร่</span></div>`}
        <div class="pa-acc">${d.items.map(([code, name]) => { const it = of(code); const open = PA_OPEN.has(code); return `<article class="pa-ind${open ? " open" : ""}" id="pa-${esc(code)}" data-code="${esc(code)}">
          <button type="button" class="pa-ind-toggle" data-act="paToggle" aria-expanded="${open}" aria-controls="pa-p-${esc(code)}">
            <span class="pa-ind-code">${esc(code)}</span>
            <span class="pa-ind-text"><b>${esc(name)}</b><small>${it.length} ชิ้นงาน</small></span>
            ${evStack(it)}
            <span class="pa-chev" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>
          </button>
          <div class="pa-ind-panel" id="pa-p-${esc(code)}" role="region"><div><div class="ev-grid">${it.map((e, i) => evCard(e, false, i)).join("")}</div></div></div></article>`; }).join("")}</div></section>`).join("") +
      `<p class="pa-foot">${PA === DEFAULT_PA ? "ตัวชี้วัดตามหลักเกณฑ์ ก.ค.ศ. ว 9/2564 สำหรับตำแหน่งครู" : "ตัวชี้วัดตามข้อตกลงในการพัฒนางานของสถานศึกษา"} · แตะตัวชี้วัดเพื่อดูหลักฐาน แตะการ์ดเพื่อดูรายละเอียด</p>`;
  }

  // หน้าครู
  const st = Object.fromEntries(PA_CODES.map((c) => [c, status(c)]));
  const n = (s) => PA_CODES.filter((c) => st[c] === s).length;
  const pct = Math.round(((PA_CODES.length - n("none")) / (PA_CODES.length || 1)) * 100);
  const ST_LABEL = { none: "ยังไม่มีหลักฐาน", private: "มีแต่ยังไม่เผยแพร่", public: "เผยแพร่แล้ว" };
  const cnt = (d) => d.no === "all" ? PA_CODES.length - n("none") + "/" + PA_CODES.length
    : d.items.filter(([c]) => st[c] !== "none").length + "/" + d.items.length;
  return head("PA ข้อตกลงในการพัฒนางาน", `มีหลักฐานแล้ว ${PA_CODES.length - n("none")} จาก ${PA_CODES.length} ตัวชี้วัด`,
      `<a class="btn ghost" href="#/evidence">คลังหลักฐาน</a><a class="btn ghost" href="#/settings">แก้ตัวชี้วัด</a>${addBtn("evidence", "เพิ่มหลักฐาน")}`) +
    `<div class="panel pa-overview"><div class="meter big"><i style="width:${pct}%"></i></div>
      <div class="pa-legend">${["public", "private", "none"].map((s) => `<span class="st st-${s}"><i></i>${ST_LABEL[s]} <b>${n(s)}</b></span>`).join("")}</div>
      ${n("private") ? `<p class="meta">ตัวชี้วัดที่ "มีแต่ยังไม่เผยแพร่" จะไม่แสดงในหน้าสาธารณะ แตะป้าย "ส่วนตัว" ที่หลักฐานเพื่อเผยแพร่</p>` : ""}</div>` +
    tabs(PA, cnt) +
    shownAspects(PA).map((d) => `<section class="panel"><h2><span class="pa-tab-no">${d.no}</span>${esc(d.title)}</h2>
      <div class="stack">${d.items.map(([code, name]) => { const it = of(code); return `<div class="pa-row st-${st[code]}">
        <div class="pa-row-head"><span class="pa-code">${esc(code)}</span><div class="item-body"><b>${esc(name)}</b><span class="st st-${st[code]}"><i></i>${ST_LABEL[st[code]]}${it.length ? ` · ${it.length} ชิ้น` : ""}</span></div>
          <button class="btn ghost small" data-act="paAdd" data-code="${esc(code)}">+ เพิ่ม</button></div>
        ${it.length ? `<div class="ev-grid compact">${it.map((e, i) => evCard(e, true, i)).join("")}</div>` : ""}</div>`; }).join("")}</div></section>`).join("") +
    `<p class="meta">${PA === DEFAULT_PA ? "ตัวชี้วัดตามเกณฑ์ ว 9/2564 สำหรับตำแหน่งครู" : "ตัวชี้วัดที่ครูกำหนดเอง"}</p>`;
};
App.pages.pa = App.pages["admin/pa"];

App.actions.paTab = (b) => {
  const { route, q } = parseHash();
  if (b.dataset.d === "all") delete q.d; else q.d = b.dataset.d;
  const qs = new URLSearchParams(q).toString();
  location.hash = `#/${route}${qs ? "?" + qs : ""}`;
};
App.actions.paAdd = (b) => App.editItem("evidence", null, { pa: b.dataset.code });

// พับ/ขยายตัวชี้วัด (ไม่วาดหน้าใหม่ เพื่อให้แอนิเมชันลื่น)
const paSetOpen = (art, open) => {
  art.classList.toggle("open", open);
  art.querySelector(".pa-ind-toggle").setAttribute("aria-expanded", String(open));
  if (open) PA_OPEN.add(art.dataset.code); else PA_OPEN.delete(art.dataset.code);
};
const paSyncAll = () => {
  const b = $(".pa-all"); if (!b) return;
  const all = [...document.querySelectorAll(".pa-ind")].every((a) => a.classList.contains("open"));
  b.setAttribute("aria-pressed", String(all)); b.textContent = all ? "ย่อทั้งหมด" : "ขยายทั้งหมด";
};
App.actions.paToggle = (b) => { const art = b.closest(".pa-ind"); paSetOpen(art, !art.classList.contains("open")); paSyncAll(); };
App.actions.paAll = (b) => {
  const open = b.getAttribute("aria-pressed") !== "true";
  document.querySelectorAll(".pa-ind").forEach((a) => paSetOpen(a, open));
  paSyncAll();
};

// แผงรายละเอียดหลักฐาน: เลื่อนออกจากขวา (จอใหญ่) / จากล่าง (มือถือ)
const evDrawer = () => {
  let d = document.getElementById("evViewer");
  if (d) return d;
  d = document.createElement("dialog");
  d.id = "evViewer"; d.className = "ev-drawer"; d.setAttribute("aria-labelledby", "evDTitle");
  d.innerHTML = `<div class="ev-d-grip" aria-hidden="true"></div>
    <header class="ev-d-head"><span class="ev-d-kind"></span><h2 id="evDTitle"></h2><button type="button" class="ev-d-close" aria-label="ปิด"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></header>
    <div class="ev-d-main"><div class="ev-d-media"></div><aside class="ev-d-info"></aside></div>`;
  document.body.append(d);
  const close = () => {
    if (!d.open || d.classList.contains("closing")) return;
    d.classList.remove("show"); d.classList.add("closing");
    const done = () => { d.classList.remove("closing"); d.close(); d.querySelector(".ev-d-media").innerHTML = ""; };
    matchMedia("(prefers-reduced-motion: reduce)").matches ? done() : setTimeout(done, 320);
  };
  d.querySelector(".ev-d-close").onclick = close;
  d.addEventListener("click", (e) => { if (e.target === d) close(); });
  d.addEventListener("cancel", (e) => { e.preventDefault(); close(); });
  addEventListener("hashchange", close); // เปลี่ยนหน้า (รวมปุ่มย้อนกลับ) ให้ปิดแผงด้วย
  // ปัดลงเพื่อปิดบนมือถือ
  let y0 = null;
  const grip = d.querySelector(".ev-d-grip"), headEl = d.querySelector(".ev-d-head");
  [grip, headEl].forEach((el) => {
    el.addEventListener("touchstart", (e) => { y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener("touchmove", (e) => { if (y0 === null) return; const dy = Math.max(0, e.touches[0].clientY - y0); d.style.transform = dy ? `translateY(${dy}px)` : ""; }, { passive: true });
    el.addEventListener("touchend", (e) => { const dy = e.changedTouches[0].clientY - (y0 ?? 0); y0 = null; d.style.transform = ""; if (dy > 90) close(); });
  });
  return d;
};
App.actions.evView = (b) => {
  const e = EV_CUR[Number(b.dataset.i)];
  if (!e) return;
  const { m, kindLabel, icon, color } = evLook(e);
  const link = safeUrl(e.link);
  const d = evDrawer();
  d.classList.remove("is-doc");
  d.style.setProperty("--k", color);
  d.querySelector(".ev-d-kind").innerHTML = `${paIcon(icon)}${kindLabel}`;
  d.querySelector("#evDTitle").textContent = e.title || "";
  d.querySelector(".ev-d-media").innerHTML = m.img ? `<img src="${esc(m.img)}" alt="${esc(e.title)}">`
    : m.embed ? `<iframe src="${esc(m.embed)}" title="${esc(e.title || "หลักฐาน")}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen onload="this.classList.add('ok')"></iframe>`
    : `<div class="ev-d-ph">${paIcon(icon)}<span>${link ? "ไฟล์นี้เปิดดูในหน้านี้ไม่ได้ กดปุ่มด้านล่างเพื่อเปิด" : "ไม่มีไฟล์แนบ"}</span></div>`;
  const names = Object.fromEntries(PA.flatMap((x) => x.items));
  const row = (label, val) => val ? `<div class="ev-d-row"><dt>${label}</dt><dd>${val}</dd></div>` : "";
  d.querySelector(".ev-d-info").innerHTML =
    (e.description ? `<p class="ev-d-desc">${esc(e.description)}</p>` : "") +
    `<dl>${row("วันที่", e.date ? esc(thDate(e.date)) : "")}${row("ที่มา", e.source && e.source !== "อื่นๆ" ? esc(e.source) : "")}${row("หัวข้อ SAR", esc(e.sar || ""))}</dl>` +
    ((e.pa || []).length ? `<div class="ev-d-pa"><span class="pa-eyebrow">ใช้เป็นหลักฐานตัวชี้วัด</span>${e.pa.map((c) => `<div class="ev-d-ind" style="--a:${paColorOf(c)}"><b>${esc(c)}</b><span>${esc(names[c] || "")}</span></div>`).join("")}</div>` : "") +
    (link ? `<a class="btn ev-d-btn" href="${esc(link)}" target="_blank" rel="noopener">${m.kind === "link" ? "เปิดลิงก์" : "เปิดในแท็บใหม่"} <span aria-hidden="true">↗</span></a>` : "");
  d.querySelector(".ev-d-main").scrollTop = 0;
  d.classList.remove("closing");
  d.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("show")));
};

// ---------- เปิดเอกสารในหน้าเว็บ (ใช้แผงเดียวกับหลักฐาน PA) ----------
// ลิงก์ที่มี data-doc จะเปิดในแผงนี้แทนแท็บใหม่ ถ้าเปิดในหน้าไม่ได้ (เช่น ลิงก์เว็บทั่วไป) จะเปิดแท็บใหม่ตามปกติ
App.docAttrs = (o) => `data-doc data-title="${esc(o.title || "")}" data-tag="${esc(o.tag || "")}" data-sub="${esc(o.sub || "")}" data-desc="${esc(o.desc || "")}"`;
App.openDoc = ({ link, title = "", tag = "", sub = "", desc = "" }) => {
  const u = safeUrl(link);
  if (!u) return false;
  const m = paMedia(u);
  if (!m.embed && !m.img) return false;
  const [kindLabel, icon, color] = PA_KIND[m.kind];
  const d = evDrawer();
  d.classList.toggle("is-doc", !m.img && m.kind !== "video"); // เอกสาร: ให้พื้นที่อ่านสูงขึ้นบนมือถือ
  d.style.setProperty("--k", color);
  d.querySelector(".ev-d-kind").innerHTML = `${paIcon(icon)}${kindLabel}`;
  d.querySelector("#evDTitle").textContent = title;
  d.querySelector(".ev-d-media").innerHTML = m.img ? `<img src="${esc(m.img)}" alt="${esc(title)}">`
    : `<iframe src="${esc(m.embed)}" title="${esc(title || "เอกสาร")}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen onload="this.classList.add('ok')"></iframe>`;
  d.querySelector(".ev-d-info").innerHTML =
    (desc ? `<p class="ev-d-desc">${esc(desc)}</p>` : "") +
    (tag || sub ? `<dl>${tag ? `<div class="ev-d-row"><dt>ประเภท</dt><dd>${esc(tag)}</dd></div>` : ""}${sub ? `<div class="ev-d-row"><dt>รายละเอียด</dt><dd>${esc(sub)}</dd></div>` : ""}</dl>` : "") +
    `<a class="btn ev-d-btn" href="${esc(u)}" target="_blank" rel="noopener">เปิดในแท็บใหม่ <span aria-hidden="true">↗</span></a>`;
  d.querySelector(".ev-d-main").scrollTop = 0;
  d.classList.remove("closing");
  d.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add("show")));
  return true;
};

// ภาพปกเอกสาร: หน้าแรกของไฟล์ใน Google Drive ถ้าดึงไม่ได้ใช้หน้าปกไล่สีตามประเภท
const DOC_LOOK = { "นวัตกรรม": "#6c4cf1", "วิจัยในชั้นเรียน": "#2f6fde", "สื่อการสอน": "#e08a00", "บทความ": "#0e9aa7", "SAR": "#1f9d61", "PA": "#4f63d2" };
App.docThumb = (u, w = 800) => {
  u = safeUrl(u);
  if (!u) return "";
  const m = paMedia(u);
  if (m.thumb) return m.thumb.replace("sz=w640", `sz=w${w}`);
  const id = (u.match(/docs\.google\.com\/\w+\/d\/([\w-]{20,})/) || [])[1];
  return id ? `https://drive.google.com/thumbnail?id=${id}&sz=w${w}` : "";
};
App.docCover = ({ link, tag = "", title = "", sub = "", desc = "", cls = "" }) => {
  const u = safeUrl(link);
  const m = paMedia(u), [kindLabel, icon] = PA_KIND[m.kind];
  const thumb = App.docThumb(u);
  const cover = `<span class="ev-cover" style="--k:${DOC_LOOK[tag] || "#e8459b"}">${paIcon(m.kind === "none" ? "folder" : icon, "ev-cover-art")}<small>${esc(m.kind === "none" ? "ผลงาน" : kindLabel)}</small><b>${esc(tag || kindLabel)}</b></span>`;
  const inner = cover + (thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : "");
  return u ? `<a class="doc-cover ${cls}" href="${esc(u)}" target="_blank" rel="noopener" ${App.docAttrs({ title, tag, sub, desc })} aria-label="เปิด ${esc(title)}">${inner}</a>`
    : `<span class="doc-cover ${cls}" aria-hidden="true">${inner}</span>`;
};

// หน้า SAR (ตามแบบฟอร์มโรงเรียน ดูตัวอย่าง A4 และพิมพ์) อยู่ใน sar.js
App.actions.print = () => window.print();

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
        <div class="qr-inline">${window.qrSVG ? window.qrSVG(`${site}/`, { size: 150, color: "#16142e" }) : ""}</div>
        <p class="meta">ใช้ติดหน้าแฟ้มหรือสไลด์นำเสนอ สแกนแล้วเปิดแฟ้มผลงาน</p>
        <button class="btn ghost small" data-act="qr" data-url="${esc(site)}/" data-title="แฟ้มผลงาน ${esc(App.DATA.profile?.name || "")}">ขยาย / ดาวน์โหลด QR</button></section>
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

const SET_TABS = ["ทั่วไป", "เมนู", "ตัวเลือกฟอร์ม", "AI ผู้ช่วย", "บัญชี"];
const SET_HINT = {
  "ทั่วไป": "แบนเนอร์และสไลด์โชว์หน้าแรก ชื่อเว็บ และตัวชี้วัด PA",
  "เมนู": "เปลี่ยนชื่อ เปลี่ยนสี หรือซ่อนเมนูที่ไม่ใช้ เมนูที่ซ่อนจะหายจากแถบด้านข้าง ข้อมูลข้างในยังอยู่ครบ",
  "ตัวเลือกฟอร์ม": "เพิ่มหรือแก้รายการให้เลือก เช่น ประเภทงาน ระดับรางวัล ให้ตรงกับโรงเรียน",
  "บัญชี": "รหัสผ่านและการคืนค่าตั้งต้น",
  "AI ผู้ช่วย": "ใส่ API key ของตัวเอง เลือกค่าย AI ได้ (Claude, ChatGPT, Gemini) แล้วใช้ปุ่ม ✨ ในฟอร์มให้ AI อ่านเอกสารและกรอกช่องให้",
};
App.pages["admin/settings"] = ({ q } = {}) => {
  const st = settingsObj();
  const menus = st.menus || {};
  const tab = SET_TABS.includes(q?.tag) ? q.tag : SET_TABS[0];
  const tabs = `<div class="filters" role="tablist">${SET_TABS.map((t) => `<button type="button" role="tab" aria-selected="${t === tab}" data-tag="${esc(t)}" class="${t === tab ? "on" : ""}">${esc(t)}</button>`).join("")}</div>`;

  const menuRow = (r) => {
    const m = menus[r.route] || {};
    const sw = LOCKED_ROUTES.has(r.route)
      ? `<span class="meta">ซ่อนไม่ได้</span>`
      : `<button type="button" class="ios-switch sm" role="switch" aria-checked="${!m.hidden}" aria-label="แสดงเมนู ${esc(r.label)}" data-act="toggleMenu" data-route="${esc(r.route)}"><span></span></button>`;
    return `<div class="set-row"><span class="name"><span class="swatch" style="background:${esc(m.c || r.c)}"></span>${esc(m.label || r.label)}</span>${sw}<button type="button" class="ico" data-act="setMenu" data-route="${esc(r.route)}">ปรับ</button></div>`;
  };
  const menuPanel = (mode) => {
    const rows = menuRows().filter((r) => r.mode === mode);
    const groups = [...new Set(rows.map((r) => r.group))];
    return `<section class="panel"><h2>${MODE_LABEL[mode]} <small class="meta">${rows.length} เมนู</small></h2>${groups.map((g) =>
      `${g ? `<div class="set-group">${esc(g)}</div>` : ""}<div class="set-list">${rows.filter((r) => r.group === g).map(menuRow).join("")}</div>`).join("")}</section>`;
  };

  const optionPanel = ([key, F]) => {
    const fields = F.fields.filter((f) => f.options && f.key !== "vis");
    if (!fields.length) return "";
    return `<section class="panel"><h2>${esc(F.name)}</h2>${fields.map((f) => {
      const custom = !!st.options?.[`${key}.${f.key}`];
      return `<div class="set-opt"><div class="row-head"><b>${esc(f.label)}${custom ? ` <span class="meta">(แก้แล้ว)</span>` : ""}</b><button type="button" class="ico" data-act="setOptions" data-key="${key}" data-field="${f.key}">แก้ไข</button></div>
        <div class="set-tags">${optionsFor(key, f).map((o) => `<span class="tag">${esc(o)}</span>`).join(" ")}</div></div>`;
    }).join("")}</section>`;
  };

  const body = {
    "ทั่วไป": () => `${App.settingsExtras ? App.settingsExtras() : ""}<div class="cols">
      <section class="panel set-card"><h2 class="row-head">ชื่อเว็บ <button class="btn ghost small" data-act="setTitle">แก้ไข</button></h2>
        <p>${esc(st.siteTitle || "") || `<span class="meta">ยังไม่ได้ตั้ง (ใช้ชื่อครูแทน)</span>`}</p>
        <p class="meta">แสดงบนแท็บเบราว์เซอร์และตอนแชร์ลิงก์</p></section>
      <section class="panel set-card"><h2 class="row-head">ตัวชี้วัด PA <button class="btn ghost small" data-act="setPA">แก้ไข</button></h2>
        <p>${PA === DEFAULT_PA ? "ใช้ค่าตั้งต้นตาม ว 9/2564 (15 ตัวชี้วัด)" : `กำหนดเอง ${PA_CODES.length} ตัวชี้วัด`}</p>
        <p class="meta">ถ้าโรงเรียนใช้แบบฟอร์มต่างจากนี้ แก้ให้ตรงได้ หลักฐานที่แท็กรหัสเดิมไว้ยังอยู่</p></section></div>`,
    "เมนู": () => `<div class="cols set-cols">${Object.keys(MODE_LABEL).map(menuPanel).join("")}</div>`,
    "ตัวเลือกฟอร์ม": () => `<div class="grid set-grid">${Object.entries(FORMS).map(optionPanel).join("")}</div>`,
    "AI ผู้ช่วย": () => (App.aiSettings ? App.aiSettings() : ""),
    "บัญชี": () => `<div class="cols">
      <section class="panel set-card"><h2 class="row-head">รหัสผ่าน <button class="btn ghost small" data-act="changePw">เปลี่ยนรหัสผ่าน</button></h2>
        <p class="meta">เปลี่ยนแล้วเครื่องอื่นที่เคยเข้าสู่ระบบไว้จะต้องเข้าใหม่ ถ้าลืมรหัส ให้ตั้งรหัสใหม่ใน Cloudflare แล้ว deploy ใหม่</p></section>
      <section class="panel set-card set-danger"><h2 class="row-head">คืนค่าตั้งต้น <button class="btn ghost danger small" data-act="resetSettings">คืนค่าทั้งหมด</button></h2>
        <p>ล้างการตั้งค่าทั้งหมดในหน้านี้ (ชื่อเว็บ เมนู ตัวเลือก PA) ข้อมูลอื่นไม่หาย</p></section></div>`,
  }[tab]();

  return head("ตั้งค่าเว็บ", "ปรับแบนเนอร์ ชื่อเว็บ เมนู สี ตัวเลือกในฟอร์ม และตัวชี้วัด PA ได้เอง การตั้งค่าบันทึกทันที") +
    tabs + `<p class="meta set-hint">${SET_HINT[tab]}</p>` + body;
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
App.actions.changePw = () => openForm("เปลี่ยนรหัสผ่าน", [
  { key: "current", label: "รหัสผ่านปัจจุบัน", type: "password", required: true, autocomplete: "current-password" },
  { key: "next", label: "รหัสผ่านใหม่", type: "password", required: true, autocomplete: "new-password", hint: "อย่างน้อย 8 ตัวอักษร" },
  { key: "again", label: "พิมพ์รหัสผ่านใหม่อีกครั้ง", type: "password", required: true, autocomplete: "new-password" },
], async (r) => {
  if (r.next !== r.again) throw new Error("รหัสผ่านใหม่ 2 ช่องไม่ตรงกัน");
  await api("POST", "/api/admin/password", { current: r.current, next: r.next });
  setTimeout(() => toast("เปลี่ยนรหัสผ่านแล้ว ครั้งหน้าใช้รหัสใหม่เข้าสู่ระบบ"), 400);
});
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
  App.autoTerm?.(); // ถึงภาคเรียนใหม่แล้ว → เปลี่ยนภาคเรียนปัจจุบันให้เอง
};

$("#logoutBtn")?.addEventListener("click", async () => {
  await api("POST", "/api/logout").catch(() => {});
  App.DATA = null;
  App.showLogin("ออกจากระบบแล้ว");
});

App.boot();
