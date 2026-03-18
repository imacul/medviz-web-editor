export const loadEditorPage = () => import('./EditorPage');

export const loadMedical3DCanvas = () => import('../Medical3DCanvas.jsx');

export const loadModelImportModule = () => import('../medviz/io/modelImport');

export const warmEditorExperience = () =>
  Promise.all([loadEditorPage(), loadMedical3DCanvas(), loadModelImportModule()]);
