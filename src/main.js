import * as THREE from 'three';
import './style.css';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Drone } from './drone.js';
import * as ui from './ui.js';
import { STEPS, CHAPTERS, NEXT_CHAPTER, ISARET, KOMSU, CLOZE, FARKLAR } from './story.js';
import { Log } from './log.js';
import { PLACES, M_PER_UNIT } from './terrain.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const qp = new URLSearchParams(location.search);
// Dokunmatik cihaz: sanal joystick ve düğmeler açılır, grafik yükü azaltılır
const isTouch = matchMedia('(pointer: coarse)').matches || qp.has('dokunmatik');
document.body.classList.toggle('touch', isTouch);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
let pixelRatio = Math.min(devicePixelRatio, isTouch ? 1.5 : 2);
renderer.setPixelRatio(pixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.5;

const camera = new THREE.PerspectiveCamera(60, 1, 0.3, 9000);
const world = buildWorld({ lowGfx: isTouch });
const player = new Player(world.scene, camera, world.colliders);
const drone = new Drone(camera, player);
ui.initCompass();

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- Durum ----------
let mode = 'title'; // title | play | busy | map | menu | defter | end
let state = fresh();
function fresh() {
  return { step: 0, score: 0, correct: 0, asked: 0, time: 0, code: '', x: PLACES.start.x, z: PLACES.start.z, fotolar: [], defter: [] };
}
const step = () => STEPS[state.step];
const pieces = () => STEPS.slice(0, state.step).filter((s) => s.tur === 'parca').length;
const note = (b, m) => state.defter.push({ b, m });
const log = (entry) => Log.add({ ogrenci: state.code, ...entry });

function refresh() {
  const s = step(), ch2 = s ? s.bolum === 2 : true;
  let gorev = s ? s.gorev : 'Görevler tamamlandı! Şehri özgürce gez.';
  if (s && s.tur === 'drone') {
    gorev += ` (${state.fotolar.length}/${s.hedefler.length}). ` +
      (drone.active ? 'Hedefin üstüne gelince fotoğraf çek.' : `Drone'u uçur: ${isTouch ? '🛸 düğmesi' : 'F tuşu'}.`);
  }
  ui.setHud({ gorev, sayac: ch2 ? `📷 ${state.fotolar.length}/3` : `🗺️ ${pieces()}/4`, puan: state.score });
  world.setTarget(s && s.hedef ? s.hedef : null, !!s && s.tur === 'parca');
  document.body.classList.toggle('has-drone', !!s && s.tur === 'drone');
  document.body.classList.toggle('drone', drone.active);
}
function save() {
  state.x = player.pos.x; state.z = player.pos.z;
  Log.save(state);
}

function begin(saved) {
  state = { ...fresh(), ...(saved || {}) };
  if (!saved) state.code = $('code').value.trim() || 'isimsiz';
  drone.stop();
  player.place(state.x, state.z, 0);
  player.walked = 0;
  ui.showPanel('title', false); ui.showPanel('hud');
  refresh();
  mode = 'play';
  if (!saved) {
    log({ olay: 'basla', secilen: isTouch ? 'dokunmatik' : 'klavye' });
    ui.toast(isTouch && innerHeight > innerWidth
      ? 'Daha geniş görüş için telefonu yatay çevir. Sol alttaki çubukla yürü, ekranı sürükleyerek etrafa bak.'
      : isTouch ? 'Sol alttaki çubukla yürü, ekranı sürükleyerek etrafa bak. Hasan Usta iskelede seni bekliyor!'
        : 'Pusulan kuzeyi gösteriyor. İskelenin ucundaki Hasan Usta seni bekliyor!', 8000);
  }
}

// ---------- Girdi ----------
const keys = {};
let dragging = false;
const locked = () => document.pointerLockElement === canvas;
const unlock = () => { if (locked()) document.exitPointerLock(); };

canvas.addEventListener('mousedown', () => {
  if (isTouch) return;
  dragging = true;
  if (mode === 'play' && !locked()) canvas.requestPointerLock?.();
});
addEventListener('mouseup', () => { dragging = false; });
addEventListener('mousemove', (e) => {
  if (mode === 'play' && (locked() || dragging)) player.look(e.movementX, e.movementY);
});
document.addEventListener('pointerlockchange', () => { if (!locked() && mode === 'play') openMenu(); });

// Dokunmatik: ekranı sürükleyerek bakış
let lookId = null, lookX = 0, lookY = 0;
canvas.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'mouse') return;
  lookId = e.pointerId; lookX = e.clientX; lookY = e.clientY;
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerId !== lookId) return;
  if (mode === 'play') player.look((e.clientX - lookX) * 2.4, (e.clientY - lookY) * 2.4);
  lookX = e.clientX; lookY = e.clientY;
});
for (const ev of ['pointerup', 'pointercancel']) canvas.addEventListener(ev, (e) => { if (e.pointerId === lookId) lookId = null; });

