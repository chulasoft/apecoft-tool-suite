
import { translations } from '../i18n/translations.js';
import { fetchMarketData } from '../services/cryptoService.js';
import { CoinSelector } from '../components/CoinSelector.js';
import { createSwapIcon, createCheckIcon, createWarningIcon, createInfoIcon } from '../components/icons.js';
import { createPriceRangeGraph } from '../components/PriceRangeGraph.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';


// --- CONSTANTS & STATE ---
const TOKEN_INFO_CACHE = {
    'ethereum': { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png' },
    'usd-coin': { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png' },
    'bitcoin': { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'},
    'tether': { id: 'tether', symbol: 'USDT', name: 'Tether', image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png'}
};
const LP_CALC_STATE_KEY = 'lpCalculatorState';

const initialState = {
    initialized: false,
    manualMode: false,
    marketData: {},
    tokenAId: 'ethereum',
    tokenBId: 'usd-coin',
    manualTokenASymbol: 'ETH',
    manualTokenBSymbol: 'USDC',
    manualPrice: '',
    investment: '1000',
    minPrice: '',
    maxPrice: '',
    feeAPR: '20',
    poolDuration: '30',
    exitPrice: '',
    isLoadingPrices: false,
    error: null,
};

// Module-scoped variables for context passed from index.js
let state, elements, utils;

// DOM elements specific to the calculator
const calcElements = {};

// --- INITIALIZATION ---
function initializeCalculator(context) {
    // Set up context
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.calculator.initialized) return;
    
    // Cache DOM elements
    Object.assign(calcElements, {
      guideBtn: document.getElementById('calculator-guide-btn'),
      apiStatusContainer: document.getElementById('api-status-container'),
      manualInputContainer: document.getElementById('manual-input-container'),
      apiInputContainer: document.getElementById('api-input-container'),
      tokenAContainer: document.getElementById('token-a-selector-container'),
      tokenBContainer: document.getElementById('token-b-selector-container'),
      swapButton: document.getElementById('swap-button'),
      priceLoader: document.getElementById('price-loader-container'),
      priceError: document.getElementById('price-error-container'),
      currentPriceContainer: document.getElementById('current-price-container'),
      investmentLabel: document.getElementById('investment-label'),
      investmentInput: document.getElementById('investment-input'),
      investmentUnit: document.getElementById('investment-unit'),
      minPriceInput: document.getElementById('min-price-input'),
      maxPriceInput: document.getElementById('max-price-input'),
      minPriceUnit: document.getElementById('min-price-unit'),
      maxPriceUnit: document.getElementById('max-price-unit'),
      rangeButtonsContainer: document.getElementById('range-buttons-container'),
      graphContainer: document.getElementById('price-range-graph-container'),
      feeAprInput: document.getElementById('fee-apr-input'),
      poolDurationInput: document.getElementById('pool-duration-input'),
      exitPriceLabel: document.getElementById('exit-price-label'),
      exitPriceInput: document.getElementById('exit-price-input'),
      exitPriceUnit: document.getElementById('exit-price-unit'),
      exitPriceHelpText: document.getElementById('exit-price-help-text'),
      exitPriceButtonsContainer: document.getElementById('exit-price-buttons-container'),
      resultsColumn: document.getElementById('results-column'),
    });

    calcElements.swapButton.innerHTML = createSwapIcon();
    CoinSelector.init(elements.modalContainer);

    // Add event listeners
    calcElements.swapButton.addEventListener('click', handleSwap);
    calcElements.guideBtn.addEventListener('click', showCalculatorGuide);
    
    // Delegated event listeners for dynamically added content
    elements.calculatorApp.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (!button) return;

        // Handle token selector buttons
        if (button.classList.contains('token-selector-btn')) {
            const selectorType = button.dataset.selector;
            if (selectorType === 'A') {
                CoinSelector.show(state.allCoins, (coinId) => {
                    state.calculator.tokenAId = coinId;
                    handleTokenChange();
                });
            } else if (selectorType === 'B') {
                CoinSelector.show(state.allCoins, (coinId) => {
                    state.calculator.tokenBId = coinId;
                    handleTokenChange();
                });
            }
            return;
        }

        // Handle other buttons by ID
        switch(button.id) {
            case 'manual-mode-btn':
                state.calculator.manualMode = true;
                renderCalculator();
                break;
            case 'export-excel-btn':
                handleExportCSV();
                break;
            case 'export-pdf-btn':
                handleExportPDF();
                break;
        }
    });

    elements.calculatorApp.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT') {
            handleCalculatorInputChange();
        }
    });

    loadCalculatorStateFromStorage();
    renderCalculator(); // Render with initial/loaded state
    
    const initialLoad = () => {
      if (!state.calculator.manualMode) {
        loadMarketData(true); // Pass true to set defaults on initial load
      } else {
        handleCalculatorInputChange();
      }
    };

    // Use global coin list
    if (state.allCoins.length > 0) {
      initialLoad();
    } else {
      // If the global list is still loading, wait for it
      const checkInterval = setInterval(() => {
        if (!state.isLoadingAllCoins) {
          clearInterval(checkInterval);
          initialLoad();
        }
      }, 200);
    }

    state.calculator.initialized = true;
}


// --- RENDER FUNCTIONS ---
function renderCalculator() {
  if (!state) return; // Guard against premature rendering
  updateUIMode();
  if (!state.calculator.manualMode) {
    updateTokenSelectors();
    updatePriceDisplay();
  }
  updatePriceRangeSection();
  updateForecastSection();
  updateResults();
  utils.translateUI(state.lang);
}

function updateUIMode() {
    const t = translations[state.lang];
    const { manualMode, manualTokenBSymbol } = state.calculator;
    calcElements.apiInputContainer.style.display = !manualMode ? 'block' : 'none';
    calcElements.manualInputContainer.style.display = manualMode ? 'block' : 'none';

    if (manualMode) {
        calcElements.apiStatusContainer.innerHTML = '';
        renderManualInputs();
        if(calcElements.investmentLabel) {
            calcElements.investmentLabel.setAttribute('data-i18n-key', 'investmentLabelManual');
            calcElements.investmentLabel.setAttribute('data-i18n-param-tokenb', manualTokenBSymbol.toUpperCase());
        }
        if(calcElements.investmentUnit) {
            calcElements.investmentUnit.textContent = manualTokenBSymbol.toUpperCase();
        }
    } else {
        renderApiStatus();
        if(calcElements.investmentLabel) {
            calcElements.investmentLabel.setAttribute('data-i18n-key', 'investmentLabel');
            calcElements.investmentLabel.removeAttribute('data-i18n-param-tokenb');
        }
        if(calcElements.investmentUnit) {
            calcElements.investmentUnit.textContent = 'USD';
        }
    }
}

