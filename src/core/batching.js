// TINY Layer 1 prop classification, Build phase tagging, and deep static geometry batching (P6).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RT, ACTS, CUT, FX_SHOWERS, FX_MIRRORS, FAN, PHASE_MESHES, TINY, actOf, markShadows } from './state.js';
import { root, G, roomFloorMeshes, ROOM_FLOOR_LIST } from '../house/site-and-floors.js';
import { renderer, scene, camera } from './renderer.js';
import { LAND, snowParts, CAR } from '../landscape/terrain-and-trees.js';
import { PATIO, WEST_DECK, GRILL } from '../landscape/outdoor-living.js';

  function meshBuildPhase(m, key) {
    if (m.userData.phase) return m.userData.phase;
    const mn = (m.material && (m.material.userData?.base?.name || m.material.name)) || '';
    if (mn === 'snow') return 'snow';
    if (key === 'site') {
      if (mn === 'gravel' || mn === 'foundation' || mn === 'concreteFloor') return 'slab';
      if (mn === 'deck' || mn === 'skirt' || mn === 'steel') return 'decks';
      return 'mep';
    }
    if (key === 'mainRoof' || key === 'wingRoof') {
      if (mn === 'ceiling' || mn === 'lamp') return 'drywall';
      if (mn === 'woodPanel') return 'millwork';
      if (mn === 'siding' || mn === 'sidingWood' || mn === 'soffit') return 'siding';
      return 'roofing';
    }
    const r = m.userData.room || '';
    if (mn === 'concreteFloor') return 'slab';
    if (mn === 'siding' || mn === 'sidingWood') return 'siding';
    if (mn === 'chalk' || mn === 'ceiling' || mn === 'panel') return 'drywall';
    if (mn === 'frame' || mn === 'glass') {
      if (r === 'guestBath' || r === 'bath2') return 'fixtures';
      if (r === 'living' && m === (RT.FX_TV && RT.FX_TV.box)) return 'furniture';
      if (r === 'living' && m !== (RT.FX_FIRE && RT.FX_FIRE.glass)) return 'furniture';
      if (r === 'kitchen') return 'fixtures';
      return 'windows';
    }
    if (mn === 'wineTile' || mn === 'wineGloss' || mn === 'nautical' || mn === 'biscuit' || mn === 'biscuitShade' || mn === 'brownberry' || mn === 'wood') return 'floorTile';
    if (mn === 'woodStair' || mn === 'woodRiser') return r === 'living' ? 'furniture' : 'stair';
    if (mn === 'woodPanel' || mn === 'burgundy' || mn === 'burgundyB' || mn === 'burgundyF' || mn === 'oakB' || mn === 'oakF' || mn === 'carcassIn' || mn === 'bore' || mn === 'steelTop' || mn === 'steelBowl' || mn === 'steelBowlF' || mn === 'mosaic') return 'millwork';
    if (mn === 'millwork') return (r === 'guestBed' || r === 'office' || r === 'bedroom') ? 'furniture' : 'millwork';
    if (mn === 'oak') return (r === 'guestBed' || r === 'office') ? 'furniture' : 'millwork';
    if (mn === 'door' || mn === 'lever') return (m.userData.passable ? 'windows' : 'doors');
    if (mn === 'sofa' || mn === 'sofaBase' || mn === 'rug' || mn === 'sage' || mn === 'fabric' || mn === 'fabricBase') return 'furniture';
    if (mn === 'porcelain' || mn === 'chrome' || mn === 'stone' || mn === 'mirror' || mn === 'appliance' || mn === 'fridgeIn' || mn === 'fridgeLow' || mn === 'fridgeDoor' || mn === 'ovenGlass' || mn === 'lamp' || mn === 'creamGlass' || mn === 'paper' || mn === 'hoodLed' || mn === 'mwLed' || mn === 'beverageLemon') {
      if (r === 'guestBed' || r === 'office' || r === 'bedroom') return 'furniture';
      return 'fixtures';
    }
    if (mn === 'steel') {
      if (r === 'office') return 'furniture';
      if (r === 'living' || r === 'corridor') return 'fixtures';
      return 'stair';
    }
    return 'fixtures';
  }


