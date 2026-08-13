// ---------------------------------------------------------------------------
// nesting.js — first-fit-decreasing shelf nesting onto standard boards.
//
// Not an optimal packer, but deterministic and good enough to (a) count how
// many sheets a design consumes, (b) drive a realistic material cost, and
// (c) give the production team real sheet coordinates to cut against.
// Parts and boards are handled in centimetres; kerf and trim are configurable.
// ---------------------------------------------------------------------------

export const SHEET = {
  // 2440 × 1220 mm — the standard 8×4 board.
  width: 244,
  height: 122,
  trim: 1.0, // cm, edge trim removed all round
  kerf: 0.4, // cm, saw/router kerf between parts
};

// Expand the cut list into individual rectangles, keeping thin (back) panels
// on their own board type so 18mm and 6mm stock aren't mixed.
function explode(panels) {
  const out = [];
  panels.forEach((p) => {
    for (let i = 0; i < p.qty; i++) {
      out.push({ key: p.key, label: p.label, w: p.cutW, h: p.cutH, thin: !!p.thin });
    }
  });
  return out;
}

function packBoards(parts, sheet) {
  const usableW = sheet.width - sheet.trim * 2;
  const usableH = sheet.height - sheet.trim * 2;
  const k = sheet.kerf;

  // Orient every part landscape-ish, then sort tall-first for tidy shelves.
  const items = parts
    .map((p) => (p.w < p.h ? { ...p, w: p.h, h: p.w, rotated: true } : { ...p, rotated: false }))
    .sort((a, b) => b.h - a.h || b.w - a.w);

  const boards = [];
  const newBoard = () => ({ placements: [], shelfY: sheet.trim, shelfH: 0, cursorX: sheet.trim });

  for (const it of items) {
    // Part too big for a clean board — flag it rather than silently dropping.
    if (it.w > usableW && it.h > usableW) {
      boards.push({ placements: [{ ...it, x: sheet.trim, y: sheet.trim, oversize: true }], oversize: true });
      continue;
    }
    let placed = false;
    for (const b of boards) {
      if (b.oversize) continue;
      // Try current shelf.
      if (b.cursorX + it.w <= usableW + sheet.trim && b.shelfY + it.h <= usableH + sheet.trim) {
        b.placements.push({ ...it, x: b.cursorX, y: b.shelfY });
        b.cursorX += it.w + k;
        b.shelfH = Math.max(b.shelfH, it.h);
        placed = true;
        break;
      }
      // Try opening a new shelf on this board.
      const nextY = b.shelfY + b.shelfH + k;
      if (nextY + it.h <= usableH + sheet.trim && sheet.trim + it.w <= usableW + sheet.trim) {
        b.shelfY = nextY;
        b.shelfH = it.h;
        b.cursorX = sheet.trim;
        b.placements.push({ ...it, x: b.cursorX, y: b.shelfY });
        b.cursorX += it.w + k;
        placed = true;
        break;
      }
    }
    if (!placed) {
      const b = newBoard();
      b.placements.push({ ...it, x: b.cursorX, y: b.shelfY });
      b.cursorX += it.w + k;
      b.shelfH = it.h;
      boards.push(b);
    }
  }
  return boards;
}

export function nest(panels, sheet = SHEET) {
  const parts = explode(panels);
  const thick = packBoards(parts.filter((p) => !p.thin), sheet);
  const thin = packBoards(parts.filter((p) => p.thin), sheet);

  const sheetArea = sheet.width * sheet.height;
  const tally = (boards, stock) =>
    boards.map((b, i) => {
      const used = b.placements.reduce((s, p) => s + p.w * p.h, 0);
      return { index: i, stock, placements: b.placements, utilization: used / sheetArea, oversize: !!b.oversize };
    });

  const boards = [...tally(thick, "18mm"), ...tally(thin, "6mm")];
  const totalSheets = boards.length;
  const avgUtil = boards.length ? boards.reduce((s, b) => s + b.utilization, 0) / boards.length : 0;

  return { boards, sheet, totalSheets, thickSheets: thick.length, thinSheets: thin.length, avgUtil };
}
