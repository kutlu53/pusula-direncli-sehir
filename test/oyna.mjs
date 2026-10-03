// Oyunu gerçek klavye ve fare girdisiyle baştan sona oynayan test botu.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';

// Çalıştırma: npm run build && npm run test:oyna   (Chrome kurulu olmalı)
const URL = new globalThis.URL('../OYUN.html', import.meta.url).href + '?test=1';
const OUT = process.argv[2] || new globalThis.URL('./cikti', import.meta.url).pathname.slice(1);
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const report = { hatalar: [], adimlar: [], notlar: [] };
const note = (m) => { report.notlar.push(m); console.log('  ·', m); };

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new',
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--window-size=640,400', '--allow-file-access-from-files'],
  defaultViewport: { width: 640, height: 400 },
});
const page = await browser.newPage();
page.on('pageerror', (e) => { report.hatalar.push('pageerror: ' + e.message); console.log('!! HATA', e.message); });
page.on('console', (m) => { if (m.type() === 'error') { report.hatalar.push('console: ' + m.text()); console.log('!! console', m.text()); } });
await page.goto(URL);
await page.evaluate(() => localStorage.clear());
await page.reload();
await sleep(1500);

const G = () => page.evaluate(() => {
  const o = window.__oyun, s = o.STEPS[o.state.step];
  return { mode: o.mode, step: o.state.step, id: s?.id, tur: s?.tur, hedef: o.hedef(), x: o.player.pos.x, z: o.player.pos.z, y: o.player.pos.y,
    score: o.state.score, fot: o.state.fotolar, cih: o.state.cihazlar.length, droneOn: o.drone.active, dx: o.drone.pos.x, dz: o.drone.pos.z,
    heading: o.player.heading };
});
const vis = (sel) => page.evaluate((q) => { const e = document.querySelector(q); return !!e && e.getClientRects().length > 0; }, sel);
const text = (sel) => page.evaluate((q) => document.querySelector(q)?.textContent || '', sel);
const shot = (name) => page.screenshot({ path: `${OUT}/bot_${name}.png` });
const setHeading = (h) => page.evaluate((v) => { window.__oyun.player.heading = v; }, h);
const clickText = async (sel, t) => {
  const ok = await page.evaluate((q, tt) => { const e = [...document.querySelectorAll(q)].find((b) => b.textContent.trim().includes(tt) && b.getClientRects().length > 0); if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; }, sel, t);
  if (!ok) throw new Error(`bulunamadı: ${sel} "${t}"`);
  const h = await page.evaluateHandle((q, tt) => [...document.querySelectorAll(q)].find((b) => b.textContent.trim().includes(tt) && b.getClientRects().length > 0), sel, t);
  await h.click();
};
const clickCanvas = async (sel, fx, fy) => {
  const h = await page.$(sel);
  await h.evaluate((e) => e.scrollIntoView({ block: 'center' }));
  const b = await h.boundingBox();
  await page.mouse.click(b.x + b.width * fx, b.y + b.height * fy);
};

// ---- fps ölçümü
const fps = await page.evaluate(() => new Promise((res) => { let n = 0; const t0 = performance.now(); const f = () => { n++; performance.now() - t0 < 2000 ? requestAnimationFrame(f) : res(n / 2); }; requestAnimationFrame(f); }));
note(`Başsız tarayıcıda kare hızı: ${fps.toFixed(1)} fps (yazılımsal çizim)`);

// ---- Açılış
await shot('01_acilis');
await page.type('#code', 'BOT01');
await page.click('#start');
await sleep(500);
if ((await G()).mode !== 'play') throw new Error('Oyun başlamadı');

