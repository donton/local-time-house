// Interactive objects (ACTS), two-stage broadphase/narrowphase raycaster, fireplace, TV, showers, mirrors, and WebAudio.
import * as THREE from 'three';
import { FT, LV, LITE } from '../config/constants.js';
import { state, RT, MODES, ACTS, FX_SHOWERS, FAN, FX_MIRRORS, TWEENS, smoke, skyFx, LIGHTS_OUT, FOUND, KINDS, WALK, TOUR, TL, BD, act, actOf, isShown, actCenter, markObjBoundsDirty, markShadows } from '../core/state.js';
import { M } from '../core/materials.js';
import { root, G } from '../house/site-and-floors.js';
import { renderer, camera, bindSnapshotHelpers } from '../core/renderer.js';
import { CAR } from '../landscape/terrain-and-trees.js';
import { PATIO, GRILL } from '../landscape/outdoor-living.js';
import { _cv } from './cutaway.js';
import { bindRoomClickSelection } from './labels-selection.js';

const fireCan = document.createElement('canvas'); fireCan.width = 128; fireCan.height = 72;
const fireTex = new THREE.CanvasTexture(fireCan); fireTex.colorSpace = THREE.SRGBColorSpace;
function drawFire(ctx, w, h, t) {
  ctx.fillStyle = '#120804'; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 14; i++) {
    const x = w * (0.12 + 0.76 * ((i * 0.37) % 1)), fh = h * (0.45 + 0.35 * Math.abs(Math.sin(t * 3.1 + i * 1.7)));
    const gr = ctx.createRadialGradient(x, h, 2, x, h - fh * 0.5, fh * 0.7);
    gr.addColorStop(0, 'rgba(255,240,170,0.95)'); gr.addColorStop(0.35, 'rgba(255,150,40,0.75)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.ellipse(x, h - fh * 0.45, w * 0.07, fh * 0.55, 0, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = '#3a2214'; ctx.fillRect(w * 0.18, h * 0.86, w * 0.64, h * 0.08);   // logs
}
const fireMat = new THREE.MeshBasicMaterial({ map: fireTex });
const fireLight = new THREE.PointLight(0xff8a3c, 0, 7, 2); fireLight.visible = true;

const tvCan = document.createElement('canvas'); tvCan.width = 256; tvCan.height = 148;
const tvTex = new THREE.CanvasTexture(tvCan); tvTex.colorSpace = THREE.SRGBColorSpace;
const tvLight = new THREE.PointLight(0x9fb8ff, 0, 8, 2); tvLight.visible = true;

const TV_CH = ['', 'Fireplace channel', 'Catskills at dusk', 'Color bars', 'The big game'];
function drawTV(ch, t) {
  const c = tvCan.getContext('2d'), w = tvCan.width, h = tvCan.height;
  if (ch === 1) drawFire(c, w, h, t);
  else if (ch === 2) {
    const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2b3a67'); g.addColorStop(0.55, '#e4875a'); g.addColorStop(1, '#f2c27a');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (const [k, col] of [[0.55, '#5a4a6a'], [0.68, '#3b3550'], [0.8, '#23202f']]) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) c.lineTo(x, h * k + Math.sin(x * 0.03 + k * 9 + t * 0.05) * 10 + Math.sin(x * 0.011) * 14);
      c.lineTo(w, h); c.fill();
    }
  } else if (ch === 3) {
    ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0'].forEach((col, i) => { c.fillStyle = col; c.fillRect(i * w / 7, 0, w / 7 + 1, h * 0.75); });
    c.fillStyle = '#111'; c.fillRect(0, h * 0.75, w, h * 0.25);
  } else if (ch === 4) {
    c.fillStyle = '#2f7d3a'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(255,255,255,0.8)'; c.lineWidth = 2;
    for (let x = 20; x < w; x += 36) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc((t * 40) % w, h * 0.5 + Math.sin(t * 2) * 30, 4, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(0,0,0,0.55)'; c.fillRect(8, 8, 70, 18); c.fillStyle = '#fff'; c.font = '12px sans-serif'; c.fillText('HOME 3  AWAY 2', 12, 21);
  }
  tvTex.needsUpdate = true;
}
// --- shower: falling water, steam, mirror fog
// a soft hiss while any shower runs (made with WebAudio on the first tap; silent if audio isn't available)
let SH_AUDIO = null, SH_ON = 0;
function showerSound(on) {
  SH_ON = Math.max(0, SH_ON + (on ? 1 : -1));
  try {
    if (!SH_AUDIO) {
      const ac = new (window.AudioContext || window.webkitAudioContext)(), buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
      src.buffer = buf; src.loop = true; f.type = 'bandpass'; f.frequency.value = 3200; f.Q.value = 0.6; g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(ac.destination); src.start(); SH_AUDIO = { ac, g };
    }
    SH_AUDIO.ac.resume(); SH_AUDIO.g.gain.setTargetAtTime(SH_ON > 0 ? 0.07 : 0, SH_AUDIO.ac.currentTime, 0.25);
  } catch (e) { /* no audio */ }
}

function skyWeather(open, [x0, x1, za, zb], top) {
  const kind = state.season === 'winter' ? 'snow' : state.season === 'fall' ? 'leaves' : null;
  const old = skyFx.find(f => f.x0 === x0); if (old) { old.on = open && !!kind; if (!open || !kind) return; old.kind = kind; old.pts.material.color.set(kind === 'snow' ? 0xffffff : 0xd0702e); old.pts.material.size = kind === 'snow' ? 0.05 : 0.09; return; }
  if (!open || !kind) return;
  const n = 140, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 2] = za + Math.random() * (zb - za); pos[i * 3 + 1] = LV.LOFT + Math.random() * (top(za) - LV.LOFT); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: kind === 'snow' ? 0xffffff : 0xd0702e, size: kind === 'snow' ? 0.05 : 0.09, transparent: true, opacity: 0.9, depthWrite: false }));
  pts.userData.nocut = true; G.loft.add(pts);
  skyFx.push({ x0, x1, za, zb, top, pts, on: true, kind });
}

