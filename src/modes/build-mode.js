// "Build the House" (Construction Mode): 76-second, 15-stage Sep->May construction timelapse.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FT, LV, EXT, roofTop, roofUnder, loftWallTop, LITE, FOV, DAY, NIGHTSET } from '../config/constants.js';
import { state, RT, MODES, TWEENS, WALL_DEFS, PHASE_MESHES, FAN, CUT, WALK, TOUR, TL, BD, nightRig, ease, actOf, markShadows, wake } from '../core/state.js';
import { C, MATS, M, lampMat, creamMat, paperMat, exteriorLightsOnly, setEnvNight } from '../core/materials.js';
import { root, G } from '../house/site-and-floors.js';
import { SKYLIGHTS, SKY_Z, xSegments } from '../house/loft-and-roof.js';
import { renderer, scene, camera, controls, phoneFov, setFov } from '../core/renderer.js';
import { hemi, sun, fill, sunTimeLabel } from '../house/lighting.js';
import { LAND, SEASONS, terrainY, decid, trunks, canopies, twigs, cones, mtx, snowParts, PLANTS, CAR } from '../landscape/terrain-and-trees.js';
import { PATIO, WEST_DECK, GRILL } from '../landscape/outdoor-living.js';
import { updateWalls } from '../systems/cutaway.js';
import { labels } from '../systems/labels-selection.js';
import { fireLight } from '../systems/interactions.js';
import { toW, exitWalk } from './walk-mode.js';
import { showCap, exitTour } from './tour-mode.js';
import {
  makePerson, poseFigure, tlBuildEnvFx, tlStepEnvFx, tlApplyContinuousSeasons,
  _tc1, _tc2, tlDrive,
  tlSetFire, tlSetGrill, tlSetTV, tlSetFan, tlSetFrontDoor, tlSetSideDoor,
  tlSetWallsRoof, withModeLoading
} from '../landscape/seasonal-fx.js';

const BD_LOOP = 76;
const BD_MONTHS = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
const BD_STAGES = [
  { t: 0.00, end: 0.045, mIdx: 0, title: 'Early September · Tree Clearing, Silt Fence & Trenching',
    caption: 'Early September — Clearing trees & brush, installing silt fence, gravel construction drive, and excavating perimeter & utility trenches.',
    walls: 'up', roof: false, hour: 10.0, cam: [76, 36, 74], look: [22, 0.5, 13],
    crew: [[10, -2.0, 12, 0.8], [32, -2.0, 18, -1.1], [18, -2.0, 28, 0.4], [40, -2.0, 14, -1.6]] },
  { t: 0.045, end: 0.095, mIdx: 0, title: 'Mid September · Batter Boards, Sub-Base & Under-Slab Plumbing',
    caption: 'Mid September — Compacted gravel sub-base, batter boards & taut string lines, and under-slab DWV & PEX plumbing stub-ups.',
    walls: 'up', roof: false, hour: 11.2, cam: [72, 33, 70], look: [22, 0.5, 12],
    crew: [[12, -1.8, 10, 0.8], [35, -1.8, 7, -1.2], [20, -1.8, 23, 0.2], [6, -1.8, 21, 1.5]] },
  { t: 0.095, end: 0.145, mIdx: 0, title: 'Late September · EPS Foam, Rebar & Slab-on-Grade Pour',
    caption: 'Late September — Rigid EPS sub-slab insulation, perimeter 2×12 forms, #4 rebar grid, and poured concrete slab-on-grade with sunken pit.',
    walls: 'up', roof: false, hour: 13.0, cam: [68, 32, 70], look: [21, 0.5, 13],
    crew: [[8, 0, 8, 1.1], [28, 0, 10, -0.6], [11, -1.5, 22, 0.4], [42, 0, 9, -1.8]] },
  { t: 0.145, end: 0.205, mIdx: 1, title: 'Early October · Ground Floor Walls & Entry Decks',
    caption: 'Early October — 2×6 exterior stud walls raised section by section, 14-ft LVL beam, interior partitions, and entry & west decks framed for access.',
    walls: 'up', roof: false, hour: 14.2, cam: [74, 33, 68], look: [23, 4.0, 11],
    crew: [[10, 0, 6, 0.4], [26, 0, 11, 1.5], [39, 0, 8, -0.9], [20, -0.2, 22, 0.1]] },
  { t: 0.205, end: 0.28, mIdx: 1, title: 'Mid October · Loft Joists, Rough Stairs, Subfloor & Upper Walls',
    caption: 'Mid October — 2×10 loft floor joists, rough stair stringers for crew access, 3/4" OSB subfloor deck, shed-dormer & loft stud walls.',
    walls: 'up', roof: false, hour: 15.0, cam: [76, 36, 68], look: [24, 6.5, 10],
    crew: [[20, 9.33, 12, 0.5], [32, 9.33, 9, -1.1], [43, 9.33, 8, 1.8], [14, 0, 11, 0.2]] },
  { t: 0.28, end: 0.33, mIdx: 1, title: 'Late October · Ridge Beam, Cathedral Rafters & Topping Out',
    caption: 'Late October — Ridge beam set, 12/12 cathedral rafters framed west-to-east, flat wing joists, and the topping-out evergreen bough.',
    walls: 'up', roof: false, hour: 15.6, cam: [80, 38, 72], look: [23, 8.5, 11],
    crew: [[18, 9.33, 8, 0.2], [34, 9.33, 11, -0.7], [9, -1.5, 21, 1.2], [27, -1.8, 22, -0.4]] },
  { t: 0.33, end: 0.405, mIdx: 2, title: 'Early November · Incremental OSB Sheathing & Housewrap',
    caption: 'Early November — 7/16" OSB wall and roof sheathing nailed west-to-east, followed by taped white housewrap and synthetic roof underlayment.',
    walls: 'up', roof: true, hour: 13.6, cam: [82, 34, 76], look: [23, 7.0, 12],
    crew: [[14, 4.5, 19.2, 3.1], [32, 4.5, 19.2, 3.1], [22, -1.8, 24, 0.4], [4, -1.8, 18, 1.2]] },
  { t: 0.405, end: 0.475, mIdx: 2, title: 'Late November · Triple-Pane Windows, Skylights & Metal Roof',
    caption: 'Late November — Ground & dormer windows set into rough openings, north skylights flashed, and standing-seam metal roof & EPDM installed.',
    walls: 'up', roof: true, hour: 14.4, cam: [78, 32, 78], look: [22, 6.5, 12],
    crew: [[18, 4.5, 19.2, 3.1], [38, 4.5, 19.2, 3.1], [6, -1.8, 28, 0.1], [21, -0.2, 20, -1.5]] },
  { t: 0.475, end: 0.53, mIdx: 3, title: 'December · Natural Wood Wing & Charred Vertical Siding',
    caption: 'December — Warm natural wood cladding on the sunken living wing, dark charred board-on-board siding on the main bar, and first winter frost.',
    walls: 'up', roof: true, hour: 15.0, cam: [74, 30, 80], look: [21, 6.0, 13],
    crew: [[26, 4.5, 19.2, 3.1], [10, -1.8, 28, 3.0], [19, -0.2, 22, 0.0], [42, -1.8, 20, -0.8]] },
  { t: 0.53, end: 0.59, mIdx: 4, title: 'Early January · Rough MEP & Mineral Wool Insulation',
    caption: 'Early January (Cutaway) — Crew moves inside for HRV ductwork, PEX plumbing manifolds, Romex wiring, and mineral wool stud insulation.',
    walls: 'cutaway', roof: false, hour: 13.0, cam: [64, 36, 66], look: [23, 5.0, 11],
    crew: [[8, 0, 6, -1.2], [28, 0, 14.5, 0.4], [36, 0, 7, 1.5], [32, 9.33, 4, -0.5]] },
  { t: 0.59, end: 0.64, mIdx: 4, title: 'Late January · Drywall Hanging, Taping & Chalk Paint',
    caption: 'Late January (Cutaway) — 5/8" gypsum board hung ground-then-loft over insulated walls, taped, sanded, and painted in warm Chalk.',
    walls: 'cutaway', roof: false, hour: 13.8, cam: [62, 36, 68], look: [23, 5.0, 11],
    crew: [[11, 0, 9, 0.8], [29, 0, 9, -0.9], [43, 0, 11, 1.4], [33, 9.33, 10, 0.2]] },
  { t: 0.64, end: 0.72, mIdx: 5, title: 'February · Bath Mosaics, Loft Oak Floor & Finish Stair',
    caption: 'February (Cutaway) — Foyer & hearth wine tile, bath 2×2 mosaics, wide-plank white oak loft flooring, and finished oak stair & slat screen.',
    walls: 'cutaway', roof: false, hour: 14.2, cam: [60, 36, 66], look: [22, 5.0, 11],
    crew: [[20, 0, 12, 0.1], [36, 0, 6, 1.6], [22, 9.33, 13, -0.8], [44, 9.33, 8, 1.2]] },
  { t: 0.72, end: 0.81, mIdx: 6, title: 'March · Wood Wall Panels, Reform Kitchen & Pocket Doors',
    caption: 'March (Cutaway) — Living & stair wood wall paneling, burgundy & oak Reform kitchen with 5mm stainless counters, and interior pocket doors.',
    walls: 'cutaway', roof: false, hour: 14.8, cam: [58, 34, 64], look: [18, 4.5, 11],
    crew: [[7, 0, 4, 3.1], [13, 0, 7, 1.5], [10, -1.5, 22, -1.2], [38, 0, 14.5, 0.5]] },
  { t: 0.81, end: 0.90, mIdx: 7, title: 'April · Appliances, Lighting, Fireplace & Exterior MEP',
    caption: 'April — Bath vanities & glass, appliances, paper-lantern pendant & sconces, fireplace flue, condensing units, and site grading.',
    walls: 'cutaway', roof: false, hour: 15.4, cam: [68, 32, 74], look: [19, 5.0, 14],
    crew: [[-4, -0.2, 9, -1.5], [20, -0.2, 23, 0.2], [19, -1.8, -1.2, 3.1], [12, -1.5, 24, 0.0]] },
  { t: 0.90, end: 1.00, mIdx: 8, title: 'May · Furniture Delivery, Brick Patio & Dusk Move-In',
    caption: 'May — Beds, dining table & sectional delivered, blue-gray brick terrace & Corten fire pit under the birches, and move-in at dusk.',
    walls: 'up', roof: true, hour: 18.2, cam: [78, 32, 80], look: [19, 5.0, 15],
    crew: [] },
];

