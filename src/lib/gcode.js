// ---------------------------------------------------------------------------
// gcode.js — turn nested boards into router g-code.
//
// One program per sheet. For each nested part we drill the fixing holes the
// production team asked for (cam-lock + shelf-pin positions on the 32mm system)
// and then profile-cut the part outline with lead-in tabs implied by a single
// pass. Coordinates come straight from the nester, converted cm → mm.
// This is illustrative CAM, not a post-processor for a specific controller.
// ---------------------------------------------------------------------------

const MM = (cm) => +(cm * 10).toFixed(2);

const TOOL = {
  routerDia: 6, // mm, profiling cutter
  drillDia: 5, // mm, dowel/cam drill
  feedCut: 1800, // mm/min
  feedPlunge: 600,
  feedDrill: 400,
  safeZ: 8, // mm
  cutZ: -19, // mm — through 18mm + into spoilboard
  drillZ: -13, // mm — 32mm-system holes are ~13mm deep
  spindle: 18000,
};

// Fixing-hole pattern for a part, in the part's own local mm coordinates.
function holesFor(part) {
  const w = MM(part.w);
  const h = MM(part.h);
  const holes = [];
  const inset = 37; // mm from ends, a common cam position
  if (part.key === "side" || part.key === "divider") {
    // Two rows of system holes 32mm apart near each long edge (line boring).
    [37, w - 37].forEach((x) => {
      for (let y = 60; y <= h - 60; y += 128) holes.push([x, y]);
    });
  } else if (part.key === "shelf" || part.key === "topbot") {
    [inset, w - inset].forEach((x) => holes.push([x, 9], [x, h - 9]));
  } else if (part.key === "door") {
    // Hinge cup bores near the hinge edge.
    [80, h - 80].forEach((y) => holes.push([22, y]));
  }
  return holes;
}

function partProgram(part, lines) {
  const x0 = MM(part.x);
  const y0 = MM(part.y);
  const w = MM(part.w);
  const h = MM(part.h);
  const label = `${part.label}${part.rotated ? " (rotated)" : ""}`;

  lines.push(`( ---- ${label}  ${w}x${h}mm ---- )`);

  // Drilling
  const holes = holesFor(part);
  if (holes.length) {
    lines.push(`M6 T2 ( ${TOOL.drillDia}mm drill )`);
    holes.forEach(([hx, hy]) => {
      lines.push(`G0 X${(x0 + hx).toFixed(2)} Y${(y0 + hy).toFixed(2)}`);
      lines.push(`G1 Z${TOOL.drillZ} F${TOOL.feedDrill}`);
      lines.push(`G0 Z${TOOL.safeZ}`);
    });
  }

  // Profiling — offset outward by the tool radius so the part keeps its size.
  const r = TOOL.routerDia / 2;
  const ax = (x0 - r).toFixed(2);
  const ay = (y0 - r).toFixed(2);
  const bx = (x0 + w + r).toFixed(2);
  const by = (y0 + h + r).toFixed(2);
  lines.push(`M6 T1 ( ${TOOL.routerDia}mm router )`);
  lines.push(`G0 X${ax} Y${ay}`);
  lines.push(`G1 Z${TOOL.cutZ} F${TOOL.feedPlunge}`);
  lines.push(`G1 X${bx} Y${ay} F${TOOL.feedCut}`);
  lines.push(`G1 X${bx} Y${by}`);
  lines.push(`G1 X${ax} Y${by}`);
  lines.push(`G1 X${ax} Y${ay}`);
  lines.push(`G0 Z${TOOL.safeZ}`);
  lines.push("");
}

export function generateGcode(design, nesting) {
  const programs = nesting.boards.map((board, i) => {
    const lines = [];
    lines.push(`( Wardrobe Studio — sheet ${i + 1} of ${nesting.totalSheets} )`);
    lines.push(`( stock ${board.stock}  ${nesting.sheet.width * 10}x${nesting.sheet.height * 10}mm )`);
    lines.push(`( parts: ${board.placements.length}  utilisation ${(board.utilization * 100).toFixed(0)}% )`);
    lines.push("G21 ( mm )");
    lines.push("G90 ( absolute )");
    lines.push("G17 ( XY plane )");
    lines.push(`G0 Z${TOOL.safeZ}`);
    lines.push(`M3 S${TOOL.spindle} ( spindle on )`);
    lines.push("");
    if (board.oversize) {
      lines.push("( !! part exceeds sheet — split required, skipped )");
    } else {
      board.placements.forEach((p) => partProgram(p, lines));
    }
    lines.push("M5 ( spindle off )");
    lines.push("M30 ( end )");
    return { index: i, stock: board.stock, text: lines.join("\n") };
  });

  const combined = programs
    .map((p) => `%\nO${1000 + p.index} ( sheet ${p.index + 1} )\n${p.text}\n%`)
    .join("\n\n");

  return { programs, combined };
}
