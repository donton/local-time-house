// Double-lobed brick patio & Corten fire pit under white birches, West Deck lounge, gas grill, and applySeason.
import * as THREE from 'three';
import { LV } from '../config/constants.js';
import { RT, smoke, skyFx, tweenTo, act, markShadows } from '../core/state.js';
import { MATS, M, exteriorLightsOnly } from '../core/materials.js';
import { applySceneTheme, registerOutdoorNightHook } from '../house/lighting.js';
import { LAND, SEASONS, PATIO_AT, PLANTS, decid, canopies, twigs, cones, mtx, sc, ps, snowParts, groundMat, clearMat } from './terrain-and-trees.js';

/* =====================================================================
   BRICK PATIO & FIRE PIT HEARTH — Double-Lobed Terrace under White Birches
   Lobe 1: Green metal dining set (table, bench, two chairs, table lantern).
   Lobe 2: Circular Corten fire pit bowl with 4 neutral slatted timber lounge chairs
   (Donald Judd / Enzo Mari inspired, as in reference image) circling the fire.
   ===================================================================== */
const PATIO = (() => {
  const cx = PATIO_AT[0], cz = PATIO_AT[1], rot = 0.55, Wp = 23, Dp = 12;
  const grp = new THREE.Group(); grp.position.set(cx, LV.GRADE, cz); grp.rotation.y = rot; LAND.add(grp);

  // Organic double-lobed outline (Dining Lobe 1 centered at (-4.2, -0.3), Fire Pit Lobe 2 at (5.2, 0.3))
  const wob = a => 1 + 0.08 * Math.sin(3 * a + 1.1) + 0.04 * Math.sin(5 * a + 2.3);
  const inPatio = (x, z, k = 1) => {
    const dx1 = x - (-4.2), dz1 = z - (-0.3), a1 = Math.atan2(dz1, dx1), w1 = wob(a1) * k;
    if ((dx1 / (6.8 * w1)) ** 2 + (dz1 / (5.6 * w1)) ** 2 < 1) return true;
    const dx2 = x - 5.2, dz2 = z - 0.3, a2 = Math.atan2(dz2, dx2), w2 = wob(a2) * k;
    if ((dx2 / (6.2 * w2)) ** 2 + (dz2 / (5.6 * w2)) ** 2 < 1) return true;
    return false;
  };

  // Whole blue-gray bricks in running bond (8" × 4" with ⅜" joints)
  const BL = 8 / 12, BW = 4 / 12, J = 0.375 / 12, list = [];
  for (let r = -24; r <= 24; r++) {
    const z = r * (BW + J), off = (r & 1) ? (BL + J) / 2 : 0;
    for (let c = -28; c <= 28; c++) {
      const x = c * (BL + J) + off;
      if (inPatio(x, z)) list.push([x, z]);
    }
  }

  const brickMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), mortarMat = new THREE.MeshStandardMaterial({ color: 0xC9C6BF, roughness: 1 });
  exteriorLightsOnly(brickMat); exteriorLightsOnly(mortarMat);
  const bricks = new THREE.InstancedMesh(new THREE.BoxGeometry(BL, 0.18, BW), brickMat, list.length);
  const bed = new THREE.InstancedMesh(new THREE.BoxGeometry(BL + J, 0.14, BW + J), mortarMat, list.length);
  const o3 = new THREE.Object3D(), col = new THREE.Color();
  list.forEach(([x, z], i) => {
    o3.position.set(x, 0.05, z); o3.updateMatrix(); bricks.setMatrixAt(i, o3.matrix);
    o3.position.set(x, 0.0, z); o3.updateMatrix(); bed.setMatrixAt(i, o3.matrix);
    const v = (88 + Math.random() * 30) / 255; bricks.setColorAt(i, col.setRGB(v - 0.03, v, v + 0.05, THREE.SRGBColorSpace));
  });
  bricks.receiveShadow = bed.receiveShadow = true; grp.add(bed, bricks);

  // 1. DINING TERRACE (Lobe 2 at x = 5.2, z = 0.3)
  const diningGrp = new THREE.Group();
  diningGrp.position.set(5.2, 0, 0.3);
  grp.add(diningGrp);

  const green = new THREE.MeshStandardMaterial({ color: 0x4C5B36, roughness: 0.55, metalness: 0.35 }); exteriorLightsOnly(green);
  const part = (w, h, d, x, y, z, ry = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), green); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; diningGrp.add(m); return m; };
  const slats = (x0, x1, z0, z1, y, n, alongX = true) => {
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      if (alongX) part(x1 - x0, 0.05, (z1 - z0) / n * 0.7, (x0 + x1) / 2, y, z0 + (z1 - z0) * t);
      else part((x1 - x0) / n * 0.7, 0.05, z1 - z0, x0 + (x1 - x0) * t, y, (z0 + z1) / 2);
    }
  };
  // table 5'-3" × 2'-11", 2'-5" high + warm glass-and-steel table lantern
  slats(-2.65, 2.65, -1.45, 1.45, 2.38, 12);
  for (const [x, z] of [[-2.45, -1.25], [2.45, -1.25], [-2.45, 1.25], [2.45, 1.25]]) part(0.07, 2.36, 0.07, x, 1.18, z);
  part(5.0, 0.06, 0.07, 0, 2.28, -1.25); part(5.0, 0.06, 0.07, 0, 2.28, 1.25);
  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffe4b5, emissive: 0xffa838, emissiveIntensity: 0, roughness: 0.25 });
  const lanternBase = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.08, 8), green); lanternBase.position.set(0.35, 2.44, -0.12); diningGrp.add(lanternBase);
  const lanternGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 8), lanternMat); lanternGlass.position.set(0.35, 2.66, -0.12); diningGrp.add(lanternGlass);
  const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.21, 0.12, 8), green); lanternCap.position.set(0.35, 2.90, -0.12); diningGrp.add(lanternCap);
  const lanternHalo = new THREE.Mesh(new THREE.CircleGeometry(1.35, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb84d, transparent: true, opacity: 0.28, depthWrite: false }));
  lanternHalo.position.set(0.35, 2.415, -0.12); lanternHalo.visible = false; diningGrp.add(lanternHalo);
  // bench with back, north side
  slats(-2.6, 2.6, -3.35, -2.25, 1.5, 6); for (const x of [-2.4, 2.4]) { part(0.07, 1.5, 0.07, x, 0.75, -2.35); part(0.07, 2.9, 0.07, x, 1.45, -3.3); part(0.07, 0.05, 1.1, x, 2.15, -2.8); }
  for (let i = 0; i < 5; i++) part(5.2, 0.16, 0.04, 0, 1.75 + i * 0.25, -3.33);
  // two chairs, south side
  for (const x of [-1.25, 1.25]) {
    slats(x - 0.9, x + 0.9, 2.15, 3.55, 1.5, 6);
    for (const [dx, dz] of [[-0.82, 2.2], [0.82, 2.2], [-0.82, 3.5], [0.82, 3.5]]) part(0.07, 1.5, 0.07, x + dx, 0.75, dz);
    for (let i = 0; i < 4; i++) part(1.8, 0.14, 0.04, x, 1.8 + i * 0.22, 3.55);
    for (const dx of [-0.85, 0.85]) { part(0.07, 1.3, 0.07, x + dx, 2.1, 3.55); part(0.07, 0.05, 1.3, x + dx, 2.15, 2.9); }
  }

  // 2. FIRE PIT HEARTH (Lobe 1 centered at x = -4.2, z = -0.3)
  const firepit = new THREE.Group();
  firepit.position.set(-4.2, 0, -0.3);
  grp.add(firepit);

  const cortenMat = new THREE.MeshStandardMaterial({ color: 0x764B35, roughness: 0.88, metalness: 0.24 });
  const lavaMat = new THREE.MeshStandardMaterial({ color: 0x242220, roughness: 0.96 });
  const logMat = new THREE.MeshStandardMaterial({ color: 0x8C7152, roughness: 0.85 });
  const coalMat = new THREE.MeshStandardMaterial({ color: 0x3b1c10, emissive: 0xff4808, emissiveIntensity: 2.4, roughness: 0.9 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa2b, transparent: true, opacity: 0.88 });
  const innerFlame = new THREE.MeshBasicMaterial({ color: 0xff5508, transparent: true, opacity: 0.82 });
  const chairWood = new THREE.MeshStandardMaterial({ color: 0xD2BA96, roughness: 0.78 }); // natural neutral wood as in reference
  for (const m of [cortenMat, lavaMat, logMat, chairWood]) exteriorLightsOnly(m);

  // Corten steel circular fire pit bowl (approx. 34" diameter, 14" high)
  const bowlBody = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.25, 0.88, 24), cortenMat);
  bowlBody.position.y = 0.44; bowlBody.castShadow = true; bowlBody.receiveShadow = true; firepit.add(bowlBody);
  const bowlRim = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.055, 8, 24).rotateX(Math.PI / 2), cortenMat);
  bowlRim.position.y = 0.88; bowlRim.castShadow = true; firepit.add(bowlRim);

  // Charcoal lava rock bed inside bowl
  const lavaBed = new THREE.Mesh(new THREE.CylinderGeometry(1.36, 1.36, 0.14, 20), lavaMat);
  lavaBed.position.y = 0.76; lavaBed.receiveShadow = true; firepit.add(lavaBed);

  // Glowing coals
  const coals = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.05, 0.08, 16), coalMat);
  coals.position.y = 0.82; firepit.add(coals);

  // Criss-crossed split firewood logs
  const logs = new THREE.Group();
  firepit.add(logs);
  const logAngles = [0.2, 1.4, 2.5, 3.8, 5.0];
  logAngles.forEach((ang, idx) => {
    const lg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.085, 1.40, 7), logMat);
    lg.position.set(Math.cos(ang) * 0.22, 0.92 + idx * 0.04, Math.sin(ang) * 0.22);
    lg.rotation.z = Math.cos(ang) * 0.38 + 0.1;
    lg.rotation.x = Math.sin(ang) * 0.38;
    lg.rotation.y = ang + 0.4;
    lg.castShadow = true; logs.add(lg);
  });

  // Animated flickering flame cones
  const flames = new THREE.Group();
  firepit.add(flames);
  for (let i = 0; i < 5; i++) {
    const fa = i * (Math.PI * 2 / 5);
    const flOuter = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.95, 5).translate(0, 0.47, 0), flameMat);
    flOuter.position.set(Math.cos(fa) * 0.32, 0.88, Math.sin(fa) * 0.32);
    flOuter.rotation.y = fa; flames.add(flOuter);
    const flInner = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.70, 5).translate(0, 0.35, 0), innerFlame);
    flInner.position.set(Math.cos(fa) * 0.20, 0.88, Math.sin(fa) * 0.20);
    flInner.rotation.y = fa + 0.5; flames.add(flInner);
  }
  const centerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.20, 6).translate(0, 0.60, 0), flameMat);
  centerFlame.position.set(0, 0.88, 0); flames.add(centerFlame);

  // Warm glowing firelight
  const patioFireLight = new THREE.PointLight(0xff7a24, 0, 16, 2);
  patioFireLight.position.set(-4.2, 1.6, -0.3);
  grp.add(patioFireLight);

  // Rising smoke wisps
  const pSmoke = [];
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8d4ce, transparent: true, opacity: 0, depthWrite: false }));
    sp.scale.setScalar(0.48); sp.visible = false;
    sp.userData = { t: i / 4, origin: [cx - 4.2 * Math.cos(rot) - 0.3 * Math.sin(rot), LV.GRADE + 1.8, cz + 4.2 * Math.sin(rot) - 0.3 * Math.cos(rot)], rise: 6.5, drift: 0.9, s0: 0.4, s1: 1.8 };
    LAND.add(sp); smoke.push(sp); pSmoke.push(sp);
  }

  let fireOn = false;
  let firepitAct = null;
  const setPatioFire = on => {
    fireOn = !!on;
    if (firepitAct) firepitAct.on = fireOn;
    coals.material.emissiveIntensity = fireOn ? 2.4 : 0;
    flames.visible = fireOn;
    patioFireLight.visible = true;
    patioFireLight.intensity = fireOn ? 5.2 : 0;
    pSmoke.forEach(sp => { sp.visible = fireOn; });
  };
  const getPatioFire = () => fireOn;
  setPatioFire(false);

  firepitAct = act(firepit, {
    kind: 'firepit',
    on: false,
    label: () => fireOn ? 'Extinguish patio fire pit' : 'Light patio fire pit',
    run: d => setPatioFire(d.on)
  });

  // 3. FOUR NEUTRAL WOOD CHAIRS CIRCLING THE FIRE PIT (Reference design from image)
  // Modeled as minimalist low slatted timber plank lounge chairs (Donald Judd / Enzo Mari style)
  const buildWoodChair = (cxPos, czPos, rotY) => {
    const chair = new THREE.Group();
    chair.position.set(cxPos, 0, czPos);
    chair.rotation.y = rotY;
    grp.add(chair);

    const wb = (w, h, d, x, y, z, rx = 0) => {
      const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), chairWood);
      o.position.set(x, y, z);
      if (rx) o.rotation.x = rx;
      o.castShadow = true; o.receiveShadow = true;
      chair.add(o);
      return o;
    };

    // Sturdy wooden slab sides (left & right at sx = ±1.0)
    for (const sx of [-1.0, 1.0]) {
      // Ground runner
      wb(0.14, 0.16, 2.30, sx, 0.08, -0.05);
      // Front vertical riser block
      wb(0.14, 0.95, 0.18, sx, 0.48, 0.85);
      // Rear reclined backrest slab support
      wb(0.14, 1.48, 0.18, sx, 0.96, -0.72, -0.32);
    }
    // Front and rear lower cross braces
    wb(1.98, 0.12, 0.14, 0, 0.22, 0.85);
    wb(1.98, 0.12, 0.14, 0, 0.22, -0.72);

    // 4 thick horizontal seat planks sloping back
    for (let i = 0; i < 4; i++) {
      const zPos = 0.80 - i * 0.38;
      const yPos = 1.04 - i * 0.07;
      wb(1.98, 0.085, 0.32, 0, yPos, zPos, 0.18);
    }

    // 4 thick horizontal backrest planks reclining back
    for (let i = 0; i < 4; i++) {
      const yPos = 0.92 + i * 0.35;
      const zPos = -0.46 - i * 0.11;
      wb(1.98, 0.30, 0.085, 0, yPos, zPos, -0.32);
    }
  };

  // 4 chairs placed in a welcoming ring at radius 3.3 ft facing the fire bowl
  const chairAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];
  chairAngles.forEach(a => {
    const cxPos = -4.2 + Math.cos(a) * 3.3;
    const czPos = -0.3 + Math.sin(a) * 3.3;
    const rotFacing = Math.atan2(-4.2 - cxPos, -0.3 - czPos);
    buildWoodChair(cxPos, czPos, rotFacing);
  });

  // 4. BIRCHES & SURROUNDING PLANTING
  const bark = new THREE.MeshStandardMaterial({ color: 0xEDEBE4, roughness: 0.8 }), leaf = new THREE.MeshStandardMaterial({ color: 0xE0C04A, roughness: 1, flatShading: true });
  const allium = new THREE.MeshStandardMaterial({ color: 0x8E6FC9, roughness: 0.8 }), stem = new THREE.MeshStandardMaterial({ color: 0x5E7A3E, roughness: 1 });
  for (const m of [bark, leaf, allium, stem]) exteriorLightsOnly(m);
  const crowns = [];
  // 2 asymmetric birch clumps along the woods-facing edge of the terrace
  for (const [bx, bz, trunks, hBase, crScale, crY] of [[-9.6, -5.6, 3, 22, 6.8, 21], [-11.4, 3.6, 2, 18, 5.2, 17.5]]) {
    for (let k = 0; k < trunks; k++) {
      const lean = (k - (trunks - 1) / 2) * 0.13, h = hBase + k * 2.8;
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.28, h, 7).translate(0, h / 2, 0), bark);
      t.position.set(bx + (k - 0.5) * 0.55, 0, bz + (k % 2) * 0.45); t.rotation.z = lean; t.castShadow = true; grp.add(t);
    }
    const cr = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), leaf); cr.position.set(bx, crY, bz); cr.scale.set(crScale, crScale * 0.85, crScale); cr.castShadow = true; grp.add(cr); crowns.push(cr);
  }
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 95; i++) {
    const a = rnd() * Math.PI * 2, rx = (Wp / 2 + 0.8 + rnd() * 2.8) * Math.cos(a), rz = (Dp / 2 + 0.8 + rnd() * 2.8) * Math.sin(a);
    if (rz > Dp / 2 && Math.abs(rx) < 2.5) continue; // keep entrance open
    if (inPatio(rx, rz, 1.10)) continue;            // never on the paving
    if (rnd() < 0.55) {
      const h = 2.2 + rnd() * 1.4;
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, h, 4).translate(0, h / 2, 0), stem); st.position.set(rx, 0, rz); grp.add(st);
      const bl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.28, 1), allium); bl.position.set(rx, h, rz); grp.add(bl);
    } else {
      const gm = new THREE.Mesh(PLANTS.grassGeo, PLANTS.grassMat); gm.position.set(rx, 0, rz); gm.rotation.y = rnd() * 6.28; const gs = 0.95 + rnd() * 0.35; gm.scale.set(gs, gs * (0.85 + rnd() * 0.35), gs); grp.add(gm);
    }
  }

  return { grp, crowns, leaf, brickMat, mortarMat, lanternMat, lanternHalo, firepit, logs, flames, patioFireLight, setPatioFire, getPatioFire };
})();