// ---- Yürüme: hedefe dön, W+Shift bas, takılırsa yandan dolaş
let stuckTotal = 0;
async function walkTo(t, radius = 4, limitS = 240, until = null) {
  const t0 = Date.now();
  let last = await G(), lastT = Date.now(), detourUntil = 0, side = 1, stuck = 0;
  await page.keyboard.down('KeyW'); await page.keyboard.down('ShiftLeft');
  try {
    while (true) {
      const s = await G();
      const d = Math.hypot(t.x - s.x, t.z - s.z);
      if (d < radius || (until && await until(s))) return { ok: true, sure: (Date.now() - t0) / 1000, stuck };
      if ((Date.now() - t0) / 1000 > limitS) return { ok: false, sure: limitS, stuck, kalan: d };
      if (Date.now() > detourUntil) await setHeading(Math.atan2(t.x - s.x, -(t.z - s.z)));
      if (Date.now() - lastT > 1500) {
        if (Math.hypot(s.x - last.x, s.z - last.z) < 1.2 && Date.now() > detourUntil) {
          stuck++; stuckTotal++; side = -side;
          await setHeading(Math.atan2(t.x - s.x, -(t.z - s.z)) + side * (1.2 + Math.random() * 0.8));
          detourUntil = Date.now() + 1600 + stuck * 300;
        }
        last = s; lastT = Date.now();
      }
      await sleep(110);
    }
  } finally { await page.keyboard.up('KeyW'); await page.keyboard.up('ShiftLeft'); }
}

// ---- Soru: doğru şıkkı bul; bazılarını bilerek yanlış yanıtla
const YANLIS = new Set(['B1S2', 'B2S3']);
async function answerQuiz() {
  const info = await page.evaluate(() => {
    const metin = document.querySelector('#quiz-text').textContent, o = window.__oyun;
    const all = [];
    for (const s of o.STEPS) { if (s.soru) all.push(s.soru); for (const h of s.hedefler || []) all.push(h.soru); }
    const q = all.find((x) => x.metin === metin);
    return q ? { id: q.id, dogru: q.dogru, n: q.secenekler.length } : null;
  });
  if (!info) throw new Error('Soru eşleşmedi: ' + await text('#quiz-text'));
  const pick = YANLIS.has(info.id) ? (info.dogru + 1) % info.n : info.dogru;
  const btns = await page.$$('#quiz-options button');
  await btns[pick].click();
  await sleep(200);
  const fb = await text('#quiz-feedback');
  const beklenen = YANLIS.has(info.id) ? '❌' : '✅';
  if (!fb.startsWith(beklenen)) report.hatalar.push(`Soru ${info.id}: beklenen ${beklenen}, geri bildirim "${fb.slice(0, 30)}"`);
  await page.click('#quiz-next');
}

