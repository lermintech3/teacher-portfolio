// หน้าแรกแบบบล็อก: ครูเลือกบล็อก เรียงลำดับ (ลากวาง) ซ่อน/แสดง และเลือกความกว้างได้เอง
// เก็บใน settings.home.blocks = [{ id, uid, on, w: "full"|"half"|"third", title?, bg?, ...ตัวเลือก/เนื้อหาของบล็อก }]  แยกตามครูแต่ละคน
// id = ชนิดบล็อก, uid = บล็อกแต่ละอัน (ชนิดเดียวกันมีหลายอันได้ บล็อกอิสระ เช่น ข้อความ รูป เพิ่มได้ไม่จำกัด)
// โหลดหลัง features.js

const LEVEL_ORDER = { "ประเทศ": 5, "ภาค": 4, "จังหวัด": 3, "เขตพื้นที่": 2, "โรงเรียน": 1 };
const more = (route, label = "ดูทั้งหมด") => `<a class="hb-more" href="#/${route}">${label}</a>`;
const hbHead = (title, route) => `<div class="hb-head"><h2>${title}</h2>${route ? more(route) : ""}</div>`;
// หัวข้อบล็อก: ครูตั้งชื่อเองได้ ถ้าไม่ตั้งใช้ชื่อเดิม
const ttl = (o, id) => esc(String(o.title || "").trim() || HB[id].head);
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
      return `<div class="hero-wrap${hs.cover ? " has-cover" : ""}">${hs.cover}<header class="band hero ${hs.cls}">
        <div class="hero-photo ${photo ? "photo" : ""}" style="${photo ? `background-image:url('${esc(photo)}')` : ""}">${photo ? "" : esc(initials(p.name))}</div>
        <div><h1>${esc(p.name)}</h1>
          <div class="who">${esc([p.position, p.academicStanding].filter(Boolean).join(" "))}<br>${esc(p.school)}${p.office ? `<br><span class="meta">${esc(p.office)}</span>` : ""}</div>
          <div class="chips">${[p.learningArea, ...(p.subjects || []), p.homeroom].filter(Boolean).map((s) => `<span class="tag solid">${esc(s)}</span>`).join("")}</div>
          ${hs.slogan ? `<p class="slogan">${esc(hs.slogan)}</p>` : ""}</div></header></div>`;
    },
  },
  quote: {
    label: "ปรัชญาการสอน", head: "ปรัชญาการสอน", w: "full", empty: "ยังไม่ได้เขียนปรัชญาการสอน ใส่ได้ที่เมนู \"โปรไฟล์\"",
    render: (o) => { const t = App.DATA.profile?.philosophy; return t ? `<blockquote class="quote"><b>${ttl(o, "quote")}</b>${esc(t)}</blockquote>` : ""; },
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
    label: "ผลงานและเกียรติบัตรเด่น", head: "ผลงานและเกียรติบัตรเด่น", w: "full", empty: "ยังไม่มีผลงานหรือเกียรติบัตรที่เป็นสาธารณะ",
    opts: [{ key: "n", label: "จำนวน", choices: [3, 4, 6], def: 4 }, { key: "pick", type: "pick" }],
    render: (o) => {
      const all = featuredPool();
      const picked = (o.pick || []).map((k) => all.find((x) => x.k === k)).filter(Boolean);
      const auto = all.filter((x) => !picked.includes(x)).sort((a, b) => b.rank - a.rank || String(b.date || "").localeCompare(String(a.date || "")));
      const items = [...picked, ...auto].slice(0, o.n || 4);
      if (!items.length) return "";
      return hbHead(ttl(o, "featured")) + `<div class="feat-grid">${items.map((x) => {
        const img = safeUrl(x.img);
        return `<article class="feat" style="--c:${x.c}">
          ${x.k[0] === "w" ? App.docCover({ link: x.link, tag: x.tag, title: x.title, sub: x.sub, desc: x.desc, cls: "feat-img doc" }) : img ? `<button class="feat-img" data-img="${esc(img)}" data-cap="${esc(x.title)}" style="background-image:url('${esc(img)}')" aria-label="ดูภาพ ${esc(x.title)}"></button>` : `<a class="feat-img none" href="#/${x.route}" aria-hidden="true" tabindex="-1">${x.icon}</a>`}
          <div class="feat-body"><span class="tag">${esc(x.tag)}</span>${x.level ? ` <span class="tag solid">${esc(x.level)}</span>` : ""}<h3>${esc(x.title)}</h3><div class="meta">${esc(x.sub)}</div>
          ${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener" ${App.docAttrs({ title: x.title, tag: x.tag, sub: x.sub, desc: x.desc })}>ดูผลงาน</a>` : ""}</div></article>`;
      }).join("")}</div>`;
    },
  },
  albums: {
    label: "อัลบั้มภาพล่าสุด", head: "อัลบั้มภาพกิจกรรม", w: "full", empty: "ยังไม่มีอัลบั้มที่เป็นสาธารณะ",
    opts: [{ key: "n", label: "จำนวน", choices: [3, 4, 6], def: 3 }],
    render: (o) => {
      const al = [...list("albums")].filter((a) => (a.photos || []).length).sort(byDateDesc).slice(0, o.n || 3);
      if (!al.length) return "";
      return hbHead(ttl(o, "albums"), "albums") + `<div class="album-grid hb-albums">${al.map((a) => {
        const c = a.photos[0];
        return `<article class="album"><a href="#/albums?id=${a.id}" class="album-cover"><img src="${esc(c.img || c.url)}" alt="" loading="lazy"><span class="album-count">${a.photos.length} รูป</span></a>
          <div class="album-body"><h3><a href="#/albums?id=${a.id}">${esc(a.title)}</a></h3><div class="meta">${thDate(a.date)}</div></div></article>`;
      }).join("")}</div>`;
    },
  },
  facebook: {
    label: "กิจกรรมจาก Facebook ล่าสุด", head: "กิจกรรมจาก Facebook", w: "full", empty: "ยังไม่มีโพสต์ Facebook ที่เป็นสาธารณะ",
    opts: [{ key: "n", label: "จำนวนโพสต์", choices: [1, 2, 3], def: 3 }],
    render: (o) => {
      const posts = [...list("fbposts")].filter((p) => fbUrlOk(p.url)).sort(byDateDesc).slice(0, o.n || 3);
      if (!posts.length) return "";
      return hbHead(ttl(o, "facebook"), "facebook") + `<div class="fb-strip" data-fb-lazy>${posts.map((p) => `<article class="fb-card">
        ${p.title ? `<div class="fb-head"><h3>${esc(p.title)}</h3><span class="meta">${thDate(p.date)}</span></div>` : ""}
        <div class="${fbKind(p.url)}" data-href="${esc(p.url)}" data-width="350" data-show-text="true"></div><p class="fb-wait meta">กำลังโหลดโพสต์…</p></article>`).join("")}</div>`;
    },
  },
  video: {
    label: "วิดีโอการสอนแนะนำ", head: "วิดีโอการสอน", w: "half", on: false, empty: "ยังไม่มีวิดีโอที่เป็นสาธารณะ",
    opts: [{ key: "vid", type: "video" }],
    render: (o) => {
      const vs = [...list("videos")].sort(byDateDesc);
      const v = vs.find((x) => String(x.id) === String(o.vid)) || vs[0];
      const id = v && ytId(v.url);
      if (!id) return "";
      return hbHead(ttl(o, "video"), "videos") + `<article class="card video hb-video"><button class="yt" data-act="playYT" data-id="${id}" aria-label="เล่นวิดีโอ ${esc(v.title)}"><img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play" aria-hidden="true"></span></button>
        <div class="video-body">${v.type ? `<span class="tag">${esc(v.type)}</span>` : ""}<h3>${esc(v.title)}</h3><div class="meta">${thDate(v.date)}</div></div></article>`;
    },
  },
  timeline: {
    label: "ความเคลื่อนไหวล่าสุด", head: "ความเคลื่อนไหวล่าสุด", w: "half", empty: "ยังไม่มีรายการที่มีวันที่",
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
      return hbHead(ttl(o, "timeline")) + `<ol class="tl">${ev.map((x) => `<li style="--c:${x.c}"><a href="#/${x.r}"><span class="meta">${thDate(x.d)}</span>${esc(x.t)}</a></li>`).join("")}</ol>`;
    },
  },
  survey: {
    label: "ความพึงพอใจต่อการสอน", head: "ความพึงพอใจต่อการสอน", w: "half", empty: "ยังไม่มีแบบประเมินที่เปิดรับคำตอบ สร้างได้ที่เมนู \"แบบประเมินความพึงพอใจ\"",
    render: (o) => {
      const ss = App.DATA._surveys || [];
      const s = [...ss].sort((a, b) => b.counted - a.counted)[0];
      if (!s) return "";
      const url = `${location.origin}/${SITE}/#/survey?id=${s.id}`;
      const pct = (s.overall / 5) * 100;
      return hbHead(ttl(o, "survey")) + `<div class="card sat">
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
    label: "ประวัติการศึกษาและการติดต่อ", head: "ประวัติการศึกษา", w: "full", empty: "ยังไม่ได้ใส่ประวัติการศึกษาหรืออีเมลติดต่อ ใส่ได้ที่เมนู \"โปรไฟล์\"",
    render: (o) => {
      const p = App.DATA.profile || {};
      const ed = p.education || [];
      if (!ed.length && !p.contactEmail) return "";
      return (ed.length ? `${hbHead(ttl(o, "about"))}<div class="stack">${ed.map((e) => `
        <div class="card item"><div class="item-body"><h3>${esc(e.degree)}</h3><div class="meta">${esc(e.institution)}</div></div><div class="item-side meta">${esc(e.year)}</div></div>`).join("")}</div>` : "") +
        (p.contactEmail ? `<p class="meta hb-contact">ติดต่อ: <a href="mailto:${esc(p.contactEmail)}">${esc(p.contactEmail)}</a></p>` : "");
    },
  },

  // ---------- บล็อกอิสระ: ครูเพิ่มเอง ใส่ซ้ำได้หลายอัน (custom: true) ----------
  text: {
    label: "ข้อความ", custom: true, icon: "¶", w: "full", empty: "ยังไม่ได้เขียนข้อความ กด \"แก้เนื้อหา\"",
    form: [
      { key: "title", label: "หัวข้อ", hint: "เว้นว่างได้" },
      { key: "body", label: "ข้อความ", type: "textarea", hint: "เว้นบรรทัดว่างเพื่อขึ้นย่อหน้าใหม่ ใส่ **คำ** เพื่อทำตัวหนา ลิงก์ที่ขึ้นต้นด้วย https:// กดได้อัตโนมัติ" },
      { key: "align", label: "จัดข้อความ", options: ["ชิดซ้าย", "กึ่งกลาง"] },
    ],
    render: (o) => {
      if (!o.title && !o.body) return "";
      return `<div class="hb-text ${o.align === "กึ่งกลาง" ? "center" : ""}">${o.title ? `<h2>${esc(o.title)}</h2>` : ""}${richText(o.body)}</div>`;
    },
  },
  image: {
    label: "รูปภาพ", custom: true, icon: "▣", w: "half", empty: "ยังไม่ได้เลือกรูป กด \"แก้เนื้อหา\"",
    form: [
      { key: "title", label: "หัวข้อ", hint: "เว้นว่างได้" },
      { key: "img", label: "รูป", type: "file", store: "img", accept: "image/*", category: "homepage" },
      { key: "caption", label: "คำบรรยายใต้รูป" },
      { key: "link", label: "กดรูปแล้วไปที่", type: "url", hint: "เว้นว่าง = กดแล้วขยายรูป" },
    ],
    render: (o) => {
      const src = safeUrl(o.img);
      if (!src) return "";
      const link = safeUrl(o.link);
      const pic = `<img src="${esc(src)}" alt="${esc(o.caption || o.title || "")}" loading="lazy">`;
      return `${o.title ? hbHead(esc(o.title)) : ""}<figure class="hb-figure">
        ${link ? `<a href="${esc(link)}" ${/^\//.test(link) ? "" : 'target="_blank" rel="noopener"'}>${pic}</a>` : `<button type="button" data-img="${esc(src)}" data-cap="${esc(o.caption || o.title || "")}" aria-label="ขยายรูป">${pic}</button>`}
        ${o.caption ? `<figcaption>${esc(o.caption)}</figcaption>` : ""}</figure>`;
    },
  },
  links: {
    label: "ปุ่มลิงก์", custom: true, icon: "↗", w: "half", empty: "ยังไม่ได้ใส่ปุ่ม กด \"แก้เนื้อหา\"",
    form: [
      { key: "title", label: "หัวข้อ", hint: "เว้นว่างได้" },
      { key: "body", label: "ข้อความสั้นๆ", type: "textarea" },
      ...[1, 2, 3].flatMap((n) => [
        { key: `b${n}t`, label: `ปุ่มที่ ${n}: ชื่อปุ่ม`, hint: n === 1 ? "เช่น ดาวน์โหลดแผนการสอน, เว็บไซต์โรงเรียน" : "" },
        { key: `b${n}u`, label: `ปุ่มที่ ${n}: ลิงก์`, type: "url" },
      ]),
    ],
    render: (o) => {
      const btns = [1, 2, 3].map((n) => ({ t: o[`b${n}t`], u: safeUrl(o[`b${n}u`]) })).filter((b) => b.t && b.u);
      if (!btns.length && !o.title && !o.body) return "";
      return `<div class="hb-links">${o.title ? `<h2>${esc(o.title)}</h2>` : ""}${richText(o.body)}
        ${btns.length ? `<div class="hb-btns">${btns.map((b, i) => `<a class="btn ${i ? "ghost" : ""}" href="${esc(b.u)}" ${/^\//.test(b.u) ? "" : 'target="_blank" rel="noopener"'}>${esc(b.t)}</a>`).join("")}</div>` : ""}</div>`;
    },
  },
  embed: {
    label: "ฝังวิดีโอ / เอกสาร / แผนที่", custom: true, icon: "▶", w: "half", empty: "ยังไม่ได้ใส่ลิงก์ กด \"แก้เนื้อหา\"",
    form: [
      { key: "title", label: "หัวข้อ", hint: "เว้นว่างได้" },
      { key: "url", label: "ลิงก์", type: "url", required: true, hint: "YouTube, ไฟล์ Google Drive, Google Docs / Slides / Sheets, Canva, PDF หรือลิงก์ฝังของ Google Maps (เมนู แชร์ → ฝังแผนที่)" },
      { key: "caption", label: "คำอธิบายใต้ลิงก์" },
    ],
    render: (o) => {
      const m = embedOf(o.url);
      if (!m) return "";
      const body = m.yt
        ? `<button class="yt" data-act="playYT" data-id="${m.yt}" aria-label="เล่นวิดีโอ ${esc(o.title || "")}"><img src="https://i.ytimg.com/vi/${m.yt}/hqdefault.jpg" alt="" loading="lazy"><span class="yt-play" aria-hidden="true"></span></button>`
        : m.img ? `<img src="${esc(m.img)}" alt="${esc(o.caption || o.title || "")}" loading="lazy">`
        : m.src ? `<iframe src="${esc(m.src)}" title="${esc(o.title || "เนื้อหาที่ฝัง")}" loading="lazy" allow="fullscreen" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>`
        : `<a class="btn" href="${esc(m.link)}" target="_blank" rel="noopener">เปิดลิงก์</a>`;
      return `${o.title ? hbHead(esc(o.title)) : ""}<div class="hb-embed ${m.tall ? "tall" : ""} ${m.link ? "plain" : ""}">${body}</div>${o.caption ? `<p class="meta hb-cap">${esc(o.caption)}</p>` : ""}`;
    },
  },
};
const CUSTOM = Object.keys(HB).filter((id) => HB[id].custom);

