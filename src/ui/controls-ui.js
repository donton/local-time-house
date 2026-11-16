// Desktop dock collapse, More popover, dirty-checked applyState(), and Space-bar pan.
import * as THREE from 'three';
import { HOME } from '../config/constants.js';
import { roomById } from '../config/rooms.js';
import { state, RT, MODES, WALK, wake, markShadows, localTimeAndes, ease } from '../core/state.js';
import { G } from '../house/site-and-floors.js';
import { renderer, camera, controls, homePos } from '../core/renderer.js';
import { applyNight, sunTimeLabel, applySun, applySceneTheme } from '../house/lighting.js';
import { applySeason } from '../landscape/outdoor-living.js';
import { updateWalls } from '../systems/cutaway.js';
import { labels, hiGroup, select } from '../systems/labels-selection.js';

// Panel collapse & More popover bootstrap
(function () {
  var panel = document.getElementById('panel'), btn = document.getElementById('panel-toggle');
  var moreBtn = document.getElementById('more-btn'), morePop = document.getElementById('more-pop');
  var saved = null;
  try { saved = localStorage.getItem('lth-panel'); } catch (e) {}
  function setMore(open) {
    if (!morePop || !moreBtn) return;
    morePop.hidden = !open;
    moreBtn.setAttribute('aria-expanded', String(open));
  }
  function set(open) {
    panel.classList.toggle('collapsed', !open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Hide controls' : 'Show controls');
    if (!open) setMore(false);
  }
  set(saved ? saved === 'open' : !window.matchMedia('(max-width: 640px)').matches);
  panel.querySelector('.titleblock').addEventListener('click', function () {
    var open = panel.classList.contains('collapsed');
    set(open);
    try { localStorage.setItem('lth-panel', open ? 'open' : 'closed'); } catch (e) {}
  });
  if (moreBtn && morePop) {
    moreBtn.addEventListener('click', function (e) { e.stopPropagation(); setMore(morePop.hidden); });
    morePop.addEventListener('click', function (e) { e.stopPropagation(); });
  }
  document.addEventListener('click', function (e) {
    if (morePop && !morePop.hidden && !e.target.closest('.more-wrap')) setMore(false);
  });
})();


const LIGHT_UI = {
  day:   '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.6"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1"/></svg> Day',
  night: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M12.8 10.2A5.2 5.2 0 0 1 5.8 3.2a5.4 5.4 0 1 0 7 7z"/></svg> Night',
};

const SEASON_UI = {
  fall:   '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13 3C8.5 3 4.5 6 4.5 10.5c0 .7.1 1.3.3 1.8L3 14M4.8 12.2c.5.2 1.1.3 1.7.3C11 12.5 13 8.5 13 3zM5 11.5L10.5 6"/></svg> Fall',
  winter: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 2v12M2.8 5l10.4 6M13.2 5L2.8 11"/></svg> Winter',
  spring: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14V7.5M8 10.5C8 7.5 10.5 5 13 5c0 3-2 5.5-5 5.5zM8 8.5C8 6 6 4 3.5 4c0 2.5 1.8 4.5 4.5 4.5z"/></svg> Spring',
  summer: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="2.6"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1"/></svg> Summer',
};

const CHIP_FLOORS_UI = {
  ground: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6l6-2.5L14 6l-6 2.5z" opacity="0.35"/><path d="M2 10.5L8 8l6 2.5L8 13z" fill="currentColor"/></svg>Floor 1',
  both:   '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 6l6-2.5L14 6l-6 2.5z" fill="currentColor"/><path d="M2 10.5L8 8l6 2.5L8 13z" fill="currentColor"/></svg>2 Floors',
};

const CHIP_SHELL_UI = {
  roof:    '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 7.5L8 3l6 4.5M3.5 6.5V13h9V6.5"/></svg>Roof',
  up:      '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5v8h10V5M3 5h10"/></svg>Walls',
  cutaway: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5v8h10V9L7 5z"/></svg>Cutaway',
};

const _svg = d => `<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const WX_SVG = {
  clear:      _svg('<circle cx="8" cy="8" r="2.6"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M3.8 3.8l1.1 1.1M11.1 11.1l1.1 1.1M12.2 3.8l-1.1 1.1M4.9 11.1l-1.1 1.1"/>'),
  clearNight: _svg('<path d="M12.5 10.2A5 5 0 0 1 5.8 3.5a5 5 0 1 0 6.7 6.7z"/>'),
  partly:     _svg('<path d="M5.2 7.8a2.3 2.3 0 1 1 3.6-2.4M6.5 2v1M2.5 5.5h1M3.7 3.2l.7.7"/><path d="M5.5 13h6a2.3 2.3 0 0 0 .3-4.6A3.2 3.2 0 0 0 5.6 9 2 2 0 0 0 5.5 13z"/>'),
  overcast:   _svg('<path d="M4.5 12.5h7.2a2.5 2.5 0 0 0 .3-5 3.6 3.6 0 0 0-7 .6A2.2 2.2 0 0 0 4.5 12.5z"/>'),
  fog:        _svg('<path d="M4.5 9.5h7.2a2.2 2.2 0 0 0 .2-4.4 3.2 3.2 0 0 0-6.2.5A2 2 0 0 0 4.5 9.5zM3 11.8h10M4.5 14h7"/>'),
  rain:       _svg('<path d="M4.5 10h7.2a2.3 2.3 0 0 0 .3-4.6 3.4 3.4 0 0 0-6.6.6A2 2 0 0 0 4.5 10zM5.5 12.2l-.8 1.8M8.5 12.2l-.8 1.8M11.5 12.2l-.8 1.8"/>'),
  snow:       _svg('<path d="M4.5 10h7.2a2.3 2.3 0 0 0 .3-4.6 3.4 3.4 0 0 0-6.6.6A2 2 0 0 0 4.5 10zM5.5 12.8h.01M8.5 13.6h.01M11.5 12.8h.01"/>'),
  storm:      _svg('<path d="M4.5 10h7.2a2.3 2.3 0 0 0 .3-4.6 3.4 3.4 0 0 0-6.6.6A2 2 0 0 0 4.5 10z"/><path d="M8.5 10l-1.5 2.5h2l-1.3 2.3"/>'),
  sync:       _svg('<path d="M13 8a5 5 0 1 1-1.4-3.5M13 2.5v2.6h-2.6"/>'),
};

let _lastShadowSig = '';
let _prevUI = {};

export function applyState() {
  wake();
  const showG = state.floors !== 'loft', showL = state.floors !== 'ground';
  G.ground.visible = showG; G.loft.visible = showL;
  G.mainRoof.visible = state.roof && showL;
  G.wingRoof.visible = state.roof && showG;
  const e = state.explode;
  G.loft.position.y = e * 9;
  G.wingRoof.position.y = e * 9;
  G.mainRoof.position.y = e * 20;
  document.getElementById('labels').style.display = state.labels ? '' : 'none';
  labels.forEach(l => { l.visible = state.labels && (l.userData.floor === 'loft' ? showL : showG); });
  if (RT.selected) {
    const r = roomById[RT.selected];
    if ((r.floor === 'loft' && !showL) || (r.floor === 'ground' && !showG)) select(null);
    else hiGroup.position.y = (r.floor === 'loft' ? G.loft : G.ground).position.y;
  }

  const shellKey = state.roof ? 'roof' : state.walls;
  if (_prevUI.floors !== state.floors) {
    ['ground', 'both'].forEach(k => document.getElementById('fl-' + k).setAttribute('aria-pressed', String(state.floors === k)));
    const cf = document.getElementById('chip-floors');
    if (cf) cf.innerHTML = state.floors === 'ground' ? CHIP_FLOORS_UI.ground : CHIP_FLOORS_UI.both;
  }
  if (_prevUI.walls !== state.walls || _prevUI.roof !== state.roof) {
    document.getElementById('wl-roof').setAttribute('aria-pressed', String(state.walls === 'up' && state.roof));
    document.getElementById('wl-up').setAttribute('aria-pressed', String(state.walls === 'up' && !state.roof));
    document.getElementById('wl-cutaway').setAttribute('aria-pressed', String(state.walls === 'cutaway'));
    const csh = document.getElementById('chip-shell');
    if (csh) csh.innerHTML = CHIP_SHELL_UI[shellKey] || CHIP_SHELL_UI.cutaway;
  }
  if (_prevUI.labels !== state.labels) {
    document.getElementById('tg-labels').checked = state.labels;
  }
  if (_prevUI.night !== state.night) {
    const html = state.night ? LIGHT_UI.night : LIGHT_UI.day;
    for (const id of ['btn-night', 'walk-night', 'chip-night']) {
      const el = document.getElementById(id);
      if (el) { el.innerHTML = html; el.setAttribute('aria-pressed', String(state.night)); }
    }
    for (const id of ['suntime', 'walk-sun']) {
      const el = document.getElementById(id);
      if (el) el.disabled = state.night;
    }
  }
  if (state.night !== RT.nightOn) applyNight(state.night);

  if (RT.siteReady && state.season !== RT.seasonOn) {
    RT.seasonOn = state.season;
    applySeason(state.season);
  }
  if (_prevUI.season !== state.season) {
    const sHtml = SEASON_UI[state.season] || SEASON_UI.fall;
    const bs = document.getElementById('btn-season');
    if (bs) bs.innerHTML = sHtml;
    const cse = document.getElementById('chip-season');
    if (cse) cse.innerHTML = sHtml;
  }
  if (_prevUI.explode !== e) {
    document.getElementById('explode').value = String(e);
    document.getElementById('explode-out').textContent = Math.round(e * 100) + '%';
  }

  applySun();
  applySceneTheme();
  if (_prevUI.sun !== state.sun || _prevUI.night !== state.night) {
    const sunLbl = sunTimeLabel(state.sun);
    for (const id of ['suntime', 'walk-sun']) { const el = document.getElementById(id); if (el) el.value = String(state.sun); }
    for (const id of ['suntime-out', 'walk-sun-out']) { const el = document.getElementById(id); if (el) el.textContent = sunLbl; }
    const wlb = document.getElementById('walk-light-btn');
    if (wlb) wlb.innerHTML = state.night ? `${WX_SVG.clearNight} Night` : `${WX_SVG.clear} ${sunLbl}`;
  }

  // P7: Only run updateWalls() when shell, floor, explode, or night state changed (skip during pure sun slider drag)
  if (_prevUI.walls !== state.walls || _prevUI.roof !== state.roof || _prevUI.floors !== state.floors || _prevUI.explode !== e || _prevUI.night !== state.night) {
    updateWalls();
  }

  _prevUI = {
    floors: state.floors,
    walls: state.walls,
    roof: state.roof,
    labels: state.labels,
    night: state.night,
    season: state.season,
    explode: e,
    sun: state.sun,
  };

  const lp = document.getElementById('live-pill');
  const mlp = document.getElementById('mlive-pill');
  if (lp || mlp) {
    const w = RT.andesWx;
    const wxHtml = w && typeof w === 'object' ? `<span class="lp-sep">·</span>${WX_SVG[w.key] || ''}<span>${w.temp}°</span>` : '';
    const wxTip = w && typeof w === 'object' ? ` · ${w.temp}°F ${w.label}` : '';
    const tLbl = localTimeAndes().label;
    if (lp) {
      lp.classList.toggle('live', !!RT.liveTime);
      lp.innerHTML = RT.liveTime ? `<span>Live</span><span class="lp-sep">·</span><span>${tLbl}</span>${wxHtml}` : `${WX_SVG.sync}<span>Reset to live</span>`;
      lp.title = RT.liveTime ? `Synced to real-time Andes, NY${wxTip}` : 'Click to reset Season, Day & Sun to real-time Andes, NY';
    }
    if (mlp) {
      mlp.classList.toggle('live', !!RT.liveTime);
      mlp.innerHTML = RT.liveTime ? `<span>${tLbl}</span>${wxHtml}` : `${WX_SVG.sync}<span>Reset to live</span>`;
      mlp.title = RT.liveTime ? `Synced to real-time Andes, NY${wxTip}` : 'Tap to reset Season, Day & Sun to real-time Andes, NY';
    }
  }
  const shadowSig = `${state.floors}|${state.walls}|${state.roof}|${e}|${state.sun}|${state.season}|${state.night}`;
  if (shadowSig !== _lastShadowSig) { _lastShadowSig = shadowSig; markShadows(); }
}

MODES.applyState = applyState;

['ground', 'both'].forEach(k => document.getElementById('fl-' + k).addEventListener('click', () => { state.floors = k; applyState(); }));
document.getElementById('wl-roof').addEventListener('click', () => { state.walls = 'up'; state.roof = true; applyState(); });
['up', 'cutaway'].forEach(k => document.getElementById('wl-' + k).addEventListener('click', () => { state.walls = k; state.roof = false; applyState(); }));
document.getElementById('tg-labels').addEventListener('change', e => { state.labels = e.target.checked; applyState(); });
document.getElementById('btn-night').addEventListener('click', () => { RT.liveTime = false; RT.liveSync = null; state.night = !state.night; applyState(); });
document.getElementById('btn-season').addEventListener('click', () => { RT.liveTime = false; RT.liveSync = null; const order = ['fall', 'winter', 'spring', 'summer']; state.season = order[(order.indexOf(state.season) + 1) % order.length]; applyState(); });
document.getElementById('explode').addEventListener('input', e => { state.explode = +e.target.value; applyState(); });
for (const id of ['suntime', 'walk-sun']) document.getElementById(id).addEventListener('input', e => { RT.liveTime = false; RT.liveSync = null; state.sun = +e.target.value; applyState(); });
document.getElementById('walk-night').addEventListener('click', () => { RT.liveTime = false; RT.liveSync = null; state.night = !state.night; applyState(); });

function startLiveSync() {
  if (RT.liveTime && !RT.liveSync) return;
  RT.liveTime = true;
  const now = localTimeAndes();
  state.season = now.season;
  const dawn = Math.max(5.5, now.sunrise - 0.15);
  const dusk = Math.min(20.0, now.sunset + 0.15);
  const segs = [];
  if (state.night && now.night) {
    state.sun = now.sun; state.night = true; RT.liveSync = null; applyState(); return;
  }
  if (!state.night && !now.night) {
    if (Math.abs(state.sun - now.sun) < 0.05) {
      state.sun = now.sun; RT.liveSync = null; applyState(); return;
    }
    if (state.sun < now.sun) {
      const span = now.sun - state.sun;
      segs.push({ night: false, from: state.sun, to: now.sun, dur: Math.max(0.55, Math.min(1.4, 0.35 + span * 0.12)) });
    } else {
      if (state.sun < dusk) {
        segs.push({ night: false, from: state.sun, to: dusk, dur: Math.max(0.3, (dusk - state.sun) * 0.11) });
      }
      segs.push({ night: true, from: dusk, to: dusk, dur: 0.35 });
      segs.push({ night: false, from: dawn, to: now.sun, dur: Math.max(0.45, Math.max(0.1, now.sun - dawn) * 0.11) });
    }
  } else if (!state.night && now.night) {
    if (state.sun < dusk) {
      segs.push({ night: false, from: state.sun, to: dusk, dur: Math.max(0.45, (dusk - state.sun) * 0.12) });
    }
    segs.push({ night: true, from: now.sun, to: now.sun, dur: 0.05 });
  } else {
    segs.push({ night: true, from: dawn, to: dawn, dur: 0.2 });
    segs.push({ night: false, from: dawn, to: now.sun, dur: Math.max(0.55, Math.max(0.1, now.sun - dawn) * 0.12) });
  }
  RT.liveSync = { segs, idx: 0, t: 0 };
  applyState();
  wake(10);
}

export function liveSyncStep(dt) {
  const sync = RT.liveSync;
  if (!sync) return;
  const seg = sync.segs[sync.idx];
  if (!seg) { RT.liveSync = null; return; }
  sync.t += dt;
  const k = Math.min(1, sync.t / seg.dur);
  state.night = seg.night;
  state.sun = seg.from + (seg.to - seg.from) * ease(k);
  applyState();
  wake(4);
  if (k >= 1) {
    sync.idx++;
    sync.t = 0;
    if (sync.idx >= sync.segs.length) {
      const now = localTimeAndes();
      state.sun = now.sun; state.night = now.night; state.season = now.season;
      RT.liveSync = null;
      applyState();
    }
  }
}

for (const id of ['live-pill', 'mlive-pill']) {
  document.getElementById(id)?.addEventListener('click', e => {
    e.stopPropagation();
    startLiveSync();
  });
}
setInterval(() => {
  if (!RT.liveTime || RT.liveSync || document.body.classList.contains('timeline') || document.body.classList.contains('build') || document.body.classList.contains('touring')) return;
  const now = localTimeAndes();
  state.sun = now.sun; state.night = now.night; state.season = now.season;
  applyState();
}, 60000);
document.getElementById('btn-reset').addEventListener('click', () => { camera.position.copy(homePos()); controls.target.copy(HOME.target); controls.update(); });

// Wire Timeline & Build mode buttons through MODES (supporting dynamic import() lazy loading)
document.getElementById('btn-timeline').addEventListener('click', () => MODES.enterTimeline());
document.getElementById('btn-build').addEventListener('click', () => MODES.enterBuild());

{
  const el = renderer.domElement;
  let overCanvas = false, spacePan = false;
  el.addEventListener('pointerenter', () => { overCanvas = true; });
  el.addEventListener('pointerleave', () => { overCanvas = false; });
  const setPan = on => {
    spacePan = on;
    controls.mouseButtons.LEFT = on ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    el.style.cursor = on ? 'grab' : '';
  };
  addEventListener('keydown', e => {
    if (e.code !== 'Space' || WALK.on || !overCanvas) return;
    if (e.target.closest && e.target.closest('input, textarea, select, [contenteditable]')) return;
    e.preventDefault();
    if (!spacePan) setPan(true);
  });
  addEventListener('keyup', e => { if (e.code === 'Space' && spacePan) setPan(false); });
  addEventListener('blur', () => { if (spacePan) setPan(false); });
  el.addEventListener('pointerdown', () => { if (spacePan) el.style.cursor = 'grabbing'; });
  el.addEventListener('pointerup', () => { if (spacePan) el.style.cursor = 'grab'; });
}

