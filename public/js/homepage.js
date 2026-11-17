// หน้าแรกแบบบล็อก: ครูเลือกบล็อก เรียงลำดับ (ลากวาง) ซ่อน/แสดง และเลือกความกว้างได้เอง
// เก็บใน settings.home.blocks = [{ id, on, w: "full"|"half", ...ตัวเลือกของบล็อก }]  แยกตามครูแต่ละคน
// โหลดหลัง features.js

const LEVEL_ORDER = { "ประเทศ": 5, "ภาค": 4, "จังหวัด": 3, "เขตพื้นที่": 2, "โรงเรียน": 1 };
const more = (route, label = "ดูทั้งหมด") => `<a class="hb-more" href="#/${route}">${label}</a>`;
const hbHead = (title, route) => `<div class="hb-head"><h2>${title}</h2>${route ? more(route) : ""}</div>`;
const STAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>`;

// ---------- บล็อกทั้งหมด ----------
// render(o) คืน HTML หรือ "" ถ้าไม่มีข้อมูล (หน้าสาธารณะจะข้ามบล็อกว่างให้อัตโนมัติ)
const HB = {
  hero: {
    label: "แบนเนอร์และโปรไฟล์", w: "full",
    render: () => {
      const p = App.DATA.profile || {};
      const photo = safeUrl(p.photo);
      const hs = App.heroStyle();
      return `<header class="band hero ${hs.cls}" style="${hs.style}">
        <div class="hero-photo ${photo ? "photo" : ""}" style="${photo ? `background-image:url('${esc(photo)}')` : ""}">${photo ? "" : esc(initials(p.name))}</div>
        <div><h1>${esc(p.name)}</h1>
          <div class="who">${esc([p.position, p.academicStanding].filter(Boolean).join(" "))}<br>${esc(p.school)}${p.office ? `<br><span class="meta">${esc(p.office)}</span>` : ""}</div>
          <div class="chips">${[p.learningArea, ...(p.subjects || []), p.homeroom].filter(Boolean).map((s) => `<span class="tag solid">${esc(s)}</span>`).join("")}</div>
          ${hs.slogan ? `<p class="slogan">${esc(hs.slogan)}</p>` : ""}</div></header>`;
    },
  },
  quote: {
    label: "ปรัชญาการสอน", w: "full", empty: "ยังไม่ได้เขียนปรัชญาการสอน ใส่ได้ที่เมนู \"โปรไฟล์\"",
    render: () => { const t = App.DATA.profile?.philosophy; return t ? `<blockquote class="quote"><b>ปรัชญาการสอน</b>${esc(t)}</blockquote>` : ""; },
  },
  stats: {
    label: "ตัวเลขผลงาน", w: "full",
    render: () => {
      const hours = list("trainings").reduce((s, t) => s + (Number(t.hours) || 0), 0);
      const photos = list("albums").reduce((s, a) => s + (a.photos || []).length, 0);
      const cells = [
        ["responsibilities", C.coral, list("responsibilities").length, "งานที่รับผิดชอบ"],
        ["certificates", C.gold, list("certificates").length, "เกียรติบัตรและรางวัล"],
        ["trainings", C.mint, hours.toLocaleString("th-TH"), "ชั่วโมงพัฒนาตนเอง"],
        ["works", C.pink, list("works").length, "ผลงานเด่น"],
        ["albums", C.orange, photos.toLocaleString("th-TH"), "ภาพกิจกรรม"],
      ];
      return `<div class="stats">${cells.map(([r, c, v, l]) => `<a class="stat" style="--sc:${c}" href="#/${r}"><b>${v}</b><span>${l}</span></a>`).join("")}</div>`;
    },
  },
  slideshow: {
    label: "สไลด์โชว์ภาพกิจกรรม", w: "full", empty: "ยังไม่มีรูป สร้างอัลบั้มแล้วเปิด \"แสดงในสไลด์โชว์\"",
    render: () => App.slideshowHTML(),
  },
  featured: {
    label: "ผลงานและเกียรติบัตรเด่น", w: "full", empty: "ยังไม่มีผลงานหรือเกียรติบัตรที่เป็นสาธารณะ",
    opts: [{ key: "n", label: "จำนวน", choices: [3, 4, 6], def: 4 }, { key: "pick", type: "pick" }],
    render: (o) => {
      const all = featuredPool();
      const picked = (o.pick || []).map((k) => all.find((x) => x.k === k)).filter(Boolean);
      const auto = all.filter((x) => !picked.includes(x)).sort((a, b) => b.rank - a.rank || String(b.date || "").localeCompare(String(a.date || "")));
      const items = [...picked, ...auto].slice(0, o.n || 4);
      if (!items.length) return "";
      return hbHead("ผลงานและเกียรติบัตรเด่น") + `<div class="feat-grid">${items.map((x) => {
        const img = safeUrl(x.img);
        return `<article class="feat" style="--c:${x.c}">
          ${img ? `<button class="feat-img" data-img="${esc(img)}" data-cap="${esc(x.title)}" style="background-image:url('${esc(img)}')" aria-label="ดูภาพ ${esc(x.title)}"></button>` : `<a class="feat-img none" href="#/${x.route}" aria-hidden="true" tabindex="-1">${x.icon}</a>`}
          <div class="feat-body"><span class="tag">${esc(x.tag)}</span>${x.level ? ` <span class="tag solid">${esc(x.level)}</span>` : ""}<h3>${esc(x.title)}</h3><div class="meta">${esc(x.sub)}</div>
          ${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener">ดูผลงาน</a>` : ""}</div></article>`;
      }).join("")}</div>`;
    },
  },
  albums: {
    label: "อัลบั้มภาพล่าสุด", w: "full", empty: "ยังไม่มีอัลบั้มที่เป็นสาธารณะ",
    opts: [{ key: "n", label: "จำนวน", choices: [3, 4, 6], def: 3 }],
    render: (o) => {
      const al = [...list("albums")].filter((a) => (a.photos || []).length).sort(byDateDesc).slice(0, o.n || 3);
      if (!al.length) return "";
      return hbHead("อัลบั้มภาพกิจกรรม", "albums") + `<div class="album-grid hb-albums">${al.map((a) => {
        const c = a.photos[0];
        return `<article class="album"><a href="#/albums?id=${a.id}" class="album-cover"><img src="${esc(c.img || c.url)}" alt="" loading="lazy"><span class="album-count">${a.photos.length} รูป</span></a>
          <div class="album-body"><h3><a href="#/albums?id=${a.id}">${esc(a.title)}</a></h3><div class="meta">${thDate(a.date)}</div></div></article>`;
      }).join("")}</div>`;
    },
  },
  facebook: {
    label: "กิจกรรมจาก Facebook ล่าสุด", w: "full", empty: "ยังไม่มีโพสต์ Facebook ที่เป็นสาธารณะ",
    opts: [{ key: "n", label: "จำนวนโพสต์", choices: [1, 2, 3], def: 3 }],
    render: (o) => {
      const posts = [...list("fbposts")].filter((p) => fbUrlOk(p.url)).sort(byDateDesc).slice(0, o.n || 3);
      if (!posts.length) return "";
      return hbHead("กิจกรรมจาก Facebook", "facebook") + `<div class="fb-strip" data-fb-lazy>${posts.map((p) => `<article class="fb-card">
        ${p.title ? `<div class="fb-head"><h3>${esc(p.title)}</h3><span class="meta">${thDate(p.date)}</span></div>` : ""}
        <div class="${fbKind(p.url)}" data-href="${esc(p.url)}" data-width="350" data-show-text="true"></div><p class="fb-wait meta">กำลังโหลดโพสต์…</p></article>`).join("")}</div>`;
    },
  },
  video: {
    label: "วิดีโอการสอนแนะนำ", w: "half", on: false, empty: "ยังไม่มีวิดีโอที่เป็นสาธารณะ",
    opts: [{ key: "vid", type: "video" }],
    render: (o) => {
      const vs = [...list("videos")].sort(byDateDesc);
      const v = vs.find((x) => String(x.id) === String(o.vid)) || vs[0];
      const id = v && ytId(v.url);
      if (!id) return "";
      return hbHead("วิดีโอการสอน", "videos") + `<article class="card video hb-video"><button class="yt" data-act="playYT" data-id="${id}" aria-label="เล่นวิดีโอ ${esc(v.title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play" aria-hidden="true"></span></button>
        <div class="video-body">${v.type ? `<span class="tag">${esc(v.type)}</span>` : ""}<h3>${esc(v.title)}</h3><div class="meta">${thDate(v.date)}</div></div></article>`;
    },
  },
  timeline: {
    label: "ความเคลื่อนไหวล่าสุด", w: "half", empty: "ยังไม่มีรายการที่มีวันที่",
    opts: [{ key: "n", label: "จำนวน", choices: [5, 8, 12], def: 5 }],
    render: (o) => {
      const ev = [
        ...list("trainings").map((x) => ({ d: x.date, t: `อบรม ${x.title}`, r: "trainings", c: C.mint })),
        ...list("certificates").map((x) => ({ d: x.date, t: `ได้รับ${x.type === "เกียรติบัตร" || !x.type ? "เกียรติบัตร" : x.type} ${x.title}`, r: "certificates", c: C.gold })),
        ...list("albums").map((x) => ({ d: x.date, t: `อัลบั้มใหม่: ${x.title}`, r: `albums?id=${x.id}`, c: C.orange })),
        ...list("videos").map((x) => ({ d: x.date, t: `วิดีโอ: ${x.title}`, r: "videos", c: C.coral })),
        ...list("fbposts").filter((x) => x.title).map((x) => ({ d: x.date, t: x.title, r: "facebook", c: C.sky })),
      ].filter((x) => x.d).sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, o.n || 5);
      if (!ev.length) return "";
      return hbHead("ความเคลื่อนไหวล่าสุด") + `<ol class="tl">${ev.map((x) => `<li style="--c:${x.c}"><a href="#/${x.r}"><span class="meta">${thDate(x.d)}</span>${esc(x.t)}</a></li>`).join("")}</ol>`;
    },
  },
  survey: {
    label: "ความพึงพอใจต่อการสอน", w: "half", empty: "ยังไม่มีแบบประเมินที่เปิดรับคำตอบ สร้างได้ที่เมนู \"แบบประเมินความพึงพอใจ\"",
    render: () => {
      const ss = App.DATA._surveys || [];
      const s = [...ss].sort((a, b) => b.counted - a.counted)[0];
      if (!s) return "";
      const url = `${location.origin}/${SITE}/#/survey?id=${s.id}`;
      const pct = (s.overall / 5) * 100;
      return hbHead("ความพึงพอใจต่อการสอน") + `<div class="card sat">
        <div class="sat-score">${s.counted ? `<b>${s.overall.toFixed(2)}</b><span class="sat-stars" style="--p:${pct}%" role="img" aria-label="${s.overall.toFixed(2)} จาก 5 ดาว">${STAR.repeat(5)}<i>${STAR.repeat(5)}</i></span>
          <span class="meta">จากผู้ประเมิน ${s.counted.toLocaleString("th-TH")} คน${s.target ? ` (${esc(s.target)})` : ""}</span>` : `<span class="meta">ยังไม่มีผู้ประเมิน มาเป็นคนแรกได้เลย</span>`}
          <a class="btn small" href="#/survey?id=${s.id}">ร่วมประเมินการสอน</a></div>
        <div class="sat-qr" aria-hidden="true">${window.qrSVG ? window.qrSVG(url, { size: 120, color: "#16142e" }) : ""}<small>สแกนเพื่อประเมิน</small></div></div>`;
    },
  },
  badges: {
    label: "เหรียญความสำเร็จ", w: "full", empty: "ยังไม่ได้รับเหรียญ ระบบจะมอบให้อัตโนมัติเมื่อผลงานถึงเกณฑ์",
    render: () => App.badgesHTML(true),
  },
  about: {
    label: "ประวัติการศึกษาและการติดต่อ", w: "full", empty: "ยังไม่ได้ใส่ประวัติการศึกษาหรืออีเมลติดต่อ ใส่ได้ที่เมนู \"โปรไฟล์\"",
    render: () => {
      const p = App.DATA.profile || {};
      const ed = p.education || [];
      if (!ed.length && !p.contactEmail) return "";
      return (ed.length ? `${hbHead("ประวัติการศึกษา")}<div class="stack">${ed.map((e) => `
        <div class="card item"><div class="item-body"><h3>${esc(e.degree)}</h3><div class="meta">${esc(e.institution)}</div></div><div class="item-side meta">${esc(e.year)}</div></div>`).join("")}</div>` : "") +
        (p.contactEmail ? `<p class="meta hb-contact">ติดต่อ: <a href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a></p>` : "");
    },
  },
};
// ลำดับเริ่มต้น (เรียงแบบที่ผู้ประเมินอ่านง่าย)
const HB_DEFAULT = ["hero", "quote", "stats", "slideshow", "featured", "albums", "facebook", "timeline", "survey", "video", "badges", "about"];

