// ติดตั้งหน้าครูเป็นแอปบนมือถือ/คอมพิวเตอร์ (PWA)
// - Android / Chrome / Edge: กดปุ่มแล้วขึ้นหน้าต่างติดตั้งของเบราว์เซอร์
// - iPhone / iPad: ไม่มีหน้าต่างติดตั้งอัตโนมัติ จึงแสดงวิธีเพิ่มไปยังหน้าจอโฮม
// - เปิดในแอป LINE / Facebook: ติดตั้งไม่ได้ บอกให้เปิดในเบราว์เซอร์ก่อน
(() => {
  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("/admin/sw.js", { scope: "/admin/" }).catch(() => null));
  }
  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const inApp = /\bLine\/|FBAN|FBAV|Instagram|MicroMessenger|TikTok/i.test(ua);
  const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  let deferred = null;

  addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferred = e; paint(); });
  addEventListener("appinstalled", () => { deferred = null; paint(); toast?.("ติดตั้งแอปแล้ว เปิดได้จากหน้าจอโฮม"); });

  const BTN = `<button type="button" class="btn small install-btn" data-install><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0l-4.5-4.5M12 15l4.5-4.5M5 19h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>ติดตั้งแอปลงมือถือ</button>`;
  // วางปุ่มในแถบเมนูด้านข้าง และในหน้าเข้าสู่ระบบ
  function paint() {
    const show = !standalone();
    const foot = document.querySelector(".admin-foot");
    if (foot && show && !foot.querySelector("[data-install]")) foot.insertAdjacentHTML("afterbegin", BTN);
    const form = document.getElementById("loginForm");
    if (form && show && !form.parentElement.querySelector("[data-install]")) form.insertAdjacentHTML("afterend", BTN.replace("btn small", "btn ghost small"));
    document.querySelectorAll("[data-install]").forEach((b) => (b.hidden = !show));
  }
  const prevLogin = App.showLogin;
  App.showLogin = (...a) => {
    prevLogin(...a);
    paint();
  };
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-install]")) { e.preventDefault(); install(); }
  });
  addEventListener("DOMContentLoaded", paint);
  paint();

  async function install() {
    if (deferred) {
      deferred.prompt();
      const { outcome } = await deferred.userChoice.catch(() => ({}));
      deferred = null;
      if (outcome === "accepted") toast?.("กำลังติดตั้ง…");
      return;
    }
    guide();
  }

  // วิธีติดตั้งเมื่อเบราว์เซอร์ไม่มีหน้าต่างติดตั้งให้
  const share = `<svg class="ig" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15V3m0 0L8 7m4-4l4 4M6 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2h-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  const plus = `<svg class="ig" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  function guide() {
    const url = `${location.origin}/admin/`;
    const steps = inApp
      ? `<p>ตอนนี้เปิดอยู่ในแอป LINE หรือแอปอื่น ซึ่งติดตั้งไม่ได้</p><ol>
          <li>แตะปุ่ม <b>⋯</b> หรือ <b>เมนู</b> มุมบน</li>
          <li>เลือก <b>เปิดในเบราว์เซอร์</b> (${isIOS ? "Safari" : "Chrome"})</li>
          <li>กดปุ่ม <b>ติดตั้งแอปลงมือถือ</b> อีกครั้ง</li></ol>`
      : isIOS
      ? `<ol><li>แตะปุ่ม <b>แชร์</b> ${share} ${/CriOS|EdgiOS|FxiOS/.test(ua) ? "ที่แถบที่อยู่ด้านบน" : "ที่แถบด้านล่างของ Safari"}</li>
          <li>เลื่อนลงแล้วแตะ <b>เพิ่มไปยังหน้าจอโฮม</b> ${plus}</li>
          <li>แตะ <b>เพิ่ม</b> มุมขวาบน จะได้ไอคอน "แฟ้มครู" บนหน้าจอ</li></ol>
          <p class="note">ครั้งแรกที่เปิดจากไอคอน ต้องใส่รหัสผ่านอีกครั้ง (iPhone แยกการล็อกอินของแอปกับ Safari)</p>`
      : `<ol><li>เปิดเมนูของเบราว์เซอร์ (<b>⋮</b> มุมขวาบน)</li>
          <li>เลือก <b>ติดตั้งแอป</b> หรือ <b>เพิ่มลงในหน้าจอหลัก</b></li>
          <li>ถ้าไม่มีเมนูนี้ ให้เปิดลิงก์ด้านล่างใน <b>Chrome</b> หรือ <b>Edge</b></li></ol>`;
    const dlg = document.createElement("dialog");
    dlg.className = "install-guide";
    dlg.innerHTML = `<div class="ig-head"><img src="/admin/icons/icon-192.png" alt=""><div><b>แฟ้มครู</b><span>ติดตั้งเป็นแอปบน${isIOS ? " iPhone / iPad" : "มือถือ"}</span></div></div>
      ${steps}
      <div class="ig-link"><code>${url}</code><button type="button" class="btn ghost small" data-copy>คัดลอกลิงก์</button></div>
      <button type="button" class="btn wide" data-close>เข้าใจแล้ว</button>`;
    document.body.append(dlg);
    dlg.addEventListener("close", () => dlg.remove());
    dlg.addEventListener("click", async (e) => {
      if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
      if (e.target.closest("[data-copy]")) { try { await navigator.clipboard.writeText(url); toast?.("คัดลอกลิงก์แล้ว"); } catch { /* */ } }
    });
    dlg.showModal();
  }
})();
