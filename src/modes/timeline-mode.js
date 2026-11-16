// "A Year Here" (Timeline Mode): 58-second 4-season simulation across 9 curated moments.
import * as THREE from 'three';
import { FT, LV, LITE, FOV, HOME, DAY, NIGHTSET } from '../config/constants.js';
import { state, RT, MODES, TWEENS, FAN, CUT, WALK, TOUR, TL, BD, nightRig, ease, actOf, markShadows, wake } from '../core/state.js';
import { MATS, lampMat, creamMat, paperMat, setEnvNight } from '../core/materials.js';
import { root, G } from '../house/site-and-floors.js';
import { renderer, scene, camera, controls, phoneFov, setFov } from '../core/renderer.js';
import { hemi, sun, fill, sunTimeLabel } from '../house/lighting.js';
import { LAND, DRIVE, PATIO_AT, terrainY, twigs, snowParts, CAR, TREES, decid, pines, trunks, canopies, cones } from '../landscape/terrain-and-trees.js';
import { PATIO, WEST_DECK, GRILL } from '../landscape/outdoor-living.js';
import { labels } from '../systems/labels-selection.js';
import { fireLight, tvLight } from '../systems/interactions.js';
import { toW, exitWalk } from './walk-mode.js';
import { showCap, exitTour } from './tour-mode.js';
import {
  TL_LOOP, TL_MONTHS, SECOND_CAR,
  P_CAR_TO_LIV, P_CAR_TO_KIT, P_LIV_TO_CAR, P_KIT_TO_CAR, P_KIT_TO_GRILL, P_GRILL_TO_KIT,
  TL_GEO, tlMat, makePerson, poseFigure, tlBuildEnvFx, tlStepEnvFx, tlApplyContinuousSeasons,
  _tc1, _tc2, _tc3, tlPoly, tlDrive, setCarColor,
  tlSetFire, tlSetGrill, tlSetTV, tlSetFan, tlSetFrontDoor, tlSetSideDoor,
  tlSetWallsRoof, withModeLoading
} from '../landscape/seasonal-fx.js';

