import { jsPDF } from 'jspdf';

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

function getBoundsSummary(modelMeta) {
  const unit = modelMeta?.sourceUnit || 'units';
  return {
    estimatedX: formatDimension(modelMeta?.estimatedBoundsMm?.x),
    estimatedY: formatDimension(modelMeta?.estimatedBoundsMm?.y),
    estimatedZ: formatDimension(modelMeta?.estimatedBoundsMm?.z),
    sourceX: formatDimension(modelMeta?.sourceBounds?.x),
    sourceY: formatDimension(modelMeta?.sourceBounds?.y),
    sourceZ: formatDimension(modelMeta?.sourceBounds?.z),
    normalizedX: formatDimension(modelMeta?.normalizedBounds?.x),
    normalizedY: formatDimension(modelMeta?.normalizedBounds?.y),
    normalizedZ: formatDimension(modelMeta?.normalizedBounds?.z),
    unit,
  };
}

function getOrientationSummary(spatialOrientation) {
  const orientation = spatialOrientation && typeof spatialOrientation === 'object'
    ? spatialOrientation
    : null;

  if (!orientation) {
    return {
      status: 'unconfirmed',
      lines: ['Anatomical orientation not confirmed for this review.'],
    };
  }

  const opposites = {
    right: 'left',
    left: 'right',
    anterior: 'posterior',
    posterior: 'anterior',
    superior: 'inferior',
    inferior: 'superior',
  };

  const toLabel = (value) =>
    value ? value.charAt(0).toUpperCase() + value.slice(1) : 'Unknown';

  const lines = [
    `+X ${toLabel(orientation.positiveX)} / -X ${toLabel(opposites[orientation.positiveX] || '')}`,
    `+Y ${toLabel(orientation.positiveY)} / -Y ${toLabel(opposites[orientation.positiveY] || '')}`,
    `+Z ${toLabel(orientation.positiveZ)} / -Z ${toLabel(opposites[orientation.positiveZ] || '')}`,
  ];

  return {
    status: orientation.status === 'confirmed' ? 'confirmed' : 'unconfirmed',
    lines,
  };
}

