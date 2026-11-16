// ฟีเจอร์เสริม: สไลด์โชว์ แบนเนอร์ อัลบั้มภาพ กราฟ QR Code วิดีโอการสอน คลังสื่อ แบบประเมินความพึงพอใจ เหรียญความสำเร็จ
// โหลดหลัง admin.js (ใช้ FORMS, list, tools ฯลฯ ที่ประกาศไว้แล้ว)

// ---------- ฟอร์มของเมนูใหม่ ----------
FORMS.albums = { name: "อัลบั้มภาพ", fields: [
  { key: "title", label: "ชื่ออัลบั้ม", required: true, placeholder: "เช่น ค่ายคณิตศาสตร์ 2569" },
  { key: "date", label: "วันที่จัดกิจกรรม", type: "date", value: "today" },
  { key: "description", label: "รายละเอียด", type: "textarea", rows: 2 },
  { key: "photos", label: "รูปภาพ", type: "gallery", category: "albums", hint: "ลากมาวางทีละหลายรูปได้ แตะรูปเพื่อใส่คำบรรยาย" },
  { key: "slideshow", label: "แสดงในสไลด์โชว์หน้าแรก", toggle: { on: "แสดง", off: "ไม่แสดง" }, value: "แสดง" },
  visField] };
FORMS.videos = { name: "วิดีโอการสอน", fields: [
  { key: "title", label: "ชื่อวิดีโอ", required: true },
  { key: "url", label: "ลิงก์ YouTube", type: "url", required: true, placeholder: "https://youtu.be/..." },
  { key: "date", label: "วันที่", type: "date", value: "today" },
  { key: "type", label: "ประเภท", options: ["การสอนจริง", "Open Class", "สื่อการสอน", "กิจกรรม"] },
  { key: "description", label: "รายละเอียด", type: "textarea", rows: 2 }, visField] };
const DEFAULT_SURVEY_Q = ["ครูอธิบายเนื้อหาเข้าใจง่าย", "กิจกรรมการเรียนสนุกและน่าสนใจ", "ครูเปิดโอกาสให้ซักถามและแสดงความคิดเห็น", "สื่อและอุปกรณ์การเรียนเหมาะสม", "ความพึงพอใจโดยรวมต่อการสอน"].join("\n");
FORMS.surveys = { name: "แบบประเมินความพึงพอใจ", fields: [
  { key: "title", label: "ชื่อแบบประเมิน", required: true, value: "แบบประเมินความพึงพอใจต่อการจัดการเรียนรู้" },
  { key: "target", label: "ผู้ประเมิน", options: ["นักเรียน", "ผู้ปกครอง", "เพื่อนครู", "อื่นๆ"] },
  { key: "questions", label: "หัวข้อประเมิน", type: "textarea", rows: 6, value: DEFAULT_SURVEY_Q, hint: "บรรทัดละข้อ ให้คะแนน 1–5 ดาว (แก้คำถามภายหลัง คำตอบเดิมจะไม่นับ)" },
  { key: "vis", label: "เปิดรับคำตอบ", hint: "เปิด = ทุกคนที่มีลิงก์หรือ QR ตอบได้", toggle: { on: "สาธารณะ", off: "ส่วนตัว" }, value: "สาธารณะ" }] };
FORMS.fbposts = { name: "โพสต์ Facebook", fields: [
  { key: "url", label: "ลิงก์โพสต์ Facebook", type: "url", required: true, placeholder: "https://www.facebook.com/.../posts/...",
    hint: "บนโพสต์กด ⋯ → ฝัง (Embed) หรือคัดลอกลิงก์ โพสต์ต้องตั้งเป็นสาธารณะ" },
  { key: "title", label: "หัวข้อ (ไม่บังคับ)", placeholder: "เช่น กิจกรรมวันวิทยาศาสตร์" },
  { key: "date", label: "วันที่", type: "date", value: "today" },
  { ...visField, value: "สาธารณะ" }] };
for (const k of ["albums", "videos", "surveys", "fbposts"]) App.adders[k] = () => App.editItem(k);

