// SVG render of the nested sheets — the same coordinates the g-code cuts.
const PART_FILL = {
  side: "#c9b79c",
  topbot: "#d7c8ac",
  back: "#b7c4b0",
  divider: "#cdbb9a",
  shelf: "#e0d3b6",
  door: "#bfa987",
};

export default function NestingView({ nesting }) {
  const { boards, sheet } = nesting;
  const scale = 1.4; // px per cm on screen
  return (
    <div className="nesting">
      {boards.map((b, i) => (
        <div className="board" key={i}>
          <div className="board-head">
            <span>
              Sheet {i + 1} · {b.stock}
            </span>
            <span className="muted">{(b.utilization * 100).toFixed(0)}% used</span>
          </div>
          <svg
            viewBox={`0 0 ${sheet.width} ${sheet.height}`}
            width={sheet.width * scale}
            height={sheet.height * scale}
            className="board-svg"
          >
            <rect x="0" y="0" width={sheet.width} height={sheet.height} className="sheet-bg" />
            {b.placements.map((p, j) => (
              <g key={j}>
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.w}
                  height={p.h}
                  fill={p.oversize ? "#d98a8a" : PART_FILL[p.key] || "#ccc"}
                  stroke="#6b5f49"
                  strokeWidth="0.4"
                />
                {p.w > 16 && p.h > 8 && (
                  <text x={p.x + p.w / 2} y={p.y + p.h / 2} className="part-label">
                    {p.label}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      ))}
    </div>
  );
}
