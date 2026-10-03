// Oyunun bütün sesleri tarayıcıda üretilir (ses dosyası yok): müzik, deniz, yağmur, adım, arayüz sesleri.
const KEY = 'pusula_ses';
let ctx = null, master, music, noiseBuf, sea, rainG, droneG, timer = null, nextNote = 0, beat = 0;
let muted = false;
try { muted = localStorage.getItem(KEY) === '0'; } catch { /* depolama kapalı olabilir */ }

function loopNoise(type, freq, q = 0.7) {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  src.buffer = noiseBuf; src.loop = true;
  f.type = type; f.frequency.value = freq; f.Q.value = q;
  g.gain.value = 0;
  src.connect(f).connect(g).connect(master);
  src.start();
  return g;
}

function tone(freq, t0, dur, { type = 'sine', vol = 0.2, out = master } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(out);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function burst(dur, freq, vol, type = 'lowpass') {
  const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
  src.buffer = noiseBuf; src.loop = true;
  f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random() * 1.5); src.stop(t + dur + 0.05);
}

// Sakin, tekrarlayan bir ezgi: dört akor, her akorda sekiz sekizlik nota
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
const CHORDS = [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]]; // La minör, Fa, Do, Sol
const PATTERN = [0, 2, 1, 2, 0, 1, 2, 1];
function schedule() {
  while (nextNote < ctx.currentTime + 0.4) {
    const chord = CHORDS[Math.floor(beat / 8) % 4], step = beat % 8;
    if (step === 0) for (const n of chord) tone(hz(n - 12), nextNote, 2.9, { vol: 0.045, out: music });
    if (step !== 3 || beat % 16 > 8) tone(hz(chord[PATTERN[step]] + 12), nextNote, 0.55, { type: 'triangle', vol: 0.06, out: music });
    nextNote += 0.36; beat++;
  }
}

export const Sfx = {
  get muted() { return muted; },
  // İlk kullanıcı dokunuşunda çağrılmalı (tarayıcılar sesi ancak o zaman başlatır)
  init() {
    if (ctx) { ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(ctx.destination);
    music = ctx.createGain(); music.gain.value = 0.9; music.connect(master);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    sea = loopNoise('lowpass', 520);
    rainG = loopNoise('bandpass', 3800, 0.35);
    droneG = ctx.createGain(); droneG.gain.value = 0; droneG.connect(master);
    for (const f of [118, 121.5, 236]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; const lp = ctx.createBiquadFilter(); lp.frequency.value = 700; o.connect(lp).connect(droneG); o.start(); }
    nextNote = ctx.currentTime + 0.3;
    timer = setInterval(schedule, 150);
  },
  toggle() {
    muted = !muted;
    try { localStorage.setItem(KEY, muted ? '0' : '1'); } catch { /* yok say */ }
    if (ctx) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.05);
    return muted;
  },
  // Her karede: ortam seslerinin düzeyi (0-1)
  frame(t, dt, { deniz = 0, yagmur = 0, drone = false }) {
    if (!ctx) return;
    const now = ctx.currentTime;
    sea.gain.setTargetAtTime(deniz * (0.10 + 0.05 * Math.sin(t * 0.8)), now, 0.3);
    rainG.gain.setTargetAtTime(yagmur * 0.22, now, 0.4);
    droneG.gain.setTargetAtTime(drone ? 0.035 : 0, now, 0.2);
    music.gain.setTargetAtTime(yagmur > 0.3 ? 0.35 : 0.9, now, 0.8);
    if (yagmur > 0.5 && Math.random() < dt / 16) burst(2.8, 160, 0.55); // gök gürültüsü
  },
  click() { if (ctx) tone(660, ctx.currentTime, 0.07, { type: 'triangle', vol: 0.08 }); },
  step(alt) { if (ctx) burst(0.07, alt ? 700 : 900, 0.09); },
  right() { if (ctx) [72, 76, 79].forEach((n, i) => tone(hz(n), ctx.currentTime + i * 0.09, 0.3, { type: 'triangle', vol: 0.16 })); },
  wrong() { if (ctx) [58, 55].forEach((n, i) => tone(hz(n), ctx.currentTime + i * 0.16, 0.3, { type: 'sawtooth', vol: 0.07 })); },
  pickup() { if (ctx) [76, 79, 83, 88].forEach((n, i) => tone(hz(n), ctx.currentTime + i * 0.07, 0.4, { vol: 0.15 })); },
  fanfare() { if (ctx) [60, 64, 67, 72, 76, 79, 84].forEach((n, i) => tone(hz(n), ctx.currentTime + i * 0.13, i === 6 ? 1.2 : 0.35, { type: 'triangle', vol: 0.18 })); },
  shutter() { if (ctx) { burst(0.05, 5000, 0.3, 'highpass'); setTimeout(() => ctx && burst(0.06, 3000, 0.25, 'highpass'), 90); } },
  alarm() { if (ctx) for (let i = 0; i < 4; i++) tone(880, ctx.currentTime + i * 0.28, 0.16, { type: 'square', vol: 0.09 }); },
  talk() { if (ctx) tone(300 + Math.random() * 120, ctx.currentTime, 0.06, { type: 'triangle', vol: 0.06 }); },
};