// ---------- ช่องรูปหลายรูป (Gallery field) ----------
window.galleryField = (f, id, val) => {
  let photos = [];
  try { photos = Array.isArray(val) ? val : JSON.parse(val || "[]"); } catch { photos = []; }
  return `<div class="field-block gallery-field"><span class="field-label">${f.label}${f.hint ? `<small>${f.hint}</small>` : ""}</span>
    <div class="gal-grid" data-target="${id}"></div>
    <div class="drop" data-multi="1" data-cat="${esc(f.category || "albums")}">
      <input type="file" hidden multiple accept="image/*">
      <div class="drop-ui"><b>ลากรูปมาวาง (หลายรูปได้)</b><span> หรือ </span><button type="button" class="link-btn">เลือกรูป</button>
        <small>รูปถูกย่อให้อัตโนมัติ เก็บใน Google Drive</small></div>
      <div class="drop-status" role="status"></div>
    </div>
    <input type="hidden" id="${id}" name="${f.key}" value="${esc(JSON.stringify(photos))}">
  </div>`;
};
function wireGallery(root, okBtn) {
  root.querySelectorAll(".gallery-field").forEach((box) => {
    const input = box.querySelector("input[type=hidden]");
    const grid = box.querySelector(".gal-grid");
    const zone = box.querySelector(".drop");
    const status = zone.querySelector(".drop-status");
    const get = () => { try { return JSON.parse(input.value || "[]"); } catch { return []; } };
    const set = (arr) => { input.value = JSON.stringify(arr); draw(); };
    const draw = () => {
      const ph = get();
      grid.innerHTML = ph.map((p, i) => `<figure class="gal-item"><img src="${esc(p.img || p.url)}" alt="" loading="lazy">
        <input class="gal-cap" data-i="${i}" value="${esc(p.caption || "")}" placeholder="คำบรรยาย" aria-label="คำบรรยายรูปที่ ${i + 1}">
        <button type="button" class="gal-del" data-i="${i}" aria-label="ลบรูปที่ ${i + 1}">×</button>${i === 0 ? `<span class="gal-cover">ปก</span>` : `<button type="button" class="gal-first" data-i="${i}" title="ตั้งเป็นปก">ตั้งเป็นปก</button>`}</figure>`).join("");
    };
    grid.addEventListener("input", (e) => { if (!e.target.matches(".gal-cap")) return; const ph = get(); ph[e.target.dataset.i].caption = e.target.value; input.value = JSON.stringify(ph); });
    grid.addEventListener("click", (e) => {
      const ph = get();
      if (e.target.matches(".gal-del")) { ph.splice(Number(e.target.dataset.i), 1); set(ph); }
      if (e.target.matches(".gal-first")) { const [x] = ph.splice(Number(e.target.dataset.i), 1); ph.unshift(x); set(ph); }
    });
    const go = async (files) => {
      files = [...files].filter((f) => f.type.startsWith("image/"));
      if (!files.length) return;
      if (App.drive && !App.drive.connected) { status.className = "drop-status err"; status.textContent = "ยังไม่ได้เชื่อม Google Drive"; return; }
      okBtn.disabled = true;
      let done = 0;
      for (const f of files) {
        try {
          const r = await App.uploadFile(f, zone.dataset.cat, (m) => (status.textContent = `รูป ${done + 1}/${files.length}: ${m}`));
          set([...get(), { img: r.img || r.url, url: r.url, caption: "" }]);
          done++;
        } catch (e) { toast(`${f.name}: ${e.message}`); }
      }
      status.className = "drop-status ok";
      status.textContent = `เพิ่มแล้ว ${done} รูป`;
      okBtn.disabled = false;
    };
    zone.querySelector(".link-btn").onclick = () => zone.querySelector("input[type=file]").click();
    zone.querySelector("input[type=file]").onchange = (e) => go(e.target.files);
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("over"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("over"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("over"); go(e.dataTransfer.files); });
    draw();
  });
}
App.wireExtras = wireGallery;

// ---------- Lightbox แบบหลายรูป (ปัด / ลูกศร) ----------
App.openGallery = (items, start = 0) => {
  const lb = $("#lightbox");
  if (!lb.querySelector(".lb-prev")) {
    lb.insertAdjacentHTML("beforeend", `<button class="lb-nav lb-prev" aria-label="รูปก่อนหน้า">‹</button><button class="lb-nav lb-next" aria-label="รูปถัดไป">›</button><p class="lb-count"></p>`);
  }
  let i = start;
  const show = () => {
    const it = items[i];
    $("#lightboxImg").src = it.img;
    $("#lightboxImg").alt = it.caption || "";
    $("#lightboxCaption").textContent = it.caption || "";
    lb.querySelector(".lb-count").textContent = items.length > 1 ? `${i + 1} / ${items.length}` : "";
    lb.querySelectorAll(".lb-nav").forEach((b) => (b.hidden = items.length < 2));
  };
  const step = (d) => { i = (i + d + items.length) % items.length; show(); };
  lb.querySelector(".lb-prev").onclick = () => step(-1);
  lb.querySelector(".lb-next").onclick = () => step(1);
  lb.onkeydown = (e) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); };
  let x0 = null;
  lb.onpointerdown = (e) => (x0 = e.clientX);
  lb.onpointerup = (e) => { if (x0 !== null && Math.abs(e.clientX - x0) > 50) step(e.clientX < x0 ? 1 : -1); x0 = null; };
  show();
  lb.showModal();
};

