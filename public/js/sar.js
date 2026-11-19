// SAR รายงานผลการปฏิบัติงานและผลการประเมินตนเองรายบุคคล ตามแบบฟอร์มโรงเรียน (ตอนที่ 1–3)
// - ดูตัวอย่างเป็นหน้ากระดาษ A4 จริง แบ่งหน้าอัตโนมัติ มีเลขหน้าและสารบัญ
// - ข้อมูลดึงจากเมนูอื่นอัตโนมัติ ส่วนที่ไม่มีในระบบ กรอก/ติ๊กในหน้านี้ เก็บแยกตามปีการศึกษาใน kv "sarNotes"
//   sarNotes = { common: {...ข้อมูลที่ใช้ทุกปี}, years: { "2569": {...} } }
(() => {
  // ---------- เนื้อหาคงที่ของแบบฟอร์ม ----------
  const METHODS = [
    "การอธิบาย", "การสาธิต / ทดลอง", "การใช้เกมประกอบ", "สถานการณ์จำลอง", "กรณีตัวอย่าง", "บทบาทสมมุติ", "การแก้ไขสถานการณ์",
    "โปรแกรมสำเร็จรูป", "ศูนย์การเรียน", "ชุดการสอน", "คอมพิวเตอร์ช่วยสอน", "โครงงาน", "การถามตอบ",
    "การสืบสวนสอบสวน", "กลุ่มสืบค้นความรู้", "กลุ่มสัมพันธ์", "การเรียนรู้แบบร่วมมือ", "ความคิดรวบยอด", "อริยสัจ 4",
    "การศึกษาค้นคว้าด้วยตนเอง", "การทัศนศึกษานอกสถานที่", "การเรียนรู้จากห้องสมุด", "การพัฒนากระบวนการคิด",
    "การใช้ภูมิปัญญาท้องถิ่น", "การอภิปรายกลุ่มย่อย", "การแก้ปัญหา",
  ];
  const LV5 = ["มากที่สุด", "มาก", "ปานกลาง", "น้อย", "น้อยที่สุด"];
  const COND = ["ตรงตามวุฒิ/สาขาวิชาที่จบการศึกษา", "ตรงตามความถนัด", "ตรงตามประสบการณ์การสอน", "ตรงกับความรู้ความสามารถ", "ตรงกับความต้องการ/ความสนใจ"];
  const STUDENT = [
    "ครูแจ้งผลการเรียนรู้ให้นักเรียนทราบอย่างชัดเจน", "ครูจัดกิจกรรมการเรียนรู้สนุกและน่าสนใจ", "เนื้อหาที่สอนทันสมัยเสมอ",
    "ครูใช้สื่อประกอบการเรียนการสอนที่เหมาะสมและหลากหลาย", "ครูใช้คำถามซักถามนักเรียนบ่อย ๆ", "ครูประยุกต์สาระที่สอนเข้ากับเหตุการณ์ปัจจุบัน/สภาพแวดล้อม",
    "ครูส่งเสริมนักเรียนได้ฝึกปฏิบัติจริง มีการจัดการ และการแก้ปัญหา", "ครูให้นักเรียนฝึกกระบวนการคิด คิดวิเคราะห์ คิดสร้างสรรค์",
    "ครูส่งเสริมให้นักเรียนทำงานร่วมกันทั้งเป็นกลุ่มและรายบุคคล", "ครูให้นักเรียนแสวงหาความรู้จากแหล่งเรียนรู้ต่าง ๆ",
    "ครูมีการเสริมแรงให้นักเรียนที่ร่วมกิจกรรมการเรียนการสอน", "ครูเปิดโอกาสให้นักเรียนซักถามปัญหา", "ครูคอยกระตุ้นให้นักเรียนตื่นตัวในการเรียนเสมอ",
    "ครูสอดแทรกคุณธรรมและค่านิยม 12 ประการในวิชาที่สอน", "ครูยอมรับความคิดเห็นของนักเรียนที่ต่างไปจากครู", "นักเรียนมีส่วนร่วมในการวัดและประเมินผลการเรียน",
    "ครูมีการประเมินผลการเรียนด้วยวิธีการที่หลากหลายและยุติธรรม", "ครูมีความตั้งใจในการจัดกิจกรรมการเรียนการสอน",
    "บุคลิกภาพ การแต่งกายและการพูดจาของครูเหมาะสม", "ครูเข้าสอนและออกชั้นเรียนตรงตามเวลา",
  ];
  const PLAN = [
    ["การวิเคราะห์มาตรฐานฯ และตัวชี้วัด/ผลการเรียนรู้", ["มีการระบุตัวชี้วัด/ผลการเรียนรู้", "มีการวิเคราะห์ตัวชี้วัด/ผลการเรียนรู้ แยกออกเป็น 3 ด้าน คือ ความรู้ เจตคติ ทักษะ (KPA)", "มีความเหมาะสม สอดคล้องกับกิจกรรมการเรียนรู้", "สอดคล้องกับผลการเรียนรู้ที่คาดหวัง", "ครอบคลุมมาตรฐานการศึกษา"]],
    ["การออกแบบกิจกรรมการเรียนรู้", ["การออกแบบกิจกรรมการเรียนรู้เป็นขั้นตอน", "แผนการจัดกิจกรรมการเรียนรู้มีองค์ประกอบครบ 4 ด้าน (แลกเปลี่ยนประสบการณ์ การสร้างองค์ความรู้ นำเสนอความรู้ ปฏิบัติ / ประยุกต์ใช้)", "มีความเหมาะสมกับจุดประสงค์การเรียนรู้", "มีความสอดคล้องกับจุดประสงค์การเรียนรู้ทั้ง 3 ด้าน (ความรู้ เจตคติ ทักษะ)", "สามารถปฏิบัติได้จริง"]],
    ["การออกแบบปฏิสัมพันธ์", ["มีการจัดกิจกรรมการเรียนรู้โดยใช้กระบวนการกลุ่ม", "มีความหลากหลายในการมีส่วนร่วมของผู้เรียน", "มีการกำหนดบทบาทและกิจกรรมอย่างชัดเจน", "ปฏิบัติจริง", "ผู้เรียนสนุกสนาน เกิดการเรียนรู้"]],
    ["การออกแบบประเมินผล", ["มีการประเมินผลการเรียนในแต่ละแผน", "มีการกำหนดวิธีการประเมินผลหลากหลาย", "วิธีการประเมินผลสอดคล้องกับจุดประสงค์การเรียนรู้", "ปฏิบัติจริง", "นำผลการประเมินมาพัฒนาการเรียนรู้"]],
    ["การใช้สื่ออุปกรณ์การเรียนรู้", ["มีการใช้สื่อ อุปกรณ์หรือแหล่งเรียนรู้", "มีการกำหนดขั้นตอนหรือวิธีการใช้สื่อหรือแหล่งเรียนรู้", "มีการใช้สื่อ อุปกรณ์หรือแหล่งการเรียนรู้เหมาะสมกับกิจกรรมการเรียนรู้", "มีสื่อ อุปกรณ์ แหล่งเรียนรู้", "มีการพัฒนาสื่อ อุปกรณ์ แหล่งเรียนรู้"]],
  ];
  const PLAN_LV = { 4: "ดีมาก", 3: "ดี", 2: "พอใช้", 1: "ปรับปรุง" };
  const STD = [
    { no: "1", title: "คุณภาพของผู้เรียน", items: [
      "ผู้เรียนมีความสามารถในการอ่าน การเขียน การสื่อสารและการคิดคำนวณ",
      "ผู้เรียนมีความสามารถในด้านการสื่อสารทั้งภาษาไทย และภาษาอังกฤษ",
      "ผู้เรียนมีความสามารถในการคิดวิเคราะห์ คิดอย่างมีวิจารณญาณ อภิปรายแลกเปลี่ยนความคิดเห็นและแก้ปัญหา",
      "ผู้เรียนมีความรู้ ทักษะและเจตคติที่ดี พร้อมที่จะศึกษาต่อในระดับชั้นที่สูงขึ้นหรือมีวุฒิภาวะทางอาชีพเหมาะสมกับช่วงวัย",
      "ผู้เรียนมีความคิดริเริ่ม และสร้างสรรค์ผลงานด้วยความภาคภูมิใจ",
      "ผู้เรียนใช้เทคโนโลยีและการสื่อสารในการเรียนรู้และนำเสนอผลงาน",
      "ผู้เรียนแสวงหาความรู้ด้วยตนเองจากห้องสมุด แหล่งเรียนรู้และสื่อต่าง ๆ รอบตัว",
      "ผู้เรียนมีความประพฤติด้านคุณธรรม จริยธรรม ค่านิยม จิตสังคม และจิตสำนึกตามที่โรงเรียนกำหนดปรากฏชัดเจน",
      "ผู้เรียนมีส่วนร่วมในการอนุรักษ์ทรัพยากรธรรมชาติและสิ่งแวดล้อมอย่างเป็นรูปธรรม",
      "ผู้เรียนมีความภาคภูมิใจในท้องถิ่น ในความเป็นไทยและเห็นคุณค่าเกี่ยวกับภูมิปัญญาไทย และแสดงออกได้อย่างเหมาะสมในชีวิตประจำวัน",
      "ผู้เรียนยอมรับเหตุผลความคิดเห็นของผู้อื่น และมีมนุษยสัมพันธ์ดี",
      "ผู้เรียนรู้และมีวิธีการป้องกันตนเองจากการล่อลวง ข่มเหงรังแก",
      "ผู้เรียนไม่เพิกเฉยต่อการกระทำสิ่งที่ไม่ถูกต้อง และอยู่ร่วมกันด้วยดีในครอบครัว",
      "ผู้เรียนมีวิธีการรักษาสุขภาพของตนเองให้แข็งแรง",
      "ผู้เรียนรักษาอารมณ์และสุขภาพจิตให้ดีอยู่เสมอ",
      "ผู้เรียนมีความรู้สึกที่ดีต่ออาชีพสุจริตและหาความรู้เกี่ยวกับอาชีพที่ตนเองสนใจ",
    ] },
    { no: "2", title: "กระบวนการบริหารและการจัดการ", items: [
      "สถานศึกษามีการกำหนดเป้าหมาย วิสัยทัศน์ และพันธกิจตรงกับวัตถุประสงค์ของแผนการศึกษาชาติ และสอดคล้องกับความต้องการของชุมชนท้องถิ่นอย่างชัดเจน",
      "สถานศึกษาพัฒนาวิชาการที่เน้นผู้เรียนทุกกลุ่มเป้าหมายทุกคนและดำเนินการอย่างเป็นรูปธรรม",
      "สถานศึกษาพัฒนาครูและบุคลากรให้มีความเชี่ยวชาญทางวิชาชีพ มีความรู้ความสามารถและทักษะตามมาตรฐานตำแหน่ง",
      "สถานศึกษาบริหารจัดการข้อมูลสารสนเทศที่มีความถูกต้องครบถ้วน ทันสมัย นำไปประยุกต์ใช้ได้ และดำเนินการอย่างเป็นระบบ",
      "สถานศึกษาจัดสภาพแวดล้อมทางกายภาพและสังคมที่ดีและกระตุ้นให้ผู้เรียนใฝ่เรียนรู้ทั่วถึงทุกกลุ่มเป้าหมาย",
      "ผู้เกี่ยวข้องทุกฝ่ายมีส่วนร่วมและเครือข่ายความร่วมมือในการร่วมรับผิดชอบต่อผลการจัดการศึกษาให้มีคุณภาพและได้มาตรฐาน",
      "สถานศึกษากำกับ ติดตามและประเมินผลการบริหารและการจัดการศึกษาอย่างเหมาะสม ชัดเจนและเปิดโอกาสให้ผู้เกี่ยวข้องมีส่วนร่วม",
    ] },
    { no: "3", title: "กระบวนการจัดการเรียนการสอนที่เน้นผู้เรียนเป็นสำคัญ", items: [
      "ผู้เรียนมีส่วนร่วมในการวิเคราะห์ตนเอง กำหนดเนื้อหาสาระกิจกรรมที่สอดคล้องกับความสนใจและความถนัดเป็นรายบุคคลอย่างเป็นรูปธรรมทั้งระบบ",
      "เปิดโอกาสให้ผู้เรียนเรียนรู้โดยผ่านกระบวนการคิด ได้ปฏิบัติจริงด้วยวิธีการและแหล่งเรียนรู้ที่หลากหลาย สรุปองค์ความรู้ และสามารถนำไปใช้ในสถานการณ์ต่าง ๆ ได้เป็นอย่างดี",
      "จัดกิจกรรมให้ผู้เรียนได้ฝึกทักษะ แสดงออก นำเสนอผลงาน แสดงความคิดเห็น คิดเป็น รักการอ่าน และแสวงหาความรู้จากสื่อเทคโนโลยีด้วยตนเองอย่างเป็นรูปธรรมและต่อเนื่อง",
      "ผู้เรียนได้เรียนรู้โดยเชื่อมโยงบูรณาการสาระการเรียนรู้และทักษะด้านต่าง ๆ",
      "ผู้เรียนได้เรียนรู้โดยใช้กระบวนการวิจัยอย่างเป็นรูปธรรม และต่อเนื่อง",
      "จัดกิจกรรมให้ผู้เรียนได้เรียนรู้จากแหล่งเรียนรู้และภูมิปัญญาท้องถิ่นในการจัดการเรียนการสอน",
      "ชุมชนมีส่วนร่วมแสดงความคิดเห็นหรือร่วมจัดกิจกรรมการเรียนการสอนอย่างเป็นรูปธรรมและต่อเนื่อง",
      "ประเมินผู้เรียนจากสภาพจริง",
      "มีขั้นตอนตรวจสอบและประเมินอย่างเป็นระบบ",
      "ใช้เครื่องมือและวิธีการวัดและประเมินผล ที่เหมาะสมกับเป้าหมายและการจัดการเรียนการสอน",
      "นักเรียนและผู้มีส่วนเกี่ยวข้อง มีส่วนร่วมในการวัดและประเมินผล",
      "ให้ข้อมูลย้อนกลับแก่ผู้เรียน และผู้เรียนนำไปพัฒนาตนเอง",
    ] },
  ];
  // ตอนที่ 3: [รหัส, ชื่อ, ให้คะแนนได้ไหม, ระดับย่อหน้า]
  const P3 = [
    ["1", "ด้านการจัดการเรียนการสอน", false, 0], ["1.1", "การสร้างและหรือการพัฒนาหลักสูตร", true, 1], ["1.2", "การจัดการเรียนรู้", false, 1],
    ["1.2.1", "การออกแบบหน่วยการเรียนรู้", true, 2], ["1.2.2", "การจัดทำแผนการจัดการเรียนรู้/แผนการจัดการศึกษาเฉพาะบุคคล/แผนการสอนรายบุคคล/แผนการจัดประสบการณ์", true, 2],
    ["1.2.3", "กลยุทธ์ในการจัดการเรียนรู้", true, 2], ["1.2.4", "คุณภาพผู้เรียน", true, 2],
    ["1.3", "การสร้างและพัฒนาสื่อ นวัตกรรม เทคโนโลยีทางการศึกษา และแหล่งเรียนรู้", true, 1], ["1.4", "การวัดและประเมินผลการเรียนรู้", true, 1],
    ["1.5", "การวิจัยเพื่อการจัดการเรียนรู้", true, 1],
    ["2", "ด้านการบริหารจัดการชั้นเรียน", false, 0], ["2.1", "การบริหารจัดการชั้นเรียน", true, 1], ["2.2", "การจัดระบบดูแลช่วยเหลือนักเรียน", true, 1],
    ["2.3", "การจัดทำข้อมูลสารสนเทศ และเอกสารประจำชั้นเรียนหรือประจำวิชา", true, 1],
    ["3", "ด้านการพัฒนาตนเองและพัฒนาวิชาชีพ", false, 0], ["3.1", "การพัฒนาตนเอง", true, 1], ["3.2", "การพัฒนาวิชาชีพ", true, 1],
  ];
  const DUTY_LV = ["ดีเยี่ยม", "ดี", "พอใช้", "ควรปรับปรุง"];
  const COMPETENCY = ["ความสามารถในการสื่อสาร", "ความสามารถในการคิด", "ความสามารถในการแก้ปัญหา", "ความสามารถในการใช้ทักษะชีวิต", "ความสามารถในการใช้เทคโนโลยี"];
  const TRAITS = ["รักชาติ ศาสน์ กษัตริย์", "ซื่อสัตย์สุจริต", "มีวินัย", "ใฝ่เรียนรู้", "อยู่อย่างพอเพียง", "มุ่งมั่นในการทำงาน", "รักความเป็นไทย", "มีจิตสาธารณะ"];
  const LEAVE_TYPES = ["ลาป่วย", "ลากิจ", "ลาอุปสมบท", "ลาคลอด", "มาสาย"];
  const RESULT_LV = ["ดีเยี่ยม", "ดี", "ผ่าน", "ไม่ผ่าน"];
  const GRADES = ["4", "3.5", "3", "2.5", "2", "1.5", "1", "0"];
  const CRITERIA5 = ["มีผลการปฏิบัติอยู่ในระดับดีมาก", "มีผลการปฏิบัติอยู่ในระดับดี", "มีผลการปฏิบัติอยู่ในระดับปานกลาง", "มีผลการปฏิบัติอยู่ในระดับน้อย", "มีผลการปฏิบัติอยู่ในระดับน้อยมาก"];
  const INTRO = [
    "รายงานการประเมินตนเอง (Self Assessment Report : SAR) เป็นการประเมินการปฏิบัติหน้าที่ตามพระราชบัญญัติการศึกษาแห่งชาติ พุทธศักราช 2542 และที่แก้ไขเพิ่มเติม รวมทั้งมาตรฐานการศึกษาของโรงเรียน ข้าพเจ้าได้จัดทำขึ้นเพื่อรายงานผลการจัดการเรียนการสอนและการปฏิบัติหน้าที่ตามฝ่าย/กลุ่มงาน ตลอดจนกิจกรรมต่าง ๆ ที่ส่งเสริมให้นักเรียนมีคุณลักษณะและคุณภาพตามมาตรฐานการศึกษาของ{โรงเรียน} {สังกัด} ประจำปีการศึกษา {ปี}",
    "รายงานนี้ โรงเรียนสามารถนำผลการดำเนินงานไปใช้ประกอบการประเมินคุณภาพภายใน และสรุปรายงานต่อผู้บังคับบัญชาตามลำดับสายงาน ตลอดจนเผยแพร่ให้ผู้ปกครอง นักเรียน และชุมชนได้ทราบผลการปฏิบัติงานของบุคลากร{โรงเรียน}",
    "ข้อมูลที่ได้จากการประเมินตนเอง (SAR) ในครั้งนี้ ข้าพเจ้าจะนำไปใช้เป็นแนวทางในการปรับปรุงและพัฒนาการปฏิบัติงานที่ได้รับมอบหมาย เพื่อส่งเสริมและพัฒนาศักยภาพของผู้เรียนให้สูงขึ้นในทุก ๆ ด้านต่อไป",
  ].join("\n");
  const TH_MONTHS = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];

  // ---------- ข้อมูล ----------
  let Y = String(BE_NOW); // ปีการศึกษาที่กำลังดู
  // ฉบับเผยแพร่: ซ่อนข้อมูลส่วนตัว (วันเกิด อายุ เลขที่ตำแหน่ง วันบรรจุ วันลา ลายเซ็น) และภาคผนวกใช้เฉพาะรายการที่ตั้งเป็นสาธารณะ
  let PUB = false;
  const isPublicItem = (x) => x.vis === "public";
  // รายการจากเมนูอื่น: ฉบับเผยแพร่ใช้เฉพาะรายการที่ตั้งเป็นสาธารณะ
  const L = (k) => (PUB ? arr(k).filter(isPublicItem) : list(k));
  const notes = () => {
    const n = (App.DATA.sarNotes = App.DATA.sarNotes && typeof App.DATA.sarNotes === "object" ? App.DATA.sarNotes : {});
    n.common = n.common || {};
    n.years = n.years || {};
    return n;
  };
  const S = () => (notes().years[Y] = notes().years[Y] || {});
  const has = (y) => { const d = notes().years[y]; return !!d && Object.keys(d).length > 0; };
  const C0 = () => notes().common;
  const P = () => App.DATA.profile || {};
  const school = () => { const s = P().school || ""; return !s || s.startsWith("โรงเรียน") ? s : `โรงเรียน${s}`; };
  const fill = (t) => String(t || "").replaceAll("{ปี}", Y).replaceAll("{โรงเรียน}", school()).replaceAll("{สังกัด}", P().office || "");
  // ช่วงปีการศึกษาในแบบฟอร์ม: 1 เมษายน – 31 มีนาคม ปีถัดไป
  const yStart = () => `${Number(Y) - 543}-04-01`, yEnd = () => `${Number(Y) - 542}-03-31`;
  const inYear = (iso) => !!iso && iso >= yStart() && iso <= yEnd();
  const thLong = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    return isNaN(d) ? esc(iso || "") : `${d.getDate()} ${TH_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  };
  const thShort = (iso) => (iso ? thDate(iso) : "");
  const uniqBy = (xs, f) => [...new Map(xs.map((x) => [f(x), x])).values()];
  const save = () => saveKVLater("sarNotes");
  const saveNow = async (fn) => {
    const backup = JSON.stringify(App.DATA.sarNotes || {});
    fn();
    try { await saveKV("sarNotes"); } catch (e) { App.DATA.sarNotes = JSON.parse(backup); throw e; }
  };

  // ---------- ตารางที่แก้เป็นข้อความได้ (บรรทัดละแถว คั่นช่องด้วย |) ----------
  // ถ้ายังไม่เคยแก้ ใช้ข้อมูลจากเมนูอื่น (auto) ลบข้อความทั้งหมดแล้วบันทึก = กลับไปใช้ข้อมูลอัตโนมัติ
  const room2class = (r) => String(r || "").split("/")[0].trim();
  const isCode = (s) => /^[ก-ฮ][0-9๐-๙]{5}$/.test(String(s || "").trim());
  const teachAuto = (term) => () => {
    // ตารางของภาคเรียน term/ปีที่กำลังดู (ภาคเรียนปัจจุบันอยู่ชั้นบน ภาคเรียนอื่นอยู่ใน terms)
    const all = App.DATA.schedule || {};
    const key = `${term}/${Y}`;
    const legacy = !all.terms && String(all.term || "").split("/")[0] === term && !String(all.term || "").includes("/");
    const s = all.term === key || legacy ? all : all.terms?.[key];
    if (!s) return [];
    const groups = {};
    for (const c of s.classes || []) {
      if (!c.subject) continue;
      const k = `${c.subject}|${room2class(c.room)}`;
      const g = (groups[k] = groups[k] || { subject: c.subject, cls: room2class(c.room), rooms: new Set(), n: 0 });
      if (c.room) g.rooms.add(c.room);
      g.n++;
    }
    return Object.values(groups).map((g) => {
      const rooms = Math.max(1, g.rooms.size);
      return [isCode(g.subject) ? g.subject : "", isCode(g.subject) ? "" : g.subject, g.cls, String(rooms), String(Math.round((g.n / rooms) * 10) / 10)];
    });
  };
  const TABLES = {
    teach1: { title: "ปฏิบัติการสอน ภาคเรียนที่ 1", cols: ["รหัสวิชา", "ชื่อวิชา", "ชั้น", "จำนวนห้อง", "จำนวนชั่วโมง / สัปดาห์"], auto: teachAuto("1"), autoNote: "ตารางสอนภาคเรียนที่ 1 (เมนูตารางสอน)" },
    teach2: { title: "ปฏิบัติการสอน ภาคเรียนที่ 2", cols: ["รหัสวิชา", "ชื่อวิชา", "ชั้น", "จำนวนห้อง", "จำนวนชั่วโมง / สัปดาห์"], auto: teachAuto("2"), autoNote: "ตารางสอนภาคเรียนที่ 2 (เมนูตารางสอน)" },
    activities: { title: "กิจกรรมพัฒนาผู้เรียน", cols: ["กิจกรรมพัฒนาผู้เรียน", "ชั้น / ห้อง", "จำนวนนักเรียน", "ผ่าน", "ไม่ผ่าน"], autoNote: "เมนูกิจกรรมพัฒนาผู้เรียน",
      auto: () => L("activities").map((a) => {
        const [p, t] = String(a.passed || "").split("/").map((x) => Number(x));
        return [a.title, a.room || "", t ? String(t) : "", isNaN(p) ? "" : String(p), t && !isNaN(p) ? String(t - p || "-") : ""];
      }) },
    homeroom: { title: "ครูที่ปรึกษา", cols: ["ชั้น / ห้อง", "ชาย (คน)", "หญิง (คน)", "รวมทั้งสิ้น (คน)"], autoNote: "โปรไฟล์ (หน้าที่พิเศษ)",
      auto: () => { const h = String(P().homeroom || "").replace(/^ครูที่ปรึกษา(ชั้น)?\s*/, ""); return h ? [[h, "", "", ""]] : []; } },
    special: { title: "งานพิเศษในโรงเรียน", cols: ["งานพิเศษ"], autoNote: "เมนูงานที่รับผิดชอบและคำสั่ง",
      auto: () => yearDuties().map((r) => [`${r.title}${orderOf(r) ? ` (คำสั่งที่ ${orderOf(r).no})` : ""}`]) },
    orders: { title: "คำสั่งแต่งตั้งที่ได้รับ", cols: ["เลขที่คำสั่ง", "ลงวันที่", "เรื่อง", "หน้าที่ที่ได้รับมอบหมาย"], autoNote: "เมนูคำสั่ง",
      auto: () => yearOrders().map((o) => [o.no || "", o.date ? thShort(o.date) : "", o.title || "",
        arr("responsibilities").filter((d) => String(d.orderId) === String(o.id)).map((d) => `${d.title}${roleOf(d) ? ` (${roleOf(d)})` : ""}`).join(", ")]) },
    plans: { title: "จัดทำแผนการจัดการเรียนรู้", cols: ["รหัสวิชา", "สาระการเรียนรู้/รายวิชา", "ระดับชั้น", "จำนวน/แผน"], autoNote: "เมนูแผนการสอนและสื่อ",
      auto: () => {
        const g = {};
        for (const p of L("plans").filter((x) => !x.type || x.type === "แผนการสอน")) g[p.subject] = (g[p.subject] || 0) + 1;
        return Object.entries(g).map(([s, n]) => [isCode(s) ? s : "", isCode(s) ? "" : s, "", String(n)]);
      } },
    media: { title: "ผลิตสื่อ / นวัตกรรม", cols: ["ชื่อสื่อ/นวัตกรรม/เทคโนโลยี", "จำนวน ชั่วโมง/คาบเรียน"], autoNote: "เมนูแผนการสอนและสื่อ และผลงาน",
      auto: () => [
        ...L("plans").filter((p) => p.type === "สื่อ" || p.type === "ใบงาน").map((p) => [p.title, ""]),
        ...L("works").filter((w) => (w.type === "สื่อการสอน" || w.type === "นวัตกรรม") && (!w.year || w.year === Y)).map((w) => [w.title, ""]),
      ] },
    places: { title: "แหล่งเรียนรู้นอกสถานที่", cols: ["สถานที่", "จำนวน ชั่วโมง/คาบเรียน"] },
    wisdom: { title: "ภูมิปัญญาในท้องถิ่น", cols: ["เรื่อง", "จำนวนชั่วโมง"] },
    research: { title: "วิจัยในชั้นเรียน", cols: ["เรื่อง", "ระดับชั้น"], autoNote: "เมนูผลงาน วิจัย นวัตกรรม (ประเภทวิจัยในชั้นเรียน)",
      auto: () => L("works").filter((w) => w.type === "วิจัยในชั้นเรียน" && (!w.year || w.year === Y)).map((w) => [w.title, ""]) },
    measure: { title: "วิธีการวัดและประเมินผล", cols: ["รายวิชา", "วิธีการวัดประเมินผล (คั่นแต่ละวิธีด้วย ,)"],
      auto: () => [["ทุกรายวิชาที่สอนในแต่ละชั้นที่ได้รับมอบหมาย", "ทดสอบแบบปรนัย, ทดสอบแบบอัตนัย, ประเมินชิ้นงาน, ประเมินแบบฝึกหัด"]], autoNote: "ค่าตั้งต้น" },
    speakers: { title: "เชิญวิทยากรภายนอก", cols: ["วัน / เดือน / ปี", "ชื่อวิทยากร", "เรื่อง / หัวข้อ"] },
    trainings: { title: "การพัฒนาตนเอง", cols: ["วัน / เดือน / ปี", "เรื่อง / หลักสูตร", "หน่วยงานที่จัด", "จำนวนชั่วโมง"], autoNote: "เมนูอบรม / PLC (ตามปีการศึกษา)",
      auto: () => [...L("trainings")].filter((t) => inYear(t.date)).sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((t) => [thShort(t.date), t.title, t.organizer || "", t.hours ? String(t.hours) : ""]) },
    awards: { title: "รางวัล / ประกาศเกียรติคุณ / ผลงานดีเด่น", cols: ["วัน / เดือน / ปี", "รางวัล / ผลงาน", "ระดับ", "หน่วยงานที่มอบ"], autoNote: "เมนูเกียรติบัตรและรางวัล (ตามปีการศึกษา)",
      auto: () => [...L("certificates")].filter((c) => inYear(c.date)).sort((a, b) => String(a.date).localeCompare(String(b.date)))
        .map((c) => [thShort(c.date), c.title, c.level || "", c.issuer || ""]) },
    judge: { title: "วิทยากร / กรรมการตัดสิน", cols: ["วัน / เดือน / ปี", "รายการ / เรื่อง", "หน่วยงานที่เชิญ"] },
    achieve: { title: "ผลสัมฤทธิ์ทางการเรียน", cols: ["รายวิชา", "ห้อง", "จำนวน (คน)", ...GRADES, "ร้อยละ 3 ขึ้นไป"], autoNote: "เมนูการวัดผล (ปพ.5)",
      auto: () => {
        const g = App.DATA.grades || {};
        const totals = Object.values(g.scores || {}).filter((sc) => Array.isArray(sc) && sc.some((x) => x !== null && x !== "")).map((sc) => sc.reduce((a, b) => a + (Number(b) || 0), 0));
        if (!totals.length) return [];
        const gr = totals.map((t) => gradeOf(t));
        return [[g.subject || "", g.room || "", String(totals.length), ...GRADES.map((k) => String(gr.filter((x) => x === k).length || "-")), ""]];
      } },
    care: { title: "การดูแลช่วยเหลือนักเรียน", cols: ["ชั้น / ห้อง", "นักเรียนทั้งหมด", "กลุ่มปกติ", "กลุ่มเสี่ยง", "กลุ่มมีปัญหา", "เยี่ยมบ้าน", "ส่งต่อ"], autoNote: "เมนูดูแลช่วยเหลือนักเรียน",
      auto: () => {
        const care = arr("care");
        if (!care.length) return [];
        const room = String(P().homeroom || "").replace(/^ครูที่ปรึกษา(ชั้น)?\s*/, "");
        const total = arr("students").length || care.length;
        const n = (f) => String(care.filter(f).length);
        return [[room, String(total), n((c) => c.screen === "กลุ่มปกติ"), n((c) => c.screen === "กลุ่มเสี่ยง"), n((c) => c.screen === "กลุ่มมีปัญหา"),
          n((c) => !!c.visit), n((c) => /ส่งต่อ/.test(c.note || "") || c.screen === "กลุ่มมีปัญหา")]];
      } },
    supervision: { title: "การนิเทศ และการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ (PLC)", cols: ["วัน / เดือน / ปี", "รูปแบบ", "เรื่อง", "ผู้นิเทศ / หน่วยงาน", "ผล / ข้อเสนอแนะ"], autoNote: "เมนูนิเทศ / Open Class และอบรม / PLC",
      auto: () => [
        ...L("supervision").filter((x) => inYear(x.date)).map((x) => ({ d: x.date, r: [thShort(x.date), x.type || "นิเทศ", x.topic || "", x.by || "", x.result || ""] })),
        ...L("trainings").filter((t) => t.format === "PLC" && inYear(t.date)).map((t) => ({ d: t.date, r: [thShort(t.date), "PLC", t.title, t.organizer || "", t.hours ? `${t.hours} ชั่วโมง` : ""] })),
      ].sort((a, b) => String(a.d).localeCompare(String(b.d))).map((x) => x.r) },
    projects: { title: "โครงการ / กิจกรรมที่รับผิดชอบ", cols: ["ชื่อโครงการ / กิจกรรม", "งบประมาณ (บาท)", "ใช้จริง (บาท)", "สถานะ", "ผลการดำเนินงาน"], autoNote: "เมนูโครงการและงบประมาณ",
      auto: () => L("projects").map((p) => [p.title, p.budget ? Number(p.budget).toLocaleString("th-TH") : "", p.used ? Number(p.used).toLocaleString("th-TH") : "", p.status || "", p.result || ""]) },
    competency: { title: "ผลการประเมินสมรรถนะสำคัญของผู้เรียน", cols: ["ชั้น", "จำนวนนักเรียน (คน)", ...COMPETENCY] },
    reading: { title: "ผลการประเมินการอ่าน คิด วิเคราะห์และเขียน", cols: ["ชั้น", "จำนวนนักเรียนที่ประเมิน (คน)", "ดีเยี่ยม (3)", "ดี (2)", "ผ่าน (1)", "ไม่ผ่าน (0)"] },
    traits: { title: "ผลการประเมินคุณลักษณะอันพึงประสงค์", cols: ["ชั้น", "จำนวนนักเรียน (คน)", "ดีเยี่ยม (3)", "ดี (2)", "ผ่าน (1)", "ไม่ผ่าน (0)"] },
    duties: { title: "การปฏิบัติงานในหน้าที่อื่นที่ได้รับมอบหมาย", cols: ["หน้าที่", `ระดับ (${DUTY_LV.join(" / ")})`, "เหตุผล"], autoNote: "โปรไฟล์และงานที่รับผิดชอบ",
      auto: () => {
        const h = String(P().homeroom || "").replace(/^ครูที่ปรึกษา(ชั้น)?\s*/, "");
        return [["ภาพรวม", "", ""], ...(h ? [[`ครูที่ปรึกษา/ประจำชั้น ${h}`, "", ""]] : []),
          ...yearDuties().filter((r) => r.type !== "เวร" && r.type !== "งานที่ปรึกษา")
            .sort((a, b) => (orderOf(b) ? 1 : 0) - (orderOf(a) ? 1 : 0)).slice(0, 6)
            .map((r) => [`${r.title}${orderOf(r) ? ` ตามคำสั่งที่ ${orderOf(r).no}` : ""}`, "", r.status === "เสร็จ" ? "ดำเนินการแล้วเสร็จตามที่ได้รับมอบหมาย" : ""])];
      } },
  };
  // คำสั่งของปีนี้ (เมนูคำสั่ง) และงานที่ได้รับมอบหมาย
  const yearOrders = () => arr("orders").filter((o) => (o.year ? o.year === Y : inYear(o.date))).sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const orderOf = (d) => (d.orderId ? arr("orders").find((o) => String(o.id) === String(d.orderId)) : null);
  const roleOf = (d) => String(d.detail || "").match(/\(([^)]+)\)\s*$/)?.[1] || "";
  const yearDuties = () => uniqBy(L("responsibilities").filter((r) => !r.year || r.year === Y), (r) => r.title);
  const rowsText = (rows) => rows.map((r) => r.join(" | ")).join("\n");
  const parseRows = (text, n) => String(text || "").split("\n").map((l) => l.trim()).filter(Boolean)
    .map((l) => { const c = l.split("|").map((x) => x.trim()); return n === 1 ? [c.join(" | ")] : c; });
  const rowsOf = (key) => {
    const t = TABLES[key];
    const saved = S().tables?.[key];
    return saved !== undefined ? parseRows(saved, t.cols.length) : t.auto ? t.auto() : [];
  };
  const isAuto = (key) => S().tables?.[key] === undefined && !!TABLES[key].auto;

  // ---------- ส่วนประกอบหน้า ----------
  const cb = (on) => `<span class="sar-cb${on ? " on" : ""}" aria-label="${on ? "เลือก" : "ไม่เลือก"}"></span>`;
  const editBtn = (act, attrs = "", label = "แก้ไข") => `<button type="button" class="sar-edit" data-act="${act}" ${attrs}>${label}</button>`;
  // ปุ่มสีเขียว = ตารางนี้ยังดึงข้อมูลจากเมนูอื่นอัตโนมัติ
  const tableEdit = (key) => isAuto(key)
    ? editBtn("sarTable", `data-key="${key}" data-auto="1" title="ข้อมูลจาก${esc(TABLES[key].autoNote || "เมนูอื่น")} แตะเพื่อแก้"`)
    : editBtn("sarTable", `data-key="${key}" title="แตะเพื่อแก้"`);
  const dash = (v) => (v === undefined || v === null || String(v).trim() === "" ? "-" : esc(v));
  const sarTable = (key, { numbered = true, empty = 3, render, cls = "" } = {}) => {
    const t = TABLES[key];
    let rows = rowsOf(key);
    const body = rows.length
      ? rows.map((r, i) => `<tr>${numbered ? `<td class="c">${i + 1}</td>` : ""}${t.cols.map((_, j) => `<td class="${j ? "c" : ""}">${render ? render(r, j) : esc(r[j] || "")}</td>`).join("")}</tr>`).join("")
      : Array.from({ length: empty }, () => `<tr class="blank">${numbered ? "<td></td>" : ""}${t.cols.map(() => "<td></td>").join("")}</tr>`).join("");
    return `<table class="sar-t ${cls}"><thead><tr>${numbered ? `<th class="no">ที่</th>` : ""}${t.cols.map((c) => `<th>${esc(c.replace(/ \(คั่น.*\)$/, ""))}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>`;
  };
  const h = (text, { toc, lv = 2, edit = "", cls = "" } = {}) =>
    `<div class="sar-h h${lv} ${cls}" data-keep="1"${toc ? ` data-toc="${esc(toc)}"` : ""}>${text}${edit}</div>`;
  const tickCell = (g, id, v, cur) => `<td class="sar-rt${String(cur) === String(v) ? " on" : ""}" data-act="sarRate" data-g="${g}" data-id="${esc(id)}" data-v="${v}" title="แตะเพื่อติ๊ก"></td>`;
  const rateOf = (g, id) => S()[g]?.[id];

  // ---------- เนื้อหาแต่ละส่วน (คืนรายการบล็อก) ----------
  // บล็อก = { html, brk: ขึ้นหน้าใหม่, kind: "cover" | "front" | "body" }
  function buildBlocks() {
    const p = P(), c = C0(), s = S();
    const B = [];
    const add = (html, o = {}) => B.push({ html, ...o });
    // หน้าคั่นแต่ละตอน
    const divider = (no, title, sub, extra = "") => add(`<div class="sar-divider" data-toc="${no ? `ตอนที่ ${no} ` : ""}${esc(title)}">
      ${no ? `<div class="no">ตอนที่ ${no}</div>` : ""}<div class="t">${esc(title)}</div><div class="rule"></div>${sub ? `<div class="s">${esc(sub)}</div>` : ""}${extra}</div>`, { kind: "divider", brk: true });
    const name = p.name || "ชื่อ นามสกุล";
    const pos = [p.position || "ครู", s.rank || c.rank].filter(Boolean).join(" ");
    const signDate = s.signDate || `31 มีนาคม ${Number(Y) + 1}`;
    const logo = safeUrl(c.logo), photo = safeUrl(p.photo);

    // ปก
    add(`<div class="sar-cover">
      ${editBtn("sarCover", "", "แก้ปกและผู้ลงนาม")}
      <div class="sar-cover-top">
        ${logo ? `<img class="sar-logo" src="${esc(logo)}" alt="">` : `<div class="sar-logo ph">ตราโรงเรียน<br><small>ใส่ได้ที่ปุ่มแก้ปก</small></div>`}
        <div class="sar-cover-eyebrow">SELF ASSESSMENT REPORT</div>
      </div>
      <div class="sar-cover-mid">
        <div class="sar-cover-year">ปีการศึกษา ${esc(Y)}</div>
        <div class="sar-cover-title">รายงานผลการปฏิบัติงาน<br>และผลการประเมินตนเองรายบุคคล</div>
        <div class="sar-cover-sub">(Self Assessment Report : SAR)${PUB ? `<span class="sar-pub-tag">ฉบับเผยแพร่</span>` : ""}</div>
      </div>
      <div class="sar-cover-bottom">
        ${photo ? `<img class="sar-photo" src="${esc(photo)}" alt="">` : ""}
        <div class="sar-cover-who"><span class="lbl">ผู้รายงาน</span><b>${esc(name)}</b><span>ตำแหน่ง ${esc(pos)}${p.academicStanding ? ` วิทยฐานะ${esc(p.academicStanding.replace(/^ครู/, ""))}` : ""}</span>
          <span class="sch">${esc(school())}${c.addr ? ` ${esc(c.addr)}` : ""}</span><span>${esc(p.office || "")}</span></div>
      </div>
    </div>`, { kind: "cover" });

    // คำนำ
    const intro = fill(s.intro || c.intro || INTRO).split("\n").filter((x) => x.trim()).map((x) => `<p class="sar-indent">${esc(x)}</p>`).join("");
    add(`<div class="sar-title">คำนำ${editBtn("sarIntro")}</div>${intro}
      <div class="sar-sign right"><div>ลงชื่อ</div><div>(${esc(name)})</div><div>${esc(pos)}</div><div>${esc(signDate)}</div></div>`, { kind: "front", brk: true });

    // สารบัญ (ใส่เลขหน้าหลังแบ่งหน้าเสร็จ)
    add(`<div class="sar-title">สารบัญ</div><div class="sar-toc" data-toc-box></div>`, { kind: "front", brk: true });

    // ---------- ตอนที่ 1 ----------
    divider("1", "ข้อมูลส่วนตัว", "การปฏิบัติหน้าที่ การจัดการเรียนการสอน และผลการปฏิบัติงาน");
    add(h("ตอนที่ 1 : ข้อมูลส่วนตัว", { lv: 1 }), { kind: "body", brk: true });
    const edu = (p.education || []).filter((e) => e.degree);
    const age = c.birth && /\d{4}\s*$/.test(c.birth) ? String(Number(Y) + 1 - Number(c.birth.match(/(\d{4})\s*$/)[1])) : "";
    add(h("1.1 ข้อมูลทั่วไป", { toc: "- ข้อมูลทั่วไป", edit: editBtn("sarInfo") }) +
      `<div class="sar-kv">
        <p>ชื่อ <u>${esc(name)}</u> วุฒิการศึกษา</p>
        ${edu.length ? edu.map((e) => `<p class="in1">${cb(true)} ${esc(e.degree)}${e.institution ? ` จาก ${esc(e.institution)}` : ""}${e.year ? ` (พ.ศ. ${esc(e.year)})` : ""}</p>`).join("")
          : `<p class="in1 muted">ยังไม่มีวุฒิการศึกษา ใส่ได้ที่เมนูโปรไฟล์</p>`}
        <p>ตำแหน่ง <u>${esc(p.position || "ครู")}</u> วิทยฐานะ <u>${esc(p.academicStanding || "-")}</u>${PUB ? "" : ` อายุ <u>${esc(s.age || age || "-")}</u> ปี`}</p>
        ${PUB ? "" : `<p>เลขที่ตำแหน่ง <u>${dash(c.positionNo)}</u></p>
        <p>วัน / เดือน / ปี เกิด <u>${dash(c.birth)}</u></p>
        <p>วัน / เดือน / ปี บรรจุเข้ารับราชการ <u>${dash(c.appointed)}</u></p>`}
        <p>ปฏิบัติการสอนกลุ่มสาระ <u>${dash(p.learningArea)}</u></p>
        <p>ปฏิบัติงานพิเศษ <u>${dash(s.extraDuty || yearDuties().map((r) => r.title).join(" , "))}</u></p>
        ${s.dutyDay ? `<p>ครูเวรประจำวัน<u>${esc(s.dutyDay)}</u></p>` : ""}
      </div>`);

    // วันลา
    const leaves = arr("leaves").filter((l) => LEAVE_TYPES.includes(l.type) && inYear(l.from)).sort((a, b) => String(a.from).localeCompare(String(b.from)));
    const cnt = (t) => leaves.filter((l) => l.type === t);
    const days = (ls) => ls.reduce((a, l) => a + (Number(l.days) || 0), 0);
    const lRow = (label, f) => `<tr><td>${label}</td>${LEAVE_TYPES.map((t) => f(t)).join("")}</tr>`;
    const totalN = leaves.length, totalD = days(leaves);
    if (!PUB) add(`<p class="sar-center"><b>แสดงจำนวนวันลา ประจำปีการศึกษา ${esc(Y)}</b><br>(${thLong(yStart())} – ${thLong(yEnd())})</p>
      <table class="sar-t leave"><thead><tr><th rowspan="2">วัน เดือน ปี<br>ที่ลา</th>${LEAVE_TYPES.map((t) => `<th colspan="2">${t}</th>`).join("")}</tr>
      <tr>${LEAVE_TYPES.map(() => "<th>ครั้ง</th><th>วัน</th>").join("")}</tr></thead><tbody>
      ${leaves.length ? leaves.map((l) => lRow(`${thShort(l.from)}${l.to && l.to !== l.from ? ` – ${thShort(l.to)}` : ""}`, (t) => (t === l.type ? `<td class="c">1</td><td class="c">${esc(l.days || 1)}</td>` : `<td class="c">-</td><td class="c">-</td>`))).join("")
        : lRow("-", () => `<td class="c">-</td><td class="c">-</td>`)}
      ${lRow("<b>รวม</b>", (t) => `<td class="c">${cnt(t).length || "-"}</td><td class="c">${days(cnt(t)) || "-"}</td>`)}
      <tr><td><b>รวมทั้งสิ้น</b></td><td colspan="${LEAVE_TYPES.length * 2}" class="c">จำนวน ${totalN} ครั้ง จำนวน ${totalD} วัน</td></tr></tbody></table>
      <p class="sar-note">ข้อมูลจากเมนูการลา</p>`);

    // 1.2
    add(h("1.2 ข้อมูลการปฏิบัติหน้าที่", { toc: "- ข้อมูลการปฏิบัติหน้าที่" }) +
      h(`1.2.1 ปฏิบัติการสอนตลอดปีการศึกษา ${esc(Y)}`, { lv: 3 }));
    for (const k of ["teach1", "teach2"]) add(`<div class="sar-sub" data-keep="1">ภาคเรียนที่ ${k.slice(-1)} ${tableEdit(k)}</div>` + sarTable(k));
    add(h(`1.2.2 กิจกรรมพัฒนาผู้เรียน ที่ปฏิบัติการพัฒนาผู้เรียนตลอดปีการศึกษา ${esc(Y)}`, { lv: 3, edit: tableEdit("activities") }) + sarTable("activities"));
    add(h("1.2.3 ปฏิบัติหน้าที่ครูที่ปรึกษา", { lv: 3, edit: tableEdit("homeroom") }) + sarTable("homeroom", {
      numbered: false, empty: 1,
      render: (r, j) => (j === 3 && !r[3] && (Number(r[1]) || Number(r[2])) ? String((Number(r[1]) || 0) + (Number(r[2]) || 0)) : esc(r[j] || "")),
    }));
    const special = rowsOf("special");
    add(h("1.2.4 งานพิเศษในโรงเรียน ได้แก่", { lv: 3, edit: tableEdit("special") }) +
      (special.length ? `<ul class="sar-list">${special.map((r) => `<li>${esc(r[0])}</li>`).join("")}</ul>` : `<p class="in2">-</p>`));
    // 1.2.5 คำสั่งแต่งตั้ง (คำสั่งเป็นข้อมูลส่วนตัวเสมอ ฉบับเผยแพร่จึงไม่แสดง)
    if (!PUB) add(h(`1.2.5 คำสั่งแต่งตั้งที่ได้รับ ปีการศึกษา ${esc(Y)}`, { lv: 3, edit: tableEdit("orders") }) + sarTable("orders", { cls: "sar-orders", empty: 2 }) +
      (yearOrders().length ? `<p class="sar-note right">รวม ${yearOrders().length} คำสั่ง</p>` : ""));

    // 1.3
    add(h("1.3 การจัดกิจกรรมการเรียนการสอน", { toc: "- การจัดกิจกรรมการเรียนการสอน" }) +
      h("1.3.1 จัดทำแผนการจัดการเรียนรู้ ดังนี้", { lv: 3, edit: tableEdit("plans") }) + sarTable("plans"));
    add(h("1.3.2 ผลิตสื่อ / นวัตกรรม ได้แก่", { lv: 3, edit: tableEdit("media") }) + sarTable("media"));
    add(h("1.3.3 ให้ผู้เรียนได้ศึกษาแหล่งเรียนรู้นอกสถานที่ ได้แก่", { lv: 3, edit: tableEdit("places") }) + sarTable("places", { empty: 2 }));
    add(h("1.3.4 จัดให้ผู้เรียนได้เรียนรู้จากภูมิปัญญาในท้องถิ่น ได้แก่", { lv: 3, edit: tableEdit("wisdom") }) + sarTable("wisdom", { empty: 2 }));
    add(h("1.3.5 จัดทำวิจัยในชั้นเรียน ได้แก่", { lv: 3, edit: tableEdit("research") }) + sarTable("research", { empty: 2 }));
    add(h("1.3.6 ใช้วิธีการวัดและประเมินผลในรายวิชาที่รับผิดชอบ ดังนี้", { lv: 3, edit: tableEdit("measure") }) + sarTable("measure", {
      render: (r, j) => (j === 1 ? splitList(r[1]).map((m, i) => `<div class="l">${i + 1}. ${esc(m)}</div>`).join("") : esc(r[j] || "")),
    }));
    add(h("1.3.7 เชิญวิทยากรภายนอกมาให้ความรู้แก่นักเรียน ได้แก่", { lv: 3, edit: tableEdit("speakers") }) + sarTable("speakers", { empty: 2 }));

    const methods = new Set(s.methods || []);
    const half = Math.ceil(METHODS.length / 2);
    const mCell = (m) => `<button type="button" class="sar-opt" data-act="sarMethod" data-v="${esc(m)}">${cb(methods.has(m))} ${esc(m)}</button>`;
    const nMethods = METHODS.filter((m) => methods.has(m)).length + (s.methodsOther ? 1 : 0);
    add(h("1.3.8 รูปแบบ / วิธีการจัดกิจกรรมการเรียนการสอนที่ครูใช้ คือ ข้อใดบ้าง (ตอบได้มากกว่า 1 ข้อ)", { lv: 3 }) +
      `<div class="sar-opts">${METHODS.slice(0, half).map((m, i) => mCell(m) + (METHODS[half + i] ? mCell(METHODS[half + i]) : "<span></span>")).join("")}
        <button type="button" class="sar-opt wide" data-act="sarOther">${cb(!!s.methodsOther)} อื่น ๆ ระบุ ${s.methodsOther ? `<u>${esc(s.methodsOther)}</u>` : "............"}</button></div>
      <p class="in2"><b>สรุป</b> จำนวนรูปแบบ / วิธีการจัดกิจกรรมการเรียนการสอนที่ครูใช้ <u>&nbsp;${nMethods}&nbsp;</u> วิธี</p>`);

    add(h("1.3.9 สภาพการปฏิบัติงานสอน เขียนเครื่องหมาย ✓ ในช่องที่ตรงกับความเป็นจริงที่ท่านปฏิบัติอยู่", { lv: 3 }) +
      `<table class="sar-t rate"><thead><tr><th class="no">ที่</th><th>รายการปฏิบัติ</th>${LV5.map((l) => `<th class="lv">${l}</th>`).join("")}</tr></thead>
      <tbody>${COND.map((t, i) => `<tr><td class="c">${i + 1}</td><td>${t}</td>${LV5.map((l) => tickCell("cond", i + 1, l, rateOf("cond", i + 1))).join("")}</tr>`).join("")}</tbody></table>`);

    add(h("1.3.10 การพัฒนาตนเอง (การเข้าร่วมกิจกรรมทางวิชาการ / การเข้าร่วมอบรม / ประชุมสัมมนา / ศึกษาดูงาน ฯลฯ)", { lv: 3, edit: tableEdit("trainings") }) +
      sarTable("trainings", { empty: 2 }) + (() => {
        const tr = rowsOf("trainings"), hrs = tr.reduce((a, r) => a + (Number(r[3]) || 0), 0);
        return tr.length ? `<p class="sar-note right">รวม ${tr.length} รายการ ${hrs} ชั่วโมง</p>` : "";
      })());
    add(h("1.3.11 การได้รับรางวัล / ประกาศเกียรติคุณ / ผลงานดีเด่น / เกียรติประวัติที่ปรากฏต่อสาธารณชนด้านสถานศึกษา / ครู / นักเรียน", { lv: 3, edit: tableEdit("awards") }) +
      sarTable("awards", { empty: 2 }));
    add(h("1.3.12 การได้รับเชิญเป็นวิทยากร/กรรมการตัดสินภายในและภายนอกสถานศึกษา", { lv: 3, edit: tableEdit("judge") }) + sarTable("judge", { empty: 2 }));

    // 1.4 ผลการประเมินการสอนโดยนักเรียน
    const stuOverall = s.studentOverall || modeOf(Object.values(s.student || {}));
    add(h("1.4 ผลการประเมินการสอนของครูโดยนักเรียน (หลักฐานแสดงความพึงพอใจต่อการเรียนการสอน)", { toc: "- ผลการประเมินการสอนของครูโดยนักเรียน" }) +
      `<p class="in1">ตาราง แสดงระดับการประเมินการสอนของครูโดยนักเรียน</p>
      <table class="sar-t rate"><thead><tr><th>กิจกรรม</th>${LV5.map((l) => `<th class="lv">${l}</th>`).join("")}</tr></thead>
      <tbody>${STUDENT.map((t, i) => `<tr><td>${i + 1}. ${t}</td>${LV5.map((l) => tickCell("student", i + 1, l, rateOf("student", i + 1))).join("")}</tr>`).join("")}</tbody></table>`);
    add(`<p class="in1">จากผลการประเมินการสอนของครูโดยนักเรียน พบว่าอยู่ในระดับ</p>
      <div class="sar-inline">${LV5.map((l) => `<button type="button" class="sar-opt" data-act="sarPick" data-f="studentOverall" data-v="${l}">${cb(stuOverall === l)} ${l}</button>`).join("")}</div>
      ${surveyLine()}`);

    // 1.5 ประเมินแผนการจัดการเรียนรู้
    const planLv = PLAN.map((_, i) => Number(rateOf("plan", i + 1)) || 0).filter(Boolean);
    const planAvg = planLv.length ? planLv.reduce((a, b) => a + b, 0) / planLv.length : 0;
    const planSum = planAvg ? PLAN_LV[Math.min(4, Math.max(1, Math.round(planAvg)))] : "";
    add(h("1.5 การประเมินตนเองเกี่ยวกับการจัดทำแผนการจัดการเรียนรู้ที่เน้นผู้เรียนเป็นสำคัญ", { toc: "- การประเมินตนเองของครู" }) +
      `<p class="in1">(เขียนเครื่องหมาย ✓ ลงในช่องระดับคุณภาพ โดยพิจารณาจากเกณฑ์การประเมินด้านขวามือ)</p>
      <table class="sar-t rate plan"><thead><tr><th rowspan="2">ดัชนีชี้วัด</th><th colspan="4">ระดับคุณภาพ</th><th rowspan="2">เกณฑ์การประเมิน</th></tr>
      <tr>${[4, 3, 2, 1].map((n) => `<th class="lv">${n}</th>`).join("")}</tr></thead>
      <tbody>${PLAN.map(([t, crit], i) => `<tr><td>${i + 1}. ${t}<div class="muted small">(ระดับ 4 มี 5 ข้อ ระดับ 3 มี 4 ข้อ ระดับ 2 มี 3 ข้อ ระดับ 1 มี 1-2 ข้อ)</div></td>
        ${[4, 3, 2, 1].map((n) => tickCell("plan", i + 1, n, rateOf("plan", i + 1))).join("")}
        <td class="crit">${crit.map((x, j) => `<div>${j + 1}. ${x}</div>`).join("")}</td></tr>`).join("")}</tbody></table>`);
    add(`<p class="in1"><b>สรุป :</b> การจัดทำแผนการจัดการเรียนรู้นี้ อยู่ในระดับคุณภาพ <u>&nbsp;${planSum || "........"}&nbsp;</u>${planAvg ? ` (เฉลี่ย ${planAvg.toFixed(2)})` : ""}</p>
      <p class="in1"><b>เกณฑ์การตัดสิน</b></p>
      ${[4, 3, 2, 1].map((n) => `<p class="in2">${n} หมายถึง มีการปฏิบัติอยู่ในระดับ${["ปรับปรุง หรือไม่พอใจ", "ปานกลาง หรือพอใจพอใช้", "ดี หรือพอใจมาก", "ดีมาก หรือพอใจมากที่สุด"][n - 1]}</p>`).join("")}`);

    // 1.6 ผลสัมฤทธิ์ทางการเรียน
    const ach = rowsOf("achieve");
    const pct = (r) => {
      const n = Number(r[2]) || GRADES.reduce((a, _, j) => a + (Number(r[3 + j]) || 0), 0);
      const good = GRADES.slice(0, 3).reduce((a, _, j) => a + (Number(r[3 + j]) || 0), 0);
      return n ? `${((good / n) * 100).toFixed(2)}` : "";
    };
    add(h("1.6 ผลสัมฤทธิ์ทางการเรียน", { toc: "- ผลสัมฤทธิ์ทางการเรียน", edit: tableEdit("achieve") }) +
      `<p class="in1">ตาราง แสดงจำนวนนักเรียนจำแนกตามระดับผลการเรียน ปีการศึกษา ${esc(Y)}</p>` +
      sarTable("achieve", { cls: "achieve", empty: 2, render: (r, j) => (j === 3 + GRADES.length ? esc(r[j] || pct(r)) : esc(r[j] || "")) }) +
      (ach.length ? achieveBars(ach, pct) : ""));

    // 1.7 การดูแลช่วยเหลือนักเรียน
    add(h("1.7 การดูแลช่วยเหลือนักเรียน", { toc: "- การดูแลช่วยเหลือนักเรียน", edit: tableEdit("care") }) +
      `<p class="in1">ผลการคัดกรองนักเรียน (SDQ) การเยี่ยมบ้าน และการส่งต่อ</p>` + sarTable("care", { numbered: false, empty: 1 }));

    // 1.8 นิเทศ / PLC
    add(h("1.8 การนิเทศ และการแลกเปลี่ยนเรียนรู้ทางวิชาชีพ (PLC)", { toc: "- การนิเทศ และ PLC", edit: tableEdit("supervision") }) + sarTable("supervision", { empty: 2 }));

    // 1.9 โครงการ
    const pj = rowsOf("projects");
    const num = (v) => Number(String(v || "").replace(/,/g, "")) || 0;
    const bsum = pj.reduce((a, r) => a + num(r[1]), 0), usum = pj.reduce((a, r) => a + num(r[2]), 0);
    add(h("1.9 โครงการ / กิจกรรมที่รับผิดชอบ", { toc: "- โครงการ / กิจกรรมที่รับผิดชอบ", edit: tableEdit("projects") }) + sarTable("projects", { empty: 2 }) +
      (bsum ? `<p class="sar-note right">รวมงบประมาณ ${bsum.toLocaleString("th-TH")} บาท ใช้จริง ${usum.toLocaleString("th-TH")} บาท (ร้อยละ ${((usum / bsum) * 100).toFixed(2)})</p>` : ""));

    // ---------- ตอนที่ 2 ----------
    divider("2", "ผลการดำเนินงานตามมาตรฐานการศึกษา", "มาตรฐานที่ 1 – 3 และผลการประเมินผู้เรียน");
    add(`${h("ตอนที่ 2 : ผลการดำเนินงานตามมาตรฐานการศึกษา", { lv: 1 })}
      <p><b>คำชี้แจง</b></p>
      <p class="in1">1. ศึกษาเกณฑ์มาตรฐานคุณภาพการศึกษาของ${esc(school())} มาตรฐานที่ 1 - 3</p>
      <p class="in1">2. มาตรฐานที่ 1 - 3 ประเมินผลแล้วจะได้ผลระดับคุณภาพตัวบ่งชี้/มาตรฐาน แล้วทำเครื่องหมาย ✓ ลงในช่องระดับคุณภาพ</p>
      <p class="in1">3. เกณฑ์การตัดสิน</p>
      ${CRITERIA5.map((t, i) => `<p class="in2">${5 - i} หมายถึง ${t}</p>`).join("")}`, { kind: "body", brk: true });
    for (const std of STD) {
      const cur = (n) => rateOf("std", `${std.no}.${n}`);
      const counts = [5, 4, 3, 2, 1].map((v) => std.items.filter((_, i) => String(cur(i + 1)) === String(v)).length);
      add(h(`มาตรฐานที่ ${std.no} ${std.title}`, { toc: `มาตรฐานที่ ${std.no} ${std.title}` }) +
        `<table class="sar-t rate"><thead><tr><th rowspan="2">ตัวบ่งชี้</th><th colspan="5">ระดับคุณภาพตัวบ่งชี้/มาตรฐาน</th></tr>
        <tr>${[5, 4, 3, 2, 1].map((n) => `<th class="lv">${n}</th>`).join("")}</tr></thead>
        <tbody>${std.items.map((t, i) => `<tr><td>${std.no}.${i + 1} ${t}</td>${[5, 4, 3, 2, 1].map((n) => tickCell("std", `${std.no}.${i + 1}`, n, cur(i + 1))).join("")}</tr>`).join("")}
        <tr class="sum"><td>สรุปผลการประเมินมาตรฐานที่ ${std.no}</td>${counts.map((n) => `<td class="c">${n || ""}</td>`).join("")}</tr></tbody></table>`);
      const sn = s.stdNotes?.[std.no] || {};
      const lines = (t) => splitLines(t).map((x) => `<div>- ${esc(x.replace(/^[-•]\s*/, ""))}</div>`).join("") || "<div>-</div>";
      add(`<table class="sar-t notes"><thead><tr><th>กิจกรรม/โครงการ/หลักฐานร่องรอยที่ดำเนินการ ${editBtn("sarStd", `data-no="${std.no}"`)}</th><th>ผลการดำเนินงาน</th></tr></thead>
        <tbody><tr><td>${lines(sn.projects)}</td><td><b>จุดเด่น</b>${lines(sn.strengths)}<b>จุดควรพัฒนา</b>${lines(sn.improve)}</td></tr></tbody></table>`);
    }
    // ผลการประเมินผู้เรียน
    const lvLine = (f, label) => `<p class="in1">${label} พบว่า นักเรียนอยู่ในระดับ <u>&nbsp;${esc(s.results?.[f] || "........")}&nbsp;</u></p>`;
    add(h("ผลการประเมินสมรรถนะสำคัญของผู้เรียน", { edit: editBtn("sarResults", "", "แก้ระดับสรุป") + tableEdit("competency") }) +
      sarTable("competency", { numbered: false, empty: 1 }) + lvLine("competency", "ผลการประเมินสมรรถนะสำคัญของผู้เรียน"));
    add(h("ผลการประเมินการอ่าน คิด วิเคราะห์และเขียน", { edit: tableEdit("reading") }) +
      sarTable("reading", { numbered: false, empty: 1 }) + lvLine("reading", "ผลการประเมินการอ่าน คิด วิเคราะห์และเขียน"));
    add(h("ผลการประเมินคุณลักษณะอันพึงประสงค์", { edit: tableEdit("traits") }) +
      `<p class="in1 small">คุณลักษณะอันพึงประสงค์ 8 ประการ: ${TRAITS.map((t, i) => `${i + 1}. ${t}`).join(" ")}</p>` +
      sarTable("traits", { numbered: false, empty: 1 }) + lvLine("traits", "ผลการประเมินคุณลักษณะอันพึงประสงค์"));

    // ---------- ตอนที่ 3 ----------
    divider("3", "ผลการปฏิบัติงานและการประเมินตนเอง", "การประเมินตนเองตามหน้าที่ และงานอื่นที่ได้รับมอบหมาย");
    add(`${h("ตอนที่ 3 : ผลการปฏิบัติงานและการประเมินตนเอง", { lv: 1 })}
      <p><b>คำชี้แจง</b> เกณฑ์การตัดสิน</p>${CRITERIA5.map((t, i) => `<p class="in2">${5 - i} หมายถึง ${t}</p>`).join("")}`,
    { kind: "body", brk: true });
    add(h("3.1 การประเมินตนเองที่เกิดจากการปฏิบัติหน้าที่ (3 ด้าน 13 ตัวบ่งชี้)", { toc: "- การประเมินตนเองที่เกิดจากการปฏิบัติหน้าที่" }) +
      `<table class="sar-t rate"><thead><tr><th rowspan="2">ตัวบ่งชี้</th><th colspan="5">ระดับคุณภาพ</th></tr><tr>${[1, 2, 3, 4, 5].map((n) => `<th class="lv">${n}</th>`).join("")}</tr></thead>
      <tbody>${P3.map(([code, t, rated, ind]) => `<tr class="${rated ? "" : "grp"}"><td class="ind${ind}">${code}${ind ? "" : "."} ${t}</td>${rated
        ? [1, 2, 3, 4, 5].map((n) => tickCell("p3", code, n, rateOf("p3", code))).join("")
        : "<td></td>".repeat(5)}</tr>`).join("")}</tbody></table>`);
    const duties = rowsOf("duties");
    add(h("3.2 ผลการประเมินการปฏิบัติงานในหน้าที่อื่นที่ได้รับมอบหมาย", { toc: "- ผลการประเมินการปฏิบัติงานในหน้าที่อื่นที่ได้รับมอบหมาย", edit: tableEdit("duties") }) +
      (duties.length ? "" : `<p class="in2">-</p>`));
    duties.forEach((r, i) => add(`<div class="sar-duty">
      <p class="in1">3.2.${i + 1} ${/^ภาพรวม/.test(r[0]) ? "ผลการประเมินตนเอง ปรากฏว่า ระดับคุณภาพการปฏิบัติหน้าที่อยู่ในระดับ" : `ปฏิบัติหน้าที่ ${esc(r[0])}`}</p>
      <div class="sar-inline in2">${DUTY_LV.map((l) => `<button type="button" class="sar-opt" data-act="sarDuty" data-i="${i}" data-v="${l}">${cb(r[1] === l)} ${l}</button>`).join("")}</div>
      <p class="in2">เหตุผล ${r[2] ? esc(r[2]) : "<span class=\"dots\"></span>"}</p></div>`));

    // ---------- ตอนที่ 4 บทสรุป ----------
    const sm = s.summary || {};
    const legacy = notes();
    const pick = (k, old) => (sm[k] !== undefined ? sm[k] : old || "");
    const lines4 = (t) => splitLines(t).map((x) => `<li>${esc(x.replace(/^[-•\d.]+\s*/, ""))}</li>`).join("");
    const stdAvg = (() => {
      const v = Object.entries(s.std || {}).filter(([k]) => STD.some((d) => k.startsWith(`${d.no}.`))).map(([, x]) => Number(x)).filter(Boolean);
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length).toFixed(2) : "";
    })();
    const trHours = rowsOf("trainings").reduce((a, r) => a + (Number(r[3]) || 0), 0);
    const achPct = (() => {
      const r = rowsOf("achieve");
      let n = 0, g = 0;
      r.forEach((x) => { n += Number(x[2]) || 0; g += GRADES.slice(0, 3).reduce((a, _, j) => a + (Number(x[3 + j]) || 0), 0); });
      return n ? `${((g / n) * 100).toFixed(1)}%` : "-";
    })();
    const kpis = [
      [trHours ? `${trHours}` : "-", "ชั่วโมงพัฒนาตนเอง"],
      [String(rowsOf("awards").length || "-"), "รางวัล / ผลงาน"],
      [achPct, "นักเรียนได้ระดับ 3 ขึ้นไป"],
      [stdAvg || "-", "ค่าเฉลี่ยตามมาตรฐาน (จาก 5)"],
    ];
    divider("4", "บทสรุปและแนวทางการพัฒนา", "ภาพรวมผลการปฏิบัติงาน จุดเด่น จุดที่ควรพัฒนา และแผนพัฒนาในปีถัดไป");
    add(h("ตอนที่ 4 : บทสรุปและแนวทางการพัฒนา", { lv: 1, edit: editBtn("sarSummary") }) +
      `<div class="sar-kpis">${kpis.map(([v, l]) => `<div><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join("")}</div>`, { kind: "body", brk: true });
    const sec4 = (no, title, text, empty) => add(h(`${no} ${title}`) + (splitLines(text).length ? `<ol class="sar-ol">${lines4(text)}</ol>` : `<p class="in1 muted">${empty}</p>`));
    sec4("4.1", "จุดเด่น", pick("strengths", legacy.strengths), "ยังไม่ได้กรอก กดปุ่มแก้ไขที่หัวข้อตอนที่ 4");
    sec4("4.2", "จุดที่ควรพัฒนา", pick("improve", legacy.improve), "ยังไม่ได้กรอก");
    sec4("4.3", "แนวทางการพัฒนาในปีการศึกษาถัดไป", pick("plan", legacy.plan), "ยังไม่ได้กรอก");
    if (pick("support")) sec4("4.4", "ความต้องการการสนับสนุน", pick("support"), "");

    // หน้ารับรอง
    const sig = PUB ? "" : safeUrl(c.sig);
    const signer = (nm, ps, role, img) => `<div class="sar-sign">${img ? `<img class="sar-sig" src="${esc(img)}" alt="">` : ""}<div>ลงชื่อ ............................................... ${role}</div><div>(${esc(nm || "...............................................")})</div><div>${esc(ps || "")}</div><div>${esc(signDate)}</div></div>`;
    add(`<div class="sar-title">การรับรองรายงานการประเมินตนเอง<br><span class="sar-title-sub">(Self Assessment Report : SAR)</span></div>
      ${editBtn("sarCover", "", "แก้ผู้ลงนาม")}
      ${signer(name, pos, "ผู้รายงาน", sig)}
      ${signer(s.headName ?? c.headName, s.headPos ?? (c.headPos || "หัวหน้าฝ่ายวิชาการ"), "ผู้รับรองรายงาน")}
      ${signer(s.dirName ?? c.dirName, s.dirPos ?? (c.dirPos || `ผู้อำนวยการ${school()}`), "ผู้รับรองรายงาน")}`, { kind: "body", brk: true });

    // ---------- ภาคผนวก ----------
    const ap = { certs: true, photos: true, qr: true, portfolio: true, ...(s.appendix || {}) };
    const pubOk = (x) => !PUB || isPublicItem(x);
    const certs = ap.certs ? L("certificates").filter((x) => pubOk(x) && inYear(x.date) && safeUrl(x.image)).sort((a, b) => String(a.date).localeCompare(String(b.date))) : [];
    const photos = ap.photos ? L("albums").filter((a) => pubOk(a) && inYear(a.date)).flatMap((a) => (a.photos || []).slice(0, 2).map((ph) => ({ img: ph.img || ph.url, cap: a.title, date: a.date })))
      .filter((x) => safeUrl(x.img)) : [];
    const qrItems = ap.qr ? [
      ...L("evidence").filter((e) => pubOk(e) && safeUrl(e.link) && /^https?:/.test(e.link) && (!e.date || inYear(e.date))).map((e) => ({ t: e.title, u: e.link, k: e.source || "หลักฐาน" })),
      ...L("trainings").filter((t) => pubOk(t) && inYear(t.date) && /^https?:/.test(t.certificate || "")).map((t) => ({ t: t.title, u: t.certificate, k: "เกียรติบัตรการอบรม" })),
      ...L("works").filter((w) => pubOk(w) && (!w.year || w.year === Y) && /^https?:/.test(w.link || "")).map((w) => ({ t: w.title, u: w.link, k: w.type || "ผลงาน" })),
    ] : [];
    const portUrl = typeof siteUrl === "function" && SITE ? siteUrl() : "";
    const qr = (u, size) => { try { return window.qrSVG ? window.qrSVG(u, { size, margin: 1, color: "#111" }) : ""; } catch { return ""; } };
    divider("", "ภาคผนวก", "ภาพหลักฐาน เกียรติบัตร และลิงก์หลักฐานออนไลน์", ap.portfolio && portUrl
      ? `<div class="sar-port">${qr(portUrl, 110)}<div><b>แฟ้มสะสมผลงานออนไลน์</b><span>สแกนเพื่อดูผลงานและหลักฐานทั้งหมด</span><small>${esc(portUrl)}</small></div></div>` : "");
    let apNo = 0;
    const apHead = (t) => h(`${"กขคง"[apNo++]}. ${t}`, { lv: 2, edit: apNo === 1 ? editBtn("sarAppendix", "", "เลือกสิ่งที่แสดง") : "" });
    const fig = (src, cap, sub) => `<figure class="sar-fig"><div class="ph"><img src="${esc(src)}" alt="" referrerpolicy="no-referrer" loading="eager"></div><figcaption>${esc(cap)}${sub ? `<small>${esc(sub)}</small>` : ""}</figcaption></figure>`;
    const grid = (items, per, render) => { for (let i = 0; i < items.length; i += per) add(`<div class="sar-grid g${per}">${items.slice(i, i + per).map(render).join("")}</div>`); };
    if (certs.length) {
      add(apHead("เกียรติบัตรและรางวัล"), { kind: "body", brk: true });
      grid(certs, 2, (x) => fig(x.image, x.title, [x.level, thShort(x.date)].filter(Boolean).join(" · ")));
    }
    if (photos.length) {
      add(apHead("ภาพกิจกรรม"), { kind: "body", brk: !certs.length });
      grid(photos, 2, (x) => fig(x.img, x.cap, thShort(x.date)));
    }
    if (qrItems.length) {
      add(apHead("หลักฐานออนไลน์ (สแกน QR Code)"), { kind: "body", brk: !certs.length && !photos.length });
      grid(qrItems.slice(0, 40), 4, (x) => `<figure class="sar-qr">${qr(x.u, 92)}<figcaption>${esc(x.t)}<small>${esc(x.k)}</small></figcaption></figure>`);
    }
    if (!certs.length && !photos.length && !qrItems.length) add(`<p class="in1 muted">${editBtn("sarAppendix", "", "เลือกสิ่งที่แสดง")}ยังไม่มีภาพหรือลิงก์หลักฐานในปีการศึกษานี้ เพิ่มได้ที่เมนูเกียรติบัตร อัลบั้มภาพ และคลังหลักฐาน</p>`, { kind: "body", brk: true });
    return B;
  }
  const splitLines = (t) => String(t || "").split("\n").map((x) => x.trim()).filter(Boolean);
  const modeOf = (vals) => {
    const n = {};
    vals.filter(Boolean).forEach((v) => (n[v] = (n[v] || 0) + 1));
    return Object.entries(n).sort((a, b) => b[1] - a[1])[0]?.[0] || "";
  };
  // แผนภูมิแท่งการกระจายระดับผลการเรียน (รวมทุกวิชา) ขาวดำ พิมพ์แล้วยังอ่านได้
  const achieveBars = (rows) => {
    const cnt = GRADES.map((_, j) => rows.reduce((a, r) => a + (Number(r[3 + j]) || 0), 0));
    const max = Math.max(1, ...cnt), total = cnt.reduce((a, b) => a + b, 0);
    if (!total) return "";
    return `<div class="sar-bars">${GRADES.map((g, j) => `<div class="col"><span class="v">${cnt[j] || ""}</span><i style="height:${(cnt[j] / max) * 100}%"${j < 3 ? ' class="hi"' : ""}></i><span class="g">${g}</span></div>`).join("")}
      <div class="cap">จำนวนนักเรียนในแต่ละระดับผลการเรียน (แถบเข้ม = ระดับ 3 ขึ้นไป)</div></div>`;
  };
  // ผลแบบประเมินความพึงพอใจจากเมนูแบบประเมิน (ถ้าเคยเปิดดูผลแล้ว)
  const surveyLine = () => {
    const done = L("surveys").map((sv) => [sv, App.surveyStats?.[sv.id]]).filter(([, r]) => r && r.counted);
    return done.length
      ? `<p class="sar-note">อ้างอิง: ${done.map(([sv, r]) => `${esc(sv.title)} เฉลี่ย ${r.overall.toFixed(2)} จาก 5 (${r.counted} คน)`).join(", ")}</p>` : "";
  };

  // ---------- แบ่งหน้า A4 ----------
  const pageEl = (kind) => {
    const d = document.createElement("section");
    d.className = `sar-page ${kind}`;
    d.dataset.kind = kind;
    d.innerHTML = `<div class="sar-run"><span>${esc(runTitle)}</span><span class="sar-pno"></span></div><div class="sar-body"></div>`;
    return d;
  };
  const bottomOf = (body) => {
    const last = body.lastElementChild;
    if (!last) return 0;
    const mb = parseFloat(getComputedStyle(last).marginBottom) || 0;
    return last.getBoundingClientRect().bottom + mb;
  };
  const over = (body) => bottomOf(body) > body.getBoundingClientRect().bottom + 0.5;

  let runTitle = "";
  function paginate(book, blocks) {
    runTitle = `รายงานการประเมินตนเอง (SAR) ปีการศึกษา ${Y}${PUB ? " · ฉบับเผยแพร่" : ""}`;
    book.innerHTML = "";
    let page, body;
    const newPage = (kind) => { page = pageEl(kind); body = page.lastElementChild; book.append(page); };
    newPage(blocks[0]?.kind || "body");
    let kind = blocks[0]?.kind || "body";
    for (const b of blocks) {
      if (b.kind) kind = b.kind;
      if (b.brk && body.children.length) newPage(kind);
      const tmp = document.createElement("div");
      tmp.innerHTML = b.html;
      if (b.toc) tmp.firstElementChild?.setAttribute("data-toc", b.toc);
      for (const el of [...tmp.children]) place(el);
    }
    function place(el) {
      body.append(el);
      let guard = 0;
      while (over(body) && guard++ < 200) {
        if (el.tagName === "TABLE" && el.tBodies[0]?.rows.length > 1) {
          const nt = el.cloneNode(false);
          if (el.tHead) nt.append(el.tHead.cloneNode(true));
          const tb = document.createElement("tbody");
          nt.append(tb);
          while (over(body) && el.tBodies[0].rows.length > 1) tb.prepend(el.tBodies[0].lastElementChild);
          if (over(body)) {
            // แถวแรกก็ยังล้น → ย้ายทั้งตาราง (รวมหัวข้อที่ต้องอยู่ติดกัน) ไปหน้าใหม่
            while (tb.rows.length) el.tBodies[0].append(tb.firstElementChild);
            if (!moveToNewPage(el)) break;
            continue;
          }
          el.classList.add("cont-next");
          nt.classList.add("cont");
          newPage(kind);
          body.append(nt);
          el = nt;
          continue;
        }
        if (!moveToNewPage(el)) break;
      }
    }
    function moveToNewPage(el) {
      const carry = [el];
      while (carry[0].previousElementSibling?.dataset.keep && carry[0].previousElementSibling.previousElementSibling) carry.unshift(carry[0].previousElementSibling);
      if (!carry[0].previousElementSibling) return false; // อยู่บนสุดของหน้าแล้ว ใหญ่เกินหน้า ยอมให้ล้น
      newPage(kind);
      carry.forEach((n) => body.append(n));
      return true;
    }
    // เลขหน้า: ปกไม่มี, ส่วนหน้า ก ข ค, เนื้อหา 1 2 3
    const TH_ALPHA = "กขคงจฉชซฌญ";
    let f = 0, n = 0;
    const pageNo = new Map();
    book.querySelectorAll(".sar-page").forEach((pg) => {
      const k = pg.dataset.kind;
      const label = k === "front" ? TH_ALPHA[f++] || "" : k === "body" || k === "divider" ? String(++n) : "";
      pg.querySelector(".sar-pno").textContent = label;
      pageNo.set(pg, label);
    });
    // สารบัญ
    const toc = book.querySelector("[data-toc-box]");
    if (toc) {
      const rows = [...book.querySelectorAll("[data-toc]")].map((el) => {
        const t = el.dataset.toc;
        const lv = /^(ตอนที่|ภาคผนวก)/.test(t) ? 0 : 1;
        return `<div class="toc-row lv${lv}"><span>${esc(t)}</span><i></i><b>${pageNo.get(el.closest(".sar-page")) || ""}</b></div>`;
      }).join("");
      toc.innerHTML = `<div class="toc-row head"><span></span><i></i><b>หน้า</b></div>${rows}`;
    }
    fitZoom(book);
  }
  const fitZoom = (book) => {
    const w = book.parentElement?.clientWidth || 0;
    const pw = book.querySelector(".sar-page")?.offsetWidth || 794;
    book.style.setProperty("--z", w && w < pw + 32 ? String(Math.max(0.35, (w - 16) / pw)) : "1");
  };

  // ---------- หน้า ----------
  App.pages["admin/sar"] = ({ q }) => {
    const stored = Object.keys(notes().years);
    const years = [...new Set([...stored, String(BE_NOW), String(BE_NOW - 1)])].sort().reverse();
    Y = q.year && /^\d{4}$/.test(q.year) ? q.year : String(BE_NOW);
    PUB = q.v === "pub";
    const modeBar = `<div class="sar-mode" role="radiogroup" aria-label="ฉบับ">
      <button type="button" role="radio" aria-checked="${!PUB}" data-act="sarMode" data-v="">ฉบับเต็ม<small>ส่งผู้ประเมิน</small></button>
      <button type="button" role="radio" aria-checked="${PUB}" data-act="sarMode" data-v="pub">ฉบับเผยแพร่<small>ขึ้นหน้าสาธารณะ</small></button></div>
      ${PUB ? `<p class="sar-mode-note">ฉบับนี้ซ่อน วันเกิด อายุ เลขที่ตำแหน่ง วันบรรจุ ตารางวันลา และลายเซ็น ส่วนภาคผนวกแสดงเฉพาะรายการที่ตั้งเป็นสาธารณะ</p>` : ""}`;
    const prev = stored.filter((y) => y < Y && has(y)).sort().pop();
    const copy = !has(Y) && prev ? `<button class="btn ghost" data-act="sarCopy" data-from="${prev}">คัดลอกข้อมูลที่กรอกจากปี ${prev}</button>` : "";
    return head(`SAR ปีการศึกษา ${esc(Y)}`, "ดูตัวอย่างตามแบบฟอร์มโรงเรียน แตะช่องในตารางเพื่อติ๊ก ✓ ปุ่มแก้ไขข้างหัวข้อจะไม่ติดไปตอนพิมพ์ (ปุ่มสีเขียว = ข้อมูลดึงจากเมนูอื่นอัตโนมัติ)",
      `<button class="btn" data-act="sarPrint">พิมพ์ / บันทึกเป็น PDF</button>${copy}`) +
      modeBar + `<div class="filters">${years.map((y) => `<button data-year="${y}" class="${y === Y ? "on" : ""}">ปี ${y}${has(y) ? "" : " (ยังไม่กรอก)"}</button>`).join("")}</div>` +
      `<div class="sar-wrap"><div class="sar-book" id="sarBook"><p class="empty">กำลังจัดหน้า…</p></div></div>`;
  };
  // จัดหน้าหลังวาดหน้าเสร็จ (รอฟอนต์โหลดก่อน ความสูงจะได้ถูก)
  const prevAfter = App.afterRender;
  App.afterRender = () => {
    prevAfter?.();
    layout();
  };
  let keepY = null;
  async function layout() {
    const book = document.getElementById("sarBook");
    if (!book) return;
    // รอฟอนต์ TH Sarabun New โหลดเสร็จก่อน ความสูงบรรทัดจะได้ตรงกับตอนพิมพ์
    try { await Promise.all([document.fonts.load('16pt "SAR Sarabun"', "ก"), document.fonts.load('bold 16pt "SAR Sarabun"', "ก")]); } catch { /* ใช้ฟอนต์สำรอง */ }
    await document.fonts.ready;
    if (!book.isConnected) return;
    book.style.setProperty("--z", "1");
    paginate(book, buildBlocks());
    if (keepY !== null) { window.scrollTo(0, keepY); keepY = null; }
  }
  const rerender = () => { keepY = window.scrollY; render(); };
  window.addEventListener("resize", () => { const b = document.getElementById("sarBook"); if (b) fitZoom(b); });

  // ---------- การกระทำ ----------
  const A = App.actions;
  A.sarPrint = () => {
    const name = P().name ? ` ${P().name}` : "";
    const old = document.title;
    document.title = `SAR ${Y}${name}${PUB ? " (ฉบับเผยแพร่)" : ""}`; // ใช้เป็นชื่อไฟล์ PDF
    window.print();
    setTimeout(() => (document.title = old), 500);
  };
  // สลับฉบับเต็ม / ฉบับเผยแพร่ (เก็บไว้ในลิงก์ ปุ่มเลือกปียังจำฉบับไว้)
  A.sarMode = (b) => {
    const { q } = parseHash();
    if (b.dataset.v) q.v = b.dataset.v; else delete q.v;
    const qs = new URLSearchParams(q).toString();
    location.hash = `#/sar${qs ? `?${qs}` : ""}`;
  };
  A.sarRate = (b) => {
    const g = b.dataset.g, id = b.dataset.id, v = b.dataset.v;
    const s = S();
    s[g] = s[g] || {};
    if (String(s[g][id]) === v) delete s[g][id]; else s[g][id] = /^\d+$/.test(v) ? Number(v) : v;
    // อัปเดตแถวทันที ไม่ต้องจัดหน้าใหม่ทั้งเล่ม
    b.closest("tr").querySelectorAll(".sar-rt").forEach((td) => td.classList.toggle("on", String(s[g][id]) === td.dataset.v));
    save();
    if (g === "std" || g === "plan" || g === "student") rerender(); // มีผลรวม/สรุปที่ต้องคำนวณใหม่
  };
  A.sarMethod = (b) => {
    const s = S(), set = new Set(s.methods || []), v = b.dataset.v;
    set.has(v) ? set.delete(v) : set.add(v);
    s.methods = METHODS.filter((m) => set.has(m));
    save(); rerender();
  };
  A.sarPick = (b) => {
    const s = S(), f = b.dataset.f;
    s[f] = s[f] === b.dataset.v ? "" : b.dataset.v;
    save(); rerender();
  };
  A.sarDuty = (b) => {
    const rows = rowsOf("duties"), i = Number(b.dataset.i);
    if (!rows[i]) return;
    while (rows[i].length < 3) rows[i].push("");
    rows[i][1] = rows[i][1] === b.dataset.v ? "" : b.dataset.v;
    const s = S();
    (s.tables = s.tables || {}).duties = rowsText(rows);
    save(); rerender();
  };
  const form = (title, fields, apply) => openForm(title, fields, (r) => saveNow(() => apply(r)));
  A.sarOther = () => form("รูปแบบการสอนอื่น ๆ", [{ key: "v", label: "อื่น ๆ ระบุ", value: S().methodsOther || "", hint: "เว้นว่าง = ไม่ติ๊กข้อนี้" }],
    (r) => { S().methodsOther = r.v; });
  A.sarTable = (b) => {
    const key = b.dataset.key, t = TABLES[key];
    const cur = rowsOf(key);
    const one = t.cols.length === 1;
    form(t.title, [{
      key: "v", label: one ? "บรรทัดละ 1 รายการ" : `บรรทัดละ 1 แถว คั่นช่องด้วย |`, type: "textarea", rows: Math.min(14, Math.max(5, cur.length + 2)), value: rowsText(cur),
      hint: (one ? "" : `ลำดับช่อง: ${t.cols.join(" | ")}`) + (t.auto ? `<br>ลบข้อความทั้งหมดแล้วบันทึก = กลับไปใช้ข้อมูลจาก${esc(t.autoNote || "เมนูอื่น")}อัตโนมัติ` : ""),
    }], (r) => {
      const s = S();
      s.tables = s.tables || {};
      const text = rowsText(parseRows(r.v, t.cols.length));
      if (!text && t.auto) delete s.tables[key];
      else if (t.auto && text === rowsText(t.auto())) delete s.tables[key]; // เหมือนข้อมูลอัตโนมัติ ไม่ต้องเก็บ จะได้อัปเดตตามเมนู
      else s.tables[key] = text;
    });
  };
  A.sarInfo = () => {
    const c = C0(), s = S();
    form("1.1 ข้อมูลทั่วไป", [
      { key: "positionNo", label: "เลขที่ตำแหน่ง", value: c.positionNo || "" },
      { key: "birth", label: "วัน / เดือน / ปี เกิด", placeholder: "เช่น 28 / 04 / 2530", value: c.birth || "" },
      { key: "appointed", label: "วัน / เดือน / ปี บรรจุเข้ารับราชการ", placeholder: "เช่น 08 / 02 / 2556", value: c.appointed || "" },
      { key: "rank", label: "ตำแหน่งที่แสดงต่อท้าย (เช่น คศ.2)", value: s.rank ?? c.rank ?? "", hint: "แสดงต่อจาก \"ครู\" ในหน้าปกและช่องลงนาม" },
      { key: "age", label: "อายุ (ปี)", value: s.age || "", hint: "เว้นว่าง = คำนวณจากปีเกิด" },
      { key: "extraDuty", label: "ปฏิบัติงานพิเศษ", type: "textarea", rows: 2, value: s.extraDuty || "", hint: "เว้นว่าง = ใช้รายการในข้อ 1.2.4" },
      { key: "dutyDay", label: "ครูเวรประจำวัน", placeholder: "เช่น พฤหัสบดี", value: s.dutyDay || "" },
    ], (r) => {
      Object.assign(c, { positionNo: r.positionNo, birth: r.birth, appointed: r.appointed, rank: r.rank });
      Object.assign(s, { rank: r.rank, age: r.age, extraDuty: r.extraDuty, dutyDay: r.dutyDay });
    });
    setTimeout(() => {
      const box = $("#sheetFields");
      box?.insertAdjacentHTML("afterbegin", `<p class="ios-hint" style="padding:10px 16px">ชื่อ วิทยฐานะ วุฒิการศึกษา และกลุ่มสาระ แก้ได้ที่เมนูโปรไฟล์</p>`);
    }, 0);
  };
  A.sarCover = () => {
    const c = C0(), s = S();
    form("ปกและผู้ลงนาม", [
      { key: "logo", label: "ตราโรงเรียน", type: "file", category: "profile", store: "img", accept: "image/*", value: c.logo || "" },
      { key: "sig", label: "ลายเซ็นผู้รายงาน (รูปพื้นขาวหรือพื้นใส ไม่บังคับ)", type: "file", category: "profile", store: "img", accept: "image/*", value: c.sig || "" },
      { key: "addr", label: "ที่ตั้งโรงเรียน (ต่อท้ายชื่อโรงเรียนในหน้าปก)", placeholder: "เช่น อำเภอดอยเต่า จังหวัดเชียงใหม่", value: c.addr || "" },
      { key: "signDate", label: "วันที่ลงนาม", placeholder: `เช่น 31 มีนาคม ${Number(Y) + 1}`, value: s.signDate || "" },
      { key: "headName", label: "ผู้รับรองคนที่ 1 (ชื่อ)", value: s.headName ?? c.headName ?? "" },
      { key: "headPos", label: "ผู้รับรองคนที่ 1 (ตำแหน่ง)", value: s.headPos ?? c.headPos ?? "หัวหน้าฝ่ายวิชาการ" },
      { key: "dirName", label: "ผู้รับรองคนที่ 2 (ชื่อ)", value: s.dirName ?? c.dirName ?? "" },
      { key: "dirPos", label: "ผู้รับรองคนที่ 2 (ตำแหน่ง)", value: s.dirPos ?? c.dirPos ?? `ผู้อำนวยการ${school()}` },
    ], (r) => {
      Object.assign(c, { logo: r.logo, sig: r.sig, addr: r.addr, headName: r.headName, headPos: r.headPos, dirName: r.dirName, dirPos: r.dirPos });
      Object.assign(s, { signDate: r.signDate, headName: r.headName, headPos: r.headPos, dirName: r.dirName, dirPos: r.dirPos });
    });
  };
  A.sarIntro = () => {
    const c = C0();
    form("คำนำ", [{ key: "v", label: "ข้อความคำนำ (ขึ้นบรรทัดใหม่ = ย่อหน้าใหม่)", type: "textarea", rows: 12, value: c.intro || INTRO,
      hint: "ใช้ {ปี} {โรงเรียน} {สังกัด} แทนค่าให้อัตโนมัติ ปีหน้าไม่ต้องแก้ ลบทั้งหมด = ใช้ข้อความตั้งต้น" }],
    (r) => { c.intro = r.v.trim() === INTRO.trim() ? "" : r.v; delete S().intro; });
  };
  A.sarStd = (b) => {
    const no = b.dataset.no, s = S();
    const sn = ((s.stdNotes = s.stdNotes || {})[no] = s.stdNotes[no] || {});
    form(`มาตรฐานที่ ${no}`, [
      { key: "projects", label: "กิจกรรม/โครงการ/หลักฐานร่องรอยที่ดำเนินการ", type: "textarea", rows: 4, value: sn.projects || "", hint: "บรรทัดละ 1 รายการ" },
      { key: "strengths", label: "จุดเด่น", type: "textarea", rows: 4, value: sn.strengths || "", hint: "บรรทัดละ 1 ข้อ" },
      { key: "improve", label: "จุดควรพัฒนา", type: "textarea", rows: 3, value: sn.improve || "", hint: "บรรทัดละ 1 ข้อ" },
    ], (r) => Object.assign(sn, r));
  };
  A.sarSummary = () => {
    const s = S(), sm = s.summary || {}, lg = notes();
    form("ตอนที่ 4 บทสรุปและแนวทางการพัฒนา", [
      { key: "strengths", label: "จุดเด่น", type: "textarea", rows: 5, value: sm.strengths ?? lg.strengths ?? "", hint: "บรรทัดละ 1 ข้อ" },
      { key: "improve", label: "จุดที่ควรพัฒนา", type: "textarea", rows: 4, value: sm.improve ?? lg.improve ?? "", hint: "บรรทัดละ 1 ข้อ" },
      { key: "plan", label: "แนวทางการพัฒนาในปีการศึกษาถัดไป", type: "textarea", rows: 5, value: sm.plan ?? lg.plan ?? "", hint: "บรรทัดละ 1 ข้อ" },
      { key: "support", label: "ความต้องการการสนับสนุน (ไม่บังคับ)", type: "textarea", rows: 3, value: sm.support || "", hint: "เว้นว่าง = ไม่แสดงหัวข้อนี้" },
    ], (r) => { s.summary = r; });
  };
  A.sarAppendix = () => {
    const s = S(), ap = { certs: true, photos: true, qr: true, portfolio: true, ...(s.appendix || {}) };
    form("ภาคผนวก: เลือกสิ่งที่แสดง", [
      { key: "certs", label: "รูปเกียรติบัตรและรางวัลของปีนี้", type: "check", value: ap.certs },
      { key: "photos", label: "ภาพกิจกรรมจากอัลบั้มของปีนี้ (อัลบั้มละ 2 ภาพ)", type: "check", value: ap.photos },
      { key: "qr", label: "QR Code ลิงก์หลักฐาน เกียรติบัตรอบรม และผลงาน", type: "check", value: ap.qr },
      { key: "portfolio", label: "QR Code แฟ้มสะสมผลงานออนไลน์ในหน้าคั่นภาคผนวก", type: "check", value: ap.portfolio },
    ], (r) => { s.appendix = r; });
  };
  A.sarResults = () => {
    const s = S(), cur = s.results || {};
    form("ระดับสรุปผลการประเมินผู้เรียน", [
      { key: "competency", label: "สมรรถนะสำคัญของผู้เรียน", options: RESULT_LV, value: cur.competency || "ดี" },
      { key: "reading", label: "การอ่าน คิด วิเคราะห์และเขียน", options: RESULT_LV, value: cur.reading || "ดี" },
      { key: "traits", label: "คุณลักษณะอันพึงประสงค์", options: RESULT_LV, value: cur.traits || "ดี" },
    ], (r) => { s.results = r; });
  };
  A.sarCopy = async (b) => {
    const from = b.dataset.from;
    if (!confirm(`คัดลอกสิ่งที่กรอกและติ๊กไว้ในปี ${from} มาใช้กับปี ${Y} ใช่ไหม? (ข้อมูลที่ดึงจากเมนูอื่นจะเป็นของปี ${Y} อยู่แล้ว)`)) return;
    const src = JSON.parse(JSON.stringify(notes().years[from] || {}));
    // ตารางที่ผูกกับปี (อบรม รางวัล การสอน) ไม่คัดลอก ให้ดึงของปีใหม่
    for (const k of ["teach1", "teach2", "trainings", "awards", "judge", "speakers", "competency", "reading", "traits"]) delete src.tables?.[k];
    delete src.signDate; delete src.age;
    try { await saveNow(() => { notes().years[Y] = src; }); toast(`คัดลอกจากปี ${from} แล้ว`); render(); } catch (e) { toast(e.message); }
  };
})();
