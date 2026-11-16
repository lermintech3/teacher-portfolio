// แฟ้มสะสมผลงานครู — หน้าสาธารณะ (ระยะ 1)
// ระยะ 1 อ่านข้อมูลจากไฟล์ JSON  ระยะ 2 จะเปลี่ยน DATA_URL เป็น API ที่ต่อกับฐานข้อมูล D1
const DATA_URL = "/data/profile.json";
const DAYS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์"];

const $ = (sel) => document.querySelector(sel);
const main = $("#main");
let DATA = null;

// ---------- helpers ----------
const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const safeUrl = (u) => (/^(https?:\/\/|\/)/i.test(u || "") ? u : "");

const thDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? esc(iso) : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
};

// ปีการศึกษาไทย: เริ่ม 16 พ.ค. สิ้นสุด 15 พ.ค. ปีถัดไป
const academicYear = (iso) => {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return "";
  const y = d.getFullYear() + 543;
  const beforeMay16 = d.getMonth() < 4 || (d.getMonth() === 4 && d.getDate() < 16);
  return String(beforeMay16 ? y - 1 : y);
};

const initials = (name) => (name || "?").trim().charAt(0);
const list = (key) => (Array.isArray(DATA?.[key]) ? DATA[key] : []);
const byDateDesc = (a, b) => String(b.date || "").localeCompare(String(a.date || ""));
const empty = (msg = "ยังไม่มีข้อมูล") => `<p class="empty">${msg}</p>`;

const head = (title, sub = "") => `<header class="band"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ""}</header>`;
const COLOR = (route) => document.querySelector(`.nav a[data-route="${route}"]`)?.style.getPropertyValue("--c") || "#6c4cf1";

const filterBar = (values, current, attr) =>
  values.length < 2
    ? ""
    : `<div class="filters">${["ทั้งหมด", ...values]
        .map((v) => `<button data-${attr}="${esc(v)}" class="${v === current ? "on" : ""}">${v === "ทั้งหมด" ? v : esc(v)}</button>`)
        .join("")}</div>`;

