# MedViz Web Editor Architecture (v1)

## Frontend Stack
- Vite + React + Three.js
- Single-page app with a modular `src/medviz` domain structure

## Source Layout
- `src/Medical3DCanvas.jsx`
  - Main editor shell and feature orchestration
- `src/medviz/constants/`
  - `themes.js`: visual themes
  - `scenes.js`: scene mode labels
- `src/medviz/controls/`
  - `OrbitControls.js`: camera orbit/pan/zoom
  - `TransformControls.js`: model move/rotate gizmos
- `src/medviz/io/`
  - `modelImport.js`: STL/OBJ/PLY import + normalization pipeline
  - `stlParser.js`: ASCII/Binary STL parsing
  - `stlExport.js`: binary STL export from edited mesh
  - `objExport.js`: OBJ export from edited mesh
  - `reportExport.js`: HTML report template generation
- `src/medviz/scene/`
  - `presets.js`: DNA/Heart/Neural/Cell demo scene builders
- `src/medviz/mesh/`
  - `trim.js`: plane/box trim geometry operations
  - `optimize.js`: large-mesh simplification fallback
- `src/medviz/utils/`
  - `textSprite.js`: 3D labels for measurements/markers
- `src/medviz/styles/`
  - `ui.css`: UI utility styles (including hidden navbar scrollbar)
- `src/medviz/ui/`
  - `TopBar.jsx`
  - `SlicerPanel.jsx`
  - `ToolsPanel.jsx`
  - `ModelInfoPanel.jsx`
  - `StatusBar.jsx`
  - `ToastStack.jsx`

## Runtime Modules
- Scene lifecycle: initialization, render loop, disposal
- Model IO: STL import + normalization + metadata extraction
  - Optional OBJ/PLY import support
- Clinical tools:
  - Slicing/clipping plane
  - Permanent cut + reset
  - Simple trim (plane/box) with undo/redo
  - Measurement (2-point mm labels)
  - Annotation markers (rename/delete/export JSON)
  - Transform tools (move/rotate/scale)
- Export:
  - STL model export
  - OBJ model export
  - PNG viewport export
  - HTML report export
- UI panels:
  - Top toolbar
  - Slicer panel
  - Tools panel
  - Model info panel
  - Bottom status bar

## Performance Notes
- WebGL renderer with local clipping enabled
- Shadow map enabled, can be toggled in future iterations for lower-end systems
- Import pipeline converts meshes to indexed buffer geometry for better render efficiency
- Large models trigger warnings; very large models can be auto-simplified for stability
