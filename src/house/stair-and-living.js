// Quarter-turn winder stair, stair cladding, sunken living room, fireplace, TV, and guest bath.
import * as THREE from 'three';
import { LV, WING_SIDING_FROM } from '../config/constants.js';
import { RT, FX_SHOWERS, tweenTo, act } from '../core/state.js';
import { makeMirrorFogMat } from '../core/materials.js';
import { addGeo, box, cyl, prism, hslab, rod, clad, pivotFrom, addMirror } from '../core/builder.js';
import { G } from './site-and-floors.js';

const STAIR = { r: LV.LOFT / 14, eastX: [21.07, 24.16], flightZ: [4.4, 10.45], treads: 7, enclosedTo: 7.55 };
function buildStair(g) {
  const R = { room: 'entry' }, r = STAIR.r, T = 0.15;
  const L = G.loft;                                                                  // parts above the loft floor
  const tread = (pts, n, solid) => hslab(g, pts, [solid ? 0 : n * r - T, n * r], 'woodStair', R);
  // West run: 2 risers in 1'-9" up to the 1'-4" landing (A402 plan 5), then riser 3. The two entry steps are
  // stained-wood tread slabs with a 1" nosing over wood risers set back under them (A402.1 axonometric).
  const NOSE = 1 / 12, TS = 0.1, zL = 9.19 - 0.875;                                  // landing front, one tread back
  box(g, [16.96, 20.24], [0, r - TS], [zL, 9.19 - NOSE], 'woodStair', R);             // riser 1 + body (wood)
  box(g, [16.96, 20.24], [r - TS, r], [zL, 9.19], 'woodStair', R);                    // tread 1
  box(g, [16.96, 20.24], [0, 2 * r - TS], [4.02, zL - NOSE], 'woodStair', R);        // riser 2 + landing body (wood)
  box(g, [16.96, 20.24], [2 * r - TS, 2 * r], [4.02, zL], 'woodStair', R);           // landing +1'-4"
  tread([[16.96, 3.52], [20.24, 3.52], [20.24, 4.02], [16.96, 4.02]], 3, true);
  // Winders 4–6 around the north end of the center wall (closed below)
  const c = [20.65, 3.52];
  tread([[16.96, 0.52], c, [16.96, 3.52]], 4, true);
  tread([[16.96, 0.52], [24.16, 0.52], c], 5, true);
  tread([c, [24.16, 0.52], [24.16, 4.4], [21.07, 4.4], [21.07, 3.52]], 6, true);

  // East flight, risers 7–14 (≈10⅜" treads). The flight is a closed, painted mass (A402 sect. 02):
  // full height below its upper end down to z 7.55, then a sloped gyp soffit over the shoe-storage nook.
  const [x0, x1] = STAIR.eastX, [za0, za1] = STAIR.flightZ, d = (za1 - za0) / STAIR.treads;
  const nose = z => 7 * r + (z - za0) * (r / d);                                     // nosing line
  const soffit = z => Math.min(LV.CEIL1, nose(z) - 1.1);
  const zE = STAIR.enclosedTo;
  const prof = [[za0, 0], [zE, 0], [zE, soffit(zE)], [za1, soffit(za1)]];
  for (let k = STAIR.treads - 1; k >= 0; k--) {                                      // stepped top, under the treads
    const za = za0 + k * d, top = (7 + k) * r - T;
    prof.push([za + d, top], [za, top]);
  }
  prof.push([za0, 6 * r]);
  prism(g, 'z', prof, [x0, x1], 'millwork', R);                                      // wood wall panel, like the center wall
  for (let k = 0; k < STAIR.treads; k++) {
    const za = za0 + k * d;
    tread([[x0, za], [x1, za], [x1, za + d], [x0, za + d]], 7 + k, false);
    box(g, [x0 + 0.01, x1 - 0.01], [(6 + k) * r, (7 + k) * r - T], [za - 0.02, za], 'woodStair', R);   // wood riser, like the entry steps
  }
  // Millwork shoe-storage nook (A402 sect. 02, A402.1 axonometric): one long open cubby beside the steps, under
  // the flight, from the enclosure face out flush with the first step's nosing, top flush with the landing (+1'-4").
  // A solid kick panel below, then one open bay with a shelf floor; no dividers.
  {
    const cz = [STAIR.enclosedTo, 9.19], ct = 2 * r, w = 0.06, sh = 0.42;         // front flush with the first step
    box(g, [20.24, x1], [ct - w, ct], cz, 'woodStair', R);                            // top
    box(g, [20.24, x1], [sh - w, sh], cz, 'woodStair', R);                            // shelf floor of the open bay
    box(g, [20.24, x1], [0, sh - w], [cz[1] - w, cz[1]], 'woodStair', R);              // kick panel below
    for (const [a, b] of [[20.24, 20.24 + w], [x1 - w, x1]])
      box(g, [a, b], [0, ct - w], cz, 'woodStair', R);                                 // ends
  }

  // Center wall: wood wall panel, full height beside the landing (z 3.53–7.53), then a raking guard on the
  // west side of the flight, top 7'-1" → 12'-1" at the loft, bottom following the soffit. Split at the loft floor.
  const topLine = z => 7.1 + (z - 3.53) * (5.0 / (za1 - 3.53));
  const zCut = 3.53 + (LV.LOFT - 7.1) * ((za1 - 3.53) / 5.0);
  prism(g, 'z', [[3.53, 0], [7.53, 0], [7.53, soffit(7.53)], [za1, LV.CEIL1], [za1, LV.LOFT], [zCut, LV.LOFT], [3.53, topLine(3.53)]],
    [20.24, 21.07], 'millwork', R);
  prism(L, 'z', [[zCut, LV.LOFT], [za1, LV.LOFT], [za1, topLine(za1)]], [20.24, 21.07], 'millwork', { room: 'loft' });

  // Single 1¼" Ø wood handrail extending from the east flight, wrapping around the north end of the middle wall,
  // and running down its west face across the landing to z = 7.53 (A402 detail 1).
  const off = 0.19 + 0.052, hx = 21.07 + off, wx = 20.24 - off, zN = 3.53 - off, H = 2.83, railY = z => nose(z) + H;
  const yNE = 5.5 * r + H, yNW = 4 * r + H, yLand = 2 * r + H;
  rod(g, [hx, yNE, zN], [hx, railY(za0), za0], 0.052, 'woodStair', R);
  rod(g, [hx, railY(za0), za0], [hx, railY(10.2), 10.2], 0.052, 'woodStair', R);
  rod(g, [hx, yNE, zN], [wx, yNW, zN], 0.052, 'woodStair', R);
  rod(g, [wx, yNW, zN], [wx, yLand, 4.02], 0.052, 'woodStair', R);
  rod(g, [wx, yLand, 4.02], [wx, yLand, 7.53], 0.052, 'woodStair', R);
  for (const p of [[hx, yNE, zN], [wx, yNW, zN], [wx, yLand, 4.02]]) {
    const sg = new THREE.SphereGeometry(0.052, 12, 10); sg.translate(...p); addGeo(g, sg, 'woodStair', R);
  }
  for (const z of [4.4, 6.8, 9.5]) box(g, [21.07, hx], [railY(z) - 0.17, railY(z) - 0.045], [z - 0.008, z + 0.008], 'steel', R);
  box(g, [20.642, 20.658], [(yNE + yNW) / 2 - 0.17, (yNE + yNW) / 2 - 0.045], [zN, 3.53], 'steel', R);
  for (const z of [4.4, 6.8]) box(g, [wx, 20.24], [yLand - 0.17, yLand - 0.045], [z - 0.008, z + 0.008], 'steel', R);
}

