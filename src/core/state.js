// Central reactive state store, dirty flags, tween queue, and mode coordination registries.
import * as THREE from 'three';
import { FT } from '../config/constants.js';

export function localTimeAndes(now = new Date()) {
  let year = now.getFullYear(), month = now.getMonth() + 1, day = now.getDate();
  let hour = now.getHours() + now.getMinutes() / 60, isDST = false;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric',
      hour: 'numeric', minute: 'numeric', hour12: false, timeZoneName: 'short',
    }).formatToParts(now);
    const get = t => parts.find(p => p.type === t)?.value;
    year = +get('year') || year; month = +get('month') || month; day = +get('day') || day;
    const hh = (+get('hour')) % 24, mm = +get('minute') || 0;
    hour = hh + mm / 60;
    isDST = /EDT/i.test(get('timeZoneName') || '');
  } catch {}
  const doy = Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / 86400000) + 1;
  const B = 2 * Math.PI * (doy - 81) / 365;
  const dec = 23.44 * Math.PI / 180 * Math.sin(B);
  const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const cosHa = Math.max(-0.99, Math.min(0.99, -Math.tan(42.19 * Math.PI / 180) * Math.tan(dec)));
  const halfDay = Math.acos(cosHa) * 12 / Math.PI;
  const solarNoon = (isDST ? 13.0 : 12.0) - 0.88 / 60 - eotMin / 60;
  const sunrise = solarNoon - halfDay, sunset = solarNoon + halfDay;
  const season = month === 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';
  const night = hour < sunrise - 0.15 || hour > sunset + 0.15;
  const total = Math.round(hour * 60), hh = Math.floor(total / 60) % 24, mm = total % 60;
  const label = `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  return { sun: Math.max(6, Math.min(19.5, hour)), hour, sunrise, sunset, night, season, label, doy, isDST, solarNoon };
}

const _initAndes = localTimeAndes();

export const state = {
  floors: 'both',
  walls: 'up',
  sun: _initAndes.sun,
  roof: true,
  labels: false,
  explode: 0,
  night: _initAndes.night,
  season: _initAndes.season,
};

// Shared mutable runtime state across modules (avoids ES module live-binding reassignment issues)
export const RT = {
  liveTime: true,
  liveSync: null,
  andesWx: '',
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