// Dokunmatik: sanal joystick
const joy = $('joy'), knob = $('joy-knob');
let joyId = null;
function joyMove(e) {
  const r = joy.getBoundingClientRect(), R = r.width / 2 - 14;
  let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
  const l = Math.hypot(dx, dy);
  if (l > R) { dx *= R / l; dy *= R / l; }
  knob.style.transform = `translate(${dx}px, ${dy}px)`;
  const dead = l < R * 0.15;
  keys.axisR = dead ? 0 : dx / R; keys.axisF = dead ? 0 : -dy / R;
}
joy.addEventListener('pointerdown', (e) => { joyId = e.pointerId; joy.setPointerCapture(joyId); joyMove(e); });
joy.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
for (const ev of ['pointerup', 'pointercancel']) joy.addEventListener(ev, (e) => {
  if (e.pointerId !== joyId) return;
  joyId = null; keys.axisF = keys.axisR = 0; knob.style.transform = '';
});
const jump = $('t-jump');
jump.addEventListener('pointerdown', () => { keys.Space = true; });
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) jump.addEventListener(ev, () => { keys.Space = false; });
const whenPlaying = (fn) => () => { if (mode === 'play') fn(); };
$('t-map').onclick = whenPlaying(() => openMap());
$('t-hint').onclick = whenPlaying(() => hint());
$('t-menu').onclick = whenPlaying(() => openMenu());
$('t-note').onclick = whenPlaying(() => openNotebook());
$('t-drone').onclick = whenPlaying(() => toggleDrone());
$('prompt').onclick = whenPlaying(() => interact());
$('map-close').onclick = () => { if (mode === 'map') closeOverlay('map'); };
$('notebook-close').onclick = () => { if (mode === 'defter') closeOverlay('notebook'); };
addEventListener('contextmenu', (e) => { if (isTouch) e.preventDefault(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

addEventListener('keydown', (e) => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (mode === 'busy' && ['KeyE', 'Enter', 'Space'].includes(e.code)) ui.dialogAdvance();
  else if (mode === 'play') {
    if (e.code === 'KeyE') interact();
    else if (e.code === 'KeyM') openMap();
    else if (e.code === 'KeyH') hint();
    else if (e.code === 'KeyN') openNotebook();
    else if (e.code === 'KeyF') toggleDrone();
    else if (e.code === 'Escape' || e.code === 'KeyP') openMenu();
  } else if (mode === 'map' && ['KeyM', 'Escape'].includes(e.code)) closeOverlay('map');
  else if (mode === 'defter' && ['KeyN', 'Escape'].includes(e.code)) closeOverlay('notebook');
  else if (mode === 'menu' && ['Escape', 'KeyP'].includes(e.code)) closeOverlay('menu');
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

function openMenu() { mode = 'menu'; unlock(); ui.showPanel('menu'); }
function closeOverlay(id) { ui.showPanel(id, false); mode = 'play'; }
function openNotebook() { mode = 'defter'; unlock(); ui.showNotebook(state.defter); }
function openMap() {
  mode = 'map'; unlock();
  const past = STEPS.slice(0, state.step), d = STEPS.find((s) => s.tur === 'drone');
  ui.drawMap({
    buildings: world.buildings,
    revealed: past.filter((s) => s.acar).map((s) => s.acar),
    found: past.filter((s) => s.tur === 'parca').map((s) => s.id),
    pins: d.hedefler.filter((h) => state.fotolar.includes(h.key)),
    player: drone.active ? drone.pos : player.pos, heading: player.heading,
  });
  ui.showPanel('map');
}

function toggleDrone() {
  const s = step();
  if (!s || s.tur !== 'drone') return;
  if (drone.active) drone.stop();
  else { drone.start(); ui.toast('Drone havada! Riskli bir yerin üstüne gelince fotoğraf çek. İnmek için tekrar ' + (isTouch ? '🛸' : 'F') + '.', 6000); }
  refresh();
}
// Drone kamerasının baktığı yerde, henüz fotoğraflanmamış hedef
function droneTarget() {
  const s = step();
  if (!drone.active || !s || s.tur !== 'drone') return null;
  const a = drone.aim();
  return s.hedefler.find((h) => !state.fotolar.includes(h.key) && Math.hypot(h.x - a.x, h.z - a.z) < 34) || null;
}

const DIRS = ['KUZEY', 'KUZEYDOĞU', 'DOĞU', 'GÜNEYDOĞU', 'GÜNEY', 'GÜNEYBATI', 'BATI', 'KUZEYBATI'];
function bearing(from, to) {
  const dx = to.x - from.x, dz = to.z - from.z;
  const deg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return { dist: Math.hypot(dx, dz), yon: DIRS[Math.round(deg / 45) % 8] };
}
function targetInfo() {
  const s = step();
  if (!s || !s.hedef) return null;
  return { s, ...bearing(player.pos, s.hedef) };
}
function hint() {
  const s = step();
  if (!s) return;
  if (s.tur === 'drone') {
    const left = s.hedefler.filter((h) => !state.fotolar.includes(h.key));
    const b = bearing(drone.active ? drone.pos : player.pos, left[0]);
    ui.toast(`İpucu: Aradığın yer: ${left[0].ipucu}. ${b.yon} yönünde, yaklaşık ${Math.round(b.dist * M_PER_UNIT / 50) * 50} metre.`, 7000);
  } else {
    const t = targetInfo();
    ui.toast(`İpucu: Hedef ${t.yon} yönünde, yaklaşık ${Math.round(t.dist * M_PER_UNIT / 50) * 50} metre uzakta.`);
  }
  log({ olay: 'ipucu', adim: s.id });
}

async function ask(s, soru) {
  const r = await ui.quiz(soru);
  log({ olay: 'yanit', soru: soru.id, beceri: soru.beceri, secilen: r.secilen, dogru: r.dogru ? 1 : 0, sure_sn: r.sure, adim: s.id });
  state.asked++;
  if (r.dogru) { state.score += 100; state.correct++; }
  note(soru.beceri, soru.aciklama);
}

async function runActs(s, names) {
  for (const name of names) {
    if (name === 'isaretle') {
      const res = await ui.markOnMap(ISARET, world.buildings);
      res.forEach((r, i) => log({ olay: 'isaretle', soru: 'B1E1-' + (i + 1), secilen: r.uzaklik + ' m', dogru: r.dogru ? 1 : 0, adim: s.id, metin: r.metin }));
      state.score += res.filter((r) => r.dogru).length * 50;
    } else if (name === 'komsu') {
      const r = await ui.placeNeighbors(KOMSU);
      log({ olay: 'komsu', soru: 'B1E2', secilen: JSON.stringify(r.yanit), dogru: `${r.dogru}/${r.toplam}`, adim: s.id });
      state.score += r.dogru * 20;
      note('Ordu\'nun komşuları', KOMSU.aciklama);
    } else if (name === 'karsilastir') {
      const r = await ui.compare(FARKLAR, world.buildings);
      log({ olay: 'karsilastir', soru: 'B2E1', secilen: r.yanlis + ' yanlış dokunuş', adim: s.id });
      state.score += Math.max(30, 90 - r.yanlis * 10);
      note('Kırk yılda değişenler', FARKLAR.map((f) => f.metin).join(' '));
    } else {
      const spec = CLOZE[name], r = await ui.cloze(spec);
      log({ olay: 'ozet', soru: name, dogru: `${r.dogru}/${r.toplam}`, adim: s.id, metin: r.serbest });
      state.score += r.dogru * 15 + (r.serbest.length > 15 ? 30 : 0);
      note(spec.defter, r.cumle + (r.serbest ? ' ✍️ Kendi cümlem: ' + r.serbest : ''));
    }
    refresh();
  }
}

async function finishStep(s) {
  if (s.sonra) await ui.dialog(s.sonra);
  if (s.etkinlikler) await runActs(s, s.etkinlikler);
  if (s.kapanis) await ui.dialog(s.kapanis);
  state.step++;
  save(); refresh();
  if (s.bolumSonu) showEnd(s.bolumSonu); else mode = 'play';
}

async function interact() {
  const s = step();
  if (!s) return;
  if (s.tur === 'drone') return photo(s);
  const t = targetInfo();
  if (!t || t.dist > 6) return;
  mode = 'busy'; unlock(); ui.setPrompt('');
  await ui.dialog(s.once);
  if (s.onEtkinlik) await runActs(s, s.onEtkinlik);
  if (s.soru) await ask(s, s.soru);
  await finishStep(s);
}

async function photo(s) {
  const h = droneTarget();
  if (!h) return;
  mode = 'busy'; unlock(); ui.setPrompt('');
  ui.flash();
  log({ olay: 'fotograf', adim: h.key });
  await ui.dialog([['Sen', `Fotoğraf çekildi: ${h.ad}.`]]);
  await ask(s, h.soru);
  state.fotolar.push(h.key);
  save(); refresh();
  if (state.fotolar.length < s.hedefler.length) {
    ui.toast(`Güzel! Kalan riskli yer: ${s.hedefler.length - state.fotolar.length}. Haritana işaretlendi.`);
    mode = 'play';
    return;
  }
  drone.stop(); refresh();
  await finishStep(s);
}

function showEnd(no) {
  mode = 'end';
  const ch = CHAPTERS[no - 1], sonraki = step() ? CHAPTERS[no] : null;
  log({ olay: 'bolum_bitti', soru: 'B' + no, sure_sn: Math.round(state.time), secilen: state.score + ' puan' });
  ui.showEnd({
    ...ch, sonraki, yakinda: sonraki ? '' : NEXT_CHAPTER,
    ozet: `Puan: ${state.score} · Doğru yanıt: ${state.correct}/${state.asked} · Süre: ${Math.max(1, Math.round(state.time / 60))} dk · ` +
      `Yürünen yol: ${(player.walked * M_PER_UNIT / 1000).toFixed(1)} km`,
  });
}

$('start').onclick = () => begin(null);
$('continue').onclick = () => begin(Log.load());
$('menu-resume').onclick = () => closeOverlay('menu');
$('menu-csv').onclick = $('end-csv').onclick = () => Log.download();
$('menu-restart').onclick = () => { Log.clearSave(); ui.showPanel('menu', false); begin(null); };
$('end-free').onclick = () => closeOverlay('end');
if (Log.load()) $('continue').classList.remove('hidden');

// Deneme parametreleri: ?oto=1&adim=2&x=..&z=..&yon=90&harita=1&etkinlik=komsu&drone=1&son=1
if (qp.has('oto')) {
  begin(null);
  state.step = +qp.get('adim') || 0;
  if (qp.has('x')) player.place(+qp.get('x'), +qp.get('z'), (+qp.get('yon') || 0) * Math.PI / 180);
  refresh();
  if (qp.has('harita')) openMap();
  if (qp.has('etkinlik')) { mode = 'busy'; runActs(step() || STEPS[0], [qp.get('etkinlik')]).then(() => { mode = 'play'; }); }
  if (qp.has('drone')) { drone.start(); drone.pos.set(+qp.get('x') || 0, 80, +qp.get('z') || 0); refresh(); }
  if (qp.has('defter')) { note('Yön bulma', STEPS[0].soru.aciklama); openNotebook(); }
  if (qp.has('son')) showEnd(+qp.get('son'));
}

// ---------- Döngü ----------
const clock = new THREE.Clock();
let titleAngle = 0, saveTimer = 0, fpsTime = 0, fpsFrames = 0;
// Cihaz zorlanıyorsa önce çözünürlüğü, sonra gölgeleri düşür
function adaptQuality(rawDt) {
  fpsTime += rawDt; fpsFrames++;
  if (fpsTime < 4) return;
  const fps = fpsFrames / fpsTime;
  fpsTime = fpsFrames = 0;
  if (fps > 26) return;
  if (pixelRatio > 1) { pixelRatio = Math.max(1, pixelRatio - 0.5); renderer.setPixelRatio(pixelRatio); resize(); }
  else if (world.sun.castShadow) world.sun.castShadow = false;
}
const origin = new THREE.Vector3();
renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
  if (document.visibilityState === 'visible' && rawDt < 1) adaptQuality(rawDt);
  if (mode === 'title') {
    // Açılışta şehrin üzerinde ağır bir tur
    titleAngle += dt * 0.05;
    camera.position.set(40 + Math.sin(titleAngle) * 300, 95, -40 - Math.cos(titleAngle) * 300);
    camera.lookAt(-30, 20, 40);
    world.update(dt, t, origin);
  } else {
    const playing = mode === 'play';
    player.update(dt, keys, playing && !drone.active);
    if (drone.active) drone.update(dt, playing ? keys : {});
    world.update(dt, t, drone.active ? drone.focus : player.pos, drone.active);
    ui.updateCompass(player.headingDeg);
    const ti = targetInfo();
    world.showMarker(!!ti && (ti.s.tur !== 'parca' || ti.dist < 120));
    if (playing) {
      state.time += dt;
      const key = isTouch ? '' : 'E — ';
      let prompt = '';
      if (drone.active) prompt = droneTarget() ? key + '📷 Fotoğraf çek' : '';
      else if (ti && ti.dist < 6) prompt = key + (ti.s.tur === 'npc' ? 'Konuş' : ti.s.etiket || 'Harita parçasını al');
      ui.setPrompt(prompt);
      if ((saveTimer += dt) > 10) { saveTimer = 0; save(); }
    }
  }
  renderer.render(world.scene, camera);
});
