import { WORLD, HALF, M_PER_UNIT, terrainHeight, PLACES, riverX, coastZ } from './terrain.js';

const $ = (id) => document.getElementById(id);
const show = (el, on = true) => el.classList.toggle('hidden', !on);

// ---------- Pusula şeridi ----------
const PX_PER_DEG = 3;
const marks = [];
export function initCompass() {
  const strip = $('compass-strip');
  const names = { 0: 'K', 45: 'KD', 90: 'D', 135: 'GD', 180: 'G', 225: 'GB', 270: 'B', 315: 'KB' };
  for (let deg = 0; deg < 360; deg += 15) {
    const el = document.createElement(names[deg] ? 'span' : 'i');
    if (names[deg]) {
      el.textContent = names[deg];
      if (deg % 90) el.className = 'minor';
      if (deg === 0) el.className = 'north';
    }
    strip.appendChild(el);
    marks.push({ deg, el });
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
export function setHud({ gorev, parca, puan }) {
  $('quest-text').textContent = gorev;
  $('pieces').textContent = `🗺️ ${parca}/4`;
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
      const b = document.createElement('button');
      b.textContent = `${'ABCD'[k]})  ${text}`;
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

let base = null;
function buildBase(buildings) {
  base = document.createElement('canvas');
  base.width = base.height = MAP;
  const g = base.getContext('2d'), N = 320, img = g.createImageData(N, N);
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
  g.fillStyle = '#7d7d86';
  for (const b of buildings) g.fillRect(toPx(b.x - b.w / 2), toPx(b.z - b.d / 2), (b.w / WORLD) * MAP, (b.d / WORLD) * MAP);
}

function label(g, text, x, z, opt = {}) {
  g.font = `${opt.italic ? 'italic ' : ''}${opt.bold === false ? '' : 'bold '}${opt.size || 13}px Segoe UI, sans-serif`;
  g.textAlign = 'center';
  g.lineWidth = 3; g.strokeStyle = 'rgba(255,255,255,.85)';
  g.strokeText(text, toPx(x), toPx(z));
  g.fillStyle = opt.color || '#17313a';
  g.fillText(text, toPx(x), toPx(z));
}

// revealed: [minX,maxX,minZ,maxZ] dizileri; found: bulunan yer anahtarları
export function drawMap({ buildings, revealed, found, player, heading }) {
  if (!base) buildBase(buildings);
  const cv = $('map-canvas'), g = cv.getContext('2d');
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
  g.restore();

  // Oyuncu oku
  g.save();
  g.translate(toPx(player.x), toPx(player.z));
  g.rotate(heading);
  g.fillStyle = '#e0392b'; g.strokeStyle = '#fff'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(0, -12); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath();
  g.fill(); g.stroke();
  g.restore();

  // Kuzey oku ve ölçek çubuğu
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
