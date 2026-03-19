import medvizLogo from '../../../assets/medviz-logo.svg';

const TOOL_LABELS = {
  none: 'None',
  measure: 'Measure',
  segment: 'Highlight Regions',
  slice: 'Slice',
  annotate: 'Annotate',
  trim: 'Trim',
  transform: 'Reposition',
};

const StatusBar = ({
  activeTheme,
  sceneName,
  activeTool,
  fps,
  sourceUnit = null,
  calibrationStatus = null,
  orientationStatus = null,
  isCompact = false
}) => {
  const textColor = activeTheme === 1 ? '#5a6372' : '#b0b8c4';
  const border = activeTheme === 1 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const background =
    activeTheme === 1
      ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'
      : 'linear-gradient(0deg, rgba(20, 25, 40, 0.95) 0%, rgba(20, 25, 40, 0.85) 100%)';

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        minHeight: isCompact ? '50px' : '42px',
        background,
        borderTop: `1px solid ${border}`,
        display: 'flex',
        alignItems: 'center',
        flexWrap: isCompact ? 'wrap' : 'nowrap',
        padding: isCompact ? '8px 12px calc(8px + env(safe-area-inset-bottom, 0px))' : '0 16px',
        gap: isCompact ? '10px' : '14px',
        zIndex: 120,
        fontSize: '12px',
        color: textColor
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginRight: '4px' }}>
        <img src={medvizLogo} alt="MedViz logo" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
        <span style={{ fontWeight: 700 }}>MedViz</span>
      </div>
      <span><strong>Scene:</strong> {sceneName}</span>
      <span><strong>Tool:</strong> {TOOL_LABELS[activeTool] ?? activeTool}</span>
      {sourceUnit ? (
        <span><strong>Units:</strong> {sourceUnit} {calibrationStatus === 'confirmed' ? '(confirmed)' : '(review pending)'}</span>
      ) : null}
      {orientationStatus ? (
        <span><strong>Orientation:</strong> {orientationStatus === 'confirmed' ? 'confirmed' : 'unconfirmed'}</span>
      ) : null}
      {isCompact ? (
        <span>Touch: drag to orbit, pinch to zoom</span>
      ) : (
        <>
          <span>Rotate: Left Drag</span>
          <span>Pan: Right Drag / Shift+Drag</span>
          <span>Zoom: Wheel</span>
        </>
      )}
      <span style={{ marginLeft: 'auto', opacity: 0.5 }}>{fps} fps</span>
    </div>
  );
};

export default StatusBar;
