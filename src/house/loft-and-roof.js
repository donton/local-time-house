// Loft walls & rooms, upstairs bath, standing-seam metal roof, skylights, and flat wing roof.
import * as THREE from 'three';
import { FT, LV, EXT, roofTop, roofUnder, loftWallTop } from '../config/constants.js';
import { state, RT, CUT, WALK, BD, TL, TOUR, FX_SHOWERS, tweenTo, act, markShadows, wake } from '../core/state.js';
import { BATH_MIRROR } from '../core/materials.js';
import { addGeo, box, cyl, prism, slopedSlab, SIDING_T, ST, extWall, LAP_N, LAP_S, intWall, glazing, doorLeaf, pocketDoor, pivotFrom, addMirror, withCutAxis, rod } from '../core/builder.js';
import { G, buildSite, buildFloors } from './site-and-floors.js';
import { buildGround, bedSized } from './ground-floor.js';

/* ---------- 5d. Loft walls, openings, fixtures ---------- */
function buildLoft(g) {
  const Y = [LV.LOFT, LV.PLATE];
  extWall(g, 'x', [-0.34, 48.4], EXT.N, -1, Y, [[11.41, 14.42, 0, 11], [17.24, 20.24, 5, 11]], { trim: [ST, ST] });
  extWall(g, 'z', [0.52, 16.54], EXT.W, -1, Y, [[2.61, 5.61, 3, 11], [11.95, 16.2, 0, 11]], { lap: [LAP_N, LAP_S] });
  extWall(g, 'z', [0.52, 16.54], EXT.E, +1, Y, [], { lap: [LAP_N, LAP_S] });
  // South wall: knee walls to the plate, dormer face to 17'-9" with W10 | W11 | W10
  extWall(g, 'x', [-0.34, LV.DORMER_X[0]], EXT.S, +1, Y, [], { trim: [ST, 0] });
  extWall(g, 'x', [LV.DORMER_X[1], 48.4], EXT.S, +1, Y, [], { trim: [0, ST] });
  // fill between the wall plate and the sloped ceiling along both eaves (inside face meets the ceiling)
  // (held inside the gable siding at both ends so the chalk never shares a face with the siding)
  prism(g, 'z', [[EXT.N[0], LV.PLATE], [EXT.N[1], LV.PLATE], [EXT.N[1], roofUnder(EXT.N[1]) + 0.01]], [-0.34 + ST, 48.4 - ST], 'chalk');
  for (const xs of [[-0.34 + ST, LV.DORMER_X[0]], [LV.DORMER_X[1], 48.4 - ST]])
    prism(g, 'z', [[EXT.S[0], LV.PLATE], [EXT.S[1], LV.PLATE], [EXT.S[0], roofUnder(EXT.S[0]) + 0.01]], xs, 'chalk');
  // siding carried up from the plate to the roof underside on the outer face, so the chalk fill never shows outside
  const nO = EXT.N[0], sO = EXT.S[1];
  // (the band runs 0.4' up into the roof slab, where it is hidden, so no sliver of the fill shows under the eave)
  prism(g, 'z', [[nO, LV.PLATE], [nO + ST, LV.PLATE], [nO + ST, roofUnder(nO + ST) + 0.4], [nO, roofUnder(nO) + 0.4]], [-0.34 + ST, 48.4 - ST], 'siding');
  for (const xs of [[-0.34 + ST, LV.DORMER_X[0]], [LV.DORMER_X[1], 48.4 - ST]])
    prism(g, 'z', [[sO - ST, LV.PLATE], [sO, LV.PLATE], [sO, roofUnder(sO) + 0.4], [sO - ST, roofUnder(sO - ST) + 0.4]], xs, 'siding');
  const dormerHoles = [[24.95, 27.95, 11.33, 17.33], [28.98, 36.49, 11.33, 17.33], [37.52, 40.52, 11.33, 17.33]];
  extWall(g, 'x', LV.DORMER_X, EXT.S, +1, [LV.LOFT, LV.DORMER_WALL_TOP], dormerHoles);
  glazing(g, 'x', EXT.S, +1, [24.95, 27.95], [11.33, 17.33]);   // W10
  glazing(g, 'x', EXT.S, +1, [28.98, 36.49], [11.33, 17.33]);   // W11
  glazing(g, 'x', EXT.S, +1, [37.52, 40.52], [11.33, 17.33]);   // W10
  // upper halves of the tall units that start on the ground floor
  const clipL = { clip: [LV.LOFT, 99] };
  glazing(g, 'x', EXT.N, -1, [17.24, 20.24], [5, 11], clipL);                       // W12
  glazing(g, 'x', EXT.N, -1, [11.41, 14.42], [0, 11], { h: [3, 8], ...clipL });   // W06 upper pane
  glazing(g, 'z', EXT.W, -1, [2.61, 5.61], [3, 11], { h: [8], ...clipL });         // W07
  glazing(g, 'z', EXT.W, -1, [11.95, 16.2], [8, 11], { ...clipL, trim: { bottom: false } }); // W15 (part above the loft floor)

  // Guards and screens around the open-to-below and the stair
  // Strip between the open-to-below and the stair, above the fridge + tall cabinets (x 14.52–17.1, z 0.52–10.45):
  // one solid 3'-6" block with a flat top — no trough between the kitchen guard and the stair half wall.
  box(g, [14.52, 17.1], [LV.LOFT, LV.LOFT + 3.5], [0.52, 10.45], 'chalk', { room: 'loft' });
  // Open-to-below guard south of it, along the loft: solid half wall, 3'-6" (matching the adjacent half wall)
  box(g, [14.52, 14.82], [LV.LOFT, LV.LOFT + 3.5], [10.45, 16.54], 'chalk', { room: 'loft' });
  // Stair opening, south edge: freestanding 2x4 wood-stud screen, 3'-6" (keynote 31; A301 section 1)
  for (let x = 17.1; x < 20.15; x += 0.42) box(g, [x, x + 0.13], [LV.LOFT, LV.LOFT + 3.5], [10.45, 10.74], 'millwork', { room: 'loft' });
  box(g, [17.1, 20.24], [LV.LOFT + 3.5, LV.LOFT + 3.62], [10.45, 10.74], 'millwork', { room: 'loft' });
  box(g, [14.95, 16.92], [LV.LOFT + 2.42, LV.LOFT + 2.58], [10.45, 16.54], 'millwork', { room: 'loft' }); // floating desk 6'-1", top 2'-7" (A401.1 elev. 7)
  // two 3'-7" wardrobes, 2'-5" tall, under the knee wall (A401.1 elev. 6, keynote 30)
  box(g, [16.92, 20.5], [LV.LOFT, LV.LOFT + 2.42], [14.52, 16.54], 'millwork', { room: 'loft' });
  box(g, [20.54, 24.12], [LV.LOFT, LV.LOFT + 2.42], [14.52, 16.54], 'millwork', { room: 'loft' });

  // Interior partitions follow the roof underside, capped at the 8'-0" dormer ceiling
  const top = z => loftWallTop(z);
  const inDormer = x => x >= LV.DORMER_X[0] && x <= LV.DORMER_X[1];
  const topDormer = z => z > LV.RIDGE_Z ? LV.LOFT_CEIL : loftWallTop(z);   // flat 8'-0" ceiling under the shed dormer
  const topDormerFull = z => z > LV.RIDGE_Z ? Math.max(LV.LOFT_CEIL, roofUnder(z)) : roofUnder(z);
  const P = (axis, u, t, holes = [], fullRoof = false, target = g) => {
    const y1 = axis === 'x'
      ? Math.min(fullRoof ? LV.RIDGE : LV.LOFT_CEIL, roofUnder(t[0]), roofUnder(t[1]))
      : (fullRoof ? LV.RIDGE : LV.LOFT_CEIL);
    const topFn = axis === 'z' ? (fullRoof ? topDormerFull : (inDormer(t[0]) ? topDormer : top)) : undefined;
    intWall(target, axis, u, t, [LV.LOFT, y1], holes, { top: topFn });
  };
  P('z', [0.52, 16.54], [24.16, 24.7], [[10.88, 13.71, LV.LOFT, LV.LOFT + 7]], true);   // stair/loft | bedroom, door 201 (full height to vaulted ceiling)
  P('x', [24.7, 40.86], [5.42, 5.97], [[37.61, 40.61, LV.LOFT, LV.LOFT + 8]], true);   // MECH+closet | bedroom (full height to sloped roof)
  P('z', [0.52, 16.54], [40.86, 41.4], [[6.05, 9.05, LV.LOFT, LV.LOFT + 8]], true);    // bedroom+closet | bath (full height to sloped roof)
  P('x', [41.4, 47.56], [1.44, 1.94]);                                                  // bath | north storage
  P('x', [41.4, 47.56], [15.21, 15.71]);                                                // bath | south storage
  doorLeaf(g, { axis: 'z', u: [10.88, 13.71], face: 24.7, swing: +1, hinge: 'a', y0: LV.LOFT, h: 7, open: 165, wt: 0.54 });  // 201
  pocketDoor(g, { axis: 'x', u: [37.61, 40.61], c: 5.695, t: 0.55, y0: LV.LOFT, h: 8, slide: -1, open: true });                          // 202 pocket (closet | bedroom)
  pocketDoor(g, { axis: 'z', u: [6.05, 9.05], c: 41.13, t: 0.54, y0: LV.LOFT, h: 8, slide: 1, open: true });                             // 204 pocket (bedroom | bath)

  // MECH (west, revised): hot water heater (keynote 28)
  RT.NOCUT = true;
  cyl(g, [26.0, 1.9], [LV.LOFT, LV.LOFT + 4.8], 0.95, 'porcelain', { room: 'mech' });

  // Toggleable laundry/closet options: stacked (default) vs. previous horizontal
  const stackedOpt = new THREE.Group(); stackedOpt.name = 'laundryStacked'; g.add(stackedOpt);
  const horizOpt = new THREE.Group(); horizOpt.name = 'laundryHoriz'; horizOpt.visible = false; g.add(horizOpt);

  // --- Option A: Stacked W/D on MECH wall + hidden Door 203 + full-width hanging storage ---
  RT.NOCUT = false;
  P('z', [0.52, 5.42], [30.23, 30.77], [[0.72, 3.02, LV.LOFT, LV.LOFT + 5]], true, stackedOpt);
  doorLeaf(stackedOpt, { axis: 'z', u: [0.72, 3.02], face: 30.77 - 0.146, swing: +1, hinge: 'a', y0: LV.LOFT, h: 5, open: 0, mat: 'chalk', wt: 0 });
  withCutAxis('x', () => {
    const y0 = LV.LOFT, y1 = y0 + 5, lin = 0.025, cw = 0.2;
    box(stackedOpt, [30.23, 30.624], [y0, y1], [0.72, 0.72 + lin], 'windowTrim');
    box(stackedOpt, [30.23, 30.624], [y0, y1], [3.02 - lin, 3.02], 'windowTrim');
    box(stackedOpt, [30.23, 30.624], [y1 - lin, y1], [0.72, 3.02], 'windowTrim');
    box(stackedOpt, [30.19, 30.23], [y0, y1 + cw], [0.72 - cw, 0.72], 'windowTrim');
    box(stackedOpt, [30.19, 30.23], [y0, y1 + cw], [3.02, 3.02 + cw], 'windowTrim');
    box(stackedOpt, [30.19, 30.23], [y1, y1 + cw], [0.72, 3.02], 'windowTrim');
  });
  RT.NOCUT = true;
  // Compact captain's ladder in MECH next to the west wall (steeper to take up minimal floor space)
  {
    const R = { room: 'mech' }, y0 = LV.LOFT, y1 = LV.LOFT_CEIL + 0.15, z0 = 4.10, z1 = 5.35;
    for (const lx of [24.85, 26.05]) {
      rod(stackedOpt, [lx, y0, z0], [lx, y1, z1], 0.05, 'oak', R);
    }
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const f = i / (steps + 1);
      const sy = y0 + (y1 - y0) * f, sz = z0 + (z1 - z0) * f;
      box(stackedOpt, [24.90, 26.00], [sy - 0.035, sy + 0.035], [sz - 0.14, sz + 0.14], 'oak', R);
    }
    rod(stackedOpt, [26.10, y0 + 2.4, z0 + 0.25], [26.10, y1 + 1.0, z1 - 0.05], 0.03, 'chrome', R);
    // Closed attic hatch panel on the MECH face of the wall above the ladder
    box(stackedOpt, [24.80, 26.50], [LV.LOFT_CEIL + 0.15, 19.35], [5.38, 5.42], 'windowTrim', R);
    box(stackedOpt, [24.88, 26.42], [LV.LOFT_CEIL + 0.23, 19.27], [5.36, 5.40], 'chalk', R);
  }
  const addStackedLaundry = (y0, label, hingeDir, clothMat) => {
    const z0 = 3.15, z1 = 5.40, cz = (z0 + z1) / 2, cy = y0 + 1.4, R = { room: 'laundry' };
    box(stackedOpt, [30.79, 33.24], [y0, y0 + 3.15], [z0, z1], 'porcelain', R);
    box(stackedOpt, [33.24, 33.28], [y0 + 2.68, y0 + 3.08], [z0 + 0.08, z1 - 0.08], 'steel', R);
    box(stackedOpt, [33.28, 33.30], [y0 + 2.78, y0 + 2.98], [cz - 0.35, cz + 0.15], 'frame', R);
    addGeo(stackedOpt, new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16).rotateZ(Math.PI / 2).translate(33.30, y0 + 2.88, z1 - 0.35), 'chrome', R);
    addGeo(stackedOpt, new THREE.CylinderGeometry(0.68, 0.68, 0.06, 24).rotateZ(Math.PI / 2).translate(33.22, cy, cz), 'frame', R);
    addGeo(stackedOpt, new THREE.CylinderGeometry(0.56, 0.56, 0.05, 24).rotateZ(Math.PI / 2).translate(33.24, cy, cz), 'steel', R);
    if (clothMat) box(stackedOpt, [33.14, 33.25], [cy - 0.48, cy - 0.14], [cz - 0.30, cz + 0.32], clothMat, R);
    const n0 = stackedOpt.children.length;
    addGeo(stackedOpt, new THREE.TorusGeometry(0.68, 0.06, 10, 28).rotateY(Math.PI / 2).translate(33.29, cy, cz), 'chrome', R);
    addGeo(stackedOpt, new THREE.CylinderGeometry(0.63, 0.63, 0.04, 24).rotateZ(Math.PI / 2).translate(33.29, cy, cz), 'glass', { ...R, cast: false });
    const hz = hingeDir < 0 ? cz - 0.72 : cz + 0.72;
    const pv = pivotFrom(stackedOpt, n0, 33.29, cy, hz);
    act(pv, { kind: 'laundry', label: d => d.on ? 'Close ' + label : 'Open ' + label, run: d => tweenTo(pv.rotation, 'y', d.on ? -hingeDir * 1.55 : 0, 0.7) });
  };
  addStackedLaundry(LV.LOFT, 'washer', -1, 'nautical');
  addStackedLaundry(LV.LOFT + 3.18, 'dryer', -1, 'fabric');
  {
    const R = { room: 'laundry' }, y = LV.LOFT;
    box(stackedOpt, [30.85, 40.78], [y + 5.15, y + 5.23], [0.52, 2.12], 'millwork', R);
    for (const bx of [30.85, 35.80, 40.70]) {
      box(stackedOpt, [bx, bx + 0.08], [y + 4.72, y + 5.15], [0.52, 2.08], 'millwork', R);
    }
    addGeo(stackedOpt, new THREE.CylinderGeometry(0.04, 0.04, 9.93, 12).rotateZ(Math.PI / 2).translate(35.815, y + 4.80, 1.48), 'chrome', R);
    const hangMats = ['nautical', 'fabric', 'chalk', 'siding', 'nautical', 'fabric', 'chalk', 'nautical', 'fabric', 'siding', 'chalk', 'nautical', 'fabric', 'chalk', 'nautical', 'fabric', 'siding', 'chalk', 'nautical'];
    for (let i = 0; i < hangMats.length; i++) {
      const hx = 31.35 + i * 0.50;
      box(stackedOpt, [hx - 0.14, hx + 0.14], [y + 2.55, y + 4.68], [1.18, 1.78], hangMats[i], { ...R, cast: false });
    }
    // Freestanding bench / shoe rack under the right half of the hanging rod (clear of MECH door)
    box(stackedOpt, [37.0, 40.5], [y + 1.25, y + 1.35], [0.90, 2.05], 'oak', { ...R, cast: false });
    box(stackedOpt, [37.0, 40.5], [y + 0.40, y + 0.48], [0.95, 2.00], 'oak', { ...R, cast: false });
    for (const lx of [37.05, 40.37]) {
      box(stackedOpt, [lx, lx + 0.08], [y, y + 1.25], [0.95, 2.00], 'oak', { ...R, cast: false });
    }
    // Simple wood hook rail on the tall south wall (keeps the stacked W/D clearance completely open)
    box(stackedOpt, [34.2, 37.2], [y + 4.85, y + 5.15], [5.34, 5.42], 'oak', { ...R, cast: false });
    for (const hx of [34.6, 35.4, 36.2, 36.8]) {
      box(stackedOpt, [hx - 0.03, hx + 0.03], [y + 4.95, y + 5.05], [5.22, 5.34], 'chrome', { ...R, cast: false });
    }
    // Simple wood hook rail on the east wall
    box(stackedOpt, [40.78, 40.86], [y + 4.85, y + 5.15], [2.50, 4.50], 'oak', { ...R, cast: false });
    for (const hz of [2.75, 3.25, 3.75, 4.25]) {
      box(stackedOpt, [40.66, 40.78], [y + 4.95, y + 5.05], [hz - 0.03, hz + 0.03], 'chrome', { ...R, cast: false });
    }
  }
  const stackedAnchor = new THREE.Object3D();
  stackedAnchor.position.set(32.0, LV.LOFT + 7.2, 4.275);
  stackedOpt.add(stackedAnchor);
  const stackedTarget = new THREE.Object3D();
  stackedTarget.position.set(32.0, LV.LOFT + 3.2, 4.275);
  stackedOpt.add(stackedTarget);

  // --- Option B: Previous horizontal side-by-side W/D on north wall + Door 203 on south side ---
  RT.NOCUT = false;
  P('z', [0.52, 5.42], [30.23, 30.77], [[2.3, 5.42, LV.LOFT, LV.LOFT + 5]], true, horizOpt);
  doorLeaf(horizOpt, { axis: 'z', u: [2.3, 5.42], face: 30.77, swing: +1, hinge: 'b', y0: LV.LOFT, h: 5, open: 0, wt: 0.54 });
  RT.NOCUT = true;
  box(horizOpt, [28.0, 30.1], [LV.LOFT, LV.LOFT + 2.2], [0.6, 2.4], 'appliance', { room: 'mech' });
  const addHorizLaundry = (x0, x1, label, hingeDir, clothMat) => {
    const cx = (x0 + x1) / 2, cy = LV.LOFT + 1.4, y0 = LV.LOFT, R = { room: 'laundry' };
    box(horizOpt, [x0, x1], [y0, y0 + 3.2], [0.6, 3.04], 'porcelain', R);
    box(horizOpt, [x0 + 0.08, x1 - 0.08], [y0 + 2.72, y0 + 3.12], [3.04, 3.08], 'steel', R);
    box(horizOpt, [cx - 0.35, cx + 0.15], [y0 + 2.82, y0 + 3.02], [3.08, 3.10], 'frame', R);
    addGeo(horizOpt, new THREE.CylinderGeometry(0.11, 0.11, 0.08, 16).rotateX(Math.PI / 2).translate(x1 - 0.35, y0 + 2.92, 3.10), 'chrome', R);
    addGeo(horizOpt, new THREE.CylinderGeometry(0.68, 0.68, 0.06, 24).rotateX(Math.PI / 2).translate(cx, cy, 3.02), 'frame', R);
    addGeo(horizOpt, new THREE.CylinderGeometry(0.56, 0.56, 0.05, 24).rotateX(Math.PI / 2).translate(cx, cy, 3.04), 'steel', R);
    if (clothMat) box(horizOpt, [cx - 0.32, cx + 0.30], [cy - 0.48, cy - 0.14], [2.95, 3.05], clothMat, R);
    const n0 = horizOpt.children.length;
    addGeo(horizOpt, new THREE.TorusGeometry(0.68, 0.06, 10, 28).translate(cx, cy, 3.09), 'chrome', R);
    addGeo(horizOpt, new THREE.CylinderGeometry(0.63, 0.63, 0.04, 24).rotateX(Math.PI / 2).translate(cx, cy, 3.09), 'glass', { ...R, cast: false });
    const hx = hingeDir < 0 ? cx - 0.72 : cx + 0.72;
    const pv = pivotFrom(horizOpt, n0, hx, cy, 3.09);
    act(pv, { kind: 'laundry', label: d => d.on ? 'Close ' + label : 'Open ' + label, run: d => tweenTo(pv.rotation, 'y', d.on ? hingeDir * 1.55 : 0, 0.7) });
  };
  addHorizLaundry(36.0, 38.35, 'washer', -1, 'nautical');
  addHorizLaundry(38.45, 40.8, 'dryer', +1, 'fabric');
  box(horizOpt, [35.8, 40.86], [LV.LOFT + 3.2, LV.LOFT + 3.3], [0.55, 3.15], 'millwork', { room: 'laundry' });
  {
    const R = { room: 'laundry' }, y = LV.LOFT;
    box(horizOpt, [30.85, 35.75], [y + 5.15, y + 5.23], [0.52, 2.12], 'millwork', R);
    for (const bx of [30.85, 33.26, 35.67]) {
      box(horizOpt, [bx, bx + 0.08], [y + 4.72, y + 5.15], [0.52, 2.08], 'millwork', R);
    }
    addGeo(horizOpt, new THREE.CylinderGeometry(0.04, 0.04, 4.90, 12).rotateZ(Math.PI / 2).translate(33.30, y + 4.80, 1.48), 'chrome', R);
    const hangMats = ['nautical', 'fabric', 'chalk', 'siding', 'nautical', 'fabric', 'chalk', 'nautical', 'fabric'];
    for (let i = 0; i < hangMats.length; i++) {
      const hx = 31.30 + i * 0.50;
      box(horizOpt, [hx - 0.14, hx + 0.14], [y + 2.55, y + 4.68], [1.18, 1.78], hangMats[i], { ...R, cast: false });
    }
  }
  const horizAnchor = new THREE.Object3D();
  horizAnchor.position.set(38.4, LV.LOFT + 4.3, 1.82);
  horizOpt.add(horizAnchor);
  const horizTarget = new THREE.Object3D();
  horizTarget.position.set(38.4, LV.LOFT + 1.6, 1.82);
  horizOpt.add(horizTarget);

  stackedOpt.userData.isolateBatch = true;
  horizOpt.userData.isolateBatch = true;
  setupLaundryToggle(stackedOpt, horizOpt, stackedAnchor, horizAnchor, stackedTarget, horizTarget);

  // Primary bedroom: bed (dashed on A101.2)
  bedSized(g, 32.9, 5.97, [76 / 12, 80 / 12], LV.LOFT, 'bedroom');                 // king: 76" × 80" mattress, centered as drawn
  RT.NOCUT = false;

  buildUpperBath(g);
}

