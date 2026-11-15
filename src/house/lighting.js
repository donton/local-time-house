// Sun, hemisphere & fill lights, RCP architectural fixtures, night lighting rig, and bedtime switch.
import * as THREE from 'three';
import { FT, LV, roofUnder, DINING_CENTER, LITE, DAY, NIGHTSET, DAY_SKY } from '../config/constants.js';
import { state, RT, MODES, FAN, nightRig, LIGHTS_OUT, act, markShadows } from '../core/state.js';
import { MATS, M, lampMat, creamMat, paperMat, trimMat, ribMat, exteriorLightsOnly, setEnvNight } from '../core/materials.js';
import { root, G } from './site-and-floors.js';
import { KIT } from './kitchen.js';
import { renderer, scene } from '../core/renderer.js';

let _outdoorNightHook = null;
export function registerOutdoorNightHook(fn) {
  _outdoorNightHook = fn;
}

const hemi = new THREE.HemisphereLight(0xf4f1ea, 0xd9d1c4, 1.35);   // sky + ground bounce (no direction, so nothing shines through walls)
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3e2, 2.3);
sun.position.set(-9, 22, 14); sun.castShadow = true;
sun.shadow.mapSize.set(LITE ? 1024 : 2048, LITE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: 1, far: 70 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xe8eef5, 0); fill.position.set(14, 10, -12); scene.add(fill);   // off: it cast no shadows

/* Lighting — fixtures placed from the reflected ceiling plans A103.1 (ground) and A103.2 (loft).
   Legend: L1 4" LED deep recessed · L2 4" LED canless recessed, vaulted ceiling · L3 LED tape · L4 5" LED semi-flush ·
   D1 pendant · D4 interior wall sconce · D5 exterior wall sconce · D6 surface-mount directional · F1 ceiling fan/light.
   Positions in plan feet; mounting heights from the ceilings in the model (and the elevations for D5). Each fixture
   is a mesh that glows at night; a smaller set of room lights (below) does the actual illumination. */
const RCP = {
  ground: {
    L1: [[15.5, 12.6], [22.3, 12.6], [15.5, 15.5], [22.3, 15.5],                 // under the loft (kitchen edge + entry)
         [26.6, 2.6], [30.9, 2.6], [26.6, 8.8], [30.9, 8.8], [30.7, 12.2],          // guest bed + closet
         [35.0, 2.2], [35.0, 5.9], [35.0, 9.6],                                     // guest bath
         [26.4, 15.0], [30.8, 15.0], [35.0, 15.0],                                  // corridor
         [41.4, 4.5], [45.6, 4.5], [41.4, 12.5], [45.6, 12.5], [46.6, 9.3]],        // office + closet
    L4: [[5.75, 19.81], [13.2, 19.81], [5.75, 24.06], [13.2, 24.06]],                // sunken living, centered in joist bays on the 8'-10" ceiling
    D6: [[3.75, 3.86], [6.76, 3.86], [9.8, 3.86], [12.81, 3.86], [3.75, 6.61], [12.81, 6.61]],   // kitchen, vaulted
    D1: [DINING_CENTER],                                                            // pendant, centered over the table
    D4: [['x', 23.93, 12.1, 6.0, -1, 'hall'],                                       // entry
         ['x', 38.2, 7.2, 5.8, -1], ['x', 38.2, 10.0, 5.8, -1],                     // guest bath, either side of the mirror
         ['z', 31.1, 16.48, 6.0, -1, 'hall'], ['z', 37.9, 16.48, 6.0, -1, 'hall']], // corridor
    D5: [['x', -0.4, 4.1, 12.4, -1], ['x', -0.4, 12.5, 12.4, -1],                  // west gable (A201: above W07 / W15)
         ['x', 17.43, 20.5, 6.5, +1],                                               // porch, wing east wall
         ['z', 31.1, 17.45, 6.5, +1], ['z', 39.6, 17.45, 6.5, +1],                  // south wall
         ['x', 48.46, 9.3, 6.5, +1]],                                               // east wall by the office
    L3: [[0.71, 11.2]],                                                             // LED tape under the wall cabinets (x range)
  },
  loft: {
    L1: [[27.97, 8.45], [37.03, 8.45], [27.97, 14.05], [37.03, 14.05]],            // primary bedroom, 8'-0" flat ceiling
    F1: [[32.47, 11.25]],
    L2: [[27.41, 2.98], [33.22, 2.98], [38.4, 2.98],                               // MECH + laundry (vaulted, north slope)
         [44.47, 7.22], [44.47, 9.86], [44.47, 12.58]],                            // upstairs bath (vaulted)
    D4: [['z', 20.58, 0.62, LV.LOFT + 0.6, +1, 'hall'], ['x', 23.92, 6.53, 11.8, -1, 'hall'],   // stair: north wall, east stair wall
         ['x', 47.56, 7.19, LV.LOFT + 5.25, -1], ['x', 47.56, 7.19, LV.LOFT + 6.3, -1]],   // upstairs bath: stacked between the mirrors (elev. 3)
  },
};
// ceiling height (top of fixture) at a plan point, per floor
const ceilAt = (floor, x, z) => {
  if (floor === 'loft') return (x > 24.7 && x < 40.86 && z > 3.205) ? LV.LOFT_CEIL : roofUnder(z) - 0.07;
  if (x < 14.52) return z < 16.54 ? roofUnder(z) - 0.07 : 8.83;                   // vaulted kitchen / living ceiling above joists
  return LV.CEIL1;
};

