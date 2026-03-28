import { getPanelStyle, getToolButtonStyle, getUiPalette } from './styles';

const SlicerPanel = ({
  show,
  activeTheme,
  theme,
  setShow,
  slicingEnabled,
  setSlicingEnabled,
  sliceAxis,
  setSliceAxis,
  slicePosition,
  setSlicePosition,
  showSlicePlane,
  setShowSlicePlane,
  applyPermanentCut,
  cutApplied,
  hasImportedModel,
  resetCut,
  isMobile = false,
  isTablet = false
}) => {
  if (!show) return null;
  const palette = getUiPalette(activeTheme, theme);

  return (
    <div
      data-tour-id="slicer-panel"
      style={{
        ...getPanelStyle(activeTheme, '80px', 'right', { isMobile, isTablet }),
        background: palette.panelBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${palette.border}`,
        overflow: 'auto',
        maxHeight: isMobile ? '52vh' : '75vh'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <strong style={{ color: palette.text }}>Slicing Plane</strong>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setSlicingEnabled(!slicingEnabled)} style={getToolButtonStyle(slicingEnabled, palette)}>
            {slicingEnabled ? 'ON' : 'OFF'}
          </button>
          <button onClick={() => setShow(false)} style={getToolButtonStyle(false, palette)}>
            Close
          </button>
        </div>
      </div>

      {slicingEnabled ? (
        <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {['x', 'y', 'z'].map((axis) => (
              <button key={axis} onClick={() => setSliceAxis(axis)} style={getToolButtonStyle(sliceAxis === axis, palette)}>
                {axis.toUpperCase()}
              </button>
            ))}
          </div>
          <label style={{ color: palette.muted, fontSize: '12px' }}>Position: {slicePosition.toFixed(2)}</label>
          <input
            type="range"
            min="-5"
            max="5"
            step="0.05"
            value={slicePosition}
            onChange={(e) => setSlicePosition(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
          <label style={{ display: 'block', marginTop: '8px', color: palette.muted, fontSize: '12px' }}>
            <input type="checkbox" checked={showSlicePlane} onChange={(e) => setShowSlicePlane(e.target.checked)} /> Show
            slice plane
          </label>
          <button onClick={() => setSlicePosition(0)} style={{ ...getToolButtonStyle(false, palette), marginTop: '8px' }}>
            Reset to Center
          </button>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            <button
              onClick={applyPermanentCut}
              disabled={cutApplied || !hasImportedModel}
              style={{ ...getToolButtonStyle(false, palette), flex: 1, opacity: cutApplied || !hasImportedModel ? 0.55 : 1 }}
            >
              Apply Cut
            </button>
            <button
              onClick={resetCut}
              disabled={!cutApplied}
              style={{ ...getToolButtonStyle(false, palette), flex: 1, opacity: cutApplied ? 1 : 0.55 }}
            >
              Reset Cut
            </button>
          </div>
        </>
      ) : (
        <div style={{ color: palette.muted, fontSize: '12px' }}>Enable slicing to inspect internal cross-sections.</div>
      )}
    </div>
  );
};

export default SlicerPanel;
