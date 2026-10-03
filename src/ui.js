import { WORLD, HALF, M_PER_UNIT, terrainHeight, PLACES, RISKS, riverX, coastZ, fbm, slopeAt, riskAt } from './terrain.js';

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => el.classList.toggle('hidden', !on);
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// ---------- Pusula şeridi ----------
const PX_PER_DEG = 3;
const marks = [];
export function initCompass() {
  const strip = $('compass-strip');
  const names = { 0: 'K', 45: 'KD', 90: 'D', 135: 'GD', 180: 'G', 225: 'GB', 270: 'B', 315: 'KB' };
  for (let deg = 0; deg < 360; deg += 15) {
    const m = document.createElement(names[deg] ? 'span' : 'i');
    if (names[deg]) {
      m.textContent = names[deg];
      if (deg % 90) m.className = 'minor';
      if (deg === 0) m.className = 'north';
    }
    strip.appendChild(m);
    marks.push({ deg, el: m });
  }
}
export function updateCompass(heading) {
  const half = $('compass').clientWidth / 2;
  for (const m of marks) {
    const diff = ((m.deg - heading + 540) % 360) - 180;
    const x = half + diff * PX_PER_DEG;
    m.el.style.display = Math.abs(x - half) > half - 8 ? 'none' : '';
    m.el.style.left = x + 'px';
  }
  $('compass-deg').textContent = Math.round(heading) + '°';
}

// ---------- HUD ----------
export function setHud({ gorev, sayac, puan }) {
  $('quest-text').textContent = gorev;
  $('pieces').textContent = sayac;
  $('score').textContent = `⭐ ${puan}`;
}
export function setPrompt(text) { show($('prompt'), !!text); if (text) $('prompt').textContent = text; }
let toastTimer;
export function toast(text, ms = 5000) {
  $('toast').textContent = text;
  show($('toast'));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => show($('toast'), false), ms);
}
export const showPanel = (id, on = true) => show($(id), on);
export function flash() {
  const f = $('flash');
  f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

// ---------- Diyalog ----------
let advance = null;
export const dialogAdvance = () => advance && advance();
export function dialog(lines) {
  return new Promise((resolve) => {
    let i = 0;
    const render = () => { $('dialog-name').textContent = lines[i][0]; $('dialog-text').textContent = lines[i][1]; };
    advance = () => {
      if (++i < lines.length) return render();
      advance = null;
      show($('dialog'), false);
      resolve();
    };
    render();
    show($('dialog'));
  });
}
$('dialog').addEventListener('click', dialogAdvance);

// ---------- Soru ----------
export function quiz(q) {
  return new Promise((resolve) => {
    const started = performance.now();
    $('quiz-skill').textContent = q.beceri.toUpperCase();
    $('quiz-text').textContent = q.metin;
    const box = $('quiz-options');
    box.innerHTML = '';
    show($('quiz-feedback'), false); show($('quiz-next'), false);
    let result = null;
    q.secenekler.forEach((text, k) => {
      const b = el('button', '', `${'ABCD'[k]})  ${text}`);
      b.onclick = () => {
        const dogru = k === q.dogru;
        result = { secilen: text, dogru, sure: Math.round((performance.now() - started) / 100) / 10 };
        [...box.children].forEach((c, j) => { c.disabled = true; if (j === q.dogru) c.classList.add('right'); });
        if (!dogru) b.classList.add('wrong');
        $('quiz-feedback').textContent = (dogru ? '✅ Doğru! ' : '❌ Bu sefer olmadı. ') + q.aciklama;
        show($('quiz-feedback')); show($('quiz-next'));
      };
      box.appendChild(b);
    });
    $('quiz-next').onclick = () => { show($('quiz'), false); resolve(result); };
    show($('quiz'));
  });
}

// ---------- Harita ----------
const MAP = 640, toPx = (v) => ((v + HALF) / WORLD) * MAP;
const STOPS = [[0, [169, 208, 142]], [10, [143, 194, 122]], [30, [207, 217, 138]], [60, [230, 213, 138]],
  [100, [199, 154, 90]], [160, [156, 107, 63]], [260, [122, 82, 54]]];
function ramp(h) {
  for (let i = 1; i < STOPS.length; i++) if (h < STOPS[i][0]) {
    const [h0, a] = STOPS[i - 1], [h1, b] = STOPS[i], t = (h - h0) / (h1 - h0);
    return a.map((v, k) => v + (b[k] - v) * t);
  }
  return STOPS[STOPS.length - 1][1];
}

let relief = null, base = null; // relief: yalnız arazi; base: arazi + yapılar
function buildBase(buildings) {
  relief = document.createElement('canvas');
  relief.width = relief.height = MAP;
  const g = relief.getContext('2d'), N = 320, img = g.createImageData(N, N);
  const hs = new Float32Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++)
    hs[j * N + i] = terrainHeight(((i + 0.5) / N) * WORLD - HALF, ((j + 0.5) / N) * WORLD - HALF);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const h = hs[j * N + i];
    let c = h < 0 ? [90, 166, 214].map((v) => v - Math.min(40, -h * 6)) : ramp(h);
    const r = hs[j * N + Math.min(N - 1, i + 1)], d = hs[Math.min(N - 1, j + 1) * N + i];
    if (h >= 0 && (Math.floor(h / 20) !== Math.floor(r / 20) || Math.floor(h / 20) !== Math.floor(d / 20))) c = c.map((v) => v * 0.78);
    img.data.set([c[0], c[1], c[2], 255], (j * N + i) * 4);
  }
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = N;
  tmp.getContext('2d').putImageData(img, 0, 0);
  g.drawImage(tmp, 0, 0, MAP, MAP);
  base = document.createElement('canvas');
  base.width = base.height = MAP;
  const b2 = base.getContext('2d');
  b2.drawImage(relief, 0, 0);
  b2.fillStyle = '#7d7d86';
  for (const b of buildings) b2.fillRect(toPx(b.x - b.w / 2), toPx(b.z - b.d / 2), (b.w / WORLD) * MAP, (b.d / WORLD) * MAP);
}