function buildStairCladding(g) {
  const Y = [0, 9.25];                                                   // to 9'-3" (A402 sect. 01)
  clad(g, 'z', [0.52, 9.3], 16.96, +1, Y, [], 'entry');                  // west side, kitchen wall
  clad(g, 'x', [16.96, 24.16], 0.52, +1, Y, [[17.24, 20.24, 5, 11]], 'entry');   // north wall, around W12
  clad(g, 'z', [0.52, 10.45], 24.16, -1, Y, [], 'entry');                // east side, guest-bedroom wall
}
function buildLiving(g) {
  const R = { room: 'living' }, s = LV.SUNKEN;
  // wood wall panels, floor to ceiling, around W08 and W09 (west, south, east walls of the pit)
  const LY = [s, 8.83];
  clad(g, 'z', [16.55, 26.55], 2.51, +1, LY, [], 'living');
  clad(g, 'x', [2.51, 16.52], 26.55, -1, LY, [[3.01, 8.02, 0, 8]], 'living');
  clad(g, 'z', [16.55, 26.55], 16.52, -1, LY, [[23.55, 26.55, 0, 8]], 'living');
  RT.NOCUT = true;
  // A401.3: north wall = 8'-0" bench | 4'-6" stair | 1'-6" TV unit; west wall = 8'-0" bench | 2'-0" hearth
  // Pit edge: the main-floor slab face, 1'-6" tall, along the kitchen side
  box(g, [2.51, 16.52], [s, 0], [16.5, 16.54], 'concreteFloor', R);
  // 4'-6" stair up to the kitchen: 3 risers @ 6", 11" treads (A402.1, A401.3)
  box(g, [10.51, 15.01], [s, -0.5], [16.54, 17.46], 'concreteFloor', R);
  box(g, [10.51, 15.01], [s, -1.0], [17.46, 18.38], 'concreteFloor', R);
  // Low L-shaped sectional (owner's selection), on the A401.3 footprint: along the north pit edge and down the west
  // wall to the hearth, 2'-6" deep. Blue-gray woven upholstery on a fabric plinth, track arms, loose seat cushions
  // and a row of loose back cushions.
  // owner's sectional: 94" × 94" × 33" corner sofa (≈38" deep), 18" seat, 24" track arms, loose back pillows
  const L94 = 94 / 12;
  const SOFA = { depth: 38 / 12, base: 0.33, seat: 1.5, back: 33 / 12, arm: 2.0, armT: 0.5, bk: 0.95, gap: 0.03,
                 north: [2.56, 2.56 + L94], west: [16.54, 16.54 + L94] };
  const [nx0, nx1] = SOFA.north, [wz0, wz1] = SOFA.west, nz1 = wz0 + SOFA.depth, wx1 = nx0 + SOFA.depth;
  const q = SOFA.gap, bk = SOFA.bk, F = 'sofa', y0 = s + SOFA.base, ys = s + SOFA.seat;
  const armN = nx1 - SOFA.armT, armW = wz1 - SOFA.armT;
  box(g, [nx0, nx1], [s + 0.05, y0], [wz0, nz1], 'sofaBase', R);                              // plinths (set back a hair at the floor)
  box(g, [nx0, wx1], [s + 0.05, y0], [nz1, wz1], 'sofaBase', R);
  box(g, [nx0 + 0.04, nx1 - 0.04], [s, s + 0.05], [wz0 + 0.04, nz1 - 0.04], 'frame', R);
  box(g, [nx0 + 0.04, wx1 - 0.04], [s, s + 0.05], [nz1, wz1 - 0.04], 'frame', R);
  // back frames, tight to the pit edge and the west wall, just under the back cushion tops
  const bf = 0.45, bt = s + SOFA.back - 0.12;
  box(g, [nx0, armN], [y0, bt], [wz0, wz0 + bf], F, R);
  box(g, [nx0, nx0 + bf], [y0, bt], [wz0 + bf, armW], F, R);
  box(g, [armN, nx1], [y0, s + SOFA.arm], [wz0, nz1], F, R);                                  // track arms
  box(g, [nx0, wx1], [y0, s + SOFA.arm], [armW, wz1], F, R);
  // seats: corner + two along each run, butted with hairline gaps
  const nMid = (wx1 + armN) / 2, wMid = (nz1 + armW) / 2;
  const nRun = [[wx1, nMid], [nMid, armN]], wRun = [[nz1, wMid], [wMid, armW]];
  box(g, [nx0 + bk + q, wx1 - q], [y0, ys], [wz0 + bk + q, nz1 - q], F, R);                  // corner seat
  for (const [a0, a1] of nRun) box(g, [a0 + q, a1 - q], [y0, ys], [wz0 + bk + q, nz1 - q], F, R);
  for (const [a0, a1] of wRun) box(g, [nx0 + bk + q, wx1 - q], [y0, ys], [a0 + q, a1 - q], F, R);
  // back cushions in front of the frames, one behind each seat plus the corner block
  const by = [ys - 0.05, s + SOFA.back];
  box(g, [nx0 + bf, nx0 + bk], by, [wz0 + bf, wz0 + bk], F, R);                              // corner
  for (const [a0, a1] of [[nx0 + bk, wx1], ...nRun]) box(g, [a0 + q, a1 - q], by, [wz0 + bf, wz0 + bk], F, R);
  for (const [a0, a1] of [[wz0 + bk, nz1], ...wRun]) box(g, [nx0 + bf, nx0 + bk], by, [a0 + q, a1 - q], F, R);
  // navy rug in the pit, under the front of the sofa and the coffee table
  box(g, [4.4, 14.6], [s, s + 0.03], [18.6, 24.3], 'rug', { ...R, cast: false });
  // round coffee table, 2'-9" Ø × 1'-3": raised-rim top on four chunky round legs (owner's selection, sized to the pit)
  {
    const cx = 10.4, cz = 22.15, r = 1.375, ty = s + 1.25;                                     // centered in the open floor between the sofa, TV bench and hearth
    cyl(g, [cx, cz], [ty - 0.16, ty], r, 'sage', R);                                          // top
    const rim = new THREE.TorusGeometry(r - 0.05, 0.06, 10, 48).rotateX(Math.PI / 2).translate(cx, ty + 0.01, cz);
    addGeo(g, rim, 'sage', R);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2;
      cyl(g, [cx + Math.cos(a) * 0.43, cz + Math.sin(a) * 0.43], [s + 0.03, ty - 0.16], 0.31, 'sage', R);
    }
    box(g, [cx - 0.45, cx + 0.35], [ty, ty + 0.1], [cz - 0.3, cz + 0.3], 'woodStair', R);    // a stack of books
  }
  // raised hearth 2'-0" deep × 1'-6" with 4"×4" tile topper, across the south wall (Tile 6)
  box(g, [2.56, 16.47], [s, s + 1.5], [24.54, 26.5], 'wineGloss', R);               // clad top + front in 4"×4" glossy wine-red tile
  // Fireplace insert on the hearth (keynote 11). 6" flue (A301 sect. 2, A201): rises from the top of the insert,
  // a 45° offset back to the south wall, straight through it, a 45° offset out from the siding, then up the
  // outside of the wall to a cap 3'-0" above the parapet. Rounded joints stand in for the 45° elbows.
  const hy = s + 1.5, FX = 12.23, FR = 0.25, FTOP = LV.WING_TOP + 3.0;
  box(g, [10.98, 13.48], [hy, hy + 2.0], [25.0, 26.4], 'steel', R);
  const fireGlass = box(g, [11.2, 13.26], [hy + 0.25, hy + 1.6], [24.97, 25.0], 'frame', R);
  fireGlass.userData.nocut = true;                                                // its material changes when lit, so the cutaway leaves it alone
  RT.FX_FIRE = { glass: fireGlass, at: [12.23, hy + 0.9, 24.4], flue: [12.23, LV.WING_TOP + 3.4, 28.15], group: g };
  const yRun = hy + 2.6 + 0.85, FZ = 28.15;
  const flue = [[FX, hy + 2.0, 25.7], [FX, hy + 2.6, 25.7], [FX, yRun, 26.55], [FX, yRun, 27.6], [FX, yRun + 0.55, FZ], [FX, FTOP, FZ]];
  for (let i = 0; i < flue.length - 1; i++) rod(g, flue[i], flue[i + 1], FR, 'steel', R);
  for (const p of flue.slice(1, -1)) { const sg = new THREE.SphereGeometry(FR, 16, 12); sg.translate(...p); addGeo(g, sg, 'steel', R); }
  rod(g, [FX, FTOP, FZ], [FX, FTOP + 0.35, FZ], FR + 0.12, 'steel', R);          // rain cap
  for (const y of [4.0, 7.5]) box(g, [FX - 0.04, FX + 0.04], [y - 0.04, y + 0.04], [27.4, FZ - FR + 0.02], 'steel', R); // wall straps
  // built-in TV unit, 1'-6" deep × 8'-0", open shelves, tile topper (keynote 29), TV on the east wall
  box(g, [15.01, 16.47], [s, s + 1.5], [16.55, 24.54], 'millwork', R);               // all wood; top flush with the main floor and the hearth (1'-6")
  for (const [z0, z1] of [[18.5, 20.67], [20.84, 22.75], [22.92, 24.4]]) box(g, [15.0, 15.02], [s + 0.2, s + 1.3], [z0, z1], 'woodRiser', R);
  const tvBox = box(g, [16.4, 16.5], [s + 2.35, s + 5.55], [17.54, 22.98], 'frame', R);
  RT.FX_TV = { box: tvBox, center: [16.395, s + 3.95, 20.26], w: 5.3, h: 3.06, group: g };
  RT.NOCUT = false;
}