// ข้อความหลายย่อหน้า: เว้นบรรทัด = ย่อหน้าใหม่, **ตัวหนา**, ลิงก์ https กดได้
function richText(t) {
  const s = String(t || "").trim();
  if (!s) return "";
  return s.split(/\n\s*\n/).map((p) => `<p>${esc(p)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"]/g, (u) => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`)
    .replace(/\n/g, "<br>")}</p>`).join("");
}

// ลิงก์ → วิธีแสดงในบล็อกฝัง
function embedOf(url) {
  const u = safeUrl(String(url || "").trim());
  if (!/^https:\/\//i.test(u)) return null;
  if (/^https:\/\/(www\.)?google\.[a-z.]+\/maps\/embed/i.test(u)) return { src: u, tall: true };
  const canva = u.match(/^https:\/\/(?:www\.)?canva\.com\/design\/([\w-]+)\/([\w-]+)\//i);
  if (canva) return { src: `https://www.canva.com/design/${canva[1]}/${canva[2]}/view?embed` };
  const m = paMedia(u);
  if (m.kind === "video") return { yt: ytId(u) };
  if (m.kind === "image") return { img: u };
  if (m.embed) return { src: m.embed, tall: ["doc", "sheet", "pdf"].includes(m.kind) };
  return { link: u };
}

