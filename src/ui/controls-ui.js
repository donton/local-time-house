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
  day:   '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg> Day',
  night: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"/></svg> Night',
};

const SEASON_UI = {
  fall:   '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M223.45,40.07a8,8,0,0,0-7.52-7.52C139.8,28.08,78.82,51,52.82,94a87.09,87.09,0,0,0-12.76,49c.57,15.92,5.21,32,13.79,47.85l-19.51,19.5a8,8,0,0,0,11.32,11.32l19.5-19.51C81,210.73,97.09,215.37,113,215.94q1.67.06,3.33.06A86.93,86.93,0,0,0,162,203.18C205,177.18,227.93,116.21,223.45,40.07ZM153.75,189.5c-22.75,13.78-49.68,14-76.71.77l88.63-88.62a8,8,0,0,0-11.32-11.32L65.73,179c-13.19-27-13-54,.77-76.71,22.09-36.47,74.6-56.44,141.31-54.06C210.2,114.89,190.22,167.41,153.75,189.5Z"/></svg> Fall',
  winter: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M223.77,150.09a8,8,0,0,1-5.86,9.68l-24.64,6,6.46,24.11a8,8,0,0,1-5.66,9.8A8.25,8.25,0,0,1,192,200a8,8,0,0,1-7.72-5.93l-7.72-28.8L136,141.86v46.83l21.66,21.65a8,8,0,0,1-11.32,11.32L128,203.31l-18.34,18.35a8,8,0,0,1-11.32-11.32L120,188.69V141.86L79.45,165.27l-7.72,28.8A8,8,0,0,1,64,200a8.25,8.25,0,0,1-2.08-.27,8,8,0,0,1-5.66-9.8l6.46-24.11-24.64-6a8,8,0,0,1,3.82-15.54l29.45,7.23L112,128,71.36,104.54l-29.45,7.23A7.85,7.85,0,0,1,40,112a8,8,0,0,1-1.91-15.77l24.64-6L56.27,66.07a8,8,0,0,1,15.46-4.14l7.72,28.8L120,114.14V67.31L98.34,45.66a8,8,0,0,1,11.32-11.32L128,52.69l18.34-18.35a8,8,0,0,1,11.32,11.32L136,67.31v46.83l40.55-23.41,7.72-28.8a8,8,0,0,1,15.46,4.14l-6.46,24.11,24.64,6A8,8,0,0,1,216,112a7.85,7.85,0,0,1-1.91-.23l-29.45-7.23L144,128l40.64,23.46,29.45-7.23A8,8,0,0,1,223.77,150.09Z"/></svg> Winter',
  spring: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M247.63,47.89a8,8,0,0,0-7.52-7.52c-51.76-3-93.32,12.74-111.18,42.22-11.8,19.49-11.78,43.16-.16,65.74a71.34,71.34,0,0,0-14.17,27L98.33,159c7.82-16.33,7.52-33.35-1-47.49-13.2-21.79-43.67-33.47-81.5-31.25a8,8,0,0,0-7.52,7.52c-2.23,37.83,9.46,68.3,31.25,81.5A45.82,45.82,0,0,0,63.44,176,54.58,54.58,0,0,0,87,170.33l25,25V224a8,8,0,0,0,16,0V194.51a55.61,55.61,0,0,1,12.27-35,73.91,73.91,0,0,0,33.31,8.4,60.9,60.9,0,0,0,31.83-8.86C234.89,141.21,250.67,99.65,247.63,47.89ZM47.81,155.6C32.47,146.31,23.79,124.32,24,96c28.32-.24,50.31,8.47,59.6,23.81,4.85,8,5.64,17.33,2.46,26.94L61.65,122.34a8,8,0,0,0-11.31,11.31l24.41,24.41C65.14,161.24,55.82,160.45,47.81,155.6Zm149.31-10.22c-13.4,8.11-29.15,8.73-45.15,2l53.69-53.7a8,8,0,0,0-11.31-11.31L140.65,136c-6.76-16-6.15-31.76,2-45.15,13.94-23,47-35.82,89.33-34.83C232.94,98.34,220.14,131.44,197.12,145.38Z"/></svg> Spring',
  summer: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg> Summer',
};

const CHIP_FLOORS_UI = {
  ground: '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M40 96 L128 52 L216 96 L128 140 Z" opacity="0.28"/><path d="M40 164 L128 208 L216 164"/></svg>Floor 1',
  both:   '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M40 96 L128 52 L216 96 L128 140 Z"/><path d="M40 164 L128 208 L216 164"/></svg>2 Floors',
};

