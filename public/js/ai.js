// AI ผู้ช่วย (หน้าครู): ตั้งค่าค่าย/รุ่น/API key และปุ่ม "✨ อ่านด้วย AI" ในฟอร์ม
// AI ทำงานเฉพาะตอนกดปุ่ม และแค่กรอกช่องให้ดูก่อน ครูตรวจแล้วกดบันทึกเอง
(() => {
  // ฟอร์มที่มีปุ่มอ่านด้วย AI: คำอธิบายสั้น ๆ ว่าให้แนบอะไร และไฟล์ที่ AI อ่านจะใส่ลงช่องแนบไฟล์ไหนให้ด้วย
  const AI_FORMS = {
    certificates: { what: "รูปเกียรติบัตรหรือรางวัล", attach: "image" },
    trainings: { what: "รูปหรือ PDF เกียรติบัตร/วุฒิบัตรการอบรม", attach: "certificate" },
  };
  const AI = (App.ai = { cfg: null, loading: null });
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
    .filter((f) => f.key !== "vis" && !["file", "gallery", "check", "chips", "color"].includes(f.type) && !f.toggle)
    .map((f) => ({ key: f.key, label: f.label, type: f.type === "date" || f.type === "number" || f.type === "textarea" ? f.type : "text", options: f.options }));

  // ---------- ปุ่มในฟอร์ม ----------
  App.aiAttach = async (key, fields, title) => {
    const conf = AI_FORMS[key];
    if (!conf) return;
    const box = $("#sheetFields");
    box.insertAdjacentHTML("afterbegin", `<div class="ai-box" id="aiBox">
      <button type="button" class="ai-btn" id="aiBtn"><span class="spark">✨</span> อ่านด้วย AI</button>
      <div class="ai-txt"><b>ให้ AI กรอกช่องให้</b><span>เลือก${esc(conf.what)} (ได้สูงสุด 4 ไฟล์) แล้วตรวจก่อนกดบันทึก</span></div>
      <input type="file" id="aiFile" hidden multiple accept="image/*,application/pdf">
      <div class="ai-status" id="aiStatus" role="status"></div></div>`);
    const btn = $("#aiBtn"), input = $("#aiFile"), status = $("#aiStatus"), form = $("#sheetForm");
    const say = (msg, cls = "") => { status.className = `ai-status ${cls}`; status.innerHTML = msg; };
    try { await AI.load(); } catch { $("#aiBox")?.remove(); return; } // เซิร์ฟเวอร์ยังไม่รองรับ AI
    if (!ready()) {
      btn.classList.add("off");
      say(!AI.cfg.secretSet ? "เจ้าของเว็บยังไม่ได้เปิดใช้ AI (ต้องตั้ง AI_SECRET ใน Cloudflare)" : !AI.cfg.hasKey ? "ยังไม่ได้ใส่ API key แตะปุ่มเพื่อไปตั้งค่า" : "ปิดการใช้ AI อยู่ แตะปุ่มเพื่อไปเปิด", "warn");
    }
    btn.onclick = () => {
      if (!ready()) { $("#sheet").close(); location.hash = `#/settings?tag=${encodeURIComponent("AI ผู้ช่วย")}`; return; }
      input.click();
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
        const p = App.DATA.profile || {};
        const r = await api("POST", "/api/admin/ai/fill", {
          title, fields: specOf(fields), files: parts,
          hint: [p.name && `ผู้รับเกียรติบัตรคือครู ${p.name}`, p.school && `โรงเรียน ${p.school}`].filter(Boolean).join(" "),
        });
        let n = 0;
        for (const [k, v] of Object.entries(r.values || {})) if (setField(form, k, v)) { n++; cellOf(k)?.classList.add("ai-filled"); }
        for (const k of r.uncertain || []) cellOf(k)?.classList.add("ai-unsure");
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
        say(n
          ? `กรอกให้ ${n} ช่อง${r.uncertain?.length ? ` · <b>ช่องสีเหลือง AI ไม่แน่ใจ</b> ตรวจอีกครั้ง` : ""}${attached ? " · กำลังแนบไฟล์ลง Drive" : ""}${r.note ? `<small>${esc(r.note)}</small>` : ""}`
          : `AI อ่านแล้วแต่ไม่พบข้อมูลที่ตรงกับฟอร์ม${r.note ? `<small>${esc(r.note)}</small>` : ""}`, n ? "ok" : "warn");
      } catch (e) {
        say(esc(e.message || "อ่านไม่สำเร็จ"), "err");
      } finally {
        btn.disabled = false; btn.classList.remove("busy");
        if (!document.querySelector(".drop.busy")) okBtn.disabled = false;
      }
    };
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
      <section class="panel"><h2>ใช้ AI ได้ที่ไหนบ้าง</h2><div class="ai-where">
        <div><b>เกียรติบัตร / รางวัล</b><span>เพิ่มรายการ → ✨ อ่านด้วย AI → เลือกรูปเกียรติบัตร</span></div>
        <div><b>อบรม / PLC</b><span>เพิ่มรายการ → ✨ อ่านด้วย AI → เลือกรูปหรือ PDF วุฒิบัตร</span></div>
        <div class="soon"><b>เร็ว ๆ นี้</b><span>คำสั่งโรงเรียน โครงการ นิเทศ ตารางสอน แนะนำหมวดหลักฐาน คำบรรยายอัลบั้ม</span></div></div></section>`;
  };
  function randomSecret() {
    const a = new Uint8Array(18);
    crypto.getRandomValues(a);
    return btoa(String.fromCharCode(...a)).replace(/[+/=]/g, "x");
  }

  const A = App.actions;
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