// ความกว้าง (หน่วยจาก 6 ช่อง) และสีพื้นของบล็อก
const WIDTHS = { full: ["เต็มแถว", 6], half: ["ครึ่งแถว", 3], third: ["1/3 แถว", 2] };
const W_NEXT = { full: "half", half: "third", third: "full" };
const span = (w) => (WIDTHS[w] || WIDTHS.full)[1];
const BGS = {
  "": ["ไม่มี", "transparent"], card: ["การ์ดขาว", "#ffffff"], violet: ["ม่วง", "#f1edfe"], sky: ["ฟ้า", "#e7f4fd"],
  mint: ["เขียว", "#e5f8f0"], gold: ["เหลือง", "#fff5d9"], pink: ["ชมพู", "#fdecf4"], peach: ["ส้ม", "#fff0e5"],
};
const bgCls = (b) => (b.bg && BGS[b.bg] ? "hb-bg" : "");
const bgStyle = (b) => (b.bg && BGS[b.bg] ? `--hb-bg:${BGS[b.bg][1]};` : "");
const newUid = (id) => `${id}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
// ลำดับเริ่มต้น (เรียงแบบที่ผู้ประเมินอ่านง่าย)
const HB_DEFAULT = ["hero", "quote", "stats", "slideshow", "featured", "albums", "facebook", "timeline", "survey", "video", "badges", "about"];

// ผลงานและเกียรติบัตรที่เลือกมาโชว์ได้
function featuredPool() {
  return [
    ...list("certificates").map((x) => ({ k: `c${x.id}`, title: x.title, sub: [x.issuer, thDate(x.date)].filter(Boolean).join(" "), date: x.date, img: x.image, tag: x.type || "เกียรติบัตร", level: x.level,
      rank: (LEVEL_ORDER[x.level] || 0) + (x.type && x.type !== "เกียรติบัตร" ? 1 : 0), c: C.gold, route: "certificates", icon: "🏅" })),
    ...list("works").map((x) => ({ k: `w${x.id}`, title: x.title, sub: x.year ? `ปีการศึกษา ${x.year}` : "", date: x.year, link: safeUrl(x.link), desc: x.description || "", tag: x.type || "ผลงาน", rank: 2, c: C.pink, route: "works", icon: "✦" })),
  ];
}

// รวมค่าที่ครูตั้งไว้กับค่าเริ่มต้น บล็อกใหม่ที่เพิ่มภายหลังจะต่อท้ายแบบซ่อนไว้
// แต่ละบล็อกมี uid ไม่ซ้ำกัน (บล็อกเดิมใช้ uid = id จึงอ่านค่าที่บันทึกไว้ก่อนหน้าได้) บล็อกชนิดเดียวกันมีได้หลายอัน
const blockDefaults = (id) => ({ id, uid: id, on: HB[id].on !== false, w: HB[id].w, ...Object.fromEntries((HB[id].opts || []).filter((o) => o.def !== undefined).map((o) => [o.key, o.def])) });
App.homeBlocks = () => {
  const saved = App.DATA.settings?.home?.blocks;
  if (!Array.isArray(saved)) return HB_DEFAULT.map(blockDefaults);
  const seen = new Set();
  const out = saved.filter((b) => HB[b?.id]).map((b) => ({ ...blockDefaults(b.id), ...b, uid: b.uid || b.id }))
    .filter((b) => !seen.has(b.uid) && seen.add(b.uid));
  for (const id of HB_DEFAULT) if (!out.some((b) => b.id === id)) out.push({ ...blockDefaults(id), on: false });
  return out;
};

const blockHTML = (b) => { try { return HB[b.id].render(b) || ""; } catch (e) { console.error(b.id, e); return ""; } };

// จัดบล็อกลงแถวละ 6 ช่อง แถวที่ไม่เต็ม แบ่งความกว้างให้เท่ากัน จะได้ไม่เหลือช่องว่าง
const packRows = (arr) => {
  let row = [], sum = 0;
  const flush = () => { if (row.length && sum < 6) row.forEach((x) => (x.span = 6 / row.length)); row = []; sum = 0; };
  for (const x of arr) {
    x.span = span(x.w);
    if (sum + x.span > 6) flush();
    row.push(x); sum += x.span;
    if (sum === 6) flush();
  }
  flush();
  return arr;
};

// ---------- หน้าแรกสาธารณะ ----------
App.pages[""] = () => {
  const shown = packRows(App.homeBlocks().filter((b) => b.on).map((b) => ({ ...b, html: blockHTML(b) })).filter((b) => b.html));
  return `<div class="home-grid">${shown.map((b) => `<section class="hb hb-${b.id} ${bgCls(b)}" style="--span:${b.span};${bgStyle(b)}">${b.html}</section>`).join("")}</div>`;
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
const byUid = (uid) => hbState.find((x) => x.uid === uid);

const optsHTML = (b) => {
  const def = HB[b.id];
  const common = [
    def.head ? `<label class="hb-opt"><span>หัวข้อบล็อก <small>(เว้นว่าง = "${esc(def.head)}")</small></span><input type="text" data-hb-title value="${esc(b.title || "")}" placeholder="${esc(def.head)}" maxlength="80"></label>` : "",
    `<div class="hb-opt"><span>สีพื้นหลัง</span><div class="hb-swatches" role="radiogroup" aria-label="สีพื้นหลัง">${Object.entries(BGS).map(([k, [label, c]]) =>
      `<button type="button" role="radio" data-hb-bg="${k}" aria-checked="${(b.bg || "") === k}" title="${label}" aria-label="${label}" style="--sw:${c}"></button>`).join("")}</div></div>`,
  ];
  const own = (def.opts || []).map((o) => {
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
  });
  return [...common, ...own].join("");
};

const contentHTML = (b) => {
  const html = asPublic(() => blockHTML(b));
  return html ? `<div class="hb-inner ${bgCls(b)}" style="${bgStyle(b)}">${html}</div>`
    : `<p class="hb-empty">${esc(HB[b.id].empty || "ยังไม่มีข้อมูล")} <small>บล็อกว่างจะไม่แสดงในหน้าสาธารณะ</small></p>`;
};

const editBlockHTML = (b, i, n) => {
  const def = HB[b.id];
  const name = def.custom ? (b.title ? `${def.label}: ${b.title}` : def.label) : (b.title ? `${def.label} (“${b.title}”)` : def.label);
  return `<section class="hb edit ${b.on ? "" : "off"}" data-uid="${b.uid}" style="--span:${span(b.w)}">
    <div class="hb-bar">
      <button type="button" class="hb-handle" aria-label="ลากเพื่อย้าย ${esc(def.label)}" title="ลากเพื่อย้าย"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
      <b class="hb-name">${esc(name)}</b><span class="hb-off-tag">ซ่อนอยู่</span>
      <span class="hb-tools">
        <button type="button" class="hb-btn" data-hb="up" aria-label="เลื่อนขึ้น" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="hb-btn" data-hb="down" aria-label="เลื่อนลง" ${i === n - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="hb-btn hb-w" data-hb="width" title="ความกว้างบนคอมพิวเตอร์ กดเพื่อสลับ">${WIDTHS[b.w]?.[0] || "เต็มแถว"}</button>
        ${def.form ? `<button type="button" class="hb-btn hb-main" data-hb="edit">แก้เนื้อหา</button>` : ""}
        <button type="button" class="hb-btn" data-hb="opts" aria-expanded="false">ตั้งค่า</button>
        <button type="button" class="hb-btn" data-hb="copy" title="ทำซ้ำบล็อกนี้">ทำซ้ำ</button>
        ${b.uid !== b.id ? `<button type="button" class="hb-btn hb-del" data-hb="del">ลบ</button>` : ""}
        <button type="button" class="hb-btn hb-eye" data-hb="eye" aria-pressed="${b.on}">${b.on ? "แสดงอยู่" : "ซ่อนอยู่"}</button>
      </span>
    </div>
    <div class="hb-opts" hidden>${optsHTML(b)}</div>
    <div class="hb-content" inert>${contentHTML(b)}</div>
  </section>`;
};

App.pages["admin/home"] = () => {
  hbState = App.homeBlocks();
  const acts = `<button class="btn ghost" data-act="hbReset">คืนค่าเริ่มต้น</button><a class="btn ghost" href="/${esc(SITE)}/" target="_blank" rel="noopener">ดูหน้าจริง</a><button class="btn" data-act="hbDone">เสร็จ</button>`;
  return head("จัดหน้าแรก", "ลากที่จับ ☰ เพื่อย้ายบล็อก กด \"แสดงอยู่ / ซ่อนอยู่\" เพื่อเลือกว่าจะโชว์หรือไม่ บันทึกให้อัตโนมัติ", acts) +
    `<div class="hb-add"><b>เพิ่มบล็อกใหม่</b>${CUSTOM.map((id) => `<button type="button" class="hb-btn" data-hb-add="${id}"><span aria-hidden="true">${HB[id].icon}</span> ${esc(HB[id].label)}</button>`).join("")}</div>
    <p class="meta hb-note">ตัวอย่างนี้แสดงเฉพาะข้อมูลที่เป็นสาธารณะ เหมือนที่ผู้เยี่ยมชมเห็น บนมือถือทุกบล็อกจะเรียงเป็นแถวเดียว ถ้าแถวไหนบล็อกไม่เต็ม ระบบจะขยายให้เต็มแถวเอง</p>
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
  hbState = els.map((el) => byUid(el.dataset.uid)).filter(Boolean);
  els.forEach((el, i) => { el.querySelector('[data-hb="up"]').disabled = i === 0; el.querySelector('[data-hb="down"]').disabled = i === els.length - 1; });
  hbSave();
};
const hbRefresh = (el) => {
  el.querySelector(".hb-content").innerHTML = contentHTML(byUid(el.dataset.uid));
  App.wireSlideshow?.(); App.afterRender();
};
const hbFocus = (uid) => setTimeout(() => {
  const el = $(`#hbGrid .hb[data-uid="${uid}"]`);
  if (!el) return;
  el.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
  el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1400);
}, 60);

