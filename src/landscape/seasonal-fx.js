// Shared seasonal environment effects (weather particles, wildflowers, fallen leaves, snow tracks, continuous foliage, low-poly figures).
import * as THREE from 'three';
import { LV, LITE, DAY_SKY } from '../config/constants.js';
import { state, RT, ACTS, FAN, TL, smoke, ease, actOf, markShadows, wake } from '../core/state.js';
import { MATS, M, exteriorLightsOnly } from '../core/materials.js';
import { G } from '../house/site-and-floors.js';
import { LAND, SEASONS, CX, CZ, DRIVE, PATIO_AT, terrainY, decid, canopies, twigs, cones, mtx, sc, ps, snowParts, groundMat, clearMat, PLANTS } from './terrain-and-trees.js';
import { CAR } from './terrain-and-trees.js';
import { PATIO, GRILL } from './outdoor-living.js';
import { updateWalls } from '../systems/cutaway.js';
import { fireMat, fireLight, tvLight, drawTV } from '../systems/interactions.js';

const TL_LOOP = 58;
const TL_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TL_SEASON_OF_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'fall', 'fall', 'fall', 'winter'];
const SECOND_CAR = 0x5A6B7A;
// Shared paths so people always come and go from the house (via front door at [19.8, 0, 17] or side door at [0.1, 0, 14.6]) or the car ([59, -2.25, 34.5])
const P_CAR_TO_LIV = [[59, -2.25, 34.5], [46, -2.25, 33.6], [32, -2.25, 33.2], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 15.5], [13.2, -1.5, 19.5], [6.5, -1.5, 22.8]];
const P_CAR_TO_KIT = [[59, -2.25, 34.5], [46, -2.25, 33.6], [32, -2.25, 33.2], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 15.5], [12.0, 0, 11.5], [7.8, 0, 4.2]];
const P_LIV_TO_CAR = [...P_CAR_TO_LIV].reverse();
const P_KIT_TO_CAR = [...P_CAR_TO_KIT].reverse();
const P_KIT_TO_GRILL = [[8.2, 0, 11.5], [3.5, 0, 14.5], [-1.2, -0.167, 14.6], [-4.34, -0.167, 2.6]];
const P_GRILL_TO_KIT = [...P_KIT_TO_GRILL].reverse();

