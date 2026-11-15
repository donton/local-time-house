// Root scene group, floor groups (G), site foundation/decks, and floor slabs.
import * as THREE from 'three';
import { FT, LV, WING_SIDING_FROM } from '../config/constants.js';
import { ROOMS } from '../config/rooms.js';
import { box } from '../core/builder.js';

/* =====================================================================
   5. SCENE GRAPH
   ===================================================================== */
const root = new THREE.Group(); root.name = 'LocalTimeHouse';
root.scale.setScalar(FT); root.position.set(-24 * FT, 0, -13.5 * FT);
const G = {
  site: new THREE.Group(), ground: new THREE.Group(), loft: new THREE.Group(),
  wingRoof: new THREE.Group(), mainRoof: new THREE.Group(),
};
Object.entries(G).forEach(([k, g]) => { g.name = k; root.add(g); });

/* ---------- 5a. Site, foundation, decks ---------- */
function buildSite(g) {
  // 18" gravel bed around the perimeter (keynote 18)
  const gy = [LV.GRADE, LV.GRADE + 0.05];
  box(g, [-0.34, 48.4], gy, [-1.82, -0.32], 'gravel');
  box(g, [48.4, 49.9], gy, [-1.82, 18.89], 'gravel');
  box(g, [24.07, 48.4], gy, [17.39, 18.89], 'gravel');
  box(g, [0.16, 17.37], gy, [27.4, 28.9], 'gravel');
  box(g, [0.16, 1.66], gy, [17.39, 27.4], 'gravel');
  // foundation walls showing above grade (8" conc., A200 E1)
  const fy = [LV.GRADE, -0.12];
  box(g, [-0.37, 48.43], fy, [-0.35, 0.49], 'foundation');
  box(g, [-0.37, 10.51], fy, [16.57, 17.42], 'foundation');
  box(g, [15.2, 48.43], fy, [16.57, 17.42], 'foundation');                      // (not across the pit steps, x 10.51–15.01)
  box(g, [10.51, 15.2], [-0.5, 0], [16.54, 16.57], 'concreteFloor');            // riser from the main floor down to the first step
  box(g, [-0.37, 0.48], fy, [-0.35, 17.42], 'foundation');
  box(g, [47.59, 48.43], fy, [-0.35, 17.42], 'foundation');
  // the sunken living room sits 1'-6" lower, so its foundation top is 1'-6" lower than the main house's
  const fyW = [LV.GRADE, WING_SIDING_FROM];
  box(g, [1.63, 2.48], fyW, [17.42, 27.43], 'foundation');
  box(g, [1.63, 17.4], fyW, [26.58, 27.43], 'foundation');
  box(g, [16.55, 17.4], fyW, [17.42, 26.58], 'foundation');
  // condensing units on a pad, north wall (keynote 27)
  box(g, [17.03, 22.45], [LV.GRADE, LV.GRADE + 0.33], [-1.82, -0.42], 'concrete');
  box(g, [17.4, 19.6], [LV.GRADE + 0.33, LV.GRADE + 2.6], [-1.6, -0.6], 'appliance');
  box(g, [19.9, 22.1], [LV.GRADE + 0.33, LV.GRADE + 2.6], [-1.6, -0.6], 'appliance');
  // West deck 8'-0" × 17'-8", -0'-2" (A101.1)
  deck(g, [-8.34, -0.34], [-0.32, 17.39], ['x0', 'z0', 'z1']);
  // Entry deck 6'-8" × 10'-0", -0'-2", plus step to the path (keynote 24)
  deck(g, [17.37, 24.07], [17.39, 27.4], ['x1']);
  box(g, [17.37, 24.07], [LV.GRADE, -0.92], [27.4, 28.9], 'deck');
  box(g, [17.37, 24.07], [LV.GRADE, -1.6], [28.9, 29.9], 'deck');
}
function deck(g, xs, zs, open = []) {
  box(g, xs, [-0.32, -0.167], zs, 'deck');
  // black wood skirting on the open sides, tucked 1" under the deck edge, grade to the deck boards
  const sy = [LV.GRADE, -0.32], i = 0.08, t = 0.06;
  if (open.includes('x0')) box(g, [xs[0] + i, xs[0] + i + t], sy, [zs[0] + i, zs[1] - i], 'skirt');
  if (open.includes('x1')) box(g, [xs[1] - i - t, xs[1] - i], sy, [zs[0] + i, zs[1] - i], 'skirt');
  if (open.includes('z0')) box(g, [xs[0] + i, xs[1] - i], sy, [zs[0] + i, zs[0] + i + t], 'skirt');
  if (open.includes('z1')) box(g, [xs[0] + i, xs[1] - i], sy, [zs[1] - i - t, zs[1] - i], 'skirt');
  box(g, [xs[0] + 0.3, xs[1] - 0.3], [-1.1, -0.32], [zs[0] + 0.3, zs[1] - 0.3], 'steel', { cast: false });
  for (const x of [xs[0] + 0.5, xs[1] - 0.5]) for (const z of [zs[0] + 0.5, (zs[0] + zs[1]) / 2, zs[1] - 0.5])
    box(g, [x - 0.25, x + 0.25], [LV.GRADE, -1.1], [z - 0.25, z + 0.25], 'concrete');
}

