// AI ผู้ช่วย (หน้าครู): ตั้งค่าค่าย/รุ่น/API key และปุ่ม "✨ อ่านด้วย AI" ในฟอร์ม
// AI ทำงานเฉพาะตอนกดปุ่ม และแค่กรอกช่องให้ดูก่อน ครูตรวจแล้วกดบันทึกเอง
(() => {
  // ฟอร์มที่มีปุ่มอ่านด้วย AI: คำอธิบายสั้น ๆ ว่าให้แนบอะไร และไฟล์ที่ AI อ่านจะใส่ลงช่องแนบไฟล์ไหนให้ด้วย
  // suggest: ปุ่มที่ 2 ให้ AI จัดหมวดจากชื่อ/คำอธิบายที่พิมพ์ไว้ (ไม่ต้องแนบไฟล์)
  const AI_FORMS = {
    certificates: { what: "รูปเกียรติบัตรหรือรางวัล", attach: "image" },
    trainings: { what: "รูปหรือ PDF เกียรติบัตร/วุฒิบัตรการอบรม", attach: "certificate" },
    responsibilities: { what: "รูปหรือ PDF คำสั่ง (อ่านแล้วไม่เก็บไฟล์ ถ้าคำสั่งมีหลายงาน ใช้เมนูคำสั่ง)" }, // ไม่แนบไฟล์คำสั่ง ตามที่ครูต้องการ
    projects: { what: "รูปหรือ PDF เอกสารโครงการ หรือรายงานสรุปโครงการ", attach: "file" },
    supervision: { what: "รูปหรือ PDF แบบบันทึกการนิเทศ", attach: "file" },
    documents: { what: "รูปหรือ PDF หนังสือราชการ / คำสั่ง", attach: "link" },
    meetings: { what: "รูปหรือ PDF รายงานการประชุม", attach: "file" },
    activities: { what: "รูปหรือ PDF เอกสารกิจกรรม / สรุปผลกิจกรรม", attach: "file" },
    works: { what: "รูปหรือ PDF ผลงาน / บทคัดย่องานวิจัย", attach: "link" },
    leaves: { what: "รูปหรือ PDF ใบลา", attach: "file" },
    evidence: { what: "ไฟล์หลักฐาน", attach: "link", suggest: ["pa", "sar", "source"], suggestFrom: ["title", "description"] },
  };
  const AI = (App.ai = { cfg: null, loading: null });
  const A_IMPORT = {};
  AI.load = async (force = false) => {
    if (AI.cfg && !force) return AI.cfg;
    if (!AI.loading || force) AI.loading = api("GET", "/api/admin/ai/config").then((c) => (AI.cfg = c)).finally(() => (AI.loading = null));
    return AI.loading;
  };
  const ready = () => AI.cfg && AI.cfg.hasKey && AI.cfg.enabled && AI.cfg.secretSet;

  // ---------- เตรียมไฟล์: ย่อรูปให้ AI อ่านชัดแต่ไม่ใหญ่ ----------
  const MAX_PDF_MB = 8;
  async function toPart(file) {
    if (file.type === "application/pdf") {
      if (file.size > MAX_PDF_MB * 1024 * 1024) throw new Error(`PDF ใหญ่เกิน ${MAX_PDF_MB} MB`);
      return { mime: file.type, data: await toBase64(file), name: file.name };
    }
    if (!/^image\//.test(file.type)) throw new Error("รองรับเฉพาะรูปและ PDF");
    const img = /^image\/(jpeg|png|webp)$/.test(file.type) ? await shrinkImage(file, 2000) : file;
    return { mime: img.type || "image/jpeg", data: await toBase64(img), name: file.name };
  }

  // ---------- ใส่ค่าลงฟอร์ม (รองรับช่องแบบ iOS ทุกชนิด) ----------
  function setField(form, key, v) {
    const id = `f_${key}`;
    const input = document.getElementById(id);
    if (!input) return false;
    const chips = form.querySelector(`.ios-chips[data-target="${id}"]`);
    if (chips) {
      const want = new Set(String(v).split(/[,\s]+/).filter(Boolean));
      chips.querySelectorAll(".ios-chip").forEach((c) => c.setAttribute("aria-pressed", String(want.has(c.dataset.v))));
      input.value = [...want].join(", ");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return want.size > 0;
    }
    const group = form.querySelector(`.ios-seg[data-target="${id}"], .ios-radios[data-target="${id}"]`);
    if (group) {
      const b = [...group.querySelectorAll("[data-v]")].find((x) => x.dataset.v === String(v));
      if (!b) return false;
      b.click();
      return true;
    }
    input.value = String(v);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  }
  const cellOf = (key) => document.getElementById(`f_${key}`)?.closest(".ios-cell");

  // ช่องที่ส่งให้ AI กรอก (ไม่ส่งช่องไฟล์ การมองเห็น และช่องติ๊ก)
  const specOf = (fields) => fields
    .filter((f) => f.key !== "vis" && !["file", "gallery", "check", "color"].includes(f.type) && !f.toggle)
    .map((f) => f.type === "chips"
      ? { key: f.key, label: f.label, type: "multi", options: (typeof f.groups === "function" ? f.groups() : f.groups || []).flatMap((g) => g.items.map(([c, n]) => `${c}: ${n}`)) }
      : { key: f.key, label: f.label, type: f.type === "date" || f.type === "number" || f.type === "textarea" ? f.type : "text", options: f.options });

  // ---------- ปุ่มในฟอร์ม ----------
  App.aiAttach = async (key, fields, title) => {
    const conf = AI_FORMS[key];
    if (!conf) return;
    const box = $("#sheetFields");
    box.insertAdjacentHTML("afterbegin", `<div class="ai-box" id="aiBox">
      <div class="ai-txt" style="grid-column:1/-1"><b>ให้ AI กรอกช่องให้</b><span>ใช้${esc(conf.what)} แล้วตรวจก่อนกดบันทึก</span></div>
      <div class="ai-btns"><button type="button" class="ai-btn" id="aiBtn" hidden><span class="spark">✨</span> AI กรอกให้</button>
        <button type="button" class="ai-btn ext" id="aiExt">💬 ใช้แอป AI (ฟรี)</button></div>
      ${conf.suggest ? `<div class="ai-sug"><button type="button" class="ai-btn ghost" id="aiSuggest"><span class="spark">✨</span> แนะนำหมวดจากชื่อ</button><div class="ai-txt"><span>พิมพ์ชื่อและคำอธิบายหลักฐานก่อน แล้วให้ AI เลือกตัวชี้วัด PA และหัวข้อ SAR ให้</span></div></div>` : ""}
      <input type="file" id="aiFile" hidden multiple accept="image/*,application/pdf">
      <div class="ai-status" id="aiStatus" role="status"></div></div>`);
    const btn = $("#aiBtn"), input = $("#aiFile"), status = $("#aiStatus"), form = $("#sheetForm");
    const say = (msg, cls = "") => { status.className = `ai-status ${cls}`; status.innerHTML = msg; };
    const fillIn = (r, extra = "") => {
      form.querySelectorAll(".ai-filled, .ai-unsure").forEach((c) => c.classList.remove("ai-filled", "ai-unsure"));
      let n = 0;
      for (const [k, v] of Object.entries(r.values || {})) if (setField(form, k, v)) { n++; cellOf(k)?.classList.add("ai-filled"); }
      for (const k of r.uncertain || []) cellOf(k)?.classList.add("ai-unsure");
      say(n
        ? `กรอกให้ ${n} ช่อง${r.uncertain?.length ? ` · <b>ช่องสีเหลือง AI ไม่แน่ใจ</b> ตรวจอีกครั้ง` : ""}${extra}${r.note ? `<small>${esc(r.note)}</small>` : ""}`
        : `AI อ่านแล้วแต่ไม่พบข้อมูลที่ตรงกับฟอร์ม${r.note ? `<small>${esc(r.note)}</small>` : ""}`, n ? "ok" : "warn");
      return n;
    };
    const profileHint = () => { const p = App.DATA.profile || {}; return [p.name && `ผู้รับเกียรติบัตรคือครู ${p.name}`, p.school && `โรงเรียน ${p.school}`].filter(Boolean).join(" "); };
    // 💬 ใช้แอป AI (ฟรี): ใช้ได้เสมอ ไม่ต้องมี API key
    $("#aiExt").onclick = async () => {
      const text = (conf.suggestFrom || []).map((k) => document.getElementById(`f_${k}`)?.value || "").filter(Boolean).join("\n");
      const r = await App.aiExt.fill({ title, fields: specOf(fields), hint: profileHint(), text, what: conf.what.replace(/\s*\(.*\)$/, "") });
      if (r) fillIn(r, conf.attach ? " · ถ้าต้องการเก็บไฟล์ แนบในช่องไฟล์ด้านล่างเอง" : "");
    };
    try { await AI.load(); } catch { return; } // เซิร์ฟเวอร์ยังไม่รองรับ AI → ใช้ได้แค่แอปภายนอก
    if (ready()) { btn.hidden = false; $("#aiExt").classList.add("ghost"); }
    else $("#aiSuggest")?.closest(".ai-sug")?.remove();
    btn.onclick = () => {
      if (!ready()) { $("#sheet").close(); location.hash = `#/settings?tag=${encodeURIComponent("AI ผู้ช่วย")}`; return; }
      input.click();
    };
    const sug = $("#aiSuggest");
    if (sug) sug.onclick = async () => {
      if (!ready()) return btn.onclick();
      const text = conf.suggestFrom.map((k) => document.getElementById(`f_${k}`)?.value || "").filter(Boolean).join("\n");
      if (!text.trim()) { say("พิมพ์ชื่อหลักฐานก่อน", "warn"); return; }
      sug.disabled = true; sug.classList.add("busy");
      try {
        say("AI กำลังจัดหมวด…");
        const r = await api("POST", "/api/admin/ai/fill", { title, text, fields: specOf(fields.filter((f) => conf.suggest.includes(f.key))) });
        let n = 0;
        for (const [k, v] of Object.entries(r.values || {})) if (setField(form, k, v)) { n++; cellOf(k)?.classList.add("ai-filled"); }
        AI.cfg.used = (AI.cfg.used || 0) + 1;
        say(n ? `เลือกให้ ${n} ช่อง ตรวจแล้วแก้ได้ตามต้องการ${r.note ? `<small>${esc(r.note)}</small>` : ""}` : "AI ไม่แน่ใจว่าควรอยู่หมวดไหน ลองพิมพ์คำอธิบายเพิ่ม", n ? "ok" : "warn");
      } catch (e) { say(esc(e.message), "err"); } finally { sug.disabled = false; sug.classList.remove("busy"); }
    };
    input.onchange = async () => {
      const files = [...input.files].slice(0, 4);
      input.value = "";
      if (!files.length) return;
      const okBtn = form.querySelector("button[value=ok]");
      btn.disabled = true; okBtn.disabled = true; btn.classList.add("busy");
      form.querySelectorAll(".ai-filled, .ai-unsure").forEach((c) => c.classList.remove("ai-filled", "ai-unsure"));
      try {
        say("กำลังเตรียมไฟล์…");
        const parts = await Promise.all(files.map(toPart));
        say(`AI กำลังอ่าน${files.length > 1 ? ` ${files.length} ไฟล์` : ""}… (ประมาณ 5–20 วินาที)`);
        const r = await api("POST", "/api/admin/ai/fill", { title, fields: specOf(fields), files: parts, hint: profileHint() });
        // แนบไฟล์แรกลงช่องไฟล์ของฟอร์มให้ด้วย (ถ้ายังว่างและเชื่อม Drive แล้ว)
        const tgt = conf.attach && document.getElementById(`f_${conf.attach}`);
        const zone = tgt && form.querySelector(`.drop[data-target="f_${conf.attach}"]`);
        const fileIn = zone?.querySelector("input[type=file]");
        const accept = fileIn?.getAttribute("accept") || "";
        const first = files.find((f) => !accept || (accept === "image/*" ? /^image\//.test(f.type) : true));
        let attached = false;
        if (tgt && !tgt.value && fileIn && first && App.drive?.connected !== false) {
          try { const dt = new DataTransfer(); dt.items.add(first); fileIn.files = dt.files; fileIn.dispatchEvent(new Event("change")); attached = true; } catch { /* เบราว์เซอร์เก่า */ }
        }
        AI.cfg.used = (AI.cfg.used || 0) + 1;
        fillIn(r, attached ? " · กำลังแนบไฟล์ลง Drive" : "");
      } catch (e) {
        say(esc(e.message || "อ่านไม่สำเร็จ"), "err");
      } finally {
        btn.disabled = false; btn.classList.remove("busy");
        if (!document.querySelector(".drop.busy")) okBtn.disabled = false;
      }
    };
  };

  // ---------- นำเข้าหลายรายการ (ตารางสอน คำสั่ง) ----------
  const pickFiles = () => new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.multiple = true; inp.accept = "image/*,application/pdf";
    inp.onchange = () => resolve([...inp.files].slice(0, 4));
    inp.click();
  });
  // เลือกไฟล์ → AI อ่าน → คืนแถว (แสดงสถานะด้วย toast)
  async function readRows({ title, fields, hint, max, header, what }) {
    if (AI.extNext) { AI.extNext = false; return App.aiExt.rows({ title, fields, hint, max, header, what }); }
    await AI.load().catch(() => null);
    if (!ready()) { toast("ยังไม่ได้ตั้งค่า AI ไปที่ ตั้งค่าเว็บ → AI ผู้ช่วย"); location.hash = `#/settings?tag=${encodeURIComponent("AI ผู้ช่วย")}`; return null; }
    const files = await pickFiles();
    if (!files.length) return null;
    const busy = document.createElement("div");
    busy.className = "ai-busy";
    busy.innerHTML = `<div><span class="spark">✨</span><b>AI กำลังอ่าน${esc(title)}</b><small>ประมาณ 10–40 วินาที</small></div>`;
    document.body.append(busy);
    try {
      const parts = await Promise.all(files.map(toPart));
      const r = await api("POST", "/api/admin/ai/rows", { title, fields, files: parts, hint, max, header });
      AI.cfg.used = (AI.cfg.used || 0) + 1;
      const hasHeader = r.header && Object.keys(r.header).length;
      if (!r.rows.length && !hasHeader) { toast(`AI ไม่พบรายการ${r.note ? `: ${r.note}` : ""}`); return null; }
      return r;
    } catch (e) { toast(e.message); return null; } finally { busy.remove(); }
  }
  AI.readRows = readRows; // ใช้ในเมนูคำสั่ง (orders.js)
  const me = () => (App.DATA.profile || {}).name || "";

  // ตารางสอน: อ่านจากรูป/PDF แล้วให้ครูเลือกคาบก่อนบันทึก
  A_IMPORT.schedule = async () => {
    const r = await readRows({
      title: "ตารางสอน", max: 60, what: "รูปตารางสอน",
      fields: [
        { key: "day", label: "วัน", options: DAYS }, { key: "period", label: "คาบที่ (นับเฉพาะคาบเรียน ไม่นับพัก)", type: "number" },
        { key: "subject", label: "ชื่อวิชาหรือกิจกรรม เช่น การงานอาชีพ 6, ชุมนุม, ลูกเสือ (ไม่ต้องใส่รหัส)" },
        { key: "code", label: "รหัสวิชา ตามที่เขียนในตาราง เช่น ง16101 หรือ ก1 (ไม่ต้องมีวงเล็บ ถ้าไม่มีใส่ \"\")" },
        { key: "room", label: "ชั้น / ห้องเรียนของนักเรียน เช่น ป.6 หรือ ป.5/1 (ไม่ต้องมีคำว่า ชั้น)" },
        { key: "time", label: "เวลาของคาบนั้นจากหัวตาราง รูปแบบ 08:30–09:20 (ถ้ามี)" },
      ],
      header: [
        { key: "lunchAfter", label: "ถ้าตารางมีคอลัมน์พักกลางวัน/พักเที่ยง คั่นระหว่างคาบ ให้ใส่เลขคาบที่อยู่ก่อนช่องพัก (ไม่มีใส่ null)", type: "number" },
        { key: "lunchTime", label: "เวลาพักกลางวันจากหัวตาราง รูปแบบ 12:00–13:00 (ถ้ามี)" },
      ],
      hint: `${me() ? `ถ้าเป็นตารางสอนรวมของโรงเรียนหรือของหลายครู ให้เอาเฉพาะคาบของครู ${me()} ` : ""}ถ้าเป็นตารางของครูคนเดียวให้เอาทุกคาบที่มีวิชา ไม่ต้องใส่ช่องว่าง ช่องขีด (—) พักกลางวัน โฮมรูม หรือกิจกรรมหน้าเสาธง ไม่ต้องเอาชื่อห้องหรือสถานที่เรียน (เช่น ห้องคอม โรงพลศึกษา) หนึ่งช่องในตาราง = หนึ่งรายการ ถ้าวิชาเดียวกันต่อเนื่องหลายคาบให้แยกเป็นคาบละรายการ`,
    });
    if (!r) return;
    const rows = r.rows.filter((x) => x.day && x.period && (x.subject || x.code)).sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.period - b.period);
    if (!rows.length) return toast("อ่านได้แต่ข้อมูลไม่ครบ (ต้องมีวัน คาบ และวิชา)");
    const s = schedOf();
    const times = {};
    rows.forEach((x) => { if (/^\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}$/.test(x.time || "")) times[x.period] = x.time.replace(/\./g, ":").replace(/\s*[-–]\s*/, "–"); });
    const maxP = Math.max(...rows.map((x) => x.period));
    const H = r.header || {};
    const lunch = Number(H.lunchAfter) > 0 && Number(H.lunchAfter) < maxP ? { after: Number(H.lunchAfter), time: /^\d{1,2}[:.]\d{2}\s*[-–]\s*\d{1,2}[:.]\d{2}$/.test(H.lunchTime || "") ? H.lunchTime.replace(/\./g, ":").replace(/\s*[-–]\s*/, "–") : "" } : null;
    openForm(`ตรวจตารางสอนที่ AI อ่านได้ (${rows.length} คาบ)${VIEW_TERM ? ` · ภาคเรียน ${VIEW_TERM}` : ""}`, [
      { key: "mode", label: "วิธีนำเข้า", options: ["ล้างตารางเดิม แล้วใช้ของใหม่", "เพิ่มลงตารางเดิม (ช่องที่ซ้ำจะถูกแทน)"], value: (s.classes || []).length ? "เพิ่มลงตารางเดิม (ช่องที่ซ้ำจะถูกแทน)" : "ล้างตารางเดิม แล้วใช้ของใหม่" },
      ...(Object.keys(times).length ? [{ key: "times", label: `ใช้เวลาคาบตามรูป (${Object.entries(times).map(([p, t]) => `คาบ ${p} ${t}`).slice(0, 3).join(", ")}…)`, type: "check", value: true }] : []),
      ...(lunch ? [{ key: "lunch", label: `แสดงช่องพักกลางวันหลังคาบ ${lunch.after}${lunch.time ? ` (${lunch.time})` : ""}`, type: "check", value: true }] : []),
      ...rows.map((x, i) => ({ key: `r${i}`, label: `${x.day} คาบ ${x.period} · ${App.classText(x)}${x.code && x.subject ? ` [${x.code}]` : ""}`, type: "check", value: true })),
    ], async (f) => {
      const pick = rows.filter((_, i) => f[`r${i}`]);
      if (!pick.length) throw new Error("ยังไม่ได้เลือกคาบ");
      await saveSched((sc) => {
        if (f.mode.startsWith("ล้าง")) sc.classes = [];
        for (let n = sc.periods.length + 1; n <= maxP; n++) sc.periods.push({ no: n, time: times[n] || "" });
        if (f.times) sc.periods.forEach((p) => { if (times[p.no]) p.time = times[p.no]; });
        if (f.lunch) sc.lunch = lunch;
        for (const x of pick) {
          const v = { subject: x.subject || "", code: x.code || "", room: x.room || "" };
          const hit = sc.classes.find((c) => c.day === x.day && Number(c.period) === x.period);
          if (hit) Object.assign(hit, v); else sc.classes.push({ day: x.day, period: x.period, ...v });
        }
      });
      toast(`นำเข้า ${pick.length} คาบแล้ว`);
    });
    insertNote(r.note);
  };

  function insertNote(note) {
    setTimeout(() => $("#sheetFields")?.insertAdjacentHTML("afterbegin", `<div class="ai-box"><div class="ai-txt" style="grid-column:1/-1"><b>✨ ตรวจก่อนบันทึก</b><span>เอาติ๊กออกจากรายการที่ไม่ใช่ หรือที่ AI อ่านผิด${note ? ` · ${esc(note)}` : ""}</span></div></div>`), 0);
  }

  // ปุ่มบนหน้าเมนู (ใส่หลังวาดหน้า)
  // ✨ = ใช้ API key (แสดงเมื่อตั้งค่าแล้ว) · 💬 = ใช้แอป AI ภายนอก (แสดงเสมอ)
  const PAGE_BTNS = { "admin/schedule": ["schedule", "✨ นำเข้าจากรูป"], "admin/responsibilities": ["orders", "✨ อ่านคำสั่งด้วย AI"], "admin/orders": ["orders", "✨ อ่านคำสั่งด้วย AI"] };
  const prevAfter = App.afterRender;
  App.afterRender = () => {
    prevAfter?.();
    const conf = PAGE_BTNS[parseHash().route];
    const bar = $(".band-actions");
    if (!conf || !bar) return;
    if (!bar.querySelector(".ai-page-btn")) bar.insertAdjacentHTML("afterbegin", `<button class="btn ai-page-btn" data-act="aiImport" data-k="${conf[0]}">${conf[1]}</button>`);
    const main = bar.querySelector(".ai-page-btn:not(.ext)");
    if (!bar.querySelector(".ai-page-btn.ext")) main.insertAdjacentHTML("afterend", `<button class="btn ai-page-btn ext" data-act="aiImport" data-k="${conf[0]}" data-ext="1">💬 ใช้แอป AI (ฟรี)</button>`);
    main.hidden = !ready();
    if (!AI.cfg) AI.load().then(() => { main.hidden = !ready(); }).catch(() => {});
  };

  // ---------- หน้าตั้งค่า → AI ผู้ช่วย ----------
  const PRIV = "ไฟล์ที่ให้ AI อ่านจะถูกส่งไปยังผู้ให้บริการที่เลือก ตามเงื่อนไขของบริการนั้น เว็บนี้ไม่ส่งข้อมูลนักเรียนไปให้ AI เอง จะส่งเฉพาะไฟล์ที่ครูเลือกตอนกดปุ่มเท่านั้น";
  App.aiSettings = () => {
    if (!AI.cfg) {
      AI.load().then(() => render()).catch((e) => { AI.cfg = { error: e.message }; render(); });
      return `<section class="panel"><p class="meta">กำลังโหลดการตั้งค่า AI…</p></section>`;
    }
    const c = AI.cfg;
    if (c.error) return `<section class="panel"><p>โหลดการตั้งค่า AI ไม่สำเร็จ: ${esc(c.error)}</p></section>`;
    const P = c.providers || {};
    const prov = P[c.provider];
    const modelName = prov?.models.find(([m]) => m === c.model)?.[1] || c.model;
    const pct = c.limit ? Math.min(100, Math.round((c.used / c.limit) * 100)) : 0;
    const secretBox = c.secretSet ? "" : `<section class="panel ai-warn"><h2>ต้องตั้งค่าครั้งแรกใน Cloudflare (เจ้าของเว็บทำครั้งเดียว)</h2>
      <ol class="ai-steps">
        <li>เข้า Cloudflare Dashboard → Workers &amp; Pages → เลือกโปรเจกต์เว็บนี้ → Settings → Variables and Secrets</li>
        <li>กด Add → เลือกชนิด <b>Secret</b> → ชื่อ <code>AI_SECRET</code> → ค่าเป็นข้อความสุ่มยาวอย่างน้อย 16 ตัว เช่น <code>${esc(randomSecret())}</code></li>
        <li>กด Save แล้ว deploy ใหม่ (Deployments → Retry deployment) จากนั้นกลับมาหน้านี้</li>
      </ol><p class="meta">AI_SECRET ใช้เข้ารหัส API key ของครูทุกคนก่อนเก็บ ถ้าเปลี่ยนภายหลัง ครูทุกคนต้องใส่ API key ใหม่</p></section>`;
    const status = c.hasKey
      ? `<div class="ai-state ${c.enabled ? "on" : ""}"><b>${c.enabled ? "พร้อมใช้งาน" : "ปิดอยู่"}</b> · ${esc(prov?.name || c.provider)} · ${esc(modelName)}</div>
        <p class="meta">API key: <code>${esc(c.keyHint)}</code></p>`
      : `<div class="ai-state"><b>ยังไม่ได้ใส่ API key</b></div><p class="meta">เลือกค่าย AI แล้วใส่คีย์ของคุณเอง ค่าใช้จ่ายคิดกับบัญชีของคุณโดยตรง</p>`;
    return `${secretBox}<div class="cols">
      <section class="panel set-card"><h2 class="row-head">AI ผู้ช่วยของฉัน <span>
        ${c.hasKey ? `<button class="btn ghost small" data-act="aiTest">ทดสอบ</button>` : ""}
        <button class="btn small" data-act="aiSetup" ${c.secretSet ? "" : "disabled"}>${c.hasKey ? "แก้ไข" : "ตั้งค่า"}</button></span></h2>
        ${status}
        <div class="ai-usage"><div class="row-head"><span>ใช้ไปเดือนนี้</span><b>${c.used || 0}${c.limit ? ` / ${c.limit} ครั้ง` : " ครั้ง (ไม่จำกัด)"}</b></div>
          ${c.limit ? `<div class="meter"><i style="width:${pct}%;--c:${pct > 85 ? "#e5484d" : "#3d4fd8"}"></i></div>` : ""}</div>
        ${c.hasKey ? `<div class="set-row"><span class="name">เปิดใช้ปุ่ม AI</span><button type="button" class="ios-switch sm" role="switch" aria-checked="${c.enabled}" aria-label="เปิดใช้ AI" data-act="aiToggle"><span></span></button>
          <button type="button" class="ico danger" data-act="aiClear">ลบคีย์</button></div>` : ""}
        <p class="meta">${PRIV}</p></section>
      <section class="panel set-card"><h2>วิธีขอ API key</h2>
        ${Object.entries(P).map(([k, p]) => `<div class="ai-prov"><b>${esc(p.name)}</b> <a href="${esc(p.keyUrl)}" target="_blank" rel="noopener">เปิดหน้าสร้างคีย์ ↗</a>
          <span class="meta">${k === "gemini" ? "ล็อกอินด้วยบัญชี Google แล้วกด Create API key มีโควตาใช้ฟรีรายวัน (เงื่อนไขอาจเปลี่ยน)" : "สมัครบัญชี เติมเครดิตขั้นต่ำ แล้วกด Create key คิดเงินตามการใช้งาน"}</span></div>`).join("")}
        <p class="meta">คัดลอกคีย์มาวางในปุ่ม "ตั้งค่า" คีย์จะถูกเข้ารหัสเก็บที่เซิร์ฟเวอร์ หลังบันทึกจะเห็นแค่ตัวย่อ ไม่มีใครดูคีย์เต็มได้อีก</p></section></div>
      <section class="panel ai-free"><h2>💬 ไม่มี API key? ใช้แอป AI ฟรีได้</h2>
        <p>ทุกที่ที่มีปุ่ม ✨ จะมีปุ่ม <b>💬 ใช้แอป AI (ฟรี)</b> คู่กันเสมอ ไม่ต้องตั้งค่าอะไร</p>
        <ol class="ai-steps"><li>กดปุ่ม 💬 แล้วกด <b>คัดลอกคำสั่ง</b></li><li>เปิดแอป ChatGPT, Gemini หรือ Claude (บัญชีฟรีก็ได้) วางคำสั่ง แนบรูปหรือไฟล์ แล้วส่ง</li>
          <li>คัดลอกคำตอบของ AI กลับมาวางในเว็บ แล้วกด <b>✨ กรอกให้</b></li></ol>
        <p class="meta">ไฟล์ส่งจากเครื่องคุณไปที่แอป AI โดยตรง ไม่ผ่านเว็บนี้ และไม่นับรวมในโควตาการใช้ของเว็บ</p></section>
      <section class="panel"><h2>ใช้ AI ได้ที่ไหนบ้าง</h2><div class="ai-where">
        <div><b>เกียรติบัตร / รางวัล</b><span>เพิ่มรายการ → ✨ AI กรอกให้ → เลือกรูปเกียรติบัตร</span></div>
        <div><b>อบรม / PLC</b><span>เพิ่มรายการ → ✨ AI กรอกให้ → เลือกรูปหรือ PDF วุฒิบัตร</span></div>
        <div><b>ตารางสอน</b><span>ปุ่ม ✨ นำเข้าจากรูป → เลือกรูปตารางสอน → ได้ชื่อวิชา รหัส ชั้น และช่องพักเที่ยง → ติ๊กเลือกคาบ</span></div>
        <div><b>คำสั่ง</b><span>ปุ่ม ✨ อ่านคำสั่งด้วย AI → ได้เลขที่ เรื่อง และงานที่มีชื่อคุณ ไม่เก็บไฟล์คำสั่ง</span></div>
        <div><b>โครงการ · นิเทศ · หนังสือราชการ · ประชุม · กิจกรรม · ผลงาน · การลา</b><span>เพิ่มรายการ → ✨ AI กรอกให้</span></div>
        <div><b>หลักฐาน</b><span>✨ แนะนำหมวดจากชื่อ: AI เลือกตัวชี้วัด PA และหัวข้อ SAR ให้</span></div></div></section>`;
  };
  function randomSecret() {
    const a = new Uint8Array(18);
    crypto.getRandomValues(a);
    return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, "x");
  }

  const A = App.actions;
  A.aiImport = (b) => { AI.extNext = !!b.dataset.ext; return (A_IMPORT[b.dataset.k] || App.aiImporters?.[b.dataset.k])?.(); };
  A.aiSetup = () => {
    const c = AI.cfg || {}, P = c.providers || {};
    const names = Object.fromEntries(Object.entries(P).map(([k, p]) => [p.name, k]));
    const curName = P[c.provider]?.name || Object.values(P)[0]?.name;
    const suggest = Object.values(P).map((p) => `${p.name.split(" ")[0]}: ${p.models.map(([m]) => m).join(", ")}`).join("<br>");
    openForm("ตั้งค่า AI ผู้ช่วย", [
      { key: "provider", label: "ค่าย AI", options: Object.keys(names), value: curName, wheel: false },
      { key: "key", label: c.hasKey ? `API key ใหม่ (ตอนนี้ ${c.keyHint})` : "API key", type: "password", required: !c.hasKey,
        placeholder: c.hasKey ? "เว้นว่าง = ใช้คีย์เดิม" : "วางคีย์ที่คัดลอกมา", hint: "ถ้าเปลี่ยนค่าย ต้องใส่คีย์ของค่ายใหม่" },
      { key: "model", label: "รุ่น (เว้นว่าง = ใช้รุ่นแนะนำ)", value: c.model || "", placeholder: "เช่น claude-sonnet-5-5", hint: `รุ่นแนะนำ<br>${suggest}` },
      { key: "limit", label: "เพดานต่อเดือน (ครั้ง, 0 = ไม่จำกัด)", type: "number", min: 0, max: 5000, step: 10, start: 300, value: c.limit ?? 300 },
    ], async (r) => {
      const provider = names[r.provider];
      if (provider !== c.provider && c.hasKey && !r.key) throw new Error("เปลี่ยนค่ายแล้ว กรุณาใส่ API key ของค่ายใหม่");
      // รุ่นเดิมเป็นของค่ายอื่น → ใช้รุ่นแนะนำของค่ายใหม่
      const model = provider !== c.provider && r.model === c.model ? "" : r.model;
      AI.cfg = await api("PUT", "/api/admin/ai/config", { provider, model, key: r.key, limit: r.limit, enabled: true });
    });
  };
  A.aiTest = async (b) => {
    b.disabled = true;
    const old = b.textContent;
    b.textContent = "กำลังทดสอบ…";
    try {
      const r = await api("POST", "/api/admin/ai/test");
      AI.cfg.used = (AI.cfg.used || 0) + 1;
      toast(`เชื่อมต่อสำเร็จ (${r.model}): ${r.reply}`);
      render();
    } catch (e) { toast(e.message); } finally { b.disabled = false; b.textContent = old; }
  };
  A.aiToggle = async (b) => {
    const on = b.getAttribute("aria-checked") !== "true";
    b.setAttribute("aria-checked", String(on));
    try { AI.cfg = await api("PUT", "/api/admin/ai/config", { provider: AI.cfg.provider, model: AI.cfg.model, enabled: on }); render(); }
    catch (e) { b.setAttribute("aria-checked", String(!on)); toast(e.message); }
  };
  A.aiClear = async () => {
    if (!confirm("ลบ API key ออกจากเว็บนี้? (ปุ่ม AI จะใช้ไม่ได้จนกว่าจะใส่ใหม่)")) return;
    try { AI.cfg = await api("PUT", "/api/admin/ai/config", { provider: AI.cfg.provider, model: AI.cfg.model, clearKey: true }); render(); toast("ลบคีย์แล้ว"); }
    catch (e) { toast(e.message); }
  };
})();
