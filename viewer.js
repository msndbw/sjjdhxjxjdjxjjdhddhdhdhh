/*!
 * جداول التقاعد الاختياري — viewer.js
 * صفحة عرض معزولة تماماً عن الحاسبة
 * النسخة 4.0
 */
(function() {
'use strict';

/* ── ثوابت ─────────────────────────────── */
const SAL = {
  1:350000,  2:455000,  3:560000,  4:665000,  5:770000,
  6:875000,  7:980000,  8:1085000, 9:1190000, 10:1295000,
  11:1400000,12:1505000,13:1610000,14:1715000, 15:1750000
};
const PLAN_ACCENT = ['ac1','ac2','ac3','ac4','ac5'];
const PLAN_ICON_C = ['ic1','ic2','ic3','ic4','ic5'];
const PLAN_EMOJI  = ['🎯','📅','💰','⏰','👩‍💼'];
const COLORS      = ['#2a5298','#1e5c3a','#c9993a','#8b2248','#50307a'];
const QR_LINK     = 'https://linktr.ee/Daman2026';
const QR_B64      = '/9j/4AAQSkZJRgABAQAAAQABAAD/4gHYSUNDX1BST0ZJTEUAAQEAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADb/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/wAARCAIAAgADASIAAhEBAxEB/8QAGwABAQEBAQEBAQAAAAAAAAAAAAkIBwoGBQT/xAAUAQEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AqqAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/9k=';

let PLANS = [], USER = null;

/* ── أدوات تنسيق ──────────────────────── */
function N(n) { return Math.round(n).toLocaleString('ar-IQ'); }
function FM(m) {
  const y = Math.floor(m/12), mo = m%12;
  if (!y)  return `${mo} شهر`;
  if (!mo) return `${y} سنة`;
  return `${y} سنة و${mo} شهر`;
}
function fmtDate(d) {
  return d.toLocaleDateString('ar-IQ', { year:'numeric', month:'long', day:'numeric' });
}

/* ── toast ────────────────────────────── */
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

/* ── بناء خطة الفئات (مطابقة للحاسبة) ── */
function buildCatPlan(sa, ta, sc, targetCat) {
  sa = Math.min(Math.max(sa,0),100);
  ta = Math.min(Math.max(ta,sa),100);
  if (ta-sa > 60) ta = sa+60;
  const TC = (targetCat && targetCat >= 1 && targetCat <= 15)
    ? Math.max(targetCat,sc) : 15;
  let rows = [];
  for (let a = sa; a <= ta; a++) rows.push({ age:a, cat:null });
  const total      = rows.length;
  const last5Start = Math.max(total-5, 0);
  const yearsB5    = last5Start;
  const maxReach   = Math.min(TC, sc+yearsB5);

  if (sc >= TC) {
    rows.forEach(r => r.cat = TC);
  } else if (yearsB5 === 0) {
    let cat = sc;
    for (let i = 0; i < total; i++) {
      rows[i].cat = Math.min(TC, cat);
      if (i < total-1) cat = Math.min(TC, cat+1);
    }
  } else if (yearsB5 >= (TC-sc)) {
    let rem = yearsB5 - (TC-sc);
    for (let i = 0; i < total; i++) {
      if      (i < rem)        rows[i].cat = sc;
      else if (i < last5Start) rows[i].cat = Math.min(TC, sc+(i-rem));
      else                     rows[i].cat = TC;
    }
  } else {
    let cat = sc;
    for (let i = 0; i < total; i++) {
      if (i < last5Start) { rows[i].cat = Math.min(TC, cat); cat = Math.min(TC, cat+1); }
      else                  rows[i].cat = maxReach;
    }
  }
  for (let i = 1; i < total; i++) {
    if (rows[i].cat - rows[i-1].cat > 1) rows[i].cat = rows[i-1].cat+1;
    if (rows[i].cat > 15) rows[i].cat = 15;
    if (rows[i].cat < 1)  rows[i].cat = 1;
  }
  return rows;
}

/* ── فك تشفير الرابط ─────────────────── */
function decodePayload() {
  const hash  = window.location.hash;
  const isV3  = hash.startsWith('#s=');
  const isOld = hash.startsWith('#share=');
  if (!isV3 && !isOld) return null;
  const rawEnc  = isV3 ? hash.slice(3) : hash.slice(7);
  const encoded = rawEnc.replace(/-/g,'+').replace(/_/g,'/')
                        + '=='.slice(0,(4-rawEnc.length%4)%4);
  return JSON.parse(decodeURIComponent(escape(atob(encoded))));
}

/* ── بناء بيانات الخطط ───────────────── */
function parsePlans(payload) {
  let u_nm, u_g, u_ay, u_am, u_ts, u_py, u_pm, u_sa, plans;
  if (payload.v === 3) {
    const u = payload.u;
    u_nm=u[0]; u_g=u[1]===1?'male':'female';
    u_ay=u[2]; u_am=u[3]; u_ts=u[4]; u_py=u[5]; u_pm=u[6]; u_sa=u[7]||0;
    const descs = [
      'أقرب عمر تقاعدي مع شراء',
      'أقرب عمر تقاعدي بدون شراء',
      'تقاعد عند إكمال ' + (u_g==='male'?'63':'58') + ' سنة',
      'إكمال خدمة 32 سنة (أعلى راتب)'
    ];
    plans = payload.p.map((p,i) => ({
      title:`الخطة ${i+1}`, desc:descs[i]||`خطة ${i+1}`,
      targetAge:p[0], totalServiceMonths:p[1], purchaseMonths:p[2],
      pension:p[3]*1000, avg:p[4]*1000, purchaseCost:p[5]*1000,
      retireDate:new Date(p[6],0,1), yearsPlan:buildCatPlan(u_sa,p[0],p[7])
    }));
  } else if (payload.v === 2) {
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
      yearsPlan:p.yp
        ?p.yp.map((cat,idx)=>({age:p.age-p.yp.length+1+idx,cat}))
        :buildCatPlan(0,p.age,1)
    }));
  }
  return {
    user:{nm:u_nm,gender:u_g,ay:u_ay,am:u_am,ts:u_ts,py:u_py,pm:u_pm,sm:0,ad:0,sa:u_sa},
    plans
  };
}

