// จัดการรายชื่อนักเรียน: แท็บ "เช็กชื่อ | จัดการรายชื่อ", แก้ไข ลบ ลบหลายคน
// เลขที่ของนักเรียนผูกกับการเช็กชื่อ (attendance) และคะแนน (grades.scores)
// เปลี่ยนเลขที่ = ย้ายข้อมูลตาม, ลบนักเรียน = ล้างข้อมูลของคนนั้นด้วย

const commonRoom = () => {
  const n = {};
  for (const s of arr("students")) if (s.room) n[s.room] = (n[s.room] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
};
const nextNo = () => arr("students").reduce((m, s) => Math.max(m, Number(s.no) || 0), 0) + 1;

// ย้าย/ล้างข้อมูลที่ผูกกับเลขที่
const moveStudentData = async (from, to) => {
  const att = (App.DATA.attendance = App.DATA.attendance || {});
  const g = App.DATA.grades;
  if (att[from] !== undefined) { if (to !== null) att[to] = att[from]; delete att[from]; }
  if (g?.scores?.[from] !== undefined) { if (to !== null) g.scores[to] = g.scores[from]; delete g.scores[from]; }
  await Promise.all([saveKV("attendance"), g ? saveKV("grades") : null]);
};

FORMS.students.fields = [
  { key: "no", label: "เลขที่", type: "number", min: 1, max: 60, required: true },
  { key: "name", label: "ชื่อ-นามสกุล", required: true, hint: "เช่น เด็กชายสมชาย ใจดี" },
  { key: "room", label: "ห้อง", hint: "เช่น ป.6" },
  { key: "code", label: "เลขประจำตัวนักเรียน" },
];
FORMS.students.map = async (rec, item) => {
  const no = Number(rec.no);
  if (arr("students").some((s) => s !== item && Number(s.no) === no)) throw new Error(`เลขที่ ${no} มีนักเรียนแล้ว`);
  const body = { ...rec, no, name: String(rec.name).replace(/\s+/g, " ").trim() };
  if (item && Number(item.no) !== no) await moveStudentData(String(item.no), String(no));
  return body;
};
// เพิ่มนักเรียน: เติมเลขที่ถัดไปและห้องที่ใช้บ่อยให้
App.adders.students = () => App.editItem("students", null, { no: nextNo(), room: commonRoom() });

const deleteStudents = async (list) => {
  for (const s of list) {
    await api("DELETE", `/api/admin/item/${s.id}`);
    App.DATA.students = arr("students").filter((x) => x !== s);
    const att = App.DATA.attendance || {};
    delete att[s.no];
    if (App.DATA.grades?.scores) delete App.DATA.grades.scores[s.no];
  }
  await Promise.all([saveKV("attendance"), App.DATA.grades ? saveKV("grades") : null]);
};

const baseDel = App.actions.del;
App.actions.del = async (b) => {
  if (b.dataset.key !== "students") return baseDel(b);
  const s = findItem("students", b.dataset.id);
  if (!s || !confirm(`ลบ "${s.name}" ใช่ไหม?\nการเช็กชื่อและคะแนนของคนนี้จะถูกลบด้วย กู้คืนไม่ได้`)) return;
  try { await deleteStudents([s]); toast("ลบแล้ว"); } catch (e) { toast(e.message); }
  render();
};

App.studentTabs = (cur) => `<div class="filters stu-tabs">
  <button class="${cur === "check" ? "on" : ""}" data-act="stuView" data-v="">เช็กชื่อ</button>
  <button class="${cur === "list" ? "on" : ""}" data-act="stuView" data-v="list">จัดการรายชื่อ (${arr("students").length})</button></div>`;
App.actions.stuView = (b) => { location.hash = b.dataset.v ? "#/attendance?view=list" : "#/attendance"; };

App.studentManage = () => {
  const studs = studentsSorted();
  const boys = studs.filter((s) => /^(เด็กชาย|ด\.ช\.|นาย)/.test(s.name)).length;
  const girls = studs.filter((s) => /^(เด็กหญิง|ด\.ญ\.|นางสาว)/.test(s.name)).length;
  return head("รายชื่อและเช็กชื่อ", `${studs.length} คน${boys || girls ? ` · ชาย ${boys} หญิง ${girls}` : ""}`,
    `<button class="btn" data-add="students">+ เพิ่มนักเรียน</button><button class="btn ghost" data-act="importXlsx">นำเข้าจาก Excel</button>`) +
    App.studentTabs("list") +
    `<p class="private-note">ข้อมูลนักเรียนเป็นข้อมูลส่วนบุคคล (PDPA) ระบบเก็บแบบส่วนตัวเสมอ ไม่แสดงในหน้าสาธารณะ</p>` +
    (studs.length ? `
    <div class="stu-bar"><label class="stu-check"><input type="checkbox" data-stu-all> เลือกทั้งหมด</label>
      <button class="btn ghost danger" data-act="stuDelSel" disabled>ลบที่เลือก</button></div>
    <ul class="stu-list">${studs.map((s) => `
      <li><label class="stu-check"><input type="checkbox" data-stu="${esc(s.id)}" aria-label="เลือก ${esc(s.name)}"></label>
        <span class="stu-no">${esc(s.no)}</span>
        <button class="stu-main" data-act="edit" data-key="students" data-id="${esc(s.id)}">
          <b>${esc(s.name)}</b><small>${[s.room, s.code ? `เลขประจำตัว ${s.code}` : ""].filter(Boolean).map(esc).join(" · ") || "แตะเพื่อแก้ไข"}</small></button>
        <span class="stu-acts"><button class="ico" data-act="edit" data-key="students" data-id="${esc(s.id)}">แก้ไข</button><button class="ico del" data-act="del" data-key="students" data-id="${esc(s.id)}">ลบ</button></span>
      </li>`).join("")}</ul>` : empty("ยังไม่มีรายชื่อ กด \"+ เพิ่มนักเรียน\" หรือ \"นำเข้าจาก Excel\""));
};

// ช่องเลือกหลายคน
document.addEventListener("change", (e) => {
  const t = e.target;
  if (!t.matches?.("[data-stu], [data-stu-all]")) return;
  if (t.matches("[data-stu-all]")) document.querySelectorAll("[data-stu]").forEach((c) => (c.checked = t.checked));
  const n = document.querySelectorAll("[data-stu]:checked").length;
  const btn = document.querySelector('[data-act="stuDelSel"]');
  if (btn) { btn.disabled = !n; btn.textContent = n ? `ลบที่เลือก (${n})` : "ลบที่เลือก"; }
  const all = document.querySelector("[data-stu-all]");
  if (all && !t.matches("[data-stu-all]")) all.checked = n === document.querySelectorAll("[data-stu]").length;
});
App.actions.stuDelSel = async () => {
  const ids = [...document.querySelectorAll("[data-stu]:checked")].map((c) => c.dataset.stu);
  const list = ids.map((id) => findItem("students", id)).filter(Boolean);
  if (!list.length || !confirm(`ลบนักเรียน ${list.length} คนใช่ไหม?\nการเช็กชื่อและคะแนนของคนเหล่านี้จะถูกลบด้วย กู้คืนไม่ได้`)) return;
  try { await deleteStudents(list); toast(`ลบ ${list.length} คนแล้ว`); } catch (e) { toast(e.message); }
  render();
};