const MOMENTS = [
  { id: 'winter-arrival', title: 'Arrival in the snow', eyebrow: 'Winter', seasonTitle: 'Snowbound dusk', caption: 'Late January — arrival in the snow, snow angels & warming up by the fire', t: 18 / 365, dur: 0.085, hour: 16.8, occupied: true, fire: true, fireDelay: 0.80, tv: 2, car: 'arrive',
    floors: 'both', walls: 'up', roof: true, cam: { pos: [58, 26, 72], look: [32, 1, 26] },
    pins: [
      { at: [53.2, 2.2, 33.2], text: 'Plugging in the car', win: [0.26, 0.42] },
      { at: [24.5, 1.5, 47.0], text: 'Snow angels in the yard', win: [0.42, 0.72] },
      { at: [8.0, 4.2, 21.0], text: 'Starting the fire to warm up', win: [0.76, 0.98] },
    ],
    cast: [
      { who: 'a', stand: true, angel: true, path: [[55, -2.25, 34.5], [53.2, -2.25, 32.8], [32, -2.25, 36.0], [23.5, -2.25, 46.5]], delay: 0.25, sitWindow: [0.42, 0.72], exitPath: [[23.5, -2.25, 46.5], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 16.5], [13.2, -1.5, 19.5], [8.2, -1.5, 20.8]], face: 0.2 },
      { who: 'b', stand: true, angel: true, path: [[55, -2.25, 34.5], [34, -2.25, 37.0], [27.5, -2.25, 47.5]], delay: 0.27, sitWindow: [0.43, 0.71], exitPath: [[27.5, -2.25, 47.5], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 16.5], [13.2, -1.5, 19.5], [6.6, -1.5, 19.6]], face: -0.3 },
      { who: 'g', kid: true, stand: true, angel: true, path: [[55, -2.25, 34.5], [31, -2.25, 37.5], [21.5, -2.25, 47.2]], delay: 0.28, sitWindow: [0.42, 0.72], exitPath: [[21.5, -2.25, 47.2], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 16.5], [13.2, -1.5, 19.5], [9.2, -1.5, 19.2]], face: 0.1 },
    ] },
  { id: 'winter-ski', title: 'Ski day', eyebrow: 'Late winter', seasonTitle: 'Ski day', caption: 'Late February — heading out to ski & coming back from the slopes', t: 50 / 365, dur: 0.075, hour: 15.8, occupied: true, fire: true, car: 'ski-trip',
    floors: 'both', walls: 'up', roof: true,
    pins: [
      { at: [36.0, 2.5, 33.2], text: 'Heading out to ski', win: [0.06, 0.28] },
      { at: [36.0, 2.5, 33.2], text: 'Back from the slopes', win: [0.70, 0.95] },
    ],
    cast: [
      { who: 'g', ski: true, path: [[19.8, 0, 16.5], [20.2, 0, 22.5], [20.7, -2.25, 29.5], [32, -2.25, 33.2], [55, -2.25, 34.5]], delay: 0.02, span: 0.24, hideAtEnd: true, face: 0 },
      { who: 'g', ski: true, path: [[19.8, 0, 16.5], [20.2, 0, 22.5], [20.7, -2.25, 29.5], [32, -2.25, 33.2], [55, -2.25, 34.5]], delay: 0.04, span: 0.23, hideAtEnd: true, face: 0 },
      { who: 'g', kid: true, ski: true, path: [[19.8, 0, 16.5], [20.2, 0, 22.5], [20.7, -2.25, 29.5], [32, -2.25, 33.2], [55, -2.25, 34.5]], delay: 0.06, span: 0.22, hideAtEnd: true, face: 0 },
      { who: 'g', ski: true, path: [[55, -2.25, 34.5], [32, -2.25, 33.2], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 16.5]], delay: 0.70, span: 0.26, hideAtEnd: true, face: 3.1 },
      { who: 'g', ski: true, path: [[55, -2.25, 34.5], [32, -2.25, 33.2], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 16.5]], delay: 0.73, span: 0.24, hideAtEnd: true, face: 3.1 },
      { who: 'g', kid: true, ski: true, path: [[55, -2.25, 34.5], [32, -2.25, 33.2], [20.7, -2.25, 29.5], [20.2, 0, 22.5], [19.8, 0, 16.5]], delay: 0.75, span: 0.23, hideAtEnd: true, face: 3.1 },
    ] },
  { id: 'spring-thaw', title: 'Spring thaw & first sun', eyebrow: 'Early spring', seasonTitle: 'First thaw', caption: 'Late March — spring thaw, first blooms & morning sun on the lawn', t: 78 / 365, dur: 0.08, hour: 9.5, occupied: true, car: 'parked',
    floors: 'both', walls: 'up', roof: true,
    props: [
      { kind: 'flowers', at: [29.1, -2.25, 48.9] },
      { kind: 'flowers', at: [19.8, -2.25, 47.8] },
      { kind: 'flowers', at: [24.6, -2.25, 49.4] },
    ],
    pins: [
      { at: [24.0, 2.2, 47.0], text: 'First blooms on the lawn', win: [0.12, 0.88] },
      { at: [-4.5, 4.2, 12.0], text: 'Morning coffee on the deck', win: [0.18, 0.86] },
    ],
    cast: [
      { who: 'g', stand: true, smell: true, path: [[20.7, -2.25, 29.5], [24.5, -2.25, 42.0], [28.5, -2.25, 47.5]], sitWindow: [0.24, 0.78], exitPath: [[28.5, -2.25, 47.5], [24.0, -2.25, 40.0], [20.7, -2.25, 29.5]], face: 0.4 },
      { who: 'g', stand: true, smell: true, path: [[20.7, -2.25, 29.5], [17.5, -2.25, 41.5], [20.5, -2.25, 46.5]], sitWindow: [0.26, 0.76], exitPath: [[20.5, -2.25, 46.5], [18.5, -2.25, 39.0], [20.7, -2.25, 29.5]], face: -0.5 },
      { who: 'g', kid: true, path: [[4.0, -2.25, 34.0], [-4.5, -2.25, 36.5], [2.0, -2.25, 38.0]], delay: 0.08, span: 0.84 },
      { who: 'a', path: [[-1.5, -0.167, 12.0], [-4.5, -0.167, 12.0]], sitWindow: [0.06, 0.94], exitPath: [[-4.5, -0.167, 12.0], [-1.5, -0.167, 12.0]], face: -1.57 },
      { who: 'b', path: [[8.8, 0, 8.53], [10.38, 0, 8.53]], sitWindow: [0.06, 0.94], exitPath: [[10.38, 0, 8.53], [8.8, 0, 8.53]], face: 1.57 },
    ] },
  { id: 'spring-patio', title: 'Lunch under the birches', eyebrow: 'Late spring', seasonTitle: 'Fresh canopy', caption: 'Mid May — lunch under the birches & playing on the lawn', t: 130 / 365, dur: 0.09, hour: 13.0, occupied: true, fan: 2.4, car: 'parked', ball: true,
    floors: 'both', walls: 'up', roof: true,
    props: [{ kind: 'basket', at: [-10.41, 0.42, 38.54] }],
    pins: [
      { at: [-9.8, 3.6, 39.5], text: 'Lunch under the birches', win: [0.10, 0.88] },
      { at: [24.5, 2.2, 48.0], text: 'Catch on the lawn', win: [0.16, 0.86] },
    ],
    cast: [
      { who: 'g', path: [[-4, -2.25, 37], [-9.99, -2.25, 41.62]], sitWindow: [0.06, 0.92], exitPath: [[-9.99, -2.25, 41.62], [-4, -2.25, 37]], face: 3.69 },
      { who: 'g', path: [[-3, -2.25, 36], [-7.86, -2.25, 40.31]], sitWindow: [0.08, 0.90], exitPath: [[-7.86, -2.25, 40.31], [-3, -2.25, 36]], face: 3.69 },
      { who: 'a', path: [[-5, -2.25, 35], [-11.87, -2.25, 36.15]], sitWindow: [0.08, 0.90], exitPath: [[-11.87, -2.25, 36.15], [-5, -2.25, 35]], face: 0.55 },
      { who: 'b', path: [[-1.5, -0.167, 13.5], [-4.5, -0.167, 12.0]], sitWindow: [0.06, 0.94], exitPath: [[-4.5, -0.167, 12.0], [-1.5, -0.167, 13.5]], face: -1.57 },
      { who: 'g', kid: true, path: [[18, -2.25, 46], [26, -2.25, 50], [19, -2.25, 48]], delay: 0.04, span: 0.90 },
      { who: 'g', kid: true, path: [[31, -2.25, 49], [23, -2.25, 45], [30, -2.25, 50]], delay: 0.06, span: 0.88 },
    ] },
  { id: 'summer-lawn', title: 'Deck cookout & lawn picnic', eyebrow: 'Summer', seasonTitle: 'Long afternoon', caption: 'Early July — grilling, lounging on the deck & picnic on the lawn', t: 182 / 365, dur: 0.10, hour: 16.0, occupied: true, grill: true, fan: 5, car: 'parked', ball: true,
    floors: 'both', walls: 'up', roof: true,
    props: [{ kind: 'blanket', at: [24, -2.25, 48.5], rot: -0.25 }, { kind: 'basket', at: [25.4, -2.25, 49.3] }],
    pins: [
      { at: [-4.34, 4.4, 0.8], text: 'Grilling on the deck', win: [0.08, 0.86] },
      { at: [29.0, 2.5, 48.5], text: 'Picnic & catch on the lawn', win: [0.16, 0.88] },
    ],
    cast: [
      { who: 'a', stand: true, grill: true, path: [[-1.5, -0.167, 14.5], [-4.34, -0.167, 2.6]], sitWindow: [0.14, 0.90], exitPath: [[-4.34, -0.167, 2.6], [-1.5, -0.167, 14.5]], face: 3.14 },
      { who: 'b', path: [[-1.5, -0.167, 11.5], [-4.5, -0.167, 7.0]], sitWindow: [0.06, 0.94], exitPath: [[-4.5, -0.167, 7.0], [-1.5, -0.167, 11.5]], face: -1.57 },
      { who: 'g', path: [[8.2, 0, 11.5], [3.5, 0, 14.5], [-1.2, -0.167, 14.6], [-4.5, -0.167, 12.0]], sitWindow: [0.24, 0.76], exitPath: [[-4.5, -0.167, 12.0], [-1.2, -0.167, 14.6], [3.5, 0, 14.5]], face: -1.57 },
      { who: 'g', path: [[21.5, -2.25, 46.0], [22.8, -2.25, 47.9]], sitWindow: [0.06, 0.94], exitPath: [[22.8, -2.25, 47.9], [21.5, -2.25, 46.0]], face: 0.9 },
      { who: 'g', path: [[26.5, -2.25, 47.0], [25.2, -2.25, 49.0]], sitWindow: [0.08, 0.92], exitPath: [[25.2, -2.25, 49.0], [26.5, -2.25, 47.0]], face: -0.5 },
      { who: 'g', kid: true, path: [[28.5, -2.25, 46.5], [31.5, -2.25, 48.5], [29.0, -2.25, 47.0], [31.2, -2.25, 48.0]], delay: 0.04, span: 0.92 },
      { who: 'g', kid: true, path: [[38.5, -2.25, 50.5], [35.5, -2.25, 48.5], [38.0, -2.25, 50.0], [35.8, -2.25, 49.0]], delay: 0.06, span: 0.90 },
    ] },
  { id: 'rainy-afternoon', title: 'Rainy afternoon indoors', eyebrow: 'Late summer', seasonTitle: 'Rainy afternoon', caption: 'Mid August — summer rain outside, snuggled on the couch watching TV', t: 228 / 365, dur: 0.085, hour: 17.6, occupied: true, tv: 2, fan: 1.5, rain: true, car: 'parked',
    floors: 'both', walls: 'up', roof: true,
    pins: [
      { at: [5.5, 2.8, 21.5], text: 'Snuggled up watching TV', win: [0.08, 0.92] },
    ],
    cast: [
      { who: 'a', sit: true, path: [[4.5, -1.5, 20.8]], delay: 0.02, span: 0.96, face: 1.57 },
      { who: 'b', sit: true, path: [[4.5, -1.5, 22.1]], delay: 0.02, span: 0.96, face: 1.57 },
      { who: 'g', kid: true, sit: true, path: [[7.2, -1.5, 18.2]], delay: 0.02, span: 0.96, face: 0.35 },
    ] },
  { id: 'fall-patio', title: 'Golden hour on the deck', eyebrow: 'Early fall', seasonTitle: 'Golden hour', caption: 'Late September — golden hour grilling & lounging on the deck', t: 268 / 365, dur: 0.09, hour: 17.35, occupied: true, grill: true, patioFire: true, patioFireDelay: 0.24, tv: 2, car: 'parked',
    floors: 'both', walls: 'up', roof: true,
    pins: [
      { at: [-4.34, 4.4, 0.8], text: 'Grilling at golden hour', win: [0.10, 0.88] },
      { at: [-18.0, 2.8, 42.5], text: 'Lighting the fire pit', win: [0.18, 0.88] },
    ],
    cast: [
      { who: 'a', stand: true, grill: true, path: [[-1.5, -0.167, 14.5], [-4.34, -0.167, 2.6]], sitWindow: [0.14, 0.90], exitPath: [[-4.34, -0.167, 2.6], [-1.5, -0.167, 14.5]], face: 3.14 },
      { who: 'g', path: [[-1.5, -0.167, 13.0], [-4.5, -0.167, 12.0]], sitWindow: [0.06, 0.94], exitPath: [[-4.5, -0.167, 12.0], [-1.5, -0.167, 13.0]], face: -1.57 },
      { who: 'g', path: [[-1.5, -0.167, 11.0], [-4.5, -0.167, 7.0]], sitWindow: [0.08, 0.92], exitPath: [[-4.5, -0.167, 7.0], [-1.5, -0.167, 11.0]], face: -1.57 },
      { who: 'b', path: [[-11.5, -2.25, 36.0], [-15.53, -2.25, 43.71]], delay: 0.06, sitWindow: [0.22, 0.92], exitPath: [[-15.53, -2.25, 43.71], [-11.5, -2.25, 36.0]], face: -2.75 },
    ] },
  { id: 'fall-fireside', title: 'Fireside as leaves fall', eyebrow: 'Autumn', seasonTitle: 'Peak foliage', caption: 'Late October — jumping in the leaves & sitting around the fire pit', t: 304 / 365, dur: 0.072, hour: 18.2, occupied: true, fire: true, patioFire: true, tv: 1, car: 'depart-end',
    floors: 'both', walls: 'up', roof: true,
    props: [{ kind: 'leafpile', at: [25.5, -2.25, 47.5] }],
    pins: [
      { at: [-18.5, 3.2, 42.5], text: 'Around the fire pit', win: [0.10, 0.86] },
      { at: [25.5, 3.0, 47.5], text: 'Jumping in the leaves', win: [0.18, 0.84] },
    ],
    cast: [
      { who: 'a', path: [[-12, -2.25, 40], [-15.53, -2.25, 43.71]], sitWindow: [0.06, 0.92], exitPath: [[-15.53, -2.25, 43.71], [-12, -2.25, 40]], face: -2.75 },
      { who: 'b', path: [[-12, -2.25, 41], [-19.51, -2.25, 46.15]], sitWindow: [0.08, 0.90], exitPath: [[-19.51, -2.25, 46.15], [-12, -2.25, 41]], face: 2.90 },
      { who: 'g', path: [[-12, -2.25, 39], [-21.95, -2.25, 42.17]], sitWindow: [0.08, 0.90], exitPath: [[-21.95, -2.25, 42.17], [-12, -2.25, 39]], face: 1.33 },
      { who: 'g', path: [[-12, -2.25, 38], [-17.97, -2.25, 39.73]], sitWindow: [0.10, 0.88], exitPath: [[-17.97, -2.25, 39.73], [-12, -2.25, 38]], face: -0.24 },
      { who: 'g', jump: true, path: [[17.5, -2.25, 43.5], [24.8, -2.25, 47.1]], delay: 0.08, span: 0.78, face: 1.1 },
      { who: 'g', jump: true, path: [[33.5, -2.25, 49.5], [26.2, -2.25, 47.9]], delay: 0.10, span: 0.76, face: -1.9 },
    ] },
  { id: 'winter-quiet', title: 'First snow & quiet night', eyebrow: 'Early winter', seasonTitle: 'First snow', caption: 'Mid December — fresh snow, one window glowing', t: 332 / 365, dur: 0.070, hour: 20.0, occupied: false, car: 'away', glow: true,
    floors: 'both', walls: 'up', roof: true,
    pins: [
      { at: [12.0, 4.2, 23.0], text: 'Quiet snow · window glowing', win: [0.16, 0.86] },
    ] },
];

