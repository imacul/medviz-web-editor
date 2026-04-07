import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { THEMES } from './medviz/constants/themes';
import { SCENE_NAMES } from './medviz/constants/scenes';
import { importModelSource, isSupportedModelFile, isSupportedModelSource } from './medviz/io/modelImport';
import { meshToBinarySTL } from './medviz/io/stlExport';
import { meshToOBJ } from './medviz/io/objExport';
import { buildHtmlReport, buildPdfReportBlob } from './medviz/io/reportExport';
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

import { OrbitControls } from './medviz/controls/OrbitControls';
import { TransformControls } from './medviz/controls/TransformControls';
import TopBar from './medviz/ui/TopBar';
import SlicerPanel from './medviz/ui/SlicerPanel';
import ToolsPanel from './medviz/ui/ToolsPanel';
import ModelInfoPanel from './medviz/ui/ModelInfoPanel';
import StatusBar from './medviz/ui/StatusBar';
import ToastStack from './medviz/ui/ToastStack';

const SEGMENT_GROUPS = [
  { id: 0, label: 'Base', color: 0xb8c2cc },
  { id: 1, label: 'Blue', color: 0x5aa9ff },
  { id: 2, label: 'Yellow', color: 0xffd166 },
  { id: 3, label: 'Purple', color: 0x7f5af0 },
  { id: 4, label: 'Green', color: 0x4cd08a }
];

const SEGMENT_GROUP_LOOKUP = new Map(
  SEGMENT_GROUPS.map((group) => [group.id, { ...group, rgb: new THREE.Color(group.color) }])
);
// Adaptive subdivision: target ~480k output triangles max for smooth brush edges.
// More levels = smoother paint boundary; stops when adding another level would exceed target.
const SEGMENT_SUBDIVIDE_TARGET_OUTPUT = 1000000;
const getSegmentSubdivisionLevel = (triCount) => {
  if (triCount <= 0) return 0;
  let level = 0;
  let count = triCount;
  while (level < 3 && count * 4 <= SEGMENT_SUBDIVIDE_TARGET_OUTPUT) {
    count *= 4;
    level += 1;
  }
  return level;
};

const getInitialViewportWidth = () =>
  typeof window === 'undefined' ? 1280 : window.innerWidth || document.documentElement.clientWidth || 1280;

const SPATIAL_UNIT_OPTIONS = [
  { value: 'mm', label: 'Millimeters (mm)', unitScaleToMm: 1 },
  { value: 'cm', label: 'Centimeters (cm)', unitScaleToMm: 10 },
  { value: 'm', label: 'Meters (m)', unitScaleToMm: 1000 }
];

const ORIENTATION_DIRECTION_OPTIONS = [
  { value: 'right', label: 'Right', shortLabel: 'R', group: 'lr', opposite: 'left' },
  { value: 'left', label: 'Left', shortLabel: 'L', group: 'lr', opposite: 'right' },
  { value: 'anterior', label: 'Anterior', shortLabel: 'A', group: 'ap', opposite: 'posterior' },
  { value: 'posterior', label: 'Posterior', shortLabel: 'P', group: 'ap', opposite: 'anterior' },
  { value: 'superior', label: 'Superior', shortLabel: 'S', group: 'si', opposite: 'inferior' },
  { value: 'inferior', label: 'Inferior', shortLabel: 'I', group: 'si', opposite: 'superior' }
];

const getUnitOption = (unit) =>
  SPATIAL_UNIT_OPTIONS.find((option) => option.value === unit) ?? SPATIAL_UNIT_OPTIONS[0];

const getOrientationOption = (value) =>
  ORIENTATION_DIRECTION_OPTIONS.find((option) => option.value === value) ?? ORIENTATION_DIRECTION_OPTIONS[0];

const DEFAULT_SPATIAL_ORIENTATION = {
  positiveX: 'right',
  positiveY: 'superior',
  positiveZ: 'anterior',
  status: 'unconfirmed'
};

const EDITOR_STATE_EMIT_DEBOUNCE_MS = 250;

const scaleBounds = (bounds, factor) => ({
  x: Number((Number(bounds?.x ?? 0) * factor).toFixed(2)),
  y: Number((Number(bounds?.y ?? 0) * factor).toFixed(2)),
  z: Number((Number(bounds?.z ?? 0) * factor).toFixed(2)),
});

