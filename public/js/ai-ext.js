// 💬 ใช้แอป AI (ฟรี): ไม่ต้องมี API key
// เว็บเตรียมคำสั่งให้ → ครูคัดลอกไปวางในแอป ChatGPT / Gemini / Claude พร้อมแนบรูปหรือไฟล์
// → คัดลอกคำตอบกลับมาวาง → เว็บอ่านคำตอบแล้วกรอกฟอร์มให้ (ไฟล์ไม่ผ่านเซิร์ฟเวอร์ของเว็บนี้เลย)
(() => {
  const APPS = [
    ["ChatGPT", "https://chatgpt.com/"],
    ["Gemini", "https://gemini.google.com/app"],
    ["Claude", "https://claude.ai/new"],
  ];

  // กติกาเดียวกับโหมด API (src/ai.js) แต่ขอให้ตอบในกล่องโค้ด เพื่อให้กดคัดลอกในแอปได้ง่าย
  const RULES = `กติกา:
- ตอบเป็น JSON ในกล่องโค้ด \`\`\`json เพียงกล่องเดียว ไม่ต้องอธิบายเพิ่ม
- ใส่เฉพาะข้อมูลที่เห็นในเอกสารจริง ห้ามเดา ถ้าไม่พบให้ใส่ "" (ตัวเลขใส่ null)
- ยกเว้นช่องที่เป็นการจัดหมวด (ประเภท หมวด ตัวชี้วัด หัวข้อ) ให้เลือกตัวเลือกที่เหมาะกับเนื้อหาที่สุด แม้เอกสารไม่ได้เขียนไว้ตรง ๆ
- วันที่ให้แปลงเป็นรูปแบบ YYYY-MM-DD แบบคริสต์ศักราช (พ.ศ. ลบ 543) เช่น 15 มีนาคม 2569 → 2026-03-15 ถ้ามีหลายวันให้ใช้วันสุดท้ายของกิจกรรม หรือวันที่ออกเอกสารถ้าไม่มีวันกิจกรรม
- ช่องที่มีตัวเลือก ต้องตอบเป็นหนึ่งในตัวเลือกที่ให้ไว้เท่านั้น (คัดลอกให้ตรงทุกตัวอักษร) ถ้าไม่ตรงข้อใดให้ใส่ ""
- ชื่อเรื่อง/หลักสูตร/รางวัล ให้คัดลอกตามเอกสาร ตัดคำว่า "เกียรติบัตรฉบับนี้ให้ไว้เพื่อแสดงว่า" และชื่อผู้รับออก`;
  const INTRO = (what) => `คุณเป็นผู้ช่วยครูไทย ช่วยอ่าน${what}ที่ฉันแนบมา แล้วดึงข้อมูลไปกรอกแบบฟอร์ม
(ถ้าฉันยังไม่ได้แนบรูปหรือไฟล์ ให้บอกให้ฉันแนบก่อน)`;

  const cleanFields = (fields) => (fields || []).slice(0, 20).filter((f) => f.key);
  const specText = (F) => F.map((f) => `- "${f.key}": ${f.label}${f.type === "date" ? " (YYYY-MM-DD)" : f.type === "number" ? " (ตัวเลข)" : f.type === "multi" ? " (อาร์เรย์ เลือกได้หลายค่า ใส่เฉพาะรหัสหน้าเครื่องหมาย :)" : ""}${f.options ? ` ตัวเลือก: ${f.options.map((o) => `"${o}"`).join(", ")}` : ""}`).join("\n");

  function cleanValues(F, j) {
    const values = {};
    for (const f of F) {
      let v = j?.[f.key];
      if (v === null || v === undefined) continue;
      if (f.type === "multi") {
        const codes = (f.options || []).map((o) => o.split(":")[0].trim());
        v = (Array.isArray(v) ? v : String(v).split(/[,\s]+/)).map((x) => String(x).split(":")[0].trim()).filter((x) => codes.includes(x));
        if (v.length) values[f.key] = [...new Set(v)].join(", ");
        continue;
      }
      if (f.type === "number") { v = Number(String(v).replace(/[^\d.]/g, "")); if (!isFinite(v) || !v) continue; }
      else v = String(v).trim().slice(0, f.type === "textarea" ? 3000 : 300);
      if (f.type === "date") {
        const thai = String(v).match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
        if (!thai) continue;
        let y = Number(thai[1]);
        if (y > 2400) y -= 543; // เผื่อ AI ลืมแปลง พ.ศ.
        v = `${y}-${thai[2].padStart(2, "0")}-${thai[3].padStart(2, "0")}`;
      }
      if (f.options && !f.options.includes(v)) {
        const hit = f.options.find((o) => o.replace(/\s/g, "") === String(v).replace(/\s/g, "")); // ช่องว่างต่างกันเล็กน้อย
        if (!hit) continue;
        v = hit;
      }
      if (v === "") continue;
      values[f.key] = v;
    }
    return values;
  }

  // คำตอบจากแอปมักมีข้อความอื่นปน → หา JSON ในกล่องโค้ดก่อน แล้วค่อยหา { ... } ก้อนนอกสุด
  function parseAnswer(text) {
    const t = String(text || "").trim();
    if (!t) throw new Error("ยังไม่ได้วางคำตอบจาก AI");
    const tries = [];
    for (const m of t.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)) tries.push(m[1]);
    tries.push(t);
    for (const s of tries) {
      const a = s.indexOf("{"), b = s.lastIndexOf("}");
      if (a < 0 || b <= a) continue;
      const body = s.slice(a, b + 1).replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, "$1");
      try { return JSON.parse(body); } catch { /* ลองก้อนถัดไป */ }
    }
    throw new Error("อ่านคำตอบไม่ได้ ตรวจว่าคัดลอกคำตอบของ AI มาครบทั้งก้อน (ตั้งแต่ { ถึง })");
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* */ }
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.cssText = "position:fixed;opacity:0";
    document.body.append(ta); ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch { /* */ }
    ta.remove();
    return ok;
  }

  // หน้าต่าง 3 ขั้น คืนค่า JSON ที่อ่านได้ (หรือ null ถ้าปิด)
  function dialog({ title, what, prompt, check }) {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "ext-dlg";
      dlg.innerHTML = `<form method="dialog" class="ext-in">
        <header><b>💬 ใช้แอป AI (ฟรี)</b><span>${esc(title)}</span><button value="x" class="ext-x" aria-label="ปิด">✕</button></header>
        <ol class="ext-steps">
          <li><div class="ext-h">คัดลอกคำสั่ง</div>
            <button type="button" class="btn" data-x="copy">📋 คัดลอกคำสั่ง</button>
            <details><summary>ดูคำสั่ง</summary><pre>${esc(prompt)}</pre></details></li>
          <li><div class="ext-h">เปิดแอป AI แล้ววางคำสั่ง แนบ${esc(what)} แล้วกดส่ง</div>
            <div class="ext-apps">${APPS.map(([n, u]) => `<a class="btn ghost small" href="${u}" target="_blank" rel="noopener">${n} ↗</a>`).join("")}</div>
            <p class="meta">ใช้บัญชีฟรีของแอปไหนก็ได้ ไฟล์ส่งตรงจากเครื่องคุณไปที่แอปนั้น ไม่ผ่านเว็บนี้</p></li>
          <li><div class="ext-h">คัดลอกคำตอบของ AI มาวางที่นี่</div>
            <textarea rows="5" placeholder='วางคำตอบ เช่น { "title": "…", … }'></textarea>
            <div class="ext-row"><button type="button" class="btn ghost small" data-x="paste">วางจากคลิปบอร์ด</button>
              <button type="button" class="btn" data-x="ok">✨ กรอกให้</button></div>
            <div class="ai-status" role="status"></div></li>
        </ol></form>`;
      document.body.append(dlg);
      const ta = dlg.querySelector("textarea"), st = dlg.querySelector(".ai-status");
      const say = (m, c = "") => { st.className = `ai-status ${c}`; st.textContent = m; };
      let result = null;
      dlg.addEventListener("click", async (e) => {
        const x = e.target.closest("[data-x]")?.dataset.x;
        if (x === "copy") {
          const ok = await copy(prompt);
          e.target.closest("button").textContent = ok ? "✓ คัดลอกแล้ว" : "คัดลอกไม่ได้ เปิด 'ดูคำสั่ง' แล้วคัดลอกเอง";
          if (!ok) dlg.querySelector("details").open = true;
          try { localStorage.setItem("extCopied", "1"); } catch { /* */ }
        } else if (x === "paste") {
          try { ta.value = await navigator.clipboard.readText(); say(""); } catch { say("เบราว์เซอร์ไม่อนุญาต กดค้างในช่องแล้วเลือก วาง", "warn"); ta.focus(); }
        } else if (x === "ok") {
          try {
            const j = parseAnswer(ta.value);
            const msg = check(j);
            if (msg) { say(msg, "warn"); return; }
            result = j; dlg.close();
          } catch (err) { say(err.message, "err"); }
        }
      });
      dlg.addEventListener("close", () => { dlg.remove(); resolve(result); });
      dlg.showModal();
    });
  }

  // ฟอร์มรายการเดียว (เกียรติบัตร อบรม …) คืน { values, note }
  async function fill({ title, fields, hint, text, what = "เอกสาร" }) {
    const F = cleanFields(fields);
    const prompt = `${INTRO(what)}
${RULES}

แบบฟอร์ม: ${title}
${hint ? `ข้อมูลเพิ่มเติม: ${hint}\n` : ""}${text ? `ข้อความจากครู:\n"""\n${text}\n"""\n` : ""}ตอบ JSON ที่มีช่องต่อไปนี้
${specText(F)}
- "_note": "สรุปสั้น ๆ ว่าเป็นเอกสารอะไร"`;
    const j = await dialog({ title, what, prompt, check: (x) => (Object.keys(cleanValues(F, x)).length ? "" : "คำตอบนี้ไม่มีช่องที่ตรงกับฟอร์ม ตรวจว่าคัดลอกคำตอบของ AI มาถูกอัน") });
    if (!j) return null;
    return { values: cleanValues(F, j), uncertain: [], note: String(j._note || "").slice(0, 200) };
  }

  // หลายรายการ (ตารางสอน คำสั่ง) คืน { rows, header, note } รูปแบบเดียวกับ /api/admin/ai/rows
  async function rows({ title, fields, hint, max = 60, header, what = "เอกสาร" }) {
    const F = cleanFields(fields), H = cleanFields(header);
    const prompt = `${INTRO(what)}
${RULES}

งาน: ${title}
${hint ? `คำแนะนำ: ${hint}\n` : ""}แยกเป็นรายการ ตอบ JSON รูปแบบ {${H.length ? `"header": {...}, ` : ""}"rows": [ {...}, ... ], "_note": "สรุปสั้น ๆ"}
${H.length ? `"header" คือข้อมูลของเอกสารทั้งฉบับ มีช่องต่อไปนี้\n${specText(H)}\n` : ""}
แต่ละรายการใน "rows" มีช่องต่อไปนี้
${specText(F)}
ไม่เกิน ${max} รายการ ถ้าไม่พบรายการที่ตรงให้ตอบ {"rows": [], "_note": "เหตุผล"}`;
    const shape = (x) => ({
      rows: (Array.isArray(x.rows) ? x.rows : []).slice(0, max).map((r) => cleanValues(F, r)).filter((r) => Object.keys(r).length),
      header: H.length ? cleanValues(H, x.header || {}) : undefined,
      note: String(x._note || "").slice(0, 300),
    });
    const j = await dialog({ title, what, prompt, check: (x) => {
      const s = shape(x);
      return s.rows.length || (s.header && Object.keys(s.header).length) ? "" : `AI ไม่พบรายการ${s.note ? `: ${s.note}` : ""} ตรวจว่าแนบไฟล์ถูกและคัดลอกคำตอบมาครบ`;
    } });
    return j ? shape(j) : null;
  }

  App.aiExt = { fill, rows, parseAnswer, cleanValues };
})();
