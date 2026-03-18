import { useEffect, useRef, useState } from 'react';
import { getUiPalette, getToolButtonStyle } from './styles';
import medvizLogo from '../../../assets/medviz-logo.svg';

const compactSelectStyle = (palette) => ({
  padding: '7px 9px',
  borderRadius: '8px',
  border: `1px solid ${palette.border}`,
  background: palette.subtleBg,
  color: palette.text,
  fontSize: '12px',
  fontWeight: 600
});

const TopBar = ({
  activeTheme,
  theme,
  sceneNames,
  activeScene,
  onSelectScene,
  hasImportedModel,
  themes,
  onThemeChange,
  showToolsPanel,
  setShowToolsPanel,
  onImportClick,
  isImporting,
  onExportStl,
  onExportObj,
  onExportPng,
  onExportReport,
  onGoHome
}) => {
  const palette = getUiPalette(activeTheme, theme);
  const [openMenu, setOpenMenu] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const menuPanelStyle = {
    position: 'absolute',
    top: '42px',
    right: 0,
    minWidth: '180px',
    background: palette.panelBg,
    border: `1px solid ${palette.border}`,
    borderRadius: '10px',
    padding: '8px',
    display: 'grid',
    gap: '6px',
    zIndex: 350,
    boxShadow: activeTheme === 1 ? '0 8px 20px rgba(0,0,0,0.12)' : '0 8px 20px rgba(0,0,0,0.45)'
  };

  const menuItemButtonStyle = (disabled = false) => ({
    ...getToolButtonStyle(false, palette),
    width: '100%',
    textAlign: 'left',
    opacity: disabled ? 0.5 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer'
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '64px',
        background:
          activeTheme === 1
            ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 100%)'
            : 'linear-gradient(180deg, rgba(20,25,40,0.96) 0%, rgba(20,25,40,0.88) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 12px',
        zIndex: 300
      }}
    >
      <div
        onClick={onGoHome}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', cursor: onGoHome ? 'pointer' : 'default' }}
        title="Back to home"
      >
        <img src={medvizLogo} alt="MedViz logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: palette.text, letterSpacing: '0.3px' }}>MedViz</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: theme.accent, letterSpacing: '0.35px', textTransform: 'uppercase' }}>
            Clinical Web Editor
          </div>
        </div>
      </div>

      <div className="topbar-scroll" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflowX: 'auto' }}>
        <select
          value={activeScene}
          onChange={(e) => onSelectScene(parseInt(e.target.value, 10))}
          style={{ ...compactSelectStyle(palette), minWidth: '138px' }}
        >
          {sceneNames.map((name, index) => (
            <option key={name} value={index} disabled={index === 4 && !hasImportedModel}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={activeTheme}
          onChange={(e) => onThemeChange(parseInt(e.target.value, 10))}
          style={{ ...compactSelectStyle(palette), minWidth: '132px' }}
        >
          {themes.map((t, index) => (
            <option key={index} value={index}>
              {t.name}
            </option>
          ))}
        </select>

        <button onClick={() => setShowToolsPanel(!showToolsPanel)} style={getToolButtonStyle(showToolsPanel, palette)}>
          Tools
        </button>
      </div>

      <div ref={menuRef} style={{ position: 'relative', display: 'inline-flex' }}>
        <button onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')} style={getToolButtonStyle(openMenu === 'export', palette)}>
          Export
        </button>
        {openMenu === 'export' && (
          <div style={menuPanelStyle}>
            <button
              onClick={
                hasImportedModel
                  ? () => {
                      onExportStl();
                      setOpenMenu(null);
                    }
                  : undefined
              }
              style={menuItemButtonStyle(!hasImportedModel)}
            >
              Export STL
            </button>
            <button
              onClick={
                hasImportedModel
                  ? () => {
                      onExportObj();
                      setOpenMenu(null);
                    }
                  : undefined
              }
              style={menuItemButtonStyle(!hasImportedModel)}
            >
              Export OBJ
            </button>
            <button
              onClick={() => {
                onExportPng();
                setOpenMenu(null);
              }}
              style={menuItemButtonStyle(false)}
            >
              Export PNG
            </button>
            <button
              onClick={() => {
                onExportReport();
                setOpenMenu(null);
              }}
              style={menuItemButtonStyle(false)}
            >
              Export Report
            </button>
          </div>
        )}
      </div>

      <button
        onClick={onImportClick}
        disabled={isImporting}
        style={{
          padding: '8px 12px',
          backgroundColor: theme.accent,
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: isImporting ? 'wait' : 'pointer',
          whiteSpace: 'nowrap'
        }}
      >
        {isImporting ? 'Loading...' : 'Import Model'}
      </button>
    </div>
  );
};

export default TopBar;
