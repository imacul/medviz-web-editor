import { getPanelStyle, getUiPalette, getToolButtonStyle } from './styles';

function formatValue(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

const ModelInfoPanel = ({
  show,
  setShow,
  activeTheme,
  theme,
  showSlicerPanel,
  modelMeta,
  readOnly = false,
  unitOptions = [],
  selectedUnit = null,
  calibrationStatus = null,
  onUnitChange,
  onConfirmUnit,
  spatialOrientation = null,
  orientationOptions = [],
  orientationIsValid = false,
  onOrientationChange,
  onConfirmOrientation,
  onResetOrientation,
  isMobile = false,
  isTablet = false
}) => {
  if (!show) return null;
  const palette = getUiPalette(activeTheme, theme);

  return (
    <div
      data-tour-id="model-info-panel"
      style={{
        ...getPanelStyle(activeTheme, showSlicerPanel ? '380px' : '80px', 'right', {
          isMobile,
          isTablet,
          bottomOffset: isMobile && showSlicerPanel ? 'calc(58px + 54vh)' : '58px'
        }),
        background: palette.panelBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${palette.border}`,
        overflow: 'auto',
        maxHeight: isMobile ? '32vh' : '75vh'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <strong style={{ color: palette.text }}>Model Info</strong>
        <button onClick={() => setShow(false)} style={getToolButtonStyle(false, palette)}>
          Close
        </button>
      </div>

      {modelMeta ? (
        <div style={{ fontSize: '12px', lineHeight: '1.65', color: palette.muted }}>
          {modelMeta.unitInference ? (
            <div style={{ marginBottom: '10px', color: palette.text }}>
              {calibrationStatus === 'confirmed'
                ? 'Import units have been confirmed for this review session.'
                : 'Import units still need confirmation. Review the selected unit before using measurements clinically.'}
            </div>
          ) : null}
          {unitOptions.length > 0 ? (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px',
                borderRadius: '10px',
                border: `1px solid ${palette.border}`,
                background: palette.subtleBg
              }}
            >
              <div style={{ marginBottom: '6px', color: palette.text }}>
                <strong>Import Units</strong>
              </div>
              <select
                value={selectedUnit || modelMeta.sourceUnit || 'mm'}
                onChange={(event) => onUnitChange?.(event.target.value)}
                disabled={readOnly}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${palette.border}`,
                  background: palette.panelBg,
                  color: palette.text,
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: readOnly ? 'not-allowed' : 'pointer',
                  opacity: readOnly ? 0.65 : 1
                }}
              >
                {unitOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <div style={{ marginTop: '6px', color: palette.muted }}>
                Confirm the selected import unit for this review session.
              </div>
              <div style={{ marginTop: '6px' }}>
                <strong>Status:</strong> {calibrationStatus === 'confirmed' ? 'Confirmed' : 'Inferred'}
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={onConfirmUnit}
                  disabled={readOnly || calibrationStatus === 'confirmed'}
                  style={{
                    ...getToolButtonStyle(false, palette),
                    opacity: readOnly || calibrationStatus === 'confirmed' ? 0.5 : 1,
                    cursor: readOnly || calibrationStatus === 'confirmed' ? 'not-allowed' : 'pointer'
                  }}
                >
                  {calibrationStatus === 'confirmed' ? 'Confirmed' : 'Confirm Units'}
                </button>
              </div>
            </div>
          ) : null}
          {spatialOrientation && orientationOptions.length > 0 ? (
            <div
              style={{
                marginBottom: '12px',
                padding: '10px',
                borderRadius: '10px',
                border: `1px solid ${palette.border}`,
                background: palette.subtleBg
              }}
            >
              <div style={{ marginBottom: '6px', color: palette.text }}>
                <strong>Orientation Reference</strong>
              </div>
              {[
                ['positiveX', '+X'],
                ['positiveY', '+Y'],
                ['positiveZ', '+Z'],
              ].map(([axisKey, axisLabel]) => (
                <label
                  key={axisKey}
                  style={{ display: 'block', marginBottom: '8px', color: palette.muted }}
                >
                  <div style={{ marginBottom: '4px' }}>{axisLabel}</div>
                  <select
                    value={spatialOrientation[axisKey]}
                    onChange={(event) => onOrientationChange?.(axisKey, event.target.value)}
                    disabled={readOnly}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: `1px solid ${palette.border}`,
                      background: palette.panelBg,
                      color: palette.text,
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: readOnly ? 'not-allowed' : 'pointer',
                      opacity: readOnly ? 0.65 : 1
                    }}
                  >
                    {orientationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
              <div style={{ marginTop: '4px' }}>
                <strong>Status:</strong> {spatialOrientation.status === 'confirmed' ? 'Confirmed' : 'Unconfirmed'}
              </div>
              {!orientationIsValid ? (
                <div style={{ marginTop: '4px', color: '#f59e0b' }}>
                  Choose one direction each from left/right, anterior/posterior, and superior/inferior.
                </div>
              ) : null}
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button
                  onClick={onConfirmOrientation}
                  disabled={readOnly || !orientationIsValid}
                  style={{
                    ...getToolButtonStyle(false, palette),
                    opacity: readOnly || !orientationIsValid ? 0.5 : 1,
                    cursor: readOnly || !orientationIsValid ? 'not-allowed' : 'pointer'
                  }}
                >
                  Confirm
                </button>
                <button onClick={onResetOrientation} disabled={readOnly} style={getToolButtonStyle(false, palette)}>
                  Reset
                </button>
              </div>
            </div>
          ) : null}
          <div>
            <strong>Name:</strong> {modelMeta.name}
          </div>
          <div>
            <strong>Format:</strong> {modelMeta.extension?.toUpperCase() || 'STL'}
          </div>
          <div>
            <strong>Triangles:</strong> {modelMeta.triangles.toLocaleString()}
          </div>
          <div>
            <strong>Vertices:</strong> {modelMeta.vertices.toLocaleString()}
          </div>
          <div>
            <strong>File Size:</strong> {(modelMeta.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
          </div>
          <div>
            <strong>Estimated Width:</strong> {formatValue(modelMeta.estimatedBoundsMm?.x)} mm
          </div>
          <div>
            <strong>Estimated Depth:</strong> {formatValue(modelMeta.estimatedBoundsMm?.y)} mm
          </div>
          <div>
            <strong>Estimated Height:</strong> {formatValue(modelMeta.estimatedBoundsMm?.z)} mm
          </div>
          <div>
            <strong>Import Units:</strong> {modelMeta.sourceUnit || 'unknown'}
          </div>
          <div>
            <strong>Raw Width:</strong> {formatValue(modelMeta.sourceBounds?.x)} {modelMeta.sourceUnit || 'units'}
          </div>
          <div>
            <strong>Raw Depth:</strong> {formatValue(modelMeta.sourceBounds?.y)} {modelMeta.sourceUnit || 'units'}
          </div>
          <div>
            <strong>Raw Height:</strong> {formatValue(modelMeta.sourceBounds?.z)} {modelMeta.sourceUnit || 'units'}
          </div>
          <div>
            <strong>Review Width:</strong> {formatValue(modelMeta.normalizedBounds?.x)} scene units
          </div>
          <div>
            <strong>Review Depth:</strong> {formatValue(modelMeta.normalizedBounds?.y)} scene units
          </div>
          <div>
            <strong>Review Height:</strong> {formatValue(modelMeta.normalizedBounds?.z)} scene units
          </div>
        </div>
      ) : (
        <div style={{ color: palette.muted, fontSize: '12px' }}>Import a model to view its details.</div>
      )}
    </div>
  );
};

export default ModelInfoPanel;
