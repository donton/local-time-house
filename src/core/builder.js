// Scoped 3D architectural geometry builders (boxes, cylinders, prisms, sloped slabs, walls, windows, doors, mirrors).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { LV, EXT, LITE } from '../config/constants.js';
import { RT, FX_MIRRORS, WALL_DEFS, tweenTo, act } from './state.js';
import { M } from './materials.js';

/* =====================================================================
   3. GEOMETRY HELPERS (all inputs in feet, world-aligned)
   ===================================================================== */
// World-projected UVs so textures keep real-world scale on every face.
function worldUV(geo, tile) {
  const p = geo.attributes.position, n = geo.attributes.normal, uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = p.getX(i); v = p.getZ(i); }
    else if (ax >= az) { u = p.getZ(i); v = p.getY(i); }
    else { u = p.getX(i); v = p.getY(i); }
    uv.setXY(i, u / tile, v / tile);
  }
  uv.needsUpdate = true;
}


// P3: Adaptive resolution Reflector mirror helper with backing mirror box & fog overlay
export function addMirror(g, xFace, [y0, y1], [z0, z1], fogMat, room, floorKey, createReflector = true) {
  box(g, [xFace, xFace + 0.05], [y0, y1], [z0, z1], 'mirror', { room });
  if (!createReflector) return;
  const w = z1 - z0, h = y1 - y0, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  const res = LITE ? 256 : 384;
  const ref = new Reflector(new THREE.PlaneGeometry(w, h), { clipBias: 0.003, textureWidth: res, textureHeight: res, color: 0xd0dce2 });
  ref.position.set(xFace - 0.002, cy, cz); ref.rotation.y = -Math.PI / 2;
  ref.visible = false;
  ref.userData = { room, nocut: true, noMerge: true };
  g.add(ref);
  const fogMesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), fogMat);
  fogMesh.position.set(xFace - 0.005, cy, cz); fogMesh.rotation.y = -Math.PI / 2;
  fogMesh.visible = false; fogMesh.userData = { room, nocut: true, noMerge: true };
  g.add(fogMesh);
  FX_MIRRORS.push({ ref, fogMesh, fogMat, pos: [xFace, cy, cz], floorKey });
}

export function withNoCut(fn) {
  const prev = RT.NOCUT;
  RT.NOCUT = true;
  try { return fn(); } finally { RT.NOCUT = prev; }
}

export function withCutAxis(axis, fn) {
  const prev = RT.CUTAXIS;
  RT.CUTAXIS = axis;
  try { return fn(); } finally { RT.CUTAXIS = prev; }
}

function pivotFrom(parent, n0, px, py, pz) {
  const kids = parent.children.slice(n0), pv = new THREE.Group();
  pv.position.set(px, py, pz); parent.add(pv);
  for (const k of kids) { parent.remove(k); k.position.x -= px; k.position.y -= py; k.position.z -= pz; pv.add(k); }
  return pv;
}
   // while true, new meshes are exempt from the wall cutaway (stairs)
  // while set, new meshes are cut with the wall whose thin axis this is (glazing jambs, door leaves)
