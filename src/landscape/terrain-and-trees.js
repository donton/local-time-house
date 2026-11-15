// Wooded Catskills terrain, gravel drive, 330 instanced trees, plants, path bollards, and EV car.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FT, LV, roofTop, EXT, LITE } from '../config/constants.js';
import { nightRig, act } from '../core/state.js';
import { M, lampMat, exteriorLightsOnly } from '../core/materials.js';
import { box, slopedSlab } from '../core/builder.js';
import { root, G } from '../house/site-and-floors.js';
import { SKYLIGHTS, SKY_Z, xSegments } from '../house/loft-and-roof.js';
import { scene } from '../core/renderer.js';

/* =====================================================================
   12. SITE + SEASONS — from the owner's site photos (Nov 2026): a cleared dirt pad with a gravel band in mixed
   hardwood woods (maple, oak, birch) with scattered pines; ground rising into the trees behind (north); the drive
   and parking to the west; an open view south to a distant ridgeline. The landscape lives outside the house root,
   so Export GLB stays the building only.
   ===================================================================== */
const LAND = new THREE.Group(); LAND.name = 'landscape';
LAND.scale.setScalar(FT); LAND.position.copy(root.position); scene.add(LAND);
const SEASONS = {
  fall:   { ground: 0x7a6553, clearing: 0x7c744f, leaves: [0xc3702c, 0xa6402c, 0xcf9b38, 0x8d5a33, 0x9a7a3c], bare: 0.5, sky: null },
  winter: { ground: 0xe9edf1, clearing: 0xe6eaee, leaves: [], bare: 1.0, sky: null },
  spring: { ground: 0x6d7a4a, clearing: 0x76944c, leaves: [0x6fa04a, 0x7fb069, 0x5d8a3e, 0x8fbf5a], bare: 0.25, sky: null },
  summer: { ground: 0x5f6e3e, clearing: 0x64853c, leaves: [0x4f7a34, 0x5d8a3a, 0x43692c, 0x6a8f45], bare: 0.0, sky: null },
};
let seed = 1234; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const CX = 22, CZ = 14;
const DRIVE = [[73, 45], [86, 58], [102, 80], [117, 112], [130, 154], [139, 207], [146, 270]];   // drive centerline (plan feet); parking tucked further SE, clear of the house
const PATIO_AT = [-15, 41];                                                  // patio, off the south-west corner
const PARK_AT = [76, 48];
const nearDrive = (x, z, pad = 14) => DRIVE.some(([ax, az], i) => { if (i === DRIVE.length - 1) return false; const [bx, bz] = DRIVE[i + 1], vx = bx - ax, vz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz))); return Math.hypot(x - ax - vx * t, z - az - vz * t) < pad; }) || Math.hypot(x - PARK_AT[0], z - PARK_AT[1]) < 22;                                                      // clearing center (plan feet)
// grade: flat pad ±60' + flat parking court, rising into the woods (north steepest), falling away to the south view
function terrainY(x, z) {
  const dp = Math.hypot(x - PARK_AT[0], z - PARK_AT[1]);
  const dx = x - CX, dz = z - CZ, d = Math.hypot(dx, dz);
  if (d < 68 || dp < 20) return LV.GRADE;
  const t = Math.min(d - 68, Math.max(0, dp - 20));
  const north = Math.max(0, -dz) / d, south = Math.max(0, dz) / d;
  return LV.GRADE + t * (0.05 + 0.16 * north - 0.10 * south) + Math.sin(x * 0.031) * Math.cos(z * 0.027) * Math.min(t, 40) * 0.08;
}
function makeMeadowAlphaMap() {
  const s = 128, c = document.createElement('canvas'); c.width = c.height = s;
  const ctx = c.getContext('2d'), img = ctx.createImageData(s, s), d = img.data;
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5;
    const r = Math.hypot(dx, dy) * 2, a = Math.atan2(dy, dx);
    const wobble = 0.05 * Math.sin(a * 5) + 0.03 * Math.cos(a * 3 + 1.2);
    const t = Math.max(0, Math.min(1, (r - (0.56 + wobble)) / 0.38));
    const v = Math.round((1 - t * t * (3 - 2 * t)) * 255);
    const i = (y * s + x) * 4;
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return new THREE.CanvasTexture(c);
}
const groundMat = new THREE.MeshStandardMaterial({ color: SEASONS.fall.ground, roughness: 1 });
const clearMat = new THREE.MeshStandardMaterial({ color: SEASONS.fall.clearing, roughness: 1, alphaMap: makeMeadowAlphaMap(), transparent: true, depthWrite: false });
const driveMat = new THREE.MeshStandardMaterial({ color: 0x8f8270, roughness: 0.96, side: THREE.DoubleSide });
exteriorLightsOnly(groundMat); exteriorLightsOnly(clearMat); exteriorLightsOnly(driveMat);
{
  const g = new THREE.PlaneGeometry(1400, 1400, 96, 96); g.rotateX(-Math.PI / 2); g.translate(CX, 0, CZ);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, terrainY(pos.getX(i), pos.getZ(i)) - 0.14);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, groundMat); m.receiveShadow = true; m.name = 'terrain'; LAND.add(m);
  // lawn/meadow clearing feathered softly into the surrounding woods
  const pad = new THREE.Mesh(new THREE.CircleGeometry(64, 64).rotateX(-Math.PI / 2).translate(CX, LV.GRADE - 0.03, CZ), clearMat);
  pad.receiveShadow = true; LAND.add(pad);
  // rounded turnaround / parking court at the end of the path, then a 12' gravel drive winding off south-east through the woods;
  // built as a dense ribbon so it follows the terrain
  const park = new THREE.Mesh(new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2), driveMat);
  park.scale.set(16, 1, 18); park.rotation.y = Math.atan2(DRIVE[1][0] - DRIVE[0][0], DRIVE[1][1] - DRIVE[0][1]); park.position.set(PARK_AT[0], LV.GRADE + 0.02, PARK_AT[1]);
  park.receiveShadow = true; LAND.add(park);
  const dpts = []; for (let i = 0; i < DRIVE.length - 1; i++) for (let k = 0; k < 12; k++) {
    const t = k / 12, [ax, az] = DRIVE[i], [bx, bz] = DRIVE[i + 1]; dpts.push([ax + (bx - ax) * t, az + (bz - az) * t]); }
  dpts.push(DRIVE[DRIVE.length - 1]);
  const rpos = [], idx = [];
  dpts.forEach(([x, z], i) => {
    const [px, pz] = dpts[Math.max(0, i - 1)], [nx, nz] = dpts[Math.min(dpts.length - 1, i + 1)];
    let dx = nx - px, dz = nz - pz; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
    for (const sgn of [-1, 1]) { const vx = x - dz * 6 * sgn, vz = z + dx * 6 * sgn; rpos.push(vx, Math.max(LV.GRADE - 0.01, terrainY(vx, vz) + 0.04), vz); }
    if (i) { const a = 2 * (i - 1); idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); rg.setIndex(idx); rg.computeVertexNormals();
  const rm = new THREE.Mesh(rg, driveMat); rm.receiveShadow = true; LAND.add(rm);
}
// woods: instanced trunks + canopies (deciduous) and cones (pines)
const TREES = [];
for (let i = 0; i < 520 && TREES.length < 330; i++) {
  const a = rnd() * Math.PI * 2, r = 62 + Math.pow(rnd(), 0.7) * 300;
  const x = CX + Math.cos(a) * r, z = CZ + Math.sin(a) * r;
  const southView = Math.sin(a) > 0.55 && r < 240;                           // keep the view south open
  const onDrive = nearDrive(x, z, 16);
  if ((southView && rnd() < 0.85) || onDrive) continue;
  TREES.push({ x, z, y: terrainY(x, z), h: 38 + rnd() * 34, pine: rnd() < 0.12, k: rnd() });
}
const decid = TREES.filter(t => !t.pine), pines = TREES.filter(t => t.pine);
const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 1, 6).translate(0, 0.5, 0);
const canopyGeo = new THREE.IcosahedronGeometry(1, 1);
const coneGeo = new THREE.ConeGeometry(1, 1, 8).translate(0, 0.5, 0);
const trunks = new THREE.InstancedMesh(trunkGeo, new THREE.MeshStandardMaterial({ color: 0x6d655c, roughness: 1 }), TREES.length);
const canopies = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true }), decid.length);
const twigs = new THREE.InstancedMesh(canopyGeo, new THREE.MeshStandardMaterial({ color: 0x6f6259, roughness: 1, transparent: true, opacity: 0.32, depthWrite: false, flatShading: true }), decid.length);
const cones = new THREE.InstancedMesh(coneGeo, new THREE.MeshStandardMaterial({ color: 0x2f4a2e, roughness: 1, flatShading: true }), pines.length);
const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
TREES.forEach((t, i) => {
  const th = t.pine ? t.h * 0.35 : t.h * 0.62;
  mtx.compose(ps.set(t.x, t.y, t.z), q.identity(), sc.set(0.6 + t.k * 0.5, th, 0.6 + t.k * 0.5)); trunks.setMatrixAt(i, mtx);
});
decid.forEach((t, i) => {
  const w = 5.5 + t.k * 6.5;
  mtx.compose(ps.set(t.x, t.y + t.h * 0.74, t.z), q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.k * 6), sc.set(w, t.h * 0.26, w));
  canopies.setMatrixAt(i, mtx); twigs.setMatrixAt(i, mtx);
});
pines.forEach((t, i) => {
  mtx.compose(ps.set(t.x, t.y + 3, t.z), q.identity(), sc.set(7 + t.k * 4, t.h * 0.95, 7 + t.k * 4)); cones.setMatrixAt(i, mtx);
});
for (const m of [trunks, canopies, cones]) { m.castShadow = true; m.receiveShadow = true; LAND.add(m); }
LAND.add(twigs);
// distant ridgeline to the south (seen from the dormer in the photos)
{
  const pts = []; for (let i = 0; i <= 60; i++) { const x = -2600 + i * 90; pts.push([x, 120 + 90 * Math.sin(i * 0.37) + 50 * Math.sin(i * 1.13 + 1) + 30 * Math.sin(i * 2.7)]); }
  const shp = new THREE.Shape(); shp.moveTo(pts[0][0], -60); pts.forEach(([x, y]) => shp.lineTo(x, y)); shp.lineTo(pts[pts.length - 1][0], -60);
  const rg = new THREE.ShapeGeometry(shp); rg.translate(0, 0, 0);
  const ridge = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0x8796ad, fog: true }));
  ridge.position.set(CX, -40, 2400); ridge.rotation.y = Math.PI; LAND.add(ridge);
}
// snow on the roofs (winter only), in the roof groups so it hides with the roof
const snowParts = [];
{
  const S = 0.32, N = LV.ROOF_EDGE_N, Sx = LV.ROOF_EDGE_S, rz = LV.RIDGE_Z, ry = LV.RIDGE, [dx0, dx1] = LV.DORMER_X, up = 0.3;
  const at = z => roofTop(z) + up;
  const add = m => { m.userData.snow = true; m.visible = false; snowParts.push(m); };
  add(slopedSlab(G.mainRoof, [-0.53, 48.59], [N, at(N)], [rz, ry + up], S, 'snow'));
  add(slopedSlab(G.mainRoof, [-0.53, dx0], [rz, ry + up], [Sx, at(Sx)], S, 'snow'));
  add(slopedSlab(G.mainRoof, [dx1, 48.59], [rz, ry + up], [Sx, at(Sx)], S, 'snow'));
  add(slopedSlab(G.mainRoof, [dx0, dx1], [rz, ry + up], [LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y + up], S, 'snow'));
  add(slopedSlab(G.mainRoof, [dx0 - 0.13, dx1 + 0.13], [LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y + 0.35], [Sx + 0.06, LV.DORMER_EAVE_Y + 0.3], S, 'snow'));
  add(box(G.wingRoof, [2.51, 16.52], [LV.WING_TOP - 0.3, LV.WING_TOP + 0.05], [17.39, 26.55], 'snow'));
  add(box(G.wingRoof, [17.37, 23.75], [LV.WING_TOP + 0.02, LV.WING_TOP + 0.3], [17.39, 27.05], 'snow'));
  add(box(G.site, [-8.34, -0.34], [-0.167, 0.05], [-0.32, 17.39], 'snow'));
}
const fogColor = new THREE.Color();
scene.fog = new THREE.Fog(0xe4e1d9, 180, 900);
// Landscaping (owner): native, loose planting to suit the wooded site. Ferns and grasses in a band just outside
// the gravel drip strip (ferns on the shady north), evergreen shrubs at the corners, a stepping-stone path from
// the drive to the entry steps, a few boulders, and meadow grasses softening the edge of the cleared pad.
const PLANTS = (() => {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const grassMat = new THREE.MeshStandardMaterial({ color: 0xB49A5E, roughness: 1, flatShading: true });
  const fernMat = new THREE.MeshStandardMaterial({ color: 0x8C6A3A, roughness: 1, flatShading: true });
  const shrubMat = new THREE.MeshStandardMaterial({ color: 0x2F4630, roughness: 1, flatShading: true });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x8C8982, roughness: 0.95, flatShading: true });
  for (const m of [grassMat, fernMat, shrubMat, stoneMat]) exteriorLightsOnly(m);
  const y0 = LV.GRADE, grass = [], ferns = [], shrubs = [], stones = [], boulders = [];
  const band = (x0, x1, z0, z1, mix, step = 1.6) => {
    for (let x = x0; x <= x1; x += step) {
      const z = z0 + (z1 - z0) * rnd(), xx = x + (rnd() - 0.5) * 0.6;
      (rnd() < mix ? ferns : grass).push([xx, z, 0.8 + rnd() * 0.5]);
    }
  };
  band(25.5, 47.6, 19.3, 20.6, 0.35);                    // south of the main house (sunny): mostly grasses
  band(0.3, 16.0, -3.2, -2.2, 0.85); band(23.2, 47.4, -3.2, -2.2, 0.85);   // north (shade): ferns, skipping the AC pad
  band(50.3, 51.4, 0, 17.5, 0.6, 1.5);                   // east
  band(2.6, 16.4, 29.2, 30.3, 0.4);                      // south of the living room wing
  for (let z = 18.6; z <= 27.6; z += 1.5) ferns.push([-0.9 + (rnd() - 0.5) * 0.6, z, 0.8 + rnd() * 0.4]);   // west of the wing
  for (const [x, z, k] of [[-1.3, -3.2, 1.9], [49.9, -3.3, 2.1], [51.0, 18.9, 1.8], [-1.0, 29.2, 1.7], [47.9, 20.6, 1.6], [24.9, 20.2, 1.4]]) shrubs.push([x, z, k]);
  // rectangular stepping stones: from the entry steps out toward 4–5 o'clock (south-east), where the drive will be,
  // in a gentle curve; each stone sits across the line of travel
  const pts = [[20.7, 30.8], [27.0, 33.0], [38.0, 33.8], [50.0, 35.5], [61.5, 39.0]];      // entry steps → east → parking off the SE corner
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2.3));
    const dir = Math.atan2(bx - ax, bz - az);
    for (let k = 0; k < n; k++) { const t = k / n; stones.push([ax + (bx - ax) * t + (rnd() - 0.5) * 0.15, az + (bz - az) * t + (rnd() - 0.5) * 0.15, dir + (rnd() - 0.5) * 0.12]); }
  }
  stones.push([...pts[pts.length - 1], Math.atan2(11.5, 3.5)]);
  boulders.push([25.5, 36.2, 1.3], [17.0, 33.4, 1.0], [52.5, 37.2, 1.1], [-3.5, -4.6, 1.1]);
  // meadow ring at the edge of the clearing, kept off the drive
  for (let i = 0; i < 520; i++) {
    const a = rnd() * Math.PI * 2, r = 46 + rnd() * 11, x = CX + Math.cos(a) * r, z = CZ + Math.sin(a) * r;
    if (nearDrive(x, z, 9) || Math.hypot(x - PATIO_AT[0], z - PATIO_AT[1]) < 11.5) continue;   // keep the drive and the patio clear
    grass.push([x, z, 0.6 + rnd() * 0.7]);
  }
  const inst = (geo, mat, list, place) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length); const o = new THREE.Object3D();
    list.forEach((p, i) => { place(o, p); o.updateMatrix(); m.setMatrixAt(i, o.matrix); });
    m.castShadow = true; m.receiveShadow = true; LAND.add(m); return m;
  };
  const blades = [];
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2 + rnd() * 0.4, h = 1.6 + rnd() * 0.8, tilt = 0.14 + rnd() * 0.32, r0 = 0.08 + rnd() * 0.18;
    const b = new THREE.ConeGeometry(0.055, h, 3).translate(0, h / 2, 0).rotateX(tilt).rotateY(a).translate(Math.sin(a) * r0, 0, Math.cos(a) * r0);
    blades.push(b);
  }
  const grassGeo = mergeGeometries(blades, false);
  const mGrass = inst(grassGeo, grassMat, LITE ? grass.filter((_, i) => i % 2 === 0) : grass, (o, [x, z, k]) => { o.position.set(x, y0, z); o.rotation.set(0, rnd() * 6.28, (rnd() - 0.5) * 0.12); o.scale.set(k, k * (0.8 + rnd() * 0.45), k); });
  const mFerns = inst(new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), fernMat, ferns, (o, [x, z, k]) => { o.position.set(x, y0, z); o.rotation.set(0, rnd() * 3, 0); o.scale.set(1.25 * k, 0.75 * k, 1.25 * k); });
  const mShrubs = inst(new THREE.IcosahedronGeometry(1, 1).translate(0, 0.75, 0), shrubMat, shrubs, (o, [x, z, k]) => { o.position.set(x, y0, z); o.rotation.set(0, rnd() * 3, 0); o.scale.set(k, k * 0.85, k); });
  const mStones = inst(new THREE.BoxGeometry(2.6, 0.16, 1.25).translate(0, 0.05, 0), stoneMat, stones, (o, [x, z, a]) => { o.position.set(x, y0, z); o.rotation.set(0, a, 0); o.scale.set(0.92 + rnd() * 0.16, 1, 0.9 + rnd() * 0.2); });   // ~2'-7" × 1'-3" pavers
  const mBoulders = inst(new THREE.DodecahedronGeometry(1, 0), stoneMat, boulders, (o, [x, z, k]) => { o.position.set(x, y0 + 0.25 * k, z); o.rotation.set(rnd(), rnd() * 3, rnd() * 0.3); o.scale.set(1.5 * k, 0.8 * k, 1.2 * k); });
  return { grassMat, fernMat, shrubMat, grassGeo, meshes: [mGrass, mFerns, mShrubs, mStones], boulders: mBoulders };
})();
// Architectural path bollard lights: entry stone path, parking spot, and patio perimeter
const PATH_BOLLARDS = [
  [24.2, 33.4], [41.0, 35.1],   // entry stone path
  [61.5, 41.5], [73.5, 40.5],   // parking spot & EV charger
  [-5.0, 42.5], [-23.5, 45.5],  // patio perimeter (clear of table & firepit)
];
{
  const postG = new THREE.CylinderGeometry(0.14, 0.14, 1.52, 12).translate(0, 0.76, 0);
  const lensG = new THREE.CylinderGeometry(0.125, 0.125, 0.22, 12).translate(0, 1.63, 0);
  const capG = new THREE.CylinderGeometry(0.16, 0.15, 0.12, 12).translate(0, 1.80, 0);
  for (const [bx, bz] of PATH_BOLLARDS) {
    const by = terrainY(bx, bz);
    const gB = new THREE.Group(); gB.position.set(bx, by, bz);
    const post = new THREE.Mesh(postG, M('frame')); post.castShadow = true; post.receiveShadow = true;
    const lens = new THREE.Mesh(lensG, lampMat);
    const cap = new THREE.Mesh(capG, M('frame')); cap.castShadow = true;
    gB.add(post, lens, cap); LAND.add(gB);
    const L = new THREE.SpotLight(0xffcf96, 0, 26, 1.38, 0.95, 1.1);
    L.position.set(bx, by + 1.72, bz); L.target.position.set(bx, by, bz); L.userData.ext = true;
    L.castShadow = false;
    LAND.add(L, L.target);
    nightRig.push({ L, cd: 4.5 });
  }
}

