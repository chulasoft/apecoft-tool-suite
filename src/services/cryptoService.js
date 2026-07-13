
const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

// Endpoints are tried in order until one returns valid JSON:
//   1. Our own /api/coingecko serverless function (Vercel) — no third-party
//      dependency, server-side, no CORS. This is the happy path in production.
//   2. Public CORS proxies — a safety net so the tool still works when the
//      serverless function isn't available (opened as a static site, local
//      file, preview host) or is momentarily failing / rate-limited.
const buildEndpointUrls = (endpoint) => {
    const upstream = `${COINGECKO_BASE}${endpoint}`;
    return [
        `/api/coingecko${endpoint}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(upstream)}`,
        `https://corsproxy.io/?url=${encodeURIComponent(upstream)}`,
    ];
};

// Try each candidate URL in turn; resolve with the first that yields JSON.
const fetchFromApi = async (endpoint) => {
    const urls = buildEndpointUrls(endpoint);
    let lastError;

    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                lastError = new Error(`API call failed for ${url}: ${response.status}`);
                continue;
            }
            // A proxy that silently returns HTML (error page) would break
            // JSON.parse; treat that as a failure and fall through.
            return await response.json();
        } catch (error) {
            lastError = error;
        }
    }

    console.error(`All CoinGecko endpoints failed for ${endpoint}:`, lastError);
    throw lastError || new Error(`Failed to fetch ${endpoint}`);
};

export const fetchTopTokens = async () => {
    try {
        // Fetch top 500 tokens (250 per page, 2 pages)
        const page1Promise = fetchFromApi(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false`);
        const page2Promise = fetchFromApi(`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=2&sparkline=false`);
        
        const results = await Promise.allSettled([page1Promise, page2Promise]);

        // Safely extract data, defaulting to an empty array on failure or if data is not an array
        const page1 = results[0].status === 'fulfilled' && Array.isArray(results[0].value) ? results[0].value : [];
        const page2 = results[1].status === 'fulfilled' && Array.isArray(results[1].value) ? results[1].value : [];

        // If both requests fail, throw an error to be caught by the caller
        if (page1.length === 0 && page2.length === 0 && results.some(r => r.status === 'rejected')) {
             const firstRejection = results.find(r => r.status === 'rejected');
             if(firstRejection) throw firstRejection.reason;
        }
        
        const response = [...page1, ...page2];
        
        const tokens = new Map();
        
        if (response && Array.isArray(response)) {
            response.forEach(tokenData => {
                // Use the CoinGecko ID as the primary identifier
                const id = tokenData.id;
                
                if (id && !tokens.has(id)) {
                    const token = {
                        id: id,
                        symbol: tokenData.symbol,
                        name: tokenData.name,
                        image: tokenData.image,
                    };
                    tokens.set(token.id, token);
                }
            });
        }
        
        return Array.from(tokens.values());
    } catch (error) {
        console.error(`Failed to fetch top token list:`, error);
        throw new Error('Failed to fetch token list.');
    }
};

export const fetchCoinDetails = async (tokenIds) => {
    if (!tokenIds || tokenIds.length === 0) {
        return {};
    }

    try {
        // Use the markets endpoint to get all necessary data in one call
        const endpoint = `/coins/markets?vs_currency=usd&ids=${tokenIds.join(',')}&order=market_cap_desc&sparkline=false`;
        const detailsData = await fetchFromApi(endpoint);

        const finalDetails = {};
        if (Array.isArray(detailsData)) {
            detailsData.forEach(coin => {
                finalDetails[coin.id] = coin;
            });
        }
        return finalDetails;

    } catch (error) {
        console.error("Failed to fetch coin details from CoinGecko:", error);
        throw new Error('Failed to fetch coin details.');
    }
};

export const fetchMarketData = async (tokenIds) => {
    if (!tokenIds || tokenIds.length === 0) {
        return {};
    }

    try {
        // Use the simple price endpoint with CoinGecko IDs
        const endpoint = `/simple/price?ids=${tokenIds.join(',')}&vs_currencies=usd`;
        const priceData = await fetchFromApi(endpoint);

        const finalPrices = {};
        // The API returns { "ethereum": { "usd": 123 }, "usd-coin": { "usd": 1 } }
        // We need to map it to { "ethereum": 123, "usd-coin": 1 }
        for (const id in priceData) {
            if (priceData[id]?.usd !== undefined) {
                finalPrices[id] = priceData[id].usd;
            }
        }
        return finalPrices;

    } catch (error) {
        console.error("Failed to fetch market data from CoinGecko:", error);
        throw new Error('Failed to fetch market data.');
    }
};