// ผลงานและเกียรติบัตรที่เลือกมาโชว์ได้
function featuredPool() {
  return [
    ...list("certificates").map((x) => ({ k: `c${x.id}`, title: x.title, sub: [x.issuer, thDate(x.date)].filter(Boolean).join(" "), date: x.date, img: x.image, tag: x.type || "เกียรติบัตร", level: x.level,
      rank: (LEVEL_ORDER[x.level] || 0) + (x.type && x.type !== "เกียรติบัตร" ? 1 : 0), c: C.gold, route: "certificates", icon: "🏅" })),
    ...list("works").map((x) => ({ k: `w${x.id}`, title: x.title, sub: x.year ? `ปีการศึกษา ${x.year}` : "", date: x.year, link: safeUrl(x.link), tag: x.type || "ผลงาน", rank: 2, c: C.pink, route: "works", icon: "✦" })),
  ];
}

// รวมค่าที่ครูตั้งไว้กับค่าเริ่มต้น บล็อกใหม่ที่เพิ่มภายหลังจะต่อท้ายแบบซ่อนไว้
App.homeBlocks = () => {
  const saved = App.DATA.settings?.home?.blocks;
  const def = (id) => ({ id, on: HB[id].on !== false, w: HB[id].w, ...Object.fromEntries((HB[id].opts || []).filter((o) => o.def !== undefined).map((o) => [o.key, o.def])) });
  if (!Array.isArray(saved)) return HB_DEFAULT.map(def);
  const out = saved.filter((b) => HB[b?.id]).map((b) => ({ ...def(b.id), ...b }));
  for (const id of HB_DEFAULT) if (!out.some((b) => b.id === id)) out.push({ ...def(id), on: false });
  return out;
};

