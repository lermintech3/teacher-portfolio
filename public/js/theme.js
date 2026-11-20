// ตั้งค่าเว็บ → ธีมและไอคอน: ชุดสีสำเร็จรูป 12 ชุด, กำหนดสีเองทุกช่อง, สไตล์ไอคอน 4 แบบ, เปลี่ยนไอคอนรายเมนู
// ทุกตัวเลือกมีตัวอย่างย่อให้ดูก่อน (วาดด้วย inline style จึงไม่กระทบหน้าจริงจนกว่าจะกดเลือก)
(() => {
  const BASE = App.THEMES.bright.palette; // สีตั้งต้นของแต่ละช่อง ใช้หาว่าช่องไหนใช้กับเมนูไหน
  const SLOTS = Object.keys(BASE);
  const st = () => (App.DATA.settings = App.DATA.settings || {});

  // ---------- สี ----------
  const rgb = (h) => { const n = parseInt(String(h).slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  const hex = (a) => `#${a.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("")}`;
  const mix = (c, w, other) => { const a = rgb(c), b = rgb(other); return hex(a.map((v, i) => v * w + b[i] * (1 - w))); };
  const shade = (pal) => {
    const light = App.paletteTone(pal) === "light";
    return {
      light,
      deep: (c) => (light ? mix(c, 0.46, "#1e1a3a") : mix(c, 0.58, "#14112b")),
      tint: (c) => (light ? mix(c, 0.16, "#ffffff") : mix(c, 0.12, "#ffffff")),
      ico: (c) => (light ? mix(c, 0.78, "#2a2550") : c),
      paper: mix(pal.violet, 0.05, "#fafafc"),
    };
  };
  const hsl = (h, s, l) => { // → hex
    s /= 100; l /= 100;
    const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    return hex([0, 8, 4].map((n) => 255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)))));
  };

  // ---------- ตัวอย่างย่อ ----------
  const svg = (key, style, c, sh, px) => {
    const p = App.ICON_PATHS[key] || App.ICON_PATHS[String(key).replace(/^admin\//, "")] || "";
    if (style === "bar") return `<span style="width:${px * 0.3}px;height:${px * 0.75}px;border-radius:3px;background:${c};flex:none"></span>`;
    const box = style === "tile" ? `background:${sh.tint(c)};border-radius:${px * 0.3}px;padding:${px * 0.17}px;width:${px}px;height:${px}px`
      : style === "solid" ? `background:${c};border-radius:50%;padding:${px * 0.2}px;width:${px}px;height:${px}px`
      : `width:${px * 0.75}px;height:${px * 0.75}px`;
    const stroke = style === "tile" ? sh.deep(c) : style === "solid" ? (sh.light ? sh.deep(c) : "#fff") : sh.ico(c);
    return `<svg viewBox="0 0 24 24" style="${box};box-sizing:border-box;flex:none;fill:none;stroke:${stroke};stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round" aria-hidden="true">${p}</svg>`;
  };
  const ROWS = [["admin", "แดชบอร์ด", "violet"], ["admin/schedule", "ตารางสอน", "sky"], ["admin/attendance", "นักเรียน", "orange"], ["admin/orders", "คำสั่ง", "coral"], ["admin/certificates", "เกียรติบัตร", "gold"]];
  // size: "sm" การ์ดเล็ก, "lg" ตัวอย่างใหญ่
  function preview(pal, iconStyle = "line", size = "sm", icons = {}) {
    const sh = shade(pal), lg = size === "lg";
    const px = lg ? 26 : 15, fs = lg ? 13 : 0;
    const row = ([route, label, slot], i) => `<div style="display:flex;align-items:center;gap:${lg ? 9 : 5}px;padding:${lg ? "6px 8px" : "3px 4px"};border-radius:${lg ? 9 : 5}px;${i === 0 ? `background:${sh.tint(pal[slot])}` : ""}">
      ${svg(icons[route] || route, iconStyle, pal[slot], sh, px)}${lg ? `<span style="font-size:${fs}px;color:${i === 0 ? sh.deep(pal[slot]) : "#2b2840"};font-weight:${i === 0 ? 600 : 500};white-space:nowrap">${label}</span>` : `<span style="height:5px;flex:1;border-radius:3px;background:#e4e2ec"></span>`}</div>`;
    const tile = (slot, n) => `<div style="flex:1;border-radius:${lg ? 10 : 6}px;background:${sh.tint(pal[slot])};padding:${lg ? "8px 10px" : "4px 5px"};position:relative;overflow:hidden">
      <span style="position:absolute;right:-${lg ? 8 : 5}px;top:-${lg ? 8 : 5}px;width:${lg ? 26 : 14}px;height:${lg ? 26 : 14}px;border-radius:50%;background:${pal[slot]}"></span>
      ${lg ? `<b style="font-size:18px;color:${sh.deep(pal[slot])}">${n}</b>` : `<span style="display:block;width:45%;height:6px;border-radius:3px;background:${sh.deep(pal[slot])}"></span>`}</div>`;
    const cell = (t) => `<span style="flex:1;border-radius:${lg ? 7 : 4}px;background:${pal.sky};color:${sh.light ? mix(pal.sky, 0.28, "#1a1733") : "#fff"};font-size:${lg ? 11 : 0}px;font-weight:600;padding:${lg ? "6px 0" : "5px 0"};text-align:center">${lg ? t : ""}</span>`;
    return `<div class="tp ${size}" style="display:flex;gap:${lg ? 12 : 6}px;padding:${lg ? 12 : 6}px;border-radius:${lg ? 16 : 10}px;background:${sh.paper};border:1px solid ${mix(pal.violet, 0.12, "#eceaf2")}">
      <div style="width:${lg ? 36 : 40}%;background:#fff;border-radius:${lg ? 12 : 7}px;padding:${lg ? 6 : 3}px;display:flex;flex-direction:column;gap:${lg ? 2 : 1}px">${ROWS.map(row).join("")}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:${lg ? 9 : 5}px;min-width:0">
        <div style="border-radius:${lg ? 12 : 7}px;background:${sh.tint(pal.violet)};padding:${lg ? "12px 14px" : "7px"};position:relative;overflow:hidden">
          <span style="position:absolute;right:-${lg ? 18 : 10}px;top:-${lg ? 22 : 12}px;width:${lg ? 70 : 34}px;height:${lg ? 70 : 34}px;border-radius:50%;background:${pal.violet}"></span>
          ${lg ? `<b style="position:relative;font-size:16px;color:${sh.deep(pal.violet)}">สวัสดี คุณครู</b><div style="position:relative;margin-top:8px"><span style="display:inline-block;background:${sh.deep(pal.violet)};color:#fff;font-size:11px;font-weight:600;padding:5px 10px;border-radius:8px">+ เพิ่มงาน</span></div>`
            : `<span style="display:block;width:55%;height:7px;border-radius:4px;background:${sh.deep(pal.violet)}"></span><span style="display:block;width:30%;height:9px;border-radius:4px;background:${sh.deep(pal.violet)};margin-top:5px"></span>`}
        </div>
        <div style="display:flex;gap:${lg ? 8 : 4}px">${tile("sky", 3)}${tile("coral", 4)}${tile("mint", 44)}</div>
        <div style="display:flex;gap:${lg ? 5 : 3}px">${cell("ค15101")}${cell("ป.5/1")}${lg ? cell("ว16101") : ""}</div>
      </div></div>`;
  }
  const curIcons = () => Object.fromEntries(Object.entries(st().menus || {}).filter(([, m]) => m.icon).map(([r, m]) => [r, m.icon]));

  // ---------- หน้าแท็บ ----------
  App.themeSettings = () => {
    const s = st(), pal = App.activePalette(s), style = App.ICON_STYLES[s.iconStyle] ? s.iconStyle : "line";
    const curTheme = s.theme === "custom" ? "custom" : App.THEMES[s.theme] ? s.theme : "bright";
    const icons = curIcons();
    const presets = Object.entries(App.THEMES).map(([k, t]) => `<button type="button" class="tp-card" data-act="themePick" data-v="${k}" aria-pressed="${curTheme === k}">
      ${preview(t.palette, style, "sm", icons)}<b>${esc(t.name)}</b><small>${esc(t.note)}</small></button>`).join("");
    const customPal = s.palette ? App.activePalette({ theme: "custom", palette: s.palette }) : null;
    const custom = `<button type="button" class="tp-card tp-custom" data-act="themeCustom" aria-pressed="${curTheme === "custom"}">
      ${customPal ? preview(customPal, style, "sm", icons) : `<span class="tp-plus">+</span>`}<b>กำหนดเอง</b><small>${customPal ? "แตะเพื่อแก้สี" : "เลือกสีเองทุกช่อง"}</small></button>`;
    const styles = Object.entries(App.ICON_STYLES).map(([k, name]) => {
      const sh = shade(pal);
      return `<button type="button" class="tp-card tp-icon" data-act="iconStylePick" data-v="${k}" aria-pressed="${style === k}">
        <span class="tp-icons">${ROWS.slice(1, 5).map(([r, , slot]) => svg(icons[r] || r, k, pal[slot], sh, 26)).join("")}</span><b>${esc(name)}</b></button>`;
    }).join("");
    const nIcons = Object.keys(icons).length;
    return `<div class="tp-wrap">
      <section class="panel tp-live"><h2>ตัวอย่าง</h2>${preview(pal, style, "lg", icons)}
        <p class="meta">${esc(curTheme === "custom" ? "กำหนดสีเอง" : App.THEMES[curTheme].name)} · ไอคอน${esc(App.ICON_STYLES[style])}${nIcons ? ` · เปลี่ยนไอคอนเอง ${nIcons} เมนู` : ""}</p></section>
      <section class="panel"><h2>ชุดสี</h2><div class="tp-grid">${presets}${custom}</div>
        <p class="meta">แตะเพื่อใช้ทันที สีเมนูที่ตั้งเองในแท็บ "เมนู" ไม่เปลี่ยนตาม รูปเล่ม SAR เป็นขาวดำเหมือนเดิม</p></section>
      <section class="panel"><h2>สไตล์ไอคอน</h2><div class="tp-grid icons">${styles}</div></section>
      <section class="panel"><h2 class="row-head">ไอคอนแต่ละเมนู ${nIcons ? `<button class="btn ghost small" data-act="iconReset">คืนไอคอนตั้งต้นทั้งหมด</button>` : ""}</h2>
        <p>ไปที่แท็บ <a href="#/settings?tag=${encodeURIComponent("เมนู")}">เมนู</a> แล้วกด "ปรับ" ที่เมนูไหนก็ได้ เลือกไอคอนจาก ${Object.keys(App.ICON_PATHS).length} แบบ เปลี่ยนชื่อและสีเมนูได้ในหน้าเดียวกัน</p></section>
    </div>`;
  };

  // ---------- การกระทำ ----------
  const A = App.actions;
  const apply = async (mutate, msg) => {
    const s = st(), backup = JSON.stringify(s);
    mutate(s);
    App.applySettings(); $("#nav").innerHTML = ""; render();
    try { await saveKV("settings"); if (msg) toast(msg); }
    catch (e) { App.DATA.settings = JSON.parse(backup); App.applySettings(); $("#nav").innerHTML = ""; render(); toast(e.message); }
  };
  A.themePick = (b) => apply((s) => { s.theme = b.dataset.v === "bright" ? undefined : b.dataset.v; }, `ใช้ชุดสี${App.THEMES[b.dataset.v].name}แล้ว`);
  A.iconStylePick = (b) => apply((s) => { s.iconStyle = b.dataset.v === "line" ? undefined : b.dataset.v; }, `ไอคอนแบบ${App.ICON_STYLES[b.dataset.v]}`);
  A.iconReset = () => {
    if (!confirm("คืนไอคอนตั้งต้นให้ทุกเมนู? (ชื่อและสีเมนูที่ตั้งเองยังอยู่)")) return;
    apply((s) => { for (const m of Object.values(s.menus || {})) delete m.icon; }, "คืนไอคอนตั้งต้นแล้ว");
  };

  // กำหนดสีเอง: ทุกช่องมีป้ายบอกว่าใช้กับเมนูไหน ตัวอย่างเปลี่ยนตามทันทีที่เลือกสี
  const usedBy = (slot) => {
    const labels = Object.values(App.navBase()).flat().flatMap((g) => g.items).filter((i) => i.c.toLowerCase() === BASE[slot].toLowerCase()).map((i) => i.label);
    return [...new Set(labels)];
  };
  A.themeCustom = () => {
    const s = st(), start = App.activePalette(s);
    const slots = [...SLOTS].sort((a, b) => usedBy(b).length - usedBy(a).length);
    const fields = slots.map((k, i) => {
      const u = usedBy(k);
      const use = u.length ? `ใช้กับ ${u.slice(0, 3).join(", ")}${u.length > 3 ? ` และอีก ${u.length - 3} เมนู` : ""}` : "ใช้ในกราฟและป้ายต่าง ๆ";
      return { key: k, label: `${i === 0 ? "สีหลัก" : `สีที่ ${i + 1}`}<small class="tp-use">${esc(use)}</small>`, type: "color", value: start[k] };
    });
    openForm("กำหนดสีเอง", fields, async (r) => {
      await apply((x) => { x.theme = "custom"; x.palette = Object.fromEntries(SLOTS.map((k) => [k, r[k]])); }, "ใช้สีที่กำหนดเองแล้ว");
    });
    const box = $("#sheetFields"), form = $("#sheetForm");
    const read = () => Object.fromEntries(SLOTS.map((k) => [k, document.getElementById(`f_${k}`)?.value || start[k]]));
    box.insertAdjacentHTML("afterbegin", `<div class="tp-editor"><div id="tpLive">${preview(start, s.iconStyle || "line", "lg", curIcons())}</div>
      <div class="tp-tools"><span class="meta">เริ่มจาก</span>
        <select id="tpFrom" aria-label="เริ่มจากชุดสี"><option value="">ชุดสีปัจจุบัน</option>${Object.entries(App.THEMES).map(([k, t]) => `<option value="${k}">${esc(t.name)}</option>`).join("")}</select>
        <button type="button" class="btn ghost small" data-rand="vivid">🎲 สุ่มสีสด</button><button type="button" class="btn ghost small" data-rand="pastel">🎲 สุ่มพาสเทล</button></div></div>`);
    const set = (pal) => SLOTS.forEach((k) => { const el = document.getElementById(`f_${k}`); if (el) { el.value = pal[k]; el.dispatchEvent(new Event("input", { bubbles: true })); } });
    const redraw = () => { $("#tpLive").innerHTML = preview(read(), s.iconStyle || "line", "lg", curIcons()); };
    form.addEventListener("input", redraw);
    form.addEventListener("change", redraw);
    $("#tpFrom").onchange = (e) => { if (e.target.value) set(App.THEMES[e.target.value].palette); };
    box.querySelectorAll("[data-rand]").forEach((btn) => btn.onclick = () => {
      const pastel = btn.dataset.rand === "pastel", h0 = Math.random() * 360;
      // สีหลัก + สีอื่นหมุนรอบวงล้อสี ระยะเท่า ๆ กัน ได้ชุดที่เข้ากัน
      const pal = Object.fromEntries(slots.map((k, i) => [k, k === "slate" ? hsl(h0, 12, pastel ? 72 : 46)
        : hsl((h0 + i * 137.5) % 360, pastel ? 70 : 68, pastel ? 76 : 48)]));
      set(pal);
    });
  };

  // ตารางเลือกไอคอนในฟอร์ม "ปรับเมนู"
  App.iconPicker = (route) => {
    const input = document.getElementById("f_icon");
    if (!input) return;
    const cell = input.closest(".ios-cell");
    cell.style.display = "none";
    const def = route.replace(/^admin\//, "") || "";
    const color = document.getElementById("f_c")?.value || COLOR(route);
    const keys = [...new Set(Object.keys(App.ICON_PATHS).filter((k) => k !== "reports"))];
    const grid = document.createElement("div");
    grid.className = "icon-pick";
    grid.style.setProperty("--c", color);
    const cur = () => input.value || def;
    const draw = () => {
      grid.innerHTML = `<div class="icon-pick-h">ไอคอน</div><div class="icon-pick-grid">${keys.map((k) => `<button type="button" data-k="${esc(k)}" aria-pressed="${cur() === k}" aria-label="ไอคอน ${esc(k)}">
        <svg viewBox="0 0 24 24" aria-hidden="true">${App.ICON_PATHS[k]}</svg></button>`).join("")}</div>`;
    };
    draw();
    grid.addEventListener("click", (e) => {
      const b = e.target.closest("[data-k]");
      if (!b) return;
      input.value = b.dataset.k === def ? "" : b.dataset.k;
      draw();
    });
    document.getElementById("f_c")?.addEventListener("input", (e) => grid.style.setProperty("--c", e.target.value));
    cell.after(grid);
  };
})();