export function batchGroupDeep(grp, skipSet) {
  grp.updateMatrixWorld(true);
  const invGrp = new THREE.Matrix4().copy(grp.matrixWorld).invert();
  const buckets = new Map(), candidates = [];
  grp.traverse(m => {
    if (!m.isMesh || m.isInstancedMesh || Array.isArray(m.material) || skipSet.has(m) || actOf(m) || m.userData.noMerge) return;
    candidates.push(m);
  });
  for (const m of candidates) {
    const g = m.geometry, attrSig = Object.keys(g.attributes).sort().join(',');
    const bKey = `${m.material.uuid}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}|${m.layers.mask}|${g.index ? 1 : 0}|${attrSig}`;
    let list = buckets.get(bKey);
    if (!list) { list = []; buckets.set(bKey, list); }
    list.push(m);
  }
  const localM = new THREE.Matrix4();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map(m => {
      localM.multiplyMatrices(invGrp, m.matrixWorld);
      const cg = m.geometry.clone(); cg.applyMatrix4(localM); return cg;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const ref = list[0], bm = new THREE.Mesh(merged, ref.material);
    bm.castShadow = ref.castShadow; bm.receiveShadow = ref.receiveShadow; bm.layers.mask = ref.layers.mask;
    grp.add(bm);
    for (const m of list) if (m.parent) m.parent.remove(m);
  }
}

// P6: Merge rigid direct-child meshes inside an interactive group (e.g. drawer box sides, door lever parts, car, grill)
function batchRigidSubgroup(grp, skipSet, preserveAct = null) {
  if (!grp || !grp.isObject3D) return;
  grp.updateMatrixWorld(true);
  const invGrp = new THREE.Matrix4().copy(grp.matrixWorld).invert();
  const buckets = new Map();
  for (const m of grp.children.slice()) {
    if (!m.isMesh || m.isInstancedMesh || Array.isArray(m.material) || skipSet.has(m) || m.userData.noMerge) continue;
    if (m.material && m.material.transparent && m.material.opacity === 0) continue;
    const g = m.geometry, attrSig = Object.keys(g.attributes).sort().join(',');
    const bKey = `${m.material.uuid}|${m.userData.phase || ''}|${m.userData.room || ''}|${m.userData.cutAxis || ''}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}|${m.layers.mask}|${m.userData.passable ? 1 : 0}|${g.index ? 1 : 0}|${attrSig}`;
    let list = buckets.get(bKey);
    if (!list) { list = []; buckets.set(bKey, list); }
    list.push(m);
  }
  const localM = new THREE.Matrix4();
  for (const list of buckets.values()) {
    if (list.length < 2) continue;
    const geos = list.map(m => {
      m.updateMatrix();
      const cg = m.geometry.clone();
      cg.applyMatrix4(m.matrix);
      return cg;
    });
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const ref = list[0], bm = new THREE.Mesh(merged, ref.material);
    bm.castShadow = ref.castShadow; bm.receiveShadow = ref.receiveShadow; bm.layers.mask = ref.layers.mask;
    bm.userData = { ...ref.userData };
    if (preserveAct) bm.userData.act = preserveAct;
    grp.add(bm);
    for (const m of list) grp.remove(m);
  }
}

export function batchSceneGeometries() {
  // Populate ROOM_FLOOR_LIST for fast room-click broadphase
  ROOM_FLOOR_LIST.length = 0;
  for (const list of Object.values(roomFloorMeshes)) {
    for (const m of list) ROOM_FLOOR_LIST.push(m);
  }

  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || actOf(o)) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const b = o.geometry.boundingBox, maxDim = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
    if (maxDim < 1.6) o.castShadow = false;
    if (maxDim < 0.85) { o.receiveShadow = false; o.layers.set(1); TINY.push(o); }
  });
  camera.layers.enable(1);

  for (const key of ['ground', 'loft', 'site', 'mainRoof', 'wingRoof']) {
    G[key].traverse(m => {
      if (m.isMesh && !m.isInstancedMesh && m.material?.name !== 'wallCap') m.userData.phase = meshBuildPhase(m, key);
    });
  }

  const snowSet = new Set(snowParts);
  const floorSet = new Set(ROOM_FLOOR_LIST);

  // P6: Batch co-planar cutaway meshes in CUT.els (and their cap planes) per wall plane
  {
    const cutBuckets = new Map();
    const keptCutEls = [];
    for (const el of CUT.els) {
      const m = el.m;
      if (!m || !m.parent || m.isInstancedMesh || Array.isArray(m.material) || actOf(m) || m.userData.noMerge || snowSet.has(m) || floorSet.has(m)) {
        keptCutEls.push(el);
        continue;
      }
      const g = m.geometry;
      const attrSig = Object.keys(g.attributes).sort().join(',');
      const cQ = Math.round(el.c * 4) / 4;
      const bKey = `${el.key}|${el.axis}|${cQ}|${el.wing ? 1 : 0}|${el.hide ? 1 : 0}|${el.base.uuid}|${m.userData.phase || ''}|${m.userData.room || ''}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}|${m.layers.mask}|${m.userData.passable ? 1 : 0}|${g.index ? 1 : 0}|${attrSig}`;
      let list = cutBuckets.get(bKey);
      if (!list) { list = []; cutBuckets.set(bKey, list); }
      list.push(el);
    }
    const invGrp = new THREE.Matrix4(), localM = new THREE.Matrix4();
    for (const list of cutBuckets.values()) {
      if (list.length < 2) { keptCutEls.push(list[0]); continue; }
      const ref = list[0], grp = G[ref.key];
      grp.updateMatrixWorld(true);
      invGrp.copy(grp.matrixWorld).invert();
      const geos = list.map(el => {
        el.m.updateWorldMatrix(true, false);
        localM.multiplyMatrices(invGrp, el.m.matrixWorld);
        const cg = el.m.geometry.clone();
        cg.applyMatrix4(localM);
        return cg;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) { for (const el of list) keptCutEls.push(el); continue; }

      let bCap = null;
      if (!ref.hide) {
        const capEls = list.filter(el => el.cap && el.cap.parent);
        if (capEls.length) {
          const capGeos = capEls.map(el => {
            el.cap.updateWorldMatrix(true, false);
            localM.multiplyMatrices(invGrp, el.cap.matrixWorld);
            const cg = el.cap.geometry.clone();
            cg.applyMatrix4(localM);
            return cg;
          });
          const mergedCap = capGeos.length === 1 ? capGeos[0] : mergeGeometries(capGeos, false);
          if (!mergedCap) { for (const el of list) keptCutEls.push(el); continue; }
          bCap = new THREE.Mesh(mergedCap, capEls[0].cap.material);
          bCap.visible = false; bCap.receiveShadow = true; bCap.userData.nocut = true;
          if (ref.m.userData.phase) bCap.userData.phase = ref.m.userData.phase;
        }
      }

      const bm = new THREE.Mesh(merged, ref.base);
      bm.castShadow = ref.m.castShadow; bm.receiveShadow = ref.m.receiveShadow; bm.layers.mask = ref.m.layers.mask;
      if (ref.m.userData.room) bm.userData.room = ref.m.userData.room;
      if (ref.m.userData.phase) bm.userData.phase = ref.m.userData.phase;
      if (ref.m.userData.passable) bm.userData.passable = true;
      grp.add(bm);
      if (bCap) grp.add(bCap);
      for (const el of list) {
        if (el.m.parent) el.m.parent.remove(el.m);
        if (el.cap && el.cap.parent) el.cap.parent.remove(el.cap);
      }
      keptCutEls.push({
        m: bm, key: ref.key, axis: ref.axis, c: ref.c, wing: ref.wing,
        base: ref.base, hide: ref.hide, cap: bCap, cut: false, variant: null
      });
    }
    CUT.els.length = 0;
    for (const el of keptCutEls) CUT.els.push(el);
  }

  const cutSet = new Set();
  for (const el of CUT.els) {
    cutSet.add(el.m);
    if (el.cap) { cutSet.add(el.cap); el.cap.userData.phase = el.m.userData.phase; }
  }

  // P6: Deep static mesh batching across G.ground, G.loft, G.site, G.mainRoof, G.wingRoof (including nested static groups like buildOffice & buildFigure)
  for (const key of ['ground', 'loft', 'site', 'mainRoof', 'wingRoof']) {
    const grp = G[key], buckets = new Map();
    grp.updateMatrixWorld(true);
    const invGrp = new THREE.Matrix4().copy(grp.matrixWorld).invert();
    const candidates = [];
    grp.traverse(m => {
      if (!m.isMesh || m.isInstancedMesh || Array.isArray(m.material) || cutSet.has(m) || snowSet.has(m) || floorSet.has(m) || actOf(m) || m.userData.noMerge) return;
      if (RT.FX_FIRE && m === RT.FX_FIRE.glass) return;
      if (m === RT.tvScreen) return;
      if (FX_SHOWERS.some(S => m === S.steam || m === S.mesh)) return;
      candidates.push(m);
    });
    for (const m of candidates) {
      const g = m.geometry;
      const attrSig = Object.keys(g.attributes).sort().join(',');
      const bKey = `${m.material.uuid}|${m.userData.phase || ''}|${m.userData.room || ''}|${m.castShadow ? 1 : 0}|${m.receiveShadow ? 1 : 0}|${m.layers.mask}|${m.userData.passable ? 1 : 0}|${g.index ? 1 : 0}|${attrSig}`;
      let list = buckets.get(bKey);
      if (!list) { list = []; buckets.set(bKey, list); }
      list.push(m);
    }
    const localM = new THREE.Matrix4();
    for (const list of buckets.values()) {
      if (list.length < 2) continue;
      const geos = list.map(m => {
        m.updateWorldMatrix(true, false);
        localM.multiplyMatrices(invGrp, m.matrixWorld);
        const cg = m.geometry.clone();
        cg.applyMatrix4(localM);
        return cg;
      });
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      const ref = list[0], bm = new THREE.Mesh(merged, ref.material);
      bm.castShadow = ref.castShadow; bm.receiveShadow = ref.receiveShadow; bm.layers.mask = ref.layers.mask;
      if (ref.userData.room) bm.userData.room = ref.userData.room;
      if (ref.userData.phase) bm.userData.phase = ref.userData.phase;
      if (ref.userData.passable) bm.userData.passable = true;
      bm.userData.nocut = true;
      grp.add(bm);
      for (const m of list) if (m.parent) m.parent.remove(m);
    }
  }

  // P6: Batch rigid sub-meshes inside interactive ACTS groups (drawer boxes, levers, fan blades, car, grill, firepit logs/flames)
  const actSkip = new Set([...cutSet, ...snowSet, RT.FX_FIRE && RT.FX_FIRE.glass, RT.tvScreen].filter(Boolean));
  for (const a of ACTS) {
    if (a.kind === 'cabinet' && /drawer/i.test(a.label({ on: false }))) a.isDrawer = true;
    batchRigidSubgroup(a.obj, actSkip, a);
    for (const child of a.obj.children) {
      if (child.isGroup) batchRigidSubgroup(child, actSkip, a);
    }
  }
  if (FAN.spin) batchRigidSubgroup(FAN.spin, actSkip, actOf(FAN.spin));
  if (PATIO.logs) batchRigidSubgroup(PATIO.logs, actSkip, actOf(PATIO.firepit));
  if (PATIO.flames) batchRigidSubgroup(PATIO.flames, actSkip, actOf(PATIO.firepit));

  for (const key of ['ground', 'loft', 'site', 'mainRoof', 'wingRoof']) {
    G[key].traverse(m => {
      if (!m.isMesh || m.isInstancedMesh || snowSet.has(m) || m === RT.tvScreen || m.material?.name === 'wallCap') return;
      if (FX_SHOWERS.some(S => m === S.steam || m === S.mesh)) return;
      if (m.material && m.material.transparent && m.material.opacity === 0) return;
      if (m.userData.phase) {
        if (cutSet.has(m)) m.userData.inCutSet = true;
        m.userData.bdFloor = key;
        m.userData.bdMat = (m.material && (m.material.userData?.base?.name || m.material.name)) || '';
        PHASE_MESHES.push(m);
      }
    });
  }

  const landSkip = new Set([
    ...(PATIO.crowns || []),
    PATIO.lanternHalo,
    WEST_DECK.lanternHalo,
  ].filter(Boolean));
  if (PATIO.grp) batchGroupDeep(PATIO.grp, landSkip);
  if (WEST_DECK.grp) batchGroupDeep(WEST_DECK.grp, landSkip);

  markShadows();
}
