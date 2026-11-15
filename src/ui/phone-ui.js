// Mobile layout (body.m), bottom sheet, dual touch joysticks (#joy, #look), and discovery hotspots.
import * as THREE from 'three';
import { FT, MQ_PHONE, HOME } from '../config/constants.js';
import { state, RT, MODES, ACTS, FOUND, KINDS, FLY, TINY, WALK, TOUR, TL, BD, ease, isShown, actCenter } from '../core/state.js';
import { renderer, camera, controls, homePos } from '../core/renderer.js';
import { pickAct, useAct, toast } from '../systems/interactions.js';
import { EYE, RAD, buildColliders, castFirst, floorAt, enterWalk, exitWalk } from '../modes/walk-mode.js';
import { takeOver, enterTour, exitTour } from '../modes/tour-mode.js';
import { applyState } from './controls-ui.js';

const $$ = id => document.getElementById(id);

function flyTo(p1, q1, dur = 1.3) {
  FLY.cur = { t: 0, dur, p0: camera.position.clone(), q0: controls.target.clone(), p1, q1 };
  controls.enabled = false;
}
function flyStep(dt) {
  const F = FLY.cur; if (!F) return;
  F.t += dt; const k = ease(Math.min(1, F.t / F.dur));
  camera.position.lerpVectors(F.p0, F.p1, k); controls.target.lerpVectors(F.q0, F.q1, k); camera.lookAt(controls.target);
  if (F.t >= F.dur) { FLY.cur = null; controls.enabled = !WALK.on && !TOUR.on; if (controls.enabled) controls.update(); }
}