function fixtures() {
  for (const floor of ['ground', 'loft']) {
    const g = G[floor], F = RCP[floor];
    // Fixtures on the sloped roof underside belong to the roof group, so they hide (and explode) with the roof.
    const R = G.mainRoof;
    const disc = (x, z, r, drop, glowR, gg = g) => {
      const top = ceilAt(floor, x, z);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, drop, 20), trimMat); m.position.set(x, top - drop / 2, z); gg.add(m);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(glowR, glowR, 0.02, 20), lampMat); lens.position.set(x, top - drop - 0.005, z); gg.add(lens);
    };
    // Recessed: 4" in the kitchen / dining, 2" everywhere else (owner's selection). Thin black trim + lens.
    const inKitchen = (x, z) => floor === 'ground' && x > 0.51 && x < 16.52 && z > 0.52 && z < 16.54 && !(x > 15 && z > 12);   // the two at the kitchen edge by the foyer are 2" like the other two
    const recessed = (x, z, gg) => inKitchen(x, z) ? disc(x, z, 0.2, 0.03, 0.14, gg) : disc(x, z, 1 / 12, 0.02, 0.06, gg);
    (F.L1 || []).forEach(([x, z]) => recessed(x, z, floor === 'ground' ? G.loft : R));
    (F.L2 || []).forEach(([x, z]) => recessed(x, z, R));
    (F.L4 || []).forEach(([x, z]) => {                                            // brushed-metal cylinder (7.13" H × 5.5" Ø) on wing ceiling
      const top = ceilAt(floor, x, z), r = 5.5 / 24, h = 7.13 / 12, metal = M('steelTop');
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.24, r * 1.24, 0.016, 24), metal); flange.position.set(x, top - 0.008, z); G.wingRoof.add(flange);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), metal); body.position.set(x, top - h / 2, z); G.wingRoof.add(body);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.90, r * 0.90, 0.015, 24), lampMat); lens.position.set(x, top - h - 0.003, z); G.wingRoof.add(lens);
    });
    (F.D6 || []).forEach(([x, z]) => {                                            // directional spot, aimed down
      const top = ceilAt(floor, x, z);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.45, 16), trimMat); can.position.set(x, top - 0.35, z); R.add(can);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), lampMat); lens.position.set(x, top - 0.585, z); R.add(lens);
    });
    (F.D1 || []).forEach(([x, z]) => {                                            // pendant: round paper lantern, 24" Ø
      const top = ceilAt(floor, x, z), r = 1.0, cy = 2.5 + 2.75 + r;               // bottom ≈33" above the table top
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, top - (cy + r), 6), trimMat); cord.position.set(x, (top + cy + r) / 2, z); R.add(cord);
      const lantern = new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), paperMat); lantern.position.set(x, cy, z); lantern.castShadow = true; g.add(lantern);
      for (let k = -3; k <= 3; k++) {                                              // faint wire ribs of a paper lantern
        const rr = Math.sqrt(1 - (k / 4) ** 2) * r;
        const rib = new THREE.Mesh(new THREE.TorusGeometry(rr + 0.003, 0.006, 4, 48), ribMat); rib.rotation.x = Math.PI / 2; rib.position.set(x, cy + (k / 4) * r, z); g.add(rib);
      }
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 16), trimMat); cap.position.set(x, cy + r + 0.03, z); g.add(cap);
    });
    (F.F1 || []).forEach(([x, z]) => {                                            // ceiling fan with light kit (mounted to dormer ceiling)
      const top = ceilAt(floor, x, z);
      const rodM = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), trimMat); rodM.position.set(x, top - 0.3, z); R.add(rodM);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 0.25, 20), trimMat); hub.position.set(x, top - 0.7, z); R.add(hub);
      const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), lampMat); lens.position.set(x, top - 0.84, z); R.add(lens);
      const spin = new THREE.Group(); spin.position.set(x, top - 0.68, z); R.add(spin);
      for (let k = 0; k < 3; k++) {
        const bl = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, 0.4), M('oak'));
        bl.geometry.translate(1.35, 0, 0); bl.rotation.y = k * Math.PI * 2 / 3 + 0.4; bl.castShadow = true; spin.add(bl);
      }
      const fanGrp = new THREE.Group(); R.add(fanGrp); for (const m of [rodM, hub, lens]) { R.remove(m); fanGrp.add(m); }
      R.remove(spin); fanGrp.add(spin);
      const SPEEDS = ['off', 'low', 'medium', 'high'];
      act(fanGrp, { kind: 'fan', step: 0, label: d => 'Fan: ' + SPEEDS[(d.step + 1) % 4], run: d => { d.step = (d.step + 1) % 4; d.on = d.step > 0; FAN.speed = [0, 2.4, 5, 9][d.step]; } });
      FAN.spin = spin;
    });
    (F.L3 || []).forEach(([x0, x1]) => {                                          // tape light along the underside of the wall cabinets
      const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.02, 0.08), lampMat); m.position.set((x0 + x1) / 2, KIT.UP[0] - 0.01, KIT.Z0 + KIT.UPD - 0.25); g.add(m);
    });
    const coneMat = M('frame');
    const sconce = ([axis, x, z, y, n, kind], ext) => {                           // wall sconce: round glowing globe, no visible base
      if (kind === 'hall') {                                                       // hall + stair (owner): cream glass globe on a chrome dome
        // 6.4" H × 6.2" W × 6.2" D overall: 6.2" Ø globe (slightly taller than wide), ~4" chrome canopy at the wall
        const off = d => new THREE.Vector3(x + (axis === 'x' ? n * d : 0), y + 0.05, z + (axis === 'z' ? n * d : 0));
        const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M('chrome'));
        dome.rotation[axis === 'x' ? 'z' : 'x'] = (axis === 'x' ? -n : n) * Math.PI / 2;
        dome.scale.set(1, 0.65, 1); dome.position.copy(off(0)); dome.userData.cutAxis = axis; g.add(dome);
        const globe = new THREE.Mesh(new THREE.SphereGeometry(0.258, 32, 20), creamMat);
        globe.scale.set(1, 1.032, 1); globe.position.copy(off(6.2 / 12 - 0.258)); globe.userData.cutAxis = axis; g.add(globe);
        return;
      }
      const at = (d, dy) => new THREE.Vector3(x + (axis === 'x' ? n * d : 0), y + dy, z + (axis === 'z' ? n * d : 0));
      if (ext) {                                                                   // exterior: black cone downlight on a round plate (owner's selection)
        const tag = m => { m.userData.cutAxis = axis; g.add(m); return m; };
        const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 28), coneMat);
        plate.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2; plate.position.copy(at(0.025, 0.12)); tag(plate);
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 10), coneMat);
        arm.rotation[axis === 'x' ? 'z' : 'x'] = Math.PI / 2; arm.position.copy(at(0.2, 0.12)); tag(arm);
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.78, 36, 1, true), coneMat);   // ~10" Ø × 9" open cone
        shade.material = coneMat; shade.position.copy(at(0.5, 0.0)); shade.castShadow = true; tag(shade);
        const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16), coneMat); capTop.position.copy(at(0.5, 0.4)); tag(capTop);
        const glow = new THREE.Mesh(new THREE.CircleGeometry(0.33, 32), lampMat);   // lit inside of the shade, seen from below
        glow.rotation.x = Math.PI / 2; glow.position.copy(at(0.5, -0.25)); glow.castShadow = false; tag(glow);
        return;
      }
      const r = ext ? 0.29 : 0.25;                                                 // 7" Ø outside, 6" Ø inside
      const off = r - 0.04;                                                        // tucked a hair into the wall so no gap or mount shows
      const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), lampMat);
      globe.position.set(x + (axis === 'x' ? n * off : 0), y + 0.05, z + (axis === 'z' ? n * off : 0)); globe.userData.cutAxis = axis; g.add(globe);
    };
    (F.D4 || []).forEach(f => sconce(f, false));
    (F.D5 || []).forEach(f => sconce(f, true));
  }
}
{
  const n0 = { ground: G.ground.children.length, loft: G.loft.children.length, mainRoof: G.mainRoof.children.length };
  fixtures();
  for (const [k, i0] of Object.entries(n0)) {
    for (let i = i0; i < G[k].children.length; i++) G[k].children[i].traverse(o => { if (o.isMesh) o.userData.phase = 'fixtures'; });
  }
}