/* =====================================================================
   WEST DECK — HAY Palissade Lounge & Sunset Viewing
   Two mid-tone Nordic slate-blue Palissade-style low lounge chairs with channeled pads,
   a matching slate-blue slatted low coffee table facing the woods on the
   long edge of the patio, equipped with a bowl of strawberries, wine glasses,
   insulated canteen, and candle lantern, plus a single architectural planter
   and the stainless grill centered and rotated on the north edge of the patio.
   ===================================================================== */
const WEST_DECK = (() => {
  const grp = new THREE.Group();
  grp.name = 'westDeckLounge';
  grp.position.set(0, -0.167, 0);
  LAND.add(grp);

  // Balanced mid-tone Scandinavian slate blue HAY Palissade palette & outdoor materials
  const pbMetal = new THREE.MeshStandardMaterial({ color: 0x4A7596, roughness: 0.44, metalness: 0.22 });
  const pbCushion = new THREE.MeshStandardMaterial({ color: 0x3C6584, roughness: 0.94 });
  const pbStitch = new THREE.MeshStandardMaterial({ color: 0x2C4B64, roughness: 0.95 });
  const potCharcoal = new THREE.MeshStandardMaterial({ color: 0x2A2928, roughness: 0.92 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x2B221B, roughness: 0.98 });
  const fernLeaf = new THREE.MeshStandardMaterial({ color: 0x486938, roughness: 0.85, flatShading: true });
  const grassMat = new THREE.MeshStandardMaterial({ color: 0x657E44, roughness: 0.9, flatShading: true });

  // Table accessories matching user reference image
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xEDEBE6, roughness: 0.35 });
  const strawberryMat = new THREE.MeshStandardMaterial({ color: 0xB02525, roughness: 0.65 });
  const berryLeafMat = new THREE.MeshStandardMaterial({ color: 0x446B2C, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xEDF4F8, roughness: 0.12, metalness: 0.08, transparent: true, opacity: 0.52 });
  const roseWineMat = new THREE.MeshStandardMaterial({ color: 0xD86874, roughness: 0.25, transparent: true, opacity: 0.82 });
  const canteenBody = new THREE.MeshStandardMaterial({ color: 0x384D3A, roughness: 0.42, metalness: 0.28 });
  const canteenSteel = new THREE.MeshStandardMaterial({ color: 0xD2D6DA, roughness: 0.28, metalness: 0.85 });
  const darkSteel = new THREE.MeshStandardMaterial({ color: 0x222325, roughness: 0.55, metalness: 0.45 });

  const lanternMat = new THREE.MeshStandardMaterial({ color: 0xFFE0A0, emissive: 0xFF9830, emissiveIntensity: 0, roughness: 0.3 });
  const lanternHalo = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xFFA038, transparent: true, opacity: 0.32, depthWrite: false }));
  lanternHalo.position.set(-4.5, 0.005, 9.5); lanternHalo.visible = false; grp.add(lanternHalo);

  for (const m of [pbMetal, pbCushion, pbStitch, potCharcoal, soilMat, fernLeaf, grassMat, ceramicMat, strawberryMat, berryLeafMat, glassMat, roseWineMat, canteenBody, canteenSteel, darkSteel]) {
    exteriorLightsOnly(m);
  }

  const b = (w, h, d, x, y, z, m, parent = grp) => {
    const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    o.position.set(x, y, z);
    o.castShadow = true; o.receiveShadow = true;
    parent.add(o);
    return o;
  };

  // 1. HAY Palissade Low Lounge Chair in Dark Blue
  // Modeled with tubular sled side frames, angled seat slats & reclining backrest slats, and channeled cushion pads.
  const buildPalissadeChair = (cx, cz, rotY) => {
    const chair = new THREE.Group();
    chair.position.set(cx, 0, cz);
    chair.rotation.y = rotY;
    grp.add(chair);

    const cb = (w, h, d, x, y, z, m) => b(w, h, d, x, y, z, m, chair);

    // Side sled legs and armrests (left & right at sx = ±1.04)
    for (const sx of [-1.04, 1.04]) {
      // Bottom sled runner on deck
      cb(0.065, 0.065, 1.48, sx, 0.04, 0.0, pbMetal);
      // Front vertical upright leg
      cb(0.065, 1.34, 0.065, sx, 0.70, 0.65, pbMetal);
      // Rear upright leg
      cb(0.065, 1.38, 0.065, sx, 0.72, -0.65, pbMetal);
      // Sled armrest connecting rear upright to front upright
      cb(0.075, 0.065, 1.30, sx, 1.40, 0.0, pbMetal);
    }
    // Cross stretcher tubes connecting left and right sides
    cb(2.02, 0.065, 0.065, 0, 1.10, 0.65, pbMetal);
    cb(2.02, 0.065, 0.065, 0, 0.85, -0.55, pbMetal);

    // Contoured slatted steel seat (hinged at y = 0.85, z = -0.55, tilting up toward front)
    const seatGrp = new THREE.Group();
    seatGrp.position.set(0, 0.85, -0.55);
    seatGrp.rotation.x = 0.245; // ~14 deg slope
    chair.add(seatGrp);

    for (let i = 0; i < 8; i++) {
      const sx = -0.84 + i * 0.24;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.035, 1.24), pbMetal);
      slat.position.set(sx, 0, 0.62);
      slat.castShadow = true; slat.receiveShadow = true;
      seatGrp.add(slat);
    }
    // Front rounded bullnose edge
    const bullnose = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.96, 12).rotateZ(Math.PI / 2), pbMetal);
    bullnose.position.set(0, 0, 1.24);
    bullnose.castShadow = true;
    seatGrp.add(bullnose);

    // Channeled seat pad in dark blue fabric
    const seatPad = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.045, 1.18), pbCushion);
    seatPad.position.set(0, 0.035, 0.61);
    seatPad.castShadow = true; seatPad.receiveShadow = true;
    seatGrp.add(seatPad);
    for (let c = 1; c <= 3; c++) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.012, 0.025), pbStitch);
      groove.position.set(0, 0.055, c * 0.30);
      seatGrp.add(groove);
    }

    // Contoured slatted steel backrest (hinged at y = 0.85, z = -0.55, reclining back)
    const backGrp = new THREE.Group();
    backGrp.position.set(0, 0.85, -0.55);
    backGrp.rotation.x = -0.367; // ~21 deg recline
    chair.add(backGrp);

    for (let i = 0; i < 8; i++) {
      const sx = -0.84 + i * 0.24;
      const slat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.38, 0.035), pbMetal);
      slat.position.set(sx, 0.69, 0);
      slat.castShadow = true; slat.receiveShadow = true;
      backGrp.add(slat);
    }
    // Top rolled tube finish
    const topRoll = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.96, 12).rotateZ(Math.PI / 2), pbMetal);
    topRoll.position.set(0, 1.38, 0);
    topRoll.castShadow = true;
    backGrp.add(topRoll);

    // Channeled backrest pad in dark blue fabric
    const backPad = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.32, 0.045), pbCushion);
    backPad.position.set(0, 0.68, 0.035);
    backPad.castShadow = true; backPad.receiveShadow = true;
    backGrp.add(backPad);
    for (let c = 1; c <= 3; c++) {
      const groove = new THREE.Mesh(new THREE.BoxGeometry(1.90, 0.025, 0.012), pbStitch);
      groove.position.set(0, c * 0.33, 0.055);
      backGrp.add(groove);
    }
  };

  // Two Palissade low lounge chairs along long edge facing the woods (facing -x / West)
  buildPalissadeChair(-4.5, 7.0, -Math.PI / 2);
  buildPalissadeChair(-4.5, 12.0, -Math.PI / 2);

  // 2. HAY Palissade Low Coffee Table in Dark Blue
  const table = new THREE.Group();
  table.position.set(-4.5, 0, 9.5);
  grp.add(table);

  const tb = (w, h, d, x, y, z, m) => b(w, h, d, x, y, z, m, table);

  // 4 slender tubular legs
  for (const lx of [-0.68, 0.68]) {
    for (const lz of [-0.95, 0.95]) {
      tb(0.065, 1.22, 0.065, lx, 0.61, lz, pbMetal);
    }
  }
  // Peripheral apron tubes
  for (const lx of [-0.68, 0.68]) tb(0.065, 0.065, 1.90, lx, 1.18, 0, pbMetal);
  for (const lz of [-0.95, 0.95]) tb(1.36, 0.065, 0.065, 0, 1.18, lz, pbMetal);

  // Slatted dark blue tabletop (6 parallel longitudinal slats)
  for (let s = 0; s < 6; s++) {
    const sx = -0.58 + s * 0.23;
    tb(0.19, 0.035, 2.05, sx, 1.24, 0, pbMetal);
  }

  // Accessories on table (matching reference photo):
  // A. Ceramic bowl with fresh strawberries
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.20, 0.15, 20), ceramicMat);
  bowl.position.set(-0.20, 1.33, -0.42); bowl.castShadow = true; table.add(bowl);
  for (let i = 0; i < 7; i++) {
    const ang = i * (Math.PI * 2 / 7);
    const rad = i === 0 ? 0.02 : 0.14;
    const bx = -0.20 + Math.cos(ang) * rad;
    const bz = -0.42 + Math.sin(ang) * rad;
    const berry = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.11, 8).rotateX(Math.PI), strawberryMat);
    berry.position.set(bx, 1.40, bz);
    berry.rotation.z = Math.cos(ang) * 0.25;
    berry.castShadow = true; table.add(berry);
    const calyx = new THREE.Mesh(new THREE.CircleGeometry(0.045, 5).rotateX(-Math.PI / 2), berryLeafMat);
    calyx.position.set(bx, 1.455, bz); table.add(calyx);
  }

  // B. Two stemmed wine glasses with rosé
  const makeWineGlass = (gx, gz) => {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.015, 14), glassMat);
    base.position.set(gx, 1.265, gz); base.castShadow = true; table.add(base);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8), glassMat);
    stem.position.set(gx, 1.38, gz); table.add(stem);
    const chalice = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, 0.22, 14, 1, true), glassMat);
    chalice.position.set(gx, 1.58, gz); chalice.castShadow = true; table.add(chalice);
    const wine = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.065, 0.12, 12), roseWineMat);
    wine.position.set(gx, 1.53, gz); table.add(wine);
  };
  makeWineGlass(0.25, 0.45);
  makeWineGlass(0.46, 0.15);

  // C. Insulated water bottle / canteen with stainless cap
  const canteen = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.62, 16), canteenBody);
  canteen.position.set(-0.42, 1.57, 0.38); canteen.castShadow = true; table.add(canteen);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 14), canteenSteel);
  cap.position.set(-0.42, 1.93, 0.38); cap.castShadow = true; table.add(cap);

  // D. Minimalist glass & dark steel candle lantern
  const lBase = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.34), darkSteel);
  lBase.position.set(0.12, 1.275, -0.12); lBase.castShadow = true; table.add(lBase);
  const lGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.40, 14), lanternMat);
  lGlass.position.set(0.12, 1.49, -0.12); table.add(lGlass);
  const lCap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.035, 0.34), darkSteel);
  lCap.position.set(0.12, 1.71, -0.12); table.add(lCap);
  const lHandle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 6, 14, Math.PI), darkSteel);
  lHandle.position.set(0.12, 1.74, -0.12); table.add(lHandle);

  // 3. Single Architectural Planter at South-West Deck Corner
  const planter = new THREE.Group();
  planter.position.set(-7.4, 0, 15.2);
  grp.add(planter);
  const potH = 1.65, potR = 0.72;
  const potBody = new THREE.Mesh(new THREE.CylinderGeometry(potR, potR * 0.88, potH, 22), potCharcoal);
  potBody.position.y = potH / 2; potBody.castShadow = true; potBody.receiveShadow = true; planter.add(potBody);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(potR * 0.94, 18).rotateX(-Math.PI / 2), soilMat);
  soil.position.y = potH + 0.01; planter.add(soil);
  // Lush native ornamental grass & fern mix
  for (let i = 0; i < 14; i++) {
    const ang = i * (Math.PI * 2 / 14);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 2.2, 4).translate(0, 1.1, 0), grassMat);
    blade.position.set(Math.cos(ang) * (potR * 0.42), potH, Math.sin(ang) * (potR * 0.42));
    blade.rotation.z = -Math.cos(ang) * 0.26;
    blade.rotation.x = Math.sin(ang) * 0.26;
    blade.castShadow = true; planter.add(blade);
  }
  for (let i = 0; i < 8; i++) {
    const ang = i * (Math.PI * 2 / 8) + 0.3;
    const frond = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.4, 5).translate(0, 0.7, 0), fernLeaf);
    frond.position.set(Math.cos(ang) * (potR * 0.55), potH, Math.sin(ang) * (potR * 0.55));
    frond.rotation.z = -Math.cos(ang) * 0.48;
    frond.rotation.x = Math.sin(ang) * 0.48;
    frond.rotation.y = ang;
    frond.castShadow = true; planter.add(frond);
  }

  let lanternOn = false;
  const setNight = on => {
    lanternMat.emissiveIntensity = on ? 3.0 : 0;
    lanternHalo.visible = on;
  };
  const setNightK = k => {
    lanternMat.emissiveIntensity = 3.2 * k;
    lanternHalo.visible = k > 0.04;
    lanternHalo.material.opacity = 0.32 * k;
  };

  act(table, {
    kind: 'lantern',
    label: d => d.on ? 'Extinguish deck lantern' : 'Light deck lantern',
    run: d => {
      lanternOn = d.on;
      lanternMat.emissiveIntensity = lanternOn ? 3.2 : (RT.nightOn ? 3.0 : 0);
      lanternHalo.visible = lanternOn || RT.nightOn;
    }
  });

  return { grp, setNight, setNightK, lanternMat, lanternHalo };
})();