function bdEnsureBuilt() {
  if (BD.built) return;
  BD.built = true;
  tlBuildEnvFx();
  const grp = new THREE.Group(); grp.name = 'buildTimelapse'; grp.visible = false; root.add(grp);
  BD.grp = grp;

  const mLumber = new THREE.MeshStandardMaterial({ color: 0xD4A76A, roughness: 0.78 });
  const mOsb = new THREE.MeshStandardMaterial({ color: 0xC29658, roughness: 0.85 });
  const mEarth = new THREE.MeshStandardMaterial({ color: 0x5A4634, roughness: 0.98 });
  const mSubBase = new THREE.MeshStandardMaterial({ color: 0x7A756E, roughness: 0.95 });
  const mFoam = new THREE.MeshStandardMaterial({ color: 0x6BA4C8, roughness: 0.65 });
  const mRebar = new THREE.MeshStandardMaterial({ color: 0x6E5244, roughness: 0.7, metalness: 0.45 });
  const mString = new THREE.MeshBasicMaterial({ color: 0xFFD026 });
  const mStake = new THREE.MeshStandardMaterial({ color: 0xE85D2A, roughness: 0.6 });
  const mPvc = new THREE.MeshStandardMaterial({ color: 0x26282A, roughness: 0.4 });
  const mPexR = new THREE.MeshStandardMaterial({ color: 0xC8382B, roughness: 0.45 });
  const mPexB = new THREE.MeshStandardMaterial({ color: 0x2868B8, roughness: 0.45 });
  const mWool = new THREE.MeshStandardMaterial({ color: 0x7A725E, roughness: 0.96 });
  const mDuct = new THREE.MeshStandardMaterial({ color: 0xB8C0C8, roughness: 0.35, metalness: 0.75 });
  const mDumpster = new THREE.MeshStandardMaterial({ color: 0x28543C, roughness: 0.65, metalness: 0.25 });
  const mPorta = new THREE.MeshStandardMaterial({ color: 0x2468A8, roughness: 0.55 });
  const mTarp = new THREE.MeshStandardMaterial({ color: 0x2B65B0, roughness: 0.65 });
  const mYellow = new THREE.MeshStandardMaterial({ color: 0xE5A018, roughness: 0.45, metalness: 0.2 });
  for (const m of [mLumber, mOsb, mEarth, mSubBase, mFoam, mRebar, mStake, mPvc, mPexR, mPexB, mWool, mDuct, mDumpster, mPorta, mTarp, mYellow]) exteriorLightsOnly(m);

  const pushBox = (arr, x0, x1, y0, y1, z0, z1) => {
    if (x1 <= x0 || y1 <= y0 || z1 <= z0) return;
    arr.push(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2));
  };
  const mergeBoxes = (arr, mat, parent) => {
    if (!arr.length) return null;
    const hasNonIdx = arr.some(b => !b.index);
    const list = hasNonIdx ? arr.map(b => b.index ? b.toNonIndexed() : b) : arr;
    const g = mergeGeometries(list, false);
    arr.forEach(b => b.dispose());
    if (!g) return null;
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true; m.userData.nocut = true;
    parent.add(m);
    return m;
  };

  const mSilt = new THREE.MeshStandardMaterial({ color: 0xD86422, roughness: 0.85 });
  const mBark = new THREE.MeshStandardMaterial({ color: 0x4E3D2E, roughness: 0.95 });
  exteriorLightsOnly(mSilt); exteriorLightsOnly(mBark);

  // 1. SITE PREP: TREE CLEARING, SILT FENCE, GRAVEL DRIVE, TRENCHING, BATTER BOARDS, PLUMBING & REBAR
  BD.clearingGrp = new THREE.Group(); grp.add(BD.clearingGrp);
  {
    const felled = [
      [8, 6, 0.35, 11, 0.4], [24, 10, 0.3, 10, -0.5], [38, 8, 0.32, 9.5, 0.9],
      [14, 22, 0.28, 8.5, -0.3], [32, 20, 0.34, 10.5, 0.6], [44, 15, 0.26, 8, -0.8],
    ];
    for (const [fx, fz, r, len, rot] of felled) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.8, r, len, 7).rotateZ(Math.PI / 2), mBark);
      log.position.set(fx, LV.GRADE + r * 0.85, fz); log.rotation.y = rot;
      log.castShadow = true; log.receiveShadow = true;
      BD.clearingGrp.add(log);
      const stump = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.15, 0.9, 7), mBark);
      stump.position.set(fx - Math.cos(rot) * (len * 0.55), LV.GRADE + 0.45, fz + Math.sin(rot) * (len * 0.55));
      stump.castShadow = true; stump.receiveShadow = true;
      BD.clearingGrp.add(stump);
    }
    for (const [bx, bz, s] of [[18, 12, 2.2], [30, 5, 1.8], [5, 18, 1.9], [40, 22, 2.1]]) {
      const brush = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), cones.material);
      brush.scale.set(1.4, 0.65, 1.1); brush.position.set(bx, LV.GRADE + s * 0.3, bz);
      brush.castShadow = true; brush.receiveShadow = true;
      BD.clearingGrp.add(brush);
    }
  }

  BD.siltDriveGrp = new THREE.Group(); grp.add(BD.siltDriveGrp);
  {
    const posts = [], fence = [], drv = [];
    // Orange silt fence around the south & east clearing perimeter
    const fencePts = [[-8, 30], [16, 33], [28, 36], [48, 35], [53, 22], [53, -4]];
    for (let i = 0; i < fencePts.length - 1; i++) {
      const [x0, z0] = fencePts[i], [x1, z1] = fencePts[i + 1];
      const len = Math.hypot(x1 - x0, z1 - z0), ang = Math.atan2(x1 - x0, z1 - z0);
      const g = new THREE.BoxGeometry(0.08, 2.2, len).rotateY(ang);
      g.translate((x0 + x1) / 2, LV.GRADE + 1.1, (z0 + z1) / 2);
      fence.push(g);
      const n = Math.max(2, Math.floor(len / 6));
      for (let k = 0; k <= n; k++) {
        const px = x0 + (x1 - x0) * (k / n), pz = z0 + (z1 - z0) * (k / n);
        pushBox(posts, px - 0.08, px + 0.08, LV.GRADE, LV.GRADE + 2.5, pz - 0.08, pz + 0.08);
      }
    }
    // Gravel construction access drive & staging pad from south
    pushBox(drv, 18.0, 30.0, LV.GRADE, LV.GRADE + 0.12, 27.5, 42.0);
    mergeBoxes(posts, mLumber, BD.siltDriveGrp);
    mergeBoxes(fence, mSilt, BD.siltDriveGrp);
    mergeBoxes(drv, mSubBase, BD.siltDriveGrp);
  }

  BD.trenchGrp = new THREE.Group(); grp.add(BD.trenchGrp);
  {
    const tr = [];
    // Perimeter frost-wall / thickened-edge slab trenches & utility trench from NW
    pushBox(tr, -1.2, 49.2, LV.GRADE + 0.01, LV.GRADE + 0.16, -1.2, 0.4);
    pushBox(tr, -1.2, 49.2, LV.GRADE + 0.01, LV.GRADE + 0.16, 16.6, 18.2);
    pushBox(tr, -1.2, 0.4, LV.GRADE + 0.01, LV.GRADE + 0.16, -1.2, 18.2);
    pushBox(tr, 47.6, 49.2, LV.GRADE + 0.01, LV.GRADE + 0.16, -1.2, 18.2);
    pushBox(tr, 0.8, 2.4, LV.GRADE + 0.01, LV.GRADE + 0.15, 17.4, 28.0);
    pushBox(tr, 16.6, 18.2, LV.GRADE + 0.01, LV.GRADE + 0.15, 17.4, 28.0);
    pushBox(tr, 0.8, 18.2, LV.GRADE + 0.01, LV.GRADE + 0.15, 26.6, 28.0);
    pushBox(tr, 24.5, 26.5, LV.GRADE + 0.01, LV.GRADE + 0.14, -14.0, 0.0); // utility trench from north
    mergeBoxes(tr, mEarth, BD.trenchGrp);
  }

  BD.earthGrp = new THREE.Group(); grp.add(BD.earthGrp);
  {
    const eBoxes = [], sBoxes = [];
    pushBox(eBoxes, -1.8, 49.8, LV.GRADE - 0.05, LV.GRADE + 0.06, -1.8, 18.8);
    pushBox(eBoxes, 0.2, 18.6, LV.GRADE - 0.05, LV.GRADE + 0.05, 17.2, 28.6);
    pushBox(sBoxes, -0.4, 48.4, LV.GRADE + 0.06, LV.GRADE + 0.16, -0.4, 17.4);
    pushBox(sBoxes, 1.6, 17.4, LV.GRADE + 0.05, LV.GRADE + 0.14, 17.4, 27.4);
    mergeBoxes(eBoxes, mEarth, BD.earthGrp);
    mergeBoxes(sBoxes, mSubBase, BD.earthGrp);
    // Excavated soil berm mounds along south-east clearing edge
    for (const [mx, mz, rx, ry, rz] of [[33, 24.5, 4.2, 1.8, 2.6], [41, 23.5, 3.5, 1.5, 2.3], [-5, 14, 2.8, 1.3, 2.2]]) {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), mEarth);
      mound.scale.set(rx, ry, rz); mound.position.set(mx, LV.GRADE, mz); mound.castShadow = true; mound.receiveShadow = true;
      BD.earthGrp.add(mound);
    }
  }

  BD.batterGrp = new THREE.Group(); grp.add(BD.batterGrp);
  {
    const bL = [], bS = [], bStr = [];
    const corners = [[-2.2, -2.2, 1, 1], [50.2, -2.2, -1, 1], [50.2, 19.2, -1, -1], [19.2, 29.2, -1, -1], [-0.2, 29.2, 1, -1], [-2.2, 19.2, 1, -1]];
    for (const [cx, cz, dx, dz] of corners) {
      pushBox(bL, cx - 0.08, cx + 0.08, LV.GRADE, -0.2, cz - 0.08, cz + 0.08);
      pushBox(bL, cx + dx * 2.2 - 0.08, cx + dx * 2.2 + 0.08, LV.GRADE, -0.2, cz - 0.08, cz + 0.08);
      pushBox(bL, cx - 0.08, cx + 0.08, LV.GRADE, -0.2, cz + dz * 2.2 - 0.08, cz + dz * 2.2 + 0.08);
      pushBox(bL, Math.min(cx, cx + dx * 2.2), Math.max(cx, cx + dx * 2.2), -0.55, -0.35, cz - 0.05, cz + 0.05);
      pushBox(bL, cx - 0.05, cx + 0.05, -0.55, -0.35, Math.min(cz, cz + dz * 2.2), Math.max(cz, cz + dz * 2.2));
      pushBox(bS, cx - 0.06, cx + 0.06, -0.2, -0.05, cz - 0.06, cz + 0.06);
    }
    // Taut mason string lines tracing exact foundation perimeter
    pushBox(bStr, -2.0, 50.0, -0.38, -0.35, -0.35, -0.32);
    pushBox(bStr, -2.0, 50.0, -0.38, -0.35, 17.38, 17.41);
    pushBox(bStr, -0.36, -0.33, -0.38, -0.35, -2.0, 19.0);
    pushBox(bStr, 48.38, 48.41, -0.38, -0.35, -2.0, 19.0);
    pushBox(bStr, 1.63, 1.66, -0.38, -0.35, 16.5, 29.0);
    pushBox(bStr, 17.36, 17.39, -0.38, -0.35, 16.5, 29.0);
    pushBox(bStr, 0.0, 19.0, -0.38, -0.35, 27.38, 27.41);
    mergeBoxes(bL, mLumber, BD.batterGrp);
    mergeBoxes(bS, mStake, BD.batterGrp);
    mergeBoxes(bStr, mString, BD.batterGrp);
  }

  BD.slabPlumbGrp = new THREE.Group(); grp.add(BD.slabPlumbGrp);
  {
    const pvc = [], pexR = [], pexB = [];
    const stubs = [[5.5, 1.2], [8.5, 1.2], [26.2, 1.8], [36.8, 1.8], [35.8, 2.2], [37.4, 6.0], [37.6, 8.6], [43.2, 3.2], [44.8, 7.2]];
    for (const [px, pz] of stubs) {
      pvc.push(new THREE.CylinderGeometry(0.11, 0.11, 3.4, 8).translate(px, -0.4, pz));
      pexR.push(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 6).translate(px - 0.25, -0.5, pz + 0.12));
      pexB.push(new THREE.CylinderGeometry(0.04, 0.04, 3.1, 6).translate(px + 0.25, -0.5, pz + 0.12));
    }
    mergeBoxes(pvc, mPvc, BD.slabPlumbGrp);
    mergeBoxes(pexR, mPexR, BD.slabPlumbGrp);
    mergeBoxes(pexB, mPexB, BD.slabPlumbGrp);
  }

  BD.rebarGrp = new THREE.Group(); grp.add(BD.rebarGrp);
  {
    const foam = [], reb = [];
    pushBox(foam, 0.4, 47.6, -0.32, -0.18, 0.4, 16.6);
    pushBox(foam, 2.4, 16.6, -1.62, -1.52, 16.7, 26.6);
    for (let x = 1.0; x <= 47.2; x += 2.6) pushBox(reb, x - 0.025, x + 0.025, -0.16, -0.12, 0.6, 16.4);
    for (let z = 1.0; z <= 16.2; z += 2.6) pushBox(reb, 0.6, 47.4, -0.16, -0.12, z - 0.025, z + 0.025);
    for (let x = 2.8; x <= 16.2; x += 2.4) pushBox(reb, x - 0.025, x + 0.025, -1.49, -1.45, 16.9, 26.3);
    for (let z = 17.2; z <= 26.2; z += 2.4) pushBox(reb, 2.6, 16.4, -1.49, -1.45, z - 0.025, z + 0.025);
    mergeBoxes(foam, mFoam, BD.rebarGrp);
    mergeBoxes(reb, mRebar, BD.rebarGrp);
  }

  BD.formsGrp = new THREE.Group(); grp.add(BD.formsGrp);
  {
    const fm = [];
    // Perimeter 2x12 wood forms + angled brace stakes
    pushBox(fm, -0.55, 48.6, LV.GRADE, 0.08, -0.52, -0.37);
    pushBox(fm, -0.55, 0.2, LV.GRADE, 0.08, 17.42, 17.57);
    pushBox(fm, 17.4, 48.6, LV.GRADE, 0.08, 17.42, 17.57);
    pushBox(fm, -0.55, -0.38, LV.GRADE, 0.08, -0.52, 17.57);
    pushBox(fm, 48.43, 48.6, LV.GRADE, 0.08, -0.52, 17.57);
    pushBox(fm, 1.46, 1.62, LV.GRADE, -1.35, 17.42, 27.6);
    pushBox(fm, 17.41, 17.57, LV.GRADE, -1.35, 17.42, 27.6);
    pushBox(fm, 1.46, 17.57, LV.GRADE, -1.35, 27.44, 27.6);
    for (let x = 0; x <= 48; x += 4) {
      pushBox(fm, x - 0.06, x + 0.06, LV.GRADE, 0.25, -0.72, -0.52);
      if (x >= 18) pushBox(fm, x - 0.06, x + 0.06, LV.GRADE, 0.25, 17.57, 17.77);
    }
    mergeBoxes(fm, mLumber, BD.formsGrp);
  }

  // 2. PROCEDURAL WOOD FRAMING (WALL-BY-WALL & BAY-BY-BAY AT FULL HEIGHT, NO POP-UP SCALING)
  const gZones = [[], [], [], []]; // 0: N/W ext, 1: S/E ext, 2: Living wing, 3: Interior partitions
  const lZones = [[], [], []];     // 0: Gable & knee walls, 1: Dormer walls, 2: Loft interior partitions
  const lJoists = [], rStair = [], lSub = [[], [], []];
  const sw = 0.13, pt = 0.13;
  const inHole = (u, y0, y1, holes) => {
    for (const [hu0, hu1, hy0, hy1] of holes) {
      if (u + sw > hu0 + 0.02 && u < hu1 - 0.02 && y1 > hy0 + 0.02 && y0 < hy1 - 0.02) return [hu0, hu1, hy0, hy1];
    }
    return null;
  };
  for (const w of WALL_DEFS) {
    const wt = w.t[1] - w.t[0];
    if (wt < 0.22) continue;
    let target;
    if (w.parentName === 'loft') {
      if (!w.isExt) target = lZones[2];
      else if (w.y[1] > 15.0 && w.axis === 'x') target = lZones[1];
      else target = lZones[0];
    } else {
      if (!w.isExt) target = gZones[3];
      else if ((w.axis === 'z' && w.u[1] > 18.0) || (w.axis === 'x' && w.t[0] > 20.0)) target = gZones[2];
      else if ((w.axis === 'x' && w.t[0] < 2.0) || (w.axis === 'z' && w.t[0] < 2.0)) target = gZones[0];
      else target = gZones[1];
    }
    const tc = (w.t[0] + w.t[1]) / 2, hd = Math.min(0.22, wt * 0.36);
    const t0 = tc - hd, t1 = tc + hd;
    const [u0, u1] = w.u, [wy0, wy1] = w.y, holes = w.holes || [];
    const topAt = u => {
      let t = w.top ? w.top(u) : wy1;
      if (w.isExt && w.axis === 'z') t = Math.min(t, roofUnder(u) + 0.1);
      return Math.max(wy0 + 0.6, t);
    };
    const addMember = (ua, ub, ya, yb) => {
      if (w.axis === 'x') pushBox(target, ua, ub, ya, yb, t0, t1);
      else pushBox(target, t0, t1, ya, yb, ua, ub);
    };
    const stepP = 1.0;
    for (let u = u0; u < u1 - 0.01; u += stepP) {
      const ub = Math.min(u1, u + stepP), um = (u + ub) / 2;
      const doorHit = holes.some(([hu0, hu1, hy0]) => um > hu0 && um < hu1 && hy0 <= wy0 + 0.25);
      if (!doorHit) addMember(u, ub, wy0, wy0 + pt);
      const yt = topAt(um);
      addMember(u, ub, yt - pt * 1.6, yt);
    }
    for (let u = u0; u <= u1 - sw + 0.01; u += 1.333) {
      const um = u + sw / 2, yt = topAt(um) - pt * 1.6, yb = wy0 + pt;
      const h = inHole(u, yb, yt, holes);
      if (!h) {
        addMember(u, u + sw, yb, yt);
      } else {
        const [, , hy0, hy1] = h;
        if (hy0 - pt > yb + 0.15) addMember(u, u + sw, yb, hy0 - pt);
        if (yt > hy1 + 0.38) addMember(u, u + sw, hy1 + 0.38, yt);
      }
    }
    addMember(u1 - sw, u1, wy0 + pt, topAt(u1 - sw / 2) - pt * 1.6);
    for (const [hu0, hu1, hy0, hy1] of holes) {
      const yt0 = topAt(hu0), yt1 = topAt(hu1), hTop = Math.min(yt0, yt1) - pt * 1.6;
      if (hu0 - sw >= u0) addMember(hu0 - sw, hu0, wy0 + pt, yt0 - pt * 1.6);
      if (hu1 + sw <= u1) addMember(hu1, hu1 + sw, wy0 + pt, yt1 - pt * 1.6);
      const hdrB = Math.min(hy1, hTop - 0.35), hdrT = Math.min(hTop, hdrB + 0.38);
      if (hdrT > hdrB) addMember(Math.max(u0, hu0 - sw), Math.min(u1, hu1 + sw), hdrB, hdrT);
      if (hy0 > wy0 + 0.4) addMember(hu0, hu1, hy0 - pt, hy0);
    }
  }
  // 14-ft LVL beam over sunken living room opening + gable end studs
  pushBox(gZones[2], 1.66, 16.52, LV.CEIL1 - 0.65, LV.CEIL1 + 0.1, 16.6, 17.15);
  for (const gx of [-0.05, 48.05]) {
    for (let z = 1.2; z <= 16.0; z += 1.333) {
      const yt = roofUnder(z);
      if (yt > LV.PLATE + 0.2) pushBox(lZones[0], gx - 0.18, gx + 0.18, LV.PLATE, yt, z, z + sw);
    }
  }
  // Loft 2x10 floor joists at 16" o.c. + 3/4" OSB subfloor sheets (W->E)
  for (const [[x0, x1], [z0, z1]] of [[[14.52, 16.92], [0.52, 10.45]], [[14.52, 24.16], [10.45, 16.54]], [[24.16, 47.56], [0.52, 16.54]]]) {
    pushBox(lJoists, x0, x1, LV.CEIL1 + 0.08, LV.LOFT - 0.12, z0, z0 + 0.15);
    pushBox(lJoists, x0, x1, LV.CEIL1 + 0.08, LV.LOFT - 0.12, z1 - 0.15, z1);
    for (let x = x0; x <= x1; x += 1.333) {
      pushBox(lJoists, x, Math.min(x1, x + 0.13), LV.CEIL1 + 0.08, LV.LOFT - 0.12, z0 + 0.15, z1 - 0.15);
    }
    // Split subfloor into 3 W->E sections
    for (let sx = x0; sx < x1 - 0.01; sx += 4.0) {
      const sxb = Math.min(x1, sx + 4.0), xm = (sx + sxb) / 2;
      const bi = xm < 24.5 ? 0 : xm < 36.0 ? 1 : 2;
      pushBox(lSub[bi], sx, sxb - 0.02, LV.LOFT - 0.12, LV.LOFT - 0.04, z0, z1);
    }
  }
  // Rough construction stair stringers & treads (built with framing so crew climbs to loft)
  for (let k = 0; k < 12; k++) {
    const z = 1.6 + k * 0.85, y = (1.5 + k) * (LV.LOFT / 14);
    pushBox(rStair, 21.15, 24.1, y - 0.35, y - 0.08, z, z + 0.8);
  }
  pushBox(rStair, 21.1, 21.25, 0, LV.LOFT, 1.5, 11.8);
  pushBox(rStair, 24.0, 24.15, 0, LV.LOFT, 1.5, 11.8);

  for (const arr of gZones) { const g = new THREE.Group(); grp.add(g); mergeBoxes(arr, mLumber, g); BD.frameG.push(g); }
  BD.loftJoists = new THREE.Group(); grp.add(BD.loftJoists); mergeBoxes(lJoists, mLumber, BD.loftJoists);
  BD.roughStair = new THREE.Group(); grp.add(BD.roughStair); mergeBoxes(rStair, mLumber, BD.roughStair);
  for (const arr of lSub) { const g = new THREE.Group(); grp.add(g); mergeBoxes(arr, mOsb, g); BD.loftSubfloors.push(g); }
  for (const arr of lZones) { const g = new THREE.Group(); grp.add(g); mergeBoxes(arr, mLumber, g); BD.loftWalls.push(g); }

  // Ridge beam + 4 W->E cathedral rafter chunks + flat wing joists
  const ridgeArr = [], rChunks = [[], [], [], []], wJoists = [];
  const addRafter = (arr, x0, x1, zA, yA, zB, yB, h = 0.55) => {
    const dz = Math.abs(zB - zA);
    if (dz <= 0.01) return;
    const g = new THREE.BoxGeometry(x1 - x0, h, dz).translate((x0 + x1) / 2, h / 2, (zA + zB) / 2);
    const pos = g.attributes.position, zMid = (zA + zB) / 2, yLo = zA < zB ? yA : yB, yHi = zA < zB ? yB : yA;
    for (let i = 0; i < pos.count; i++) pos.setY(i, pos.getY(i) + (pos.getZ(i) < zMid ? yLo : yHi));
    g.computeVertexNormals();
    arr.push(g);
  };
  pushBox(ridgeArr, -0.4, 48.5, LV.RIDGE - 0.65, LV.RIDGE + 0.02, LV.RIDGE_Z - 0.16, LV.RIDGE_Z + 0.16);
  const [dx0, dx1] = LV.DORMER_X;
  for (let x = -0.3; x <= 48.4; x += 2.0) {
    const xb = Math.min(48.45, x + 0.15);
    const ci = Math.min(3, Math.max(0, Math.floor((x + 0.3) / 12.2)));
    const arr = rChunks[ci];
    const inSky = SKYLIGHTS.some(([s0, s1]) => xb > s0 + 0.15 && x < s1 - 0.15);
    if (!inSky) {
      addRafter(arr, x, xb, LV.ROOF_EDGE_N, roofUnder(LV.ROOF_EDGE_N), LV.RIDGE_Z, roofUnder(LV.RIDGE_Z));
    } else {
      addRafter(arr, x, xb, LV.ROOF_EDGE_N, roofUnder(LV.ROOF_EDGE_N), SKY_Z[0], roofUnder(SKY_Z[0]));
      addRafter(arr, x, xb, SKY_Z[1], roofUnder(SKY_Z[1]), LV.RIDGE_Z, roofUnder(LV.RIDGE_Z));
    }
    if (x < dx0 || x >= dx1 - 0.1) {
      addRafter(arr, x, xb, LV.RIDGE_Z, roofUnder(LV.RIDGE_Z), LV.ROOF_EDGE_S, roofUnder(LV.ROOF_EDGE_S));
    } else {
      addRafter(arr, x, xb, LV.RIDGE_Z, roofUnder(LV.RIDGE_Z), LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y - 0.55);
      addRafter(arr, x, xb, LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y - 0.55, LV.ROOF_EDGE_S, LV.DORMER_EAVE_Y - 0.55, 0.45);
    }
  }
  for (let z = 17.5; z <= 26.5; z += 1.417) pushBox(wJoists, 2.1, 16.9, 8.83, LV.WING_TOP - 0.25, z, z + 0.15);
  for (let z = 17.5; z <= 27.2; z += 1.6) pushBox(wJoists, 17.4, 24.0, 8.25, LV.WING_TOP - 0.2, z, z + 0.15);
  BD.ridgeBeam = new THREE.Group(); grp.add(BD.ridgeBeam); mergeBoxes(ridgeArr, mLumber, BD.ridgeBeam);
  for (const arr of rChunks) { const g = new THREE.Group(); grp.add(g); mergeBoxes(arr, mLumber, g); BD.rafterChunks.push(g); }
  BD.wingJoists = new THREE.Group(); grp.add(BD.wingJoists); mergeBoxes(wJoists, mLumber, BD.wingJoists);

  // Celebratory topping-out evergreen bough on the ridge at the end of framing
  BD.toppingTree = new THREE.Group(); BD.toppingTree.position.set(24.0, LV.RIDGE + 0.1, LV.RIDGE_Z); grp.add(BD.toppingTree);
  {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 6).translate(0, 0.6, 0), mEarth);
    const bough1 = new THREE.Mesh(new THREE.ConeGeometry(0.75, 1.5, 7).translate(0, 1.3, 0), cones.material);
    const bough2 = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.2, 7).translate(0, 2.0, 0), cones.material);
    BD.toppingTree.add(trunk, bough1, bough2);
  }

  // 2b. INCREMENTAL 7/16" OSB WALL & ROOF SHEATHING (4 W->E CHUNKS, NOV)
  {
    const ow = [[], [], [], []], or = [[], [], [], []];
    for (const w of WALL_DEFS) {
      if (!w.isExt || w.t[1] - w.t[0] < 0.22) continue;
      const tc = (w.t[0] + w.t[1]) / 2, holes = w.holes || [];
      const [u0, u1] = w.u, [wy0, wy1] = w.y;
      const topAt = u => Math.max(wy0 + 0.5, w.top ? w.top(u) : (w.axis === 'z' ? Math.min(wy1, roofUnder(u) + 0.05) : wy1));
      for (let u = u0; u < u1 - 0.05; u += 4.0) {
        const ub = Math.min(u1, u + 4.0), um = (u + ub) / 2;
        const ci = w.axis === 'x' ? Math.min(3, Math.max(0, Math.floor(um / 12.1))) : (tc < 10 ? 0 : tc > 36 ? 3 : 1);
        const yt = topAt(um);
        // Split around rough openings horizontally
        const hit = holes.find(([hu0, hu1]) => um > hu0 && um < hu1);
        if (!hit) {
          if (w.axis === 'x') pushBox(ow[ci], u, ub - 0.03, wy0, yt, tc - 0.24, tc + 0.24);
          else pushBox(ow[ci], tc - 0.24, tc + 0.24, wy0, yt, u, ub - 0.03);
        } else {
          const [, , hy0, hy1] = hit;
          if (hy0 > wy0 + 0.1) {
            if (w.axis === 'x') pushBox(ow[ci], u, ub - 0.03, wy0, hy0, tc - 0.24, tc + 0.24);
            else pushBox(ow[ci], tc - 0.24, tc + 0.24, wy0, hy0, u, ub - 0.03);
          }
          if (yt > hy1 + 0.1) {
            if (w.axis === 'x') pushBox(ow[ci], u, ub - 0.03, hy1, yt, tc - 0.24, tc + 0.24);
            else pushBox(ow[ci], tc - 0.24, tc + 0.24, hy1, yt, u, ub - 0.03);
          }
        }
      }
    }
    for (let x = -0.4; x < 48.3; x += 4.0) {
      const xb = Math.min(48.4, x + 3.96), ci = Math.min(3, Math.max(0, Math.floor((x + 0.4) / 12.2)));
      addRafter(or[ci], x, xb, LV.ROOF_EDGE_N, roofUnder(LV.ROOF_EDGE_N) + 0.55, LV.RIDGE_Z, roofUnder(LV.RIDGE_Z) + 0.55, 0.12);
      if (x < dx0 || x >= dx1 - 0.5) {
        addRafter(or[ci], x, xb, LV.RIDGE_Z, roofUnder(LV.RIDGE_Z) + 0.55, LV.ROOF_EDGE_S, roofUnder(LV.ROOF_EDGE_S) + 0.55, 0.12);
      } else {
        addRafter(or[ci], x, xb, LV.RIDGE_Z, roofUnder(LV.RIDGE_Z) + 0.55, LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y - 0.02, 0.12);
        addRafter(or[ci], x, xb, LV.DORMER_JOIN_Z, LV.DORMER_JOIN_Y - 0.02, LV.ROOF_EDGE_S, LV.DORMER_EAVE_Y - 0.02, 0.12);
      }
    }
    pushBox(or[0], 2.4, 16.6, LV.WING_TOP - 0.36, LV.WING_TOP - 0.28, 17.3, 26.6);
    for (const arr of ow) { const g = new THREE.Group(); grp.add(g); mergeBoxes(arr, mOsb, g); BD.osbWallChunks.push(g); }
    for (const arr of or) { const g = new THREE.Group(); grp.add(g); mergeBoxes(arr, mOsb, g); BD.osbRoofChunks.push(g); }
  }

  // 3. EXTERIOR SCAFFOLDING (SOUTH FACADE, NOV–DEC)
  BD.scaffGrp = new THREE.Group(); grp.add(BD.scaffGrp);
  {
    const scSteel = [], scPlank = [];
    for (const sx of [2.5, 11.5, 25.0, 34.0, 43.0]) {
      for (const sz of [18.2, 20.4]) pushBox(scSteel, sx - 0.06, sx + 0.06, LV.GRADE, 11.2, sz - 0.06, sz + 0.06);
      for (const sy of [4.5, 9.8]) pushBox(scSteel, sx - 0.05, sx + 0.05, sy - 0.05, sy + 0.05, 18.2, 20.4);
    }
    for (const [x0, x1] of [[2.5, 11.5], [25.0, 43.0]]) {
      for (const sy of [4.5, 9.8]) {
        pushBox(scPlank, x0 - 0.3, x1 + 0.3, sy + 0.05, sy + 0.18, 18.35, 20.25);
        pushBox(scSteel, x0, x1, sy + 3.1, sy + 3.2, 20.32, 20.4);
      }
    }
    mergeBoxes(scSteel, M('steel'), BD.scaffGrp);
    mergeBoxes(scPlank, mLumber, BD.scaffGrp);
  }

  // 4. INTERIOR ROUGH MEP & MINERAL WOOL INSULATION (JAN CUTAWAY)
  BD.mepDucts = new THREE.Group(); grp.add(BD.mepDucts);
  BD.mepInsul = new THREE.Group(); grp.add(BD.mepInsul);
  {
    const wool = [], duct = [], pexR = [], pexB = [], wire = [];
    // Mineral wool batts in north, west, and east exterior wall cavities
    pushBox(wool, 0.6, 11.2, 0.2, 8.8, 0.12, 0.42);
    pushBox(wool, 20.5, 24.4, 0.2, 8.8, 0.12, 0.42);
    pushBox(wool, 27.8, 35.5, 0.2, 8.8, 0.12, 0.42);
    pushBox(wool, 39.0, 47.4, 0.2, 8.8, 0.12, 0.42);
    pushBox(wool, 0.12, 0.42, 0.2, 8.8, 5.8, 11.7);
    pushBox(wool, 47.65, 47.95, 0.2, 8.8, 0.8, 3.9);
    pushBox(wool, 47.65, 47.95, 0.2, 8.8, 7.3, 11.3);
    // HRV / HVAC galvanized trunk & branch ducts
    pushBox(duct, 25.5, 39.5, LV.LOFT + 6.4, LV.LOFT + 7.1, 2.2, 3.0);
    pushBox(duct, 25.5, 26.3, 7.2, LV.LOFT + 6.8, 2.2, 3.0);
    pushBox(duct, 15.5, 43.0, 7.25, 7.8, 13.6, 14.3);
    for (const bx of [18.0, 27.0, 35.0, 42.0]) pushBox(duct, bx, bx + 0.55, 7.3, 7.75, 9.5, 13.6);
    // PEX manifold risers & horizontal runs
    pushBox(pexR, 2.0, 14.5, 2.6, 2.7, 0.52, 0.62);
    pushBox(pexB, 2.0, 14.5, 2.3, 2.4, 0.52, 0.62);
    pushBox(pexR, 33.4, 44.5, 2.6, 2.7, 3.85, 3.95);
    pushBox(pexB, 33.4, 44.5, 2.3, 2.4, 3.85, 3.95);
    pushBox(pexR, 41.05, 41.2, LV.LOFT + 0.2, LV.LOFT + 4.2, 2.5, 13.5);
    pushBox(pexB, 41.22, 41.35, LV.LOFT + 0.2, LV.LOFT + 3.8, 2.5, 13.5);
    // Yellow Romex wiring runs at 4'-0" height across interior partitions
    pushBox(wire, 16.5, 45.0, 4.1, 4.18, 13.28, 13.38);
    pushBox(wire, 24.3, 24.42, 4.1, 4.18, 1.0, 13.2);
    pushBox(wire, 33.08, 33.2, 4.1, 4.18, 1.0, 13.2);
    mergeBoxes(wool, mWool, BD.mepInsul);
    mergeBoxes(duct, mDuct, BD.mepDucts);
    mergeBoxes(pexR, mPexR, BD.mepDucts);
    mergeBoxes(pexB, mPexB, BD.mepDucts);
    mergeBoxes(wire, mString, BD.mepDucts);
  }

  // 5. CONSTRUCTION SITE SET DRESSING (DUMPSTER, PORTA-JOHN, LUMBER STACKS, MINI-EXCAVATOR, CREW)
  BD.sitePropsGrp = new THREE.Group(); grp.add(BD.sitePropsGrp);
  {
    const dBoxes = [], pBoxes = [], lBoxes = [], tBoxes = [];
    // 20-yard green roll-off dumpster at [33, LV.GRADE, 32]
    const dx0 = 30.0, dx1 = 42.0, dz0 = 30.5, dz1 = 37.5, dy0 = LV.GRADE, dy1 = LV.GRADE + 4.6;
    pushBox(dBoxes, dx0, dx1, dy0, dy0 + 0.25, dz0, dz1);
    pushBox(dBoxes, dx0, dx1, dy0, dy1, dz0, dz0 + 0.22);
    pushBox(dBoxes, dx0, dx1, dy0, dy1, dz1 - 0.22, dz1);
    pushBox(dBoxes, dx0, dx0 + 0.22, dy0, dy1, dz0, dz1);
    pushBox(dBoxes, dx1 - 0.22, dx1, dy0, dy1, dz0, dz1);
    for (let x = dx0 + 1.5; x < dx1; x += 2.2) {
      pushBox(dBoxes, x, x + 0.18, dy0 + 0.2, dy1, dz0 - 0.12, dz0);
      pushBox(dBoxes, x, x + 0.18, dy0 + 0.2, dy1, dz1, dz1 + 0.12);
    }
    // Lumber & OSB offcuts inside dumpster + staged lumber stacks on dunnage blocks at [23, LV.GRADE, 32]
    pushBox(lBoxes, dx0 + 0.8, dx1 - 1.2, dy0 + 0.3, dy0 + 3.2, dz0 + 0.5, dz1 - 0.5);
    pushBox(lBoxes, 21.0, 27.5, LV.GRADE + 0.3, LV.GRADE + 2.1, 31.0, 34.2);
    pushBox(lBoxes, 21.2, 27.3, LV.GRADE, LV.GRADE + 0.3, 31.3, 31.7);
    pushBox(lBoxes, 21.2, 27.3, LV.GRADE, LV.GRADE + 0.3, 33.5, 33.9);
    pushBox(tBoxes, 20.9, 24.8, LV.GRADE + 0.35, LV.GRADE + 2.2, 30.9, 34.3); // blue poly tarp over half the lumber stack
    // Blue Porta-John at [45.5, LV.GRADE, 28.5]
    pushBox(pBoxes, 44.5, 48.2, LV.GRADE, LV.GRADE + 7.2, 27.5, 31.2);
    pushBox(tBoxes, 44.4, 48.3, LV.GRADE + 7.2, LV.GRADE + 7.6, 27.4, 31.3);
    mergeBoxes(dBoxes, mDumpster, BD.sitePropsGrp);
    mergeBoxes(lBoxes, mLumber, BD.sitePropsGrp);
    mergeBoxes(pBoxes, mPorta, BD.sitePropsGrp);
    mergeBoxes(tBoxes, mTarp, BD.sitePropsGrp);
  }

  // Yellow Mini-Excavator parked west of the sunken living pit during Sep–Oct
  BD.excavator = new THREE.Group(); BD.excavator.position.set(-4.5, LV.GRADE, 23.0); BD.excavator.rotation.y = 1.15; grp.add(BD.excavator);
  {
    const exDark = [], exYel = [];
    pushBox(exDark, -2.2, 2.2, 0, 1.1, -3.0, -1.9); // left track
    pushBox(exDark, -2.2, 2.2, 0, 1.1, 1.9, 3.0);   // right track
    pushBox(exDark, -1.6, 1.6, 0.4, 1.1, -1.9, 1.9); // undercarriage
    pushBox(exDark, -2.8, -2.5, 0.1, 0.9, -2.8, 2.8); // dozer blade
    pushBox(exYel, -2.2, 1.8, 1.1, 2.8, -2.1, 2.1);  // engine house
    pushBox(exDark, -0.8, 1.4, 2.8, 6.2, -1.8, 1.2); // ROPS cab frame
    pushBox(exYel, -0.9, 1.5, 6.2, 6.45, -1.9, 1.3); // cab roof
    mergeBoxes(exDark, mPvc, BD.excavator);
    mergeBoxes(exYel, mYellow, BD.excavator);
    const boom = new THREE.Group(); boom.position.set(1.6, 2.1, 0); BD.excavator.add(boom);
    const bArm = [], bBkt = [];
    pushBox(bArm, 0, 4.8, 0, 0.55, -0.25, 0.25);
    pushBox(bArm, 4.4, 5.0, -2.8, 0.4, -0.22, 0.22);
    pushBox(bBkt, 4.2, 5.6, -3.5, -2.6, -0.75, 0.75);
    mergeBoxes(bArm, mYellow, boom);
    mergeBoxes(bBkt, mPvc, boom);
    BD.excBoom = boom;
  }

  // 4 Articulated Construction Crew Figures with Hard Hats
  const hatCols = [0xFFD026, 0xF5F5F2, 0xFFD026, 0xF27420];
  const vestCols = [0xD9822B, 0xC8A028, 0x4A6E8A, 0xB84A28];
  for (let i = 0; i < 4; i++) {
    const w = makePerson( { coat: vestCols[i], pants: 0x3D526B, hair: 0x3A2B22, skin: 0xDFB192 }, false, 30 + i);
    const hatM = new THREE.MeshStandardMaterial({ color: hatCols[i], roughness: 0.35 });
    exteriorLightsOnly(hatM);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hatM);
    dome.position.set(0, 5.14, 0);
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.55, 0.05, 14), hatM);
    brim.position.set(0, 5.12, 0.05);
    w.add(dome, brim);
    w.visible = false;
    grp.add(w);
    BD.workers.push(w);
  }

  // Populate stage pills on #bd-marks
  const marks = document.getElementById('bd-marks');
  if (marks && !marks.children.length) {
    BD._markBtns = BD_STAGES.map(s => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.left = (s.t * 100).toFixed(2) + '%';
      b.style.width = Math.max(2.2, (s.end - s.t) * 100 - 0.5).toFixed(2) + '%';
      b.setAttribute('data-tip', s.title);
      b.setAttribute('aria-label', s.title);
      b.addEventListener('click', () => {
        BD.t = s.t + 0.002;
        bdApplyPhases(BD.t, 0);
        bdApplyEnv(0, true);
        bdStepCamera(0, true);
        markShadows();
        wake(6);
      });
      marks.appendChild(b);
      return b;
    });
  }
}

