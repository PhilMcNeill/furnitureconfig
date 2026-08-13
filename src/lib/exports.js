// ---------------------------------------------------------------------------
// exports.js — build the downloadable artefacts and trigger browser downloads.
// ---------------------------------------------------------------------------

export function download(filename, text, mime = "text/plain") {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const csvCell = (v) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (rows) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

const toMm = (cm) => Math.round(cm * 10);

export function cutListCsv(design) {
  const rows = [["Qty", "Part", "Width (mm)", "Length (mm)", "Material", "Banded edges", "Grain"]];
  design.panels.forEach((p) => {
    rows.push([p.qty, p.label, toMm(p.cutW), toMm(p.cutH), p.thin ? "6mm" : "18mm", p.bandedEdges, p.grain]);
  });
  return toCsv(rows);
}

export function bomCsv(design, price) {
  const rows = [["Section", "Item", "Qty", "Unit", "Unit £", "Line £"]];
  design.panels.forEach((p) =>
    rows.push(["Panel", p.label, p.qty, `${toMm(p.cutW)}×${toMm(p.cutH)}mm`, "", ""])
  );
  design.hardware.forEach((h) =>
    rows.push(["Hardware", h.label, h.qty, "pcs", h.unit.toFixed(2), (h.qty * h.unit).toFixed(2)])
  );
  rows.push([]);
  price.lines.forEach((l) => rows.push(["Cost", l.label, l.detail, "", "", l.value.toFixed(2)]));
  rows.push(["Cost", "Subtotal", "", "", "", price.cost.toFixed(2)]);
  rows.push(["Cost", "Margin", "", "", "", price.margin.toFixed(2)]);
  rows.push(["Price", "Total (inc. margin)", "", "", "", price.price.toFixed(2)]);
  return toCsv(rows);
}

export function specSummary(design, price, nesting) {
  const p = design.params;
  return [
    "WARDROBE STUDIO — job specification",
    "",
    `Dimensions   : ${p.width} × ${p.height} × ${p.depth} cm (W×H×D)`,
    `Finish       : ${design.finish.name}`,
    `Columns      : ${design.columns}  (${design.dividerCount} divider(s))`,
    `Shelves      : ${design.shelvesTotal}`,
    `Doors        : ${design.doorLeaves} leaf/leaves`,
    `Hanging rail : ${design.railCount ? `${design.railCount} rail(s)` : "none"}`,
    "",
    `Sheets       : ${nesting.thickSheets} × 18mm, ${nesting.thinSheets} × 6mm`,
    `Nesting util.: ${(nesting.avgUtil * 100).toFixed(0)}% average`,
    "",
    `Estimated price: £${price.price.toFixed(0)}  (cost £${price.cost.toFixed(0)} + margin £${price.margin.toFixed(0)})`,
  ].join("\n");
}
