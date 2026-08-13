import { useMemo, useState } from "react";
import { Download, FileText, Boxes } from "lucide-react";
import { computeDesign, DEFAULT_PARAMS } from "./lib/design.js";
import { nest } from "./lib/nesting.js";
import { computePrice } from "./lib/pricing.js";
import { generateGcode } from "./lib/gcode.js";
import { download, cutListCsv, bomCsv, specSummary } from "./lib/exports.js";
import Viewport from "./components/Viewport.jsx";
import Controls from "./components/Controls.jsx";
import ProductionPanel from "./components/ProductionPanel.jsx";

export default function App() {
  const [params, setParams] = useState(DEFAULT_PARAMS);

  const design = useMemo(() => computeDesign(params), [params]);
  const nesting = useMemo(() => nest(design.panels), [design]);
  const price = useMemo(() => computePrice(design, nesting), [design, nesting]);
  const gcode = useMemo(() => generateGcode(design, nesting), [design, nesting]);

  const stamp = `${params.width}x${params.height}x${params.depth}`;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <Boxes size={20} />
          <div>
            <strong>Wardrobe Studio</strong>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="price-pill">
            <span>Est. price</span>
            <strong>£{price.price.toFixed(0)}</strong>
          </div>
          <div className="export-menu">
            <button onClick={() => download(`spec-${stamp}.txt`, specSummary(design, price, nesting))}>
              <FileText size={14} /> Spec
            </button>
            <button onClick={() => download(`cutlist-${stamp}.csv`, cutListCsv(design), "text/csv")}>
              <Download size={14} /> Cut list
            </button>
            <button onClick={() => download(`bom-${stamp}.csv`, bomCsv(design, price), "text/csv")}>
              <Download size={14} /> BOM
            </button>
            <button className="primary" onClick={() => download(`program-${stamp}.nc`, gcode.combined)}>
              <Download size={14} /> G-code
            </button>
          </div>
        </div>
      </header>

      <main className="layout">
        <Viewport design={design} />
        <aside className="sidebar">
          <Controls params={params} setParams={setParams} design={design} />
          <div className="summary">
            <div className="summary-row">
              <span>Sheets</span>
              <span>
                {nesting.thickSheets}× 18mm · {nesting.thinSheets}× 6mm
              </span>
            </div>
            <div className="summary-row">
              <span>Panels</span>
              <span>{price.panelCount}</span>
            </div>
            <div className="summary-row total">
              <span>Estimated price</span>
              <strong>£{price.price.toFixed(0)}</strong>
            </div>
          </div>
        </aside>
      </main>

      <section className="production-wrap">
        <ProductionPanel design={design} nesting={nesting} price={price} gcode={gcode} />
      </section>

      <footer className="foot">
        Prototype · parametric rules and pricing are illustrative. Based on the Custom Wardrobe Configurator PRD.
      </footer>
    </div>
  );
}