/* A 5'-6" figure for scale (from the owner's photo): red tee, wide light-wash jeans, white sneakers, round
   glasses, black tote on his right shoulder. Standing in the laundry in front of the MECH door (203), left of
   the washer + dryer, facing into the room. Stylized, built in feet; exempt from the wall cutaway. */
(function buildFigure() {
  const P = new THREE.Group(); P.name = 'figure';
  const mat = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 });
  const SKIN = mat(0xE6B497), TEE = mat(0xD3302E), DENIM = mat(0x7593B8), SHOE = mat(0xEEEAE3), HAIR = mat(0x7B5230),
        BAG = mat(0x1C1C1E), RIM = new THREE.MeshStandardMaterial({ color: 0x2A1D17, roughness: 0.4 }), PRINT = mat(0xF2E6E4);
  const add = (geo, m, x, y, z, s) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (s) o.scale.set(...s); o.castShadow = true; o.receiveShadow = true; o.userData.nocut = true; o.userData.phase = 'furniture'; P.add(o); return o; };
  // sneakers
  for (const sx of [-0.3, 0.3]) add(new THREE.CapsuleGeometry(0.15, 0.5, 4, 12).rotateX(Math.PI / 2), SHOE, sx, 0.15, 0.12, [1.1, 0.95, 1]);
  // wide straight jeans, pooling slightly at the shoes
  for (const sx of [-0.29, 0.29]) add(new THREE.CylinderGeometry(0.27, 0.31, 2.45, 18), DENIM, sx, 1.45, 0);
  add(new THREE.BoxGeometry(1.12, 0.5, 0.62), DENIM, 0, 2.85, 0);
  // tee: soft rounded torso, tucked
  add(new THREE.CylinderGeometry(0.62, 0.55, 1.55, 24), TEE, 0, 3.78, 0, [1, 1, 0.6]);
  add(new THREE.SphereGeometry(0.62, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), TEE, 0, 4.52, 0, [1, 0.28, 0.6]);
  add(new THREE.PlaneGeometry(0.62, 0.62), PRINT, 0, 3.95, 0.375).material.side = THREE.FrontSide;   // chest graphic
  // arms: short sleeves, bare forearms, hands
  for (const sx of [-1, 1]) {
    add(new THREE.SphereGeometry(0.24, 16, 12), TEE, sx * 0.66, 4.35, 0);
    add(new THREE.CylinderGeometry(0.2, 0.18, 0.6, 14), TEE, sx * 0.72, 4.0, 0);
    add(new THREE.CylinderGeometry(0.13, 0.11, 1.0, 12), SKIN, sx * 0.76, 3.2, 0.03);
    add(new THREE.SphereGeometry(0.14, 12, 10), SKIN, sx * 0.77, 2.65, 0.05, [0.9, 1.15, 0.8]);
  }
  // neck, head, hair
  add(new THREE.CylinderGeometry(0.16, 0.18, 0.32, 14), SKIN, 0, 4.66, 0);
  add(new THREE.SphereGeometry(0.4, 24, 18), SKIN, 0, 5.05, 0.02, [0.92, 1.12, 1]);
  add(new THREE.SphereGeometry(0.43, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), HAIR, 0, 5.08, -0.02, [0.95, 1.05, 1.03]);
  add(new THREE.BoxGeometry(0.78, 0.16, 0.12), HAIR, 0, 5.32, 0.33);                       // swept fringe
  // round glasses
  for (const sx of [-0.15, 0.15]) add(new THREE.TorusGeometry(0.11, 0.022, 8, 24), RIM, sx, 5.08, 0.39);
  add(new THREE.BoxGeometry(0.1, 0.025, 0.025), RIM, 0, 5.1, 0.4);
  // black tote on his right shoulder (his right = local -x), strap over the shoulder
  add(new THREE.BoxGeometry(0.22, 1.15, 1.0), BAG, -0.86, 3.05, 0.05);
  add(new THREE.BoxGeometry(0.05, 0.95, 0.09), BAG, -0.66, 4.05, 0.28).rotation.z = -0.18;
  add(new THREE.BoxGeometry(0.05, 0.95, 0.09), BAG, -0.66, 4.05, -0.18).rotation.z = -0.18;
  P.position.set(31.65, LV.LOFT, 3.95);
  P.rotation.y = Math.PI / 2;                                                       // face east, into the laundry
  G.loft.add(P);
})();