/* ── ملخص المشترك ─────────────────────── */
function buildSummaryHTML(user) {
  const gender   = user.gender==='male'?'ذكر':'أنثى';
  const priorStr = (user.py>0||user.pm>0) ? FM(user.py*12+user.pm) : 'لا يوجد';
  const items = [
    {l:'الاسم',         v:user.nm||'—'},
    {l:'الجنس',         v:gender},
    {l:'العمر الحالي',  v:`${user.ay} سنة و${user.am} شهر`},
    {l:'إجمالي الخدمة', v:FM(user.ts)},
    {l:'الخدمة السابقة',v:priorStr},
  ];
  return `<div class="sum-bar">
    <div class="sum-bar-title">📊 ملخص بيانات المشترك</div>
    <div class="sum-items">
      ${items.map(it=>`<div class="sum-item"><div class="si-l">${it.l}</div><div class="si-v">${it.v}</div></div>`).join('')}
    </div>
  </div>`;
}

/* ── بطاقة خطة واحدة ─────────────────── */
function buildCardHTML(plan, ci, user) {
  const ac     = PLAN_ACCENT[ci]||'ac1';
  const ic     = PLAN_ICON_C[ci]||'ic1';
  const em     = PLAN_EMOJI[ci]||'📋';
  const n      = ci+1;
  const hasBuy = plan.purchaseMonths > 0;
  const actual = plan.totalServiceMonths - plan.purchaseMonths;
  const future = Math.max(0, actual - user.ts);
  const prevMo = (user.py||0)*12 + (user.pm||0);

  let tbody = '';
  const last = plan.yearsPlan.length-1;
  plan.yearsPlan.forEach((r,i) => {
    const is5   = i >= plan.yearsPlan.length-5;
    const isRet = i === last;
    const cls   = isRet ? 'rret' : (is5 ? 'r5' : '');
    const cp    = `<span class="cpill${r.cat===15?' c15':''}">${r.cat}</span>`;
    // FIX: عرض العمر بالسنة فقط بدون شهر مرتبط بالمستخدم (يسبب ارتباكاً)
    tbody += `<tr class="${cls}"><td>${r.age} سنة</td><td>${cp}</td></tr>`;
  });

  // حساب ملاحظة الحد
  const rawP     = plan.avg * 0.025 * plan.totalServiceMonths / 12;
  const afterCap = Math.min(rawP, plan.avg*0.8);
  const capNote  = afterCap < 350000
    ? ' — <span style="color:var(--amber)">طُبِّق الحد الأدنى 350,000 د.ع (م.36)</span>'
    : (rawP > plan.avg*0.8 ? ' — <span style="color:var(--amber)">طُبِّق الحد الأقصى 80% (م.36)</span>' : '');

  return `
  <div class="plan-card ${ac}">
    <div class="plan-hdr">
      <div class="plan-hdr-l">
        <div class="plan-icon ${ic}">${em}</div>
        <div>
          <div class="plan-seq">الخطة ${n}</div>
          <div class="plan-name">${plan.title}</div>
          <div class="plan-desc">${plan.desc}</div>
        </div>
      </div>
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
        <span>👤 <b>${user.nm||'—'}</b></span>
        <span>🎂 <b>${user.ay} سنة و${user.am} شهر</b></span>
        <span>⏳ خدمة حالية: <b>${FM(user.ts)}</b></span>
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
              ${plan.yearsPlan.slice(-5).map(r=>`ف${r.cat}:${N(SAL[r.cat])}`).join(' + ')}
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

/* ── تصدير PDF ──────────────────────────── */
function exportPDF() {
  if (!PLANS.length || !USER) return;
  const nm       = USER.nm||'مشترك';
  const gender   = USER.gender==='male'?'ذكر':'أنثى';
  const today    = new Date().toLocaleDateString('ar-IQ',{year:'numeric',month:'long',day:'numeric'});
  const priorStr = (USER.py>0||USER.pm>0) ? FM(USER.py*12+USER.pm) : 'لا يوجد';

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
    .lbl{color:#8fb3d9;font-size:11px;font-weight:600}.val{color:#f0e6c8;font-weight:700}
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
    <p>جدول تقاعدي مشارَك</p>
    <div class="cover-divider"></div>
    <div class="cover-card">
      <div class="cover-row"><span class="lbl">الاسم</span><span class="val">${nm}</span></div>
      <div class="cover-row"><span class="lbl">الجنس</span><span class="val">${gender}</span></div>
      <div class="cover-row"><span class="lbl">العمر الحالي</span><span class="val">${USER.ay} سنة و${USER.am} شهر</span></div>
      <div class="cover-row"><span class="lbl">إجمالي الخدمة الحالية</span><span class="val">${FM(USER.ts)}</span></div>
      <div class="cover-row"><span class="lbl">الخدمة السابقة</span><span class="val">${priorStr}</span></div>
      <div class="cover-row"><span class="lbl">عدد الخطط</span><span class="val">${PLANS.length} ${PLANS.length===1?'خطة':'خطط'}</span></div>
      <div class="cover-row"><span class="lbl">تاريخ التقرير</span><span class="val">${today}</span></div>
    </div>
    <div class="cover-plans">
      ${PLANS.map((p,i)=>`
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

  PLANS.forEach((plan, pi) => {
    const color  = COLORS[pi]||'#2a5298';
    const hasBuy = plan.purchaseMonths > 0;
    const actual = plan.totalServiceMonths - plan.purchaseMonths;
    const future = Math.max(0, actual - USER.ts);
    const lastIdx= plan.yearsPlan.length-1;
    let tRows = '';
    plan.yearsPlan.forEach((r,i) => {
      const is5   = i >= plan.yearsPlan.length-5;
      const isRet = i === lastIdx;
      const cls   = isRet ? 'rret' : (is5 ? 'r5' : '');
      tRows += `<tr class="${cls}"><td>${r.age} سنة</td><td>فئة ${r.cat}</td></tr>`;
    });
    const sep = pi > 0 ? '<hr class="plan-separator">' : '';

    const rawP     = plan.avg * 0.025 * plan.totalServiceMonths / 12;
    const afterCap = Math.min(rawP, plan.avg*0.8);
    const capNote  = afterCap < 350000
      ? ' — طُبِّق الحد الأدنى 350,000 د.ع (م.36)'
      : (rawP > plan.avg*0.8 ? ' — طُبِّق الحد الأقصى 80% (م.36)' : '');

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
  win.onload = () => setTimeout(() => { win.focus(); win.print(); }, 1200);
  showToast('✅ جاري فتح ملف PDF...');
}

/* ── MAIN ─────────────────────────────── */
window.addEventListener('DOMContentLoaded', function() {
  const loading   = document.getElementById('loadingState');
  const errBox    = document.getElementById('errorState');
  const errMsg    = document.getElementById('errorMsg');
  const actionBar = document.getElementById('actionBar');
  const content   = document.getElementById('viewerContent');
  const infoLabel = document.getElementById('infoLabel');

  function showError(msg) {
    loading.style.display = 'none';
    errBox.style.display  = 'block';
    if (msg) errMsg.innerHTML = msg;
  }

  if (!window.location.hash ||
      (!window.location.hash.startsWith('#s=') &&
       !window.location.hash.startsWith('#share='))) {
    showError('لا يوجد رابط خطة في هذا العنوان.<br>يرجى التواصل مع من أرسل لك الرابط.');
    return;
  }

  try {
    const payload = decodePayload();
    if (!payload) { showError(); return; }
    const result = parsePlans(payload);
    if (!result || !result.plans.length) { showError(); return; }

    PLANS = result.plans;
    USER  = result.user;

    loading.style.display = 'none';

    const gender = USER.gender==='male'?'ذكر':'أنثى';
    infoLabel.innerHTML = `🔗 جدول مشارَك لـ <b>${USER.nm||'مشترك'}</b> · ${gender} · ${USER.ay} سنة`;
    actionBar.style.display = 'flex';

    let html = buildSummaryHTML(USER);
    PLANS.forEach((p,i) => { html += buildCardHTML(p, i, USER); });
    content.innerHTML = html;

    document.getElementById('openPdfBtn').onclick = exportPDF;
    document.getElementById('dlPdfBtn').onclick   = function() {
      exportPDF();
      showToast('✅ استخدم "حفظ كـ PDF" في حوار الطباعة');
    };

    // تشغيل PDF تلقائياً بعد ثانية
    setTimeout(exportPDF, 900);

  } catch(e) {
    console.warn('Viewer parse error:', e);
    showError('تعذّر قراءة بيانات الجدول.<br>الرابط قد يكون تالفاً أو منتهي الصلاحية.');
  }
});

})();
