// ---------------------------------------------------------------------------
// design.js — the single parametric source of truth.
//
// computeDesign(params) turns a handful of slider values into a complete,
// deterministic description of the piece: every panel, its cut size and edge
// banding, the shelf/divider layout, and the hardware needed to assemble it.
// The 3D view, cut list, nesting, pricing, BOM and g-code all read from this —
// nothing downstream re-derives geometry, so they can never disagree.
// All linear dimensions are in centimetres unless a name says otherwise.
// ---------------------------------------------------------------------------

export const THICKNESS = 1.8; // cm, carcass panel thickness
export const BACK_THICKNESS = 0.6; // cm, back panel (thin ply)
export const MIN_SHELF_HEIGHT = 20; // cm, min clear compartment before we drop a shelf
export const MAX_SHELF_SPAN = 80; // cm, max unsupported shelf span before we add a divider
export const RAIL_MIN_HEIGHT = 90; // cm, a column taller than this can take a hanging rail

export const FINISHES = [
  { id: "white", name: "White", hex: "#EDEAE2", kind: "paint" },
  { id: "olive", name: "Olive Green", hex: "#5C6B4A", kind: "paint" },
  { id: "clay", name: "Clay Brown", hex: "#7A5240", kind: "paint" },
  { id: "midnight", name: "Midnight Blue", hex: "#26344A", kind: "paint" },
  { id: "sand", name: "Sand", hex: "#C9B79C", kind: "paint" },
  { id: "black", name: "Black", hex: "#22221F", kind: "paint" },
  { id: "birch", name: "Birch Plywood", hex: "birch", kind: "veneer", isTexture: true },
];

export function finishById(id) {
  return FINISHES.find((f) => f.id === id) || FINISHES[0];
}

export const DEFAULT_PARAMS = {
  width: 100,
  height: 200,
  depth: 58,
  shelfCount: 3,
  finishId: "white",
  showDoors: true,
  hangingRail: true,
};

// Cut dimensions are carried internally in CENTIMETRES (nesting, pricing and
// g-code all consume cm). `round1` just snaps to 1mm precision; display and
// export layers convert to true millimetres. See toMm() in exports/UI.
const round1 = (cm) => Math.round(cm * 10) / 10;
const mm = round1;

export function computeDesign(params) {
  const { width, height, depth, shelfCount, showDoors } = params;
  const finish = finishById(params.finishId);

  const innerWidth = width - THICKNESS * 2;
  const innerHeight = height - THICKNESS * 2;

  // Rule 1 — minimum compartment height: drop shelves until every gap clears MIN_SHELF_HEIGHT.
  const maxShelvesForHeight = Math.max(0, Math.floor(innerHeight / MIN_SHELF_HEIGHT) - 1);
  const actualShelves = Math.min(shelfCount, maxShelvesForHeight);
  const shelvesClamped = actualShelves < shelfCount;

  // Rule 2 — maximum shelf span: split into equal columns with vertical dividers.
  const columns = Math.max(1, Math.ceil(innerWidth / MAX_SHELF_SPAN));
  const dividerCount = columns - 1;
  const colWidth = (innerWidth - dividerCount * THICKNESS) / columns;

  // Left-to-right layout of column centres and divider centres, relative to unit centre.
  const columnCenters = [];
  const dividerCenters = [];
  let cursorX = -innerWidth / 2;
  for (let c = 0; c < columns; c++) {
    columnCenters.push(cursorX + colWidth / 2);
    cursorX += colWidth;
    if (c < columns - 1) {
      dividerCenters.push(cursorX + THICKNESS / 2);
      cursorX += THICKNESS;
    }
  }

  const shelvesTotal = actualShelves * columns;
  const doorLeaves = showDoors ? columns * 2 : 0;
  const canHaveRail = params.hangingRail && innerHeight >= RAIL_MIN_HEIGHT;
  const railCount = canHaveRail ? columns : 0;

  // ---- Panels (cut list). `bandedEdges` = number of long front edges that get edge banding. ----
  const panels = [
    { key: "side", label: "Side panel", cutW: mm(depth), cutH: mm(height), qty: 2, grain: "length", bandedEdges: 1 },
    { key: "topbot", label: "Top / bottom", cutW: mm(innerWidth), cutH: mm(depth), qty: 2, grain: "width", bandedEdges: 1 },
    { key: "back", label: "Back panel", cutW: mm(innerWidth), cutH: mm(innerHeight), qty: 1, grain: "width", bandedEdges: 0, thin: true },
  ];
  if (dividerCount > 0)
    panels.push({ key: "divider", label: "Vertical divider", cutW: mm(depth), cutH: mm(innerHeight), qty: dividerCount, grain: "length", bandedEdges: 1 });
  if (shelvesTotal > 0)
    panels.push({ key: "shelf", label: "Shelf", cutW: mm(colWidth), cutH: mm(depth), qty: shelvesTotal, grain: "width", bandedEdges: 1 });
  if (doorLeaves > 0) {
    const doorGap = 0.3;
    const leafWidth = (colWidth - doorGap * 6) / 2;
    const doorHeight = height - doorGap * 2;
    panels.push({ key: "door", label: "Door leaf", cutW: mm(leafWidth), cutH: mm(doorHeight), qty: doorLeaves, grain: "length", bandedEdges: 4 });
  }

  // ---- Hardware bill of materials, derived from the geometry above. ----
  const hardware = [];
  if (doorLeaves > 0) {
    hardware.push({ key: "hinge", label: "Concealed hinge (35mm)", qty: doorLeaves * 2, unit: 2.4 });
    hardware.push({ key: "handle", label: "Handle / knob", qty: doorLeaves, unit: 3.5 });
  }
  if (shelvesTotal > 0) hardware.push({ key: "pin", label: "Shelf support pin", qty: shelvesTotal * 4, unit: 0.15 });
  // Carcass connectors: 8 for the box corners, +4 per divider, +2 per shelf.
  const camQty = 8 + dividerCount * 4 + shelvesTotal * 2;
  hardware.push({ key: "cam", label: "Cam-lock connector", qty: camQty, unit: 0.55 });
  hardware.push({ key: "foot", label: "Adjustable foot", qty: columns > 1 ? columns * 2 + 2 : 4, unit: 1.1 });
  if (railCount > 0) {
    hardware.push({ key: "rail", label: "Hanging rail + sockets", qty: railCount, unit: 6.5 });
  }
  // Back panel is pinned on: roughly one fixing every 20cm of perimeter.
  const backPerimeter = (2 * (innerWidth + innerHeight)) / 100; // m
  hardware.push({ key: "screw", label: "Back panel fixing", qty: Math.max(8, Math.ceil((backPerimeter * 100) / 20)), unit: 0.05 });

  return {
    params,
    finish,
    // layout
    innerWidth,
    innerHeight,
    colWidth,
    columns,
    dividerCount,
    columnCenters,
    dividerCenters,
    actualShelves,
    shelvesTotal,
    shelvesClamped,
    doorLeaves,
    railCount,
    canHaveRail,
    // outputs
    panels,
    hardware,
  };
}