function renderApiStatus() {
    const t = translations[state.lang];
    const { manualMode } = state.calculator;

    if (state.isLoadingAllCoins) {
        calcElements.apiStatusContainer.innerHTML = `<div class="text-center p-2 bg-slate-700/50 rounded-md text-cyan-400">${t.loadingApi}</div>`;
    } else if (state.allCoins.length === 0 && !manualMode) {
        calcElements.apiStatusContainer.innerHTML = `
            <div class="text-center p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p class="text-red-400 text-sm mb-2">${t.apiErrorPrompt}</p>
                <button id="manual-mode-btn" class="bg-cyan-500 text-slate-900 font-bold py-2 px-4 rounded-md hover:bg-cyan-400 transition-colors">${t.switchToManualButton}</button>
            </div>`;
    } else {
        calcElements.apiStatusContainer.innerHTML = '';
    }
}

function renderManualInputs() {
    const t = translations[state.lang];
    const { manualTokenASymbol, manualTokenBSymbol, manualPrice } = state.calculator;
    calcElements.manualInputContainer.innerHTML = `
        <h4 class="text-md font-semibold text-slate-300 -mb-2">${t.manualEntryTitle}</h4>
        <div class="flex gap-4">
            <div class="w-full">
                <label class="block text-sm font-medium text-slate-300">${(t.manualSymbolLabel || '').replace('{token}', 'A')}</label>
                <input type="text" id="manual-token-a-symbol" value="${manualTokenASymbol}" placeholder="e.g. ETH" class="mt-1 w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
            </div>
            <div class="w-full">
                <label class="block text-sm font-medium text-slate-300">${(t.manualSymbolLabel || '').replace('{token}', 'B')}</label>
                <input type="text" id="manual-token-b-symbol" value="${manualTokenBSymbol}" placeholder="e.g. USDC" class="mt-1 w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"/>
            </div>
        </div>
        <div>
            <label class="block text-sm font-medium text-slate-300 mb-1">${t.manualPriceLabel}</label>
            <div class="custom-number-input">
                <button type="button" class="number-btn decrement-btn" aria-label="Decrement">-</button>
                <div class="relative flex-grow">
                     <input type="number" id="manual-price" data-step="auto" value="${manualPrice}" placeholder="e.g., 3000" class="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 pl-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-left"/>
                </div>
                <button type="button" class="number-btn increment-btn" aria-label="Increment">+</button>
            </div>
        </div>`;
}

function renderSelectorButton(container, coinId, labelKey) {
    const { allCoins, isLoadingAllCoins } = state;
    const selectedCoin = allCoins.find(c => c.id === coinId) || TOKEN_INFO_CACHE[coinId];
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

    const selectorType = labelKey === 'tokenALabel' ? 'A' : 'B';

    container.innerHTML = `
        <label class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="${labelKey}">${t[labelKey]}</label>
        <button type="button" data-selector="${selectorType}" ${isLoadingAllCoins ? 'disabled' : ''} class="token-selector-btn flex items-center w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-left text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed hover:border-cyan-500 transition-colors">
            ${content}
        </button>`;
}

function updateTokenSelectors() {
    renderSelectorButton(calcElements.tokenAContainer, state.calculator.tokenAId, 'tokenALabel');
    renderSelectorButton(calcElements.tokenBContainer, state.calculator.tokenBId, 'tokenBLabel');
}

function updatePriceDisplay() {
    const { isLoadingPrices, error, marketData, tokenAId, tokenBId } = state.calculator;
    calcElements.priceLoader.style.display = isLoadingPrices ? 'block' : 'none';
    calcElements.priceError.style.display = error === 'priceData' ? 'block' : 'none';
    if(error === 'priceData') calcElements.priceError.textContent = translations[state.lang].errorPriceData;

    const tokenA = marketData[tokenAId];
    const tokenB = marketData[tokenBId];
    
    if (tokenA && tokenB && tokenB.current_price > 0) {
        calcElements.currentPriceContainer.style.display = 'block';
        const currentPrice = tokenA.current_price / tokenB.current_price;
        calcElements.currentPriceContainer.innerHTML = `
            <span class="text-slate-300" data-i18n-key="currentPriceLabel">Current Price:</span>
            <span class="font-bold text-white">1 ${tokenA.symbol.toUpperCase()} = ${currentPrice.toFixed(2)} ${tokenB.symbol.toUpperCase()}</span>`;
    } else {
        calcElements.currentPriceContainer.style.display = 'none';
    }
    utils.translateUI(state.lang);
}