// CBS katmanları: eğim, taşkın alanı ve bunların birleşimi olan risk
let layers = null;
function buildLayers() {
  const N = 256, mk = () => { const c = document.createElement('canvas'); c.width = c.height = N; return c; };
  layers = { egim: mk(), taskin: mk(), risk: mk() };
  const img = {};
  for (const k in layers) img[k] = layers[k].getContext('2d').createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = ((i + 0.5) / N) * WORLD - HALF, z = ((j + 0.5) / N) * WORLD - HALF, o = (j * N + i) * 4, r = riskAt(x, z);
    if (r === 'su') continue;
    const t = Math.min(1, Math.max(0, (slopeAt(x, z) - 0.08) / 0.5));
    img.egim.data.set([235, 200 - 160 * t, 40, 40 + 190 * t], o);
    if (r === 'sel') img.taskin.data.set([30, 100, 225, 185], o);
    img.risk.data.set(r === 'sel' ? [30, 100, 225, 150] : r === 'heyelan' ? [215, 55, 40, 120] : [60, 170, 80, 80], o);
  }
  for (const k in layers) layers[k].getContext('2d').putImageData(img[k], 0, 0);
}

function label(g, text, x, z, opt = {}) {
  g.font = `${opt.italic ? 'italic ' : ''}bold ${opt.size || 13}px Segoe UI, sans-serif`;
  g.textAlign = 'center';
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.85)';
  g.strokeText(text, toPx(x), toPx(z));
  g.fillStyle = opt.color || '#17313a';
  g.fillText(text, toPx(x), toPx(z));
}

// k: küçük ekranda harita küçülünce işaretin okunabilir kalması için büyütme katsayısı
const markScale = (cv) => Math.min(2.4, Math.max(1, MAP / (cv.clientWidth || MAP) / 1.5));
function planMark(g, p, k = 1) {
  g.fillStyle = p.renk; g.beginPath(); g.arc(toPx(p.x), toPx(p.z), 11 * k, 0, 7); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2.5 * k; g.stroke();
  g.fillStyle = '#fff'; g.font = `bold ${Math.round(13 * k)}px Segoe UI, sans-serif`; g.textAlign = 'center'; g.fillText(p.harf, toPx(p.x), toPx(p.z) + 4.5 * k);
}

function mapFurniture(g) { // kuzey oku ve ölçek çubuğu
  g.fillStyle = 'rgba(246,239,220,.9)'; g.fillRect(MAP - 58, 12, 46, 62); g.fillRect(14, MAP - 50, 176, 38);
  g.fillStyle = '#17313a'; g.font = 'bold 18px Segoe UI, sans-serif'; g.textAlign = 'center';
  g.fillText('K', MAP - 35, 32);
  g.beginPath(); g.moveTo(MAP - 35, 38); g.lineTo(MAP - 27, 66); g.lineTo(MAP - 35, 59); g.lineTo(MAP - 43, 66); g.closePath(); g.fill();
  const km = (1000 / M_PER_UNIT / WORLD) * MAP;
  g.fillRect(24, MAP - 26, km, 5); g.fillRect(24, MAP - 31, 2, 15); g.fillRect(24 + km / 2 - 1, MAP - 29, 2, 11); g.fillRect(22 + km, MAP - 31, 2, 15);
  g.font = 'bold 12px Segoe UI, sans-serif';
  g.textAlign = 'left'; g.fillText('0', 22, MAP - 35);
  g.textAlign = 'center'; g.fillText('500 m', 24 + km / 2, MAP - 35);
  g.textAlign = 'right'; g.fillText('1 km', 30 + km, MAP - 35);
}

