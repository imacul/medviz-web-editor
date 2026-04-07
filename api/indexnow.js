import { getIndexableUrlList } from '../src/content/indexingData.js';

const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const DEFAULT_SITE_URL = 'https://www.medviz3d.com';

function getSecretFromRequest(req) {
  if (typeof req.query?.secret === 'string' && req.query.secret) {
    return req.query.secret;
  }

  const headerSecret = req.headers['x-indexnow-secret'];
  if (typeof headerSecret === 'string' && headerSecret) {
    return headerSecret;
  }

  if (req.body && typeof req.body === 'object' && typeof req.body.secret === 'string' && req.body.secret) {
    return req.body.secret;
  }

  return '';
}

function normalizeUrl(siteUrl, value) {
  try {
    const candidate = new URL(value, siteUrl);
    const siteOrigin = new URL(siteUrl).origin;
    if (candidate.origin !== siteOrigin) {
      return null;
    }

    return candidate.toString();
  } catch {
    return null;
  }
}

function getUrlList(siteUrl, req) {
  const requestedUrls = Array.isArray(req.body?.urls) ? req.body.urls : null;

  if (!requestedUrls || requestedUrls.length === 0) {
    return getIndexableUrlList(siteUrl);
  }

  const normalizedUrls = requestedUrls
    .filter((value) => typeof value === 'string')
    .map((value) => normalizeUrl(siteUrl, value))
    .filter(Boolean);

  return [...new Set(normalizedUrls)];
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const configuredSecret = process.env.INDEXNOW_SUBMIT_SECRET?.trim();
  if (!configuredSecret) {
    return res.status(500).json({ ok: false, error: 'INDEXNOW_SUBMIT_SECRET is not configured' });
  }

  const requestSecret = getSecretFromRequest(req);
  if (requestSecret !== configuredSecret) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return res.status(500).json({ ok: false, error: 'INDEXNOW_KEY is not configured' });
  }

  const siteUrl = process.env.INDEXNOW_SITE_URL?.trim() || DEFAULT_SITE_URL;
  const urlList = getUrlList(siteUrl, req);

  if (urlList.length === 0) {
    return res.status(400).json({ ok: false, error: 'No valid URLs to submit' });
  }

  const payload = {
    host: new URL(siteUrl).host,
    key,
    keyLocation: `${siteUrl.replace(/\/$/, '')}/${key}.txt`,
    urlList,
  };

  try {
    const response = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    return res.status(response.status).json({
      ok: response.ok,
      submittedCount: urlList.length,
      endpoint: INDEXNOW_ENDPOINT,
      responseText,
    });
  } catch (error) {
    return res.status(502).json({
      ok: false,
      error: error instanceof Error ? error.message : 'IndexNow submission failed',
    });
  }
}