// ---------- pages ----------
const pages = {
  "": () => {
    const p = DATA.profile || {};
    const hours = list("trainings").reduce((s, t) => s + (Number(t.hours) || 0), 0);
    const photo = safeUrl(p.photo);
    return `
      <header class="band hero">
        <div class="hero-photo ${photo ? "photo" : ""}" style="${photo ? `background-image:url('${esc(photo)}')` : ""}">${photo ? "" : esc(initials(p.name))}</div>
        <div>
          <h1>${esc(p.name)}</h1>
          <div class="who">${esc([p.position, p.academicStanding].filter(Boolean).join(" "))}<br>${esc(p.school)}${p.office ? `<br><span class="meta">${esc(p.office)}</span>` : ""}</div>
          <div class="chips">
            ${p.learningArea ? `<span class="tag solid">${esc(p.learningArea)}</span>` : ""}
            ${(p.subjects || []).map((s) => `<span class="tag solid">${esc(s)}</span>`).join("")}
            ${p.homeroom ? `<span class="tag solid">${esc(p.homeroom)}</span>` : ""}
          </div>
        </div>
      </header>
      ${p.philosophy ? `<blockquote class="quote"><b>ปรัชญาการสอน</b>${esc(p.philosophy)}</blockquote>` : ""}

      <div class="stats">
        <a class="stat" style="--sc:${COLOR("responsibilities")}" href="#/responsibilities"><b>${list("responsibilities").length}</b><span>งานที่รับผิดชอบ</span></a>
        <a class="stat" style="--sc:${COLOR("certificates")}" href="#/certificates"><b>${list("certificates").length}</b><span>เกียรติบัตรและรางวัล</span></a>
        <a class="stat" style="--sc:${COLOR("trainings")}" href="#/trainings"><b>${hours}</b><span>ชั่วโมงพัฒนาตนเอง</span></a>
        <a class="stat" style="--sc:${COLOR("works")}" href="#/works"><b>${list("works").length}</b><span>ผลงานเด่น</span></a>
      </div>

      ${(p.education || []).length ? `
        <h2>ประวัติการศึกษา</h2>
        <div class="stack">${p.education.map((e) => `
          <div class="card item"><div class="item-body"><h3>${esc(e.degree)}</h3><div class="meta">${esc(e.institution)}</div></div>
          <div class="item-side meta">${esc(e.year)}</div></div>`).join("")}</div>` : ""}
      ${p.contactEmail ? `<p class="meta" style="margin-top:24px">ติดต่อ: <a href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a></p>` : ""}
    `;
  },

  responsibilities: (q) => {
    const items = list("responsibilities");
    const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
    const cur = q.type || "ทั้งหมด";
    const shown = items.filter((i) => cur === "ทั้งหมด" || i.type === cur);
    return head("งานที่รับผิดชอบ", "งานตามคำสั่งแต่งตั้ง งานฝ่าย และโครงการ") +
      filterBar(types, cur, "type") +
      (shown.length
        ? `<div class="stack">${shown.map((i) => `
          <div class="card item"><div class="item-body"><h3>${esc(i.title)}</h3>${i.detail ? `<div class="meta">${esc(i.detail)}</div>` : ""}</div>
          <div class="item-side"><span class="tag">${esc(i.type)}</span><div class="meta">ปีการศึกษา ${esc(i.year)}</div></div></div>`).join("")}</div>`
        : empty());
  },

  schedule: () => {
    const s = DATA.schedule || {};
    const periods = s.periods || [];
    const classes = s.classes || [];
    if (!periods.length) return head("ตารางสอน") + empty();
    const cell = (day, no) => {
      const c = classes.filter((x) => x.day === day && Number(x.period) === no);
      return c.length
        ? `<td class="has">${c.map((x) => `<b>${esc(x.subject)}</b>${esc(x.room)}`).join("<br>")}</td>`
        : "<td></td>";
    };
    return head("ตารางสอน", `ภาคเรียนที่ ${esc(s.term)} สอน ${classes.length} คาบต่อสัปดาห์`) + `
      <div class="table-wrap"><table class="sched">
        <thead><tr><th>วัน</th>${periods.map((p) => `<th>คาบ ${esc(p.no)}<small>${esc(p.time)}</small></th>`).join("")}</tr></thead>
        <tbody>${DAYS.map((d) => `<tr><th>${d}</th>${periods.map((p) => cell(d, Number(p.no))).join("")}</tr>`).join("")}</tbody>
      </table></div>`;
  },

  certificates: (q) => {
    const items = [...list("certificates")].sort(byDateDesc);
    const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
    const years = [...new Set(items.map((i) => academicYear(i.date)).filter(Boolean))].sort().reverse();
    const ct = q.type || "ทั้งหมด", cy = q.year || "ทั้งหมด";
    const shown = items.filter((i) => (ct === "ทั้งหมด" || i.type === ct) && (cy === "ทั้งหมด" || academicYear(i.date) === cy));
    return head("เกียรติบัตรและรางวัล", `ทั้งหมด ${items.length} รายการ`) +
      filterBar(types, ct, "type") + filterBar(years, cy, "year") +
      (shown.length
        ? `<div class="grid">${shown.map((i) => {
            const img = safeUrl(i.image);
            return `<div class="card cert">
              <button class="cert-img ${img ? "has-img" : ""}" ${img ? `data-img="${esc(img)}" data-cap="${esc(i.title)}" style="background-image:url('${esc(img)}')"` : "disabled"} aria-label="ดูภาพ ${esc(i.title)}">${img ? "" : "ยังไม่มีภาพ"}</button>
              <div class="cert-body"><span class="tag">${esc(i.type)}</span>${i.level ? ` <span class="tag solid">${esc(i.level)}</span>` : ""}
              <h3>${esc(i.title)}</h3><div class="meta">${esc(i.issuer)}<br>${thDate(i.date)}</div></div></div>`;
          }).join("")}</div>`
        : empty());
  },

  trainings: (q) => {
    const items = [...list("trainings")].sort(byDateDesc);
    const years = [...new Set(items.map((i) => academicYear(i.date)).filter(Boolean))].sort().reverse();
    const cy = q.year || "ทั้งหมด";
    const shown = items.filter((i) => cy === "ทั้งหมด" || academicYear(i.date) === cy);
    const hours = shown.reduce((s, t) => s + (Number(t.hours) || 0), 0);
    return head("การพัฒนาตนเอง", `${shown.length} รายการ รวม ${hours} ชั่วโมง${cy !== "ทั้งหมด" ? ` (ปีการศึกษา ${esc(cy)})` : ""}`) +
      filterBar(years, cy, "year") +
      (shown.length
        ? `<div class="stack">${shown.map((i) => {
            const cert = safeUrl(i.certificate);
            return `<div class="card item"><div class="item-body"><h3>${esc(i.title)}</h3>
              <div class="meta">${esc(i.organizer)}<br>${thDate(i.date)}${i.format ? `, ${esc(i.format)}` : ""}</div>
              ${cert ? `<a href="${esc(cert)}" target="_blank" rel="noopener">ดูเกียรติบัตร</a>` : ""}</div>
              <div class="item-side"><div class="hours">${esc(i.hours)} ชม.</div></div></div>`;
          }).join("")}</div>`
        : empty());
  },

  works: () => {
    const items = list("works");
    return head("ผลงานเด่น", "นวัตกรรม วิจัยในชั้นเรียน และสื่อการสอน") +
      (items.length
        ? `<div class="grid">${items.map((i) => {
            const link = safeUrl(i.link);
            return `<div class="card"><span class="tag">${esc(i.type)}</span> <span class="meta">ปีการศึกษา ${esc(i.year)}</span>
              <h3 style="margin-top:8px">${esc(i.title)}</h3>${i.description ? `<p class="meta">${esc(i.description)}</p>` : ""}
              ${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">ดูผลงาน</a>` : ""}</div>`;
          }).join("")}</div>`
        : empty());
  },

  reports: () => {
    const items = [...list("reports")].sort((a, b) => String(b.year).localeCompare(String(a.year)));
    return head("SAR / PA", "รายงานการประเมินตนเองและรายงานผลตามข้อตกลงในการพัฒนางาน") +
      (items.length
        ? `<div class="stack">${items.map((i) => {
            const link = safeUrl(i.link);
            return `<div class="card item"><div class="item-body"><h3>${esc(i.title)}</h3><div class="meta">ปีการศึกษา ${esc(i.year)}</div></div>
              <div class="item-side"><span class="tag">${esc(i.type)}</span><br>${link ? `<a href="${esc(link)}" target="_blank" rel="noopener">เปิดเอกสาร</a>` : `<span class="meta">ยังไม่เผยแพร่</span>`}</div></div>`;
          }).join("")}</div>`
        : empty());
  },
};

// ---------- router ----------
function parseHash() {
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, qs = ""] = raw.split("?");
  return { route: path in pages ? path : "", q: Object.fromEntries(new URLSearchParams(qs)) };
}

function render() {
  if (!DATA) return;
  const { route, q } = parseHash();
  document.body.style.setProperty("--c", COLOR(route));
  main.innerHTML = pages[route](q);
  document.querySelectorAll(".nav a").forEach((a) => a.classList.toggle("active", a.dataset.route === route));
  const label = document.querySelector(`.nav a[data-route="${route}"]`)?.textContent || "";
  $("#topbarTitle").textContent = label;
  document.title = `${label} · ${DATA.profile?.name || "แฟ้มสะสมผลงานครู"}`;
  document.body.classList.remove("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", "false");
  window.scrollTo(0, 0);
}

// filters + lightbox (event delegation)
main.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  if (btn.dataset.img) {
    $("#lightboxImg").src = btn.dataset.img;
    $("#lightboxImg").alt = btn.dataset.cap || "";
    $("#lightboxCaption").textContent = btn.dataset.cap || "";
    $("#lightbox").showModal();
    return;
  }
  const key = btn.dataset.type !== undefined ? "type" : btn.dataset.year !== undefined ? "year" : null;
  if (!key) return;
  const { route, q } = parseHash();
  const val = btn.dataset[key];
  if (val === "ทั้งหมด") delete q[key]; else q[key] = val;
  const qs = new URLSearchParams(q).toString();
  location.hash = `#/${route}${qs ? "?" + qs : ""}`;
});

$("#lightboxClose").addEventListener("click", () => $("#lightbox").close());
$("#lightbox").addEventListener("click", (e) => { if (e.target.id === "lightbox") $("#lightbox").close(); });

$("#menuBtn").addEventListener("click", () => {
  const open = document.body.classList.toggle("menu-open");
  $("#menuBtn").setAttribute("aria-expanded", String(open));
});
$("#scrim").addEventListener("click", () => document.body.classList.remove("menu-open"));
window.addEventListener("hashchange", render);

// ---------- boot ----------
fetch(DATA_URL, { cache: "no-cache" })
  .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
  .then((data) => {
    DATA = data;
    const p = data.profile || {};
    $("#sideName").textContent = p.name || "";
    $("#sideRole").textContent = [p.position, p.academicStanding].filter(Boolean).join(" ");
    const photo = safeUrl(p.photo);
    const av = $("#sideAvatar");
    if (photo) { av.classList.add("photo"); av.style.backgroundImage = `url('${photo}')`; } else av.textContent = initials(p.name);
    render();
  })
  .catch(() => { main.innerHTML = `<p class="empty">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง</p>`; });