// revealed: [minX,maxX,minZ,maxZ] dizileri; found: bulunan yer anahtarları; pins: oyuncunun kendi işaretleri
export function drawMap({ buildings, revealed, found, player, heading, pins = [], risk = false, devices = [], plan = [] }) {
  if (!base) buildBase(buildings);
  const g = $('map-canvas').getContext('2d');
  g.fillStyle = '#e4d6ad'; g.fillRect(0, 0, MAP, MAP);
  g.fillStyle = 'rgba(120,95,50,.35)'; g.font = 'bold 40px Georgia, serif'; g.textAlign = 'center';
  for (let x = 80; x < MAP; x += 160) for (let y = 100; y < MAP; y += 160) g.fillText('?', x, y);
  if (!revealed.length) {
    g.fillStyle = '#5b4a25'; g.font = 'bold 20px Segoe UI, sans-serif';
    g.fillText('Henüz harita parçan yok. Parçaları bul!', MAP / 2, MAP / 2);
    return;
  }
  g.save();
  g.beginPath();
  for (const [x0, x1, z0, z1] of revealed) g.rect(toPx(x0), toPx(z0), toPx(x1) - toPx(x0), toPx(z1) - toPx(z0));
  g.clip();
  g.drawImage(base, 0, 0);
  if (risk) { if (!layers) buildLayers(); g.drawImage(layers.risk, 0, 0, MAP, MAP); }
  for (const d of devices) {
    g.fillStyle = { sel: '#2f7fe0', heyelan: '#e0452f', guvenli: '#2fa84f' }[d.t];
    g.fillRect(toPx(d.x) - 5, toPx(d.z) - 5, 10, 10); g.strokeStyle = '#fff'; g.lineWidth = 2; g.strokeRect(toPx(d.x) - 5, toPx(d.z) - 5, 10, 10);
  }
  for (const p of plan) planMark(g, p);
  label(g, 'K A R A D E N İ Z', 60, coastZ(60) - 190, { size: 18, italic: true, color: '#1d5f86' });
  label(g, 'Melet Irmağı', riverX(300) + 62, 300, { size: 12, italic: true, color: '#1d5f86' });
  label(g, 'İskele', PLACES.iskele.x + 6, PLACES.iskele.z - 30, { size: 12 });
  for (const k of found) {
    const p = PLACES[k];
    g.fillStyle = '#c2452f'; g.beginPath(); g.arc(toPx(p.x), toPx(p.z), 5, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    label(g, p.ad, p.x, p.z - 14);
  }
  for (const p of pins) { // drone fotoğrafları
    g.fillStyle = '#7a2fb5'; g.beginPath(); g.arc(toPx(p.x), toPx(p.z), 6, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
    label(g, '⚠ ' + p.ad, p.x, p.z + 22, { size: 11, color: '#5a1f8a' });
  }
  g.restore();
  g.save();
  g.translate(toPx(player.x), toPx(player.z));
  g.rotate(heading);
  g.fillStyle = '#e0392b'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath();
  g.fill(); g.stroke();
  g.restore();
  mapFurniture(g);
}

// ---------- Kâşif Defteri etkinlikleri ----------
function actOpen(title, intro) {
  $('act-title').textContent = title;
  const body = $('act-body');
  body.innerHTML = '';
  if (intro) body.appendChild(el('p', 'act-intro', intro));
  show($('act-feedback'), false); show($('act-next'), false);
  show($('activity'));
  return body;
}
function actFinish(text, resolve, value) {
  $('act-feedback').textContent = text;
  show($('act-feedback')); show($('act-next'));
  $('act-next').onclick = () => { show($('activity'), false); resolve(value); };
  $('act-next').scrollIntoView?.({ block: 'nearest' });
}
const canvasPos = (cv, e) => {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * cv.width, (e.clientY - r.top) / r.height * cv.height];
};

// 1) Haritada işaretleme: öğrenci istenen yeri etiketsiz haritada kendisi gösterir
export function markOnMap(tasks, buildings) {
  return new Promise((resolve) => {
    if (!base) buildBase(buildings);
    const body = actOpen('Haritada göster');
    const ask = el('p', 'act-task'), cv = el('canvas', 'act-canvas'), note = el('p', 'act-note', ' ');
    cv.width = cv.height = MAP;
    body.append(ask, cv, note);
    const g = cv.getContext('2d'), results = [];
    let i = 0, locked = false;
    const redraw = () => {
      g.drawImage(base, 0, 0);
      mapFurniture(g);
      results.forEach((r, k) => {
        const t = tasks[k];
        g.strokeStyle = '#1f7a3a'; g.lineWidth = 3; g.beginPath(); g.arc(toPx(t.x), toPx(t.z), 12, 0, 7); g.stroke();
        g.fillStyle = r.dogru ? '#1f7a3a' : '#c2452f';
        g.beginPath(); g.arc(r.px, r.py, 5, 0, 7); g.fill();
      });
    };
    const next = () => {
      locked = false;
      if (i >= tasks.length) {
        ask.textContent = 'Tamamlandı!';
        const n = results.filter((r) => r.dogru).length;
        return actFinish(`${tasks.length} yerden ${n} tanesini doğru gösterdin. Yeşil halkalar doğru yerleri gösteriyor.`, resolve, results);
      }
      ask.textContent = `${i + 1}/${tasks.length} · ${tasks[i].metin} (haritaya dokun)`;
    };
    cv.onclick = (e) => {
      if (locked || i >= tasks.length) return;
      locked = true;
      const [px, py] = canvasPos(cv, e), t = tasks[i];
      const x = px / MAP * WORLD - HALF, z = py / MAP * WORLD - HALF, dist = Math.hypot(x - t.x, z - t.z);
      results.push({ metin: t.metin, dogru: dist <= t.tol, uzaklik: Math.round(dist * M_PER_UNIT), px, py });
      note.textContent = dist <= t.tol ? '✅ Tam yerinde!' : `❌ Doğru yer yeşil halkanın içi. ${Math.round(dist * M_PER_UNIT)} m uzağa işaret koydun.`;
      redraw();
      i++;
      setTimeout(next, 1700);
    };
    redraw(); next();
  });
}

// 2) Komşular: etiketleri Ordu'nun çevresindeki doğru yöne yerleştir
const TR = [[26, 40], [26.4, 41.7], [28, 42], [29, 41.2], [31, 41.1], [33, 42], [35, 42.1], [36.5, 41.3], [38, 41], [40, 41],
  [41.5, 41.5], [43.5, 41.1], [44.8, 39.7], [44, 39.4], [44.5, 38], [44.3, 37], [42.4, 37.1], [40.7, 37.1], [38, 36.8], [36.7, 36.8],
  [36.2, 35.9], [35.8, 36.6], [34.6, 36.8], [33.7, 36.2], [32.6, 36.1], [31, 36.8], [30.4, 36.3], [29.2, 36.2], [28.2, 36.8],
  [27.4, 37], [27.2, 37.9], [26.3, 38.3], [26.8, 39], [26.1, 39.5]];
function drawTurkey(cv) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  const P = ([lon, lat]) => [(lon - 25.2) / 20.4 * W, (42.6 - lat) / 7.2 * H];
  g.fillStyle = '#5aa6d6'; g.fillRect(0, 0, W, H);
  g.beginPath(); TR.forEach((p, i) => { const [x, y] = P(p); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.closePath();
  g.fillStyle = '#e9dcae'; g.fill(); g.strokeStyle = '#8a7340'; g.lineWidth = 1.5; g.stroke();
  g.font = 'italic bold 12px Segoe UI, sans-serif'; g.fillStyle = '#1d5f86'; g.textAlign = 'center';
  g.fillText('KARADENİZ', W * 0.47, 13); g.fillText('AKDENİZ', W * 0.42, H - 5);
  const [ox, oy] = P([37.9, 40.95]);
  g.fillStyle = '#c2452f'; g.beginPath(); g.arc(ox, oy + 3, 5, 0, 7); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke();
  g.font = 'bold 13px Segoe UI, sans-serif'; g.fillStyle = '#17313a'; g.fillText('ORDU', ox, oy + 22);
  g.font = '11px Segoe UI, sans-serif'; g.fillStyle = '#6b5a2e'; g.textAlign = 'left'; g.fillText('Türkiye (şematik)', 6, H - 6);
}

export function placeNeighbors(spec) {
  return new Promise((resolve) => {
    const body = actOpen('Ordu nerede? Komşularını yerleştir',
      'Kırmızı nokta Ordu. Önce aşağıdaki bir isme, sonra o ismin Ordu\'ya göre bulunduğu yöndeki kutuya dokun.');
    const tr = el('canvas', 'act-turkey'); tr.width = 340; tr.height = 122; drawTurkey(tr);
    const grid = el('div', 'nb-grid'), pool = el('div', 'nb-pool'), check = el('button', '', 'Kontrol et');
    const order = ['', 'kuzey', '', 'bati', 'ORDU', 'dogu', 'guneybati', 'guney', ''];
    const names = { kuzey: 'Kuzey', bati: 'Batı', dogu: 'Doğu', guneybati: 'Güneybatı', guney: 'Güney' };
    const slots = {}, placed = {};
    let picked = null;
    const chips = Object.values(spec.yuvalar).sort().map((name) => {
      const c = el('button', 'nb-chip', name);
      c.onclick = () => { if (c.classList.contains('used')) return; picked = c; chips.forEach((o) => o.classList.toggle('sel', o === c)); };
      pool.appendChild(c);
      return c;
    });
    const sync = () => { check.disabled = Object.keys(placed).length < chips.length; };
    for (const key of order) {
      const cell = el('div', key === 'ORDU' ? 'nb-center' : key ? 'nb-slot' : 'nb-empty', key === 'ORDU' ? 'ORDU' : key ? names[key] : '');
      if (key && key !== 'ORDU') {
        slots[key] = cell;
        cell.onclick = () => {
          if (check.classList.contains('hidden')) return;
          if (placed[key]) { placed[key].classList.remove('used'); delete placed[key]; cell.textContent = names[key]; cell.classList.remove('full'); }
          if (picked) {
            placed[key] = picked; picked.classList.add('used'); picked.classList.remove('sel');
            cell.textContent = picked.textContent; cell.classList.add('full'); picked = null;
          }
          sync();
        };
      }
      grid.appendChild(cell);
    }
    check.onclick = () => {
      let n = 0;
      const yanit = {};
      for (const key in slots) {
        const ok = placed[key].textContent === spec.yuvalar[key];
        yanit[key] = placed[key].textContent;
        if (ok) n++;
        slots[key].classList.add(ok ? 'right' : 'wrong');
        slots[key].textContent = spec.yuvalar[key];
      }
      show(check, false); show(pool, false);
      actFinish(`${chips.length} komşudan ${n} tanesini doğru yerleştirdin. ${spec.aciklama}`, resolve, { dogru: n, toplam: chips.length, yanit });
    };
    sync();
    body.append(tr, grid, pool, check);
  });
}

// 3) Özet: boşlukları seç, sonra kendi cümleni yaz
export function cloze(spec) {
  return new Promise((resolve) => {
    const body = actOpen(spec.baslik, 'Boşluklara uygun sözcükleri seç.');
    const para = el('p', 'cloze'), selects = [];
    for (const part of spec.parcalar) {
      if (typeof part === 'string') { para.append(part); continue; }
      const s = el('select');
      s.appendChild(new Option('… seç …', ''));
      part.sec.forEach((o) => s.appendChild(new Option(o, o)));
      s.dataset.dogru = part.dogru;
      s.onchange = () => { done.disabled = selects.some((x) => !x.value); };
      selects.push(s); para.appendChild(s);
    }
    const q = el('label', 'cloze-free', spec.serbest), ta = el('textarea');
    ta.rows = 2; ta.maxLength = 300; ta.placeholder = 'Buraya yaz…';
    q.appendChild(ta);
    const done = el('button', '', 'Deftere yaz');
    done.disabled = true;
    done.onclick = () => {
      let n = 0;
      for (const s of selects) {
        const ok = s.value === s.dataset.dogru;
        if (ok) n++;
        s.classList.add(ok ? 'right' : 'wrong');
        s.value = s.dataset.dogru; s.disabled = true;
      }
      ta.disabled = true; show(done, false);
      const cumle = spec.parcalar.map((p) => (typeof p === 'string' ? p : p.dogru)).join('');
      actFinish(`${selects.length} boşluktan ${n} tanesi doğruydu. Doğru özet defterine yazıldı.`, resolve,
        { dogru: n, toplam: selects.length, cumle, serbest: ta.value.trim() });
    };
    body.append(para, q, done);
  });
}

// 4) Eski - yeni hava fotoğrafı: farkları bul
const AIR = { x0: -260, z0: -140, w: 600, h: 460, s: 0.7 };
function drawAerial(cv, old, buildings) {
  const g = cv.getContext('2d'), k = MAP / WORLD;
  const ax = (x) => (x - AIR.x0) * AIR.s, az = (z) => (z - AIR.z0) * AIR.s;
  g.drawImage(relief, toPx(AIR.x0), toPx(AIR.z0), AIR.w * k, AIR.h * k, 0, 0, cv.width, cv.height);
  if (!old) { g.fillStyle = 'rgba(150,115,75,.85)'; g.beginPath(); g.arc(ax(RISKS.orman.x), az(RISKS.orman.z), 36 * AIR.s, 0, 7); g.fill(); }
  g.fillStyle = 'rgba(38,92,48,.8)';
  for (let x = AIR.x0; x < AIR.x0 + AIR.w; x += 9) for (let z = AIR.z0; z < AIR.z0 + AIR.h; z += 9) {
    const h = terrainHeight(x, z), s = z - coastZ(x);
    if (h < 6 || (s < 160 && h < 9) || fbm(x * 0.02 + 40, z * 0.02) < 0.36) continue;
    if (!old && (Math.hypot(x - RISKS.orman.x, z - RISKS.orman.z) < 38 || Math.hypot(x - RISKS.yamac.x, z - RISKS.yamac.z) < 24)) continue;
    g.beginPath(); g.arc(ax(x) + (fbm(x, z) - 0.5) * 5, az(z) + (fbm(z, x) - 0.5) * 5, 2.6, 0, 7); g.fill();
  }
  g.fillStyle = '#5f5f69';
  for (const b of buildings) {
    if (old && (b.risk || Math.abs(b.x - 40) > 125 || b.z - coastZ(b.x) > 95)) continue;
    g.fillRect(ax(b.x - b.w / 2), az(b.z - b.d / 2), Math.max(3, b.w * AIR.s), Math.max(3, b.d * AIR.s));
  }
}

export function compare(diffs, buildings) {
  return new Promise((resolve) => {
    if (!base) buildBase(buildings);
    const body = actOpen('Hasan Usta\'nın albümü: Neler değişmiş?',
      'Soldaki fotoğraf kırk yıl önce, sağdaki bugün çekildi. "Bugün" fotoğrafında değişen üç yere dokun.');
    const row = el('div', 'air-row'), list = el('ul', 'air-list'), note = el('p', 'act-note', 'Bulunan değişim: 0/3');
    const make = (title, old) => {
      const fig = el('figure', 'air'), cv = el('canvas');
      cv.width = AIR.w * AIR.s; cv.height = AIR.h * AIR.s;
      drawAerial(cv, old, buildings);
      fig.append(cv, el('figcaption', '', title));
      row.appendChild(fig);
      return cv;
    };
    make('40 yıl önce', true);
    const cv = make('Bugün', false), g = cv.getContext('2d'), found = new Set();
    let yanlis = 0;
    cv.classList.add('tap');
    cv.onclick = (e) => {
      if (found.size === diffs.length) return;
      const [px, py] = canvasPos(cv, e), x = px / AIR.s + AIR.x0, z = py / AIR.s + AIR.z0;
      const k = diffs.findIndex((d) => Math.hypot(x - d.x, z - d.z) < d.r);
      if (k < 0) { yanlis++; note.textContent = `Burada belirgin bir değişim yok. Tekrar bak! (Bulunan: ${found.size}/3)`; return; }
      if (found.has(k)) return;
      found.add(k);
      const d = diffs[k];
      g.strokeStyle = '#e0392b'; g.lineWidth = 3; g.beginPath(); g.arc((d.x - AIR.x0) * AIR.s, (d.z - AIR.z0) * AIR.s, d.r * AIR.s * 0.8, 0, 7); g.stroke();
      list.appendChild(el('li', '', d.metin));
      note.textContent = `Bulunan değişim: ${found.size}/3`;
      if (found.size === diffs.length) actFinish('Üç değişimi de buldun! Şehir büyürken ırmak kenarına, yamaca ve ormanın içine doğru yayılmış.', resolve, { yanlis });
    };
    body.append(row, note, list);
  });
}

// 5) Katman masası: katmanları aç/kapat, işaretli yerlerin riskini belirle
export function layerTable(yerler, buildings) {
  return new Promise((resolve) => {
    if (!base) buildBase(buildings);
    if (!layers) buildLayers();
    const body = actOpen('Katman masası: Hangi yer, hangi risk?',
      'Katmanları açıp kapatarak haritayı incele. Eğim katmanında renk sarıdan kırmızıya döndükçe yamaç dikleşir; taşkın alanı mavidir.');
    const wrap = el('div', 'layer-wrap'), left = el('div', 'layer-left'), right = el('div', 'layer-right');
    const toggles = el('div', 'layer-toggles'), cv = el('canvas', 'act-canvas');
    cv.width = cv.height = MAP;
    const g = cv.getContext('2d'), on = { egim: false, taskin: false, risk: false };
    let used = 0;
    const draw = () => {
      g.drawImage(base, 0, 0);
      for (const k of ['egim', 'taskin', 'risk']) if (on[k]) g.drawImage(layers[k], 0, 0, MAP, MAP);
      for (const y of yerler) planMark(g, { ...y, renk: '#17313a' }, markScale(cv) * 1.15);
      mapFurniture(g);
    };
    for (const [k, ad] of [['egim', 'Eğim katmanı'], ['taskin', 'Taşkın alanı katmanı']]) {
      const b = el('button', 'layer-btn', ad);
      b.onclick = () => { on[k] = !on[k]; used++; b.classList.toggle('on', on[k]); draw(); };
      toggles.appendChild(b);
    }
    const secim = {}, rows = [];
    const check = el('button', '', 'Risk haritasını oluştur');
    check.disabled = true;
    for (const y of yerler) {
      const row = el('div', 'layer-row');
      row.appendChild(el('span', '', `${y.harf} · ${y.ad}`));
      const opts = el('div', 'layer-opts');
      for (const [v, ad] of [['sel', 'Sel'], ['heyelan', 'Heyelan'], ['guvenli', 'Düşük risk']]) {
        const b = el('button', 'opt ' + v, ad);
        b.onclick = () => {
          if (check.classList.contains('hidden')) return;
          secim[y.harf] = v;
          [...opts.children].forEach((c) => c.classList.toggle('on', c === b));
          check.disabled = Object.keys(secim).length < yerler.length;
        };
        opts.appendChild(b);
      }
      row.appendChild(opts); right.appendChild(row); rows.push(row);
    }
    check.onclick = () => {
      let n = 0;
      yerler.forEach((y, i) => { const ok = secim[y.harf] === y.dogru; if (ok) n++; rows[i].classList.add(ok ? 'right' : 'wrong'); });
      on.egim = on.taskin = false; on.risk = true; draw();
      show(check, false); show(toggles, false);
      const yanlis = yerler.filter((y) => secim[y.harf] !== y.dogru).map((y) => `${y.harf}: ${{ sel: 'sel', heyelan: 'heyelan', guvenli: 'düşük risk' }[y.dogru]}`);
      actFinish(`${yerler.length} yerden ${n} tanesini doğru sınıfladın.${yanlis.length ? ' Doğrusu → ' + yanlis.join(', ') + '.' : ''} Haritada şimdi risk katmanını görüyorsun: mavi sel, kırmızı heyelan, yeşil düşük risk.`,
        resolve, { dogru: n, toplam: yerler.length, secim, katmanKullanimi: used });
    };
    left.append(toggles, cv); right.appendChild(check);
    wrap.append(left, right); body.appendChild(wrap);
    draw();
  });
}

// 6) Deney: değişkenleri seç, canlandırmayı izle, hedefleri tamamla
const LW = 560, LH = 290;
function rain(g, n, t, color = 'rgba(190,215,240,.85)') {
  g.strokeStyle = color; g.lineWidth = 1.5; g.beginPath();
  for (let i = 0; i < n; i++) {
    const x = (i * 97.3) % LW, y = ((i * 53.7 + t * 900) % (LH - 40));
    g.moveTo(x, y); g.lineTo(x - 3, y + 11);
  }
  g.stroke();
}
function tree(g, x, y, s = 1) {
  g.fillStyle = '#6b4a2e'; g.fillRect(x - 2 * s, y - 12 * s, 4 * s, 12 * s);
  g.fillStyle = '#2f7d3c'; g.beginPath(); g.moveTo(x, y - 40 * s); g.lineTo(x + 13 * s, y - 10 * s); g.lineTo(x - 13 * s, y - 10 * s); g.fill();
}
function house(g, x, y, wall = '#f0d9c4') {
  g.fillStyle = wall; g.fillRect(x - 14, y - 20, 28, 20);
  g.fillStyle = '#b5523a'; g.beginPath(); g.moveTo(x - 18, y - 20); g.lineTo(x, y - 34); g.lineTo(x + 18, y - 20); g.fill();
  g.fillStyle = '#4a6278'; g.fillRect(x - 4, y - 13, 8, 8);
}
const LABDRAW = {
  // Yandan kesit: solda yamaç, ortada ırmak yatağı, sağda taşkın yatağındaki ev
  sel(g, v, res, t) {
    const n = { az: 25, orta: 60, siddetli: 130 }[v.yagis], bank = LH - 78, bed = LH - 30, cx0 = 320, cx1 = 420;
    const sky = g.createLinearGradient(0, 0, 0, LH); sky.addColorStop(0, v.yagis === 'siddetli' ? '#6f7f8f' : '#9fb8cc'); sky.addColorStop(1, '#dfe8ee');
    g.fillStyle = sky; g.fillRect(0, 0, LW, LH);
    g.fillStyle = v.ortu === 'beton' ? '#9a9a9a' : v.ortu === 'ciplak' ? '#a8845a' : '#6fa34d';
    g.beginPath(); g.moveTo(0, 70); g.lineTo(cx0, bank); g.lineTo(cx0 + 22, bed); g.lineTo(cx1 - 22, bed); g.lineTo(cx1, bank); g.lineTo(LW, bank); g.lineTo(LW, LH); g.lineTo(0, LH); g.fill();
    g.fillStyle = '#7a5c3c'; g.fillRect(0, LH - 14, LW, 14);
    const slopeY = (x) => 70 + (bank - 70) * (x / cx0);
    if (v.ortu === 'orman') for (let x = 20; x < cx0 - 20; x += 34) tree(g, x, slopeY(x) + 2);
    if (v.ortu === 'beton') for (let x = 40; x < cx0 - 40; x += 70) house(g, x, slopeY(x) + 4, '#d9e3ea');
    const level = Math.min(res.seviye, 1.25) * (bed - bank) * Math.min(1, t * 1.4);
    g.fillStyle = 'rgba(40,110,200,.85)';
    g.fillRect(cx0 + 8, bed - Math.min(level, bed - bank), cx1 - cx0 - 16, Math.min(level, bed - bank));
    if (level > bed - bank) g.fillRect(cx0 - 30, bank - (level - (bed - bank)), LW - cx0 + 30, level - (bed - bank));
    house(g, 490, bank);
    if (level > bed - bank) { g.fillStyle = 'rgba(40,110,200,.6)'; g.fillRect(cx1, bank - (level - (bed - bank)), LW - cx1, level - (bed - bank)); }
    if (t > 0 && t < 1) {
      rain(g, n, t);
      const w = { orman: 2, ciplak: 5, beton: 7 }[v.ortu] * { az: 0.5, orta: 0.8, siddetli: 1.2 }[v.yagis];
      g.strokeStyle = 'rgba(40,110,200,.8)'; g.lineWidth = w; g.beginPath();
      const head = Math.min(cx0, t * 2 * cx0);
      g.moveTo(Math.max(0, head - 200), slopeY(Math.max(0, head - 200)) - 3); g.lineTo(head, slopeY(head) - 3); g.stroke();
      if (v.ortu !== 'beton') { // toprağa sızan su
        g.strokeStyle = 'rgba(40,110,200,.55)'; g.lineWidth = 2;
        for (let x = 30; x < cx0 - 20; x += v.ortu === 'orman' ? 26 : 70) { const y = slopeY(x) + 6 + ((t * 60) % 18); g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 9); g.stroke(); }
      }
    }
    g.fillStyle = '#17313a'; g.font = 'bold 12px Segoe UI, sans-serif'; g.textAlign = 'center';
    g.fillText('IRMAK', (cx0 + cx1) / 2, LH - 18); g.fillText('TAŞKIN YATAĞI', 495, LH - 18);
  },
  // Yandan kesit: eğimi ayarlanan yamaç, üstünde toprak örtüsü, ağaçlar ve ev
  heyelan(g, v, res, t) {
    const ang = { az: 0.2, orta: 0.4, dik: 0.6 }[v.egim], wet = v.su === 'islak';
    g.fillStyle = wet ? '#8fa2b3' : '#bcd6ea'; g.fillRect(0, 0, LW, LH);
    const x0 = 90, y0 = LH - 40, L = 380, x1 = x0 + L * Math.cos(ang), y1 = y0 - L * Math.sin(ang);
    g.fillStyle = '#8d877a'; g.beginPath(); g.moveTo(0, y0); g.lineTo(x0, y0); g.lineTo(x1, y1); g.lineTo(LW, y1); g.lineTo(LW, LH); g.lineTo(0, LH); g.fill();
    const slide = res.kotu ? Math.max(0, (t - 0.45) / 0.55) : 0, d = slide * slide * 120;
    g.save();
    g.translate(x0, y0); g.rotate(-ang);
    if (res.kotu && t >= 1) { // kayma izi
      g.fillStyle = '#6b5a44'; g.fillRect(40, -4, L - 80, 4);
    }
    g.translate(-d, 0);
    g.fillStyle = wet ? '#6e5236' : '#a8845a'; g.fillRect(40, -16, L - 80, 16);
    g.fillStyle = v.ortu === 'agacli' ? '#6fa34d' : wet ? '#7d6a48' : '#b79a6a'; g.fillRect(40, -20, L - 80, 5);
    if (v.ortu === 'agacli') for (let x = 70; x < L - 60; x += 46) {
      if (Math.abs(x - 210) < 30) continue;
      g.save(); g.translate(x, -18); g.rotate(ang + slide * 0.5); tree(g, 0, 0);
      g.strokeStyle = '#6b4a2e'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, 0); g.lineTo(-7, 20); g.moveTo(0, 0); g.lineTo(6, 22); g.moveTo(0, 0); g.lineTo(0, 24); g.stroke();
      g.restore();
    }
    g.save(); g.translate(210, -19); g.rotate(ang + slide * 0.9); house(g, 0, 0); g.restore();
    g.restore();
    if (wet && t > 0 && t < 1) rain(g, 90, t, 'rgba(70,110,160,.8)');
    if (!res.kotu && res.seviye >= 0.66 && t > 0.4 && t < 1) { // zorlanma: çatlak
      g.strokeStyle = '#3a2c1c'; g.lineWidth = 2; g.beginPath(); g.moveTo(x1 - 70, y1 + 28); g.lineTo(x1 - 62, y1 + 40); g.lineTo(x1 - 68, y1 + 50); g.stroke();
    }
    g.fillStyle = '#17313a'; g.font = 'bold 12px Segoe UI, sans-serif'; g.textAlign = 'left';
    g.fillText('ANA KAYA', 16, LH - 12); g.fillText(wet ? 'TOPRAK: ISLAK' : 'TOPRAK: KURU', 14, 20);
  },
};