function addGeo(parent, geo, matName, opts = {}) {
  const m = M(matName);
  if (m.aoMap && !geo.attributes.uv1) {                   // box faces keep their own 0–1 UVs for the shading map; other shapes get a neutral value
    const uv = geo.attributes.uv;
    if (geo.type === 'BoxGeometry' || geo.userData.boxUV) geo.setAttribute('uv1', uv.clone());
    else geo.setAttribute('uv1', new THREE.BufferAttribute(new Float32Array(uv.count * 2).fill(0.5), 2));
  }
  worldUV(geo, m.userData.tile);
  const mesh = new THREE.Mesh(geo, m);
  mesh.castShadow = opts.cast ?? !m.transparent;
  mesh.receiveShadow = true;
  if (opts.room) mesh.userData.room = opts.room;
  if (opts.phase) mesh.userData.phase = opts.phase;
  if (opts.name) mesh.name = opts.name;
  if (RT.NOCUT) mesh.userData.nocut = true;
  if (RT.CUTAXIS) mesh.userData.cutAxis = RT.CUTAXIS;
  parent.add(mesh);
  return mesh;
}
function box(parent, [x0, x1], [y0, y1], [z0, z1], matName, opts) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return addGeo(parent, g, matName, opts);
}
// Box with softly rounded edges (cabinet fronts): the bevel catches light, so edges read instead of vanishing.
function rbox(parent, [x0, x1], [y0, y1], [z0, z1], matName, opts, r = 0.004) {
  const g = new RoundedBoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 2, r);
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); g.userData.boxUV = true;
  return addGeo(parent, g, matName, opts);
}
function cyl(parent, [x, z], [y0, y1], r, matName, opts) {
  const g = new THREE.CylinderGeometry(r, r, y1 - y0, 20);
  g.translate(x, (y0 + y1) / 2, z);
  return addGeo(parent, g, matName, opts);
}
// Extruded polygon in a wall plane. axis 'x': wall runs along x, pts=[x,y], thickness in z.
// axis 'z': wall runs along z, pts=[z,y], thickness in x.
function prism(parent, axis, pts, [w0, w1], matName, opts) {
  const shape = new THREE.Shape(pts.map(([u, y]) => new THREE.Vector2(axis === 'x' ? u : -u, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: w1 - w0, bevelEnabled: false });
  if (axis === 'x') g.translate(0, 0, w0); else { g.rotateY(Math.PI / 2); g.translate(w0, 0, 0); }
  return addGeo(parent, g, matName, opts);
}
// Roof slab whose TOP surface runs from (zA,yA) to (zB,yB), spanning x0..x1, perpendicular thickness t.
function slopedSlab(parent, [x0, x1], [zA, yA], [zB, yB], t, matName, opts) {
  const dz = zB - zA, dy = yB - yA, L = Math.hypot(dz, dy);
  let nz = -dy / L, ny = dz / L; if (ny < 0) { nz = -nz; ny = -ny; }
  const g = new THREE.BoxGeometry(x1 - x0, t, L);
  g.rotateX(-Math.atan2(dy, dz));
  g.translate((x0 + x1) / 2, (yA + yB) / 2 - ny * t / 2, (zA + zB) / 2 - nz * t / 2);
  return addGeo(parent, g, matName, opts);
}

/* Wall builder.
   w = { axis, u:[u0,u1], t:[w0,w1], y:[y0,y1], holes:[[u0,u1,y0,y1],...], layers:[{t:[a,b], m, y0?}], top?:fn(u) }
   Splits the wall around rectangular holes; pieces that reach the wall top follow top(u) when given. */
function buildWall(parent, w) {
  WALL_DEFS.push({ parentName: parent.name, axis: w.axis, u: [...w.u], t: [...w.t], y: [...w.y], holes: (w.holes || []).map(h => [...h]), top: w.top, isExt: w.layers.length > 1 });
  const holes = (w.holes || []).filter(h => h[1] > w.u[0] && h[0] < w.u[1] && h[3] > w.y[0] && h[2] < w.y[1]);
  const cuts = new Set([w.u[0], w.u[1]]);
  holes.forEach(h => { cuts.add(Math.max(w.u[0], h[0])); cuts.add(Math.min(w.u[1], h[1])); });
  const us = [...cuts].sort((a, b) => a - b);
  for (let i = 0; i < us.length - 1; i++) {
    const a = us[i], b = us[i + 1]; if (b - a < 1e-3) continue;
    const mid = (a + b) / 2;
    let ranges = [[w.y[0], w.y[1]]];
    holes.filter(h => h[0] <= mid && h[1] >= mid).forEach(h => {
      ranges = ranges.flatMap(([r0, r1]) => {
        if (h[3] <= r0 || h[2] >= r1) return [[r0, r1]];
        const out = []; if (h[2] > r0) out.push([r0, h[2]]); if (h[3] < r1) out.push([h[3], r1]); return out;
      });
    });
    for (const [r0, r1] of ranges) {
      if (r1 - r0 < 1e-3) continue;
      const followTop = w.top && Math.abs(r1 - w.y[1]) < 1e-6;
      for (const L of w.layers) {
        const y0 = Math.max(r0, L.y0 ?? -Infinity); if (r1 - y0 < 1e-3) continue;
        const la = Math.max(a, L.u ? L.u[0] : -Infinity), lb = Math.min(b, L.u ? L.u[1] : Infinity);
        if (lb - la < 1e-3) continue;
        const pts = [[la, y0], [lb, y0]];
        if (followTop) {
          const steps = Math.max(1, Math.ceil((lb - la) / 0.5));
          for (let s = steps; s >= 0; s--) { const u = la + (lb - la) * s / steps; pts.push([u, Math.max(y0 + 0.01, Math.min(r1, w.top(u)))]); }
        } else { pts.push([lb, r1], [la, r1]); }
        prism(parent, w.axis, pts, L.t, L.m, { room: w.room });
      }
    }
  }
}
const SIDING_T = 0.25;
// Exterior wall: siding layer on the outside, chalk core inside. out = -1 → outside at t[0].
// Corners lap like real cladding: the wall that runs through a corner pulls its core back by SIDING_T
// (opts.trim = [atStart, atEnd]), and the wall that butts into it runs its siding on past its own end to
// meet the other wall's siding (opts.lap = [atStart, atEnd], in feet). No chalk end grain, no doubled faces.
function extWall(parent, axis, u, t, out, y, holes, opts = {}) {
  const sid = out < 0 ? [t[0], t[0] + SIDING_T] : [t[1] - SIDING_T, t[1]];
  const core = out < 0 ? [t[0] + SIDING_T, t[1]] : [t[0], t[1] - SIDING_T];
  const [ta, tb] = opts.trim || [0, 0], [la, lb] = opts.lap || [0, 0];
  buildWall(parent, { axis, u: [u[0] - la, u[1] + lb], t, y, holes, top: opts.top,
    layers: [{ t: sid, m: opts.sidingMat || 'siding', y0: opts.sidingFrom }, { t: core, m: opts.coreMat || 'chalk', u: [u[0] + ta, u[1] - tb] }] });
}
// Lap distances: from a butting wall's end to the through-wall's siding/core seam.
const LAP_N = (EXT.N[1] - EXT.N[0]) - SIDING_T, LAP_S = (EXT.S[1] - EXT.S[0]) - SIDING_T, ST = SIDING_T;
function intWall(parent, axis, u, t, y, holes = [], opts = {}) {
  buildWall(parent, { axis, u, t, y, holes, top: opts.top, room: opts.room, layers: [{ t, m: opts.m || 'chalk' }] });
}

function glazing(parent, axis, ...rest) {
  RT.CUTAXIS = axis === 'x' ? 'z' : 'x';
  try { return glazingRaw(parent, axis, ...rest); } finally { RT.CUTAXIS = null; }
}
function doorLeaf(parent, o) {
  RT.CUTAXIS = o.axis === 'x' ? 'z' : 'x';
  try { return doorLeafRaw(parent, o); } finally { RT.CUTAXIS = null; }
}
/* Glazing (windows, glazed doors, sidelights): black frame + glass, set 0.24' behind the siding face (tucks inside the 0.25' siding so no chalk core shows).
   clip=[y0,y1] lets a tall unit be split between the ground and loft groups without a visible seam. */
function glazingRaw(parent, axis, wallT, out, [u0, u1], [y0, y1], { v = [], h = [], clip = [-99, 99], door = false, trim = true } = {}) {
  const fw = 0.16, depth = 0.28, recess = SIDING_T - 0.01;
  const wOuter = out < 0 ? wallT[0] : wallT[1];
  const wc = wOuter - out * (recess + depth / 2);
  const B = (ua, ub, ya, yb, m, d = depth) => {
    ya = Math.max(ya, clip[0]); yb = Math.min(yb, clip[1]); if (yb - ya < 1e-3) return;
    const mesh = axis === 'x' ? box(parent, [ua, ub], [ya, yb], [wc - d / 2, wc + d / 2], m, m === 'glass' ? { cast: false } : undefined)
                        : box(parent, [wc - d / 2, wc + d / 2], [ya, yb], [ua, ub], m, m === 'glass' ? { cast: false } : undefined);
    if (door) mesh.userData.passable = true;          // walk mode can pass through door leaves
    return mesh;
  };
  B(u0, u0 + fw, y0, y1, 'frame'); B(u1 - fw, u1, y0, y1, 'frame');
  B(u0, u1, y0, y0 + fw, 'frame'); B(u0, u1, y1 - fw, y1, 'frame');
  v.forEach(u => B(u - fw / 2, u + fw / 2, y0, y1, 'frame'));
  h.forEach(y => B(u0, u1, y - fw / 2, y + fw / 2, 'frame'));
  B(u0, u1, y0, y1, 'glass', 0.04);

  // Interior wood trim: full-depth jamb/head/sill linings + flat face casing with butt-jointed header
  if (trim) glazingTrim(parent, axis, wallT, out, [u0, u1], [y0, y1], { clip, trim });
}

function glazingTrim(parent, axis, wallT, out, [u0, u1], [y0, y1], { clip = [-99, 99], trim = true } = {}) {
  const tL = trim === true || trim.left !== false, tR = trim === true || trim.right !== false;
  const tT = trim === true || trim.top !== false,  tB = trim === true || trim.bottom !== false;
  const depth = 0.28, lin = 0.042, recess = SIDING_T - 0.01; // 1/2" border, flush with the interior wall face
  const wOuter = out < 0 ? wallT[0] : wallT[1];
  const wFrameIn = wOuter - out * (recess + depth);
  const wIn = out < 0 ? wallT[1] : wallT[0];
  const t0 = Math.min(wFrameIn, wIn), t1 = Math.max(wFrameIn, wIn);
  const T = (ua, ub, ya, yb) => {
    ya = Math.max(ya, clip[0]); yb = Math.min(yb, clip[1]);
    if (yb - ya < 1e-3 || ub - ua < 1e-3) return;
    return axis === 'x' ? box(parent, [ua, ub], [ya, yb], [t0, t1], 'windowTrim')
                        : box(parent, [t0, t1], [ya, yb], [ua, ub], 'windowTrim');
  };
  const yIn0 = y0 + (tB ? lin : 0), yIn1 = y1 - (tT ? lin : 0);
  if (tL) T(u0, u0 + lin, yIn0, yIn1);
  if (tR) T(u1 - lin, u1, yIn0, yIn1);
  if (tT) T(u0, u1, y1 - lin, y1);
  if (tB) T(u0, u1, y0, y0 + lin);
}

/* Interior door leaf. hinge 'a' = low-u jamb, 'b' = high-u jamb. swing = ±1 along the wall's thickness axis.
   face = the wall surface on the swing side. open = degrees (0 = closed). */
function doorLeafRaw(parent, { axis, u, face, swing, hinge = 'a', y0, h, open = 90, mat = 'door', wt = 0 }) {
  const width = Math.abs(u[1] - u[0]) - 0.05, th = 0.146;
  const hingeU = hinge === 'a' ? u[0] + 0.02 : u[1] - 0.02;
  const dirU = hinge === 'a' ? 1 : -1;
  const pivot = new THREE.Group();
  const geo = new THREE.BoxGeometry(axis === 'x' ? width : th, h, axis === 'x' ? th : width);
  if (axis === 'x') { geo.translate(dirU * width / 2, h / 2, swing * th / 2); pivot.position.set(hingeU, y0, face); pivot.rotation.y = -swing * dirU * THREE.MathUtils.degToRad(open); }
  else { geo.translate(swing * th / 2, h / 2, dirU * width / 2); pivot.position.set(face, y0, hingeU); pivot.rotation.y = swing * dirU * THREE.MathUtils.degToRad(open); }
  const mesh = new THREE.Mesh(geo, M(mat)); mesh.castShadow = mesh.receiveShadow = true;
  pivot.add(mesh);
  // hardware: three hinges at the hinge edge, a lever on each face at 3'-0", a strike plate edge
  const ca = axis === 'x' ? 'z' : 'x', hm = M('lever');
  for (const hy of [0.9, h / 2, h - 0.9]) {
    const hg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.2, 10), hm);
    hg.position.set(axis === 'x' ? 0 : swing * th, hy, axis === 'x' ? swing * th : 0); hg.userData.cutAxis = ca; pivot.add(hg);
  }
  const wl = dirU * (width - 0.22), ly = Math.min(3.0, h * 0.45);
  placeLever(pivot, axis, dirU, wl, ly, swing * th, swing);        // on the swing-side face
  placeLever(pivot, axis, dirU, wl, ly, 0, -swing);                // on the wall-side face
  parent.add(pivot);
  // casing & jamb linings: warm wood trim like the windows (2½" casing on both wall faces + jamb/head linings)
  if (wt) {
    const cw = 0.2, ct = 0.04, lin = 0.025, other = face - swing * wt, [ua, ub] = u[0] < u[1] ? [u[0], u[1]] : [u[1], u[0]];
    const [wa, wb] = face < other ? [face, other] : [other, face];
    const putJamb = (us, ys) => { const m = axis === 'x' ? box(parent, us, ys, [wa, wb], 'windowTrim') : box(parent, [wa, wb], ys, us, 'windowTrim'); m.userData.cutAxis = ca; };
    putJamb([ua, ua + lin], [y0, y0 + h]); putJamb([ub - lin, ub], [y0, y0 + h]); putJamb([ua, ub], [y0 + h - lin, y0 + h]);
    for (const [f, sg] of [[face, swing], [other, -swing]]) {
      const f1 = f + sg * ct, [fa, fb] = f < f1 ? [f, f1] : [f1, f];
      const put = (us, ys) => { const m = axis === 'x' ? box(parent, us, ys, [fa, fb], 'windowTrim') : box(parent, [fa, fb], ys, us, 'windowTrim'); m.userData.cutAxis = ca; };
      put([ua - cw, ua], [y0, y0 + h + cw]); put([ub, ub + cw], [y0, y0 + h + cw]); put([ua, ub], [y0 + h, y0 + h + cw]);
    }
  }
  const full = (axis === 'x' ? -swing * dirU : swing * dirU) * THREE.MathUtils.degToRad(open || 90);
  act(pivot, { kind: 'door', on: open > 0, label: d => d.on ? 'Close door' : 'Open door',
    run: d => tweenTo(pivot.rotation, 'y', d.on ? full : 0, 0.7) });
  return pivot;
}