/* White sedan (Model 3 proportions: 15'-5" × 6'-1" × 4'-9"), backed into the parking spot and plugged into a
   wall-box charger on a bright orange post. Click the car to flash the headlights. */
const CAR = (() => {
  const P0 = DRIVE[0], dl = Math.hypot(DRIVE[1][0] - P0[0], DRIVE[1][1] - P0[1]), hx = (DRIVE[1][0] - P0[0]) / dl, hz = (DRIVE[1][1] - P0[1]) / dl;   // nose points down the drive
  const lx = hz, lz = -hx;                                                                 // car's left
  const C = [P0[0] + hx * 3, P0[1] + hz * 3];
  const car = new THREE.Group(); car.position.set(C[0], LV.GRADE, C[1]); car.rotation.y = Math.atan2(hx, hz); LAND.add(car);
  const paint = new THREE.MeshStandardMaterial({ color: 0xF3F3F1, roughness: 0.22, metalness: 0.15 });
  const glassM = new THREE.MeshStandardMaterial({ color: 0x141b21, roughness: 0.08, metalness: 0.5 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x1b1b1c, roughness: 0.9 }), rim = new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.35, metalness: 0.7 });
  const lamp = new THREE.MeshStandardMaterial({ color: 0xe8edf2, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.2 });
  const tail = new THREE.MeshStandardMaterial({ color: 0x7a0f14, emissive: 0xff2020, emissiveIntensity: 0.15, roughness: 0.3 });
  for (const m of [paint, glassM, tire, rim]) exteriorLightsOnly(m);
  const W = 6.0, L = 15.4;
  const side = (pts, width, mat, bevel) => {                                              // a side profile (z, y) extruded across the width
    const sh = new THREE.Shape(pts.map(([z, y]) => new THREE.Vector2(z, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: width - 2 * bevel, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
    g.translate(0, 0, -(width - 2 * bevel) / 2); g.rotateY(-Math.PI / 2);                   // profile z → local z, extrusion → local x
    const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; car.add(m); return m;
  };
  side([[-7.55, 0.62], [-7.7, 1.55], [-7.45, 2.45], [-6.7, 2.82], [-4.4, 3.02], [4.5, 2.9], [7.2, 2.46], [7.62, 1.9], [7.5, 0.62]], W, paint, 0.22);   // body to the beltline
  side([[-4.55, 2.9], [-1.95, 4.45], [0.6, 4.62], [2.6, 4.12], [4.6, 2.86]], W - 0.55, glassM, 0.16);   // dark glass cabin: windows + all-glass roof
  for (const [z, x] of [[4.55, 1], [4.55, -1], [-4.45, 1], [-4.45, -1]]) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.06, 0.78, 28).rotateZ(Math.PI / 2), tire); t.position.set(x * (W / 2 - 0.32), 1.06, z); t.castShadow = true; car.add(t);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.72, 0.8, 20).rotateZ(Math.PI / 2), rim); r.position.copy(t.position); car.add(r);
  }
  for (const x of [1, -1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.16, 0.12), lamp); h.position.set(x * 2.2, 2.38, 7.55); car.add(h); }
  const tl = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.18, 0.1), tail); tl.position.set(0, 2.55, -7.62); car.add(tl);
  const port = [W / 2 + 0.12, 2.55, -6.15];                                                // charge port, rear left
  // charger post: square orange post, black wall box, cable looping to the port
  const rearL = [C[0] - hx * 7.7 + lx * (W / 2), C[1] - hz * 7.7 + lz * (W / 2)];
  const post = [rearL[0] - hx * 2.4 + lx * 1.4, rearL[1] - hz * 2.4 + lz * 1.4];
  const orange = new THREE.MeshStandardMaterial({ color: 0xFF6A1A, roughness: 0.5 }), boxM = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.4 });
  exteriorLightsOnly(orange); exteriorLightsOnly(boxM);
  const pole = new THREE.Mesh(new THREE.BoxGeometry(0.36, 5.2, 0.36), orange); pole.position.set(post[0], LV.GRADE + 2.6, post[1]); pole.castShadow = true; LAND.add(pole);
  const cap = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.08, 0.44), orange); cap.position.set(post[0], LV.GRADE + 5.24, post[1]); LAND.add(cap);
  const wb = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.25, 0.32), boxM); wb.rotation.y = car.rotation.y;
  wb.position.set(post[0] + hx * 0.34, LV.GRADE + 3.7, post[1] + hz * 0.34); wb.castShadow = true; LAND.add(wb);
  const led = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), new THREE.MeshBasicMaterial({ color: 0x3cff8a })); led.position.set(0, 0.3, 0.17); wb.add(led);   // charging
  car.updateMatrixWorld(true); LAND.updateMatrixWorld(true);
  const pw = car.localToWorld(new THREE.Vector3(...port)), toL = v => LAND.worldToLocal(v.clone());
  const a = new THREE.Vector3(post[0] + hx * 0.4, LV.GRADE + 3.2, post[1] + hz * 0.4), b = toL(pw);
  const curve = new THREE.CatmullRomCurve3([a, new THREE.Vector3(a.x + hx * 0.6, LV.GRADE + 0.15, a.z + hz * 0.6), new THREE.Vector3((a.x + b.x) / 2, LV.GRADE + 0.05, (a.z + b.z) / 2), new THREE.Vector3(b.x + lx * 0.5, LV.GRADE + 1.2, b.z + lz * 0.5), b]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.055, 8, false), boxM); cable.castShadow = true; LAND.add(cable);
  const plug = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.4), boxM); plug.position.copy(b); plug.rotation.y = car.rotation.y; LAND.add(plug);
  const beams = [];
  for (const x of [1, -1]) { const sl = new THREE.SpotLight(0xf2f6ff, 0, 60, 0.45, 0.6, 1.2); sl.position.set(x * 2.2, 2.4, 7.6); sl.target.position.set(x * 2.2, 0, 30); sl.visible = true; car.add(sl, sl.target); beams.push(sl); }
  act(car, { kind: 'car', label: d => d.on ? 'Headlights off' : 'Flash the headlights', run: d => {
    lamp.emissiveIntensity = d.on ? 2.5 : 0; tail.emissiveIntensity = d.on ? 1.2 : 0.15; beams.forEach(sl => { sl.visible = true; sl.intensity = d.on ? 40 : 0; }); } });
  return { car, post, paint, plug, cable, beams, lamp, chargerMeshes: [pole, cap, wb] };
})();

export { LAND, SEASONS, CX, CZ, DRIVE, PATIO_AT, nearDrive, terrainY, groundMat, clearMat, TREES, decid, pines, trunkGeo, canopyGeo, coneGeo, trunks, canopies, twigs, cones, mtx, q, sc, ps, snowParts, fogColor, PLANTS, PATH_BOLLARDS, CAR };