export function lab(spec) {
  return new Promise((resolve) => {
    const body = actOpen(spec.baslik, spec.giris);
    const wrap = el('div', 'lab-wrap'), left = el('div', 'lab-left'), right = el('div', 'lab-right');
    const cv = el('canvas', 'lab-canvas'); cv.width = LW; cv.height = LH;
    const out = el('p', 'lab-out', 'Değişkenleri seç ve deneyi başlat.');
    const g = cv.getContext('2d'), v = {}, trials = [];
    let running = false;
    const draw = (res, t) => LABDRAW[spec.cizim](g, v, res, t);
    for (const d of spec.degiskenler) {
      const row = el('div', 'lab-var');
      row.appendChild(el('span', '', d.ad));
      const opts = el('div', 'lab-opts');
      d.secenekler.forEach(([val, ad], i) => {
        const b = el('button', i ? '' : 'on', ad);
        if (!i) v[d.key] = val;
        b.onclick = () => {
          if (running) return;
          v[d.key] = val;
          [...opts.children].forEach((c) => c.classList.toggle('on', c === b));
          draw(spec.sim(v), 0);
        };
        opts.appendChild(b);
      });
      row.appendChild(opts); right.appendChild(row);
    }
    const run = el('button', 'lab-run', '▶ Deneyi başlat');
    const goals = el('ul', 'lab-goals');
    const goalEls = spec.hedefler.map((h) => { const li = el('li', '', h.metin); goals.appendChild(li); return li; });
    run.onclick = () => {
      if (running) return;
      running = true; run.disabled = true;
      const res = spec.sim(v), t0 = performance.now();
      out.textContent = 'Deney sürüyor…';
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / 3200);
        draw(res, t);
        if (t < 1) return requestAnimationFrame(tick);
        running = false; run.disabled = false;
        trials.push({ v: { ...v }, kotu: res.kotu });
        out.textContent = `Deneme ${trials.length}: ${res.sonuc}`;
        out.className = 'lab-out ' + (res.kotu ? 'bad' : 'good');
        const done = spec.hedefler.map((h, i) => { const ok = h.test(trials); goalEls[i].classList.toggle('done', ok); return ok; });
        if (done.every(Boolean)) { show(run, false); actFinish(spec.bitis, resolve, { trials }); }
      };
      requestAnimationFrame(tick);
    };
    left.append(cv, out); right.append(run, goals);
    wrap.append(left, right); body.appendChild(wrap);
    draw(spec.sim(v), 0);
  });
}

