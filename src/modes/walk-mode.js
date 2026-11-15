// First-person Walk Mode controller, cached AABB collider raycasting, step-climbing, and room teleport.
import * as THREE from 'three';
import { FT, LV, FOV } from '../config/constants.js';
import { ROOMS, WALK_SPOTS } from '../config/rooms.js';
import { state, RT, MODES, WALK, TOUR, TL, BD, ease, actOf, isShown } from '../core/state.js';
import { lampMat } from '../core/materials.js';
import { root } from '../house/site-and-floors.js';
import { renderer, camera, controls, phoneFov, setFov, bindSnapshotHelpers } from '../core/renderer.js';
import { LAND, terrainY } from '../landscape/terrain-and-trees.js';
import { hiGroup } from '../systems/labels-selection.js';
import { toast } from '../systems/interactions.js';

const _wkMap = { ArrowUp: 'KeyW', ArrowDown: 'KeyS', ArrowLeft: 'KeyA', ArrowRight: 'KeyD', ShiftLeft: 'Shift', ShiftRight: 'Shift' };
for (const ev of ['keydown', 'keyup']) addEventListener(ev, e => {
  const el = document.querySelector(`[data-wk="${_wkMap[e.code] || e.code}"]`);
  if (el) el.classList.toggle('on', ev === 'keydown');
});
addEventListener('blur', () => document.querySelectorAll('.wk-k.on').forEach(el => el.classList.remove('on')));
const EYE = 5.5 * FT, STEP = 1.05 * FT, RAD = 0.95 * FT;
const toW = (x, y, z) => new THREE.Vector3((x - 24) * FT, y * FT, (z - 13.5) * FT);

