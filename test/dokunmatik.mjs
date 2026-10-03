// Dokunmatik kontrollerin kısa testi: joystick, sürükleyerek bakış, düğmeler, konuşma kutusu.
import puppeteer from 'puppeteer-core';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const b = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'], defaultViewport: { width: 844, height: 390, hasTouch: true, isMobile: true } });
const p = await b.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
await p.goto(new URL('../OYUN.html', import.meta.url).href + '?test=1');
await p.evaluate(() => localStorage.clear()); await p.reload(); await sleep(1200);
const G = () => p.evaluate(() => { const o = window.__oyun; return { mode: o.mode, x: o.player.pos.x, z: o.player.pos.z, h: o.player.heading, step: o.state.step }; });
const vis = (q) => p.evaluate((s) => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; }, q);
const center = async (q) => { const r = await (await p.$(q)).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
const out = {};
out.dokunmatikSinifi = await p.evaluate(() => document.body.classList.contains('touch'));
await p.tap('#start'); await sleep(500);
out.basladi = (await G()).mode === 'play';
out.joystickGorunur = await vis('#joy');
// Joystick: yukarı it (kuzeye, iskeleye doğru yürü)
const a = await G(), [jx, jy] = await center('#joy');
await p.touchscreen.touchStart(jx, jy); await p.touchscreen.touchMove(jx, jy - 60); await sleep(2500);
const mid = await G();
out.joystickIleYurume = +(Math.hypot(mid.x - a.x, mid.z - a.z)).toFixed(1) + ' birim (2,5 sn)';
// İkinci parmakla ekranı sürükle: bakış dönmeli
const t2 = await p.touchscreen.touchStart(500, 150); await t2.move(600, 150); await sleep(100); await t2.end();
out.surukleyerekBakis = +((await G()).h - mid.h).toFixed(2) + ' radyan';
await sleep(3500);
await p.touchscreen.touchEnd(); await sleep(300);
const st = await G(); await sleep(500);
out.birakincaDurdu = Math.hypot((await G()).x - st.x, (await G()).z - st.z) < 0.5;
// Düğmeler
await p.tap('#t-map'); await sleep(300); out.haritaAcildi = await vis('#map');
await p.tap('#map-close'); await sleep(200); out.haritaKapandi = !(await vis('#map'));
await p.tap('#t-note'); await sleep(300); out.defterAcildi = await vis('#notebook'); await p.tap('#notebook-close'); await sleep(200);
await p.tap('#t-hint'); await sleep(300); out.ipucu = (await p.$eval('#toast', (e) => e.textContent)).slice(0, 40);
await p.tap('#t-menu'); await sleep(300); out.menuAcildi = await vis('#menu'); await p.tap('#menu-resume'); await sleep(200);
out.droneDugmesiGizli = !(await vis('#t-drone'));
// Hasan Usta'ya yürü, "Konuş" kutusuna dokun, diyaloğu dokunarak ilerlet
for (let i = 0; i < 60 && !(await vis('#prompt')); i++) {
  const s = await G(), tx = 0 - s.x, tz = (await p.evaluate(() => window.__oyun.STEPS[0].hedef.z)) - s.z;
  await p.evaluate((h) => { window.__oyun.player.heading = h; }, Math.atan2(tx, -tz));
  await p.touchscreen.touchStart(jx, jy); await p.touchscreen.touchMove(jx, jy - 60); await sleep(400); await p.touchscreen.touchEnd();
}
out.konusKutusu = await vis('#prompt') ? await p.$eval('#prompt', (e) => e.textContent) : 'GÖRÜNMEDİ';
await p.tap('#prompt'); await sleep(300); out.diyalogAcildi = await vis('#dialog');
for (let i = 0; i < 8 && await vis('#dialog'); i++) { await p.tap('#dialog'); await sleep(200); }
out.soruAcildi = await vis('#quiz');
await (await p.$$('#quiz-options button'))[0].tap(); await sleep(200); await p.tap('#quiz-next'); await sleep(300);
for (let i = 0; i < 8 && await vis('#dialog'); i++) { await p.tap('#dialog'); await sleep(200); }
out.adimIlerledi = (await G()).step === 1;
await p.screenshot({ path: new URL('./cikti/dokunmatik.png', import.meta.url).pathname.slice(1) });
out.hatalar = errs;
console.log(JSON.stringify(out, null, 1));
await b.close();