// ฟอร์มเนื้อหาของบล็อกอิสระ (เพิ่มใหม่ หรือแก้ของเดิม)
const editContent = (id, b) => {
  const def = HB[id];
  openForm(b ? `แก้บล็อก${def.label}` : `เพิ่มบล็อก${def.label}`, def.form.map((f) => ({ ...f, value: b ? b[f.key] ?? "" : f.options ? f.options[0] : "" })), async (rec) => {
    if (b) Object.assign(b, rec);
    else { b = { ...blockDefaults(id), uid: newUid(id), ...rec }; hbState.push(b); }
    hbSave();
    hbFocus(b.uid);
  });
};

App.actions.hbReset = () => {
  if (!confirm("คืนหน้าแรกเป็นแบบเริ่มต้น? ลำดับ การซ่อน และบล็อกที่เพิ่มเองจะหายไป")) return;
  delete App.DATA.settings.home;
  saveKV("settings").then(() => { toast("คืนค่าเริ่มต้นแล้ว"); render(); }).catch((e) => toast(e.message));
};
App.actions.hbDone = async () => {
  try { clearTimeout(saveTimers.settings); await saveKV("settings"); toast("บันทึกหน้าแรกแล้ว"); location.hash = "#/"; }
  catch (e) { toast(`บันทึกไม่สำเร็จ: ${e.message}`); }
};

