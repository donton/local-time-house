// Room metadata, dimensions formatting, walk teleport spots, and guided tour stops.
import { LV } from './constants.js';
import { C } from '../core/materials.js';

/* =====================================================================
   4. ROOMS — clear interior rectangles (feet), finishes, notes
   ===================================================================== */
const WALLS_CHALK = { label: 'Walls', value: 'Warm chalk paint', sw: C.chalk };
const FLOOR_OAK = { label: 'Floor', value: 'Weathered neutral oak (spec: Sawyer Mason Developer Sconset)', sw: C.wood };
const FLOOR_CONC = { label: 'Floor', value: 'Sealed concrete, mid gray', sw: 0x8A8681 };
const ROOMS = [
  // ---- Ground floor -------------------------------------------------
  { id: 'kitchen', name: 'Kitchen / Dining', floor: 'ground', y: 0, mat: 'concreteFloor',
    rects: [[0.51, 16.52, 0.52, 16.54]], ceiling: 'Double height, vaulted to the ridge',
    finishes: [WALLS_CHALK, FLOOR_CONC,
      { label: 'Base + wall', value: 'Reform BASIS, Burgundy linoleum, natural oak round knobs', sw: 0x5B2630 },
      { label: 'Full-height', value: 'Reform BASIS, natural oak veneer (tall cabinets, fridge surround, open cubby)', sw: 0xCFA676 },
      { label: 'Counters', value: '5 mm stainless steel', sw: 0xCBCFD2 },
      { label: 'Backsplash', value: '2"×2" white mosaic, gray grout, 1\'-0" high', sw: 0xF4F3EF }],
    note: 'Layout per Reform order US262026216REG. North run: 47" corner, 30" drawers, 30" range, 21" drawers. West run: 30" sink base under W07, 24" dishwasher, 24" drawers. East wall: 7" filler, 30" tall cabinet, 36" fridge, 30" tall cabinet, 96" high. Wall cabinets raised to 65¼"–96", flush under the 2" wood ledge at 8\'-0" (CD set, site-built). Handles are round finger holes with oak edges.' },
  { id: 'entry', name: 'Entry + Stair', floor: 'ground', y: 0, mat: 'wineTile',
    rects: [[16.96, 24.16, 0.52, 16.54]], dimRect: [16.96, 24.16, 9.3, 16.54], ceiling: "8'-0\"",
    finishes: [WALLS_CHALK, { label: 'Floor', value: '6"×6" wine-red tile, matching grout', sw: 0x6B2330 },
      { label: 'Stair', value: '14 risers @ ±8", stained wood treads, painted risers, 3 winders', sw: C.woodStair },
      { label: 'Handrail', value: '1¼" Ø wood, transparent finish, flat-bar brackets on the wood-paneled center wall', sw: C.woodStair }],
    note: 'Door 101: 3\'-0" × 8\'-0" full-lite in-swing, with W01 2\'-0" fixed sidelight.' },
  { id: 'living', name: 'Sunken Living', floor: 'ground', y: LV.SUNKEN, mat: 'concreteFloor',
    rects: [[2.51, 16.52, 16.54, 26.55]], ceiling: "9'-6\" to exposed 2×10 joists @ 1'-5\" o.c.",
    finishes: [WALLS_CHALK, FLOOR_CONC,
      { label: 'Hearth', value: 'Raised 1\'-6", 4"×4" glossy wine-red tile on top and front', sw: 0x6E2232 },
      { label: 'Sofa', value: 'Corner sectional, 94" × 94" × 33", blue-gray woven upholstery, track arms, loose seat and back cushions', sw: 0x6E7E98 },
      { label: 'Rug', value: 'Navy wool', sw: 0x1E2C5C },
      { label: 'Coffee table', value: 'Round, 2\'-9" Ø, sage green, raised rim on four chunky round legs', sw: 0xA2A55F },
      { label: 'TV unit', value: 'Wood millwork, wood top', sw: C.millwork }],
    note: '18" below the main floor: three 6" risers on a 4\'-6" stair. Conversation pit: low L-shaped sectional, 8\'-0" along the pit edge and down the west wall to the hearth, backed by the 1\'-6" pit edge. Fireplace insert on the raised hearth (keynote 11), TV unit with open shelves (keynote 29).' },
  { id: 'guestBed', name: 'Guest Bedroom', floor: 'ground', y: 0, mat: 'concreteFloor',
    rects: [[24.55, 32.86, 0.52, 10.81], [24.55, 28.06, 10.81, 13.14]], dimRect: [24.55, 32.86, 0.52, 13.14], ceiling: "8'-0\"",
    finishes: [WALLS_CHALK, FLOOR_CONC], note: 'Door 104 2\'-8" swing. W05 3\'-0" × 8\'-0" on the north wall. Custom oak twin-over-queen bunk bed in northeast corner with integrated vertical foot ladder.' },
  { id: 'closet105', name: 'Guest Closet', floor: 'ground', y: 0, mat: 'concreteFloor', small: true,
    rects: [[28.45, 32.86, 10.81, 13.14]], ceiling: "8'-0\"", finishes: [WALLS_CHALK, FLOOR_CONC],
    note: 'Door 105 4\'-0" bifold. The electrical panel is flush on the corridor side of this closet\'s south wall.' },
  { id: 'guestBath', name: 'Guest Bath', floor: 'ground', y: 0, mat: 'nautical',
    rects: [[33.4, 38.77, 0.52, 13.14]], ceiling: "8'-0\"",
    finishes: [
      { label: 'Shower', value: 'Nautical Blue 2"×2" mosaic, walls and floor', sw: C.nautical },
      { label: 'Floor', value: 'Nautical Blue 2"×2" mosaic (assumed to run through the room)', sw: C.nautical },
      { label: 'Pony wall', value: 'Biscuit 2"×2" mosaic', sw: C.biscuit },
      { label: 'Niche', value: 'Brownberry accent', sw: C.brownberry },
      { label: 'Fixtures', value: 'Chrome', sw: C.chrome }, WALLS_CHALK],
    note: 'Toilet and sink mount to the tiled ledge wall (keynote 32). W14 3\'-0" × 4\'-0" tempered casement in the shower.' },
  { id: 'corridor', name: 'Corridor', floor: 'ground', y: 0, mat: 'concreteFloor',
    rects: [[24.16, 39.31, 13.54, 16.54]], dimRect: [24.55, 38.77, 13.54, 16.54], ceiling: "8'-0\"",
    finishes: [WALLS_CHALK, FLOOR_CONC, { label: 'Elec. panel', value: 'Flush, centered on the guest-closet wall (revised)', sw: C.panel }],
    note: 'Pocket doors 103 (from entry) and 107 (to office). Two W02 3\'-0" × 5\'-0" fixed windows.' },
  { id: 'office', name: 'Office', floor: 'ground', y: 0, mat: 'concreteFloor',
    rects: [[39.31, 45.16, 0.52, 16.54], [45.16, 47.56, 0.52, 7.14], [45.16, 47.56, 11.54, 16.54]], dimRect: [39.31, 47.56, 0.52, 16.54], ceiling: "8'-0\"",
    finishes: [WALLS_CHALK, FLOOR_CONC],
    note: 'Queen bed with headboard bookcase on the east wall and shelves along the north wall. Floating desk (keynote 8) under W04 with desk chair. W03 casements on east and south.' },
  { id: 'closet108', name: 'Office Closet', floor: 'ground', y: 0, mat: 'concreteFloor', small: true,
    rects: [[45.51, 47.56, 7.53, 11.14]], ceiling: "8'-0\"", finishes: [WALLS_CHALK, FLOOR_CONC], note: 'Door 108 2\'-8" swing.' },
  // ---- Loft floor ---------------------------------------------------
  { id: 'loft', name: 'Loft', floor: 'loft', y: LV.LOFT, mat: 'wood',
    rects: [[14.82, 24.16, 10.45, 16.54]], dimRect: [14.52, 24.16, 10.45, 16.54], ceiling: 'Under the roof slope',   // floor stops behind the 3'-0" guard
    finishes: [WALLS_CHALK, FLOOR_OAK], note: 'Overlooks the kitchen/dining. Desk along the guard (keynote 8), wood-stud slat screen at the stair (keynote 31), built-in millwork (keynote 30).' },
  { id: 'mech', name: 'MECH', floor: 'loft', y: LV.LOFT, mat: 'wood',
    rects: [[24.7, 30.23, 0.52, 5.42]], ceiling: "North roof slope, capped at 8'-0\"",
    finishes: [WALLS_CHALK, FLOOR_OAK], note: 'Revised: MECH moved to the west room. Hot water heater (keynote 28). Reached from the laundry through Door 203 (2\'-8" × 5\'-0").' },
  { id: 'laundry', name: 'Laundry', floor: 'loft', y: LV.LOFT, mat: 'wood',
    rects: [[30.77, 40.86, 0.52, 5.42]], ceiling: "North roof slope, capped at 8'-0\"",
    finishes: [WALLS_CHALK, FLOOR_OAK], note: 'Revised: laundry moved to the east room. Pocket door 202 (3\'-0" × 7\'-0") now opens from the bedroom east of the bed, beside the bath door. Exact door position assumed.' },
  { id: 'bedroom', name: 'Primary Bedroom', floor: 'loft', y: LV.LOFT, mat: 'wood',
    rects: [[24.7, 40.86, 5.97, 16.54]], ceiling: "8'-0\" flat in the shed dormer",
    finishes: [WALLS_CHALK, FLOOR_OAK], note: 'Dormer windows W10 (×2, casement 3\'-0" × 6\'-0") and W11 (fixed 7\'-6" × 6\'-0"), 2\'-0" sills. ' },
  { id: 'bath2', name: 'Upstairs Bath', floor: 'loft', y: LV.LOFT, mat: 'brownberry',
    rects: [[41.4, 47.56, 1.94, 15.21]], ceiling: 'Under the roof slope',
    finishes: [
      { label: 'Shower', value: 'Biscuit 2"×2" mosaic walls', sw: C.biscuit },
      { label: 'Floor', value: 'Brownberry 2"×2" mosaic; shower bench and curb match', sw: C.brownberry },
      { label: 'Half wall', value: '5" deep × 4\'-0" high behind the vanity, Biscuit 2"×2" mosaic', sw: C.biscuit },
      { label: 'Vanity', value: 'Floating double vanity, full width wall to pony wall, 1\'-10" deep, top at 3\'-6"', sw: C.millwork },
      { label: 'Fixtures', value: 'Chrome', sw: C.chrome }, WALLS_CHALK],
    note: 'Double vanity (keynote 1), shower bench (keynote 34). Pocket door 204 from the bedroom. Skylight S01 above.' },
  { id: 'storeN', name: 'Storage', floor: 'loft', y: LV.LOFT, mat: 'wood', small: true, nolabel: true,
    rects: [[41.4, 47.56, 0.52, 1.44]], ceiling: '-', finishes: [], note: 'Chase/storage strip shown on A101.2; use not labeled.' },
  { id: 'storeS', name: 'Storage', floor: 'loft', y: LV.LOFT, mat: 'wood', small: true, nolabel: true,
    rects: [[41.4, 47.56, 15.71, 16.54]], ceiling: '-', finishes: [], note: 'Chase/storage strip shown on A101.2; use not labeled.' },
];


