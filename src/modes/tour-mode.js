// 15-stop Guided Tour controller with aerial camera flights and autonomous waypoint walking.
import * as THREE from 'three';
import { FT, FOV, HOME } from '../config/constants.js';
import { TOUR_STOPS } from '../config/rooms.js';
import { state, RT, MODES, ACTS, WALK, TOUR, TL, BD, ease, markObjBoundsDirty } from '../core/state.js';
import { camera, controls, phoneFov, setFov, homePos } from '../core/renderer.js';
import { EYE, toW, buildColliders, floorAt, exitWalk } from './walk-mode.js';

const cap$ = () => document.getElementById('tourcap');
// --- walking tour: the real walk engine, steered along hand-placed waypoints
function takeOver() {                                         // any touch of the controls hands the walk to you
  if (!WALK.auto) return;
  WALK.auto = null; TOUR.play = false;
  const p = document.getElementById('tour-play'); if (p) p.innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"/></svg>';
}
function tourWalkOn() {
  if (WALK.on) return;
  buildColliders(); WALK.on = true; controls.enabled = false; setFov(FOV.inside); document.body.classList.add('walking');
}
function tourWalkOff() {
  if (!WALK.on || !TOUR.walking) return;
  WALK.on = false; WALK.auto = null; WALK.keys = {}; WALK.joy.x = WALK.joy.y = 0; TOUR.walking = false; document.body.classList.remove('walking');
  document.getElementById('act-hint').hidden = true;
}
function tourOpenDoors(list) {                                // open doors on the route without counting them as found
  let any = false;
  for (const rx of list || []) for (const a of ACTS) if (a.kind === 'door' && !a.on && rx.test(a.label({ on: false }))) { a.on = true; a.run(a); markObjBoundsDirty(a.obj); any = true; }
}
const tw = (x, z) => toW(x, 0, z);
function beginWalk(s, teleport) {
  tourWalkOn(); TOUR.walking = true;
  const w = s.walk, pts = w.path.map(([x, z]) => tw(x, z)), start = pts[0];
  if (teleport) { WALK.pos.set(start.x, 0, start.z); WALK.feet = floorAt(start.x, start.z, (w.y + 3) * FT); }
  const l = toW(...w.look);
  tourOpenDoors(s.open);
  if (teleport) { WALK.yaw = Math.atan2(-(pts[1].x - start.x), -(pts[1].z - start.z)); WALK.pitch = -0.04; }
  WALK.auto = { pts: pts.slice(1), i: 0, look: l, done: false, t: 0, lastPos: WALK.pos.clone(), still: 0, shut: (s.shut || []).map(o => ({ ...o, done: false })) };
}
function tourShutDoors(A, P) {                              // close a door once we have walked well clear of it
  const px = P.x / FT + 24, pz = P.z / FT + 13.5;
  for (const o of A.shut) {
    if (o.done) continue;
    const v = o.axis === 'x' ? px : pz;
    if ((o.lt !== undefined && v < o.lt) || (o.gt !== undefined && v > o.gt)) {
      o.done = true;
      for (const a of ACTS) if (a.kind === 'door' && a.on && o.rx.test(a.label({ on: true }))) { a.on = false; a.run(a); markObjBoundsDirty(a.obj); }
    }
  }
}
function autoSteer(dt) {
  const A = WALK.auto, P = WALK.pos, tgt = A.pts[A.i];
  if (A.shut.length) tourShutDoors(A, P);
  const turn = (want, rate) => { let d = want - WALK.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); WALK.yaw += Math.max(-rate * dt, Math.min(rate * dt, d)); return d; };
  if (tgt) {
    const dx = tgt.x - P.x, dz = tgt.z - P.z, dist = Math.hypot(dx, dz);
    if (dist < 0.3 * FT * 3) { A.i++; A.still = 0; return { fwd: 0, side: 0 }; }
    const d = turn(Math.atan2(-dx, -dz), 3.2);
    WALK.pitch += (-0.05 - WALK.pitch) * Math.min(1, dt * 3);
    // stuck? after 1.2 s without progress, step to the waypoint
    A.t += dt;
    if (A.t > 0.4) { A.t = 0; if (P.distanceTo(A.lastPos) < 0.04) A.still += 0.4; else A.still = 0; A.lastPos.copy(P);
      if (A.still >= 1.2) { P.x = tgt.x; P.z = tgt.z; WALK.feet = floorAt(P.x, P.z, WALK.feet + 1.2); A.i++; A.still = 0; } }
    return { fwd: Math.abs(d) < 0.7 ? 0.8 : 0, side: 0 };
  }
  // arrived: ease round to look at the thing of the stop
  const lx = A.look.x - P.x, lz = A.look.z - P.z, hy = A.look.y - (WALK.feet + EYE);
  const d = turn(Math.atan2(-lx, -lz), 2.4), want = Math.max(-0.7, Math.min(0.7, Math.atan2(hy, Math.hypot(lx, lz))));
  WALK.pitch += (want - WALK.pitch) * Math.min(1, dt * 3);
  if (Math.abs(d) < 0.03 && Math.abs(want - WALK.pitch) < 0.03) A.done = true;
  return { fwd: 0, side: 0 };
}
function showCap(text, eyebrow, sub) {
  const el = cap$();
  if (!text) { el.hidden = true; el.textContent = ''; return; }
  if (eyebrow || sub) {
    el.textContent = '';
    if (eyebrow) { const eb = document.createElement('span'); eb.className = 'cap-eyebrow'; eb.textContent = eyebrow; el.appendChild(eb); }
    const tt = document.createElement('span'); tt.className = 'cap-title'; tt.textContent = text; el.appendChild(tt);
    if (sub) { const sb = document.createElement('span'); sb.className = 'cap-sub'; sb.textContent = sub; el.appendChild(sb); }
  } else {
    el.textContent = text;
  }
  el.hidden = false;
}
function tourGo(i) {
  TOUR.i = (i + TOUR_STOPS.length) % TOUR_STOPS.length;
  const s = TOUR_STOPS[TOUR.i], world = !!s.world, walkStop = !!s.walk;
  Object.assign(state, { floors: 'both', walls: 'up', roof: true, explode: 0, labels: false, night: !!s.night, sun: 14 }); MODES.applyState(); MODES.select(null);
  document.getElementById('tour-name').textContent = s.name;
  document.getElementById('tour-count').textContent = `${TOUR.i + 1} / ${TOUR_STOPS.length}`;
  TOUR.prog = 0;
  const pct = (TOUR.i / TOUR_STOPS.length) * 100;
  const sc = document.getElementById('tour-scrub'); if (sc) sc.value = String(TOUR.i);
  const nd = document.getElementById('tour-needle'); if (nd) nd.style.left = pct + '%';
  document.querySelectorAll('#tour-marks button').forEach((b, k) => b.classList.toggle('active', k === TOUR.i));
  showCap(s.cap); TOUR.wait = 0; TOUR.fly = null;
  if (walkStop) {
    buildColliders();
    const w = s.walk, st = tw(w.path[0][0], w.path[0][1]);
    const near = TOUR.walking && WALK.on && Math.hypot(WALK.pos.x - st.x, WALK.pos.z - st.z) < 4 * FT;
    if (near) { WALK.auto = null; beginWalk(s, false); return; }                          // carry on walking from where we stand
    tourWalkOff(); WALK.on = false;
    const fy = floorAt(st.x, st.z, (w.y + 3) * FT), p1 = new THREE.Vector3(st.x, fy + EYE, st.z), nx = tw(w.path[1][0], w.path[1][1]);
    TOUR.fly = { t: 0, dur: 2.2, p0: camera.position.clone(), q0: controls.target.clone(), p1, q1: new THREE.Vector3(nx.x, fy + EYE, nx.z),
      f0: camera.fov, f1: phoneFov(FOV.inside), after: () => beginWalk(s, true) };
    controls.enabled = false; return;
  }
  tourWalkOff();
  const p1 = world ? homePos() : toW(...s.pos), q1 = world ? HOME.target.clone() : toW(...s.look);
  if (!world && camera.aspect < 0.9) {
    const pull = Math.min(1.65, Math.max(1, 0.85 / camera.aspect));
    p1.sub(q1).multiplyScalar(pull).add(q1);
  }
  TOUR.fly = { t: 0, dur: 2.4, p0: camera.position.clone(), q0: controls.target.clone(), p1, q1, f0: camera.fov, f1: phoneFov(FOV.orbit) };
  controls.enabled = false;
}
function enterTour() {
  if (WALK.on) exitWalk();
  if (TL.on) MODES.exitTimeline();
  if (BD.on) MODES.exitBuild();
  TOUR.saved = { state: { ...state }, liveTime: RT.liveTime, pos: camera.position.clone(), target: controls.target.clone() };
  RT.liveTime = false; RT.liveSync = null;
  TOUR.on = true; TOUR.play = true; TOUR.speed = 1;
  document.getElementById('tour-play').innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z"/></svg>';
  document.getElementById('tour-speed').textContent = '1×';
  document.body.classList.add('touring'); controls.minDistance = 0.3; document.getElementById('tourbar').hidden = false;
  tourGo(0);
}
function exitTour() {
  if (!TOUR.on) return;
  tourWalkOff();
  TOUR.on = false; TOUR.play = false; document.body.classList.remove('touring'); TOUR.fly = null; controls.minDistance = 3; setFov(phoneFov(FOV.orbit)); showCap('');
  document.getElementById('tourbar').hidden = true;
  RT.liveTime = TOUR.saved.liveTime;
  Object.assign(state, TOUR.saved.state); MODES.applyState();
  camera.position.copy(TOUR.saved.pos); controls.target.copy(TOUR.saved.target); controls.enabled = true; controls.update();
}
function tourStep(dt) {
  const s = TOUR_STOPS[TOUR.i], hasWalk = !!(s && s.walk);
  let prog = TOUR.prog || 0;
  if (TOUR.fly) {
    const F = TOUR.fly; F.t += dt * TOUR.speed; const k = ease(Math.min(1, F.t / F.dur));
    camera.position.lerpVectors(F.p0, F.p1, k); controls.target.lerpVectors(F.q0, F.q1, k); camera.lookAt(controls.target);
    setFov(F.f0 + (F.f1 - F.f0) * k);
    prog = k * (hasWalk ? 0.35 : 0.5);
    if (F.t >= F.dur) { TOUR.fly = null; if (F.after) F.after(); else controls.enabled = true; }
  } else if (WALK.on && WALK.auto && !WALK.auto.done) {
    const A = WALK.auto;
    prog = 0.35 + 0.4 * (A.i / Math.max(1, A.pts.length));
  } else if (TOUR.play) {
    TOUR.wait += dt * TOUR.speed;
    const base = hasWalk ? 0.75 : 0.5;
    prog = base + (1 - base) * Math.min(1, TOUR.wait / 3.5);
    if (TOUR.wait > 3.5) { tourGo(TOUR.i + 1); return; }
  }
  TOUR.prog = Math.max(TOUR.prog || 0, Math.min(1, prog));
  const nd = document.getElementById('tour-needle');
  if (nd) nd.style.left = ((TOUR.i + TOUR.prog * 0.88) / TOUR_STOPS.length) * 100 + '%';
}
{
  const mk = document.getElementById('tour-marks'), sc = document.getElementById('tour-scrub');
  if (sc) sc.max = String(TOUR_STOPS.length - 1);
  if (mk) {
    TOUR_STOPS.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.tip = s.name;
      b.setAttribute('aria-label', s.name);
      b.style.left = (i / TOUR_STOPS.length * 100).toFixed(2) + '%';
      b.style.width = Math.max(2.2, 100 / TOUR_STOPS.length - 0.8).toFixed(2) + '%';
      b.addEventListener('click', () => tourGo(i));
      mk.appendChild(b);
    });
  }
}
document.getElementById('btn-tour').addEventListener('click', enterTour);
document.getElementById('tour-scrub')?.addEventListener('input', e => tourGo(Number(e.target.value)));
document.getElementById('tour-prev')?.addEventListener('click', () => tourGo(TOUR.i - 1));
document.getElementById('tour-play')?.addEventListener('click', e => { TOUR.play = !TOUR.play; TOUR.wait = 0; e.currentTarget.innerHTML = TOUR.play ? '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z"/></svg>' : '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"/></svg>'; });
document.getElementById('tour-next')?.addEventListener('click', () => tourGo(TOUR.i + 1));
document.getElementById('tour-speed')?.addEventListener('click', e => { TOUR.speed = TOUR.speed === 1 ? 2 : 1; e.currentTarget.textContent = TOUR.speed + '×'; });


MODES.enterTour = enterTour;
MODES.exitTour = exitTour;
MODES.tourGo = tourGo;
MODES.takeOver = takeOver;
MODES.autoSteer = autoSteer;
MODES.showCap = showCap;

export { cap$, takeOver, tourWalkOn, tourWalkOff, tourOpenDoors, tw, beginWalk, tourShutDoors, autoSteer, showCap, tourGo, enterTour, exitTour, tourStep };