function updatePriceRangeSection() {
    const { manualMode, manualTokenBSymbol, tokenBId, marketData, tokenAId, manualPrice, minPrice, maxPrice } = state.calculator;
    const tokenBInfo = manualMode 
        ? { symbol: manualTokenBSymbol }
        : state.allCoins.find(c => c.id === tokenBId) || TOKEN_INFO_CACHE[tokenBId];
    const unit = tokenBInfo?.symbol.toUpperCase() || '...';
    calcElements.minPriceUnit.textContent = unit;
    calcElements.maxPriceUnit.textContent = unit;

    let currentPrice = 0;
    if(manualMode) {
        currentPrice = parseFloat(manualPrice) || 0;
    } else {
        const tokenA = marketData[tokenAId];
        const tokenB = marketData[tokenBId];
        currentPrice = (tokenA && tokenB && tokenB.current_price > 0) ? tokenA.current_price / tokenB.current_price : 0;
    }
    
    calcElements.rangeButtonsContainer.innerHTML = '';
    [0.01, 0.05, 0.1, 1, 10, 20].forEach(p => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `±${p}%`;
        button.className = 'flex-grow py-1 px-2 text-xs font-medium bg-slate-700 text-cyan-300 rounded-md hover:bg-cyan-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed';
        button.disabled = !currentPrice;
        button.onclick = () => {
            const deviation = currentPrice * (p / 100);
            const precision = currentPrice > 10 ? 2 : currentPrice > 0.1 ? 4 : 6;
            calcElements.minPriceInput.value = (currentPrice - deviation).toFixed(precision);
            calcElements.maxPriceInput.value = (currentPrice + deviation).toFixed(precision);
            handleCalculatorInputChange();
        };
        calcElements.rangeButtonsContainer.appendChild(button);
    });

    const numMin = parseFloat(minPrice);
    const numMax = parseFloat(maxPrice);
    const { manualTokenASymbol } = state.calculator;
    const tokenAInfo = manualMode 
        ? { symbol: manualTokenASymbol }
        : state.allCoins.find(c => c.id === tokenAId) || TOKEN_INFO_CACHE[tokenAId];

    if (currentPrice > 0 && !isNaN(numMin) && !isNaN(numMax) && numMax > numMin && tokenAInfo && tokenBInfo) {
        calcElements.graphContainer.innerHTML = '';
        const graphElement = createPriceRangeGraph({
            minPrice: numMin, maxPrice: numMax, currentPrice: currentPrice,
            tokenASymbol: tokenAInfo.symbol.toUpperCase(), tokenBSymbol: tokenBInfo.symbol.toUpperCase(), lang: state.lang,
        });
        if (graphElement) {
          calcElements.graphContainer.appendChild(graphElement);
        }
    } else {
        calcElements.graphContainer.innerHTML = '';
    }
}

function updateForecastSection() {
    const { manualMode, manualTokenASymbol, manualTokenBSymbol, tokenAId, tokenBId, marketData, manualPrice, exitPrice } = state.calculator;
    const tokenAInfo = manualMode ? { symbol: manualTokenASymbol } : state.allCoins.find(c => c.id === tokenAId) || TOKEN_INFO_CACHE[tokenAId];
    const tokenBInfo = manualMode ? { symbol: manualTokenBSymbol } : state.allCoins.find(c => c.id === tokenBId) || TOKEN_INFO_CACHE[tokenBId];
    const unit = tokenBInfo?.symbol.toUpperCase() || '...';
    
    calcElements.exitPriceLabel.setAttribute('data-i18n-param-token', tokenAInfo?.symbol.toUpperCase() || 'Token A');
    calcElements.exitPriceUnit.textContent = unit;
    
    let currentPrice = 0;
    if(manualMode) {
        currentPrice = parseFloat(manualPrice) || 0;
    } else {
        const tokenA = marketData[tokenAId];
        const tokenB = marketData[tokenBId];
        currentPrice = (tokenA && tokenB && tokenB.current_price > 0) ? tokenA.current_price / tokenB.current_price : 0;
    }

    calcElements.exitPriceInput.placeholder = currentPrice ? utils.formatNumber(currentPrice) : '...';
    
    const numExitPrice = parseFloat(exitPrice);
    if (currentPrice > 0 && !isNaN(numExitPrice)) {
        const diff = ((numExitPrice - currentPrice) / currentPrice) * 100;
        calcElements.exitPriceHelpText.textContent = `${translations[state.lang].changeText} ${diff >= 0 ? '+' : ''}${diff.toFixed(2)}% ${translations[state.lang].fromInitialPriceText}`;
    } else {
        calcElements.exitPriceHelpText.textContent = '';
    }
    
    calcElements.exitPriceButtonsContainer.innerHTML = '';
    [-25, -10, -1, -0.1, 0.1, 1, 10, 25].forEach(p => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = `${p > 0 ? '+' : ''}${p}%`;
        button.className = 'flex-grow py-1 px-2 text-xs font-medium bg-slate-700 text-cyan-300 rounded-md hover:bg-cyan-500 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed';
        button.disabled = !currentPrice;
        button.onclick = () => {
            const newPrice = currentPrice * (1 + (p / 100));
            const precision = currentPrice > 10 ? 2 : currentPrice > 0.1 ? 4 : 6;
            calcElements.exitPriceInput.value = newPrice.toFixed(precision);
            handleCalculatorInputChange();
        };
        calcElements.exitPriceButtonsContainer.appendChild(button);
    });
    utils.translateUI(state.lang);
}

