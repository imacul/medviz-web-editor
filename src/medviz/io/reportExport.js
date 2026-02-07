function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDimension(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

export function buildHtmlReport({ modelMeta, measurements, markers, screenshotDataUrl }) {
  const generatedAt = new Date().toISOString();
  const modelName = modelMeta?.name || 'No model imported';
  const triCount = modelMeta?.triangles?.toLocaleString() ?? '0';
  const vertexCount = modelMeta?.vertices?.toLocaleString() ?? '0';
  const fileSizeMb = modelMeta ? (modelMeta.fileSizeBytes / (1024 * 1024)).toFixed(2) : '0.00';
  const boundsX = formatDimension(modelMeta?.bounds?.x);
  const boundsY = formatDimension(modelMeta?.bounds?.y);
  const boundsZ = formatDimension(modelMeta?.bounds?.z);

  const measurementRows =
    measurements.length === 0
      ? '<tr><td colspan="2">No measurements</td></tr>'
      : measurements
          .map(
            (m) =>
              `<tr><td>${escapeHtml(m.id)}</td><td>${Number(m.distanceMm).toFixed(2)} mm</td></tr>`
          )
          .join('');

  const markerRows =
    markers.length === 0
      ? '<tr><td colspan="5">No markers</td></tr>'
      : markers
          .map(
            (m) =>
              `<tr><td>${escapeHtml(m.id)}</td><td>${escapeHtml(m.label)}</td><td>${Number(m.position.x).toFixed(2)}</td><td>${Number(m.position.y).toFixed(2)}</td><td>${Number(m.position.z).toFixed(2)}</td></tr>`
          )
          .join('');

  const screenshotBlock = screenshotDataUrl
    ? `<img src="${screenshotDataUrl}" alt="Viewport Screenshot" />`
    : '<p>No screenshot available.</p>';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>MedViz Report</title>
    <style>
      body { font-family: Segoe UI, Arial, sans-serif; margin: 24px; color: #1f2937; }
      h1, h2 { margin: 0 0 12px; }
      p { margin: 0 0 8px; }
      .section { margin-top: 24px; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; }
      th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 13px; text-align: left; }
      th { background: #f3f4f6; }
      .meta { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 8px 16px; }
      img { max-width: 100%; border: 1px solid #d1d5db; border-radius: 8px; }
      .small { color: #6b7280; font-size: 12px; }
    </style>
  </head>
  <body>
    <h1>MedViz Clinical Review Report</h1>
    <p class="small">Generated at: ${escapeHtml(generatedAt)}</p>

    <div class="section">
      <h2>Model Summary</h2>
      <div class="meta">
        <p><strong>Name:</strong> ${escapeHtml(modelName)}</p>
        <p><strong>File Size:</strong> ${escapeHtml(fileSizeMb)} MB</p>
        <p><strong>Triangles:</strong> ${escapeHtml(triCount)}</p>
        <p><strong>Vertices:</strong> ${escapeHtml(vertexCount)}</p>
        <p><strong>Bounds X:</strong> ${escapeHtml(boundsX)} mm</p>
        <p><strong>Bounds Y:</strong> ${escapeHtml(boundsY)} mm</p>
        <p><strong>Bounds Z:</strong> ${escapeHtml(boundsZ)} mm</p>
      </div>
    </div>

    <div class="section">
      <h2>Viewport Screenshot</h2>
      ${screenshotBlock}
    </div>

    <div class="section">
      <h2>Measurements</h2>
      <table>
        <thead><tr><th>ID</th><th>Distance</th></tr></thead>
        <tbody>${measurementRows}</tbody>
      </table>
    </div>

    <div class="section">
      <h2>Markers</h2>
      <table>
        <thead><tr><th>ID</th><th>Label</th><th>X</th><th>Y</th><th>Z</th></tr></thead>
        <tbody>${markerRows}</tbody>
      </table>
    </div>
  </body>
</html>`;
}
