// Palette, procedural 2D canvas textures, ambient occlusion maps, and Three.js material factory.
import * as THREE from 'three';
import { LITE } from '../config/constants.js';
import { ENV_MATS } from './state.js';

/* =====================================================================
   2. PALETTE + MATERIALS
   ===================================================================== */
const C = {
  chalk: 0xEEE7DC, wood: 0xB2A082, woodStair: 0xC9A777, siding: 0x5B2B20, roof: 0x5E1F26,
  frame: 0x151515, glass: 0xA7C2CC, concrete: 0x9D9991, deck: 0x977552, ground: 0xC4CBB8,
  gravel: 0xB8B2A6, nautical: 0x25415F, biscuit: 0xE6D6B8, brownberry: 0x5C3A2E, chrome: 0xD5D9DC,
  porcelain: 0xF6F5F1, millwork: 0xC9A87F, door: 0xF3EFE7, stone: 0x8E877D, tileTBD: 0xD3CBBD,
  membrane: 0x3B3A39, steel: 0x262626, panel: 0x9DA2A5, appliance: 0xBFC3C5, fabric: 0xC2B8AA,
  soffit: 0xB08A5E,
};

function canvasTex(draw, px = 256) {
  const c = document.createElement('canvas'); c.width = c.height = px;
  const g = c.getContext('2d'); draw(g, px);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const TEX = {
  // vertical boards, 6" o.c. (texture tile = 4 ft)
  boards: canvasTex((g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const n = 8, w = s / n;
    for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + (i * 37 % 7) / 120})`; g.fillRect(i * w, 0, w, s); }
    g.fillStyle = 'rgba(0,0,0,0.45)'; for (let i = 0; i < n; i++) g.fillRect(i * w, 0, 2, s);
  }),
  // standing seams ~16" o.c. (tile = 4 ft)
  seams: canvasTex((g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const n = 3, w = s / n;
    for (let i = 0; i < n; i++) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(i * w, 0, 2, s); g.fillStyle = 'rgba(255,255,255,0.5)'; g.fillRect(i * w + 2, 0, 1, s); }
  }),
  // engineered oak planks, 220 mm (≈8.7") wide, running east–west (tile = 8 ft)
  planks: canvasTex((g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const rows = 11, h = s / rows;
    for (let r = 0; r < rows; r++) {
      let x = -((r * 87) % 150);
      while (x < s) {
        const len = 130 + ((r * 49 + x) % 110);
        g.fillStyle = `rgba(110,96,74,${0.02 + ((r * 13 + Math.abs(x)) % 9) / 160})`; g.fillRect(x, r * h, len, h);
        g.fillStyle = 'rgba(110,96,74,0.06)'; g.fillRect(x, r * h, 1, h);
        x += len;
      }
      g.fillStyle = 'rgba(110,96,74,0.06)'; g.fillRect(0, r * h, s, 1);
    }
  }, 512),
  // square tile, 4 tiles per foot-ish grid (tile = 2 ft → 6" tiles)
  tile: canvasTex((g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const n = 4, w = s / n; g.fillStyle = 'rgba(0,0,0,0.22)';
    for (let i = 0; i < n; i++) { g.fillRect(i * w, 0, 2, s); g.fillRect(0, i * w, s, 2); }
  }),
  cane: canvasTex((g, s) => {
    g.fillStyle = '#4A3620'; g.fillRect(0, 0, s, s);
    const n = 8, w = s / n; g.fillStyle = '#D9B982';
    for (let i = 0; i < n; i++) { g.fillRect(i * w + 1, 0, w * 0.48, s); g.fillRect(0, i * w + 1, s, w * 0.48); }
  }, 64),
  // sealed/polished concrete (tile = 16 ft): tileable cloudy variation at three scales, fine grain,
  // sparse aggregate flecks and a few faint hairline cracks. Values stay within a narrow band (±6%).
  concrete: canvasTex((g, s) => {
    let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = 'rgb(236,236,236)'; g.fillRect(0, 0, s, s);
    g.imageSmoothingEnabled = true;
    for (const [cells, alpha] of [[4, 0.10], [12, 0.08], [32, 0.05]]) {
      const c = document.createElement('canvas'); c.width = c.height = cells;
      const cg = c.getContext('2d'), id = cg.createImageData(cells, cells);
      for (let i = 0; i < cells * cells; i++) { const v = 150 + rnd() * 105; id.data.set([v, v, v, 255], i * 4); }
      cg.putImageData(id, 0, 0);
      g.globalAlpha = alpha;
      for (const dx of [-1, 0, 1]) for (const dy of [-1, 0, 1]) g.drawImage(c, dx * s, dy * s, s, s);   // wrap for seamless tiling
    }
    g.globalAlpha = 1;
    const img = g.getImageData(0, 0, s, s), px = img.data;
    for (let i = 0; i < px.length; i += 4) {                                    // fine trowel grain
      const n = (rnd() - 0.5) * 10; px[i] += n; px[i + 1] += n; px[i + 2] += n;
    }
    g.putImageData(img, 0, 0);
    for (let i = 0; i < 650; i++) {                                             // sand + small aggregate
      const x = rnd() * s, y = rnd() * s, d = rnd() < 0.9 ? 1.0 : 2.0, v = rnd() < 0.5 ? 120 + (rnd() * 40 | 0) : 250;
      g.fillStyle = `rgba(${v},${v},${v},${0.18 + rnd() * 0.22})`; g.fillRect(x, y, d, d);
    }
    g.strokeStyle = 'rgba(110,110,110,0.10)'; g.lineWidth = 1;                // hairline cracks
    for (let k = 0; k < 3; k++) {
      let x = rnd() * s, y = rnd() * s; g.beginPath(); g.moveTo(x, y);
      for (let j = 0; j < 10; j++) { x += (rnd() - 0.5) * 35; y += (rnd() - 0.3) * 25; g.lineTo(x, y); }
      g.stroke();
    }
  }, 512),
  // stainless: fine brushed grain with soft long streaks (tile = 3 ft)
  brushed: canvasTex((g, s) => {
    let seed = 5; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 360; i++) {
      const y = rnd() * s, v = 200 + (rnd() * 55 | 0);
      g.fillStyle = `rgba(${v},${v},${v},${0.10 + rnd() * 0.18})`; g.fillRect(0, y, s, 0.8 + rnd());
    }
  }),
  // 6" tile with tone-matched grout: barely visible joints, slight per-tile variation (tile = 2 ft → 4 × 4)
  tileTone: canvasTex((g, s) => {
    const n = 4, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 245 + ((i * 7 + j * 13) % 11); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * w, j * w, w, w);
    }
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < n; i++) { g.fillRect(i * w, 0, 3, s); g.fillRect(0, i * w, s, 3); }
  }),
  // 2"×2" mosaic, gray grout (tile = 16" → 8 × 8 tiles)
  mosaic: canvasTex((g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const n = 8, w = s / n; g.fillStyle = 'rgba(95,98,102,0.75)';
    for (let i = 0; i < n; i++) { g.fillRect(i * w, 0, 4, s); g.fillRect(0, i * w, s, 4); }
  }),
  // 2"×2" mosaic for the baths: grout a shade darker than the tile (tile = 16" → 8 × 8)
  mosaicTone: canvasTex((g, s) => {
    const n = 8, w = s / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = 244 + ((i * 5 + j * 11) % 9); g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(i * w, j * w, w, w);
    }
    g.fillStyle = 'rgba(0,0,0,0.2)';
    for (let i = 0; i < n; i++) { g.fillRect(i * w, 0, 3, s); g.fillRect(0, i * w, s, 3); }
  }),
  // deck boards 5.5" running north–south (tile = 4 ft)
  deck: canvasTex((g, s) => {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, s, s);
    const n = 9, w = s / n;
    for (let i = 0; i < n; i++) { g.fillStyle = `rgba(0,0,0,${0.02 + (i * 5 % 4) / 50})`; g.fillRect(i * w, 0, w, s); g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(i * w, 0, 4, s); }
  }),
  // cross-reeded / waffle-grid architectural glass (tile = 0.5 ft → 8 × 8 cells ≈ 3/4" squares)
  waffleGlass: canvasTex((g, s) => {
    const n = 8, w = s / n;
    g.fillStyle = '#aeb8b5'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = i * w, y = j * w;
      const gr = g.createRadialGradient(x + w * 0.45, y + w * 0.45, w * 0.05, x + w * 0.5, y + w * 0.5, w * 0.65);
      gr.addColorStop(0, '#f4f7f6');
      gr.addColorStop(0.55, '#cfd8d5');
      gr.addColorStop(1, '#8d9895');
      g.fillStyle = gr;
      g.fillRect(x + 1, y + 1, w - 2, w - 2);
    }
    g.fillStyle = 'rgba(55,64,62,0.72)';
    for (let i = 0; i < n; i++) { g.fillRect(i * w, 0, 2, s); g.fillRect(0, i * w, s, 2); }
  }),
};

const MAT_DEFS = {
  chalk:      { color: C.chalk, rough: 1, env: 0.15 },
  wood:       { color: C.wood, map: TEX.planks, tile: 8, rough: 0.7 },
  woodStair:  { color: C.woodStair, rough: 0.7 },
  woodRiser:  { color: 0xA4865E, rough: 0.75 },                         // stair risers, set back under the nosings (reads as a shadow line)
  siding:     { color: C.siding, map: TEX.boards, tile: 4, rough: 0.85 },
  sidingWood: { color: 0xC9A273, map: TEX.boards, tile: 4, rough: 0.8 },    // living-room wing: light wood siding (owner), same tone as the wall panels
  roof:       { color: C.roof, map: TEX.seams, tile: 4, rough: 0.45, metal: 0.35 },
  frame:      { color: C.frame, rough: 0.5, metal: 0.3 },
  mwLed:      { color: 0x7DFFB4, rough: 0.3, emissive: 0x4DFF9A, emissiveI: 0.9 },
  hoodLed:    { color: 0xFFF4DC, rough: 0.3, emissive: 0xFFF0CC, emissiveI: 0.8 },
  lever:      { color: C.chrome, rough: 0.12, metal: 1, env: 1.0 },                    // door levers, hinges, pulls: chrome
  glass:      { color: C.glass, rough: 0.05, opacity: 0.20 },
  waffleGlass:{ color: 0xB8C4C0, map: TEX.waffleGlass, bump: TEX.waffleGlass, bumpScale: 0.03, tile: 0.5, rough: 0.18, metal: 0.12, opacity: 0.46, env: 1.1 },
  concrete:   { color: C.concrete, rough: 0.95 },
  deck:       { color: C.deck, map: TEX.deck, tile: 4, rough: 0.85 },
  skirt:      { color: 0x232323, map: TEX.boards, tile: 2, rough: 0.8 },     // black-painted vertical wood skirting under the decks
  foundation: { color: 0x2E2E2F, rough: 0.92 },                           // exposed foundation, parged + painted charcoal (owner)
  ground:     { color: C.ground, rough: 1 },
  gravel:     { color: C.gravel, rough: 1 },
  nautical:   { color: C.nautical, map: TEX.mosaicTone, tile: 1.333, rough: 0.3 },     // 2"×2" mosaic
  biscuit:    { color: C.biscuit, map: TEX.mosaicTone, tile: 1.333, rough: 0.3 },      // 2"×2" mosaic
  brownberry: { color: C.brownberry, map: TEX.mosaicTone, tile: 1.333, rough: 0.3 },   // 2"×2" mosaic
  biscuitShade: { color: 0xB9A98C, rough: 0.5 },
  snow:       { color: 0xF3F5F7, rough: 0.9 },
  ceiling:    { color: 0xF7F6F2, rough: 1, env: 0.1 },                          // painted GWB ceilings, flat matte white
  woodPanel:  { color: 0xC9A273, rough: 0.6 },                              // wood wall panel (A402): smooth, no joint lines
  concreteFloor: { color: 0x938F8A, map: TEX.concrete, tile: 16, rough: 0.38 },   // ground floor, sealed concrete (mid gray)
  wineTile:   { color: 0x6B2330, map: TEX.tileTone, tile: 2, rough: 0.45 },       // foyer 6"×6", grout matched
  wineGloss:  { color: 0x6E2232, map: TEX.tileTone, tile: 1.333, rough: 0.12 },   // hearth 4"×4", glossy, grout matched
  burgundy:   { color: 0x5B2630, rough: 0.75 },                          // Reform BASIS linoleum, Burgundy (Forbo 4154)
  oak:        { color: 0xCFA676, rough: 0.6 },                           // Reform BASIS natural oak veneer
  oakCarcass: { color: 0xD8BC94, rough: 0.7 },                           // Reform Box, oak laminate
  // Cabinet fronts carry a baked soft-shadow map (edges and the strip under the counter fall off), so the big
  // flat faces read with depth instead of one flat tone. "B" = base cabinets (extra shade under the counter lip).
  burgundyF:  { color: 0x5B2630, rough: 0.72, ao: 'edge' },
  burgundyB:  { color: 0x5B2630, rough: 0.72, ao: 'base' },
  oakF:       { color: 0xCFA676, rough: 0.8 },                           // light wood fronts: flat even tone, no baked shading
  oakB:       { color: 0xCFA676, rough: 0.8 },
  carcassIn:  { color: 0xD3B58A, rough: 0.72, ao: 'cavity' },              // inside of cabinets: darker, edges deeper
  fridgeIn:   { color: 0xF2F3F1, rough: 0.4, ao: 'cavity' },
  bore:       { color: 0xE2C9A2, rough: 0.7 },                           // light oak seen inside a finger hole
  steelBowl:  { color: 0xA6ACB2, map: TEX.brushed, tile: 3, rough: 0.24, metal: 1.0, env: 0.95 },   // sink walls: same stainless, in its own shade
  steelBowlF: { color: 0xB4BAC0, map: TEX.brushed, tile: 3, rough: 0.26, metal: 1.0, env: 0.95 },   // sink floor
  ovenGlass:  { color: 0x14171A, rough: 0.07, metal: 0.25, env: 0.9 },                 // black glass: oven door, cooktop, display
  beverageLemon: { color: 0xF2D04A, rough: 0.6 },
  steelTop:   { color: 0xA7ACB1, map: TEX.brushed, tile: 3, rough: 0.14, metal: 1.0, env: 0.8 },  // 5 mm stainless countertop + range, a touch darker (owner)
  mosaic:     { color: 0xF4F3EF, map: TEX.mosaic, tile: 1.333, rough: 0.3 }, // 2"×2" white mosaic, gray grout
  mirror:     { color: 0xB4C3CA, rough: 0.12, metal: 0.05 },
  tileTBD:    { color: C.tileTBD, map: TEX.tile, tile: 1.333, rough: 0.5 },   // 4"x4"
  stone:      { color: C.stone, rough: 0.9 },
  chrome:     { color: C.chrome, rough: 0.12, metal: 1, env: 1.0 },
  porcelain:  { color: C.porcelain, rough: 0.2 },
  millwork:   { color: C.millwork, rough: 0.6 },
  door:       { color: C.door, rough: 0.7 },
  windowTrim: { color: 0xB88B5A, rough: 0.62 },
  membrane:   { color: C.membrane, rough: 0.9 },
  steel:      { color: C.steel, rough: 0.6, metal: 0.5 },
  panel:      { color: C.panel, rough: 0.5, metal: 0.4 },
  appliance:  { color: 0xC4C8CB, rough: 0.35, metal: 0.25 },
  fridgeDoor: { color: 0xC7CACE, rough: 0.1, metal: 1.0, env: 1.2 },                      // mirror-finish stainless upper doors
  fridgeLow:  { color: 0xB4B7BB, rough: 0.5, metal: 0.55, env: 0.55 },                    // matte gray steel freezer panel
  fabric:     { color: C.fabric, rough: 1 },
  fabricBase: { color: 0x9C9285, rough: 1 },
  sofa:       { color: 0x6E7E98, rough: 1 },                             // living sectional: blue-gray woven upholstery
  sofaBase:   { color: 0x5F6E86, rough: 1 },
  rug:        { color: 0x1E2C5C, rough: 1 },                             // navy wool rug
  sage:       { color: 0xA2A55F, rough: 0.7 },                           // round coffee table, sage/olive lacquer
  tableSlate: { color: 0x5D6B44, rough: 0.78 },                          // Eiermann matte olive-green linoleum tabletop
  chairChrome:{ color: 0x8E959C, rough: 0.14, metal: 0.96, env: 1.1 },   // high-contrast reflective chrome for chair/table frames
  cane:       { color: 0xD2B078, map: TEX.cane, tile: 0.5, rough: 0.85 }, // woven rattan cane for Cesca chairs
  chairRed:   { color: 0xC82B23, rough: 0.35, metal: 0.3 },              // red tubular steel frame for end chairs
  diningWood: { color: 0xA66734, rough: 0.46 },                          // warm wood shells, pedestal & tray
  leafGreen:  { color: 0x5A7342, rough: 0.78 },                          // floral stems & foliage
  bloomRed:   { color: 0xDF3B24, rough: 0.65 },                          // gladiolus red-orange blooms
  bloomGold:  { color: 0xF0A828, rough: 0.65 },                          // gladiolus yellow-gold blooms
  bloomWhite: { color: 0xF4F2EA, rough: 0.7 },                           // gladiolus white blooms
  soffit:     { color: C.roof, rough: 0.45, metal: 0.35 },                // eave soffit + its front edge (fascia): roof color (owner)
};
const AO_TEX = (() => {
  const mk = fn => {
    const S = 64, c = document.createElement('canvas'); c.width = c.height = S;
    const x = c.getContext('2d'), im = x.createImageData(S, S);
    for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
      const u = (i + 0.5) / S, v = 1 - (j + 0.5) / S, val = Math.max(0, Math.min(1, fn(u, v))) * 255, k = (j * S + i) * 4;
      im.data[k] = im.data[k + 1] = im.data[k + 2] = val; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c); t.channel = 1; return t;       // read through the second UV set (the first is world-projected)
  };
  const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const edge = (u, v) => { const d = Math.min(u, 1 - u, v, 1 - v); return 1 - 0.07 * Math.pow(1 - ss(0, 0.1, d), 2); };   // barely-there edge softening
  return {
    edge: mk(edge),
    base: mk((u, v) => edge(u, v) * (1 - 0.05 * Math.pow(1 - ss(0, 0.2, 1 - v), 2))),
    cavity: mk((u, v) => 0.93 - 0.1 * Math.pow(1 - ss(0, 0.2, Math.min(u, 1 - u, v, 1 - v)), 2)),
  };
})();
const MATS = {};
function M(name) {
  if (MATS[name]) return MATS[name];
  const d = MAT_DEFS[name];
  const opts = {
    color: d.color, map: d.map || null, bumpMap: d.bump || null, bumpScale: d.bumpScale ?? 0.015,
    roughness: d.rough ?? 0.8, metalness: d.metal ?? 0,
    transparent: d.opacity != null, opacity: d.opacity ?? 1, depthWrite: d.opacity == null,
  };
  if (d.transmission != null) { opts.transmission = d.transmission; opts.ior = d.ior ?? 1.5; opts.thickness = d.thickness ?? 0.08; }
  const m = d.transmission != null ? new THREE.MeshPhysicalMaterial(opts) : new THREE.MeshStandardMaterial(opts);
  m.name = name; m.userData.tile = d.tile || 4;
  if (d.ao) { m.aoMap = AO_TEX[d.ao]; m.aoMapIntensity = 1; }
  if (d.emissive) { m.emissive = new THREE.Color(d.emissive); m.emissiveIntensity = d.emissiveI ?? 1; }
  return (MATS[name] = m);
}
const lampMat = new THREE.MeshStandardMaterial({ color: 0xf3eee6, emissive: 0xffd09a, emissiveIntensity: 0, roughness: 0.5 });
const creamMat = new THREE.MeshStandardMaterial({ color: 0xF0DDA6, emissive: 0xffd28f, emissiveIntensity: 0, roughness: 0.18 });   // cream opal glass, glossy
creamMat.name = 'creamGlass'; lampMat.name = 'lamp';
const paperMat = new THREE.MeshStandardMaterial({ color: 0xf8f4ec, emissive: 0xffd8a8, emissiveIntensity: 0, roughness: 0.95 });
paperMat.name = 'paper';



export const makeMirrorFogMat = () => new THREE.MeshStandardMaterial({ color: 0xe6ecee, roughness: 0.92, metalness: 0, transparent: true, opacity: 0, depthWrite: false });
export const BATH_MIRROR = makeMirrorFogMat();
export const trimMat = M('frame');
export const ribMat = new THREE.MeshStandardMaterial({ color: 0xe8e1d4, roughness: 1 });

function exteriorLightsOnly(m) {
  if (!m || m.__extLights) return;
  m.__extLights = true; m.userData.extLights = true;
  const ptLimit = LITE ? String(6) : 'NUM_POINT_LIGHT_SHADOWS';
  m.onBeforeCompile = sh => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <lights_fragment_begin>',
      THREE.ShaderChunk.lights_fragment_begin
        .replace('for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ )', `for ( int i = 0; i < ${ptLimit}; i ++ )`)
        .replace('for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ )', 'for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ )'));
  };
  m.customProgramCacheKey = () => 'extLights';
  m.needsUpdate = true;
}


export function setEnvNight(dk) {
  for (const { mat, env } of ENV_MATS) mat.envMapIntensity = env * (1 - 0.88 * dk);
}

export { C, canvasTex, TEX, MAT_DEFS, AO_TEX, MATS, M, lampMat, creamMat, paperMat, exteriorLightsOnly };