function calculateResults() {
    const calcState = state.calculator;
    let tokenA, tokenB, tokenAInfo, tokenBInfo, P;

    if (calcState.manualMode) {
        P = parseFloat(calcState.manualPrice);
        if (!calcState.investment || !calcState.minPrice || !calcState.maxPrice || !P || !calcState.manualTokenASymbol || !calcState.manualTokenBSymbol) return { status: 'waiting' };
        tokenAInfo = { id: 'manualA', symbol: calcState.manualTokenASymbol.toUpperCase(), name: calcState.manualTokenASymbol };
        tokenBInfo = { id: 'manualB', symbol: calcState.manualTokenBSymbol.toUpperCase(), name: calcState.manualTokenBSymbol };
        tokenA = { ...tokenAInfo, current_price: P };
        tokenB = { ...tokenBInfo, current_price: 1 };
    } else {
        tokenA = calcState.marketData[calcState.tokenAId];
        tokenB = calcState.marketData[calcState.tokenBId];
        tokenAInfo = state.allCoins.find(c => c.id === calcState.tokenAId) || TOKEN_INFO_CACHE[calcState.tokenAId];
        tokenBInfo = state.allCoins.find(c => c.id === calcState.tokenBId) || TOKEN_INFO_CACHE[calcState.tokenBId];

        if (!tokenA || !tokenB || !tokenAInfo || !tokenBInfo || !calcState.investment || !calcState.minPrice || !calcState.maxPrice || tokenB.current_price === 0) return { status: 'waiting' };
        P = tokenA.current_price / tokenB.current_price;
    }
    
    const Pa = parseFloat(calcState.minPrice);
    const Pb = parseFloat(calcState.maxPrice);
    const inv = parseFloat(calcState.investment);

    if (isNaN(Pa) || isNaN(Pb) || isNaN(inv) || Pa >= Pb || inv <= 0) return { status: 'error', message: translations[state.lang].errorInvalidInput };

    const sqrtP = Math.sqrt(P);
    const sqrtPa = Math.sqrt(Pa);
    const sqrtPb = Math.sqrt(Pb);
    let amountA, amountB, L;
    const priceA = tokenA.current_price;
    const priceB = tokenB.current_price;

    if (P <= Pa) {
        amountA = inv / priceA;
        amountB = 0;
        L = amountA * priceA / ( (1 / sqrtPa - 1 / sqrtPb) * priceA);
    } else if (P >= Pb) {
        amountA = 0;
        amountB = inv / priceB;
        L = amountB * priceB / ((sqrtPb - sqrtPa) * priceB);
    } else {
        const deltaL = inv / ((sqrtP - sqrtPa) * priceB + (1 / sqrtP - 1 / sqrtPb) * priceA);
        amountA = deltaL * (1 / sqrtP - 1 / sqrtPb);
        amountB = deltaL * (sqrtP - sqrtPa);
        L = deltaL;
    }
    if (!isFinite(L)) L = 0;

    const valueA = amountA * priceA;
    const valueB = amountB * priceB;
    const amountAAtMin = L * (1/sqrtPa - 1/sqrtPb);
    const valueAtMin = amountAAtMin * Pa * priceB;
    const amountBAtMax = L * (sqrtPb - sqrtPa);
    const valueAtMax = amountBAtMax * priceB;
    const dailyAPR = parseFloat(calcState.feeAPR) / 100 / 365;
    const dailyFee = inv * dailyAPR;
    const totalFee = dailyFee * (parseFloat(calcState.poolDuration) || 0);
    let comparison = null;
    const finalPrice = parseFloat(calcState.exitPrice);

    if (!isNaN(finalPrice) && L > 0) {
        const hodlValue = (amountA * finalPrice * priceB) + (amountB * priceB);
        let lpValueRaw;
        if (finalPrice <= Pa) {
            lpValueRaw = (L * (1 / sqrtPa - 1 / sqrtPb)) * finalPrice * priceB;
        } else if (finalPrice >= Pb) {
            lpValueRaw = (L * (sqrtPb - sqrtPa)) * priceB;
        } else {
            const sqrtFinalP = Math.sqrt(finalPrice);
            const finalAmountA = L * (1 / sqrtFinalP - 1 / sqrtPb);
            const finalAmountB = L * (sqrtFinalP - sqrtPa);
            lpValueRaw = (finalAmountA * finalPrice * priceB) + (finalAmountB * priceB);
        }
        const lpValueWithFees = lpValueRaw + totalFee;
        const netResult = lpValueWithFees - hodlValue;
        const netPercent = hodlValue > 0 ? (netResult / hodlValue) * 100 : 0;
        const impermanentLossValue = Math.max(0, hodlValue - lpValueRaw);
        const breakEvenDays = (dailyFee > 0 && impermanentLossValue > 0) ? impermanentLossValue / dailyFee : 0;
        comparison = { hodlValue, lpValueWithFees, netResult, netPercent, breakEvenDays, impermanentLossValue };
    }
    
    return { status: 'success', data: { P, Pa, Pb, L, amountA, valueA, amountB, valueB, valueAtMin, lossAtMin: valueAtMin - inv, valueAtMax, lossAtMax: valueAtMax - inv, dailyFee, totalFee, comparison, tokenA: tokenAInfo, tokenB: tokenBInfo } };
}

function createResultCard(titleKey, children) {
    const title = translations[state.lang][titleKey];
    return `<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 md:p-6 interactive-card">
            <h3 class="text-lg font-bold text-cyan-400 mb-4">${title}</h3>
            <div class="space-y-3">${children}</div>
        </div>`;
}

function createResultRow(label, value, valueClass = 'text-white') {
    return `<div class="flex justify-between items-center text-sm">
            <span class="text-slate-300">${label}</span>
            <span class="font-mono font-semibold ${valueClass}">${value}</span>
        </div>`;
}

function renderStaticAnalysisCard(resultsData) {
    const t = translations[state.lang];
    const { data } = resultsData;
    if (!data.comparison) return '';

    const tips = [];
    const { comparison, P, Pa, Pb } = data;

    // Tip 1: Performance vs HODL
    if (comparison.netPercent > 0.01) {
        tips.push({
            type: 'success',
            text: (t.analysisTipPerfGood || '').replace('{percent}', comparison.netPercent.toFixed(2))
        });
    } else if (comparison.netPercent < -0.01) {
        tips.push({
            type: 'warning',
            text: (t.analysisTipPerfBad || '').replace('{percent}', Math.abs(comparison.netPercent).toFixed(2))
        });
    }

    // Tip 2: Breakeven analysis
    if (comparison.netResult > 0) {
        tips.push({
            type: 'success',
            text: t.analysisTipBreakevenGood
        });
    } else if (comparison.breakEvenDays > 0 && comparison.breakEvenDays < 365) {
        tips.push({
            type: 'info',
            text: (t.analysisTipBreakevenInfo || '').replace('{days}', Math.ceil(comparison.breakEvenDays))
        });
    } else if (comparison.netResult < 0 && (comparison.breakEvenDays === 0 || comparison.breakEvenDays >= 365)) {
        tips.push({
            type: 'warning',
            text: t.analysisTipBreakevenBad
        });
    }

    // Tip 3: Range analysis
    if (P < Pa || P > Pb) {
        tips.push({ type: 'warning', text: t.analysisTipOutOfRange });
    } else {
        const rangeWidthPercent = (Pb - Pa) / P * 100;
        if (rangeWidthPercent < 20) {
            tips.push({ type: 'warning', text: t.analysisTipNarrow });
        } else if (rangeWidthPercent > 100) {
            tips.push({ type: 'info', text: t.analysisTipWide });
        }
    }
    
    if (tips.length === 0) return '';

    const tipsHtml = tips.map(tip => {
        let iconHtml = '';
        if (tip.type === 'success') {
            iconHtml = createCheckIcon('h-5 w-5 text-green-400 flex-shrink-0');
        } else if (tip.type === 'warning' || tip.type === 'info') {
            iconHtml = createWarningIcon('h-5 w-5 text-amber-400 flex-shrink-0');
        }
        return `<div class="flex items-start gap-3">
                    ${iconHtml}
                    <span class="text-slate-300 text-sm">${tip.text}</span>
                </div>`;
    }).join('');

    return createResultCard('optiTitle', tipsHtml);
}