TL.moments = MOMENTS;
function tlBuildMoment(m, idx) {
  const group = new THREE.Group(); LAND.add(group); group.visible = false;
  const walkers = [];
  const cast = m.cast || [];
  for (let k = 0; k < cast.length; k++) {
    const c = cast[k];
    const fig = makePerson(c.who, !!c.kid, idx * 7 + k, !!c.ski);
    fig.visible = false; group.add(fig);
    walkers.push({
      fig, poly: tlPoly(c.path), exitPoly: c.exitPath ? tlPoly(c.exitPath) : null,
      sitWindow: c.sitWindow || null, delay: c.delay || 0, span: c.span || 0.01,
      loop: !!c.loop, hideAtEnd: !!c.hideAtEnd, sit: !!c.sit, stand: !!c.stand, grill: !!c.grill, smell: !!c.smell, kid: !!c.kid, angel: !!c.angel, jump: !!c.jump, face: c.face || 0, bob: 0,
    });
  }
  let ball = null;
  if (m.ball) { ball = new THREE.Mesh(TL_GEO.ball, tlMat(0xF2F3F1)); ball.castShadow = false; ball.visible = false; group.add(ball); }
  const props = [];
  for (const p of (m.props || [])) {
    let mesh;
    if (p.kind === 'leafpile') {
      mesh = new THREE.Group();
      const cols = [0xB85228, 0xD4882A, 0x9E3B22, 0xC96E2E, 0xDF9E38];
      const cMnd = new THREE.Mesh(TL_GEO.bloom, tlMat(cols[0]));
      cMnd.scale.set(9.5, 4.2, 8.8); cMnd.position.set(0, 1.15, 0);
      cMnd.castShadow = false; cMnd.receiveShadow = true; mesh.add(cMnd);
      for (let j = 0; j < 6; j++) {
        const a = j * (Math.PI / 3) + 0.2, r = 2.6;
        const mnd = new THREE.Mesh(TL_GEO.bloom, tlMat(cols[(j + 1) % cols.length]));
        mnd.scale.set(6.2, 2.8, 5.8);
        mnd.position.set(Math.cos(a) * r, 0.78, Math.sin(a) * r);
        mnd.rotation.y = a; mnd.castShadow = false; mnd.receiveShadow = true;
        mesh.add(mnd);
      }
      for (let j = 0; j < 6; j++) {
        const a = j * (Math.PI / 3) + 0.7, r = 4.4;
        const mnd = new THREE.Mesh(TL_GEO.bloom, tlMat(cols[(j + 2) % cols.length]));
        mnd.scale.set(4.2, 1.6, 3.8);
        mnd.position.set(Math.cos(a) * r, 0.42, Math.sin(a) * r);
        mnd.rotation.y = a; mnd.castShadow = false; mnd.receiveShadow = true;
        mesh.add(mnd);
      }
      mesh.position.set(p.at[0], p.at[1], p.at[2]);
    } else if (p.kind === 'flowers') {
      mesh = new THREE.Group();
      const flCols = [0xF2D44B, 0xE87BA6, 0x9B7AE0, 0xF7F3E8, 0xF08B49];
      for (let j = 0; j < 12; j++) {
        const a = j * 2.39996, r = 0.28 + Math.sqrt(j / 12) * 1.15;
        const fx = Math.cos(a) * r, fz = Math.sin(a) * r, h = 0.7 + (j % 3) * 0.25;
        const stem = new THREE.Mesh(TL_GEO.pole, tlMat(0x4F7A3E));
        stem.scale.set(2.4, h / 3.4, 2.4);
        stem.position.set(fx, h * 0.5, fz);
        stem.castShadow = false; stem.receiveShadow = false;
        mesh.add(stem);
        const head = new THREE.Mesh(TL_GEO.bloom, tlMat(flCols[j % flCols.length]));
        head.scale.setScalar(0.55 + (j % 3) * 0.14);
        head.position.set(fx, h + 0.12, fz);
        head.rotation.y = a;
        head.castShadow = false; head.receiveShadow = false;
        mesh.add(head);
      }
      mesh.position.set(p.at[0], p.at[1], p.at[2]);
    } else {
      mesh = p.kind === 'blanket' ? new THREE.Mesh(TL_GEO.blanket, tlMat(0x7A2E2E)) : new THREE.Mesh(TL_GEO.basket, tlMat(0x8A6A45));
      mesh.castShadow = false; mesh.receiveShadow = true; mesh.position.set(p.at[0], p.at[1] + 0.06, p.at[2]); mesh.rotation.y = p.rot || 0;
    }
    group.add(mesh);
    props.push(mesh);
  }
  return { group, walkers, ball, props };
}
function tlActiveMoment() { for (let i = 0; i < MOMENTS.length; i++) { const d = (TL.t - MOMENTS[i].t + 1) % 1; if (d < MOMENTS[i].dur) return i; } return -1; }
function tlNextMoment() { let best = null, bd = 1; for (const m of MOMENTS) { const d = (m.t - TL.t + 1) % 1; if (d < bd) { bd = d; best = m; } } return best; }
function momentProgress(m) { return ((TL.t - m.t + 1) % 1) / m.dur; }
// --- smooth continuous day ↔ golden hour ↔ twilight ↔ moonlit night lighting
function tlApplyEnv(dt, immediate) {
  const day = TL.t * 365, month = Math.min(11, Math.floor(TL.t * 12));
  const daySky = tlApplyContinuousSeasons(day);
  tlStepEnvFx(dt, day);
  const prevSun = TL.sunCur;
  if (immediate) TL.sunCur = TL.hourTarget;
  else TL.sunCur += (TL.hourTarget - TL.sunCur) * Math.min(1, dt * 1.1);
  state.sun = Math.max(6, Math.min(19.5, TL.sunCur));
  const dom = TL._dom || (TL._dom = {
    st: document.getElementById('suntime'), wst: document.getElementById('walk-sun'),
    sto: document.getElementById('suntime-out'), wsto: document.getElementById('walk-sun-out'),
    ml: document.getElementById('tl-month'), sc: document.getElementById('tl-scrub'),
    needle: document.getElementById('tl-needle'), time: document.getElementById('tl-time'),
    pins: document.getElementById('tl-pins')
  });
  const sunLbl = sunTimeLabel(state.sun);
  if (sunLbl !== TL._sunLbl) {
    TL._sunLbl = sunLbl;
    const sunStr = String(state.sun);
    if (dom.st) dom.st.value = sunStr;
    if (dom.wst) dom.wst.value = sunStr;
    if (dom.sto) dom.sto.textContent = sunLbl;
    if (dom.wsto) dom.wsto.textContent = sunLbl;
    if (dom.time) dom.time.textContent = sunLbl;
  }
  if (dom.needle) dom.needle.style.left = (TL.t * 100).toFixed(2) + '%';
  // Dusk factor 0 (daytime <= 17.4) -> 1 (nighttime >= 19.3), with warm golden hour around 16.5..18.2
  const wantDusk = Math.max(0, Math.min(1, (TL.sunCur - 17.4) / 1.9));
  if (immediate) TL.duskCur = wantDusk;
  else TL.duskCur += (wantDusk - TL.duskCur) * Math.min(1, dt * 1.6);
  const dk = TL.duskCur;
  const goldK = Math.max(0, 1 - Math.abs(TL.sunCur - 17.35) / 1.05);
  // Position sun/moon along arc and smoothly blend sky, fog, hemi, fill, and sun intensity
  const h = state.sun, az = (h - 12.5) / 6.5 * (Math.PI / 2);
  const el = Math.max(0.08, (55 * Math.PI / 180) * Math.sin(Math.PI * (h - 5.75) / 13.5));
  const D = 27, ce = Math.cos(el);
  sun.position.set(-Math.sin(az) * ce * D, Math.sin(el) * D, Math.cos(az) * ce * D);
  if (immediate || Math.abs(TL.sunCur - prevSun) > 0.025) { if (immediate || ((TL._shTick = (TL._shTick || 0) + 1) % (LITE ? 10 : 6) === 0)) markShadows(); }
  const sElev = Math.min(1, Math.sin(el) * 1.6);
  const wantOcc = TL.occupied ? 1 : 0;
  if (immediate || TL.occCur === undefined) TL.occCur = wantOcc;
  else TL.occCur += (wantOcc - TL.occCur) * Math.min(1, dt * 1.4);
  const occ = TL.occCur;
  const daySunI = DAY.sun * (0.28 + 0.72 * sElev) + 0.45 * goldK, dayHemiI = DAY.hemi * (0.72 + 0.28 * sElev) + 0.18 * goldK;
  sun.intensity = daySunI * (1 - dk) + (0.56 + (NIGHTSET.sun - 0.56) * occ) * dk;
  _tc1.setRGB(1, Math.max(0.55, 0.8 + 0.15 * sElev - 0.10 * goldK), Math.max(0.32, 0.62 + 0.27 * sElev - 0.22 * goldK));
  sun.color.lerpColors(_tc1, _tc2.setHex(NIGHTSET.sunColor), dk);
  hemi.intensity = dayHemiI * (1 - dk) + (0.48 + (NIGHTSET.hemi - 0.48) * occ) * dk;
  hemi.color.lerpColors(_tc1.setHex(0xf4f1ea), _tc2.setHex(NIGHTSET.hemiSky), dk);
  hemi.groundColor.lerpColors(_tc1.setHex(0xd9d1c4), _tc2.setHex(0x3d3a35), dk);
  fill.intensity = DAY.fill * (1 - dk) + NIGHTSET.fill * dk;
  renderer.toneMappingExposure = DAY.exposure * (1 - dk) + NIGHTSET.exposure * dk;
  if (goldK > 0.01) daySky.lerp(_tc2.setHex(0xeeb484), 0.42 * goldK);
  scene.background.lerpColors(daySky, _tc2.setHex(0x222f46).lerp(_tc1.setHex(NIGHTSET.bg), occ), dk);
  if (scene.fog) scene.fog.color.copy(scene.background);
  // Keep exterior sconces lit whenever it's evening/night (even when unoccupied in Mid December);
  // keep L.visible = true throughout timeline so Three.js never recompiles shaders mid-animation!
  const extK = Math.min(1, Math.max(0, (TL.sunCur - 16.0) / 2.0));
  const intK = occ * Math.max(0.55, extK);
  for (const { L, cd } of nightRig) {
    const k = L.userData.ext ? extK : intK;
    L.visible = true;
    L.intensity = k > 0.01 ? cd * NIGHTSET.dim * k : 0;
  }
  lampMat.emissiveIntensity = 2.6 * intK;
  paperMat.emissiveIntensity = 1.2 * intK;
  creamMat.emissiveIntensity = 1.4 * intK;
  const lanternK = occ * Math.min(1, Math.max(0, (TL.sunCur - 16.2) / 1.4));
  PATIO.lanternMat.emissiveIntensity = 3.2 * lanternK;
  PATIO.lanternHalo.visible = lanternK > 0.04;
  PATIO.lanternHalo.material.opacity = 0.28 * lanternK;
  if (typeof WEST_DECK !== 'undefined') WEST_DECK.setNightK(lanternK);
  const glass = MATS.glass;
  if (glass) { glass.emissive.set(0xffc98a); glass.emissiveIntensity = (0.08 + 0.20 * occ) * extK; }
  if (TL.glow) {
    const gm = TL.cur >= 0 ? MOMENTS[TL.cur] : null;
    TL.glow.intensity = gm && gm.glow ? 8 * Math.sin(momentProgress(gm) * Math.PI) : 0;
  }
  if (state.walls !== 'up') {
    for (const v of CUT.variants) {
      const b = v.userData.base; v.emissive.copy(b.emissive); v.emissiveIntensity = b.emissiveIntensity;
    }
  }
  if (dom.ml && dom.ml.textContent !== TL_MONTHS[month]) dom.ml.textContent = TL_MONTHS[month];
}