function buildUpperBath(g) {
  const R = { room: 'bath2' }, y = LV.LOFT, tileTop = z => Math.min(y + 7, roofUnder(z) - 0.1);
  // Biscuit shower walls: south, east, west of the shower zone (z 10.58 → 15.21)
  box(g, [41.4, 47.56], [y, tileTop(15.21)], [15.18, 15.21], 'biscuit', R);
  prism(g, 'z', [[10.58, y], [15.18, y], [15.18, roofUnder(15.18)], [10.58, roofUnder(10.58)]], [47.53, 47.56], 'biscuit', R);
  prism(g, 'z', [[10.58, y], [15.18, y], [15.18, roofUnder(15.18)], [10.58, roofUnder(10.58)]], [41.4, 41.43], 'biscuit', R);
  // shower niche on the long south wall, centered (~1' margin left/right, 2' tall)
  box(g, [42.43, 46.53], [y + 3.5, y + 5.5], [15.16, 15.18], 'biscuitShade', R);
  // pony wall with fixed glass above (east), glass door on a curb (west), 7'-0" (bath elev. 4)
  // pony wall: 10½" thick per A401.2 plan 6 (elev. 3 dims 5" + 5"), raised to 4'-0" to match the half wall (owner)
  const PONY_N = 10.58 - 10.5 / 12;
  box(g, [44.26, 47.52], [y, y + 4.0], [PONY_N, 10.58], 'biscuit', R);
  box(g, [44.28, 47.5], [y + 4.0, y + 7.0], [10.43, 10.49], 'glass', { ...R, cast: false });
  box(g, [41.43, 44.26], [y, y + 0.33], [10.34, 10.58], 'brownberry', R);
  { const n0 = g.children.length;                                    // the glass door: hinged at the west wall, swings out into the bath
    box(g, [41.45, 44.24], [y + 0.35, y + 7.0], [10.43, 10.49], 'glass', { ...R, cast: false });
    box(g, [43.92, 44.0], [y + 2.9, y + 4.5], [10.36, 10.43], 'chrome', R);                 // pull
    box(g, [43.92, 44.0], [y + 2.9, y + 4.5], [10.49, 10.56], 'chrome', R);
    for (const hy of [y + 1.0, y + 3.6, y + 6.0]) box(g, [41.45, 41.6], [hy, hy + 0.3], [10.4, 10.52], 'chrome', R);   // hinges
    const pv = pivotFrom(g, n0, 41.45, y, 10.46);
    pv.traverse(o => { o.userData.cutAxis = 'z'; });
    act(pv, { kind: 'door', label: d => d.on ? 'Close the shower door' : 'Open the shower door', run: d => tweenTo(pv.rotation, 'y', d.on ? 1.75 : 0, 0.9) }); }
  // bench (keynote 34): bench & curb tile matches the floor tile
  box(g, [41.43, 47.53], [y, y + 1.5], [14.0, 15.18], 'brownberry', R);
  // Tiled half wall behind the vanity (A401.2 plan 6 / elev. 3): 5" deep, 4'-0" high, north wall → pony wall
  const HW = 47.56 - 5 / 12;
  box(g, [HW, 47.56], [y, y + 4.0], [1.94, PONY_N], 'biscuit', R);
  // chrome shower head + valve on the east wall
  RT.NOCUT = true;
  const showerParts = [box(g, [46.9, 47.53], [y + 6.6, y + 6.68], [12.06, 12.14], 'chrome', R),
    cyl(g, [46.85, 12.1], [y + 6.5, y + 6.6], 0.3, 'chrome', R),
    box(g, [47.47, 47.53], [y + 3.9, y + 4.3], [13.2, 13.4], 'chrome', R)];
  FX_SHOWERS.push({ parts: showerParts, head: [46.85, y + 6.48, 12.1], floor: y, zone: [41.45, 47.5, 10.6, 15.15], group: g, mirror: BATH_MIRROR,
    tap: [47.4, 47.53, y + 2.5, y + 7.0, 10.62, 15.15] });
  // toilet, double vanity (keynote 1) with two basins + chrome faucets
  box(g, [42.74, 44.0], [y, y + 1.35], [2.6, 4.29], 'porcelain', R);
  box(g, [42.74, 44.0], [y, y + 2.6], [1.94, 2.6], 'porcelain', R);
  // Floating double vanity V2, full width from the north wall to the pony wall (owner's revision of the 5'-0" unit),
  // 1'-10" deep in front of the half wall; box 1'-0" → 3'-4¾", 1¼" top at 3'-6" (A401.2 elev. 3).
  const VX = HW - 22 / 12, VZ = [1.94, PONY_N];
  box(g, [VX, HW], [y + 1.0, y + 3.396], VZ, 'millwork', R);
  box(g, [VX - 0.05, HW], [y + 3.396, y + 3.5], VZ, 'stone', R);
  const SINKS = [5.95, 8.43];                                                    // basins stay where the 5'-0" vanity had them
  for (const zc of SINKS) {
    box(g, [VX + 0.3, HW - 0.35], [y + 3.49, y + 3.51], [zc - 0.6, zc + 0.6], 'porcelain', R);
    box(g, [HW - 0.25, HW - 0.12], [y + 3.5, y + 4.1], [zc - 0.04, zc + 0.04], 'chrome', R);   // deck-mount faucet
    box(g, [HW - 0.42, HW - 0.12], [y + 4.04, y + 4.1], [zc - 0.04, zc + 0.04], 'chrome', R);
  }
  // two 2'-0" mirrors over the basins, 4'-0" → 7'-0"; two D4 sconces stacked between them (see RCP.loft.D4)
  // P3: Keep both vanity mirror frames/boxes, and use a single Reflector pass on the first vanity + shared reflection
  addMirror(g, 47.51, [y + 4.0, y + 7.0], [SINKS[0] - 1.0, SINKS[0] + 1.0], BATH_MIRROR, 'bath2', 'loft', false);
  addMirror(g, 47.51, [y + 4.0, y + 7.0], [SINKS[1] - 1.0, SINKS[1] + 1.0], BATH_MIRROR, 'bath2', 'loft', false);
  RT.NOCUT = false;
}