const blockHTML = (b) => { try { return HB[b.id].render(b) || ""; } catch (e) { console.error(b.id, e); return ""; } };

// บล็อกครึ่งแถวที่ไม่มีคู่ ขยายเต็มแถวให้ จะได้ไม่เหลือช่องว่าง
const pairHalves = (arr) => {
  let run = [];
  const flush = () => { if (run.length % 2) run.at(-1).solo = true; run = []; };
  for (const x of arr) { if (x.w === "half") run.push(x); else flush(); }
  flush();
  return arr;
};

// ---------- หน้าแรกสาธารณะ ----------
App.pages[""] = () => {
  const shown = pairHalves(App.homeBlocks().filter((b) => b.on).map((b) => ({ ...b, html: blockHTML(b) })).filter((b) => b.html));
  return `<div class="home-grid">${shown.map((b) => `<section class="hb hb-${b.id} ${b.w === "half" && !b.solo ? "half" : ""}">${b.html}</section>`).join("")}</div>`;
};

// โหลดโพสต์ Facebook เมื่อเลื่อนมาถึงเท่านั้น หน้าแรกจะได้ไม่ช้า
App.afterRender = () => {
  const boxes = [...main.querySelectorAll("[data-fb-lazy]")];
  if (!boxes.length) return;
  const go = async (box) => {
    box.removeAttribute("data-fb-lazy");
    const FB = await loadFbSdk();
    if (!FB) { box.querySelectorAll(".fb-wait").forEach((w) => (w.textContent = "โหลด Facebook ไม่สำเร็จ")); return; }
    FB.XFBML.parse(box, () => box.querySelectorAll(".fb-wait").forEach((w) => w.remove()));
  };
  if (!("IntersectionObserver" in window)) return boxes.forEach(go);
  const io = new IntersectionObserver((ents) => ents.forEach((en) => { if (en.isIntersecting) { io.unobserve(en.target); go(en.target); } }), { rootMargin: "300px" });
  boxes.forEach((b) => io.observe(b));
};

