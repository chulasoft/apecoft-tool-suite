
import { translations } from '../i18n/translations.js';
import { fetchTopTokens } from '../services/cryptoService.js';

// --- STATE & CONSTANTS ---
const DEFILAMA_API_URL = 'https://yields.llama.fi/pools';
const MIN_TVL_USD = 10000;

let state, elements, utils, yfElements;

const getInitialState = () => ({
    initialized: false,
    currentRoom: 'selection', // 'selection', 'eth', 'sui'
    isLoading: false,
    error: null,
    allPools: [], // Cache for the full list of pools
    lastFetchTimestamp: 0,
    coinGeckoTokens: [], // Cache for tokens with images from CoinGecko
    eth: {
        searchTerm: '',
        results: [],
    },
    sui: {
        searchTerm: '',
        results: [],
    }
});

// --- INITIALIZATION ---
async function initialize(context) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.yieldFinder.initialized) return;

    yfElements = {
        mainContainer: document.getElementById('yield-finder-app'),
    };

    yfElements.mainContainer.addEventListener('click', handleEvent);
    yfElements.mainContainer.addEventListener('submit', (e) => {
        e.preventDefault();
        const form = e.target.closest('form');
        if (form) {
            handleSearch(form.dataset.room);
        }
    });
     yfElements.mainContainer.addEventListener('input', (e) => {
        const input = e.target;
        if (input.matches('#eth-search-input, #sui-search-input')) {
            const room = input.id.startsWith('eth') ? 'eth' : 'sui';
            state.yieldFinder[room].searchTerm = input.value;
        }
    });

    state.yieldFinder = getInitialState();
    render();
    
    await loadCoinGeckoData();
    
    state.yieldFinder.initialized = true;
}

// --- RENDER FUNCTIONS ---

function render() {
    const { currentRoom } = state.yieldFinder;

    if (currentRoom === 'selection') {
        renderSelectionScreen();
    } else {
        renderRoomScreen(currentRoom);
    }
    utils.translateUI(state.lang);
}

function renderSelectionScreen() {
    const t = translations[state.lang];

    const roomCard = (roomKey, titleKey, descKey, color, hoverGradient, shimmerGradient, isLocked = false) => {
        const lockedClass = isLocked ? 'locked-room-card' : 'interactive-hover';
        const cursorClass = isLocked ? 'cursor-not-allowed' : 'cursor-pointer';

        return `
        <div class="room-card tool-card ${lockedClass} border border-slate-700 rounded-2xl p-1 text-left ${cursorClass} flex flex-col h-full" data-room="${roomKey}" style="--hover-gradient: ${hoverGradient}; --shimmer-gradient: ${shimmerGradient};">
            <div class="relative-content p-4">
                <div class="flex-grow">
                    <h3 class="text-xl font-bold ${color}" data-i18n-key="${titleKey}"></h3>
                    <p class="text-sm shimmering-gradient-text mt-1" data-i18n-key="${descKey}"></p>
                </div>
                <div class="mt-4 inline-block font-bold ${color} group">
                    <span data-i18n-key="enterRoom"></span>
                    ${!isLocked ? `<span class="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">&rarr;</span>` : ''}
                </div>
            </div>
        </div>`;
    }

    yfElements.mainContainer.innerHTML = `
        <header class="my-8 space-y-4">
            <div class="flex justify-between items-center">
                <button id="back-to-landing-yf-btn" class="flex items-center gap-1 py-2 pl-2 pr-4 rounded-full text-slate-300 hover:bg-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span data-i18n-key="backButton"></span>
                </button>
            </div>
            <div class="text-center">
                <h2 data-i18n-key="seekerToolTitle" class="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500"></h2>
                <p data-i18n-key="seekerToolDescription" class="mt-2 text-lg text-slate-300 max-w-3xl mx-auto"></p>
            </div>
        </header>
        <main class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            ${roomCard('eth', 'yfEthPoolsTitle', 'yfEthPoolsDescription', 'text-cyan-400', 'linear-gradient(110deg, transparent 30%, rgba(34, 211, 238, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #22d3ee, #67e8f9, #22d3ee)', false)}
            ${roomCard('sui', 'yfSuiPoolsTitle', 'yfSuiPoolsDescription', 'text-teal-400', 'linear-gradient(110deg, transparent 30%, rgba(45, 212, 191, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #2dd4bf, #5eead4, #2dd4bf)', true)}
            ${roomCard('base', 'yfBasePoolsTitle', 'yfBasePoolsDescription', 'text-blue-400', 'linear-gradient(110deg, transparent 30%, rgba(96, 165, 250, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #60a5fa, #93c5fd, #60a5fa)', true)}
            ${roomCard('uniswap', 'yfUniswapPoolsTitle', 'yfUniswapPoolsDescription', 'text-pink-400', 'linear-gradient(110deg, transparent 30%, rgba(236, 72, 153, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #ec4899, #f9a8d4, #ec4899)', true)}
            ${roomCard('arbitrum', 'yfArbPoolsTitle', 'yfArbPoolsDescription', 'text-sky-400', 'linear-gradient(110deg, transparent 30%, rgba(56, 189, 248, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #38bdf8, #7dd3fc, #38bdf8)', true)}
            ${roomCard('solana', 'yfSolPoolsTitle', 'yfSolPoolsDescription', 'text-purple-400', 'linear-gradient(110deg, transparent 30%, rgba(168, 85, 247, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #a855f7, #d8b4fe, #a855f7)', true)}
        </main>
    `;
}

