/*!
 * جداول التقاعد الاختياري — app.js
 * النسخة 4.0 | إصلاحات وتحسينات شاملة
 */
(function () {
'use strict';

/* ─────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────── */
const QR_LINK = 'https://linktr.ee/Daman2026';
const QR_B64  = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAARCAIAAgADASIAAhEBAxEB/8QAGwABAQEBAQEBAQAAAAAAAAAAAAkIBwoGBQT/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AqqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9k=';

const SAL = {
  1:350000,  2:455000,  3:560000,  4:665000,  5:770000,
  6:875000,  7:980000,  8:1085000, 9:1190000, 10:1295000,
  11:1400000,12:1505000,13:1610000,14:1715000, 15:1750000
};
const PLAN_ACCENT  = ['ac1','ac2','ac3','ac4','ac5'];
const PLAN_ICON_C  = ['ic1','ic2','ic3','ic4','ic5'];
const PLAN_EMOJI   = ['🎯','📅','💰','⏰','👩‍💼'];
const PLAN_COLOR_H = ['#2a5298','#1e5c3a','#c9993a','#8b2248','#50307a'];
const COLORS       = PLAN_COLOR_H;

/* ─────────────────────────────────────────────────────
   STATE
───────────────────────────────────────────────────── */
let PLANS = [], USER = null;
let FIXED_CAT_FOR_AVG = null;
let TARGET_CAT_FOR_LAST5 = null;

/* ─────────────────────────────────────────────────────
   RETIREMENT RULES
───────────────────────────────────────────────────── */
function reqYears(g, a) {
  if (g === 'male') {
    if (a >= 50 && a <= 59) return 30;
    if (a >= 60 && a <= 62) return 20;
    if (a >= 63) return 15;
  } else {
    if (a >= 50 && a <= 54) return 25;
    if (a >= 55 && a <= 57) return 20;
    if (a >= 58) return 15;
  }
  return 15;
}

/* ─────────────────────────────────────────────────────
   DATE UTILS
───────────────────────────────────────────────────── */
function ageDiff(birth, from) {
  let y = from.getFullYear() - birth.getFullYear();
  let m = from.getMonth() - birth.getMonth();
  let d = from.getDate()  - birth.getDate();
  if (d < 0) { m--; d += new Date(from.getFullYear(), from.getMonth(), 0).getDate(); }
  if (m < 0) { y--; m += 12; }
  return { years: y, months: m, days: d };
}

function monthsBetween(a, b) {
  // المادة 35: كسر الشهر الأخير يُعدّ شهراً كاملاً
  let t = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  if (b.getDate() < a.getDate()) t--;
  else if (b.getDate() > a.getDate()) t++; // كسر شهر → يُكمَّل
  return Math.max(0, t);
}

function dateAtAge(birth, age) {
  let d = new Date(birth);
  d.setFullYear(d.getFullYear() + age);
  return d;
}

function fmtDate(d) {
  return d.toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric' });
}

/* ─────────────────────────────────────────────────────
   CATEGORY PLAN BUILDER
───────────────────────────────────────────────────── */
function idealStartCat(sa, ta) {
  let g = (ta - sa) - 5;
  if (g <= 0) return 1;
  return Math.min(Math.max(15 - g, 1), 15);
}

function buildCatPlan(sa, ta, sc, targetCat) {
  sa = Math.min(Math.max(sa, 0), 100);
  ta = Math.min(Math.max(ta, sa), 100);
  if (ta - sa > 60) ta = sa + 60;

  const TC = (targetCat && targetCat >= 1 && targetCat <= 15)
    ? Math.max(targetCat, sc) : 15;

  let rows = [];
  for (let a = sa; a <= ta; a++) rows.push({ age: a, cat: null });
  const total      = rows.length;
  const last5Start = Math.max(total - 5, 0);
  const yearsB5    = last5Start;
  const maxReach   = Math.min(TC, sc + yearsB5);

  if (sc >= TC) {
    rows.forEach(r => r.cat = TC);
  } else if (yearsB5 === 0) {
    let cat = sc;
    for (let i = 0; i < total; i++) {
      rows[i].cat = Math.min(TC, cat);
      if (i < total - 1) cat = Math.min(TC, cat + 1);
    }
  } else if (yearsB5 >= (TC - sc)) {
    let rem = yearsB5 - (TC - sc);
    for (let i = 0; i < total; i++) {
      if      (i < rem)         rows[i].cat = sc;
      else if (i < last5Start)  rows[i].cat = Math.min(TC, sc + (i - rem));
      else                      rows[i].cat = TC;
    }
  } else {
    let cat = sc;
    for (let i = 0; i < total; i++) {
      if (i < last5Start) { rows[i].cat = Math.min(TC, cat); cat = Math.min(TC, cat + 1); }
      else                  rows[i].cat = maxReach;
    }
  }

  for (let i = 1; i < total; i++) {
    if (rows[i].cat - rows[i-1].cat > 1) rows[i].cat = rows[i-1].cat + 1;
    if (rows[i].cat > 15) rows[i].cat = 15;
    if (rows[i].cat < 1)  rows[i].cat = 1;
  }
  return rows;
}

/* ─────────────────────────────────────────────────────
   PENSION
───────────────────────────────────────────────────── */
function avgLast5(plan) {
  if (!plan.length) return 350000;
  const last = plan.slice(-5);
  return last.reduce((a, r) => a + SAL[r.cat], 0) / last.length;
}

function calcPension(avg, mo) {
  // المادة 35: متوسط الأجر × 2.5% × أشهر الخدمة ÷ 12
  let p = avg * 0.025 * mo / 12;
  p = Math.min(p, avg * 0.8);  // الحد الأقصى 80%
  p = Math.max(p, 350000);      // الحد الأدنى 350,000
  return p;
}

/* ─────────────────────────────────────────────────────
   PLAN BUILDERS
───────────────────────────────────────────────────── */
function mkResult(svc, birth, sa, ta, buy, useUC, uc, joinDate) {
  let fc   = useUC ? Math.min(Math.max(uc, 1), 15) : idealStartCat(sa, ta);
  let plan = buildCatPlan(sa, ta, fc, TARGET_CAT_FOR_LAST5);
  let retDate = dateAtAge(birth, ta);
  let tot;
  if (joinDate) {
    tot = Math.max(0, monthsBetween(joinDate, retDate)) + svc;
  } else {
    tot = svc + Math.max(0, monthsBetween(new Date(), retDate));
  }
  tot += buy;
  let avg = avgLast5(plan);
  return {
    targetAge: ta, purchaseMonths: buy, yearsPlan: plan,
    totalServiceMonths: tot, pension: calcPension(avg, tot),
    purchaseCost: avg * 0.17 * buy, avg, retireDate: retDate
  };
}

function planA(svc, birth, sa, useUC, uc, g, joinDate) {
  function totalAt(age) {
    const retDate = dateAtAge(birth, age);
    if (joinDate) return Math.max(0, monthsBetween(joinDate, retDate)) + svc;
    return svc + Math.max(0, monthsBetween(new Date(), retDate));
  }
  let best = null, buy = 0, ss = Math.min(Math.max(50, sa), 70);
  for (let age = ss; age <= 70; age++) {
    let req = reqYears(g, age) * 12;
    let tot = totalAt(age);
    if (tot >= req)       { best = age; buy = 0;       break; }
    if (req - tot <= 60)  { best = age; buy = req-tot; break; }
  }
  if (!best) { best = 70; buy = Math.min(Math.max(reqYears(g,70)*12 - totalAt(70), 0), 60); }
  return mkResult(svc, birth, sa, best, buy, useUC, uc, joinDate);
}

function planB(svc, birth, sa, useUC, uc, g, joinDate) {
  function totalAt(age) {
    const retDate = dateAtAge(birth, age);
    if (joinDate) return Math.max(0, monthsBetween(joinDate, retDate)) + svc;
    return svc + Math.max(0, monthsBetween(new Date(), retDate));
  }
  let best = null, ss = Math.min(Math.max(50, sa), 70);
  for (let age = ss; age <= 70; age++) {
    let req = reqYears(g, age) * 12;
    if (totalAt(age) >= req) { best = age; break; }
  }
  if (!best) best = 70;
  return mkResult(svc, birth, sa, best, 0, useUC, uc, joinDate);
}

function planC(svc, birth, sa, useUC, uc, joinDate) {
  const TGT = 384; // 32 سنة × 12
  function totalAt(age) {
    const retDate = dateAtAge(birth, age);
    if (joinDate) return Math.max(0, monthsBetween(joinDate, retDate)) + svc;
    return svc + Math.max(0, monthsBetween(new Date(), retDate));
  }
  let target = sa, found = false;
  for (let age = sa; age <= 70; age++) {
    if (totalAt(age) >= TGT) { target = age; found = true; break; }
  }
  if (!found) target = 70;
  let r = mkResult(svc, birth, sa, target, 0, useUC, uc, joinDate);
  r.totalServiceMonths = Math.min(r.totalServiceMonths, TGT);
  r.pension = calcPension(r.avg, r.totalServiceMonths);
  return r;
}

function planFixed(svc, birth, sa, useUC, uc, g, ta, joinDate) {
  if (sa >= ta) return planB(svc, birth, sa, useUC, uc, g, joinDate);
  const retDate = dateAtAge(birth, ta);
  let before;
  if (joinDate) { before = Math.max(0, monthsBetween(joinDate, retDate)) + svc; }
  else          { before = svc + Math.max(0, monthsBetween(new Date(), retDate)); }
  let req = reqYears(g, ta) * 12;
  let buy = before < req ? Math.min(req - before, 60) : 0;
  return mkResult(svc, birth, sa, ta, buy, useUC, uc, joinDate);
}

/* ─────────────────────────────────────────────────────
   FORMAT HELPERS
───────────────────────────────────────────────────── */
function N(n)  { return Math.round(n).toLocaleString('ar-IQ'); }
function FM(m) {
  let y = Math.floor(m / 12), mo = m % 12;
  if (!y)  return `${mo} شهر`;
  if (!mo) return `${y} سنة`;
  return `${y} سنة و${mo} شهر`;
}

/* ─────────────────────────────────────────────────────
   COPY
───────────────────────────────────────────────────── */
function copyPlanText(plan, user, idx) {
  const f   = user.gender === 'female';
  const act = plan.totalServiceMonths - plan.purchaseMonths;
  const aY  = Math.floor(act / 12), aM = act % 12;
  const pY  = Math.floor(plan.purchaseMonths / 12), pM = plan.purchaseMonths % 12;
  const tY  = Math.floor(plan.totalServiceMonths / 12), tM = plan.totalServiceMonths % 12;
  let t = `\n(الجدول ${idx})\n\n${plan.title} - ${plan.desc}\n\n`;
  t += `${f?'عمركِ':'عمرك'} اليوم: ${user.ay} سنة و${user.am} أشهر و${user.ad} أيام.\n`;
  if (user.jat && user.jat !== 'لم يدخل') t += `${f?'عمركِ':'عمرك'} عند الانتساب: ${user.jat}.\n`;
  const ttY = Math.floor(user.ts / 12), ttM = user.ts % 12;
  if (user.py > 0 || user.pm > 0) t += `${f?'لديكِ':'لديك'} خدمة سابقة: ${user.py} سنة و${user.pm} شهر، `;
  t += `إجمالي ${f?'خدمتكِ':'خدمتك'} الحالية: ${ttY} سنة و${ttM} شهر.\n\nالتسلسل:\n\n`;
  plan.yearsPlan.forEach(r => t += `بعمر ${r.age} سنة و${user.sm||0} شهر ← الفئة ${r.cat}\n`);
  t += `\n🔹 خدمة فعلية: ${aY} سنة و${aM} شهر.\n`;
  if (plan.purchaseMonths > 0)
    t += `🔹 تحتاج شراء ${pY} سنة و${pM} شهر، ليصبح المجموع ${tY} سنة و${tM} شهر.\n`;
  else t += `🔹 إجمالي الخدمة: ${tY} سنة و${tM} شهر.\n`;
  t += `🔹 الراتب التقاعدي: ${Math.round(plan.pension).toLocaleString()} دينار.\n\n`;
  if (plan.purchaseMonths > 0) {
    t += `سعر السنة (شراء): ${Math.round(plan.avg*0.17*12).toLocaleString()} دينار.\n`;
    t += `إجمالي مبلغ الشراء: ${Math.round(plan.purchaseCost).toLocaleString()} دينار.\n`;
  }
  return t;
}

function copyPlan(plan, user, idx) {
  const t  = copyPlanText(plan, user, idx);
  const fb = () => {
    let ta = document.createElement('textarea');
    ta.value = t; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(t).then(() => {}).catch(fb);
  else fb();
}

/* ─────────────────────────────────────────────────────
   PDF EXPORT
───────────────────────────────────────────────────── */
function exportPDF() { exportPDFPlans(PLANS); }

function exportPDFPlans(chosenPlans) {
  if (!chosenPlans || !chosenPlans.length || !USER) return;

  const nm     = USER.nm || 'مشترك';
  const gender = USER.gender === 'male' ? 'ذكر' : 'أنثى';
  const today  = new Date().toLocaleDateString('ar-IQ',{year:'numeric',month:'long',day:'numeric'});
  const priorStr = (USER.py > 0 || USER.pm > 0) ? FM(USER.py*12 + USER.pm) : 'لا يوجد';

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Tajawal',sans-serif;direction:rtl;text-align:right;color:#1a1208;background:#fff;font-size:12px;line-height:1.6}
    .cover{background:linear-gradient(160deg,#060e1c 0%,#162c52 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;padding:40px 30px;min-height:100vh}
    .cover-logo{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#96720a,#e0bc6e);display:flex;align-items:center;justify-content:center;font-size:36px;margin-bottom:24px;box-shadow:0 0 0 4px rgba(201,153,58,.3),0 8px 24px rgba(0,0,0,.4)}
    .cover h1{font-family:'Amiri',serif;font-size:28px;color:#e0bc6e;margin-bottom:8px;text-align:center}
    .cover p{color:#b0c4de;font-size:13px;text-align:center}
    .cover-divider{width:200px;height:2px;background:linear-gradient(90deg,transparent,#c9993a,transparent);margin:20px 0}
    .cover-card{background:rgba(255,255,255,.08);border:1px solid rgba(201,153,58,.3);border-radius:12px;padding:20px 28px;width:100%;max-width:420px;margin-bottom:20px}
    .cover-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.08);font-size:13px}
    .cover-row:last-child{border-bottom:none}
    .lbl{color:#8fb3d9;font-size:11px;font-weight:600}
    .val{color:#f0e6c8;font-weight:700}
    .cover-plans{width:100%;max-width:420px}
    .cover-plan-row{display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.07);font-size:12px;color:#d0e4f7}
    .plan-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0}
    .plans-wrapper{padding:0}
    .plan-hdr-bar{padding:12px 18px;display:flex;align-items:center;justify-content:space-between;color:#fff}
    .plan-hdr-bar h2{font-family:'Amiri',serif;font-size:18px;font-weight:700}
    .plan-num-badge{font-size:11px;background:rgba(255,255,255,.15);padding:4px 12px;border-radius:20px}
    .emp-bar{display:flex;flex-wrap:wrap;background:#f0f4fa;border-bottom:1px solid #dde4f0;padding:8px 14px;gap:16px}
    .emp-cell{display:flex;flex-direction:column;gap:1px}
    .emp-lbl{font-size:9px;color:#7a8aaa;text-transform:uppercase;letter-spacing:.05em;font-weight:700}
    .emp-val{font-size:12px;color:#0a1628;font-weight:700}
    .stats-row{display:flex;flex-wrap:wrap;border-bottom:1px solid #eee}
    .stat-box{flex:1;min-width:80px;padding:10px 12px;text-align:center;border-left:1px solid #eee}
    .stat-box:last-child{border-left:none}
    .sl{font-size:9px;color:#7a8aaa;text-transform:uppercase;letter-spacing:.04em;font-weight:700;margin-bottom:3px}
    .sv{font-size:14px;font-weight:900;color:#0a1628;font-family:'Amiri',serif}
    .sv-good{color:#1e5c3a}.sv-warn{color:#b86800}.sv-bad{color:#7b1c1c}
    .details-grid{padding:10px 16px;margin-bottom:10px}
    .detail-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dashed rgba(10,22,40,.07);font-size:11px}
    .detail-row:last-child{border-bottom:none}
    .dk{color:#7a6e5f;font-weight:500}.dv{font-weight:700;color:#0a1628}
    .dv-g{color:#1e5c3a}.dv-r{color:#7b1c1c}.dv-a{color:#b86800}
    .rpill{display:flex;gap:6px;background:#fff6e0;border:1px solid rgba(184,104,0,.22);border-radius:6px;padding:6px 12px;font-size:10.5px;font-weight:600;color:#b86800;margin:0 16px 10px;align-items:center}
    .tbl-title{font-size:11px;font-weight:800;color:#162c52;text-transform:uppercase;letter-spacing:.06em;padding:0 16px;margin-bottom:6px}
    table{width:100%;border-collapse:collapse;font-size:11px}
    th{background:linear-gradient(135deg,#0a1628,#1e4080);color:#f7f3eb;font-weight:700;font-size:9.5px;padding:7px 12px;text-align:center}
    td{padding:5px 12px;text-align:center;border-bottom:1px solid rgba(10,22,40,.06)}
    tr.r5  td{background:#fff9e0;font-weight:600}
    tr.rret td{background:#e4f7ec;color:#1e5c3a;font-weight:900}
    tr:nth-child(even) td{background:rgba(10,22,40,.018)}
    tr.r5:nth-child(even) td, tr.rret:nth-child(even) td{background:unset}
    .plan-separator{border:none;border-top:2px dashed #dde4f0;margin:20px 16px}
    .plan-page{padding-bottom:20px}
    .page-footer{text-align:center;padding:16px;font-size:9.5px;color:#9a8e7f;border-top:1px solid #eee;margin-top:14px}
    @media print{
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .cover{min-height:initial;page-break-after:always}
      .plan-page{page-break-inside:avoid}
      @page{margin:12mm 10mm}
    }
  `;

  let body = `<div class="cover">
    <div class="cover-logo">🏛️</div>
    <h1>جداول التقاعد الاختياري</h1>
    <p>جداول تقاعدية محسوبة وفق نظام التقاعد الاختياري</p>
    <div class="cover-divider"></div>
    <div class="cover-card">
      <div class="cover-row"><span class="lbl">الاسم</span><span class="val">${nm}</span></div>
      <div class="cover-row"><span class="lbl">الجنس</span><span class="val">${gender}</span></div>
      <div class="cover-row"><span class="lbl">العمر الحالي</span><span class="val">${USER.ay} سنة و${USER.am} شهر</span></div>
      <div class="cover-row"><span class="lbl">إجمالي الخدمة الحالية</span><span class="val">${FM(USER.ts)}</span></div>
      <div class="cover-row"><span class="lbl">الخدمة السابقة</span><span class="val">${priorStr}</span></div>
      <div class="cover-row"><span class="lbl">عدد الخطط</span><span class="val">${chosenPlans.length} ${chosenPlans.length === 1 ? 'خطة' : 'خطط'}</span></div>
      <div class="cover-row"><span class="lbl">تاريخ التقرير</span><span class="val">${today}</span></div>
    </div>
    <div class="cover-plans">
      ${chosenPlans.map((p,i)=>`
        <div class="cover-plan-row">
          <div class="plan-dot" style="background:${COLORS[i]||'#2a5298'}"></div>
          <span>${p.title} — ${p.desc}</span>
          <span style="margin-right:auto;color:#e0bc6e;font-weight:700">${N(p.pension)} د.ع</span>
        </div>`).join('')}
    </div>
    <div style="margin-top:20px;text-align:center">
      <img src="data:image/jpeg;base64,${QR_B64}"
           style="width:100px;height:100px;border:3px solid rgba(201,153,58,.5);border-radius:10px;padding:4px;background:rgba(255,255,255,.1)"
           alt="QR Code"/>
      <p style="color:#e0bc6e;font-size:11px;margin-top:8px;font-weight:600">امسح الكود للتواصل | linktr.ee/Daman2026</p>
    </div>
  </div>
  <div class="plans-wrapper">`;

  chosenPlans.forEach((plan, pi) => {
    const color  = COLORS[pi] || '#2a5298';
    const hasBuy = plan.purchaseMonths > 0;
    const actual = plan.totalServiceMonths - plan.purchaseMonths;
    const future = Math.max(0, actual - USER.ts);
    const lastIdx= plan.yearsPlan.length - 1;
    let tRows = '';
    plan.yearsPlan.forEach((r,i) => {
      const is5  = i >= plan.yearsPlan.length - 5;
      const isRet= i === lastIdx;
      const cls  = isRet ? 'rret' : (is5 ? 'r5' : '');
      tRows += `<tr class="${cls}"><td>${r.age} سنة</td><td>فئة ${r.cat}</td></tr>`;
    });
    const sep = pi > 0 ? '<hr class="plan-separator">' : '';

    // حساب معلومة الحد
    const rawP = plan.avg * 0.025 * plan.totalServiceMonths / 12;
    const afterCap = Math.min(rawP, plan.avg * 0.8);
    const capNote  = afterCap < 350000
      ? ' — طُبِّق الحد الأدنى 350,000 د.ع (م.36)'
      : (rawP > plan.avg * 0.8 ? ' — طُبِّق الحد الأقصى 80% (م.36)' : '');

    body += `${sep}
    <div class="plan-page">
      <div class="plan-hdr-bar" style="background:${color}">
        <h2>${plan.title}</h2>
        <div class="plan-num-badge">${plan.desc}</div>
      </div>
      <div class="emp-bar">
        <div class="emp-cell"><div class="emp-lbl">المشترك</div><div class="emp-val">${nm}</div></div>
        <div class="emp-cell"><div class="emp-lbl">الجنس</div><div class="emp-val">${gender}</div></div>
        <div class="emp-cell"><div class="emp-lbl">العمر</div><div class="emp-val">${USER.ay} سنة ${USER.am} شهر</div></div>
        <div class="emp-cell"><div class="emp-lbl">الخدمة الحالية</div><div class="emp-val">${FM(USER.ts)}</div></div>
        ${(USER.py>0||USER.pm>0)?`<div class="emp-cell"><div class="emp-lbl">الخدمة السابقة</div><div class="emp-val">${priorStr}</div></div>`:''}
      </div>
      <div class="stats-row">
        <div class="stat-box" style="border-color:${color}20"><div class="sl">سن التقاعد</div><div class="sv">${plan.targetAge} سنة</div></div>
        <div class="stat-box" style="border-color:${color}20"><div class="sl">مدة الخدمة</div><div class="sv">${FM(plan.totalServiceMonths)}</div></div>
        <div class="stat-box" style="background:#e4f7ec;border-color:#1e5c3a40"><div class="sl">الراتب الشهري</div><div class="sv sv-good">${N(plan.pension)} د.ع</div></div>
        ${hasBuy?`
        <div class="stat-box" style="background:#fff8e6;border-color:#b8680040"><div class="sl">أشهر الشراء</div><div class="sv sv-warn">${plan.purchaseMonths} شهر</div></div>
        <div class="stat-box" style="background:#fdf0f0;border-color:#7b1c1c40"><div class="sl">تكلفة الشراء</div><div class="sv sv-bad">${N(plan.purchaseCost)} د.ع</div></div>`:''}
      </div>
      <div class="details-grid">
        <div class="detail-row"><span class="dk">📅 تاريخ التقاعد المتوقع</span><span class="dv">${fmtDate(plan.retireDate)}</span></div>
        <div class="detail-row"><span class="dk">⏱️ خدمة فعلية</span><span class="dv">${FM(actual)}</span></div>
        ${future>0?`<div class="detail-row"><span class="dk">🔮 خدمة مستقبلية</span><span class="dv">${FM(future)}</span></div>`:''}
        ${hasBuy?`<div class="detail-row"><span class="dk">🛒 أشهر الشراء</span><span class="dv dv-a">${plan.purchaseMonths} شهر — ${FM(plan.purchaseMonths)}</span></div>`:''}
        <div class="detail-row"><span class="dk">📋 إجمالي الخدمة</span><span class="dv">${FM(plan.totalServiceMonths)}</span></div>
        <div class="detail-row"><span class="dk">💵 متوسط آخر 5 سنوات</span><span class="dv">${N(plan.avg)} د.ع</span></div>
        <div class="detail-row">
          <span class="dk">💰 الراتب التقاعدي الشهري</span>
          <span class="dv dv-g">
            ${N(plan.pension)} د.ع
            <span style="font-size:8px;color:#1e5c3a;font-weight:400;display:block;margin-top:2px">
              ${N(plan.avg)} × 2.5% × ${plan.totalServiceMonths} شهر ÷ 12${capNote}
            </span>
          </span>
        </div>
        ${hasBuy?`
        <div class="detail-row"><span class="dk">💸 سعر الشهر الواحد</span><span class="dv">${N(plan.avg*0.17)} د.ع</span></div>
        <div class="detail-row"><span class="dk">💸 سعر السنة الواحدة</span><span class="dv">${N(plan.avg*0.17*12)} د.ع</span></div>
        <div class="detail-row"><span class="dk">💸 إجمالي مبلغ الشراء</span><span class="dv dv-r">${N(plan.purchaseCost)} د.ع</span></div>`:''}
      </div>
      <div class="rpill">⚠️ يستحق الراتب عند <strong>إكمال</strong> سن ${plan.targetAge} وليس عند مجرد بلوغه</div>
      <div class="tbl-title">📊 جدول تدرج الفئات الوظيفية</div>
      <table><thead><tr><th>السن</th><th>الفئة</th></tr></thead><tbody>${tRows}</tbody></table>
      <div class="page-footer">
        نظام جداول التقاعد الاختياري — ${today}<br/>
        <a href="${QR_LINK}" style="color:#c9993a;font-weight:700;text-decoration:none">${QR_LINK}</a>
      </div>
    </div>`;
  });
  body += '</div>';

  const fullHTML = `<!DOCTYPE html><html lang="ar" dir="rtl">
<head><meta charset="UTF-8"><title>تقاعد - ${nm}</title><style>${css}</style></head>
<body>${body}</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { showToast('❌ يرجى السماح بفتح النوافذ المنبثقة'); return; }
  win.document.write(fullHTML);
  win.document.close();
  win.onload = () => setTimeout(() => { win.focus(); win.print(); }, 1400);
  showToast('✅ جاري فتح ملف PDF...');
}

/* ─────────────────────────────────────────────────────
   RENDER HTML
───────────────────────────────────────────────────── */
function buildSummary(nm, g, age, jat, ts, hasJoin) {
  const items = [
    { l:'الاسم',         v: nm || '—' },
    { l:'الجنس',         v: g === 'male' ? 'ذكر' : 'أنثى' },
    { l:'العمر الحالي',  v: `${age.years} سنة و${age.months} شهر` },
    { l:'إجمالي الخدمة', v: FM(ts) },
  ];
  if (hasJoin) items.push({ l:'عمر الانتساب', v: jat });
  if (!hasJoin && USER && USER.saDisplay) items.push({ l:'عمر بدء الخدمة (تقريبي)', v: USER.saDisplay });
  return `<div class="sum-bar">
    <div class="sum-bar-title">📊 ملخص بيانات المشترك</div>
    <div class="sum-items">
      ${items.map(it=>`<div class="sum-item"><div class="si-l">${it.l}</div><div class="si-v">${it.v}</div></div>`).join('')}
    </div>
  </div>`;
}

function buildCard(plan, ci, nm, g, age, prevMo) {
  const ac = PLAN_ACCENT[ci] || 'ac1';
  const ic = PLAN_ICON_C[ci] || 'ic1';
  const em = PLAN_EMOJI[ci]  || '📋';
  const n  = ci + 1;
  const hasBuy = plan.purchaseMonths > 0;
  const actual = plan.totalServiceMonths - plan.purchaseMonths;
  const future = Math.max(0, actual - USER.ts);

  let tbody = '';
  const last = plan.yearsPlan.length - 1;
  plan.yearsPlan.forEach((r, i) => {
    const is5   = i >= plan.yearsPlan.length - 5;
    const isRet = i === last;
    const cls   = isRet ? 'rret' : (is5 ? 'r5' : '');
    const cp    = `<span class="cpill${r.cat===15?' c15':''}">${r.cat}</span>`;
    tbody += `<tr class="${cls}"><td>${r.age} سنة</td><td>${cp}</td></tr>`;
  });

  // حساب ملاحظة الحد
  const rawP = plan.avg * 0.025 * plan.totalServiceMonths / 12;
  const afterCap = Math.min(rawP, plan.avg * 0.8);
  const capNote  = afterCap < 350000
    ? ' — <span style="color:var(--amber)">طُبِّق الحد الأدنى 350,000 د.ع (م.36)</span>'
    : (rawP > plan.avg*0.8 ? ' — <span style="color:var(--amber)">طُبِّق الحد الأقصى 80% (م.36)</span>' : '');

  return `
  <div class="plan-card ${ac}" id="plan-card-${n}">
    <div class="plan-hdr">
      <div class="plan-hdr-l">
        <div class="plan-icon ${ic}">${em}</div>
        <div>
          <div class="plan-seq">الخطة ${n}</div>
          <div class="plan-name">${plan.title}</div>
          <div class="plan-desc">${plan.desc}</div>
        </div>
      </div>
      <button class="copy-btn no-print" data-i="${n}">📋 نسخ</button>
    </div>
    <div class="plan-stats">
      <div class="pst">
        <div class="pst-l">سن التقاعد</div>
        <div class="pst-v">${plan.targetAge}</div>
        <div class="pst-s">سنة · ${plan.retireDate.getFullYear()}</div>
      </div>
      <div class="pst">
        <div class="pst-l">مدة الخدمة</div>
        <div class="pst-v">${Math.floor(plan.totalServiceMonths/12)}</div>
        <div class="pst-s">سنة و${plan.totalServiceMonths%12} شهر</div>
      </div>
      <div class="pst">
        <div class="pst-l">الراتب التقاعدي</div>
        <div class="pst-v g">${N(plan.pension)}</div>
        <div class="pst-s">د.ع / شهرياً</div>
      </div>
      ${hasBuy?`
      <div class="pst"><div class="pst-l">أشهر الشراء</div><div class="pst-v w">${plan.purchaseMonths}</div><div class="pst-s">شهر</div></div>
      <div class="pst"><div class="pst-l">تكلفة الشراء</div><div class="pst-v b">${N(plan.purchaseCost)}</div><div class="pst-s">دينار</div></div>`:''}
    </div>
    <div class="plan-body">
      <div class="plan-user-row">
        <span>👤 <b>${nm||'—'}</b></span>
        <span>🎂 <b>${age.years} سنة و${age.months} شهر</b></span>
        <span>⏳ خدمة حالية: <b>${FM(USER.ts)}</b></span>
        ${prevMo>0?`<span>🗂️ خدمة سابقة: <b>${FM(prevMo)}</b></span>`:''}
      </div>
      <div class="drows">
        <div class="dr"><span class="dk">📅 تاريخ التقاعد المتوقع</span><span class="dv">${fmtDate(plan.retireDate)}</span></div>
        <div class="dr"><span class="dk">⏱️ خدمة فعلية</span><span class="dv">${FM(actual)}</span></div>
        ${future>0?`<div class="dr"><span class="dk">🔮 خدمة مستقبلية</span><span class="dv">${FM(future)}</span></div>`:''}
        ${hasBuy?`<div class="dr"><span class="dk">🛒 أشهر الشراء المطلوبة</span><span class="dv w">${plan.purchaseMonths} شهر — ${FM(plan.purchaseMonths)}</span></div>`:''}
        <div class="dr"><span class="dk">📋 إجمالي الخدمة المحسوبة</span><span class="dv">${FM(plan.totalServiceMonths)}</span></div>
        <div class="dr">
          <span class="dk">💵 متوسط الأجر (آخر 5 سنوات)</span>
          <span class="dv">
            ${N(plan.avg)} د.ع
            <span style="font-size:.69rem;color:var(--muted);font-weight:400;display:block;margin-top:2px">
              ${TARGET_CAT_FOR_LAST5
                ? `مستقر على الفئة ${TARGET_CAT_FOR_LAST5} — ${N(SAL[TARGET_CAT_FOR_LAST5])} د.ع`
                : plan.yearsPlan.slice(-5).map(r=>`ف${r.cat}:${N(SAL[r.cat])}`).join(' + ')}
            </span>
          </span>
        </div>
        <div class="dr">
          <span class="dk">💰 الراتب التقاعدي الشهري</span>
          <span class="dv g">
            ${N(plan.pension)} د.ع
            <span style="font-size:.68rem;color:var(--green-md);font-weight:400;display:block;margin-top:2px;opacity:.9">
              ${N(plan.avg)} × 2.5% × ${plan.totalServiceMonths} شهر ÷ 12${capNote}
            </span>
          </span>
        </div>
        ${hasBuy?`
        <div class="dr"><span class="dk">💸 سعر الشهر الواحد (شراء)</span><span class="dv">${N(plan.avg*0.17)} د.ع</span></div>
        <div class="dr"><span class="dk">💸 سعر السنة الواحدة (شراء)</span><span class="dv">${N(plan.avg*0.17*12)} د.ع</span></div>
        <div class="dr"><span class="dk">💸 إجمالي مبلغ الشراء</span><span class="dv b">${N(plan.purchaseCost)} د.ع</span></div>`:''}
      </div>
      <div class="rpill">⚠️ يستحق الراتب عند <b style="margin:0 3px">إكمال</b> سن ${plan.targetAge} وليس عند مجرد بلوغه</div>
      <div>
        <div class="tbl-head">
          <h4>📊 جدول تدرج الفئات الوظيفية</h4>
          <div class="tleg">
            <div class="tleg-i"><div class="tdot ldy"></div>آخر 5 سنوات</div>
            <div class="tleg-i"><div class="tdot ldg"></div>سنة التقاعد</div>
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="ctbl">
            <thead><tr><th>السن</th><th>الفئة</th></tr></thead>
            <tbody>${tbody}</tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`;
}

/* ─────────────────────────────────────────────────────
   GENERATE
───────────────────────────────────────────────────── */
function clearFieldErrors() {
  document.querySelectorAll('.ctrl.field-error').forEach(el => el.classList.remove('field-error'));
}
function markError(el) {
  el.classList.add('field-error');
  el.addEventListener('change', () => el.classList.remove('field-error'), { once: true });
}

function generate() {
  try {
    clearFieldErrors();
    let hasError = false;

    const gEl = document.getElementById('genderSelect');
    const g   = gEl.value;
    if (!g) { markError(gEl); hasError = true; }

    const bDEl = document.getElementById('birthDay');
    const bMEl = document.getElementById('birthMonth');
    const bYEl = document.getElementById('birthYear');
    const bD = +bDEl.value, bM = bMEl.value, bY = bYEl.value;
    if (!bD || !bM || !bY) {
      if (!bY) markError(bYEl);
      if (!bM) markError(bMEl);
      if (!bD) markError(bDEl);
      hasError = true;
    }
    if (hasError) { showAlert('❌ يرجى إدخال تاريخ الميلاد والجنس', 'e'); return; }

    const birth = new Date(+bY, +bM - 1, bD);
    if (isNaN(birth.getTime()) || birth > new Date()) {
      markError(bDEl); markError(bMEl); markError(bYEl);
      showAlert('❌ تاريخ الميلاد غير صحيح', 'e'); return;
    }

    const nm    = document.getElementById('nameInput').value.trim() || 'مشترك';
    const cv    = document.getElementById('currentCategory').value;
    const useUC = cv !== '';
    const uc    = useUC ? +cv : 1;

    const fixedCatYes = document.getElementById('fixedCatYes').checked;
    const fixedCatVal = document.getElementById('fixedCatSelect').value;
    if (fixedCatYes && !fixedCatVal) { showAlert('⚠️ يرجى اختيار الفئة المستهدفة', 'w'); return; }
    if (fixedCatYes && fixedCatVal && useUC && +fixedCatVal < uc) {
      showAlert(`❌ الفئة المستهدفة (${fixedCatVal}) لا يمكن أن تكون أقل من الفئة الحالية (${uc})`, 'e'); return;
    }

    TARGET_CAT_FOR_LAST5 = (fixedCatYes && fixedCatVal) ? +fixedCatVal : null;
    FIXED_CAT_FOR_AVG = null;

    const jD = +document.getElementById('joinDay').value;
    const jM = document.getElementById('joinMonth').value;
    const jY = document.getElementById('joinYear').value;
    let jd = null, ja = null;
    if (jD && jM && jY) {
      const j = new Date(+jY, +jM - 1, jD);
      if (!isNaN(j.getTime()) && j <= new Date()) { jd = j; ja = ageDiff(birth, j); }
    }

    let pY = +document.getElementById('priorYears').value  || 0;
    let pM = +document.getElementById('priorMonths').value || 0;
    if (pM >= 12) { pY += Math.floor(pM/12); pM %= 12; }
    const prior = pY * 12 + pM;

    const ageNow = ageDiff(birth, new Date());
    let sa, sm;
    if (ja) {
      sa = ja.years; sm = ja.months;
    } else if (prior > 0) {
      const ageNowM = ageNow.years * 12 + ageNow.months;
      const saM = Math.max(0, ageNowM - prior);
      sa = Math.floor(saM / 12); sm = saM % 12;
    } else {
      sa = ageNow.years; sm = ageNow.months;
    }
    sa = Math.min(Math.max(sa, 15), 100);

    const svcJ = jd ? monthsBetween(jd, new Date()) : 0;
    const ts   = svcJ + prior;

    if (ageNow.years >= 50 && !jd && prior === 0) {
      showAlert('⚠️ العمر 50 أو أكثر يتطلب تاريخ انتساب أو خدمة سابقة', 'w'); return;
    }

    const jat = ja
      ? `${ja.years} سنة و${ja.months} أشهر و${ja.days} أيام`
      : 'لم يدخل';

    USER = {
      gender: g, nm, ay: ageNow.years, am: ageNow.months, ad: ageNow.days,
      jat, py: pY, pm: pM, ts, sa, sm,
      saDisplay: jd ? null : (prior > 0 ? `${sa} سنة و${sm} شهر (محسوب)` : null)
    };

    const raw = [];
    const p1  = planA(prior, birth, sa, useUC, uc, g, jd);
    if (p1.purchaseMonths > 0) raw.push({ ...p1, desc:'أقرب عمر تقاعدي مع شراء' });

    raw.push({ ...planB(prior, birth, sa, useUC, uc, g, jd), desc:'أقرب عمر تقاعدي بدون شراء' });

    const p4age = g === 'male' ? 63 : 58;
    if (ageNow.years < p4age) {
      const pD = planFixed(prior, birth, sa, useUC, uc, g, p4age, jd);
      raw.push({ ...pD, desc:`تقاعد عند إكمال ${p4age} سنة` });
    }

    const pC  = planC(prior, birth, sa, useUC, uc, jd);
    const dupC= raw.some(p => p.targetAge === pC.targetAge && p.purchaseMonths === pC.purchaseMonths);
    if (!dupC) raw.push({ ...pC, desc:'إكمال خدمة 32 سنة (أعلى راتب)' });

    const seen = new Set(), uniq = [];
    for (const p of raw) {
      const k = `${p.targetAge}-${p.purchaseMonths}`;
      if (!seen.has(k)) { seen.add(k); uniq.push(p); }
    }
    uniq.sort((a, b) => a.targetAge - b.targetAge);
    PLANS = uniq.map((p, i) => ({ ...p, title:`الخطة ${i+1}` }));

    let html = buildSummary(nm, g, ageNow, jat, ts, !!jd);
    PLANS.forEach((p, i) => html += buildCard(p, i, nm, g, ageNow, prior));
    document.getElementById('results').innerHTML = html;

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = function() {
        const idx = +this.dataset.i - 1;
        if (!isNaN(idx) && PLANS[idx] && USER) {
          copyPlan(PLANS[idx], USER, idx+1);
          this.textContent = '✅ تم النسخ'; this.classList.add('done');
          showToast('✅ تم نسخ الخطة');
          setTimeout(() => { this.textContent = '📋 نسخ'; this.classList.remove('done'); }, 2200);
        }
      };
    });

    document.getElementById('pdfBtn').style.display    = 'inline-flex';
    document.getElementById('shareBtn').style.display  = 'inline-flex';
    document.getElementById('copyAllBtn').style.display= 'inline-flex';
    document.getElementById('results').scrollIntoView({ behavior:'smooth', block:'start' });
    buildNavBar();

  } catch(e) { showAlert('خطأ في الحساب: ' + e.message, 'e'); console.error(e); }
}

/* ─────────────────────────────────────────────────────
   PLAN NAVIGATION BAR
───────────────────────────────────────────────────── */
function buildNavBar() {
  if (!PLANS.length) return;
  const nav  = document.getElementById('planNav');
  const wrap = document.getElementById('planNavBtns');
  if (!nav || !wrap) return;
  wrap.innerHTML = PLANS.map((p,i) => {
    const col = COLORS[i] || '#2a5298';
    return `<button class="pnav-btn" data-plan="${i+1}"
      style="border-color:${col}44"
      onclick="scrollToPlan(${i+1})">
      ${p.title}
      <small>${p.targetAge} سنة · ${N(p.pension)} د.ع</small>
    </button>`;
  }).join('');
  nav.style.display = 'block';
  document.body.classList.add('has-nav');
  setActiveNav(1);
  if (window._navObserver) window._navObserver.disconnect();
  window._navObserver = new IntersectionObserver(entries => {
    let best = null, bestR = 0;
    entries.forEach(e => {
      if (e.isIntersecting && e.intersectionRatio > bestR) {
        bestR = e.intersectionRatio; best = e.target.id;
      }
    });
    if (best) { const n = parseInt(best.split('-').pop()); setActiveNav(n); }
  }, { threshold:[0.1,0.3,0.5] });
  PLANS.forEach((_,i) => {
    const el = document.getElementById(`plan-card-${i+1}`);
    if (el) window._navObserver.observe(el);
  });
}

window.scrollToPlan = function(n) {
  const el = document.getElementById(`plan-card-${n}`);
  if (!el) return;
  const headerH = document.querySelector('header')?.offsetHeight || 0;
  const y = el.getBoundingClientRect().top + window.pageYOffset - headerH - 12;
  window.scrollTo({ top:y, behavior:'smooth' });
  setActiveNav(n);
};

function setActiveNav(n) {
  document.querySelectorAll('.pnav-btn').forEach(b =>
    b.classList.toggle('active', +b.dataset.plan === n));
}
window.setActiveNav = setActiveNav;

/* ─────────────────────────────────────────────────────
   ALERTS & TOAST
───────────────────────────────────────────────────── */
function showAlert(msg, t) {
  document.getElementById('results').innerHTML =
    `<div class="alert al-${t==='e'?'e':'w'}">${msg}</div>`;
}
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ─────────────────────────────────────────────────────
   DROPDOWNS
───────────────────────────────────────────────────── */
function populate() {
  const cy = new Date().getFullYear();
  let yearBirth = '<option value="">السنة</option>';
  for (let y = cy; y >= 1950; y--) yearBirth += `<option value="${y}">${y}</option>`;
  let yearJoin  = '<option value="">السنة</option>';
  for (let y = cy; y >= 1970; y--) yearJoin  += `<option value="${y}">${y}</option>`;
  document.getElementById('birthYear').innerHTML = yearBirth;
  document.getElementById('joinYear').innerHTML  = yearJoin;

  const monthBase = '<option value="">الشهر</option>' +
    [1,2,3,4,5,6,7,8,9,10,11,12].map(m=>`<option value="${m}">${m}</option>`).join('');
  document.getElementById('birthMonth').innerHTML = monthBase;
  document.getElementById('joinMonth').innerHTML  = monthBase;
  document.getElementById('birthDay').innerHTML = '<option value="">اليوم</option>';
  document.getElementById('joinDay').innerHTML  = '<option value="">اليوم</option>';

  let catHTML = '<option value="">— تلقائي —</option>';
  for (let i = 1; i <= 15; i++)
    catHTML += `<option value="${i}">فئة ${i}  ←  ${SAL[i].toLocaleString()} د.ع</option>`;
  document.getElementById('currentCategory').innerHTML = catHTML;
}

function daysInMonth(year, month) { return new Date(year, month, 0).getDate(); }

window.onYearChange = function(prefix) {
  const yearEl  = document.getElementById(prefix + 'Year');
  const monthEl = document.getElementById(prefix + 'Month');
  const dayEl   = document.getElementById(prefix + 'Day');
  const y = +yearEl.value;
  if (!y) {
    monthEl.disabled = true; monthEl.value = '';
    dayEl.disabled   = true; dayEl.value   = ''; return;
  }
  monthEl.disabled = false;
  dayEl.disabled = true; dayEl.value = '';
  dayEl.innerHTML = '<option value="">اليوم</option>';
};

window.onMonthChange = function(prefix) {
  const yearEl  = document.getElementById(prefix + 'Year');
  const monthEl = document.getElementById(prefix + 'Month');
  const dayEl   = document.getElementById(prefix + 'Day');
  const y = +yearEl.value, m = +monthEl.value;
  if (!m) {
    dayEl.disabled = true; dayEl.value = '';
    dayEl.innerHTML = '<option value="">اليوم</option>'; return;
  }
  const maxDay = daysInMonth(y || 2000, m);
  let html = '<option value="">اليوم</option>';
  for (let d = 1; d <= maxDay; d++) html += `<option value="${d}">${d}</option>`;
  dayEl.innerHTML = html;
  dayEl.disabled  = false;
  if (+dayEl.value > maxDay) dayEl.value = '';
};

function reset() {
  document.getElementById('nameInput').value    = '';
  document.getElementById('genderSelect').value = '';
  ['birthYear','birthMonth','birthDay','joinYear','joinMonth','joinDay'].forEach(id => {
    const el = document.getElementById(id);
    el.value = '';
    if (id !== 'birthYear' && id !== 'joinYear') el.disabled = true;
    if (id === 'birthDay' || id === 'joinDay') el.innerHTML = '<option value="">اليوم</option>';
  });
  document.getElementById('priorYears').value  = '';
  document.getElementById('priorMonths').value = '';
  document.getElementById('fixedCatNo').checked  = true;
  document.getElementById('fixedCatYes').checked = false;
  document.getElementById('fixedCatSelectWrap').style.display = 'none';
  document.getElementById('fixedCatSelect').value = '';
  FIXED_CAT_FOR_AVG = null; TARGET_CAT_FOR_LAST5 = null;
  document.getElementById('results').innerHTML = '';
  ['pdfBtn','shareBtn','copyAllBtn'].forEach(id =>
    document.getElementById(id).style.display = 'none');
  const nav = document.getElementById('planNav');
  if (nav) nav.style.display = 'none';
  document.body.classList.remove('has-nav');
  PLANS = []; USER = null;
  populate();
}

/* ─────────────────────────────────────────────────────
   COPY ALL MODAL
───────────────────────────────────────────────────── */
function openCopyAllModal() {
  if (!PLANS.length) return;
  _modalMode = 'copy';
  _selectedPlans = new Set(PLANS.map((_,i) => i));
  document.getElementById('modalTitle').textContent    = '📋 نسخ الخطط';
  document.getElementById('modalSubtitle').textContent = 'اختر الخطط التي تريد نسخها دفعة واحدة';
  document.getElementById('modalConfirmBtn').textContent= '📋 نسخ المحدد';
  document.getElementById('shareLinkContainer').style.display = 'none';
  renderModalPlans();
  document.getElementById('planSelectorModal').style.display = 'flex';
}

function copySelectedPlans(chosen) {
  if (!chosen.length || !USER) return;
  let text = '';
  chosen.forEach((plan, i) => {
    text += copyPlanText(plan, USER, PLANS.indexOf(plan) + 1);
    if (i < chosen.length - 1) text += '\n' + '─'.repeat(40) + '\n';
  });
  const fb = () => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch(_) {}
    document.body.removeChild(ta);
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => {}).catch(fb);
  else fb();
  showToast(`✅ تم نسخ ${chosen.length} ${chosen.length === 1 ? 'خطة' : 'خطط'}`);
}

/* ─────────────────────────────────────────────────────
   PLAN SELECTOR MODAL
───────────────────────────────────────────────────── */
let _modalMode = 'pdf';
let _selectedPlans = new Set();

function openPlanModal(mode) {
  if (!PLANS.length) return;
  _modalMode = mode;
  _selectedPlans = new Set(PLANS.map((_,i) => i));
  const shareBox = document.getElementById('shareLinkContainer');
  if (mode === 'pdf') {
    document.getElementById('modalTitle').textContent    = '📄 اختر الخطط للتصدير';
    document.getElementById('modalSubtitle').textContent = 'اختر الخطط التي تريد تضمينها في ملف PDF';
    document.getElementById('modalConfirmBtn').textContent= '📄 تصدير PDF';
    shareBox.style.display = 'none';
  } else {
    document.getElementById('modalTitle').textContent    = '🔗 مشاركة الجداول';
    document.getElementById('modalSubtitle').textContent = 'اختر الخطط ثم انسخ الرابط لمشاركته';
    document.getElementById('modalConfirmBtn').textContent= '🔗 إنشاء رابط';
    shareBox.style.display = 'none';
  }
  renderModalPlans();
  document.getElementById('planSelectorModal').style.display = 'flex';
}

function renderModalPlans() {
  const list = document.getElementById('modalPlansList');
  list.innerHTML = PLANS.map((p,i) => {
    const col = COLORS[i] || '#2a5298';
    const sel = _selectedPlans.has(i);
    return `<div class="modal-plan-row ${sel?'selected':''}" data-idx="${i}" onclick="toggleModalPlan(${i})">
      <div class="modal-plan-chk">${sel?'✓':''}</div>
      <div class="modal-plan-info">
        <div class="modal-plan-name" style="color:${col}">${p.title}</div>
        <div class="modal-plan-meta">${p.desc} · عمر ${p.targetAge} سنة · ${FM(p.totalServiceMonths)} خدمة</div>
      </div>
      <div class="modal-plan-pension">${N(p.pension)} د.ع</div>
    </div>`;
  }).join('');
}

window.toggleModalPlan = function(i) {
  if (_selectedPlans.has(i)) _selectedPlans.delete(i);
  else                        _selectedPlans.add(i);
  renderModalPlans();
};

function modalSelectAll() {
  if (_selectedPlans.size === PLANS.length) _selectedPlans.clear();
  else _selectedPlans = new Set(PLANS.map((_,i) => i));
  renderModalPlans();
}

function closeModal() {
  document.getElementById('planSelectorModal').style.display = 'none';
  document.getElementById('shareLinkContainer').style.display = 'none';
}

function modalConfirm() {
  if (_selectedPlans.size === 0) { showToast('⚠️ يرجى اختيار خطة واحدة على الأقل'); return; }
  const chosen = [..._selectedPlans].sort((a,b)=>a-b).map(i => PLANS[i]);
  if      (_modalMode === 'pdf')   { closeModal(); exportPDFPlans(chosen); }
  else if (_modalMode === 'copy')  { closeModal(); copySelectedPlans(chosen); }
  else                              { buildShareLink(chosen); }
}

/* ─────────────────────────────────────────────────────
   SHARE LINK
───────────────────────────────────────────────────── */
function buildShareLink(chosenPlans) {
  if (!USER) return;
  const payload = {
    v: 3,
    u: [USER.nm, USER.gender==='male'?1:0, USER.ay, USER.am, USER.ts, USER.py, USER.pm, USER.sa],
    p: chosenPlans.map(p => [
      p.targetAge, p.totalServiceMonths, p.purchaseMonths,
      Math.round(p.pension/1000), Math.round(p.avg/1000), Math.round(p.purchaseCost/1000),
      p.retireDate.getFullYear(),
      p.yearsPlan.length > 0 ? p.yearsPlan[0].cat : 1
    ])
  };
  const json    = JSON.stringify(payload);
  const encoded = btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');

  // بناء رابط viewer.html
  const baseUrl = window.location.href.split('/').slice(0,-1).join('/') + '/viewer.html';
  const url     = baseUrl + '#s=' + encoded;

  const linkBox   = document.getElementById('shareLinkBox');
  const copyBtn   = document.getElementById('shareLinkCopyBtn');
  const container = document.getElementById('shareLinkContainer');
  linkBox.textContent = url;
  container.style.display = 'block';

  copyBtn.onclick = function() {
    const doCopy = () => {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy');
      document.body.removeChild(ta);
    };
    navigator.clipboard?.writeText(url).then(()=>{}).catch(doCopy);
    this.textContent = '✅ تم نسخ الرابط!';
    this.classList.add('copied');
    setTimeout(() => { this.textContent = '📋 نسخ الرابط'; this.classList.remove('copied'); }, 2500);
    showToast('✅ تم نسخ الرابط');
  };

  const waBtn = document.getElementById('shareWABtn');
  if (waBtn) waBtn.onclick = function() {
    const msg = `📋 جداول التقاعد الاختياري - ${USER.nm||'مشترك'}\n\nافتح الرابط لعرض أو تحميل الجداول:\n${url}`;
    window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
  };
}

/* ─────────────────────────────────────────────────────
   LOAD SHARED VIEW (from hash in same page — fallback)
───────────────────────────────────────────────────── */
function loadSharedView() {
  const hash  = window.location.hash;
  const isV3  = hash.startsWith('#s=');
  const isOld = hash.startsWith('#share=');
  if (!isV3 && !isOld) return false;
  try {
    const rawEnc  = isV3 ? hash.slice(3) : hash.slice(7);
    const encoded = rawEnc.replace(/-/g,'+').replace(/_/g,'/')
                          + '=='.slice(0,(4-rawEnc.length%4)%4);
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    if (!payload) return false;

    let u_nm,u_g,u_ay,u_am,u_ts,u_py,u_pm,u_sa, plans;
    if (payload.v === 3) {
      const u=payload.u;
      u_nm=u[0]; u_g=u[1]===1?'male':'female';
      u_ay=u[2]; u_am=u[3]; u_ts=u[4]; u_py=u[5]; u_pm=u[6]; u_sa=u[7]||0;
      const descs=['أقرب عمر تقاعدي مع شراء','أقرب عمر تقاعدي بدون شراء',
                   'تقاعد عند إكمال '+(u_g==='male'?'63':'58')+' سنة','إكمال خدمة 32 سنة (أعلى راتب)'];
      plans=payload.p.map((p,i)=>({
        title:`الخطة ${i+1}`, desc:descs[i]||`خطة ${i+1}`,
        targetAge:p[0], totalServiceMonths:p[1], purchaseMonths:p[2],
        pension:p[3]*1000, avg:p[4]*1000, purchaseCost:p[5]*1000,
        retireDate:new Date(p[6],0,1), yearsPlan:buildCatPlan(u_sa,p[0],p[7])
      }));
    } else if (payload.v===2) {
      const u=payload.u;
      u_nm=u.nm;u_g=u.g;u_ay=u.ay;u_am=u.am;u_ts=u.ts;u_py=u.py;u_pm=u.pm;u_sa=u.sa||0;
      plans=payload.plans.map(p=>({
        title:p.ti,desc:p.de,targetAge:p.ag,totalServiceMonths:p.mo,
        purchaseMonths:p.bu,pension:p.pe,avg:p.av,purchaseCost:p.co,
        retireDate:new Date(p.rd),yearsPlan:buildCatPlan(u_sa,p.ag,p.sc)
      }));
    } else {
      const u=payload.u;
      u_nm=u.nm;u_g=u.g;u_ay=u.ay;u_am=u.am;u_ts=u.ts;u_py=u.py;u_pm=u.pm;u_sa=0;
      plans=payload.plans.map(p=>({
        title:p.title,desc:p.desc,targetAge:p.age,totalServiceMonths:p.mo,
        purchaseMonths:p.buy,pension:p.pension,avg:p.avg,purchaseCost:p.cost,
        retireDate:new Date(p.rd),
        yearsPlan:p.yp?p.yp.map((cat,idx)=>({age:p.age-p.yp.length+1+idx,cat})):buildCatPlan(0,p.age,1)
      }));
    }
    if (!plans?.length) return false;
    PLANS = plans;
    USER  = {nm:u_nm,gender:u_g,ay:u_ay,am:u_am,ts:u_ts,
             py:u_py,pm:u_pm,sm:0,ad:0,jat:'مشارَك',sa:u_sa};

    const formEl = document.querySelector('.card.no-print');
    if (formEl) formEl.style.display = 'none';
    ['calcBtn','printBtn','resetBtn','copyAllBtn','shareBtn'].forEach(id => {
      const el = document.getElementById(id); if (el) el.style.display = 'none';
    });

    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      toolbar.innerHTML = `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%">
          <span style="font-size:.84rem;color:var(--navy);background:var(--navy-pale);
                       padding:8px 13px;border-radius:8px;border-right:3px solid var(--navy-md)">
            🔗 جدول مشارَك لـ <b>${u_nm||'مشترك'}</b>
            (${u_g==='male'?'ذكر':'أنثى'} · ${u_ay} سنة)
          </span>
          <button class="btn btn-pdf" id="sharedPdfBtn">📄 فتح PDF</button>
          <button class="btn btn-generate" id="sharedDlBtn">📥 تحميل PDF</button>
        </div>`;
      document.getElementById('sharedPdfBtn').onclick = () => exportPDFPlans(plans);
      document.getElementById('sharedDlBtn').onclick  = () => {
        exportPDFPlans(plans);
        showToast('✅ استخدم "حفظ كـ PDF" في حوار الطباعة');
      };
    }

    const ageNow = {years:u_ay, months:u_am, days:0};
    let html = buildSummary(u_nm, u_g, ageNow, 'مشارَك', u_ts, false);
    plans.forEach((p,i) => html += buildCard(p, i, u_nm, u_g, ageNow, (u_py||0)*12+(u_pm||0)));
    document.getElementById('results').innerHTML = html;

    document.querySelectorAll('.copy-btn').forEach(btn => {
      btn.onclick = function() {
        const idx = +this.dataset.i - 1;
        if (!isNaN(idx) && PLANS[idx] && USER) {
          copyPlan(PLANS[idx], USER, idx+1);
          this.textContent = '✅ تم النسخ'; this.classList.add('done');
          showToast('✅ تم نسخ الخطة');
          setTimeout(() => { this.textContent = '📋 نسخ'; this.classList.remove('done'); }, 2200);
        }
      };
    });

    buildNavBar();
    setTimeout(() => exportPDFPlans(plans), 900);
    return true;
  } catch(e) { console.warn('Share link parse error:', e); return false; }
}

/* ─────────────────────────────────────────────────────
   INIT
───────────────────────────────────────────────────── */
window.onload = function() {
  populate();

  document.querySelectorAll('input[name="fixedCatOpt"]').forEach(radio => {
    radio.addEventListener('change', function() {
      document.getElementById('fixedCatSelectWrap').style.display =
        this.value === 'yes' ? 'flex' : 'none';
    });
  });

  if (!loadSharedView()) {
    document.getElementById('calcBtn').onclick = generate;
  }

  document.getElementById('pdfBtn').onclick     = () => openPlanModal('pdf');
  document.getElementById('shareBtn').onclick   = () => openPlanModal('share');
  document.getElementById('copyAllBtn').onclick  = openCopyAllModal;
  document.getElementById('printBtn').onclick   = () => window.print();
  document.getElementById('resetBtn').onclick   = reset;

  document.getElementById('modalCloseBtn').onclick   = closeModal;
  document.getElementById('modalCancelBtn').onclick  = closeModal;
  document.getElementById('modalConfirmBtn').onclick = modalConfirm;
  document.getElementById('modalSelectAll').onclick  = modalSelectAll;

  document.getElementById('planSelectorModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
};

})();