function updateResults() {
    const result = calculateResults();
    let content = '';
    
    calcElements.resultsColumn.innerHTML = '';

    if (result.status === 'waiting') {
        content = `<div class="h-full bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col justify-center items-center text-center interactive-card">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-slate-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 class="text-xl font-bold text-slate-300" data-i18n-key="waitingTitle">Waiting for input...</h3>
                <p class="text-slate-400 mt-2" data-i18n-key="waitingDescription">Please fill in all fields on the left to see the results</p>
            </div>`;
        calcElements.resultsColumn.innerHTML = content;
    } else if (result.status === 'error') {
        content = `<div class="h-full bg-slate-800/60 border border-red-500/50 rounded-xl p-6 flex flex-col justify-center items-center text-center interactive-card">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <h3 class="text-xl font-bold text-red-400" data-i18n-key="errorTitle">An Error Occurred</h3>
                <p class="text-slate-400 mt-2">${result.message}</p>
            </div>`;
        calcElements.resultsColumn.innerHTML = content;
    } else {
        const { data } = result;
        const t = translations[state.lang];
        const { tokenA, tokenB, comparison } = data;
        const isManual = state.calculator.manualMode;
        const manualSymbol = state.calculator.manualTokenBSymbol;
        const fv = (val, dig=2) => utils.formatValue(val, dig, isManual, manualSymbol);

        const amountALabel = (t.resAmountA || '').replace('{token}', tokenA.symbol.toUpperCase());
        const amountBLabel = (t.resAmountB || '').replace('{token}', tokenB.symbol.toUpperCase());

        const allocationContent = `
            ${createResultRow(amountALabel, `${isFinite(data.amountA) ? utils.formatNumber(data.amountA) : '0.00'} (${isFinite(data.valueA) ? fv(data.valueA) : 'N/A'})`)}
            ${createResultRow(amountBLabel, `${isFinite(data.amountB) ? utils.formatNumber(data.amountB) : '0.00'} (${isFinite(data.valueB) ? fv(data.valueB) : 'N/A'})`)}
            <hr class="border-slate-600"/>
            ${createResultRow(t.resTotalValue, fv(data.valueA + data.valueB), 'text-xl text-cyan-400')}`;
        content += createResultCard('resTitleAllocation', allocationContent);

        const valueAtMaxLabel = (t.resValueAtMax || '').replace('{price}', utils.formatNumber(data.Pb));
        const valueAtMinLabel = (t.resValueAtMin || '').replace('{price}', utils.formatNumber(data.Pa));

        const riskContent = `
            ${createResultRow(valueAtMaxLabel, isFinite(data.valueAtMax) ? fv(data.valueAtMax) : 'N/A')}
            ${createResultRow(t.resGainLossAtMax, isFinite(data.lossAtMax) ? fv(data.lossAtMax) : 'N/A', data.lossAtMax >= 0 ? 'text-green-400' : 'text-red-400')}
            <hr class="border-slate-600/50"/>
            ${createResultRow(valueAtMinLabel, isFinite(data.valueAtMin) ? fv(data.valueAtMin) : 'N/A')}
            ${createResultRow(t.resGainLossAtMin, isFinite(data.lossAtMin) ? fv(data.lossAtMin) : 'N/A', data.lossAtMin >= 0 ? 'text-green-400' : 'text-red-400')}`;
        content += createResultCard('resTitleRisk', riskContent);
        
        const feesTotalLabel = (t.resFeesTotal || '').replace('{days}', state.calculator.poolDuration);
        const feeContent = `
            ${createResultRow(t.resFeesPerDay, fv(data.dailyFee), 'text-green-400')}
            ${createResultRow(feesTotalLabel, fv(data.totalFee), 'text-green-400')}`;
        content += createResultCard('resTitleFees', feeContent);

        if (comparison) {
            const poolDuration = parseFloat(state.calculator.poolDuration);
            let breakEvenText;
            if (comparison.impermanentLossValue <= 0) {
                breakEvenText = t.resBreakevenInstant;
            } else if (comparison.breakEvenDays > 0 && comparison.breakEvenDays <= poolDuration) {
                breakEvenText = t.resBreakevenAchieved;
            } else if (isFinite(comparison.breakEvenDays) && comparison.breakEvenDays > 0) {
                breakEvenText = `${Math.ceil(comparison.breakEvenDays)} ${t.daysUnit}`;
            } else {
                breakEvenText = 'N/A'; // e.g. IL exists but daily fee is 0
            }

            const exitPriceInfoText = (t.resExitPriceInfo || '')
                .replace('{price}', utils.formatNumber(parseFloat(state.calculator.exitPrice)))
                .replace('{token}', tokenB.symbol.toUpperCase());
                
            const finalResultContent = `
                <p class="text-xs text-center text-slate-400 mb-3 -mt-2">
                    ${exitPriceInfoText}
                </p>
                ${createResultRow(t.resHodlValue, fv(comparison.hodlValue))}
                ${createResultRow(t.resLpValue, fv(comparison.lpValueWithFees))}
                ${createResultRow(t.resBreakeven, breakEvenText, 'text-cyan-300')}
                <hr class="border-slate-600"/>
                ${createResultRow(t.resNetDifference, fv(comparison.netResult), comparison.netResult >= 0 ? 'text-green-400 text-lg' : 'text-red-400 text-lg')}
                ${createResultRow(t.resNetPercent, `${comparison.netResult >= 0 ? '+' : ''}${comparison.netPercent.toFixed(2)}%`, comparison.netResult >= 0 ? 'text-green-400 text-lg' : 'text-red-400 text-lg')}`;
            content += createResultCard('resTitleFinal', finalResultContent);
        }
        
        content += renderStaticAnalysisCard(result);

        const exportButtons = `
            <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 flex flex-col sm:flex-row gap-4 interactive-card">
                 <button id="export-excel-btn" class="flex-1 bg-green-700 text-white font-bold py-2 px-4 rounded-md hover:bg-green-600 transition-colors" data-i18n-key="exportExcelBtn"></button>
                 <button id="export-pdf-btn" class="flex-1 bg-red-700 text-white font-bold py-2 px-4 rounded-md hover:bg-red-600 transition-colors" data-i18n-key="exportPdfBtn"></button>
            </div>
        `;
        content += exportButtons;

        calcElements.resultsColumn.innerHTML = content;
    }
    utils.translateUI(state.lang);
}