// Recessed downlight zones (SpotLights aimed straight down from the actual ceilings — zero upward spill onto ceilings)
const RECESS_SPOTS = [
  // [group, x, y, z, targetY, candela, angle, dist]
  ['ground', 5.2, 17.5, 5.2, 0, 44, 0.65, 7.5],                                                     // kitchen vaulted recessed cans + island
  ['ground', 12.2, 17.5, 5.2, 0, 36, 0.65, 7.5],                                                    // dining vaulted recessed cans
  ['ground', 19.2, 7.95, 14.0, 0, 16, 0.72, 5.0],                                                   // entry + stair hall
  ['ground', 9.5, 8.78, 19.81, 0, 14, 0.72, 5.2],                                                   // sunken living north pair
  ['ground', 9.5, 8.78, 24.06, 0, 14, 0.72, 5.2],                                                   // sunken living south pair
  ['ground', 28.75, 7.95, 2.6, 0, 12, 0.70, 4.5],                                                   // guest bed north cans (over bed)
  ['ground', 28.75, 7.95, 8.8, 0, 12, 0.70, 4.5],                                                   // guest bed south cans (in front of closet)
  ['ground', 35.0, 7.95, 5.9, 0, 14, 0.72, 4.8],                                                    // guest bath cans
  ['ground', 26.4, 7.95, 15.0, 0, 10, 0.72, 3.8],                                                   // corridor west can
  ['ground', 30.8, 7.95, 15.0, 0, 10, 0.72, 3.8],                                                   // corridor mid can
  ['ground', 35.0, 7.95, 15.0, 0, 10, 0.72, 3.8],                                                   // corridor east can
  ['ground', 43.5, 7.95, 4.5, 0, 12, 0.72, 4.8],                                                    // east office north cans
  ['ground', 43.5, 7.95, 12.5, 0, 12, 0.72, 4.8],                                                   // east office south cans
  ['loft', 28.0, LV.LOFT_CEIL - 0.05, 11.25, LV.LOFT, 14, 0.78, 5.5],                               // loft primary bed west cans
  ['loft', 37.0, LV.LOFT_CEIL - 0.05, 11.25, LV.LOFT, 14, 0.78, 5.5],                               // loft primary bed east cans
  ['loft', 33.2, 16.9, 3.0, LV.LOFT, 14, 0.72, 4.5],                                                // loft laundry & MECH
  ['loft', 44.47, 21.25, 7.22, LV.LOFT, 18, 0.78, 6.2],                                              // upstairs bath north can (vanity)
  ['loft', 44.47, 21.25, 9.86, LV.LOFT, 18, 0.78, 6.2],                                              // upstairs bath mid can
  ['loft', 44.47, 18.52, 12.58, LV.LOFT, 20, 0.78, 5.8],                                             // upstairs bath south can (shower)
];
// Soft indirect bounce + dining paper lantern (kept subtle so mid-room points don't create fake wall/door hotspots)
const NIGHT_LIGHTS = [
  // [group, x, y, z, candela, dist]
  ['ground', DINING_CENTER[0], 6.25, DINING_CENTER[1], 5.5, 5.5],                                   // dining paper lantern (24" globe) + kitchen bounce
  ['ground', 19.2, 4.6, 13.0, 1.6, 4.5],                                                            // entry + stair hall bounce
  ['ground', 9.5, 4.5, 21.5, 2.0, 5.5],                                                             // sunken living bounce
  ['ground', 29.0, 4.5, 6.5, 1.5, 4.8],                                                             // guest bed bounce
  ['ground', 35.8, 4.5, 6.5, 1.4, 4.2],                                                             // guest bath bounce
  ['ground', 43.5, 4.5, 8.5, 1.5, 4.5],                                                             // east office bounce
  ['ground', 46.25, 3.2, 12.65, 1.3, 3.8],                                                          // east office conical desk lamp
  ['loft', 33.0, LV.LOFT + 4.2, 11.2, 1.8, 5.2],                                                    // loft bounce
  ['loft', 44.5, LV.LOFT + 5.2, 9.2, 2.2, 5.5],                                                     // upstairs bath bounce
  ['loft', 46.8, LV.LOFT + 5.78, 7.19, 3.0, 4.2],                                                   // upstairs bath vanity sconces
];
for (const [grp, x, y, z, ty, cd, ang, dist] of RECESS_SPOTS) {
  const L = new THREE.SpotLight(0xffcf96, 0, dist, ang, 0.85, 1.6);
  L.visible = true; L.position.set(x, y, z); L.target.position.set(x, ty, z);
  G[grp].add(L, L.target);
  nightRig.push({ L, cd });
}
for (const [axis, x, z, y, n] of RCP.ground.D5) {                                // exterior sconces light the siding (first in G.ground so indices 0..5 on mobile)
  const L = new THREE.PointLight(0xffc98a, 0, 6, 2); L.visible = true; L.userData.ext = true;
  L.position.set(x + (axis === 'x' ? n * 0.5 : 0), y - 0.5, z + (axis === 'z' ? n * 0.5 : 0)); G.ground.add(L);   // just under the cone's mouth
  L.castShadow = !LITE; L.shadow.autoUpdate = false; L.shadow.needsUpdate = true; L.shadow.mapSize.set(512, 512); L.shadow.bias = -0.002; L.shadow.normalBias = 0.02;   // crisp cone cut-off
  L.shadow.camera.near = 0.03; L.shadow.camera.far = 6;
  nightRig.push({ L, cd: 5 });
}
for (const [grp, x, y, z, cd, dist] of NIGHT_LIGHTS) {
  const L = new THREE.PointLight(0xffcf96, 0, dist, 1.8); L.visible = true; L.position.set(x, y, z); G[grp].add(L);
  nightRig.push({ L, cd });
}
// Outside surfaces take light only from the exterior sconces. Three.js orders shadow-casting lights first
// (and on mobile LITE mode, D5 sconces are the first 6 PointLights in G.ground), so these materials loop
// over just those lights; unshadowed interior PointLights and SpotLights never shine through walls/floors.