function bdActiveStage(t) {
  for (let i = BD_STAGES.length - 1; i >= 0; i--) {
    if (t >= BD_STAGES[i].t) return i;
  }
  return 0;
}

function bdApplyPhases(t, dt) {
  // 1. Site prep, excavation, plumbing, rebar, formwork
  if (BD.clearingGrp) BD.clearingGrp.visible = t < 0.032;
  if (BD.siltDriveGrp) BD.siltDriveGrp.visible = t >= 0.012 && t < 0.88;
  if (BD.trenchGrp) BD.trenchGrp.visible = t >= 0.022 && t < 0.11;
  if (BD.earthGrp) BD.earthGrp.visible = t >= 0.04 && t < 0.14;
  if (BD.batterGrp) BD.batterGrp.visible = t >= 0.042 && t < 0.135;
  if (BD.slabPlumbGrp) BD.slabPlumbGrp.visible = t >= 0.055 && t < 0.58;
  if (BD.rebarGrp) BD.rebarGrp.visible = t >= 0.085 && t < 0.125;
  if (BD.formsGrp) BD.formsGrp.visible = t >= 0.075 && t < 0.145;
  if (BD.excavator) {
    BD.excavator.visible = t < 0.15;
    if (BD.excavator.visible && BD.excBoom) {
      BD.excBoom.rotation.z = -0.18 + Math.sin(RT.fxT * 2.2) * 0.16;
      BD.excavator.rotation.y = 1.15 + Math.sin(RT.fxT * 0.9) * 0.22;
    }
  }

  // 2. Full-height wall-by-wall & bay-by-bay framing (no pop-up scaling)
  const gTimes = [0.145, 0.160, 0.175, 0.190];
  for (let i = 0; i < BD.frameG.length; i++) {
    BD.frameG[i].visible = t >= gTimes[i] && t < 0.59;
  }
  if (BD.loftJoists) BD.loftJoists.visible = t >= 0.205 && t < 0.59;
  if (BD.roughStair) BD.roughStair.visible = t >= 0.215 && t < 0.68;
  const subTimes = [0.225, 0.233, 0.241];
  for (let i = 0; i < BD.loftSubfloors.length; i++) {
    BD.loftSubfloors[i].visible = t >= subTimes[i] && t < 0.655;
  }
  const lwTimes = [0.246, 0.258, 0.270];
  for (let i = 0; i < BD.loftWalls.length; i++) {
    BD.loftWalls[i].visible = t >= lwTimes[i] && t < 0.59;
  }
  if (BD.ridgeBeam) BD.ridgeBeam.visible = t >= 0.280 && t < 0.59;
  const rTimes = [0.288, 0.298, 0.308, 0.318];
  for (let i = 0; i < BD.rafterChunks.length; i++) {
    BD.rafterChunks[i].visible = t >= rTimes[i] && t < 0.59;
  }
  if (BD.wingJoists) BD.wingJoists.visible = t >= 0.305 && t < 0.59;
  if (BD.toppingTree) BD.toppingTree.visible = t >= 0.320 && t < 0.365;

  // 3. Incremental OSB sheathing (0.33–0.38) before housewrap (0.38)
  const owTimes = [0.330, 0.342, 0.354, 0.366];
  for (let i = 0; i < BD.osbWallChunks.length; i++) {
    BD.osbWallChunks[i].visible = t >= owTimes[i] && t < 0.382;
  }
  const orTimes = [0.336, 0.348, 0.360, 0.372];
  for (let i = 0; i < BD.osbRoofChunks.length; i++) {
    BD.osbRoofChunks[i].visible = t >= orTimes[i] && t < 0.386;
  }

  if (BD.scaffGrp) BD.scaffGrp.visible = t >= 0.33 && t < 0.525;
  if (BD.mepDucts) BD.mepDucts.visible = t >= 0.53 && t < 0.59;
  if (BD.mepInsul) BD.mepInsul.visible = t >= 0.56 && t < 0.59;
  if (BD.sitePropsGrp) BD.sitePropsGrp.visible = t < 0.90;

  // 4. Material progression: Housewrap -> Wood/Charred Siding; Underlayment -> Metal Roof; Unpainted GWB -> Chalk
  if (MATS.siding && MATS.sidingWood) {
    if (t < 0.475) {
      MATS.siding.color.setHex(0xEFECE4); MATS.sidingWood.color.setHex(0xE8E4DA); // White housewrap
    } else if (t < 0.495) {
      MATS.siding.color.setHex(0xEFECE4); MATS.sidingWood.color.setHex(0xC9A273); // Wing natural wood installed first
    } else {
      MATS.siding.color.setHex(C.siding); MATS.sidingWood.color.setHex(0xC9A273); // Main charred siding installed
    }
  }
  if (MATS.roof) {
    if (t < 0.455) {
      MATS.roof.color.setHex(0x485058); MATS.roof.metalness = 0.05; MATS.roof.roughness = 0.8; // Synthetic roof underlayment
    } else {
      MATS.roof.color.setHex(C.roof); MATS.roof.metalness = 0.35; MATS.roof.roughness = 0.45; // Standing-seam metal roof
    }
  }
  if (MATS.chalk) {
    if (t >= 0.59 && t < 0.625) MATS.chalk.color.setHex(0xDEDAD0); // Unpainted gypsum board / tape compound
    else MATS.chalk.color.setHex(C.chalk);                        // Painted Chalk finish
  }

  // 5. Granular permanent house mesh visibility (only re-evaluate when crossing a phase threshold)
  const BD_THRESH = [0.105, 0.185, 0.20, 0.382, 0.386, 0.405, 0.425, 0.445, 0.59, 0.605, 0.64, 0.655, 0.68, 0.72, 0.745, 0.775, 0.81, 0.835, 0.86, 0.90, 0.925];
  let pk = 0; while (pk < BD_THRESH.length && t >= BD_THRESH[pk]) pk++;
  let anyChanged = false;
  if (pk !== BD._phaseKey) {
    BD._phaseKey = pk;
    const visMesh = m => {
      const p = m.userData.phase, fl = m.userData.bdFloor || '', mn = m.userData.bdMat || '', r = m.userData.room || '';
      switch (p) {
        case 'slab':      return fl === 'site' ? (mn === 'gravel' ? t >= 0.86 : t >= 0.105) : t >= 0.105;
        case 'decks':     return mn === 'concrete' || mn === 'steel' ? t >= 0.185 : t >= 0.20;
        case 'siding':    return t >= 0.382;
        case 'roofing':   return t >= 0.386;
        case 'windows':   return fl === 'ground' ? t >= 0.405 : fl === 'loft' ? t >= 0.425 : t >= 0.445;
        case 'drywall':   return fl === 'ground' ? t >= 0.59 : t >= 0.605;
        case 'floorTile': return mn === 'wood' ? t >= 0.655 : t >= 0.64;
        case 'stair':     return t >= 0.68;
        case 'millwork':  return mn === 'woodPanel' ? t >= 0.72 : t >= 0.745;
        case 'doors':     return t >= 0.775;
        case 'fixtures':  return (mn === 'lamp' || mn === 'creamGlass' || mn === 'paper') ? t >= 0.835 : t >= 0.81;
        case 'mep':       return t >= 0.86;
        case 'furniture': return (r === 'guestBed' || r === 'office' || r === 'bedroom' || r === 'loft') ? t >= 0.90 : t >= 0.925;
        default:          return false;
      }
    };
    for (let i = 0; i < PHASE_MESHES.length; i++) {
      const m = PHASE_MESHES[i], wantVis = visMesh(m), wantHid = !wantVis;
      if (!!m.userData.phaseHidden !== wantHid) {
        m.userData.phaseHidden = wantHid;
        if (!m.userData.inCutSet) m.visible = wantVis;
        anyChanged = true;
      }
    }
  }

  // 6. Exterior landscape & patio groups (installed in May move-in phase)
  const extDone = t >= 0.935;
  if (typeof PATIO !== 'undefined' && PATIO.grp) {
    PATIO.grp.visible = extDone;
    if (PATIO.setPatioFire) PATIO.setPatioFire(t >= 0.96);
  }
  if (typeof WEST_DECK !== 'undefined' && WEST_DECK.grp) WEST_DECK.grp.visible = t >= 0.92;
  if (typeof GRILL !== 'undefined' && GRILL.grp) GRILL.grp.visible = t >= 0.92;
  if (typeof PLANTS !== 'undefined' && PLANTS.meshes) {
    for (const pm of PLANTS.meshes) pm.visible = extDone;
  }
  if (typeof CAR !== 'undefined' && CAR.chargerMeshes) {
    for (const cm of CAR.chargerMeshes) cm.visible = t >= 0.86;
  }
  if (typeof CAR !== 'undefined' && CAR.car) {
    if (t < 0.945) {
      CAR.car.visible = false;
      CAR.plug.visible = false; CAR.cable.visible = false;
    } else {
      CAR.car.visible = true;
      const driveP = Math.max(0, 1 - (t - 0.945) / 0.035);
      const pt = tlDrive.at(driveP);
      CAR.car.position.set(pt.x, pt.y, pt.z); CAR.car.rotation.y = pt.h;
      CAR.plug.visible = driveP < 0.02; CAR.cable.visible = driveP < 0.02;
    }
  }

  // 7. Switch between exterior shell view and cutaway interior view when crews work inside
  const sIdx = bdActiveStage(t), stg = BD_STAGES[sIdx];
  let wantWalls = stg.walls, wantRoof = stg.roof;
  if (sIdx === 13) { // April: cutaway for appliances/lighting (0.81–0.86), then exterior for MEP & grading (0.86–0.90)
    wantWalls = t < 0.86 ? 'cutaway' : 'up';
    wantRoof = t >= 0.86;
  } else if (sIdx === 14) { // May: cutaway for furniture delivery (0.90–0.94), then evening exterior for patio & dusk move-in
    wantWalls = t < 0.94 ? 'cutaway' : 'up';
    wantRoof = t >= 0.94;
  }
  tlSetWallsRoof(wantWalls, wantRoof, 'both');
  if (anyChanged) { updateWalls(); markShadows(); }

  // 8. Animate construction crew figures in active work zones
  const crew = stg.crew || [];
  for (let i = 0; i < BD.workers.length; i++) {
    const w = BD.workers[i], c = crew[i];
    if (!c) { w.visible = false; continue; }
    w.visible = true;
    const [cx, cy, cz, ch] = c;
    const sway = Math.sin(RT.fxT * 2.4 + i * 1.7);
    w.position.set(cx + Math.sin(RT.fxT * 0.7 + i * 2.1) * 0.65, cy, cz + Math.cos(RT.fxT * 0.6 + i * 1.9) * 0.65);
    w.rotation.y = ch + sway * 0.25;
    const ud = w.userData;
    if (ud.armL) {
      ud.armL.rotation.x = -0.55 + sway * 0.45;
      ud.armR.rotation.x = -0.65 - sway * 0.55;
      ud.legL.rotation.x = sway * 0.18;
      ud.legR.rotation.x = -sway * 0.18;
    }
  }
}