// ---------- QR Code ----------
App.showQR = (url, title = "QR Code") => {
  let dlg = $("#qrDialog");
  if (!dlg) {
    document.body.insertAdjacentHTML("beforeend", `<dialog class="sheet qr-dialog" id="qrDialog"><div class="sheet-bar"><span></span><h2 id="qrTitle"></h2>
      <button type="button" class="ios-bar-btn strong" data-qr="close">เสร็จ</button></div>
      <div class="sheet-body qr-body"><div class="qr-svg" id="qrSvg"></div><p class="qr-url" id="qrUrl"></p>
      <div class="qr-actions"><button type="button" class="btn" data-qr="png">ดาวน์โหลดรูป QR</button><button type="button" class="btn ghost" data-qr="copy">คัดลอกลิงก์</button></div></div></dialog>`);
    dlg = $("#qrDialog");
    dlg.addEventListener("click", async (e) => {
      const a = e.target.dataset.qr;
      if (a === "close" || e.target === dlg) dlg.close();
      if (a === "copy") { try { await navigator.clipboard.writeText(dlg.dataset.url); toast("คัดลอกลิงก์แล้ว"); } catch { prompt("คัดลอกลิงก์นี้", dlg.dataset.url); } }
      if (a === "png") {
        const svg = window.qrSVG(dlg.dataset.url, { size: 1024, margin: 4 });
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = c.height = 1024;
          c.getContext("2d").drawImage(img, 0, 0, 1024, 1024);
          const link = document.createElement("a");
          link.download = `QR-${(dlg.dataset.title || "qr").replace(/[^\wก-๙-]+/g, "-")}.png`;
          link.href = c.toDataURL("image/png");
          link.click();
        };
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      }
    });
  }
  dlg.dataset.url = url;
  dlg.dataset.title = title;
  $("#qrTitle").textContent = title;
  $("#qrSvg").innerHTML = window.qrSVG(url, { size: 260, color: "#16142e" });
  $("#qrUrl").textContent = url;
  dlg.showModal();
};
App.actions.qr = (b) => App.showQR(b.dataset.url, b.dataset.title);
const siteUrl = (hash = "") => `${location.origin}/${SITE}/${hash}`;

// ---------- แบนเนอร์และสไลด์โชว์ (หน้าแรกสาธารณะ) ----------
const BANNER_THEMES = { "ม่วง": "violet", "ชมพูพาสเทล": "pastel", "เขียวมิ้นต์": "mint", "กลางคืน": "night" };
App.heroStyle = () => {
  const b = App.DATA.settings?.banner || {};
  const img = safeUrl(b.image);
  return { cls: `theme-${BANNER_THEMES[b.theme] || "violet"}${img ? " has-banner" : ""}`, style: img ? `--banner:url('${esc(img)}')` : "", slogan: b.slogan || "" };
};
const slides = () => list("albums")
  .filter((a) => a.slideshow !== "ไม่แสดง")
  .sort(byDateDesc)
  .flatMap((a) => (a.photos || []).map((p) => ({ img: p.img || p.url, caption: p.caption || a.title, album: a.title })))
  .slice(0, 15);
App.slideshowHTML = () => {
  const s = slides();
  if (!s.length) return "";
  return `<section class="slideshow" aria-roledescription="carousel" aria-label="ภาพกิจกรรม" tabindex="0">
    <div class="ss-track">${s.map((x, i) => `<figure class="ss-slide" aria-roledescription="slide" aria-label="${i + 1} จาก ${s.length}">
      <img src="${esc(x.img)}" alt="${esc(x.caption)}" ${i > 1 ? 'loading="lazy"' : ""}><figcaption>${esc(x.caption)}</figcaption></figure>`).join("")}</div>
    ${s.length > 1 ? `<button class="ss-nav ss-prev" aria-label="ภาพก่อนหน้า">‹</button><button class="ss-nav ss-next" aria-label="ภาพถัดไป">›</button>
    <div class="ss-dots">${s.map((_, i) => `<button aria-label="ไปภาพที่ ${i + 1}" data-i="${i}"></button>`).join("")}</div>` : ""}
  </section>`;
};
let ssTimer;
App.wireSlideshow = () => {
  clearInterval(ssTimer);
  const ss = main.querySelector(".slideshow");
  if (!ss) return;
  const track = ss.querySelector(".ss-track");
  const n = track.children.length;
  const dots = [...ss.querySelectorAll(".ss-dots button")];
  let i = 0;
  const go = (k) => {
    i = (k + n) % n;
    track.style.transform = `translateX(${-i * 100}%)`;
    dots.forEach((d, j) => d.setAttribute("aria-current", j === i ? "true" : "false"));
  };
  const auto = () => { clearInterval(ssTimer); if (n > 1 && !matchMedia("(prefers-reduced-motion: reduce)").matches) ssTimer = setInterval(() => (document.contains(ss) ? go(i + 1) : clearInterval(ssTimer)), 5000); };
  ss.querySelector(".ss-prev")?.addEventListener("click", () => { go(i - 1); auto(); });
  ss.querySelector(".ss-next")?.addEventListener("click", () => { go(i + 1); auto(); });
  dots.forEach((d) => d.addEventListener("click", () => { go(Number(d.dataset.i)); auto(); }));
  ss.addEventListener("mouseenter", () => clearInterval(ssTimer));
  ss.addEventListener("mouseleave", auto);
  ss.addEventListener("focusin", () => clearInterval(ssTimer));
  ss.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") go(i - 1); if (e.key === "ArrowRight") go(i + 1); });
  let x0 = null, dx = 0;
  track.addEventListener("pointerdown", (e) => { x0 = e.clientX; dx = 0; clearInterval(ssTimer); track.style.transition = "none"; });
  track.addEventListener("pointermove", (e) => { if (x0 === null) return; dx = e.clientX - x0; track.style.transform = `translateX(calc(${-i * 100}% + ${dx}px))`; });
  const end = () => {
    if (x0 === null) return;
    track.style.transition = "";
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1)); else if (Math.abs(dx) < 6) App.openGallery(slides(), i); else go(i);
    x0 = null; auto();
  };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointerleave", end);
  go(0); auto();
};

