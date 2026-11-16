// ส่วนประกอบหน้าจอแบบ iOS: Wheel / Date / Time / Number Picker, Toggle, Segmented, Checkbox, Radio, Text Field
// ใช้ผ่าน iOS.field(f, id, value) → HTML และ iOS.wire(container) → ผูกการทำงาน
// ค่าจริงเก็บใน <input type="hidden" name=...> เพื่อให้ FormData อ่านได้เหมือนเดิม
(() => {
  const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
  const ITEM_H = 40;
  const e = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  const todayISO = () => new Date().toLocaleDateString("sv-SE");
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- รูปแบบการแสดงค่า ----------
  const fmtDate = (iso) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`;
  };
  const numFmt = (v, f) => (v === "" || v === undefined || v === null ? "" : `${Number(v).toLocaleString("th-TH")}${f.unit ? ` ${f.unit}` : ""}`);

  // ---------- Wheel (ใช้ร่วมกันทุก picker) ----------
  // columns: [{ items: [{ label, value }], value, width? }]  คืน Promise<ค่าที่เลือก[] | null>
  function wheel({ title, columns, footer = "", onChange }) {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "ios-picker";
      dlg.innerHTML = `
        <div class="ios-picker-bar"><button type="button" class="ios-bar-btn" data-x="cancel">ยกเลิก</button>
          <b>${e(title || "")}</b><button type="button" class="ios-bar-btn strong" data-x="done">เสร็จ</button></div>
        <div class="ios-wheels">${columns.map((c, i) => `<div class="ios-wheel" tabindex="0" role="listbox" aria-label="${e(c.label || title || "")}" data-col="${i}" style="${c.width ? `flex:${c.width}` : ""}"><div class="ios-wheel-pad"></div><div class="ios-wheel-items"></div><div class="ios-wheel-pad"></div></div>`).join("")}
          <div class="ios-wheel-band" aria-hidden="true"></div></div>
        ${footer ? `<div class="ios-picker-foot">${footer}</div>` : ""}`;
      document.body.appendChild(dlg);
      const cols = [...dlg.querySelectorAll(".ios-wheel")];
      const state = columns.map((c) => ({ ...c }));

      const render = (ci) => {
        const col = cols[ci];
        col.querySelector(".ios-wheel-items").innerHTML = state[ci].items
          .map((it, i) => `<div class="ios-wheel-item" role="option" data-i="${i}">${e(it.label)}</div>`).join("");
      };
      const indexOf = (ci) => Math.max(0, state[ci].items.findIndex((it) => String(it.value) === String(state[ci].value)));
      const paint = (ci) => {
        const col = cols[ci];
        const center = col.scrollTop / ITEM_H;
        col.querySelectorAll(".ios-wheel-item").forEach((el, i) => {
          const d = i - center;
          const a = Math.max(-1, Math.min(1, d / 4));
          el.style.transform = `rotateX(${-a * 70}deg) translateZ(0)`;
          el.style.opacity = String(Math.max(0.15, 1 - Math.abs(d) * 0.22));
          el.classList.toggle("on", Math.round(center) === i);
          el.setAttribute("aria-selected", Math.round(center) === i ? "true" : "false");
        });
      };
      const settle = (ci) => {
        const i = Math.max(0, Math.min(state[ci].items.length - 1, Math.round(cols[ci].scrollTop / ITEM_H)));
        const changed = String(state[ci].value) !== String(state[ci].items[i]?.value);
        state[ci].value = state[ci].items[i]?.value;
        if (changed && navigator.vibrate) navigator.vibrate(4);
        if (changed && onChange) {
          const upd = onChange(state.map((s) => s.value), ci);
          if (upd) upd.forEach((u, j) => {
            if (!u) return;
            state[j].items = u.items;
            if (!u.items.some((it) => String(it.value) === String(state[j].value))) state[j].value = u.items.at(-1).value;
            render(j); scrollTo(j, false);
          });
        }
      };
      const scrollTo = (ci, smooth = true) => {
        cols[ci].scrollTo({ top: indexOf(ci) * ITEM_H, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
        paint(ci);
      };

      cols.forEach((col, ci) => {
        render(ci);
        let raf, timer;
        col.addEventListener("scroll", () => {
          cancelAnimationFrame(raf); raf = requestAnimationFrame(() => paint(ci));
          clearTimeout(timer); timer = setTimeout(() => settle(ci), 90);
        });
        col.addEventListener("click", (ev) => {
          const it = ev.target.closest(".ios-wheel-item");
          if (!it) return;
          state[ci].value = state[ci].items[Number(it.dataset.i)].value;
          scrollTo(ci);
        });
        col.addEventListener("keydown", (ev) => {
          if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(ev.key)) return;
          ev.preventDefault();
          const n = state[ci].items.length;
          let i = indexOf(ci);
          i = ev.key === "ArrowUp" ? i - 1 : ev.key === "ArrowDown" ? i + 1 : ev.key === "PageUp" ? i - 5 : ev.key === "PageDown" ? i + 5 : ev.key === "Home" ? 0 : n - 1;
          state[ci].value = state[ci].items[Math.max(0, Math.min(n - 1, i))].value;
          scrollTo(ci);
        });
      });

      const close = (result) => {
        dlg.classList.add("closing");
        setTimeout(() => { dlg.close(); dlg.remove(); resolve(result); }, reduceMotion() ? 0 : 180);
      };
      dlg.addEventListener("click", (ev) => {
        const x = ev.target.closest("[data-x]")?.dataset.x;
        if (x === "cancel") close(null);
        else if (x === "done") { cols.forEach((_, ci) => settle(ci)); close(state.map((s) => s.value)); }
        else if (x && dlg._extra?.[x]) dlg._extra[x](state, (vals) => { vals.forEach((v, j) => { state[j].value = v; scrollTo(j); }); });
        else if (ev.target === dlg) close(null);
      });
      dlg.addEventListener("cancel", (ev) => { ev.preventDefault(); close(null); });
      dlg._setExtra = (o) => (dlg._extra = o);
      wheel.current = dlg;
      dlg.showModal();
      requestAnimationFrame(() => { cols.forEach((_, ci) => scrollTo(ci, false)); cols[0]?.focus({ preventScroll: true }); });
    });
  }

  // ---------- Picker เฉพาะทาง ----------
  const range = (a, b, step = 1, fmt = (x) => x) => {
    const out = [];
    for (let x = a; x <= b + 1e-9; x = Math.round((x + step) * 1000) / 1000) out.push({ label: fmt(x), value: x });
    return out;
  };
  const daysIn = (y, m) => new Date(y, m, 0).getDate();

  async function pickDate(iso, title = "เลือกวันที่") {
    const base = /^\d{4}-\d{2}-\d{2}$/.test(iso || "") ? iso : todayISO();
    let [y, m, d] = base.split("-").map(Number);
    const nowY = new Date().getFullYear();
    const p = wheel({
      title,
      columns: [
        { label: "วัน", items: range(1, daysIn(y, m)), value: d, width: 0.8 },
        { label: "เดือน", items: TH_MONTHS.map((t, i) => ({ label: t, value: i + 1 })), value: m, width: 1.8 },
        { label: "ปี พ.ศ.", items: range(nowY - 70, nowY + 5, 1, (x) => x + 543), value: y, width: 1 },
      ],
      footer: `<button type="button" class="ios-chip" data-x="today">วันนี้</button>`,
      onChange: ([dd, mm, yy], ci) => (ci === 0 ? null : [{ items: range(1, daysIn(yy, mm)) }, null, null]),
    });
    wheel.current._setExtra({ today: (_, set) => { const [a, b, c] = todayISO().split("-").map(Number); set([c, b, a]); } });
    const r = await p;
    if (!r) return null;
    [d, m, y] = r;
    return `${y}-${pad(m)}-${pad(Math.min(d, daysIn(y, m)))}`;
  }

  const timeCols = (t, label = "") => {
    const [h, mi] = /^\d{1,2}:\d{2}$/.test(t || "") ? t.split(":").map(Number) : [8, 0];
    return [
      { label: `${label}ชั่วโมง`, items: range(0, 23, 1, pad), value: h },
      { label: `${label}นาที`, items: range(0, 55, 5, pad), value: Math.round(mi / 5) * 5 % 60 },
    ];
  };
  async function pickTime(t, title = "เลือกเวลา") {
    const r = await wheel({ title, columns: timeCols(t) });
    return r ? `${pad(r[0])}:${pad(r[1])}` : null;
  }
  async function pickTimeRange(v, title = "เวลาเริ่ม – เวลาเลิก") {
    const [a = "08:30", b = "09:20"] = String(v || "").split(/[–-]/).map((x) => x.trim());
    const cols = [...timeCols(a, "เริ่ม "), ...timeCols(b, "เลิก ")];
    cols[1].width = 1; cols[2].width = 1;
    const r = await wheel({ title, columns: cols, footer: `<span class="ios-range-hint">เริ่ม</span><span class="ios-range-hint">ถึง</span>` });
    return r ? `${pad(r[0])}:${pad(r[1])}–${pad(r[2])}:${pad(r[3])}` : null;
  }
  async function pickNumber(f, v) {
    const min = f.min ?? 0, max = f.max ?? 100, step = f.step ?? 1;
    const fmt = (x) => `${x.toLocaleString("th-TH")}${f.unit ? ` ${f.unit}` : ""}`;
    const cur = v === "" || v === undefined ? (f.start ?? min) : Number(v);
    const r = await wheel({ title: f.label, columns: [{ items: range(min, max, step, fmt), value: Math.min(max, Math.max(min, Math.round(cur / step) * step)) }] });
    return r ? r[0] : null;
  }
  async function pickOption(f, v) {
    const r = await wheel({ title: f.label, columns: [{ items: f.options.map((o) => ({ label: o, value: o })), value: v || f.options[0] }] });
    return r ? r[0] : null;
  }

  // ---------- เลือกชนิดตัวควบคุม ----------
  // options ≤ 4 สั้นๆ → Segmented | 5–6 → Radio | มากกว่านั้น → Wheel
  const kindOf = (f) => {
    if (f.type === "file") return "file";
    if (f.type === "gallery") return "gallery";
    if (f.toggle) return "toggle";
    if (f.type === "check") return "check";
    if (f.options) {
      const total = f.options.join("").length;
      if (f.options.length <= 4 && total <= 32 && !f.wheel) return "segment";
      if (f.options.length <= 6 && !f.wheel) return "radio";
      return "wheel";
    }
    if (f.type === "date") return "date";
    if (f.type === "time") return "time";
    if (f.type === "timerange") return "timerange";
    if (f.type === "number" && f.wheel !== false && (f.max ?? 100) - (f.min ?? 0) <= 500 * (f.step ?? 1)) return "number";
    if (f.type === "textarea") return "textarea";
    if (f.type === "color") return "color";
    return "text";
  };

  const hidden = (f, id, v) => `<input type="hidden" id="${id}" name="${f.key}" value="${e(v)}" ${f.required ? "data-required" : ""}>`;
  const head = (f) => `<span class="ios-label">${f.label}${f.required ? ' <i class="req" aria-label="จำเป็น">*</i>' : ""}</span>${f.hint ? `<small class="ios-hint">${f.hint}</small>` : ""}`;
  const chev = `<svg class="ios-chev" viewBox="0 0 8 14" aria-hidden="true"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const display = (k, f, v) =>
    k === "date" ? fmtDate(v) : k === "number" ? numFmt(v, f) : k === "timerange" ? (v || "").replace("-", "–") : v;

  function field(f, id, val) {
    const v = val ?? "";
    const k = kindOf(f);
    switch (k) {
      case "toggle": {
        const on = String(v) === String(f.toggle.on);
        return `<div class="ios-cell ios-row">${head(f)}
          <button type="button" class="ios-switch" role="switch" aria-checked="${on}" data-on="${e(f.toggle.on)}" data-off="${e(f.toggle.off)}" data-target="${id}" aria-label="${e(f.label)}"><span></span></button>
          ${hidden(f, id, on ? f.toggle.on : f.toggle.off)}</div>`;
      }
      case "check": {
        const on = v === true || v === "true" || v === "1";
        return `<label class="ios-cell ios-row ios-check-row">${head(f)}<input type="checkbox" class="ios-check" ${on ? "checked" : ""} data-target="${id}">${hidden(f, id, on ? "1" : "")}</label>`;
      }
      case "segment":
        return `<div class="ios-cell">${head(f)}<div class="ios-seg" role="radiogroup" aria-label="${e(f.label)}" data-target="${id}" style="--n:${f.options.length}">
          <span class="ios-seg-thumb"></span>${f.options.map((o) => `<button type="button" role="radio" aria-checked="${String(o) === String(v)}" data-v="${e(o)}">${e(o)}</button>`).join("")}</div>
          ${hidden(f, id, v || f.options[0])}</div>`;
      case "radio":
        return `<div class="ios-cell ios-radio-cell">${head(f)}<div class="ios-radios" role="radiogroup" aria-label="${e(f.label)}" data-target="${id}">
          ${f.options.map((o) => `<button type="button" class="ios-radio" role="radio" aria-checked="${String(o) === String(v || f.options[0])}" data-v="${e(o)}"><span>${e(o)}</span><svg viewBox="0 0 16 12" aria-hidden="true"><path d="M1.5 6.5l4 4 9-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`).join("")}
          </div>${hidden(f, id, v || f.options[0])}</div>`;
      case "wheel": case "date": case "time": case "timerange": case "number": {
        const shown = display(k, f, k === "wheel" ? v || f.options[0] : v);
        return `<div class="ios-cell ios-row">${head(f)}
          <button type="button" class="ios-value" data-kind="${k}" data-target="${id}" data-field='${e(JSON.stringify({ label: f.label, min: f.min, max: f.max, step: f.step, unit: f.unit, start: f.start, options: f.options }))}'>
            <span class="${shown ? "" : "ph"}">${e(shown || f.placeholder || "เลือก")}</span>${chev}</button>
          ${k !== "wheel" && !f.required ? `<button type="button" class="ios-clear" data-clear="${id}" aria-label="ล้างค่า" ${v === "" ? "hidden" : ""}>×</button>` : ""}
          ${hidden(f, id, k === "wheel" ? v || f.options[0] : v)}</div>`;
      }
      case "textarea":
        return `<label class="ios-cell" for="${id}">${head(f)}<textarea id="${id}" name="${f.key}" rows="${f.rows || 3}" ${f.required ? "required" : ""} placeholder="${e(f.placeholder || "")}">${e(v)}</textarea></label>`;
      case "color":
        return `<label class="ios-cell ios-row" for="${id}">${head(f)}<input id="${id}" name="${f.key}" type="color" value="${e(v || "#6c4cf1")}" class="ios-color"></label>`;
      case "file":
        return `<div class="ios-cell">${fileField(f, id, v)}</div>`;
      case "gallery":
        return `<div class="ios-cell">${window.galleryField(f, id, v)}</div>`;
      default: {
        const t = f.type === "number" ? "text" : f.type || "text";
        const mode = f.type === "number" ? 'inputmode="decimal" pattern="[0-9.,]*"' : f.type === "email" ? 'inputmode="email" autocapitalize="off"' : f.type === "url" ? 'inputmode="url" autocapitalize="off"' : "";
        return `<label class="ios-cell ios-text" for="${id}">${head(f)}<span class="ios-input-wrap">
          <input id="${id}" name="${f.key}" type="${t}" ${mode} ${f.required ? "required" : ""} value="${e(v)}" placeholder="${e(f.placeholder || "")}" autocomplete="${e(f.autocomplete || "off")}">
          <button type="button" class="ios-clear" data-clear="${id}" aria-label="ล้างข้อความ" ${v === "" ? "hidden" : ""}>×</button></span></label>`;
      }
    }
  }

  // ---------- ผูกการทำงาน ----------
  function setHidden(input, value) {
    input.value = value ?? "";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function moveThumb(seg) {
    const btns = [...seg.querySelectorAll("button")];
    const i = Math.max(0, btns.findIndex((b) => b.getAttribute("aria-checked") === "true"));
    seg.style.setProperty("--i", i);
  }

  function wire(root) {
    root.querySelectorAll(".ios-switch").forEach((sw) => {
      const input = document.getElementById(sw.dataset.target);
      sw.onclick = () => {
        const on = sw.getAttribute("aria-checked") !== "true";
        sw.setAttribute("aria-checked", String(on));
        setHidden(input, on ? sw.dataset.on : sw.dataset.off);
      };
    });
    root.querySelectorAll(".ios-check[data-target]").forEach((c) => {
      c.onchange = () => setHidden(document.getElementById(c.dataset.target), c.checked ? "1" : "");
    });
    root.querySelectorAll(".ios-seg").forEach((seg) => {
      const input = document.getElementById(seg.dataset.target);
      if (!seg.querySelector('[aria-checked="true"]')) seg.querySelector("button")?.setAttribute("aria-checked", "true");
      moveThumb(seg);
      seg.onclick = (ev) => {
        const b = ev.target.closest("button[data-v]");
        if (!b) return;
        seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
        moveThumb(seg);
        setHidden(input, b.dataset.v);
      };
      seg.onkeydown = (ev) => {
        if (!["ArrowLeft", "ArrowRight"].includes(ev.key)) return;
        const btns = [...seg.querySelectorAll("button")];
        const i = btns.findIndex((b) => b.getAttribute("aria-checked") === "true");
        const n = btns[(i + (ev.key === "ArrowRight" ? 1 : -1) + btns.length) % btns.length];
        n.click(); n.focus();
      };
    });
    root.querySelectorAll(".ios-radios").forEach((g) => {
      const input = document.getElementById(g.dataset.target);
      g.onclick = (ev) => {
        const b = ev.target.closest(".ios-radio");
        if (!b) return;
        g.querySelectorAll(".ios-radio").forEach((x) => x.setAttribute("aria-checked", String(x === b)));
        setHidden(input, b.dataset.v);
      };
    });
    root.querySelectorAll(".ios-value").forEach((btn) => {
      const input = document.getElementById(btn.dataset.target);
      const f = JSON.parse(btn.dataset.field);
      const k = btn.dataset.kind;
      const clear = root.querySelector(`[data-clear="${btn.dataset.target}"]`);
      const show = () => {
        const s = display(k, f, input.value);
        btn.firstElementChild.textContent = s || "เลือก";
        btn.firstElementChild.className = s ? "" : "ph";
        if (clear) clear.hidden = !input.value;
      };
      btn.onclick = async () => {
        const v = input.value;
        const r = k === "date" ? await pickDate(v, f.label) : k === "time" ? await pickTime(v, f.label)
          : k === "timerange" ? await pickTimeRange(v, f.label) : k === "number" ? await pickNumber(f, v) : await pickOption(f, v);
        if (r === null) return;
        setHidden(input, r);
        show();
        btn.focus();
      };
      input.addEventListener("input", show);
    });
    root.querySelectorAll(".ios-clear").forEach((c) => {
      const input = document.getElementById(c.dataset.clear);
      c.onclick = (ev) => { ev.preventDefault(); setHidden(input, ""); if (input.type !== "hidden") input.focus(); };
      if (input.type !== "hidden") input.addEventListener("input", () => (c.hidden = !input.value));
    });
  }

  // ตรวจช่องจำเป็นที่เป็น picker (input hidden ตรวจด้วยเบราว์เซอร์ไม่ได้)
  function missingRequired(root) {
    const miss = [...root.querySelectorAll("input[type=hidden][data-required]")].find((i) => !i.value);
    if (!miss) return null;
    const cell = miss.closest(".ios-cell");
    cell?.classList.add("shake");
    setTimeout(() => cell?.classList.remove("shake"), 500);
    cell?.querySelector("button, input")?.focus();
    return cell?.querySelector(".ios-label")?.textContent.replace("*", "").trim() || "ช่องที่จำเป็น";
  }

  window.iOS = { field, wire, wheel, pickDate, pickTime, pickTimeRange, pickNumber, pickOption, missingRequired, fmtDate };
})();
