// เมนูคำสั่ง: คำสั่ง 1 ฉบับ → งานที่ได้รับมอบหมายหลายงาน (เก็บใน responsibilities ผูกด้วย orderId)
// ไม่เก็บไฟล์คำสั่ง: ครูให้ AI อ่านไฟล์ เอาข้อมูลมากรอก แล้วทิ้งไฟล์
(() => {
  const STATUS = ["ยังไม่ทำ", "กำลังทำ", "เสร็จ"];
  const ALL_YEAR = "ทั้งปี";
  const allYearType = (t) => t === "เวร" || t === "งานที่ปรึกษา";
  const statusOf = (d) => (d.status === ALL_YEAR || (!d.status && allYearType(d.type)) ? ALL_YEAR : STATUS.includes(d.status) ? d.status : "ยังไม่ทำ");
  const dutiesOf = (o) => arr("responsibilities").filter((d) => String(d.orderId) === String(o.id));
  // เลขที่คำสั่งในงานเดิม เช่น "คำสั่งที่ 45/2569", "คำสั่ง ๑๒/๒๕๖๙"
  const ORDER_NO = /คำสั่ง[^0-9๐-๙]{0,20}?([0-9๐-๙]{1,4})\s*\/\s*([0-9๐-๙]{4})/;
  const arabic = (s) => String(s).replace(/[๐-๙]/g, (c) => "๐๑๒๓๔๕๖๗๘๙".indexOf(c));
  const normNo = (s) => arabic(s).replace(/\s+/g, "");
  const legacyNo = (d) => { const m = `${d.detail || ""} ${d.title || ""}`.match(ORDER_NO); return m ? `${arabic(m[1])}/${arabic(m[2])}` : ""; };

  App.pages["admin/orders"] = ({ q }) => {
    const all = [...arr("orders")].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")) || b.id - a.id);
    const years = [...new Set(all.map((o) => o.year).filter(Boolean))].sort().reverse();
    const cur = q.year || (years.includes(String(BE_NOW)) ? String(BE_NOW) : "ทั้งหมด");
    const shown = cur === "ทั้งหมด" ? all : all.filter((o) => o.year === cur);
    const duties = shown.flatMap(dutiesOf);
    const tracked = duties.filter((d) => statusOf(d) !== ALL_YEAR);
    const done = tracked.filter((d) => statusOf(d) === "เสร็จ").length;
    const late = tracked.filter((d) => statusOf(d) !== "เสร็จ" && d.due && daysUntil(d.due) < 0).length;

    // งานเดิมที่มีเลขที่คำสั่งแต่ยังไม่ผูกกับคำสั่ง
    const legacy = arr("responsibilities").filter((d) => !d.orderId && legacyNo(d));
    const legacyOrders = new Set(legacy.map(legacyNo)).size;
    const migrate = legacy.length ? `<div class="notice order-migrate"><span>พบงานเดิม ${legacy.length} งาน ที่ระบุเลขที่คำสั่งไว้ (${legacyOrders} คำสั่ง)</span>
      <button class="btn small" data-act="orderMigrate">จัดกลุ่มเข้าเมนูคำสั่ง</button></div>` : "";

    const aiBtn = `<button class="btn ai-page-btn" data-act="aiImport" data-k="orders">✨ อ่านคำสั่งด้วย AI</button>`;
    return head("คำสั่ง", "คำสั่งแต่งตั้งที่ได้รับ และงานที่ต้องทำในแต่ละคำสั่ง ไม่เก็บไฟล์คำสั่ง (ให้ AI อ่านแล้วทิ้ง)", aiBtn + addBtn("orders", "เพิ่มคำสั่ง")) +
      migrate +
      `<div class="stats">
        <div class="stat" style="--sc:${C.coral}"><b>${shown.length}</b><span>คำสั่ง</span></div>
        <div class="stat" style="--sc:${C.indigo}"><b>${duties.length}</b><span>งานที่ได้รับมอบหมาย</span></div>
        <div class="stat" style="--sc:${C.mint}"><b>${done}/${tracked.length}</b><span>งานที่เสร็จแล้ว</span></div>
        <div class="stat" style="--sc:${late ? "#e5484d" : C.gold}"><b>${tracked.length - done}</b><span>ยังค้าง${late ? ` (เลยกำหนด ${late})` : ""}</span></div>
      </div>` +
      (years.length > 1 ? filterBar(years, cur, "year") : "") +
      (shown.length ? `<div class="orders">${shown.map(card).join("")}</div>`
        : empty(all.length ? "ไม่มีคำสั่งในปีนี้" : "ยังไม่มีคำสั่ง กด \"✨ อ่านคำสั่งด้วย AI\" แล้วเลือกรูปหรือ PDF คำสั่ง AI จะกรอกเลขที่ เรื่อง และงานที่มีชื่อคุณให้"));
  };

  function card(o) {
    const ds = dutiesOf(o);
    const tracked = ds.filter((d) => statusOf(d) !== ALL_YEAR);
    const done = tracked.filter((d) => statusOf(d) === "เสร็จ").length;
    const prog = !ds.length ? `<span class="order-prog none">ยังไม่มีงาน</span>`
      : !tracked.length ? `<span class="order-prog year">ทั้งปี</span>`
      : `<span class="order-prog ${done === tracked.length ? "ok" : "wait"}">${done}/${tracked.length} เสร็จ</span>`;
    const meta = [o.date && `ลว. ${thDate(o.date)}`, o.from, o.year && `ปีการศึกษา ${o.year}`].filter(Boolean).map(esc).join(" · ");
    return `<section class="panel order-card">
      <div class="order-top"><div><b class="order-no">คำสั่งที่ ${esc(o.no || "-")}</b> <span class="order-title">${esc(o.title || "")}</span>
        <div class="meta">${meta}</div></div>${prog}</div>
      ${ds.length ? `<ul class="duty-list">${ds.map(duty).join("")}</ul>` : ""}
      ${o.note ? `<p class="meta order-note">${esc(o.note)}</p>` : ""}
      <div class="order-foot"><button class="btn ghost small" data-act="orderAddDuty" data-id="${o.id}">+ เพิ่มงานในคำสั่งนี้</button>${tools("orders", o)}</div>
    </section>`;
  }
  function duty(d) {
    const st = statusOf(d);
    const cls = { "ยังไม่ทำ": "todo", "กำลังทำ": "doing", "เสร็จ": "done", [ALL_YEAR]: "year" }[st];
    const late = st !== "เสร็จ" && st !== ALL_YEAR && d.due && daysUntil(d.due) < 0;
    const due = d.due && st !== ALL_YEAR ? `<span class="meta ${late ? "late" : ""}">${late ? "เลยกำหนด " : "ภายใน "}${thDate(d.due)}</span>` : "";
    const role = String(d.detail || "").match(/\(([^)]+)\)\s*$/)?.[1];
    return `<li class="duty">
      <button class="duty-st ${cls}" ${st === ALL_YEAR ? "disabled" : `data-act="dutyStatus" data-id="${d.id}" title="แตะเพื่อเปลี่ยนสถานะ"`}>${st}</button>
      <span class="duty-t">${esc(d.title)}${role ? ` <small>${esc(role)}</small>` : ""}</span>${due}
      <span class="duty-tools"><button class="ico" data-act="edit" data-key="responsibilities" data-id="${d.id}">แก้ไข</button></span></li>`;
  }

  const A = App.actions;
  // แตะสถานะ: ยังไม่ทำ → กำลังทำ → เสร็จ → ยังไม่ทำ
  A.dutyStatus = async (b) => {
    const d = findItem("responsibilities", b.dataset.id);
    if (!d) return;
    const next = STATUS[(STATUS.indexOf(statusOf(d)) + 1) % STATUS.length];
    const { id, ...old } = d;
    b.disabled = true;
    try { Object.assign(d, await api("PUT", `/api/admin/item/${id}`, { ...old, status: next })); render(); }
    catch (e) { toast(e.message); b.disabled = false; }
  };
  A.orderAddDuty = (b) => {
    const o = findItem("orders", b.dataset.id);
    if (!o) return;
    App.editItem("responsibilities", null, { type: "คำสั่ง", year: o.year || String(BE_NOW), detail: `คำสั่งที่ ${o.no}`, status: "ยังไม่ทำ", _extra: { orderId: o.id } });
  };
  // งานเดิมที่เขียนเลขที่คำสั่งไว้ → สร้างคำสั่งตามเลขที่ แล้วผูกงานเข้าไป
  A.orderMigrate = async (b) => {
    const legacy = arr("responsibilities").filter((d) => !d.orderId && legacyNo(d));
    const groups = {};
    for (const d of legacy) (groups[legacyNo(d)] = groups[legacyNo(d)] || []).push(d);
    if (!confirm(`สร้างคำสั่ง ${Object.keys(groups).length} ฉบับ จากงานเดิม ${legacy.length} งาน ใช่ไหม? (งานเดิมไม่หาย แค่ผูกเข้ากับคำสั่ง แก้เรื่องของคำสั่งได้ภายหลัง)`)) return;
    b.disabled = true;
    try {
      for (const [no, ds] of Object.entries(groups)) {
        let o = arr("orders").find((x) => normNo(x.no) === no);
        if (!o) {
          o = await api("POST", "/api/admin/items/orders", { no, title: ds.length === 1 ? ds[0].title : `(ยังไม่ระบุเรื่อง) ${ds.length} งาน`, year: ds[0].year || String(BE_NOW), vis: "private" });
          arr("orders").unshift(o);
        }
        for (const d of ds) { const { id, ...old } = d; Object.assign(d, await api("PUT", `/api/admin/item/${id}`, { ...old, orderId: o.id })); }
      }
      toast("จัดกลุ่มแล้ว");
    } catch (e) { toast(e.message); }
    render();
  };

  // ✨ อ่านคำสั่งด้วย AI: ได้หัวคำสั่ง + งานที่มีชื่อครู → ให้ตรวจ → บันทึก (ไม่เก็บไฟล์)
  (App.aiImporters = App.aiImporters || {}).orders = async () => {
    const me = (App.DATA.profile || {}).name || "";
    const types = FORMS.responsibilities.fields.find((x) => x.key === "type").options;
    const r = await App.ai.readRows({
      title: "คำสั่งโรงเรียน", max: 30,
      header: [
        { key: "no", label: "เลขที่คำสั่ง ใช้เลขอารบิก เช่น 45/2569" }, { key: "date", label: "ลงวันที่ (วันที่ออกคำสั่ง)", type: "date" },
        { key: "title", label: "เรื่อง ไม่ต้องมีคำว่า คำสั่ง… เรื่อง นำหน้า เช่น แต่งตั้งคณะกรรมการดำเนินงานวันเด็กแห่งชาติ ประจำปี 2570" },
        { key: "from", label: "หน่วยงานที่ออกคำสั่ง เช่น โรงเรียนบ้านไร่" }, { key: "year", label: "ปีการศึกษาที่เกี่ยวข้อง (พ.ศ.)", options: YEARS },
      ],
      fields: [
        { key: "title", label: "ชื่องาน/คณะกรรมการ/ฝ่ายที่ได้รับมอบหมาย เช่น คณะกรรมการฝ่ายจัดสถานที่" },
        { key: "role", label: "ตำแหน่งในคณะ เช่น ประธาน กรรมการ กรรมการและเลขานุการ" },
        { key: "type", label: "ประเภท (เวร = เวรประจำวัน, งานที่ปรึกษา = ครูประจำชั้น/ที่ปรึกษา)", options: types },
        { key: "due", label: "วันจัดงานหรือกำหนดเสร็จ ถ้ามีในคำสั่ง", type: "date" },
      ],
      hint: `${me ? `เอาเฉพาะงานที่มีชื่อ ${me} (หรือชื่อใกล้เคียง) ` : ""}ถ้าคำสั่งมีหลายคณะกรรมการ ให้แยกเป็นคณะละรายการ คณะเดียวกันไม่ต้องซ้ำ`,
    });
    if (!r) return;
    const H = r.header || {};
    const rows = r.rows.filter((x) => x.title);
    const exists = H.no && arr("orders").find((o) => normNo(o.no) === normNo(H.no));
    openForm("ตรวจข้อมูลคำสั่ง", [
      { key: "no", label: "เลขที่คำสั่ง", value: H.no || "", required: true, hint: exists ? "มีคำสั่งเลขนี้อยู่แล้ว งานที่เลือกจะเพิ่มเข้าคำสั่งเดิม" : "" },
      { key: "date", label: "ลงวันที่", type: "date", value: H.date || "" },
      { key: "title", label: "เรื่อง", value: H.title || "", required: true },
      { key: "from", label: "ผู้ออกคำสั่ง", value: H.from || "" },
      { ...yearField, value: H.year || String(BE_NOW) },
      ...rows.map((x, i) => ({ key: `r${i}`, type: "check", value: true,
        label: `${x.title}${x.role ? ` (${x.role})` : ""}${allYearType(x.type) ? " · ทั้งปี" : x.due ? ` · ${thDate(x.due)}` : ""}` })),
    ], async (f) => {
      const pick = rows.filter((_, i) => f[`r${i}`]);
      let o = arr("orders").find((x) => normNo(x.no) === normNo(f.no));
      if (!o) {
        o = await api("POST", "/api/admin/items/orders", { no: f.no.trim(), date: f.date, title: f.title, from: f.from, year: f.year, vis: "private" });
        arr("orders").unshift(o);
      }
      for (const x of pick) {
        const body = { title: x.title, type: x.type || "คำสั่ง", year: f.year, detail: `คำสั่งที่ ${o.no}${x.role ? ` (${x.role})` : ""}`,
          status: allYearType(x.type) ? ALL_YEAR : "ยังไม่ทำ", due: allYearType(x.type) ? "" : x.due || "", orderId: o.id, vis: "private" };
        arr("responsibilities").unshift(await api("POST", "/api/admin/items/responsibilities", body));
      }
      toast(`บันทึกคำสั่งที่ ${o.no}${pick.length ? ` และ ${pick.length} งาน` : ""} แล้ว`);
      if (parseHash().route !== "admin/orders") location.hash = "#/orders";
    });
    setTimeout(() => $("#sheetFields")?.insertAdjacentHTML("afterbegin", `<div class="ai-box"><div class="ai-txt" style="grid-column:1/-1"><b>✨ ตรวจก่อนบันทึก</b><span>ไฟล์คำสั่งไม่ถูกเก็บไว้ ${rows.length ? "เอาติ๊กออกจากงานที่ไม่ใช่ของคุณ" : "AI ไม่พบงานที่มีชื่อคุณ บันทึกเฉพาะคำสั่งได้"}${r.note ? ` · ${esc(r.note)}` : ""}</span></div></div>`), 0);
  };
})();
