
import { translations } from '../i18n/translations.js';
import { fetchCoinDetails } from '../services/cryptoService.js';
import { CoinSelector } from '../components/CoinSelector.js';
import { createSwapIcon } from '../components/icons.js';

// --- CONSTANTS & STATE ---
const COMPARATOR_STATE_KEY = 'comparatorState';

const initialState = {
    initialized: false,
    tokenAId: 'bitcoin',
    tokenBId: 'ethereum',
    tokenAData: null,
    tokenBData: null,
    useAthForA: false,
    useAthForB: false,
    tokenAHoldings: '1',
    tokenBHoldings: '1',
    isLoading: false,
    error: null,
};

// Module-scoped variables for context passed from index.js
let state, elements, utils;

// DOM elements specific to the comparator
const compElements = {};

// --- INITIALIZATION ---
function initializeComparator(context) {
    // Set up context
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.comparator.initialized) return;
    
    // Cache DOM elements
    Object.assign(compElements, {
        mainContainer: document.getElementById('comparator-main'),
    });

    CoinSelector.init(elements.modalContainer);

    // Add event listener using delegation on the main container
    compElements.mainContainer.addEventListener('click', handleMainClick);
    compElements.mainContainer.addEventListener('input', (e) => {
        const projectionInput = e.target.closest('.projection-input');
        if (projectionInput) {
            const coinKey = projectionInput.dataset.coin;
            if (coinKey === 'A') {
                state.comparator.tokenAHoldings = projectionInput.value;
            } else {
                state.comparator.tokenBHoldings = projectionInput.value;
            }
            updateProjectionValues(); // Targeted update instead of full re-render
        }
    });
    
    const guideBtn = document.getElementById('comparator-guide-btn');
    if (guideBtn) {
        guideBtn.addEventListener('click', showComparatorGuide);
    }


    loadComparatorStateFromStorage();
    renderComparator();
    
    const initialLoad = () => {
        loadCoinData();
    };

    if (state.allCoins.length > 0) {
        initialLoad();
    } else {
        const checkInterval = setInterval(() => {
            if (!state.isLoadingAllCoins) {
                clearInterval(checkInterval);
                initialLoad();
            }
        }, 200);
    }

    state.comparator.initialized = true;
}