// 7) Planlama masası: her öğe için haritada yer seç; güvenlik, erişim ve bütçe birlikte değerlendirilir
export function planBoard(spec, buildings) {
  return new Promise((resolve) => {
    if (!base) buildBase(buildings);
    if (!layers) buildLayers();
    const body = actOpen('Planlama masası: Nereye ne kurulmalı?',
      'Sağdan bir öğe seç, sonra haritada kurulacağı yere dokun. Yerini değiştirmek için tekrar seçip başka yere dokun.');
    const wrap = el('div', 'layer-wrap'), left = el('div', 'layer-left'), right = el('div', 'layer-right');
    const cv = el('canvas', 'act-canvas plan-canvas'); cv.width = cv.height = MAP;
    const g = cv.getContext('2d'), plan = {}, rows = {};
    let active = spec.ogeler[0].key, risk = true, deneme = 0, checked = false, bitti = false;
    const riskBtn = el('button', 'layer-btn on', 'Risk katmanı');
    riskBtn.onclick = () => { risk = !risk; riskBtn.classList.toggle('on', risk); draw(); };
    const budget = el('div', 'plan-budget'), check = el('button', '', 'Planı değerlendir');
    const draw = () => {
      g.drawImage(base, 0, 0);
      if (risk) g.drawImage(layers.risk, 0, 0, MAP, MAP);
      for (const o of spec.ogeler) if (plan[o.key]) planMark(g, { ...o, ...plan[o.key] }, markScale(cv));
      mapFurniture(g);
    };
    const sync = () => {
      const r = spec.evaluate(plan, buildings);
      for (const o of spec.ogeler) {
        const row = rows[o.key], e = r.ogeler[o.key];
        row.classList.toggle('on', o.key === active);
        row.querySelector('.plan-cost').textContent = plan[o.key] ? `maliyet ${e.maliyet}` : 'yer seçilmedi';
        row.classList.toggle('right', checked && e.ok); row.classList.toggle('wrong', checked && !e.ok);
        row.querySelector('.plan-why').textContent = checked ? (e.ok ? '✅ ' : '❌ ') + e.neden : '';
      }
      budget.textContent = `Bütçe: ${r.butce} / ${r.limit}`;
      budget.classList.toggle('over', !r.butceOk);
      check.disabled = spec.ogeler.some((o) => !plan[o.key]);
      return r;
    };
    for (const o of spec.ogeler) {
      const row = el('div', 'plan-row');
      const dot = el('b', '', o.harf); dot.style.background = o.renk;
      row.append(dot, el('span', 'plan-name', o.ad), el('span', 'plan-cost'), el('div', 'plan-why'));
      row.onclick = () => { if (bitti) return; active = o.key; sync(); };
      rows[o.key] = row; right.appendChild(row);
    }
    cv.onclick = (e) => {
      if (bitti) return;
      const [px, py] = canvasPos(cv, e);
      plan[active] = { x: px / MAP * WORLD - HALF, z: py / MAP * WORLD - HALF };
      checked = false;
      const next = spec.ogeler.find((o) => !plan[o.key]);
      if (next) active = next.key;
      draw(); sync();
    };
    check.onclick = () => {
      deneme++; checked = true;
      const r = sync();
      if (!r.gecti) {
        show($('act-feedback'));
        $('act-feedback').textContent = (r.butceOk ? '' : `Bütçe aşıldı (${r.butce} / ${r.limit}). Eğimli ya da merkeze uzak yerler pahalıdır; daha uygun yerler dene. `) +
          'Kırmızı satırlardaki açıklamalara bak, yerleri düzelt ve planı yeniden değerlendir.';
        return;
      }
      bitti = true; show(check, false);
      actFinish(`Plan onaylandı! Bütçe: ${r.butce} / ${r.limit}. Yapılar düşük riskli yerlerde, taşkın yatağı park, dik yamaç ağaçlık.`, resolve, { plan, deneme, butce: r.butce });
    };
    left.append(riskBtn, cv); right.append(budget, check);
    wrap.append(left, right); body.appendChild(wrap);
    draw(); sync();
  });
}

