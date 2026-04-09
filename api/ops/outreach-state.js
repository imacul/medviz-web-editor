import { promises as fs } from 'node:fs';
import path from 'node:path';

import { OUTREACH_DIR, buildRecentFileSummary, listOutreachFiles, readOutreachCsv, safeReadJson } from './_outreach.js';

async function buildSendLogSummary(fileName) {
  const rows = await readOutreachCsv(fileName);
  const timestamps = rows
    .map((row) => row.timestamp_utc)
    .filter(Boolean)
    .sort();
  const statuses = rows.reduce((accumulator, row) => {
    const key = row.status || 'unknown';
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
  const subjects = [...new Set(rows.map((row) => row.subject).filter(Boolean))].slice(0, 3);

  return {
    fileName,
    sentCount: rows.length,
    firstSentAt: timestamps[0] ?? null,
    lastSentAt: timestamps[timestamps.length - 1] ?? null,
    statuses,
    subjects,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const fileNames = await listOutreachFiles();
    const sendLogFiles = fileNames
      .filter((fileName) => fileName.startsWith('gmail_send_log_') && fileName.endsWith('.csv'))
      .sort()
      .reverse();
    const batchFiles = fileNames
      .filter((fileName) => fileName.startsWith('gmail_batch_') || fileName.startsWith('linkedin_batch_'))
      .sort()
      .reverse()
      .slice(0, 8);
    const noteFiles = fileNames
      .filter((fileName) => fileName.endsWith('.md') || fileName.endsWith('.txt'))
      .sort()
      .reverse()
      .slice(0, 8);

    const sendLogSummaries = await Promise.all(sendLogFiles.slice(0, 6).map(buildSendLogSummary));
    const replyMonitorState = await safeReadJson(path.join(OUTREACH_DIR, 'gmail_reply_monitor_state.json'));
    const realtimeResponderState = await safeReadJson(
      path.join(OUTREACH_DIR, 'gmail_realtime_responder_state.json')
    );
    const sentRecipientsContent = await fs
      .readFile(path.join(OUTREACH_DIR, 'sent_recipients_all_unique_2026-03-25.txt'), 'utf8')
      .catch(() => '');

    const uniqueRecipients = [...new Set(sentRecipientsContent.split(/\r?\n/).map((line) => line.trim()).filter(Boolean))];
    const recentBatchFiles = await buildRecentFileSummary(batchFiles);
    const recentNoteFiles = await buildRecentFileSummary(noteFiles);

    return res.status(200).json({
      ok: true,
      generatedAt: new Date().toISOString(),
      sendLogs: sendLogSummaries,
      replyMonitor: {
        seenCount: Array.isArray(replyMonitorState?.seen_ids) ? replyMonitorState.seen_ids.length : 0,
        lastSeenId:
          Array.isArray(replyMonitorState?.seen_ids) && replyMonitorState.seen_ids.length > 0
            ? replyMonitorState.seen_ids[replyMonitorState.seen_ids.length - 1]
            : null,
      },
      realtimeResponder: {
        seenCount:
          Array.isArray(realtimeResponderState?.seen_ids) ? realtimeResponderState.seen_ids.length : 0,
        repliedCount:
          Array.isArray(realtimeResponderState?.replied_ids)
            ? realtimeResponderState.replied_ids.length
            : 0,
        lastRepliedId:
          Array.isArray(realtimeResponderState?.replied_ids) && realtimeResponderState.replied_ids.length > 0
            ? realtimeResponderState.replied_ids[realtimeResponderState.replied_ids.length - 1]
            : null,
      },
      uniqueRecipientsCount: uniqueRecipients.length,
      recentBatchFiles,
      recentNoteFiles,
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to load outreach state',
    });
  }
}