/* Pocket door (CD set: solid core, 1¾", warm wood casing + split pocket jambs with visible track/pocket gaps, chrome edge & flush pulls).
   axis = the way the wall runs ('z' = a north-south wall); u = the opening along the wall; c / t = wall centre plane & thickness; slide = ±1. */
function pocketDoor(parent, { axis, u, c, t, y0, h, slide, open = false, mat = 'door', glazed = false }) {
  const ca = axis === 'x' ? 'z' : 'x', [ua, ub] = u, th = 0.146, width = ub - ua - 0.04, cw = 0.2, ct = 0.04, lin = 0.035;
  const B = (us, ys, ts, m) => { const mesh = axis === 'x' ? box(parent, us, ys, ts, m) : box(parent, ts, ys, us, m); mesh.userData.cutAxis = ca; return mesh; };
  // warm wood casing on both wall faces
  for (const sg of [-1, 1]) {
    const f0 = c + sg * t / 2, f1 = f0 + sg * ct, ts = f0 < f1 ? [f0, f1] : [f1, f0];
    B([ua - cw, ua], [y0, y0 + h + cw], ts, 'windowTrim'); B([ub, ub + cw], [y0, y0 + h + cw], ts, 'windowTrim'); B([ua - cw, ub + cw], [y0 + h, y0 + h + cw], ts, 'windowTrim');
  }
  // split head stops + dark recessed track slot in the center
  const slotA = c - th / 2 - 0.018, slotB = c + th / 2 + 0.018;
  B([ua, ub], [y0 + h - lin, y0 + h], [c - t / 2, slotA], 'windowTrim');
  B([ua, ub], [y0 + h - lin, y0 + h], [slotB, c + t / 2], 'windowTrim');
  B([ua, ub], [y0 + h - lin * 0.5, y0 + h], [slotA, slotB], 'frame');
  // strike jamb (solid wood) vs. pocket jamb (split wood strips leaving the open pocket gap in the middle)
  const [pj0, pj1] = slide < 0 ? [ua, ua + lin] : [ub - lin, ub];
  const [sj0, sj1] = slide < 0 ? [ub - lin, ub] : [ua, ua + lin];
  B([sj0, sj1], [y0, y0 + h], [c - t / 2, c + t / 2], 'windowTrim');
  B([pj0, pj1], [y0, y0 + h], [c - t / 2, slotA], 'windowTrim');
  B([pj0, pj1], [y0, y0 + h], [slotB, c + t / 2], 'windowTrim');
  const n0 = parent.children.length, x0 = ua + 0.02, x1 = x0 + width, yTop = y0 + h - lin - 0.015;
  if (glazed) {
    // slender oak stiles & rails framing a waffle-grid translucent glass panel
    const sw = 0.28, rh = 0.28;
    B([x0, x0 + sw], [y0, yTop], [c - th / 2, c + th / 2], 'windowTrim');
    B([x1 - sw, x1], [y0, yTop], [c - th / 2, c + th / 2], 'windowTrim');
    B([x0 + sw, x1 - sw], [y0, y0 + rh], [c - th / 2, c + th / 2], 'windowTrim');
    B([x0 + sw, x1 - sw], [yTop - rh, yTop], [c - th / 2, c + th / 2], 'windowTrim');
    B([x0 + sw, x1 - sw], [y0 + rh, yTop - rh], [c - 0.02, c + 0.02], 'waffleGlass');
  } else {
    B([x0, x1], [y0, yTop], [c - th / 2, c + th / 2], mat);                                                           // solid leaf (with 3/16" head clearance)
  }
  const lead = slide < 0 ? x1 : x0, pu = lead + slide * 0.14;                                                         // flush side pulls near leading edge
  const pullY = glazed ? [y0 + 2.65, y0 + 3.55] : [y0 + 2.75, y0 + 3.4];
  const pullW = glazed ? 0.035 : 0.06, pullMat = glazed ? 'diningWood' : 'lever';
  for (const sg of [-1, 1]) B([pu - pullW, pu + pullW], pullY, sg > 0 ? [c + th / 2, c + th / 2 + 0.012] : [c - th / 2 - 0.012, c - th / 2], pullMat);
  const edgeOut = slide < 0 ? [lead, lead + 0.016] : [lead - 0.016, lead];                                          // realistic chrome edge pull on the leading stile
  B(edgeOut, [y0 + 2.85, y0 + 3.30], [c - 0.036, c + 0.036], 'lever');
  const pv = pivotFrom(parent, n0, 0, 0, 0), key = axis === 'x' ? 'x' : 'z', dist = slide * (width - 0.10);        // leaves ~1.2" + edge pull accessible in pocket slot
  pv.traverse(o => { o.userData.cutAxis = ca; });
  if (open) pv.position[key] = dist;
  act(pv, { kind: 'door', on: open, label: d => d.on ? 'Slide the door shut' : 'Slide the door open', run: d => tweenTo(pv.position, key, d.on ? dist : 0, 0.8) });
  return pv;
}

