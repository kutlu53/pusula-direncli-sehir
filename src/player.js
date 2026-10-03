import * as THREE from 'three';
import { groundHeight, walkable } from './terrain.js';
import { makeCharacter, animateCharacter } from './world.js';

const WALK = 9, RUN = 17, GRAVITY = 30, JUMP = 10, RADIUS = 0.8;

export class Player {
  constructor(scene, camera, colliders) {
    this.camera = camera;
    this.colliders = colliders;
    this.model = makeCharacter({ shirt: 0x1f8a8a, pants: 0x2d3a55, hair: 0x4a2f1e, pack: 0xe0892f });
    scene.add(this.model);
    this.pos = new THREE.Vector3();
    this.vy = 0;
    this.heading = 0; // kamera yönü, radyan: 0 = kuzey, π/2 = doğu
    this.pitch = 0.28;
    this.dist = 9;
    this.stride = 0;
    this.moving = 0;
    this.walked = 0;
  }

  place(x, z, heading = 0) {
    this.pos.set(x, groundHeight(x, z), z);
    this.heading = heading;
    this.model.rotation.y = -heading;
    this.snap = true; // kamera yeni yere anında geçsin
  }

  look(dx, dy) {
    this.heading += dx * 0.0026;
    this.pitch = Math.min(1.25, Math.max(-0.12, this.pitch + dy * 0.0022));
  }

  get headingDeg() { return ((this.heading * 180 / Math.PI) % 360 + 360) % 360; }

  collide(x, z) {
    for (const c of this.colliders) {
      if (x < c.minX - RADIUS || x > c.maxX + RADIUS || z < c.minZ - RADIUS || z > c.maxZ + RADIUS) continue;
      const pen = [x - (c.minX - RADIUS), (c.maxX + RADIUS) - x, z - (c.minZ - RADIUS), (c.maxZ + RADIUS) - z];
      const k = pen.indexOf(Math.min(...pen));
      if (k === 0) x = c.minX - RADIUS; else if (k === 1) x = c.maxX + RADIUS;
      else if (k === 2) z = c.minZ - RADIUS; else z = c.maxZ + RADIUS;
    }
    return [x, z];
  }

  update(dt, keys, canMove) {
    const sin = Math.sin(this.heading), cos = Math.cos(this.heading);
    let f = 0, r = 0;
    if (canMove) {
      f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + (keys.axisF || 0);
      r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (keys.axisR || 0);
    }
    // Dokunmatik joystick analogdur: sonuna kadar itilince koşar
    const analog = !!(keys.axisF || keys.axisR), mag = Math.min(1, Math.hypot(f, r));
    let dx = sin * f + cos * r, dz = -cos * f + sin * r;
    const len = Math.hypot(dx, dz);
    const p = this.pos, ground = groundHeight(p.x, p.z), onGround = p.y <= ground + 0.05;
    if (len > 0) {
      const run = keys.ShiftLeft || keys.ShiftRight || (analog && mag > 0.92);
      const speed = run ? RUN : WALK * (analog ? Math.max(0.35, mag) : 1);
      dx = (dx / len) * speed * dt; dz = (dz / len) * speed * dt;
      let [nx, nz] = this.collide(p.x + dx, p.z + dz);
      if (!walkable(nx, nz)) { // kenar boyunca kaymayı dene
        if (walkable(nx, p.z)) nz = p.z; else if (walkable(p.x, nz)) nx = p.x; else { nx = p.x; nz = p.z; }
      }
      this.walked += Math.hypot(nx - p.x, nz - p.z);
      p.x = nx; p.z = nz;
      const target = -Math.atan2(dx, -dz);
      let diff = target - this.model.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.model.rotation.y += diff * Math.min(1, dt * 12);
      this.stride += dt * (run ? 14 : 10);
    }
    this.moving += ((len > 0 ? 1 : 0) - this.moving) * Math.min(1, dt * 10);
    animateCharacter(this.model, this.stride, this.moving);

    if (canMove && keys.Space && onGround) this.vy = JUMP;
    this.vy -= GRAVITY * dt;
    p.y += this.vy * dt;
    const g2 = groundHeight(p.x, p.z);
    if (p.y < g2) { p.y = g2; this.vy = 0; }
    this.model.position.copy(p);

    // Üçüncü şahıs kamera
    const cp = Math.cos(this.pitch), d = this.dist;
    const cx = p.x - sin * cp * d, cz = p.z + cos * cp * d;
    const cy = Math.max(p.y + 2 + Math.sin(this.pitch) * d, groundHeight(cx, cz) + 2.6);
    if (!this.cam) this.cam = new THREE.Vector3();
    this.target = this.target || new THREE.Vector3();
    this.target.set(cx, cy, cz);
    if (this.snap) { this.cam.copy(this.target); this.snap = false; } else this.cam.lerp(this.target, 1 - Math.exp(-dt * 14));
    this.cam.y = Math.max(this.cam.y, groundHeight(this.cam.x, this.cam.z) + 1.6);
    this.camera.position.copy(this.cam);
    this.camera.lookAt(p.x, p.y + 2.2, p.z);
    this.onGround = onGround;
  }
}