const fmt = ft => { let inch = Math.round(ft * 12); const f = Math.floor(inch / 12); inch -= f * 12; return `${f}'-${inch}"`; };
const roomById = Object.fromEntries(ROOMS.map(r => [r.id, r]));
const dimsOf = r => { const [x0, x1, z0, z1] = r.dimRect || r.rects[0]; return [x1 - x0, z1 - z0]; };
const dimText = r => { const [w, d] = dimsOf(r); return `${fmt(w)} × ${fmt(d)}`; };


const WALK_SPOTS = [
  { sec: 'Ground', name: 'Entry deck', pos: [19.7, 0, 24], yaw: 0 },
  { sec: 'Ground', name: 'Entry + stair', pos: [20.0, 0, 12.0], yaw: 0 },
  { sec: 'Ground', name: 'Kitchen / dining', pos: [10.5, 0, 8.5], yaw: 1.57 },
  { sec: 'Ground', name: 'Sunken living', pos: [12.5, LV.SUNKEN, 21.5], yaw: 1.57 },
  { sec: 'Ground', name: 'Guest bedroom', pos: [28.0, 0, 8.5], yaw: 0 },
  { sec: 'Ground', name: 'Guest bath', pos: [36.0, 0, 9.5], yaw: 0 },
  { sec: 'Ground', name: 'Office', pos: [42.0, 0, 10.5], yaw: 0 },
  { sec: 'Loft', name: 'Loft', pos: [19.5, LV.LOFT, 13.5], yaw: 1.57 },
  { sec: 'Loft', name: 'Primary bedroom', pos: [26.5, LV.LOFT, 12.3], yaw: -1.25 },
  { sec: 'Loft', name: 'Upstairs bath', pos: [44.5, LV.LOFT, 9.5], yaw: 0 },
  { sec: 'Outside', name: 'West deck', pos: [-4.5, 0, 9.5], yaw: -1.57 },
  { sec: 'Outside', name: 'South lawn', pos: [25.0, LV.GRADE, 44.0], yaw: 3.14 },
];


