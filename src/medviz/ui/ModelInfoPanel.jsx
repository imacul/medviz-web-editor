import { getPanelStyle, getUiPalette, getToolButtonStyle } from './styles';

const ModelInfoPanel = ({ show, setShow, activeTheme, theme, showSlicerPanel, modelMeta }) => {
  if (!show) return null;
  const palette = getUiPalette(activeTheme, theme);

  return (
    <div
      style={{
        ...getPanelStyle(activeTheme, showSlicerPanel ? '380px' : '80px', 'right'),
        background: palette.panelBg,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${palette.border}`
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
            <strong>BBox X:</strong> {modelMeta.bounds.x} mm
          </div>
          <div>
            <strong>BBox Y:</strong> {modelMeta.bounds.y} mm
          </div>
          <div>
            <strong>BBox Z:</strong> {modelMeta.bounds.z} mm
          </div>
        </div>
      ) : (
        <div style={{ color: palette.muted, fontSize: '12px' }}>Import an STL/OBJ/PLY model to view metadata.</div>
      )}
    </div>
  );
};

export default ModelInfoPanel;