// ---------- อัลบั้มภาพ ----------
App.pages.albums = ({ q }) => {
  const albums = [...list("albums")].sort(byDateDesc);
  const isAdmin = App.mode === "admin";
  if (q.id) {
    const a = albums.find((x) => String(x.id) === q.id);
    if (!a) return empty("ไม่พบอัลบั้มนี้");
    const ph = a.photos || [];
    return head(esc(a.title), `${thDate(a.date)} ${ph.length} รูป`, `<a class="btn ghost" href="#/albums">กลับไปทุกอัลบั้ม</a>`) +
      (a.description ? `<p class="lead">${esc(a.description)}</p>` : "") +
      (ph.length ? `<div class="photo-grid">${ph.map((p, i) => `<button class="photo" data-act="viewPhoto" data-album="${a.id}" data-i="${i}" aria-label="ดูรูป ${esc(p.caption || i + 1)}"><img src="${esc(p.img || p.url)}" alt="${esc(p.caption || "")}" loading="lazy">${p.caption ? `<span>${esc(p.caption)}</span>` : ""}</button>`).join("")}</div>` : empty("ยังไม่มีรูป")) +
      (isAdmin ? `<p>${tools("albums", a)}</p>` : "");
  }
  return head("อัลบั้มภาพกิจกรรม", `${albums.length} อัลบั้ม ${albums.reduce((s, a) => s + (a.photos || []).length, 0)} รูป`, isAdmin ? addBtn("albums", "สร้างอัลบั้ม") : "") +
    (albums.length ? `<div class="album-grid">${albums.map((a) => {
      const cover = a.photos?.[0];
      return `<article class="album"><a href="#/albums?id=${a.id}" class="album-cover">${cover ? `<img src="${esc(cover.img || cover.url)}" alt="" loading="lazy">` : `<span>ยังไม่มีรูป</span>`}
        <span class="album-count">${(a.photos || []).length} รูป</span></a>
        <div class="album-body"><h3><a href="#/albums?id=${a.id}">${esc(a.title)}</a></h3><div class="meta">${thDate(a.date)}${isAdmin && a.slideshow !== "ไม่แสดง" ? " · อยู่ในสไลด์โชว์" : ""}</div>${tools("albums", a)}</div></article>`;
    }).join("")}</div>` : empty(isAdmin ? "ยังไม่มีอัลบั้ม กด \"สร้างอัลบั้ม\" แล้วลากรูปมาวางได้เลย" : "ยังไม่มีอัลบั้ม"));
};
App.actions.viewPhoto = (b) => {
  const a = list("albums").find((x) => String(x.id) === b.dataset.album);
  App.openGallery((a.photos || []).map((p) => ({ img: p.img || p.url, caption: p.caption || a.title })), Number(b.dataset.i));
};

