import * as THREE from 'three';

const EYE = 1.62;
const SPEED = 3.2;
const ACCEL = 20;
const RADIUS = 0.28;
const MOUSE_SENS = 0.0022;

export class Player {
  constructor(camera, bounds) {
    this.camera = camera;
    this.bounds = bounds; // { W, D, H }
    this.position = new THREE.Vector3(0, EYE, 2.2);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.pitch = -0.08;
    this.keys = new Set();
    this.locked = false;
    this.frozen = false; // when UI open
    this.alive = true;

    this._kd = (e) => {
      if (!this.frozen) this.keys.add(e.code);
      if (['Tab', 'Space'].includes(e.code)) e.preventDefault();
    };
    this._ku = (e) => this.keys.delete(e.code);
    this._mm = (e) => {
      if (!this.locked || this.frozen) return;
      this.yaw -= e.movementX * MOUSE_SENS;
      this.pitch -= e.movementY * MOUSE_SENS;
      const lim = Math.PI / 2 - 0.05;
      this.pitch = Math.max(-lim, Math.min(lim, this.pitch));
    };
    this._lock = () => {
      this.locked = !!document.pointerLockElement;
    };
    window.addEventListener('keydown', this._kd);
    window.addEventListener('keyup', this._ku);
    document.addEventListener('mousemove', this._mm);
    document.addEventListener('pointerlockchange', this._lock);
    this.applyCamera();
  }

  dispose() {
    window.removeEventListener('keydown', this._kd);
    window.removeEventListener('keyup', this._ku);
    document.removeEventListener('mousemove', this._mm);
    document.removeEventListener('pointerlockchange', this._lock);
  }

  setFrozen(v) {
    this.frozen = v;
    if (v) this.keys.clear();
  }

  update(dt) {
    if (this.frozen) {
      this.velocity.multiplyScalar(0.8);
      this.applyCamera();
      return;
    }
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
    let ix = 0, iz = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) iz += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) iz -= 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) ix -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) ix += 1;
    const wish = new THREE.Vector3();
    wish.addScaledVector(forward, iz);
    wish.addScaledVector(right, ix);
    if (wish.lengthSq() > 0) wish.normalize().multiplyScalar(SPEED);
    const a = ix || iz ? ACCEL : ACCEL * 0.6;
    this.velocity.x = approach(this.velocity.x, wish.x, a * dt);
    this.velocity.z = approach(this.velocity.z, wish.z, a * dt);

    const next = this.position.clone();
    next.x += this.velocity.x * dt;
    next.z += this.velocity.z * dt;
    // Room bounds
    const halfW = this.bounds.W / 2 - RADIUS - 0.15;
    const halfD = this.bounds.D / 2 - RADIUS - 0.15;
    next.x = THREE.MathUtils.clamp(next.x, -halfW, halfW);
    next.z = THREE.MathUtils.clamp(next.z, -halfD, halfD);
    // Desk collision (simple AABB)
    const desk = { x: -1.2, z: -1.8, w: 2.5, d: 1.3 };
    if (
      next.x > desk.x - desk.w / 2 - RADIUS &&
      next.x < desk.x + desk.w / 2 + RADIUS &&
      next.z > desk.z - desk.d / 2 - RADIUS &&
      next.z < desk.z + desk.d / 2 + RADIUS
    ) {
      // push out along smaller penetration
      const px1 = next.x - (desk.x - desk.w / 2 - RADIUS);
      const px2 = desk.x + desk.w / 2 + RADIUS - next.x;
      const pz1 = next.z - (desk.z - desk.d / 2 - RADIUS);
      const pz2 = desk.z + desk.d / 2 + RADIUS - next.z;
      const m = Math.min(px1, px2, pz1, pz2);
      if (m === px1) next.x = desk.x - desk.w / 2 - RADIUS;
      else if (m === px2) next.x = desk.x + desk.w / 2 + RADIUS;
      else if (m === pz1) next.z = desk.z - desk.d / 2 - RADIUS;
      else next.z = desk.z + desk.d / 2 + RADIUS;
    }
    // Board wall keep-out
    if (next.x < -this.bounds.W / 2 + 0.5) next.x = -this.bounds.W / 2 + 0.5;
    next.y = EYE;
    this.position.copy(next);
    this.applyCamera();
  }

  applyCamera() {
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotateY(this.yaw);
    this.camera.rotateX(this.pitch);
  }

  getForward() {
    const dir = new THREE.Vector3(0, 0, -1);
    dir.applyEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
    return dir;
  }
}

function approach(cur, target, maxDelta) {
  const d = target - cur;
  if (Math.abs(d) <= maxDelta) return target;
  return cur + Math.sign(d) * maxDelta;
}
