// Reform BASIS kitchen cabinetry, appliances, island, dining furniture, and stocked 3D interior items.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LV, EXT, DINING_CENTER } from '../config/constants.js';
import { RT, tweenTo, act } from '../core/state.js';
import { C, M } from '../core/materials.js';
import { addGeo, box, rbox, cyl, prism, rod, pivotFrom } from '../core/builder.js';
import { G } from './site-and-floors.js';

/* =====================================================================
   KITCHEN CONTENTS — real things inside the cabinets, drawers, dishwasher and fridge.
   Items are built per container and merged by material (a bag), so a full kitchen is a few dozen draw calls.
   ===================================================================== */
class Bag {
  constructor() { this.m = new Map(); }
  add(g, mat) { let a = this.m.get(mat); if (!a) this.m.set(mat, a = []); a.push(g); }
  flush(parent, { keep = false, cutAxis = null } = {}) {
    for (const [mat, list] of this.m) {
      const geo = list.length === 1 ? list[0] : mergeGeometries(list, false);
      const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = true; mesh.castShadow = false;
      mesh.userData.room = 'kitchen'; mesh.userData.phase = 'furniture'; if (keep) mesh.userData.keep = true; if (cutAxis) mesh.userData.cutAxis = cutAxis;
      parent.add(mesh);
    }
    this.m.clear();
  }
}
const KMAT = {};
const km = (k, color, rough = 0.6, metal = 0, o) => KMAT[k] || (KMAT[k] = Object.assign(new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal }), o || {}));
const kGlass = () => km('glass', 0xD7EAF0, 0.05, 0, { transparent: true, opacity: 0.38, depthWrite: false });
const kSteel = () => km('steelI', 0xB9BDC0, 0.3, 0.85);
const kBlack = () => km('blkI', 0x2B2B2D, 0.6);
// frame for placing items inside a container: u runs along the run, d is depth in from the front plane, local +z faces the front
function kframe(along, face, dir) {
  return { rot: along === 'x' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2),
           xz: (u, d) => along === 'x' ? [u, face - dir * d] : [face - dir * d, u] };
}
function Emit(bag, fr) {
  const o = { u: 0, d: 0, y: 0 };
  const E = {
    at(u, d, y) { o.u = u; o.d = d; o.y = y; return E; },
    put(g, mat) { g.rotateY(fr.rot); const [x, z] = fr.xz(o.u, o.d); g.translate(x, o.y, z); bag.add(g, mat); },
    cyl(mat, ox, oy, oz, rt, rb, h, seg = 16) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(ox, oy + h / 2, oz); E.put(g, mat); },
    box(mat, ox, oy, oz, w, h, dd) { const g = new THREE.BoxGeometry(w, h, dd); g.translate(ox, oy + h / 2, oz); E.put(g, mat); },
    sph(mat, ox, oy, oz, r, sx = 1, sy = 1, sz = 1) { const g = new THREE.SphereGeometry(r, 12, 8); g.scale(sx, sy, sz); g.translate(ox, oy, oz); E.put(g, mat); },
    tor(mat, ox, oy, oz, R, t) { const g = new THREE.TorusGeometry(R, t, 6, 14); g.translate(ox, oy, oz); E.put(g, mat); },
    rodZ(mat, ox, oy, oz, r, len) { const g = new THREE.CylinderGeometry(r, r, len, 8); g.rotateX(Math.PI / 2); g.translate(ox, oy, oz); E.put(g, mat); },
    rodX(mat, ox, oy, oz, r, len) { const g = new THREE.CylinderGeometry(r, r, len, 8); g.rotateZ(Math.PI / 2); g.translate(ox, oy, oz); E.put(g, mat); },
  };
  return E;
}
// Items. w = footprint along the shelf, d = default depth of its centre from the front. Origin = centre of the base.
const I = {
  plates: (n, r = 0.43) => ({ w: 2 * r + 0.05, d: r + 0.12, make: E => { const m = km('porc', 0xF1EFE8, 0.28); for (let k = 0; k < n; k++) E.cyl(m, 0, k * 0.042, 0, r, r - 0.07, 0.04, 24); } }),
  bowls: n => ({ w: 0.66, d: 0.42, make: E => { const m = km('bowl', 0xE3DED2, 0.3); for (let k = 0; k < n; k++) E.cyl(m, 0, k * 0.105, 0, 0.3, 0.17, 0.1, 20); } }),
  mugs: n => ({ w: n * 0.32, d: 0.3, make: E => { const ms = [km('mugA', 0xD9C7A5, 0.5), km('mugB', 0x7C8F7A, 0.5), km('mugC', 0xB4533C, 0.5)];
    for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.32, m = ms[k % 3]; E.cyl(m, x, 0, 0, 0.125, 0.11, 0.3, 14); E.tor(m, x + 0.135, 0.16, 0, 0.07, 0.018); } } }),
  glasses: n => ({ w: n * 0.28, d: 0.3, make: E => { const m = kGlass(); for (let k = 0; k < n; k++) E.cyl(m, (k - (n - 1) / 2) * 0.28, 0, 0, 0.12, 0.095, 0.36, 14); } }),
  wine: n => ({ w: n * 0.3, d: 0.3, make: E => { const m = kGlass(); for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.3;
    E.cyl(m, x, 0, 0, 0.075, 0.075, 0.02, 12); E.cyl(m, x, 0.02, 0, 0.012, 0.012, 0.3, 6); E.cyl(m, x, 0.32, 0, 0.11, 0.06, 0.3, 14); } } }),
  cans: (n, c0 = 0xB23A32, c1 = 0xD9B13B) => ({ w: n * 0.3, d: 0.3, make: E => { const a = km('canA' + c0, c0, 0.4, 0.4), b = km('canB' + c1, c1, 0.4, 0.4);
    for (let k = 0; k < n; k++) E.cyl(k % 2 ? b : a, (k - (n - 1) / 2) * 0.3, 0, 0, 0.14, 0.14, 0.36, 14); } }),
  jars: n => ({ w: n * 0.4, d: 0.3, make: E => { const g = kGlass(), fills = [0xE3C474, 0xF1EBDD, 0xB5622C, 0x7A3E2B, 0xD9C7A5], lid = km('lid', 0x8A8F94, 0.3, 0.8);
    for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.4; E.cyl(km('fill' + (k % 5), fills[k % 5], 0.8), x, 0.02, 0, 0.15, 0.15, 0.38, 14); E.cyl(g, x, 0, 0, 0.17, 0.17, 0.5, 14); E.cyl(lid, x, 0.5, 0, 0.18, 0.18, 0.06, 14); } } }),
  boxes: n => ({ w: n * 0.58, d: 0.2, make: E => { const cs = [0xD64B3A, 0xE8B23C, 0x3F7CAC, 0x7BAA5B]; for (let k = 0; k < n; k++) E.box(km('box' + (k % 4), cs[k % 4], 0.8), (k - (n - 1) / 2) * 0.58, 0, 0, 0.5, 0.85, 0.2); } }),
  bottles: n => ({ w: n * 0.24, d: 0.25, make: E => { const cs = [0x3B6E4A, 0x8B5A2B, 0xCDB45B];
    for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.24, m = km('bot' + (k % 3), cs[k % 3], 0.25, 0.1); E.cyl(m, x, 0, 0, 0.09, 0.09, 0.45, 12); E.cyl(m, x, 0.45, 0, 0.035, 0.05, 0.2, 10); E.cyl(kBlack(), x, 0.65, 0, 0.04, 0.04, 0.03, 10); } } }),
  books: n => { const ws = Array.from({ length: n }, (_, k) => 0.09 + ((k * 37) % 5) * 0.012), tot = ws.reduce((a, b) => a + b + 0.005, 0);
    return { w: tot, d: 0.4, make: E => { const cs = [0xA8483A, 0x3B5B7A, 0xD9B867, 0x5B7B5A, 0x2E2E33, 0xB9A99A]; let x = -tot / 2;
      ws.forEach((w, k) => { E.box(km('bk' + (k % 6), cs[k % 6], 0.8), x + w / 2, 0, 0, w, 0.54 + ((k * 53) % 4) * 0.04, 0.5); x += w + 0.005; }); } }; },
  spices: n => ({ w: Math.ceil(n / 2) * 0.22, d: 0.3, make: E => { const caps = [0xB23A32, 0xD9B13B, 0x4F7A3E, 0x8B5A2B, 0x3B6EA8, 0xC9753F], g = kGlass();
    for (let k = 0; k < n; k++) { const x = (Math.floor(k / 2) - (Math.ceil(n / 2) - 1) / 2) * 0.22, z = (k % 2 ? -1 : 1) * 0.12; E.cyl(g, x, 0, z, 0.095, 0.095, 0.26, 10); E.cyl(km('cap' + (k % 6), caps[k % 6], 0.5), x, 0.26, z, 0.1, 0.1, 0.05, 10); } } }),
  pot: () => ({ w: 1.2, d: 0.62, make: E => { const s = kSteel(), b = kBlack(); E.cyl(s, 0, 0, 0, 0.5, 0.5, 0.5, 24); E.cyl(s, 0, 0.5, 0, 0.52, 0.52, 0.04, 24); E.cyl(b, 0, 0.54, 0, 0.04, 0.04, 0.06, 10);
    E.box(b, -0.56, 0.3, 0, 0.12, 0.04, 0.07); E.box(b, 0.56, 0.3, 0, 0.12, 0.04, 0.07); } }),
  saucepan: () => ({ w: 0.7, d: 1.05, make: E => { const s = kSteel(), b = kBlack(); E.cyl(s, 0, 0, 0, 0.32, 0.32, 0.36, 20); E.cyl(s, 0, 0.36, 0, 0.33, 0.33, 0.03, 20); E.cyl(b, 0, 0.39, 0, 0.03, 0.03, 0.05, 8); E.box(b, 0, 0.26, 0.6, 0.06, 0.04, 0.5); } }),
  pans: n => ({ w: 1.0, d: 1.02, make: E => { const s = kSteel(), b = kBlack(); for (let k = 0; k < n; k++) { E.cyl(s, 0, k * 0.13, 0, 0.46, 0.38, 0.12, 22); E.box(b, 0, k * 0.13 + 0.02, 0.74, 0.07, 0.05, 0.55); } } }),
  mixing: () => ({ w: 1.1, d: 0.6, make: E => { const a = km('mixA', 0xB9BDC0, 0.3, 0.8), b = km('mixB', 0xE6E1D6, 0.35); E.cyl(a, 0, 0, 0, 0.52, 0.3, 0.3, 22); E.cyl(b, 0, 0.3, 0, 0.42, 0.27, 0.24, 22); } }),
  platter: () => ({ w: 1.3, d: 0.65, make: E => { const m = km('plat', 0xEDEAE2, 0.3); for (let k = 0; k < 3; k++) E.cyl(m, 0, k * 0.05, 0, 0.62 - k * 0.02, 0.6 - k * 0.02, 0.04, 26); } }),
  bakingdish: () => ({ w: 0.9, d: 0.35, make: E => { const m = km('bake', 0xF2EFE8, 0.3), e = km('bakeIn', 0xD8D2C4, 0.5); E.box(m, 0, 0, 0, 0.85, 0.17, 0.55); E.box(e, 0, 0.17, 0, 0.7, 0.01, 0.42); E.box(m, 0, 0.19, 0, 0.88, 0.03, 0.58); } }),
  tins: n => ({ w: n * 0.34, d: 0.32, make: E => { const cs = [0x2F4A3A, 0xB88B4A, 0x7A2E2E, 0x3B5B7A]; for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.34, m = km('tin' + (k % 4), cs[k % 4], 0.4, 0.5); E.cyl(m, x, 0, 0, 0.15, 0.15, 0.38, 14); E.cyl(km('tinLid', 0xC9B38A, 0.4, 0.6), x, 0.38, 0, 0.155, 0.155, 0.04, 14); } } }),
  plant: () => ({ w: 0.6, d: 0.4, make: E => { const pot = km('terra', 0xC9753F, 0.8), soil = km('soil', 0x3B2A20, 1), leaf = km('leaf', 0x4F7A3E, 0.8);
    E.cyl(pot, 0, 0, 0, 0.2, 0.15, 0.3, 14); E.cyl(soil, 0, 0.29, 0, 0.19, 0.19, 0.02, 12);
    for (let k = 0; k < 6; k++) { const a = k * 1.05; E.sph(leaf, Math.cos(a) * 0.12, 0.4 + (k % 3) * 0.07, Math.sin(a) * 0.12, 0.1, 1, 1.4, 0.45); } } }),
  vase: () => ({ w: 0.4, d: 0.3, make: E => { const m = km('vase', 0xEFE6D2, 0.35); E.cyl(m, 0, 0, 0, 0.12, 0.17, 0.3, 16); E.cyl(m, 0, 0.3, 0, 0.07, 0.12, 0.22, 16); E.cyl(m, 0, 0.52, 0, 0.09, 0.07, 0.04, 16); } }),
  carton: () => ({ w: 0.42, d: 0.3, make: E => { E.box(km('milk', 0xF4F6F8, 0.5), 0, 0, 0, 0.34, 0.7, 0.32); E.box(km('milkTop', 0x3B6EA8, 0.5), 0, 0.7, 0, 0.18, 0.1, 0.18); E.box(km('milkBand', 0x3B6EA8, 0.5), 0, 0.3, 0.165, 0.3, 0.16, 0.005); } }),
  leftovers: n => ({ w: n * 0.6, d: 0.4, make: E => { const lids = [0x6FA3C7, 0xE9EEF1, 0x9DBF7A]; for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.6;
    E.box(km('tupW', 0xE9EEF1, 0.35, 0, { transparent: true, opacity: 0.7 }), x, 0, 0, 0.55, 0.2, 0.42); E.box(km('lid' + (k % 3), lids[k % 3], 0.4), x, 0.2, 0, 0.57, 0.03, 0.44); } } }),
  eggs: () => ({ w: 0.7, d: 0.35, make: E => { E.box(km('eggTray', 0xBFB4A0, 0.9), 0, 0, 0, 0.62, 0.04, 0.42); const m = km('egg', 0xEBD9BE, 0.5);
    for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) E.sph(m, (c - 2.5) * 0.095, 0.1, (r - 0.5) * 0.17, 0.05, 1, 1.25, 1); } }),
  condiments: n => ({ w: n * 0.2, d: 0.3, make: E => { const cs = [0xB23A32, 0xD9B13B, 0x7A4A2B, 0x4F7A3E]; for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.2, m = km('cond' + (k % 4), cs[k % 4], 0.45); E.cyl(m, x, 0, 0, 0.07, 0.07, 0.34, 10); E.cyl(kBlack(), x, 0.34, 0, 0.04, 0.04, 0.05, 8); } } }),
  yogurt: n => ({ w: n * 0.2, d: 0.3, make: E => { const lids = [0xD9577A, 0x6FA3C7, 0x9DBF7A]; for (let k = 0; k < n; k++) { const x = (k - (n - 1) / 2) * 0.2; E.cyl(km('yog', 0xF4F6F8, 0.5), x, 0, 0, 0.085, 0.07, 0.2, 10); E.cyl(km('yl' + (k % 3), lids[k % 3], 0.5), x, 0.2, 0, 0.088, 0.088, 0.02, 10); } } }),
  pitcher: () => ({ w: 0.5, d: 0.3, make: E => { const g = kGlass(); E.cyl(g, 0, 0, 0, 0.13, 0.12, 0.5, 14); E.cyl(km('juice', 0xE8A24A, 0.3), 0, 0.02, 0, 0.115, 0.105, 0.34, 14); E.tor(g, 0.17, 0.25, 0, 0.1, 0.014); } }),
  lettuce: () => ({ w: 0.5, d: 0.4, make: E => { E.sph(km('lettuce', 0x7FB05B, 0.8), 0, 0.22, 0, 0.22, 1, 0.9, 1); } }),
  apples: n => ({ w: n * 0.2, d: 0.35, make: E => { for (let k = 0; k < n; k++) E.sph(km('apple', 0xB5352E, 0.5), (k - (n - 1) / 2) * 0.2, 0.1, (k % 2) * 0.08, 0.1); } }),
  carrots: n => ({ w: 0.5, d: 0.35, make: E => { for (let k = 0; k < n; k++) E.rodZ(km('carrot', 0xE07B2B, 0.7), (k - (n - 1) / 2) * 0.07, 0.04, 0, 0.032, 0.6); } }),
  lemons: n => ({ w: n * 0.17, d: 0.35, make: E => { for (let k = 0; k < n; k++) E.sph(km('lemon', 0xE9D24A, 0.6), (k - (n - 1) / 2) * 0.17, 0.08, (k % 2) * 0.07, 0.08, 1, 0.8, 1.2); } }),
};
function layout(E, items, u0, u1, y, dd, force = false) {
  let c = u0 + 0.06;
  for (const it of items) { if (c + it.w > u1 - 0.04) continue; E.at(c + it.w / 2, force ? dd : (it.d ?? dd), y); it.make(E); c += it.w + 0.05; }
}
function fillShelves(g, fr, u0, u1, ys, specs, dd, opts, back) {
  const bag = new Bag(), E = Emit(bag, fr);
  specs.forEach((items, i) => { layout(E, items, u0, u1, ys[i], dd); if (back && back[i]) layout(E, back[i], u0, u1, ys[i], 1.25, true); });
  bag.flush(g, opts);
}
// Drawer contents. S = { u0, u1, y (floor), d0, d1 } in the drawer's own frame.
const DR = {
  cutlery(E, S) {
    const dm = (S.d0 + S.d1) / 2, um = (S.u0 + S.u1) / 2, tw = Math.min(S.u1 - S.u0 - 0.12, 2.0), dep = Math.min(S.d1 - S.d0 - 0.12, 1.15);
    const tray = km('tray', 0xC9B38A, 0.7), st = km('flat', 0xBFC3C6, 0.25, 0.9);
    E.at(um, dm, S.y); E.box(tray, 0, 0, 0, tw, 0.03, dep);
    for (const sg of [-1, 1]) { E.box(tray, sg * tw / 2, 0, 0, 0.025, 0.13, dep); E.box(tray, 0, 0, sg * dep / 2, tw, 0.13, 0.025); }
    for (let i = 1; i < 4; i++) E.box(tray, -tw / 2 + i * tw / 4, 0, 0, 0.02, 0.11, dep);
    for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) {
      const x = -tw / 2 + (c + 0.5) * tw / 4 + (k - 1.5) * 0.04;
      E.box(st, x, 0.03, 0.05, 0.026, 0.014, 0.6); E.box(st, x, 0.03, 0.42, 0.045, 0.012, c === 1 ? 0.28 : 0.18);
    }
  },
  utensils(E, S) {
    const dm = (S.d0 + S.d1) / 2, wood = km('woodI', 0xC49A63, 0.7), steel = km('flat', 0xBFC3C6, 0.25, 0.9), blk = kBlack();
    let u = S.u0 + 0.2;
    for (let k = 0; k < 4 && u < S.u1 - 0.55; k++, u += 0.22) { E.at(u, dm, S.y); E.rodZ(wood, 0, 0.02, -0.05, 0.016, 1.0); E.sph(wood, 0, 0.03, 0.5, 0.075, 1, 0.3, 1.5); }
    E.at((S.u0 + S.u1) / 2, S.d0 + 0.2, S.y); E.rodX(wood, 0, 0.07, 0, 0.07, Math.min(1.2, S.u1 - S.u0 - 0.5));
    E.at(S.u1 - 0.4, dm - 0.05, S.y); E.rodZ(blk, -0.05, 0.02, 0, 0.012, 0.85); E.rodZ(blk, 0.05, 0.02, 0, 0.012, 0.85); E.box(steel, -0.05, 0.02, 0.44, 0.045, 0.02, 0.2); E.box(steel, 0.05, 0.02, 0.44, 0.045, 0.02, 0.2);
  },
  pots(E, S) { layout(E, [I.pot(), I.saucepan(), I.pans(1)], S.u0, S.u1, S.y, 0); },
  pans(E, S) { layout(E, [I.pans(3), I.pans(2)], S.u0, S.u1, S.y, 0); },
  bakeware(E, S) {
    const dm = (S.d0 + S.d1) / 2, m = km('sheet', 0x555A5F, 0.5, 0.6), w = km('woodI', 0xC49A63, 0.7); let u = S.u0 + 0.15;
    for (let k = 0; k < 5 && u < S.u1 - 0.15; k++, u += 0.12) { E.at(u, dm, S.y); E.box(m, 0, 0, 0, 0.02, 0.7, 1.2); }
    for (let k = 0; k < 2 && u < S.u1 - 0.15; k++, u += 0.12) { E.at(u, dm, S.y); E.box(w, 0, 0, 0, 0.035, 0.65, 0.95); }
  },
  towels(E, S) {
    const dm = (S.d0 + S.d1) / 2, cs = [0xEDE5D4, 0x8FA58A, 0xC98A5E]; let u = S.u0 + 0.55;
    for (let k = 0; k < 2 && u < S.u1 - 0.5; k++, u += 1.05) { E.at(u, dm, S.y); for (let j = 0; j < 4; j++) E.box(km('towel' + ((k + j) % 3), cs[(k + j) % 3], 0.95), 0, j * 0.1, 0, 0.95, 0.1, 0.8); }
  },
  tupper(E, S) {
    const lids = [0x6FA3C7, 0xE9EEF1, 0x9DBF7A, 0xD9577A], tw = km('tupW', 0xE9EEF1, 0.35, 0, { transparent: true, opacity: 0.7 });
    for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
      const u = S.u0 + 0.32 + c * 0.56; if (u > S.u1 - 0.28) continue;
      const h = (c + r) % 2 ? 0.2 : 0.4; E.at(u, S.d0 + 0.32 + r * 0.55, S.y);
      E.box(tw, 0, 0, 0, 0.5, h, 0.44); E.box(km('lid' + ((c + r) % 4), lids[(c + r) % 4], 0.4), 0, h, 0, 0.52, 0.03, 0.46);
    }
    for (let c = 0; c < 5; c++) { const u = S.u0 + 0.2 + c * 0.12; if (u > S.u1 - 0.1) continue; E.at(u, S.d1 - 0.18, S.y); E.box(km('lid' + (c % 4), lids[c % 4], 0.4), 0, 0, 0, 0.02, 0.42, 0.4); }   // spare lids on edge
  },
  bin(E, S) {
    const bin = km('bin', 0x4A4D52, 0.6), bag = km('bag', 0xEDEDEA, 0.9); let u = S.u0 + 0.55;
    for (let k = 0; k < 2 && u < S.u1 - 0.4; k++, u += 1.05) { E.at(u, (S.d0 + S.d1) / 2, S.y); E.box(bin, 0, 0, 0, 0.95, 0.78, 1.15); E.box(bag, 0, 0.78, 0, 0.9, 0.03, 1.1); }
  },
  sponge(E, S) {
    const dm = (S.d0 + S.d1) / 2; E.at(S.u0 + 0.3, dm, S.y);
    E.box(km('spongeY', 0xE6D24A, 0.9), 0, 0, 0, 0.3, 0.07, 0.2); E.box(km('spongeG', 0x4F8A4B, 0.9), 0, 0.07, 0, 0.3, 0.03, 0.2);
    E.at(S.u0 + 0.8, dm, S.y); E.box(km('brush', 0xC49A63, 0.8), 0, 0, 0, 0.08, 0.06, 0.34); E.box(km('bristle', 0xE8E3D6, 0.9), 0, 0.06, 0.12, 0.08, 0.05, 0.1);
  },
  dishes(E, S) { layout(E, [I.plates(5, 0.38), I.bowls(4)], S.u0, S.u1, S.y, S.d0 + 0.5, true); layout(E, [I.plates(4, 0.38), I.mugs(3)], S.u0, S.u1, S.y, S.d1 - 0.5, true); },
};
function rrPath(p, x, y, w, h, r) {            // rounded rectangle path
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r); p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h); p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y); return p;
}