function showAct(a) {                                        // "Show me" / "Surprise me": drop into walk mode right in front of the thing
  const c = actCenter(a); if (!c) return;
  closeSheet(); FLY.cur = null;
  if (TOUR.on) exitTour();
  if (!WALK.on) enterWalk(); else { takeOver(); buildColliders(); }
  const radii = a.kind === 'car' ? [7, 9, 5.5] : [4.6, 3.6, 2.8], cur = WALK.pos;
  let best = null, bs = -Infinity;
  for (const R of radii) for (let i = 0; i < 16; i++) {
    const az = i / 16 * Math.PI * 2, x = c.x + Math.sin(az) * R * FT, z = c.z + Math.cos(az) * R * FT;
    const fy = floorAt(x, z, c.y + 0.3); if (fy === -Infinity || c.y - fy > 3.4 || fy - c.y > 0.3) continue;       // needs floor, roughly level with the thing
    const eye = new THREE.Vector3(x, fy + EYE, z), to = c.clone().sub(eye), L = to.length(); to.normalize();
    const blocked = castFirst(RT.solids, eye, to, L - 0.35);
    let room = 0;                                                                                                    // room to stand: nothing within a body width on four sides
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!castFirst(RT.solids, new THREE.Vector3(x, fy + 1.2 * FT * 3, z), new THREE.Vector3(dx, 0, dz), RAD)) room++;
    const sc = (blocked ? 0 : 10) + room * 1.5 + (R === radii[0] ? 2 : 0) - Math.abs(fy - WALK.feet) * 0.15 - Math.hypot(x - cur.x, z - cur.z) * 0.01;
    if (sc > bs) { bs = sc; best = { x, z, fy, eye }; }
  }
  if (!best) { const c0 = c.clone(); best = { x: c0.x + 3 * FT, z: c0.z, fy: floorAt(c0.x + 3 * FT, c0.z, c0.y + 0.3), eye: null }; if (best.fy === -Infinity) return; }
  const lx = c.x - best.x, lz = c.z - best.z, yaw1 = Math.atan2(-lx, -lz), pitch1 = Math.max(-0.5, Math.min(0.5, Math.atan2(c.y - (best.fy + EYE), Math.hypot(lx, lz))));
  let dy = yaw1 - WALK.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  WALK.glide = { t: 0, dur: 1.0, x0: WALK.pos.x, z0: WALK.pos.z, f0: WALK.feet, x1: best.x, z1: best.z, f1: best.fy, y0: WALK.yaw, dy, p0: WALK.pitch, p1: pitch1 };
  toast('Tap Use when it lights up \u00b7 \u2605 for the list');
}
// sheet + panes
const sheet = $$('msheet'), scrim = $$('mscrim');
let sheetPane = null;
function openSheet(pane) {
  sheetPane = pane; sheet.classList.add('open');
  if (scrim) scrim.classList.add('open');
  $$('mb-more').setAttribute('aria-pressed', 'true');
}
function closeSheet() {
  sheetPane = null; sheet.classList.remove('open');
  if (scrim) scrim.classList.remove('open');
  $$('mb-more').setAttribute('aria-pressed', 'false');
}
if (scrim) scrim.addEventListener('click', closeSheet);
$$('msheet-close').addEventListener('click', closeSheet);
$$('mb-more').addEventListener('click', () => sheetPane === 'more' ? closeSheet() : openSheet('more'));
$$('mb-explore').addEventListener('click', () => {
  closeSheet(); const wasExploring = !WALK.on && !TOUR.on && !TL.on && !(typeof BD !== 'undefined' && BD.on);
  if (WALK.on) exitWalk(); if (TOUR.on) exitTour(); if (TL.on) MODES.exitTimeline(); if (BD.on) MODES.exitBuild();
  if (wasExploring) { Object.assign(state, { floors: 'both', walls: 'cutaway', roof: false }); applyState(); flyTo(homePos(), HOME.target.clone()); }
});
$$('mb-walk').addEventListener('click', () => { closeSheet(); if (WALK.on) exitWalk(); else { FLY.cur = null; enterWalk(); toast('Left stick moves · right stick looks · tap Use'); } });
$$('mb-tour').addEventListener('click', () => { closeSheet(); FLY.cur = null; if (TOUR.on) exitTour(); else enterTour(); });
$$('mb-year').addEventListener('click', () => { closeSheet(); FLY.cur = null; MODES.enterTimeline(); });
$$('mb-build').addEventListener('click', () => { closeSheet(); FLY.cur = null; MODES.enterBuild(); });
$$('chip-floors').addEventListener('click', () => { state.floors = state.floors === 'ground' ? 'both' : 'ground'; applyState(); });
$$('chip-shell').addEventListener('click', () => {
  if (state.roof) { state.roof = false; state.walls = 'cutaway'; }
  else if (state.walls === 'cutaway') { state.walls = 'up'; state.roof = false; }
  else { state.walls = 'up'; state.roof = true; }
  applyState();
});
$$('chip-season').addEventListener('click', () => {
  const order = ['fall', 'winter', 'spring', 'summer'];
  state.season = order[(order.indexOf(state.season) + 1) % order.length];
  applyState();
});
$$('chip-night').addEventListener('click', () => { state.night = !state.night; applyState(); });
// move the More popover's controls into the sheet on phones (and back on desktop)
const MORE_POP = $$('more-pop'), MORE_ROW = MORE_POP.querySelector('.more-row'), MORE_TIPS = MORE_POP.querySelector('.more-tips');
const rowOf = id => $$(id).closest('.row');
const PARTS = { explode: rowOf('explode'), sun: rowOf('suntime'), status: $$('status') };
function layoutPhone(on) {
  document.body.classList.toggle('m', on);
  if (on) {
    $$('pane-more').append(PARTS.sun, PARTS.explode, MORE_ROW, PARTS.status, MORE_TIPS);
    $$('mintro').classList.remove('gone');
  } else {
    MORE_POP.append(PARTS.sun, PARTS.explode, MORE_ROW, PARTS.status, MORE_TIPS);
    closeSheet();
  }
  applyState();
  if (on !== layoutPhone.was) { camera.position.copy(homePos()); controls.target.copy(HOME.target); controls.update(); }
  layoutPhone.was = on;
}
layoutPhone.was = false;
layoutPhone(MQ_PHONE.matches);
MQ_PHONE.addEventListener('change', e => layoutPhone(e.matches));
let introT = setTimeout(() => $$('mintro').classList.add('gone'), 7000);
renderer.domElement.addEventListener('pointerdown', () => { clearTimeout(introT); $$('mintro').classList.add('gone'); }, { once: true });
// walking stick + Use button
{
  const joy = $$('joy'), knob = joy.querySelector('i'); let pid = null;
  const set = (e) => {
    const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 - 8;
    let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; WALK.joy.x = dx / R; WALK.joy.y = -dy / R;
  };
  const end = () => { pid = null; knob.style.transform = ''; WALK.joy.x = WALK.joy.y = 0; };
  joy.addEventListener('pointerdown', e => { takeOver(); pid = e.pointerId; try { joy.setPointerCapture(e.pointerId); } catch (_) {} set(e); e.preventDefault(); });
  joy.addEventListener('pointermove', e => { if (e.pointerId === pid) set(e); });
  joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  {                                                                                    // the right-hand stick: look around
    const lk = $$('look'), kn = lk.querySelector('i'); let lid = null;
    const setL = e => {
      const r = lk.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2 - 8;
      let dx = e.clientX - cx, dy = e.clientY - cy; const l = Math.hypot(dx, dy); if (l > R) { dx *= R / l; dy *= R / l; }
      kn.style.transform = `translate(${dx}px,${dy}px)`; WALK.look.x = dx / R; WALK.look.y = -dy / R;
    };
    const endL = () => { lid = null; kn.style.transform = ''; WALK.look.x = WALK.look.y = 0; };
    lk.addEventListener('pointerdown', e => { takeOver(); lid = e.pointerId; try { lk.setPointerCapture(e.pointerId); } catch (_) {} setL(e); e.preventDefault(); });
    lk.addEventListener('pointermove', e => { if (e.pointerId === lid) setL(e); });
    lk.addEventListener('pointerup', endL); lk.addEventListener('pointercancel', endL);
  }
  $$('usebtn').addEventListener('pointerdown', e => { e.preventDefault(); if (RT.aimAct) { useAct(RT.aimAct); RT.aimTick = 4; } });
}
// hotspots: pulsing dots on the nearest things you haven't tried yet
const SPOTS = [], spotEl = $$('spots'); let spotTick = 0;
const SC = { list: [], idx: 0, found: [], dots: [], wait: 0 };
const VO = { cur: 0, on: false };
const _v = new THREE.Vector3();
function phoneStep(dt) {
  if (FLY.cur && !WALK.on && !TOUR.on) flyStep(dt);
  const tlOn = typeof TL !== 'undefined' && TL.on, bdOn = typeof BD !== 'undefined' && BD.on;
  const far = !WALK.on && (tlOn || bdOn || camera.position.distanceTo(controls.target) > 22);
  if (far !== TINY.far) { TINY.far = far; if (far) camera.layers.disable(1); else camera.layers.enable(1); }
  if (!document.body.classList.contains('m')) { if (SPOTS.length) { SPOTS.forEach(s => s.style.display = 'none'); } return; }
  if (FOUND.size !== RT.lastFound) {
    RT.lastFound = FOUND.size; const mf = $$('m-found'); if (mf) mf.textContent = `${FOUND.size} / ${KINDS()}`;
  }
  $$('mb-explore').setAttribute('aria-pressed', String(!WALK.on && !TOUR.on && !tlOn && !bdOn)); $$('mb-walk').setAttribute('aria-pressed', String(WALK.on)); $$('mb-tour').setAttribute('aria-pressed', String(TOUR.on)); $$('mb-year').setAttribute('aria-pressed', String(tlOn)); $$('mb-build').setAttribute('aria-pressed', String(bdOn));
  if (WALK.on) { const ub = $$('usebtn'); ub.classList.toggle('ready', !!RT.aimAct); ub.firstChild.textContent = RT.aimAct ? RT.aimAct.label(RT.aimAct) : 'Nothing to use'; }
  const show = !tlOn && !bdOn && !(TOUR.on && !WALK.on) && !FLY.cur && state.explode < 0.05;
  if (!show) { SC.list = []; SC.dots = []; for (const sp of SPOTS) sp.style.display = 'none'; return; }
  // 1) the visibility scan: nearest few unfound things, ONE ray-test per frame, so there is never a hitch
  if (!SC.list.length) {
    if (++SC.wait > 20) {
      SC.wait = 0; SC.found = []; SC.idx = 0;
      const ref = WALK.on ? camera.position : controls.target, perKind = {}, cands = [];
      for (const a of ACTS) {
        if (FOUND.has(a.kind) || !isShown(a.obj)) continue;
        const c = actCenter(a); if (!c) continue;
        const d = c.distanceTo(ref); if (WALK.on && d > 11 * FT) continue;
        cands.push([d, a, c]);
      }
      cands.sort((p, q) => p[0] - q[0]);
      SC.list = cands.filter(([, a]) => (perKind[a.kind] = (perKind[a.kind] || 0) + 1) <= 2).slice(0, 14);
    }
  } else {
    const [, a, c] = SC.list[SC.idx++];
    if (!SC.found.some(f => f.hit.kind === a.kind)) {
      _v.copy(c).project(camera);
      if (_v.z <= 1 && Math.abs(_v.x) <= 1 && Math.abs(_v.y) <= 1) {
        let hit = pickAct(_v.x, _v.y, 400); if (!hit || hit.kind !== a.kind) hit = pickAct(_v.x + 0.05, _v.y, 400);      // the centre may sit in a door seam
        if (hit && hit.kind === a.kind) SC.found.push({ hit, c });
      }
    }
    if (SC.idx >= SC.list.length) { SC.dots = SC.found.slice(0, 6); SC.list = []; }
  }
  // 2) the dots follow the camera every few frames (projection only, no rays)
  if (++spotTick % 3) return;
  let n = 0;
  for (const { hit, c } of SC.dots) {
    if (FOUND.has(hit.kind)) continue;
    _v.copy(c).project(camera); if (_v.z > 1 || Math.abs(_v.x) > 1 || Math.abs(_v.y) > 1) continue;
    let sp = SPOTS[n]; if (!sp) { sp = SPOTS[n] = document.createElement('div'); sp.className = 'spot'; sp.innerHTML = '<i></i>'; spotEl.append(sp); sp.addEventListener('pointerup', e => { e.stopPropagation(); if (sp._a) { useAct(sp._a); RT.lastFound = -1; } }); }
    sp._a = hit; sp.style.left = ((_v.x + 1) / 2 * innerWidth) + 'px'; sp.style.top = ((1 - _v.y) / 2 * innerHeight) + 'px'; sp.style.display = 'grid'; n++;
  }
  for (let i = n; i < SPOTS.length; i++) SPOTS[i].style.display = 'none';
}


MODES.closeSheet = closeSheet;
MODES.flyTo = flyTo;

export { $$, flyTo, flyStep, showAct, openSheet, closeSheet, layoutPhone, SPOTS, SC, VO, phoneStep };
