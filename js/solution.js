// Hidden solution — never render this in UI chrome.
export const SOLUTION = {
  killer: 'james',
  motive: 'embezzlement',
  method: 'blunt',
  location: 'office',
  time: '2110',
  strongEvidence: [
    'ev-keycard',
    'ev-email-invite',
    'ev-financial-audit',
    'ev-bank-james',
    'ev-usb',
    'ev-burner-sms',
    'ev-witness-cleaner',
    'ev-victim-phone',
  ],
  redHerrings: [
    'ev-restaurant-receipt',
    'ev-cctv-sedan',
    'ev-phone-tower',
    'ev-pi-invoice',
  ],
  minStrongForS: 5,
  minStrongForA: 3,
  minBoardLinksForS: 4,
};

export function gradeAccusation(acc, evidenceIds, boardStats) {
  const strong = evidenceIds.filter((id) => SOLUTION.strongEvidence.includes(id));
  const correct =
    acc.who === SOLUTION.killer &&
    acc.motive === SOLUTION.motive &&
    acc.method === SOLUTION.method &&
    acc.location === SOLUTION.location &&
    acc.time === SOLUTION.time;

  if (acc.who !== SOLUTION.killer) {
    return {
      rank: 'F',
      title: 'จับผิดคน',
      summary:
        'คุณตั้งข้อหาผู้ต้องสงสัยผิด หลักฐานกายภาพไม่รองรับคำกล่าวหานี้ คดีถูกส่งให้กิจการภายในทบทวน',
      correct: false,
    };
  }

  if (!correct) {
    const issues = [];
    if (acc.motive !== SOLUTION.motive)
      issues.push('แรงจูงใจไม่ตรงกับปมการเงินในสำนวน');
    if (acc.method !== SOLUTION.method)
      issues.push('วิธีการไม่สอดคล้องกับรายงานนิติเวชและที่เกิดเหตุ');
    if (acc.location !== SOLUTION.location) issues.push('สถานที่ไม่ตรงกับที่เกิดเหตุ');
    if (acc.time !== SOLUTION.time)
      issues.push('กรอบเวลาอยู่นอกลำดับกล้อง/เวลาตายที่รองรับ');
    return {
      rank: 'C',
      title: 'สำนวนไม่ครบ',
      summary: `ผู้ต้องสงสัยถูก แต่ ${issues.join(' และ ')} อัยการจะไม่รับคดีในสภาพนี้`,
      correct: false,
    };
  }

  const strongCount = strong.length;
  const links = boardStats.links || 0;

  if (strongCount >= SOLUTION.minStrongForS && links >= SOLUTION.minBoardLinksForS) {
    return {
      rank: 'S',
      title: 'สืบสวนสมบูรณ์แบบ',
      summary:
        'ผู้ต้องสงสัย แรงจูงใจ วิธีการ สถานที่ และเวลา ล้วนต่อกันได้ เส้นบนกระดานแสดงว่าคุณร้อยเรียงคดี ไม่ใช่เดาสุ่ม ปิดคดีได้',
      correct: true,
    };
  }
  if (strongCount >= SOLUTION.minStrongForA) {
    return {
      rank: 'A',
      title: 'สำนวนแข็ง',
      summary:
        'ทฤษฎีหลักถูกต้องและมีหลักฐานหลายทางสนับสนุน เส้นใยยังหลุดบ้าง แต่อัยการจะเดินหน้าต่อ',
      correct: true,
    };
  }
  return {
    rank: 'B',
    title: 'ถูกคน สำนวนบาง',
    summary:
      'คุณชื่อคนถูกและทฤษฎีถูก แต่แฟ้มหลักฐานบางเกินไป ฝ่ายจำเลยจะเจาะช่องว่าง คาดว่าต้องยอมความ ไม่ใช่ปิดคดีสะอาด',
    correct: true,
  };
}
