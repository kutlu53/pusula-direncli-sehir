// 2. bölüm "Uydu Bakışı": Ordu'dan dünyaya uzaklaşma, Türkiye'nin çevresi, kıtalar-okyanuslar ve ızgaralı Türkiye haritası.
// SB.6.2.1: ülkemizin, kıtaların ve okyanusların göreceli konumu ile ülkemizin mutlak konumu (belirle / görselleştir / özetle).
import { actOpen, actFinish, canvasPos, el, show, getRelief } from './ui.js';
import { TR, KARADENIZ, MARMARA, EGE_AKDENIZ, KIBRIS, KITALAR, IC_DENIZLER, drawPoly } from './geo.js';
import { HALF, GEO, toGeo, degText } from './terrain.js';
import { Sfx } from './audio.js';

const SEA = '#5aa6d6', LAND = '#e9dcae', LAND2 = '#ddd3b3', EDGE = '#8a7340', TURK = '#e8a765', RED = '#c2452f', INK = '#17313a', SEA_INK = '#1d5f86';
const FONT = 'Segoe UI, sans-serif';

// ---------- izdüşümler ----------
// Türkiye bölge haritası: boylam 22-47, enlem 33-44; enlem ekseni 1,3 kat (41° enleminde gerçeğe yakın oran)
const TB = { lon0: 22, lon1: 47, lat0: 33, lat1: 44, W: 600, H: 344 };
const projTR = ([lon, lat]) => [(lon - TB.lon0) / (TB.lon1 - TB.lon0) * TB.W, (TB.lat1 - lat) / (TB.lat1 - TB.lat0) * TB.H];
const unprojTR = (x, y) => [TB.lon0 + x / TB.W * (TB.lon1 - TB.lon0), TB.lat1 - y / TB.H * (TB.lat1 - TB.lat0)];
// Dünya: eşit aralıklı (boylam -180..180, enlem 90..-90)
const DB = { W: 640, H: 320 };
const projDunya = ([lon, lat]) => [(lon + 180) / 360 * DB.W, (90 - lat) / 180 * DB.H];

function text(g, t, x, y, { size = 13, color = INK, italic = false, bold = true, align = 'center', halo = true } = {}) {
  g.font = `${italic ? 'italic ' : ''}${bold ? 'bold ' : ''}${size}px ${FONT}`;
  g.textAlign = align; g.textBaseline = 'middle';
  if (halo) { g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.8)'; g.strokeText(t, x, y); }
  g.fillStyle = color; g.fillText(t, x, y);
}
function fill(g, poly, P, color, stroke = EDGE) {
  drawPoly(g, poly, P); g.fillStyle = color; g.fill();
  if (stroke) { g.strokeStyle = stroke; g.lineWidth = 1.2; g.stroke(); }
}