/* ---------- 5e. Roofs ---------- */
// Skylights S01 (A200: 2 × fixed, 5'-0" × 3'-0"), north slope, located from A102: 3'-0" across, 1'-7" → 5'-6" up the slope
const SKYLIGHTS = [[17.25, 20.5], [41.8, 45.05]], SKY_Z = [1.6, 5.5];
// split [a,b] along x around the skylights; returns [[x0,x1,hole?], ...]
function xSegments(a, b) {
  const out = []; let x = a;
  for (const [s0, s1] of SKYLIGHTS) { if (s1 <= a || s0 >= b) continue; if (s0 > x) out.push([x, s0, false]); out.push([Math.max(s0, a), Math.min(s1, b), true]); x = s1; }
  if (x < b) out.push([x, b, false]);
  return out;
}
function buildMainRoof(g) {
  const T = 0.83, N = LV.ROOF_EDGE_N, S = LV.ROOF_EDGE_S, rz = LV.RIDGE_Z, ry = LV.RIDGE;
  const [dx0, dx1] = LV.DORMER_X;
  const atZ = z => roofTop(z);
  // north slope, with openings for the two skylights
  const [zA, zB] = SKY_Z;
  for (const [x0, x1, hole] of xSegments(-0.5, 48.56)) {
    if (!hole) { slopedSlab(g, [x0, x1], [N, atZ(N)], [rz, ry], T, 'roof'); continue; }
    slopedSlab(g, [x0, x1], [N, atZ(N)], [zA, atZ(zA)], T, 'roof');
    slopedSlab(g, [x0, x1], [zB, atZ(zB)], [rz, ry], T, 'roof');
  }
  slopedSlab(g, [-0.5, dx0], [rz, ry], [S, atZ(S)], T, 'roof');                    // south slope, west
  slopedSlab(g, [dx1, 48.56], [rz, ry], [S, atZ(S)], T, 'roof');                   // south slope, east
  slopedSlab(g, [dx0, dx1], [rz, ry], [LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y], T, 'roof');
  // shed dormer 3/12: 19'-7" at the main roof → 18'-5" at the eave
  slopedSlab(g, [dx0 - 0.1, dx1 + 0.1], [LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y + 0.05], [S + 0.06, LV.DORMER_EAVE_Y - 0.05 * 0], 0.6, 'roof');
  // dormer cheeks (siding)
  // cheeks stand 0.03' proud of the dormer wall ends so their siding covers the wall's end grain (no coplanar faces)
  for (const [a, b] of [[dx0 - 0.03, dx0 + 0.43], [dx1 - 0.43, dx1 + 0.03]]) {
    prism(g, 'z', [[LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y - 0.6], [17.39, LV.DORMER_EAVE_Y - 0.65], [17.39, atZ(17.39)]], [a, b], 'siding');
  }
  // gable ends (siding outside, chalk inside) above the plate
  const tri = [[EXT.N[0], LV.PLATE], [EXT.S[1], LV.PLATE], [rz, roofUnder(rz) + 0.02]];
  prism(g, 'z', tri, [EXT.W[0], EXT.W[0] + SIDING_T], 'siding');
  // inside face of the gables follows the ceiling exactly (no gap at the rake)
  const triIn = [[EXT.N[1], LV.PLATE], [EXT.S[0], LV.PLATE], [EXT.S[0], roofUnder(EXT.S[0]) + 0.01], [rz, roofUnder(rz) + 0.01], [EXT.N[1], roofUnder(EXT.N[1]) + 0.01]];
  prism(g, 'z', triIn, [EXT.W[0] + SIDING_T, EXT.W[1]], 'chalk');
  prism(g, 'z', tri, [EXT.E[1] - SIDING_T, EXT.E[1]], 'siding');
  prism(g, 'z', triIn, [EXT.E[0], EXT.E[1] - SIDING_T], 'chalk');
  // skylights S01 (×2) on the north slope, black curb + glass
  // skylight units: black curb frame (open in the middle) + glass
  for (const [x0, x1] of SKYLIGHTS) {
    const c = 0.2, up = 0.42, top = z => atZ(z) + up;
    slopedSlab(g, [x0, x0 + c], [zA, top(zA)], [zB, top(zB)], up, 'frame');           // curb sits on the roof
    slopedSlab(g, [x1 - c, x1], [zA, top(zA)], [zB, top(zB)], up, 'frame');
    slopedSlab(g, [x0, x1], [zA, top(zA)], [zA + c, top(zA + c)], up, 'frame');
    slopedSlab(g, [x0, x1], [zB - c, top(zB - c)], [zB, top(zB)], up, 'frame');
    slopedSlab(g, [x0 + c, x1 - c], [zA + c, top(zA + c) - 0.02], [zB - c, top(zB - c) - 0.02], 0.03, 'glass', { cast: false });
    // black flashing apron at the low end: closes the gap under the curb where the roof is cut for the well
    slopedSlab(g, [x0, x1], [zA - 0.12, atZ(zA - 0.12) + 0.015], [zA + 0.45, atZ(zA + 0.45) + 0.015], 0.08, 'frame', { cast: false });
  }
  // Interior ceilings (painted GWB, white) on the underside of the roof framing; flat 8'-0" ceiling in the dormer bedroom
  const CT = 0.04, uz = z => roofUnder(z) + 0.005;
  for (const [x0, x1, hole] of xSegments(0.51, 47.56)) {                              // north slope, cut for the skylights
    if (!hole) { slopedSlab(g, [x0, x1], [0.52, uz(0.52)], [rz, uz(rz)], CT, 'ceiling', { cast: false }); continue; }
    const dPerp = 0.585, zCA = zA + dPerp, zCB = zB + dPerp;                               // 45° perpendicular offset from roof top to ceiling
    slopedSlab(g, [x0, x1], [0.52, uz(0.52)], [zCA, uz(zCA)], CT, 'ceiling', { cast: false });
    slopedSlab(g, [x0, x1], [zCB, uz(zCB)], [rz, uz(rz)], CT, 'ceiling', { cast: false });
    // white light-well sides + perpendicular sill/head from the ceiling up to the skylight curb
    const yCA = uz(zCA) - 0.04, yCB = uz(zCB) - 0.04;
    for (const [a, b] of [[x0 + 0.02, x0 + 0.07], [x1 - 0.07, x1 - 0.02]])
      prism(g, 'z', [[zCA, yCA], [zCB, yCB], [zB - 0.15, atZ(zB - 0.15) + 0.36], [zA + 0.20, atZ(zA + 0.20) + 0.36]], [a, b], 'ceiling', { cast: false });
    prism(g, 'z', [[zA + 0.20, atZ(zA + 0.20) + 0.36], [zCA, yCA], [zCA + 0.06, yCA], [zA + 0.28, atZ(zA + 0.28) + 0.36]], [x0 + 0.02, x1 - 0.02], 'ceiling', { cast: false });   // low end (perpendicular)
    prism(g, 'z', [[zB - 0.18, atZ(zB - 0.18) + 0.36], [zCB - 0.06, yCB], [zCB, yCB], [zB - 0.02, atZ(zB - 0.02) + 0.36]], [x0 + 0.02, x1 - 0.02], 'ceiling', { cast: false });   // high end (perpendicular)
  }
  slopedSlab(g, [0.51, 24.16], [rz, uz(rz)], [16.54, uz(16.54)], CT, 'ceiling', { cast: false });
  slopedSlab(g, [41.4, 47.56], [rz, uz(rz)], [16.54, uz(16.54)], CT, 'ceiling', { cast: false });
  slopedSlab(g, [24.16, 41.4], [rz, uz(rz)], [LV.DORMER_JOIN_Z, uz(LV.DORMER_JOIN_Z)], CT, 'ceiling', { cast: false });
  slopedSlab(g, [24.16, 41.4], [LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y - 0.6], [16.54, LV.DORMER_WALL_TOP + 0.01], CT, 'ceiling', { cast: false });
  box(g, [24.7, 40.86], [LV.LOFT_CEIL, LV.LOFT_CEIL + 0.04], [5.97, 16.54], 'ceiling', { cast: false });  // bedroom 8'-0" flat ceiling
  box(g, [0.51, 47.56], [uz(rz) - 0.06, uz(rz) + 0.02], [rz - 0.06, rz + 0.06], 'ceiling', { cast: false }); // seal ridge V-notch
  // ridge cap
  box(g, [-0.5, 48.56], [ry - 0.05, ry + 0.12], [rz - 0.35, rz + 0.35], 'roof');
  // eave soffits (close the overhang above the wall plate)
  box(g, [-0.48, 48.54], [LV.PLATE - 0.02, LV.PLATE + 0.3], [N + 0.02, EXT.N[0]], 'soffit');
  box(g, [-0.48, dx0], [LV.PLATE - 0.02, LV.PLATE + 0.3], [EXT.S[1], S - 0.02], 'soffit');
  box(g, [dx1, 48.54], [LV.PLATE - 0.02, LV.PLATE + 0.3], [EXT.S[1], S - 0.02], 'soffit');
  box(g, [dx0 - 0.08, dx1 + 0.08], [LV.DORMER_WALL_TOP - 0.02, LV.DORMER_WALL_TOP + 0.25], [EXT.S[1], S + 0.04], 'soffit');
}
function buildWingRoof(g) {
  // flat EPDM roof over the sunken living (R2), 1/4"/12 to scuppers, behind the parapet
  // exposed 2x10 joists running E–W @ 1'-5" o.c. (A401.3 elev. 3), bottoms at 8'-0"; ceiling above them
  box(g, [2.51, 16.52], [8.83, LV.WING_TOP - 0.35], [17.39, 26.55], 'ceiling');              // starts at the header face (no shared faces)
  box(g, [2.51, 16.52], [LV.WING_TOP - 0.35, LV.WING_TOP - 0.3], [17.39, 26.55], 'membrane');
  // membrane turned up the inside faces of the parapets and the main-house wall to the coping (these are outside
  // faces above the roof, not interior walls)
  { const uy = [LV.WING_TOP - 0.31, LV.WING_TOP + 0.005], t = 0.02;
    box(g, [2.51, 2.51 + t], uy, [17.39, 26.55], 'membrane');
    box(g, [16.52 - t, 16.52], uy, [17.39, 26.55], 'membrane');
    box(g, [2.51 + t, 16.52 - t], uy, [26.55 - t, 26.55], 'membrane');
    box(g, [2.51 + t, 16.52 - t], [LV.WING_TOP - 0.31, LV.LOFT + 0.02], [17.39, 17.39 + t], 'membrane'); }
  for (let z = 17.6; z < 26.4; z += 1.417) box(g, [2.51, 16.52], [LV.CEIL1, 8.83], [z, z + 0.167], 'woodPanel', { room: 'living' });   // same wood as the wall panels
  // entry porch roof over the deck, wood soffit, one steel column
  box(g, [17.37, 24.1], [8.25, LV.WING_TOP], [17.39, 27.4], 'sidingWood');           // porch roof edge, continues the wing
  box(g, [17.37, 24.16], [LV.WING_TOP, LV.WING_TOP + 0.08], [27.0, 27.46], 'frame');
  box(g, [23.7, 24.16], [LV.WING_TOP, LV.WING_TOP + 0.08], [17.39, 27.46], 'frame');
  box(g, [17.37, 24.1], [8.2, 8.25], [17.39, 27.4], 'woodPanel');                          // porch ceiling: wood
  box(g, [17.37, 23.75], [LV.WING_TOP, LV.WING_TOP + 0.02], [17.39, 27.05], 'membrane');
}