function bdApplyEnv(dt, immediate) {
  const sIdx = bdActiveStage(BD.t), stg = BD_STAGES[sIdx];
  const mIdx = stg.mIdx;
  const stgSpan = Math.max(0.01, stg.end - stg.t);
  const stgFrac = Math.max(0, Math.min(1, (BD.t - stg.t) / stgSpan));
  // Map stage month (0=Sep..8=May) to day-of-year so seasons & snow align with the stage captions
  const monthDays = [244, 274, 305, 335, 365, 396, 424, 455, 485];
  const day = (monthDays[mIdx] + stgFrac * 26) % 365;
  // No snow or white winter ground until late December (day >= 355); keep bare autumn/late-fall earth before Dec 21
  const seasonDay = (day >= 298 && day < 355) ? 298 + ((day - 298) / 57) * 18 : day;
  const daySky = tlApplyContinuousSeasons(seasonDay);
  if (day >= 244 && day < 355) {
    if (TL.snowK !== 0 || TL._snowCache !== 0) {
      TL.snowK = 0; TL._snowCache = 0;
      if (MATS.snow) { MATS.snow.opacity = 0; MATS.snow.depthWrite = false; }
      for (const m of snowParts) m.visible = false;
    }
  } else if (BD.t < 0.20) {
    for (const m of snowParts) if (m.parent === G.site && m.visible) m.visible = false;
  }
  tlStepEnvFx(dt, (day >= 298 && day < 355) ? 327 : day);

  BD.hourTarget = stg.hour;
  if (sIdx !== BD.cur) {
    BD.cur = sIdx;
    const [eb, ttl] = stg.title.split(' · ');
    showCap(ttl || stg.title, eb || '');
    if (BD._markBtns) BD._markBtns.forEach((b, k) => b.classList.toggle('active', k === sIdx));
  }
  const prevSun = BD.sunCur;
  if (immediate) BD.sunCur = BD.hourTarget;
  else BD.sunCur += (BD.hourTarget - BD.sunCur) * Math.min(1, dt * 1.4);
  state.sun = Math.max(6, Math.min(19.5, BD.sunCur));

  const wantDusk = Math.max(0, Math.min(1, (BD.sunCur - 16.5) / 2.5));
  if (immediate) BD.duskCur = wantDusk;
  else BD.duskCur += (wantDusk - BD.duskCur) * Math.min(1, dt * 1.8);
  const dk = BD.duskCur;

  const h = state.sun, az = (h - 12.5) / 6.5 * (Math.PI / 2);
  const el = Math.max(0.08, (55 * Math.PI / 180) * Math.sin(Math.PI * (h - 5.75) / 13.5));
  const D = 27, ce = Math.cos(el);
  sun.position.set(-Math.sin(az) * ce * D, Math.sin(el) * D, Math.cos(az) * ce * D);
  if (immediate || Math.abs(BD.sunCur - prevSun) > 0.025) { if (immediate || ((BD._shTick = (BD._shTick || 0) + 1) % (LITE ? 10 : 6) === 0)) markShadows(); }

  const sElev = Math.min(1, Math.sin(el) * 1.6);
  const daySunI = DAY.sun * (0.28 + 0.72 * sElev), dayHemiI = DAY.hemi * (0.72 + 0.28 * sElev);
  sun.intensity = daySunI * (1 - dk) + NIGHTSET.sun * dk;
  _tc1.setRGB(1, 0.8 + 0.15 * sElev, 0.62 + 0.27 * sElev);
  sun.color.lerpColors(_tc1, _tc2.setHex(NIGHTSET.sunColor), dk);
  hemi.intensity = dayHemiI * (1 - dk) + NIGHTSET.hemi * dk;
  hemi.color.lerpColors(_tc1.setHex(0xf4f1ea), _tc2.setHex(NIGHTSET.hemiSky), dk);
  hemi.groundColor.lerpColors(_tc1.setHex(0xd9d1c4), _tc2.setHex(0x3d3a35), dk);
  fill.intensity = DAY.fill * (1 - dk) + NIGHTSET.fill * dk;
  renderer.toneMappingExposure = DAY.exposure * (1 - dk) + NIGHTSET.exposure * dk;
  if (BD._lastDk === undefined || Math.abs(dk - BD._lastDk) > 0.002) {
    BD._lastDk = dk;
    setEnvNight(dk);
  }
  scene.background.lerpColors(daySky, _tc2.setHex(NIGHTSET.bg), dk);
  if (scene.fog) scene.fog.color.copy(scene.background);

  // Interior work lights during cutaway phases (t >= 0.53) and warm evening glow at May move-in (t >= 0.92)
  const hasLight = BD.t >= 0.53;
  const extK = BD.t >= 0.85 ? Math.min(1, Math.max(0, (BD.sunCur - 16.0) / 2.0)) : 0;
  const intK = hasLight ? Math.max(0.55, extK) : 0;
  for (const { L, cd } of nightRig) {
    const k = L.userData.ext ? extK : intK;
    L.visible = true;
    L.intensity = k > 0.01 ? cd * NIGHTSET.dim * k : 0;
  }
  lampMat.emissiveIntensity = BD.t >= 0.83 ? 2.6 * intK : 0;
  paperMat.emissiveIntensity = BD.t >= 0.83 ? 1.2 * intK : 0;
  creamMat.emissiveIntensity = BD.t >= 0.83 ? 1.4 * intK : 0;
  const glass = MATS.glass;
  if (glass) { glass.emissive.set(0xffc98a); glass.emissiveIntensity = BD.t >= 0.83 ? 0.28 * extK : 0; }
  if (state.walls !== 'up') {
    for (const v of CUT.variants) {
      const b = v.userData.base; v.emissive.copy(b.emissive); v.emissiveIntensity = b.emissiveIntensity; v.envMapIntensity = b.envMapIntensity;
    }
  }
  tlSetFire(BD.t >= 0.95);

  const bdom = BD._dom || (BD._dom = { ml: document.getElementById('bd-month'), stg: document.getElementById('bd-stage'), sc: document.getElementById('bd-scrub'), nd: document.getElementById('bd-needle') });
  if (bdom.ml && bdom.ml.textContent !== BD_MONTHS[mIdx]) bdom.ml.textContent = BD_MONTHS[mIdx];
  const stgTxt = `${sIdx + 1} / ${BD_STAGES.length}`;
  if (bdom.stg && bdom.stg.textContent !== stgTxt) bdom.stg.textContent = stgTxt;
  if (bdom.nd) bdom.nd.style.left = (BD.t * 100).toFixed(2) + '%';
}