// ---------- หน้าจัดหน้าแรก (ครู) ----------
let hbState = null; // รายการบล็อกที่กำลังแก้
const asPublic = (fn) => { const m = App.mode; App.mode = "public"; try { return fn(); } finally { App.mode = m; } };

const optsHTML = (b) => (HB[b.id].opts || []).map((o) => {
  if (o.type === "pick") {
    const pool = asPublic(featuredPool);
    const picked = new Set(b.pick || []);
    return pool.length ? `<div class="hb-opt"><span>เลือกชิ้นที่จะโชว์ก่อน <small>(ที่ไม่ได้เลือก ระบบเติมให้จากรางวัลระดับสูงสุด)</small></span>
      <div class="hb-picks">${pool.map((x) => `<label><input type="checkbox" class="ios-check" data-hb-pick="${x.k}" ${picked.has(x.k) ? "checked" : ""}> ${esc(x.icon)} ${esc(x.title)}</label>`).join("")}</div></div>` : "";
  }
  if (o.type === "video") {
    const vs = asPublic(() => [...list("videos")].sort(byDateDesc));
    return vs.length ? `<label class="hb-opt"><span>วิดีโอที่จะโชว์</span><select data-hb-opt="vid"><option value="">ล่าสุดเสมอ</option>
      ${vs.map((v) => `<option value="${v.id}" ${String(b.vid) === String(v.id) ? "selected" : ""}>${esc(v.title)}</option>`).join("")}</select></label>` : "";
  }
  return `<div class="hb-opt"><span>${o.label}</span><div class="seg" role="group" aria-label="${o.label}">${o.choices.map((c) => `<button type="button" data-hb-opt="${o.key}" data-v="${c}" aria-pressed="${Number(b[o.key] ?? o.def) === c}">${c}</button>`).join("")}</div></div>`;
}).join("");