// --- PERSISTENCE ---
const saveCalculatorStateToStorage = () => {
    try {
        const stateToSave = {
            tokenAId: state.calculator.tokenAId, tokenBId: state.calculator.tokenBId,
            investment: state.calculator.investment, minPrice: state.calculator.minPrice,
            maxPrice: state.calculator.maxPrice, feeAPR: state.calculator.feeAPR,
            poolDuration: state.calculator.poolDuration, exitPrice: state.calculator.exitPrice,
            manualMode: state.calculator.manualMode, manualTokenASymbol: state.calculator.manualTokenASymbol,
            manualTokenBSymbol: state.calculator.manualTokenBSymbol, manualPrice: state.calculator.manualPrice
        };
        localStorage.setItem(LP_CALC_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) { console.error("Failed to save calculator state:", e); }
};

const loadCalculatorStateFromStorage = () => {
    try {
        const storedState = localStorage.getItem(LP_CALC_STATE_KEY);
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            Object.assign(state.calculator, parsedState);
            calcElements.investmentInput.value = state.calculator.investment;
            calcElements.minPriceInput.value = state.calculator.minPrice;
            calcElements.maxPriceInput.value = state.calculator.maxPrice;
            calcElements.feeAprInput.value = state.calculator.feeAPR;
            calcElements.poolDurationInput.value = state.calculator.poolDuration;
            calcElements.exitPriceInput.value = state.calculator.exitPrice;
        }
    } catch (e) { console.error("Failed to load calculator state:", e); }
};

// --- EVENT HANDLERS & DATA FETCHING ---