const TL_GEO = {
  head: new THREE.BoxGeometry(0.62, 0.55, 0.55), hair: new THREE.BoxGeometry(0.64, 0.22, 0.57),
  torso: new THREE.BoxGeometry(1.05, 1.9, 0.55), arm: new THREE.BoxGeometry(0.34, 1.8, 0.4).translate(0, -0.9, 0), leg: new THREE.BoxGeometry(0.42, 2.5, 0.45).translate(0, -1.25, 0),
  blanket: new THREE.BoxGeometry(5.4, 0.12, 4.4), basket: new THREE.BoxGeometry(1.1, 0.7, 0.8), ball: new THREE.SphereGeometry(0.55, 10, 8),
  flake: new THREE.DodecahedronGeometry(0.28, 0), leaf: new THREE.BoxGeometry(0.48, 0.08, 0.36), bloom: new THREE.IcosahedronGeometry(0.42, 0),
  ski: new THREE.BoxGeometry(0.18, 0.05, 4.8), pole: new THREE.BoxGeometry(0.05, 3.4, 0.05), goggle: new THREE.BoxGeometry(0.66, 0.22, 0.16),
};
const TL_MATS = new Map();
function tlMat(hex) { let m = TL_MATS.get(hex); if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.85, flatShading: true }); TL_MATS.set(hex, m); } return m; }
const CAST_PAIR = {
  a: { shirt: 0x5B2B20, pants: 0x2E2A26, skin: 0xC98E6A, hair: 0x2A2018 },
  b: { shirt: 0xE8E0D2, pants: 0x4A4640, skin: 0xD9A986, hair: 0x3A2A1A },
};
const SHIRT_PAL = [0x3B6E8C, 0x5E8C4A, 0xC9702E, 0x8A5A8C, 0xB23A32, 0xE8B23C];
const PANT_PAL = [0x2E2A26, 0x3A3F45, 0x4A4640];
const SKINS = [0xC98E6A, 0xD9A986, 0x8C5A3B, 0xE8C39A];
const HAIRS = [0x2A2018, 0x3A2A1A, 0x555555, 0x8C6A3A];
const SKI_PAL = [0xC85A2B, 0x2E5A88, 0xD9A441, 0x3E5C48];
function makePerson(who, kid, seed, ski) {
  const c = CAST_PAIR[who] || { shirt: SHIRT_PAL[seed % SHIRT_PAL.length], pants: PANT_PAL[seed % PANT_PAL.length], skin: SKINS[seed % SKINS.length], hair: HAIRS[seed % HAIRS.length] };
  const jacket = ski ? SKI_PAL[seed % SKI_PAL.length] : c.shirt;
  const pants = ski ? 0x22252A : c.pants;
  const helmet = ski ? (seed % 2 === 0 ? 0x25282D : 0xE6E0D4) : c.hair;
  const g = new THREE.Group();
  const add = (geo, hex, x, y, z) => { const m = new THREE.Mesh(geo, tlMat(hex)); m.castShadow = false; m.receiveShadow = false; m.position.set(x, y, z); g.add(m); return m; };
  const legL = add(TL_GEO.leg, pants, -0.28, 2.5, 0), legR = add(TL_GEO.leg, pants, 0.28, 2.5, 0);
  const torso = add(TL_GEO.torso, jacket, 0, 3.45, 0);
  const armL = add(TL_GEO.arm, jacket, -0.72, 4.35, 0), armR = add(TL_GEO.arm, jacket, 0.72, 4.35, 0);
  const head = add(TL_GEO.head, c.skin, 0, 4.68, 0), hair = add(TL_GEO.hair, helmet, 0, 4.98, 0);
  if (ski) {
    add(TL_GEO.goggle, 0x1A1E24, 0, 4.74, 0.24);
    const skiCol = seed % 2 === 0 ? 0xB83A28 : 0x2B5B84;
    const s1 = add(TL_GEO.ski, skiCol, 0.88, 4.42, 0), s2 = add(TL_GEO.ski, skiCol, 1.08, 4.42, 0);
    s1.rotation.x = -0.24; s2.rotation.x = -0.24;
    const pole = new THREE.Mesh(TL_GEO.pole, tlMat(0x8A9098));
    pole.castShadow = false; pole.receiveShadow = false;
    pole.position.set(0, -1.5, 0.25); pole.rotation.x = 0.42;
    armL.add(pole);
  }
  g.scale.setScalar(kid ? 0.72 : 1.1);
  g.userData = { legL, legR, armL, armR, torso, head, hair };
  return g;
}
function poseFigure(fig, sit, sw, extra) {
  const u = fig.userData;
  if (extra === 'angel') {
    fig.rotation.x = -Math.PI / 2;
    const sweep = 0.5 - 0.5 * Math.cos(sw);
    u.legL.position.set(-0.28, 2.5, 0); u.legL.rotation.set(0, 0, -0.15 - sweep * 0.48);
    u.legR.position.set(0.28, 2.5, 0); u.legR.rotation.set(0, 0, 0.15 + sweep * 0.48);
    u.torso.position.set(0, 3.45, 0); u.torso.rotation.x = 0;
    u.armL.position.set(-0.72, 4.35, 0); u.armL.rotation.set(0, 0, -0.45 - sweep * 1.65);
    u.armR.position.set(0.72, 4.35, 0); u.armR.rotation.set(0, 0, 0.45 + sweep * 1.65);
    u.head.position.set(0, 4.68, 0);
    u.hair.position.set(0, 4.98, 0);
    return;
  }
  fig.rotation.x = 0;
  if (extra === 'jump') {
    u.legL.position.set(-0.28, 2.5, 0); u.legL.rotation.set(0.45, 0, -0.12);
    u.legR.position.set(0.28, 2.5, 0); u.legR.rotation.set(-0.35, 0, 0.12);
    u.torso.position.set(0, 3.45, 0); u.torso.rotation.x = 0.08;
    u.armL.position.set(-0.72, 4.35, 0); u.armL.rotation.set(-2.5, 0, -0.35);
    u.armR.position.set(0.72, 4.35, 0); u.armR.rotation.set(-2.5, 0, 0.35);
    u.head.position.set(0, 4.68, 0);
    u.hair.position.set(0, 4.98, 0);
    return;
  }
  if (extra === 'grill') {
    u.legL.position.set(-0.28, 2.5, 0); u.legL.rotation.set(0, 0, 0);
    u.legR.position.set(0.28, 2.5, 0); u.legR.rotation.set(0, 0, 0);
    u.torso.position.set(0, 3.45, 0); u.torso.rotation.x = 0.04;
    u.armL.position.set(-0.72, 4.35, 0); u.armL.rotation.set(-0.25, 0, 0);
    u.armR.position.set(0.72, 4.35, 0); u.armR.rotation.set(-0.85 + Math.sin(sw) * 0.22, 0, -0.1);
    u.head.position.set(0, 4.68, 0);
    u.hair.position.set(0, 4.98, 0);
    return;
  }
  if (extra === 'smell') {
    const lean = 0.56 + Math.sin(sw) * 0.08;
    u.legL.position.set(-0.28, 2.5, 0); u.legL.rotation.set(0, 0, 0);
    u.legR.position.set(0.28, 2.5, 0); u.legR.rotation.set(0, 0, 0);
    u.torso.position.set(0, 3.22, 0.35); u.torso.rotation.x = lean;
    u.armL.position.set(-0.72, 3.85, 0.72); u.armL.rotation.set(-0.55, 0, 0);
    u.armR.position.set(0.72, 3.85, 0.72); u.armR.rotation.set(-0.55, 0, 0);
    u.head.position.set(0, 4.15, 0.95);
    u.hair.position.set(0, 4.45, 0.95);
    return;
  }
  if (sit) {
    u.legL.rotation.set(-1.45, 0, 0); u.legL.position.set(-0.28, 1.35, 0.05);
    u.legR.rotation.set(-1.45, 0, 0); u.legR.position.set(0.28, 1.35, 0.05);
    u.torso.position.set(0, 1.95, -0.25); u.torso.rotation.x = -0.10;
    u.armL.position.set(-0.72, 2.82, -0.15); u.armL.rotation.set(-0.35, 0, 0);
    u.armR.position.set(0.72, 2.82, -0.15); u.armR.rotation.set(-0.35, 0, 0);
    u.head.position.set(0, 3.18, -0.35);
    u.hair.position.set(0, 3.48, -0.35);
  } else {
    u.legL.rotation.set(sw, 0, 0); u.legL.position.set(-0.28, 2.5, 0);
    u.legR.rotation.set(-sw, 0, 0); u.legR.position.set(0.28, 2.5, 0);
    u.torso.position.set(0, 3.45, 0); u.torso.rotation.x = 0;
    u.armL.position.set(-0.72, 4.35, 0); u.armL.rotation.set(-sw * 0.7, 0, 0);
    u.armR.position.set(0.72, 4.35, 0); u.armR.rotation.set(sw * 0.7, 0, 0);
    u.head.position.set(0, 4.68, 0);
    u.hair.position.set(0, 4.98, 0);
  }
}
// --- site-wide weather particles (snow, spring petals, summer fireflies, autumn leaves) + wildflowers + fallen leaf scatter + snow tire tracks
function tlBuildEnvFx() {
  if (TL.wx) return;
  const N = LITE ? 110 : 220;
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const mesh = new THREE.InstancedMesh(TL_GEO.leaf, mat, N);
  mesh.castShadow = false; mesh.receiveShadow = false; mesh.frustumCulled = false; mesh.visible = false;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2, r = 4 + Math.pow(Math.random(), 0.75) * 85;
    pts.push({ x: CX + Math.cos(a) * r, y: Math.random() * 44, z: CZ + Math.sin(a) * r, ph: Math.random() * Math.PI * 2, sp: 0.75 + Math.random() * 0.55, c: i });
  }
  LAND.add(mesh);
  const B = LITE ? 55 : 110;
  const bMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, flatShading: true }); exteriorLightsOnly(bMat);
  const bMesh = new THREE.InstancedMesh(TL_GEO.bloom, bMat, B);
  bMesh.castShadow = false; bMesh.receiveShadow = false; bMesh.visible = false;
  const bPts = [], bCols = [0xE8D26E, 0xD98BB5, 0x8E6FC9, 0xF4F1EA, 0xE2955A];
  const col = new THREE.Color();
  for (let i = 0; i < B; i++) {
    let x, z;
    if (i < B * 0.35) {
      x = 18 + Math.random() * 34; z = 19.2 + Math.random() * 15.5;
    } else if (i < B * 0.6) {
      const a = Math.random() * Math.PI * 2, r = 6.5 + Math.random() * 7;
      x = PATIO_AT[0] + Math.cos(a) * r; z = PATIO_AT[1] + Math.sin(a) * r;
    } else {
      const a = Math.random() * Math.PI * 2, r = 42 + Math.random() * 14;
      x = CX + Math.cos(a) * r; z = CZ + Math.sin(a) * r;
    }
    const s = 0.65 + Math.random() * 0.65;
    bPts.push({ x, y: terrainY(x, z) + 0.32 * s, z, s, delay: (i % 20) / 20 });
    bMesh.setColorAt(i, col.setHex(bCols[i % bCols.length]));
  }
  if (bMesh.instanceColor) bMesh.instanceColor.needsUpdate = true;
  LAND.add(bMesh);
  // Fallen autumn leaves accumulating on the birch patio, stepping-stone walk, West Deck steps, and roof skylights
  const FL = LITE ? 85 : 165;
  const flMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, flatShading: true }); exteriorLightsOnly(flMat);
  const flMesh = new THREE.InstancedMesh(TL_GEO.leaf, flMat, FL);
  flMesh.castShadow = false; flMesh.receiveShadow = false; flMesh.visible = false;
  const flPts = [], flCols = [0xC3702C, 0xA6402C, 0xCF9B38, 0x8D5A33, 0xB23A32];
  const roofSlopeY = z => LV.RIDGE - (z / 17.33) * (LV.RIDGE - LV.EAVE_S) + 0.08;
  const skyBoxes = [[15.5, 21.0], [30.3, 36.0], [43.3, 45.1]];
  for (let i = 0; i < FL; i++) {
    let x, y, z, rx = 0, rz = 0;
    if (i < FL * 0.42) {
      const a = Math.random() * Math.PI * 2, r = 1.5 + Math.random() * 9.5;
      x = PATIO_AT[0] + Math.cos(a) * r; z = PATIO_AT[1] + Math.sin(a) * r; y = LV.GRADE + 0.21;
    } else if (i < FL * 0.72) {
      x = 18 + Math.random() * 36; z = 29.5 + Math.random() * 6.5; y = LV.GRADE + 0.08;
    } else if (i < FL * 0.85) {
      x = -9.5 + Math.random() * 7.5; z = 11 + Math.random() * 8; y = LV.GRADE + 0.08;
    } else {
      const sb = skyBoxes[i % skyBoxes.length];
      x = sb[0] + Math.random() * (sb[1] - sb[0]); z = 4.7 + Math.random() * 3.5;
      y = roofSlopeY(z); rx = 0.23;
    }
    const s = 0.7 + Math.random() * 0.75;
    flPts.push({ x, y, z, rx, ry: Math.random() * Math.PI * 2, rz, s, delay: (i % 25) / 25 });
    flMesh.setColorAt(i, col.setHex(flCols[i % flCols.length]));
  }
  if (flMesh.instanceColor) flMesh.instanceColor.needsUpdate = true;
  LAND.add(flMesh);
  // Winter tire tracks along the gravel drive (revealed behind the car as it drives in through the snow)
  const trSegs = 48, trPos = [], trIdx = [];
  for (let i = 0; i <= trSegs; i++) {
    const u = i / trSegs, pt = tlDrive.at(u);
    const nx = Math.cos(pt.h), nz = -Math.sin(pt.h);
    for (const side of [-2.1, 2.1]) {
      for (const hw of [-0.36, 0.36]) {
        const px = pt.x + nx * (side + hw), pz = pt.z + nz * (side + hw);
        trPos.push(px, terrainY(px, pz) + 0.02, pz);
      }
    }
    if (i < trSegs) {
      for (let t = 0; t < 2; t++) {
        const b0 = i * 4 + t * 2, b1 = (i + 1) * 4 + t * 2;
        trIdx.push(b0, b0 + 1, b1, b0 + 1, b1 + 1, b1);
      }
    }
  }
  const trGeo = new THREE.BufferGeometry();
  trGeo.setAttribute('position', new THREE.Float32BufferAttribute(trPos, 3));
  trGeo.setIndex(trIdx); trGeo.computeVertexNormals();
  const trMat = new THREE.MeshStandardMaterial({ color: 0xb6bec8, roughness: 0.9, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 });
  exteriorLightsOnly(trMat);
  const trMesh = new THREE.Mesh(trGeo, trMat); trMesh.receiveShadow = true; trMesh.visible = false; LAND.add(trMesh);
  TL.wx = { mesh, pts, N, kind: null };
  TL.blooms = { mesh: bMesh, pts: bPts, lastK: -1 };
  TL.fallLeaves = { mesh: flMesh, pts: flPts, lastK: -1 };
  TL.tracks = { mesh: trMesh, geo: trGeo, mat: trMat, segs: trSegs };
}
const _wxO = new THREE.Object3D(), _wxC = new THREE.Color();
const WX_PAL = {
  snow: [0xFFFFFF, 0xEBF2F7, 0xF4F7FA],
  petals: [0xF7D8E2, 0xFFF5F8, 0xF2B8C6, 0xEDE7DC],
  fireflies: [0xFFE875, 0xFFD24C, 0xFFF2A6],
  leaves: [0xC3702C, 0xA6402C, 0xCF9B38, 0x8D5A33, 0xB23A32],
  rain: [0xA8CDE8, 0xC4DEF2, 0x86B5D8],
};
function tlStepEnvFx(dt, day) {
  if (!TL.wx) return;
  let kind = 'snow', rate = 1;
  const mCur = (TL.cur >= 0 && TL.moments) ? TL.moments[TL.cur] : null;
  if (mCur && mCur.rain) { kind = 'rain'; rate = 1; }
  else if (day >= 65 && day < 160) { kind = 'petals'; rate = day < 85 ? (day - 65) / 20 : day > 145 ? (160 - day) / 15 : 1; }
  else if (day >= 160 && day < 245) { kind = 'fireflies'; rate = 0.75; }
  else if (day >= 245 && day < 328) { kind = 'leaves'; rate = day < 260 ? (day - 245) / 15 : day > 315 ? (328 - day) / 13 : 1; }
  else { kind = 'snow'; rate = day >= 328 ? Math.min(1, (day - 328) / 12) : day < 50 ? 1 : Math.max(0, (65 - day) / 15); }
  const W = TL.wx;
  W.mesh.visible = rate > 0.02;
  if (W.mesh.visible) {
    if (W.kind !== kind) {
      W.kind = kind;
      const pal = WX_PAL[kind];
      for (let i = 0; i < W.N; i++) W.mesh.setColorAt(i, _wxC.setHex(pal[i % pal.length]));
      if (W.mesh.instanceColor) W.mesh.instanceColor.needsUpdate = true;
    }
    const activeCount = Math.floor(W.N * rate);
    W.mesh.count = activeCount;
    for (let i = 0; i < activeCount; i++) {
      const p = W.pts[i];
      p.ph += dt * p.sp * 2.2;
      if (kind === 'fireflies') {
        p.y = 1.5 + Math.sin(p.ph * 0.9) * 3.2;
        const pulse = Math.max(0.01, Math.sin(p.ph * 1.7 + p.c) * 0.55);
        _wxO.position.set(p.x + Math.cos(p.ph * 0.6) * 1.4, LV.GRADE + p.y, p.z + Math.sin(p.ph * 0.6) * 1.4);
        _wxO.rotation.set(0, 0, 0); _wxO.scale.setScalar(pulse);
      } else if (kind === 'rain') {
        p.y -= dt * 26.0 * p.sp;
        if (p.y < -2.1) p.y = 38 + (p.c % 9);
        _wxO.position.set(p.x + 0.15, p.y, p.z);
        _wxO.rotation.set(0, 0, 0.06);
        _wxO.scale.set(0.16, 4.5, 0.16);
      } else {
        const fallSpeed = kind === 'leaves' ? 6.5 : kind === 'petals' ? 4.2 : 5.2;
        p.y -= dt * fallSpeed * p.sp;
        if (p.y < -2.1) p.y = 38 + (p.c % 9);
        const sway = kind === 'snow' ? 1.1 : 2.6;
        _wxO.position.set(p.x + Math.sin(p.ph) * sway, p.y, p.z + Math.cos(p.ph * 0.8) * sway);
        _wxO.rotation.set(p.ph * 1.3, p.ph * 0.9, p.ph * 0.7);
        if (kind === 'snow') _wxO.scale.set(0.45, 2.2, 0.45);
        else if (kind === 'petals') _wxO.scale.set(0.75, 0.75, 0.75);
        else _wxO.scale.set(1.25, 1.0, 1.25);
      }
      _wxO.updateMatrix(); W.mesh.setMatrixAt(i, _wxO.matrix);
    }
    W.mesh.instanceMatrix.needsUpdate = true;
  }
  let bloomK = 0;
  if (day >= 70 && day < 125) bloomK = (day - 70) / 55;
  else if (day >= 125 && day < 245) bloomK = 1;
  else if (day >= 245 && day < 295) bloomK = 1 - (day - 245) / 50;
  const Bl = TL.blooms;
  if (Math.abs(bloomK - Bl.lastK) > 0.01) {
    Bl.lastK = bloomK;
    Bl.mesh.visible = bloomK > 0.01;
    if (Bl.mesh.visible) {
      for (let i = 0; i < Bl.pts.length; i++) {
        const b = Bl.pts[i];
        const k = Math.max(0.0001, Math.min(1, (bloomK - b.delay * 0.35) / 0.65)) * b.s;
        _wxO.position.set(b.x, LV.GRADE + (k * 0.35), b.z);
        _wxO.rotation.set(0, i * 1.1, 0);
        _wxO.scale.set(k, k * 1.2, k);
        _wxO.updateMatrix(); Bl.mesh.setMatrixAt(i, _wxO.matrix);
      }
      Bl.mesh.instanceMatrix.needsUpdate = true;
    }
  }
  // Fallen autumn leaves accumulating on the patio, path, clearing edge, and roof skylights in September–November
  let fallK = 0;
  if (day >= 248 && day < 302) fallK = (day - 248) / 54;
  else if (day >= 302 && day < 324) fallK = 1;
  else if (day >= 324 && day < 342) fallK = 1 - (day - 324) / 18;
  const Fl = TL.fallLeaves;
  if (Fl && Math.abs(fallK - Fl.lastK) > 0.01) {
    Fl.lastK = fallK;
    Fl.mesh.visible = fallK > 0.01;
    if (Fl.mesh.visible) {
      for (let i = 0; i < Fl.pts.length; i++) {
        const lf = Fl.pts[i];
        const k = Math.max(0.0001, Math.min(1, (fallK - lf.delay * 0.45) / 0.55)) * lf.s;
        _wxO.position.set(lf.x, lf.y, lf.z);
        _wxO.rotation.set(lf.rx, lf.ry, lf.rz);
        _wxO.scale.set(k * 1.15, k * 0.6, k * 1.15);
        _wxO.updateMatrix(); Fl.mesh.setMatrixAt(i, _wxO.matrix);
      }
      Fl.mesh.instanceMatrix.needsUpdate = true;
    }
  }
}
// --- continuous seasonal landscape & roof-snow interpolation (never snaps)
const _tc1 = new THREE.Color(), _tc2 = new THREE.Color(), _tc3 = new THREE.Color();
function tlApplyContinuousSeasons(day) {
  // 4-anchor seasonal keyframes: Jan 25 (25), Apr 25 (115), Jul 25 (206), Oct 25 (298)
  const KEYS = [
    { d: 25,  s: 'winter', grass: 0xA39A86, fern: 0x6A5A46, pine: 0x3f5546, birch: 0xE0C04A, sky: DAY_SKY.winter },
    { d: 115, s: 'spring', grass: 0x86AC58, fern: 0x5E8A44, pine: 0x2f4a2e, birch: 0x9DBF5A, sky: DAY_SKY.spring },
    { d: 206, s: 'summer', grass: 0x7F9B4E, fern: 0x4D7A38, pine: 0x2f4a2e, birch: 0x8DAE4E, sky: DAY_SKY.summer },
    { d: 298, s: 'fall',   grass: 0xB49A5E, fern: 0x8C6A3A, pine: 0x2f4a2e, birch: 0xE0C04A, sky: DAY_SKY.fall },
  ];
  let k0 = KEYS[3], k1 = KEYS[0], span = (365 - 298) + 25, dist = day >= 298 ? day - 298 : (365 - 298) + day;
  for (let i = 0; i < 3; i++) {
    if (day >= KEYS[i].d && day < KEYS[i + 1].d) {
      k0 = KEYS[i]; k1 = KEYS[i + 1]; span = k1.d - k0.d; dist = day - k0.d; break;
    }
  }
  const f = ease(Math.max(0, Math.min(1, dist / span)));
  groundMat.color.lerpColors(_tc1.setHex(SEASONS[k0.s].ground), _tc2.setHex(SEASONS[k1.s].ground), f);
  clearMat.color.lerpColors(_tc1.setHex(SEASONS[k0.s].clearing), _tc2.setHex(SEASONS[k1.s].clearing), f);
  PLANTS.grassMat.color.lerpColors(_tc1.setHex(k0.grass), _tc2.setHex(k1.grass), f);
  PLANTS.fernMat.color.lerpColors(_tc1.setHex(k0.fern), _tc2.setHex(k1.fern), f);
  cones.material.color.lerpColors(_tc1.setHex(k0.pine), _tc2.setHex(k1.pine), f);
  PATIO.leaf.color.lerpColors(_tc1.setHex(k0.birch), _tc2.setHex(k1.birch), f);
  // Roof & West Deck snow: fade opacity in place on the roof (never scale.y around y=0!)
  let snowK = 0;
  if (day < 52 || day >= 352) snowK = 1;
  else if (day >= 52 && day < 82) snowK = 1 - ease((day - 52) / 30);
  else if (day >= 328 && day < 352) snowK = ease((day - 328) / 24);
  TL.snowK = snowK;
  if (TL._snowCache === undefined || Math.abs(snowK - TL._snowCache) > 0.004 || (snowK === 0 && TL._snowCache !== 0) || (snowK === 1 && TL._snowCache !== 1)) {
    TL._snowCache = snowK;
    if (MATS.snow) {
      MATS.snow.transparent = snowK < 0.99;
      MATS.snow.opacity = snowK;
      MATS.snow.depthWrite = snowK > 0.15;
    }
    snowParts.forEach(m => {
      m.visible = snowK > 0.02;
      m.scale.y = 1;
      m.position.y = -(1 - snowK) * 0.16;
    });
  }
  // Wet bluestone patio shimmer right after snowmelt during spring thaw (late Feb – mid April)
  const wetK = day >= 56 && day < 112 ? Math.sin(((day - 56) / 56) * Math.PI) : 0;
  PATIO.brickMat.roughness = 0.9 - 0.68 * wetK;
  PATIO.brickMat.metalness = 0.38 * wetK;
  PATIO.mortarMat.roughness = 1.0 - 0.55 * wetK;
  // Update season button highlight without triggering discrete applySeason()
  const month = Math.min(11, Math.floor(TL.t * 12)), sName = TL_SEASON_OF_MONTH[month];
  if (TL.seasonCur !== sName) {
    TL.seasonCur = sName; state.season = sName; RT.seasonOn = sName;
    const sb = TL._sb || (TL._sb = document.getElementById('btn-season')); if (sb) sb.dataset.season = sName;
  }
  // Tree canopy fullness & leaf color blend
  let full = 0;
  if (day >= 62 && day < 135) full = ease((day - 62) / 73);
  else if (day >= 135 && day < 250) full = 1.0;
  else if (day >= 250 && day < 332) full = 1.0 - ease((day - 250) / 82);
  const springToSum = day >= 115 && day < 175 ? (day - 115) / 60 : day >= 175 ? 1 : 0;
  const sumToFall = day >= 225 && day < 280 ? (day - 225) / 55 : day >= 280 ? 1 : 0;
  twigs.visible = full < 0.95;
  const tc = TL._treeCache;
  if (!tc || Math.abs(full - tc.full) > 0.002 || Math.abs(springToSum - tc.spSu) > 0.002 || Math.abs(sumToFall - tc.suFa) > 0.002) {
    const matChanged = !tc || Math.abs(full - tc.full) > 0.002;
    const colChanged = !tc || Math.abs(springToSum - tc.spSu) > 0.002 || Math.abs(sumToFall - tc.suFa) > 0.002;
    TL._treeCache = { full, spSu: springToSum, suFa: sumToFall };
    for (let i = 0; i < decid.length; i++) {
      const t = decid[i];
      if (matChanged) {
        if (!t._q) t._q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.k * 6);
        const treeFull = Math.max(0, Math.min(1, (full - (1 - t.k) * 0.25) / 0.75));
        const s = treeFull < 0.02 ? 0.0001 : (0.18 + 0.82 * treeFull);
        const w = (5.5 + t.k * 6.5) * s, h = (t.h * 0.26) * s;
        ps.set(t.x, t.y + t.h * 0.74, t.z);
        sc.set(w, h, w);
        mtx.compose(ps, t._q, sc);
        canopies.setMatrixAt(i, mtx);
      }
      if (colChanged) {
        const idx = Math.floor(t.k * 97);
        const cSp = SEASONS.spring.leaves[idx % SEASONS.spring.leaves.length];
        const cSu = SEASONS.summer.leaves[idx % SEASONS.summer.leaves.length];
        const cFa = SEASONS.fall.leaves[idx % SEASONS.fall.leaves.length];
        _tc1.setHex(cSp).lerp(_tc2.setHex(cSu), springToSum).lerp(_tc3.setHex(cFa), sumToFall);
        canopies.setColorAt(i, _tc1);
      }
    }
    if (matChanged) canopies.instanceMatrix.needsUpdate = true;
    if (colChanged && canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
    const bScale = Math.max(0.0001, full);
    PATIO.crowns.forEach(c => {
      c.visible = full > 0.03;
      c.scale.set(7 * bScale, 6 * bScale, 7 * bScale);
    });
  }
  return _tc3.lerpColors(_tc1.setHex(k0.sky), _tc2.setHex(k1.sky), f);
}
// --- waypoint polyline in plan feet (with a heading per point)
function tlPoly(pts) {
  const segs = []; let total = 0;
  for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]); segs.push({ a, b, L }); total += L; }
  return { single: pts.length === 1, total,
    at(p) {
      if (segs.length === 0) { const q = pts[0]; return { x: q[0], y: q[1], z: q[2], h: 0 }; }
      p = Math.max(0, Math.min(1, p)); let d = p * total;
      for (let i = 0; i < segs.length; i++) { const s = segs[i];
        if (d <= s.L || i === segs.length - 1) { const k = s.L ? d / s.L : 0; return { x: s.a[0] + (s.b[0] - s.a[0]) * k, y: s.a[1] + (s.b[1] - s.a[1]) * k, z: s.a[2] + (s.b[2] - s.a[2]) * k, h: Math.atan2(s.b[0] - s.a[0], s.b[2] - s.a[2]) }; }
        d -= s.L; }
      const l = segs[segs.length - 1]; return { x: l.b[0], y: l.b[1], z: l.b[2], h: 0 };
    } };
}
const tlDrive = tlPoly(DRIVE.slice(0, 4).map(([x, z]) => [x, terrainY(x, z) + 0.05, z]));
function setCarColor(hex) { CAR.paint.color.set(hex); TL.carColor = hex; }
function tlSetFire(on) {
  if (!RT.FX_FIRE || TL.fire === on) return;
  TL.fire = on;
  RT.FX_FIRE.glass.material = on ? fireMat : M('frame');
  fireLight.visible = on || TL.on;
  fireLight.intensity = on ? 7 : 0;
  smoke.forEach(sp => { if (!sp.userData.origin) sp.visible = on; });
}
function tlSetGrill(on) {
  if (!GRILL || TL.grill === on) return;
  TL.grill = on;
  GRILL.actDef.on = on;
  GRILL.setOn(on);
}
function tlSetTV(ch) {
  if (!RT.tvScreen || TL.tv === ch) return;
  TL.tv = ch;
  const d = actOf(RT.tvScreen);
  if (d) { d.ch = ch; d.on = ch > 0; }
  RT.tvScreen.visible = ch > 0;
  tvLight.visible = ch > 0 || TL.on;
  tvLight.intensity = ch > 0 ? 2.6 : 0;
  if (ch > 0) drawTV(ch, RT.fxT);
}
function tlSetFan(spd) {
  if (TL.fan === spd) return;
  TL.fan = spd;
  FAN.speed = spd;
}
function tlSetFrontDoor(open) {
  if (!TL.frontDoor) TL.frontDoor = ACTS.find(a => a.kind === 'door' && /front door/i.test(a.label({ on: false })));
  if (!TL.frontDoor || TL.doorOpen === open) return;
  TL.doorOpen = open;
  TL.frontDoor.on = open;
  TL.frontDoor.run(TL.frontDoor);
}
function tlSetSideDoor(open) {
  if (!TL.sideDoor) TL.sideDoor = ACTS.find(a => a.kind === 'door' && /side door/i.test(a.label({ on: false })));
  if (!TL.sideDoor || TL.sideDoorOpen === open) return;
  TL.sideDoorOpen = open;
  TL.sideDoor.on = open;
  TL.sideDoor.run(TL.sideDoor);
}

