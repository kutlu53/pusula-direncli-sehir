import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import {
  WORLD, terrainHeight, groundHeight, coastZ, riverX, fbm, rand, smoothstep,
  PLACES, PIER, BOZTEPE, BOZ_TOP, BRIDGE_Z, BRIDGE_HALF, bridgeDeck, RISKS,
} from './terrain.js';

const FOG = 0xc4dcec;
const SUN_DIR = new THREE.Vector3(0.45, 0.75, 0.6).normalize();
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });

function shadowed(mesh, receive = true) { mesh.castShadow = true; mesh.receiveShadow = receive; return mesh; }

function box(w, h, d, mat, x, y, z) {
  const m = shadowed(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat));
  m.position.set(x, y, z);
  return m;
}

// ---------- Karakter (oyuncu ve Hasan Usta aynı iskeleti kullanır) ----------
export function makeCharacter({ shirt, pants, skin = 0xe8b890, hair, pack }) {
  const g = new THREE.Group();
  const torso = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 4, 12), std(shirt)));
  torso.position.y = 1.25;
  const head = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.32, 20, 14), std(skin)));
  head.position.y = 2.08;
  const cap = shadowed(new THREE.Mesh(new THREE.SphereGeometry(0.345, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), std(hair)));
  cap.position.y = 2.12;
  const eyeMat = std(0x222222);
  for (const sx of [-0.12, 0.12]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), eyeMat);
    eye.position.set(sx, 2.08, -0.29);
    g.add(eye);
  }
  g.add(torso, head, cap);
  const limb = (r, len, color, x, y) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = shadowed(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 8), std(color)));
    m.position.y = -(len / 2 + r * 0.6);
    pivot.add(m);
    g.add(pivot);
    return pivot;
  };
  const parts = {
    legL: limb(0.16, 0.55, pants, -0.2, 0.9), legR: limb(0.16, 0.55, pants, 0.2, 0.9),
    armL: limb(0.12, 0.5, shirt, -0.56, 1.68), armR: limb(0.12, 0.5, shirt, 0.56, 1.68),
  };
  if (pack) g.add(box(0.55, 0.65, 0.28, std(pack), 0, 1.32, 0.42));
  g.scale.setScalar(0.85);
  g.userData.parts = parts;
  return g;
}

export function animateCharacter(g, t, amount) {
  const p = g.userData.parts, sw = Math.sin(t) * 0.9 * amount;
  p.legL.rotation.x = sw; p.legR.rotation.x = -sw;
  p.armL.rotation.x = -sw * 0.8; p.armR.rotation.x = sw * 0.8;
}

// ---------- Arazi ----------
function buildTerrain() {
  const size = 1400, seg = 400;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainHeight(pos.getX(i), pos.getZ(i)));
  geo.computeVertexNormals();
  const nor = geo.attributes.normal;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), c2 = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = pos.getY(i);
    const s = z - coastZ(x), slope = 1 - nor.getY(i);
    const n = fbm(x * 0.03, z * 0.03);
    if (h < 0.15) c.set(0xcdbd92).lerp(c2.set(0x2d5f6e), smoothstep(0, -4, h));
    else if (s < 34 && h < 2.4) c.set(0xdccca2);
    else {
      c.set(0x79aa4c).lerp(c2.set(0x3c7438), smoothstep(8, 70, h) * 0.8 + n * 0.3);
      if (s < 165 && h < 9 && x > -165 && x < 345) c.lerp(c2.set(0xa9ad98), 0.55);
      c.lerp(c2.set(0x8d877a), smoothstep(0.22, 0.42, slope));
      c.lerp(c2.set(0xa3a784), smoothstep(110, 190, h) * 0.7);
      // Kesilen orman: çıplak toprak
      c.lerp(c2.set(0x9a7b55), smoothstep(42, 26, Math.hypot(x - RISKS.orman.x, z - RISKS.orman.z)) * 0.85);
    }
    c.multiplyScalar(0.9 + n * 0.2);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }));
  mesh.receiveShadow = true;
  return mesh;
}

