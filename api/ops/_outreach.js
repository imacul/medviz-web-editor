import { promises as fs } from 'node:fs';
import path from 'node:path';

export const OUTREACH_DIR = path.join(process.cwd(), 'outreach');

function finalizeRow(rows, row, value) {
  const nextRow = [...row, value];
  const hasAnyValue = nextRow.some((cell) => cell.length > 0);

  if (hasAnyValue) {
    rows.push(nextRow);
  }
}

export function parseCsv(content) {
  const rows = [];
  let row = [];
  let current = '';
  let insideQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index];
    const nextCharacter = content[index + 1];

    if (character === '"') {
      if (insideQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (character === ',' && !insideQuotes) {
      row.push(current);
      current = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      finalizeRow(rows, row, current);
      row = [];
      current = '';
      continue;
    }

    current += character;
  }

  finalizeRow(rows, row, current);

  if (rows.length === 0) {
    return [];
  }

  const [headers, ...dataRows] = rows;
  return dataRows.map((values) =>
    headers.reduce((record, header, headerIndex) => {
      record[header] = values[headerIndex] ?? '';
      return record;
    }, {})
  );
}

export async function safeReadJson(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

export async function listOutreachFiles() {
  try {
    const entries = await fs.readdir(OUTREACH_DIR, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

export async function buildRecentFileSummary(fileNames) {
  const files = await Promise.all(
    fileNames.map(async (fileName) => {
      const stats = await fs.stat(path.join(OUTREACH_DIR, fileName));
      return {
        fileName,
        modifiedAt: stats.mtime.toISOString(),
        sizeBytes: stats.size,
      };
    })
  );

  return files.sort((left, right) => right.modifiedAt.localeCompare(left.modifiedAt));
}

export async function readOutreachCsv(fileName) {
  const safeName = path.basename(fileName);
  if (safeName !== fileName) {
    throw new Error('Invalid outreach file name.');
  }

  const content = await fs.readFile(path.join(OUTREACH_DIR, safeName), 'utf8');
  return parseCsv(content);
}
