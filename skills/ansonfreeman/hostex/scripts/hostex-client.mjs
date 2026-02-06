import process from 'node:process';

const DEFAULT_BASE_URL = 'https://api.hostex.io/v3';

export function getEnv(name, fallback = undefined) {
  const v = process.env[name];
  return (v === undefined || v === '') ? fallback : v;
}

export function redactSecret(s) {
  if (!s) return s;
  if (s.length <= 8) return '***';
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function assertIsoDate(d, name = 'date') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    throw new Error(`Invalid ${name}: expected YYYY-MM-DD, got: ${d}`);
  }
}

export function buildUrl(path, query = {}) {
  const base = getEnv('HOSTEX_BASE_URL', DEFAULT_BASE_URL);

  // Important: preserve base path segments (e.g. https://api.hostex.io/v3)
  // new URL('/room_types', 'https://api.hostex.io/v3') would drop /v3.
  const baseUrl = new URL(base.endsWith('/') ? base : `${base}/`);
  const rel = path.startsWith('/') ? path.slice(1) : path;
  const u = new URL(rel, baseUrl);

  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    u.searchParams.set(k, String(v));
  }
  return u;
}

export async function hostexRequest({
  method,
  path,
  query,
  json,
  headers,
  timeoutMs = 30000,
  retries = 2,
}) {
  const token = getEnv('HOSTEX_ACCESS_TOKEN');
  if (!token) throw new Error('Missing HOSTEX_ACCESS_TOKEN');

  const url = buildUrl(path, query);

  const reqHeaders = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'Hostex-Access-Token': token,
    ...headers,
  };

  const attempt = async (n) => {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
    try {
      let res;
      try {
        res = await fetch(url, {
          method,
          headers: reqHeaders,
          body: json ? JSON.stringify(json) : undefined,
          signal: controller.signal,
        });
      } catch (e) {
        // Network-level failure (DNS, socket, etc.)
        if (n < retries) {
          const backoff = 400 * Math.pow(2, n);
          await new Promise(r => setTimeout(r, backoff));
          return attempt(n + 1);
        }
        const err = new Error(`Hostex API fetch failed: ${e?.message || e}`);
        err.url = url.toString();
        err.token = redactSecret(token);
        throw err;
      }

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = { raw: text };
      }

      if (res.ok) return { status: res.status, data, headers: res.headers };

      // Retry on 429/5xx.
      if (n < retries && (res.status === 429 || res.status >= 500)) {
        const backoff = 400 * Math.pow(2, n);
        await new Promise(r => setTimeout(r, backoff));
        return attempt(n + 1);
      }

      const msg = (data && (data.error_msg || data.message)) ? (data.error_msg || data.message) : text;
      const err = new Error(`Hostex API error ${res.status}: ${msg}`);
      err.status = res.status;
      err.url = url.toString();
      err.token = redactSecret(token);
      err.response = data;
      throw err;
    } finally {
      clearTimeout(t);
    }
  };

  return attempt(0);
}

export function requireWritesEnabled() {
  const allow = getEnv('HOSTEX_ALLOW_WRITES', 'false');
  if (!['1','true','yes','on'].includes(String(allow).toLowerCase())) {
    throw new Error('Writes disabled. Set HOSTEX_ALLOW_WRITES=true to enable write operations.');
  }
}