// Türkiye ve çevresi (grid: enlem-boylam ızgarası)
export function drawTurkiye(g, { grid = false, ordu = true } = {}) {
  const P = projTR, W = TB.W, H = TB.H;
  g.fillStyle = LAND2; g.fillRect(0, 0, W, H);
  fill(g, KARADENIZ, P, SEA, null); fill(g, EGE_AKDENIZ, P, SEA, null); fill(g, MARMARA, P, SEA, null);
  fill(g, KIBRIS, P, LAND2, EDGE);
  fill(g, TR, P, TURK, '#8a4f20');
  if (grid) {
    for (let lon = 24; lon <= 46; lon++) {
      const [x] = P([lon, 40]), major = lon % 2 === 0;
      g.strokeStyle = major ? 'rgba(23,49,58,.45)' : 'rgba(23,49,58,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
      if (major) text(g, `${lon}° D`, x, 9, { size: 10, color: INK, halo: false });
    }
    for (let lat = 34; lat <= 43; lat++) {
      const [, y] = P([30, lat]), major = lat % 2 === 0;
      g.strokeStyle = major ? 'rgba(23,49,58,.45)' : 'rgba(23,49,58,.18)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      if (major) text(g, `${lat}° K`, 4, y - 7, { size: 10, align: 'left', halo: false });
    }
  }
  if (ordu) {
    const [ox, oy] = P([GEO.lon, GEO.lat]);
    g.fillStyle = RED; g.beginPath(); g.arc(ox, oy, 5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    text(g, 'Ordu', ox, oy + 13, { size: 11 });
  }
  const [tx, ty] = P([34.5, 39]);
  text(g, 'TÜRKİYE', tx, ty, { size: 15, color: '#5a2d0c' });
  // kuzey oku
  g.fillStyle = 'rgba(246,239,220,.9)'; g.fillRect(W - 34, H - 52, 26, 44);
  text(g, 'K', W - 21, H - 42, { size: 13, halo: false });
  g.fillStyle = INK; g.beginPath(); g.moveTo(W - 21, H - 34); g.lineTo(W - 15, H - 14); g.lineTo(W - 21, H - 19); g.lineTo(W - 27, H - 14); g.closePath(); g.fill();
}

// Dünya haritası: kıtalar beyaz-bej, Türkiye kırmızı
export function drawDunya(g) {
  const P = projDunya, W = DB.W, H = DB.H;
  g.fillStyle = SEA; g.fillRect(0, 0, W, H);
  for (const k of KITALAR) fill(g, k, P, LAND, EDGE);
  for (const d of IC_DENIZLER) fill(g, d, P, SEA, null);
  fill(g, TR, P, RED, '#7a2410');
  const [tx, ty] = P([37.9, 39]);
  g.strokeStyle = RED; g.lineWidth = 2; g.beginPath(); g.arc(tx, ty, 11, 0, 7); g.stroke();
  text(g, 'TÜRKİYE', tx + 2, ty + 20, { size: 11, color: RED });
  // ekvator ve başlangıç meridyeni
  g.setLineDash([5, 5]); g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 1;
  const [, ey] = P([0, 0]), [gx] = P([0, 0]);
  g.beginPath(); g.moveTo(0, ey); g.lineTo(W, ey); g.moveTo(gx, 0); g.lineTo(gx, H); g.stroke(); g.setLineDash([]);
  text(g, 'Ekvator', W - 4, ey - 8, { size: 10, color: '#fff', align: 'right', halo: false, italic: true });
  text(g, 'Başlangıç meridyeni', gx + 4, 10, { size: 10, color: '#fff', align: 'left', halo: false, italic: true });
}

// ---------- 1) Uzaklaşma: Ordu → Türkiye → kıtalar → dünya ----------
const ZW = 640, ZH = 360;
const STAGES = [
  { s: 12000, yukseklik: '0,5 km', not: 'Boztepe\'den bakıyorsun: kıyı, Melet Irmağı ve şehir. Yükselmek için düğmeye bas.' },
  { s: 24, yukseklik: '400 km', not: 'Ordu, Türkiye\'nin KUZEYİNDE, Karadeniz kıyısında. Batısında Samsun, doğusunda Giresun var.' },
  { s: 4.4, yukseklik: '3.000 km', not: 'Türkiye, AVRUPA ile ASYA kıtalarının birleştiği yerde; güneyinde Afrika, batısında Atlas Okyanusu var.' },
  { s: 1.5, yukseklik: '36.000 km (uydu yörüngesi)', not: 'İşte dünya: 7 kıta, 5 okyanus. Kırmızı nokta Türkiye. Bir yerin konumu, çevresine göre anlatılınca GÖRECELİ konumdur.' },
];
const ETIKETLER = [
  // [metin, boylam, enlem, boyut, renk, italik, enKüçükÖlçek, enBüyükÖlçek]
  ['KARADENİZ', 37.88, 40.998, 14, SEA_INK, true, 400, 1e9],
  ['ORDU', 37.886, 40.978, 15, INK, false, 400, 1e9],
  ['Boztepe', 37.8699, 40.9818, 11, INK, false, 400, 1e9],
  ['Melet Irmağı', 37.8965, 40.9785, 10, SEA_INK, true, 400, 1e9],
  ['TÜRKİYE', 34.5, 39.2, 16, '#5a2d0c', false, 9, 400],
  ['KARADENİZ', 34, 43.6, 13, SEA_INK, true, 9, 400],
  ['AKDENİZ', 31, 34.4, 13, SEA_INK, true, 9, 400],
  ['EGE DENİZİ', 25.3, 38.4, 11, SEA_INK, true, 12, 400],
  ['Ordu', 37.88, 40.6, 11, INK, false, 9, 400],
  ['AVRUPA', 14, 50, 15, INK, false, 1.9, 9],
  ['ASYA', 85, 45, 17, INK, false, 1.9, 9],
  ['AFRİKA', 20, 6, 15, INK, false, 1.9, 9],
  ['ATLAS OKYANUSU', -21, 31, 12, '#fff', true, 1.9, 9],
  ['HİNT OKYANUSU', 75, -14, 12, '#fff', true, 1.9, 9],
  ['Türkiye', 37.9, 36.3, 12, RED, false, 1.9, 9],
  ['KUZEY AMERİKA', -100, 46, 13, INK, false, 0, 1.9],
  ['GÜNEY AMERİKA', -60, -16, 12, INK, false, 0, 1.9],
  ['AVRUPA', 14, 52, 12, INK, false, 0, 1.9],
  ['ASYA', 92, 46, 14, INK, false, 0, 1.9],
  ['AFRİKA', 20, 5, 13, INK, false, 0, 1.9],
  ['AVUSTRALYA', 134, -26, 12, INK, false, 0, 1.9],
  ['ANTARKTİKA', 20, -72, 12, INK, false, 0, 1.9],
  ['BÜYÜK OKYANUS', 205, 2, 12, '#fff', true, 0, 1.9],
  ['ATLAS OKYANUSU', -35, 20, 11, '#fff', true, 0, 1.9],
  ['HİNT OKYANUSU', 78, -22, 11, '#fff', true, 0, 1.9],
  ['KUZEY BUZ DENİZİ', 110, 84, 10, '#fff', true, 0, 1.9],
  ['GÜNEY OKYANUSU', -30, -57, 10, '#fff', true, 0, 1.9],
  ['Türkiye', 37.9, 34, 11, RED, false, 0, 1.9],
];

export function zoomOut(buildings) {
  return new Promise((resolve) => {
    const body = actOpen('İlk uçuş: en yükseğe çık', 'Drone yükseldikçe Ordu küçülür, dünya ortaya çıkar. Her yükselişten sonra haritayı incele.');
    const cv = el('canvas', 'zoom-canvas'), note = el('p', 'act-task', STAGES[0].not), alt = el('p', 'act-note'), btn = el('button', 'zoom-btn', '🚀 Yüksel');
    cv.width = ZW; cv.height = ZH;
    const g = cv.getContext('2d'), relief = getRelief(buildings);
    const tl = toGeo(-HALF, -HALF), br = toGeo(HALF, HALF);
    let stage = 0, s = STAGES[0].s, anim = null;
    const started = performance.now();
    const draw = () => {
      // enlem ekseni şehir ölçeğinde 1,325 kat (gerçek oran), dünya ölçeğinde 1
      const f = 1 + 0.325 * Math.min(1, Math.max(0, (Math.log(s) - Math.log(1.5)) / (Math.log(24) - Math.log(1.5))));
      const P = ([lon, lat]) => [ZW / 2 + (lon - GEO.lon) * s, ZH / 2 - (lat - GEO.lat) * s * f];
      g.fillStyle = '#0d2a36'; g.fillRect(0, 0, ZW, ZH); // uzay
      const [, top] = P([0, 90]), [, bot] = P([0, -90]);
      g.fillStyle = SEA; g.fillRect(0, Math.max(0, top), ZW, Math.min(ZH, bot) - Math.max(0, top));
      const offsets = s < 3 ? [-360, 0, 360] : [0];
      for (const off of offsets) {
        const Q = ([lon, lat]) => P([lon + off, lat]);
        for (const k of KITALAR) fill(g, k, Q, LAND, EDGE);
        for (const d of IC_DENIZLER) fill(g, d, Q, SEA, null);
        if (s > 3) { fill(g, EGE_AKDENIZ, Q, SEA, null); fill(g, MARMARA, Q, SEA, null); fill(g, KIBRIS, Q, LAND, EDGE); }
        fill(g, TR, Q, s > 120 ? LAND : s > 9 ? TURK : RED, s > 120 ? null : s > 9 ? '#8a4f20' : '#7a2410');
      }
      if (s > 120) { // şehir: oyunun arazi haritası
        const [x0, y0] = P([tl.lon, tl.lat]), [x1, y1] = P([br.lon, br.lat]);
        g.drawImage(relief, x0, y0, x1 - x0, y1 - y0);
      } else if (s > 9) {
        const [ox, oy] = P([GEO.lon, GEO.lat]);
        g.fillStyle = RED; g.beginPath(); g.arc(ox, oy, 5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
      } else {
        const [tx, ty] = P([37.9, 39]);
        g.strokeStyle = RED; g.lineWidth = 2; g.beginPath(); g.arc(tx, ty, Math.max(9, 4 * s), 0, 7); g.stroke();
      }
      for (const [t, lon, lat, size, color, italic, lo, hi] of ETIKETLER) {
        if (s < lo || s >= hi) continue;
        const [x, y] = P([lon, lat]);
        text(g, t, x, y, { size, color, italic, halo: color !== '#fff' });
      }
      text(g, `Yükseklik: ${anim ? '…' : STAGES[stage].yukseklik}`, 8, 12, { size: 12, color: '#fff', align: 'left', halo: false });
    };
    const up = () => {
      if (anim || stage >= STAGES.length - 1) return;
      const from = Math.log(s), to = Math.log(STAGES[stage + 1].s), t0 = performance.now();
      btn.disabled = true; note.textContent = 'Yükseliyor…'; Sfx.drone?.();
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / 1800), e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        s = Math.exp(from + (to - from) * e);
        if (t < 1) { draw(); anim = requestAnimationFrame(tick); return; }
        anim = null; stage++; s = STAGES[stage].s; draw();
        note.textContent = STAGES[stage].not; alt.textContent = `${stage}/${STAGES.length - 1} yükseliş`;
        if (stage === STAGES.length - 1) { show(btn, false); actFinish('Uydu yüksekliğindesin! Ordu → Türkiye → kıtalar → dünya: her ölçekte "nerede?" sorusunun yanıtı değişir.', resolve, { sure: Math.round((performance.now() - started) / 1000) }); }
        else btn.disabled = false;
      };
      anim = requestAnimationFrame(tick);
    };
    btn.onclick = up;
    alt.textContent = `0/${STAGES.length - 1} yükseliş`;
    body.append(cv, note, alt, btn);
    draw();
  });
}

