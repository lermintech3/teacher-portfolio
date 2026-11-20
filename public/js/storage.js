// ---------- ที่เก็บไฟล์: ครูแต่ละคนเพิ่ม Google Drive ของตัวเองได้หลายที่ เลือกที่หลัก และย้ายไฟล์ข้ามที่ได้ ----------
// หน้าครูเท่านั้น ใช้ร่วมกับ admin.js (driveUsage, fmtSize, wirePageDrop)
(() => {
  const STORE = { loc: null, usage: {}, mig: null };
  const locs = () => App.drive?.locations || [];
  const primary = () => locs().find((l) => l.primary);
  const locName = (id) => locs().find((l) => l.id === id)?.name || "";
  const pctOf = (u) => (u && u.used > 0 && u.limit > 0 && u.limit < 1e15 ? Math.min(100, (u.used / u.limit) * 100) : null);

  const SCRIPT_GUIDE = `<details class="st-guide"><summary>วิธีสร้างที่เก็บใน Google Drive ของตัวเอง (ทำครั้งเดียว ประมาณ 10 นาที)</summary>
    <ol class="steps">
      <li>เปิด <a href="https://script.google.com/home/projects/create" target="_blank" rel="noopener">script.google.com → โครงการใหม่</a> ด้วยบัญชี Google ที่จะเก็บไฟล์</li>
      <li>เปิด <a href="https://github.com/lermintech3/teacher-portfolio/blob/main/google-apps-script/Code.gs" target="_blank" rel="noopener">Code.gs ล่าสุด</a> กดปุ่มคัดลอก (Copy raw file) แล้ววางแทนโค้ดเดิมทั้งหมด → บันทึก 💾 → ตั้งชื่อโครงการ เช่น "แฟ้มผลงานครู - Drive"</li>
      <li>⚙️ การตั้งค่าโครงการ → พร็อพเพอร์ตี้ของสคริปต์ → เพิ่ม <code>SECRET</code> = รหัสลับที่คิดเอง (อย่างน้อย 8 ตัว จดไว้ใช้ข้อ 5)</li>
      <li>การทำให้ใช้งานได้ → <b>การทำให้ใช้งานได้รายการใหม่</b> → ประเภท <b>เว็บแอป</b> · ดำเนินการในฐานะ <b>ฉัน</b> · ผู้มีสิทธิ์เข้าถึง <b>ทุกคน</b> → ให้สิทธิ์ → คัดลอก URL ของเว็บแอป</li>
      <li>กลับมาที่หน้านี้ กด "เพิ่มที่เก็บ" วาง URL และรหัสลับ แล้วบันทึก ระบบจะทดสอบให้ทันที</li>
    </ol>
    <p class="meta">ไฟล์จะอยู่ในโฟลเดอร์ "แฟ้มสะสมผลงานครู" ในไดรฟ์นั้น (สร้างให้เอง) ใช้บัญชี Google คนละบัญชีกับที่เก็บเดิมได้ เช่น บัญชีโรงเรียนที่มีพื้นที่มากกว่า</p>
  </details>`;

  const addForm = (open) => `<details class="panel st-add" ${open ? "open" : ""}><summary><b>+ เพิ่มที่เก็บ</b> <span class="meta">Google Drive ของตัวเอง หรือบัญชีใหม่ที่มีพื้นที่ว่าง</span></summary>
    ${SCRIPT_GUIDE}
    <form id="stAddForm" class="st-form">
      <label class="field">ชื่อที่เก็บ (ตั้งเองให้จำง่าย)<input name="name" maxlength="60" placeholder="เช่น Drive ส่วนตัว, Drive โรงเรียน"></label>
      <label class="field">URL ของเว็บแอป<input name="url" required inputmode="url" placeholder="https://script.google.com/macros/s/…/exec"></label>
      <label class="field">รหัสลับ (SECRET)<input name="secret" required type="password" autocomplete="off" minlength="8"></label>
      <label class="check"><input type="checkbox" name="primary" checked> ใช้เป็นที่หลัก (ไฟล์ใหม่ไปลงที่นี่)</label>
      <div class="row-btns"><button class="btn" type="submit">ทดสอบและบันทึก</button></div>
      <p class="st-msg" id="stAddMsg" role="status"></p>
    </form></details>`;

  const usageLine = (u) => {
    if (!u) return `<span class="meta">กำลังตรวจ…</span>`;
    if (u.error) return `<span class="st-err">${esc(u.error)}</span>`;
    const p = pctOf(u);
    if (p === null) return `<span class="meta">เชื่อมต่อได้${u.used > 0 ? ` · ใช้ไป ${fmtSize(u.used)}` : ""}${u.version < 2 ? " · ควรอัปเดต Code.gs" : ""}</span>`;
    const tone = p >= 90 ? "bad" : p >= 75 ? "warn" : "ok";
    return `<div class="st-bar ${tone}"><i style="width:${Math.max(1, p)}%"></i></div>
      <span class="meta">ใช้ไป ${fmtSize(u.used)} จาก ${fmtSize(u.limit)} · เหลือ <b>${fmtSize(Math.max(0, u.limit - u.used))}</b>${u.version < 2 ? " · ควรอัปเดต Code.gs" : ""}</span>`;
  };

  const locCard = (l) => {
    const u = STORE.usage[l.id];
    const full = pctOf(u) >= 90;
    return `<div class="st-loc${l.primary ? " is-primary" : ""}${full ? " is-full" : ""}" data-loc="${esc(l.id)}">
      <div class="st-top"><b>${esc(l.name)}</b>${l.primary ? `<span class="tag solid">ที่หลัก</span>` : ""}${l.builtin ? `<span class="tag">ที่เก็บกลาง</span>` : ""}</div>
      ${l.url ? `<div class="meta st-url">${esc(l.url)}</div>` : l.builtin ? `<div class="meta st-url">ตั้งโดยผู้ดูแลเว็บ ใช้ร่วมกันทุกคน</div>` : ""}
      <div class="st-usage">${usageLine(u)}</div>
      ${full ? `<p class="st-err">ใกล้เต็ม: ${l.primary ? "เพิ่มที่เก็บใหม่แล้วตั้งเป็นที่หลัก ไฟล์ใหม่จะไปลงที่ใหม่ ไฟล์เดิมยังเปิดได้" : "ไม่ควรตั้งเป็นที่หลัก"}</p>` : ""}
      <div class="st-acts">
        ${l.primary ? "" : `<button class="btn small" data-act="stPrimary" data-loc="${esc(l.id)}">ตั้งเป็นที่หลัก</button>`}
        <button class="btn small ghost" data-act="stTest" data-loc="${esc(l.id)}">ทดสอบ</button>
        ${l.builtin ? "" : `<button class="btn small ghost" data-act="stEdit" data-loc="${esc(l.id)}">แก้ไข</button><button class="btn small ghost danger" data-act="stDel" data-loc="${esc(l.id)}">เลิกใช้</button>`}
      </div></div>`;
  };

  const migPanel = () => {
    const ls = locs();
    if (ls.length < 2) return "";
    const p = primary();
    const from = ls.find((l) => !l.primary) || ls[0];
    const opt = (sel) => ls.map((l) => `<option value="${esc(l.id)}" ${l.id === sel ? "selected" : ""}>${esc(l.name)}${l.primary ? " (ที่หลัก)" : ""}</option>`).join("");
    return `<details class="panel st-mig" ${STORE.mig ? "open" : ""}><summary><b>ย้ายไฟล์ไปที่เก็บอื่น</b> <span class="meta">คัดลอกไฟล์ทั้งหมด แล้วเปลี่ยนลิงก์ในเว็บให้เอง</span></summary>
      <div class="st-mig-sel">
        <label class="field">จาก<select id="migFrom">${opt(from.id)}</select></label>
        <span class="st-arrow" aria-hidden="true">→</span>
        <label class="field">ไปที่<select id="migTo">${opt(p ? p.id : ls[1].id)}</select></label>
      </div>
      <div class="row-btns"><button class="btn ghost" data-act="migScan">ตรวจรายการไฟล์</button></div>
      <div id="migBox"></div>
      <p class="meta">ไฟล์ต้นทางไม่ถูกลบ (ลบเองใน Google Drive ทีหลังได้เมื่อตรวจแล้วว่าครบ) · ต้องเปิดหน้านี้ไว้จนเสร็จ ถ้าหยุดกลางทาง กดเริ่มใหม่ได้ ไฟล์ที่ย้ายแล้วจะข้ามให้เอง · ต้องอัปเดต Code.gs ทั้งสองที่เป็นรุ่นล่าสุด</p>
    </details>`;
  };

  const tabs = () => {
    const ls = locs();
    if (ls.length < 2) return "";
    const cur = STORE.loc || primary()?.id;
    return `<div class="seg st-tabs" role="tablist" aria-label="เลือกที่เก็บที่จะดูไฟล์">${ls.map((l) => `<button role="tab" aria-selected="${l.id === cur}" class="${l.id === cur ? "on" : ""}" data-act="stShow" data-loc="${esc(l.id)}">${esc(l.name)}</button>`).join("")}</div>`;
  };

  const storagePanel = () => `<section class="panel st-panel"><h2 class="row-head">ที่เก็บไฟล์ <span class="meta">${locs().length} ที่</span></h2>
    <p class="meta">ไฟล์ใหม่จะไปลง <b>ที่หลัก</b> เสมอ ไฟล์ที่อยู่ที่อื่นยังเปิดจากเว็บได้ตามเดิม</p>
    <div class="st-locs">${locs().map(locCard).join("")}</div></section>
    ${addForm(!locs().length)}${migPanel()}`;

  const refreshStatus = async () => {
    App.drive = await api("GET", "/api/admin/drive/status");
    App.driveCats = App.drive.categories;
  };
  const testAll = () => locs().forEach((l) => {
    if (STORE.usage[l.id]) return;
    api("POST", `/api/admin/storage/${encodeURIComponent(l.id)}`).then((u) => { STORE.usage[l.id] = u; })
      .catch((e) => { STORE.usage[l.id] = { error: e.message }; })
      .finally(() => { const el = document.querySelector(`.st-loc[data-loc="${CSS.escape(l.id)}"]`); if (el) el.outerHTML = locCard(locs().find((x) => x.id === l.id)); });
  });
  const renderStorage = () => {
    const box = $("#stBox");
    if (box) box.innerHTML = storagePanel();
    const f = $("#stAddForm");
    if (f) f.onsubmit = addLoc;
    testAll();
  };

  App.pages["admin/files"] = () => {
    setTimeout(App.loadFiles, 0);
    const cats = App.driveCats || {};
    return head("ไฟล์ใน Google Drive", "ไฟล์ที่แนบจากทุกเมนู แยกโฟลเดอร์ตามหมวดงาน", `<button class="btn ghost" data-act="reloadFiles">โหลดใหม่</button>`) +
      `<div id="stBox"></div><div id="stTabs"></div><div id="driveBox">${empty("กำลังโหลดรายการไฟล์…")}</div>
      <section class="panel"><h2>อัปโหลดไฟล์</h2>
        <p class="meta" id="upWhere"></p>
        <label class="field">เก็บในโฟลเดอร์<select id="upCat">${Object.entries(cats).map(([k, v]) => `<option value="${k}" ${k === "other" ? "selected" : ""}>${esc(v)}</option>`).join("")}</select></label>
        <div class="drop page-drop"><input type="file" hidden multiple><div class="drop-ui"><b>ลากไฟล์มาวางที่นี่ (หลายไฟล์ได้)</b><span> หรือ </span><button type="button" class="link-btn">เลือกไฟล์</button>
        <small>ไม่เกิน ${MAX_FILE_MB} MB ต่อไฟล์ รูปจะถูกย่อให้อัตโนมัติ</small></div><div class="drop-status" id="upStatus"></div></div>
      </section>`;
  };

  App.loadFiles = async () => {
    const box = $("#driveBox");
    if (!box) return;
    const zone = main.querySelector(".page-drop");
    if (zone && !zone.dataset.wired) wirePageDrop(zone);
    try {
      if (!App.drive || !App.drive.locations) await refreshStatus();
      renderStorage();
      const sel = $("#upCat");
      if (sel && !sel.options.length) sel.innerHTML = Object.entries(App.driveCats || {}).map(([k, v]) => `<option value="${k}" ${k === "other" ? "selected" : ""}>${esc(v)}</option>`).join("");
      const p = primary();
      if ($("#upWhere")) $("#upWhere").innerHTML = p ? `ไฟล์จะไปลง <b>${esc(p.name)}</b> (ที่หลัก)` : "";
      if (!locs().length) { box.innerHTML = `<p class="private-note">ยังไม่มีที่เก็บไฟล์ เพิ่ม Google Drive ของคุณด้านบนก่อน ระหว่างนี้วางลิงก์ไฟล์ในฟอร์มแทนได้</p>`; $("#stTabs").innerHTML = ""; return; }
      if (STORE.loc && !locs().some((l) => l.id === STORE.loc)) STORE.loc = null;
      $("#stTabs").innerHTML = tabs();
      const loc = STORE.loc || p?.id;
      box.innerHTML = empty("กำลังโหลดรายการไฟล์…");
      const d = await api("GET", `/api/admin/drive/list${loc ? `?loc=${encodeURIComponent(loc)}` : ""}`);
      if (d.usage) STORE.usage[d.loc.id] = { ...(STORE.usage[d.loc.id] || {}), used: d.usage.used, limit: d.usage.limit, version: STORE.usage[d.loc.id]?.version ?? 2 };
      box.innerHTML = driveUsage(d) + `<p><a class="btn ghost" href="${esc(d.url)}" target="_blank" rel="noopener">เปิดโฟลเดอร์ของฉันใน Google Drive</a></p>` +
        (d.folders.length ? d.folders.map((f) => `<details class="panel folder" open><summary><b>${esc(f.name)}</b> <span class="meta">${f.files.length} ไฟล์ · ${fmtSize(f.files.reduce((t, x) => t + (x.size || 0), 0))}</span>
          <a class="mini" href="${esc(f.url)}" target="_blank" rel="noopener">เปิดใน Drive</a></summary>
          ${f.files.length ? `<div class="files">${f.files.map((x) => `<div class="file">
            <a class="thumb" href="${esc(x.url)}" target="_blank" rel="noopener">${x.img ? `<img src="${esc(x.img.replace("sz=w1600", "sz=w400"))}" alt="" loading="lazy">` : `<span>${esc((x.name.split(".").pop() || "ไฟล์").slice(0, 4).toUpperCase())}</span>`}</a>
            <div class="file-name" title="${esc(x.name)}">${esc(x.name)}</div><div class="meta">${fmtSize(x.size)} ${x.shared ? "" : "· ไม่แชร์"}</div>
            <span class="acts"><button class="ico" data-act="copyLink" data-url="${esc(x.img || x.url)}">คัดลอกลิงก์</button><button class="ico del" data-act="trashFile" data-loc="${esc(d.loc.id)}" data-id="${esc(x.id)}" data-name="${esc(x.name)}">ลบ</button></span>
          </div>`).join("")}</div>` : empty("ยังไม่มีไฟล์")}</details>`).join("") : empty("ยังไม่มีไฟล์ในที่เก็บนี้")) +
        (d.truncated ? `<p class="meta">แสดง 300 ไฟล์แรก ดูทั้งหมดได้ใน Google Drive</p>` : "");
    } catch (e) {
      box.innerHTML = `<p class="private-note">${esc(e.message)}</p>`;
    }
  };

  async function addLoc(ev) {
    ev.preventDefault();
    const f = ev.target, msg = $("#stAddMsg"), btn = f.querySelector("button[type=submit]");
    const body = { name: f.name.value, url: f.url.value.trim(), secret: f.secret.value, primary: f.primary.checked };
    btn.disabled = true; msg.className = "st-msg"; msg.textContent = "กำลังทดสอบการเชื่อมต่อ…";
    try {
      const r = await api("POST", "/api/admin/storage", body);
      toast(`เพิ่มที่เก็บแล้ว (โฟลเดอร์ "${r.root}")`);
      STORE.usage = {}; STORE.loc = null;
      await refreshStatus(); App.loadFiles();
    } catch (e) { msg.className = "st-msg err"; msg.textContent = e.message; }
    finally { btn.disabled = false; }
  }

  App.actions.stShow = (b) => { STORE.loc = b.dataset.loc; App.loadFiles(); };
  App.actions.stPrimary = async (b) => {
    try { await api("PUT", `/api/admin/storage/${encodeURIComponent(b.dataset.loc)}`, { primary: true }); toast(`ไฟล์ใหม่จะไปลง "${locName(b.dataset.loc)}"`); await refreshStatus(); App.loadFiles(); }
    catch (e) { toast(e.message); }
  };
  App.actions.stTest = async (b) => {
    const id = b.dataset.loc;
    delete STORE.usage[id];
    b.disabled = true; b.textContent = "กำลังทดสอบ…";
    try { const u = await api("POST", `/api/admin/storage/${encodeURIComponent(id)}`); STORE.usage[id] = u; toast(`เชื่อมต่อได้ โฟลเดอร์ "${u.root}"`); }
    catch (e) { STORE.usage[id] = { error: e.message }; toast(e.message); }
    renderStorage();
  };
  App.actions.stEdit = async (b) => {
    const id = b.dataset.loc, l = locs().find((x) => x.id === id);
    const name = prompt("ชื่อที่เก็บ", l.name);
    if (name === null) return;
    const url = prompt("URL ของเว็บแอป (เว้นว่าง = ใช้ค่าเดิม)", "");
    if (url === null) return;
    const secret = url ? prompt("รหัสลับ (SECRET) ของสคริปต์นี้", "") : "";
    if (secret === null) return;
    try {
      await api("PUT", `/api/admin/storage/${encodeURIComponent(id)}`, { name, ...(url ? { url, secret } : {}) });
      toast("บันทึกแล้ว"); delete STORE.usage[id]; await refreshStatus(); App.loadFiles();
    } catch (e) { toast(e.message); }
  };
  App.actions.stDel = async (b) => {
    const id = b.dataset.loc;
    if (!confirm(`เลิกใช้ "${locName(id)}"?\n\nไฟล์ใน Google Drive ไม่ถูกลบ ลิงก์เดิมในเว็บยังเปิดได้ แต่จะดูรายการ/ลบไฟล์ที่นั่นจากเว็บนี้ไม่ได้\nถ้าจะย้ายไฟล์ออกก่อน ใช้ "ย้ายไฟล์ไปที่เก็บอื่น"`)) return;
    try { await api("DELETE", `/api/admin/storage/${encodeURIComponent(id)}`); toast("เลิกใช้แล้ว"); STORE.loc = null; await refreshStatus(); App.loadFiles(); }
    catch (e) { toast(e.message); }
  };
  App.actions.trashFile = async (b) => {
    if (!confirm(`ย้าย "${b.dataset.name}" ไปถังขยะของ Google Drive? (กู้คืนได้ใน Drive ภายใน 30 วัน)`)) return;
    try { await api("POST", "/api/admin/drive/delete", { id: b.dataset.id, loc: b.dataset.loc }); toast("ย้ายไปถังขยะแล้ว"); App.loadFiles(); } catch (e) { toast(e.message); }
  };

  // ---------- ย้ายไฟล์ ----------
  const migView = () => {
    const m = STORE.mig;
    if (!m) return "";
    const todo = m.files.filter((f) => !f.done && !f.native && !f.tooBig);
    const total = m.files.length, done = m.files.filter((f) => f.done).length;
    const bytes = todo.reduce((t, f) => t + (f.size || 0), 0);
    const pct = total ? Math.round((done / total) * 100) : 100;
    const skip = m.files.filter((f) => f.native || f.tooBig);
    return `<div class="st-mig-box">
      <p><b>${esc(m.from)}</b> → <b>${esc(m.to)}</b>: ${total} ไฟล์ · ย้ายแล้ว ${done} · เหลือ ${todo.length} (${fmtSize(bytes)})${m.truncated ? " · แสดง 3,000 ไฟล์แรก" : ""}</p>
      <div class="st-bar ok big"><i style="width:${pct}%"></i></div>
      <p class="meta" id="migNow">${m.running ? `กำลังย้าย: ${esc(m.now || "")}` : m.finished ? `เสร็จแล้ว เปลี่ยนลิงก์ในเว็บ ${m.relinked} จุด` : ""}</p>
      <div class="row-btns">${m.running ? `<button class="btn ghost" data-act="migStop">หยุดชั่วคราว</button>` : todo.length ? `<button class="btn" data-act="migGo">${done ? "ย้ายต่อ" : "เริ่มย้าย"} ${todo.length} ไฟล์</button>` : ""}</div>
      ${skip.length ? `<details class="st-skip"><summary>${skip.length} ไฟล์ย้ายแบบนี้ไม่ได้ (ลิงก์เดิมยังใช้ได้)</summary><ul>${skip.map((f) => `<li>${esc(f.name)} <span class="meta">${f.native ? "ไฟล์ Google Docs/Sheets/Slides" : `ใหญ่เกิน 25 MB (${fmtSize(f.size)})`}</span></li>`).join("")}</ul></details>` : ""}
      ${m.errors.length ? `<details class="st-skip" open><summary class="st-err">${m.errors.length} ไฟล์ย้ายไม่สำเร็จ (กดย้ายต่อเพื่อลองใหม่)</summary><ul>${m.errors.map((e) => `<li>${esc(e.name)} <span class="meta">${esc(e.msg)}</span></li>`).join("")}</ul></details>` : ""}
    </div>`;
  };
  const drawMig = () => { const box = $("#migBox"); if (box) box.innerHTML = migView(); };

  App.actions.migScan = async (b) => {
    const from = $("#migFrom").value, to = $("#migTo").value;
    if (from === to) return toast("เลือกต้นทางกับปลายทางคนละที่");
    b.disabled = true; b.textContent = "กำลังตรวจ…";
    try {
      const r = await api("GET", `/api/admin/storage/migrate?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      STORE.mig = { ...r, fromId: from, toId: to, errors: [], relinked: 0, running: false };
      drawMig();
    } catch (e) { toast(e.message); }
    finally { b.disabled = false; b.textContent = "ตรวจรายการไฟล์"; }
  };
  App.actions.migStop = () => { if (STORE.mig) STORE.mig.stop = true; };
  App.actions.migGo = async () => {
    const m = STORE.mig;
    if (!m || m.running) return;
    m.running = true; m.stop = false; m.finished = false; m.errors = [];
    const wake = navigator.wakeLock?.request?.("screen").catch(() => null);
    drawMig();
    for (const f of m.files) {
      if (m.stop) break;
      if (f.done || f.native || f.tooBig) continue;
      m.now = f.name; drawMig();
      try {
        const r = await api("POST", "/api/admin/storage/migrate", { from: m.fromId, to: m.toId, id: f.id, name: f.name, mime: f.mime, folder: f.folder });
        f.done = true; m.relinked += r.relinked || 0;
      } catch (e) {
        m.errors.push({ name: f.name, msg: e.message });
        if (e.status === 401) break;
      }
    }
    m.running = false; m.finished = !m.stop && !m.errors.length; m.now = "";
    (await wake)?.release?.();
    drawMig();
    if (m.finished) {
      toast("ย้ายไฟล์เสร็จแล้ว");
      // ลิงก์ในเว็บเปลี่ยนแล้ว โหลดข้อมูลใหม่ให้หน้าอื่นเห็นลิงก์ใหม่
      try {
        const d = await api("GET", "/api/admin/data");
        for (const k of ["_empty", "_site", "_siteName", "_defaults"]) delete d[k];
        App.DATA = d;
      } catch { /* ใช้ข้อมูลเดิมไปก่อน */ }
    }
  };
  addEventListener("beforeunload", (e) => { if (STORE.mig?.running) { e.preventDefault(); e.returnValue = ""; } });
})();
