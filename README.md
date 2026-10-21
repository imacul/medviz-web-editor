<p align="center">
  <img src="assets/medviz-logo.svg" alt="MedViz logo" width="96" />
</p>

<h1 align="center">MedViz Web Editor</h1>

<p align="center">
  Web-based 3D medical mesh viewer and light clinical editor for fast clinical review.
</p>

## Demo Video
<p align="center">
  <a href="https://youtu.be/Y-ifUgS4R30" target="_blank" rel="noopener noreferrer">
    <img src="https://img.youtube.com/vi/Y-ifUgS4R30/maxresdefault.jpg" alt="Watch MedViz demo video on YouTube" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/Y-ifUgS4R30">Watch MedViz Demo on YouTube</a>
</p>

## Export Report Demo
<p align="center">
  <a href="https://youtu.be/rCmx7AW-bBw" target="_blank" rel="noopener noreferrer">
    <img src="https://img.youtube.com/vi/rCmx7AW-bBw/maxresdefault.jpg" alt="Watch Export Report feature demo on YouTube" width="100%" />
  </a>
</p>

<p align="center">
  <a href="https://youtu.be/rCmx7AW-bBw">Watch Export Report Demo on YouTube</a>
</p>

## Run
```bash
npm install
npm run dev
```

## Tech Stack
- React (Vite)
- JavaScript (ES Modules)
- Three.js (WebGL rendering)
- HTML/CSS (custom clinic-focused UI)
- Node.js + npm (development/build tooling)

## Screenshots
- Folder: [`screenshots/`](./screenshots/)
- This folder contains UI and viewport captures for the project.
- More screenshots will be added here as development continues.

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

## License

MedViz Web Editor's original source code is **source-available** under the [PolyForm Noncommercial License 1.0.0](./LICENSE) (SPDX: `PolyForm-Noncommercial-1.0.0`). It is **not an OSI-approved open-source license**, because the license limits permitted use to noncommercial purposes.

You may inspect, use, modify, and redistribute the code for purposes permitted by the license, including personal learning, research, testing, and qualifying educational use. **Commercial use requires separate permission from the copyright holder.** If you want commercial licensing, contact the project owner through [MedViz 3D](https://medviz3d.com).

**Free demo vs. optional paid services:** The [MedViz 3D demo](https://medviz3d.com/demo) is free to try. Optional paid Pilot Sprint, Clinic Rollout, and custom workflow services cover guided setup, onboarding, hosting, support, and customization. Free access to the hosted demo does not itself grant commercial source-code rights.

**Prior versions and third-party components:** This change does not revoke rights validly granted under earlier releases or licenses (including ISC and AGPL-3.0). Third-party dependencies and assets continue under their respective terms. Only code for which the project owner has adequate licensing rights can be offered under these terms.