// ---------- วิดีโอการสอน ----------
const ytId = (url) => (String(url || "").match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/) || [])[1];
App.pages.videos = () => {
  const items = [...list("videos")].sort(byDateDesc);
  const isAdmin = App.mode === "admin";
  return head("วิดีโอการสอน", `${items.length} วิดีโอ`, isAdmin ? addBtn("videos", "เพิ่มวิดีโอ") : "") +
    (items.length ? `<div class="video-grid">${items.map((v) => {
      const id = ytId(v.url);
      return `<article class="card video">${id
        ? `<button class="yt" data-act="playYT" data-id="${id}" aria-label="เล่นวิดีโอ ${esc(v.title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play" aria-hidden="true"></span></button>`
        : `<a class="yt" href="${esc(safeUrl(v.url))}" target="_blank" rel="noopener"><span class="yt-other">เปิดวิดีโอ</span></a>`}
        <div class="video-body">${v.type ? `<span class="tag">${esc(v.type)}</span>` : ""}<h3>${esc(v.title)}</h3><div class="meta">${thDate(v.date)}</div>
        ${v.description ? `<p class="meta">${esc(v.description)}</p>` : ""}${tools("videos", v)}</div></article>`;
    }).join("")}</div>` : empty(isAdmin ? "ยังไม่มีวิดีโอ วางลิงก์ YouTube ได้เลย" : "ยังไม่มีวิดีโอ"));
};
App.actions.playYT = (b) => {
  b.outerHTML = `<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(b.dataset.id)}?autoplay=1&rel=0" title="วิดีโอ" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
};

// ---------- คลังสื่อ (ดาวน์โหลด) ----------
App.pages.media = ({ q }) => {
  const items = list("plans").filter((p) => safeUrl(p.link));
  const types = [...new Set(items.map((i) => i.type).filter(Boolean))];
  const cur = q.type || "ทั้งหมด";
  const shown = items.filter((i) => cur === "ทั้งหมด" || i.type === cur);
  const total = items.reduce((s, i) => s + (Number(i.downloads) || 0), 0);
  return head("คลังสื่อการสอน", `${items.length} รายการ ดาวน์โหลดแล้ว ${total.toLocaleString("th-TH")} ครั้ง ใช้ได้ฟรีเพื่อการศึกษา`) +
    filterBar(types, cur, "type") +
    (shown.length ? `<div class="stack">${shown.map((i) => `<div class="card item media-item">
      <div class="media-ico" aria-hidden="true">${esc((i.type || "ไฟล์").slice(0, 2))}</div>
      <div class="item-body"><h3>${esc(i.title)}</h3><div class="meta">${esc([i.subject, i.unit].filter(Boolean).join(" "))}</div></div>
      <div class="item-side"><a class="btn small" href="/api/dl?site=${encodeURIComponent(SITE)}&id=${i.id}" target="_blank" rel="noopener" data-dl="${i.id}">ดาวน์โหลด</a>
      <div class="meta">${(Number(i.downloads) || 0).toLocaleString("th-TH")} ครั้ง</div></div></div>`).join("")}</div>` : empty("ยังไม่มีสื่อที่เผยแพร่"));
};
main.addEventListener("click", (e) => {
  const a = e.target.closest("[data-dl]");
  if (!a) return;
  const it = list("plans").find((p) => String(p.id) === a.dataset.dl);
  if (it) { it.downloads = (Number(it.downloads) || 0) + 1; setTimeout(render, 300); }
});

// ---------- แบบประเมินความพึงพอใจ ----------
const surveyQs = (s) => String(s.questions || "").split("\n").map((x) => x.trim()).filter(Boolean);
App.pages.survey = ({ q }) => {
  const s = list("surveys").find((x) => String(x.id) === q.id);
  if (!s) return head("แบบประเมิน") + empty("แบบประเมินนี้ปิดรับคำตอบแล้ว");
  const qs = surveyQs(s);
  const p = App.DATA.profile || {};
  return `<header class="band survey-head"><div class="band-text"><h1>${esc(s.title)}</h1><p>ครู${esc(p.name || "")} ${esc(p.school || "")}${s.target ? ` สำหรับ${esc(s.target)}` : ""}</p></div></header>
    <form class="survey" id="surveyForm" data-id="${s.id}">
      <p class="meta">ให้คะแนน 1–5 ดาว (5 = มากที่สุด) ไม่ต้องใส่ชื่อ</p>
      ${qs.map((t, i) => `<fieldset class="sv-q"><legend><span class="sv-no">${i + 1}</span>${esc(t)}</legend>
        <div class="stars" role="radiogroup" aria-label="${esc(t)}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" role="radio" aria-checked="false" data-q="${i}" data-v="${n}" aria-label="${n} ดาว"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg></button>`).join("")}
        <span class="sv-label" aria-hidden="true"></span></div></fieldset>`).join("")}
      <label class="field sv-comment">ข้อเสนอแนะเพิ่มเติม (ไม่บังคับ)<textarea name="comment" rows="3" maxlength="500"></textarea></label>
      <button class="btn wide" type="submit">ส่งแบบประเมิน</button>
    </form>`;
};
const STAR_LABEL = ["", "น้อยที่สุด", "น้อย", "ปานกลาง", "มาก", "มากที่สุด"];
main.addEventListener("click", (e) => {
  const b = e.target.closest(".stars button");
  if (!b) return;
  const g = b.parentElement;
  const v = Number(b.dataset.v);
  g.dataset.v = v;
  g.querySelectorAll("button").forEach((x) => { x.classList.toggle("on", Number(x.dataset.v) <= v); x.setAttribute("aria-checked", String(Number(x.dataset.v) === v)); });
  g.querySelector(".sv-label").textContent = STAR_LABEL[v];
  g.closest(".sv-q").classList.remove("missing");
});
main.addEventListener("submit", async (e) => {
  if (e.target.id !== "surveyForm") return;
  e.preventDefault();
  const f = e.target;
  const groups = [...f.querySelectorAll(".stars")];
  const miss = groups.find((g) => !g.dataset.v);
  if (miss) { miss.closest(".sv-q").classList.add("missing"); miss.scrollIntoView({ behavior: "smooth", block: "center" }); return toast("กรุณาให้คะแนนให้ครบทุกข้อ"); }
  const btn = f.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    await api("POST", "/api/survey", { site: SITE, id: Number(f.dataset.id), answers: groups.map((g) => Number(g.dataset.v)), comment: f.comment.value });
    f.outerHTML = `<div class="survey-done"><div class="done-ico" aria-hidden="true">✓</div><h2>ขอบคุณที่ช่วยประเมิน</h2><p class="meta">คำตอบของคุณช่วยให้ครูพัฒนาการสอนได้ดียิ่งขึ้น</p></div>`;
  } catch (err) { toast(err.message); btn.disabled = false; }
});

