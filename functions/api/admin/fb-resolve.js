// GET /api/admin/fb-resolve?url=<facebook.com/share/...> — พยายามแปลงลิงก์แชร์เป็นลิงก์โพสต์จริง (ตาม redirect ของ Facebook)
// ไม่รับประกัน: Facebook อาจตอบหน้าให้ล็อกอินแทน ถ้าแปลงไม่ได้ หน้าเว็บจะบอกให้ใช้โค้ดฝังแทน
import { handle, json, HttpError } from "../../../src/server.js";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";
const isShare = (u) => /^https:\/\/(www\.|m\.|web\.)?facebook\.com\/share\//i.test(u);
const isPost = (u) => /^https:\/\/(www\.|m\.)?facebook\.com\//i.test(u) && !isShare(u) && !/\/login|checkpoint|\/share\//i.test(u);

export const onRequestGet = handle(async ({ request }) => {
  let url = new URL(request.url).searchParams.get("url") || "";
  if (!isShare(url)) throw new HttpError(400, "ไม่ใช่ลิงก์แชร์ของ Facebook");
  for (let hop = 0; hop < 5; hop++) {
    let res;
    try { res = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, "accept-language": "th,en;q=0.8" } }); }
    catch { break; }
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      url = new URL(loc, url).toString();
      if (isPost(url)) return json({ url });
      continue;
    }
    // บางครั้งตอบ 200 พร้อมลิงก์จริงใน og:url
    const html = (await res.text()).slice(0, 200000);
    const og = html.match(/<meta[^>]+property="og:url"[^>]+content="([^"]+)"/i)?.[1]?.replace(/&amp;/g, "&");
    if (og && isPost(og)) return json({ url: og });
    break;
  }
  throw new HttpError(422, "แปลงลิงก์แชร์อัตโนมัติไม่ได้");
});
