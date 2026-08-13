import { useState } from "react";
import { Table2, LayoutGrid, Wrench, PoundSterling, Code2 } from "lucide-react";
import NestingView from "./NestingView.jsx";

const TABS = [
  { id: "cut", label: "Cut list", icon: Table2 },
  { id: "nest", label: "Nesting", icon: LayoutGrid },
  { id: "bom", label: "Bill of materials", icon: Wrench },
  { id: "price", label: "Pricing", icon: PoundSterling },
  { id: "gcode", label: "G-code", icon: Code2 },
];

const money = (n) => "£" + n.toFixed(2);

export default function ProductionPanel({ design, nesting, price, gcode }) {
  const [tab, setTab] = useState("cut");

  return (
    <div className="production">
      <div className="tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} className={"tab" + (tab === t.id ? " active" : "")} onClick={() => setTab(t.id)}>
              <Icon size={14} /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="tab-body">
        {tab === "cut" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Qty</th>
                <th>Part</th>
                <th>Size (mm)</th>
                <th>Material</th>
                <th>Edges banded</th>
              </tr>
            </thead>
            <tbody>
              {design.panels.map((p) => (
                <tr key={p.key}>
                  <td>{p.qty}×</td>
                  <td>{p.label}</td>
                  <td className="mono">
                    {Math.round(p.cutW * 10)} × {Math.round(p.cutH * 10)}
                  </td>
                  <td>{p.thin ? "6mm" : "18mm"}</td>
                  <td>{p.bandedEdges}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "nest" && (
          <>
            <p className="tab-intro">
              {nesting.thickSheets} × 18mm + {nesting.thinSheets} × 6mm sheets ·{" "}
              {(nesting.avgUtil * 100).toFixed(0)}% average utilisation. Parts laid out on{" "}
              {nesting.sheet.width * 10}×{nesting.sheet.height * 10}mm stock.
            </p>
            <NestingView nesting={nesting} />
          </>
        )}

        {tab === "bom" && (
          <table className="data-table">
            <thead>
              <tr>
                <th>Hardware</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Line</th>
              </tr>
            </thead>
            <tbody>
              {design.hardware.map((h) => (
                <tr key={h.key}>
                  <td>{h.label}</td>
                  <td>{h.qty}</td>
                  <td className="mono">{money(h.unit)}</td>
                  <td className="mono">{money(h.qty * h.unit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === "price" && (
          <table className="data-table price-table">
            <tbody>
              {price.lines.map((l) => (
                <tr key={l.label}>
                  <td>{l.label}</td>
                  <td className="muted">{l.detail}</td>
                  <td className="mono num">{money(l.value)}</td>
                </tr>
              ))}
              <tr className="subtotal">
                <td>Subtotal (cost)</td>
                <td></td>
                <td className="mono num">{money(price.cost)}</td>
              </tr>
              <tr>
                <td>Margin (35%)</td>
                <td></td>
                <td className="mono num">{money(price.margin)}</td>
              </tr>
              <tr className="grand">
                <td>Quoted price</td>
                <td></td>
                <td className="mono num">{money(price.price)}</td>
              </tr>
            </tbody>
          </table>
        )}

        {tab === "gcode" && (
          <div className="gcode">
            <p className="tab-intro">
              {gcode.programs.length} program{gcode.programs.length === 1 ? "" : "s"} — one per sheet, with fixing-hole
              drilling then profile cuts. Preview of sheet 1:
            </p>
            <pre className="gcode-pre">{gcode.programs[0]?.text || "( no parts )"}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
