// Sun, hemisphere & fill lights, RCP architectural fixtures, night lighting rig, and bedtime switch.
import * as THREE from 'three';
import { FT, LV, roofUnder, DINING_CENTER, LITE, DAY, NIGHTSET, DAY_SKY } from '../config/constants.js';
import { state, RT, MODES, FAN, nightRig, LIGHTS_OUT, act, markShadows, wake, localTimeAndes } from '../core/state.js';
import { MATS, M, lampMat, creamMat, paperMat, trimMat, ribMat, exteriorLightsOnly, setEnvNight } from '../core/materials.js';
import { root, G } from './site-and-floors.js';
import { KIT } from './kitchen.js';
import { renderer, scene } from '../core/renderer.js';

let _outdoorNightHook = null;
export function registerOutdoorNightHook(fn) {
  _outdoorNightHook = fn;
}
const KITCHEN_LIGHT = { mode: 'track', trackGrp: null, trackCableGrp: null, gimbalGrp: null, acts: [] };

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
   D1 pendant · D4 interior wall sconce · D5 exterior wall sconce · T1 suspended U-shaped track rail · F1 ceiling fan/light.
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
    // Suspended U-shaped track rail following the west counter, north counter/range, and east tall oak wall
    T1: {
      y: 9.5,
      xW: 3.55, xE: 13.00, zN: 3.55, zS: 8.75,
      drops: [
        [3.55, 8.65], [3.55, 6.15], [3.55, 3.55],
        [8.275, 3.55],
        [13.00, 3.55], [13.00, 6.15], [13.00, 8.65],
      ],
      heads: [
        { pos: [3.55, 4.15], target: [1.55, 2.9, 4.02] },   // west sink
        { pos: [3.55, 6.20], target: [1.60, 2.9, 6.20] },   // west dishwasher / prep
        { pos: [3.55, 8.20], target: [1.60, 2.9, 8.20] },   // west south drawers
        { pos: [4.85, 3.55], target: [4.85, 3.1, 1.65] },   // north-west counter & oak cubby
        { pos: [8.18, 3.55], target: [8.18, 2.9, 1.65] },   // induction range
        { pos: [10.60, 3.55], target: [10.60, 2.9, 1.65] }, // north-east counter
        { pos: [13.00, 5.05], target: [14.30, 4.0, 5.05] }, // east fridge & north pantry
        { pos: [13.00, 7.85], target: [14.45, 4.0, 7.85] }, // east south pantry & microwave
      ],
    },
    // 2" recessed ceiling gimbals (3000K, 45° beam) — alternate exploration to T1
    D6: [
      { pos: [3.75, 3.86], target: [2.20, 2.9, 3.50] },
      { pos: [6.76, 3.86], target: [6.76, 2.9, 2.20] },
      { pos: [9.80, 3.86], target: [9.50, 2.9, 2.20] },
      { pos: [12.81, 3.86], target: [13.80, 3.5, 3.86] },
      { pos: [3.75, 6.61], target: [2.00, 2.9, 6.61] },
      { pos: [12.81, 6.61], target: [14.00, 3.5, 6.61] },
    ],
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
    if (F.T1 || F.D6) {
      const trackMat = new THREE.MeshStandardMaterial({ color: 0xf4f3ef, roughness: 0.38, metalness: 0.15 });
      trackMat.name = 'porcelain';
      const cableMat = M('chrome');
      const toggleKitchen = () => setKitchenLightMode(KITCHEN_LIGHT.mode === 'track' ? 'gimbal' : 'track');
      const kActDef = () => ({
        kind: 'kitchenLights',
        label: () => KITCHEN_LIGHT.mode === 'track' ? 'Switch to 2" ceiling gimbals' : 'Switch to U-shaped track',
        run: toggleKitchen,
      });

      if (F.T1) {                                                                  // U-shaped suspended track rail + aimed track heads (white)
        const { y, xW, xE, zN, zS, drops, heads } = F.T1, rw = 0.11, rh = 0.13;
        const trackGrp = new THREE.Group(), trackCableGrp = new THREE.Group();
        g.add(trackGrp); R.add(trackCableGrp);
        KITCHEN_LIGHT.trackGrp = trackGrp; KITCHEN_LIGHT.trackCableGrp = trackCableGrp;
        const addPart = (geo, mat, parent = trackGrp) => { const m = new THREE.Mesh(geo, mat); m.userData.nocut = true; parent.add(m); return m; };
        const northBar = addPart(new THREE.BoxGeometry(xE - xW + rw, rh, rw), trackMat);
        northBar.position.set((xW + xE) / 2, y, zN);
        const legLen = zS - (zN + rw / 2), legZ = (zN + rw / 2 + zS) / 2;
        for (const lx of [xW, xE]) {
          const leg = addPart(new THREE.BoxGeometry(rw, rh, legLen), trackMat);
          leg.position.set(lx, y, legZ);
          const cap = addPart(new THREE.BoxGeometry(rw + 0.016, rh + 0.012, 0.03), trackMat);
          cap.position.set(lx, y, zS + 0.015);
        }
        drops.forEach(([dx, dz], idx) => {
          const top = ceilAt(floor, dx, dz), isFeed = idx === 3;                   // center north drop carries the power feed
          const collar = addPart(new THREE.CylinderGeometry(0.025, 0.025, 0.04, 10), trackMat);
          collar.position.set(dx, y + rh / 2 + 0.02, dz);
          const cableTop = top - 0.02, cableBot = y + rh / 2 + 0.04, h = Math.max(0.05, cableTop - cableBot);
          const cable = addPart(new THREE.CylinderGeometry(isFeed ? 0.018 : 0.011, isFeed ? 0.018 : 0.011, h, 8), isFeed ? trackMat : cableMat, trackCableGrp);
          cable.position.set(dx, (cableTop + cableBot) / 2, dz);
          const canopy = addPart(new THREE.CylinderGeometry(isFeed ? 0.14 : 0.075, isFeed ? 0.14 : 0.075, 0.035, 16), trackMat, trackCableGrp);
          canopy.position.set(dx, top - 0.015, dz);
        });
        const yPivot = y - rh / 2 - 0.21;
        heads.forEach(({ pos: [hx, hz], target: [tx, ty, tz] }) => {
          const adapter = addPart(new THREE.BoxGeometry(0.14, 0.07, 0.14), trackMat);
          adapter.position.set(hx, y - rh / 2 - 0.035, hz);
          const stem = addPart(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 10), trackMat);
          stem.position.set(hx, y - rh / 2 - 0.14, hz);
          const headGrp = new THREE.Group();
          headGrp.position.set(hx, yPivot, hz);
          headGrp.lookAt(tx, ty, tz);
          trackGrp.add(headGrp);
          addPart(new THREE.CylinderGeometry(0.11, 0.11, 0.36, 18).rotateX(Math.PI / 2).translate(0, 0, 0.08), trackMat, headGrp);
          addPart(new THREE.CylinderGeometry(0.095, 0.105, 0.05, 16).rotateX(Math.PI / 2).translate(0, 0, -0.12), trackMat, headGrp);
          addPart(new THREE.CylinderGeometry(0.088, 0.088, 0.02, 16).rotateX(Math.PI / 2).translate(0, 0, 0.255), lampMat, headGrp);
        });
        KITCHEN_LIGHT.acts.push(act(trackGrp, kActDef()), act(trackCableGrp, kActDef()));
      }

      if (F.D6) {                                                                  // 2" recessed ceiling gimbals (3000K, 45° beam)
        const gimbalGrp = new THREE.Group();
        gimbalGrp.visible = false;
        R.add(gimbalGrp);
        KITCHEN_LIGHT.gimbalGrp = gimbalGrp;
        F.D6.forEach(({ pos: [x, z], target: [tx, ty, tz] }) => {
          const top = ceilAt(floor, x, z);
          const trim = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 20), trackMat);
          trim.rotation.x = -Math.PI / 4;                                          // flush with 45° north roof slope
          trim.position.set(x, top - 0.005, z);
          gimbalGrp.add(trim);
          const eye = new THREE.Group();
          eye.position.set(x, top - 0.015, z);
          eye.lookAt(tx, ty, tz);
          gimbalGrp.add(eye);
          const baffle = new THREE.Mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.035, 18).rotateX(Math.PI / 2), trimMat);
          eye.add(baffle);
          const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.068, 0.015, 18).rotateX(Math.PI / 2).translate(0, 0, 0.015), lampMat);
          eye.add(lens);
        });
        KITCHEN_LIGHT.acts.push(act(gimbalGrp, kActDef()));
      }
    }
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
// Aimed track spotlights from the U-shaped suspended rail (each head illuminates its counter/cabinet zone)
const TRACK_Y = RCP.ground.T1.y - 0.065 - 0.21;
const TRACK_SPOTS = RCP.ground.T1.heads.map(({ pos: [hx, hz], target: [tx, ty, tz] }) => ({
  pos: [hx, TRACK_Y, hz],
  target: [tx, ty, tz],
  cd: 16,
  angle: 0.54,
  dist: 12.5,
}));
// 2" recessed ceiling gimbals (3000 K, 45° full beam = 22.5° half-angle = Math.PI / 8)
const GIMBAL_SPOTS = RCP.ground.D6.map(({ pos: [x, z], target: [tx, ty, tz] }) => ({
  pos: [x, ceilAt('ground', x, z) - 0.05, z],
  target: [tx, ty, tz],
  cd: 52,
  angle: Math.PI / 8,
  dist: 26,
}));
// Soft indirect bounce + dining paper lantern (kept subtle so mid-room points don't create fake wall/door hotspots)
const NIGHT_LIGHTS = [
  // [group, x, y, z, candela, dist]
  ['ground', DINING_CENTER[0], 6.25, DINING_CENTER[1], 5.5, 5.5],                                   // dining paper lantern (24" globe) + kitchen bounce
  ['ground', 4.5, 5.15, 1.45, 1.1, 3.2],                                                            // L3 under-cabinet LED tape (west)
  ['ground', 8.2, 5.15, 1.45, 1.1, 3.2],                                                            // L3 under-cabinet LED tape (range/east)
  ['ground', 8.2, 11.2, 5.5, 2.2, 9.0],                                                             // kitchen vaulted ceiling indirect bounce
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
for (const { pos: [x, y, z], target: [tx, ty, tz], cd, angle, dist } of TRACK_SPOTS) {
  const L = new THREE.SpotLight(0xffd2a1, 0, dist, angle, 0.80, 1.5);
  L.visible = true; L.position.set(x, y, z); L.target.position.set(tx, ty, tz);
  G.ground.add(L, L.target);
  nightRig.push({ L, cd, mode: 'track' });
}
for (const { pos: [x, y, z], target: [tx, ty, tz], cd, angle, dist } of GIMBAL_SPOTS) {
  const L = new THREE.SpotLight(0xffd9b3, 0, dist, angle, 0.72, 1.5);             // 3000 K, 45° beam
  L.visible = false; L.position.set(x, y, z); L.target.position.set(tx, ty, tz);
  G.ground.add(L, L.target);
  nightRig.push({ L, cd, mode: 'gimbal' });
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

function setKitchenLightMode(mode) {
  KITCHEN_LIGHT.mode = mode === 'gimbal' ? 'gimbal' : 'track';
  const isTrack = KITCHEN_LIGHT.mode === 'track';
  if (KITCHEN_LIGHT.trackGrp) KITCHEN_LIGHT.trackGrp.visible = isTrack;
  if (KITCHEN_LIGHT.trackCableGrp) KITCHEN_LIGHT.trackCableGrp.visible = isTrack;
  if (KITCHEN_LIGHT.gimbalGrp) KITCHEN_LIGHT.gimbalGrp.visible = !isTrack;
  for (const a of KITCHEN_LIGHT.acts) a.on = !isTrack;
  const lit = RT.nightOn && !(typeof LIGHTS_OUT !== 'undefined' && LIGHTS_OUT.off);
  for (const item of nightRig) {
    if (!item.mode) continue;
    const active = item.mode === KITCHEN_LIGHT.mode;
    item.L.visible = active;
    item.L.intensity = (lit && active) ? item.cd * NIGHTSET.dim : 0;
  }
  markShadows();
  wake();
}

function applyNight(on) {
  RT.nightOn = on;
  hemi.intensity = on ? NIGHTSET.hemi : DAY.hemi;
  hemi.color.set(on ? NIGHTSET.hemiSky : 0xf4f1ea); hemi.groundColor.set(on ? 0x3d3a35 : 0xd9d1c4);
  if (on) sun.position.set(-9, 22, 14);
  sun.intensity = on ? NIGHTSET.sun : DAY.sun; sun.color.set(on ? NIGHTSET.sunColor : 0xfff3e2);
  fill.intensity = on ? NIGHTSET.fill : DAY.fill;
  renderer.toneMappingExposure = on ? NIGHTSET.exposure : DAY.exposure;
  setEnvNight(on ? 1 : 0);
  for (const item of nightRig) {
    const active = !item.mode || item.mode === KITCHEN_LIGHT.mode;
    item.L.intensity = (on && active) ? item.cd * NIGHTSET.dim : 0;
    item.L.visible = active;
    if (on && active && item.L.castShadow) item.L.shadow.needsUpdate = true;
  }
  if (typeof LIGHTS_OUT !== 'undefined') LIGHTS_OUT.off = false;
  lampMat.emissiveIntensity = on ? 2.6 : 0;
  paperMat.emissiveIntensity = on ? 1.1 : 0;
  creamMat.emissiveIntensity = on ? 1.4 : 0;
  const glass = MATS.glass; if (glass) { glass.emissive.set(0xffc98a); glass.emissiveIntensity = on ? 0.35 : 0; }
  if (_outdoorNightHook) _outdoorNightHook(on);
  applySceneTheme();
}
// True astronomical sun path for Andes, NY (42.19°N, 74.78°W): rises E/NE/SE, peaks S, sets W/NW/SW.
const _SEASON_DOY = { winter: 15, spring: 105, summer: 196, fall: 288 };
function sunTimeLabel(h) { const total = Math.round(h * 60), hh = Math.floor(total / 60) % 24, mm = total % 60; const ap = hh >= 12 ? 'PM' : 'AM'; return `${((hh + 11) % 12) + 1}:${String(mm).padStart(2, '0')} ${ap}`; }
const WX_ATMO = {
  clear:      { sunMul: 1.00, hemiMul: 1.00, skyLerp: 0.00, skyTarget: 0xbac3ca, fogNear: 180, fogFar: 900 },
  clearNight: { sunMul: 1.00, hemiMul: 1.00, skyLerp: 0.00, skyTarget: 0x161c24, fogNear: 180, fogFar: 900 },
  partly:     { sunMul: 0.68, hemiMul: 1.15, skyLerp: 0.25, skyTarget: 0xc2cbd2, fogNear: 170, fogFar: 820 },
  overcast:   { sunMul: 0.06, hemiMul: 1.42, skyLerp: 0.62, skyTarget: 0xb4bcc2, fogNear: 120, fogFar: 580 },
  fog:        { sunMul: 0.04, hemiMul: 1.45, skyLerp: 0.75, skyTarget: 0xc8cecf, fogNear: 45,  fogFar: 260 },
  rain:       { sunMul: 0.05, hemiMul: 1.35, skyLerp: 0.72, skyTarget: 0x9aa4ae, fogNear: 80,  fogFar: 420 },
  snow:       { sunMul: 0.08, hemiMul: 1.48, skyLerp: 0.55, skyTarget: 0xcfd6dc, fogNear: 95,  fogFar: 480 },
  storm:      { sunMul: 0.03, hemiMul: 1.12, skyLerp: 0.85, skyTarget: 0x737d87, fogNear: 60,  fogFar: 340 },
};
const _liveAtmo = () => (RT.liveTime && RT.andesWx && WX_ATMO[RT.andesWx.key]) || WX_ATMO.clear;

const SITE_NORTH_DEG = 23.7; // Crescent Hill runs ~66.3° ENE; house front (+Z) faces ~156.3° SSE (23.7° E of True South)
function applySun() {
  if (RT.nightOn) { sun.castShadow = true; return; }
  const lt = RT.liveTime ? localTimeAndes() : null;
  const doy = lt ? lt.doy : (_SEASON_DOY[state.season] ?? 288);
  const isDST = lt ? lt.isDST : state.season !== 'winter';
  const lat = 42.19 * Math.PI / 180, B = 2 * Math.PI * (doy - 81) / 365;
  const dec = 23.44 * Math.PI / 180 * Math.sin(B);
  const eotMin = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
  const solarNoon = lt ? lt.solarNoon : ((isDST ? 13.0 : 12.0) - 0.88 / 60 - eotMin / 60);
  const H = (state.sun - solarNoon) * (Math.PI / 12);
  let sx = -Math.cos(dec) * Math.sin(H);
  const syRaw = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(H);
  let sz = Math.sin(lat) * Math.cos(dec) * Math.cos(H) - Math.cos(lat) * Math.sin(dec);
  if (SITE_NORTH_DEG) {
    const r = SITE_NORTH_DEG * Math.PI / 180, cr = Math.cos(r), sr = Math.sin(r);
    [sx, sz] = [sx * cr - sz * sr, sx * sr + sz * cr];
  }
  const elRaw = Math.asin(Math.max(-1, Math.min(1, syRaw))), el = Math.max(0.01, elRaw);
  const hLen = Math.hypot(sx, sz) || 1, c = Math.cos(el), D = 27;
  sun.position.set((sx / hLen) * c * D, Math.sin(el) * D, (sz / hLen) * c * D);
  const twi = Math.max(0, Math.min(1, (elRaw + 0.04) / 0.14));
  const k = Math.min(1, Math.sin(el) * 1.6), atmo = _liveAtmo();
  sun.intensity = DAY.sun * (0.20 + 0.80 * k) * twi * atmo.sunMul;
  sun.castShadow = atmo.sunMul > 0.25 && twi > 0.1;
  sun.color.setRGB(1, 0.72 + 0.23 * k, 0.48 + 0.41 * k);                               // richer golden-hour warmth near horizon
  hemi.intensity = DAY.hemi * (0.55 + 0.45 * k) * (0.4 + 0.6 * twi) * atmo.hemiMul;
}

function applySceneTheme() {
  const atmo = _liveAtmo();
  if (scene.fog) { scene.fog.near = atmo.fogNear; scene.fog.far = atmo.fogFar; }
  if (RT.nightOn) { scene.background = new THREE.Color(NIGHTSET.bg); if (scene.fog) scene.fog.color.copy(scene.background); return; }
  let s = 'fall'; try { s = state.season; } catch {}
  const bg = new THREE.Color(DAY_SKY[s] || 0xcedbe6);
  if (atmo.skyLerp > 0) bg.lerp(new THREE.Color(atmo.skyTarget), atmo.skyLerp);
  scene.background = bg;
  if (scene.fog) scene.fog.color.copy(scene.background);
}

applySceneTheme();
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applySceneTheme);
new MutationObserver(applySceneTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });


export function lightsOut() {
  if (!state.night) { state.night = true; MODES.applyState(); return; }
  if (LIGHTS_OUT.busy) return;
  LIGHTS_OUT.busy = true; const goingOff = !LIGHTS_OUT.off;
  const activeRig = nightRig.filter(item => !item.mode || item.mode === KITCHEN_LIGHT.mode);
  const order = goingOff ? activeRig : activeRig.slice().reverse();
  order.forEach(({ L }, i) => setTimeout(() => { L.visible = !goingOff; markShadows(); }, 260 * i));
  setTimeout(() => {
    lampMat.emissiveIntensity = goingOff ? 0 : 2.6; paperMat.emissiveIntensity = goingOff ? 0 : 1.1; creamMat.emissiveIntensity = goingOff ? 0 : 1.4;
    const gl = MATS.glass; if (gl) gl.emissiveIntensity = goingOff ? 0 : 0.35;
    LIGHTS_OUT.off = goingOff; LIGHTS_OUT.busy = false; MODES.updateWalls();
  }, 260 * order.length);
}
MODES.lightsOut = lightsOut;

export { hemi, sun, fill, RCP, ceilAt, fixtures, RECESS_SPOTS, TRACK_SPOTS, GIMBAL_SPOTS, NIGHT_LIGHTS, setKitchenLightMode, applyNight, sunTimeLabel, applySun, applySceneTheme };