const _bdCamGoal = new THREE.Vector3(), _bdCamTarget = new THREE.Vector3();
function bdStepCamera(dt, immediate) {
  const since = (performance.now() - BD.lastInteract) / 1000;
  if (!immediate && since < 3.5) return;
  const ramp = immediate ? 1 : Math.min(1, Math.max(0, (since - 3.5) / 1.5));
  const sIdx = bdActiveStage(BD.t), stg = BD_STAGES[sIdx];
  const p = toW(...stg.cam), q = toW(...stg.look);
  const sway = -0.10 + Math.sin(BD.t * Math.PI * 4) * 0.16;
  const ox = p.x - q.x, oz = p.z - q.z, c = Math.cos(sway), s = Math.sin(sway);
  _bdCamTarget.copy(q);
  _bdCamGoal.set(q.x + ox * c + oz * s, p.y, q.z - ox * s + oz * c);
  if (camera.aspect < 0.9) {
    const pull = Math.min(1.5, Math.max(1, 0.85 / camera.aspect));
    _bdCamGoal.sub(_bdCamTarget).multiplyScalar(pull).add(_bdCamTarget);
  }
  const k = immediate ? 1 : Math.min(1, dt * 1.6) * ramp;
  camera.position.lerp(_bdCamGoal, k);
  controls.target.lerp(_bdCamTarget, k);
  camera.lookAt(controls.target);
  if (state.walls === 'cutaway') updateWalls();
}

