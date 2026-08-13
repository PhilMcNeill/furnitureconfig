// ---------------------------------------------------------------------------
// pricing.js — a transparent, line-by-line job price.
//
// Material is priced by whole sheets consumed (from the nester), not raw area,
// so offcut waste is paid for the way a real workshop pays for it.
// ---------------------------------------------------------------------------

export const RATES = {
  sheet18: 42, // £ per 18mm sheet (2440×1220)
  sheet6: 22, // £ per 6mm back-panel sheet
  edgeBandPerM: 1.8, // £ per metre of edge banding
  paintPerM2: 14, // £ per m² for a painted finish
  veneerPremiumPerM2: 9, // £ per m² surcharge for real veneer
  labourBase: 45, // £ fixed setup
  labourPerPanel: 3.5, // £ per panel (machining + handling)
  cncPerSheet: 12, // £ CNC run time per sheet
  margin: 0.35, // 35% markup on cost
};

// Length of edge banding: bandedEdges front edges per panel × its long dimension.
function bandingMetres(panels) {
  let m = 0;
  panels.forEach((p) => {
    const longEdge = Math.max(p.cutW, p.cutH) / 100; // m
    m += longEdge * p.bandedEdges * p.qty;
  });
  return m;
}

function boardAreaM2(panels) {
  let a = 0;
  panels.forEach((p) => {
    a += ((p.cutW / 100) * (p.cutH / 100)) * p.qty;
  });
  return a;
}

export function computePrice(design, nesting, rates = RATES) {
  const { panels, hardware, finish } = design;

  const material18 = nesting.thickSheets * rates.sheet18;
  const material6 = nesting.thinSheets * rates.sheet6;

  const bandM = bandingMetres(panels);
  const banding = bandM * rates.edgeBandPerM;

  // Finish is applied to visible faces (~2× board area is a workable estimate).
  const finishArea = boardAreaM2(panels) * 2;
  const finishCost =
    finish.kind === "veneer" ? finishArea * rates.veneerPremiumPerM2 : finishArea * rates.paintPerM2;

  const hardwareCost = hardware.reduce((s, h) => s + h.qty * h.unit, 0);

  const panelCount = panels.reduce((s, p) => s + p.qty, 0);
  const labour = rates.labourBase + panelCount * rates.labourPerPanel;
  const cnc = nesting.totalSheets * rates.cncPerSheet;

  const cost = material18 + material6 + banding + finishCost + hardwareCost + labour + cnc;
  const price = cost * (1 + rates.margin);

  const lines = [
    { label: "Sheet material (18mm)", detail: `${nesting.thickSheets} × sheet`, value: material18 },
    { label: "Back panel (6mm)", detail: `${nesting.thinSheets} × sheet`, value: material6 },
    { label: "Edge banding", detail: `${bandM.toFixed(1)} m`, value: banding },
    { label: finish.kind === "veneer" ? "Veneer finish" : "Painted finish", detail: `${finishArea.toFixed(1)} m²`, value: finishCost },
    { label: "Hardware", detail: `${hardware.reduce((s, h) => s + h.qty, 0)} pcs`, value: hardwareCost },
    { label: "CNC machining", detail: `${nesting.totalSheets} × sheet`, value: cnc },
    { label: "Labour", detail: `${panelCount} panels`, value: labour },
  ];

  return { lines, cost, margin: price - cost, price, panelCount, bandingMetres: bandM };
}
