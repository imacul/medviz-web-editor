# MedViz Web Editor

Web-based 3D medical mesh viewer and light clinical editor for fast clinic review.

## Run
```bash
npm install
npm run dev
```

## Implemented Scope (v1 progress)
- STL/OBJ/PLY import with metadata extraction (name, format, triangles, vertices, file size, bbox)
- 3D navigation: orbit, pan, zoom, reset camera view
- Clinical slicing workflow: axis + plane position + clipping + apply cut/reset
- Measurement tool: click two surface points, label in mm, clear measurements
- Annotation tool: place markers, rename/delete markers, export markers JSON
- Transform tool: move/rotate/scale imported mesh + reset transform
- Rendering controls: grid, axes, center marker, shadow toggle (default off), wireframe, normal shading
- Export actions: STL/OBJ (validated against empty geometry), viewport PNG, HTML report
- Screenshot export option: include/exclude measurements and markers
- Undo/redo for trim/cut edits (buttons + keyboard shortcuts)
- Performance safeguards: indexed geometry optimization, heavy-model warnings, auto-simplify fallback, hard import limit
- Toast notifications for import/export errors and runtime feedback

## Source Layout
- `src/Medical3DCanvas.jsx`: core orchestration/state + scene lifecycle
- `src/medviz/constants/*`: themes and scene labels
- `src/medviz/controls/*`: custom orbit and transform controls
- `src/medviz/io/*`: model import/export and report helpers
- `src/medviz/scene/*`: generated scene presets
- `src/medviz/ui/*`: top bar, tool panels, model info, status bar, toast stack
- `src/medviz/utils/*`: reusable scene/UI helpers (e.g., text sprites)

## Notes
- Production build currently succeeds with Vite.
- Bundle-size warning is expected because Three.js is loaded in main chunk.
