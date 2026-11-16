// หน้าแรก: แสดงโปรไฟล์ครูทุกคน กดแล้วเข้าแฟ้มผลงานของคนนั้น
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^(https?:\/\/|\/)/i.test(u || "") ? u : "");
const THEMES = ["him", "her"];
// ตัวอักษรแรกของชื่อ ข้ามสระหน้า เช่น "เฉลิมพล" → "ฉ"
const initial = (name) => (String(name || "?").trim().replace(/^[เแโใไ]/, "").charAt(0) || "?");

const card = (s, i) => {
  const photo = safeUrl(s.photo);
  const role = [s.position, s.academicStanding].filter(Boolean).join(" ");
  return `<a class="card ${THEMES[i % 2]}" href="/${encodeURIComponent(s.slug)}/" aria-label="เปิดแฟ้มผลงานของ ${esc(s.name)}">
    <div class="photo">${photo ? `<img src="${esc(photo)}" alt="" loading="lazy">` : esc(initial(s.name))}</div>
    <div class="who">
      <h2>${esc(s.name)}</h2>
      ${role ? `<div class="role">${esc(role)}</div>` : ""}
      ${s.school ? `<div class="school">${esc(s.school)}</div>` : ""}
      ${s.subjects?.length ? `<div class="chips">${s.subjects.slice(0, 3).map((x) => `<span>${esc(x)}</span>`).join("")}</div>` : ""}
      ${s.ready ? `<span class="open">เปิดแฟ้มผลงาน</span>` : `<span class="soon">กำลังจัดทำ</span>`}
    </div>
  </a>`;
};

(async () => {
  const pair = document.getElementById("pair");
  try {
    const res = await fetch("/api/sites", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    const { sites } = await res.json();
    pair.innerHTML = sites.map(card).join(`<div class="heart" aria-hidden="true"></div>`);
  } catch {
    pair.innerHTML = `<p class="error">โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชหน้านี้อีกครั้ง</p>`;
  }
  pair.removeAttribute("aria-busy");
  pair.classList.add("ready");
})();
