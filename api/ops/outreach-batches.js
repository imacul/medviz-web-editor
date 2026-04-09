import { promises as fs } from 'node:fs';
import path from 'node:path';

import { OUTREACH_DIR, listOutreachFiles, readOutreachCsv } from './_outreach.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const fileNames = await listOutreachFiles();
    const batchFiles = fileNames
      .filter(
        (fileName) =>
          (fileName.startsWith('gmail_batch_') || fileName.startsWith('linkedin_batch_')) &&
          fileName.endsWith('.csv')
      )
      .sort()
      .reverse()
      .slice(0, 8);

    const batches = await Promise.all(
      batchFiles.map(async (fileName) => {
        const stats = await fs.stat(path.join(OUTREACH_DIR, fileName));
        const rows = await readOutreachCsv(fileName);

        return {
          fileName,
          modifiedAt: stats.mtime.toISOString(),
          sizeBytes: stats.size,
          rowCount: rows.length,
          rows: rows.map((row) => ({
            email: row.email ?? '',
            subject: row.subject ?? '',
            body: row.body ?? '',
            reply_to: row.reply_to ?? '',
          })),
        };
      })
    );

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      batches,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load outreach batches',
    });
  }
}