const Medical3DCanvas = ({
  onGoHome,
  initialModelSource = null,
  onInitialModelStateChange = null,
  onImportedModelPersist = null,
  readOnly = false,
  initialEditorState = null,
  onEditorStateChange = null,
  externalEditorState = null,
  startTourSignal = 0,
  showShareToggle = false,
  sharePanelOpen = false,
  onToggleSharePanel = null,
  showCommentsToggle = false,
  commentsPanelOpen = false,
  onToggleCommentsPanel = null,
  editorSaveStatus = null,
}) => {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const objectsRef = useRef([]);
  const animationFrameRef = useRef(null);
  const fileInputRef = useRef(null);
  const [viewportWidth, setViewportWidth] = useState(getInitialViewportWidth);
  const [activeScene, setActiveScene] = useState(4);
  const [activeTheme, setActiveTheme] = useState(0);
  const [importedModel, setImportedModel] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [slicingEnabled, setSlicingEnabled] = useState(false);
  const [slicePosition, setSlicePosition] = useState(0);
  const [sliceAxis, setSliceAxis] = useState('y'); // x, y, or z
  const [showSlicePlane, setShowSlicePlane] = useState(true);
  const [showSlicerPanel, setShowSlicerPanel] = useState(false);
  const [showToolsPanel, setShowToolsPanel] = useState(false);
  const [showModelInfoPanel, setShowModelInfoPanel] = useState(getInitialViewportWidth() >= 768);
  const [showOrientationCard, setShowOrientationCard] = useState(true);
  const [transformMode, setTransformMode] = useState('translate'); // 'translate' or 'rotate'
  const [gizmosEnabled, setGizmosEnabled] = useState(false);
  const [cutApplied, setCutApplied] = useState(false);
  const [modelMeta, setModelMeta] = useState(null);
  const [spatialCalibration, setSpatialCalibration] = useState(null);
  const [spatialOrientation, setSpatialOrientation] = useState(DEFAULT_SPATIAL_ORIENTATION);
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
  const initialEditorStateRef = useRef(initialEditorState);
  const cameraStateRef = useRef(null);
  const editorStateEmitTimerRef = useRef(null);
  const suppressEditorStateEmitRef = useRef(0);
  const [paintVersion, setPaintVersion] = useState(0);
  const markerCounterRef = useRef(1);
  const idCounterRef = useRef(1);
  const segmentPaintingRef = useRef(false);
  const segmentLastPaintPointRef = useRef(null);
  const segmentControlsWereEnabledRef = useRef(true);
  const segmentOffsetPreviewMeshRef = useRef(null);
  const initialModelSignatureRef = useRef(null);

  const [activeTool, setActiveTool] = useState('slice');
  const [measurements, setMeasurements] = useState([]);
  const [markers, setMarkers] = useState([]);
  const [segmentBrushRadius, setSegmentBrushRadius] = useState(0.08);
  const [activeSegmentGroupId, setActiveSegmentGroupId] = useState(1);
  const [segmentIsolateActive, setSegmentIsolateActive] = useState(false);
  const [segmentBaseOffsetMm, setSegmentBaseOffsetMm] = useState(1);
  const [segmentReliefClearanceByGroup, setSegmentReliefClearanceByGroup] = useState(() =>
    Object.fromEntries(SEGMENT_GROUPS.map((group) => [group.id, 0]))
  );
  const [segmentOffsetPreviewActive, setSegmentOffsetPreviewActive] = useState(false);
  const [segmentPreviewRevision, setSegmentPreviewRevision] = useState(0);
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
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);
  const [tourTargetRect, setTourTargetRect] = useState(null);
  const [tourCardRect, setTourCardRect] = useState(null);
  const tourCardRef = useRef(null);

  const runWithoutEditorStateEmit = (callback) => {
    suppressEditorStateEmitRef.current += 1;
    if (editorStateEmitTimerRef.current) {
      clearTimeout(editorStateEmitTimerRef.current);
      editorStateEmitTimerRef.current = null;
    }
    try {
      callback();
    } finally {
      window.setTimeout(() => {
        suppressEditorStateEmitRef.current = Math.max(0, suppressEditorStateEmitRef.current - 1);
      }, 0);
    }
  };

  const beginEditorStateEmitSuppression = () => {
    suppressEditorStateEmitRef.current += 1;
    if (editorStateEmitTimerRef.current) {
      clearTimeout(editorStateEmitTimerRef.current);
      editorStateEmitTimerRef.current = null;
    }

    return () => {
      suppressEditorStateEmitRef.current = Math.max(0, suppressEditorStateEmitRef.current - 1);
    };
  };

  const hasLoadedModel = Boolean(importedModel || initialModelSource || persistentModelRef.current);

  const openTour = () => {
    setTourStepIndex(0);
    setTourOpen(true);
  };

  const closeTour = () => {
    setTourOpen(false);
  };

  const toggleTour = () => {
    setTourOpen((current) => {
      if (current) {
        return false;
      }
      setTourStepIndex(0);
      return true;
    });
  };

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

  useEffect(() => {
    if (!startTourSignal) return;
    openTour();
  }, [startTourSignal]);

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
    updateSegmentMaterialState(mesh);

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
    queueSegmentPreviewRefresh();
  };

  // Reset to original geometry
  const resetCut = () => {
    if (!persistentModelRef.current || !originalGeometryRef.current) return;
    
    const mesh = persistentModelRef.current;
    mesh.geometry.dispose();
    mesh.geometry = originalGeometryRef.current.clone();
    updateSegmentMaterialState(mesh);
    
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
    queueSegmentPreviewRefresh();
  };

  const sceneNames = SCENE_NAMES;
  const themes = THEMES;
  const LARGE_MODEL_TRIANGLES = 300000;
  const HARD_TRIANGLE_LIMIT = 2500000;

  const createDefaultSpatialCalibration = (meta) => {
    if (!meta) {
      return null;
    }

    const defaultUnit = getUnitOption(meta.sourceUnit).value;
    return {
      sourceUnit: defaultUnit,
      unitScaleToMm: getUnitOption(defaultUnit).unitScaleToMm,
      status: 'inferred'
    };
  };

  const normalizeSpatialCalibration = (value) => {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const sourceUnit = getUnitOption(value.sourceUnit).value;
    const unitScaleToMm = Number(value.unitScaleToMm);

    return {
      sourceUnit,
      unitScaleToMm: Number.isFinite(unitScaleToMm) && unitScaleToMm > 0
        ? unitScaleToMm
        : getUnitOption(sourceUnit).unitScaleToMm,
      status: value.status === 'confirmed' ? 'confirmed' : 'inferred'
    };
  };

  const getEffectiveSpatialCalibration = (metaOverride = modelMeta, calibrationOverride = spatialCalibration) => {
    const normalized = normalizeSpatialCalibration(calibrationOverride);
    return normalized ?? createDefaultSpatialCalibration(metaOverride);
  };

  const getEffectiveUnitScaleToMm = (metaOverride = modelMeta, calibrationOverride = spatialCalibration) =>
    getEffectiveSpatialCalibration(metaOverride, calibrationOverride)?.unitScaleToMm ?? 1;

  const getEffectiveSourceUnit = (metaOverride = modelMeta, calibrationOverride = spatialCalibration) =>
    getEffectiveSpatialCalibration(metaOverride, calibrationOverride)?.sourceUnit ?? getUnitOption(metaOverride?.sourceUnit).value;

  const normalizeSpatialOrientation = (value) => {
    if (!value || typeof value !== 'object') {
      return { ...DEFAULT_SPATIAL_ORIENTATION };
    }

    return {
      positiveX: getOrientationOption(value.positiveX).value,
      positiveY: getOrientationOption(value.positiveY).value,
      positiveZ: getOrientationOption(value.positiveZ).value,
      status: value.status === 'confirmed' ? 'confirmed' : 'unconfirmed'
    };
  };

  const isSpatialOrientationValid = (value) => {
    const normalized = normalizeSpatialOrientation(value);
    const groups = [
      getOrientationOption(normalized.positiveX).group,
      getOrientationOption(normalized.positiveY).group,
      getOrientationOption(normalized.positiveZ).group,
    ];

    return new Set(groups).size === 3;
  };

  const getResolvedSpatialOrientation = (orientationOverride = spatialOrientation) => {
    const normalized = normalizeSpatialOrientation(orientationOverride);
    return {
      ...normalized,
      status:
        normalized.status === 'confirmed' && isSpatialOrientationValid(normalized)
          ? 'confirmed'
          : 'unconfirmed'
    };
  };

  const getOrientationAxisSummary = (orientationOverride = spatialOrientation) => {
    const resolved = getResolvedSpatialOrientation(orientationOverride);
    const x = getOrientationOption(resolved.positiveX);
    const y = getOrientationOption(resolved.positiveY);
    const z = getOrientationOption(resolved.positiveZ);

    return {
      status: resolved.status,
      axes: [
        { axis: 'X', positive: x, negative: getOrientationOption(x.opposite) },
        { axis: 'Y', positive: y, negative: getOrientationOption(y.opposite) },
        { axis: 'Z', positive: z, negative: getOrientationOption(z.opposite) },
      ]
    };
  };

  const getResolvedModelMeta = (metaOverride = modelMeta, calibrationOverride = spatialCalibration) => {
    if (!metaOverride) {
      return null;
    }

    const effectiveCalibration = getEffectiveSpatialCalibration(metaOverride, calibrationOverride);
    const unitScaleToMm = effectiveCalibration?.unitScaleToMm ?? metaOverride.unitScaleToMm ?? 1;
    const sourceUnit = effectiveCalibration?.sourceUnit ?? getUnitOption(metaOverride.sourceUnit).value;
    const calibrationStatus = effectiveCalibration?.status ?? 'inferred';

    return {
      ...metaOverride,
      sourceUnit,
      unitScaleToMm,
      estimatedBoundsMm: scaleBounds(metaOverride.sourceBounds, unitScaleToMm),
      calibrationStatus,
      unitInference:
        calibrationStatus === 'confirmed'
          ? `Import units confirmed as ${sourceUnit}.`
          : metaOverride.unitInference
    };
  };

  const getDistanceMmBetweenPoints = (
    pointA,
    pointB,
    calibrationOverride = spatialCalibration,
    metaOverride = modelMeta
  ) => {
    const normScale = metaOverride?.normalizationScale ?? 1;
    const sceneDistance = pointA.distanceTo(pointB);
    return (sceneDistance / normScale) * getEffectiveUnitScaleToMm(metaOverride, calibrationOverride);
  };

  const getSegmentGroup = (groupId) => SEGMENT_GROUP_LOOKUP.get(groupId) ?? SEGMENT_GROUP_LOOKUP.get(0);

  const getSegmentDisplayColor = (groupId) => {
    if (!segmentIsolateActive) return getSegmentGroup(groupId).rgb;
    if (groupId === activeSegmentGroupId) return getSegmentGroup(groupId).rgb;

    if (groupId === 0) return new THREE.Color(0x242a31);
    const base = getSegmentGroup(groupId).rgb.clone();
    return base.lerp(new THREE.Color(0x111317), 0.8);
  };

  const subdivideNonIndexedGeometryForSegmentation = (sourceGeometry, levels = 1) => {
    let geometry = sourceGeometry;

    for (let level = 0; level < levels; level += 1) {
      const positionAttr = geometry.getAttribute('position');
      if (!positionAttr || positionAttr.count % 3 !== 0) break;
      const normalAttr = geometry.getAttribute('normal');
      const triCount = positionAttr.count / 3;
      const nextVertexCount = triCount * 12; // 4 tris * 3 verts
      const nextPositions = new Float32Array(nextVertexCount * 3);
      const nextNormals = normalAttr ? new Float32Array(nextVertexCount * 3) : null;

      const a = new THREE.Vector3();
      const b = new THREE.Vector3();
      const c = new THREE.Vector3();
      const ab = new THREE.Vector3();
      const bc = new THREE.Vector3();
      const ca = new THREE.Vector3();
      const na = new THREE.Vector3();
      const nb = new THREE.Vector3();
      const nc = new THREE.Vector3();
      const nab = new THREE.Vector3();
      const nbc = new THREE.Vector3();
      const nca = new THREE.Vector3();

      let outVertex = 0;
      const pushVertex = (v, n) => {
        const base = outVertex * 3;
        nextPositions[base] = v.x;
        nextPositions[base + 1] = v.y;
        nextPositions[base + 2] = v.z;
        if (nextNormals && n) {
          nextNormals[base] = n.x;
          nextNormals[base + 1] = n.y;
          nextNormals[base + 2] = n.z;
        }
        outVertex += 1;
      };
      const pushTri = (v1, n1, v2, n2, v3, n3) => {
        pushVertex(v1, n1);
        pushVertex(v2, n2);
        pushVertex(v3, n3);
      };

      for (let i = 0; i < positionAttr.count; i += 3) {
        a.fromBufferAttribute(positionAttr, i);
        b.fromBufferAttribute(positionAttr, i + 1);
        c.fromBufferAttribute(positionAttr, i + 2);

        ab.copy(a).add(b).multiplyScalar(0.5);
        bc.copy(b).add(c).multiplyScalar(0.5);
        ca.copy(c).add(a).multiplyScalar(0.5);

        if (normalAttr) {
          na.fromBufferAttribute(normalAttr, i);
          nb.fromBufferAttribute(normalAttr, i + 1);
          nc.fromBufferAttribute(normalAttr, i + 2);
          nab.copy(na).add(nb).normalize();
          nbc.copy(nb).add(nc).normalize();
          nca.copy(nc).add(na).normalize();

          pushTri(a, na, ab, nab, ca, nca);
          pushTri(ab, nab, b, nb, bc, nbc);
          pushTri(ca, nca, bc, nbc, c, nc);
          pushTri(ab, nab, bc, nbc, ca, nca);
        } else {
          pushTri(a, null, ab, null, ca, null);
          pushTri(ab, null, b, null, bc, null);
          pushTri(ca, null, bc, null, c, null);
          pushTri(ab, null, bc, null, ca, null);
        }
      }

      const nextGeometry = new THREE.BufferGeometry();
      nextGeometry.setAttribute('position', new THREE.Float32BufferAttribute(nextPositions, 3));
      if (nextNormals) {
        nextGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(nextNormals, 3));
      } else {
        nextGeometry.computeVertexNormals();
      }
      nextGeometry.computeBoundingBox();
      nextGeometry.computeBoundingSphere();

      if (geometry !== sourceGeometry) {
        geometry.dispose();
      }
      geometry = nextGeometry;
    }

    return geometry;
  };

  const updateSegmentMaterialState = (mesh = persistentModelRef.current) => {
    if (!mesh || Array.isArray(mesh.material) || !mesh.material) return;
    if (mesh.material.type === 'MeshNormalMaterial') return;

    if (mesh.userData.baseSurfaceColorHex == null && mesh.material.color?.getHex) {
      mesh.userData.baseSurfaceColorHex = mesh.material.color.getHex();
    }

    const hasColors = Boolean(mesh.geometry?.getAttribute?.('color'));
    if ('vertexColors' in mesh.material) {
      mesh.material.vertexColors = hasColors;
    }
    if (mesh.material.color?.setHex) {
      mesh.material.color.setHex(hasColors ? 0xffffff : mesh.userData.baseSurfaceColorHex ?? 0xb8c2cc);
    }
    mesh.material.needsUpdate = true;
  };

  const refreshSegmentationColors = (mesh = persistentModelRef.current) => {
    if (!mesh?.geometry) return;
    const geometry = mesh.geometry;
    const colorAttr = geometry.getAttribute('color');
    const vertexIds = geometry.userData.segmentVertexGroupIds;
    if (!colorAttr || !(vertexIds instanceof Uint8Array)) {
      updateSegmentMaterialState(mesh);
      return;
    }

    const colorArray = colorAttr.array;
    const vertexCount = geometry.getAttribute('position')?.count ?? 0;
    const count = Math.min(vertexCount, vertexIds.length);
    for (let i = 0; i < count; i += 1) {
      const color = getSegmentDisplayColor(vertexIds[i]);
      const j = i * 3;
      colorArray[j] = color.r;
      colorArray[j + 1] = color.g;
      colorArray[j + 2] = color.b;
    }
    colorAttr.needsUpdate = true;
    updateSegmentMaterialState(mesh);
  };

  const queueSegmentPreviewRefresh = () => {
    setSegmentPreviewRevision((prev) => prev + 1);
  };

  const setSegmentReliefClearance = (groupId, value) => {
    const nextValue = Number.isFinite(value) ? Math.max(0, Math.min(250, value)) : 0;
    setSegmentReliefClearanceByGroup((prev) => ({
      ...prev,
      [groupId]: nextValue
    }));
  };

  const removeSegmentOffsetPreview = () => {
    const previewMesh = segmentOffsetPreviewMeshRef.current;
    if (!previewMesh) return;

    previewMesh.parent?.remove(previewMesh);
    previewMesh.geometry?.dispose?.();
    if (Array.isArray(previewMesh.material)) {
      previewMesh.material.forEach((mat) => mat.dispose?.());
    } else {
      previewMesh.material?.dispose?.();
    }
    segmentOffsetPreviewMeshRef.current = null;
  };

  const getSegmentPreviewMmToScene = (geometry) => {
    const normScale = Number(modelMeta?.normalizationScale);
    const unitScaleToMm = Number(getEffectiveUnitScaleToMm());

    if (!Number.isFinite(normScale) || normScale <= 0) {
      return 0.02;
    }

    return normScale / (Number.isFinite(unitScaleToMm) && unitScaleToMm > 0 ? unitScaleToMm : 1);
  };

  const ensureSegmentOffsetPreview = () => {
    const hostMesh = persistentModelRef.current;
    if (!hostMesh?.geometry) return;

    const sourceGeometry = ensureSegmentPaintGeometry(hostMesh);
    if (!sourceGeometry?.getAttribute('position')) return;

    const previewGeometry = sourceGeometry.clone();
    const positionAttr = previewGeometry.getAttribute('position');
    let normalAttr = previewGeometry.getAttribute('normal');
    if (!normalAttr) {
      previewGeometry.computeVertexNormals();
      normalAttr = previewGeometry.getAttribute('normal');
    }

    const sourceFaceIds = sourceGeometry.userData.segmentFaceGroupIds;
    const faceIds =
      sourceFaceIds instanceof Uint8Array
        ? sourceFaceIds
        : new Uint8Array(Math.floor(positionAttr.count / 3));

    const posArray = positionAttr.array;
    const normalArray = normalAttr?.array;
    const bbox = sourceGeometry.boundingBox;
    const center = bbox
      ? new THREE.Vector3(
          (bbox.min.x + bbox.max.x) * 0.5,
          (bbox.min.y + bbox.max.y) * 0.5,
          (bbox.min.z + bbox.max.z) * 0.5
        )
      : new THREE.Vector3(0, 0, 0);
    const mmToScene = getSegmentPreviewMmToScene(sourceGeometry);
    if (!sourceGeometry.boundingBox) {
      sourceGeometry.computeBoundingBox();
    }
    const sourceBounds = sourceGeometry.boundingBox;
    const maxDimScene = sourceBounds
      ? Math.max(
          sourceBounds.max.x - sourceBounds.min.x,
          sourceBounds.max.y - sourceBounds.min.y,
          sourceBounds.max.z - sourceBounds.min.z
        )
      : 5;
    const maxSafeOffset = Math.max(0.03, maxDimScene * 0.07);

    for (let i = 0, faceIndex = 0; i < positionAttr.count; i += 3, faceIndex += 1) {
      const groupId = faceIds[faceIndex] ?? 0;
      const totalOffsetMm =
        Math.max(0, segmentBaseOffsetMm) + Math.max(0, Number(segmentReliefClearanceByGroup[groupId] ?? 0));
      const offset = Math.min(totalOffsetMm * mmToScene, maxSafeOffset);
      if (offset === 0) continue;

      for (let v = 0; v < 3; v += 1) {
        const j = (i + v) * 3;
        let nx = normalArray[j];
        let ny = normalArray[j + 1];
        let nz = normalArray[j + 2];

        // Keep offset direction outward for meshes with mixed normal orientation.
        const vx = posArray[j] - center.x;
        const vy = posArray[j + 1] - center.y;
        const vz = posArray[j + 2] - center.z;
        if (vx * nx + vy * ny + vz * nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }

        posArray[j] += nx * offset;
        posArray[j + 1] += ny * offset;
        posArray[j + 2] += nz * offset;
      }
    }

    positionAttr.needsUpdate = true;
    previewGeometry.computeVertexNormals();
    previewGeometry.computeBoundingBox();
    previewGeometry.computeBoundingSphere();

    let previewMesh = segmentOffsetPreviewMeshRef.current;
    const hasSegmentColors = Boolean(previewGeometry.getAttribute('color'));
    if (!previewMesh) {
      const previewMaterial = new THREE.MeshStandardMaterial({
        color: 0xf0f5ff,
        metalness: 0.05,
        roughness: 0.4,
        vertexColors: hasSegmentColors,
        transparent: false,
        opacity: 1,
        depthWrite: true,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2
      });
      previewMesh = new THREE.Mesh(previewGeometry, previewMaterial);
      previewMesh.name = 'segment-offset-preview';
      previewMesh.userData.isSegmentOffsetPreview = true;
      previewMesh.castShadow = false;
      previewMesh.receiveShadow = false;
      previewMesh.renderOrder = 12;
      hostMesh.add(previewMesh);
      segmentOffsetPreviewMeshRef.current = previewMesh;
    } else {
      previewMesh.parent?.remove(previewMesh);
      previewMesh.geometry?.dispose?.();
      previewMesh.geometry = previewGeometry;
      hostMesh.add(previewMesh);
    }

    const hostMaterial = Array.isArray(hostMesh.material) ? hostMesh.material[0] : hostMesh.material;
    const previewMaterial = Array.isArray(previewMesh.material) ? previewMesh.material[0] : previewMesh.material;
    if (hostMaterial && previewMaterial) {
      previewMaterial.vertexColors = hasSegmentColors;
      previewMaterial.clippingPlanes = hostMaterial.clippingPlanes ?? [];
      previewMaterial.clipShadows = Boolean(hostMaterial.clipShadows);
      previewMaterial.needsUpdate = true;
    }
  };

  const ensureSegmentPaintGeometry = (mesh = persistentModelRef.current) => {
    if (!mesh?.geometry) return null;
    const geometry = mesh.geometry;
    if (!geometry.index && geometry.userData.segmentPaintPrepared) return geometry;

    const baseNonIndexed = geometry.index ? geometry.toNonIndexed() : geometry;
    let nextGeometry = baseNonIndexed;
    const triCount = Math.floor((baseNonIndexed.getAttribute('position')?.count ?? 0) / 3);
    const subdivLevel = getSegmentSubdivisionLevel(triCount);
    const canSubdivide = subdivLevel > 0;
    if (!canSubdivide && triCount > 0 && !mesh.userData.segmentSubdivisionWarned) {
      mesh.userData.segmentSubdivisionWarned = true;
      pushToast('High-precision segment paint skipped on very dense mesh to preserve performance.');
    }

    if (canSubdivide) {
      nextGeometry = subdivideNonIndexedGeometryForSegmentation(baseNonIndexed, subdivLevel);
      if (nextGeometry !== baseNonIndexed) {
        baseNonIndexed.dispose();
      }
    }

    nextGeometry.computeVertexNormals();
    nextGeometry.computeBoundingBox();
    if (!nextGeometry.boundingSphere) {
      nextGeometry.computeBoundingSphere();
    }
    nextGeometry.userData.segmentPaintPrepared = true;
    nextGeometry.userData.segmentPaintSubdivisionLevel = canSubdivide ? subdivLevel : 0;

    if (mesh.geometry !== nextGeometry) {
      if (mesh.geometry && mesh.geometry !== geometry) {
        mesh.geometry.dispose();
      } else if (geometry !== nextGeometry) {
        geometry.dispose();
      }
      mesh.geometry = nextGeometry;
    } else if (geometry.index) {
      geometry.dispose();
    }

    return mesh.geometry;
  };

  const ensureSegmentColorAttribute = (mesh = persistentModelRef.current) => {
    if (!mesh?.geometry) return null;

    const geometry = ensureSegmentPaintGeometry(mesh);
    const positionAttr = geometry.getAttribute('position');
    if (!positionAttr) return null;

    let colorAttr = geometry.getAttribute('color');
    const expectedCount = positionAttr.count;

    if (!colorAttr || colorAttr.count !== expectedCount) {
      const base = getSegmentGroup(0).rgb;
      const colors = new Float32Array(expectedCount * 3);
      for (let i = 0; i < expectedCount; i += 1) {
        const j = i * 3;
        colors[j] = base.r;
        colors[j + 1] = base.g;
        colors[j + 2] = base.b;
      }
      colorAttr = new THREE.Float32BufferAttribute(colors, 3);
      colorAttr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('color', colorAttr);
    }

    // Per-vertex group IDs — drives smooth color interpolation at stroke edges
    const vids = geometry.userData.segmentVertexGroupIds;
    if (!(vids instanceof Uint8Array) || vids.length !== expectedCount) {
      geometry.userData.segmentVertexGroupIds = new Uint8Array(expectedCount);
    }

    // Per-face group IDs — used only for relief offset mapping
    const faceCount = Math.floor(expectedCount / 3);
    const ids = geometry.userData.segmentFaceGroupIds;
    if (!(ids instanceof Uint8Array) || ids.length !== faceCount) {
      geometry.userData.segmentFaceGroupIds = new Uint8Array(faceCount);
    }

    if (!geometry.userData.segmentVertexWeld || geometry.userData.segmentVertexWeld.vertexCount !== expectedCount) {
      const posArray = positionAttr.array;
      const leaderByKey = new Map();
      const membersTemp = new Array(expectedCount);
      const keyScale = 100000; // quantization for matching duplicated non-indexed vertices

      for (let i = 0; i < expectedCount; i += 1) {
        const j = i * 3;
        const kx = Math.round(posArray[j] * keyScale);
        const ky = Math.round(posArray[j + 1] * keyScale);
        const kz = Math.round(posArray[j + 2] * keyScale);
        const key = `${kx}|${ky}|${kz}`;

        const leader = leaderByKey.get(key);
        if (leader == null) {
          leaderByKey.set(key, i);
          membersTemp[i] = [i];
        } else {
          membersTemp[leader].push(i);
        }
      }

      const membersByLeader = new Array(expectedCount);
      for (let i = 0; i < expectedCount; i += 1) {
        const members = membersTemp[i];
        if (!members) continue;
        membersByLeader[i] = members.length === 1 ? members : Uint32Array.from(members);
      }

      geometry.userData.segmentVertexWeld = {
        vertexCount: expectedCount,
        membersByLeader
      };
    }

    updateSegmentMaterialState(mesh);
    return geometry.getAttribute('color');
  };

  const clearSegmentation = (silent = false) => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry) {
      if (!silent) pushToast('Import a model first.');
      return;
    }

    const geometry = mesh.geometry;
    if (!geometry.getAttribute('color')) {
      if (!silent) pushToast('No segmentation paint to clear.');
      return;
    }

    geometry.deleteAttribute('color');
    delete geometry.userData.segmentFaceGroupIds;
    delete geometry.userData.segmentVertexGroupIds;
    updateSegmentMaterialState(mesh);
    queueSegmentPreviewRefresh();
    if (!silent) pushToast('Segmentation cleared.');
  };

  const getPointerIntersection = (event, importedOnly = false) => {
    if (!rendererRef.current || !cameraRef.current) return null;

    const dom = rendererRef.current.domElement;
    const rect = dom.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera({ x, y }, cameraRef.current);

    let meshes = [];
    if (importedOnly) {
      const mesh = persistentModelRef.current;
      if (!mesh?.visible) return null;
      meshes = [mesh];
    } else {
      objectsRef.current.forEach((root) => {
        root.traverse((child) => {
          if (child.isMesh && child.visible) meshes.push(child);
        });
      });
    }

    if (meshes.length === 0) return null;
    const intersections = raycasterRef.current.intersectObjects(meshes, true);
    return intersections.find((hit) => !hit.object?.userData?.isSegmentOffsetPreview) ?? null;
  };

  const getMarkerHitFromPointer = (event) => {
    if (!rendererRef.current || !cameraRef.current) return null;

    const dom = rendererRef.current.domElement;
    const rect = dom.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera({ x, y }, cameraRef.current);

    const markerObjects = [];
    for (const [markerId, marker] of markerObjectMapRef.current.entries()) {
      if (marker.sphere?.visible) {
        marker.sphere.userData.markerId = markerId;
        markerObjects.push(marker.sphere);
      }
      if (marker.sprite?.visible) {
        marker.sprite.userData.markerId = markerId;
        markerObjects.push(marker.sprite);
      }
    }

    if (markerObjects.length === 0) return null;

    const hits = raycasterRef.current.intersectObjects(markerObjects, false);
    return hits[0]?.object?.userData?.markerId ?? null;
  };

  const paintSegmentationStroke = (mesh, fromPoint, toPoint) => {
    const colorAttr = ensureSegmentColorAttribute(mesh);
    const geometry = mesh.geometry;
    const positionAttr = geometry.getAttribute('position');
    if (!colorAttr || !positionAttr) return 0;

    const displayColor = getSegmentDisplayColor(activeSegmentGroupId);
    const brushRadius = segmentBrushRadius * 1.08;
    const radiusSq = brushRadius * brushRadius;
    const posArray = positionAttr.array;
    const colorArray = colorAttr.array;
    const vertexIds = geometry.userData.segmentVertexGroupIds;
    const faceIds = geometry.userData.segmentFaceGroupIds;
    const weld = geometry.userData.segmentVertexWeld;
    const membersByLeader = weld?.membersByLeader;
    const touchedFaces = new Set();
    const dxLine = toPoint.x - fromPoint.x;
    const dyLine = toPoint.y - fromPoint.y;
    const dzLine = toPoint.z - fromPoint.z;
    const lineLenSq = dxLine * dxLine + dyLine * dyLine + dzLine * dzLine;

    const getDistanceSqToStroke = (px, py, pz) => {
      if (lineLenSq < 1e-12) {
        const dx = px - fromPoint.x;
        const dy = py - fromPoint.y;
        const dz = pz - fromPoint.z;
        return dx * dx + dy * dy + dz * dz;
      }
      const vx = px - fromPoint.x;
      const vy = py - fromPoint.y;
      const vz = pz - fromPoint.z;
      let t = (vx * dxLine + vy * dyLine + vz * dzLine) / lineLenSq;
      if (t < 0) t = 0;
      if (t > 1) t = 1;
      const cx = fromPoint.x + dxLine * t;
      const cy = fromPoint.y + dyLine * t;
      const cz = fromPoint.z + dzLine * t;
      const dx = px - cx;
      const dy = py - cy;
      const dz = pz - cz;
      return dx * dx + dy * dy + dz * dz;
    };

    // Vertex pass: use welded duplicate vertices so adjacent non-indexed faces paint consistently.
    let changed = 0;
    for (let i = 0; i < positionAttr.count; i += 1) {
      const members = membersByLeader?.[i];
      if (!members) continue; // paint once per welded leader vertex only

      const j = i * 3;
      if (getDistanceSqToStroke(posArray[j], posArray[j + 1], posArray[j + 2]) > radiusSq) continue;

      for (let m = 0; m < members.length; m += 1) {
        const vertexIndex = members[m];
        if (vertexIds[vertexIndex] !== activeSegmentGroupId) {
          vertexIds[vertexIndex] = activeSegmentGroupId;
          const mj = vertexIndex * 3;
          colorArray[mj] = displayColor.r;
          colorArray[mj + 1] = displayColor.g;
          colorArray[mj + 2] = displayColor.b;
          changed += 1;
        }
        touchedFaces.add(Math.floor(vertexIndex / 3));
      }
    }

    if (faceIds && touchedFaces.size > 0) {
      for (const faceIndex of touchedFaces) {
        if (faceIndex >= 0 && faceIndex < faceIds.length) {
          faceIds[faceIndex] = activeSegmentGroupId;
          const base = faceIndex * 9;
          const v0 = Math.floor(base / 3);
          const v1 = v0 + 1;
          const v2 = v0 + 2;
          vertexIds[v0] = activeSegmentGroupId;
          vertexIds[v1] = activeSegmentGroupId;
          vertexIds[v2] = activeSegmentGroupId;
          colorArray[base] = displayColor.r;
          colorArray[base + 1] = displayColor.g;
          colorArray[base + 2] = displayColor.b;
          colorArray[base + 3] = displayColor.r;
          colorArray[base + 4] = displayColor.g;
          colorArray[base + 5] = displayColor.b;
          colorArray[base + 6] = displayColor.r;
          colorArray[base + 7] = displayColor.g;
          colorArray[base + 8] = displayColor.b;
        }
      }
    }

    if (changed > 0) colorAttr.needsUpdate = true;
    return changed;
  };

  const paintSegmentationAtPoint = (intersection) => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry || !intersection?.point) return false;

    const localPoint = mesh.worldToLocal(intersection.point.clone());
    const lastPoint = segmentLastPaintPointRef.current;
    const minAdvanceSq = Math.max(1e-6, (segmentBrushRadius * 0.015) ** 2);

    if (!lastPoint) {
      const changed = paintSegmentationStroke(mesh, localPoint, localPoint);
      segmentLastPaintPointRef.current = localPoint.clone();
      if (changed > 0) updateSegmentMaterialState(mesh);
      return changed > 0;
    }

    const distance = lastPoint.distanceTo(localPoint);
    if (distance * distance < minAdvanceSq) return false;

    const changedTotal = paintSegmentationStroke(mesh, lastPoint, localPoint);

    segmentLastPaintPointRef.current = localPoint.clone();
    if (changedTotal > 0) {
      updateSegmentMaterialState(mesh);
    }
    return changedTotal > 0;
  };

  const paintSegmentationFromEvent = (event) => {
    if (activeScene !== 4 || !persistentModelRef.current) return false;
    const intersection = getPointerIntersection(event, true);
    if (!intersection) return false;
    return paintSegmentationAtPoint(intersection);
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
    triggerDownload(url, fileName);
    window.setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };

  const triggerDownload = (url, fileName) => {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    window.setTimeout(() => {
      anchor.remove();
    }, 0);
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
      triggerDownload(url, `medviz-screenshot-${Date.now()}.png`);
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
        modelMeta: getResolvedModelMeta(),
        spatialOrientation: getResolvedSpatialOrientation(),
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

  const exportReportPdf = async () => {
    try {
      const screenshotDataUrl = captureScreenshotDataUrl(includeOverlaysInScreenshot);
      const blob = await buildPdfReportBlob({
        modelMeta: getResolvedModelMeta(),
        spatialOrientation: getResolvedSpatialOrientation(),
        measurements,
        markers,
        screenshotDataUrl
      });
      downloadBlob(blob, `medviz-report-${Date.now()}.pdf`);
      pushToast('PDF report exported.');
    } catch (error) {
      console.error('Failed to export PDF report:', error);
      pushToast('PDF report export failed.');
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

  const frameCameraToModel = (mesh) => {
    if (!mesh || !cameraRef.current || !controlsRef.current) {
      return;
    }

    mesh.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(mesh);

    if (bounds.isEmpty()) {
      return;
    }

    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z, 1);
    const fov = THREE.MathUtils.degToRad(cameraRef.current.fov || 50);
    const distance = Math.max((maxDimension * 0.9) / Math.tan(fov / 2), maxDimension * 1.6);

    cameraRef.current.position.set(
      center.x + distance * 0.75,
      center.y + distance * 0.55,
      center.z + distance
    );
    cameraRef.current.near = Math.max(0.01, distance / 100);
    cameraRef.current.far = Math.max(1000, distance * 20);
    cameraRef.current.updateProjectionMatrix();

    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  const resetCameraView = () => {
    if (persistentModelRef.current) {
      frameCameraToModel(persistentModelRef.current);
      return;
    }

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
    updateSegmentMaterialState(mesh);
    setCutApplied(true);
    queueSegmentPreviewRefresh();
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
    updateSegmentMaterialState(mesh);
    setCutApplied(true);
    queueSegmentPreviewRefresh();
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
    updateSegmentMaterialState(mesh);
    setCutApplied(true);
    queueSegmentPreviewRefresh();
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
      background: 'rgba(8,16,28,0.85)',
      depthTest: false,
      renderOrder: 20,
    });
    label.position.copy(position);
    return label;
  };

  const getFloatingLabelPosition = (
    anchorPoint,
    options = {}
  ) => {
    const camera = cameraRef.current;
    if (!camera) {
      return anchorPoint.clone();
    }

    const cameraOffset = options.cameraOffset ?? 0.16;
    const verticalOffset = options.verticalOffset ?? 0.08;
    const cameraUp = camera.up.clone().normalize().multiplyScalar(verticalOffset);
    const toCamera = camera.position.clone().sub(anchorPoint);

    if (toCamera.lengthSq() < 1e-8) {
      return anchorPoint.clone().add(cameraUp);
    }

    return anchorPoint.clone().add(toCamera.normalize().multiplyScalar(cameraOffset)).add(cameraUp);
  };

  const makeMarkerSprite = (text, position) => {
    const sprite = createTextSprite(text, {
      fontSize: 28,
      padding: 14,
      border: '#ffb703',
      background: 'rgba(35,24,8,0.92)',
      shape: 'bubble',
      tailHeight: 14,
      tailWidth: 20,
      depthTest: false,
      renderOrder: 24,
    });
    sprite.position.copy(getFloatingLabelPosition(position, { cameraOffset: 0.22, verticalOffset: 0.1 }));
    return sprite;
  };

  const updateMarkerSpritePositions = () => {
    for (const marker of markerObjectMapRef.current.values()) {
      if (!marker.sphere || !marker.sprite) continue;
      marker.sprite.position.copy(
        getFloatingLabelPosition(marker.sphere.position, { cameraOffset: 0.22, verticalOffset: 0.1 })
      );
    }
  };

  const updateMeasurementLabelPositions = () => {
    for (const measurement of measurementObjectMapRef.current.values()) {
      if (!measurement.label || !measurement.labelAnchor) continue;
      measurement.label.position.copy(
        getFloatingLabelPosition(measurement.labelAnchor, { cameraOffset: 0.18, verticalOffset: 0.08 })
      );
    }
  };

  const replaceMeasurementLabel = (id, distanceMm, pointA, pointB) => {
    const scene = sceneRef.current;
    const measurement = measurementObjectMapRef.current.get(id);

    if (!scene || !measurement?.label) {
      return;
    }

    scene.remove(measurement.label);
    measurement.label.material.map.dispose();
    measurement.label.material.dispose();

    const mid = pointA.clone().add(pointB).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.1, 0));
    const nextLabel = makeMeasureLabel(`${distanceMm.toFixed(2)} mm`, mid);
    scene.add(nextLabel);
    measurement.label = nextLabel;
    measurement.labelAnchor = mid.clone();
    measurement.distanceMm = distanceMm;
  };

  const refreshMeasurementValues = (calibrationOverride = spatialCalibration, options = {}) => {
    const { silent = false } = options;

    setMeasurements((prev) =>
      prev.map((measurement) => {
        const pointA = new THREE.Vector3(
          measurement.pointA.x,
          measurement.pointA.y,
          measurement.pointA.z
        );
        const pointB = new THREE.Vector3(
          measurement.pointB.x,
          measurement.pointB.y,
          measurement.pointB.z
        );
        const distanceMm = getDistanceMmBetweenPoints(pointA, pointB, calibrationOverride);
        replaceMeasurementLabel(measurement.id, distanceMm, pointA, pointB);
        return {
          ...measurement,
          distanceMm,
        };
      })
    );

    if (!silent) {
      pushToast(`Measurement units updated to ${getEffectiveSourceUnit(modelMeta, calibrationOverride)}.`);
    }
  };

  const applySpatialCalibration = (nextCalibration, options = {}) => {
    const normalized = normalizeSpatialCalibration(nextCalibration);
    if (!normalized) {
      return;
    }

    setSpatialCalibration((prev) => {
      const current = normalizeSpatialCalibration(prev);
      if (
        current &&
        current.sourceUnit === normalized.sourceUnit &&
        current.unitScaleToMm === normalized.unitScaleToMm &&
        current.status === normalized.status
      ) {
        return prev;
      }

      return normalized;
    });

    if (measurementObjectMapRef.current.size > 0) {
      refreshMeasurementValues(normalized, options);
    }
  };

  const confirmSpatialCalibration = () => {
    const effectiveCalibration = getEffectiveSpatialCalibration();
    if (!effectiveCalibration) {
      return;
    }

    if (effectiveCalibration.status === 'confirmed') {
      return;
    }

    applySpatialCalibration(
      {
        ...effectiveCalibration,
        status: 'confirmed'
      },
      { silent: true }
    );

    pushToast(`Import units confirmed as ${effectiveCalibration.sourceUnit} for this review session.`);
  };

  const updateSpatialOrientationDraft = (axisKey, direction) => {
    setSpatialOrientation((prev) => ({
      ...normalizeSpatialOrientation(prev),
      [axisKey]: getOrientationOption(direction).value,
      status: 'unconfirmed'
    }));
  };

  const confirmSpatialOrientation = () => {
    setSpatialOrientation((prev) => {
      const normalized = normalizeSpatialOrientation(prev);
      if (!isSpatialOrientationValid(normalized)) {
        pushToast('Orientation mapping must cover left/right, anterior/posterior, and superior/inferior exactly once.');
        return normalized;
      }

      pushToast('Orientation reference confirmed for this case review.');
      return {
        ...normalized,
        status: 'confirmed'
      };
    });
  };

  const resetSpatialOrientation = () => {
    setSpatialOrientation({ ...DEFAULT_SPATIAL_ORIENTATION });
    pushToast('Orientation reference reset to unconfirmed.');
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
    const sceneDistance = a.point.distanceTo(b.point);
    const distanceMm = getDistanceMmBetweenPoints(a.point, b.point);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([a.point, b.point]),
      new THREE.LineBasicMaterial({ color: 0x00d3ff })
    );
    sceneRef.current.add(line);
    const mid = a.point.clone().add(b.point).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.1, 0));
    const label = makeMeasureLabel(`${distanceMm.toFixed(2)} mm`, mid);
    sceneRef.current.add(label);

    measurementObjectMapRef.current.set(id, {
      id,
      line,
      label,
      labelAnchor: mid.clone(),
      markers: [a.marker, b.marker],
      sceneDistance,
    });
    measurementDraftRef.current = [];
    setMeasurements((prev) => [...prev, {
      id,
      distanceMm,
      pointA: { x: a.point.x, y: a.point.y, z: a.point.z },
      pointB: { x: b.point.x, y: b.point.y, z: b.point.z },
    }]);
  };

  const restoreMeasurement = (ptA, ptB, id, distanceMm, calibrationOverride = spatialCalibration) => {
    if (!sceneRef.current) return;
    const pointA = new THREE.Vector3(ptA.x, ptA.y, ptA.z);
    const pointB = new THREE.Vector3(ptB.x, ptB.y, ptB.z);
    const resolvedDistanceMm = Number.isFinite(Number(distanceMm))
      ? getDistanceMmBetweenPoints(pointA, pointB, calibrationOverride)
      : getDistanceMmBetweenPoints(pointA, pointB, calibrationOverride);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0x00d3ff, emissive: 0x00445f, emissiveIntensity: 0.4 });
    const mA = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), markerMat.clone());
    mA.position.copy(pointA);
    const mB = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), markerMat.clone());
    mB.position.copy(pointB);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([pointA, pointB]),
      new THREE.LineBasicMaterial({ color: 0x00d3ff })
    );
    const mid = pointA.clone().add(pointB).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.1, 0));
    const label = makeMeasureLabel(`${resolvedDistanceMm.toFixed(2)} mm`, mid);
    sceneRef.current.add(mA, mB, line, label);
    measurementObjectMapRef.current.set(id, {
      id,
      line,
      label,
      labelAnchor: mid.clone(),
      markers: [mA, mB],
      sceneDistance: pointA.distanceTo(pointB),
      distanceMm: resolvedDistanceMm,
    });
    setMeasurements((prev) => [...prev, { id, distanceMm: resolvedDistanceMm, pointA: ptA, pointB: ptB }]);
  };

  const serializeSegmentColors = () => {
    const ids = persistentModelRef.current?.geometry?.userData?.segmentVertexGroupIds;
    if (!(ids instanceof Uint8Array) || !ids.some((id) => id !== 0)) return null;
    let binary = '';
    const chunk = 8192;
    for (let i = 0; i < ids.length; i += chunk) {
      binary += String.fromCharCode(...ids.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  const applySegmentColors = (base64Data) => {
    const mesh = persistentModelRef.current;
    if (!mesh?.geometry || !base64Data) return;
    try {
      const binary = atob(base64Data);
      const ids = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) ids[i] = binary.charCodeAt(i);
      // Prepare geometry (same subdivision that happens when painting begins)
      const geometry = ensureSegmentPaintGeometry(mesh);
      if (!geometry) return;
      const expectedCount = geometry.attributes.position.count;
      if (ids.length !== expectedCount) {
        console.warn('Segment data mismatch — skipping paint restore.');
        return;
      }
      const base = getSegmentGroup(0).rgb;
      const colors = new Float32Array(expectedCount * 3);
      for (let i = 0; i < expectedCount; i++) {
        colors[i * 3] = base.r; colors[i * 3 + 1] = base.g; colors[i * 3 + 2] = base.b;
      }
      const colorAttr = new THREE.Float32BufferAttribute(colors, 3);
      colorAttr.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('color', colorAttr);
      geometry.userData.segmentVertexGroupIds = ids;
      refreshSegmentationColors(mesh);
      updateSegmentMaterialState(mesh);
    } catch (e) {
      console.warn('Failed to restore segment paint:', e);
    }
  };

  const restoreEditorState = (state) => {
    if (!state) return;
    runWithoutEditorStateEmit(() => {
      const nextCalibration = normalizeSpatialCalibration(state.spatialCalibration) ?? createDefaultSpatialCalibration(modelMeta);
      if (nextCalibration) {
        applySpatialCalibration(nextCalibration, { silent: true });
      }
      setSpatialOrientation(normalizeSpatialOrientation(state.spatialOrientation));
      if (state.markers?.length) {
        state.markers.forEach((m) => addMarkerAtPoint(
          new THREE.Vector3(m.position.x, m.position.y, m.position.z),
          m.id,
          m.label
        ));
      }
      if (state.measurements?.length) {
        state.measurements.forEach((m) => {
          if (m.pointA && m.pointB) restoreMeasurement(m.pointA, m.pointB, m.id, m.distanceMm, nextCalibration);
        });
      }
      if (state.camera && cameraRef.current && controlsRef.current) {
        cameraRef.current.position.set(state.camera.position.x, state.camera.position.y, state.camera.position.z);
        controlsRef.current.target.set(state.camera.target.x, state.camera.target.y, state.camera.target.z);
        controlsRef.current.update();
      }
      if (state.segmentColors) {
        applySegmentColors(state.segmentColors);
      }
    });
  };

  const addMarkerAtPoint = (point, existingId = null, existingLabel = null) => {
    if (!sceneRef.current) return;
    const id = existingId ?? `mk-${idCounterRef.current++}`;
    const label = existingLabel ?? `Marker ${markerCounterRef.current++}`;
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0x663d00, emissiveIntensity: 0.3 })
    );
    sphere.position.copy(point);
    const sprite = makeMarkerSprite(label, point);
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
    const sprite = makeMarkerSprite(newLabel, obj.sphere.position);
    sceneRef.current.add(sprite);
    obj.sprite = sprite;
  };

  const promptRenameMarker = (id) => {
    const marker = markers.find((item) => item.id === id);
    if (!marker) return;

    const nextLabel = window.prompt('Edit annotation comment', marker.label);
    if (nextLabel == null) return;

    const normalizedLabel = nextLabel.trim();
    if (!normalizedLabel) {
      pushToast('Annotation comment cannot be empty.');
      return;
    }

    if (normalizedLabel === marker.label) return;

    renameMarker(id, normalizedLabel);
    pushToast('Annotation updated.');
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

  const loadModel = async (source) => {
    setIsImporting(true);
    let didSucceed = false;
    try {
      const imported = await importModelSource(source);
      const geometry = imported.geometry;
      const meta = imported.modelMeta;
      const { extension } = imported;

      if (meta.triangles > HARD_TRIANGLE_LIMIT) {
        geometry.dispose();
        throw new Error(
          `Model too large (${meta.triangles.toLocaleString()} triangles). Please simplify before importing.`
        );
      }

      if (imported.wasSimplified) {
        pushToast(
          `Large model simplified from ${imported.sourceTriangles.toLocaleString()} to ${meta.triangles.toLocaleString()} triangles for smoother interaction.`
        );
      } else if (imported.shouldWarnLargeModel || meta.triangles > LARGE_MODEL_TRIANGLES) {
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
        removeSegmentOffsetPreview();
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

      runWithoutEditorStateEmit(() => {
        originalGeometryRef.current = null;
        setCutApplied(false);
        setSlicingEnabled(false);
        clearMeasurements(true);
        clearMarkers(true);
        segmentPaintingRef.current = false;
        segmentLastPaintPointRef.current = null;
        setSegmentOffsetPreviewActive(false);
        clearTrimHistory();

        persistentModelRef.current = mesh;
        updateSegmentMaterialState(mesh);
        setImportedModel(mesh);
        setActiveScene(4);
        setModelMeta({ ...meta, extension });
        setSpatialCalibration(createDefaultSpatialCalibration(meta));
        setSpatialOrientation({ ...DEFAULT_SPATIAL_ORIENTATION });
        frameCameraToModel(mesh);
        queueSegmentPreviewRefresh();
      });
      pushToast(`${extension.toUpperCase()} model imported. Review import units in Model Info before relying on measurements.`);
      didSucceed = true;
    } catch (error) {
      console.error('Error loading model:', error);
      pushToast(error?.message || 'Failed to load model. Please choose a valid STL/OBJ/PLY file.');
    } finally {
      setIsImporting(false);
    }

    return didSucceed;
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (file && isSupportedModelFile(file)) {
      const didLoad = await loadModel(file);
      if (didLoad && onImportedModelPersist) {
        try {
          await onImportedModelPersist(file);
          pushToast('Patient model saved to this case.');
        } catch (error) {
          pushToast(
            error?.message || 'The model opened, but it could not be saved to this case.'
          );
        }
      }
    } else {
      pushToast('Please select a valid STL, OBJ, or PLY file.');
    }
    event.target.value = '';
  };

  useEffect(() => {
    if (!initialModelSource) return;
    if (!isSupportedModelSource(initialModelSource)) return;

    const signature =
      initialModelSource instanceof File
        ? [
            initialModelSource.name,
            initialModelSource.size,
            initialModelSource.lastModified,
          ].join(':')
        : [
            initialModelSource.fileName,
            initialModelSource.url,
            initialModelSource.fileSizeBytes ?? 0,
          ].join(':');

    if (initialModelSignatureRef.current === signature) {
      return;
    }

    initialEditorStateRef.current = initialEditorState;
    initialModelSignatureRef.current = signature;
    const releaseEditorStateEmitSuppression = beginEditorStateEmitSuppression();
    let didReleaseEditorStateEmitSuppression = false;
    const finishInitialLoadCycle = () => {
      if (didReleaseEditorStateEmitSuppression) {
        return;
      }
      didReleaseEditorStateEmitSuppression = true;
      window.setTimeout(() => {
        releaseEditorStateEmitSuppression();
      }, 0);
    };

    onInitialModelStateChange?.('importing');
    void (async () => {
      const didSucceed = await loadModel(initialModelSource);
      if (didSucceed && initialEditorStateRef.current) {
        restoreEditorState(initialEditorStateRef.current);
      }
      finishInitialLoadCycle();
      onInitialModelStateChange?.(didSucceed ? 'ready' : 'error');
    })();

    return () => {
      finishInitialLoadCycle();
    };
  }, [initialModelSource, onInitialModelStateChange, initialEditorState]);

  // Emit editor state to parent quickly, then let the page-level saver coalesce DB writes.
  useEffect(() => {
    if (!onEditorStateChange) return;
    if (suppressEditorStateEmitRef.current > 0) {
      if (editorStateEmitTimerRef.current) {
        clearTimeout(editorStateEmitTimerRef.current);
        editorStateEmitTimerRef.current = null;
      }
      return;
    }
    if (editorStateEmitTimerRef.current) clearTimeout(editorStateEmitTimerRef.current);
    editorStateEmitTimerRef.current = setTimeout(() => {
      onEditorStateChange({
        markers,
        measurements,
        camera: cameraStateRef.current,
        segmentColors: serializeSegmentColors(),
        spatialCalibration: getEffectiveSpatialCalibration(),
        spatialOrientation: getResolvedSpatialOrientation(),
      });
    }, EDITOR_STATE_EMIT_DEBOUNCE_MS);
    return () => { if (editorStateEmitTimerRef.current) clearTimeout(editorStateEmitTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers, measurements, onEditorStateChange, paintVersion, spatialCalibration, spatialOrientation]);

  // Apply incremental diffs from external editor state (real-time sync from other users)
  const appliedExternalStateRef = useRef(null);
  useEffect(() => {
    if (!externalEditorState) return;
    // Avoid re-applying the same state
    if (appliedExternalStateRef.current === externalEditorState) return;
    appliedExternalStateRef.current = externalEditorState;

    runWithoutEditorStateEmit(() => {
      const externalCalibration = normalizeSpatialCalibration(externalEditorState.spatialCalibration);
      if (externalCalibration) {
        applySpatialCalibration(externalCalibration, { silent: true });
      }
      if (externalEditorState.spatialOrientation) {
        setSpatialOrientation(getResolvedSpatialOrientation(externalEditorState.spatialOrientation));
      }

      // Sync markers: add any new ones not already present
      const currentMarkerIds = new Set(markers.map((m) => m.id));
      externalEditorState.markers?.forEach((m) => {
        if (!currentMarkerIds.has(m.id)) {
          addMarkerAtPoint(new THREE.Vector3(m.position.x, m.position.y, m.position.z), m.id, m.label);
        }
      });
      // Remove markers no longer in external state
      const externalMarkerIds = new Set(externalEditorState.markers?.map((m) => m.id) ?? []);
      markers.forEach((m) => {
        if (!externalMarkerIds.has(m.id)) deleteMarker(m.id);
      });

      // Sync measurements: add new ones
      const currentMeasurementIds = new Set(measurements.map((m) => m.id));
      externalEditorState.measurements?.forEach((m) => {
        if (!currentMeasurementIds.has(m.id) && m.pointA && m.pointB) {
          restoreMeasurement(m.pointA, m.pointB, m.id, m.distanceMm, externalCalibration);
        }
      });
      // Remove measurements no longer in external state
      const externalMeasurementIds = new Set(externalEditorState.measurements?.map((m) => m.id) ?? []);
      measurements.forEach((m) => {
        if (!externalMeasurementIds.has(m.id)) {
          const scene = sceneRef.current;
          if (scene) {
            const obj = measurementObjectMapRef.current.get(m.id);
            if (obj) {
              obj.markers.forEach((mk) => { scene.remove(mk); mk.geometry.dispose(); mk.material.dispose(); });
              scene.remove(obj.line); obj.line.geometry.dispose(); obj.line.material.dispose();
              scene.remove(obj.label); obj.label.material.map.dispose(); obj.label.material.dispose();
              measurementObjectMapRef.current.delete(m.id);
            }
          }
          setMeasurements((prev) => prev.filter((x) => x.id !== m.id));
        }
      });

      // Sync paint
      if (externalEditorState.segmentColors) {
        applySegmentColors(externalEditorState.segmentColors);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditorState]);

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
      if (event.button !== 0) return;

      if (activeTool === 'segment') {
        if (activeScene !== 4 || !persistentModelRef.current) {
          pushToast('Import a model first.');
          return;
        }
        const intersection = getPointerIntersection(event, true);
        if (!intersection) {
          pushToast('Click on the imported model surface.');
          return;
        }
        paintSegmentationAtPoint(intersection);
        segmentPaintingRef.current = true;
        segmentControlsWereEnabledRef.current = controlsRef.current?.enabled ?? true;
        if (dom.setPointerCapture && event.pointerId != null) {
          try {
            dom.setPointerCapture(event.pointerId);
          } catch {
            // Ignore browsers/platforms that reject capture for this pointer.
          }
        }
        if (controlsRef.current) controlsRef.current.enabled = false;
        return;
      }

      const markerId = getMarkerHitFromPointer(event);
      if (markerId) {
        promptRenameMarker(markerId);
        return;
      }

      if (activeTool !== 'measure' && activeTool !== 'annotate') return;

      const intersection = getPointerIntersection(event, false);
      if (!intersection) {
        pushToast('Click on the model surface.');
        return;
      }

      const hitPoint = intersection.point.clone();
      if (activeTool === 'measure') addMeasurementPoint(hitPoint);
      if (activeTool === 'annotate') addMarkerAtPoint(hitPoint);
    };

    const handlePointerMove = (event) => {
      if (activeTool !== 'segment' || !segmentPaintingRef.current) return;
      paintSegmentationFromEvent(event);
    };

    const stopSegmentPainting = (event) => {
      if (!segmentPaintingRef.current) return;
      segmentPaintingRef.current = false;
      segmentLastPaintPointRef.current = null;
      if (dom.releasePointerCapture && event?.pointerId != null) {
        try {
          if (dom.hasPointerCapture?.(event.pointerId)) {
            dom.releasePointerCapture(event.pointerId);
          }
        } catch {
          // Ignore capture release failures.
        }
      }
      if (controlsRef.current) {
        controlsRef.current.enabled = segmentControlsWereEnabledRef.current;
      }
      queueSegmentPreviewRefresh();
      setPaintVersion((v) => v + 1);
    };

    dom.addEventListener('pointerdown', handlePointerDown);
    dom.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopSegmentPainting);
    window.addEventListener('pointercancel', stopSegmentPainting);
    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      dom.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopSegmentPainting);
      window.removeEventListener('pointercancel', stopSegmentPainting);
      stopSegmentPainting();
    };
  }, [activeTool, activeScene, importedModel, markers, segmentBrushRadius, activeSegmentGroupId]);

  useEffect(() => {
    if (!gridHelperRef.current || !axesHelperRef.current) return;
    gridHelperRef.current.visible = gridVisible;
    axesHelperRef.current.visible = axesVisible;
  }, [gridVisible, axesVisible]);

  useEffect(() => {
    if (activeTool !== 'segment') {
      segmentPaintingRef.current = false;
      segmentLastPaintPointRef.current = null;
      if (controlsRef.current) {
        controlsRef.current.enabled = segmentControlsWereEnabledRef.current;
      }
      return;
    }

    if (shadingMode !== 'solid') {
      pushToast('Segmentation colors are visible in Solid shading mode.');
    }
  }, [activeTool, shadingMode]);

  useEffect(() => {
    refreshSegmentationColors();
  }, [segmentIsolateActive, activeSegmentGroupId]);

  useEffect(() => {
    if (!segmentOffsetPreviewActive || activeScene !== 4 || !persistentModelRef.current) {
      removeSegmentOffsetPreview();
      return;
    }

    ensureSegmentOffsetPreview();
    return () => {
      // Keep preview across normal re-renders; cleanup handled by toggle/model changes.
    };
  }, [
    segmentOffsetPreviewActive,
    segmentBaseOffsetMm,
    segmentReliefClearanceByGroup,
    segmentIsolateActive,
    activeSegmentGroupId,
    activeScene,
    importedModel,
    modelMeta?.normalizationScale,
    segmentPreviewRevision
  ]);

  useEffect(() => () => removeSegmentOffsetPreview(), []);

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
        if (child.userData?.isSegmentOffsetPreview) return;
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
        if (child === persistentModelRef.current) {
          updateSegmentMaterialState(child);
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

    controls.onInteractionEnd = () => {
      if (!camera) return;
      cameraStateRef.current = {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z },
      };
    };

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

    updateMarkerSpritePositions();
    updateMeasurementLabelPositions();

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
  const isMobileViewport = viewportWidth < 768;
  const isTabletViewport = viewportWidth >= 768 && viewportWidth < 1180;
  const resolvedModelMeta = getResolvedModelMeta();
  const resolvedSpatialOrientation = getResolvedSpatialOrientation();
  const orientationAxisSummary = getOrientationAxisSummary();

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth || document.documentElement.clientWidth || 1280);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) {
      return;
    }

    setShowModelInfoPanel(false);
    setShowSlicerPanel(false);
  }, [isMobileViewport]);

  const tourSteps = [];

  if (!readOnly) {
    tourSteps.push({
      id: 'import',
      title: hasLoadedModel ? 'Import or replace a patient model' : 'Import your first patient model',
      body: hasLoadedModel
        ? 'Use the Import Model button in the top bar whenever you want to replace the current STL, OBJ, or PLY file.'
        : 'Start from the Import Model button in the top bar to load a de-identified STL, OBJ, or PLY file into the workspace.',
      detail: 'Top bar > Import Model',
    });
  }

  tourSteps.push({
    id: 'navigate',
    title: 'Move around the 3D scene',
    body: 'Left-drag to orbit, right-drag to pan, and use the mouse wheel or trackpad to zoom in on anatomy.',
    detail: 'Try rotating the model until the anatomy is oriented the way you expect.',
  });

  if (!readOnly) {
    tourSteps.push(
      {
        id: 'measure',
        title: 'Measure anatomy or implant distances',
        body: 'The tour opens the Tools panel in Measure mode so you can click two points on the model and capture a distance.',
        detail: 'Tools > Measure, then click two points on the surface.',
      },
      {
        id: 'annotate',
        title: 'Drop annotations and review markers',
        body: 'Switch to Annotate mode to place markers, rename them, and export a simple marker list for handoff.',
        detail: 'Tools > Annotate, then click the model to add a marker.',
      },
      {
        id: 'slice',
        title: 'Inspect internal geometry with slicing or trim',
        body: 'Open the slicer or trim workflow when you need cross-sections, clipping, or controlled material removal.',
        detail: 'Tools > Slice or Trim to inspect internal regions.',
      }
    );
  }

  tourSteps.push({
    id: 'model-info',
    title: readOnly ? 'Review orientation and unit assumptions' : 'Confirm orientation and unit assumptions',
    body: readOnly
      ? 'Model Info shows the detected import scale, units, and anatomical axes for this shared review. Signed-in editors can confirm them before using measurements clinically.'
      : 'Model Info lets you confirm import scale, units, and anatomical axes before you rely on measurements clinically.',
    detail: readOnly
      ? 'Open Model Info and review the detected units plus the +X / +Y / +Z orientation reference.'
      : 'Open Model Info and confirm +X / +Y / +Z orientation.',
  });

  if (showShareToggle) {
    tourSteps.push({
      id: 'share',
      title: 'Share the case link with collaborators',
      body: 'Use the Share Link drawer to copy or review the case URL you can hand off to a teammate.',
      detail: 'Top bar > Share Link',
    });
  }

  if (showCommentsToggle) {
    tourSteps.push({
      id: 'comments',
      title: 'Coordinate review notes with comments',
      body: 'The comments area is where the team can capture review observations, questions, and handoff notes.',
      detail: 'Top bar > Team Comments',
    });
  }

  tourSteps.push({
    id: 'export',
    title: 'Export the deliverable you need',
    body: 'Use Export for STL, OBJ, or PNG output and use Report when you need HTML or PDF review summaries.',
    detail: 'Top bar > Export or Report',
  });

  const currentTourStep = tourSteps[tourStepIndex] ?? null;
  const currentTourStepId = currentTourStep?.id ?? null;
  const currentTourTargetId =
    currentTourStepId === 'import'
      ? 'import-button'
      : currentTourStepId === 'navigate'
        ? 'canvas-viewport'
        : currentTourStepId === 'measure'
          ? 'measure-button'
          : currentTourStepId === 'annotate'
            ? 'annotate-button'
            : currentTourStepId === 'slice'
              ? 'slicer-panel'
              : currentTourStepId === 'model-info'
                ? 'model-info-panel'
                : currentTourStepId === 'share'
                  ? 'share-button'
                  : currentTourStepId === 'comments'
                    ? 'comments-button'
                    : currentTourStepId === 'export'
                      ? 'export-button'
                      : null;

  useEffect(() => {
    if (!tourOpen || !currentTourStepId) return;

    const wantsToolsPanel = !readOnly && (currentTourStepId === 'measure' || currentTourStepId === 'annotate');
    const wantsSlicerPanel = !readOnly && currentTourStepId === 'slice';
    const wantsModelInfoPanel = currentTourStepId === 'model-info';
    const wantsSharePanel = currentTourStepId === 'share';
    const wantsCommentsPanel = currentTourStepId === 'comments';

    setShowToolsPanel(wantsToolsPanel);
    setShowSlicerPanel(wantsSlicerPanel);
    setShowModelInfoPanel(wantsModelInfoPanel);

    if (!readOnly && currentTourStepId === 'measure') {
      setActiveTool('measure');
    }

    if (!readOnly && currentTourStepId === 'annotate') {
      setActiveTool('annotate');
    }

    if (!readOnly && currentTourStepId === 'slice') {
      setActiveTool('slice');
    }

    if (showShareToggle && onToggleSharePanel && sharePanelOpen !== wantsSharePanel) {
      onToggleSharePanel();
    }

    if (showCommentsToggle && onToggleCommentsPanel && commentsPanelOpen !== wantsCommentsPanel) {
      onToggleCommentsPanel();
    }
  }, [
    commentsPanelOpen,
    currentTourStepId,
    onToggleCommentsPanel,
    onToggleSharePanel,
    readOnly,
    sharePanelOpen,
    showCommentsToggle,
    showShareToggle,
    tourOpen,
  ]);

  useEffect(() => {
    if (!tourOpen || !currentTourTargetId) {
      setTourTargetRect(null);
      setTourCardRect(null);
      return;
    }

    let frameId = 0;
    let timeoutId = 0;

    const updateTargetRect = () => {
      const target = document.querySelector(`[data-tour-id="${currentTourTargetId}"]`);
      if (!target) {
        setTourTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTourTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom,
      });

      if (tourCardRef.current) {
        const cardRect = tourCardRef.current.getBoundingClientRect();
        setTourCardRect({
          top: cardRect.top,
          left: cardRect.left,
          width: cardRect.width,
          height: cardRect.height,
          right: cardRect.right,
          bottom: cardRect.bottom,
        });
      }
    };

    const scheduleMeasure = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateTargetRect);
    };

    timeoutId = window.setTimeout(scheduleMeasure, 160);
    scheduleMeasure();

    window.addEventListener('resize', scheduleMeasure);
    window.addEventListener('scroll', scheduleMeasure, true);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('resize', scheduleMeasure);
      window.removeEventListener('scroll', scheduleMeasure, true);
    };
  }, [
    activeTool,
    commentsPanelOpen,
    currentTourTargetId,
    sharePanelOpen,
    showModelInfoPanel,
    showSlicerPanel,
    showToolsPanel,
    tourOpen,
  ]);

  const goToNextTourStep = () => {
    if (tourStepIndex >= tourSteps.length - 1) {
      closeTour();
      return;
    }
    setTourStepIndex((current) => Math.min(current + 1, tourSteps.length - 1));
  };

  const goToPreviousTourStep = () => {
    setTourStepIndex((current) => Math.max(current - 1, 0));
  };

  const tourTooltipStyle = (() => {
    if (!tourTargetRect || typeof window === 'undefined') {
      return {
        position: 'fixed',
        right: isMobileViewport ? '12px' : '18px',
        left: isMobileViewport ? '12px' : 'auto',
        bottom: isMobileViewport ? '68px' : '72px',
        width: isMobileViewport ? 'auto' : 'min(360px, calc(100vw - 36px))',
      };
    }

    const padding = 12;
    const topbarRect = document.querySelector('[data-tour-id="editor-topbar"]')?.getBoundingClientRect() ?? null;
    const safeTop = Math.max(padding, (topbarRect?.bottom ?? 0) + 12);
    const tooltipWidth = isMobileViewport ? Math.min(window.innerWidth - 24, 340) : 340;
    const tooltipHeightEstimate = Math.max(260, tourCardRect?.height ?? 0);
    const rightSpace = window.innerWidth - tourTargetRect.right - padding;
    const leftSpace = tourTargetRect.left - padding;
    const exportMenuClearance = 210;
    const shouldDockBottomLeft =
      !isMobileViewport &&
      (currentTourStepId === 'measure' ||
        currentTourStepId === 'annotate' ||
        currentTourStepId === 'slice');

    if (shouldDockBottomLeft) {
      return {
        position: 'fixed',
        left: `${padding}px`,
        bottom: '72px',
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
      };
    }

    if (!isMobileViewport && currentTourStepId === 'export') {
      const left = Math.max(
        padding,
        Math.min(
          tourTargetRect.left - tooltipWidth - exportMenuClearance,
          window.innerWidth - tooltipWidth - padding
        )
      );
      const top = Math.min(
        window.innerHeight - tooltipHeightEstimate - padding,
        Math.max(safeTop + 36, tourTargetRect.bottom + 28)
      );

      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
      };
    }

    if (!isMobileViewport && rightSpace >= tooltipWidth + 24) {
      const top = Math.min(
        Math.max(safeTop, tourTargetRect.top + tourTargetRect.height / 2 - tooltipHeightEstimate / 2),
        window.innerHeight - tooltipHeightEstimate - padding
      );
      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${tourTargetRect.right + 18}px`,
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
      };
    }

    if (!isMobileViewport && leftSpace >= tooltipWidth + 24) {
      const top = Math.min(
        Math.max(safeTop, tourTargetRect.top + tourTargetRect.height / 2 - tooltipHeightEstimate / 2),
        window.innerHeight - tooltipHeightEstimate - padding
      );
      return {
        position: 'fixed',
        top: `${top}px`,
        left: `${Math.max(padding, tourTargetRect.left - tooltipWidth - 18)}px`,
        width: `${tooltipWidth}px`,
        maxWidth: `calc(100vw - ${padding * 2}px)`,
      };
    }

    const preferredLeft = Math.min(
      Math.max(padding, tourTargetRect.left),
      Math.max(padding, window.innerWidth - tooltipWidth - padding)
    );
    const showBelow = tourTargetRect.bottom + 18 + tooltipHeightEstimate < window.innerHeight;
    const top = showBelow
      ? Math.min(window.innerHeight - tooltipHeightEstimate - padding, Math.max(safeTop, tourTargetRect.bottom + 16))
      : Math.max(safeTop, tourTargetRect.top - tooltipHeightEstimate - 16);

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${preferredLeft}px`,
      width: `${tooltipWidth}px`,
      maxWidth: `calc(100vw - ${padding * 2}px)`,
    };
  })();

  const tourConnector = (() => {
    if (!tourTargetRect || !tourCardRect || typeof window === 'undefined') {
      return null;
    }

    const targetX = tourTargetRect.left + tourTargetRect.width / 2;
    const targetY = tourTargetRect.top + tourTargetRect.height / 2;
    const cardCenterX = tourCardRect.left + tourCardRect.width / 2;
    const cardCenterY = tourCardRect.top + tourCardRect.height / 2;

    const startX = targetX < cardCenterX ? tourCardRect.left : tourCardRect.right;
    const startY = Math.max(tourCardRect.top + 22, Math.min(targetY, tourCardRect.bottom - 22));

    const deltaX = targetX - startX;
    const midX = startX + deltaX * 0.55;
    const path = `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${targetY}, ${targetX} ${targetY}`;

    return { path, targetX, targetY };
  })();

  return (
    <div style={{ width: '100%', height: '100vh', backgroundColor: `#${theme.background.toString(16).padStart(6, '0')}`, position: 'relative', overflow: 'hidden', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <div ref={containerRef} data-tour-id="canvas-viewport" style={{ width: '100%', height: '100%' }} />
      
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
        readOnly={readOnly}
        onExportStl={exportCurrentModelStl}
        onExportObj={exportCurrentModelObj}
        onExportPng={exportScreenshot}
        onExportReportHtml={exportReportHtml}
        onExportReportPdf={exportReportPdf}
        onGoHome={onGoHome}
        isCompact={isMobileViewport}
        showSceneSelector={false}
        showTourToggle
        tourOpen={tourOpen}
        onToggleTour={toggleTour}
        showShareToggle={showShareToggle}
        sharePanelOpen={sharePanelOpen}
        onToggleSharePanel={onToggleSharePanel}
        showCommentsToggle={showCommentsToggle}
        commentsPanelOpen={commentsPanelOpen}
        onToggleCommentsPanel={onToggleCommentsPanel}
        editorSaveStatus={editorSaveStatus}
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
        isMobile={isMobileViewport}
        isTablet={isTabletViewport}
      />

      <ToolsPanel
        show={readOnly ? false : showToolsPanel}
        activeTheme={activeTheme}
        theme={theme}
        setShow={setShowToolsPanel}
        showSlicerPanel={showSlicerPanel}
        setShowSlicerPanel={setShowSlicerPanel}
        showModelInfoPanel={showModelInfoPanel}
        setShowModelInfoPanel={setShowModelInfoPanel}
        showOrientationCard={showOrientationCard}
        setShowOrientationCard={setShowOrientationCard}
        onResetCamera={resetCameraView}
        onShowHelp={() =>
          pushToast(
            'Controls: left drag orbit, right drag pan, wheel zoom. Undo/Redo: Ctrl+Z, Ctrl+Y, or Ctrl+Shift+Z.'
          )
        }
        onExportStl={exportCurrentModelStl}
        onExportObj={exportCurrentModelObj}
        onExportPng={exportScreenshot}
        onExportReportHtml={exportReportHtml}
        onExportReportPdf={exportReportPdf}
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
        segmentGroupPalette={SEGMENT_GROUPS.map((group) => ({
          id: group.id,
          label: group.label,
          color: `#${group.color.toString(16).padStart(6, '0')}`
        }))}
        activeSegmentGroupId={activeSegmentGroupId}
        setActiveSegmentGroupId={setActiveSegmentGroupId}
        segmentBrushRadius={segmentBrushRadius}
        setSegmentBrushRadius={setSegmentBrushRadius}
        segmentIsolateActive={segmentIsolateActive}
        setSegmentIsolateActive={setSegmentIsolateActive}
        segmentBaseOffsetMm={segmentBaseOffsetMm}
        setSegmentBaseOffsetMm={setSegmentBaseOffsetMm}
        segmentReliefClearanceByGroup={segmentReliefClearanceByGroup}
        onSetSegmentReliefClearance={setSegmentReliefClearance}
        segmentOffsetPreviewActive={segmentOffsetPreviewActive}
        setSegmentOffsetPreviewActive={setSegmentOffsetPreviewActive}
        onClearSegmentation={clearSegmentation}
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
        isMobile={isMobileViewport}
        isTablet={isTabletViewport}
      />

      <ModelInfoPanel
        show={showModelInfoPanel}
        setShow={setShowModelInfoPanel}
        activeTheme={activeTheme}
        theme={theme}
        showSlicerPanel={showSlicerPanel}
        modelMeta={resolvedModelMeta}
        readOnly={readOnly}
        unitOptions={SPATIAL_UNIT_OPTIONS}
        selectedUnit={resolvedModelMeta?.sourceUnit ?? null}
        calibrationStatus={resolvedModelMeta?.calibrationStatus ?? null}
        onUnitChange={(nextUnit) => {
          const option = getUnitOption(nextUnit);
          applySpatialCalibration({
            sourceUnit: option.value,
            unitScaleToMm: option.unitScaleToMm,
            status: 'confirmed'
          });
        }}
        onConfirmUnit={confirmSpatialCalibration}
        spatialOrientation={resolvedSpatialOrientation}
        orientationOptions={ORIENTATION_DIRECTION_OPTIONS}
        orientationIsValid={isSpatialOrientationValid(resolvedSpatialOrientation)}
        onOrientationChange={updateSpatialOrientationDraft}
        onConfirmOrientation={confirmSpatialOrientation}
        onResetOrientation={resetSpatialOrientation}
        isMobile={isMobileViewport}
        isTablet={isTabletViewport}
      />

      {persistentModelRef.current && showOrientationCard ? (
        <div
          style={{
            position: 'absolute',
            top: isMobileViewport ? '118px' : '78px',
            left: '16px',
            minWidth: isMobileViewport ? 'auto' : '220px',
            maxWidth: isMobileViewport ? 'calc(100vw - 32px)' : '280px',
            padding: '10px 12px',
            borderRadius: '14px',
            background: activeTheme === 1 ? 'rgba(255, 255, 255, 0.92)' : 'rgba(12, 20, 32, 0.84)',
            border: `1px solid ${activeTheme === 1 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
            color: activeTheme === 1 ? '#1f2a3a' : '#d8deec',
            fontSize: '11px',
            lineHeight: 1.5,
            zIndex: 118,
            backdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
            <div style={{ fontWeight: 800, letterSpacing: '0.22em', textTransform: 'uppercase', opacity: 0.7 }}>
              Orientation
            </div>
            <button
              onClick={() => setShowOrientationCard(false)}
              style={{
                border: 'none',
                background: 'transparent',
                color: activeTheme === 1 ? '#5a6372' : '#9ca3af',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 700,
                lineHeight: 1,
                padding: 0
              }}
              aria-label="Hide orientation card"
              title="Hide orientation card"
            >
              ×
            </button>
          </div>
          {orientationAxisSummary.status === 'confirmed' ? (
            <>
              {orientationAxisSummary.axes.map((axisInfo) => (
                <div key={axisInfo.axis}>
                  <strong>{axisInfo.axis}:</strong> +{axisInfo.positive.shortLabel} / -{axisInfo.negative.shortLabel}
                </div>
              ))}
            </>
          ) : (
            <div style={{ opacity: 0.8 }}>
              Anatomical orientation is not confirmed yet. Confirm +X/+Y/+Z in Model Info before clinical review.
            </div>
          )}
        </div>
      ) : null}

      {!isMobileViewport ? (
        <div
          style={{
            position: 'absolute',
            right: '14px',
            bottom: '52px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '7px 10px',
            borderRadius: '999px',
            background: activeTheme === 1 ? 'rgba(255, 255, 255, 0.86)' : 'rgba(16, 20, 33, 0.78)',
            border: `1px solid ${activeTheme === 1 ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.14)'}`,
            color: activeTheme === 1 ? '#1f2a3a' : '#d8deec',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.25px',
            zIndex: 115,
            pointerEvents: 'none'
          }}
        >
          <img src={medvizLogo} alt="MedViz" style={{ width: '15px', height: '15px', objectFit: 'contain', opacity: 0.95 }} />
          <span>MedViz 3D Review</span>
        </div>
      ) : null}

      {tourOpen && currentTourStep ? (
        <>
          {tourConnector ? (
            <svg
              width={typeof window === 'undefined' ? 0 : window.innerWidth}
              height={typeof window === 'undefined' ? 0 : window.innerHeight}
              style={{
                position: 'fixed',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 359,
                overflow: 'visible',
              }}
            >
              <defs>
                <marker id="tour-arrowhead" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={theme.accent} />
                </marker>
              </defs>
              <path
                d={tourConnector.path}
                fill="none"
                stroke={theme.accent}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="10 8"
                markerEnd="url(#tour-arrowhead)"
              />
              <circle cx={tourConnector.targetX} cy={tourConnector.targetY} r="7" fill={theme.accent} fillOpacity="0.18" />
              <circle cx={tourConnector.targetX} cy={tourConnector.targetY} r="4" fill={theme.accent} />
            </svg>
          ) : null}
          {tourTargetRect ? (
            <div
              style={{
                position: 'fixed',
                top: `${Math.max(6, tourTargetRect.top - 6)}px`,
                left: `${Math.max(6, tourTargetRect.left - 6)}px`,
                width: `${tourTargetRect.width + 12}px`,
                height: `${tourTargetRect.height + 12}px`,
                borderRadius: '16px',
                border: `2px solid ${theme.accent}`,
                boxShadow: `0 0 0 9999px rgba(3, 10, 18, 0.32), 0 0 0 6px ${theme.accent}22`,
                pointerEvents: 'none',
                zIndex: 358,
                transition: 'top 180ms ease, left 180ms ease, width 180ms ease, height 180ms ease',
              }}
            />
          ) : null}
          <div
            ref={tourCardRef}
            style={{
              ...tourTooltipStyle,
              padding: isMobileViewport ? '14px' : '16px',
              borderRadius: '18px',
              background:
                activeTheme === 1
                  ? 'linear-gradient(160deg, rgba(255,255,255,0.96), rgba(241,247,255,0.94))'
                  : 'linear-gradient(160deg, rgba(7,18,31,0.96), rgba(13,32,53,0.94))',
              border: `1px solid ${activeTheme === 1 ? 'rgba(0,0,0,0.08)' : 'rgba(118,214,255,0.2)'}`,
              boxShadow: activeTheme === 1 ? '0 20px 48px rgba(21,28,37,0.16)' : '0 22px 56px rgba(1,8,15,0.52)',
              backdropFilter: 'blur(14px)',
              color: activeTheme === 1 ? '#172133' : '#e6f2ff',
              zIndex: 360,
            }}
          >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  color: theme.accent,
                }}
              >
                Guided Tour
              </div>
              <div style={{ marginTop: '6px', fontSize: isMobileViewport ? '19px' : '20px', fontWeight: 800, lineHeight: 1.25 }}>
                {currentTourStep.title}
              </div>
            </div>
            <button
              type="button"
              onClick={closeTour}
              style={{
                border: 'none',
                background: 'transparent',
                color: activeTheme === 1 ? '#5a6372' : '#9fb6cc',
                fontSize: '18px',
                lineHeight: 1,
                cursor: 'pointer',
                padding: 0,
              }}
              aria-label="Close guided tour"
              title="Close guided tour"
            >
              ×
            </button>
          </div>

          <div style={{ marginTop: '10px', fontSize: '13px', lineHeight: 1.6, color: activeTheme === 1 ? '#304055' : '#c3d6eb' }}>
            {currentTourStep.body}
          </div>

          <div
            style={{
              marginTop: '12px',
              padding: '10px 12px',
              borderRadius: '12px',
              background: activeTheme === 1 ? 'rgba(23,33,51,0.06)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${activeTheme === 1 ? 'rgba(23,33,51,0.08)' : 'rgba(255,255,255,0.08)'}`,
              fontSize: '12px',
              lineHeight: 1.5,
              color: activeTheme === 1 ? '#43546c' : '#b4c9dd',
            }}
          >
            {currentTourStep.detail}
          </div>

          <div style={{ marginTop: '8px', fontSize: '12px', color: activeTheme === 1 ? '#5a6372' : '#9fb6cc' }}>
            {tourTargetRect ? 'Follow the highlighted control or panel.' : 'Waiting for the target control to appear.'}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {tourSteps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                onClick={() => setTourStepIndex(index)}
                style={{
                  width: '11px',
                  height: '11px',
                  borderRadius: '999px',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  background:
                    index === tourStepIndex
                      ? theme.accent
                      : activeTheme === 1
                        ? 'rgba(23,33,51,0.14)'
                        : 'rgba(255,255,255,0.18)',
                }}
                aria-label={`Go to tour step ${index + 1}`}
                title={`Step ${index + 1}: ${step.title}`}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: '12px', color: activeTheme === 1 ? '#5a6372' : '#9fb6cc' }}>
              Step {tourStepIndex + 1} of {tourSteps.length}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={goToPreviousTourStep}
                disabled={tourStepIndex === 0}
                style={{
                  padding: '8px 11px',
                  borderRadius: '10px',
                  border: `1px solid ${activeTheme === 1 ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.12)'}`,
                  background: activeTheme === 1 ? '#f2f5f8' : 'rgba(255,255,255,0.06)',
                  color: activeTheme === 1 ? '#3d4d63' : '#d2e4f5',
                  cursor: tourStepIndex === 0 ? 'not-allowed' : 'pointer',
                  opacity: tourStepIndex === 0 ? 0.45 : 1,
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Back
              </button>
              <button
                type="button"
                onClick={goToNextTourStep}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  background: theme.accent,
                  color: '#04111d',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 800,
                }}
              >
                {tourStepIndex === tourSteps.length - 1 ? 'Finish Tour' : 'Next Step'}
              </button>
            </div>
          </div>
          </div>
        </>
      ) : null}

      <StatusBar
        activeTheme={activeTheme}
        sceneName={sceneNames[activeScene]}
        activeTool={activeTool}
        fps={fps}
        sourceUnit={resolvedModelMeta?.sourceUnit ?? null}
        calibrationStatus={resolvedModelMeta?.calibrationStatus ?? null}
        orientationStatus={resolvedSpatialOrientation.status}
        isCompact={isMobileViewport}
      />
      <ToastStack toasts={toasts} />
    </div>
  );
};

export default Medical3DCanvas;