export function buildHtmlReport({ modelMeta, spatialOrientation, measurements, markers, screenshotDataUrl }) {
  const generatedAt = new Date().toISOString();
  const modelName = modelMeta?.name || 'No model imported';
  const triCount = modelMeta?.triangles?.toLocaleString() ?? '0';
  const vertexCount = modelMeta?.vertices?.toLocaleString() ?? '0';
  const fileSizeMb = modelMeta ? (modelMeta.fileSizeBytes / (1024 * 1024)).toFixed(2) : '0.00';
  const bounds = getBoundsSummary(modelMeta);
  const orientation = getOrientationSummary(spatialOrientation);

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
        <p><strong>Estimated Bounds X:</strong> ${escapeHtml(bounds.estimatedX)} mm</p>
        <p><strong>Estimated Bounds Y:</strong> ${escapeHtml(bounds.estimatedY)} mm</p>
        <p><strong>Estimated Bounds Z:</strong> ${escapeHtml(bounds.estimatedZ)} mm</p>
        <p><strong>Import Units:</strong> ${escapeHtml(bounds.unit)}</p>
        <p><strong>Raw Bounds X:</strong> ${escapeHtml(bounds.sourceX)} ${escapeHtml(bounds.unit)}</p>
        <p><strong>Raw Bounds Y:</strong> ${escapeHtml(bounds.sourceY)} ${escapeHtml(bounds.unit)}</p>
        <p><strong>Raw Bounds Z:</strong> ${escapeHtml(bounds.sourceZ)} ${escapeHtml(bounds.unit)}</p>
        <p><strong>Review Bounds X:</strong> ${escapeHtml(bounds.normalizedX)} scene units</p>
        <p><strong>Review Bounds Y:</strong> ${escapeHtml(bounds.normalizedY)} scene units</p>
        <p><strong>Review Bounds Z:</strong> ${escapeHtml(bounds.normalizedZ)} scene units</p>
      </div>
      <p class="small">${escapeHtml(modelMeta?.unitInference || 'STL/OBJ/PLY units may not be explicit.')}</p>
    </div>

    <div class="section">
      <h2>Orientation Reference</h2>
      <p><strong>Status:</strong> ${escapeHtml(orientation.status)}</p>
      ${orientation.lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
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

function formatDistance(value) {
  const n = Number(value);
  return Number.isFinite(n) ? `${n.toFixed(2)} mm` : '0.00 mm';
}

function addWrappedLine(doc, text, x, y, maxWidth, lineHeight) {
  const lines = doc.splitTextToSize(text, maxWidth);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

function ensureSpace(doc, y, requiredHeight, margin) {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + requiredHeight <= pageHeight - margin) {
    return y;
  }

  doc.addPage();
  return margin;
}

export function buildPdfReportBlob({ modelMeta, spatialOrientation, measurements, markers, screenshotDataUrl }) {
  const doc = new jsPDF({
    unit: 'pt',
    format: 'a4',
    compress: true,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 16;
  let y = margin;
  const bounds = getBoundsSummary(modelMeta);
  const orientation = getOrientationSummary(spatialOrientation);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('MedViz Clinical Review Report', margin, y);
  y += 26;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  y = addWrappedLine(doc, `Generated at: ${new Date().toISOString()}`, margin, y, contentWidth, 12);
  y += 10;

  doc.setDrawColor(210, 218, 230);
  doc.line(margin, y, pageWidth - margin, y);
  y += 22;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Model Summary', margin, y);
  y += 18;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const summaryLines = [
    `Name: ${modelMeta?.name || 'No model imported'}`,
    `File Size: ${modelMeta ? (modelMeta.fileSizeBytes / (1024 * 1024)).toFixed(2) : '0.00'} MB`,
    `Triangles: ${modelMeta?.triangles?.toLocaleString?.() ?? '0'}`,
    `Vertices: ${modelMeta?.vertices?.toLocaleString?.() ?? '0'}`,
    `Estimated Bounds X: ${bounds.estimatedX} mm`,
    `Estimated Bounds Y: ${bounds.estimatedY} mm`,
    `Estimated Bounds Z: ${bounds.estimatedZ} mm`,
    `Import Units: ${bounds.unit}`,
    `Raw Bounds X: ${bounds.sourceX} ${bounds.unit}`,
    `Raw Bounds Y: ${bounds.sourceY} ${bounds.unit}`,
    `Raw Bounds Z: ${bounds.sourceZ} ${bounds.unit}`,
    `Review Bounds X: ${bounds.normalizedX} scene units`,
    `Review Bounds Y: ${bounds.normalizedY} scene units`,
    `Review Bounds Z: ${bounds.normalizedZ} scene units`,
    modelMeta?.unitInference || 'STL/OBJ/PLY units may not be explicit.',
  ];

  for (const line of summaryLines) {
    y = addWrappedLine(doc, line, margin, y, contentWidth, lineHeight);
    y += 2;
  }

  y += 8;
  y = ensureSpace(doc, y, 80, margin);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Orientation Reference', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  y = addWrappedLine(doc, `Status: ${orientation.status}`, margin, y, contentWidth, lineHeight);
  y += 2;
  for (const line of orientation.lines) {
    y = addWrappedLine(doc, line, margin, y, contentWidth, lineHeight);
    y += 2;
  }

  if (screenshotDataUrl) {
    y += 10;
    y = ensureSpace(doc, y, 280, margin);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Viewport Screenshot', margin, y);
    y += 18;

    const imageProps = doc.getImageProperties(screenshotDataUrl);
    const imageWidth = contentWidth;
    const imageHeight = Math.min(260, (imageProps.height / imageProps.width) * imageWidth);
    doc.addImage(screenshotDataUrl, 'PNG', margin, y, imageWidth, imageHeight, undefined, 'FAST');
    y += imageHeight + 18;
  }

  y = ensureSpace(doc, y, 80, margin);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Measurements', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  if (measurements.length === 0) {
    y = addWrappedLine(doc, 'No measurements recorded.', margin, y, contentWidth, lineHeight);
    y += 6;
  } else {
    for (const measurement of measurements) {
      y = ensureSpace(doc, y, 28, margin);
      y = addWrappedLine(
        doc,
        `${measurement.id}: ${formatDistance(measurement.distanceMm)}`,
        margin,
        y,
        contentWidth,
        lineHeight
      );
      y += 4;
    }
  }

  y += 10;
  y = ensureSpace(doc, y, 80, margin);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Markers', margin, y);
  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);

  if (markers.length === 0) {
    addWrappedLine(doc, 'No markers recorded.', margin, y, contentWidth, lineHeight);
  } else {
    for (const marker of markers) {
      y = ensureSpace(doc, y, 44, margin);
      y = addWrappedLine(
        doc,
        `${marker.id} - ${marker.label}`,
        margin,
        y,
        contentWidth,
        lineHeight
      );
      y = addWrappedLine(
        doc,
        `Position: X ${Number(marker.position.x).toFixed(2)}, Y ${Number(marker.position.y).toFixed(2)}, Z ${Number(marker.position.z).toFixed(2)}`,
        margin + 12,
        y,
        contentWidth - 12,
        lineHeight
      );
      y += 4;
    }
  }

  return doc.output('blob');
}