// ---------- 2) Harita üstüne etiket yerleştirme (Türkiye'nin çevresi / kıtalar ve okyanuslar) ----------
export function labelMap(spec) {
  return new Promise((resolve) => {
    const body = actOpen(spec.baslik, spec.giris);
    const wrap = el('div', 'lm-wrap'), cv = el('canvas', 'lm-canvas');
    const dunya = spec.harita === 'dunya', W = dunya ? DB.W : TB.W, H = dunya ? DB.H : TB.H, P = dunya ? projDunya : projTR;
    cv.width = W; cv.height = H;
    (dunya ? drawDunya : drawTurkiye)(cv.getContext('2d'));
    wrap.appendChild(cv);
    const pool = el('div', 'nb-pool'), check = el('button', '', 'Kontrol et');
    const slots = [], placed = {};
    let picked = null;
    const chips = spec.yuvalar.map((y) => y.ad).sort((a, b) => a.localeCompare(b, 'tr')).map((name) => {
      const c = el('button', 'nb-chip', name);
      c.onclick = () => { if (c.classList.contains('used')) return; picked = c; chips.forEach((o) => o.classList.toggle('sel', o === c)); };
      pool.appendChild(c);
      return c;
    });
    const sync = () => { check.disabled = Object.keys(placed).length < chips.length; };
    spec.yuvalar.forEach((y, i) => {
      const [x, yy] = P(y.k), b = el('button', 'lm-slot', '?');
      b.style.left = (x / W * 100) + '%'; b.style.top = (yy / H * 100) + '%';
      b.dataset.dogru = y.ad;
      b.onclick = () => {
        if (check.classList.contains('hidden')) return;
        if (placed[i]) { placed[i].classList.remove('used'); delete placed[i]; b.textContent = '?'; b.classList.remove('full'); }
        if (picked) { placed[i] = picked; picked.classList.add('used'); picked.classList.remove('sel'); b.textContent = picked.textContent; b.classList.add('full'); picked = null; }
        sync();
      };
      slots.push(b); wrap.appendChild(b);
    });
    check.onclick = () => {
      let n = 0;
      const yanit = {};
      slots.forEach((b, i) => {
        const ok = placed[i].textContent === spec.yuvalar[i].ad;
        yanit[spec.yuvalar[i].ad] = placed[i].textContent;
        if (ok) n++;
        b.classList.add(ok ? 'right' : 'wrong'); b.textContent = spec.yuvalar[i].ad;
      });
      show(check, false); show(pool, false);
      actFinish(`${chips.length} addan ${n} tanesini doğru yerleştirdin. ${spec.aciklama}`, resolve, { dogru: n, toplam: chips.length, yanit });
    };
    sync();
    body.append(wrap, pool, check);
  });
}

