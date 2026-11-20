// Application entry point: builds house & landscape, wires lazy-loaded modes, starts dirty-checked render loop, exports window.__house.
import * as THREE from 'three';
import { FT, LITE, FOV, HOME } from './config/constants.js';
import { ROOMS, TOUR_STOPS } from './config/rooms.js';
import { state, RT, MODES, ACTS, TWEENS, FAN, FX_SHOWERS, FX_MIRRORS, smoke, skyFx, LIGHTS_OUT, FLY, TINY, CUT, WALK, TOUR, TL, BD, wake, markShadows } from './core/state.js';
import { MATS } from './core/materials.js';
import { WALL_DEFS } from './core/builder.js';
// 1. Import house, renderer, lighting, landscape, systems, core modes, UI, and batcher in exact initialization order
import { root, G } from './house/site-and-floors.js';
import { KIT, DR } from './house/kitchen.js';
import { SKYLIGHTS } from './house/loft-and-roof.js';
import { renderer, labelRenderer, scene, camera, controls, phoneFov, homePos, clock, GOV, FRAME_MS, governor } from './core/renderer.js';
import { lightsOutStep } from './house/lighting.js';
import { LAND } from './landscape/terrain-and-trees.js';
import { PATIO, WEST_DECK, GRILL } from './landscape/outdoor-living.js';
import { _cv, updateWalls } from './systems/cutaway.js';
import { select } from './systems/labels-selection.js';
import { fireLight, pickAct, useAct, interactStep } from './systems/interactions.js';
import { toW, floorAt, walkStep, enterWalk, exitWalk } from './modes/walk-mode.js';
import { tourGo, enterTour, exitTour, tourStep } from './modes/tour-mode.js';
import { applyState, liveSyncStep } from './ui/controls-ui.js';
import { phoneStep } from './ui/phone-ui.js';
import { batchSceneGeometries } from './core/batching.js';

// 3. Lazy-loading wrappers for optional heavy modes ("A Year Here" & "Build the House")
let _tlModPromise = null;
let _bdModPromise = null;
const loadTimelineModule = () => _tlModPromise || (_tlModPromise = import('./modes/timeline-mode.js'));
const loadBuildModule = () => _bdModPromise || (_bdModPromise = import('./modes/build-mode.js'));

MODES.enterTimeline = async () => {
  const m = await loadTimelineModule();
  return m.enterTimeline();
};
MODES.exitTimeline = async () => {
  if (!TL.on) return;
  const m = await loadTimelineModule();
  return m.exitTimeline();
};
MODES.enterBuild = async () => {
  const m = await loadBuildModule();
  return m.enterBuild();
};
MODES.exitBuild = async () => {
  if (!BD.on) return;
  const m = await loadBuildModule();
  return m.exitBuild();
};

// 4. Resize & main frame loop (Section 11)
addEventListener('resize', () => {
  wake();
  if (!window.innerWidth || !window.innerHeight) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  if (!TOUR.fly) camera.fov = phoneFov(WALK.on ? FOV.inside : FOV.orbit);
  camera.updateProjectionMatrix();
  if (!Number.isFinite(camera.position.x)) { camera.position.copy(homePos()); controls.target.copy(HOME.target); }
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
});

export function frame(dt) {
  if (RT.liveSync) liveSyncStep(dt);
  if (LIGHTS_OUT.busy) lightsOutStep(dt);
  if (WALK.on) walkStep(dt);
  if (TOUR.on) tourStep(dt);
  if (!WALK.on && !FLY.cur && controls.enabled) controls.update();
  interactStep(dt);
  phoneStep(dt);
  if (RT.shadowFrames > 0) {
    renderer.shadowMap.needsUpdate = true;
    RT.shadowFrames--;
  }
}

// P1: Distance-culled smoke check so outdoor smoke only wakes the loop when lit AND within 85 ft
function animating() {
  if ((FAN.speed && FAN.spin) || (fireLight.visible && fireLight.intensity > 0) || (RT.tvScreen && RT.tvScreen.visible) || skyFx.some(f => f.on) || LIGHTS_OUT.busy || TL.on || BD.on) return true;
  if (FX_SHOWERS.some(S => S.mesh && (S.mesh.visible || S.fog > 0.01))) return true;
  for (let i = 0; i < smoke.length; i++) {
    const sp = smoke[i];
    if (!sp.visible) continue;
    const o = sp.userData.origin;
    if (!o || Math.hypot(_cv.x - o[0], _cv.z - o[2]) < 85) return true;
  }
  return false;
}