const wrc = new THREE.Raycaster();
const _rcCand = [];
function buildColliders() {
  RT.solids = []; RT.grounds = [];
  root.updateMatrixWorld(true);
  root.traverse(o => {
    if (o.isMesh && o.visible && isShown(o) && !(o.layers.mask & 2) && !o.userData.passable && o.material !== lampMat && o.parent !== hiGroup) {
      o.userData._wdyn = !!actOf(o);
      if (!o.userData._wbox) o.userData._wbox = new THREE.Box3();
      o.userData._wbox.setFromObject(o);
      RT.solids.push(o);
    }
  });
  const landMeshes = LAND.children.filter(o => o.isMesh && !o.isInstancedMesh && o.name !== 'terrain');
  for (const o of landMeshes) {
    o.userData._wdyn = false;
    if (!o.userData._wbox) o.userData._wbox = new THREE.Box3();
    o.userData._wbox.setFromObject(o);
  }
  RT.grounds = RT.solids.concat(landMeshes);
}
function castFirst(list, origin, dir, far) {
  const ex = origin.x + dir.x * far, ey = origin.y + dir.y * far, ez = origin.z + dir.z * far;
  const minX = Math.min(origin.x, ex) - 0.05, maxX = Math.max(origin.x, ex) + 0.05;
  const minY = Math.min(origin.y, ey) - 0.05, maxY = Math.max(origin.y, ey) + 0.05;
  const minZ = Math.min(origin.z, ez) - 0.05, maxZ = Math.max(origin.z, ez) + 0.05;
  _rcCand.length = 0;
  for (let i = 0; i < list.length; i++) {
    const o = list[i];
    if (!o.visible) continue;
    const b = o.userData._wbox;
    if (o.userData._wboxDirty) { b.setFromObject(o); o.userData._wboxDirty = false; }
    if (b && (b.max.x < minX || b.min.x > maxX || b.max.y < minY || b.min.y > maxY || b.max.z < minZ || b.min.z > maxZ)) continue;
    _rcCand.push(o);
  }
  if (!_rcCand.length) return null;
  wrc.set(origin, dir); wrc.far = far;
  for (const h of wrc.intersectObjects(_rcCand, false)) if (h.object.visible) return h;
  return null;
}
const DOWN = new THREE.Vector3(0, -1, 0);
const _wOrig = new THREE.Vector3(), _wDir = new THREE.Vector3(), _wFwd = new THREE.Vector3(), _wRight = new THREE.Vector3();
function terrainGroundY(x, z) { return (terrainY(x / FT + 24, z / FT + 13.5) - 0.14) * FT; }
function floorHitAt(x, z, fromY) { return castFirst(RT.grounds, _wOrig.set(x, fromY, z), DOWN, 40); }
function floorAt(x, z, fromY) {
  const h = floorHitAt(x, z, fromY);
  if (h) return h.point.y;
  const ty = terrainGroundY(x, z);
  return ty <= fromY ? ty : -Infinity;
}
function walkableFloorAt(x, z, curFeet) {
  let best = floorHitAt(x, z, curFeet + 1.65 * FT);
  if (!best || best.point.y < curFeet - 0.5 * FT) {
    const r = 0.25 * FT;
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) {
      const h = floorHitAt(x + dx, z + dz, curFeet + 1.65 * FT);
      if (h && (!best || h.point.y > best.point.y)) best = h;
    }
  }
  if (!best) {
    const ty = terrainGroundY(x, z);
    return ty <= curFeet + 1.65 * FT ? ty : Infinity;
  }
  const maxUp = best.object.userData.phase === 'furniture' ? STEP : 1.65 * FT;
  return best.point.y <= curFeet + maxUp ? best.point.y : Infinity;
}
function walkStep(dt) {
  if (WALK.glide) {                                                      // a short glide to a spot in front of something (things-to-try)
    const G = WALK.glide; G.t += dt; const k = ease(Math.min(1, G.t / G.dur));
    WALK.pos.set(G.x0 + (G.x1 - G.x0) * k, 0, G.z0 + (G.z1 - G.z0) * k); WALK.feet = G.f0 + (G.f1 - G.f0) * k;
    WALK.yaw = G.y0 + G.dy * k; WALK.pitch = G.p0 + (G.p1 - G.p0) * k;
    camera.position.set(WALK.pos.x, WALK.feet + EYE, WALK.pos.z); camera.rotation.set(WALK.pitch, WALK.yaw, 0, 'YXZ');
    if (G.t >= G.dur) WALK.glide = null;
    return;
  }
  const k = WALK.keys; let fwd = Math.max(-1, Math.min(1, (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) + WALK.joy.y));
  let side = Math.max(-1, Math.min(1, (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + WALK.joy.x));
  if (WALK.auto) { const r = MODES.autoSteer(dt); fwd = r.fwd; side = r.side; }                // the guided tour is walking for us
  if (k.KeyQ) WALK.yaw += dt * 1.8; if (k.KeyE) WALK.yaw -= dt * 1.8;
  const lx = Math.abs(WALK.look.x) < 0.08 ? 0 : WALK.look.x, ly = Math.abs(WALK.look.y) < 0.08 ? 0 : WALK.look.y;
  if (lx || ly) { WALK.yaw -= lx * dt * 1.4; WALK.pitch = Math.max(-1.2, Math.min(1.2, WALK.pitch + ly * dt * 0.9)); }   // right stick turns the view (slowed + dead zone)
  const speed = (k.ShiftLeft || k.ShiftRight ? 10 : 5) * FT;
  _wFwd.set(-Math.sin(WALK.yaw), 0, -Math.cos(WALK.yaw)); _wRight.set(Math.cos(WALK.yaw), 0, -Math.sin(WALK.yaw));
  const mv = _wFwd.multiplyScalar(fwd).add(_wRight.multiplyScalar(side));
  if (mv.lengthSq() > 0) { const mag = Math.min(1, mv.length()); mv.normalize().multiplyScalar(speed * dt * mag); }
  for (const axis of ['x', 'z']) {
    const d = mv[axis]; if (Math.abs(d) < 1e-6) continue;
    const nx = WALK.pos.x + (axis === 'x' ? d : 0), nz = WALK.pos.z + (axis === 'z' ? d : 0);
    const fy = walkableFloorAt(nx, nz, WALK.feet);
    if (fy === -Infinity || fy === Infinity) continue;
    _wDir.set(axis === 'x' ? Math.sign(d) : 0, 0, axis === 'z' ? Math.sign(d) : 0);
    const checkBase = Math.max(WALK.feet, fy);
    let blocked = false;
    for (const hgt of [0.45, 0.75, 1.2, 1.65]) {
      if (castFirst(RT.solids, _wOrig.set(WALK.pos.x, checkBase + hgt, WALK.pos.z), _wDir, RAD + Math.abs(d))) { blocked = true; break; }
    }
    if (blocked) continue;
    WALK.pos.x = nx; WALK.pos.z = nz;
  }
  const fy = walkableFloorAt(WALK.pos.x, WALK.pos.z, WALK.feet);
  if (fy !== -Infinity && fy !== Infinity) WALK.feet = fy >= WALK.feet ? fy : WALK.feet + (fy - WALK.feet) * Math.min(1, dt * 10);
  camera.position.set(WALK.pos.x, WALK.feet + EYE, WALK.pos.z);
  camera.rotation.set(WALK.pitch, WALK.yaw, 0, 'YXZ');
  walkSyncRoom();
}

let lastWalkRoom = '';
function walkRoomAt() {
  const px = (WALK.pos.x - root.position.x) / FT, pz = (WALK.pos.z - root.position.z) / FT, py = WALK.feet / FT;
  const fl = py >= LV.LOFT - 2.0 ? 'loft' : 'ground';
  const sent = s => s === 'MECH' ? 'MECH' : s.charAt(0) + s.slice(1).toLowerCase();
  for (const r of ROOMS) {
    if (r.floor !== fl || r.nolabel) continue;
    for (const [x0, x1, z0, z1] of r.rects) {
      if (px >= x0 && px <= x1 && pz >= z0 && pz <= z1) return sent(r.name);
    }
  }
  if (px >= 16.5 && px <= 24.5 && pz > 16.5 && pz <= 30.5 && py > -1.5) return 'Entry deck';
  if (px >= -10 && px < 0.6 && pz >= 0 && pz <= 17 && py > -1.5) return 'West deck';
  if (pz > 27) return 'South lawn';
  return 'Outside';
}
function walkSyncRoom(force) {
  const name = walkRoomAt();
  if (!force && name === lastWalkRoom) return;
  lastWalkRoom = name;
  const sp = document.querySelector('#walk-room-btn span');
  if (sp) sp.textContent = name;
  document.querySelectorAll('#walk-room-pop button').forEach(b => b.classList.toggle('cur', b.dataset.room === name));
}
function closeWalkPops() {
  for (const [btnId, popId] of [['walk-room-btn', 'walk-room-pop'], ['walk-light-btn', 'walk-light-pop']]) {
    const b = document.getElementById(btnId), p = document.getElementById(popId);
    if (b) b.setAttribute('aria-expanded', 'false');
    if (p) p.hidden = true;
  }
}
function toggleWalkPop(btnId, popId) {
  const p = document.getElementById(popId), b = document.getElementById(btnId);
  if (!p || !b) return;
  const open = p.hidden;
  closeWalkPops();
  if (open) { p.hidden = false; b.setAttribute('aria-expanded', 'true'); }
}
function walkTeleport(spot) {
  const w = toW(spot.pos[0], spot.pos[1], spot.pos[2]);
  const fy = floorAt(w.x, w.z, w.y + 0.5 * FT);
  WALK.pos.set(w.x, 0, w.z);
  WALK.feet = fy !== -Infinity ? fy : w.y;
  WALK.yaw = spot.yaw;
  WALK.pitch = -0.04;
  camera.position.set(WALK.pos.x, WALK.feet + EYE, WALK.pos.z);
  camera.rotation.set(WALK.pitch, WALK.yaw, 0, 'YXZ');
  MODES.takeOver();
  walkSyncRoom(true);
}
{
  const pop = document.getElementById('walk-room-pop');
  if (pop) {
    let curSec = '';
    for (const spot of WALK_SPOTS) {
      if (spot.sec !== curSec) {
        curSec = spot.sec;
        const hd = document.createElement('div');
        hd.className = 'wp-sec';
        hd.textContent = curSec;
        pop.appendChild(hd);
      }
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.room = spot.name;
      btn.textContent = spot.name;
      btn.addEventListener('click', () => { walkTeleport(spot); closeWalkPops(); });
      pop.appendChild(btn);
    }
  }
  document.getElementById('walk-room-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleWalkPop('walk-room-btn', 'walk-room-pop'); });
  document.getElementById('walk-light-btn')?.addEventListener('click', e => { e.stopPropagation(); toggleWalkPop('walk-light-btn', 'walk-light-pop'); });
  document.addEventListener('pointerdown', e => {
    if (!WALK.on) return;
    if (!e.target.closest('#walkhud, #walk-room-pop, #walk-light-pop')) closeWalkPops();
  });
}
function enterWalk() {
  if (TOUR.on) MODES.exitTour();
  if (TL.on) MODES.exitTimeline();
  if (BD.on) MODES.exitBuild();
  WALK.saved = { state: { ...state }, pos: camera.position.clone(), target: controls.target.clone() };
  Object.assign(state, { floors: 'both', walls: 'up', roof: true, explode: 0, labels: false }); MODES.applyState(); MODES.select(null);
  buildColliders();
  const start = toW(19.7, 0, 24);                                                // on the entry deck, facing Door 101
  WALK.pos.set(start.x, 0, start.z); WALK.feet = floorAt(start.x, start.z, 1.0); WALK.yaw = 0; WALK.pitch = -0.04;
  WALK.on = true; controls.enabled = false; setFov(phoneFov(FOV.inside));
  closeWalkPops(); walkSyncRoom(true);
  document.getElementById('walkhud').hidden = false;
  document.body.classList.add('walking');
}
function exitWalk() {
  if (!WALK.on || TOUR.walking) return;
  closeWalkPops();
  WALK.on = false; WALK.keys = {}; WALK.joy.x = WALK.joy.y = WALK.look.x = WALK.look.y = 0; setFov(phoneFov(FOV.orbit));
  document.getElementById('walkhud').hidden = true; document.body.classList.remove('walking');
  Object.assign(state, WALK.saved.state, { night: state.night, sun: state.sun }); MODES.applyState();   // keep the light set during the walk
  camera.position.copy(WALK.saved.pos); controls.target.copy(WALK.saved.target); controls.enabled = true; controls.update();
}
addEventListener('keydown', e => {
  if (e.key === 'Escape') { exitWalk(); MODES.exitTour(); if (TL.on) MODES.exitTimeline(); if (BD.on) MODES.exitBuild(); return; }
  if (!WALK.on) return;
  WALK.keys[e.code] = true;
  if (/^(Key[WASDQE]|Arrow)/.test(e.code)) MODES.takeOver();
  if (e.code.startsWith('Arrow') || e.code === 'Space') e.preventDefault();
});
addEventListener('keyup', e => { WALK.keys[e.code] = false; });
addEventListener('blur', () => { WALK.keys = {}; });
// iOS Safari ignores user-scalable=no, so block double-tap zoom in JS: a second tap
// within 350ms never becomes a zoom, and the pinch gesture never starts.
let lastTapEnd = 0;
document.addEventListener('touchend', e => { const now = Date.now(); if (now - lastTapEnd < 350) e.preventDefault(); lastTapEnd = now; }, { passive: false });
document.addEventListener('dblclick', e => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', e => e.preventDefault());

// Hold Space and drag to pan (like design tools). Only while the pointer is over the model, so Space
// still presses a focused button in the panel; not in walk mode, where Space belongs to walking.
{
  const el = renderer.domElement;
  let overCanvas = false, spacePan = false;
  el.addEventListener('pointerenter', () => { overCanvas = true; });
  el.addEventListener('pointerleave', () => { overCanvas = false; });
  const setPan = on => {
    spacePan = on;
    controls.mouseButtons.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    el.style.cursor = on ? 'grab' : '';
  };
  addEventListener('keydown', e => {
    if (e.code !== 'Space' || WALK.on || !overCanvas) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    if (!spacePan) setPan(true);
  });
  addEventListener('keyup', e => { if (e.code === 'Space' && spacePan) setPan(false); });
  addEventListener('blur', () => { if (spacePan) setPan(false); });
  el.addEventListener('pointerdown', () => { if (spacePan) el.style.cursor = 'grabbing'; });
  el.addEventListener('pointerup', () => { if (spacePan) el.style.cursor = 'grab'; });
}
renderer.domElement.addEventListener('pointerdown', e => { if (WALK.on) { MODES.takeOver(); WALK.drag = [e.clientX, e.clientY]; renderer.domElement.setPointerCapture?.(e.pointerId); } });
renderer.domElement.addEventListener('pointermove', e => {
  if (!WALK.on || !WALK.drag) return;
  const dir = document.body.classList.contains('m') ? 1 : -1;
  WALK.yaw += dir * (e.clientX - WALK.drag[0]) * 0.0045; WALK.pitch += dir * (e.clientY - WALK.drag[1]) * 0.0045;
  WALK.pitch = Math.max(-1.2, Math.min(1.2, WALK.pitch)); WALK.drag = [e.clientX, e.clientY];
});
addEventListener('pointerup', () => { WALK.drag = null; });
document.querySelectorAll('#walkpad [data-k]').forEach(b => {
  const k = b.dataset.k, on = v => e => { e.preventDefault(); WALK.keys[k] = v; };
  b.addEventListener('pointerdown', on(true)); b.addEventListener('pointerup', on(false)); b.addEventListener('pointerleave', on(false)); b.addEventListener('pointercancel', on(false));
});
document.getElementById('btn-walk').addEventListener('click', enterWalk);
document.getElementById('mode-exit').addEventListener('click', () => {
  MODES.closeSheet();
  if (TOUR.on) MODES.exitTour();
  if (WALK.on) exitWalk();
  if (TL.on) MODES.exitTimeline();
  if (BD.on) MODES.exitBuild();
});


MODES.enterWalk = enterWalk;
MODES.exitWalk = exitWalk;
MODES.buildColliders = buildColliders;
bindSnapshotHelpers(toast, walkRoomAt);

export { EYE, STEP, RAD, toW, buildColliders, castFirst, terrainGroundY, floorHitAt, floorAt, walkableFloorAt, walkStep, walkRoomAt, walkSyncRoom, closeWalkPops, toggleWalkPop, walkTeleport, enterWalk, exitWalk };
