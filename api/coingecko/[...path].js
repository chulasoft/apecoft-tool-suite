// Vercel serverless function: same-origin proxy for the CoinGecko public API.
//
// Replaces the previous client-side dependency on corsproxy.io, a public
// third-party proxy with no uptime guarantee. Running server-side also means
// the browser never needs CORS headers from CoinGecko at all.
//
// Deliberately written against the plain Node `http` request/response shape
// (res.statusCode/setHeader/end) rather than Vercel's res.status()/json()
// helpers, so the same handler can be exercised by a bare `http.createServer`
// during local development/testing without any Vercel-specific runtime.

const UPSTREAM_BASE = 'https://api.coingecko.com/api/v3';
const PREFIX = '/api/coingecko';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    const prefixIndex = req.url.indexOf(PREFIX);
    const rest = prefixIndex === 0 ? req.url.slice(PREFIX.length) : req.url;
    const upstreamUrl = `${UPSTREAM_BASE}${rest}`;

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            headers: { Accept: 'application/json' },
        });
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