App.pages["admin/surveys"] = () => {
  const rows = arr("surveys");
  setTimeout(App.loadSurveyStats, 0);
  return head("แบบประเมินความพึงพอใจ", "สร้างลิงก์หรือ QR ให้นักเรียน ผู้ปกครอง หรือเพื่อนครูประเมินการสอน ผลสรุปเป็นหลักฐาน PA ได้", addBtn("surveys", "สร้างแบบประเมิน")) +
    (rows.length ? `<div class="stack">${rows.map((s) => `<section class="panel survey-card" data-sid="${s.id}">
      <div class="row-head"><div><h2 style="margin:0">${esc(s.title)}</h2><div class="meta">${esc(s.target || "")} ${surveyQs(s).length} ข้อ</div></div>
        <span class="vis ${s.vis === "public" ? "v-public" : "v-private"}">${s.vis === "public" ? "เปิดรับคำตอบ" : "ปิดรับคำตอบ"}</span></div>
      <div class="sv-stats" id="sv-${s.id}">${empty("กำลังโหลดผล…")}</div>
      <div class="acts">
        <button class="ico" data-act="qr" data-url="${esc(siteUrl(`#/survey?id=${s.id}`))}" data-title="${esc(s.title)}">QR Code / ลิงก์</button>
        <button class="ico" data-act="surveyEvidence" data-id="${s.id}">บันทึกเป็นหลักฐาน PA</button>
        <button class="ico" data-act="edit" data-key="surveys" data-id="${s.id}">แก้ไข</button>
        <button class="ico del" data-act="surveyClear" data-id="${s.id}">ล้างคำตอบ</button>
        <button class="ico del" data-act="del" data-key="surveys" data-id="${s.id}">ลบ</button></div>
    </section>`).join("")}</div>` : empty("ยังไม่มีแบบประเมิน กด \"สร้างแบบประเมิน\" มีคำถามตั้งต้นให้แล้ว"));
};
App.surveyStats = {};
App.loadSurveyStats = async () => {
  for (const s of arr("surveys")) {
    const box = $(`#sv-${s.id}`);
    if (!box) continue;
    try {
      const r = (App.surveyStats[s.id] = await api("GET", `/api/admin/survey/${s.id}`));
      box.innerHTML = r.counted
        ? `<div class="sv-summary"><b>${r.overall.toFixed(2)}</b><span>คะแนนเฉลี่ยจาก 5<br>ผู้ตอบ ${r.counted} คน</span></div>
          <div class="hbars">${r.questions.map((x) => `<div class="hbar" title="${esc(x.q)}: ${x.avg.toFixed(2)}"><span class="hbar-label">${esc(x.q)}</span>
            <span class="hbar-track"><i style="width:${(x.avg / 5) * 100}%"></i></span><b>${x.avg.toFixed(2)}</b></div>`).join("")}</div>
          ${r.comments.length ? `<details class="sv-comments"><summary>ข้อเสนอแนะ ${r.comments.length} ข้อ</summary><ul>${r.comments.map((c) => `<li>${esc(c.text)}</li>`).join("")}</ul></details>` : ""}`
        : empty("ยังไม่มีผู้ตอบ ส่ง QR Code ให้ผู้ประเมินได้เลย");
    } catch (e) { box.innerHTML = `<p class="private-note">${esc(e.message)}</p>`; }
  }
};
App.actions.surveyClear = async (b) => {
  if (!confirm("ล้างคำตอบทั้งหมดของแบบประเมินนี้? กู้คืนไม่ได้")) return;
  try { await api("DELETE", `/api/admin/survey/${b.dataset.id}`); toast("ล้างคำตอบแล้ว"); render(); } catch (e) { toast(e.message); }
};
App.actions.surveyEvidence = async (b) => {
  const s = findItem("surveys", b.dataset.id);
  const r = App.surveyStats[b.dataset.id];
  if (!r?.counted) return toast("ยังไม่มีผู้ตอบ");
  const body = { title: `ผลประเมินความพึงพอใจ: ${s.title} (เฉลี่ย ${r.overall.toFixed(2)} จาก 5, ${r.counted} คน)`, source: "อื่นๆ", pa: ["1.3", "1.7"], sar: "การจัดการเรียนการสอน", link: siteUrl(`#/survey?id=${s.id}`), vis: "private" };
  try { arr("evidence").unshift(await api("POST", "/api/admin/items/evidence", body)); toast("บันทึกในคลังหลักฐานแล้ว (ตัวชี้วัด 1.3, 1.7)"); } catch (e) { toast(e.message); }
};