let lastDraw = 0;
const _lPos = new THREE.Vector3(), _lQuat = new THREE.Quaternion();
renderer.setAnimationLoop(() => {
  const dt = Math.min(0.05, clock.getDelta());
  const busy = RT.DIRTY > 0 || WALK.on || TOUR.on || FLY.cur || RT.liveSync || TWEENS.length || RT.shadowFrames > 0 || animating();
  if (!busy) return; // 0 FPS idle sleep when nothing changed
  frame(dt);
  if (LITE) {
    const now = performance.now();
    if (now - lastDraw < FRAME_MS - 3) return;
    lastDraw = now;
  }
  governor(true);
  const wasDirty = RT.DIRTY > 0;
  if (RT.DIRTY > 0) RT.DIRTY--;
  renderer.render(scene, camera);
  if (state.labels) {
    const camMoved = _lPos.distanceToSquared(camera.position) > 1e-6 || Math.abs(_lQuat.dot(camera.quaternion)) < 0.999999;
    if (wasDirty || camMoved) {
      _lPos.copy(camera.position);
      _lQuat.copy(camera.quaternion);
      labelRenderer.render(scene, camera);
    }
  }
});

// 5. Initial state & deep static geometry batching
applyState();
batchSceneGeometries();

addEventListener('visibilitychange', () => wake(10));
addEventListener('pointerdown', () => wake(10), true);
addEventListener('pointerup', () => wake(10), true);
addEventListener('keydown', () => wake(6), true);

// 6. Expose full public API on window.__house
window.__house = {
  THREE, scene, camera, controls, renderer, state, applyState,
  CUT, updateWalls, root, G, ACTS, useAct, pickAct, ROOMS, select,
  WALK, TOUR, enterWalk, exitWalk, enterTour, exitTour, tourGo,
  frame, TOUR_STOPS, floorAt, toW, GOV, TINY, wake,
  TL, BD,
  enterTimeline: () => MODES.enterTimeline(),
  exitTimeline: () => MODES.exitTimeline(),
  enterBuild: () => MODES.enterBuild(),
  exitBuild: () => MODES.exitBuild(),
  MATS, TWEENS, LAND, PATIO, WEST_DECK, GRILL, SKYLIGHTS, KIT, DR,
  FAN, FX_FIRE: RT.FX_FIRE, FX_TV: RT.FX_TV, FX_SHOWERS, FX_MIRRORS,
};

// Idle-prefetch optional Timeline & Build modules + pre-warm scene & mirror shaders/FBOs after first render
const idlePrefetch = window.requestIdleCallback || (cb => setTimeout(cb, 120));
idlePrefetch(() => {
  renderer.compile(scene, camera);
  for (const m of FX_MIRRORS) {
    m.ref.visible = true;
    try { m.ref.onBeforeRender(renderer, scene, camera); } catch (_) { renderer.compile(m.ref, camera); }
    m.ref.visible = false;
  }
  loadTimelineModule();
  loadBuildModule();
  const wxInfo = (c, night) => c === 0 ? [night ? 'clearNight' : 'clear', 'Clear']
    : c <= 2 ? [night ? 'clearNight' : 'partly', 'Partly cloudy']
    : c === 3 ? ['overcast', 'Overcast']
    : (c === 45 || c === 48) ? ['fog', 'Fog']
    : (c >= 71 && c <= 77 || c === 85 || c === 86) ? ['snow', 'Snow']
    : (c >= 95) ? ['storm', 'Storm']
    : (c >= 51) ? ['rain', 'Rain'] : [night ? 'clearNight' : 'clear', 'Clear'];
  const fetchAndesWx = async () => {
    try {
      const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=42.19&longitude=-74.78&current=weather_code,temperature_2m,is_day&temperature_unit=fahrenheit',
        { signal: AbortSignal.timeout ? AbortSignal.timeout(4000) : undefined });
      if (!r.ok) return;
      const cur = (await r.json()).current;
      if (!cur) return;
      const [key, label] = wxInfo(cur.weather_code, cur.is_day === 0);
      RT.andesWx = { temp: Math.round(cur.temperature_2m), key, label };
      if (RT.liveTime && label === 'Snow') {
        for (const f of skyFx) if (f.kind === 'snow') f.on = true;
      }
      applyState();
    } catch {}
  };
  fetchAndesWx();
  setInterval(fetchAndesWx, 600000);
});
