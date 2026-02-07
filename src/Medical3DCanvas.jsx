import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { THEMES } from './medviz/constants/themes';
import { SCENE_NAMES } from './medviz/constants/scenes';
import { importModelFile, isSupportedModelFile } from './medviz/io/modelImport';
import { meshToBinarySTL } from './medviz/io/stlExport';
import { meshToOBJ } from './medviz/io/objExport';
import { buildHtmlReport } from './medviz/io/reportExport';
import medvizLogo from '../assets/medviz-logo.svg';
import './medviz/styles/ui.css';
import { createTextSprite } from './medviz/utils/textSprite';
import {
  createCellDivisionScene,
  createDNAHelixScene,
  createHeartBeatScene,
  createNeuralNetworkScene
} from './medviz/scene/presets';
import { makeAxisPlane, trimGeometryByBox, trimGeometryByPlane } from './medviz/mesh/trim';
import { simplifyGeometryToTargetTriangles } from './medviz/mesh/optimize';

import { OrbitControls } from './medviz/controls/OrbitControls';
import { TransformControls } from './medviz/controls/TransformControls';
import TopBar from './medviz/ui/TopBar';
import SlicerPanel from './medviz/ui/SlicerPanel';
import ToolsPanel from './medviz/ui/ToolsPanel';
import ModelInfoPanel from './medviz/ui/ModelInfoPanel';
import StatusBar from './medviz/ui/StatusBar';
import ToastStack from './medviz/ui/ToastStack';