/* Stainless steel & slate-gray gas grill centered on the north edge of the West Deck patio facing south. */
const GRILL = (() => {
  const gx = -4.34, gy = -0.167, gz = 0.60;
  const grp = new THREE.Group(); grp.position.set(gx, gy, gz); grp.rotation.y = -Math.PI / 2; LAND.add(grp);
  const stTop = M('steelTop'), stBody = M('steel'), chr = M('chrome'), hoodM = M('fridgeDoor');
  const coalM = new THREE.MeshStandardMaterial({ color: 0x3b2a22, emissive: 0xff5a14, emissiveIntensity: 0, roughness: 0.9 });
  const foodA = new THREE.MeshStandardMaterial({ color: 0x7A3A28, roughness: 0.7 }), foodB = new THREE.MeshStandardMaterial({ color: 0xE0B93A, roughness: 0.6 });
  const b = (w, h, d, x, y, z, m, parent = grp) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; };
  // 4 chrome legs + lower slate-gray cabinet + 2 brushed stainless doors with chrome handles
  for (const [lx, lz] of [[-0.68, -0.88], [0.68, -0.88], [-0.68, 0.88], [0.68, 0.88]]) b(0.1, 0.26, 0.1, lx, 0.13, lz, chr);
  b(1.48, 2.08, 1.92, 0, 1.3, 0, stBody);
  for (const sz of [-0.46, 0.46]) { b(0.05, 1.88, 0.88, 0.75, 1.3, sz, stTop); b(0.06, 0.55, 0.05, 0.80, 1.55, sz * 0.25, chr); }
  // stainless side shelves (north & south) + slanted front control panel with 4 chrome knobs
  for (const sz of [-1.32, 1.32]) { b(1.38, 0.08, 0.68, 0, 2.34, sz, stTop); b(0.06, 0.06, 0.58, 0.68, 2.32, sz, chr); }
  b(0.24, 0.26, 1.94, 0.74, 2.42, 0, stTop);
  for (const kz of [-0.68, -0.23, 0.23, 0.68]) {
    const kn = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.06, 14).rotateZ(Math.PI / 2), chr);
    kn.position.set(0.88, 2.42, kz); grp.add(kn);
  }
  // firebox + glowing coals + chrome cooking grates + food on grates
  b(1.52, 0.28, 1.96, 0, 2.48, 0, stBody);
  b(1.36, 0.06, 1.8, 0, 2.58, 0, coalM);
  for (let z = -0.8; z <= 0.81; z += 0.2) b(1.38, 0.03, 0.04, 0, 2.64, z, chr);
  const food = new THREE.Group(); food.visible = false; grp.add(food);
  for (const [fx, fz] of [[-0.25, -0.45], [0.22, -0.45], [-0.25, 0.05], [0.22, 0.05]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 12), foodA); p.position.set(fx, 2.68, fz); food.add(p);
  }
  for (const fz of [0.45, 0.68]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.52, 10).rotateZ(Math.PI / 2), foodB); c.position.set(0, 2.69, fz); food.add(c);
  }
  // hinged stainless hood + wide chrome handle
  const lidPv = new THREE.Group(); lidPv.position.set(-0.72, 2.64, 0); grp.add(lidPv);
  b(1.48, 0.62, 1.94, 0.72, 0.31, 0, hoodM, lidPv);
  b(1.12, 0.16, 1.88, 0.66, 0.66, 0, stTop, lidPv);
  b(0.07, 0.07, 1.45, 1.52, 0.24, 0, chr, lidPv);
  for (const sz of [-0.65, 0.65]) b(0.12, 0.06, 0.06, 1.46, 0.24, sz, chr, lidPv);
  const light = new THREE.PointLight(0xff7a2e, 0, 7, 2); light.position.set(0, 3.2, 0); light.visible = true; grp.add(light);
  const gSmoke = [];
  for (let i = 0; i < 6; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xd8d4ce, transparent: true, opacity: 0, depthWrite: false }));
    sp.scale.setScalar(0.45); sp.visible = false;
    sp.userData = { t: i / 6, origin: [gx, gy + 3.1, gz], rise: 5.2, drift: 0.7, s0: 0.35, s1: 1.5 };
    LAND.add(sp); smoke.push(sp); gSmoke.push(sp);
  }
  const setOn = on => {
    tweenTo(lidPv.rotation, 'z', on ? 1.08 : 0, 0.65);
    coalM.emissiveIntensity = on ? 2.2 : 0;
    food.visible = on;
    light.intensity = on ? 3.8 : 0;
    gSmoke.forEach(sp => { sp.visible = on; });
  };
  const actDef = act(grp, { kind: 'grill', label: d => d.on ? 'Turn off the grill' : 'Light the grill', run: d => setOn(d.on) });
  return { grp, lidPv, food, setOn, actDef, light };
})();
RT.siteReady = true; markShadows();
function applySeason(name) {
  const S = SEASONS[name];
  groundMat.color.set(S.ground); clearMat.color.set(S.clearing);
  const c = new THREE.Color();
  decid.forEach((t, i) => {
    const bare = t.k < S.bare;
    // hide a canopy by scaling it to zero
    if (!t._q) t._q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), t.k * 6);
    const w = 5.5 + t.k * 6.5;
    ps.set(t.x, t.y + t.h * 0.74, t.z);
    sc.set(bare ? 0.0001 : w, bare ? 0.0001 : t.h * 0.26, bare ? 0.0001 : w);
    mtx.compose(ps, t._q, sc); canopies.setMatrixAt(i, mtx);
    if (S.leaves.length) canopies.setColorAt(i, c.set(S.leaves[Math.floor(t.k * 97) % S.leaves.length]));
    else canopies.setColorAt(i, c.set(0x6f6259));
  });
  canopies.instanceMatrix.needsUpdate = true; if (canopies.instanceColor) canopies.instanceColor.needsUpdate = true;
  cones.material.color.set(name === 'winter' ? 0x3f5546 : 0x2f4a2e);
  if (MATS.snow) { MATS.snow.transparent = false; MATS.snow.opacity = 1; MATS.snow.depthWrite = true; }
  snowParts.forEach(m => { m.position.y = 0; m.scale.y = 1; m.visible = name === 'winter'; });
  // planting through the year: grasses gold in fall, straw in winter; ferns rust in fall, brown in winter
  PLANTS.grassMat.color.set({ summer: 0x7F9B4E, fall: 0xB49A5E, winter: 0xA39A86, spring: 0x86AC58 }[name]);
  PLANTS.fernMat.color.set({ summer: 0x4D7A38, fall: 0x8C6A3A, winter: 0x6A5A46, spring: 0x5E8A44 }[name]);
  PATIO.leaf.color.set((name === 'summer' || name === 'spring') ? 0x9DBF5A : 0xE0C04A); PATIO.crowns.forEach(c => { c.visible = name !== 'winter'; });
  PATIO.brickMat.roughness = 0.9; PATIO.brickMat.metalness = 0; PATIO.mortarMat.roughness = 1;
  applySceneTheme();
  markShadows();
}
applySceneTheme();


registerOutdoorNightHook(on => {
  WEST_DECK.setNight(on);
  PATIO.setPatioFire(on);
});

export { PATIO, WEST_DECK, GRILL, applySeason };
