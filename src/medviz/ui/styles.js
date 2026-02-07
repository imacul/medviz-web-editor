export function getUiPalette(activeTheme, theme) {
  return {
    text: activeTheme === 1 ? '#1a1f35' : '#ffffff',
    muted: activeTheme === 1 ? '#5a6372' : '#9ca3af',
    border: activeTheme === 1 ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)',
    subtleBg: activeTheme === 1 ? '#f0f4f8' : '#2a3040',
    panelBg: activeTheme === 1
      ? 'linear-gradient(135deg, rgba(255,255,255,0.98) 0%, rgba(245,248,252,0.98) 100%)'
      : 'linear-gradient(135deg, rgba(20,25,40,0.98) 0%, rgba(25,30,45,0.98) 100%)',
    accent: theme.accent
  };
}

export function getPanelStyle(activeTheme, top, side) {
  return {
    position: 'absolute',
    top,
    width: '320px',
    borderRadius: '12px',
    padding: '16px',
    zIndex: 200,
    [side]: '20px'
  };
}

export function getToolButtonStyle(active, palette) {
  return {
    padding: '8px 10px',
    borderRadius: '8px',
    border: `1px solid ${active ? palette.accent : palette.border}`,
    background: active ? `${palette.accent}22` : palette.subtleBg,
    color: active ? palette.accent : palette.muted,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 600
  };
}