// ---------- เหรียญความสำเร็จ ----------
const LEVEL_RANK = { "โรงเรียน": 1, "เขตพื้นที่": 2, "จังหวัด": 3, "ภาค": 4, "ประเทศ": 5 };
App.badges = () => {
  const hours = list("trainings").reduce((s, t) => s + (Number(t.hours) || 0), 0);
  const awards = list("certificates").filter((c) => c.type !== "เกียรติบัตร");
  const top = Math.max(0, ...awards.map((a) => LEVEL_RANK[a.level] || 0));
  const refl = list("reflections").length;
  const media = list("plans").filter((p) => p.vis === "public" && safeUrl(p.link)).length;
  const dls = list("plans").reduce((s, p) => s + (Number(p.downloads) || 0), 0);
  const covered = PA_CODES.filter((c) => list("evidence").some((e) => (e.pa || []).includes(c))).length;
  const photos = list("albums").reduce((s, a) => s + (a.photos || []).length, 0);
  const tiers = (v, steps, name, unit, c) => {
    const got = steps.filter((x) => v >= x);
    const next = steps.find((x) => v < x);
    return { name: `${name} ${got.length ? got.at(-1) : steps[0]} ${unit}`, earned: got.length > 0, level: got.length, max: steps.length, progress: next ? v / next : 1, note: next ? `${v.toLocaleString("th-TH")} / ${next.toLocaleString("th-TH")} ${unit}` : "ครบทุกระดับแล้ว", c };
  };
  return [
    tiers(hours, [20, 50, 100, 200], "นักพัฒนาตนเอง", "ชั่วโมง", C.mint),
    { name: top ? `รางวัลระดับ${Object.keys(LEVEL_RANK)[top - 1]}` : "รางวัลแรก", earned: top > 0, level: top, max: 5, progress: top / 5, note: top ? (top < 5 ? `ระดับถัดไป: ${Object.keys(LEVEL_RANK)[top]}` : "สูงสุดแล้ว") : "ยังไม่มีรางวัล", c: C.gold },
    tiers(refl, [10, 30, 50, 100], "นักสะท้อนคิด", "บันทึก", C.sky),
    tiers(media, [3, 10, 25], "ผู้แบ่งปันสื่อ", "ชิ้น", C.pink),
    tiers(dls, [50, 200, 1000], "สื่อยอดนิยม", "ดาวน์โหลด", C.coral),
    { name: "PA ครบทุกตัวชี้วัด", earned: covered === PA_CODES.length && covered > 0, level: covered === PA_CODES.length ? 1 : 0, max: 1, progress: covered / (PA_CODES.length || 1), note: `${covered} / ${PA_CODES.length} ตัวชี้วัด`, c: C.indigo },
    tiers(photos, [20, 100, 300], "นักบันทึกภาพ", "รูป", C.orange),
  ];
};
const medal = (b) => `<div class="badge ${b.earned ? "on" : ""}" style="--bc:${b.c}" title="${esc(b.note)}">
  <div class="medal" aria-hidden="true"><svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="20"/><path d="M24 12l3.5 7.2 7.9 1.1-5.7 5.5 1.4 7.8L24 29.9l-7.1 3.7 1.4-7.8-5.7-5.5 7.9-1.1z"/></svg>${b.max > 1 && b.level ? `<span>${b.level}</span>` : ""}</div>
  <b>${esc(b.name)}</b><small>${esc(b.note)}</small>${b.earned ? "" : `<span class="badge-bar"><i style="width:${Math.round(b.progress * 100)}%"></i></span>`}</div>`;
App.badgesHTML = (onlyEarned) => {
  const bs = App.badges().filter((b) => !onlyEarned || b.earned);
  return bs.length ? `<section class="badges-wrap"><h2>${onlyEarned ? "เหรียญความสำเร็จ" : "เหรียญความสำเร็จ (ระบบมอบให้อัตโนมัติ)"}</h2><div class="badges">${bs.map(medal).join("")}</div></section>` : "";
};

// ---------- กราฟในแดชบอร์ด ----------
const TH_SHORT = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
App.dashCharts = () => {
  // ชั่วโมงพัฒนาตนเองรายเดือน 12 เดือนล่าสุด
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1); return { y: d.getFullYear(), m: d.getMonth(), v: 0 }; });
  for (const t of list("trainings")) {
    const d = new Date(`${t.date}T00:00:00`);
    const slot = months.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (slot) slot.v += Number(t.hours) || 0;
  }
  const maxH = Math.max(1, ...months.map((x) => x.v));
  const total = months.reduce((s, x) => s + x.v, 0);
  // รางวัลแยกตามระดับ
  const awards = list("certificates");
  const levels = Object.keys(LEVEL_RANK).map((l) => ({ l, n: awards.filter((a) => a.level === l).length }));
  const maxL = Math.max(1, ...levels.map((x) => x.n));
  return `<div class="cols charts">
    <section class="panel chart-card" style="--c:${C.mint}"><h2>ชั่วโมงพัฒนาตนเอง 12 เดือนล่าสุด</h2><p class="meta">รวม ${total.toLocaleString("th-TH")} ชั่วโมง</p>
      <div class="vbars" role="img" aria-label="ชั่วโมงอบรมรายเดือน รวม ${total} ชั่วโมง">${months.map((x) => `<div class="vbar" tabindex="0" data-tip="${TH_SHORT[x.m]} ${x.y + 543}: ${x.v} ชม.">
        <span class="vbar-fill" style="height:${(x.v / maxH) * 100}%"></span><span class="vbar-x">${TH_SHORT[x.m]}</span></div>`).join("")}</div></section>
    <section class="panel chart-card" style="--c:${C.gold}"><h2>เกียรติบัตรและรางวัลตามระดับ</h2><p class="meta">ทั้งหมด ${awards.length} รายการ</p>
      <div class="hbars">${levels.map((x) => `<div class="hbar" tabindex="0" data-tip="${x.l}: ${x.n} รายการ"><span class="hbar-label">${x.l}</span>
        <span class="hbar-track"><i style="width:${(x.n / maxL) * 100}%"></i></span><b>${x.n}</b></div>`).join("")}</div></section>
  </div>`;
};

