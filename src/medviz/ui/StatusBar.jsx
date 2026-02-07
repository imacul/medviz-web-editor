import medvizLogo from '../../../assets/medviz-logo.svg';

const TOOL_LABELS = {
  none: 'None',
  measure: 'Measurement',
  slice: 'Slicing',
  annotate: 'Annotation',
  trim: 'Trim',
  transform: 'Transform'
};

const StatusBar = ({ activeTheme, sceneName, activeTool, fps }) => {
  const textColor = activeTheme === 1 ? '#5a6372' : '#b0b8c4';
  const border = activeTheme === 1 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
  const background =
    activeTheme === 1
      ? 'linear-gradient(0deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)'
      : 'linear-gradient(0deg, rgba(20, 25, 40, 0.95) 0%, rgba(20, 25, 40, 0.85) 100%)';

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '42px', background, borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', padding: '0 16px', gap: '14px', zIndex: 120, fontSize: '12px', color: textColor }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginRight: '4px' }}>
        <img src={medvizLogo} alt="MedViz logo" style={{ width: '16px', height: '16px', objectFit: 'contain' }} />
        <span style={{ fontWeight: 700 }}>MedViz</span>
      </div>
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
