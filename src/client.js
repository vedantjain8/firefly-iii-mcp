/**
 * Lightweight Firefly III API client.
 * Uses native fetch — zero external HTTP dependencies.
 */

const BASE_URL = (process.env.FIREFLY_URL || '').replace(/\/$/, '');
const TOKEN   = process.env.FIREFLY_TOKEN || '';

if (!BASE_URL) throw new Error('FIREFLY_URL environment variable is required');
if (!TOKEN)    throw new Error('FIREFLY_TOKEN environment variable is required');

const AUTH_HEADERS = {
  'Authorization': `Bearer ${TOKEN}`,
  'Accept':        'application/vnd.api+json',
};

const JSON_HEADERS = {
  ...AUTH_HEADERS,
  'Content-Type': 'application/json',
};

/**
 * Core request. Returns parsed JSON, null (204/empty), or ArrayBuffer for binary.
 * @param {string} path       - e.g. "/v1/accounts" (may include query string)
 * @param {object} [opts]     - fetch options
 * @param {boolean} [isBinary] - return raw ArrayBuffer instead of parsing JSON
 */
async function request(path, opts = {}, isBinary = false) {
  const url = `${BASE_URL}/api${path}`;
  const res = await fetch(url, opts);

  if (res.status === 204) return null;

  if (isBinary) return res.arrayBuffer();

  const text = await res.text();
  if (!text) return null;

  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }

  if (!res.ok) {
    const msg = body?.message || body?.error || res.statusText;
    throw new Error(`Firefly III ${res.status}: ${msg}`);
  }
  return body;
}

/**
 * Build a query string, filtering out null/undefined values.
 * Handles array values as repeated keys: accounts[]=1&accounts[]=2
 */
function buildQS(params) {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    if (Array.isArray(v)) {
      v.forEach(item => qs.append(`${k}[]`, item));
    } else {
      qs.set(k, v);
    }
  }
  const s = qs.toString();
  return s ? `?${s}` : '';
}

export const get    = (path, params) => request(`${path}${buildQS(params)}`, { headers: AUTH_HEADERS });
export const post   = (path, body)   => request(path, { method: 'POST',  headers: JSON_HEADERS, body: JSON.stringify(body) });
export const put    = (path, body)   => request(path, { method: 'PUT',   headers: JSON_HEADERS, body: JSON.stringify(body) });
export const patch  = (path, body)   => request(path, { method: 'PATCH', headers: JSON_HEADERS, body: JSON.stringify(body) });
export const del    = (path)         => request(path, { method: 'DELETE', headers: AUTH_HEADERS });
export const binary = (path, params) => request(`${path}${buildQS(params)}`, { headers: AUTH_HEADERS }, true);