function renderRoomScreen(room) {
    const t = translations[state.lang];
    const roomState = state.yieldFinder[room];
    const roomDetails = {
        eth: { titleKey: 'yfEthPoolsTitle' },
        sui: { titleKey: 'yfSuiPoolsTitle' },
    };

    const searchCard = `
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <form id="${room}-search-form" data-room="${room}">
                <div class="flex flex-col sm:flex-row gap-4">
                    <input type="search" id="${room}-search-input" value="${roomState.searchTerm}" required
                           class="flex-grow bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-teal-500 focus:border-teal-500 block w-full p-2.5"
                           placeholder="${t.yfSearchPlaceholder}">
                    <button type="submit" class="bg-teal-500 text-white font-bold py-2.5 px-6 rounded-md hover:bg-teal-400 transition-colors">
                        <span data-i18n-key="yfSearchButton"></span>
                    </button>
                </div>
            </form>
        </div>
    `;

    yfElements.mainContainer.innerHTML = `
        <header class="my-8 space-y-4">
            <div class="flex justify-between items-center">
                <button class="back-to-rooms-btn flex items-center gap-1 py-2 pl-2 pr-4 rounded-full text-slate-300 hover:bg-slate-800 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span data-i18n-key="backToHall"></span>
                </button>
            </div>
            <div class="text-center">
                <h2 data-i18n-key="${roomDetails[room].titleKey}" class="text-4xl sm:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-500"></h2>
            </div>
        </header>
        <main class="max-w-7xl mx-auto w-full space-y-6">
            ${searchCard}
            <div id="yf-results-container">
                ${renderResults(room)}
            </div>
        </main>
    `;
}

function renderResults(room) {
    const { isLoading, error } = state.yieldFinder;
    const { results, searchTerm } = state.yieldFinder[room];

    if (isLoading) {
        return `<div class="text-center p-8"><div class="bvr-spinner mx-auto"></div><p class="mt-4 text-slate-400" data-i18n-key="yfLoading"></p></div>`;
    }
    if (error) {
        return `<div class="text-center p-8 bg-red-500/10 rounded-lg"><p class="text-lg text-red-400" data-i18n-key="yfError"></p></div>`;
    }
    if (results.length === 0 && searchTerm) {
        return `<div class="text-center p-8 bg-slate-800/60 rounded-lg"><p class="text-slate-400" data-i18n-key="yfNoResults"></p></div>`;
    }
    if (results.length === 0) {
        return '';
    }

    if (room === 'eth') {
        const cardsHTML = results.map(pool => renderEthPoolCard(pool)).join('');
        return `<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">${cardsHTML}</div>`;
    } else {
        // --- Fallback for Sui and other rooms ---
        const tableRows = results.map(pool => `
            <tr class="hover:bg-slate-700/50 transition-colors">
                <td class="px-4 py-3 font-medium text-white">${pool.symbol}</td>
                <td class="px-4 py-3 text-slate-300 capitalize">${pool.project.replace(/-/g, ' ')}</td>
                <td class="px-4 py-3 font-mono text-cyan-400">${utils.formatValue(pool.tvlUsd)}</td>
                <td class="px-4 py-3 font-mono font-bold text-lg text-green-400">${utils.formatPercent(pool.apy, 2)}</td>
            </tr>
        `).join('');

        return `
            <div class="bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden">
                <h3 class="text-lg font-bold text-slate-300 p-4 border-b border-slate-700" data-i18n-key="yfResultsTitle"></h3>
                <div class="overflow-x-auto custom-scrollbar">
                    <table class="w-full text-sm text-left clean-table">
                        <thead>
                            <tr>
                                <th class="w-[40%]" data-i18n-key="yfPool"></th>
                                <th class="w-[25%]" data-i18n-key="yfProject"></th>
                                <th class="w-[17.5%]" data-i18n-key="yfTvl"></th>
                                <th class="w-[17.5%]" data-i18n-key="yfApy"></th>
                            </tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </div>
            </div>`;
    }
}