function buildWater(uniforms) {
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms,
    vertexShader: `
      varying vec3 vW;
      void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float uT; uniform vec3 uSun; uniform vec3 uFog; uniform float uDens;
      varying vec3 vW;
      void main() {
        vec2 p = vW.xz;
        vec3 n = normalize(vec3(
          0.07 * cos(p.x * 0.35 + uT * 1.3) + 0.05 * cos((p.x + p.y) * 0.9 + uT * 2.1), 1.0,
          0.07 * cos(p.y * 0.42 - uT * 1.1) + 0.05 * cos((p.x - p.y) * 1.3 - uT * 1.7)));
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 col = mix(vec3(0.02, 0.2, 0.3), vec3(0.5, 0.72, 0.88), 0.12 + 0.78 * fres);
        col += vec3(1.0, 0.95, 0.8) * pow(max(dot(n, normalize(v + uSun)), 0.0), 220.0) * 1.6;
        float d = length(cameraPosition - vW);
        col = mix(col, uFog, 1.0 - exp(-uDens * uDens * d * d));
        gl_FragColor = vec4(col, 0.88);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(7000, 7000), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}

// ---------- Şehir ----------
function windowTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const g = cv.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 128, 128);
  for (let r = 0; r < 4; r++) for (let q = 0; q < 4; q++) {
    g.fillStyle = (r + q) % 3 ? '#4a6278' : '#9fb7c9';
    g.fillRect(8 + q * 32, 8 + r * 32, 16, 20);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildCity(scene, colliders, avoid) {
  const list = [];
  const palette = [0xf2e6d0, 0xe8d2b8, 0xd9e3ea, 0xf0d9c4, 0xe6e6dc, 0xcfdccf, 0xf3c9b0];
  let k = 0;
  for (let x = -150; x <= 335; x += 13) for (let s = 22; s <= 152; s += 13) {
    k++;
    const i = Math.round((x + 150) / 13), j = Math.round((s - 22) / 13);
    if (i % 5 === 0 || j % 4 === 3) continue; // sokaklar
    const px = x + (rand(k, 1) - 0.5) * 3, pz = coastZ(x) + s + (rand(k, 2) - 0.5) * 3;
    const h0 = terrainHeight(px, pz);
    if (h0 < 1.3 || h0 > 9 || Math.abs(px - riverX(pz)) < 27) continue;
    if (avoid.some((a) => Math.hypot(a.x - px, a.z - pz) < a.r)) continue;
    const w = 8 + rand(k, 3) * 3.5, d = 8 + rand(k, 4) * 3.5;
    const center = Math.exp(-(((px - 60) / 120) ** 2));
    const h = 4.5 + rand(k, 5) * 5 + center * rand(k, 6) * 9;
    list.push({ x: px, z: pz, w, d, h, y: h0 - 0.5, color: palette[Math.floor(rand(k, 7) * palette.length)] });
  }
  const sideMat = std(0xffffff, { map: windowTexture() });
  const topMat = std(0xb9b4aa);
  const body = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0),
    [sideMat, sideMat, topMat, topMat, sideMat, sideMat], list.length);
  const roofs = list.filter((b) => b.h < 9);
  const roof = new THREE.InstancedMesh(new THREE.ConeGeometry(0.72, 0.45, 4).rotateY(Math.PI / 4).translate(0, 0.225, 0),
    std(0xffffff), roofs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  list.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, b.y, b.z), q, new THREE.Vector3(b.w, b.h + 0.5, b.d));
    body.setMatrixAt(i, m);
    body.setColorAt(i, col.set(b.color));
    colliders.push({ minX: b.x - b.w / 2, maxX: b.x + b.w / 2, minZ: b.z - b.d / 2, maxZ: b.z + b.d / 2 });
  });
  roofs.forEach((b, i) => {
    m.compose(new THREE.Vector3(b.x, b.y + b.h + 0.5, b.z), q, new THREE.Vector3(b.w * 1.05, 4.5, b.d * 1.05));
    roof.setMatrixAt(i, m);
    roof.setColorAt(i, col.set(rand(i, 9) > 0.5 ? 0xb5523a : 0xa0462f));
  });
  scene.add(shadowed(body), shadowed(roof));
  return list;
}

function buildCoastRoad(scene) {
  const pts = [], idx = [];
  let n = 0;
  for (let x = -330; x <= 420; x += 5, n++) {
    for (const s of [9, 16]) { const z = coastZ(x) + s; pts.push(x, terrainHeight(x, z) + 0.12, z); }
    if (n > 0) { const a = (n - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  geo.setIndex(idx); geo.computeVertexNormals();
  const road = new THREE.Mesh(geo, std(0x55585c, { roughness: 1 }));
  road.receiveShadow = true;
  scene.add(road);
}

// ---------- Riskli yerleşmeler (2. bölüm) ----------
function buildRiskHouses(scene, colliders, buildings) {
  const walls = [0xf2e6d0, 0xe8d2b8, 0xd9e3ea, 0xf0d9c4].map((c) => std(c)), roofMat = std(0xb5523a);
  const house = (x, z, k) => {
    const y = terrainHeight(x, z), w = 6 + rand(k, 51) * 2, d = 6 + rand(k, 52) * 2;
    scene.add(box(w, 9, d, walls[k % 4], x, y + 0.5, z));
    const roof = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.45, 4).rotateY(Math.PI / 4), roofMat));
    roof.scale.set(w * 1.05, 4.5, d * 1.05); roof.position.set(x, y + 5, z);
    scene.add(roof);
    colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });
    buildings.push({ x, z, w, d, risk: true });
  };
  for (let i = 0; i < 10; i++) { // taşkın yatağı
    const z = RISKS.taskin.z - 32 + i * 7, side = i % 2 ? 1 : -1;
    house(riverX(z) + side * (19 + rand(i, 53) * 5), z, i);
  }
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) // dik yamaç
    if (i || j) house(RISKS.yamac.x + i * 11, RISKS.yamac.z + j * 11, 20 + i * 3 + j);
  [[-12, -8], [10, -14], [14, 9], [-9, 13]].forEach(([dx, dz], i) => house(RISKS.orman.x + dx, RISKS.orman.z + dz, 40 + i));
  const stump = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.5, 0.6, 0.8, 7).translate(0, 0.4, 0), std(0x7a5a3a), 46);
  const m = new THREE.Matrix4();
  for (let i = 0; i < 46; i++) {
    const a = rand(i, 61) * 6.28, r = 6 + rand(i, 62) * 30;
    const x = RISKS.orman.x + Math.cos(a) * r, z = RISKS.orman.z + Math.sin(a) * r;
    stump.setMatrixAt(i, m.makeTranslation(x, terrainHeight(x, z), z));
  }
  scene.add(shadowed(stump));
}

function buildDrone(scene) {
  const g = new THREE.Group(), dark = std(0x2b3038), rotors = [];
  g.add(box(1.1, 0.35, 1.1, std(0xe0892f), 0, 0.5, 0), box(2.6, 0.1, 0.16, dark, 0, 0.55, 0), box(0.16, 0.1, 2.6, dark, 0, 0.55, 0));
  for (const [x, z] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.04, 0.14), std(0x9aa3ab));
    r.position.set(x, 0.72, z);
    g.add(r); rotors.push(r);
  }
  g.position.set(BOZTEPE.x + 4, BOZ_TOP, BOZTEPE.z - 3);
  scene.add(g);
  return { model: g, rotors };
}

// ---------- Bitki örtüsü ----------
function buildTrees(scene, avoid) {
  const leafy = [], conifer = [], bush = [];
  for (let k = 0; k < 5200; k++) {
    const x = (rand(k, 21) - 0.5) * 1300, z = (rand(k, 22) - 0.5) * 1300;
    const s = z - coastZ(x), h = terrainHeight(x, z);
    if (s < 24 || h < 1.8) continue;
    if (s < 160 && h < 9 && x > -160 && x < 345) continue; // şehir
    if (avoid.some((a) => Math.hypot(a.x - x, a.z - z) < a.r)) continue;
    if (fbm(x * 0.02 + 40, z * 0.02) < 0.38) continue; // açıklıklar
    const sc = 0.8 + rand(k, 23) * 0.9;
    (h > 70 || rand(k, 24) > 0.8 ? conifer : leafy).push({ x, y: h, z, sc });
  }
  // Fındık bahçesi: sıra sıra ocaklar
  for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) {
    const x = PLACES.findik.x + i * 7 + 3.5, z = PLACES.findik.z + j * 7 + 3.5;
    bush.push({ x, y: terrainHeight(x, z), z, sc: 0.9 + rand(i + 9, j + 9) * 0.3 });
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), col = new THREE.Color();
  const inst = (geo, mat, items, sy, tint) => {
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((t, i) => {
      m.compose(new THREE.Vector3(t.x, t.y, t.z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, rand(i, 31) * 6.28),
        new THREE.Vector3(t.sc, t.sc * sy, t.sc));
      im.setMatrixAt(i, m);
      if (tint) im.setColorAt(i, col.set(tint).offsetHSL((rand(i, 32) - 0.5) * 0.04, 0, (rand(i, 33) - 0.5) * 0.1));
    });
    scene.add(shadowed(im));
  };
  const trunkMat = std(0x6b4a2e);
  inst(new THREE.CylinderGeometry(0.3, 0.42, 3, 6).translate(0, 1.5, 0), trunkMat, leafy, 1);
  inst(new THREE.IcosahedronGeometry(2.4, 1).translate(0, 4.6, 0), std(0xffffff, { flatShading: true }), leafy, 1, 0x4f9440);
  inst(new THREE.CylinderGeometry(0.25, 0.35, 2.4, 6).translate(0, 1.2, 0), trunkMat, conifer, 1);
  inst(new THREE.ConeGeometry(2, 7, 7).translate(0, 5.2, 0), std(0xffffff, { flatShading: true }), conifer, 1, 0x2f6a3c);
  inst(new THREE.IcosahedronGeometry(1.9, 1).translate(0, 1.5, 0), std(0xffffff, { flatShading: true }), bush, 0.8, 0x7db548);
}

// ---------- Simge yapılar ----------
function flagTexture() {
  const cv = document.createElement('canvas');
  cv.width = 300; cv.height = 200;
  const g = cv.getContext('2d');
  g.fillStyle = '#e30a17'; g.fillRect(0, 0, 300, 200);
  g.fillStyle = '#fff'; g.beginPath(); g.arc(100, 100, 50, 0, 7); g.fill();
  g.fillStyle = '#e30a17'; g.beginPath(); g.arc(112.5, 100, 40, 0, 7); g.fill();
  g.fillStyle = '#fff'; g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 9.5 : 25, a = Math.PI + (i * Math.PI) / 5;
    g.lineTo(155 + r * Math.cos(a), 100 + r * Math.sin(a));
  }
  g.fill();
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function buildLandmarks(scene, colliders) {
  const wood = std(0x8a6a48), stone = std(0xb7ab95), white = std(0xf4f1ea), red = std(0xc23b2e);
  const solid = (x, z, w, d) => colliders.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2 });

  // İskele ve fener
  const pierLen = PIER.z1 - PIER.z0, pierMid = (PIER.z0 + PIER.z1) / 2;
  scene.add(box(PIER.half * 2, 0.4, pierLen, wood, PIER.x, PIER.y - 0.2, pierMid));
  for (let z = PIER.z0 + 2; z < PIER.z1; z += 8) for (const sx of [-1, 1])
    scene.add(box(0.5, 6, 0.5, wood, PIER.x + sx * (PIER.half - 0.3), PIER.y - 3, z));
  const fx = PIER.x - 1.6, fz = PIER.z0 + 2.2;
  for (let i = 0; i < 4; i++) {
    const seg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.75 - i * 0.07, 0.82 - i * 0.07, 1.5, 14), i % 2 ? red : white));
    seg.position.set(fx, PIER.y + 0.75 + i * 1.5, fz);
    scene.add(seg);
  }
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), new THREE.MeshBasicMaterial({ color: 0xfff2b0 }));
  lamp.position.set(fx, PIER.y + 6.5, fz);
  scene.add(lamp);

  // Taşbaşı: eski taş bina
  const T = PLACES.tasbasi, tx = T.x - 13, tz = T.z + 9, ty = terrainHeight(tx, tz);
  scene.add(box(12, 7, 16, stone, tx, ty + 3, tz));
  const gable = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 7.4, 3.2, 4, 1).rotateY(Math.PI / 4), std(0x9a4a35)));
  gable.scale.set(1, 1, 1.35); gable.position.set(tx, ty + 8.1, tz);
  scene.add(gable, box(3.2, 12, 3.2, stone, tx + 3.5, ty + 6, tz - 8.5));
  const dome = shadowed(new THREE.Mesh(new THREE.ConeGeometry(2.6, 3, 4).rotateY(Math.PI / 4), std(0x9a4a35)));
  dome.position.set(tx + 3.5, ty + 13.5, tz - 8.5);
  scene.add(dome);
  solid(tx, tz, 12, 16); solid(tx + 3.5, tz - 8.5, 3.2, 3.2);

  // Melet Köprüsü
  const K = PLACES.kopru, segN = 20, segW = (BRIDGE_HALF * 2) / segN;
  for (let i = 0; i < segN; i++) {
    const x = K.x - BRIDGE_HALF + (i + 0.5) * segW, y = bridgeDeck(x);
    scene.add(box(segW + 0.1, 0.5, 8, stone, x, y - 0.25, BRIDGE_Z));
    for (const sz of [-3.8, 3.8]) scene.add(box(segW + 0.1, 0.9, 0.3, white, x, y + 0.45, BRIDGE_Z + sz));
  }
  for (const dx of [-12, 12]) scene.add(box(2.5, 6, 7, stone, K.x + dx, -0.5, BRIDGE_Z));

  // Fındık bahçesi kulübesi
  const F = PLACES.findik, hx = F.x - 10.5, hz = F.z - 10.5, hy = terrainHeight(hx, hz);
  scene.add(box(5, 3.4, 4.4, wood, hx, hy + 1.5, hz));
  const hr = shadowed(new THREE.Mesh(new THREE.ConeGeometry(4.3, 2.2, 4).rotateY(Math.PI / 4), red));
  hr.position.set(hx, hy + 4.3, hz);
  scene.add(hr);
  solid(hx, hz, 5, 4.4);

  // Boztepe seyir terası, bayrak
  const terrace = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 6, 28), stone));
  terrace.position.set(BOZTEPE.x, BOZ_TOP - 3, BOZTEPE.z);
  scene.add(terrace);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    scene.add(box(0.25, 1.1, 0.25, white, BOZTEPE.x + Math.cos(a) * 8.8, BOZ_TOP + 0.55, BOZTEPE.z + Math.sin(a) * 8.8));
  }
  const poleX = BOZTEPE.x - 6, poleZ = BOZTEPE.z + 4;
  const pole = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 14, 8), white));
  pole.position.set(poleX, BOZ_TOP + 7, poleZ);
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(6, 4, 12, 1),
    new THREE.MeshStandardMaterial({ map: flagTexture(), side: THREE.DoubleSide, roughness: 0.9 }));
  flag.position.set(poleX + 3.1, BOZ_TOP + 11.8, poleZ);
  scene.add(pole, flag);

  // Teleferik
  const A = PLACES.teleferik, ay = terrainHeight(A.x, A.z);
  const B = { x: BOZTEPE.x + 15, z: BOZTEPE.z - 12 }, by = terrainHeight(B.x, B.z);
  scene.add(box(8, 7, 8, white, A.x, ay + 3.5, A.z), box(8.6, 0.6, 8.6, red, A.x, ay + 7.2, A.z));
  scene.add(box(7, 6, 7, white, B.x, by + 3, B.z), box(7.6, 0.6, 7.6, red, B.x, by + 6.2, B.z));
  solid(A.x, A.z, 8, 8); solid(B.x, B.z, 7, 7);
  const cable = [];
  for (let i = 0; i <= 6; i++) {
    const t = i / 6, x = A.x + (B.x - A.x) * t, z = A.z + (B.z - A.z) * t;
    const line = ay + 8 + (by + 7 - ay - 8) * t;
    const y = i === 0 || i === 6 ? line : Math.max(line, terrainHeight(x, z) + 11);
    cable.push(new THREE.Vector3(x, y, z));
    if (i > 0 && i < 6) {
      const g0 = terrainHeight(x, z);
      scene.add(box(0.7, y - g0, 0.7, std(0x8f979c), x, (y + g0) / 2, z));
    }
  }
  const curve = new THREE.CatmullRomCurve3(cable, false, 'catmullrom', 0.2);
  scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(80)),
    new THREE.LineBasicMaterial({ color: 0x33383c })));
  const cabins = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.Group();
    g.add(box(2.4, 2.2, 2.4, i % 2 ? white : red, 0, -2.6, 0), box(0.15, 1.5, 0.15, std(0x33383c), 0, -0.75, 0));
    scene.add(g);
    cabins.push(g);
  }
  return { flag, cabins, curve };
}

function buildClouds(scene) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xf3f6f8, fog: false });
  const clouds = [];
  for (let i = 0; i < 16; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 5; j++) {
      const p = new THREE.Mesh(new THREE.IcosahedronGeometry(14 + rand(i, j) * 12, 1), mat);
      p.position.set((j - 2) * 15 + rand(j, i) * 6, rand(i + 3, j) * 6, rand(i, j + 5) * 14);
      p.scale.y = 0.55;
      g.add(p);
    }
    g.position.set((rand(i, 41) - 0.5) * 2400, 210 + rand(i, 42) * 90, (rand(i, 43) - 0.5) * 2400);
    scene.add(g);
    clouds.push(g);
  }
  return clouds;
}

function buildBoats(scene) {
  const boats = [];
  [[40, -60, 0x2f6f9f], [-90, -95, 0xc94f3a], [170, -75, 0xf0e8d8]].forEach(([x, off, color], i) => {
    const g = new THREE.Group();
    g.add(box(2.6, 1.1, 7, std(color), 0, 0.35, 0), box(1.8, 1.3, 2.2, std(0xf4f1ea), 0, 1.5, 1.2),
      box(0.12, 3, 0.12, std(0x6b4a2e), 0, 2.4, -1.4));
    g.position.set(x, 0, coastZ(x) + off);
    g.rotation.y = i * 1.3;
    scene.add(g);
    boats.push(g);
  });
  return boats;
}

// ---------- Dünya ----------
export function buildWorld({ lowGfx = false } = {}) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(FOG, 0.0015);

  const sky = new Sky();
  sky.scale.setScalar(10000);
  const su = sky.material.uniforms;
  su.turbidity.value = 5; su.rayleigh.value = 1.6; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.8;
  su.sunPosition.value.copy(SUN_DIR);
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0xcfe6ff, 0x6b7a4e, 1.7));
  const sun = new THREE.DirectionalLight(0xfff1d6, 4.2);
  sun.castShadow = true;
  sun.shadow.mapSize.setScalar(lowGfx ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -75, near: 10, far: 420 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.6;
  scene.add(sun, sun.target);

  scene.add(buildTerrain());
  const waterU = { uT: { value: 0 }, uSun: { value: SUN_DIR }, uFog: { value: new THREE.Color(FOG) }, uDens: { value: 0.0015 } };
  scene.add(buildWater(waterU));

  const colliders = [];
  const avoid = [
    { ...PLACES.tasbasi, r: 26 }, { ...PLACES.teleferik, r: 13 }, { ...PLACES.start, r: 24 },
    { ...PLACES.findik, r: 34 }, { ...BOZTEPE, r: 22 }, { x: PLACES.kopru.x - 38, z: BRIDGE_Z, r: 14 },
    { x: PLACES.kopru.x + 38, z: BRIDGE_Z, r: 14 },
    { ...RISKS.taskin, r: 46 }, { ...RISKS.yamac, r: 26 }, { ...RISKS.orman, r: 40 },
  ];
  const buildings = buildCity(scene, colliders, avoid);
  buildRiskHouses(scene, colliders, buildings);
  const drone = buildDrone(scene);
  buildCoastRoad(scene);
  buildTrees(scene, avoid);
  const { flag, cabins, curve } = buildLandmarks(scene, colliders);
  const clouds = buildClouds(scene);
  const boats = buildBoats(scene);

  // Hasan Usta
  const usta = makeCharacter({ shirt: 0x7a5a3a, pants: 0x3d4654, hair: 0xd8d8d8 });
  usta.position.set(PLACES.iskele.x, PIER.y, PLACES.iskele.z);
  usta.rotation.y = Math.PI; // güneye, kıyıya bakar
  scene.add(usta);

  // Hedef işareti: harita parçası + ışık sütunu
  const marker = new THREE.Group();
  const piece = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.12, 1.1),
    new THREE.MeshStandardMaterial({ color: 0xf2d27a, emissive: 0xd9a520, emissiveIntensity: 0.8 }));
  piece.position.y = 1.8; piece.rotation.x = 0.5;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xd9a020, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  beam.position.y = 30;
  marker.add(piece, beam);
  marker.visible = false;
  scene.add(marker);

  const flagBase = flag.geometry.attributes.position.array.slice();

  return {
    scene, colliders, buildings, sun,
    setTarget(p, showPiece) {
      marker.userData.active = !!p;
      if (p) { marker.position.set(p.x, groundHeight(p.x, p.z), p.z); piece.visible = showPiece; }
    },
    // Işık sütunu yalnızca hedefe yaklaşınca görünür; öğrenci yönü pusulayla bulmalı
    showMarker(near) { marker.visible = !!marker.userData.active && near; },
    update(dt, t, playerPos, droneFlying = false) {
      waterU.uT.value = t;
      drone.model.visible = !droneFlying;
      drone.rotors.forEach((r) => { r.rotation.y += dt * 9; });
      sun.position.copy(playerPos).addScaledVector(SUN_DIR, 200);
      sun.target.position.copy(playerPos);
      piece.rotation.y += dt * 1.6;
      piece.position.y = 1.8 + Math.sin(t * 2) * 0.25;
      beam.material.opacity = 0.1 + 0.04 * Math.sin(t * 3);
      cabins.forEach((c, i) => {
        const u = (t * 0.02 + i / 4) % 1, f = u < 0.5 ? u * 2 : 2 - u * 2;
        c.position.copy(curve.getPoint(f));
      });
      clouds.forEach((c) => { c.position.x += dt * 2.2; if (c.position.x > 1300) c.position.x = -1300; });
      boats.forEach((b, i) => { b.position.y = Math.sin(t * 1.2 + i * 2) * 0.18; b.rotation.z = Math.sin(t * 0.9 + i) * 0.05; });
      const fp = flag.geometry.attributes.position;
      for (let i = 0; i < fp.count; i++) {
        const x = flagBase[i * 3];
        fp.setZ(i, Math.sin(x * 1.4 - t * 5) * 0.28 * ((x + 3) / 6));
      }
      fp.needsUpdate = true;
    },
  };
}