// ---- Etkinlikler
async function doActivity() {
  const has = (q) => page.$(q).then((h) => !!h);
  if (await has('.plan-canvas')) {
    // Her öğe için kurala uyan en ucuz yeri sayfadaki değerlendirme işleviyle bul
    const sites = await page.evaluate(() => {
      const o = window.__oyun, P = o.PLAN, B = o.world.buildings, out = {};
      for (const it of P.ogeler) {
        let best = null;
        for (let x = -200; x <= 400; x += 6) for (let z = -120; z <= 260; z += 6) {
          if (Object.values(out).some((q) => Math.hypot(q.x - x, q.z - z) < 30)) continue;
          const okAt = (dx, dz) => P.evaluate({ [it.key]: { x: x + dx, z: z + dz } }, B).ogeler[it.key];
          const e = okAt(0, 0);
          // tıklama hassasiyeti düşük olduğundan çevresi de uygun olan yerleri seç
          if (e.ok && (!best || e.maliyet < best.m) && [[9, 0], [-9, 0], [0, 9], [0, -9], [7, 7], [-7, -7], [7, -7], [-7, 7]].every(([a, c]) => okAt(a, c).ok)) best = { x, z, m: e.maliyet };
        }
        out[it.key] = best;
      }
      return out;
    });
    note('Plan için bulunan yerler: ' + JSON.stringify(sites));
    const rows = await page.$$('.plan-row');
    const keys = ['okul', 'hastane', 'konut', 'park', 'agac'];
    const put = async (i, p) => { await rows[i].click(); await clickCanvas('.plan-canvas', (p.x + 450) / 900, (p.z + 450) / 900); await sleep(120); };
    await put(0, sites.park); // okulu bilerek taşkın alanına koy
    for (let i = 1; i < 5; i++) await put(i, sites[keys[i]]);
    await clickText('.layer-right > button', 'Planı değerlendir'); await sleep(200);
    const wrong = await page.$$eval('.plan-row.wrong', (l) => l.length);
    if (wrong !== 1 || await vis('#act-next')) report.hatalar.push('Plan: riskli yerdeki okul reddedilmeliydi (yanlış satır: ' + wrong + ')');
    note('Plan (hatalı deneme): ' + (await text('.plan-row.wrong .plan-why')).slice(0, 70));
    await shot('act_plan_hatali');
    await put(0, sites.okul);
    await clickText('.layer-right > button', 'Planı değerlendir'); await sleep(200);
    await shot('act_plan_onay');
    note('Plan: ' + (await text('#act-feedback')).slice(0, 60));
    if (!(await vis('#act-next'))) throw new Error('Plan onaylanmadı: ' + JSON.stringify(await page.$$eval('.plan-row', (l) => l.map((r) => r.textContent))));
  } else if (await has('.nb-grid')) {
    const map = { Karadeniz: 1, Giresun: 3, Samsun: 5, Tokat: 6, Sivas: 7 }; // Samsun ve Giresun bilerek ters
    const disabled = await page.$eval('#act-body > button', (b) => b.disabled);
    if (!disabled) report.hatalar.push('Komşu: "Kontrol et" başta etkin olmamalıydı');
    for (const [ad, idx] of Object.entries(map)) {
      await clickText('.nb-chip', ad);
      const cells = await page.$$('.nb-grid > div');
      await cells[idx].click();
    }
    await shot('act_komsu');
    await clickText('#act-body > button', 'Kontrol et');
    const fb = await text('#act-feedback');
    if (!fb.includes('5 komşudan 3')) report.hatalar.push('Komşu: beklenen "5 komşudan 3", gelen: ' + fb.slice(0, 60));
    note('Komşu yerleştirme: ' + fb.slice(0, 50));
  } else if (await has('.cloze')) {
    const sels = await page.$$('.cloze select');
    for (let i = 0; i < sels.length; i++) {
      const v = await sels[i].evaluate((s, wrong) => { const d = s.dataset.dogru; const o = [...s.options].map((x) => x.value).filter(Boolean); return wrong ? o.find((x) => x !== d) : d; }, i === 0);
      await sels[i].select(v);
    }
    await page.type('.cloze-free textarea', 'Ordu Karadeniz kıyısında, dağlarla deniz arasında bir şehirdir.');
    await shot('act_ozet_' + Date.now() % 10000);
    await clickText('#act-body > button', 'Deftere yaz');
    note('Özet: ' + (await text('#act-feedback')).slice(0, 40));
  } else if (await has('.air-row')) {
    await clickCanvas('.air canvas.tap', 0.5, 0.05); // deniz: fark yok
    const n1 = await text('.act-note');
    if (!n1.includes('değişim yok')) report.hatalar.push('Karşılaştırma: yanlış dokunuşta uyarı çıkmadı');
    const F = await page.evaluate(() => window.__oyun.FARKLAR.map((f) => [f.x, f.z]));
    for (const [x, z] of F) { await clickCanvas('.air canvas.tap', (x + 260) / 600, (z + 140) / 460); await sleep(150); }
    await shot('act_karsilastir');
  } else if (await has('.layer-wrap')) {
    for (const b of await page.$$('.layer-btn')) { await b.click(); await sleep(100); }
    await shot('act_katman_acik');
    const Y = await page.evaluate(() => window.__oyun.KATMAN_YERLER.map((y) => y.dogru));
    const rows = await page.$$('.layer-row');
    for (let i = 0; i < rows.length; i++) {
      const want = i === 2 ? 'sel' : Y[i]; // C'yi bilerek yanlış
      const b = await rows[i].$(`.opt.${want}`);
      await b.evaluate((e) => e.scrollIntoView({ block: 'center' }));
      await b.click();
    }
    await clickText('.layer-right > button', 'Risk haritasını oluştur');
    await sleep(200);
    await shot('act_katman_sonuc');
    note('Katman: ' + (await text('#act-feedback')).slice(0, 60));
  } else if (await has('.lab-wrap')) {
    const title = await text('#act-title');
    const trials = title.includes('Yağmur') ? [[2, 2], [2, 0]] : [[2, 1, 1], [1, 0, 1]];
    for (const tr of trials) {
      const groups = await page.$$('.lab-opts');
      for (let i = 0; i < tr.length; i++) { const bs = await groups[i].$$('button'); await bs[tr[i]].click(); }
      await page.click('.lab-run');
      await page.waitForFunction(() => { const r = document.querySelector('.lab-run'); return !r || !r.disabled || r.classList.contains('hidden'); }, { timeout: 30000 });
      await sleep(200);
      note(`Deney (${title.slice(0, 12)}): ${await text('.lab-out')}`);
    }
    await shot('act_deney_' + (title.includes('Yağmur') ? 'sel' : 'heyelan'));
    const goals = await page.$$eval('.lab-goals li', (l) => l.map((x) => x.classList.contains('done')));
    if (!goals.every(Boolean)) report.hatalar.push('Deney hedefleri tamamlanmadı: ' + JSON.stringify(goals));
  } else if (await has('.act-task')) {
    const I = await page.evaluate(() => window.__oyun.ISARET.map((t) => [t.x, t.z]));
    for (let i = 0; i < I.length; i++) {
      const [x, z] = i === 1 ? [-300, 300] : I[i]; // 2. görev bilerek yanlış
      await clickCanvas('.act-canvas', (x + 450) / 900, (z + 450) / 900);
      await sleep(1900);
    }
    await shot('act_isaretle');
    note('İşaretleme: ' + (await text('#act-feedback')).slice(0, 45));
  } else throw new Error('Tanınmayan etkinlik: ' + await text('#act-title'));
}

