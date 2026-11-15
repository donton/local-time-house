// Architectural coordinates, elevations, camera presets, and device media queries.
import * as THREE from 'three';

/* =====================================================================
   0. COORDINATES
   All geometry is in FEET. Plan origin = grid 01 (x) / grid A (z).
   x → east, z → south (plan down), y → up. Main floor = 0'-0".
   The model root is scaled to METERS for the viewer and the GLB.
   ===================================================================== */
const FT = 0.3048;

/* =====================================================================
   1. LEVELS — A201 / A301 / A102 / A402.1
   ===================================================================== */
const LV = {
  GRADE: -2.25,        // A201 "GRADE -2'-3""
  SUNKEN: -1.5,        // sunken living, A402.1 (3 risers @ 6")
  MAIN: 0,
  CEIL1: 8.0,          // T.O. ground wall plate
  LOFT: 9.333,         // Level 2 9'-4"
  PLATE: 13.833,       // T.O. loft wall plate 13'-10"
  LOFT_CEIL: 17.333,   // dormer bedroom flat ceiling, 8'-0" above loft (A301 sect. 1)
  WING_TOP: 9.375,     // flat roof parapet, 10'-10½" above sunken level
  RIDGE: 23.833,       // A102 ridge 23'-10"
  RIDGE_Z: 8.535,      // ridge centered on the 17' bar
  ROOF_EDGE_N: -0.62, ROOF_EDGE_S: 17.69,
  DORMER_X: [23.73, 41.67],  // A102: 17'-11" shed dormer, 6'-4" from east edge
  DORMER_JOIN_Z: 12.8, DORMER_JOIN_Y: 19.583,  // 19'-7"
  DORMER_EAVE_Y: 18.42,                         // 18'-5"
  DORMER_WALL_TOP: 17.75,
};
const roofTop = z => LV.RIDGE - Math.abs(z - LV.RIDGE_Z);       // 12/12, top of roofing
const roofUnder = z => roofTop(z) - 1.17;                        // underside; = plate at wall face
const loftWallTop = z => Math.min(LV.LOFT_CEIL, roofUnder(z));   // interior loft partitions

/* Exterior wall bands (F.O. siding → F.O. interior gyp), from the PDF linework */
const EXT = { N: [-0.32, 0.52], S: [16.54, 17.39], W: [-0.34, 0.51], E: [47.56, 48.4] };


export { FT, LV, roofTop, roofUnder, loftWallTop, EXT };
export const WING_SIDING_FROM = -1.75;
export const DINING_CENTER = [(0.51 + 16.52) / 2, (0.52 + 16.54) / 2 + 1.5];
export const STUB = 1.0;
export const MQ_PHONE = matchMedia('(max-width: 700px), (pointer: coarse) and (max-width: 1024px)');
export const LITE = MQ_PHONE.matches;
export const FOV = { orbit: 32, inside: 65 };
export const HOME = { pos: new THREE.Vector3(74 * FT, 28 * FT, 62 * FT), target: new THREE.Vector3(0, 1.5, 1.5) };
export const DAY = { hemi: 0.85, sun: 2.5, fill: 0, exposure: 1.05 };
export const NIGHTSET = { bg: 0x1c2536, hemi: 0.22, hemiSky: 0x8296ba, sun: 0.35, sunColor: 0xbfd2f5, fill: 0, exposure: 1.05, dim: 0.72 };
export const DAY_SKY = { winter: 0xcfdbe8, spring: 0xc8ddf0, summer: 0xb8d4ee, fall: 0xcedbe6 };
