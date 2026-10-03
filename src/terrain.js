// Altınordu (Ordu) kıyı şeridinin stilize arazi modeli.
// Eksenler: kuzey = -z, doğu = +x. 1 birim = 5 metre.
export const WORLD = 900;
export const HALF = WORLD / 2;
export const M_PER_UNIT = 5;
export const BRIDGE_Z = 20;
export const BRIDGE_HALF = 30;

function hash(ix, iz) {
  let n = Math.imul(ix, 374761393) + Math.imul(iz, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise2(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const ux = fx * fx * (3 - 2 * fx), uz = fz * fz * (3 - 2 * fz);
  const a = hash(ix, iz), b = hash(ix + 1, iz), c = hash(ix, iz + 1), d = hash(ix + 1, iz + 1);
  return a + (b - a) * ux + (c - a) * uz + (a - b - c + d) * ux * uz;
}

export function fbm(x, z) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < 4; i++) { v += amp * noise2(x * f, z * f); f *= 2.03; amp *= 0.5; }
  return v / 0.9375;
}

export const rand = (i, j = 0) => hash(i * 7 + 13, j * 11 + 5);
export const smoothstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// Kıyı çizgisinin z değeri (bu değerin kuzeyi Karadeniz)
export const coastZ = (x) => -80 + 25 * Math.sin(x * 0.008) + 10 * Math.sin(x * 0.021 + 1);
// Melet Irmağı'nın x değeri (güneyden kuzeye akar)
export const riverX = (z) => 230 + 30 * Math.sin(z * 0.012) + 12 * Math.sin(z * 0.031);

export const BOZTEPE = { x: -170, z: 60 };

export function terrainHeight(x, z) {
  const s = z - coastZ(x);
  if (s < 0) return Math.max(-9, s * 0.09);
  const n = fbm(x * 0.006, z * 0.006);
  const hills = s > 130 ? Math.pow((s - 130) / 100, 1.6) * 14 : 0;
  let h = 1.6 * smoothstep(0, 25, s) + s * 0.012 + hills * (0.6 + 0.8 * n) + (n - 0.5) * 14 * smoothstep(60, 260, s);
  const db = Math.hypot(x - BOZTEPE.x, z - BOZTEPE.z);
  h += 88 * Math.exp(-((db / 95) ** 2)) * smoothstep(0, 40, s);
  const dr = Math.abs(x - riverX(z));
  h = mix(h, 1.5, 0.85 * Math.exp(-((dr / 55) ** 2)));
  h = mix(h, -1.6, Math.exp(-((dr / 11) ** 2)) * smoothstep(-5, 15, s));
  return h;
}

// Teras, çevresindeki en yüksek noktanın biraz üstünde durur
export const BOZ_TOP = (() => {
  let top = 0;
  for (let dx = -10; dx <= 10; dx += 2) for (let dz = -10; dz <= 10; dz += 2) top = Math.max(top, terrainHeight(BOZTEPE.x + dx, BOZTEPE.z + dz));
  return top + 0.3;
})();
export const PIER = { x: 0, z0: coastZ(0) - 50, z1: coastZ(0) + 4, half: 3.5, y: 1.4 };

export const PLACES = {
  start: { x: 6, z: coastZ(6) + 16 },
  iskele: { x: 0, z: coastZ(0) - 12, ad: 'İskele' },
  tasbasi: { x: -110, z: coastZ(-110) + 22, ad: 'Taşbaşı' },
  kopru: { x: riverX(BRIDGE_Z), z: BRIDGE_Z, ad: 'Melet Köprüsü' },
  findik: { x: 60, z: 190, ad: 'Fındık Bahçesi' },
  boztepe: { x: BOZTEPE.x, z: BOZTEPE.z, ad: 'Boztepe' },
  teleferik: { x: -55, z: coastZ(-55) + 14, ad: 'Teleferik' },
};

// 2. bölümde havadan aranan riskli yerler
export const RISKS = {
  taskin: { x: riverX(100), z: 100, ad: 'Irmak kenarındaki evler' },
  yamac: { x: -98, z: 58, ad: 'Dik yamaçtaki evler' },
  orman: { x: 150, z: 250, ad: 'Kesilen orman' },
};

export function bridgeDeck(x) {
  const t = (x - PLACES.kopru.x) / BRIDGE_HALF;
  return 2.0 + 1.8 * Math.cos(t * Math.PI / 2);
}

// Oyuncunun bastığı zemin: arazi + köprü + iskele + seyir terası
export function groundHeight(x, z) {
  let h = terrainHeight(x, z);
  if (Math.abs(z - BRIDGE_Z) < 4 && Math.abs(x - PLACES.kopru.x) < BRIDGE_HALF) h = Math.max(h, bridgeDeck(x));
  if (Math.abs(x - PIER.x) < PIER.half && z > PIER.z0 && z < PIER.z1) h = Math.max(h, PIER.y);
  if (Math.hypot(x - BOZTEPE.x, z - BOZTEPE.z) < 9) h = Math.max(h, BOZ_TOP);
  return h;
}

export const walkable = (x, z) =>
  Math.abs(x) < HALF - 12 && Math.abs(z) < HALF - 12 && groundHeight(x, z) > -0.7;