for (const n of ['siding', 'sidingWood', 'skirt', 'foundation', 'roof', 'membrane', 'soffit', 'snow', 'concrete', 'deck', 'gravel', 'frame', 'steel', 'ground']) exteriorLightsOnly(MATS[n]);

function applyNight(on) {
  RT.nightOn = on;
  hemi.intensity = on ? NIGHTSET.hemi : DAY.hemi;
  hemi.color.set(on ? NIGHTSET.hemiSky : 0xf4f1ea); hemi.groundColor.set(on ? 0x3d3a35 : 0xd9d1c4);
  if (on) sun.position.set(-9, 22, 14);
  sun.intensity = on ? NIGHTSET.sun : DAY.sun; sun.color.set(on ? NIGHTSET.sunColor : 0xfff3e2);
  fill.intensity = on ? NIGHTSET.fill : DAY.fill;
  renderer.toneMappingExposure = on ? NIGHTSET.exposure : DAY.exposure;
  setEnvNight(on ? 1 : 0);
  for (const { L, cd } of nightRig) { L.intensity = on ? cd * NIGHTSET.dim : 0; L.visible = true; if (on && L.castShadow) L.shadow.needsUpdate = true; }
  if (typeof LIGHTS_OUT !== 'undefined') LIGHTS_OUT.off = false;
  lampMat.emissiveIntensity = on ? 2.6 : 0;
  paperMat.emissiveIntensity = on ? 1.1 : 0;
  creamMat.emissiveIntensity = on ? 1.4 : 0;
  const glass = MATS.glass; if (glass) { glass.emissive.set(0xffc98a); glass.emissiveIntensity = on ? 0.35 : 0; }
  if (_outdoorNightHook) _outdoorNightHook(on);
  applySceneTheme();
}
// Sun by time of day (Andes, NY, roughly an autumn day): rises in the east, peaks ~1 PM in the south, sets west.
function sunTimeLabel(h) { const total = Math.round(h * 60), hh = Math.floor(total / 60) % 24, mm = total % 60; const ap = hh >= 12 ? 'PM' : 'AM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; }
function applySun() {
  if (RT.nightOn) return;
  const h = state.sun, az = (h - 12.5) / 6.5 * (Math.PI / 2);
  const el = Math.max(0.04, (55 * Math.PI / 180) * Math.sin(Math.PI * (h - 5.75) / 13.5));
  const D = 27, c = Math.cos(el);
  sun.position.set(-Math.sin(az) * c * D, Math.sin(el) * D, Math.cos(az) * c * D);
  const k = Math.min(1, Math.sin(el) * 1.6);
  sun.intensity = DAY.sun * (0.25 + 0.75 * k);
  sun.color.setRGB(1, 0.8 + 0.15 * k, 0.62 + 0.27 * k);                               // warm at the ends of the day
  hemi.intensity = DAY.hemi * (0.7 + 0.3 * k);
}

function applySceneTheme() {
  if (RT.nightOn) { scene.background = new THREE.Color(NIGHTSET.bg); if (scene.fog) scene.fog.color.copy(scene.background); return; }
  let s = 'fall'; try { s = state.season; } catch {}
  scene.background = new THREE.Color(DAY_SKY[s] || 0xcedbe6);
  if (scene.fog) scene.fog.color.copy(scene.background);
}

applySceneTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySceneTheme);
new MutationObserver(applySceneTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });


export function lightsOut() {
  if (!state.night) { state.night = true; MODES.applyState(); return; }
  if (LIGHTS_OUT.busy) return;
  LIGHTS_OUT.busy = true; const goingOff = !LIGHTS_OUT.off;
  const order = goingOff ? nightRig.slice() : nightRig.slice().reverse();
  order.forEach(({ L }, i) => setTimeout(() => { L.visible = !goingOff; markShadows(); }, 260 * i));
  setTimeout(() => {
    lampMat.emissiveIntensity = goingOff ? 0 : 2.6; paperMat.emissiveIntensity = goingOff ? 0 : 1.1; creamMat.emissiveIntensity = goingOff ? 0 : 1.4;
    const gl = MATS.glass; if (gl) gl.emissiveIntensity = goingOff ? 0 : 0.35;
    LIGHTS_OUT.off = goingOff; LIGHTS_OUT.busy = false; MODES.updateWalls();
  }, 260 * order.length);
}
MODES.lightsOut = lightsOut;

export { hemi, sun, fill, RCP, ceilAt, fixtures, RECESS_SPOTS, NIGHT_LIGHTS, applyNight, sunTimeLabel, applySun, applySceneTheme };