function buildGuestBath(g) {
  const R = { room: 'guestBath' };
  // shower tile, Nautical Blue: north, west and east walls of the shower
  // north shower wall, tiled around W14 (3'-0" × 4'-0" tempered casement, 4'-0" sill, x 35.72–38.73)
  box(g, [33.4, 35.72], [0, 8], [0.52, 0.55], 'nautical', R);
  box(g, [35.72, 38.77], [0, 4], [0.52, 0.55], 'nautical', R);
  box(g, [35.72, 38.77], [3.97, 4.0], [0.52, 0.86], 'nautical', R);                // tiled sill
  box(g, [33.4, 33.43], [0, 8], [0.55, 3.9], 'nautical', R);
  box(g, [38.74, 38.77], [0, 8], [0.55, 3.9], 'nautical', R);
  // Brownberry niche accent (west wall, keynote 3; A401.2 elev. 3: 4'-0" → 6'-3")
  box(g, [33.43, 33.46], [4.0, 6.25], [1.7, 2.73], 'brownberry', R);
  // Biscuit 2"×6" pony wall + tiled ledge wall to 3'-6" (Tile 2, keynote 32)
  box(g, [36.12, 38.77], [0, 3.5], [3.9, 4.3], 'biscuit', R);
  box(g, [38.23, 38.77], [0, 3.5], [4.3, 10.46], 'biscuit', R);
  // frameless glass door (west) + fixed glass on the pony wall (east), 7'-0" (A401.2 elev. 4)
  { const n0 = g.children.length;                                    // the glass door: hinged at the west wall, swings out into the bath
    box(g, [33.45, 36.1], [0.1, 7.0], [4.06, 4.12], 'glass', { ...R, cast: false });
    box(g, [35.7, 35.78], [2.9, 4.5], [3.99, 4.06], 'chrome', R);                           // pull, both faces
    box(g, [35.7, 35.78], [2.9, 4.5], [4.12, 4.19], 'chrome', R);
    for (const hy of [1.0, 3.6, 6.0]) box(g, [33.45, 33.6], [hy, hy + 0.3], [4.03, 4.15], 'chrome', R);   // hinges
    const pv = pivotFrom(g, n0, 33.45, 0, 4.09);
    pv.traverse(o => { o.userData.cutAxis = 'z'; });
    act(pv, { kind: 'door', label: d => d.on ? 'Close the shower door' : 'Open the shower door', run: d => tweenTo(pv.rotation, 'y', d.on ? -1.75 : 0, 0.9) }); }
  box(g, [36.14, 38.75], [3.5, 7.0], [4.06, 4.12], 'glass', { ...R, cast: false });
  RT.NOCUT = true;
  // mirror over the sink with D4 sconces either side (elev. 1)
  const GUEST_MIRROR = makeMirrorFogMat();
  addMirror(g, 38.72, [4.0, 7.0], [7.6, 9.6], GUEST_MIRROR, 'guestBath', 'ground');
  // chrome: shower arm/head, valve, faucet, towel bar
  const guestShowerParts = [box(g, [38.2, 38.74], [6.7, 6.78], [2.06, 2.14], 'chrome', R),
    cyl(g, [38.15, 2.1], [6.6, 6.7], 0.3, 'chrome', R),
    box(g, [38.68, 38.74], [3.9, 4.3], [2.0, 2.2], 'chrome', R)];
  FX_SHOWERS.push({ parts: guestShowerParts, head: [38.15, 6.55, 2.1], floor: 0, zone: [33.45, 38.74, 0.56, 4.05], group: g, mirror: GUEST_MIRROR, tap: [38.55, 38.74, 2.5, 7.0, 0.56, 4.05] });
  box(g, [37.9, 38.23], [3.5, 3.6], [8.55, 8.65], 'chrome', R);
  box(g, [33.43, 33.5], [3.6, 3.66], [5.5, 7.5], 'chrome', R);
  // wall-hung toilet and sink on the ledge, tall cabinet (keynote 22)
  box(g, [36.6, 38.23], [1.0, 1.4], [5.4, 6.75], 'porcelain', R);
  box(g, [37.0, 38.23], [2.6, 3.0], [7.9, 9.3], 'porcelain', R);
  box(g, [36.8, 38.77], [0, 7.0], [10.45, 13.14], 'millwork', R);
  RT.NOCUT = false;
}


export { STAIR, buildStair, buildStairCladding, buildLiving, buildGuestBath };