const editBlockHTML = (b, i, n) => {
  const def = HB[b.id];
  const html = asPublic(() => blockHTML(b));
  return `<section class="hb edit ${b.on ? "" : "off"} ${b.w === "half" ? "half" : ""}" data-id="${b.id}">
    <div class="hb-bar">
      <button type="button" class="hb-handle" aria-label="ลากเพื่อย้าย ${esc(def.label)}" title="ลากเพื่อย้าย"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <b class="hb-name">${esc(def.label)}</b><span class="hb-off-tag">ซ่อนอยู่</span>
      <span class="hb-tools">
        <button type="button" class="hb-btn" data-hb="up" aria-label="เลื่อนขึ้น" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="hb-btn" data-hb="down" aria-label="เลื่อนลง" ${i === n - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="hb-btn hb-w" data-hb="width" title="ความกว้างบนคอมพิวเตอร์">${b.w === "half" ? "ครึ่งแถว" : "เต็มแถว"}</button>
        ${def.opts ? `<button type="button" class="hb-btn" data-hb="opts" aria-expanded="false">ตั้งค่า</button>` : ""}
        <button type="button" class="hb-btn hb-eye" data-hb="eye" aria-pressed="${b.on}">${b.on ? "แสดงอยู่" : "ซ่อนอยู่"}</button>
      </span>
    </div>
    ${def.opts ? `<div class="hb-opts" hidden>${optsHTML(b)}</div>` : ""}
    <div class="hb-content" inert>${html || `<p class="hb-empty">${esc(def.empty || "ยังไม่มีข้อมูล")} <small>บล็อกว่างจะไม่แสดงในหน้าสาธารณะ</small></p>`}</div>
  </section>`;
};

App.pages["admin/home"] = () => {
  hbState = App.homeBlocks();
  const acts = `<button class="btn ghost" data-act="hbReset">คืนค่าเริ่มต้น</button><a class="btn ghost" href="/${esc(SITE)}/" target="_blank" rel="noopener">ดูหน้าจริง</a><button class="btn" data-act="hbDone">เสร็จ</button>`;
  return head("จัดหน้าแรก", "ลากที่จับ ☰ เพื่อย้ายบล็อก กด \"แสดงอยู่ / ซ่อนอยู่\" เพื่อเลือกว่าจะโชว์หรือไม่ บันทึกให้อัตโนมัติ", acts) +
    `<p class="meta hb-note">ตัวอย่างนี้แสดงเฉพาะข้อมูลที่เป็นสาธารณะ เหมือนที่ผู้เยี่ยมชมเห็น บนมือถือทุกบล็อกจะเรียงเป็นแถวเดียว</p>
    <div class="home-grid editing" id="hbGrid">${hbState.map((b, i) => editBlockHTML(b, i, hbState.length)).join("")}</div>`;
};