/* ---------- 5b. Floors (structure + finishes) ---------- */
const roomFloorMeshes = {};
function buildFloors() {
  // One continuous finish floor per level, running through doorways and under partitions, so there are no
  // threshold strips between rooms: concrete downstairs (main floor + sunken living), oak in the loft.
  box(G.ground, [0.51, 47.56], [-1.2, 0], [0.52, 16.54], 'concreteFloor', { cast: false });
  box(G.ground, [2.51, 16.52], [LV.SUNKEN - 0.6, LV.SUNKEN], [16.54, 26.55], 'concreteFloor', { cast: false });
  // loft slab: underside = ground ceiling at 8'-0"; continuous oak on top
  const ly = [LV.CEIL1, LV.LOFT - 0.03], lt = [LV.LOFT - 0.03, LV.LOFT];
  for (const [xs, zs] of [[[14.52, 16.92], [0.52, 10.45]], [[14.52, 24.16], [10.45, 16.54]], [[24.16, 47.56], [0.52, 16.54]]]) {
    box(G.loft, xs, ly, zs, 'ceiling');
    if (xs[0] === 14.52) {                                           // edge facing the kitchen: oak stops under the guard,
      box(G.loft, [14.52, 14.82], lt, zs, 'chalk', { cast: false });   //   the slab edge reads as part of the wall
      box(G.loft, [14.82, xs[1]], lt, zs, 'wood', { cast: false });
    } else if (xs[0] === 24.16) {                                    // edge facing the stair: oak stops under the bedroom wall
      box(G.loft, [24.16, 24.7], lt, [0.52, 10.45], 'chalk', { cast: false });
      box(G.loft, [24.16, 24.7], lt, [10.45, 16.54], 'wood', { cast: false });
      box(G.loft, [24.7, xs[1]], lt, zs, 'wood', { cast: false });
    } else box(G.loft, xs, lt, zs, 'wood', { cast: false });
  }
  // Exposed loft slab edges are wall surfaces: face them in the wall color (the slab itself is white ceiling below)
  const ey = [LV.CEIL1, LV.LOFT];
  box(G.loft, [14.5, 14.52], ey, [0.52, 16.54], 'chalk', { cast: false });       // kitchen side (open to below)
  box(G.loft, [16.92, 16.94], ey, [0.52, 10.45], 'chalk', { cast: false });      // stair opening, west edge
  box(G.loft, [16.92, 24.16], ey, [10.43, 10.45], 'chalk', { cast: false });     // stair opening, south edge
  // Per-room floors: rooms that share the continuous finish sit flush in it (same material, world-aligned
  // texture, so no seam) and exist for picking; tiled rooms sit 1/8" proud.
  for (const r of ROOMS) {
    const parent = r.floor === 'loft' ? G.loft : G.ground;
    const flush = r.mat === 'concreteFloor' || r.mat === 'wood';
    const top = flush ? r.y : r.y + 0.01;
    roomFloorMeshes[r.id] = r.rects.map(([x0, x1, z0, z1]) => box(parent, [x0, x1], [top - 0.03, top], [z0, z1], r.mat, { room: r.id, cast: false }));
  }
}

export const ROOM_FLOOR_LIST = [];
export { root, G, buildSite, deck, roomFloorMeshes, buildFloors };
