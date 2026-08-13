# Journey · Wardrobe Studio

A web interface for the Custom Wardrobe Configurator PRD — design a wardrobe in
3D, price it live, and export everything the workshop needs to build it.

Built from the original `shelf-configurator.jsx` prototype and extended into a
runnable Vite + React app.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production bundle in dist/
npm run preview
```

## What it does

- **3D configurator** — drag to rotate, scroll to zoom, click a door to open.
  Width / height / depth / shelves, seven finishes, doors and a hanging rail.
- **Parametric rules** — auto-drops shelves below the minimum compartment height
  and adds vertical dividers past the maximum shelf span (with on-screen notes).
- **Live pricing** — a transparent line-by-line quote (material by whole sheets,
  edge banding, finish, hardware, CNC time, labour, margin).
- **Nested cut list** — first-fit-decreasing packing onto 2440×1220 sheets,
  drawn to scale with per-sheet utilisation.
- **Bill of materials** — hardware quantities derived from the geometry.
- **Exports** — job spec (`.txt`), cut list & BOM (`.csv`), and CNC g-code
  (`.nc`, one program per sheet, fixing-hole drilling then profile cuts).

## Architecture

Everything flows from one pure function so the views can never disagree:

```
computeDesign(params)          src/lib/design.js     — single source of truth
  ├─ buildUnit(design)         src/three/            — 3D geometry
  ├─ nest(panels)              src/lib/nesting.js    — sheet packing
  ├─ computePrice(design,nest) src/lib/pricing.js    — quote
  ├─ generateGcode(design,nest)src/lib/gcode.js      — CAM
  └─ cutListCsv / bomCsv ...   src/lib/exports.js    — downloads
```

`src/App.jsx` wires the sliders → `computeDesign` → the viewport, control panel
and tabbed production view (`src/components/`).

## Notes

Prototype: the parametric rules, rates and CAM output are illustrative, not a
post-processor for a specific CNC controller. Dimensions are held in cm
internally and converted to mm for the cut list and g-code.