main.addEventListener("click", (e) => {
  const add = e.target.closest("[data-hb-add]");
  if (add && $("#hbGrid")) return editContent(add.dataset.hbAdd);
  const btn = e.target.closest("[data-hb], [data-hb-opt], [data-hb-bg]");
  if (!btn || !$("#hbGrid")?.contains(btn)) return;
  const el = btn.closest(".hb");
  const b = byUid(el.dataset.uid);
  const a = btn.dataset.hb;
  if (a === "eye") {
    b.on = !b.on;
    el.classList.toggle("off", !b.on);
    btn.setAttribute("aria-pressed", String(b.on));
    btn.textContent = b.on ? "แสดงอยู่" : "ซ่อนอยู่";
    toast(b.on ? `แสดง "${HB[b.id].label}" แล้ว` : `ซ่อน "${HB[b.id].label}" แล้ว`);
    hbSave();
  } else if (a === "width") {
    b.w = W_NEXT[b.w] || "half";
    el.style.setProperty("--span", span(b.w));
    btn.textContent = WIDTHS[b.w][0];
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
  } else if (a === "edit") {
    editContent(b.id, b);
  } else if (a === "copy") {
    const c = { ...structuredClone(b), uid: newUid(b.id), on: true };
    hbState.splice(hbState.indexOf(b) + 1, 0, c);
    el.insertAdjacentHTML("afterend", editBlockHTML(c, 1, 3));
    hbSync(); App.wireSlideshow?.(); App.afterRender();
    toast(`ทำซ้ำ "${HB[b.id].label}" แล้ว ปรับตั้งค่าของอันใหม่ได้เลย`);
    hbFocus(c.uid);
  } else if (a === "del") {
    if (!confirm(`ลบบล็อก "${b.title || HB[b.id].label}"?`)) return;
    flip(() => el.remove());
    hbSync();
    toast("ลบบล็อกแล้ว");
  } else if (btn.dataset.hbBg !== undefined) {
    b.bg = btn.dataset.hbBg;
    btn.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-checked", String(x === btn)));
    hbRefresh(el); hbSave();
  } else if (btn.dataset.hbOpt) {
    b[btn.dataset.hbOpt] = Number(btn.dataset.v);
    btn.parentElement.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    hbRefresh(el); hbSave();
  }
});
const onOptInput = (e) => {
  const t = e.target;
  if (!$("#hbGrid")?.contains(t)) return;
  const el = t.closest(".hb");
  const b = byUid(el.dataset.uid);
  if (t.dataset.hbPick) {
    const set = new Set(b.pick || []);
    t.checked ? set.add(t.dataset.hbPick) : set.delete(t.dataset.hbPick);
    b.pick = [...set];
  } else if (t.dataset.hbOpt) b[t.dataset.hbOpt] = t.value;
  else if (t.hasAttribute("data-hb-title")) {
    b.title = t.value.trim();
    const def = HB[b.id];
    el.querySelector(".hb-name").textContent = b.title ? `${def.label} (“${b.title}”)` : def.label;
  } else return;
  hbRefresh(el); hbSave();
};
main.addEventListener("change", onOptInput);
main.addEventListener("input", (e) => { if (e.target.hasAttribute?.("data-hb-title")) onOptInput(e); });

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
  ph.className = "hb-ph";
  ph.style.setProperty("--span", el.style.getPropertyValue("--span") || 6);
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
  const before = Number(under.style.getPropertyValue("--span") || 6) < 6 && innerWidth > 860 ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
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