function tlSetWallsRoof(walls, roof, floors = 'both') {
  if (state.walls === walls && state.roof === roof && state.floors === floors) return;
  state.walls = walls; state.roof = roof; state.floors = floors;
  const showG = floors !== 'loft', showL = floors !== 'ground';
  G.ground.visible = showG;
  G.loft.visible = showL;
  G.mainRoof.visible = roof && showL;
  G.wingRoof.visible = roof && showG;
  ['ground', 'both'].forEach(k => document.getElementById('fl-' + k).setAttribute('aria-pressed', String(floors === k)));
  document.getElementById('wl-roof').setAttribute('aria-pressed', String(walls === 'up' && roof));
  document.getElementById('wl-up').setAttribute('aria-pressed', String(walls === 'up' && !roof));
  document.getElementById('wl-cutaway').setAttribute('aria-pressed', String(walls === 'cutaway'));
  updateWalls();
  markShadows();
  wake(4);
}

let _modeBusy = false;
function withModeLoading(label, fn) {
  if (_modeBusy) return;
  _modeBusy = true;
  const el = document.getElementById('mode-loading');
  if (el) { el.querySelector('span').textContent = label; el.hidden = false; void el.offsetHeight; }
  setTimeout(() => {
    try { fn(); } finally {
      if (el) el.hidden = true;
      _modeBusy = false;
    }
  }, 16);
}


export {
  TL_LOOP, TL_MONTHS, TL_SEASON_OF_MONTH, SECOND_CAR,
  P_CAR_TO_LIV, P_CAR_TO_KIT, P_LIV_TO_CAR, P_KIT_TO_CAR, P_KIT_TO_GRILL, P_GRILL_TO_KIT,
  TL_GEO, TL_MATS, tlMat, CAST_PAIR, SHIRT_PAL, PANT_PAL, SKINS, HAIRS, SKI_PAL,
  makePerson, poseFigure, tlBuildEnvFx, tlStepEnvFx, tlApplyContinuousSeasons,
  _tc1, _tc2, _tc3, tlPoly, tlDrive, setCarColor,
  tlSetFire, tlSetGrill, tlSetTV, tlSetFan, tlSetFrontDoor, tlSetSideDoor,
  tlSetWallsRoof, withModeLoading
};