const hbSave = () => {
  const s = (App.DATA.settings = App.DATA.settings || {});
  s.home = { blocks: hbState.map((b) => ({ ...b })) };
  saveKVLater("settings");
};
// อ่านลำดับจากหน้าจอ แล้วอัปเดตปุ่ม ↑ ↓
const hbSync = () => {
  const grid = $("#hbGrid");
  const els = [...grid.querySelectorAll(".hb")];
  hbState = els.map((el) => hbState.find((b) => b.id === el.dataset.id));
  els.forEach((el, i) => { el.querySelector('[data-hb="up"]').disabled = i === 0; el.querySelector('[data-hb="down"]').disabled = i === els.length - 1; });
  hbSave();
};
const hbRefresh = (el) => {
  const b = hbState.find((x) => x.id === el.dataset.id);
  el.querySelector(".hb-content").innerHTML = asPublic(() => blockHTML(b)) || `<p class="hb-empty">${esc(HB[b.id].empty || "ยังไม่มีข้อมูล")}</p>`;
  App.wireSlideshow?.(); App.afterRender();
};

App.actions.hbReset = () => {
  if (!confirm("คืนหน้าแรกเป็นแบบเริ่มต้น? ลำดับและการซ่อนที่จัดไว้จะหายไป")) return;
  delete App.DATA.settings.home;
  saveKV("settings").then(() => { toast("คืนค่าเริ่มต้นแล้ว"); render(); }).catch((e) => toast(e.message));
};
App.actions.hbDone = async () => {
  try { clearTimeout(saveTimers.settings); await saveKV("settings"); toast("บันทึกหน้าแรกแล้ว"); location.hash = "#/"; }
  catch (e) { toast(`บันทึกไม่สำเร็จ: ${e.message}`); }
};

main.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-hb], [data-hb-opt]");
  if (!btn || !$("#hbGrid")?.contains(btn)) return;
  const el = btn.closest(".hb");
  const b = hbState.find((x) => x.id === el.dataset.id);
  const a = btn.dataset.hb;
  if (a === "eye") {
    b.on = !b.on;
    el.classList.toggle("off", !b.on);
    btn.setAttribute("aria-pressed", String(b.on));
    btn.textContent = b.on ? "แสดงอยู่" : "ซ่อนอยู่";
    toast(b.on ? `แสดง "${HB[b.id].label}" แล้ว` : `ซ่อน "${HB[b.id].label}" แล้ว`);
    hbSave();
  } else if (a === "width") {
    b.w = b.w === "half" ? "full" : "half";
    el.classList.toggle("half", b.w === "half");
    btn.textContent = b.w === "half" ? "ครึ่งแถว" : "เต็มแถว";
    hbSave();
  } else if (a === "up" || a === "down") {
    const sib = a === "up" ? el.previousElementSibling : el.nextElementSibling;
    if (!sib) return;
    flip(() => (a === "up" ? sib.before(el) : sib.after(el)));
    hbSync();
    el.querySelector(`[data-hb="${a}"]:not(:disabled)`)?.focus() || btn.focus();
  } else if (a === "opts") {
    const box = el.querySelector(".hb-opts");
    box.hidden = !box.hidden;
    btn.setAttribute("aria-expanded", String(!box.hidden));
  } else if (btn.dataset.hbOpt) {
    b[btn.dataset.hbOpt] = Number(btn.dataset.v);
    btn.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    hbRefresh(el); hbSave();
  }
});
main.addEventListener("change", (e) => {
  const t = e.target;
  if (!$("#hbGrid")?.contains(t)) return;
  const el = t.closest(".hb");
  const b = hbState.find((x) => x.id === el.dataset.id);
  if (t.dataset.hbPick) {
    const set = new Set(b.pick || []);
    t.checked ? set.add(t.dataset.hbPick) : set.delete(t.dataset.hbPick);
    b.pick = [...set];
  } else if (t.dataset.hbOpt) b[t.dataset.hbOpt] = t.value;
  else return;
  hbRefresh(el); hbSave();
});