// 8) Afiş: başlık yaz, doğru mesajları seç, renk seç; afiş tuvalde oluşur ve indirilebilir
function wrapText(g, text, x, y, maxW, lh) {
  let line = '';
  for (const w of text.split(' ')) {
    if (g.measureText(line + w).width > maxW && line) { g.fillText(line.trim(), x, y); y += lh; line = ''; }
    line += w + ' ';
  }
  g.fillText(line.trim(), x, y);
  return y + lh;
}
function drawPoster(cv, { baslik, mesajlar, renk, imza }) {
  const g = cv.getContext('2d'), W = cv.width, H = cv.height;
  g.fillStyle = '#f6efdc'; g.fillRect(0, 0, W, H);
  g.fillStyle = renk; g.fillRect(0, 0, W, 150);
  g.fillStyle = '#fff'; g.font = 'bold 40px Segoe UI, sans-serif'; g.textAlign = 'center';
  wrapText(g, baslik, W / 2, 68, W - 60, 46);
  // resim: yamaçta ağaçlar, güvenli yerde ev, aşağıda ırmak
  const y0 = 170;
  g.fillStyle = '#cfe6f5'; g.fillRect(30, y0, W - 60, 190);
  g.fillStyle = '#6fa34d'; g.beginPath(); g.moveTo(30, y0 + 70); g.lineTo(W * 0.55, y0 + 150); g.lineTo(W - 30, y0 + 150); g.lineTo(W - 30, y0 + 190); g.lineTo(30, y0 + 190); g.fill();
  for (let x = 60; x < W * 0.5; x += 44) tree(g, x, y0 + 74 + (x - 30) * 0.2, 1.1);
  house(g, W * 0.66, y0 + 150);
  g.fillStyle = '#3d7fd0'; g.fillRect(W * 0.8, y0 + 150, W * 0.2 - 30, 40);
  g.strokeStyle = renk; g.lineWidth = 4; g.strokeRect(30, y0, W - 60, 190);
  let y = y0 + 240;
  g.textAlign = 'left';
  mesajlar.forEach((m, i) => {
    g.fillStyle = renk; g.beginPath(); g.arc(52, y - 8, 17, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 20px Segoe UI, sans-serif'; g.textAlign = 'center'; g.fillText(String(i + 1), 52, y - 1);
    g.fillStyle = '#17313a'; g.font = 'bold 22px Segoe UI, sans-serif'; g.textAlign = 'left';
    y = wrapText(g, m, 82, y, W - 115, 28) + 22;
  });
  g.fillStyle = renk; g.fillRect(0, H - 54, W, 54);
  g.fillStyle = '#fff'; g.font = 'bold 15px Segoe UI, sans-serif'; g.textAlign = 'center';
  g.fillText(`Afet anında 112'yi ara  ·  Hazırlayan: ${imza}`, W / 2, H - 22);
}

export function poster(spec, imza) {
  return new Promise((resolve) => {
    const body = actOpen('Afet farkındalık afişini hazırla',
      `Afişine bir başlık yaz, ${spec.kacMesaj} doğru mesaj ve bir renk seç. Dikkat: listede yanlış bilgiler de var!`);
    const wrap = el('div', 'lab-wrap'), left = el('div', 'poster-left'), right = el('div', 'lab-right');
    const cv = el('canvas', 'poster-canvas'); cv.width = 480; cv.height = 680;
    const title = el('input', 'poster-title'); title.maxLength = 34; title.placeholder = spec.varsayilanBaslik;
    const chips = el('div', 'poster-msgs'), colors = el('div', 'lab-opts'), check = el('button', '', 'Afişi tamamla'), why = el('p', 'act-note', '');
    const dl = el('button', 'lab-run hidden', '⬇ Afişi indir (resim)');
    const sel = new Set();
    let renk = spec.renkler[0][0], deneme = 0, bitti = false;
    const draw = () => drawPoster(cv, { baslik: title.value.trim() || spec.varsayilanBaslik, renk, imza, mesajlar: spec.mesajlar.filter((_, i) => sel.has(i)).map((x) => x.m) });
    title.oninput = draw;
    spec.mesajlar.forEach((x, i) => {
      const c = el('button', 'poster-msg', x.m);
      c.onclick = () => {
        if (bitti) return;
        if (sel.has(i)) sel.delete(i); else if (sel.size < spec.kacMesaj) sel.add(i);
        c.classList.remove('wrong');
        [...chips.children].forEach((b, k) => b.classList.toggle('on', sel.has(k)));
        check.disabled = sel.size !== spec.kacMesaj;
        draw();
      };
      chips.appendChild(c);
    });
    spec.renkler.forEach(([hex, ad], i) => {
      const b = el('button', i ? '' : 'on', ad);
      b.style.borderBottom = `5px solid ${hex}`;
      b.onclick = () => { renk = hex; [...colors.children].forEach((c) => c.classList.toggle('on', c === b)); draw(); };
      colors.appendChild(b);
    });
    check.disabled = true;
    check.onclick = () => {
      deneme++;
      const bad = [...sel].filter((i) => !spec.mesajlar[i].ok);
      if (bad.length) {
        bad.forEach((i) => chips.children[i].classList.add('wrong'));
        why.textContent = '❌ ' + bad.map((i) => spec.mesajlar[i].neden).join(' ') + ' Bu mesajı çıkar, yerine doğru bir bilgi seç.';
        return;
      }
      bitti = true; title.disabled = true; why.textContent = '';
      show(check, false); show(dl);
      actFinish('Afişin hazır! İndirip yazdırabilir, okulunda ya da mahallende asabilirsin.', resolve,
        { baslik: title.value.trim() || spec.varsayilanBaslik, mesajlar: [...sel].map((i) => spec.mesajlar[i].m), renk, deneme });
    };
    dl.onclick = () => cv.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'afet_afisim.png'; a.click();
      URL.revokeObjectURL(a.href);
    });
    left.appendChild(cv);
    right.append(el('span', 'poster-h', 'Başlık'), title, el('span', 'poster-h', `Mesajlar (${spec.kacMesaj} tane seç)`), chips, el('span', 'poster-h', 'Renk'), colors, why, check, dl);
    wrap.append(left, right); body.appendChild(wrap);
    draw();
  });
}

// ---------- Defter görünümü ----------
export function showNotebook(entries) {
  const box = $('notebook-body');
  box.innerHTML = '';
  if (!entries.length) box.appendChild(el('p', 'muted', 'Defterin henüz boş. Soruları yanıtladıkça ve görevleri yaptıkça notların burada birikecek.'));
  for (const n of entries) {
    const item = el('div', 'note');
    item.append(el('div', 'label', n.b), el('p', '', n.m));
    box.appendChild(item);
  }
  show($('notebook'));
}

// ---------- Bölüm sonu ----------
export function showEnd({ no, ad, rozet, simge, ozet, sonraki, yakinda }) {
  $('end-label').textContent = `${no}. BÖLÜM TAMAMLANDI`;
  $('end-title').textContent = ad;
  $('end-icon').textContent = simge;
  $('end-badge').textContent = rozet;
  $('end-summary').textContent = ozet;
  $('end-soon').textContent = yakinda || '';
  $('end-free').textContent = sonraki ? `${sonraki.no}. bölüme başla: ${sonraki.ad}` : 'Şehri gezmeye devam et';
  show($('end'));
}
