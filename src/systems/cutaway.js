// Dynamic camera-facing wall cutaway classification and updates.
import * as THREE from 'three';
import { FT, LV, STUB } from '../config/constants.js';
import { state, RT, MODES, CUT, TL, BD, nightRig, markShadows } from '../core/state.js';
import { exteriorLightsOnly } from '../core/materials.js';
import { root, G } from '../house/site-and-floors.js';
import { renderer, camera, controls } from '../core/renderer.js';

let _lastWallsDown = false;
renderer.localClippingEnabled = true;
const capMat = new THREE.MeshStandardMaterial({ color: 0xD9D2C7, roughness: 0.95 }); capMat.name = 'wallCap';
const _clipCache = new Map();
function clipVariant(el) {
  if (!el.variant) {
    const k = `${el.base.uuid}|${el.key}`;
    let v = _clipCache.get(k);
    if (!v) {
      v = el.base.clone(); v.clippingPlanes = [CUT.planes[el.key]]; v.clipShadows = true; v.userData.base = el.base;
      if (el.base.userData.extLights) exteriorLightsOnly(v);
      _clipCache.set(k, v);
      CUT.variants.push(v);
    }
    el.variant = v;
  }
  return el.variant;
}
function prewarmCutaway() {
  const swapped = [];
  let capShown = null;
  for (const el of CUT.els) {
    if (!el.hide && el.m.visible) {
      const v = clipVariant(el);
      if (el.m.material !== v) { swapped.push([el.m, el.m.material]); el.m.material = v; }
      if (!capShown && el.cap && !el.cap.visible) { capShown = el.cap; capShown.visible = true; }
    }
  }
  renderer.compile(G.loft.parent || G.loft, camera);
  for (const [m, orig] of swapped) m.material = orig;
  if (capShown) capShown.visible = false;
}
(function classifyWalls() {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4(), rel = new THREE.Matrix4(), bb = new THREE.Box3();
  for (const key of ['ground', 'loft']) {
    const grp = G[key], F = key === 'loft' ? LV.LOFT : 0, top = F + STUB;
    inv.copy(grp.matrixWorld).invert();
    const meshes = []; grp.traverse(o => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); });
    for (const m of meshes) {
      if (Array.isArray(m.material) || m === undefined || m.userData.keep) continue;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      rel.multiplyMatrices(inv, m.matrixWorld);
      bb.copy(m.geometry.boundingBox).applyMatrix4(rel);
      const w = bb.max.x - bb.min.x, d = bb.max.z - bb.min.z, h = bb.max.y - bb.min.y;
      if (m.userData.nocut) continue;                                                // furniture, cabinets, stairs, fixtures stay whole
      if (bb.max.y <= top + 0.01) continue;
      const above = bb.min.y >= top - 0.01;
      if (above && h < 0.05 && w < 1 && d < 1 && bb.min.y >= F + 6.5) continue;      // ceiling trims (recessed lights)
      const wallish = Math.min(w, d) <= 1.0 && (h >= 1.0 || above);                  // walls, tile, glazing, doors, sills, heads, coping
      if (!wallish) continue;
      const axis = m.userData.cutAxis || (w < d ? 'x' : 'z');
      const c = axis === 'x' ? (bb.min.x + bb.max.x) / 2 : (bb.min.z + bb.max.z) / 2;
      const cxm = (bb.min.x + bb.max.x) / 2, czm = (bb.min.z + bb.max.z) / 2;
      const wing = key === 'ground' && czm > 17.45 && cxm < 17.45;                    // sunken living wing has its own reference
      const el = { m, key, axis, c, wing, base: m.material, hide: bb.min.y >= top - 0.01, cap: null, cut: false, variant: null };
      if (!el.hide) {
        const cg = new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate((bb.min.x + bb.max.x) / 2, top + 0.003, (bb.min.z + bb.max.z) / 2);
        el.cap = new THREE.Mesh(cg, capMat); el.cap.visible = false; el.cap.receiveShadow = true; el.cap.userData.nocut = true;
        // the cap lives in the mesh's floor group, in that group's coordinates
        grp.add(el.cap);
      }
      CUT.els.push(el);
    }
  }
})();
const _cv = new THREE.Vector3();
function updateWalls(syncMaterials = true) {
  const mode = state.walls;
  CUT.planes.ground.constant = root.position.y + FT * (G.ground.position.y + STUB);
  CUT.planes.loft.constant = root.position.y + FT * (G.loft.position.y + LV.LOFT + STUB);
  _cv.copy(camera.position).sub(root.position).divideScalar(FT); const cx = _cv.x, cz = _cv.z;
  // Reference points: a wall is cut when it stands between the camera and the reference. Main house: the orbit
  // target pulled inside the bar (the home view aims just outside the south wall). Wing: its own center, or the
  // target when you are looking into the wing.
  _cv.copy(controls.target).sub(root.position).divideScalar(FT);
  const inWing = _cv.x > 2.6 && _cv.x < 16.5 && _cv.z > 17.4 && _cv.z < 26.5;
  const bx = Math.min(47.2, Math.max(0.8, _cv.x)), bz = Math.min(16.3, Math.max(0.8, _cv.z));
  const wx = inWing ? _cv.x : 9.5, wz = inWing ? _cv.z : 22.0;
  const isDown = mode === 'down';
  const downChanged = isDown !== _lastWallsDown;
  _lastWallsDown = isDown;
  let anyChanged = false;
  for (const el of CUT.els) {
    let cut = isDown;
    if (mode === 'cutaway') {
      const tx = el.wing ? wx : bx, tz = el.wing ? wz : bz;
      cut = el.axis === 'x' ? (cx - el.c) * (tx - el.c) < 0 : (cz - el.c) * (tz - el.c) < 0;
    }
    const ph = !!el.m.userData.phaseHidden;
    if (cut === el.cut && ph === !!el.ph) continue;
    el.cut = cut; el.ph = ph; anyChanged = true;
    if (el.hide) el.m.visible = !cut && !ph;
    else { el.m.material = cut ? clipVariant(el) : el.base; el.m.visible = !ph; el.cap.visible = cut && !ph; }
  }
  if (anyChanged) {
    markShadows();
    if (downChanged && (RT.nightOn || (TL.on && TL.duskCur > 0.02) || (BD.on && BD.duskCur > 0.02))) {
      for (const { L } of nightRig) if (L.castShadow) L.shadow.needsUpdate = true;
    }
  }
  if (syncMaterials) {
    for (const v of CUT.variants) {                                               // keep night glow etc. in step
      const b = v.userData.base; v.color.copy(b.color); v.emissive.copy(b.emissive); v.emissiveIntensity = b.emissiveIntensity; v.opacity = b.opacity;
    }
  }
}
controls.addEventListener('change', () => { if (state.walls === 'cutaway') updateWalls(false); });

MODES.updateWalls = updateWalls;
export { capMat, clipVariant, prewarmCutaway, _cv, updateWalls };