const KIT = { X0: 0.51, Z0: 0.52, PLINTH: 4.5 / 12, BOX: 34.5 / 12, TOP: 34.5 / 12 + 0.005 / 0.3048,   // 5 mm stainless top on the boxes
             UP: [65.25 / 12, 96 / 12], UPD: 15.8125 / 12 };
const kx = inch => KIT.X0 + inch / 12, kz = inch => KIT.Z0 + inch / 12;
function buildKitchen(g) {
  const R = { room: 'kitchen' }, G = 0.006, FT_ = 0.066;   // 1/16" reveal, ¾" front
  // BASIS round handle: a ≈1⅜" Ø finger hole through the front, lined in light natural oak,
  // set 2" in from the edges. Drawn as an oak ring around a light-oak recess, flush with the face.
  const KNOB_R = 0.057, KNOB_IN = 0.17;
  const knob = (p, n) => {
    const at = d => [p[0] + n[0] * d, p[1], p[2] + n[2] * d];
    rod(g, at(-FT_ + 0.004), at(0.002), KNOB_R, 'oak', R);
    rod(g, at(-FT_ + 0.002), at(0.004), KNOB_R - 0.014, 'bore', R);
  };
  // Fronts. f = [u0, u1, y0, y1, handle], handle as Reform lists it from the viewer's side:
  // 'tm' top middle, 'tl'/'tr' top left/right, 'bl'/'br' bottom left/right, null = none.
  // dir = the way the front faces (+1 / −1 along its axis). zFace / xFace = the cabinet's front plane.
  const handleU = (k, u0, u1, leftIsLow) => k[1] === 'm' ? (u0 + u1) / 2
    : ((k[1] === 'l') === leftIsLow ? u0 + KNOB_IN : u1 - KNOB_IN);
  const handleY = (k, y0, y1) => k[0] === 't' ? y1 - KNOB_IN : y0 + KNOB_IN;
  // make the front just built (children from n0) open: drawers ('tm') slide out carrying a real drawer box and its
  // contents; doors swing on the far jamb
  const openable = (n0, k, u0, u1, hu, face, dir, along, y0, y1, content, Dov, angOv, hook) => {
    if (!k) return;
    if (y0 < 3) g.children.slice(n0).forEach(m => { m.userData.nocut = true; });       // base + tall fronts stay whole in the cutaway
    if (k === 'tm' && content === 'tip') {
      // false front over the sink bowl: tips down on a bottom hinge, carrying a small tray (sponge, brush) on its back
      const tw = 0.3, ta = u0 + 0.12, tb = u1 - 0.12, x0 = face - dir * tw, hy = y0 + G;
      const bx = (xs, ys, zs) => { const [xa, xb] = xs[0] < xs[1] ? xs : [xs[1], xs[0]]; box(g, [xa, xb], ys, zs, 'carcassIn', R); };
      bx([face, x0], [y0 + 0.1, y0 + 0.13], [ta, tb]);                                              // tray floor
      bx([face, x0], [y0 + 0.1, y0 + 0.3], [ta, ta + 0.03]); bx([face, x0], [y0 + 0.1, y0 + 0.3], [tb - 0.03, tb]);   // ends
      bx([x0, x0 + dir * 0.03], [y0 + 0.1, y0 + 0.3], [ta, tb]);                                    // back wall
      const bag = new Bag(), sp = km('spongeY', 0xE6D24A, 0.9), sg = km('spongeG', 0x4F8A4B, 0.9), br = km('brush', 0xC49A63, 0.8);
      const cx = face - dir * 0.15, zc = (ta + tb) / 2;
      bag.add(new THREE.BoxGeometry(0.16, 0.06, 0.3).translate(cx, y0 + 0.16, zc - 0.5), sp); bag.add(new THREE.BoxGeometry(0.16, 0.03, 0.3).translate(cx, y0 + 0.205, zc - 0.5), sg);
      bag.add(new THREE.BoxGeometry(0.1, 0.07, 0.4).translate(cx, y0 + 0.165, zc + 0.15), br);
      bag.add(new THREE.CylinderGeometry(0.06, 0.06, 0.15, 12).translate(cx, y0 + 0.205, zc + 0.6), km('soap', 0x6FA3C7, 0.4));
      bag.flush(g);
      g.children.slice(n0).forEach(m => { m.userData.keep = true; });
      const pv = pivotFrom(g, n0, face, hy, 0);
      return act(pv, { kind: 'cabinet', label: d => d.on ? 'Close the tray' : 'Tip out the tray', run: d => tweenTo(pv.rotation, 'z', d.on ? -dir * 1.2 : 0, 0.6) });
    }
    if (k === 'tm') {
      const D = Dov || 1.55, t = 0.04, a0 = u0 + 0.1, a1 = u1 - 0.1, b0 = y0 + 0.12, b1 = y1 - 0.18;
      const bx = (ua, ub, ya, yb, da, db) => along === 'x'
        ? box(g, [ua, ub], [ya, yb], [Math.min(face - dir * da, face - dir * db), Math.max(face - dir * da, face - dir * db)], 'carcassIn', R)
        : box(g, [Math.min(face - dir * da, face - dir * db), Math.max(face - dir * da, face - dir * db)], [ya, yb], [ua, ub], 'carcassIn', R);
      bx(a0, a0 + t, b0, b1, 0.01, D); bx(a1 - t, a1, b0, b1, 0.01, D);
      bx(a0, a1, b0, b0 + t, 0.01, D); bx(a0, a1, b0, b1, D - t, D);
      if (content && DR[content]) {
        const bag = new Bag(), E = Emit(bag, kframe(along, face, dir));
        DR[content](E, { u0: a0 + t, u1: a1 - t, y: b0 + t, d0: 0.06, d1: D - t - 0.02 }); bag.flush(g);
      }
      g.children.slice(n0).forEach(m => { m.userData.keep = true; });
      const pv = pivotFrom(g, n0, 0, 0, 0), key = along === 'x' ? 'z' : 'x';
      return act(pv, { kind: 'cabinet', label: d => d.on ? 'Close drawer' : 'Open drawer', run: d => tweenTo(pv.position, key, d.on ? dir * 1.25 : 0, 0.45, true) });
    }
    const hinge = Math.abs(hu - u0) < Math.abs(hu - u1) ? u1 - G : u0 + G, sgn = Math.sign(hu - hinge);
    const pv = along === 'x' ? pivotFrom(g, n0, hinge, 0, face) : pivotFrom(g, n0, face, 0, hinge);
    const ang = (along === 'x' ? -dir * sgn : dir * sgn) * (angOv || 1.75);
    return act(pv, { kind: 'cabinet', label: d => d.on ? 'Close cabinet' : 'Open cabinet', run: d => { const move = () => tweenTo(pv.rotation, 'y', d.on ? ang : 0, 0.6); if (hook) hook(d.on, move); else move(); } });
  };
  // double doors: a left door ('…r' handle) beside a right door ('…l' handle) of the same size open and close together
  const linkPairs = (list, acts) => list.forEach((f, i) => { const n = list[i + 1], a = acts[i], b = acts[i + 1];
    if (a && b && f[4] && n[4] && f[4] !== 'tm' && n[4] !== 'tm' && f[4][1] === 'r' && n[4][1] === 'l' && f[1] === n[0] && f[2] === n[2] && f[3] === n[3]) { a.pair = b; b.pair = a; } });
  const FM = (mat, y1) => mat === 'burgundy' ? (y1 <= KIT.BOX + 0.01 ? 'burgundyB' : 'burgundyF') : mat === 'oak' ? (y1 <= KIT.BOX + 0.01 ? 'oakB' : 'oakF') : mat;
  const frontsZ = (zFace, list, mat, dir = +1) => linkPairs(list, list.map(([u0, u1, y0, y1, k, content, Dov, angOv, hook]) => {
    const zf = zFace + dir * FT_, n0 = g.children.length;
    rbox(g, [u0 + G, u1 - G], [y0 + G, y1 - G], [Math.min(zFace, zf), Math.max(zFace, zf)], FM(mat, y1), R);
    const hu = k ? handleU(k, u0, u1, dir > 0) : 0;
    if (k) knob([hu, handleY(k, y0, y1), zf], [0, 0, dir]);   // facing +z: viewer's left = west (low x)
    return openable(n0, k, u0, u1, hu, zFace, dir, 'x', y0, y1, content, Dov, angOv, hook);
  }));
  const frontsX = (xFace, list, mat, dir = +1) => linkPairs(list, list.map(([u0, u1, y0, y1, k, content, Dov, angOv, hook]) => {
    const xf = xFace + dir * FT_, n0 = g.children.length;
    rbox(g, [Math.min(xFace, xf), Math.max(xFace, xf)], [y0 + G, y1 - G], [u0 + G, u1 - G], FM(mat, y1), R);
    const hu = k ? handleU(k, u0, u1, dir < 0) : 0;
    if (k) knob([xf, handleY(k, y0, y1), hu], [dir, 0, 0]);   // facing +x: viewer's left = south (high z)
    return openable(n0, k, u0, u1, hu, xFace, dir, 'z', y0, y1, content, Dov, angOv, hook);
  }));
  const P = KIT.PLINTH, B = KIT.BOX, mid = P + 15 / 12;
  const PT = 0.035;     // ½" carcass panels
  // hollow carcass: sides, back, bottom, optional top and shelves; the front stays open for doors and drawers
  const shell = o => {
    const { along, face, dir, u: [a, b], y: [y0, y1], back, mat = 'carcassIn' } = o;
    const dr = back < face ? [back, face] : [face, back], bk = back < face ? [back, back + PT] : [back - PT, back];
    const mk = (ur, yr, dd) => { const m = along === 'x' ? box(g, ur, yr, dd, mat, R) : box(g, dd, yr, ur, mat, R);
      if (o.keep) m.userData.keep = true; if (o.cutAxis) m.userData.cutAxis = o.cutAxis; return m; };
    mk([a, a + PT], [y0, y1], dr); mk([b - PT, b], [y0, y1], dr); mk([a + PT, b - PT], [y0, y1], bk);
    if (!o.noBottom) mk([a + PT, b - PT], [y0, y0 + PT], dr);
    if (o.top) mk([a + PT, b - PT], [y1 - PT, y1], dr);
    for (const sh of o.shelves || []) mk([a + PT, b - PT], [sh, sh + PT], dr);
  };

  // ---- North run (front view B): corner 47 | drawers 30 | RANGE 30 | drawers 21 | panel 1 = 129"
  const zN = kz(24);
  // carcass and plinth stop either side of the range, so nothing shares the range's faces
  for (const [a, b] of [[0, 77], [107, 129]]) box(g, [kx(a), kx(b)], [0, P], [KIT.Z0, zN - 0.17], 'burgundy', R);           // plinth, set back
  // hollow carcasses: the corner cabinet and the two drawer stacks either side of the range
  const baseN = (a, b, shelves) => shell({ along: 'x', face: zN, dir: 1, u: [kx(a), kx(b)], y: [P, B], back: KIT.Z0, keep: true, shelves });
  baseN(0, 47); baseN(47, 77); baseN(107, 128);
  box(g, [kx(128), kx(129)], [P, B], [KIT.Z0, zN], 'carcassIn', R).userData.keep = true;
  // Blind-corner pull-out: two units of two trays each. The door (23", hinged toward the drawers) opens, the front
  // unit slides straight out, then the back unit slides sideways into the opening behind it.
  // Corner pull-out: ONE swivelling unit (as in the Reform drawing): big kidney trays and half-moon trays on a central
  // post, two levels of each. It slides and rotates out through the door opening, and is pushed fully back in
  // before the door is allowed to close. The motion was swept numerically against the sink run and the drawer stack.
  const PO = [2.1, 1.6], PO_ROT = -1.1, PO_SLIDE = [0.9, 0.4];
  const kidneyShape = (px, pz) => { const pts = [], n = 56, rx = 1.3, rz = 0.5, cx = px + 0.715;
    for (let i = 0; i < n; i++) { const a2 = i / n * Math.PI * 2, x = cx + rx * Math.cos(a2), sz = Math.sin(a2);
      const waist = sz > 0 ? 1 - 0.28 * Math.exp(-Math.pow((x - cx - 0.35) / 0.45, 2)) : 1;            // concave waist on the front side
      pts.push(new THREE.Vector2(x, -(pz + rz * sz * waist))); }
    return new THREE.Shape(pts); };
  const moonShape = (px, pz) => { const pts = []; for (let i = 0; i <= 24; i++) { const a2 = -Math.PI / 2 + i / 24 * Math.PI; pts.push(new THREE.Vector2(px + 0.55 * Math.cos(a2), -(pz + 0.55 * Math.sin(a2)))); } return new THREE.Shape(pts); };
  const tmat = km('trayGray', 0x6A6F75, 0.62, 0.1), rmat = km('trayRail', 0x4B4F55, 0.5, 0.4);
  const cornerUnit = (() => {
    const n0 = g.children.length, bag = new Bag(), E = Emit(bag, kframe('x', zN, 1));
    const tray = (shape, y) => {
      const fg = new THREE.ExtrudeGeometry(shape, { depth: 0.035, bevelEnabled: false, curveSegments: 10 }); fg.rotateX(-Math.PI / 2); fg.translate(0, y, 0);
      const fm = new THREE.Mesh(fg, tmat); fm.receiveShadow = true; fm.userData.room = 'kitchen'; fm.userData.keep = true; g.add(fm);
      const pts = shape.getPoints(12);
      for (let k = 0; k < pts.length; k++) {                                                              // raised rail along the outline
        const p1 = pts[k], p2 = pts[(k + 1) % pts.length], L = Math.hypot(p2.x - p1.x, p2.y - p1.y); if (L < 1e-4) continue;
        const rg = new THREE.BoxGeometry(L + 0.01, 0.1, 0.014); rg.rotateY(-Math.atan2(-(p2.y - p1.y), p2.x - p1.x)); rg.translate((p1.x + p2.x) / 2, y + 0.085, -(p1.y + p2.y) / 2); bag.add(rg, rmat);
      }
    };
    const K = kidneyShape(PO[0], PO[1]), Mo = moonShape(PO[0], PO[1]);
    const yK1 = 0.43, yM1 = 1.15, yK2 = 1.7, yM2 = 2.35;
    tray(K, yK1); tray(Mo, yM1); tray(K, yK2); tray(Mo, yM2);
    bag.add(new THREE.CylinderGeometry(0.035, 0.035, 2.35, 10).translate(PO[0], yK1 + 1.175, PO[1]), rmat);          // the post
    const dd = z => zN - z;
    E.at(3.25, dd(1.6), yK1 + 0.035); I.pot().make(E); E.at(1.9, dd(1.55), yK1 + 0.035); I.cans(1, 0x3B6E8C).make(E);
    E.at(2.42, dd(1.6), yM1 + 0.035); I.bowls(2).make(E);
    E.at(3.2, dd(1.6), yK2 + 0.035); I.mixing().make(E); E.at(1.85, dd(1.55), yK2 + 0.035); I.jars(1).make(E);
    E.at(2.42, dd(1.6), yM2 + 0.035); I.cans(2, 0xD9B13B).make(E);
    bag.flush(g, { keep: true });
    const pv = pivotFrom(g, n0, PO[0], 0, PO[1]);
    pv.traverse(o => { o.userData.noMerge = true; });
    return pv;
  })();
  const cornerMove = on => {
    tweenTo(cornerUnit.rotation, 'y', on ? PO_ROT : 0, 0.95);
    tweenTo(cornerUnit.position, 'x', PO[0] + (on ? PO_SLIDE[0] : 0), 0.95);
    tweenTo(cornerUnit.position, 'z', PO[1] + (on ? PO_SLIDE[1] : 0), 0.95);
  };
  let cornerTimer = 0;
  const cornerHook = (on, doorMove) => {
    clearTimeout(cornerTimer);
    if (on) { doorMove(); cornerTimer = setTimeout(() => cornerMove(true), 380); }               // door first, then the unit swings out
    else { cornerMove(false); cornerTimer = setTimeout(doorMove, 1050); }                         // unit fully back in, then the door closes
  };
  box(g, [kx(77), kx(107)], [0, KIT.TOP - 0.02], [KIT.Z0, zN + FT_], 'steelTop', R);   // 30" slide-in range, stainless, flush with the fronts
  // 30" induction range: brushed stainless body; black glass oven door under a bar handle; control panel with four knobs
  // and a center display; stainless kick panel; black glass cooktop with a raised stainless back guard.
  { const x0 = kx(77), x1 = kx(107), fz = zN + FT_, I = v => v / 12;
    const ov = (xa, xb, ya, yb, mat, d = 0.01) => box(g, [x0 + I(xa), x0 + I(xb)], [I(ya), I(yb)], [fz, fz + d], mat, R);
    ov(0, 30, 0, 0.9, 'frame');                                       // dark recess under the range (the cabinet plinth stops either side)
    ov(0.3, 29.7, 8.5, 21.5, 'ovenGlass', 0.012);                     // oven door glass
    ov(0, 30, 3.8, 4.05, 'frame', 0.012);                             // shadow gap above the kick panel
    ov(0, 30, 25.8, 26.05, 'frame', 0.012);                           // gap between door and control panel
    ov(11.5, 18.5, 27.2, 31.4, 'ovenGlass', 0.014);                   // display
    for (const [a, len, rot] of [[0.07, 0.1, 0.5], [0.07, 0.15, -1.2]]) {                                   // clock hands
      const h = new THREE.Mesh(new THREE.BoxGeometry(0.012, len, 0.004), M('chrome')); h.position.set(x0 + I(15), I(29.3) + Math.cos(rot) * len / 2, fz + 0.017);
      h.rotation.z = -rot; h.position.x += Math.sin(rot) * len / 2; h.userData.room = 'kitchen'; g.add(h);
    }
    for (const xk of [3.0, 7.0, 23.0, 27.0]) {                         // four knobs: chrome skirt, grip, and a dark indicator line
      const cx = x0 + I(xk), cy = I(29), mk = (r, hgt, z, mat) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, hgt, 28).rotateX(Math.PI / 2), M(mat)); m.position.set(cx, cy, z); m.castShadow = true; m.userData.room = 'kitchen'; g.add(m); };
      mk(0.098, 0.035, fz + 0.018, 'chrome'); mk(0.082, 0.055, fz + 0.05, 'steelTop'); mk(0.07, 0.01, fz + 0.082, 'chrome');
      box(g, [cx - 0.006, cx + 0.006], [cy + 0.02, cy + 0.075], [fz + 0.078, fz + 0.09], 'frame', R);
    }
    // bar handle across the top of the door, on two end posts
    box(g, [x0 + I(1.0), x0 + I(29)], [I(22.3), I(24.3)], [fz + 0.12, fz + 0.17], 'chrome', R);
    for (const xs of [[1.0, 1.9], [28.1, 29.0]]) box(g, [x0 + I(xs[0]), x0 + I(xs[1])], [I(22.3), I(24.3)], [fz, fz + 0.12], 'chrome', R);
    // cooktop: black glass, a stainless trim band at the front, and a raised back guard
    box(g, [x0 + 0.04, x1 - 0.04], [KIT.TOP - 0.02, KIT.TOP + 0.012], [KIT.Z0 + 0.36, fz - 0.28], 'ovenGlass', R);
    box(g, [x0, x1], [KIT.TOP - 0.02, KIT.TOP + 0.012], [fz - 0.28, fz], 'steelTop', R);
    box(g, [x0, x1], [KIT.TOP - 0.02, KIT.TOP + 0.14], [KIT.Z0, KIT.Z0 + 0.34], 'steelTop', R);
    box(g, [x0 + 0.08, x1 - 0.08], [KIT.TOP + 0.09, KIT.TOP + 0.115], [KIT.Z0 + 0.34, KIT.Z0 + 0.352], 'frame', R);   // the slot in the guard
  }
  frontsZ(zN, [
    [kx(24), kx(25), P, B, null],                                                  // 1" filler on the hinge side (clearance for the door)
    [kx(25), kx(47), P, B, 'tr', null, null, 1.48, cornerHook],                    // corner door, 22", hinged on the sink-run side
    [kx(47), kx(77), mid, B, 'tm', 'cutlery'], [kx(47), kx(77), P, mid, 'tm', 'pots'],                // cab 2: 2 × W30 H15
    [kx(107), kx(128), mid, B, 'tm', 'utensils'], [kx(107), kx(128), P, mid, 'tm', 'pans'],            // cab 3: 2 × W21 H15
    [kx(128), kx(129), P, B, null],                                                 // panel 4
  ], 'burgundy');
  box(g, [kx(129), kx(129) + FT_], [0, B], [KIT.Z0, zN + FT_ - 0.07], 'burgundy', R);                 // east end of the north run: burgundy side panel
  box(g, [kx(129), kx(129) + FT_], [0, B], [zN + FT_ - 0.07, zN + FT_], 'oakF', R).userData.keep = true;   // ...with a light-wood front edge
  // ---- West run (front view C, from the corner): filler 1⅛ | SINK 30 | DW 24 | drawers 24 | panel 1
  const xW = kx(24);
  box(g, [KIT.X0, xW - 0.17], [0, P], [zN, kz(106.1)], 'burgundy', R);
  const baseW = (a, b) => shell({ along: 'z', face: xW, dir: 1, u: [kz(a), kz(b)], y: [P, B], back: KIT.X0, keep: true });
  box(g, [KIT.X0, xW], [P, B], [zN, kz(27.1)], 'carcassIn', R).userData.keep = true;            // corner filler
  baseW(27.1, 57.1); baseW(81.1, 105.1);
  box(g, [KIT.X0, xW], [P, B], [kz(105.1), kz(106.1)], 'carcassIn', R).userData.keep = true;
  frontsX(xW, [
    [kz(26), kz(27.1), P, B, null],
    [kz(27.1), kz(57.1), mid, B, 'tm', 'tip'], [kz(27.1), kz(57.1), P, mid, 'tm', 'bin'],   // sink base W30 (the top front is a tip-out: the bowl hangs behind it)
    // (the 24" bay between is the panel-ready dishwasher, built below)
    [kz(81.1), kz(105.1), mid, B, 'tm', 'dishes'], [kz(81.1), kz(105.1), P, mid, 'tm', 'tupper'],      // cab 10 W24
    [kz(105.1), kz(106.1), P, B, null],                                             // end panel 9
  ], 'burgundy');
  box(g, [KIT.X0, xW + FT_ - 0.07], [0, B], [kz(106.1), kz(106.9)], 'burgundy', R);                   // side panel, scribed
  box(g, [xW + FT_ - 0.07, xW + FT_], [0, B], [kz(106.1), kz(106.9)], 'oakF', R).userData.keep = true;    // ...with a light-wood front edge

  // ---- 5 mm stainless countertops, 1" past the fronts; integral sink under W07
  box(g, [KIT.X0, kx(77)], [B, KIT.TOP], [KIT.Z0, zN + 0.15], 'steelTop', R);
  box(g, [kx(107), kx(129) + 0.02], [B, KIT.TOP], [KIT.Z0, zN + 0.15], 'steelTop', R);
  // The west-run counter is one sheet with a rounded cut-out; the bowl is the same 5 mm stainless, welded to the
  // edge of the cut-out, so top and sink read as a single piece (no rim, no seam).
  { const t = 0.0164, bowlD = 0.7, bx0 = kx(3), bx1 = kx(21), bz0 = kz(29), bz1 = kz(55), r = 0.1, T0 = KIT.TOP;
    const sheet = new THREE.Shape();
    sheet.moveTo(KIT.X0, -(zN + 0.15)); sheet.lineTo(xW + 0.15, -(zN + 0.15)); sheet.lineTo(xW + 0.15, -kz(106.9)); sheet.lineTo(KIT.X0, -kz(106.9)); sheet.lineTo(KIT.X0, -(zN + 0.15));
    sheet.holes.push(rrPath(new THREE.Path(), bx0, -bz1, bx1 - bx0, bz1 - bz0, r));
    const sg = new THREE.ExtrudeGeometry(sheet, { depth: T0 - B, bevelEnabled: false }); sg.rotateX(-Math.PI / 2); sg.translate(0, B, 0); addGeo(g, sg, 'steelTop', R);
    const ring = new THREE.Shape(); rrPath(ring, bx0, -bz1, bx1 - bx0, bz1 - bz0, r);
    ring.holes.push(rrPath(new THREE.Path(), bx0 + t, -bz1 + t, bx1 - bx0 - 2 * t, bz1 - bz0 - 2 * t, r - t * 0.8));
    const wg = new THREE.ExtrudeGeometry(ring, { depth: bowlD, bevelEnabled: false }); wg.rotateX(-Math.PI / 2); wg.translate(0, T0 - bowlD, 0); addGeo(g, wg, 'steelBowl', R);
    const fl = new THREE.Shape(); rrPath(fl, bx0 + t, -bz1 + t, bx1 - bx0 - 2 * t, bz1 - bz0 - 2 * t, r - t * 0.8);
    const fg = new THREE.ExtrudeGeometry(fl, { depth: t, bevelEnabled: false }); fg.rotateX(-Math.PI / 2); fg.translate(0, T0 - bowlD, 0); addGeo(g, fg, 'steelBowlF', R);
    const dx = (bx0 + bx1) / 2, dz = (bz0 + bz1) / 2;
    cyl(g, [dx, dz], [T0 - bowlD + t, T0 - bowlD + t + 0.006], 0.105, 'chrome', R);                 // drain ring
    cyl(g, [dx, dz], [T0 - bowlD + t + 0.006, T0 - bowlD + t + 0.012], 0.072, 'frame', R);           // drain hole
    // gooseneck faucet at the back, in front of the window
    const fx = KIT.X0 + 0.11, fz = dz;
    cyl(g, [fx, fz], [T0, T0 + 0.08], 0.065, 'chrome', R); cyl(g, [fx, fz], [T0 + 0.08, T0 + 0.82], 0.028, 'chrome', R);
    const curve = new THREE.CatmullRomCurve3([[fx, T0 + 0.8, fz], [fx, T0 + 0.93, fz], [fx + 0.2, T0 + 1.02, fz], [fx + 0.52, T0 + 0.92, fz], [fx + 0.6, T0 + 0.7, fz]].map(q => new THREE.Vector3(...q)));
    addGeo(g, new THREE.TubeGeometry(curve, 28, 0.026, 10, false), 'chrome', R);
    rod(g, [fx, T0 + 0.35, fz + 0.045], [fx + 0.14, T0 + 0.5, fz + 0.12], 0.016, 'chrome', R);        // lever
  }
  // ---- Panel-ready dishwasher (24"): stainless tub, two racks of dishes, and a drop-down door carrying a cabinet front
  { const za = kz(57.1), zb = kz(81.1), zc = (za + zb) / 2, tb = P + 0.08, tt = B - 0.05, xi = xW - 0.2;
    const kp = (xs, ys, zs) => { box(g, xs, ys, zs, 'appliance', R).userData.keep = true; };
    kp([KIT.X0, xi], [tb, tb + PT], [za + 0.05, zb - 0.05]); kp([KIT.X0, xi], [tt - PT, tt], [za + 0.05, zb - 0.05]);
    kp([KIT.X0, xi], [tb, tt], [za + 0.05, za + 0.05 + PT]); kp([KIT.X0, xi], [tb, tt], [zb - 0.05 - PT, zb - 0.05]);
    kp([KIT.X0, KIT.X0 + PT], [tb, tt], [za + 0.05, zb - 0.05]);
    const bag = new Bag(), rk = km('rack', 0xB9BDC0, 0.3, 0.8), porc = km('porc', 0xF1EFE8, 0.28), gl = kGlass(), cx = (KIT.X0 + xi) / 2 + 0.05;
    const rack = y => {
      for (let z = za + 0.12; z <= zb - 0.1; z += 0.15) bag.add(new THREE.BoxGeometry(xi - KIT.X0 - 0.25, 0.014, 0.014).translate(cx, y, z), rk);
      for (let x = KIT.X0 + 0.15; x <= xi - 0.1; x += 0.4) bag.add(new THREE.BoxGeometry(0.014, 0.014, zb - za - 0.24).translate(x, y, zc), rk);
    };
    const yL = P + 0.42, yU = P + 1.55; rack(yL); rack(yU);
    for (let k = 0; k < 8; k++) bag.add(new THREE.CylinderGeometry(0.4, 0.34, 0.025, 22).rotateX(Math.PI / 2).translate(KIT.X0 + 0.95, yL + 0.46, za + 0.2 + k * 0.17), porc);   // plates on edge
    for (let r2 = 0; r2 < 3; r2++) for (let c = 0; c < 5; c++) bag.add(new THREE.CylinderGeometry(0.12, 0.1, 0.3, 12).translate(KIT.X0 + 0.4 + r2 * 0.45, yU + 0.16, za + 0.22 + c * 0.28), (r2 + c) % 2 ? gl : km('mugA', 0xD9C7A5, 0.5));   // cups + glasses, upside down
    bag.add(new THREE.CylinderGeometry(0.3, 0.17, 0.1, 18).translate(xi - 0.55, yU + 0.07, zb - 0.55), km('bowl', 0xE3DED2, 0.3));
    bag.add(new THREE.BoxGeometry(0.4, 0.34, 0.3).translate(xi - 0.45, yL + 0.18, zb - 0.28), km('basket', 0x9AA0A6, 0.5, 0.7));
    for (let k = 0; k < 7; k++) bag.add(new THREE.BoxGeometry(0.02, 0.2, 0.02).translate(xi - 0.58 + (k % 4) * 0.1, yL + 0.44, zb - 0.38 + Math.floor(k / 4) * 0.12), km('flat', 0xBFC3C6, 0.25, 0.9));
    bag.add(new THREE.BoxGeometry(1.1, 0.025, 0.1).translate(cx, tb + PT + 0.04, zc), kBlack());              // spray arm
    bag.flush(g, { keep: true });
    // door: the cabinet front (rounded edges, shaded like its neighbours) on a stainless inner liner, hinged at the bottom
    const n0 = g.children.length;
    rbox(g, [xW, xW + FT_], [P + G, B - G], [za + G, zb - G], 'burgundyB', R);
    knob([xW + FT_, B - KNOB_IN, zc], [1, 0, 0]);
    box(g, [xW - 0.17, xW], [P + 0.06, B - 0.05], [za + 0.06, zb - 0.06], 'appliance', R);                    // inner liner
    for (const [ys, zs] of [[[P + 0.06, P + 0.1], [za + 0.06, zb - 0.06]], [[B - 0.09, B - 0.05], [za + 0.06, zb - 0.06]], [[P + 0.06, B - 0.05], [za + 0.06, za + 0.1]], [[P + 0.06, B - 0.05], [zb - 0.1, zb - 0.06]]])
      box(g, [xW - 0.19, xW - 0.17], ys, zs, 'frame', R);                                                      // door gasket, as a rim
    const pv = pivotFrom(g, n0, xW, P + 0.05, 0); pv.traverse(o => { o.userData.keep = true; });
    act(pv, { kind: 'dishwasher', label: d => d.on ? 'Close dishwasher' : 'Open dishwasher', run: d => tweenTo(pv.rotation, 'z', d.on ? -1.52 : 0, 0.9) });
  }

  // ---- Backsplash: 2"×2" white mosaic, gray grout, 12" high (north wall + west wall beside W07)
  const BS = [KIT.TOP, KIT.TOP + 1.0];
  box(g, [KIT.X0, kx(129)], BS, [KIT.Z0, KIT.Z0 + 0.04], 'mosaic', R);
  box(g, [KIT.X0, KIT.X0 + 0.04], BS, [KIT.Z0 + 0.04, 2.61], 'mosaic', R);
  box(g, [KIT.X0, KIT.X0 + 0.04], BS, [5.61, kz(106.1)], 'mosaic', R);

  // ---- Wall cabinets 59¼" → 90": oak cubby 24 9/16 | W21 | W30 | W30 over range (hood below) | W21
  const [u0, u1] = KIT.UP, zU = KIT.Z0 + KIT.UPD;
  box(g, [kx(0), kx(1)], [u0, u1], [KIT.Z0, zU], 'oak', R);
  box(g, [kx(25.56), kx(26.56)], [u0, u1], [KIT.Z0, zU], 'oak', R);
  for (const y of [u0, u0 + 10 / 12, u0 + 20 / 12, u1 - 0.07]) box(g, [kx(1), kx(25.56)], [y, y + 0.07], [KIT.Z0, zU], 'oak', R);
  // hollow wall cabinets, four bays, two shelves each; they hide with the wall in the cutaway
  const upF = zU - FT_, upBay = (a, b, shelves, yb = u0) => shell({ along: 'x', face: upF, dir: 1, u: [kx(a), kx(b)], y: [yb, u1], back: KIT.Z0, top: true, cutAxis: 'z', shelves });
  upBay(26.56, 47.56, [u0 + 0.9, u0 + 1.78]); upBay(47.56, 77.56, [u0 + 0.9, u0 + 1.78]);
  shell({ along: 'x', face: upF, dir: 1, u: [kx(77.56), kx(107.56)], y: [u0, u1], back: KIT.Z0, top: true, cutAxis: 'z', noBottom: true });   // hood bay: open underneath
  upBay(107.56, 128.56, [u0 + 0.9, u0 + 1.78]);
  { const fr = kframe('x', upF, 1), o = { cutAxis: 'z' }, lv = (y0, a, b) => [y0 + PT, y0 + a + PT, y0 + b + PT];
    fillShelves(g, fr, kx(26.56) + PT, kx(47.56) - PT, lv(u0, 0.9, 1.78), [[I.plates(8), I.bowls(5)], [I.mugs(3), I.glasses(2)], [I.jars(3), I.cans(3)]], 0.45, o);
    fillShelves(g, fr, kx(47.56) + PT, kx(77.56) - PT, lv(u0, 0.9, 1.78), [[I.glasses(5), I.wine(3)], [I.boxes(2), I.bottles(3)], [I.jars(3), I.cans(4), I.tins(3)]], 0.45, o);
    fillShelves(g, fr, kx(107.56) + PT, kx(128.56) - PT, lv(u0, 0.9, 1.78), [[I.spices(8), I.tins(2)], [I.mugs(3), I.tins(2)], [I.cans(5)]], 0.45, o);
    // the open oak cubby: cookbooks, a plant, bowls, jars
    fillShelves(g, kframe('x', zU, 1), kx(1) + 0.02, kx(25.56) - 0.02, [u0 + 0.07, u0 + 10 / 12 + 0.07, u0 + 20 / 12 + 0.07], [[I.books(7), I.plant()], [I.bowls(3), I.vase(), I.tins(2)], [I.jars(3), I.mugs(2)]], 0.55, o);
  }
  const ub = u0 + 0.07;                                                           // doors sit above a 3/4" light-wood edge band
  frontsZ(zU - FT_, [
    [kx(26.56), kx(47.56), ub, u1, 'br'],
    [kx(47.56), kx(62.56), ub, u1, 'br'], [kx(62.56), kx(77.56), ub, u1, 'bl'],
    [kx(77.56), kx(92.56), ub, u1, 'br'], [kx(92.56), kx(107.56), ub, u1, 'bl'],
    [kx(107.56), kx(128.56), ub, u1, 'bl'],
  ], 'burgundy');
  // visible light-wood carcass edge (as in the Reform render): along the bottom of the wall cabinets and up the exposed end
  box(g, [kx(26.56), kx(129.56)], [u0, ub], [zU - FT_, zU], 'oakF', R).userData.cutAxis = 'z';
  box(g, [kx(128.56), kx(129.56)], [u0, u1], [KIT.Z0, zU - 0.07], 'burgundy', R);                  // side panel 27
  box(g, [kx(128.56), kx(129.56)], [u0, u1], [zU - 0.07, zU], 'oakF', R).userData.cutAxis = 'z';   // its light-wood front edge
  // Integrated range hood (keynote 20), hidden behind the full-height doors: a stainless hood body in the bottom of the
  // bay with a filter underneath, a front visor with controls, LED lights, and a duct rising through the cabinet.
  { const hx0 = kx(77.56) + PT + 0.03, hx1 = kx(107.56) - PT - 0.03, hz0 = KIT.Z0 + PT, hz1 = upF - 0.1, hh = 0.5, cx = (hx0 + hx1) / 2;
    const hm = (xs, ys, zs, mat = 'steelTop') => { const m = box(g, xs, ys, zs, mat, R); m.userData.cutAxis = 'z'; return m; };
    hm([hx0, hx0 + 0.03], [u0, u0 + hh], [hz0, hz1]); hm([hx1 - 0.03, hx1], [u0, u0 + hh], [hz0, hz1]);         // sides
    hm([hx0, hx1], [u0 + hh - 0.03, u0 + hh], [hz0, hz1]);                                                      // roof
    hm([hx0, hx1], [u0, u0 + 0.03], [hz0, hz1]);                                                                // underside plate
    hm([hx0, hx1], [u0, u0 + hh], [hz1 - 0.04, hz1]);                                                           // front visor
    hm([hx0 + 0.15, hx1 - 0.15], [u0 - 0.004, u0 + 0.03], [hz0 + 0.2, hz1 - 0.55], 'frame');                    // grease filter
    for (const sx of [-0.55, 0.55]) hm([cx + sx - 0.12, cx + sx + 0.12], [u0 - 0.006, u0 + 0.03], [hz1 - 0.4, hz1 - 0.28], 'hoodLed');
    hm([hx0 + 0.06, hx1 - 0.06], [u0 + 0.06, u0 + 0.1], [hz1, hz1 + 0.004], 'frame');                            // intake slot on the visor
    for (let k = 0; k < 3; k++) rod(g, [hx1 - 0.2 - k * 0.15, u0 + 0.3, hz1], [hx1 - 0.2 - k * 0.15, u0 + 0.3, hz1 + 0.03], 0.035, 'chrome', R).userData.cutAxis = 'z';
    // duct: straight up from the hood, a 90° elbow, then straight back through the north wall to an exterior cap
    const zd = hz0 + 0.5, yE = u1 - 0.45, dr = 0.28, zOut = EXT.N[0] - 0.02;
    cyl(g, [cx, zd], [u0 + hh, yE], dr, 'steelTop', R).userData.cutAxis = 'z';                                   // riser
    cyl(g, [cx, zd], [u0 + hh, u0 + hh + 0.06], 0.32, 'steelTop', R).userData.cutAxis = 'z';                    // collar on the hood
    const eb = new THREE.SphereGeometry(dr, 20, 14); eb.translate(cx, yE, zd); addGeo(g, eb, 'steelTop', R).userData.cutAxis = 'z';   // elbow
    rod(g, [cx, yE, zd], [cx, yE, zOut], dr, 'steelTop', R).userData.cutAxis = 'z';                              // run to the back, through the wall
    // exterior wall cap: flat plate with louvers, on the siding
    { const px = [cx - 0.38, cx + 0.38], py = [yE - 0.3, yE + 0.3], zc0 = EXT.N[0];
      box(g, px, py, [zc0 - 0.04, zc0], 'frame', R).userData.cutAxis = 'z';
      for (let k = 0; k < 5; k++) { const yy = py[0] + 0.07 + k * 0.1; box(g, [px[0] + 0.05, px[1] - 0.05], [yy, yy + 0.035], [zc0 - 0.09, zc0 - 0.04], 'steelTop', R).userData.cutAxis = 'z'; } }
  }

  // ---- 2" millwork ledge at 8'-0" (CD A401.1, local fabricated — not in the Reform order)
  // north wall: as deep as the wall cabinets + fronts; over the tall oak wall it caps the full 2'-0" depth
  box(g, [0.51, 14.42], [8.0, 8.167], [0.52, zU + 0.03], 'oak', R);
  box(g, [14.42, 14.5], [8.0, 8.167], [0.52, kz(104.75)], 'oak', R);             // only the lip in front of the loft slab edge (the slab underside is also at 8'-0")
  box(g, [0.51, 1.51], [8.0, 8.167], [zU + 0.03, 16.54], 'oak', R);
  // 2" local-fab millwork panel dropping from the ledge to the floor on the south wall stub by Door 102 (A401.1 plan 1, elev. 2)
  box(g, [0.51, 1.51], [0, 8.0], [16.54 - 2 / 12, 16.54], 'oak', R);

  // ---- Full-height oak wall (front view A, looking east): filler 7 3/16 | tall W30 | FRIDGE 36 | ¾ | tall W30 | panel 1
  const xF = 16.52 - 24 / 12, H = 96 / 12, xFace = xF - FT_;
  box(g, [xF, 16.52], [0, H], [kz(0), kz(7.19)], 'oak', R);                        // filler 5
  for (const [ti, [a, b2]] of [[7.19, 37.19], [73.94, 103.94]].entries()) {
    // hollow oak carcass (its sides show in the fridge bay): drawer zone below, then four pantry shelves
    const shelfY = ti === 1 ? [P + 30 / 12, 4.0, 5.25, 6.1, 7.05] : [P + 30 / 12, 3.95, 5.0, 6.05, 7.05];     // the right-hand tower has the microwave on its second shelf
    shell({ along: 'z', face: xF, dir: -1, u: [kz(a), kz(b2)], y: [P, H], back: 16.52, mat: 'oak', top: true, keep: true, shelves: shelfY });
    box(g, [xF + 0.17, 16.52], [0, P], [kz(a), kz(b2)], 'oak', R);
    const pyl = shelfY.map(y => y + PT), ju = [kz(a) + PT, kz(b2) - PT];
    fillShelves(g, kframe('z', xF, -1), ju[0], ju[1], pyl, ti === 0
      ? [[I.cans(3), I.jars(3)], [I.boxes(3), I.bottles(2)], [I.jars(3), I.cans(3)], [I.boxes(2), I.tins(3)], [I.tins(4), I.cans(3)]]
      : [[I.bottles(4), I.cans(4)], [], [I.cans(7)], [I.boxes(3), I.bottles(2)], [I.tins(3), I.jars(2)]], 0.5, { keep: true },
      ti === 0 ? [[I.cans(7, 0x3B6E8C, 0x5E8C4A)], [I.boxes(4)], [I.jars(5)], [I.cans(7)], [I.boxes(4)]] : [[I.jars(5)], [], [I.boxes(4)], [I.jars(5)], [I.cans(7)]]);
    if (ti === 1) {
      // built-in microwave on the second shelf: stainless body, black glass door with a bar handle, control panel on the right
      const za = kz(a) + 0.3, zb = kz(b2) - 0.3, y0 = shelfY[1] + PT, hh = 1.05, x0 = xF + 0.35, x1 = xF + 1.85;
      const mw = (xs, ys, zs, mat) => { const m = box(g, xs, ys, zs, mat, R); m.userData.keep = true; return m; };
      mw([x0, x1], [y0, y0 + hh], [za, zb], 'steelTop');
      mw([x0 - 0.03, x0], [y0 + 0.08, y0 + hh - 0.08], [za + 0.1, zb - 0.78], 'frame');
      mw([x0 - 0.03, x0], [y0 + 0.08, y0 + hh - 0.08], [zb - 0.68, zb - 0.1], 'steelTop');
      mw([x0 - 0.07, x0 - 0.03], [y0 + 0.14, y0 + hh - 0.14], [zb - 0.8, zb - 0.76], 'chrome');
      mw([x0 - 0.035, x0 - 0.03], [y0 + hh - 0.3, y0 + hh - 0.2], [zb - 0.55, zb - 0.22], 'mwLed');
      for (let k = 0; k < 3; k++) for (let j = 0; j < 3; j++) mw([x0 - 0.045, x0 - 0.03], [y0 + 0.14 + k * 0.14, y0 + 0.14 + k * 0.14 + 0.07], [zb - 0.55 + j * 0.12, zb - 0.55 + j * 0.12 + 0.08], 'frame');
    }
    frontsX(xF, [
      [kz(a), kz(a + 15), P + 30 / 12, H, 'br'], [kz(a + 15), kz(b2), P + 30 / 12, H, 'bl'],   // doors W15 H60, handles at the meeting stiles
      [kz(a), kz(b2), P + 15 / 12, P + 30 / 12, 'tm', ti ? 'tupper' : 'towels'], [kz(a), kz(b2), P, P + 15 / 12, 'tm', ti ? 'pots' : 'bakeware'],  // drawers W30 H15
    ], 'oak', -1);
  }
  box(g, [xF, 16.52], [0, H], [kz(103.94), kz(104.75)], 'oak', R);                // side panel 8
  // flush oak panel over the end of the kitchen|stair wall, tying the oak wall to the stair cladding
  box(g, [16.515, 17.015], [0, LV.CEIL1], [kz(104.75), 9.32], 'oak', R);
  // fridge bay: 36" French-door fridge (70" tall, front proud); the top cabinet drops to just above it and its
  // doors run to the 8'-0" top like the tall doors either side, so there is no open slot above the fridge
  const fTop = 70 / 12, cB = fTop + 0.5 / 12;
  // Bottom-freezer French-door fridge. Hollow white liner: freezer drawer below (y 0.1–1.75), then the fridge compartment with
  // two crispers, three glass shelves and food, under two French doors.
  const frzTop = 1.75, fDoorB = 1.82;
  { const fz0 = kz(37.3), fz1 = kz(73.1), fx0 = xF - 0.3, zm0 = (fz0 + fz1) / 2, shelfYs = [3.05, 4.05, 5.0];
    shell({ along: 'z', face: fx0, dir: -1, u: [fz0, fz1], y: [0.1, fTop], back: 16.45, mat: 'fridgeIn', top: true, keep: true });
    box(g, [fx0 + 0.02, 16.45 - PT], [frzTop, frzTop + 0.07], [fz0 + PT, fz1 - PT], 'fridgeIn', R).userData.keep = true;      // divider
    for (const yy of shelfYs) box(g, [fx0 + 0.02, 16.45 - PT], [yy, yy + 0.03], [fz0 + PT, fz1 - PT], 'glass', R).userData.keep = true;
    const bag = new Bag(), E = Emit(bag, kframe('z', fx0, -1)), bm = km('binM', 0xE9EEF1, 0.3, 0, { transparent: true, opacity: 0.5, depthWrite: false });
    const bb = (xs, ys, zs) => bag.add(new THREE.BoxGeometry(xs[1] - xs[0], ys[1] - ys[0], zs[1] - zs[0]).translate((xs[0] + xs[1]) / 2, (ys[0] + ys[1]) / 2, (zs[0] + zs[1]) / 2), bm);
    const bins = [[fz0 + PT + 0.03, zm0 - 0.03], [zm0 + 0.03, fz1 - PT - 0.03]], yc = 1.92;
    for (const [za, zb] of bins) { bb([fx0 + 0.15, 16.4], [yc, yc + 0.03], [za, zb]); bb([fx0 + 0.15, fx0 + 0.18], [yc, yc + 0.95], [za, zb]); bb([16.37, 16.4], [yc, yc + 0.95], [za, zb]); bb([fx0 + 0.15, 16.4], [yc, yc + 0.95], [za, za + 0.03]); bb([fx0 + 0.15, 16.4], [yc, yc + 0.95], [zb - 0.03, zb]); }
    layout(E, [I.lettuce(), I.apples(4), I.lemons(3)], bins[0][0], bins[0][1], yc + 0.03, 0.9);
    layout(E, [I.carrots(5), I.lettuce(), I.apples(3)], bins[1][0], bins[1][1], yc + 0.03, 0.9);
    const u0f = fz0 + PT, u1f = fz1 - PT;
    layout(E, [I.carton(), I.pitcher(), I.leftovers(2)], u0f, u1f, shelfYs[0] + 0.03, 0.55);
    layout(E, [I.eggs(), I.yogurt(5), I.condiments(5)], u0f, u1f, shelfYs[1] + 0.03, 0.55);
    layout(E, [I.yogurt(6), I.leftovers(2)], u0f, u1f, shelfYs[2] + 0.03, 0.55);
    layout(E, [I.leftovers(2), I.jars(2)], u0f, u1f, shelfYs[0] + 0.03, 1.35, true);
    layout(E, [I.cans(5, 0xE8B23C, 0x3B6E8C)], u0f, u1f, shelfYs[1] + 0.03, 1.35, true);
    bag.flush(g, { keep: true });
    // ---- freezer drawer: a full-width front on a pull-out basket of frozen food
    for (const zf of [fz0 + 0.15, fz1 - 0.4]) box(g, [xF - 0.42, xF - 0.18], [0, 0.1], [zf, zf + 0.25], 'frame', R);   // feet
    { const n0 = g.children.length, fb = new Bag(), FE = Emit(fb, kframe('z', fx0, -1)), za = fz0 + PT + 0.03, zb = fz1 - PT - 0.03, y0 = 0.2;
      box(g, [xF - 0.45, fx0], [0.1, frzTop], [fz0, fz1], 'fridgeLow', R);                                   // drawer front: flush, no handle
      const fbin = km('frzBin', 0xE9EEF1, 0.3, 0, { transparent: true, opacity: 0.5, depthWrite: false });
      const fx = (xs, ys, zs) => fb.add(new THREE.BoxGeometry(xs[1] - xs[0], ys[1] - ys[0], zs[1] - zs[0]).translate((xs[0] + xs[1]) / 2, (ys[0] + ys[1]) / 2, (zs[0] + zs[1]) / 2), fbin);
      fx([fx0, 16.25], [y0, y0 + 0.03], [za, zb]); fx([fx0, fx0 + 0.03], [y0, 1.45], [za, zb]); fx([16.22, 16.25], [y0, 1.45], [za, zb]); fx([fx0, 16.25], [y0, 1.45], [za, za + 0.03]); fx([fx0, 16.25], [y0, 1.45], [zb - 0.03, zb]);
      const fy = y0 + 0.03;
      FE.at(fz0 + 0.75, 0.75, fy); FE.box(km('pizzaA', 0xC9503B, 0.8), 0, 0, 0, 0.95, 0.06, 0.95); FE.box(km('pizzaB', 0xE0B93A, 0.8), 0, 0.06, 0, 0.95, 0.06, 0.95);
      FE.at(fz0 + 1.55, 0.6, fy); FE.box(km('peas', 0x5E8C4A, 0.7), 0, 0, 0, 0.5, 0.14, 0.7); FE.box(km('corn', 0xE0C23A, 0.7), 0, 0.14, 0, 0.5, 0.12, 0.7);
      for (let k = 0; k < 3; k++) { FE.at(fz0 + 2.1 + k * 0.45, 0.55, fy); FE.cyl(km('tub' + k, [0xE9B9C9, 0xF2EFE6, 0x7A5A3E][k], 0.6), 0, 0, 0, 0.19, 0.17, 0.32, 14); }
      FE.at(fz0 + 1.0, 1.45, fy); FE.box(km('meatA', 0xE9E4DA, 0.6), 0, 0, 0, 0.7, 0.1, 0.5); FE.box(km('meatB', 0xB5524A, 0.6), 0, 0.1, 0, 0.6, 0.08, 0.45);
      FE.at(fz0 + 2.2, 1.45, fy); FE.box(km('bag1', 0xD7E3EA, 0.5), 0, 0, 0, 0.7, 0.2, 0.55); FE.box(km('bag2', 0xA9C9E6, 0.5), 0, 0.2, 0, 0.6, 0.14, 0.5);
      fb.flush(g, { keep: true });
      const dv = pivotFrom(g, n0, 0, 0, 0); dv.traverse(o => { o.userData.keep = true; });
      act(dv, { kind: 'freezer', label: d => d.on ? 'Close the freezer' : 'Open the freezer', run: d => tweenTo(dv.position, 'x', d.on ? -1.6 : 0, 0.7) }); }
  }
  { const zm = (kz(37.3) + kz(73.1)) / 2, doors = []; let bevPv = null;
    for (const [za, zb, hz, sgn] of [[kz(37.3), zm - 0.005, kz(54.6), 1], [zm + 0.005, kz(73.1), kz(55.8), -1]]) {
      const n0 = g.children.length;
      box(g, [xF - 0.45, xF - 0.3], [fDoorB, fTop], [za, zb], 'fridgeDoor', R);                    // flush mirror-finish door, no handle
      box(g, [xF - 0.45, xF - 0.3], [frzTop, fDoorB], [za, zb], 'frame', R);                         // the dark gap above the freezer drawer, carried by the door
      box(g, [xF - 0.45, xF - 0.3], [fDoorB, fTop], sgn > 0 ? [zb, zb + 0.005] : [za - 0.005, za], 'frame', R);   // dark seam between the two doors
      { const db = new Bag(), bin = km('doorBin', 0xE9EEF1, 0.35, 0, { transparent: true, opacity: 0.55, depthWrite: false }), x0 = xF - 0.3, cs = [0x3B6E4A, 0x8B5A2B, 0xE8B23C, 0xB23A32];
        (sgn > 0 ? [2.05] : [2.05, 3.2, 4.35, 5.0]).forEach((yy, bi) => {
          db.add(new THREE.BoxGeometry(0.2, 0.03, zb - za - 0.1).translate(x0 + 0.1, yy, (za + zb) / 2), bin);
          db.add(new THREE.BoxGeometry(0.02, 0.22, zb - za - 0.1).translate(x0 + 0.19, yy + 0.11, (za + zb) / 2), bin);
          for (let k = 0; k < 4; k++) { const h = 0.5 - (bi % 2) * 0.14; db.add(new THREE.CylinderGeometry(0.075, 0.075, h, 10).translate(x0 + 0.1, yy + 0.03 + h / 2, za + 0.22 + k * ((zb - za - 0.44) / 3)), km('db' + ((k + bi) % 4), cs[(k + bi) % 4], 0.3, 0.1)); }
        }); db.flush(g, { keep: true }); }
      if (sgn > 0) {
        const zc = (za + zb) / 2, hw = 0.58, xd = xF - 0.3, xo = xF + 0.15, W = (xs, ys, zs, m = 'porcelain') => box(g, xs, ys, zs, m, R);
        W([xd, xo + 0.03], [2.9, 2.98], [zc - hw, zc + hw]);                                          // bottom ledge
        W([xd, xo], [4.35, 5.05], [zc - hw, zc + hw]);                                                // header block
        W([xd, xo - 0.05], [2.98, 4.35], [zc - hw, zc - hw + 0.05]);                                  // left wall of the bay
        W([xd, xo - 0.05], [2.98, 4.35], [zc + 0.12, zc + hw]);                                       // right block
        W([xo - 0.05, xo - 0.04], [3.2, 4.2], [zc + 0.2, zc + 0.5], 'steelTop');                      // stainless plate
        const cv = document.createElement('canvas'); cv.width = 320; cv.height = 56; const cx = cv.getContext('2d');
        cx.fillStyle = '#6d7175'; cx.font = '500 30px "Instrument Sans", Arial, sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle'; cx.fillText('Beverage Center', 160, 30);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const lab = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9 * 56 / 320).rotateY(Math.PI / 2), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
        lab.position.set(xo + 0.004, 4.72, zc); lab.userData.room = 'kitchen'; g.add(lab);
        const glassP = km('bevPitcher', 0xCFE3EE, 0.1, 0, { transparent: true, opacity: 0.32, depthWrite: false }), water = km('bevWater', 0x8FB4C6, 0.1, 0, { transparent: true, opacity: 0.6, depthWrite: false });
        const px0 = xd + 0.04, px1 = xo - 0.14, pz0 = zc - hw + 0.1, pz1 = zc + 0.06;
        box(g, [px0, px1], [3.02, 4.25], [pz0, pz1], 'frame', R).material = glassP;                  // the clear pitcher
        box(g, [px0 + 0.01, px1 - 0.01], [3.04, 3.95], [pz0 + 0.01, pz1 - 0.01], 'frame', R).material = water;   // water
        for (const [yy, zz] of [[3.8, 0.4], [3.62, 0.2], [3.47, 0.46]]) {                              // lemon slices
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.025, 20).rotateZ(Math.PI / 2), M('beverageLemon')); m.position.set((px0 + px1) / 2, yy, pz0 + zz * (pz1 - pz0) / 0.5 * 0.5); m.userData.room = 'kitchen'; g.add(m);
        }
        W([px0 - 0.02, px1 + 0.02], [4.25, 4.33], [pz0 - 0.02, pz1 + 0.02], 'steelTop');                // lid
        W([px1, px1 + 0.1], [3.1, 4.0], [pz0 + 0.02, pz0 + 0.1]);                                      // white handle
      }
      doors.push([pivotFrom(g, n0, xF - 0.45, 0, sgn > 0 ? za : zb), -sgn * 1.9]);
    }
    const fl = new THREE.PointLight(0xf4f7ff, 0, 2.2, 2); fl.position.set(xF - 0.7, 3.6, zm); fl.visible = false; g.add(fl);
    const grp = new THREE.Group(); g.add(grp); doors.forEach(([pv]) => { g.remove(pv); grp.add(pv); });
    grp.traverse(o => { o.userData.nocut = true; });
    act(grp, { kind: 'fridge', label: d => d.on ? 'Close fridge' : 'Open fridge', run: d => {
      doors.forEach(([pv, a]) => tweenTo(pv.rotation, 'y', d.on ? a : 0, 0.8));
      fl.visible = d.on; fl.intensity = d.on ? 0.5 : 0; } });
  }
  shell({ along: 'z', face: xF, dir: -1, u: [kz(37.19), kz(73.94)], y: [cB, H], back: 16.52, mat: 'oak', top: true, keep: true, shelves: [cB + 1.05] });
  fillShelves(g, kframe('z', xF, -1), kz(37.19) + PT, kz(73.94) - PT, [cB + PT, cB + 1.05 + PT], [[I.platter(), I.mixing(), I.bakingdish()], [I.plates(6, 0.4), I.bowls(4), I.mugs(3)]], 0.7, { keep: true });
  frontsX(xF, [[kz(37.19), kz(55.56), cB, H, 'br'], [kz(55.56), kz(73.94), cB, H, 'bl']], 'oak', -1);

  // ---- Dining table 3'-0" × 6'-0" (Eiermann style): slate-blue linoleum top w/ exposed oak ply edge + chrome X-braced frame
  const [TX, TZ] = DINING_CENTER, tz = d => TZ + d, tx = d => TX + d, RF = { ...R, phase: 'furniture' };
  RT.NOCUT = true;                                                                   // furniture: never cut by the wall cutaway
  box(g, [tx(-1.50), tx(1.50)], [2.42, 2.48], [tz(-3.00), tz(3.00)], 'oak', RF);        // exposed oak/birch ply edge
  box(g, [tx(-1.495), tx(1.495)], [2.48, 2.50], [tz(-2.995), tz(2.995)], 'tableSlate', RF); // matte slate-blue top
  for (const dz of [-2.55, 2.55]) {
    for (const dx of [-1.32, 1.32]) rod(g, [tx(dx), 0, tz(dz)], [tx(dx), 2.42, tz(dz)], 0.044, 'chairChrome', RF);
    rod(g, [tx(-1.32), 2.38, tz(dz)], [tx(1.32), 2.38, tz(dz)], 0.032, 'chairChrome', RF);
    rod(g, [tx(-1.32), 0.35, tz(dz)], [tx(1.32), 0.35, tz(dz)], 0.028, 'chairChrome', RF);
  }
  // Iconic Eiermann diagonal chrome cross-braces under the top
  rod(g, [tx(-1.32), 0.35, tz(-2.55)], [tx(1.32), 2.38, tz(2.55)], 0.028, 'chairChrome', RF);
  rod(g, [tx(1.32), 0.35, tz(-2.55)], [tx(-1.32), 2.38, tz(2.55)], 0.028, 'chairChrome', RF);

  const flattenChair = ch => {
    ch.updateMatrixWorld(true);
    const meshes = [];
    ch.traverse(m => { if (m.isMesh) meshes.push(m); });
    for (const m of meshes) {
      m.geometry.applyMatrix4(m.matrixWorld);
      m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1);
      m.updateMatrix();
      g.add(m);
    }
    g.remove(ch);
  };

  // 4 Cesca cantilevered cane side chairs (chrome cantilever frame + oak trim + woven cane)
  const cescaJoint = new THREE.SphereGeometry(0.034, 6, 6);
  const buildCesca = (cx, cz, rotY) => {
    const ch = new THREE.Group();
    ch.position.set(cx, 0, cz);
    ch.rotation.y = rotY;
    g.add(ch);
    const cr = 0.032;
    for (const s of [-1, 1]) {
      const z = s * 0.64;
      rod(ch, [-0.52, 0.032, z], [0.58, 0.032, z], cr, 'chairChrome', RF);        // floor runner
      rod(ch, [0.58, 0.032, z], [0.54, 1.46, z], cr, 'chairChrome', RF);          // cantilevered front upright
      rod(ch, [0.54, 1.46, z], [-0.54, 1.46, z], cr, 'chairChrome', RF);          // seat side rail
      rod(ch, [-0.54, 1.46, z], [-0.60, 2.66, z], cr, 'chairChrome', RF);         // backrest upright
      for (const [jx, jy] of [[0.58, 0.032], [0.54, 1.46], [-0.54, 1.46], [-0.60, 2.66]]) {
        const j = addGeo(ch, cescaJoint.clone(), 'chairChrome', RF); j.position.set(jx, jy, z);
      }
    }
    rod(ch, [-0.52, 0.032, -0.64], [-0.52, 0.032, 0.64], cr, 'chairChrome', RF);  // rear floor crossbar
    rod(ch, [0.50, 1.46, -0.64], [0.50, 1.46, 0.64], cr, 'chairChrome', RF);      // front seat crossbar
    rod(ch, [-0.50, 1.46, -0.64], [-0.50, 1.46, 0.64], cr, 'chairChrome', RF);    // rear seat crossbar
    // Oak frame + woven cane seat
    box(ch, [-0.52, 0.56], [1.47, 1.54], [-0.65, -0.54], 'oak', RF);
    box(ch, [-0.52, 0.56], [1.47, 1.54], [0.54, 0.65], 'oak', RF);
    box(ch, [0.45, 0.56], [1.47, 1.54], [-0.54, 0.54], 'oak', RF);
    box(ch, [-0.52, -0.41], [1.47, 1.54], [-0.54, 0.54], 'oak', RF);
    box(ch, [-0.41, 0.45], [1.48, 1.53], [-0.54, 0.54], 'cane', RF);
    // Oak frame + woven cane backrest
    const bk = new THREE.Group(); bk.position.set(-0.60, 2.28, 0); bk.rotation.z = 0.08; ch.add(bk);
    box(bk, [-0.04, 0.04], [-0.38, 0.38], [-0.64, -0.54], 'oak', RF);
    box(bk, [-0.04, 0.04], [-0.38, 0.38], [0.54, 0.64], 'oak', RF);
    box(bk, [-0.04, 0.04], [0.28, 0.38], [-0.54, 0.54], 'oak', RF);
    box(bk, [-0.04, 0.04], [-0.38, -0.28], [-0.54, 0.54], 'oak', RF);
    box(bk, [-0.03, 0.03], [-0.28, 0.28], [-0.54, 0.54], 'cane', RF);
    flattenChair(ch);
  };
  for (const z of [-1.28, 1.28].map(tz)) {
    buildCesca(tx(-1.58), z, 0);
    buildCesca(tx(1.58), z, Math.PI);
  }

  // 2 Red tubular-frame + warm wood-shell end chairs
  const redJoint = new THREE.SphereGeometry(0.038, 6, 6);
  const redSeatGeo = new THREE.CylinderGeometry(0.64, 0.64, 0.08, 16);
  const backWoodCurve = new THREE.Shape();
  backWoodCurve.moveTo(0.10, -0.62); backWoodCurve.quadraticCurveTo(-0.08, 0, 0.10, 0.62);
  backWoodCurve.lineTo(0.03, 0.63); backWoodCurve.quadraticCurveTo(-0.15, 0, 0.03, -0.63);
  backWoodCurve.closePath();
  const redBackGeo = new THREE.ExtrudeGeometry(backWoodCurve, { depth: 0.72, bevelEnabled: false });
  redBackGeo.rotateX(-Math.PI / 2);

  const buildRedEndChair = (cx, cz, rotY) => {
    const ch = new THREE.Group();
    ch.position.set(cx, 0, cz);
    ch.rotation.y = rotY;
    g.add(ch);
    const rr = 0.036;
    for (const s of [-1, 1]) {
      const z = s * 0.62;
      rod(ch, [0.52, 0.02, z], [0.46, 1.46, z], rr, 'chairRed', RF);              // front red leg
      rod(ch, [0.46, 1.46, z], [-0.52, 1.46, z], rr, 'chairRed', RF);             // side seat rail
      rod(ch, [-0.58, 0.02, z], [-0.52, 1.46, z], rr, 'chairRed', RF);            // rear red leg
      rod(ch, [-0.52, 1.46, z], [-0.62, 2.72, z], rr, 'chairRed', RF);            // red backrest post
      for (const [jx, jy] of [[0.46, 1.46], [-0.52, 1.46], [-0.62, 2.72]]) {
        const j = addGeo(ch, redJoint.clone(), 'chairRed', RF); j.position.set(jx, jy, z);
      }
    }
    rod(ch, [0.42, 1.46, -0.62], [0.42, 1.46, 0.62], rr, 'chairRed', RF);
    rod(ch, [-0.48, 1.46, -0.62], [-0.48, 1.46, 0.62], rr, 'chairRed', RF);
    const seat = addGeo(ch, redSeatGeo.clone(), 'diningWood', RF);
    seat.scale.set(0.95, 1, 1.05); seat.position.set(0.02, 1.50, 0);
    const back = addGeo(ch, redBackGeo.clone(), 'diningWood', RF);
    back.position.set(-0.62, 1.94, 0); back.rotation.z = 0.08;
    flattenChair(ch);
  };
  buildRedEndChair(tx(0), tz(-3.05), -Math.PI / 2);
  buildRedEndChair(tx(0), tz(3.05), Math.PI / 2);

  // Tabletop centerpiece: pedestal wood fruit bowl, tall ribbed glass vase w/ colorful gladiolus, pitcher & taper candle
  const ty = 2.50;
  // Pedestal fruit bowl + colorful fruit
  const pedBase = addGeo(g, new THREE.CylinderGeometry(0.14, 0.18, 0.16, 14), 'diningWood', RF);
  pedBase.position.set(tx(0.10), ty + 0.08, tz(0.35));
  const pedBowl = addGeo(g, new THREE.CylinderGeometry(0.42, 0.36, 0.09, 18), 'diningWood', RF);
  pedBowl.position.set(tx(0.10), ty + 0.20, tz(0.35));
  for (const [fx, fy, fz, fr, fm] of [
    [0.02, 0.31, 0.26, 0.10, 'bloomRed'], [0.20, 0.30, 0.42, 0.11, 'leafGreen'],
    [-0.08, 0.30, 0.45, 0.10, 'bloomGold'], [0.14, 0.33, 0.22, 0.09, 'burgundy'],
  ]) {
    const frt = addGeo(g, new THREE.SphereGeometry(fr, 10, 8), fm, RF);
    frt.position.set(tx(fx), ty + fy, tz(fz));
  }
  // Ribbed glass vase + tall gladiolus stems (red-orange, gold, white)
  const vx = tx(-0.32), vz = tz(-0.35);
  const vase = addGeo(g, new THREE.CylinderGeometry(0.18, 0.15, 0.68, 16), 'glass', RF);
  vase.position.set(vx, ty + 0.34, vz);
  const gladStems = [
    [-0.38, 1.35, -0.22, 'bloomRed'], [-0.15, 1.52, 0.18, 'bloomGold'],
    [0.18, 1.48, -0.15, 'bloomWhite'], [0.35, 1.28, 0.20, 'bloomRed'],
    [-0.05, 1.58, -0.05, 'bloomGold'], [0.22, 1.38, 0.02, 'leafGreen'],
  ];
  for (const [dx, top, dz, mat] of gladStems) {
    rod(g, [vx, ty + 0.08, vz], [vx + dx, ty + top, vz + dz], 0.012, 'leafGreen', RF);
    for (let k = 0; k < 3; k++) {
      const f = 0.68 + k * 0.15;
      const fl = addGeo(g, new THREE.SphereGeometry(0.075, 8, 6), mat, RF);
      fl.position.set(vx + dx * f, ty + 0.08 + (top - 0.08) * f, vz + dz * f);
    }
  }
  // Ceramic pitcher + white holder with blue taper candle
  const pitcher = addGeo(g, new THREE.CylinderGeometry(0.11, 0.13, 0.42, 14), 'biscuit', RF);
  pitcher.position.set(tx(-0.48), ty + 0.21, tz(0.05));
  const cHolder = addGeo(g, new THREE.CylinderGeometry(0.10, 0.11, 0.06, 14), 'chalk', RF);
  cHolder.position.set(tx(-0.22), ty + 0.03, tz(0.08));
  const taper = addGeo(g, new THREE.CylinderGeometry(0.025, 0.028, 0.48, 10), 'tableSlate', RF);
  taper.position.set(tx(-0.22), ty + 0.30, tz(0.08));
  RT.NOCUT = false;
}



export { Bag, KMAT, km, kGlass, kSteel, kBlack, kframe, Emit, I, layout, fillShelves, DR, rrPath, KIT, kx, buildKitchen };