function bdTick(dt) {
  if (WALK.on || TOUR.on || TL.on) { exitBuild(); return; }
  if (BD.playing) BD.t = (BD.t + dt * BD.speed / BD_LOOP) % 1;
  bdApplyPhases(BD.t, dt);
  bdApplyEnv(dt, false);
  bdStepCamera(dt, false);
  if (!BD.scrubbing) {
    const sc = BD._dom ? BD._dom.sc : document.getElementById('bd-scrub');
    if (sc) sc.value = String(Math.round(BD.t * 1000));
  }
  wake();
}

function enterBuild() {
  if (BD.on) { exitBuild(); return; }
  if (!BD.built) { withModeLoading('Preparing Build…', () => { bdEnsureBuilt(); enterBuild(); }); return; }
  if (WALK.on) exitWalk();
  if (TOUR.on) exitTour();
  if (TL.on) MODES.exitTimeline();
  const tvD = RT.tvScreen ? actOf(RT.tvScreen) : null;
  BD.saved = {
    state: { ...state }, pos: camera.position.clone(), target: controls.target.clone(),
    carColor: CAR.paint.color.getHex(), fire: fireLight.visible && fireLight.intensity > 0,
    patioFire: typeof PATIO !== 'undefined' && PATIO.getPatioFire ? PATIO.getPatioFire() : true,
    grill: GRILL.actDef.on, tv: tvD ? tvD.ch : 0, fan: FAN.speed
  };
  bdEnsureBuilt();
  BD.on = true; BD.playing = true; BD.t = 0; BD.speed = 1; BD.cur = -1; BD._phaseKey = -1; BD._lastDk = undefined;
  TL._treeCache = null; TL._snowCache = undefined;
  BD.sunCur = BD_STAGES[0].hour; BD.hourTarget = BD_STAGES[0].hour; BD.duskCur = 0; BD.lastInteract = 0;
  Object.assign(state, { floors: 'both', explode: 0, labels: false, night: false });
  G.ground.visible = true; G.loft.visible = true;
  G.loft.position.y = 0; G.wingRoof.position.y = 0; G.mainRoof.position.y = 0;
  document.getElementById('labels').style.display = 'none';
  labels.forEach(l => { l.visible = false; });
  RT.nightOn = false;
  tlSetFire(false); tlSetGrill(false); tlSetTV(0); tlSetFan(0); tlSetFrontDoor(false); tlSetSideDoor(false);
  BD.grp.visible = true;
  document.body.classList.add('building');
  document.getElementById('bdbar').hidden = false;
  document.getElementById('bd-play').textContent = '❚❚';
  document.getElementById('bd-speed').textContent = '1×';
  document.querySelector('#btn-build b').textContent = 'Exit build';
  bdApplyPhases(0, 0);
  bdApplyEnv(0, true);
  bdStepCamera(0, true);
  markShadows();
  wake(10);
}