function handleExportCSV() {
    const result = calculateResults();
    if (result.status !== 'success') return;
    const { data } = result;
    const { tokenA, tokenB, comparison } = data;
    const t = translations[state.lang];
    
    const to2dp = (val) => (typeof val === 'number' ? val.toFixed(2) : val);

    const rows = [
        ["Parameter", "Value"],
        [t.tokenALabel, tokenA.symbol.toUpperCase()],
        [t.tokenBLabel, tokenB.symbol.toUpperCase()],
        [`${t.currentPriceLabel} (1 ${tokenA.symbol.toUpperCase()} = ? ${tokenB.symbol.toUpperCase()})`, to2dp(data.P)],
        ["", ""],
        ["Inputs", ""],
        [t.investmentLabel, to2dp(parseFloat(state.calculator.investment))],
        [t.minPriceLabel, to2dp(parseFloat(state.calculator.minPrice))],
        [t.maxPriceLabel, to2dp(parseFloat(state.calculator.maxPrice))],
        [t.aprLabel, state.calculator.feeAPR],
        [t.durationLabel, state.calculator.poolDuration],
        [(t.exitPriceLabel || '').replace('{token}', tokenA.symbol.toUpperCase()), to2dp(parseFloat(state.calculator.exitPrice))],
        ["", ""],
        ["Results", ""],
        [(t.resAmountA || '').replace('{token}', tokenA.symbol.toUpperCase()), to2dp(data.amountA)],
        [(t.resAmountB || '').replace('{token}', tokenB.symbol.toUpperCase()), to2dp(data.amountB)],
        [t.resTotalValue, to2dp(data.valueA + data.valueB)],
        [(t.resFeesTotal || '').replace('{days}', state.calculator.poolDuration), to2dp(data.totalFee)],
        ["", ""],
        ["Comparison", ""],
        [t.resHodlValue, to2dp(comparison?.hodlValue) || 'N/A'],
        [t.resLpValue, to2dp(comparison?.lpValueWithFees) || 'N/A'],
        [t.resNetDifference, to2dp(comparison?.netResult) || 'N/A'],
        [t.resNetPercent, comparison ? `${to2dp(comparison.netPercent)}%` : 'N/A'],
    ];

    let csvContent = "data:text/csv;charset=utf-8," 
        + rows.map(e => e.join(",")).join("\n");
        
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `lp_analysis_${tokenA.symbol.toUpperCase()}-${tokenB.symbol.toUpperCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleExportPDF() {
    const result = calculateResults();
    if (result.status !== 'success') return;
    const { data } = result;
    const t = translations[state.lang];
    const isManual = state.calculator.manualMode;
    const manualSymbol = state.calculator.manualTokenBSymbol;
    
    // Formatters for 2 decimal places
    const fv = (val, dig = 2) => utils.formatValue(val, dig, isManual, manualSymbol);
    const fn2dp = (val) => (typeof val === 'number' ? val.toFixed(2) : String(val));
    const fp = (val, dig=2) => utils.formatPercent(val, dig);

    const doc = new jsPDF();

    // --- Common Styles ---
    const tableStyles = {
        styles: { fontSize: 9.5, cellPadding: { top: 1.5, right: 2, bottom: 1.5, left: 2 }, halign: 'center' },
        headStyles: { fillColor: [44, 122, 123], fontStyle: 'bold', halign: 'center' },
        footStyles: { fillColor: [230, 230, 230], textColor: [40, 40, 40], fontStyle: 'bold', halign: 'center' },
        bodyStyles: { halign: 'center' },
    };

    // --- Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(44, 122, 123);
    doc.text(t.pdfReportTitle, doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text(`${t.pdfReportDate}: ${new Date().toLocaleDateString(state.lang)}`, doc.internal.pageSize.getWidth() / 2, 26, { align: 'center' });
    let finalY = 35;

    // --- Section 1 & 2 (Side-by-side) ---
    const overviewBody = [
        [t.pdfPair, `${data.tokenA.symbol.toUpperCase()}/${data.tokenB.symbol.toUpperCase()}`],
        [t.pdfInvestment, fv(data.valueA + data.valueB)],
    ];
    const configBody = [
        [t.pdfCurrentPrice, `${fn2dp(data.P)} ${data.tokenB.symbol.toUpperCase()}`],
        [t.pdfMinPrice, `${fn2dp(data.Pa)} ${data.tokenB.symbol.toUpperCase()}`],
        [t.pdfMaxPrice, `${fn2dp(data.Pb)} ${data.tokenB.symbol.toUpperCase()}`],
        [t.pdfFeeApr, fp(parseFloat(state.calculator.feeAPR))],
        [t.pdfDuration, state.calculator.poolDuration],
    ];

    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(t.pdfSectionOverview, 14, finalY);
    doc.text(t.pdfSectionConfig, 108, finalY);
    finalY += 2;
    doc.setLineWidth(0.2);
    doc.line(14, finalY, 98, finalY);
    doc.line(108, finalY, 192, finalY);
    finalY += 5;
    
    autoTable(doc, {
        startY: finalY,
        body: overviewBody,
        theme: 'plain',
        ...tableStyles,
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 14, right: 110 }
    });
    
    autoTable(doc, {
        startY: finalY,
        body: configBody,
        theme: 'plain',
        ...tableStyles,
        columnStyles: { 0: { fontStyle: 'bold' } },
        margin: { left: 108, right: 14 }
    });
    finalY = doc.lastAutoTable.finalY + 10;
    
    // --- Section 3: Allocation ---
    doc.setFontSize(12);
    doc.text(t.pdfSectionAllocation, 14, finalY);
    finalY += 2;
    doc.line(14, finalY, doc.internal.pageSize.getWidth() - 14, finalY);
    finalY += 5;

    autoTable(doc, {
        startY: finalY,
        head: [[t.pdfAsset, t.pdfAmount, t.pdfValue]],
        body: [
            [data.tokenA.symbol.toUpperCase(), fn2dp(data.amountA), fv(data.valueA)],
            [data.tokenB.symbol.toUpperCase(), fn2dp(data.amountB), fv(data.valueB)],
        ],
        foot: [[t.resTotalValue, '', fv(data.valueA + data.valueB)]],
        theme: 'striped',
        ...tableStyles,
    });
    finalY = doc.lastAutoTable.finalY + 10;
    
    // --- Section 4: Forecast ---
    if (data.comparison) {
        doc.setFontSize(12);
        doc.text(t.pdfSectionForecast, 14, finalY);
        finalY += 2;
        doc.line(14, finalY, doc.internal.pageSize.getWidth() - 14, finalY);
        finalY += 5;
        
        doc.setFontSize(10);
        doc.setTextColor(80, 80, 80);
        doc.text(`${t.pdfExitPrice}: ${fn2dp(parseFloat(state.calculator.exitPrice))} ${data.tokenB.symbol.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, finalY, { align: 'center' });
        finalY += 6;

        const netReturnHodl = data.comparison.hodlValue > 0 ? ((data.comparison.hodlValue - (data.valueA + data.valueB)) / (data.valueA + data.valueB)) * 100 : 0;
        const netReturnLp = data.comparison.lpValueWithFees > 0 ? ((data.comparison.lpValueWithFees - (data.valueA + data.valueB)) / (data.valueA + data.valueB)) * 100 : 0;
        
        autoTable(doc, {
            startY: finalY,
            head: [[t.pdfMetric, t.pdfHodlStrategy, t.pdfLpStrategy]],
            body: [
                [t.pdfFinalValue, fv(data.comparison.hodlValue), fv(data.comparison.lpValueWithFees)],
                [t.pdfNetReturn, fp(netReturnHodl, 2), fp(netReturnLp, 2)],
                [
                    { content: t.resNetDifference, styles: { fontStyle: 'bold' } },
                    { content: `${fv(data.comparison.netResult)} (${fp(data.comparison.netPercent, 2)})`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold'} }
                ]
            ],
            theme: 'striped',
            ...tableStyles,
            columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
            didDrawCell: (hookData) => {
                // Color the 'Net Difference' row
                if (hookData.section === 'body' && hookData.row.index === 2) {
                     const value = data.comparison.netResult;
                     if (value >= 0) doc.setTextColor(28, 100, 28); // Green
                     else if (value < 0) doc.setTextColor(190, 40, 40); // Red
                }
            }
        });
        finalY = doc.lastAutoTable.finalY + 10;
    }
    
    // --- Section 5: Risk ---
    doc.setFontSize(12);
    doc.text(t.pdfSectionRisk, 14, finalY);
    finalY += 2;
    doc.line(14, finalY, doc.internal.pageSize.getWidth() - 14, finalY);
    finalY += 5;

    autoTable(doc, {
        startY: finalY,
        head: [[t.pdfScenario, t.pdfPositionValue, t.pdfGainLoss]],
        body: [
            [t.pdfPriceHitsMax, fv(data.valueAtMax), fv(data.lossAtMax)],
            [t.pdfPriceHitsMin, fv(data.valueAtMin), fv(data.lossAtMin)],
        ],
        theme: 'grid',
        ...tableStyles,
        headStyles: { fillColor: [100, 116, 139], halign: 'center' },
        didDrawCell: (hookData) => {
            if (hookData.column.index === 2 && hookData.section === 'body') {
                const value = hookData.row.index === 0 ? data.lossAtMax : data.lossAtMin;
                 if (value >= 0) doc.setTextColor(28, 100, 28); // Green
                 else if (value < 0) doc.setTextColor(190, 40, 40); // Red
            }
        }
    });

    // --- Footer ---
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(t.pdfDisclaimer, doc.internal.pageSize.getWidth() / 2, pageHeight - 10, { align: 'center' });
    
    doc.save(`LP_Analysis_${data.tokenA.symbol.toUpperCase()}-${data.tokenB.symbol.toUpperCase()}.pdf`);
}


async function handleTokenChange() {
    await loadMarketData(true);
    renderCalculator();
}

async function handleSwap() {
    if(state.calculator.manualMode) {
        [state.calculator.manualTokenASymbol, state.calculator.manualTokenBSymbol] = [state.calculator.manualTokenBSymbol, state.calculator.manualTokenASymbol];
        const price = parseFloat(state.calculator.manualPrice);
        if (price > 0) state.calculator.manualPrice = (1/price).toPrecision(6);
    } else {
        [state.calculator.tokenAId, state.calculator.tokenBId] = [state.calculator.tokenBId, state.calculator.tokenAId];
        await handleTokenChange();
    }
    renderCalculator();
    saveCalculatorStateToStorage();
}