function renderEthPoolCard(pool) {
    const t = translations[state.lang];
    const symbolParts = pool.symbol.split('-');
    const tokenA = symbolParts[0];
    const tokenB = symbolParts[1];
    const feeTier = symbolParts.length > 2 ? symbolParts[2] : null;

    const iconA = findIconUrl(tokenA);
    const iconB = findIconUrl(tokenB);

    const statItem = (labelKey, value, valueColor = 'text-white') => `
        <div class="yf-stat-item">
            <p class="text-xs text-slate-400" data-i18n-key="${labelKey}"></p>
            <p class="font-mono font-semibold text-sm ${valueColor}">${value}</p>
        </div>
    `;
    
    const apyChange30d = pool.apyPct30D;
    const apyChangeColor = apyChange30d == null ? 'text-white' : apyChange30d > 0 ? 'text-green-400' : 'text-red-400';
    const apyChangeValue = apyChange30d == null ? 'N/A' : `${apyChange30d > 0 ? '+' : ''}${utils.formatPercent(apyChange30d, 2)}`;

    return `
        <div class="yf-card border border-slate-700 rounded-xl p-5">
            <div class="flex justify-between items-start">
                <div>
                    <div class="flex items-center">
                        <img src="${iconA || ''}" alt="${tokenA}" class="yf-token-icon" ${!iconA ? 'style="display:none;"' : ''}>
                        <img src="${iconB || ''}" alt="${tokenB}" class="yf-token-icon" ${!iconB ? 'style="display:none;"' : ''}>
                    </div>
                    <h3 class="text-xl font-bold text-white mt-3">${tokenA} / ${tokenB}</h3>
                </div>
                <div class="text-right flex-shrink-0">
                    <p class="font-semibold text-teal-300 capitalize">${pool.project.replace(/-/g, ' ')}</p>
                    <span class="text-xs font-mono bg-slate-700 text-teal-400 px-2 py-1 rounded-full mt-1 inline-block">
                        <span data-i18n-key="yfFeeTier"></span>: ${feeTier || 'N/A'}
                    </span>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-4 text-white">
                ${statItem('yfTvl', utils.formatValue(pool.tvlUsd))}
                ${statItem('yfVol1d', utils.formatValue(pool.volumeUsd1d))}
                ${statItem('yfVol7d', utils.formatValue(pool.volumeUsd7d))}
                ${statItem('yfApr1d', utils.formatPercent(pool.apyBase, 2), 'text-green-400')}
                ${statItem('yfApr7d', utils.formatPercent(pool.apyBase7d, 2), 'text-green-400')}
                ${statItem('yfApyChange30d', apyChangeValue, apyChangeColor)}
            </div>
        </div>
    `;
}


// --- LOGIC & EVENT HANDLERS ---

async function loadCoinGeckoData() {
    const yfState = state.yieldFinder;
    if (yfState.coinGeckoTokens.length > 0) return;
    try {
        yfState.coinGeckoTokens = await fetchTopTokens();
    } catch (e) {
        console.error("Failed to load CoinGecko token list for icons:", e);
    }
}