/* Lever handle set: round rose + neck + lever bar, built so +z is out of the leaf face and the bar points +x
   (toward the hinge once placed). Matte black like the window frames. */
function leverGroup(bar = 0.44) {
  const mat = M('lever'), gr = new THREE.Group();
  const add = (geo, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; gr.add(m); return m; };
  add(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 24).rotateX(Math.PI / 2), 0, 0, 0.01);          // rose
  add(new THREE.CylinderGeometry(0.018, 0.018, 0.075, 12).rotateX(Math.PI / 2), 0, 0, 0.055);         // neck
  add(new THREE.BoxGeometry(bar, 0.032, 0.034), bar / 2 - 0.03, 0, 0.095);                            // lever
  add(new THREE.SphereGeometry(0.019, 10, 8), bar - 0.03, 0, 0.095);                                  // rounded tip
  return gr;
}
// place a lever on a face of a door pivot. axis/dirU/w/t as in doorLeafRaw (w = along the leaf from the hinge, t = face offset)
function placeLever(pivot, axis, dirU, w, y, t, nrm) {
  const gr = leverGroup();
  if (axis === 'x') { gr.position.set(w, y, t); gr.rotation.y = nrm > 0 ? 0 : Math.PI; gr.scale.x = -dirU * nrm; }
  else { gr.position.set(t, y, w); gr.rotation.y = nrm > 0 ? Math.PI / 2 : -Math.PI / 2; gr.scale.x = dirU * nrm; }
  gr.traverse(o => { o.userData.cutAxis = axis === 'x' ? 'z' : 'x'; });
  pivot.add(gr); return gr;
}