// ขยับบล็อกอื่นแบบนุ่มนวลตอนสลับตำแหน่ง (FLIP)
function flip(change) {
  const els = [...$("#hbGrid").querySelectorAll(".hb:not(.dragging)")];
  const before = new Map(els.map((el) => [el, el.getBoundingClientRect()]));
  change();
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  els.forEach((el) => {
    const a = before.get(el), b = el.getBoundingClientRect();
    const dx = a.left - b.left, dy = a.top - b.top;
    if (!dx && !dy) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 220, easing: "cubic-bezier(.2,.8,.2,1)" });
  });
}

// ---------- ลากวาง (เมาส์ นิ้ว ปากกา) ----------
let drag = null;
main.addEventListener("pointerdown", (e) => {
  const h = e.target.closest(".hb-handle");
  if (!h || !$("#hbGrid")?.contains(h) || e.button > 0) return;
  e.preventDefault();
  const el = h.closest(".hb");
  const r = el.getBoundingClientRect();
  const ph = document.createElement("div");
  ph.className = `hb-ph ${el.classList.contains("half") ? "half" : ""}`;
  ph.style.height = `${Math.min(r.height, 220)}px`;
  el.before(ph);
  Object.assign(el.style, { position: "fixed", left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, maxHeight: "220px", zIndex: 50 });
  el.classList.add("dragging");
  el.parentNode.appendChild(el); // ตัวที่ลากลอยอยู่ ย้ายไปท้ายสุด ช่องว่าง (ph) คือตำแหน่งจริง
  drag = { el, ph, ox: e.clientX - r.left, oy: Math.min(e.clientY - r.top, 40), y: e.clientY, x: e.clientX };
  el.style.top = `${e.clientY - drag.oy}px`;
  navigator.vibrate?.(10);
  requestAnimationFrame(autoScroll);
});
window.addEventListener("pointermove", (e) => {
  if (!drag) return;
  drag.x = e.clientX; drag.y = e.clientY;
  drag.el.style.left = `${e.clientX - drag.ox}px`;
  drag.el.style.top = `${e.clientY - drag.oy}px`;
  placeAt(e.clientX, e.clientY);
});
const placeAt = (x, y) => {
  // นิ้วอยู่บนแถบด้านบน/ขอบจอ: ใช้บล็อกที่อยู่ใกล้ที่สุดแทน
  const under = document.elementFromPoint(x, y)?.closest("#hbGrid .hb:not(.dragging)")
    || [...$("#hbGrid").querySelectorAll(".hb:not(.dragging)")].find((el) => el.getBoundingClientRect().bottom >= y);
  if (!under) return;
  const r = under.getBoundingClientRect();
  const before = under.classList.contains("half") && innerWidth > 860 ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
  const target = before ? under : under.nextSibling;
  if (target === drag.ph || target === drag.ph.nextSibling) return;
  flip(() => under.parentNode.insertBefore(drag.ph, target));
};
// เลื่อนจออัตโนมัติเมื่อลากไปใกล้ขอบบน/ล่าง
function autoScroll() {
  if (!drag) return;
  const edge = 90;
  const v = Math.max(-24, Math.min(24, drag.y < edge ? -(edge - drag.y) / 3 : drag.y > innerHeight - edge ? (drag.y - (innerHeight - edge)) / 3 : 0));
  if (v) { scrollBy(0, v); placeAt(drag.x, drag.y); }
  requestAnimationFrame(autoScroll);
}
const endDrag = () => {
  if (!drag) return;
  const { el, ph } = drag;
  drag = null;
  ph.replaceWith(el);
  el.classList.remove("dragging");
  ["position", "left", "top", "width", "maxHeight", "zIndex"].forEach((k) => (el.style[k] = ""));
  el.animate([{ transform: "scale(1.02)" }, { transform: "none" }], { duration: 180 });
  hbSync();
};
window.addEventListener("pointerup", endDrag);
window.addEventListener("pointercancel", endDrag);

// ลิงก์จากหน้าตั้งค่า
const _settingsExtras = App.settingsExtras;
App.settingsExtras = () => `<section class="panel"><h2 class="row-head">หน้าแรกสาธารณะ <a class="btn small" href="#/home">จัดหน้าแรก</a></h2>
  <p class="meta">เลือกบล็อก เรียงลำดับแบบลากวาง ซ่อนหรือแสดง (ตอนนี้แสดง ${App.homeBlocks().filter((b) => b.on).length} จาก ${App.homeBlocks().length} บล็อก)</p></section>` + (_settingsExtras ? _settingsExtras() : "");