(function registerFx() {
  if (RT.FX_FIRE) {
    RT.FX_FIRE.glass.geometry.setAttribute('uv', new THREE.BoxGeometry(1, 1, 1).attributes.uv.clone());   // plain 0–1 UVs so the flames fill the glass
    fireLight.position.set(...RT.FX_FIRE.at); RT.FX_FIRE.group.add(fireLight);
    for (let i = 0; i < 12; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd4cfc7, transparent: true, opacity: 0, depthWrite: false }));
      sp.scale.setScalar(0.95); sp.visible = false; sp.position.set(...RT.FX_FIRE.flue);
      sp.userData = { t: i / 12, rise: 10.5, drift: 2.2, s0: 0.85, s1: 3.1 };
      RT.FX_FIRE.group.add(sp); smoke.push(sp);
    }
    act(RT.FX_FIRE.glass, { kind: 'fireplace', label: d => d.on ? 'Put out the fire' : 'Light the fire', run: d => {
      RT.FX_FIRE.glass.material = d.on ? fireMat : M('frame'); fireLight.intensity = d.on ? 7 : 0; smoke.forEach(sp => { if (!sp.userData.origin) sp.visible = d.on; }); } });
  }
  if (RT.FX_TV) {
    RT.tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(RT.FX_TV.w, RT.FX_TV.h).rotateY(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: tvTex }));
    RT.tvScreen.position.set(...RT.FX_TV.center); RT.tvScreen.visible = false; RT.FX_TV.group.add(RT.tvScreen);
    tvLight.position.set(RT.FX_TV.center[0] - 1.6, RT.FX_TV.center[1] - 0.3, RT.FX_TV.center[2]); RT.FX_TV.group.add(tvLight);
    const grp = new THREE.Group(); RT.FX_TV.group.add(grp); RT.FX_TV.group.remove(RT.FX_TV.box); grp.add(RT.FX_TV.box); RT.FX_TV.group.remove(RT.tvScreen); grp.add(RT.tvScreen);
    act(grp, { kind: 'tv', ch: 0, label: d => d.ch === 0 ? 'Turn on the TV' : d.ch === TV_CH.length - 1 ? 'Turn off the TV' : 'Next channel', run: d => {
      d.ch = (d.ch + 1) % TV_CH.length; d.on = d.ch > 0; RT.tvScreen.visible = d.on; tvLight.intensity = d.on ? 2.6 : 0; if (d.on) { drawTV(d.ch, 0); toast(TV_CH[d.ch]); } } });
  }
  for (const S of FX_SHOWERS) {
    const n = 320, [hx, hy, hz] = S.head;
    S.mesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.024, 0.024, 0.6, 4), new THREE.MeshBasicMaterial({ color: 0xcde6ff, transparent: true, opacity: 0.9, depthWrite: false }), n);
    S.mesh.renderOrder = -1;                                  // draw before the glass so the spray shows through it
    S.mesh.frustumCulled = false; S.mesh.visible = false; S.mesh.userData.nocut = true; S.group.add(S.mesh);
    S.drops = Array.from({ length: n }, () => [hx + (Math.random() - 0.5) * 0.7, hy - Math.random() * (hy - S.floor), hz + (Math.random() - 0.5) * 0.7, (Math.random() - 0.5) * 0.9]);
    S.dummy = new THREE.Object3D(); S.fog = 0;
    const [x0, x1, z0, z1] = S.zone;
    S.steam = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 7, z1 - z0), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    S.steam.position.set((x0 + x1) / 2, S.floor + 3.5, (z0 + z1) / 2); S.steam.visible = false; S.steam.userData.nocut = true; S.group.add(S.steam);
    const [tx0, tx1, ty0, ty1, tz0, tz1] = S.tap;                                        // an invisible plate on the stall wall: a big target for the tap
    const tap = new THREE.Mesh(new THREE.BoxGeometry(tx1 - tx0, ty1 - ty0, tz1 - tz0), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
    tap.position.set((tx0 + tx1) / 2, (ty0 + ty1) / 2, (tz0 + tz1) / 2); tap.userData.nocut = true;
    const grp = new THREE.Group(); S.group.add(grp); S.parts.forEach(m => { S.group.remove(m); grp.add(m); }); grp.add(tap);
    act(grp, { kind: 'shower', label: d => d.on ? 'Turn off the water' : 'Turn on the water', run: d => { S.mesh.visible = d.on; S.steam.visible = true; showerSound(d.on); toast(d.on ? 'Water on' : 'Water off'); } });
  }
})();
// --- toast (channel names etc.)
let toastT = 0;
function toast(msg) { const el = document.getElementById('act-toast'); el.textContent = msg; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 1600); }