// Horizontal polygon slab: pts = [[x,z],...], extruded from y0 to y1.
function hslab(parent, pts, [y0, y1], matName, opts) {
  const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0);
  return addGeo(parent, g, matName, opts);
}
// Round bar between two points (handrails).
function rod(parent, a, b, r, matName, opts) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A);
  const g = new THREE.CylinderGeometry(r, r, d.length(), 14);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()));
  const m = A.clone().add(B).multiplyScalar(0.5); g.translate(m.x, m.y, m.z);
  return addGeo(parent, g, matName, opts);
}

// Wood wall panel cladding (A402 "WOOD WALL PANEL", A402.1 axonometrics): a thin layer on a wall face, cut around openings.
function clad(g, axis, u, face, dir, y, holes = [], room) {
  const t = dir > 0 ? [face, face + 0.05] : [face - 0.05, face];
  buildWall(g, { axis, u, t, y, holes, room, layers: [{ t, m: 'woodPanel' }] });
}


export { worldUV, pivotFrom, addGeo, box, rbox, cyl, prism, slopedSlab, buildWall, SIDING_T, ST, extWall, LAP_N, LAP_S, intWall, glazing, doorLeaf, glazingRaw, glazingTrim, doorLeafRaw, pocketDoor, leverGroup, placeLever, hslab, rod, clad, WALL_DEFS };
