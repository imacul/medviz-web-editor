import { getPanelStyle, getToolButtonStyle, getUiPalette } from './styles';

const ToolsPanel = ({
  show,
  activeTheme,
  theme,
  setShow,
  showSlicerPanel,
  setShowSlicerPanel,
  showModelInfoPanel,
  setShowModelInfoPanel,
  onResetCamera,
  onShowHelp,
  onExportStl,
  onExportObj,
  onExportPng,
  onExportReport,
  includeOverlaysInScreenshot,
  setIncludeOverlaysInScreenshot,
  activeScene,
  hasImportedModel,
  gizmosEnabled,
  setGizmosEnabled,
  transformMode,
  setTransformMode,
  onResetTransform,
  activeTool,
  setActiveTool,
  measurements,
  onClearMeasurements,
  markers,
  onRenameMarker,
  onDeleteMarker,
  onExportMarkers,
  onClearMarkers,
  segmentGroupPalette,
  activeSegmentGroupId,
  setActiveSegmentGroupId,
  segmentBrushRadius,
  setSegmentBrushRadius,
  segmentIsolateActive,
  setSegmentIsolateActive,
  segmentBaseOffsetMm,
  setSegmentBaseOffsetMm,
  segmentReliefClearanceByGroup,
  onSetSegmentReliefClearance,
  segmentOffsetPreviewActive,
  setSegmentOffsetPreviewActive,
  onClearSegmentation,
  gridVisible,
  setGridVisible,
  axesVisible,
  setAxesVisible,
  shadowsEnabled,
  setShadowsEnabled,
  wireframeEnabled,
  setWireframeEnabled,
  shadingMode,
  setShadingMode,
  centerMarkerVisible,
  setCenterMarkerVisible,
  trimMode,
  setTrimMode,
  trimPlaneSide,
  setTrimPlaneSide,
  trimBoxSize,
  setTrimBoxSize,
  trimBoxKeep,
  setTrimBoxKeep,
  showTrimBox,
  setShowTrimBox,
  onApplyTrim,
  onUndoTrim,
  onRedoTrim,
  trimHistoryDepth,
  trimRedoDepth
}) => {
  if (!show) return null;
  const palette = getUiPalette(activeTheme, theme);

  return (
    <div
      className="invisible-scrollbar"
      style={{
        ...getPanelStyle(activeTheme, '80px', 'left'),
        background: palette.panelBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${palette.border}`,
        maxHeight: '75vh',
        overflow: 'auto'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong style={{ color: palette.text }}>Tools</strong>
        <button style={getToolButtonStyle(false, palette)} onClick={() => setShow(false)}>
          Close
        </button>
      </div>

      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {['measure', 'segment', 'slice', 'annotate', 'trim', 'transform'].map((tool) => (
          <button key={tool} onClick={() => setActiveTool(tool)} style={getToolButtonStyle(activeTool === tool, palette)}>
            {tool}
          </button>
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
        <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Viewer</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button onClick={() => setGridVisible(!gridVisible)} style={getToolButtonStyle(gridVisible, palette)}>
            Grid
          </button>
          <button onClick={() => setAxesVisible(!axesVisible)} style={getToolButtonStyle(axesVisible, palette)}>
            Axes
          </button>
          <button onClick={() => setShadowsEnabled(!shadowsEnabled)} style={getToolButtonStyle(shadowsEnabled, palette)}>
            Shadows
          </button>
          <button onClick={() => setWireframeEnabled(!wireframeEnabled)} style={getToolButtonStyle(wireframeEnabled, palette)}>
            Wireframe
          </button>
          <button
            onClick={() => setCenterMarkerVisible(!centerMarkerVisible)}
            style={getToolButtonStyle(centerMarkerVisible, palette)}
          >
            Center
          </button>
        </div>
        <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
          <button onClick={() => setShadingMode('solid')} style={getToolButtonStyle(shadingMode === 'solid', palette)}>
            Solid
          </button>
          <button onClick={() => setShadingMode('normal')} style={getToolButtonStyle(shadingMode === 'normal', palette)}>
            Normal
          </button>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
        <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Workspace</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button onClick={() => setShowSlicerPanel(!showSlicerPanel)} style={getToolButtonStyle(showSlicerPanel, palette)}>
            Slicer Panel
          </button>
          <button
            onClick={() => setShowModelInfoPanel(!showModelInfoPanel)}
            style={getToolButtonStyle(showModelInfoPanel, palette)}
          >
            Model Info
          </button>
          <button onClick={onResetCamera} style={getToolButtonStyle(false, palette)}>
            Reset Camera
          </button>
          <button onClick={onShowHelp} style={getToolButtonStyle(false, palette)}>
            Help
          </button>
        </div>
        <label style={{ color: palette.muted, fontSize: '12px', display: 'block', marginTop: '8px' }}>
          <input
            type="checkbox"
            checked={includeOverlaysInScreenshot}
            onChange={(e) => setIncludeOverlaysInScreenshot(e.target.checked)}
            style={{ marginRight: '6px' }}
          />
          Include measurements/markers in screenshot
        </label>
      </div>

      <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
        <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Export</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          <button
            onClick={hasImportedModel ? onExportStl : undefined}
            style={{ ...getToolButtonStyle(false, palette), opacity: hasImportedModel ? 1 : 0.5 }}
          >
            Export STL
          </button>
          <button
            onClick={hasImportedModel ? onExportObj : undefined}
            style={{ ...getToolButtonStyle(false, palette), opacity: hasImportedModel ? 1 : 0.5 }}
          >
            Export OBJ
          </button>
          <button onClick={onExportPng} style={getToolButtonStyle(false, palette)}>
            Screenshot PNG
          </button>
          <button onClick={onExportReport} style={getToolButtonStyle(false, palette)}>
            Export Report
          </button>
        </div>
      </div>

      {activeTool === 'measure' && (
        <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
          <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700 }}>Measurement</div>
          <div style={{ color: palette.muted, fontSize: '12px', margin: '6px 0' }}>
            Click model twice to measure distance.
          </div>
          <div style={{ color: palette.muted, fontSize: '12px', marginBottom: '8px' }}>Count: {measurements.length}</div>
          {measurements.slice(-6).map((m) => (
            <div key={m.id} style={{ fontSize: '12px', color: palette.muted }}>
              {m.id}: {m.distanceMm.toFixed(2)} mm
            </div>
          ))}
          <button onClick={onClearMeasurements} style={{ ...getToolButtonStyle(false, palette), marginTop: '8px' }}>
            Clear Measurements
          </button>
        </div>
      )}

      {activeTool === 'annotate' && (
        <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
          <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>Markers</div>
          <div style={{ color: palette.muted, fontSize: '12px', marginBottom: '8px' }}>Click model to place marker.</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
            <button onClick={onExportMarkers} style={getToolButtonStyle(false, palette)}>
              Export JSON
            </button>
            <button onClick={onClearMarkers} style={getToolButtonStyle(false, palette)}>
              Clear
            </button>
          </div>
          <div style={{ marginTop: '10px', display: 'grid', gap: '6px' }}>
            {markers.map((marker) => (
              <div key={marker.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px', alignItems: 'center' }}>
                <input
                  value={marker.label}
                  onChange={(e) => onRenameMarker(marker.id, e.target.value)}
                  style={{
                    fontSize: '12px',
                    padding: '6px',
                    borderRadius: '6px',
                    border: `1px solid ${palette.border}`,
                    background: '#fff'
                  }}
                />
                <button onClick={() => onDeleteMarker(marker.id)} style={getToolButtonStyle(false, palette)}>
                  Del
                </button>
                <span style={{ fontSize: '11px', color: palette.muted }}>{marker.id}</span>
              </div>
            ))}
            {markers.length === 0 && <span style={{ color: palette.muted, fontSize: '12px' }}>No markers yet.</span>}
          </div>
        </div>
      )}

      {activeTool === 'segment' && (
        <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
          {activeScene === 4 && hasImportedModel ? (
            <>
              <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                Segmentation Brush
              </div>
              <div style={{ color: palette.muted, fontSize: '12px', marginBottom: '8px' }}>
                Click or drag to paint surface zones. Use Base to erase.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {segmentGroupPalette.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => setActiveSegmentGroupId(group.id)}
                    style={{
                      ...getToolButtonStyle(activeSegmentGroupId === group.id, palette),
                      background: activeSegmentGroupId === group.id ? group.color : `${group.color}22`,
                      borderColor: group.color,
                      color: activeSegmentGroupId === group.id ? '#111' : palette.text
                    }}
                  >
                    {group.label}
                  </button>
                ))}
              </div>

              <label style={{ color: palette.muted, fontSize: '12px', display: 'block', marginTop: '10px' }}>
                Brush Radius: {segmentBrushRadius.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.03"
                max="1.25"
                step="0.01"
                value={segmentBrushRadius}
                onChange={(e) => setSegmentBrushRadius(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '8px' }}
              />

              <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                <button onClick={() => setSegmentIsolateActive(!segmentIsolateActive)} style={getToolButtonStyle(segmentIsolateActive, palette)}>
                  {segmentIsolateActive ? 'Isolate ON' : 'Isolate OFF'}
                </button>
                <button
                  onClick={() => setSegmentOffsetPreviewActive(!segmentOffsetPreviewActive)}
                  style={getToolButtonStyle(segmentOffsetPreviewActive, palette)}
                >
                  {segmentOffsetPreviewActive ? 'Shell ON' : 'Shell OFF'}
                </button>
                <button onClick={onClearSegmentation} style={getToolButtonStyle(false, palette)}>
                  Clear Segmentation
                </button>
              </div>

              <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
                <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '6px' }}>
                  Relief Mapping
                </div>
                <label style={{ color: palette.muted, fontSize: '12px', display: 'block' }}>
                  Base Offset (mm): {segmentBaseOffsetMm.toFixed(1)}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="0.1"
                  value={segmentBaseOffsetMm}
                  onChange={(e) => setSegmentBaseOffsetMm(parseFloat(e.target.value))}
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <div style={{ display: 'grid', gap: '6px' }}>
                  {segmentGroupPalette
                    .filter((group) => group.id !== 0)
                    .map((group) => (
                      <label
                        key={`relief-${group.id}`}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'auto 1fr auto',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: palette.muted
                        }}
                      >
                        <span
                          style={{
                            width: '10px',
                            height: '10px',
                            borderRadius: '999px',
                            background: group.color,
                            border: `1px solid ${palette.border}`
                          }}
                        />
                        <span>{group.label} relief (mm)</span>
                        <input
                          type="number"
                          min="0"
                          max="250"
                          step="0.1"
                          value={segmentReliefClearanceByGroup[group.id] ?? 0}
                          onChange={(e) => onSetSegmentReliefClearance(group.id, parseFloat(e.target.value))}
                          style={{
                            width: '64px',
                            fontSize: '12px',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            border: `1px solid ${palette.border}`,
                            background: '#fff'
                          }}
                        />
                      </label>
                    ))}
                </div>
                <div style={{ color: palette.muted, fontSize: '11px', marginTop: '8px' }}>
                  Preview uses normalized model scale. Values are best for workflow tuning, not final fabrication QA.
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: palette.muted, fontSize: '12px' }}>Import STL/OBJ/PLY to use segmentation painting.</div>
          )}
        </div>
      )}

      {activeTool === 'trim' && (
        <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
          <div style={{ color: palette.text, fontSize: '12px', fontWeight: 700, marginBottom: '8px' }}>Simple Trim</div>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <button onClick={() => setTrimMode('plane')} style={getToolButtonStyle(trimMode === 'plane', palette)}>
              Plane Cut
            </button>
            <button onClick={() => setTrimMode('box')} style={getToolButtonStyle(trimMode === 'box', palette)}>
              Box Trim
            </button>
          </div>

          {trimMode === 'plane' && (
            <>
              <div style={{ color: palette.muted, fontSize: '12px', marginBottom: '8px' }}>
                Uses slicer axis/position for the trim plane.
              </div>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button
                  onClick={() => setTrimPlaneSide('positive')}
                  style={getToolButtonStyle(trimPlaneSide === 'positive', palette)}
                >
                  Keep Positive
                </button>
                <button
                  onClick={() => setTrimPlaneSide('negative')}
                  style={getToolButtonStyle(trimPlaneSide === 'negative', palette)}
                >
                  Keep Negative
                </button>
              </div>
            </>
          )}

          {trimMode === 'box' && (
            <>
              <label style={{ color: palette.muted, fontSize: '12px', display: 'block' }}>
                Box Size: {trimBoxSize.toFixed(2)}
              </label>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.1"
                value={trimBoxSize}
                onChange={(e) => setTrimBoxSize(parseFloat(e.target.value))}
                style={{ width: '100%', marginBottom: '8px' }}
              />
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                <button
                  onClick={() => setTrimBoxKeep('inside')}
                  style={getToolButtonStyle(trimBoxKeep === 'inside', palette)}
                >
                  Keep Inside
                </button>
                <button
                  onClick={() => setTrimBoxKeep('outside')}
                  style={getToolButtonStyle(trimBoxKeep === 'outside', palette)}
                >
                  Keep Outside
                </button>
              </div>
              <label style={{ color: palette.muted, fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={showTrimBox}
                  onChange={(e) => setShowTrimBox(e.target.checked)}
                  style={{ marginRight: '6px' }}
                />
                Show trim box
              </label>
            </>
          )}

          <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
            <button onClick={onApplyTrim} style={getToolButtonStyle(false, palette)}>
              Apply Trim
            </button>
            <button
              onClick={onUndoTrim}
              disabled={trimHistoryDepth === 0}
              style={{ ...getToolButtonStyle(false, palette), opacity: trimHistoryDepth === 0 ? 0.5 : 1 }}
            >
              Undo
            </button>
            <button
              onClick={onRedoTrim}
              disabled={trimRedoDepth === 0}
              style={{ ...getToolButtonStyle(false, palette), opacity: trimRedoDepth === 0 ? 0.5 : 1 }}
            >
              Redo
            </button>
          </div>
          <div style={{ color: palette.muted, fontSize: '12px', marginTop: '8px' }}>
            Undo: {trimHistoryDepth} | Redo: {trimRedoDepth}
          </div>
        </div>
      )}

      {activeTool === 'transform' && (
        <div style={{ borderTop: `1px solid ${palette.border}`, paddingTop: '10px', marginTop: '10px' }}>
          {activeScene === 4 && hasImportedModel ? (
            <>
              <button onClick={() => setGizmosEnabled(!gizmosEnabled)} style={getToolButtonStyle(gizmosEnabled, palette)}>
                {gizmosEnabled ? 'Gizmos ON' : 'Gizmos OFF'}
              </button>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button
                  onClick={() => setTransformMode('translate')}
                  style={getToolButtonStyle(transformMode === 'translate', palette)}
                >
                  Move
                </button>
                <button onClick={() => setTransformMode('rotate')} style={getToolButtonStyle(transformMode === 'rotate', palette)}>
                  Rotate
                </button>
                <button onClick={() => setTransformMode('scale')} style={getToolButtonStyle(transformMode === 'scale', palette)}>
                  Scale
                </button>
              </div>
              <button onClick={onResetTransform} style={{ ...getToolButtonStyle(false, palette), marginTop: '8px' }}>
                Reset Transform
              </button>
            </>
          ) : (
            <div style={{ color: palette.muted, fontSize: '12px' }}>Import STL/OBJ/PLY to use transform tools.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ToolsPanel;