const TOUR_STOPS = [
  { name: 'Arrive', pos: [62, 22, 66], look: [22, 6, 14], cap: 'Welcome to Local Time House in Andes, New York.' },
  { name: 'Entry deck', open: [/front door/i], walk: { y: 0, path: [[21.2, 32.0], [20.4, 28.2], [19.7, 24.3]], look: [19.7, 5.5, 17] },
    cap: 'Up the steps onto the covered entry deck.' },
  { name: 'Entry + stair', walk: { y: 0, path: [[19.7, 24.3], [19.7, 14.2]], look: [20.5, 5.6, 3.5] },
    cap: 'Inside the entry, beside the stair to the loft.' },
  { name: 'Kitchen', shut: [{ rx: /front door/i, axis: 'z', lt: 13.8 }], walk: { y: 0, path: [[19.7, 14.2], [18.2, 13.2], [14.2, 14.6]], look: [4.5, 4, 2.5] },
    cap: 'The double-height kitchen and dining room, open to the loft above.' },
  { name: 'West deck', open: [/side door/i], walk: { y: 0, path: [[14.2, 14.6], [10.5, 15.2], [4.0, 15.2], [1.4, 14.7], [-1.8, 14.7], [-4.5, 14.2]], look: [-14, 6, 6] },
    cap: 'Out the side door to the west deck, looking out toward the woods.' },
  { name: 'Conversation pit', shut: [{ rx: /side door/i, axis: 'x', gt: 4.5 }], walk: { y: 0, path: [[-4.5, 14.2], [-1.8, 14.7], [1.4, 14.7], [4.0, 15.2], [10.5, 15.2], [14.2, 14.6], [15.0, 18.4]], look: [6.5, 0.5, 24.5] },
    cap: 'Three steps down into the sunken living room, gathered around the fireplace.' },
  { name: 'Guest bedroom', walk: { y: 0, path: [[15.0, 18.4], [15.6, 14.8], [20.8, 14.8], [24.4, 15.0], [26.5, 15.0], [26.5, 12.6], [26.5, 10.2]], look: [30, 4, 5] },
    cap: 'Down the hall to the guest bedroom, with a built-in bunk bed in the corner.' },
  { name: 'Guest bath', walk: { y: 0, path: [[26.5, 10.2], [26.6, 14.8], [34.9, 14.9], [35.0, 11.5], [35.0, 8.8]], look: [36, 3, 3] },
    cap: 'The guest bath, with a walk-in shower and corner vanity.' },
  { name: 'Office', walk: { y: 0, path: [[35.0, 8.8], [35.0, 14.8], [41.6, 15.0], [43.5, 12.0]], look: [43, 4, 15.6] },
    cap: 'At the east end, a quiet office and spare bedroom with a desk under the window.' },
  { name: 'Loft', walk: { y: 0, path: [[43.5, 12.0], [41.6, 15.0], [30.0, 15.0], [24.4, 15.0], [21.0, 13.8], [18.4, 12.8], [18.6, 9.6], [18.6, 4.4], [19.0, 2.2], [21.8, 1.7], [22.7, 3.4], [22.7, 6.0], [22.7, 10.0], [22.6, 12.4]], look: [7, 7.5, 6] },
    cap: 'Up the stairs to the loft, overlooking the kitchen and dining space below.' },
  { name: 'Primary bedroom', walk: { y: 9.33, path: [[22.6, 12.4], [27.5, 12.3]], look: [36, 11.5, 8.5] },
    cap: 'The primary bedroom, tucked under the shed dormer with broad views south.' },
  { name: 'Primary bath', walk: { y: 9.33, path: [[27.5, 12.3], [28.5, 14.8], [38.2, 14.8], [38.6, 7.8], [44.0, 7.6]], look: [44.5, 11, 12.5] },
    cap: 'The upstairs bath, lit from above by a skylight.' },
  { name: 'Patio & fire pit', open: [/front door/i], shut: [{ rx: /front door/i, axis: 'z', gt: 26 }], walk: { y: 9.33, path: [[44.0, 7.6], [38.6, 7.8], [38.2, 14.8], [28.5, 14.8], [27.5, 12.3], [22.6, 12.4], [22.7, 10.0], [22.7, 6.0], [22.7, 3.4], [21.8, 1.7], [19.0, 2.2], [18.6, 4.4], [18.6, 9.6], [18.4, 12.8], [19.7, 14.2], [19.7, 24.3], [20.4, 28.2], [21.2, 32.0], [14.0, 38.0], [4.0, 44.0], [-4.5, 48.0], [-11.5, 44.5]], look: [-18.5, LV.GRADE + 2.5, 42.5] },
    cap: 'Out under the birches: an outdoor terrace with dining and a fire pit.' },
  { name: 'Dollhouse', world: true, cap: 'The whole house at a glance.' },
  { name: 'Evening', pos: [70, 20, 70], look: [22, 7, 14], night: true, cap: 'Back outside as dusk settles and the interior lights come on.' },
];


const KIND_INFO = {
  door: ['Doors', 'Open any door'], lights: ['Light switch', 'The switch by the front door'], cabinet: ['Cabinets & drawers', 'Try the corner one: it swivels out'],
  dishwasher: ['Dishwasher', 'Panel-ready, next to the sink'], freezer: ['Freezer drawer', 'Bottom of the fridge'], fridge: ['Fridge', 'French doors'],
  fan: ['Ceiling fan', 'Give it a spin'], fireplace: ['Fireplace', 'Light a fire'], tv: ['TV', 'Flip through the channels'],
  shower: ['Shower', 'Fogs up the mirror'], laundry: ['Washer & dryer', 'Open the front doors'], car: ['The car', 'Flash the headlights'],
};


export { WALLS_CHALK, FLOOR_OAK, FLOOR_CONC, ROOMS, fmt, roomById, dimsOf, dimText, WALK_SPOTS, TOUR_STOPS, KIND_INFO };