const Medical3DCanvas = () => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const objectsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const [activeScene, setActiveScene] = useState(0);
  const [activeTheme, setActiveTheme] = useState(0);
  const [importedModel, setImportedModel] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [slicingEnabled, setSlicingEnabled] = useState(false);
  const [slicePosition, setSlicePosition] = useState(0);
  const [sliceAxis, setSliceAxis] = useState('y'); // x, y, or z
  const [showSlicePlane, setShowSlicePlane] = useState(true);
  const [showSlicerPanel, setShowSlicerPanel] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [showModelInfoPanel, setShowModelInfoPanel] = useState(true);
  const [transformMode, setTransformMode] = useState('translate'); // 'translate' or 'rotate'
  const [gizmosEnabled, setGizmosEnabled] = useState(false);
  const [cutApplied, setCutApplied] = useState(false);
  const [modelMeta, setModelMeta] = useState(null);
  const clippingPlaneRef = useRef(null);
  const slicePlaneHelperRef = useRef(null);
  const persistentModelRef = useRef(null);
  const transformControlsRef = useRef(null);
  const originalGeometryRef = useRef(null);
  const gridHelperRef = useRef(null);
  const axesHelperRef = useRef(null);
  const groundRef = useRef(null);
  const centerMarkerRef = useRef(null);
  const trimBoxHelperRef = useRef(null);
  const trimHistoryRef = useRef([]);
  const trimRedoRef = useRef([]);
  const raycasterRef = useRef(new THREE.Raycaster());
  const measurementDraftRef = useRef([]);
  const measurementObjectMapRef = useRef(new Map());
  const markerObjectMapRef = useRef(new Map());
  const fpsRef = useRef({ frames: 0, last: performance.now(), value: 60 });
  const markerCounterRef = useRef(1);
  const idCounterRef = useRef(1);

  const [activeTool, setActiveTool] = useState('slice');
  const [measurements, setMeasurements] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [shadowsEnabled, setShadowsEnabled] = useState(false);
  const [gridVisible, setGridVisible] = useState(true);
  const [axesVisible, setAxesVisible] = useState(true);
  const [wireframeEnabled, setWireframeEnabled] = useState(false);
  const [shadingMode, setShadingMode] = useState('solid');
  const [centerMarkerVisible, setCenterMarkerVisible] = useState(true);
  const [trimMode, setTrimMode] = useState('plane');
  const [trimPlaneSide, setTrimPlaneSide] = useState('positive');
  const [trimBoxSize, setTrimBoxSize] = useState(3);
  const [trimBoxKeep, setTrimBoxKeep] = useState('inside');
  const [showTrimBox, setShowTrimBox] = useState(true);
  const [trimHistoryDepth, setTrimHistoryDepth] = useState(0);
  const [trimRedoDepth, setTrimRedoDepth] = useState(0);
  const [includeOverlaysInScreenshot, setIncludeOverlaysInScreenshot] = useState(true);
  const [fps, setFps] = useState(60);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    let favicon = document.querySelector("link[rel='icon']");
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.setAttribute('rel', 'icon');
      document.head.appendChild(favicon);
    }
    favicon.setAttribute('type', 'image/svg+xml');
    favicon.setAttribute('href', medvizLogo);
  }, []);

  // Apply permanent cut to the geometry
  const applyPermanentCut = () => {
    if (!persistentModelRef.current || !clippingPlaneRef.current) return;

    const mesh = persistentModelRef.current;
    const nextGeometry = trimGeometryByPlane(mesh.geometry, clippingPlaneRef.current, 'positive', 0.001);
    if (!nextGeometry) {
      pushToast('Cut removed all geometry. Adjust plane and try again.');
      return;
    }

    if (!originalGeometryRef.current) {
      originalGeometryRef.current = mesh.geometry.clone();
    }

    pushTrimHistory();
    mesh.geometry.dispose();
    mesh.geometry = nextGeometry;

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        mat.clippingPlanes = [];
        mat.needsUpdate = true;
      });
    } else {
      mesh.material.clippingPlanes = [];
      mesh.material.needsUpdate = true;
    }

    setCutApplied(true);
  };

  // Reset to original geometry
  const resetCut = () => {
    if (!persistentModelRef.current || !originalGeometryRef.current) return;
    
    const mesh = persistentModelRef.current;
    mesh.geometry.dispose();
    mesh.geometry = originalGeometryRef.current.clone();
    
    // Remove clipping
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        mat.clippingPlanes = [];
        mat.needsUpdate = true;
      });
    } else {
      mesh.material.clippingPlanes = [];
      mesh.material.needsUpdate = true;
    }
    
    setCutApplied(false);
    setSlicingEnabled(false);
    clearTrimHistory();
  };

  const sceneNames = SCENE_NAMES;
  const themes = THEMES;
  const LARGE_MODEL_TRIANGLES = 300000;
  const SIMPLIFY_TRIANGLES_THRESHOLD = 1000000;
  const SIMPLIFY_TRIANGLES_TARGET = 850000;
  const HARD_TRIANGLE_LIMIT = 2500000;

  const getGeometryStats = (geometry) => {
    if (!geometry.boundingBox) {
      geometry.computeBoundingBox();
    }

    const position = geometry.getAttribute('position');
    const vertices = position?.count ?? 0;
    const triangles = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(vertices / 3);
    const bounds = geometry.boundingBox;

    return {
      vertices,
      triangles,
      bounds: {
        x: ((bounds?.max.x ?? 0) - (bounds?.min.x ?? 0)).toFixed(2),
        y: ((bounds?.max.y ?? 0) - (bounds?.min.y ?? 0)).toFixed(2),
        z: ((bounds?.max.z ?? 0) - (bounds?.min.z ?? 0)).toFixed(2)
      }
    };
  };

  const pushToast = (message) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  };

  const downloadBlob = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const setMeasurementAndMarkerVisibility = (visible) => {
    measurementDraftRef.current.forEach((draft) => {
      if (draft.marker) draft.marker.visible = visible;
    });

    for (const item of measurementObjectMapRef.current.values()) {
      if (item.line) item.line.visible = visible;
      if (item.label) item.label.visible = visible;
      item.markers?.forEach((marker) => {
        marker.visible = visible;
      });
    }

    for (const item of markerObjectMapRef.current.values()) {
      if (item.sphere) item.sphere.visible = visible;
      if (item.sprite) item.sprite.visible = visible;
    }
  };

  const captureScreenshotDataUrl = (includeOverlays = true) => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      throw new Error('Renderer is not ready.');
    }

    const shouldTemporarilyHideOverlays = !includeOverlays;
    if (shouldTemporarilyHideOverlays) {
      setMeasurementAndMarkerVisibility(false);
    }

    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');

    if (shouldTemporarilyHideOverlays) {
      setMeasurementAndMarkerVisibility(true);
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    }

    return dataUrl;
  };

  const exportCurrentModelStl = () => {
    const mesh = persistentModelRef.current;
    if (!mesh) {
      pushToast('Import a model first.');
      return;
    }
    if (!mesh.geometry?.attributes?.position || mesh.geometry.attributes.position.count < 3) {
      pushToast('Cannot export empty geometry.');
      return;
    }
    try {
      const buffer = meshToBinarySTL(mesh);
      const blob = new Blob([buffer], { type: 'model/stl' });
      const safeName = (modelMeta?.name || 'medviz-model.stl').replace(/\s+/g, '_');
      downloadBlob(blob, safeName.toLowerCase().endsWith('.stl') ? safeName : `${safeName}.stl`);
      pushToast('STL exported.');
    } catch (error) {
      console.error('Failed to export STL:', error);
      pushToast('STL export failed.');
    }
  };

  const exportCurrentModelObj = () => {
    const mesh = persistentModelRef.current;
    if (!mesh) {
      pushToast('Import a model first.');
      return;
    }
    if (!mesh.geometry?.attributes?.position || mesh.geometry.attributes.position.count < 3) {
      pushToast('Cannot export empty geometry.');
      return;
    }
    try {
      const content = meshToOBJ(mesh);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const safeName = (modelMeta?.name || 'medviz-model').replace(/\.[^.]+$/, '').replace(/\s+/g, '_');
      downloadBlob(blob, `${safeName}.obj`);
      pushToast('OBJ exported.');
    } catch (error) {
      console.error('Failed to export OBJ:', error);
      pushToast('OBJ export failed.');
    }
  };

  const exportScreenshot = () => {
    try {
      const url = captureScreenshotDataUrl(includeOverlaysInScreenshot);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `medviz-screenshot-${Date.now()}.png`;
      anchor.click();
      pushToast('Screenshot exported.');
    } catch (error) {
      console.error('Failed to export screenshot:', error);
      pushToast('Screenshot export failed.');
    }
  };

  const exportReportHtml = () => {
    try {
      const screenshotDataUrl = captureScreenshotDataUrl(includeOverlaysInScreenshot);
      const html = buildHtmlReport({
        modelMeta,
        measurements,
        markers,
        screenshotDataUrl
      });
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      downloadBlob(blob, `medviz-report-${Date.now()}.html`);
      pushToast('HTML report exported.');
    } catch (error) {
      console.error('Failed to export report:', error);
      pushToast('Report export failed.');
    }
  };

  const exportMarkersJson = () => {
    try {
      const payload = markers.map((m) => ({
        id: m.id,
        label: m.label,
        position: m.position
      }));
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `medviz-markers-${Date.now()}.json`);
      pushToast('Marker JSON exported.');
    } catch (error) {
      console.error('Failed to export markers JSON:', error);
      pushToast('Marker JSON export failed.');
    }
  };

  const resetCameraView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    cameraRef.current.position.set(8, 6, 10);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  };

  const clearTrimHistory = () => {
    trimHistoryRef.current.forEach((geometry) => geometry.dispose());
    trimHistoryRef.current = [];
    setTrimHistoryDepth(0);
    trimRedoRef.current.forEach((geometry) => geometry.dispose());
    trimRedoRef.current = [];
    setTrimRedoDepth(0);
  };

  const pushTrimHistory = (clearRedo = true) => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry) return;
    if (clearRedo) {
      trimRedoRef.current.forEach((geometry) => geometry.dispose());
      trimRedoRef.current = [];
      setTrimRedoDepth(0);
    }
    trimHistoryRef.current.push(mesh.geometry.clone());
    if (trimHistoryRef.current.length > 20) {
      const removed = trimHistoryRef.current.shift();
      removed?.dispose();
    }
    setTrimHistoryDepth(trimHistoryRef.current.length);
  };

  const applySimpleTrim = () => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry) {
      pushToast('Import a model first.');
      return;
    }

    let nextGeometry = null;

    if (trimMode === 'plane') {
      const plane = makeAxisPlane(sliceAxis, slicePosition);
      nextGeometry = trimGeometryByPlane(mesh.geometry, plane, trimPlaneSide);
    } else {
      const half = trimBoxSize / 2;
      const box = new THREE.Box3(
        new THREE.Vector3(-half, -half, -half),
        new THREE.Vector3(half, half, half)
      );
      nextGeometry = trimGeometryByBox(mesh.geometry, box, trimBoxKeep === 'inside');
    }

    if (!nextGeometry) {
      pushToast('Trim removed all geometry. Adjust parameters and try again.');
      return;
    }

    pushTrimHistory();
    mesh.geometry.dispose();
    mesh.geometry = nextGeometry;
    mesh.material.needsUpdate = true;
    setCutApplied(true);
    pushToast('Trim applied.');
  };

  const undoTrim = () => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry || trimHistoryRef.current.length === 0) {
      pushToast('Nothing to undo.');
      return;
    }

    trimRedoRef.current.push(mesh.geometry.clone());
    if (trimRedoRef.current.length > 20) {
      const removedRedo = trimRedoRef.current.shift();
      removedRedo?.dispose();
    }

    const previous = trimHistoryRef.current.pop();
    setTrimHistoryDepth(trimHistoryRef.current.length);
    setTrimRedoDepth(trimRedoRef.current.length);
    mesh.geometry.dispose();
    mesh.geometry = previous;
    mesh.material.needsUpdate = true;
    setCutApplied(true);
    pushToast('Trim undo applied.');
  };

  const redoTrim = () => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry || trimRedoRef.current.length === 0) {
      pushToast('Nothing to redo.');
      return;
    }

    pushTrimHistory(false);
    const next = trimRedoRef.current.pop();
    setTrimRedoDepth(trimRedoRef.current.length);
    mesh.geometry.dispose();
    mesh.geometry = next;
    mesh.material.needsUpdate = true;
    setCutApplied(true);
    pushToast('Trim redo applied.');
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (target.isContentEditable || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
          return;
        }
      }

      const key = event.key.toLowerCase();
      const hasModifier = event.ctrlKey || event.metaKey;
      const isUndo = hasModifier && key === 'z' && !event.shiftKey;
      const isRedo = (hasModifier && key === 'y') || (hasModifier && key === 'z' && event.shiftKey);

      if (!isUndo && !isRedo) return;
      if (activeScene !== 4 || !persistentModelRef.current) return;

      event.preventDefault();
      if (isUndo) undoTrim();
      if (isRedo) redoTrim();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeScene, undoTrim, redoTrim]);

  const makeMeasureLabel = (text, position) => {
    const label = createTextSprite(text, {
      fontSize: 28,
      padding: 12,
      border: '#00d3ff',
      background: 'rgba(8,16,28,0.85)'
    });
    label.position.copy(position);
    return label;
  };

  const clearMeasurements = (silent = false) => {
    const scene = sceneRef.current;
    if (!scene) return;

    measurementDraftRef.current.forEach((draft) => {
      scene.remove(draft.marker);
      draft.marker.geometry.dispose();
      draft.marker.material.dispose();
    });
    measurementDraftRef.current = [];

    for (const item of measurementObjectMapRef.current.values()) {
      item.markers.forEach((marker) => {
        scene.remove(marker);
        marker.geometry.dispose();
        marker.material.dispose();
      });
      scene.remove(item.line);
      item.line.geometry.dispose();
      item.line.material.dispose();
      scene.remove(item.label);
      item.label.material.map.dispose();
      item.label.material.dispose();
    }
    measurementObjectMapRef.current.clear();
    setMeasurements([]);
    if (!silent) pushToast('Measurements cleared.');
  };

  const addMeasurementPoint = (point) => {
    if (!sceneRef.current) return;
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x00d3ff, emissive: 0x00445f, emissiveIntensity: 0.4 })
    );
    marker.position.copy(point);
    sceneRef.current.add(marker);
    measurementDraftRef.current.push({ marker, point: point.clone() });

    if (measurementDraftRef.current.length < 2) return;

    const [a, b] = measurementDraftRef.current;
    const id = `msr-${idCounterRef.current++}`;
    const distance = a.point.distanceTo(b.point);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a.point, b.point]),
      new THREE.LineBasicMaterial({ color: 0x00d3ff })
    );
    sceneRef.current.add(line);
    const mid = a.point.clone().add(b.point).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.1, 0));
    const label = makeMeasureLabel(`${distance.toFixed(2)} mm`, mid);
    sceneRef.current.add(label);

    measurementObjectMapRef.current.set(id, { id, line, label, markers: [a.marker, b.marker], distance });
    measurementDraftRef.current = [];
    setMeasurements((prev) => [...prev, { id, distanceMm: distance }]);
  };

  const addMarkerAtPoint = (point) => {
    if (!sceneRef.current) return;
    const id = `mk-${idCounterRef.current++}`;
    const label = `Marker ${markerCounterRef.current++}`;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0x663d00, emissiveIntensity: 0.3 })
    );
    sphere.position.copy(point);
    const sprite = createTextSprite(label, { fontSize: 28, padding: 12, border: '#ffb703', background: 'rgba(30,20,6,0.85)' });
    sprite.position.copy(point).add(new THREE.Vector3(0, 0.14, 0));
    sceneRef.current.add(sphere);
    sceneRef.current.add(sprite);
    markerObjectMapRef.current.set(id, { sphere, sprite });
    setMarkers((prev) => [...prev, { id, label, position: { x: point.x, y: point.y, z: point.z } }]);
  };

  const renameMarker = (id, newLabel) => {
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, label: newLabel } : m)));
    const obj = markerObjectMapRef.current.get(id);
    if (!obj || !sceneRef.current) return;
    sceneRef.current.remove(obj.sprite);
    obj.sprite.material.map.dispose();
    obj.sprite.material.dispose();
    const sprite = createTextSprite(newLabel, { fontSize: 28, padding: 12, border: '#ffb703', background: 'rgba(30,20,6,0.85)' });
    sprite.position.copy(obj.sphere.position).add(new THREE.Vector3(0, 0.14, 0));
    sceneRef.current.add(sprite);
    obj.sprite = sprite;
  };

  const deleteMarker = (id) => {
    const obj = markerObjectMapRef.current.get(id);
    if (!obj || !sceneRef.current) return;
    sceneRef.current.remove(obj.sphere);
    sceneRef.current.remove(obj.sprite);
    obj.sphere.geometry.dispose();
    obj.sphere.material.dispose();
    obj.sprite.material.map.dispose();
    obj.sprite.material.dispose();
    markerObjectMapRef.current.delete(id);
    setMarkers((prev) => prev.filter((m) => m.id !== id));
  };

  const clearMarkers = (silent = false) => {
    if (!sceneRef.current) return;
    for (const [id] of markerObjectMapRef.current) {
      deleteMarker(id);
    }
    setMarkers([]);
    if (!silent) pushToast('Markers cleared.');
  };

  const loadModel = async (file) => {
    setIsImporting(true);
    try {
      const imported = await importModelFile(file);
      let geometry = imported.geometry;
      let meta = imported.modelMeta;
      const { extension } = imported;

      if (meta.triangles > HARD_TRIANGLE_LIMIT) {
        geometry.dispose();
        throw new Error(
          `Model too large (${meta.triangles.toLocaleString()} triangles). Please simplify before importing.`
        );
      }

      if (meta.triangles > SIMPLIFY_TRIANGLES_THRESHOLD) {
        try {
          const simplified = simplifyGeometryToTargetTriangles(geometry, SIMPLIFY_TRIANGLES_TARGET);
          geometry.dispose();
          geometry = simplified;
          const stats = getGeometryStats(geometry);
          meta = {
            ...meta,
            vertices: stats.vertices,
            triangles: stats.triangles,
            bounds: stats.bounds
          };
          pushToast(
            `Large model simplified to ${stats.triangles.toLocaleString()} triangles for smoother interaction.`
          );
        } catch (simplifyError) {
          console.error('Simplification failed:', simplifyError);
          pushToast('Could not simplify large model automatically. Loading original geometry.');
        }
      } else if (meta.triangles > LARGE_MODEL_TRIANGLES) {
        pushToast(`Large model detected (${meta.triangles.toLocaleString()} triangles). Performance may degrade.`);
      }

      const material = new THREE.MeshStandardMaterial({
        color: 0xb8c2cc,
        metalness: 0.15,
        roughness: 0.45,
        flatShading: false,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      if (persistentModelRef.current && persistentModelRef.current !== mesh) {
        if (sceneRef.current) {
          sceneRef.current.remove(persistentModelRef.current);
        }
        persistentModelRef.current.geometry?.dispose();
        if (Array.isArray(persistentModelRef.current.material)) {
          persistentModelRef.current.material.forEach((mat) => mat.dispose());
        } else {
          persistentModelRef.current.material?.dispose();
        }
      }

      originalGeometryRef.current = null;
      setCutApplied(false);
      setSlicingEnabled(false);
      clearMeasurements(true);
      clearMarkers(true);
      clearTrimHistory();

      persistentModelRef.current = mesh;
      setImportedModel(mesh);
      setActiveScene(4);
      setModelMeta({ ...meta, extension });
      pushToast(`${extension.toUpperCase()} model imported.`);
    } catch (error) {
      console.error('Error loading model:', error);
      pushToast(error?.message || 'Failed to load model. Please choose a valid STL/OBJ/PLY file.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && isSupportedModelFile(file)) {
      await loadModel(file);
    } else {
      pushToast('Please select a valid STL, OBJ, or PLY file.');
    }
    event.target.value = '';
  };

  // Update clipping plane when slicing parameters change
  useEffect(() => {
    if (!clippingPlaneRef.current || !slicePlaneHelperRef.current) return;

    const plane = clippingPlaneRef.current;
    const helper = slicePlaneHelperRef.current;

    // Update plane normal based on axis
    if (sliceAxis === 'x') {
      plane.normal.set(-1, 0, 0);
      helper.rotation.set(0, 0, Math.PI / 2);
    } else if (sliceAxis === 'y') {
      plane.normal.set(0, -1, 0);
      helper.rotation.set(0, 0, 0);
    } else if (sliceAxis === 'z') {
      plane.normal.set(0, 0, -1);
      helper.rotation.set(Math.PI / 2, 0, 0);
    }

    // Update plane position
    plane.constant = slicePosition;
    
    // Update helper position
    if (sliceAxis === 'x') {
      helper.position.set(slicePosition, 0, 0);
    } else if (sliceAxis === 'y') {
      helper.position.set(0, slicePosition, 0);
    } else if (sliceAxis === 'z') {
      helper.position.set(0, 0, slicePosition);
    }

    // Show/hide helper
    helper.visible = slicingEnabled && showSlicePlane;

    // Apply clipping to all objects
    objectsRef.current.forEach(obj => {
      obj.traverse((child) => {
        if (child.isMesh && child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          if (slicingEnabled) {
            materials.forEach((mat) => {
              mat.clippingPlanes = [plane];
              mat.clipShadows = true;
              mat.needsUpdate = true;
            });
          } else {
            materials.forEach((mat) => {
              mat.clippingPlanes = [];
              mat.needsUpdate = true;
            });
          }
        }
      });
    });
  }, [slicingEnabled, slicePosition, sliceAxis, showSlicePlane]);

  // Control transform gizmos
  useEffect(() => {
    if (!transformControlsRef.current) return;
    
    if (gizmosEnabled && persistentModelRef.current && activeScene === 4) {
      transformControlsRef.current.setObject(persistentModelRef.current);
      transformControlsRef.current.setMode(transformMode);
      transformControlsRef.current.enable();
    } else {
      transformControlsRef.current.disable();
    }
  }, [gizmosEnabled, transformMode, activeScene]);

  useEffect(() => {
    if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;
    const dom = rendererRef.current.domElement;

    const handlePointerDown = (event) => {
      if (activeTool !== 'measure' && activeTool !== 'annotate') return;
      if (!sceneRef.current || !cameraRef.current) return;

      const rect = dom.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycasterRef.current.setFromCamera({ x, y }, cameraRef.current);

      const meshes = [];
      objectsRef.current.forEach((root) => {
        root.traverse((child) => {
          if (child.isMesh && child.visible) meshes.push(child);
        });
      });
      if (meshes.length === 0) return;

      const intersections = raycasterRef.current.intersectObjects(meshes, true);
      if (intersections.length === 0) {
        pushToast('Click on the model surface.');
        return;
      }

      const hitPoint = intersections[0].point.clone();
      if (activeTool === 'measure') addMeasurementPoint(hitPoint);
      if (activeTool === 'annotate') addMarkerAtPoint(hitPoint);
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    return () => dom.removeEventListener('pointerdown', handlePointerDown);
  }, [activeTool, activeScene, importedModel]);

  useEffect(() => {
    if (!gridHelperRef.current || !axesHelperRef.current) return;
    gridHelperRef.current.visible = gridVisible;
    axesHelperRef.current.visible = axesVisible;
  }, [gridVisible, axesVisible]);

  useEffect(() => {
    if (!centerMarkerRef.current) return;
    centerMarkerRef.current.visible = centerMarkerVisible;
  }, [centerMarkerVisible]);

  useEffect(() => {
    if (!trimBoxHelperRef.current) return;

    const helper = trimBoxHelperRef.current;
    const half = trimBoxSize / 2;
    helper.box.min.set(-half, -half, -half);
    helper.box.max.set(half, half, half);
    helper.visible =
      activeTool === 'trim' &&
      trimMode === 'box' &&
      showTrimBox &&
      activeScene === 4 &&
      Boolean(persistentModelRef.current);
    helper.updateMatrixWorld(true);
  }, [activeTool, trimMode, showTrimBox, trimBoxSize, activeScene, importedModel]);

  useEffect(() => {
    if (!rendererRef.current) return;
    rendererRef.current.shadowMap.enabled = shadowsEnabled;
  }, [shadowsEnabled]);

  useEffect(() => {
    const applyMaterialModes = (obj) => {
      obj.traverse((child) => {
        if (!child.isMesh || !child.material) return;
        if (Array.isArray(child.material)) return;

        if (shadingMode === 'normal') {
          if (!child.userData.__originalMaterial) {
            child.userData.__originalMaterial = child.material;
            child.material = new THREE.MeshNormalMaterial({ wireframe: wireframeEnabled });
          } else {
            child.material.wireframe = wireframeEnabled;
          }
        } else if (child.userData.__originalMaterial) {
          if (child.material !== child.userData.__originalMaterial) {
            child.material.dispose();
          }
          child.material = child.userData.__originalMaterial;
          child.userData.__originalMaterial = null;
          child.material.wireframe = wireframeEnabled;
        } else {
          child.material.wireframe = wireframeEnabled;
        }
        child.material.needsUpdate = true;
      });
    };
    objectsRef.current.forEach(applyMaterialModes);
  }, [wireframeEnabled, shadingMode, activeScene, importedModel]);

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current) return;

    const theme = themes[activeTheme];

    // Update scene colors without recreating
    sceneRef.current.background = new THREE.Color(theme.background);
    sceneRef.current.fog = new THREE.Fog(theme.fog, 20, 50);
    rendererRef.current.setClearColor(theme.background, 1);

    // Update grid and ground colors
    sceneRef.current.traverse((object) => {
      if (object.isGridHelper) {
        object.material.color.setHex(theme.grid.primary);
      }
      if (object.isMesh && object.geometry.type === 'PlaneGeometry' && object.position.y === -3) {
        if (object.material.color?.setHex) {
          object.material.color.setHex(theme.ground);
        }
      }
    });

  }, [activeTheme]);

  // Initial scene setup - runs once
  useEffect(() => {
    if (!containerRef.current) return;

    const theme = themes[activeTheme];

    // Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.background);
    scene.fog = new THREE.Fog(theme.fog, 20, 50);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(8, 6, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = shadowsEnabled;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    renderer.setClearColor(theme.background, 1);
    renderer.localClippingEnabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create clipping plane
    const clippingPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    clippingPlaneRef.current = clippingPlane;

    // Create visual plane helper
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6b6b,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.3,
      depthWrite: false
    });
    const planeHelper = new THREE.Mesh(planeGeometry, planeMaterial);
    planeHelper.visible = false;
    scene.add(planeHelper);
    slicePlaneHelperRef.current = planeHelper;

    // Add OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Professional Lighting Setup
    const hemisphere = new THREE.HemisphereLight(0xd8e7ff, 0x1e2436, 0.85);
    scene.add(hemisphere);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(9, 14, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1536;
    keyLight.shadow.mapSize.height = 1536;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    keyLight.shadow.camera.left = -20;
    keyLight.shadow.camera.right = 20;
    keyLight.shadow.camera.top = 20;
    keyLight.shadow.camera.bottom = -20;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x9bbcff, 1.0);
    fillLight.position.set(-11, 7, -7);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x66e0ff, 0.7);
    rimLight.position.set(0, 7, -12);
    scene.add(rimLight);

    const bounceLight = new THREE.PointLight(0xffffff, 0.45, 80);
    bounceLight.position.set(0, -1.2, 0);
    scene.add(bounceLight);

    // Add Grid Floor
    const gridHelper = new THREE.GridHelper(30, 30, theme.grid.primary, theme.grid.secondary);
    gridHelper.position.y = -3;
    scene.add(gridHelper);
    gridHelperRef.current = gridHelper;

    // Add subtle ground plane
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshStandardMaterial({ 
      color: theme.ground,
      roughness: 0.8,
      metalness: 0.2
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -3;
    ground.receiveShadow = true;
    scene.add(ground);
    groundRef.current = ground;

    // Add axis helper (subtle)
    const axesHelper = new THREE.AxesHelper(2);
    axesHelper.position.set(-8, -3, -8);
    scene.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // Optional center marker at world origin
    const centerMarker = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff4d4f })
    );
    centerMarker.position.set(0, 0, 0);
    centerMarker.visible = centerMarkerVisible;
    scene.add(centerMarker);
    centerMarkerRef.current = centerMarker;

    const trimBox = new THREE.Box3(new THREE.Vector3(-1.5, -1.5, -1.5), new THREE.Vector3(1.5, 1.5, 1.5));
    const trimBoxHelper = new THREE.Box3Helper(trimBox, 0xffb74d);
    trimBoxHelper.visible = false;
    scene.add(trimBoxHelper);
    trimBoxHelperRef.current = trimBoxHelper;

    // Initialize transform controls (will be enabled when needed)
    const transformControls = new TransformControls(camera, renderer.domElement, null);
    transformControls.setDragStateCallback((isDragging) => {
      if (controlsRef.current) {
        controlsRef.current.enabled = !isDragging;
      }
    });
    transformControls.createGizmos(scene);
    transformControlsRef.current = transformControls;

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      measurementObjectMapRef.current.clear();
      markerObjectMapRef.current.clear();
      measurementDraftRef.current = [];
      trimHistoryRef.current.forEach((geometry) => geometry.dispose());
      trimHistoryRef.current = [];
      trimRedoRef.current.forEach((geometry) => geometry.dispose());
      trimRedoRef.current = [];
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      if (transformControlsRef.current) {
        transformControlsRef.current.dispose();
      }
      if (centerMarkerRef.current) {
        scene.remove(centerMarkerRef.current);
        centerMarkerRef.current.geometry.dispose();
        centerMarkerRef.current.material.dispose();
      }
      if (trimBoxHelperRef.current) {
        scene.remove(trimBoxHelperRef.current);
        trimBoxHelperRef.current.geometry.dispose();
        trimBoxHelperRef.current.material.dispose();
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    // Clear previous objects
    objectsRef.current.forEach(obj => {
      sceneRef.current.remove(obj);
      // Don't dispose geometry/material if it's the persistent model
      if (obj !== persistentModelRef.current) {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      }
    });
    objectsRef.current = [];

    // Create scene based on activeScene
    switch (activeScene) {
      case 0: {
        const group = createDNAHelixScene();
        sceneRef.current.add(group);
        objectsRef.current.push(group);
        break;
      }
      case 1: {
        const group = createHeartBeatScene();
        sceneRef.current.add(group);
        objectsRef.current.push(group);
        break;
      }
      case 2: {
        const group = createNeuralNetworkScene();
        sceneRef.current.add(group);
        objectsRef.current.push(group);
        break;
      }
      case 3: {
        const group = createCellDivisionScene();
        sceneRef.current.add(group);
        objectsRef.current.push(group);
        break;
      }
      case 4:
        // Use persistent model reference
        if (persistentModelRef.current) {
          sceneRef.current.add(persistentModelRef.current);
          objectsRef.current.push(persistentModelRef.current);
        }
        break;
    }

    // Restart animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animate();
  }, [activeScene, importedModel]);

  useEffect(() => {
    if (activeScene === 4) return;
    setGizmosEnabled(false);
    clearMeasurements(true);
    clearMarkers(true);
  }, [activeScene]);

  const animate = () => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    animationFrameRef.current = requestAnimationFrame(animate);

     fpsRef.current.frames += 1;
     const now = performance.now();
     if (now - fpsRef.current.last >= 1000) {
      fpsRef.current.value = Math.round((fpsRef.current.frames * 1000) / (now - fpsRef.current.last));
      fpsRef.current.frames = 0;
      fpsRef.current.last = now;
      setFps(fpsRef.current.value);
    }

    const time = Date.now() * 0.001;

    // Update controls
    if (controlsRef.current) {
      controlsRef.current.update();
    }

    // Update transform gizmos
    if (transformControlsRef.current) {
      transformControlsRef.current.update();
    }

    objectsRef.current.forEach((obj, index) => {
      switch (activeScene) {
        case 0: // DNA
          if (!controlsRef.current?.isUserInteracting) {
            obj.rotation.y = time * 0.3;
          }
          break;
        case 1: // Heart
          const scale = 1 + Math.sin(time * 4) * 0.15;
          obj.children.forEach((child, i) => {
            if (i === 0) {
              child.scale.set(scale, scale, scale);
            } else {
              child.scale.set(1 + Math.sin(time * 4 - child.userData.offset) * 0.3, 1 + Math.sin(time * 4 - child.userData.offset) * 0.3, 1);
              child.material.opacity = 0.5 - Math.abs(Math.sin(time * 4 - child.userData.offset)) * 0.3;
            }
          });
          if (!controlsRef.current?.isUserInteracting) {
            obj.rotation.y = Math.sin(time * 0.5) * 0.3;
          }
          break;
        case 2: // Neural
          if (!controlsRef.current?.isUserInteracting) {
            obj.rotation.y = time * 0.2;
            obj.rotation.x = Math.sin(time * 0.3) * 0.2;
          }
          obj.children.forEach(child => {
            if (child.userData.velocity) {
              child.position.add(child.userData.velocity);
              if (Math.abs(child.position.x) > 4 || Math.abs(child.position.y) > 3 || Math.abs(child.position.z) > 2) {
                child.position.set(
                  (Math.random() - 0.5) * 8,
                  (Math.random() - 0.5) * 6,
                  (Math.random() - 0.5) * 4
                );
              }
            }
          });
          break;
        case 3: // Cell
          if (!controlsRef.current?.isUserInteracting) {
            obj.rotation.y = time * 0.3;
          }
          obj.children.forEach((child, i) => {
            if (i < 2) {
              child.position.x = (i === 0 ? -0.3 : 0.3) + Math.sin(time * 2) * (i === 0 ? -0.5 : 0.5);
            } else if (i < 4) {
              child.position.x = (i === 2 ? -0.3 : 0.3) + Math.sin(time * 2) * (i === 2 ? -0.5 : 0.5);
            } else {
              child.rotation.y += 0.01;
            }
          });
          break;
        case 4: // Imported model - NO auto-rotation
          // Do nothing - let user control it
          break;
      }
    });

    rendererRef.current.render(sceneRef.current, cameraRef.current);
  };

  const theme = themes[activeTheme];

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: `#${theme.background.toString(16).padStart(6, '0')}`, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".stl,.obj,.ply"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      <TopBar
        activeTheme={activeTheme}
        theme={theme}
        sceneNames={sceneNames}
        activeScene={activeScene}
        onSelectScene={setActiveScene}
        hasImportedModel={Boolean(persistentModelRef.current)}
        themes={themes}
        onThemeChange={setActiveTheme}
        showToolsPanel={showToolsPanel}
        setShowToolsPanel={setShowToolsPanel}
        onImportClick={() => fileInputRef.current.click()}
        isImporting={isImporting}
        onExportStl={exportCurrentModelStl}
        onExportObj={exportCurrentModelObj}
        onExportPng={exportScreenshot}
        onExportReport={exportReportHtml}
      />

      <SlicerPanel
        show={showSlicerPanel}
        activeTheme={activeTheme}
        theme={theme}
        setShow={setShowSlicerPanel}
        slicingEnabled={slicingEnabled}
        setSlicingEnabled={setSlicingEnabled}
        sliceAxis={sliceAxis}
        setSliceAxis={setSliceAxis}
        slicePosition={slicePosition}
        setSlicePosition={setSlicePosition}
        showSlicePlane={showSlicePlane}
        setShowSlicePlane={setShowSlicePlane}
        applyPermanentCut={applyPermanentCut}
        cutApplied={cutApplied}
        hasImportedModel={Boolean(persistentModelRef.current)}
        resetCut={resetCut}
      />

      <ToolsPanel
        show={showToolsPanel}
        activeTheme={activeTheme}
        theme={theme}
        setShow={setShowToolsPanel}
        showSlicerPanel={showSlicerPanel}
        setShowSlicerPanel={setShowSlicerPanel}
        showModelInfoPanel={showModelInfoPanel}
        setShowModelInfoPanel={setShowModelInfoPanel}
        onResetCamera={resetCameraView}
        onShowHelp={() =>
          pushToast(
            'Controls: left drag orbit, right drag pan, wheel zoom. Undo/Redo: Ctrl+Z, Ctrl+Y, or Ctrl+Shift+Z.'
          )
        }
        onExportStl={exportCurrentModelStl}
        onExportObj={exportCurrentModelObj}
        onExportPng={exportScreenshot}
        onExportReport={exportReportHtml}
        includeOverlaysInScreenshot={includeOverlaysInScreenshot}
        setIncludeOverlaysInScreenshot={setIncludeOverlaysInScreenshot}
        activeScene={activeScene}
        hasImportedModel={Boolean(persistentModelRef.current)}
        gizmosEnabled={gizmosEnabled}
        setGizmosEnabled={setGizmosEnabled}
        transformMode={transformMode}
        setTransformMode={setTransformMode}
        onResetTransform={() => {
          if (persistentModelRef.current) {
            persistentModelRef.current.position.set(0, 0, 0);
            persistentModelRef.current.rotation.set(0, 0, 0);
            persistentModelRef.current.scale.set(1, 1, 1);
          }
        }}
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        measurements={measurements}
        onClearMeasurements={clearMeasurements}
        markers={markers}
        onRenameMarker={renameMarker}
        onDeleteMarker={deleteMarker}
        onExportMarkers={exportMarkersJson}
        onClearMarkers={clearMarkers}
        gridVisible={gridVisible}
        setGridVisible={setGridVisible}
        axesVisible={axesVisible}
        setAxesVisible={setAxesVisible}
        shadowsEnabled={shadowsEnabled}
        setShadowsEnabled={setShadowsEnabled}
        wireframeEnabled={wireframeEnabled}
        setWireframeEnabled={setWireframeEnabled}
        shadingMode={shadingMode}
        setShadingMode={setShadingMode}
        centerMarkerVisible={centerMarkerVisible}
        setCenterMarkerVisible={setCenterMarkerVisible}
        trimMode={trimMode}
        setTrimMode={setTrimMode}
        trimPlaneSide={trimPlaneSide}
        setTrimPlaneSide={setTrimPlaneSide}
        trimBoxSize={trimBoxSize}
        setTrimBoxSize={setTrimBoxSize}
        trimBoxKeep={trimBoxKeep}
        setTrimBoxKeep={setTrimBoxKeep}
        showTrimBox={showTrimBox}
        setShowTrimBox={setShowTrimBox}
        onApplyTrim={applySimpleTrim}
        onUndoTrim={undoTrim}
        onRedoTrim={redoTrim}
        trimHistoryDepth={trimHistoryDepth}
        trimRedoDepth={trimRedoDepth}
      />

      <ModelInfoPanel
        show={showModelInfoPanel}
        setShow={setShowModelInfoPanel}
        activeTheme={activeTheme}
        theme={theme}
        showSlicerPanel={showSlicerPanel}
        modelMeta={modelMeta}
      />

      <StatusBar activeTheme={activeTheme} sceneName={sceneNames[activeScene]} activeTool={activeTool} fps={fps} />
      <ToastStack toasts={toasts} />
    </div>
  );
};

export default Medical3DCanvas;


