// Ground floor exterior & interior walls, doors, windows, guest bunk bed, and office furniture.
import * as THREE from 'three';
import { LV, EXT, WING_SIDING_FROM } from '../config/constants.js';
import { state, RT, MODES, LIGHTS_OUT, tweenTo, act } from '../core/state.js';
import { M, creamMat } from '../core/materials.js';
import { addGeo, box, rbox, cyl, SIDING_T, ST, extWall, LAP_N, LAP_S, intWall, glazing, glazingTrim, doorLeaf, pocketDoor, leverGroup, pivotFrom } from '../core/builder.js';
import { buildKitchen } from './kitchen.js';
import { buildStair, buildStairCladding, buildLiving, buildGuestBath } from './stair-and-living.js';

/* ---------- 5c. Ground floor walls, openings, fixtures ---------- */
// levers (+ deadbolt thumb-turns) on both faces of an exterior glass door: pos along the wall, outer/inner face coordinate, height.
// out = +1 when "outside" is the +coordinate side. The bar points toward the hinge side (−pos... depends on the door).
function extLevers(g, axis, pos, outFace, inFace, y, out) {
  const mk = (face, nrm, dirTo) => {
    const gr = leverGroup();
    const dir = nrm > 0 ? 1 : -1;
    if (axis === 'x') { gr.position.set(pos, y, face); gr.rotation.y = nrm > 0 ? 0 : Math.PI; gr.scale.x = dirTo * dir; }
    else { gr.position.set(face, y, pos); gr.rotation.y = nrm > 0 ? Math.PI / 2 : -Math.PI / 2; gr.scale.x = dirTo * -dir; }
    g.add(gr);
    const tag = o => { o.userData.cutAxis = axis === 'x' ? 'z' : 'x'; };
    gr.traverse(tag);
    // deadbolt rose + thumb-turn 7" above the lever
    const m = M('lever'), dbolt = new THREE.Group();
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20).rotateX(Math.PI / 2), m); r.position.set(0, 0.58, 0.01); dbolt.add(r);
    const tb = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.03), m); tb.position.set(0, 0.58, 0.04); dbolt.add(tb);
    dbolt.traverse(tag); gr.add(dbolt);
  };
  // the leaf hinges away from the latch stile: door 101 hinges toward −x (bar points −x on the inside face), 102 toward +z
  if (axis === 'x') { mk(outFace, out, -1); mk(inFace, -out, -1); }
  else { mk(outFace, out, -1); mk(inFace, -out, -1); }
}
function buildGround(g) {
  const Y = [0, LV.LOFT];
  // North wall — W06, W12 (stair, 5' sill), W05, W14
  // W06 runs 0 → 11'-0" per the north elevation (A201) and kitchen elevation 3 (A401.1); A200 lists only 8'-0".
  const northHoles = [[11.41, 14.42, 0, 11], [17.24, 20.24, 5, 11], [24.62, 27.62, 0, 8], [35.72, 38.73, 4, 8]];
  extWall(g, 'x', [-0.34, 48.4], EXT.N, -1, Y, northHoles, { trim: [ST, ST] });
  // West wall — W07 (3' sill to 11'); Door 102 + W13 sidelight + W15 transom
  const westHoles = [[2.61, 5.61, 3, 11], [11.95, 16.2, 0, 11]];
  extWall(g, 'z', [0.52, 16.54], EXT.W, -1, Y, westHoles, { lap: [LAP_N, LAP_S] });
  // East wall — W03, W04 (desk)
  const eastHoles = [[4.11, 7.11, 3, 8], [11.54, 16.54, 3, 8]];
  extWall(g, 'z', [0.52, 16.54], EXT.E, +1, Y, eastHoles, { lap: [LAP_N, LAP_S] });
  // South wall of the bar: west stub, header over the opening to the sunken living, then the entry/corridor run
  extWall(g, 'x', [-0.34, 1.66], EXT.S, +1, Y, [], { trim: [ST, 0] });
  // the wall stub runs 2'-1" from the west wall (A401.1 plan 1) to meet the living room's west wall: fill the slot
  box(g, [1.66, 2.51], [LV.SUNKEN, LV.CEIL1], [EXT.S[0], EXT.S[1]], 'chalk');
  intWall(g, 'x', [1.66, 16.52], EXT.S, [LV.CEIL1, LV.LOFT]);
  const southHoles = [[18.11, 23.41, 0, 8], [24.98, 27.98, 3, 8], [33.49, 36.49, 3, 8], [42.33, 45.33, 3, 8]];
  extWall(g, 'x', [16.52, 48.4], EXT.S, +1, Y, southHoles, { trim: [0, ST] });
  // Sunken living wing (walls rise from the sunken slab to the parapet)
  const WY = [WING_SIDING_FROM, LV.WING_TOP], wingOpts = { sidingFrom: WING_SIDING_FROM, sidingMat: 'sidingWood' };
  extWall(g, 'z', [17.39, 26.55], [1.66, 2.51], -1, WY, [], { ...wingOpts, lap: [0, 0.85 - ST] });
  extWall(g, 'x', [1.66, 17.37], [26.55, 27.4], +1, WY, [[3.01, 8.02, 0, 8]], { ...wingOpts, trim: [ST, ST] });              // W08
  extWall(g, 'z', [17.39, 26.55], [16.52, 17.37], +1, WY, [[23.55, 26.55, 0, 8]], { ...wingOpts, lap: [0, 0.85 - ST] });          // W09
  // parapet coping (dark metal) on the wing walls
  const cp = [LV.WING_TOP, LV.WING_TOP + 0.08];
  box(g, [1.6, 2.57], cp, [17.39, 27.46], 'frame');
  box(g, [1.6, 17.43], cp, [26.49, 27.46], 'frame');
  box(g, [16.46, 17.43], cp, [17.39, 26.49], 'frame');

  // Glazing
  const clipG = { clip: [-99, LV.LOFT] };
  glazing(g, 'x', EXT.N, -1, [11.41, 14.42], [0, 11], { h: [3, 8], ...clipG });  // W06: fixed lower, casement middle, fixed upper
  glazing(g, 'x', EXT.N, -1, [17.24, 20.24], [5, 11], clipG);                   // W12
  glazing(g, 'x', EXT.N, -1, [24.62, 27.62], [0, 8], { h: [3] });               // W05 casement upper
  glazing(g, 'x', EXT.N, -1, [35.72, 38.73], [4, 8], { trim: false });          // W14 (tiled shower surround)
  glazing(g, 'z', EXT.W, -1, [2.61, 5.61], [3, 11], { h: [8], ...clipG });     // W07 casement lower / fixed upper, split at the 8' ledge
  glazing(g, 'z', EXT.W, -1, [11.95, 13.2], [0, 8], { trim: { right: false, top: false } }); // W13 sidelight
  { const n0 = g.children.length;                                                   // Door 102 (full lite, in-swing), hinged at 16.2
    glazing(g, 'z', EXT.W, -1, [13.2, 16.2], [0, 8], { door: true, trim: false });
    extLevers(g, 'z', 13.28, -0.04, 0.24, 3.0, -1);          // latch stile at z 13.2–13.36; frame faces at x −0.04 (out) and 0.24 (in)
    const pv = pivotFrom(g, n0, 0.1, 0, 16.12);
    act(pv, { kind: 'door', label: d => d.on ? 'Close side door' : 'Open side door', run: d => tweenTo(pv.rotation, 'y', d.on ? -1.45 : 0, 0.9) }); }
  glazingTrim(g, 'z', EXT.W, -1, [13.2, 16.2], [0, 8], { trim: { left: false, top: false, bottom: false } });
  glazing(g, 'z', EXT.W, -1, [11.95, 16.2], [8, 11], { ...clipG, trim: { bottom: false } }); // W15 transom: one undivided 4'-3" × 3'-0" pane (A201 west elev.)
  glazing(g, 'z', EXT.E, +1, [4.11, 7.11], [3, 8]);                             // W03
  glazing(g, 'z', EXT.E, +1, [11.54, 16.54], [3, 8]);                           // W04
  { const n0 = g.children.length;                                                   // Door 101 (full lite, in-swing), hinged at 18.11
    glazing(g, 'x', EXT.S, +1, [18.11, 21.3], [0, 8], { door: true, trim: false });
    extLevers(g, 'x', 21.22, 17.09, 16.81, 3.0, +1);         // latch stile at x 21.14–21.3; frame faces at z 17.09 (out) and 16.81 (in)
    const pv = pivotFrom(g, n0, 18.19, 0, 16.95);
    act(pv, { kind: 'door', label: d => d.on ? 'Close front door' : 'Open front door', run: d => tweenTo(pv.rotation, 'y', d.on ? 1.45 : 0, 0.9) }); }
  glazingTrim(g, 'x', EXT.S, +1, [18.11, 21.3], [0, 8], { trim: { right: false, bottom: false } });
  glazing(g, 'x', EXT.S, +1, [21.3, 23.41], [0, 8], { trim: { left: false } });  // W01 sidelight
  glazing(g, 'x', EXT.S, +1, [24.98, 27.98], [3, 8]);                           // W02
  glazing(g, 'x', EXT.S, +1, [33.49, 36.49], [3, 8]);                           // W02
  glazing(g, 'x', EXT.S, +1, [42.33, 45.33], [3, 8]);                           // W03
  glazing(g, 'x', [26.55, 27.4], +1, [3.01, 8.02], [0, 8]);                     // W08
  glazing(g, 'z', [16.52, 17.37], +1, [23.55, 26.55], [0, 8]);                  // W09
  // exterior door hardware (pulls) — 101 and 102
  // (door pulls are built with their doors above, so they swing with them)
  // light switch inside the front door: at night it runs "lights out" through the house (and back on)
  { const sw = new THREE.Group(); g.add(sw);
    const plate = box(sw, [23.62, 23.9], [3.85, 4.3], [16.515, 16.54], 'porcelain');
    box(sw, [23.72, 23.8], [3.98, 4.17], [16.5, 16.515], 'porcelain');
    act(sw, { kind: 'lights', label: d => state.night ? (LIGHTS_OUT.off ? 'Lights on' : 'Lights out') : 'Switch to night', run: d => MODES.lightsOut() }); }
  // porch column at the entry deck (A101.1)
  cyl(g, [23.0, 27.0], [-0.167, 8.2], 0.22, 'steel');

  // Interior partitions (0 → 8'-0")
  const H = [0, LV.CEIL1];
  intWall(g, 'z', [0.52, 9.3], [16.52, 16.96], [0, LV.CEIL1]);                   // kitchen | stair (loft slab above)
  intWall(g, 'z', [0.52, 13.54], [24.16, 24.55], H);                              // entry | guest bed (103 pocket south of here)
  intWall(g, 'x', [24.55, 33.4], [13.14, 13.54], H, [[25.2, 27.9, 0, 8]]);       // bed | corridor, door 104
  intWall(g, 'z', [10.81, 13.14], [28.06, 28.45], H);                             // closet 105 west
  intWall(g, 'z', [0.52, 13.54], [32.86, 33.4], H);                               // bed | bath
  intWall(g, 'x', [33.4, 38.77], [13.14, 13.54], H, [[33.65, 36.32, 0, 8]]);     // bath | corridor, door 106
  intWall(g, 'z', [0.52, 13.54], [38.77, 39.31], H);                              // bath | office (107 pocket south)
  intWall(g, 'x', [45.16, 47.56], [7.14, 7.53], H);                               // office closet N
  intWall(g, 'x', [45.16, 47.56], [11.14, 11.54], H);                             // office closet S
  intWall(g, 'z', [7.53, 11.14], [45.16, 45.51], H, [[8.0, 10.7, 0, 8]]);        // office closet W, door 108

  // Doors
  doorLeaf(g, { axis: 'x', u: [25.2, 27.9], face: 13.14, swing: -1, hinge: 'a', y0: 0, h: 8, wt: 0.4 });          // 104
  doorLeaf(g, { axis: 'x', u: [33.65, 36.32], face: 13.14, swing: -1, hinge: 'a', y0: 0, h: 8, wt: 0.4 });        // 106
  doorLeaf(g, { axis: 'z', u: [8.0, 10.7], face: 45.16, swing: -1, hinge: 'a', y0: 0, h: 8, open: 0, wt: 0.35 });           // 108
  pocketDoor(g, { axis: 'z', u: [13.54, 16.54], c: 24.355, t: 0.39, y0: 0, h: 8, slide: -1, open: true, glazed: true });      // 103 pocket (entry | corridor)
  pocketDoor(g, { axis: 'z', u: [13.54, 16.54], c: 39.04, t: 0.54, y0: 0, h: 8, slide: -1, open: true });                      // 107 pocket (corridor | office)
  { // 105 bifold: two pairs of panels, hinged at the jambs, each pair folding in a zigzag into the room
    const xa = 28.45, xb = 32.86, zc = 10.84, w = (xb - xa) / 4 - 0.01, th = 0.12, hh = 8, grp = new THREE.Group(); g.add(grp);
    const panel = (parent, dir) => {                                                  // a panel hanging from a pivot, extending dir (+1 east, -1 west)
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, th).translate(dir * w / 2, hh / 2, 0), M('door')); m.castShadow = m.receiveShadow = true;
      m.userData.cutAxis = 'x'; parent.add(m);
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.45, 0.02).translate(dir * (w - 0.1), 3.4, th / 2 + 0.01), M('lever')); pull.userData.cutAxis = 'x'; parent.add(pull);
      return m;
    };
    const pairs = [];
    for (const [xj, dir] of [[xa, 1], [xb, -1]]) {
      const pa = new THREE.Group(), pb = new THREE.Group(); pa.position.set(xj, 0, zc); pb.position.set(dir * w, 0, 0);
      panel(pa, dir); panel(pb, dir); pa.add(pb); grp.add(pa); pairs.push([pa, pb, dir]);
    }
    act(grp, { kind: 'door', label: d => d.on ? 'Close the closet doors' : 'Open the closet doors', run: d => {
      for (const [pa, pb, dir] of pairs) { tweenTo(pa.rotation, 'y', d.on ? dir * 1.15 : 0, 0.9); tweenTo(pb.rotation, 'y', d.on ? -dir * 2.3 : 0, 0.9); }
    } });
  }

  // Electrical panel — revised: corridor face of the guest-closet wall, flush, centered
  const pcx = (28.06 + 32.86) / 2;
  box(g, [pcx - 0.6, pcx + 0.6], [3.75, 6.25], [13.54, 13.58], 'panel', { room: 'corridor', name: 'Electrical panel' });
  box(g, [pcx - 0.56, pcx + 0.56], [4.98, 5.0], [13.58, 13.59], 'steel', { room: 'corridor' });

  RT.NOCUT = true; buildKitchen(g); RT.NOCUT = true; buildStair(g); RT.NOCUT = false; buildStairCladding(g); buildLiving(g); buildGuestBath(g);
  // Guest bedroom: Custom oak Twin-over-Queen bunk bed in northeast corner
  RT.NOCUT = true; buildGuestBunkBed(g); buildOffice(g); RT.NOCUT = false;    // office: queen bed, headboard bookcase, north wall shelves, desk & chair
}

