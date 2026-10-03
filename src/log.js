// Araştırma verisi: her soru yanıtı ve ipucu kullanımı tarayıcıda saklanır, CSV olarak indirilir.
const KEY = 'pusula_log', SAVE = 'pusula_save';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* depolama kapalı olabilir */ } };

export const Log = {
  add(entry) {
    const all = read(KEY, []);
    all.push({ zaman: new Date().toISOString(), ...entry });
    write(KEY, all);
  },
  csv() {
    const cols = ['zaman', 'ogrenci', 'olay', 'soru', 'beceri', 'secilen', 'dogru', 'sure_sn', 'adim', 'metin'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return [cols.join(';'), ...read(KEY, []).map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\r\n');
  },
  download() {
    const blob = new Blob(['﻿' + Log.csv()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'pusula_veri.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  },
  save: (state) => write(SAVE, state),
  load: () => read(SAVE, null),
  clearSave: () => { try { localStorage.removeItem(SAVE); } catch { /* yok say */ } },
};