async function handleBusy() {
  let guard = 0;
  while ((await G()).mode === 'busy') {
    if (++guard > 400) throw new Error('busy modunda takıldı');
    if (await vis('#quiz')) await answerQuiz();
    else if (await vis('#activity')) { if (await vis('#act-next')) await page.click('#act-next'); else await doActivity(); }
    else if (await vis('#dialog')) { if (guard % 2) await page.click('#dialog'); else await page.keyboard.press('KeyE'); }
    await sleep(160);
  }
}

// ---- Yardımcı ekranlar: harita, defter, ipucu, menü
async function testOverlays(tag) {
  await page.keyboard.press('KeyM'); await sleep(300);
  if (!(await vis('#map'))) report.hatalar.push(tag + ': M ile harita açılmadı');
  await shot('harita_' + tag);
  if (await vis('#map-risk')) { await page.click('#map-risk'); await sleep(300); await shot('harita_risk_' + tag); }
  await page.keyboard.press('KeyM'); await sleep(200);
  if (await vis('#map')) report.hatalar.push(tag + ': M ile harita kapanmadı');
  await page.keyboard.press('KeyN'); await sleep(250);
  if (!(await vis('#notebook'))) report.hatalar.push(tag + ': N ile defter açılmadı');
  const n = await page.$$eval('#notebook-body .note', (l) => l.length);
  await shot('defter_' + tag);
  await page.click('#notebook-close'); await sleep(200);
  await page.keyboard.press('KeyH'); await sleep(250);
  const tip = await text('#toast');
  if (!tip.startsWith('İpucu')) report.hatalar.push(tag + ': H ile ipucu çıkmadı: ' + tip.slice(0, 40));
  await page.keyboard.press('Escape'); await sleep(250);
  if (!(await vis('#menu'))) report.hatalar.push(tag + ': Esc ile menü açılmadı');
  await page.click('#menu-resume'); await sleep(200);
  if ((await G()).mode !== 'play') report.hatalar.push(tag + ': menüden sonra oyun moduna dönmedi');
  note(`${tag}: harita, defter (${n} not), ipucu ve menü çalıştı. İpucu: "${tip.slice(0, 70)}"`);
}

