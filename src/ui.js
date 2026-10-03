import { WORLD, HALF, M_PER_UNIT, terrainHeight, PLACES, RISKS, riverX, coastZ, fbm } from './terrain.js';

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

function label(g, text, x, z, opt = {}) {
  g.font = `${opt.italic ? 'italic ' : ''}bold ${opt.size || 13}px Segoe UI, sans-serif`;
  g.textAlign = 'center';
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.85)';
  g.strokeText(text, toPx(x), toPx(z));
  g.fillStyle = opt.color || '#17313a';
  g.fillText(text, toPx(x), toPx(z));
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
export function drawMap({ buildings, revealed, found, player, heading, pins = [] }) {
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
