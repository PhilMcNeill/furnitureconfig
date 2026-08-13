import { Ruler } from "lucide-react";
import { FINISHES, MIN_SHELF_HEIGHT, MAX_SHELF_SPAN } from "../lib/design.js";

function Slider({ label, value, min, max, unit, onChange }) {
  return (
    <div className="slider-row">
      <div className="slider-head">
        <span>{label}</span>
        <span className="slider-val">
          {value}
          {unit}
        </span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}

export default function Controls({ params, setParams, design }) {
  const set = (key) => (v) => setParams((p) => ({ ...p, [key]: v }));
  const { shelvesClamped, actualShelves, dividerCount, canHaveRail, innerHeight } = design;

  return (
    <div className="controls">
      <section>
        <h3>
          <Ruler size={14} /> Dimensions
        </h3>
        <Slider label="Width" value={params.width} min={50} max={240} unit="cm" onChange={set("width")} />
        <Slider label="Height" value={params.height} min={60} max={240} unit="cm" onChange={set("height")} />
        <Slider label="Depth" value={params.depth} min={30} max={65} unit="cm" onChange={set("depth")} />
        <Slider label="Shelves" value={params.shelfCount} min={0} max={8} unit="" onChange={set("shelfCount")} />

        {(shelvesClamped || dividerCount > 0) && (
          <div className="notes">
            {shelvesClamped && (
              <div className="note">
                Reduced to {actualShelves} shelf{actualShelves === 1 ? "" : "s"} per bay — minimum compartment is {MIN_SHELF_HEIGHT}cm
              </div>
            )}
            {dividerCount > 0 && (
              <div className="note">
                Added {dividerCount} vertical divider{dividerCount === 1 ? "" : "s"} — maximum shelf span is {MAX_SHELF_SPAN}cm
              </div>
            )}
          </div>
        )}
      </section>

      <section>
        <h3>Finish</h3>
        <div className="swatches">
          {FINISHES.map((f) => (
            <button
              key={f.id}
              title={f.name}
              onClick={() => set("finishId")(f.id)}
              className={"swatch" + (params.finishId === f.id ? " active" : "")}
              style={
                f.isTexture
                  ? { background: "linear-gradient(135deg,#e8dcc4,#cdb890)" }
                  : { background: f.hex }
              }
            />
          ))}
        </div>
        <div className="finish-name">{design.finish.name}</div>
      </section>

      <section>
        <label className="toggle">
          <span>Add doors</span>
          <input type="checkbox" checked={params.showDoors} onChange={(e) => set("showDoors")(e.target.checked)} />
        </label>
        <label className={"toggle" + (canHaveRail ? "" : " disabled")}>
          <span>
            Hanging rail
            {!canHaveRail && <em> · needs {90}cm clear</em>}
          </span>
          <input
            type="checkbox"
            checked={params.hangingRail}
            disabled={innerHeight < 90}
            onChange={(e) => set("hangingRail")(e.target.checked)}
          />
        </label>
      </section>
    </div>
  );
}