function tlSetMoment(i) {
  if (TL.cur >= 0 && TL.built[TL.cur]) TL.built[TL.cur].group.visible = false;
  if (TL.glow) { TL.glow.visible = true; TL.glow.intensity = 0; }
  TL.cur = i;
  if (TL._markBtns) TL._markBtns.forEach((b, k) => b.classList.toggle('active', k === i));
  if (i < 0) {
    showCap('');
    tlSetFrontDoor(false);
    tlSetSideDoor(false);
    tlSetWallsRoof('up', true, 'both');
    if (typeof PATIO !== 'undefined' && PATIO.setPatioFire) PATIO.setPatioFire(false);
    const nx = tlNextMoment();
    if (nx) { TL.hourTarget = nx.hour; TL.occupied = !!nx.occupied; }
    return;
  }
  const m = MOMENTS[i], B = TL.built[i];
  B.group.visible = true;
  for (const w of B.walkers) { w.fig.visible = false; w.bob = 0; }
  if (B.ball) { B.ball.visible = false; TL.ballPh = 0; }
  TL.hourTarget = m.hour; TL.occupied = !!m.occupied;
  tlSetWallsRoof(m.walls || 'up', m.roof !== undefined ? m.roof : true, m.floors || 'both');
  tlSetFire(!!m.fire && !m.fireDelay);
  if (typeof PATIO !== 'undefined' && PATIO.setPatioFire) PATIO.setPatioFire(!!m.patioFire && !m.patioFireDelay);
  tlSetGrill(!!m.grill);
  tlSetTV(m.tv || 0);
  tlSetFan(m.fan || 0);
  if (m.car === 'arrive') setCarColor(0xF3F3F1);
  else if (m.car === 'turnover') setCarColor(SECOND_CAR);
  showCap(m.seasonTitle || m.title, m.eyebrow);
}
function tlStepActors(dt) {
  if (TL.cur < 0) return;
  const m = MOMENTS[TL.cur], B = TL.built[TL.cur], ph = momentProgress(m);
  if (m.fireDelay) tlSetFire(!!m.fire && ph >= m.fireDelay);
  if (m.patioFireDelay && typeof PATIO !== 'undefined' && PATIO.setPatioFire) PATIO.setPatioFire(!!m.patioFire && ph >= m.patioFireDelay);
  let nearFront = false, nearSide = false;
  for (const w of B.walkers) {
    let pt = null, moving = false, sitting = false, standing = false, heading = w.face, p = 0;
    if (w.sitWindow) {
      const [s0, s1] = w.sitWindow, d0 = w.delay || 0;
      if (ph < d0) { w.fig.visible = false; continue; }
      if (ph < s0) {
        p = Math.max(0, Math.min(1, (ph - d0) / Math.max(0.01, s0 - d0)));
        pt = w.poly.at(p); moving = p > 0 && p < 1; heading = pt.h;
      } else if (ph <= s1) {
        pt = w.poly.at(1); sitting = !w.stand; standing = !!w.stand; heading = w.face;
      } else if (w.exitPoly) {
        p = Math.max(0, Math.min(1, (ph - s1) / (1 - s1)));
        pt = w.exitPoly.at(p); moving = p > 0 && p < 1; heading = pt.h;
      }
    } else {
      p = (ph - w.delay) / w.span;
      if (w.loop) { if (p < 0) { w.fig.visible = false; continue; } p = p % 1; }
      else p = Math.max(0, Math.min(1, p));
      if (p <= 0 || (!w.loop && p >= 1 && w.hideAtEnd)) { w.fig.visible = false; continue; }
      pt = w.poly.at(p);
      moving = !w.poly.single && (w.loop || (p > 0 && p < 1));
      heading = w.poly.single ? w.face : (moving ? pt.h : (w.face || pt.h));
    }
    if (!pt) { w.fig.visible = false; continue; }
    let extra = null, yOff = 0, sw = 0;
    if (standing && w.angel) {
      const [s0, s1] = w.sitWindow;
      const ap = (ph - s0) / Math.max(0.01, s1 - s0);
      if (ap < 0.30) {
        w.bob += dt * 7.5;
        extra = 'jump'; yOff = Math.abs(Math.sin(w.bob)) * 1.5;
      } else {
        w.bob += dt * 4.2;
        extra = 'angel'; yOff = 0.32; sw = w.bob;
      }
    } else if (w.angel && !w.sitWindow) {
      w.bob += dt * 4.2;
      extra = 'angel'; yOff = 0.32; sw = w.bob;
    } else if (w.jump && p >= 0.45) {
      w.bob += dt * 7.5;
      extra = 'jump'; yOff = Math.abs(Math.sin(w.bob)) * 2.6;
    } else if (standing && w.grill) {
      w.bob += dt * 4.5;
      extra = 'grill'; sw = w.bob;
    } else if (standing && w.smell) {
      w.bob += dt * 3.2;
      extra = 'smell'; sw = w.bob;
    } else {
      if (moving) w.bob += dt * 9.5;
      yOff = moving ? Math.abs(Math.sin(w.bob)) * 0.12 : 0;
      sw = moving ? Math.sin(w.bob) * 0.55 : 0;
    }
    w.fig.visible = true;
    w.fig.position.set(pt.x, pt.y + yOff, pt.z);
    w.fig.rotation.y = heading;
    poseFigure(w.fig, sitting || w.sit, sw, extra);
    if (Math.hypot(pt.x - 19.8, pt.z - 17.5) < 5.5) nearFront = true;
    if (Math.hypot(pt.x - 0.1, pt.z - 14.6) < 4.8) nearSide = true;
  }
  tlSetFrontDoor(nearFront);
  tlSetSideDoor(nearSide);
  // Smoothly scale picnic/patio props in as people arrive and pack them up as they leave
  if (B.props.length) {
    const pk = ph < 0.22 ? ease(Math.max(0, (ph - 0.12) / 0.1)) : ph > 0.76 ? 1 - ease(Math.min(1, (ph - 0.76) / 0.1)) : 1;
    for (const pm of B.props) {
      pm.visible = pk > 0.02;
      pm.scale.setScalar(Math.max(0.01, pk));
    }
  }
  if (B.ball) {
    const kids = B.walkers.filter(w => w.kid && w.fig.visible);
    if (kids.length >= 2 && ph > 0.2 && ph < 0.8) {
      TL.ballPh += dt * 0.85; const f = TL.ballPh % 1;
      const a = kids[0].fig.position, b = kids[1].fig.position;
      B.ball.visible = true;
      B.ball.position.lerpVectors(a, b, f);
      B.ball.position.y = Math.max(a.y, b.y) + 1.0 + Math.sin(f * Math.PI) * 2.1;
    } else B.ball.visible = false;
  }
}
function tlStepCar(dt) {
  const m = TL.cur >= 0 ? MOMENTS[TL.cur] : null;
  const mode = m ? m.car : (TL.t * 365 > 315 || TL.t * 365 < 18 ? 'away' : 'parked');
  const ph = m ? momentProgress(m) : 0;
  const prevD = TL.carD, prevVis = CAR.car.visible;
  let target = TL.carD;
  if (mode === 'parked') target = 0;
  else if (mode === 'away') target = 1;
  else if (mode === 'arrive') target = 1 - ease(Math.min(1, ph / 0.28));
  else if (mode === 'depart-end') target = ph < 0.72 ? 0 : ease((ph - 0.72) / 0.26);
  else if (mode === 'ski-trip') {
    if (ph < 0.26) target = 0;
    else if (ph < 0.44) target = ease((ph - 0.26) / 0.18);
    else if (ph < 0.52) target = 1;
    else if (ph < 0.70) target = 1 - ease((ph - 0.52) / 0.18);
    else target = 0;
  }
  else if (mode === 'turnover') {
    if (ph < 0.25) target = 0;
    else if (ph < 0.46) target = ease((ph - 0.25) / 0.21);
    else if (ph < 0.68) { if (TL.carColor !== 0xF3F3F1) setCarColor(0xF3F3F1); target = 1 - ease((ph - 0.46) / 0.22); }
    else target = 0;
  }
  TL.carD = target;
  const pt = tlDrive.at(TL.carD);
  CAR.car.position.set(pt.x, pt.y, pt.z); CAR.car.rotation.y = pt.h;
  CAR.car.visible = TL.carD < 0.98;
  const parked = TL.carD < 0.02 && CAR.car.visible;
  CAR.plug.visible = parked; CAR.cable.visible = parked;
  const driving = TL.carD > 0.01 && TL.carD < 0.98 && mode !== 'parked' && mode !== 'away';
  const night = TL.sunCur < 7 || TL.sunCur >= 16.3;
  const lights = driving && night && CAR.car.visible;
  CAR.beams.forEach(sl => { sl.visible = true; sl.intensity = lights ? 40 : 0; });
  CAR.lamp.emissiveIntensity = lights ? 2.5 : 0;
  if (TL.tracks) {
    const showTracks = TL.snowK > 0.04 && TL.carD < 0.97;
    TL.tracks.mesh.visible = showTracks;
    if (showTracks) {
      const startSeg = Math.max(0, Math.min(TL.tracks.segs - 1, Math.floor(TL.carD * TL.tracks.segs)));
      TL.tracks.geo.setDrawRange(startSeg * 12, (TL.tracks.segs - startSeg) * 12);
      TL.tracks.mat.opacity = 0.55 * TL.snowK;
    }
  }
  if (CAR.car.visible !== prevVis || Math.abs(TL.carD - prevD) > 0.003) {
    if (CAR.car.visible !== prevVis || ((TL._carShTick = (TL._carShTick || 0) + 1) % 4 === 0)) markShadows();
  }
}
const _tlCamTarget = new THREE.Vector3(), _tlCamGoal = new THREE.Vector3(), _tlCamOff = new THREE.Vector3();
const _tlTreeOrig = new Map();
const _tlTreeZero = new THREE.Matrix4().makeScale(0, 0, 0);
let _tlTreeMeta = null;
function tlCullCamTrees(restore = false) {
  if (!_tlTreeMeta) {
    const dMap = new Map(decid.map((t, i) => [t, i]));
    const pMap = new Map(pines.map((t, i) => [t, i]));
    _tlTreeMeta = TREES.map((t, ti) => ({ x: t.x, z: t.z, ti, di: dMap.get(t) ?? -1, pi: pMap.get(t) ?? -1 }));
  }
  const culled = TL._culledTrees || (TL._culledTrees = new Set());
  if (restore) {
    if (!culled.size) return;
    let dDirty = false, pDirty = false;
    for (const ti of culled) {
      const m = _tlTreeMeta[ti], orig = _tlTreeOrig.get(ti);
      if (!orig) continue;
      trunks.setMatrixAt(ti, orig.t);
      if (m.di >= 0) { canopies.setMatrixAt(m.di, orig.c); twigs.setMatrixAt(m.di, orig.c); dDirty = true; }
      if (m.pi >= 0) { cones.setMatrixAt(m.pi, orig.c); pDirty = true; }
    }
    culled.clear();
    trunks.instanceMatrix.needsUpdate = true;
    if (dDirty) { canopies.instanceMatrix.needsUpdate = true; twigs.instanceMatrix.needsUpdate = true; }
    if (pDirty) cones.instanceMatrix.needsUpdate = true;
    return;
  }
  LAND.updateMatrixWorld();
  const cLoc = _tlCamTarget.copy(camera.position); LAND.worldToLocal(cLoc);
  const tLoc = _tlCamGoal.copy(controls.target); LAND.worldToLocal(tLoc);
  const cx = cLoc.x, cz = cLoc.z;
  const lx = tLoc.x, lz = tLoc.z;
  const dx = lx - cx, dz = lz - cz, len2 = dx * dx + dz * dz;
  if (len2 < 1) return;
  const len = Math.sqrt(len2);
  const tanHalfH = Math.max(0.45, Math.min(1.0, Math.tan((camera.fov * Math.PI / 180) * 0.5) * (camera.aspect || 1.5)));
  const maxAlong = Math.max(10, len - 35);
  let tDirty = false, dDirty = false, pDirty = false;
  for (let i = 0; i < _tlTreeMeta.length; i++) {
    const m = _tlTreeMeta[i];
    const vx = m.x - cx, vz = m.z - cz;
    const u = (vx * dx + vz * dz) / len2;
    const dAlong = u * len;
    let hide = false;
    if (dAlong >= -18 && dAlong <= maxAlong) {
      const px = cx + u * dx - m.x, pz = cz + u * dz - m.z;
      const maxPerp = 20 + Math.max(0, dAlong) * (tanHalfH + 0.15);
      if (px * px + pz * pz < maxPerp * maxPerp) hide = true;
    }
    const was = culled.has(i);
    if (hide && !was) {
      if (!_tlTreeOrig.has(i)) {
        const tm = new THREE.Matrix4(), cm = new THREE.Matrix4();
        trunks.getMatrixAt(i, tm);
        if (m.di >= 0) canopies.getMatrixAt(m.di, cm);
        else if (m.pi >= 0) cones.getMatrixAt(m.pi, cm);
        _tlTreeOrig.set(i, { t: tm, c: cm });
      }
      trunks.setMatrixAt(i, _tlTreeZero); tDirty = true;
      if (m.di >= 0) { canopies.setMatrixAt(m.di, _tlTreeZero); twigs.setMatrixAt(m.di, _tlTreeZero); dDirty = true; }
      if (m.pi >= 0) { cones.setMatrixAt(m.pi, _tlTreeZero); pDirty = true; }
      culled.add(i);
    } else if (!hide && was) {
      const orig = _tlTreeOrig.get(i);
      if (orig) {
        trunks.setMatrixAt(i, orig.t); tDirty = true;
        if (m.di >= 0) { canopies.setMatrixAt(m.di, orig.c); twigs.setMatrixAt(m.di, orig.c); dDirty = true; }
        if (m.pi >= 0) { cones.setMatrixAt(m.pi, orig.c); pDirty = true; }
      }
      culled.delete(i);
    }
  }
  if (tDirty) trunks.instanceMatrix.needsUpdate = true;
  if (dDirty) { canopies.instanceMatrix.needsUpdate = true; twigs.instanceMatrix.needsUpdate = true; }
  if (pDirty) cones.instanceMatrix.needsUpdate = true;
}
function tlStepCamera(dt, immediate) {
  const idle = TL.lastInteract ? (performance.now() - TL.lastInteract) / 1000 : 99;
  if (idle < 3.5) { tlCullCamTrees(); return; }
  const r = Math.min(1, (idle - 3.5) / 3.5), ramp = r * r * (3 - 2 * r);
  const a = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1.5;
  const f = Math.min(2.15, Math.max(1, 1.35 / a));
  _tlCamOff.copy(HOME.pos).sub(HOME.target).multiplyScalar(f);
  const targetSway = -0.62 + Math.cos(TL.t * Math.PI * 2) * 0.28;
  if (immediate) TL.swayCur = targetSway;
  else TL.swayCur += (targetSway - TL.swayCur) * Math.min(1, dt * 1.2);
  const zoom = 1.26, lowY = 0.38;
  const rx = _tlCamOff.x * zoom, rz = _tlCamOff.z * zoom, ry = _tlCamOff.y * lowY;
  const c = Math.cos(TL.swayCur), s = Math.sin(TL.swayCur);
  _tlCamTarget.set(HOME.target.x - 0.5, HOME.target.y + 1.8, HOME.target.z + 1.2);
  _tlCamGoal.set(_tlCamTarget.x + rx * c + rz * s, _tlCamTarget.y + ry, _tlCamTarget.z - rx * s + rz * c);
  const k = immediate ? 1 : Math.min(1, dt * 1.9) * ramp;
  camera.position.lerp(_tlCamGoal, k);
  controls.target.lerp(_tlCamTarget, k);
  camera.lookAt(controls.target);
  tlCullCamTrees();
}
const _tlPinV = new THREE.Vector3();
function tlStepPins() {
  const pool = TL._pinPool || (TL._pinPool = []);
  const box = (TL._dom && TL._dom.pins) || document.getElementById('tl-pins');
  if (!box || !TL.on || TL.cur < 0) {
    for (const el of pool) el.style.opacity = '0';
    return;
  }
  const m = MOMENTS[TL.cur], pins = m.pins || [], ph = momentProgress(m);
  const w = window.innerWidth, h = window.innerHeight;
  while (pool.length < pins.length) {
    const el = document.createElement('div');
    el.className = 'tl-pin';
    el.style.opacity = '0';
    const b = document.createElement('div'); b.className = 'tl-pin-bubble';
    const s = document.createElement('div'); s.className = 'tl-pin-stem';
    const d = document.createElement('div'); d.className = 'tl-pin-dot';
    el.append(b, s, d);
    el._bubble = b;
    box.appendChild(el);
    pool.push(el);
  }
  for (let i = 0; i < pool.length; i++) {
    const el = pool[i];
    if (i >= pins.length) { el.style.opacity = '0'; continue; }
    const pin = pins[i], [p0, p1] = pin.win || [0, 1], fade = 0.10;
    let alpha = 0;
    if (ph >= p0 && ph <= p1) {
      alpha = Math.min(Math.min(1, (ph - p0) / fade), Math.min(1, (p1 - ph) / fade));
    }
    if (alpha <= 0.01) { el.style.opacity = '0'; continue; }
    _tlPinV.set((pin.at[0] - 24) * FT, pin.at[1] * FT, (pin.at[2] - 13.5) * FT).project(camera);
    if (_tlPinV.z > 1 || _tlPinV.z < -1) { el.style.opacity = '0'; continue; }
    const px = (_tlPinV.x * 0.5 + 0.5) * w, py = (-_tlPinV.y * 0.5 + 0.5) * h;
    if (px < -80 || px > w + 80 || py < -40 || py > h + 40) { el.style.opacity = '0'; continue; }
    if (el._bubble.textContent !== pin.text) el._bubble.textContent = pin.text;
    el.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) translate(-50%,-100%)`;
    el.style.opacity = alpha.toFixed(3);
  }
}
function tlTick(dt) {
  if (WALK.on || TOUR.on) { exitTimeline(); return; }
  const actNow = tlActiveMoment();
  const targetSpeed = actNow >= 0 ? 0.55 : 1.75;
  TL.speed += (targetSpeed - TL.speed) * Math.min(1, dt * 2.5);
  if (TL.playing) TL.t = (TL.t + dt * TL.speed * TL.speedMult / TL_LOOP) % 1;
  tlApplyEnv(dt, false);
  const act = tlActiveMoment();
  if (act !== TL.cur) tlSetMoment(act);
  tlStepActors(dt);
  tlStepCar(dt);
  tlStepCamera(dt, false);
  tlStepPins();
  if (!TL.scrubbing) { const sc = TL._dom ? TL._dom.sc : document.getElementById('tl-scrub'); if (sc) sc.value = String(Math.round(TL.t * 1000)); }
  wake();
}
function tlEnsureBuilt() {
  if (TL.built) return;
  TL.built = MOMENTS.map((m, i) => tlBuildMoment(m, i));
  if (!TL.glow) { TL.glow = new THREE.PointLight(0xffc98a, 0, 14, 2); TL.glow.position.set(12, 1.5, 23); LAND.add(TL.glow); }
  TL.glow.visible = true; TL.glow.intensity = 0;
  tlBuildEnvFx();
  const marks = document.getElementById('tl-marks');
  TL._markBtns = MOMENTS.map((m, idx) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.left = (m.t * 100) + '%';
    b.style.width = (m.dur * 100) + '%';
    b.dataset.tip = m.title;
    b.setAttribute('aria-label', m.title);
    b.addEventListener('click', () => {
      TL.t = m.t; TL.lastInteract = 0;
      tlApplyEnv(0, true);
      tlSetMoment(idx);
      tlStepActors(0);
      tlStepCar(0);
      tlStepCamera(0, true);
      tlStepPins();
      const sc = TL._dom ? TL._dom.sc : document.getElementById('tl-scrub');
      if (sc) sc.value = String(Math.round(TL.t * 1000));
      wake(4);
    });
    marks.appendChild(b);
    return b;
  });
}

function enterTimeline() {
  if (TL.on) { exitTimeline(); return; }
  if (!TL.built) { withModeLoading('Preparing Year…', () => { tlEnsureBuilt(); enterTimeline(); }); return; }
  if (WALK.on) exitWalk();
  if (TOUR.on) exitTour();
  if (BD.on) MODES.exitBuild();
  const tvD = RT.tvScreen ? actOf(RT.tvScreen) : null;
  TL.saved = { state: { ...state }, pos: camera.position.clone(), target: controls.target.clone(), carColor: CAR.paint.color.getHex(), fire: fireLight.visible && fireLight.intensity > 0, patioFire: PATIO.getPatioFire ? PATIO.getPatioFire() : false, grill: GRILL.actDef.on, tv: tvD ? tvD.ch : 0, fan: FAN.speed };
  tlEnsureBuilt();
  for (const B of TL.built) B.group.visible = false;
  TL.on = true; TL.playing = true; TL.t = MOMENTS[0].t; TL.speed = 0.55; TL.speedMult = 1; TL.cur = -1; TL.sunCur = MOMENTS[0].hour; TL.hourTarget = MOMENTS[0].hour; TL.occupied = true; TL.duskCur = 0; TL.swayCur = -0.14 + Math.cos(TL.t * Math.PI * 2) * 0.30; TL.seasonCur = null; TL.ballPh = 0; TL.lastInteract = 0; TL._treeCache = null; TL._snowCache = undefined; TL._sunLbl = null;
  Object.assign(state, { floors: 'both', explode: 0, labels: false, night: false });
  G.ground.visible = true; G.loft.visible = true; G.loft.position.y = 0; G.wingRoof.position.y = 0; G.mainRoof.position.y = 0;
  document.getElementById('labels').style.display = 'none';
  labels.forEach(l => { l.visible = false; });
  ['ground', 'both'].forEach(k => document.getElementById('fl-' + k).setAttribute('aria-pressed', String(k === 'both')));
  document.getElementById('tg-labels').checked = false;
  const bn = document.getElementById('btn-night'); if (bn) bn.setAttribute('aria-pressed', 'false');
  document.getElementById('explode').value = '0';
  document.getElementById('explode-out').textContent = '0%';
  RT.nightOn = false;
  if (TL.glow) { TL.glow.visible = true; TL.glow.intensity = 0; }
  fireLight.visible = true; fireLight.intensity = 0;
  tvLight.visible = true; tvLight.intensity = 0;
  if (GRILL.light) { GRILL.light.visible = true; GRILL.light.intensity = 0; }
  CAR.beams.forEach(sl => { sl.visible = true; sl.intensity = 0; });
  document.body.classList.add('timeline');
  document.getElementById('tlbar').hidden = false;
  document.getElementById('tl-pins').hidden = false;
  document.getElementById('tl-play').innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z"/></svg>';
  document.getElementById('tl-speed').textContent = '1×';
  document.querySelector('#btn-timeline b').textContent = 'Exit timeline';
  tlApplyEnv(0, true);
  tlSetMoment(0);
  tlStepActors(0);
  tlStepCar(0);
  tlStepCamera(0, true);
  tlStepPins();
  wake(10);
}
function exitTimeline() {
  if (!TL.on) return;
  document.body.classList.remove('timeline');
  tlCullCamTrees(true);
  TL.on = false; TL.playing = false; TL.speedMult = 1; TL.cur = -1; TL._treeCache = null; TL._snowCache = undefined; TL._sunLbl = null;
  twigs.visible = true;
  for (const B of TL.built || []) B.group.visible = false;
  for (const el of TL._pinPool || []) el.style.opacity = '0';
  if (TL.glow) { TL.glow.visible = true; TL.glow.intensity = 0; }
  if (TL.wx) TL.wx.mesh.visible = false;
  if (TL.blooms) { TL.blooms.mesh.visible = false; TL.blooms.lastK = -1; }
  if (TL.fallLeaves) { TL.fallLeaves.mesh.visible = false; TL.fallLeaves.lastK = -1; }
  if (TL.tracks) TL.tracks.mesh.visible = false;
  PATIO.lanternMat.emissiveIntensity = 0; PATIO.lanternHalo.visible = false;
  if (typeof PATIO !== 'undefined' && PATIO.setPatioFire) PATIO.setPatioFire(TL.saved ? TL.saved.patioFire : false);
  if (typeof WEST_DECK !== 'undefined') WEST_DECK.setNight(RT.nightOn);
  tlSetFire(TL.saved ? TL.saved.fire : false);
  tlSetGrill(TL.saved ? TL.saved.grill : false);
  tlSetTV(TL.saved ? TL.saved.tv : 0);
  tlSetFan(TL.saved ? TL.saved.fan : 0);
  tlSetFrontDoor(false);
  tlSetSideDoor(false);
  for (const w of TWEENS) w.obj[w.key] = w.to;
  TWEENS.length = 0;
  if (MATS.snow) { MATS.snow.transparent = false; MATS.snow.opacity = 1; MATS.snow.depthWrite = true; }
  snowParts.forEach(m => { m.position.y = 0; m.scale.y = 1; });
  TL.carD = 0; const pt = tlDrive.at(0);
  CAR.car.visible = true;
  CAR.car.position.set(pt.x, pt.y, pt.z); CAR.car.rotation.y = pt.h;
  setCarColor(TL.saved ? TL.saved.carColor : 0xF3F3F1);
  CAR.plug.visible = true; CAR.cable.visible = true;
  CAR.beams.forEach(sl => { sl.visible = true; sl.intensity = 0; }); CAR.lamp.emissiveIntensity = 0;
  if (TL.saved) {
    Object.assign(state, TL.saved.state);
    RT.seasonOn = null; RT.nightOn = !state.night; MODES.applyState();
    controls.enabled = true;
    MODES.flyTo(TL.saved.pos.clone(), TL.saved.target.clone(), 0.9);
  }
  markShadows();
  document.getElementById('tlbar').hidden = true;
  document.getElementById('tl-pins').hidden = true;
  document.querySelector('#btn-timeline b').textContent = 'A year here';
  showCap('');
}
document.getElementById('tl-play').addEventListener('click', e => { TL.playing = !TL.playing; e.currentTarget.innerHTML = TL.playing ? '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M200,32H160a16,16,0,0,0-16,16V208a16,16,0,0,0,16,16h40a16,16,0,0,0,16-16V48A16,16,0,0,0,200,32Zm0,176H160V48h40ZM96,32H56A16,16,0,0,0,40,48V208a16,16,0,0,0,16,16H96a16,16,0,0,0,16-16V48A16,16,0,0,0,96,32Zm0,176H56V48H96Z"/></svg>' : '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"/></svg>'; });
document.getElementById('tl-speed').addEventListener('click', e => {
  TL.speedMult = TL.speedMult === 1 ? 2 : TL.speedMult === 2 ? 0.5 : 1;
  e.target.textContent = TL.speedMult + '×';
});
document.getElementById('tl-scrub').addEventListener('input', e => {
  TL.scrubbing = true; TL.playing = false; document.getElementById('tl-play').innerHTML = '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M232.4,114.49,88.32,26.35a16,16,0,0,0-16.2-.3A15.86,15.86,0,0,0,64,39.87V216.13A15.94,15.94,0,0,0,80,232a16.07,16.07,0,0,0,8.36-2.35L232.4,141.51a15.81,15.81,0,0,0,0-27ZM80,215.94V40l143.83,88Z"/></svg>';
  TL.t = +e.target.value / 1000; tlApplyEnv(0, true);
  const a = tlActiveMoment(); if (a !== TL.cur) tlSetMoment(a);
  tlStepActors(0);
  tlStepCar(0);
  tlStepCamera(0, true);
  tlStepPins();
});
document.getElementById('tl-scrub').addEventListener('change', () => { TL.scrubbing = false; });
renderer.domElement.addEventListener('pointerdown', () => { TL.lastInteract = performance.now(); if (typeof BD !== 'undefined') BD.lastInteract = performance.now(); }, true);
renderer.domElement.addEventListener('wheel', () => { TL.lastInteract = performance.now(); if (typeof BD !== 'undefined') BD.lastInteract = performance.now(); }, { passive: true });


MODES.enterTimeline = enterTimeline;
MODES.exitTimeline = exitTimeline;
MODES.tlTick = tlTick;
if (typeof window !== 'undefined' && window.__house) {
  window.__house.MOMENTS = MOMENTS;
}

export { MOMENTS, tlBuildMoment, tlActiveMoment, tlNextMoment, momentProgress, tlApplyEnv, tlSetMoment, tlStepActors, tlStepCar, tlStepCamera, tlStepPins, tlTick, tlEnsureBuilt, enterTimeline, exitTimeline };