function findIconUrl(symbol) {
    const tokenList = state.yieldFinder.coinGeckoTokens || [];
    if (tokenList.length === 0) return null;

    const normalizedSymbol = symbol.toLowerCase();
    
    let found = tokenList.find(t => t.symbol.toLowerCase() === normalizedSymbol);
    if (found) return found.image;
    
    if (normalizedSymbol.startsWith('w') && normalizedSymbol.length > 1) {
        const unwrapped = normalizedSymbol.substring(1);
        found = tokenList.find(t => t.symbol.toLowerCase() === unwrapped);
        if (found) return found.image;
    }
     if (normalizedSymbol === 'usdc.e') {
        found = tokenList.find(t => t.symbol.toLowerCase() === 'usdc');
        if (found) return found.image;
    }
    
    return null;
}


function handleEvent(e) {
    const roomCard = e.target.closest('.room-card');
    if (roomCard && !roomCard.classList.contains('locked-room-card')) {
        handleRoomSelection(roomCard.dataset.room);
        return;
    }
    const backButton = e.target.closest('.back-to-rooms-btn');
    if (backButton) {
        resetToSelection();
        return;
    }
    // The "Back to Landing" button is handled globally in index.js
}

function handleRoomSelection(room) {
    const yfState = state.yieldFinder;
    yfElements.mainContainer.style.opacity = 0;
    setTimeout(() => {
        yfState.currentRoom = room;
        render();
        yfElements.mainContainer.style.opacity = 1;
    }, 200);
}

function resetToSelection(context) {
    if (context) { // If called from index.js
        state = context.state;
        utils = context.utils;
    }
    yfElements.mainContainer.style.opacity = 0;
    setTimeout(() => {
        state.yieldFinder.currentRoom = 'selection';
        render();
        yfElements.mainContainer.style.opacity = 1;
    }, 200);
}

async function fetchPools() {
    const yfState = state.yieldFinder;
    const now = Date.now();
    // Cache for 10 minutes
    if (yfState.allPools.length > 0 && (now - yfState.lastFetchTimestamp < 10 * 60 * 1000)) {
        return yfState.allPools;
    }

    yfState.isLoading = true;
    render();

    try {
        const response = await fetch(DEFILAMA_API_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        yfState.allPools = data.data;
        yfState.lastFetchTimestamp = now;
        yfState.error = null;
        return yfState.allPools;
    } catch (e) {
        console.error("Failed to fetch DefiLlama pools:", e);
        yfState.error = 'Failed to fetch pool data.';
        throw e;
    } finally {
        yfState.isLoading = false;
    }
}

function filterAndRankPools(pools, room, searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    
    const chainConfig = {
        eth: {
            chain: 'Ethereum',
            projects: ['uniswap-v3'],
        },
        sui: {
            chain: 'Sui',
            projects: ['cetus', 'flowx-finance', 'bluefin', 'morphex'],
        },
    };

    const config = chainConfig[room];

    const filtered = pools.filter(p => {
        return p.chain === config.chain &&
               config.projects.includes(p.project) &&
               p.symbol.toLowerCase().includes(searchLower) &&
               p.tvlUsd >= MIN_TVL_USD &&
               p.apyBase > 0;
    });

    if (room === 'eth') {
         const sorted = filtered.sort((a, b) => {
            if (b.tvlUsd !== a.tvlUsd) {
                return b.tvlUsd - a.tvlUsd;
            }
            return (b.volumeUsd7d || 0) - (a.volumeUsd7d || 0);
        });
        return sorted.slice(0, 10);
    } else {
        const sorted = filtered.sort((a, b) => b.apy - a.apy);
        return sorted.slice(0, 5);
    }
}

async function handleSearch(room) {
    const yfState = state.yieldFinder;
    const searchTerm = yfState[room].searchTerm.trim();

    if (!searchTerm) {
        yfState[room].results = [];
        render();
        return;
    }

    try {
        const allPools = await fetchPools();
        const results = filterAndRankPools(allPools, room, searchTerm);
        yfState[room].results = results;
    } catch (e) {
        // Error is already set in fetchPools
    } finally {
        render();
    }
}

// --- EXPORT ---
export const yieldFinderApp = {
    initialState: getInitialState(),
    initialize: initialize,
    render: render,
    resetToSelection: resetToSelection,
};