// Bed sized from the mattress: [w, l] in feet, headboard against the wall at zHead, centered on cx.
// Frame = mattress + 2" each side and at the foot; headboard 3" thick, 3'-7" high.
function bedSized(g, cx, zHead, [mw, ml], y, room) {
  const e = 2 / 12, hb = 0.25, x0 = cx - mw / 2, x1 = cx + mw / 2, z0 = zHead + hb, z1 = z0 + ml;
  box(g, [x0 - e, x1 + e], [y, y + 1.1], [zHead, z1 + e], 'millwork', { room });            // platform frame
  box(g, [x0, x1], [y + 1.1, y + 1.85], [z0, z1], 'porcelain', { room });                    // mattress
  box(g, [x0 + 0.05, x1 - 0.05], [y + 1.85, y + 1.95], [z0 + 1.9, z1 - 0.05], 'fabric', { room }); // throw
  box(g, [x0 - e, x1 + e], [y, y + 3.6], [zHead, zHead + hb], 'millwork', { room });        // headboard
}

// Guest bedroom: Minimalist standalone oak Twin-over-Queen bunk bed in the northeast corner
function buildGuestBunkBed(g) {
  const room = 'guestBed';
  const B = (xs, ys, zs, m = 'oak') => box(g, xs, ys, zs, m, { room });

  // Geometry:
  // North wall: z = 0.52 (head of bunk bed against north wall)
  // East wall: x = 32.86 (long side against solid dividing wall)
  // Lower Queen mattress: 60" wide (5.0 ft) × 80" long (6.67 ft)
  // Upper Twin mattress: 38" wide (3.17 ft) × 75" long (6.25 ft)
  const xWall = 32.86, zWall = 0.52;
  const e = 0.12, pw = 0.20, ph = 5.85;

  // Lower Queen mattress bounds (kept clear of headboard posts and W05):
  const qx1 = xWall - 0.10, qx0 = qx1 - 5.0;       // [27.76, 32.76]
  const qz0 = zWall + pw + 0.04, qz1 = qz0 + 6.67; // [0.76, 7.43]

  // Upper Twin mattress bounds (aligned against east side):
  const tx1 = xWall - 0.10, tx0 = tx1 - 3.17;      // [29.59, 32.76]
  const tz0 = qz0, tz1 = tz0 + 6.25;               // [0.76, 7.01]
  const fz0 = qz1 + e, fz1 = fz0 + pw;             // footboard z-span [7.55, 7.75]

  // --- 1. LOWER QUEEN PLATFORM (y = 0 to 1.76) ---
  B([qx0 - e, xWall], [0, 0.95], [zWall, fz1], 'oak'); // unified oak platform + footboard
  B([qx0, qx1], [0.95, 1.68], [qz0, qz1], 'porcelain'); // queen mattress
  B([qx0 + 0.05, qx1 - 0.05], [1.68, 1.76], [qz0 + 2.2, qz1 - 0.05], 'fabric'); // throw
  const qpw = 2.15, qph = 0.32, qpd = 1.35;
  B([qx0 + 0.25, qx0 + 0.25 + qpw], [1.68, 1.68 + qph], [qz0 + 0.15, qz0 + 0.15 + qpd], 'porcelain');
  B([qx1 - 0.25 - qpw, qx1 - 0.25], [1.68, 1.68 + qph], [qz0 + 0.15, qz0 + 0.15 + qpd], 'porcelain');
  // Unified headboard panel
  B([qx0 - e, xWall], [0.95, 3.60], [zWall, zWall + 0.16], 'oak');

  // --- 2. UPPER TWIN SUPPORT POSTS (standalone; SW post rises from middle of queen footboard) ---
  B([xWall - pw, xWall], [0, ph], [zWall, zWall + pw], 'oak');    // NE corner post
  B([xWall - pw, xWall], [0, ph], [fz0, fz1], 'oak');             // SE corner post
  B([tx0 - pw, tx0], [0.95, ph], [zWall, zWall + pw], 'oak');     // NW post (from headboard)
  B([tx0 - pw, tx0], [0.95, ph], [fz0, fz1], 'oak');              // SW post (from middle of queen footboard)

  // --- 3. UPPER TWIN BUNK (y = 4.25 to 5.85) ---
  B([tx0 - pw, xWall], [4.25, 4.45], [zWall, fz1], 'oak');        // support deck
  B([tx0 - pw, xWall], [4.45, 5.75], [zWall, zWall + 0.16], 'oak'); // upper headboard panel
  B([tx0, tx1], [4.45, 5.15], [tz0, tz1], 'porcelain');           // upper twin mattress
  B([tx0 + 0.05, tx1 - 0.05], [5.15, 5.22], [tz0 + 1.6, tz1 - 0.05], 'fabric'); // throw
  B([tx0 + 0.50, tx1 - 0.50], [5.15, 5.45], [tz0 + 0.15, tz0 + 0.15 + qpd], 'porcelain'); // pillow
  // Solid minimalist low guardrail along open room side
  B([tx0 - pw, tx0 - pw + 0.08], [4.45, 5.75], [zWall + pw, fz0], 'oak');

  // --- 4. INTEGRATED FLUSH LADDER AT FOOT ---
  const lx0 = xWall - 1.35, lx1 = xWall - 0.30;
  B([lx0, lx0 + 0.08], [0, 4.45], [fz1, fz1 + 0.08], 'oak');
  B([lx1 - 0.08, lx1], [0, 4.45], [fz1, fz1 + 0.08], 'oak');
  for (let r = 0; r < 4; r++) {
    const ry = 0.90 + r * 0.90;
    B([lx0 + 0.08, lx1 - 0.08], [ry, ry + 0.08], [fz1, fz1 + 0.08], 'oak');
  }
}
// Office layout: built-in oak platform bed with drawers, rust/navy throw, floating shelves, leaning art,
// red reading lamp, textured wool rug, floating oak desk with conical lamp, and green/chrome chair.
function buildOffice(g) {
  const room = 'office';
  const B = (xs, ys, zs, m = 'millwork') => box(g, xs, ys, zs, m, { room });
  const makeTex = (w, h, draw, rough = 0.92) => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: t, roughness: rough });
  };
  const throwMat = makeTex(256, 256, (c, w, h) => {
    c.fillStyle = '#8f3f19'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#15253a';
    c.fillRect(0, 0, w, 34); c.fillRect(0, h - 38, w, 38);
    c.fillRect(68, 34, 48, h - 72);
    c.beginPath(); c.moveTo(116, 40); c.lineTo(w, 130); c.lineTo(w, 175); c.lineTo(116, 85); c.closePath(); c.fill();
    c.fillRect(150, 155, 106, 28);
  });
  const rugMat = makeTex(256, 256, (c, w, h) => {
    c.fillStyle = '#cfc3b2'; c.fillRect(0, 0, w, h);
    for (let y0 = 0; y0 < h; y0 += 4) for (let x0 = 0; x0 < w; x0 += 4) {
      c.fillStyle = ((x0 + y0) % 8 === 0) ? 'rgba(92,78,64,0.28)' : 'rgba(245,238,228,0.25)';
      c.fillRect(x0, y0, 3, 3);
    }
  }, 0.98);
  const artMat = makeTex(240, 160, (c, w, h) => {
    c.fillStyle = '#8cb1cc'; c.fillRect(0, 0, w, 78);                                                // sky
    c.fillStyle = '#5c7c46'; c.fillRect(0, 78, w, 82);                                               // meadow
    c.fillStyle = '#d8b848'; for (let x = 8; x < w; x += 14) c.fillRect(x, 96, 6, 46);              // wildflowers
    c.fillStyle = '#3d5a35'; c.fillRect(168, 42, 24, 62); c.fillRect(54, 58, 18, 36);               // cypresses
  }, 0.85);
  const greenChairM = new THREE.MeshStandardMaterial({ color: 0x355c35, roughness: 0.55 });
  const redLampM = new THREE.MeshStandardMaterial({ color: 0xa62a24, roughness: 0.4 });

  // 1. TWO LONG OAK FLOATING SHELVES along the north wall (y: 4.65 and 5.95)
  B([39.35, 47.52], [4.65, 4.74], [0.52, 1.25], 'oak');
  B([39.35, 47.52], [5.95, 6.04], [0.52, 1.25], 'oak');
  for (const bx of [39.7, 42.2, 44.7, 47.0]) {
    B([bx, bx + 0.05], [4.48, 4.65], [0.52, 1.18], 'steel');
    B([bx, bx + 0.05], [5.78, 5.95], [0.52, 1.18], 'steel');
  }
  // Books styled on the shelves (varied widths, heights & colors)
  const addBooks = (xStart, yBase, specs) => {
    let bx = xStart;
    for (const [w, h, m, tilt] of specs) {
      const bm = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.52), M(m));
      bm.position.set(bx + w / 2, yBase + h / 2, 0.85);
      if (tilt) bm.rotation.z = tilt;
      bm.castShadow = true; bm.userData = { room }; g.add(bm);
      bx += w + 0.025;
    }
  };
  addBooks(39.65, 6.04, [[0.14, 0.72, 'sage'], [0.11, 0.64, 'biscuit'], [0.15, 0.76, 'nautical'], [0.12, 0.68, 'burgundy'], [0.10, 0.60, 'fabric'], [0.14, 0.70, 'frame', -0.14]]);
  addBooks(42.20, 6.04, [[0.13, 0.68, 'nautical'], [0.11, 0.62, 'fabric'], [0.15, 0.74, 'burgundy'], [0.12, 0.65, 'sage'], [0.10, 0.58, 'biscuit']]);
  addBooks(40.10, 4.74, [[0.14, 0.70, 'burgundy'], [0.12, 0.64, 'fabric'], [0.11, 0.60, 'sage'], [0.15, 0.74, 'nautical'], [0.12, 0.62, 'biscuit', -0.16]]);
  addBooks(43.85, 4.74, [[0.13, 0.68, 'biscuit'], [0.14, 0.72, 'nautical'], [0.11, 0.60, 'burgundy']]);

  // 2. WRAP-AROUND OAK HEADBOARD LEDGE (north wall behind bed + east wall with open shelving south of the bed)
  B([39.35, 46.16], [0, 2.85], [0.52, 0.86], 'oak');                                                // north headboard ledge
  B([46.16, 47.56], [0, 2.85], [0.52, 5.45], 'oak');                                                // east headboard behind bed
  // Open shelving cubbies on the south end of the east headboard (z: 5.45..6.94, facing -X)
  B([46.12, 47.56], [2.78, 2.85], [5.45, 6.96], 'oak');                                             // top ledge
  B([46.16, 47.56], [0, 0.25], [5.45, 6.94], 'oak');                                                // base plinth
  B([46.16, 47.56], [0.25, 2.78], [5.45, 5.51], 'oak');                                             // north divider
  B([46.16, 47.56], [0.25, 2.78], [6.88, 6.94], 'oak');                                             // south end panel
  B([47.46, 47.56], [0.25, 2.78], [5.51, 6.88], 'millwork');                                        // back panel
  B([46.18, 47.46], [1.06, 1.12], [5.51, 6.88], 'oak');                                             // lower shelf
  B([46.18, 47.46], [1.92, 1.98], [5.51, 6.88], 'oak');                                             // upper shelf
  B([46.24, 47.35], [1.12, 1.72], [5.65, 6.45], 'nautical');                                        // books in lower cubby
  B([46.24, 47.35], [1.98, 2.62], [5.95, 6.72], 'burgundy');                                        // books in upper cubby
  // Framed landscape painting hung flat on the north wall above the headboard
  const fGroup = new THREE.Group();
  fGroup.position.set(41.25, 3.65, 0.56); fGroup.userData = { room };
  const fBack = new THREE.Mesh(new THREE.BoxGeometry(1.78, 1.22, 0.06), M('frame')); fBack.castShadow = true; fBack.userData = { room };
  const fArt = new THREE.Mesh(new THREE.PlaneGeometry(1.62, 1.06), artMat); fArt.position.z = 0.035; fArt.userData = { room };
  fGroup.add(fBack, fArt); g.add(fGroup);

  // Red articulated reading lamp seated solidly on the east headboard ledge in the NE corner
  const rlBase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.08, 14), redLampM);
  rlBase.position.set(46.52, 2.89, 0.88); rlBase.userData = { room }; g.add(rlBase);
  const rlArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.85, 8), redLampM);
  rlArm1.position.set(46.42, 3.30, 0.96); rlArm1.rotation.z = 0.22; rlArm1.userData = { room }; g.add(rlArm1);
  const rlShade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.28, 14), redLampM);
  rlShade.position.set(46.22, 3.62, 1.04); rlShade.rotation.z = 0.85; rlShade.userData = { room }; g.add(rlShade);

  // 3. BUILT-IN OAK PLATFORM BED WITH DRAWERS (x: 39.4..46.16, z: 0.86..5.45)
  const xh = 46.16, xm = xh - 80 / 12;
  const z0 = 0.90, z1 = z0 + 4.55;
  B([39.38, xh], [0.16, 1.12], [0.86, 5.55], 'oak');                                                // drawer box
  B([39.46, xh - 0.06], [0, 0.16], [0.92, 5.42], 'millwork');                                       // recessed toe-kick
  for (const dx of [41.62, 43.88]) B([dx, dx + 0.04], [0.18, 1.08], [5.54, 5.57], 'frame');         // drawer dividers
  // Mattress, crisp white bedding, 2 pillows, and rust/navy geometric throw
  B([xm, xh], [1.12, 1.86], [z0, z1], 'porcelain');
  const throwM = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.80, 4.62), throwMat);
  throwM.position.set(xm + 1.45, 1.50, (z0 + z1) / 2); throwM.castShadow = true; throwM.userData = { room }; g.add(throwM);
  B([xh - 1.5, xh - 0.15], [1.86, 2.20], [1.05, 2.95], 'porcelain');
  B([xh - 1.5, xh - 0.15], [1.86, 2.20], [3.15, 5.05], 'porcelain');

  // 4. TEXTURED OATMEAL WOOL AREA RUG
  const rug = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.03, 7.2), rugMat);
  rug.position.set(42.5, 0.015, 9.8); rug.receiveShadow = true; rug.userData = { room }; g.add(rug);

  // 5. FLOATING OAK DESK under east window (z: 11.62..16.46) + CONICAL PAPER LAMP
  B([45.55, 47.56], [2.42, 2.55], [11.62, 16.46], 'oak');
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.025, 8, 24), M('chrome'));
  ring.rotation.x = Math.PI / 2; ring.position.set(46.25, 2.58, 12.65); ring.userData = { room }; g.add(ring);
  const lStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8), M('chrome'));
  lStem.position.set(46.25, 2.94, 12.65); lStem.userData = { room }; g.add(lStem);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.72, 0.44, 24), creamMat);
  cone.position.set(46.25, 3.32, 12.65); cone.castShadow = true; cone.userData = { room }; g.add(cone);

  // 6. GREEN PLYWOOD & CHROME CHAIR
  const ch = new THREE.Group();
  ch.position.set(44.85, 0, 14.0); ch.rotation.y = -0.18; ch.userData = { room };
  const addC = (geo, mat, px, py, pz, rx = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.rotation.x = rx; m.castShadow = true; m.userData = { room }; ch.add(m);
  };
  for (const lx of [-0.58, 0.58]) for (const lz of [-0.55, 0.55])
    addC(new THREE.CylinderGeometry(0.035, 0.03, 1.42, 8), M('chrome'), lx, 0.71, lz);
  addC(new THREE.BoxGeometry(1.32, 0.10, 1.24), greenChairM, 0, 1.45, 0);                            // seat
  addC(new THREE.BoxGeometry(1.32, 0.85, 0.10), greenChairM, -0.58, 2.28, 0, 0);                    // backrest (facing +X desk)
  ch.children[ch.children.length - 1].rotation.y = Math.PI / 2;
  ch.children[ch.children.length - 1].position.set(-0.62, 2.28, 0);
  g.add(ch);
}
function bed(g, xs, zs, y, room) {
  box(g, xs, [y, y + 1.1], zs, 'millwork', { room });
  box(g, [xs[0] + 0.1, xs[1] - 0.1], [y + 1.1, y + 1.85], [zs[0] + 0.1, zs[1] - 0.1], 'porcelain', { room });
  box(g, [xs[0] + 0.15, xs[1] - 0.15], [y + 1.85, y + 1.95], [zs[0] + 2.0, zs[1] - 0.15], 'fabric', { room });
  box(g, xs, [y, y + 3.6], [zs[0], zs[0] + 0.25], 'millwork', { room });
}



export { extLevers, buildGround, bedSized, buildGuestBunkBed, buildOffice, bed };
