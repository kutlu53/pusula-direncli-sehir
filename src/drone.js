import * as THREE from 'three';
import { groundHeight, HALF } from './terrain.js';

const SPEED = 46, ALT = 62, AIM = 52;

// Drone kamerası: oyuncu yerinde kalır, görüntü havadan öne-aşağı bakar.
export class Drone {
  constructor(camera, player) {
    this.camera = camera;
    this.player = player;
    this.active = false;
    this.pos = new THREE.Vector3();
    this.focus = new THREE.Vector3();
  }

  start() {
    this.active = true;
    this.pos.copy(this.player.pos);
    this.pos.y += 3;
  }

  stop() { this.active = false; }

  // Kameranın baktığı yer noktası
  aim() {
    const h = this.player.heading;
    return { x: this.pos.x + Math.sin(h) * AIM, z: this.pos.z - Math.cos(h) * AIM };
  }

  update(dt, keys) {
    const h = this.player.heading, sin = Math.sin(h), cos = Math.cos(h);
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0) + (keys.axisF || 0);
    const r = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0) + (keys.axisR || 0);
    const len = Math.hypot(f, r);
    if (len > 0.01) {
      const k = (SPEED * dt) / Math.max(1, len), lim = HALF - 20;
      this.pos.x = Math.min(lim, Math.max(-lim, this.pos.x + (sin * f + cos * r) * k));
      this.pos.z = Math.min(lim, Math.max(-lim, this.pos.z + (-cos * f + sin * r) * k));
    }
    const target = Math.max(groundHeight(this.pos.x, this.pos.z), 0) + ALT;
    this.pos.y += (target - this.pos.y) * Math.min(1, dt * 2.2);
    const a = this.aim();
    this.focus.set(a.x, Math.max(groundHeight(a.x, a.z), 0), a.z);
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.focus);
  }
}
