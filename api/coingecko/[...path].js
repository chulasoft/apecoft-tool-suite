// Vercel serverless function: same-origin proxy for the CoinGecko API.
//
// Replaces the previous client-side dependency on corsproxy.io, a public
// third-party proxy with no uptime guarantee. Running server-side also means
// the browser never needs CORS headers from CoinGecko at all.
//
// Deliberately written against the plain Node `http` request/response shape
// (res.statusCode/setHeader/end) rather than Vercel's res.status()/json()
// helpers, so the same handler can be exercised by a bare `http.createServer`
// during local development/testing without any Vercel-specific runtime.
//
// Optional env vars (set in the Vercel project, both optional):
//   COINGECKO_DEMO_API_KEY  -> sent as x-cg-demo-api-key against the public API
//   COINGECKO_PRO_API_KEY   -> sent as x-cg-pro-api-key against the pro API
// Without a key the public endpoint still works but is rate-limited by IP,
// which is the most common cause of intermittent 429 "errors" in the UI.

const PREFIX = '/api/coingecko';
const DEMO_KEY = process.env.COINGECKO_DEMO_API_KEY || '';
const PRO_KEY = process.env.COINGECKO_PRO_API_KEY || '';
const UPSTREAM_BASE = PRO_KEY
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    // Strip the /api/coingecko prefix wherever it appears; fall back to the raw
    // url so a platform that already strips the prefix still routes correctly.
    const prefixIndex = req.url.indexOf(PREFIX);
    const rest = prefixIndex >= 0 ? req.url.slice(prefixIndex + PREFIX.length) : req.url;
    const upstreamUrl = `${UPSTREAM_BASE}${rest.startsWith('/') ? rest : '/' + rest}`;

    const headers = {
        Accept: 'application/json',
        // A real UA avoids some edge blocks on header-less serverless requests.
        'User-Agent': 'ApecoftToolSuite/1.0 (+https://github.com/chulasoft/apecoft-tool-suite)',
    };
    if (PRO_KEY) headers['x-cg-pro-api-key'] = PRO_KEY;
    else if (DEMO_KEY) headers['x-cg-demo-api-key'] = DEMO_KEY;

    try {
        const upstreamResponse = await fetch(upstreamUrl, { headers });
        const body = await upstreamResponse.text();

        res.statusCode = upstreamResponse.status;
        res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'application/json');
        // Cache briefly at the edge so a burst of visitors doesn't hammer CoinGecko.
        res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=120');
        res.end(body);
    } catch (error) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Failed to reach CoinGecko', detail: String(error) }));
    }
}
