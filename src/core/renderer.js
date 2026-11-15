// WebGLRenderer, CSS2DRenderer, Scene, Camera, OrbitControls, PMREM environment, pixel-ratio governor, and PNG snapshot.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { FT, LITE, FOV, HOME } from '../config/constants.js';
import { RT, WALK, TOUR, TL, BD, ENV_MATS, wake } from './state.js';
import { MAT_DEFS, MATS } from './materials.js';
import { root } from '../house/site-and-floors.js';

const stage = document.getElementById('stage');

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, LITE ? 1.15 : 1.25));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
// Shadows are re-rendered only when something changes (the scene is static; the camera does not affect them).
renderer.shadowMap.autoUpdate = false;

renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer({ element: document.getElementById('labels') });
labelRenderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.add(root);
// Reflections for polished metals only (materials with an `env` strength): a painted interior panorama —
// bright ceiling, a band of window light around the horizon, warm floor — so steel reads as polished.

{
  const pmrem = new THREE.PMREMGenerator(renderer);
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  const sky = g.createLinearGradient(0, 0, 0, 64); sky.addColorStop(0, '#ffffff'); sky.addColorStop(1, '#d9dee2');
  g.fillStyle = sky; g.fillRect(0, 0, 256, 64);
  const flr = g.createLinearGradient(0, 64, 0, 128); flr.addColorStop(0, '#9a948d'); flr.addColorStop(1, '#5d5853');
  g.fillStyle = flr; g.fillRect(0, 64, 256, 64);
  g.fillStyle = '#ffffff';
  for (const [x, w] of [[10, 22], [52, 15], [82, 38], [140, 18], [175, 30], [220, 20]]) g.fillRect(x, 38, w, 30);
  g.fillStyle = '#f4f1ea'; for (let x = 0; x < 256; x += 32) g.fillRect(x + 8, 8, 15, 4);   // ceiling lights
  const pano = new THREE.CanvasTexture(c); pano.mapping = THREE.EquirectangularReflectionMapping; pano.colorSpace = THREE.SRGBColorSpace;
  const envTex = pmrem.fromEquirectangular(pano).texture;
  pano.dispose(); pmrem.dispose();
  for (const [name, d] of Object.entries(MAT_DEFS)) {
    if (d.env && MATS[name]) { MATS[name].envMap = envTex; MATS[name].envMapIntensity = d.env; MATS[name].needsUpdate = true; ENV_MATS.push({ mat: MATS[name], env: d.env }); }
  }
}


export const camera = new THREE.PerspectiveCamera(FOV.orbit, window.innerWidth / window.innerHeight, 0.15, 250);
const phoneFov = f => f;
const setFov = f => { camera.fov = f; camera.updateProjectionMatrix(); };
camera.fov = phoneFov(FOV.orbit); camera.updateProjectionMatrix();

function homePos() {
  const a = Number.isFinite(camera.aspect) && camera.aspect > 0 ? camera.aspect : 1.5;   // panel may be 0×0 at load
  const f = Math.min(1.35, Math.max(1, 1.15 / a)), off = HOME.pos.clone().sub(HOME.target);
  return HOME.target.clone().add(off.multiplyScalar(f));
}
camera.position.copy(homePos());
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target); controls.enableDamping = true; controls.dampingFactor = 0.08;
controls.maxPolarAngle = Math.PI * 0.495; controls.minDistance = 3; controls.maxDistance = 80;
controls.screenSpacePanning = true;
controls.addEventListener('change', () => wake());


const clock = new THREE.Clock();

const GOV = { last: performance.now(), ema: 33, n: 0, pr: renderer.getPixelRatio(), max: renderer.getPixelRatio() }, FRAME_MS = 1000 / 30;
function governor(drew) {                                  // trade resolution for smoothness when frames take too long
  if (!drew) return;
  const now = performance.now(), d = Math.min(150, now - GOV.last); GOV.last = now; GOV.ema = GOV.ema * 0.94 + d * 0.06;
  if (++GOV.n % 45) return;
  let pr = GOV.pr;
  if (GOV.ema > 46) pr = Math.max(LITE ? 0.7 : 0.9, pr - 0.15); else if (GOV.ema < 38) pr = Math.min(GOV.max, pr + 0.1);
  if (Math.abs(pr - GOV.pr) > 0.01) { GOV.pr = pr; renderer.setPixelRatio(pr); renderer.setSize(window.innerWidth, window.innerHeight); wake(); }
}


let _toastFn = () => {};
let _walkRoomAtFn = () => 'walk';
export function bindSnapshotHelpers(toastFn, walkRoomAtFn) {
  _toastFn = toastFn;
  _walkRoomAtFn = walkRoomAtFn;
}
const toast = msg => _toastFn(msg);
const walkRoomAt = () => _walkRoomAtFn();

let snapBusy = false;
async function takeSnapshot() {
  if (snapBusy) return;
  snapBusy = true;
  const flash = document.getElementById('snap-flash');
  if (flash) {
    flash.classList.add('on');
    requestAnimationFrame(() => requestAnimationFrame(() => flash.classList.remove('on')));
  }
  const prevSize = renderer.getSize(new THREE.Vector2());
  const prevPR = renderer.getPixelRatio();
  const prevAspect = camera.aspect;
  const prevFov = camera.fov;
  let dataUrl = '';
  try {
    const SNAP_SIZE = 2048;
    renderer.setPixelRatio(1);
    renderer.setSize(SNAP_SIZE, SNAP_SIZE, false);
    camera.aspect = 1;
    camera.fov = prevFov > 60 ? Math.min(92, prevFov + 10) : Math.min(68, prevFov + 16);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    dataUrl = renderer.domElement.toDataURL('image/png');
  } finally {
    renderer.setPixelRatio(prevPR);
    renderer.setSize(prevSize.x, prevSize.y, false);
    camera.aspect = prevAspect;
    camera.fov = prevFov;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }
  try {
    if (!dataUrl) return;
    const bin = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'image/png' });
    const modeSlug = WALK.on ? walkRoomAt() : TOUR.on ? 'tour' : (typeof TL !== 'undefined' && TL.on) ? 'year' : (typeof BD !== 'undefined' && BD.on) ? 'build' : 'explore';
    const slug = modeSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const filename = `local-time-house-${slug || 'view'}.png`;
    const file = new File([blob], filename, { type: 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Local Time House' });
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('Snapshot saved');
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } finally {
    snapBusy = false;
  }
}
document.getElementById('snap-btn')?.addEventListener('click', e => { e.stopPropagation(); takeSnapshot(); });
addEventListener('keydown', e => {
  if (e.code !== 'KeyP' || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
  takeSnapshot();
});


export { stage, renderer, labelRenderer, scene, phoneFov, setFov, homePos, controls, clock, GOV, FRAME_MS, governor, takeSnapshot };
