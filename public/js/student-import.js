// นำเข้ารายชื่อนักเรียนและการมาเรียนจากไฟล์ Excel (.xlsx) แบบ "เพิ่มเข้า" ไม่ลบข้อมูลเดิม
// รองรับไฟล์สำรองข้อมูลชั้นเรียน (ชีต ข้อมูลห้อง / นักเรียน / การมาเรียน)
// และไฟล์ทั่วไปที่มีหัวคอลัมน์ "ชื่อ" (กับ "นามสกุล" / "เลขที่" / "คำนำหน้า" ถ้ามี)
// ไม่ใช้ไลบรารีภายนอก: อ่าน zip ด้วย DecompressionStream ของเบราว์เซอร์
// เก็บเฉพาะ เลขที่ ชื่อ-นามสกุล ห้อง เลขประจำตัว (ไม่เก็บวันเกิด เลขบัตรประชาชน)

const Xlsx = (() => {
  const u16 = (b, o) => b[o] | (b[o + 1] << 8);
  const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
  const dec = new TextDecoder();

  async function unzip(buf) {
    const b = new Uint8Array(buf);
    let eocd = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (u32(b, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("ไฟล์นี้ไม่ใช่ไฟล์ Excel (.xlsx)");
    const n = u16(b, eocd + 10);
    let p = u32(b, eocd + 16);
    const files = {};
    for (let k = 0; k < n; k++) {
      if (u32(b, p) !== 0x02014b50) break;
      const method = u16(b, p + 10), csize = u32(b, p + 20), nlen = u16(b, p + 28), xlen = u16(b, p + 30), clen = u16(b, p + 32), off = u32(b, p + 42);
      const name = dec.decode(b.subarray(p + 46, p + 46 + nlen));
      files[name] = { method, csize, off };
      p += 46 + nlen + xlen + clen;
    }
    const read = async (name) => {
      const f = files[name];
      if (!f) return null;
      const start = f.off + 30 + u16(b, f.off + 26) + u16(b, f.off + 28);
      const data = b.subarray(start, start + f.csize);
      if (f.method === 0) return dec.decode(data);
      if (f.method !== 8) throw new Error("รูปแบบการบีบอัดไฟล์ไม่รองรับ");
      const ds = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      return dec.decode(await new Response(ds).arrayBuffer());
    };
    return { files, read };
  }

  const xml = (s) => new DOMParser().parseFromString(s, "application/xml");
  const byTag = (node, tag) => [...node.getElementsByTagNameNS("*", tag)];
  const colIdx = (ref) => {
    let n = 0;
    for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
    return n - 1;
  };

  // คืนค่า { ชื่อชีต: [[ค่าเซลล์...], ...] }
  async function read(buf) {
    const z = await unzip(buf);
    const ss = await z.read("xl/sharedStrings.xml");
    const shared = ss ? byTag(xml(ss), "si").map((si) => byTag(si, "t").map((t) => t.textContent).join("")) : [];
    const wb = xml(await z.read("xl/workbook.xml"));
    const relsTxt = await z.read("xl/_rels/workbook.xml.rels");
    const rels = {};
    if (relsTxt) for (const r of byTag(xml(relsTxt), "Relationship")) rels[r.getAttribute("Id")] = r.getAttribute("Target");
    const out = {};
    let i = 0;
    for (const s of byTag(wb, "sheet")) {
      i++;
      const rid = s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || s.getAttribute("r:id");
      let target = rels[rid] || `worksheets/sheet${i}.xml`;
      target = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
      const txt = await z.read(target);
      if (!txt) continue;
      const rows = [];
      for (const row of byTag(xml(txt), "row")) {
        const r = [];
        for (const c of byTag(row, "c")) {
          const t = c.getAttribute("t");
          const v = byTag(c, "v")[0]?.textContent ?? "";
          let val;
          if (t === "s") val = shared[Number(v)] ?? "";
          else if (t === "inlineStr") val = byTag(c, "t").map((x) => x.textContent).join("");
          else val = v;
          r[c.getAttribute("r") ? colIdx(c.getAttribute("r")) : r.length] = String(val).trim();
        }
        rows.push(Array.from(r, (x) => x ?? ""));
      }
      out[s.getAttribute("name")] = rows;
    }
    return out;
  }
  return { read };
})();

// วันที่ใน Excel อาจเป็นข้อความ 2026-11-10, 10/11/2569 หรือเลขลำดับวัน
const isoDate = (v) => {
  if (!v) return "";
  let m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${Number(m[1]) > 2400 ? m[1] - 543 : m[1]}-${m[2]}-${m[3]}`;
  m = String(v).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${Number(m[3]) > 2400 ? m[3] - 543 : m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  if (/^\d{5}(\.\d+)?$/.test(v)) return new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(v)) * 864e5).toISOString().slice(0, 10);
  return "";
};

// แปลงตาราง (แถวแรกเป็นหัว) เป็นรายการอ็อบเจกต์
const sheetObjs = (rows) => {
  const hi = rows.findIndex((r) => r.some((c) => /ชื่อ/.test(c)));
  if (hi < 0) return [];
  const head = rows[hi];
  return rows.slice(hi + 1).filter((r) => r.some(Boolean)).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ""])));
};
const pick = (o, ...keys) => {
  for (const k of keys) {
    const hit = Object.keys(o).find((h) => h.replace(/\s/g, "") === k);
    if (hit && o[hit]) return o[hit];
  }
  return "";
};
const normName = (s) => String(s).replace(/\s+/g, " ").trim();
const ATT_OK = ["มา", "สาย", "ลา", "ขาด"];

// อ่านไฟล์แล้วสรุปเป็น { room, students:[{code,name,status}], att:{code:{date:สถานะ}} }
function parseClassBook(book) {
  const names = Object.keys(book);
  const info = book["ข้อมูลห้อง"] || [];
  const infoMap = Object.fromEntries(info.map((r) => [r[0], r[1]]));
  const room = infoMap["ชั้น"] || "";

  const stuSheet = book["นักเรียน"] || book[names.find((n) => sheetObjs(book[n]).some((o) => pick(o, "ชื่อ", "ชื่อ-นามสกุล", "ชื่อ-สกุล")))] || [];
  const students = [];
  for (const o of sheetObjs(stuSheet)) {
    const status = pick(o, "สถานะ");
    if (status && !/กำลังเรียน|ปกติ/.test(status)) continue; // ข้ามคนที่ย้าย/จบไปแล้ว
    const full = pick(o, "ชื่อ-นามสกุล", "ชื่อ-สกุล");
    const name = normName(full || `${pick(o, "คำนำหน้า")}${pick(o, "ชื่อ")} ${pick(o, "นามสกุล")}`);
    if (!name) continue;
    students.push({ code: pick(o, "เลขที่", "เลขประจำตัว", "รหัส"), name, room: pick(o, "ห้อง", "ชั้น") || room });
  }

  const att = {};
  for (const o of sheetObjs(book["การมาเรียน"] || [])) {
    const d = isoDate(pick(o, "วันที่"));
    const st = pick(o, "สถานะ");
    if (!d || !ATT_OK.includes(st)) continue;
    const key = pick(o, "เลขที่") || normName(pick(o, "ชื่อ-สกุล", "ชื่อ-นามสกุล"));
    (att[key] = att[key] || {})[d] = st;
  }
  const extraDates = (book["วันเรียน"] || []).map((r) => isoDate(r[0])).filter(Boolean);
  return { room, students, att, extraDates };
}

App.actions.importXlsx = () => {
  const inp = document.createElement("input");
  inp.type = "file";
  inp.accept = ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  inp.style.display = "none";
  document.body.appendChild(inp); // iPhone/iPad ต้องอยู่ในหน้าจึงเปิดเลือกไฟล์ได้
  inp.onchange = async () => {
    const f = inp.files[0];
    inp.remove();
    if (!f) return;
    let parsed;
    try { parsed = parseClassBook(await Xlsx.read(await f.arrayBuffer())); } catch (e) { return toast(e.message || "อ่านไฟล์ไม่สำเร็จ"); }
    if (!parsed.students.length) return toast("ไม่พบรายชื่อนักเรียนในไฟล์ (ต้องมีคอลัมน์ \"ชื่อ\")");

    const existing = arr("students");
    const byName = new Map(existing.map((s) => [normName(s.name), s]));
    const fresh = parsed.students.filter((s) => !byName.has(s.name));
    const dateSet = new Set([...parsed.extraDates, ...Object.values(parsed.att).flatMap(Object.keys)]);
    const msg = `พบนักเรียน ${parsed.students.length} คน${parsed.room ? ` (${parsed.room})` : ""}\n` +
      `• เพิ่มใหม่ ${fresh.length} คน${parsed.students.length - fresh.length ? ` · มีอยู่แล้ว ${parsed.students.length - fresh.length} คน (ไม่เพิ่มซ้ำ)` : ""}\n` +
      (dateSet.size ? `• การมาเรียน ${dateSet.size} วัน\n` : "") +
      `ข้อมูลอื่นในแฟ้มจะยังอยู่ครบ ไม่ใช้วันเกิดหรือเลขบัตรประชาชน\nนำเข้าเลยไหม?`;
    if (!confirm(msg)) return;

    try {
      // เลขที่: ต่อจากเลขที่มากที่สุดที่มีอยู่ เรียงตามลำดับในไฟล์
      let next = existing.reduce((m, s) => Math.max(m, Number(s.no) || 0), 0);
      for (const s of fresh) {
        const body = { no: ++next, name: s.name, room: s.room };
        if (s.code) body.code = s.code;
        const saved = await api("POST", "/api/admin/items/students", body);
        existing.unshift(saved);
        byName.set(s.name, saved);
      }

      if (dateSet.size) {
        const oldDates = (App.DATA.attendanceDates = App.DATA.attendanceDates || []);
        const att = (App.DATA.attendance = App.DATA.attendance || {});
        const dates = [...new Set([...oldDates, ...dateSet])].sort();
        // จัดแถวเดิมให้ตรงกับลำดับวันที่ใหม่
        for (const k of Object.keys(att)) {
          const row = [];
          oldDates.forEach((d, i) => { if (att[k][i]) row[dates.indexOf(d)] = att[k][i]; });
          att[k] = row;
        }
        for (const s of parsed.students) {
          const st = byName.get(s.name);
          const marks = parsed.att[s.code] || parsed.att[s.name];
          if (!st || !marks) continue;
          const row = (att[st.no] = att[st.no] || []);
          // ไม่ทับช่องที่ครูเช็กชื่อไว้ในเว็บแล้ว
          for (const [d, v] of Object.entries(marks)) if (!row[dates.indexOf(d)]) row[dates.indexOf(d)] = v;
        }
        App.DATA.attendanceDates = dates;
        await Promise.all([saveKV("attendanceDates"), saveKV("attendance")]);
      }
      toast(`นำเข้าแล้ว เพิ่มนักเรียน ${fresh.length} คน${dateSet.size ? ` และการมาเรียน ${dateSet.size} วัน` : ""}`);
    } catch (e) {
      toast(`นำเข้าไม่ครบ: ${e.message}`);
    }
    render();
  };
  inp.click();
};