function handleCalculatorInputChange() {
    const calc = state.calculator;
    calc.investment = calcElements.investmentInput.value;
    calc.minPrice = calcElements.minPriceInput.value;
    calc.maxPrice = calcElements.maxPriceInput.value;
    calc.feeAPR = calcElements.feeAprInput.value;
    calc.poolDuration = calcElements.poolDurationInput.value;
    calc.exitPrice = calcElements.exitPriceInput.value;

    if(calc.manualMode) {
        calc.manualTokenASymbol = document.getElementById('manual-token-a-symbol').value;
        calc.manualTokenBSymbol = document.getElementById('manual-token-b-symbol').value;
        calc.manualPrice = document.getElementById('manual-price').value;
    }
    renderCalculator();
    saveCalculatorStateToStorage();
}

async function loadMarketData(setDefaults = false) {
    const calc = state.calculator;
    if (calc.manualMode) return;
    const coinIds = [calc.tokenAId, calc.tokenBId].filter(Boolean);
    if (coinIds.length < 2) {
        calc.marketData = {};
        renderCalculator();
        return;
    };
    calc.isLoadingPrices = true;
    calc.error = null;
    renderCalculator();
    try {
      const priceData = await fetchMarketData(coinIds);
      const dataMap = {};
      coinIds.forEach(id => {
          if (!state.allCoins.find(c => c.id === id) && TOKEN_INFO_CACHE[id]) {
              state.allCoins.unshift(TOKEN_INFO_CACHE[id]);
          }
          const coinInfo = state.allCoins.find(c => c.id === id) || TOKEN_INFO_CACHE[id];
          if (coinInfo && priceData[id] !== undefined) {
              dataMap[id] = { ...coinInfo, current_price: priceData[id] || 0 };
          }
      });
      calc.marketData = dataMap;
      const tokenA = dataMap[calc.tokenAId];
      const tokenB = dataMap[calc.tokenBId];

      if (tokenA && tokenB && tokenB.current_price > 0) {
        const currentPrice = tokenA.current_price / tokenB.current_price;
        const precision = currentPrice > 10 ? 2 : currentPrice > 0.1 ? 4 : 6;
        
        if (setDefaults) {
          const p30 = currentPrice * 0.30;
          calc.minPrice = (currentPrice - p30).toFixed(precision);
          calc.maxPrice = (currentPrice + p30).toFixed(precision);
          calc.exitPrice = currentPrice.toFixed(precision);
          // Directly update element values for immediate reflection
          calcElements.minPriceInput.value = calc.minPrice;
          calcElements.maxPriceInput.value = calc.maxPrice;
          calcElements.exitPriceInput.value = calc.exitPrice;
        } else if (!calcElements.exitPriceInput.value) {
            calcElements.exitPriceInput.value = currentPrice.toFixed(precision);
            calc.exitPrice = calcElements.exitPriceInput.value;
        }
      }
    } catch (e) {
      calc.error = 'priceData';
      calc.marketData = {};
      console.error(e);
    } finally {
        calc.isLoadingPrices = false;
        renderCalculator();
    }
}

// --- Guide Modal ---
function getCalculatorGuideContent() {
    const t = translations[state.lang];
    const listItem = (num, title, content) => `
        <li>
            <span class="rule-number">${num}</span>
            <div class="rule-text">
                <strong class="text-cyan-400">${title}</strong>
                <p class="mt-1 text-slate-400">${content}</p>
            </div>
        </li>`;
    
    const disclaimerHTML = `
        <div class="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <h4 class="font-bold text-red-400 flex items-center gap-2">
                ${createWarningIcon('h-5 w-5')}
                <span>${t.guideCalcDisclaimerTitle}</span>
            </h4>
            <p class="mt-2 text-slate-400 text-sm">${t.guideCalcDisclaimerContent}</p>
        </div>`;

    return `
        <p class="mb-4">${t.calculatorGuideIntro}</p>
        
        <h4 class="font-bold text-amber-400 mb-2 mt-4">A Step-by-Step Walkthrough</h4>
        <ol class="rules-list">
            ${listItem(1, t.guideCalcStep1Title, t.guideCalcStep1Content)}
            ${listItem(2, t.guideCalcStep2Title, t.guideCalcStep2Content)}
            ${listItem(3, t.guideCalcStep3Title, t.guideCalcStep3Content)}
        </ol>

        <h4 class="font-bold text-amber-400 mb-2 mt-4">Example Scenario</h4>
        <div class="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
            <p>Let's say we want to provide liquidity for an <strong>ETH/USDC</strong> pair.</p>
            <ul class="list-disc list-inside text-slate-300">
                <li><strong>Investment:</strong> $1,000</li>
                <li><strong>Current ETH Price:</strong> $3,500</li>
                <li><strong>Your Price Range:</strong> $3,000 to $4,000</li>
                <li><strong>Forecast:</strong> 25% Fee APR, 14-day duration, and you predict ETH will be $3,800 when you exit.</li>
            </ul>
            <p class="text-slate-400 text-sm pt-2">After inputting this, the 'Final Result' card will compare the total value of your LP position against what you would have had by just holding the initial assets. This helps you see if providing liquidity was the better strategy for your specific forecast.</p>
        </div>

        <h4 class="font-bold text-amber-400 mb-2 mt-4">${t.guideCalcResultsTitle}</h4>
        <div class="mt-3 p-4 bg-slate-900/50 rounded-lg">
            <ul class="list-disc list-inside space-y-2 text-slate-400">
                <li>${t.guideCalcResultsAllocation}</li>
                <li>${t.guideCalcResultsRisk}</li>
                <li>${t.guideCalcResultsFees}</li>
                <li>${t.guideCalcResultsFinal}</li>
                <li>${t.guideCalcResultsAnalysis}</li>
            </ul>
        </div>

        ${disclaimerHTML}
    `;
}

function showCalculatorGuide() {
    const content = getCalculatorGuideContent();
    utils.openGuideModal('calculatorGuideTitle', content);
}


// --- EXPORT MODULE ---
export const calculatorApp = {
    initialState,
    initialize: initializeCalculator,
    render: renderCalculator
};
