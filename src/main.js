import * as THREE from 'three';
import './style.css';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import * as ui from './ui.js';
import { STEPS } from './story.js';
import { Log } from './log.js';
import { PLACES, M_PER_UNIT } from './terrain.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
// Dokunmatik cihaz: sanal joystick ve düğmeler açılır, grafik yükü azaltılır
const isTouch = matchMedia('(pointer: coarse)').matches || new URLSearchParams(location.search).has('dokunmatik');
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
ui.initCompass();

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- Durum ----------
let mode = 'title'; // title | play | busy | map | menu | end
let state = fresh();
function fresh() { return { step: 0, score: 0, correct: 0, time: 0, code: '', x: PLACES.start.x, z: PLACES.start.z }; }
const done = () => state.step >= STEPS.length;
const pieces = () => STEPS.slice(0, state.step).filter((s) => s.tur === 'parca').length;

function refresh() {
  const s = STEPS[state.step];
  ui.setHud({ gorev: s ? s.gorev : 'Harita tamamlandı! Şehri özgürce gez.', parca: pieces(), puan: state.score });
  world.setTarget(s ? s.hedef : null, s && s.tur === 'parca');
}
function save() {
  state.x = player.pos.x; state.z = player.pos.z;
  Log.save(state);
}

function begin(saved) {
  state = saved || fresh();
  if (!saved) state.code = $('code').value.trim() || 'isimsiz';
  player.place(state.x, state.z, 0);
  player.walked = 0;
  ui.showPanel('title', false); ui.showPanel('hud');
  refresh();
  mode = 'play';
  if (!saved) {
    Log.add({ ogrenci: state.code, olay: 'basla', secilen: isTouch ? 'dokunmatik' : 'klavye' });
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
$('prompt').onclick = whenPlaying(() => interact());
$('map-close').onclick = () => { if (mode === 'map') closeOverlay('map'); };
addEventListener('contextmenu', (e) => { if (isTouch) e.preventDefault(); });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (mode === 'busy' && ['KeyE', 'Enter', 'Space'].includes(e.code)) ui.dialogAdvance();
  else if (mode === 'play') {
    if (e.code === 'KeyE') interact();
    else if (e.code === 'KeyM') openMap();
    else if (e.code === 'KeyH') hint();
    else if (e.code === 'Escape' || e.code === 'KeyP') openMenu();
  } else if (mode === 'map' && ['KeyM', 'Escape'].includes(e.code)) closeOverlay('map');
  else if (mode === 'menu' && ['Escape', 'KeyP'].includes(e.code)) closeOverlay('menu');
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

function openMenu() { mode = 'menu'; unlock(); ui.showPanel('menu'); }
function closeOverlay(id) { ui.showPanel(id, false); mode = 'play'; }
function openMap() {
  mode = 'map'; unlock();
  const past = STEPS.slice(0, state.step);
  ui.drawMap({
    buildings: world.buildings,
    revealed: past.filter((s) => s.acar).map((s) => s.acar),
    found: past.filter((s) => s.tur === 'parca').map((s) => s.id),
    player: player.pos, heading: player.heading,
  });
  ui.showPanel('map');
}

const DIRS = ['KUZEY', 'KUZEYDOĞU', 'DOĞU', 'GÜNEYDOĞU', 'GÜNEY', 'GÜNEYBATI', 'BATI', 'KUZEYBATI'];
function targetInfo() {
  const s = STEPS[state.step];
  if (!s) return null;
  const dx = s.hedef.x - player.pos.x, dz = s.hedef.z - player.pos.z;
  const deg = (Math.atan2(dx, -dz) * 180 / Math.PI + 360) % 360;
  return { s, dist: Math.hypot(dx, dz), yon: DIRS[Math.round(deg / 45) % 8] };
}
function hint() {
  const t = targetInfo();
  if (!t) return;
  ui.toast(`İpucu: Hedef ${t.yon} yönünde, yaklaşık ${Math.round(t.dist * M_PER_UNIT / 50) * 50} metre uzakta.`);
  Log.add({ ogrenci: state.code, olay: 'ipucu', adim: t.s.id });
}

async function interact() {
  const t = targetInfo();
  if (!t || t.dist > 6) return;
  const s = t.s;
  mode = 'busy'; unlock(); ui.setPrompt('');
  await ui.dialog(s.once);
  const r = await ui.quiz(s.soru);
  Log.add({ ogrenci: state.code, olay: 'yanit', soru: s.soru.id, beceri: s.soru.beceri, secilen: r.secilen, dogru: r.dogru ? 1 : 0, sure_sn: r.sure, adim: s.id });
  if (r.dogru) { state.score += 100; state.correct++; }
  await ui.dialog(s.sonra);
  state.step++;
  save(); refresh();
  if (done()) showEnd(); else mode = 'play';
}

function showEnd() {
  mode = 'end';
  Log.add({ ogrenci: state.code, olay: 'bolum_bitti', sure_sn: Math.round(state.time) });
  $('end-summary').textContent =
    `Puan: ${state.score} · Doğru yanıt: ${state.correct}/${STEPS.length} · Süre: ${Math.max(1, Math.round(state.time / 60))} dk · ` +
    `Yürünen yol: ${(player.walked * M_PER_UNIT / 1000).toFixed(1)} km`;
  ui.showPanel('end');
}

$('start').onclick = () => begin(null);
$('continue').onclick = () => begin(Log.load());
$('menu-resume').onclick = () => closeOverlay('menu');
$('menu-csv').onclick = $('end-csv').onclick = () => Log.download();
$('menu-restart').onclick = () => { Log.clearSave(); ui.showPanel('menu', false); begin(null); };
$('end-free').onclick = () => closeOverlay('end');
if (Log.load()) $('continue').classList.remove('hidden');

// Deneme parametreleri: ?oto=1&adim=2&x=..&z=..&yon=90&harita=1
const qp = new URLSearchParams(location.search);
if (qp.has('oto')) {
  begin(null);
  state.step = +qp.get('adim') || 0;
  if (qp.has('x')) player.place(+qp.get('x'), +qp.get('z'), (+qp.get('yon') || 0) * Math.PI / 180);
  refresh();
  if (qp.has('harita')) openMap();
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
renderer.setAnimationLoop(() => {
  const rawDt = clock.getDelta(), dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
  if (document.visibilityState === 'visible' && rawDt < 1) adaptQuality(rawDt);
  if (mode === 'title') {
    // Açılışta şehrin üzerinde ağır bir tur
    titleAngle += dt * 0.05;
    camera.position.set(40 + Math.sin(titleAngle) * 300, 95, -40 - Math.cos(titleAngle) * 300);
    camera.lookAt(-30, 20, 40);
    world.update(dt, t, new THREE.Vector3(0, 0, 0));
  } else {
    player.update(dt, keys, mode === 'play');
    world.update(dt, t, player.pos);
    ui.updateCompass(player.headingDeg);
    const ti = targetInfo();
    world.showMarker(!!ti && (ti.s.tur === 'npc' || ti.dist < 120));
    if (mode === 'play') {
      state.time += dt;
      const key = isTouch ? '' : 'E — ';
      ui.setPrompt(ti && ti.dist < 6 ? key + (ti.s.tur === 'npc' ? 'Konuş' : 'Harita parçasını al') : '');
      if ((saveTimer += dt) > 10) { saveTimer = 0; save(); }
    }
  }
  renderer.render(world.scene, camera);
});