let updateLaundryToggle = () => {};
function setupLaundryToggle(stackedOpt, horizOpt, stackedAnchor, horizAnchor, stackedTarget, horizTarget) {
  const btn = document.createElement('button');
  btn.id = 'laundry-swap-btn';
  btn.type = 'button';
  btn.className = 'laundry-swap-btn';
  btn.hidden = true;
  document.body.appendChild(btn);
  let horiz = false, forceCheck = true;
  const syncLabel = () => { btn.textContent = horiz ? '⇄ Stacked W/D' : '⇄ Horizontal W/D'; };
  syncLabel();
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', e => {
    e.stopPropagation();
    horiz = !horiz;
    stackedOpt.visible = !horiz;
    horizOpt.visible = horiz;
    syncLabel();
    forceCheck = true;
    markShadows();
    wake(10);
  });
  const _v = new THREE.Vector3(), _t = new THREE.Vector3(), _dir = new THREE.Vector3();
  const _ray = new THREE.Raycaster(), _cPos = new THREE.Vector3(), _cQuat = new THREE.Quaternion();
  let lastX = -1, lastY = -1, lastHidden = true, lastVis = false, lastStateKey = '', loftWalls = null;
  const hide = () => { if (!lastHidden) { btn.hidden = true; lastHidden = true; } };
  const isInside = (obj, grp) => { for (let p = obj; p; p = p.parent) if (p === grp) return true; return false; };
  updateLaundryToggle = camera => {
    if (!G.loft.visible || BD.on || TL.on || TOUR.on || (!WALK.on && G.mainRoof.visible && state.explode === 0)) {
      hide();
      return;
    }
    if (WALK.on && camera.position.y < (LV.LOFT - 1) * FT) { hide(); return; }
    const anchor = horiz ? horizAnchor : stackedAnchor;
    const target = horiz ? horizTarget : stackedTarget;
    const optGrp = horiz ? horizOpt : stackedOpt;
    const stateKey = `${horiz ? 1 : 0}|${WALK.on ? 1 : 0}|${state.walls}|${state.explode}|${G.mainRoof.visible ? 1 : 0}`;
    const camMoved = forceCheck || stateKey !== lastStateKey || _cPos.distanceToSquared(camera.position) > 1e-6 || Math.abs(_cQuat.dot(camera.quaternion)) < 0.999999;
    if (camMoved) {
      forceCheck = false;
      lastStateKey = stateKey;
      _cPos.copy(camera.position);
      _cQuat.copy(camera.quaternion);
      target.getWorldPosition(_t);
      _dir.subVectors(_t, camera.position);
      const dist = _dir.length();
      const maxDist = (WALK.on ? 13 : 30) * FT;
      if (dist > maxDist) { lastVis = false; }
      else {
        anchor.getWorldPosition(_v);
        _v.project(camera);
        if (_v.z < -1 || _v.z > 1) { lastVis = false; }
        else {
          const px = (_v.x * 0.5 + 0.5) * window.innerWidth;
          const py = (-_v.y * 0.5 + 0.5) * window.innerHeight;
          if (px < 0 || px > window.innerWidth || py < 0 || py > window.innerHeight) { lastVis = false; }
          else {
            if (!loftWalls) loftWalls = CUT.els.filter(e => e.key === 'loft').map(e => e.m);
            _dir.divideScalar(dist || 1);
            _ray.set(camera.position, _dir);
            _ray.far = dist - 1.2 * FT;
            const objs = G.mainRoof.visible ? [...loftWalls, G.mainRoof] : loftWalls;
            const hits = _ray.intersectObjects(objs, true);
            const h0 = hits.find(h => h.object.visible && h.object.material?.name !== 'glass' && !isInside(h.object, optGrp));
            lastVis = !h0;
          }
        }
      }
    }
    if (!lastVis) { hide(); return; }
    anchor.getWorldPosition(_v);
    _v.project(camera);
    const x = Math.round((_v.x * 0.5 + 0.5) * window.innerWidth);
    const y = Math.round((-_v.y * 0.5 + 0.5) * window.innerHeight);
    if (lastHidden) { btn.hidden = false; lastHidden = false; }
    if (x !== lastX || y !== lastY) {
      lastX = x; lastY = y;
      btn.style.transform = `translate3d(${x}px,${y}px,0) translate(-50%,-100%)`;
    }
  };
}

// Section 6: Build house geometry into G.* before renderer env-maps, lighting, cutaway, and FX run
buildSite(G.site);
buildFloors();
buildGround(G.ground);
buildLoft(G.loft);
buildMainRoof(G.mainRoof);
buildWingRoof(G.wingRoof);

export { buildLoft, buildUpperBath, SKYLIGHTS, SKY_Z, xSegments, buildMainRoof, buildWingRoof, updateLaundryToggle };