// ---------- 3) Izgaralı Türkiye haritası: uç noktalar ve Ordu (mutlak konum) ----------
export function coordGrid(spec) {
  return new Promise((resolve) => {
    const body = actOpen('Türkiye\'nin mutlak konumu', spec.giris);
    const ask = el('p', 'act-task'), cv = el('canvas', 'act-canvas koor-canvas'), note = el('p', 'act-note', ' ');
    cv.width = TB.W; cv.height = TB.H;
    cv.dataset.hedefler = JSON.stringify(spec.gorevler.map((t) => { const [x, y] = projTR(t.k); return [x / TB.W, y / TB.H]; }));
    const g = cv.getContext('2d'), results = [];
    let i = 0, yanlis = 0, locked = false, hintOn = false, last = null;
    const redraw = () => {
      drawTurkiye(g, { grid: true });
      results.forEach((r, k) => {
        const [x, y] = projTR(spec.gorevler[k].k);
        g.strokeStyle = '#1f7a3a'; g.lineWidth = 3; g.beginPath(); g.arc(x, y, 9, 0, 7); g.stroke();
        text(g, spec.gorevler[k].etiket, x, y - 15, { size: 11, color: '#1f7a3a' });
      });
      if (hintOn && i < spec.gorevler.length) { const [x, y] = projTR(spec.gorevler[i].k); g.strokeStyle = '#e0a52f'; g.lineWidth = 3; g.setLineDash([6, 4]); g.beginPath(); g.arc(x, y, 22, 0, 7); g.stroke(); g.setLineDash([]); }
      if (last) { g.fillStyle = last.ok ? '#1f7a3a' : RED; g.beginPath(); g.arc(last.x, last.y, 5, 0, 7); g.fill(); }
      if (i >= spec.gorevler.length) { // 36-42 K / 26-45 D dikdörtgeni
        const [x0, y0] = projTR([26, 42]), [x1, y1] = projTR([45, 36]);
        g.strokeStyle = RED; g.lineWidth = 2.5; g.setLineDash([8, 5]); g.strokeRect(x0, y0, x1 - x0, y1 - y0); g.setLineDash([]);
        text(g, '36° - 42° K  ·  26° - 45° D', (x0 + x1) / 2, y1 + 14, { size: 13, color: RED });
      }
    };
    const next = () => {
      locked = false; hintOn = false; yanlis = 0; last = null;
      if (i >= spec.gorevler.length) { ask.textContent = 'Tamamlandı!'; redraw(); return actFinish(spec.bitis, resolve, results); }
      ask.textContent = `${i + 1}/${spec.gorevler.length} · ${spec.gorevler[i].metin}`;
      redraw();
    };
    cv.onclick = (e) => {
      if (locked || i >= spec.gorevler.length) return;
      const [px, py] = canvasPos(cv, e), [lon, lat] = unprojTR(px, py), t = spec.gorevler[i];
      const d = Math.hypot((lon - t.k[0]) * 0.77, lat - t.k[1]), ok = d <= spec.tol;
      const okudugun = `📍 Dokunduğun yer: ${degText(lat, 1)} K, ${degText(lon, 1)} D.`;
      last = { x: px, y: py, ok };
      if (ok) {
        locked = true;
        results.push({ metin: t.metin, yanlis, lat: +lat.toFixed(2), lon: +lon.toFixed(2) });
        note.textContent = `${okudugun} ✅ ${t.sonuc}`;
        i++; redraw();
        setTimeout(next, 2000);
      } else {
        yanlis++;
        if (yanlis >= 2) hintOn = true;
        note.textContent = `${okudugun} ❌ ${t.ipucu}${hintOn ? ' Sarı halkanın içine dokun.' : ''}`;
        redraw();
      }
    };
    body.append(ask, cv, note);
    next();
  });
}