// P5: Two-Stage Broadphase (ACTS Box3) -> Narrowphase (Mesh + Occlusion) Raycasting
export const AR = new THREE.Raycaster(), AV = new THREE.Vector2();
AR.layers.set(0);
let PICK_ROOTS = null;

export function pickAct(nx, ny, maxDist) {
  AV.set(nx, ny);
  AR.setFromCamera(AV, camera);
  // Stage 1: Fast bounding-box broadphase across interactive ACTS (~35 boxes, < 0.02 ms)
  let anyBoxHit = false;
  const orig = AR.ray.origin;
  for (let i = 0; i < ACTS.length; i++) {
    const a = ACTS[i];
    if (!isShown(a.obj)) continue;
    const c = actCenter(a);
    if (!c) continue;
    if (orig.distanceTo(c) > maxDist + 10) continue;
    if (AR.ray.intersectsBox(a._wbox)) {
      anyBoxHit = true;
      break;
    }
  }
  if (!anyBoxHit) return null;

  // Stage 2: Narrowphase mesh intersection & wall occlusion
  if (!PICK_ROOTS) PICK_ROOTS = [G.ground, G.loft, G.mainRoof, G.wingRoof, G.site, CAR.car, GRILL.grp];
  const hits = AR.intersectObjects(PICK_ROOTS, true);
  for (const h of hits) {
    if (!isShown(h.object) || h.object.isPoints || h.object.isLineSegments || FX_SHOWERS.some(S => S.steam === h.object)) continue;
    const a = actOf(h.object);
    if (!a && h.object.material && h.object.material.transparent) continue;
    return a && h.distance <= maxDist ? a : null;
  }
  return null;
}

const _STAR_SVG = '<svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true"><path d="M8 1.5l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.2l-3.8 2.1.7-4.3-3.1-3 4.3-.6z"/></svg>';
setTimeout(() => {
  for (const id of ['walk-found', 'found-badge']) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = `${_STAR_SVG}<span>${FOUND.size} / ${KINDS()} found</span>`;
  }
}, 0);

export function useAct(a) {
  if (!a) return;
  if (a.kind !== 'fan' && a.kind !== 'tv' && a.kind !== 'lights') a.on = !a.on;
  const nBefore = TWEENS.length;
  a.run(a); FOUND.add(a.kind);
  for (let i = nBefore; i < TWEENS.length; i++) TWEENS[i].owner = a.obj;
  markObjBoundsDirty(a.obj);
  if (a.kind !== 'cabinet' || !a.isDrawer) markShadows();
  if (a.pair && a.pair.on !== a.on) {
    a.pair.on = a.on;
    const pBefore = TWEENS.length;
    a.pair.run(a.pair);
    for (let i = pBefore; i < TWEENS.length; i++) TWEENS[i].owner = a.pair.obj;
    markObjBoundsDirty(a.pair.obj);
  }
  const f = `${_STAR_SVG}<span>${FOUND.size} / ${KINDS()} found</span>`;
  for (const id of ['walk-found', 'found-badge']) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = f;
  }
  // P2: Removed setTimeout(buildColliders, 1000) — dynamic collider Box3 bounds update via markObjBoundsDirty
}

