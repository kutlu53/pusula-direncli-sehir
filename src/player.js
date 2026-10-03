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
      f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
      r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    }
    let dx = sin * f + cos * r, dz = -cos * f + sin * r;
    const len = Math.hypot(dx, dz);
    const p = this.pos, ground = groundHeight(p.x, p.z), onGround = p.y <= ground + 0.05;
    if (len > 0) {
      const speed = keys.ShiftLeft || keys.ShiftRight ? RUN : WALK;
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
      this.stride += dt * (speed === RUN ? 14 : 10);
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
    const cy = Math.max(p.y + 2 + Math.sin(this.pitch) * d, groundHeight(cx, cz) + 1.2);
    this.camera.position.set(cx, cy, cz);
    this.camera.lookAt(p.x, p.y + 2.2, p.z);
  }
}
