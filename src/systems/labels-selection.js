// CSS2D room labels, room selection highlight, #info finish card, and floor hit-testing.
import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ROOMS, roomById, dimsOf, dimText } from '../config/rooms.js';
import { RT, MODES, WALK, TOUR, isShown, wake } from '../core/state.js';
import { C } from '../core/materials.js';
import { root, G, roomFloorMeshes, ROOM_FLOOR_LIST } from '../house/site-and-floors.js';
import { renderer, camera } from '../core/renderer.js';

const labels = [];
for (const r of ROOMS) {
  if (r.nolabel) continue;
  const el = document.createElement('div'); el.className = 'rlabel';
  el.innerHTML = `<b></b><span></span>`; el.querySelector('b').textContent = r.name; el.querySelector('span').textContent = dimText(r);
  if (r.small) el.style.opacity = '0.85';
  const obj = new CSS2DObject(el);
  const [x0, x1, z0, z1] = r.dimRect || r.rects[0];
  obj.position.set((x0 + x1) / 2, r.y + (r.id === 'kitchen' ? 0.4 : 0.4), (z0 + z1) / 2);
  obj.userData.floor = r.floor;
  (r.floor === 'loft' ? G.loft : G.ground).add(obj);
  labels.push(obj);
}

// selection overlay
const hiMat = new THREE.MeshBasicMaterial({ color: 0x9b2f2f, transparent: true, opacity: 0.32, depthWrite: false });
const hiGroup = new THREE.Group(); hiGroup.name = 'selection'; root.add(hiGroup);

function select(id) {
  wake(); RT.selected = id; hiGroup.clear();
  const info = document.getElementById('info');
  if (!id) { info.hidden = true; return; }
  const r = roomById[id];
  const parent = r.floor === 'loft' ? G.loft : G.ground;
  for (const [x0, x1, z0, z1] of r.rects) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, r.y + 0.03, (z0 + z1) / 2), hiMat);
    m.userData.follow = parent; hiGroup.add(m);
  }
  hiGroup.position.y = parent.position.y;
  const lvl = r.floor === 'loft' ? "Loft floor · +9'-4\"" : (r.y < 0 ? "Ground floor · −1'-6\" (sunken)" : "Ground floor · +0'-0\"");
  info.innerHTML = '';
  const close = document.createElement('button'); close.className = 'close'; close.type = 'button'; close.setAttribute('aria-label', 'Close room details'); close.textContent = '×';
  close.onclick = () => select(null);
  const lv = document.createElement('div'); lv.className = 'lvl'; lv.textContent = lvl;
  const h = document.createElement('h2'); h.textContent = r.name;
  const dm = document.createElement('div'); dm.className = 'dims'; dm.textContent = `${dimText(r)} clear · ≈${Math.round(r.rects.reduce((a, [x0, x1, z0, z1]) => a + (x1 - x0) * (z1 - z0), 0))} sf`;
  const dl = document.createElement('dl');
  const add = (k, v, sw) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd');
    if (sw != null) { const s = document.createElement('span'); s.className = 'sw'; s.style.background = '#' + sw.toString(16).padStart(6, '0'); dd.append(s); }
    dd.append(v); dl.append(dt, dd); };
  add('Ceiling', r.ceiling);
  r.finishes.forEach(f => add(f.label, f.value, f.sw));
  const note = document.createElement('div'); note.className = 'note'; note.textContent = r.note || '';
  info.append(close, lv, h, dm, dl); if (r.note) info.append(note);
  info.hidden = false;
}


MODES.select = select;

let _pickActFn = () => null;
let _useActFn = () => {};
export function bindRoomClickSelection(pickActFn, useActFn) {
  _pickActFn = pickActFn;
  _useActFn = useActFn;
}

const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', e => {
  if (WALK.on || TOUR.on || !downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 5) return;
  ptr.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  const a = _pickActFn(ptr.x, ptr.y, 400);
  if (a) { _useActFn(a); return; }
  ray.setFromCamera(ptr, camera);
  // P5: Fast floor-footprint broadphase check before testing full house hierarchy
  if (ROOM_FLOOR_LIST.length && ray.intersectObjects(ROOM_FLOOR_LIST, false).length === 0) {
    if (RT.selected) select(null);
    return;
  }
  const hits = ray.intersectObjects([G.ground, G.loft, G.mainRoof, G.wingRoof, G.site], true)
    .filter(h => h.object.visible && isShown(h.object) && h.object.material?.name !== 'glass');
  const hit = hits.find(h => h.object.userData.room);
  select(hit && hits[0].distance > hit.distance - 2.5 ? hit.object.userData.room : null);
});

export { labels, hiMat, hiGroup, select };