let hoverQ = null;
renderer.domElement.addEventListener('pointermove', e => {
  if (WALK.on || TOUR.on || TL.on || BD.on || e.buttons) {
    document.getElementById('act-tip').hidden = true;
    return;
  }
  hoverQ = [e.clientX, e.clientY];
});

export function hoverCheck() {
  if (!hoverQ) return;
  const [cx, cy] = hoverQ;
  hoverQ = null;
  const a = pickAct((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1, 400);
  const tip = document.getElementById('act-tip'), el = renderer.domElement;
  if (a) {
    tip.textContent = a.label(a);
    tip.style.left = (cx + 14) + 'px';
    tip.style.top = (cy + 14) + 'px';
    tip.hidden = false;
    if (!el.style.cursor.startsWith('grab')) el.style.cursor = 'pointer';
  } else {
    tip.hidden = true;
    if (el.style.cursor === 'pointer') el.style.cursor = '';
  }
}

export function walkAim() {
  if (++RT.aimTick % 5) return;
  RT.aimAct = pickAct(0, 0, 11 * FT);
  const h = document.getElementById('act-hint');
  if (RT.aimAct) {
    h.textContent = (matchMedia('(pointer: coarse)').matches ? 'Tap · ' : 'F · ') + RT.aimAct.label(RT.aimAct);
    h.hidden = false;
  } else {
    h.hidden = true;
  }
}

addEventListener('keydown', e => {
  if (WALK.on && (e.code === 'KeyF' || e.code === 'Enter') && RT.aimAct) {
    e.preventDefault();
    useAct(RT.aimAct);
    RT.aimTick = 4;
  }
});

let walkDown = null;
renderer.domElement.addEventListener('pointerdown', e => { walkDown = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!WALK.on || !walkDown || Math.hypot(e.clientX - walkDown[0], e.clientY - walkDown[1]) > 6) return;
  const a = pickAct((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1, 12 * FT) || RT.aimAct;
  useAct(a);
  RT.aimTick = 4;
});

const _frustum = new THREE.Frustum();
const _projScreenMatrix = new THREE.Matrix4();
const _camFwd = new THREE.Vector3();

export function interactStep(dt) {
  RT.fxT += dt;
  let anyShadowTween = false;
  let tweenFinishedShadow = false;
  for (let i = TWEENS.length - 1; i >= 0; i--) {
    const w = TWEENS[i];
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    w.obj[w.key] = w.from + (w.to - w.from) * e;
    // P2: Mark only the actively moving object's collider Box3 dirty
    markObjBoundsDirty(w.owner || w.obj);
    if (!w.isDrawer) anyShadowTween = true;
    if (k >= 1) {
      TWEENS.splice(i, 1);
      if (!w.isDrawer) tweenFinishedShadow = true;
    }
  }
  // P4: Only re-render shadow maps during non-drawer tweens and throttle to every 3rd frame (+ completion frame)
  if (tweenFinishedShadow || (anyShadowTween && (++RT.shTick % (LITE ? 4 : 3) === 0))) markShadows();

  if (FAN.spin && FAN.speed) FAN.spin.rotation.y += dt * FAN.speed;
  const fireOn = fireLight.visible && fireLight.intensity > 0, tvAct = RT.tvScreen && RT.tvScreen.visible;
  if ((fireOn || tvAct) && (RT.fxDraw += dt) > 0.07) {
    RT.fxDraw = 0;
    if (fireOn) { drawFire(fireCan.getContext('2d'), 128, 72, RT.fxT); fireTex.needsUpdate = true; }
    if (tvAct) { const d = actOf(RT.tvScreen); if (d.ch === 1 || d.ch === 2 || d.ch === 4) drawTV(d.ch, RT.fxT); }
  }
  if (fireOn) fireLight.intensity = 7 + Math.sin(RT.fxT * 13) * 1.2 + Math.sin(RT.fxT * 31) * 0.8;
  if (tvAct) tvLight.intensity = 2.6 + Math.sin(RT.fxT * 7) * 0.4;
  if (PATIO.patioFireLight && PATIO.patioFireLight.intensity > 0) {
    PATIO.patioFireLight.intensity = 5.2 + Math.sin(RT.fxT * 11) * 0.9 + Math.sin(RT.fxT * 27) * 0.6;
  }
  smoke.forEach(sp => {
    if (!sp.visible) return;
    sp.userData.t = (sp.userData.t + dt * 0.22) % 1;
    const t = sp.userData.t;
    const o = sp.userData.origin || RT.FX_FIRE.flue;
    sp.position.set(o[0] + Math.sin(t * 6 + sp.id) * 0.45, o[1] + t * (sp.userData.rise || 10.5), o[2] + t * (sp.userData.drift || 2.2));
    sp.scale.setScalar((sp.userData.s0 || 0.85) + t * (sp.userData.s1 || 3.1));
    sp.material.opacity = (sp.userData.origin ? 0.36 : 0.50) * Math.sin(Math.PI * t);
  });
  for (const S of FX_SHOWERS) {
    if (!S.mesh) continue;
    const on = S.mesh.visible, [hx, hy, hz] = S.head, o = S.dummy;
    if (on) {
      S.drops.forEach((d, i) => {
        d[1] -= dt * 9;
        if (d[1] < S.floor) { d[0] = hx + (Math.random() - 0.5) * 0.6; d[1] = hy; d[2] = hz + (Math.random() - 0.5) * 0.6; }
        const sp = (hy - d[1]) / (hy - S.floor);
        o.position.set(d[0] - sp * 0.9 + d[3] * sp, d[1], d[2] + d[3] * sp * 0.6);
        o.rotation.set(0, 0, 0.25 * sp); o.updateMatrix(); S.mesh.setMatrixAt(i, o.matrix);
      });
      S.mesh.instanceMatrix.needsUpdate = true;
    }
    S.fog = Math.max(0, Math.min(1, S.fog + dt * (on ? 1 / 8 : -1 / 14)));
    S.steam.material.opacity = 0.2 * S.fog; S.steam.visible = S.fog > 0.01;
    S.mirror.opacity = S.fog * 0.85;
  }

  // P3: Frustum + View-Direction + Distance Culling for Planar Reflector Mirrors
  _cv.copy(camera.position).sub(root.position).divideScalar(FT);
  camera.getWorldDirection(_camFwd);
  _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _frustum.setFromProjectionMatrix(_projScreenMatrix);
  const maxMirrorDist = WALK.on ? 13 : 10;
  for (const m of FX_MIRRORS) {
    const dist = Math.hypot(_cv.x - m.pos[0], _cv.y - m.pos[1], _cv.z - m.pos[2]);
    const show = _cv.x < m.pos[0] - 0.15
      && _camFwd.x > 0.12
      && dist < maxMirrorDist
      && state.explode < 0.05
      && !m.ref.userData.phaseHidden
      && (m.floorKey === 'ground' || state.floors === 'both')
      && _frustum.intersectsObject(m.ref);
    m.ref.visible = show;
    m.fogMesh.visible = show && m.fogMat.opacity > 0.01;
  }

  for (const f of skyFx) {
    f.pts.visible = f.on;
    if (!f.on) continue;
    const a = f.pts.geometry.attributes.position.array, sp = f.kind === 'snow' ? 1.6 : 2.6;
    for (let i = 0; i < a.length; i += 3) {
      a[i + 1] -= dt * sp;
      if (f.kind === 'leaves') a[i] += Math.sin(RT.fxT * 2 + i) * dt * 0.8;
      if (a[i + 1] < LV.LOFT) { a[i + 1] = f.top(f.za) - 0.2; a[i] = f.x0 + Math.random() * (f.x1 - f.x0); a[i + 2] = f.za + Math.random() * (f.zb - f.za); }
    }
    f.pts.geometry.attributes.position.needsUpdate = true;
  }
  if (WALK.on) walkAim();
  else if (!TL.on && !BD.on) {
    document.getElementById('act-hint').hidden = true;
    hoverCheck();
  }
  if (TL.on) MODES.tlTick(dt);
  if (BD.on) MODES.bdTick(dt);
}

bindRoomClickSelection(pickAct, useAct);
export { fireCan, fireTex, drawFire, fireMat, fireLight, tvCan, tvTex, tvLight, TV_CH, drawTV, showerSound, skyWeather, toast };
