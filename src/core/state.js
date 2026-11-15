// Central reactive state store, dirty flags, tween queue, and mode coordination registries.
import * as THREE from 'three';
import { FT } from '../config/constants.js';

export const state = {
  floors: 'both',
  walls: 'up',
  sun: 14,
  roof: true,
  labels: false,
  explode: 0,
  night: false,
  season: 'fall',
};

// Shared mutable runtime state across modules (avoids ES module live-binding reassignment issues)
export const RT = {
  NOCUT: false,
  CUTAXIS: null,
  FX_FIRE: null,
  FX_TV: null,
  tvScreen: null,
  DIRTY: 8,
  shadowFrames: 3,
  shTick: 0,
  nightOn: false,
  seasonOn: null,
  siteReady: false,
  selected: null,
  aimAct: null,
  aimTick: 0,
  fxT: 0,
  fxDraw: 0,
  solids: [],
  grounds: [],
  lastFound: -1,
};

export function wake(n = 6) {
  if (n > RT.DIRTY) RT.DIRTY = n;
}

export function markShadows() {
  RT.shadowFrames = Math.max(RT.shadowFrames, 1);
  wake();
}

export const ACTS = [];
export const FX_SHOWERS = [];
export const FAN = { speed: 0, spin: null };
export const FX_MIRRORS = [];
export const TWEENS = [];
export const WALL_DEFS = [];
export const PHASE_MESHES = [];
export const TINY = [];
export const smoke = [];
export const skyFx = [];
export const nightRig = [];
export const ENV_MATS = [];
export const LIGHTS_OUT = { off: false, busy: false };
export const FLY = { cur: null };
export const FOUND = new Set();
export const KINDS = () => new Set(ACTS.map(a => a.kind)).size;

export const CUT = {
  els: [],
  variants: [],
  planes: {
    ground: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
    loft: new THREE.Plane(new THREE.Vector3(0, -1, 0), 0),
  },
};

export const WALK = {
  on: false,
  pos: new THREE.Vector3(),
  feet: 0,
  yaw: 0,
  pitch: 0,
  keys: {},
  drag: null,
  saved: null,
  joy: { x: 0, y: 0 },
  look: { x: 0, y: 0 },
  auto: null,
  glide: null,
};

export const TOUR = {
  on: false,
  i: 0,
  fly: null,
  play: true,
  speed: 1,
  wait: 0,
  saved: null,
  walking: false,
  prog: 0,
};

export const TL = {
  on: false, playing: false, t: 0, speed: 1, speedMult: 1, saved: null, cur: -1,
  lastInteract: 0, sunCur: 16.5, hourTarget: 16.5, occupied: true, duskCur: 0,
  swayCur: 0, snowK: 1, fire: false, grill: false, tv: 0, fan: 0,
  doorOpen: false, sideDoorOpen: false, frontDoor: null, sideDoor: null,
  seasonCur: null, built: null, glow: null, wx: null, blooms: null,
  fallLeaves: null, tracks: null, carD: 0, carColor: 0xF3F3F1, ballPh: 0, scrubbing: false,
};

export const BD = {
  on: false, playing: false, t: 0, speed: 1, cur: -1, sunCur: 12, hourTarget: 12,
  duskCur: 0, swayCur: 0, lastInteract: 0, scrubbing: false, saved: null, built: false,
  grp: null, clearingGrp: null, siltDriveGrp: null, trenchGrp: null, earthGrp: null,
  batterGrp: null, slabPlumbGrp: null, rebarGrp: null, formsGrp: null,
  frameG: [], loftJoists: null, roughStair: null, loftSubfloors: [], loftWalls: [],
  ridgeBeam: null, rafterChunks: [], wingJoists: null, toppingTree: null,
  osbWallChunks: [], osbRoofChunks: [],
  scaffGrp: null, mepInsul: null, mepDucts: null, sitePropsGrp: null,
  excavator: null, excBoom: null, workers: [],
};

// Cross-module mode & UI callbacks (populated by modules on load to keep the import graph a strict DAG)
export const MODES = {
  enterWalk: () => {},
  exitWalk: () => {},
  enterTour: () => {},
  exitTour: () => {},
  tourGo: () => {},
  takeOver: () => {},
  autoSteer: () => ({ fwd: 0, side: 0 }),
  showCap: () => {},
  buildColliders: () => {},
  enterTimeline: () => {},
  exitTimeline: () => {},
  tlTick: () => {},
  enterBuild: () => {},
  exitBuild: () => {},
  bdTick: () => {},
  applyState: () => {},
  updateWalls: () => {},
  select: () => {},
  closeSheet: () => {},
  lightsOut: () => {},
  flyTo: () => {},
};

export const ease = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function markObjBoundsDirty(obj) {
  if (!obj || typeof obj.traverse !== 'function') return;
  obj.traverse(o => {
    if (o.userData) {
      if (o.userData._wbox) o.userData._wboxDirty = true;
      if (o.userData.act) o.userData.act._wboxDirty = true;
    }
  });
}

export function tweenTo(obj, key, to, dur, isDrawer = false) {
  for (let i = TWEENS.length - 1; i >= 0; i--) {
    if (TWEENS[i].obj === obj && TWEENS[i].key === key) TWEENS.splice(i, 1);
  }
  TWEENS.push({ obj, key, from: obj[key], to, t: 0, dur, isDrawer });
  wake();
}

export function act(obj, def) {
  def.on = !!def.on;
  def.obj = obj;
  def._wbox = null;
  def._wboxDirty = true;
  ACTS.push(def);
  obj.traverse(o => { o.userData.act = def; });
  return def;
}

export const actOf = o => {
  while (o) {
    if (o.userData && o.userData.act) return o.userData.act;
    o = o.parent;
  }
  return null;
};

export function isShown(o) {
  while (o) {
    if (!o.visible) return false;
    o = o.parent;
  }
  return true;
}

export const actCenter = a => {
  if (!a.wc || a._wboxDirty) {
    a.obj.updateWorldMatrix(true, true);
    if (!a._wbox) a._wbox = new THREE.Box3();
    a._wbox.setFromObject(a.obj);
    if (a._wbox.isEmpty()) return null;
    if (!a.wc) a.wc = new THREE.Vector3();
    a._wbox.getCenter(a.wc);
    a._wbox.expandByScalar(0.18 * FT);
    a._wboxDirty = false;
  }
  return a.wc;
};