function exitBuild() {
  if (!BD.on) return;
  document.body.classList.remove('building');
  BD.on = false; BD.playing = false; BD.cur = -1; BD._phaseKey = -1; BD._lastDk = undefined;
  TL._treeCache = null; TL._snowCache = undefined; twigs.visible = true;
  if (BD.grp) BD.grp.visible = false;
  if (TL.wx) TL.wx.mesh.visible = false;
  if (TL.blooms) { TL.blooms.mesh.visible = false; TL.blooms.lastK = -1; }
  if (TL.fallLeaves) { TL.fallLeaves.mesh.visible = false; TL.fallLeaves.lastK = -1; }
  if (TL.tracks) TL.tracks.mesh.visible = false;

  // Restore original material colors & properties
  if (MATS.siding) MATS.siding.color.setHex(C.siding);
  if (MATS.sidingWood) MATS.sidingWood.color.setHex(0xC9A273);
  if (MATS.roof) { MATS.roof.color.setHex(C.roof); MATS.roof.metalness = 0.35; MATS.roof.roughness = 0.45; }
  if (MATS.chalk) MATS.chalk.color.setHex(C.chalk);
  if (MATS.snow) { MATS.snow.transparent = false; MATS.snow.opacity = 1; MATS.snow.depthWrite = true; }
  snowParts.forEach(m => { m.position.y = 0; m.scale.y = 1; });

  // Restore visibility of all house phases and landscape groups
  for (let i = 0; i < PHASE_MESHES.length; i++) {
    const m = PHASE_MESHES[i];
    m.userData.phaseHidden = false;
    if (!m.userData.inCutSet) m.visible = true;
  }
  if (typeof PATIO !== 'undefined' && PATIO.grp) {
    PATIO.grp.visible = true;
    if (PATIO.setPatioFire) PATIO.setPatioFire(BD.saved ? BD.saved.patioFire : false);
  }
  for (const w of TWEENS) w.obj[w.key] = w.to;
  TWEENS.length = 0;
  if (typeof WEST_DECK !== 'undefined' && WEST_DECK.grp) {
    WEST_DECK.grp.visible = true;
    WEST_DECK.setNight(RT.nightOn);
  }
  if (typeof GRILL !== 'undefined' && GRILL.grp) GRILL.grp.visible = true;
  if (typeof PLANTS !== 'undefined' && PLANTS.meshes) {
    for (const pm of PLANTS.meshes) pm.visible = true;
  }
  if (typeof CAR !== 'undefined' && CAR.chargerMeshes) {
    for (const cm of CAR.chargerMeshes) cm.visible = true;
  }
  const pt = tlDrive.at(0);
  CAR.car.visible = true;
  CAR.car.position.set(pt.x, pt.y, pt.z); CAR.car.rotation.y = pt.h;
  CAR.plug.visible = true; CAR.cable.visible = true;

  if (BD.saved) {
    tlSetFire(BD.saved.fire);
    tlSetGrill(BD.saved.grill);
    tlSetTV(BD.saved.tv);
    tlSetFan(BD.saved.fan);
    Object.assign(state, BD.saved.state);
    RT.seasonOn = null; RT.nightOn = !state.night; MODES.applyState();
    controls.enabled = true;
    MODES.flyTo(BD.saved.pos.clone(), BD.saved.target.clone(), 0.9);
  }
  updateWalls();
  markShadows();
  document.getElementById('bdbar').hidden = true;
  document.querySelector('#btn-build b').textContent = 'Build the house';
  showCap('');
}