// ---- Ana döngü
const T0 = Date.now();
let lastStep = -1, reloaded = false;
while (true) {
  let s = await G();
  if (s.mode === 'end') {
    await shot('bolum_sonu_' + s.step);
    note(`Bölüm sonu ekranı: ${await text('#end-label')} / ${await text('#end-badge')} / ${(await text('#end-summary')).slice(0, 60)} / düğme: "${await text('#end-free')}"`);
    await page.click('#end-free'); await sleep(300);
    if (!reloaded) { // kayıt ve devam testi
      reloaded = true;
      await page.reload(); await sleep(1500);
      if (!(await vis('#continue'))) report.hatalar.push('Yeniden yüklemede "devam et" düğmesi görünmedi');
      else { await page.click('#continue'); await sleep(400); const r = await G(); note(`Sayfa yenilendi, kayıttan devam: adım ${r.step}, puan ${r.score}`); if (r.step !== s.step) report.hatalar.push(`Kayıt: adım ${s.step} bekleniyordu, ${r.step} geldi`); }
    }
    continue;
  }
  if (s.id === undefined) break; // tüm adımlar bitti
  if (s.mode !== 'play') throw new Error('Beklenmeyen mod: ' + s.mode);
  if (s.step !== lastStep) { lastStep = s.step; console.log(`\n== Adım ${s.step} (${s.id}, ${s.tur}) t=${((Date.now() - T0) / 1000).toFixed(0)}s`); }
  const st0 = Date.now(), stuck0 = stuckTotal;

  if (['npc', 'parca', 'nesne'].includes(s.tur)) {
    if (s.step === 0) { // hedefe varmadan E'ye basmak bir şey yapmamalı
      await page.keyboard.press('KeyE'); await sleep(200);
      if ((await G()).mode !== 'play') report.hatalar.push('Uzakken E etkileşimi başlattı');
    }
    const r = await walkTo(s.hedef, 4.5);
    if (!r.ok) { await shot('takildi_' + s.id); throw new Error(`Hedefe ulaşılamadı: ${s.id}, kalan ${r.kalan?.toFixed(0)} birim`); }
    await sleep(300);
    if (!(await vis('#prompt'))) report.hatalar.push(`${s.id}: hedefe varınca etkileşim kutusu görünmedi`);
    await shot('varis_' + s.id);
    await page.keyboard.press('KeyE'); await sleep(250);
    await handleBusy();
    report.adimlar.push({ id: s.id, yurume_sn: +r.sure.toFixed(0), takilma: r.stuck });
    if (s.step === 1 || s.step === 9 || s.step === 11) await testOverlays('adim' + s.step);
  } else if (s.tur === 'drone') {
    const H = await page.evaluate(() => window.__oyun.STEPS[window.__oyun.state.step].hedefler.map((h) => ({ key: h.key, x: h.x, z: h.z })));
    await page.keyboard.press('KeyF'); await sleep(400);
    if (!(await G()).droneOn) throw new Error('F ile drone kalkmadı');
    await page.keyboard.press('KeyH'); await sleep(200); note('Drone ipucu: ' + (await text('#toast')).slice(0, 90));
    for (const h of H) {
      const t1 = Date.now();
      await page.keyboard.down('KeyW');
      while (true) {
        const d = await G(), dist = Math.hypot(h.x - d.dx, h.z - d.dz);
        await setHeading(Math.atan2(h.x - d.dx, -(h.z - d.dz)));
        if (dist < 58) break;
        if (Date.now() - t1 > 120000) throw new Error('Drone hedefe ulaşamadı: ' + h.key);
        await sleep(100);
      }
      await page.keyboard.up('KeyW'); await sleep(900);
      if (!(await vis('#prompt'))) { // biraz ileri-geri ayarla
        const d = await G(), dist = Math.hypot(h.x - d.dx, h.z - d.dz);
        await page.keyboard.down(dist > 52 ? 'KeyW' : 'KeyS'); await sleep(500); await page.keyboard.up(dist > 52 ? 'KeyW' : 'KeyS'); await sleep(600);
      }
      if (!(await vis('#prompt'))) { await shot('drone_yok_' + h.key); throw new Error('Drone hedef üstünde ama fotoğraf kutusu çıkmadı: ' + h.key); }
      await shot('drone_' + h.key);
      await page.keyboard.press('KeyE'); await sleep(300);
      await handleBusy();
      note(`Drone fotoğrafı: ${h.key} (${((Date.now() - t1) / 1000).toFixed(0)} sn)`);
    }
    report.adimlar.push({ id: s.id, sure_sn: +((Date.now() - st0) / 1000).toFixed(0) });
  } else if (s.tur === 'sensor') {
    // önce yanlış yerde dene: uyarı çıkmalı, cihaz konmamalı
    await page.keyboard.press('KeyE'); await sleep(300);
    const w = await text('#toast');
    if ((await G()).cih !== 0 || !w.includes('Burası')) report.hatalar.push('Sensör: yanlış yerde uyarı beklenirdi, gelen: ' + w.slice(0, 50));
    else note('Yanlış yerde cihaz uyarısı: "' + w.slice(0, 80) + '…"');
    const C = { sel: { x: 272, z: 60 }, heyelan: { x: -70, z: 70 }, guvenli: { x: 70, z: 10 } };
    for (const t of ['sel', 'heyelan', 'guvenli']) {
      const ok = (p) => page.evaluate((x, z, tt) => { const o = window.__oyun; return o.riskAt(x, z) === tt && (tt !== 'guvenli' || o.slopeAt(x, z) < 0.2); }, p.x, p.z, t);
      const r = await walkTo(C[t], 3, 240, t === 'guvenli' ? null : (p) => ok(p));
      if (!r.ok) throw new Error('Sensör yeri bulunamadı: ' + t);
      await sleep(200);
      await page.keyboard.press('KeyE'); await sleep(300);
      await handleBusy();
      note(`Cihaz yerleştirildi: ${t} (${r.sure.toFixed(0)} sn yürüme, ${r.stuck} takılma)`);
    }
    await shot('cihazlar');
    report.adimlar.push({ id: s.id, sure_sn: +((Date.now() - st0) / 1000).toFixed(0), takilma: stuckTotal - stuck0 });
  }
}

const fin = await G();
await shot('99_bitis');
const logs = await page.evaluate(() => JSON.parse(localStorage.getItem('pusula_log') || '[]'));
const byType = {};
for (const l of logs) byType[l.olay] = (byType[l.olay] || 0) + 1;
report.ozet = { toplam_sn: Math.round((Date.now() - T0) / 1000), puan: fin.score, kayit_satiri: logs.length, olaylar: byType, toplam_takilma: stuckTotal,
  serbest_metin_kayitli: logs.filter((l) => l.olay === 'ozet' && l.metin).length };
fs.writeFileSync(`${OUT}/bot_rapor.json`, JSON.stringify(report, null, 2));
console.log('\n==== RAPOR ====\n' + JSON.stringify(report, null, 2));
await browser.close();
