const TOOL_LABELS = {
  none: 'None',
  measure: 'Measurement',
  slice: 'Slicing',
  annotate: 'Annotation',
  trim: 'Trim',
  transform: 'Transform'
};

const StatusBar = ({ activeTheme, sceneName, activeTool, fps }) => {
  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42px', background: activeTheme === 1 ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)' : 'linear-gradient(0deg, rgba(20, 25, 40, 0.95) 0%, rgba(20, 25, 40, 0.85) 100%)', borderTop: `1px solid ${activeTheme === 1 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '14px', zIndex: 120, fontSize: '12px', color: activeTheme === 1 ? '#5a6372' : '#b0b8c4' }}>
      <span><strong>Scene:</strong> {sceneName}</span>
      <span><strong>Tool:</strong> {TOOL_LABELS[activeTool] ?? activeTool}</span>
      <span>Rotate: Left Drag</span>
      <span>Pan: Right Drag / Shift+Drag</span>
      <span>Zoom: Wheel</span>
      <span style={{ marginLeft: 'auto' }}>FPS: <strong style={{ color: '#10b981' }}>{fps}</strong></span>
    </div>
  );
};

export default StatusBar;