const CHIP_SHELL_UI = {
  roof:    '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M36 120 L128 44 L220 120"/><path d="M56 104 V204 a8 8 0 0 0 8 8 H192 a8 8 0 0 0 8 -8 V104"/></svg>Roof',
  up:      '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M56 88 H200 V204 a8 8 0 0 1 -8 8 H64 a8 8 0 0 1 -8 -8 Z"/></svg>Walls',
  cutaway: '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M36 120 L128 44 L220 120"/><path d="M56 104 V204 a8 8 0 0 0 8 8 H192 a8 8 0 0 0 8 -8 V104"/><path d="M56 140 H200"/><path d="M128 140 V212"/></svg>Cutaway',
};

const WX_SVG = {
  clear:      '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z"/></svg>',
  clearNight: '<svg viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M240,96a8,8,0,0,1-8,8H216v16a8,8,0,0,1-16,0V104H184a8,8,0,0,1,0-16h16V72a8,8,0,0,1,16,0V88h16A8,8,0,0,1,240,96ZM144,56h8v8a8,8,0,0,0,16,0V56h8a8,8,0,0,0,0-16h-8V32a8,8,0,0,0-16,0v8h-8a8,8,0,0,0,0,16Zm72.77,97a8,8,0,0,1,1.43,8A96,96,0,1,1,95.07,37.8a8,8,0,0,1,10.6,9.06A88.07,88.07,0,0,0,209.14,150.33,8,8,0,0,1,216.77,153Zm-19.39,14.88c-1.79.09-3.59.14-5.38.14A104.11,104.11,0,0,1,88,64c0-1.79,0-3.59.14-5.38A80,80,0,1,0,197.38,167.86Z"/></svg>',
  partly:     '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M56 124 a36 36 0 1 1 60 -36"/><path d="M88 36 V48"/><path d="M40 56 L48 64"/><path d="M24 104 H36"/><path d="M80 200 H188 a34 34 0 0 0 6 -67 a48 48 0 0 0 -92 -12 a34 34 0 0 0 -22 79 Z"/></svg>',
  overcast:   '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M72 192 H188 a36 36 0 0 0 8 -71 a52 52 0 0 0 -100 -14 a36 36 0 0 0 -24 85 Z"/></svg>',
  fog:        '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M72 160 H188 a32 32 0 0 0 6 -63 a46 46 0 0 0 -90 -12 a32 32 0 0 0 -32 75 Z"/><path d="M64 192 H192"/><path d="M84 220 H172"/></svg>',
  rain:       '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M72 160 H188 a32 32 0 0 0 6 -63 a46 46 0 0 0 -90 -12 a32 32 0 0 0 -32 75 Z"/><path d="M96 192 L84 216"/><path d="M132 192 L120 216"/><path d="M168 192 L156 216"/></svg>',
  snow:       '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M72 160 H188 a32 32 0 0 0 6 -63 a46 46 0 0 0 -90 -12 a32 32 0 0 0 -32 75 Z"/><path d="M88 196 h.01"/><path d="M128 212 h.01"/><path d="M168 196 h.01"/></svg>',
  storm:      '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M72 156 H188 a32 32 0 0 0 6 -63 a46 46 0 0 0 -90 -12 a32 32 0 0 0 -32 75 Z"/><path d="M136 156 L112 192 H144 L120 228"/></svg>',
  sync:       '<svg viewBox="0 0 256 256" fill="none" stroke="currentColor" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M204 128 a76 76 0 1 1 -22 -54"/><path d="M192 44 V80 H156"/></svg>',
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
document.getElementById('btn-night').addEventListener('click', () => { RT.liveTime = false; RT.liveSync = null; state.night = !state.night; if (!state.night && (state.sun < 9 || state.sun > 16.5)) state.sun = 14; applyState(); });
document.getElementById('btn-season').addEventListener('click', () => { RT.liveTime = false; RT.liveSync = null; const order = ['fall', 'winter', 'spring', 'summer']; state.season = order[(order.indexOf(state.season) + 1) % order.length]; applyState(); });
document.getElementById('explode').addEventListener('input', e => { state.explode = +e.target.value; applyState(); });
for (const id of ['suntime', 'walk-sun']) document.getElementById(id).addEventListener('input', e => { RT.liveTime = false; RT.liveSync = null; state.sun = +e.target.value; applyState(); });
document.getElementById('walk-night').addEventListener('click', () => { RT.liveTime = false; RT.liveSync = null; state.night = !state.night; if (!state.night && (state.sun < 9 || state.sun > 16.5)) state.sun = 14; applyState(); });

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