// ---------- ตั้งค่าแบนเนอร์ ----------
App.settingsExtras = () => {
  const b = App.DATA.settings?.banner || {};
  return `<section class="panel"><h2 class="row-head">แบนเนอร์และสไลด์โชว์หน้าแรก <button class="btn ghost small" data-act="setBanner">แก้ไข</button></h2>
    <div class="banner-preview hero-like ${App.heroStyle().cls}" style="${App.heroStyle().style}"><b>${esc(App.DATA.profile?.name || "")}</b>${b.slogan ? `<span>${esc(b.slogan)}</span>` : ""}</div>
    <p class="meta">ธีม: ${esc(b.theme || "ม่วง")} | สไลด์โชว์ใช้รูปจากอัลบั้มที่เปิด "แสดงในสไลด์โชว์" (ตอนนี้ ${slides().length} รูป)</p></section>`;
};
App.actions.setBanner = () => editKV("แบนเนอร์หน้าแรก", "settings", [
  { key: "theme", label: "ธีมสี", options: Object.keys(BANNER_THEMES), get: (o) => o.banner?.theme || "ม่วง" },
  { key: "image", label: "รูปแบนเนอร์ (ไม่บังคับ)", type: "file", category: "banner", store: "img", accept: "image/*", hint: "แนะนำรูปแนวนอน ระบบใส่เงาให้อ่านตัวอักษรได้", get: (o) => o.banner?.image || "" },
  { key: "slogan", label: "คำขวัญ / คำคม (ไม่บังคับ)", placeholder: "เช่น สอนด้วยใจ ให้ด้วยรัก", get: (o) => o.banner?.slogan || "" },
], (o, r) => { o.banner = { theme: r.theme, image: r.image, slogan: r.slogan }; });


// ---------- กิจกรรมจาก Facebook (ฝังโพสต์ ไม่เก็บรูปในเว็บ) ----------
// ใช้ Facebook SDK แสดงโพสต์สาธารณะ โหลดเฉพาะตอนเปิดหน้านี้
const fbKind = (url) => (/\/(videos|reel|watch)\b|fb\.watch/i.test(url) ? "fb-video" : "fb-post");
const fbUrlOk = (url) => /^https:\/\/(www\.|m\.|web\.)?(facebook\.com|fb\.watch)\//i.test(url || "");
let fbLoading = null;
const loadFbSdk = () => fbLoading || (fbLoading = new Promise((resolve) => {
  if (window.FB) return resolve(window.FB);
  window.fbAsyncInit = () => { window.FB.init({ xfbml: false, version: "v21.0" }); resolve(window.FB); };
  if (!$("#fb-root")) document.body.insertAdjacentHTML("afterbegin", '<div id="fb-root"></div>');
  const sc = document.createElement("script");
  sc.async = true; sc.defer = true; sc.crossOrigin = "anonymous";
  sc.src = "https://connect.facebook.net/th_TH/sdk.js";
  sc.onerror = () => resolve(null);
  document.head.appendChild(sc);
}));
App.pages.facebook = () => {
  const items = [...list("fbposts")].sort(byDateDesc);
  const isAdmin = App.mode === "admin";
  setTimeout(async () => {
    const box = $("#fbFeed");
    if (!box || !items.length) return;
    const FB = await loadFbSdk();
    if (!FB) { box.querySelectorAll(".fb-wait").forEach((w) => (w.textContent = "โหลด Facebook ไม่สำเร็จ (อาจถูกบล็อกโดยเบราว์เซอร์)")); return; }
    FB.XFBML.parse(box, () => box.querySelectorAll(".fb-wait").forEach((w) => w.remove()));
    // ถ้าโพสต์ไม่ขึ้นภายใน 6 วินาที (มักเป็นโพสต์ไม่สาธารณะ) บอกวิธีแก้
    setTimeout(() => box.querySelectorAll(".fb-card").forEach((c) => {
      if (!c.querySelector("iframe")) c.querySelector(".fb-help")?.removeAttribute("hidden");
    }), 6000);
  }, 0);
  return head("กิจกรรมจาก Facebook", "แสดงโพสต์จาก Facebook โดยตรง รูปไม่ได้เก็บในเว็บ", isAdmin ? addBtn("fbposts", "เพิ่มโพสต์") : "") +
    (items.length ? `<div class="fb-feed" id="fbFeed">${items.map((p) => {
      const ok = fbUrlOk(p.url);
      return `<article class="fb-card">
        ${p.title || isAdmin ? `<div class="fb-head">${p.title ? `<h3>${esc(p.title)}</h3>` : ""}<span class="meta">${thDate(p.date)}</span>${tools("fbposts", p)}</div>` : ""}
        ${ok ? `<div class="${fbKind(p.url)}" data-href="${esc(p.url)}" data-width="auto" data-show-text="true" data-lazy="true"></div><p class="fb-wait meta">กำลังโหลดโพสต์…</p>`
          : `<p class="private-note">ลิงก์นี้ไม่ใช่ลิงก์ Facebook</p>`}
        <p class="fb-help meta" hidden>โพสต์ไม่แสดง? ตรวจว่าโพสต์ตั้งเป็น <b>สาธารณะ</b> และใช้ลิงก์โพสต์โดยตรง (ลิงก์แบบ facebook.com/share/... บางครั้งฝังไม่ได้)
          ${ok ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">เปิดใน Facebook</a>` : ""}</p>
      </article>`;
    }).join("")}</div>` : empty(isAdmin ? "ยังไม่มีโพสต์ กด \"เพิ่มโพสต์\" แล้ววางลิงก์โพสต์ Facebook ที่เป็นสาธารณะ" : "ยังไม่มีโพสต์"));
};