document.getElementById('bd-play').addEventListener('click', e => { BD.playing = !BD.playing; e.target.textContent = BD.playing ? '❚❚' : '▶'; });
document.getElementById('bd-speed').addEventListener('click', e => {
  const speeds = [1, 1.5, 2, 0.5];
  BD.speed = speeds[(speeds.indexOf(BD.speed) + 1) % speeds.length];
  e.target.textContent = BD.speed + '×';
});
document.getElementById('bd-scrub').addEventListener('input', e => {
  BD.scrubbing = true; BD.playing = false; document.getElementById('bd-play').textContent = '▶';
  BD.t = +e.target.value / 1000;
  bdApplyPhases(BD.t, 0);
  bdApplyEnv(0, true);
  bdStepCamera(0, true);
  markShadows();
  wake(6);
});
document.getElementById('bd-scrub').addEventListener('change', () => { BD.scrubbing = false; });


MODES.enterBuild = enterBuild;
MODES.exitBuild = exitBuild;
MODES.bdTick = bdTick;
if (typeof window !== 'undefined' && window.__house) {
  window.__house.BD_STAGES = BD_STAGES;
  window.__house.enterBuild = enterBuild;
  window.__house.exitBuild = exitBuild;
}

export { BD_LOOP, BD_MONTHS, BD_STAGES, bdEnsureBuilt, bdActiveStage, bdApplyPhases, bdApplyEnv, bdStepCamera, bdTick, enterBuild, exitBuild };
