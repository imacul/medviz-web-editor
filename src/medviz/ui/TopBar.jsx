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
  readOnly = false,
  onBlockedImportClick = null,
  onNewCaseImportClick = null,
  onExportStl,
  onExportObj,
  onExportPng,
  onExportReportHtml,
  onExportReportPdf,
  onGoHome,
  isCompact = false,
  showSceneSelector = true,
  showShareToggle = false,
  sharePanelOpen = false,
  onToggleSharePanel,
  showCommentsToggle = false,
  commentsPanelOpen = false,
  onToggleCommentsPanel,
  showTourToggle = true,
  tourOpen = false,
  onToggleTour,
  editorSaveStatus = null,
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

  const saveStatusMeta = editorSaveStatus
    ? {
        saving: { label: 'Saving', color: theme.accent },
        saved: { label: 'Saved', color: activeTheme === 1 ? '#237a57' : '#7ef0bc' },
        error: { label: 'Save failed', color: '#ff8f9f' }
      }[editorSaveStatus]
    : null;
  const importBlockedBySignup = Boolean(readOnly && onBlockedImportClick);
  const importStartsNewCase = Boolean(hasImportedModel && onNewCaseImportClick);
  const importActionAvailable =
    importBlockedBySignup || importStartsNewCase || (!readOnly && onImportClick);
  const importDisabled = isImporting || !importActionAvailable;

  const handleImportButtonClick = () => {
    if (isImporting) return;
    if (importBlockedBySignup) {
      onBlockedImportClick();
      return;
    }
    if (importStartsNewCase) {
      onNewCaseImportClick();
      return;
    }
    if (readOnly || !onImportClick) return;
    onImportClick();
  };

  return (
    <div
      data-tour-id="editor-topbar"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        minHeight: isCompact ? '108px' : '64px',
        background:
          activeTheme === 1
            ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 100%)'
            : 'linear-gradient(180deg, rgba(20,25,40,0.96) 0%, rgba(20,25,40,0.88) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${palette.border}`,
        display: 'flex',
        alignItems: 'center',
        flexWrap: isCompact ? 'wrap' : 'nowrap',
        gap: isCompact ? '8px' : '10px',
        padding: isCompact
          ? 'calc(10px + env(safe-area-inset-top, 0px)) 12px 10px'
          : '0 12px',
        zIndex: 300
      }}
    >
      <div
        onClick={onGoHome}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          whiteSpace: 'nowrap',
          cursor: onGoHome ? 'pointer' : 'default',
          minWidth: isCompact ? 0 : 'auto',
          flex: isCompact ? '1 1 auto' : '0 0 auto'
        }}
        title="Back to home"
      >
        <img
          src={medvizLogo}
          alt="MedViz logo"
          style={{ width: isCompact ? '28px' : '30px', height: isCompact ? '28px' : '30px', objectFit: 'contain' }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <div style={{ fontSize: isCompact ? '16px' : '18px', fontWeight: 800, color: palette.text, letterSpacing: '0.3px' }}>MedViz</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: theme.accent, letterSpacing: '0.35px', textTransform: 'uppercase' }}>
            Clinical Review
          </div>
        </div>
      </div>

      <button
        onClick={handleImportButtonClick}
        disabled={importDisabled}
        data-tour-id="import-button"
        style={{
          padding: isCompact ? '8px 11px' : '8px 12px',
          backgroundColor: importDisabled ? 'rgba(255,255,255,0.12)' : theme.accent,
          color: importDisabled ? 'rgba(255,255,255,0.35)' : '#ffffff',
          border: 'none',
          borderRadius: '8px',
          fontSize: '12px',
          fontWeight: 700,
          cursor: importDisabled ? 'not-allowed' : 'pointer',
          whiteSpace: 'nowrap',
          flex: '0 0 auto'
        }}
        title={readOnly ? 'View only — you cannot import models' : undefined}
      >
        {isImporting ? 'Adding...' : 'Import Model'}
      </button>

      <div
        className="topbar-scroll"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: isCompact ? '1 1 100%' : 1,
          overflowX: 'auto',
          order: isCompact ? 3 : 0,
          paddingBottom: isCompact ? '2px' : 0
        }}
      >
        {showSceneSelector ? (
          <select
            value={activeScene}
            onChange={(e) => onSelectScene(parseInt(e.target.value, 10))}
            style={{ ...compactSelectStyle(palette), minWidth: isCompact ? '124px' : '138px' }}
          >
            {sceneNames.map((name, index) => (
              <option key={name} value={index} disabled={index === 4 && !hasImportedModel}>
              {name}
            </option>
          ))}
          </select>
        ) : null}

        <select
          value={activeTheme}
          onChange={(e) => onThemeChange(parseInt(e.target.value, 10))}
          style={{ ...compactSelectStyle(palette), minWidth: isCompact ? '118px' : '132px' }}
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

        {showTourToggle && onToggleTour ? (
          <button
            onClick={onToggleTour}
            data-tour-id="tour-button"
            style={getToolButtonStyle(tourOpen, palette)}
            type="button"
          >
            Tour
          </button>
        ) : null}

        {showShareToggle ? (
          <button
            onClick={onToggleSharePanel}
            data-tour-id="share-button"
            style={getToolButtonStyle(sharePanelOpen, palette)}
            type="button"
          >
            Share Link
          </button>
        ) : null}

        {showCommentsToggle ? (
          <button
            onClick={onToggleCommentsPanel}
            data-tour-id="comments-button"
            style={getToolButtonStyle(commentsPanelOpen, palette)}
            type="button"
          >
            Team Comments
          </button>
        ) : null}

        {saveStatusMeta ? (
          <div
            aria-live="polite"
            style={{
              marginLeft: '4px',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: saveStatusMeta.color,
              whiteSpace: 'nowrap',
              opacity: 0.95,
            }}
          >
            {saveStatusMeta.label}
          </div>
        ) : null}
      </div>

      <div
        ref={menuRef}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginLeft: isCompact ? 0 : 'auto',
          order: isCompact ? 4 : 0,
          flex: '0 0 auto'
        }}
      >
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            onClick={() => setOpenMenu(openMenu === 'export' ? null : 'export')}
            data-tour-id="export-button"
            style={getToolButtonStyle(openMenu === 'export', palette)}
            type="button"
          >
            Export
          </button>
          {openMenu === 'export' && (
            <div style={{ ...menuPanelStyle, top: isCompact ? '44px' : '42px' }}>
              <button
                type="button"
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
                type="button"
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
                type="button"
                onClick={() => {
                  onExportPng();
                  setOpenMenu(null);
                }}
                style={menuItemButtonStyle(false)}
              >
                Screenshot PNG
              </button>
            </div>
          )}
        </div>

        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <button
            onClick={() => setOpenMenu(openMenu === 'report' ? null : 'report')}
            data-tour-id="report-button"
            style={getToolButtonStyle(openMenu === 'report', palette)}
            type="button"
          >
            Report
          </button>
          {openMenu === 'report' && (
            <div style={{ ...menuPanelStyle, top: isCompact ? '44px' : '42px' }}>
              <button
                type="button"
                onClick={() => {
                  onExportReportHtml();
                  setOpenMenu(null);
                }}
                style={menuItemButtonStyle(false)}
              >
                Report HTML
              </button>
              <button
                type="button"
                onClick={() => {
                  onExportReportPdf();
                  setOpenMenu(null);
                }}
                style={menuItemButtonStyle(false)}
              >
                Report PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
