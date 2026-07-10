
const API_BASE_URL = 'https://api.coingecko.com/api/v3';

// Helper function to handle fetch requests to CoinGecko
const fetchFromApi = async (endpoint) => {
    const targetUrl = `${API_BASE_URL}${endpoint}`;
    // Cycling through public CORS proxies to find a reliable one.
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
    try {
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API call failed for ${targetUrl} via proxy: ${response.status}. Response: ${errorText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch from ${targetUrl} via proxy:`, error);
        throw error;
    }
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