// --- RENDER FUNCTIONS ---
function renderComparator() {
  if (!state || !compElements.mainContainer) return;
  const { tokenAData, tokenBData, isLoading, error } = state.comparator;
  const t = translations[state.lang];

  let content = `
    <div id="comp-api-status-container" class="mb-4"></div>
    <div class="flex items-center gap-2 mb-6">
        <div id="comp-token-a-selector-container" class="flex-1"></div>
        <button id="comp-swap-button" class="p-2 mt-5 rounded-full bg-slate-700 hover:bg-amber-500 hover:scale-110 transition-all" data-i18n-key="swapAriaLabel" aria-label="Swap tokens"></button>
        <div id="comp-token-b-selector-container" class="flex-1"></div>
    </div>
    <div id="comp-results-container" class="space-y-6"></div>
  `;
  compElements.mainContainer.innerHTML = content;
  
  // Cache newly created elements
  Object.assign(compElements, {
      apiStatusContainer: document.getElementById('comp-api-status-container'),
      tokenAContainer: document.getElementById('comp-token-a-selector-container'),
      tokenBContainer: document.getElementById('comp-token-b-selector-container'),
      swapButton: document.getElementById('comp-swap-button'),
      resultsContainer: document.getElementById('comp-results-container')
  });

  compElements.swapButton.innerHTML = createSwapIcon();
  
  renderApiStatus();
  updateTokenSelectors();
  
  if (isLoading) {
    compElements.resultsContainer.innerHTML = `<div class="text-center p-8"><p class="text-lg text-amber-400" data-i18n-key="loadingPrices">${t.loadingPrices}</p></div>`;
  } else if (error) {
     compElements.resultsContainer.innerHTML = `<div class="text-center p-8 bg-red-500/10 rounded-lg"><p class="text-lg text-red-400" data-i18n-key="errorPriceData">${t.errorPriceData}</p></div>`;
  } else if (tokenAData && tokenBData) {
    const metrics = calculateAllMetrics();
    compElements.resultsContainer.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div>${renderCoinCard('A')}</div>
            <div>${renderCoinCard('B')}</div>
        </div>
        <div>${renderComparisonCard(metrics)}</div>
    `;
  } else {
    compElements.resultsContainer.innerHTML = `<div class="text-center p-8"><p class="text-lg text-slate-400" data-i18n-key="waitingForCoins">${t.waitingForCoins}</p></div>`;
  }
  
  utils.translateUI(state.lang);
}

function renderApiStatus() {
    const t = translations[state.lang];
    const { error } = state.comparator;
    if (state.isLoadingAllCoins) {
        compElements.apiStatusContainer.innerHTML = `<div class="text-center p-2 bg-slate-700/50 rounded-md text-cyan-400">${t.loadingApi}</div>`;
    } else if (state.allCoins.length === 0) {
        compElements.apiStatusContainer.innerHTML = `
            <div class="text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p class="text-red-400 text-sm mb-2">${t.errorCoinList}</p>
            </div>`;
    } else {
        compElements.apiStatusContainer.innerHTML = '';
    }
}

function updateTokenSelectors() {
    renderSelectorButton(compElements.tokenAContainer, state.comparator.tokenAId, 'selectCoinA');
    renderSelectorButton(compElements.tokenBContainer, state.comparator.tokenBId, 'selectCoinB');
}

function renderSelectorButton(container, coinId, labelKey) {
    const { allCoins, isLoadingAllCoins } = state;
    const selectedCoin = allCoins.find(c => c.id === coinId);
    const t = translations[state.lang];

    let content;
    if (isLoadingAllCoins && !selectedCoin) {
        content = `<span class="opacity-50">${t.loadingPrices}</span>`;
    } else if (selectedCoin) {
        content = `
            <img src="${selectedCoin.image}" alt="${selectedCoin.name}" class="w-6 h-6 mr-2 rounded-full">
            <span class="flex flex-col text-left">
              <span class="font-bold leading-tight">${selectedCoin.symbol.toUpperCase()}</span>
              <span class="text-xs text-slate-400 leading-tight">${selectedCoin.name}</span>
            </span>`;
    } else {
        content = `<span data-i18n-key="selectCoinPlaceholder">${t.selectCoinPlaceholder}</span>`;
    }

    container.innerHTML = `
        <label class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="${labelKey}">${t[labelKey]}</label>
        <button type="button" ${isLoadingAllCoins ? 'disabled' : ''} class="flex items-center w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-left text-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed hover:border-amber-500 transition-colors">
            ${content}
        </button>`;
}

function renderCoinCard(coinKey) {
    const coinData = coinKey === 'A' ? state.comparator.tokenAData : state.comparator.tokenBData;
    const useAth = coinKey === 'A' ? state.comparator.useAthForA : state.comparator.useAthForB;
    const t = translations[state.lang];

    if (!coinData) return '';
    
    const infoRow = (labelKey, value) => `
        <div class="flex justify-between items-baseline text-sm">
            <span class="text-slate-400" data-i18n-key="${labelKey}">${t[labelKey]}</span>
            <span class="font-mono font-semibold text-white">${value}</span>
        </div>`;

    return `
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 md:p-6 space-y-3 h-full">
            <div class="flex items-center gap-3">
                <img src="${coinData.image}" alt="${coinData.name}" class="w-10 h-10 rounded-full"/>
                <div>
                    <h3 class="text-2xl font-bold text-white">${coinData.symbol.toUpperCase()}</h3>
                    <p class="text-sm text-slate-400">${coinData.name}</p>
                </div>
            </div>
            <hr class="border-slate-700"/>
            ${infoRow('currentPriceLabel', utils.formatValue(coinData.current_price, 2, false))}
            ${infoRow('marketCap', '$' + utils.formatBigNumber(coinData.market_cap))}
            ${infoRow('athPrice', utils.formatValue(coinData.ath, 2, false))}
            <div class="pt-2">
                 <button data-coin="${coinKey}" class="ath-toggle-btn w-full text-sm font-bold py-2 px-4 rounded-md transition-colors ${useAth ? 'bg-amber-500 text-slate-900' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}">
                    <span data-i18n-key="${useAth ? 'useCurrentMcap' : 'useAthMcap'}">${t[useAth ? 'useCurrentMcap' : 'useAthMcap']}</span>
                 </button>
            </div>
        </div>`;
}

function renderComparisonCard(metrics) {
    if (!metrics) return '';
    const t = translations[state.lang];

    const renderComparisonRow = (comparisonData, coinKey) => {
        if (!comparisonData || !comparisonData.baseCoin) return '';
        const { potentialPrice, potentialGain, percentageChange, baseCoin } = comparisonData;
        const holdings = coinKey === 'A' ? state.comparator.tokenAHoldings : state.comparator.tokenBHoldings;
        
        const gainClass = potentialGain >= 1 ? 'potential-gain' : 'potential-loss';
        const priceAndPercentClass = `text-2xl font-bold ${potentialGain >= 1 ? 'text-green-400' : 'text-red-400'}`;
        
        return `
            <div class="grid grid-cols-1 md:grid-cols-12 items-center py-3 gap-y-4 gap-x-4">
                
                <div class="md:col-span-3 flex items-center gap-3">
                    <img src="${baseCoin.image}" alt="${baseCoin.name}" class="w-10 h-10 rounded-full">
                    <div>
                        <p class="font-bold text-white">${baseCoin.symbol.toUpperCase()}</p>
                        <p class="text-xs text-slate-400">${baseCoin.name}</p>
                    </div>
                </div>

                <div class="md:col-span-5 grid grid-cols-3 gap-x-4 text-center md:text-left">
                    <div>
                        <div class="text-xs text-slate-400 uppercase tracking-wider" data-i18n-key="potentialPrice">${t.potentialPrice}</div>
                        <p class="${priceAndPercentClass}">${utils.formatValue(potentialPrice, 2)}</p>
                    </div>
                    <div>
                        <div class="text-xs text-slate-400 uppercase tracking-wider" data-i18n-key="multiplierLabel">${t.multiplierLabel}</div>
                        <p class="${gainClass}">${potentialGain.toFixed(2)}x</p>
                    </div>
                    <div>
                        <div class="text-xs text-slate-400 uppercase tracking-wider" data-i18n-key="changeLabel">${t.changeLabel}</div>
                        <p class="${priceAndPercentClass}">${percentageChange >= 0 ? '+' : ''}${percentageChange.toFixed(0)}%</p>
                    </div>
                </div>

                <div class="md:col-span-4 grid grid-cols-2 gap-x-4">
                     <div>
                        <label class="block text-xs text-slate-400 uppercase tracking-wider mb-1" data-i18n-key="holdingsLabel">${t.holdingsLabel}</label>
                        <div class="relative">
                            <input type="number" 
                                value="${holdings}" 
                                data-coin="${coinKey}"
                                data-step="auto"
                                placeholder="1"
                                class="projection-input w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm pl-3 pr-2 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"/>
                        </div>
                    </div>
                     <div>
                        <div class="text-xs text-slate-400 uppercase tracking-wider mb-1" data-i18n-key="projectedValueLabel">${t.projectedValueLabel}</div>
                        <div id="projection-result-${coinKey.toLowerCase()}" class="flex items-center justify-center h-[42px] font-mono font-bold text-lg p-2 bg-slate-900/50 rounded-md">
                           ${renderProjectionValue(holdings, comparisonData)}
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    return `
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 md:p-6 space-y-2">
            ${renderComparisonRow(metrics.a_vs_b, 'A')}
            <hr class="border-slate-700"/>
            ${renderComparisonRow(metrics.b_vs_a, 'B')}
        </div>
    `;
}

function renderProjectionValue(holdings, comparisonData) {
    if (!comparisonData || !comparisonData.baseCoin) return '';
    const { baseCoin, potentialPrice } = comparisonData;
    const holdingsNum = parseFloat(holdings) || 0;

    if (holdingsNum > 0 && isFinite(potentialPrice)) {
        const projectedValue = holdingsNum * potentialPrice;
        const gainClass = potentialPrice >= baseCoin.current_price ? 'text-green-400' : 'text-red-400';
        return `<span class="${gainClass}">${utils.formatValue(projectedValue, 2)}</span>`;
    }
    return `<span class="text-slate-500">-</span>`;
}


// --- PERSISTENCE ---
const saveComparatorStateToStorage = () => {
    try {
        const stateToSave = {
            tokenAId: state.comparator.tokenAId,
            tokenBId: state.comparator.tokenBId,
        };
        localStorage.setItem(COMPARATOR_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save comparator state:", e); }
};

const loadComparatorStateFromStorage = () => {
    try {
        const storedState = localStorage.getItem(COMPARATOR_STATE_KEY);
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            Object.assign(state.comparator, parsedState);
        }
    } catch (e) { console.error("Failed to load comparator state:", e); }
};

// --- CALCULATIONS ---
function calculateAllMetrics() {
    const { tokenAData, tokenBData, useAthForA, useAthForB } = state.comparator;
    if (!tokenAData || !tokenBData) return null;

    const calcRow = (baseCoin, targetCoin, useAth) => {
        const targetMcap = useAth ? (targetCoin.ath * targetCoin.circulating_supply) : targetCoin.market_cap;
        if (!baseCoin.circulating_supply || baseCoin.circulating_supply === 0) return {};
        
        const potentialPrice = targetMcap / baseCoin.circulating_supply;
        const potentialGain = baseCoin.current_price > 0 ? potentialPrice / baseCoin.current_price : 0;
        const percentageChange = (potentialGain - 1) * 100;

        return { potentialPrice, potentialGain, percentageChange, baseCoin, targetCoin };
    };

    return {
        a_vs_b: calcRow(tokenAData, tokenBData, useAthForB),
        b_vs_a: calcRow(tokenBData, tokenAData, useAthForA)
    };
}


// --- EVENT HANDLERS & DATA FETCHING ---
function updateProjectionValues() {
    const metrics = calculateAllMetrics();
    if (!metrics) return;

    const resultAContainer = document.getElementById('projection-result-a');
    if (resultAContainer) {
        resultAContainer.innerHTML = renderProjectionValue(state.comparator.tokenAHoldings, metrics.a_vs_b);
    }
    
    const resultBContainer = document.getElementById('projection-result-b');
    if (resultBContainer) {
        resultBContainer.innerHTML = renderProjectionValue(state.comparator.tokenBHoldings, metrics.b_vs_a);
    }
}

function handleMainClick(e) {
    const target = e.target;

    const swapBtn = target.closest('#comp-swap-button');
    if (swapBtn) {
        handleSwap();
        return;
    }
    const athToggleBtn = target.closest('.ath-toggle-btn');
    if (athToggleBtn) {
        const coinKey = athToggleBtn.dataset.coin;
        if (coinKey === 'A') {
            state.comparator.useAthForA = !state.comparator.useAthForA;
        } else if (coinKey === 'B') {
            state.comparator.useAthForB = !state.comparator.useAthForB;
        }
        renderComparator();
        return;
    }

    const tokenAButton = target.closest('#comp-token-a-selector-container button');
    if (tokenAButton && !tokenAButton.disabled) {
        CoinSelector.show(state.allCoins, (coinId) => {
            state.comparator.tokenAId = coinId;
            handleTokenChange();
        });
        return;
    }

    const tokenBButton = target.closest('#comp-token-b-selector-container button');
    if (tokenBButton && !tokenBButton.disabled) {
        CoinSelector.show(state.allCoins, (coinId) => {
            state.comparator.tokenBId = coinId;
            handleTokenChange();
        });
        return;
    }
}

async function handleTokenChange() {
    await loadCoinData();
    saveComparatorStateToStorage();
}

async function handleSwap() {
    [state.comparator.tokenAId, state.comparator.tokenBId] = [state.comparator.tokenBId, state.comparator.tokenAId];
    [state.comparator.tokenAData, state.comparator.tokenBData] = [state.comparator.tokenBData, state.comparator.tokenAData];
    [state.comparator.useAthForA, state.comparator.useAthForB] = [state.comparator.useAthForB, state.comparator.useAthForA];
    renderComparator();
    saveComparatorStateToStorage();
}

async function loadCoinData() {
    const comp = state.comparator;
    const coinIds = [comp.tokenAId, comp.tokenBId].filter(Boolean);
    if (coinIds.length < 2) return;
    
    comp.isLoading = true;
    comp.error = null;
    renderComparator();

    try {
        const details = await fetchCoinDetails(coinIds);
        comp.tokenAData = details[comp.tokenAId] || null;
        comp.tokenBData = details[comp.tokenBId] || null;
    } catch (e) {
        comp.error = 'priceData';
        comp.tokenAData = null;
        comp.tokenBData = null;
        console.error(e);
    } finally {
        comp.isLoading = false;
        renderComparator();
    }
}

// --- Guide Modal ---
function getComparatorGuideContent() {
    const t = translations[state.lang];
    const listItem = (num, titleKey, contentKey) => `
        <li>
            <span class="rule-number">${num}</span>
            <div class="rule-text">
                <strong class="text-amber-400" data-i18n-key="${titleKey}"></strong>
                <p class="mt-1 text-slate-400" data-i18n-key="${contentKey}"></p>
            </div>
        </li>`;
    
    const disclaimerHTML = `
        <div class="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <h4 class="font-bold text-red-400 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" /></svg>
                <span data-i18n-key="guideCompDisclaimerTitle"></span>
            </h4>
            <p class="mt-2 text-slate-400 text-sm" data-i18n-key="guideCompDisclaimerContent"></p>
        </div>`;

    return `
        <p class="mb-4" data-i18n-key="comparatorGuideIntro"></p>
        <ol class="rules-list">
            ${listItem(1, 'guideCompStep1Title', 'guideCompStep1Content')}
            ${listItem(2, 'guideCompStep2Title', 'guideCompStep2Content')}
            ${listItem(3, 'guideCompStep3Title', 'guideCompStep3Content')}
        </ol>
        ${disclaimerHTML}
    `;
}

function showComparatorGuide() {
    const content = getComparatorGuideContent();
    utils.openGuideModal('comparatorGuideTitle', content);
    utils.translateUI(state.lang);
}

// --- EXPORT MODULE ---
export const comparatorApp = {
    initialState,
    initialize: initializeComparator,
    render: renderComparator
};
