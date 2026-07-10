import { translations } from '../i18n/translations.js';
import { createInfoIcon } from '../components/icons.js';

const getInitialState = () => ({
    initialized: false,
    assetName: 'sUSDe',
    maturityDate: '2025-09-25',
    assetPrice: '1.00',
    impliedApy: '15.0',

    inputsDisabled: false,
    marketSubmitted: false,
    analysisSubmitted: false,

    investmentUSDC: '1000',
    
    futureUnderlyingApy: '12.0',
    futureImpliedApy: '18.0',
    saleDate: '',

    // Calculated values
    timeToMaturity: 0,
    ptPrice: 0,
    ytPrice: 0,
    ptExchangeRate: 0,
    
    // Results
    results: null
});


let state, elements, utils;
const ptElements = {};

// --- UTILITY ---
const formatPtNumber = (value, type = 'number') => {
    const num = parseFloat(value);
    if (isNaN(num)) return type === 'currency' ? '$--' : (type === 'percent' ? '--%' : '--');
    
    const formatted = num.toFixed(2);

    switch(type) {
        case 'currency':
            return (num < 0 ? '-$' : '$') + Math.abs(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        case 'percent':
            return `${formatted}%`;
        case 'number':
        default:
            return parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
};


function initializePtCalculator(context) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.ptCalculator.initialized) return;

    Object.assign(ptElements, {
        mainContainer: document.getElementById('pt-calculator-main'),
    });
    
    // Delegated event listeners
    ptElements.mainContainer.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        if (target.id === 'pt-market-submit-btn') handleMarketSubmit();
        else if (target.id === 'pt-reset-btn') handleReset();
        else if (target.id === 'pt-analysis-btn') handleAnalysis();
        else if (target.id === 'pt-reset-analysis-btn') handleResetAnalysis();
        else if (target.id === 'pt-guide-btn') showPtGuide();
    });
    
    const handleValueChange = (input) => {
        const key = input.id;

        if (state.ptCalculator.hasOwnProperty(key)) {
            state.ptCalculator[key] = input.value;
            // If user changes a forecast input after analyzing, reset the analysis state
            if (state.ptCalculator.analysisSubmitted && ['investmentUSDC', 'futureUnderlyingApy', 'saleDate', 'futureImpliedApy'].includes(key)) {
                handleResetAnalysis();
            }
        }
    };
    
    ptElements.mainContainer.addEventListener('input', (e) => {
        if (e.target.tagName === 'INPUT' && e.target.type !== 'date') {
            handleValueChange(e.target);
        }
    });

    ptElements.mainContainer.addEventListener('change', (e) => {
        if (e.target.type === 'date') {
            const wasAnalysisSubmitted = state.ptCalculator.analysisSubmitted;
            handleValueChange(e.target);
    
            // If analysis was NOT submitted before the change, we need to manually re-render
            // to update calculated values like "days held".
            // If it WAS submitted, handleValueChange would have already triggered a re-render
            // via handleResetAnalysis(), so we don't need to do it again.
            if (!wasAnalysisSubmitted && state.ptCalculator.marketSubmitted) {
                renderPtCalculator();
            }
        }
    });
    
    state.ptCalculator = getInitialState();
    const today = new Date();
    today.setDate(today.getDate() + 30); // Default sale date 30 days from now
    state.ptCalculator.saleDate = today.toISOString().split('T')[0];

    renderPtCalculator();
    state.ptCalculator.initialized = true;
}

function renderDateInput(id, value, disabled, minDate = null, maxDate = null) {
    const minAttr = minDate ? `min="${minDate}"` : '';
    const maxAttr = maxDate ? `max="${maxDate}"` : '';
    const disabledClass = disabled ? 'bg-slate-800/50 cursor-not-allowed' : 'bg-slate-700';
    
    return `
        <input 
            type="date" 
            id="${id}" 
            value="${value}" 
            ${minAttr} 
            ${maxAttr} 
            class="custom-date-input w-full border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}"
            ${disabled ? 'disabled' : ''}
        >
    `;
}


function renderInputForm() {
    const t = translations[state.lang];
    const calcState = state.ptCalculator;
    const isDisabled = calcState.inputsDisabled;

    const disabledClass = isDisabled ? 'bg-slate-800/50 cursor-not-allowed' : 'bg-slate-700';
    
    return `
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-5">
             <div class="flex justify-between items-center -mt-1 mb-2">
                <h3 class="text-xl font-bold text-slate-300" data-i18n-key="ptMarketDataTitle"></h3>
                 <button id="pt-guide-btn" class="p-2 -mr-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-i18n-key="guideButton" aria-label="Open Guide">
                    ${createInfoIcon('h-6 w-6')}
                </button>
            </div>
             <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                    <label for="assetName" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptMarketAssetLabel"></label>
                    <input type="text" id="assetName" value="${calcState.assetName}" placeholder="${t.ptMarketAssetPlaceholder}" class="w-full border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}" ${isDisabled ? 'disabled' : ''}>
                </div>
                <div>
                     <label for="assetPrice" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptAssetPriceLabel"></label>
                     <div class="custom-number-input">
                        <div class="relative flex-grow">
                            <input type="number" id="assetPrice" data-step="0.01" value="${calcState.assetPrice}" class="w-full border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}" ${isDisabled ? 'disabled' : ''}>
                            <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">USDC</span>
                        </div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                    <label for="maturityDate" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptMaturityDateLabel"></label>
                    ${renderDateInput('maturityDate', calcState.maturityDate, isDisabled)}
                </div>
                 <div>
                    <label for="impliedApy" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptImpliedApyLabel"></label>
                     <div class="custom-number-input">
                        <div class="relative flex-grow">
                            <input type="number" id="impliedApy" data-step="0.1" value="${calcState.impliedApy}" class="w-full border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}" ${isDisabled ? 'disabled' : ''}>
                            <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">%</span>
                        </div>
                    </div>
                </div>
            </div>
            ${!isDisabled ? `
             <button id="pt-market-submit-btn" class="w-full bg-green-500 text-white font-bold py-3 px-5 rounded-md hover:bg-green-400 transition-colors flex items-center justify-center gap-2 text-lg">
                <span data-i18n-key="ptSubmitBtn">${t.ptSubmitBtn}</span>
            </button>` : `
            <button id="pt-reset-btn" class="w-full bg-slate-600 text-white font-bold py-3 px-5 rounded-md hover:bg-slate-500 transition-colors flex items-center justify-center gap-2 text-lg">
                <span data-i18n-key="ptResetBtn">${t.ptResetBtn}</span>
            </button>`
            }
        </div>
    `;
}

function renderMarketOverview() {
    const { assetName, maturityDate, ptPrice, ytPrice, ptExchangeRate } = state.ptCalculator;
    const t = translations[state.lang];

    const maturity = new Date(maturityDate + 'T00:00:00Z');
    const formattedDate = maturity.toLocaleDateString(state.lang === 'en' ? 'en-US' : 'en-GB', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = Math.max(0, maturity.getTime() - today.getTime());
    const daysLeft = Math.ceil(diffTime / (1000 * 3600 * 24));
    const daysLeftText = t.ptDaysToMaturityLabel.replace('{days}', daysLeft);

    const infoCard = (labelKey, value, valueColorClass = 'text-white') => `
        <div class="bg-slate-900/50 rounded-lg p-4 text-center flex flex-col justify-center h-full">
            <p class="text-sm font-semibold text-slate-400" data-i18n-key="${labelKey}"></p>
            <p class="font-mono text-xl font-bold ${valueColorClass}">${value}</p>
        </div>
    `;

    const assetInfoCard = `
        <div class="bg-slate-900/50 rounded-lg p-4 text-center flex flex-col justify-center h-full">
            <h4 class="text-2xl font-bold text-white">${assetName}</h4>
            <div class="text-center mt-1">
                <p class="font-mono text-sm font-semibold text-slate-300">${formattedDate}</p>
                <p class="text-xs text-slate-400">${daysLeftText}</p>
            </div>
        </div>
    `;

    return `
      <div class="mt-8 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
             ${assetInfoCard}
             ${infoCard('ptPtPrice', formatPtNumber(ptPrice, 'currency'), 'text-green-400')}
             ${infoCard('ptYtPrice', formatPtNumber(ytPrice, 'currency'), 'text-cyan-400')}
             ${infoCard('ptPtExchangeRate', `${formatPtNumber(ptExchangeRate)} PT`, 'text-white')}
        </div>
      </div>
    `;
}


function renderAnalysisInputs() {
    const t = translations[state.lang];
    const calcState = state.ptCalculator;
    const isForecastDisabled = calcState.analysisSubmitted;
    const disabledClass = isForecastDisabled ? 'bg-slate-800/50 cursor-not-allowed' : 'bg-slate-700';

    const numInvestment = parseFloat(calcState.investmentUSDC) || 0;
    const ptTokens = numInvestment > 0 && calcState.ptPrice > 0 ? numInvestment / calcState.ptPrice : 0;
    const ytTokens = numInvestment > 0 && calcState.ytPrice > 0 ? numInvestment / calcState.ytPrice : 0;
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const saleDateForInput = calcState.saleDate || today.toISOString().split('T')[0];
    
    // Create Date objects in local time midnight for consistent comparison
    const saleDate = new Date(saleDateForInput);
    // Adjust for timezone to get the correct date object for comparison
    saleDate.setMinutes(saleDate.getMinutes() + saleDate.getTimezoneOffset());
    const daysHeld = Math.round((saleDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    let analysisButtonHTML = '';
    if (isForecastDisabled) {
        analysisButtonHTML = `
            <button id="pt-reset-analysis-btn" class="w-full bg-slate-600 text-white font-bold py-3 px-5 rounded-md hover:bg-slate-500 transition-colors flex items-center justify-center gap-2 text-lg">
                <span data-i18n-key="ptResetAnalysisBtn">${t.ptResetAnalysisBtn}</span>
            </button>`;
    } else {
        analysisButtonHTML = `
            <button id="pt-analysis-btn" class="w-full bg-cyan-500 text-slate-900 font-bold py-3 px-5 rounded-md hover:bg-cyan-400 transition-colors flex items-center justify-center gap-2 text-lg">
                <span data-i18n-key="ptAnalysisBtn">${t.ptAnalysisBtn}</span>
            </button>`;
    }

    return `
        <div class="mt-8">
            <h3 class="text-xl font-bold text-slate-300 mb-4" data-i18n-key="ptForecastTitle"></h3>
            <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-6">
                <div>
                    <label for="investmentUSDC" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptInvestmentAmountLabel"></label>
                    <div class="custom-number-input">
                        <div class="relative flex-grow">
                            <input type="number" id="investmentUSDC" data-step="100" value="${calcState.investmentUSDC}" class="w-full border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}" ${isForecastDisabled ? 'disabled' : ''}>
                            <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">USDC</span>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-center">
                    <h4 class="text-md font-bold text-slate-300 mb-3" data-i18n-key="ptTokensObtained"></h4>
                     <div class="flex items-stretch justify-around gap-4">
                        <div class="flex-1">
                            <p class="text-xl font-mono font-bold text-white">${formatPtNumber(ptTokens)}</p>
                            <p class="text-sm text-green-300 font-semibold" data-i18n-key="ptPtTokens"></p>
                        </div>
                        <div class="flex flex-col justify-center border-l border-r border-slate-700 px-4">
                            <p class="text-slate-500 font-bold" data-i18n-key="orSeparator"></p>
                        </div>
                        <div class="flex-1">
                             <p class="text-xl font-mono font-bold text-white">${formatPtNumber(ytTokens)}</p>
                             <p class="text-sm text-cyan-300 font-semibold" data-i18n-key="ptYtTokens"></p>
                        </div>
                    </div>
                </div>
                
                <div class="grid md:grid-cols-3 gap-x-6 gap-y-4 pt-4 border-t border-slate-700">
                    <div>
                        <label for="futureUnderlyingApy" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptFutureUnderlyingApyLabel"></label>
                        <div class="custom-number-input">
                            <div class="relative flex-grow">
                                <input type="number" id="futureUnderlyingApy" data-step="1" value="${calcState.futureUnderlyingApy}" class="w-full border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}" ${isForecastDisabled ? 'disabled' : ''}>
                                <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label for="futureImpliedApy" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptFutureImpliedApyLabel"></label>
                        <div class="custom-number-input">
                            <div class="relative flex-grow">
                                <input type="number" id="futureImpliedApy" data-step="1" value="${calcState.futureImpliedApy}" class="w-full border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-green-500 ${disabledClass}" ${isForecastDisabled ? 'disabled' : ''}>
                                <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">%</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label for="saleDate" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="ptSaleDateLabel"></label>
                        ${renderDateInput('saleDate', saleDateForInput, isForecastDisabled, today.toISOString().split('T')[0], calcState.maturityDate)}
                        <p class="text-xs text-center text-slate-400 mt-1" data-i18n-key="ptDaysHeld" data-i18n-param-days="${daysHeld}"></p>
                    </div>
                </div>
                 ${analysisButtonHTML}
            </div>
        </div>
    `;
}

function renderResults() {
    const { results } = state.ptCalculator;
    if (!results) return '';

    const { investor, trader } = results;
    const t = translations[state.lang];

    const allProfits = [
        investor.pt.netProfit, investor.yt.netProfit, investor.hodl.netProfit,
        trader.pt.netProfit, trader.yt.netProfit, trader.hodl.netProfit
    ].filter(p => p !== undefined && isFinite(p));
    
    const bestProfit = allProfits.length > 0 ? Math.max(...allProfits) : -Infinity;

    const renderResultCell = (data, isBest) => {
        const row = (labelKey, value, colorClass) => `
            <div class="flex justify-between items-baseline gap-2">
                <span class="text-xs text-slate-400" data-i18n-key="${labelKey}"></span>
                <span class="font-mono text-sm ${colorClass}">${value}</span>
            </div>`;

        const finalRow = (labelKey, value, colorClass) => `
            <div class="flex justify-between items-baseline gap-2 pt-1">
                <span class="text-sm font-bold text-white" data-i18n-key="${labelKey}"></span>
                <span class="font-mono text-lg font-bold ${colorClass}">${value}</span>
            </div>`;

        const subRow = (labelKey, value, colorClass) => `
            <div class="flex justify-between items-baseline gap-2 -mt-1">
                <span class="text-xs text-slate-400" data-i18n-key="${labelKey}"></span>
                <span class="font-mono text-sm font-semibold ${colorClass}">${value}</span>
            </div>`;

        let rowsHTML = [];
        rowsHTML.push(row('ptCostLabel', formatPtNumber(data.cost, 'currency'), 'text-slate-300'));

        if (data.yieldEarned !== undefined) {
            const color = data.yieldEarned >= 0 ? 'text-green-400' : 'text-red-400';
            rowsHTML.push(row('ptYieldEarnedLabel', formatPtNumber(data.yieldEarned, 'currency'), color));
        }
        if (data.maturityValue !== undefined) {
             rowsHTML.push(row('ptMaturityValueLabel', formatPtNumber(data.maturityValue, 'currency'), 'text-white'));
        }
        if (data.salePrice !== undefined) {
             rowsHTML.push(row('ptSalePriceLabel', formatPtNumber(data.salePrice, 'currency'), 'text-white'));
        }

        rowsHTML.push('<hr class="border-slate-600/50 !my-1.5"/>');
        const netProfitColor = data.netProfit >= 0 ? 'text-green-400' : 'text-red-400';
        rowsHTML.push(finalRow('ptNetProfitUSD', formatPtNumber(data.netProfit, 'currency'), netProfitColor));
        rowsHTML.push(subRow('ptEffectiveApy', formatPtNumber(data.effectiveApy, 'percent'), 'text-cyan-300'));
        
        return `
            <td class="px-2 py-4 ${isBest ? 'highlight-strategy' : ''}">
                <div class="relative p-2 space-y-2">
                    ${rowsHTML.join('')}
                </div>
            </td>`;
    };
    
    const renderHeaderCell = (mainKey, subKey) => `
        <th class="text-left sticky left-0 z-10 w-[20%]">
            <div class="px-4 py-4">
                <span class="font-semibold text-white" data-i18n-key="${mainKey}"></span>
                <br>
                <span class="text-xs font-normal text-slate-400" style="font-size: 0.65rem;" data-i18n-key="${subKey}"></span>
            </div>
        </th>
    `;
    
    const tableHTML = `
        <div class="overflow-x-auto custom-scrollbar">
            <table class="clean-table w-full">
                 <thead>
                    <tr>
                        <th class="text-left sticky left-0 z-10 w-[20%]"></th>
                        <th class="text-center w-[40%]" data-i18n-key="ptScenarioInvestor"></th>
                        <th class="text-center w-[40%]" data-i18n-key="ptScenarioTrader" data-i18n-param-days="${trader.daysHeld}"></th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${renderHeaderCell('ptBuyPtLabel', 'ptBuyPtSubtext')}
                        ${renderResultCell(investor.pt, investor.pt.netProfit === bestProfit)}
                        ${renderResultCell(trader.pt, trader.pt.netProfit === bestProfit)}
                    </tr>
                    <tr>
                        ${renderHeaderCell('ptBuyYtLabel', 'ptBuyYtSubtext')}
                        ${renderResultCell(investor.yt, investor.yt.netProfit === bestProfit)}
                        ${renderResultCell(trader.yt, trader.yt.netProfit === bestProfit)}
                    </tr>
                    <tr>
                        <td class="px-4 py-4 text-left font-semibold text-white sticky left-0 z-10" data-i18n-key="ptHodlLabel"></td>
                         ${renderResultCell(investor.hodl, investor.hodl.netProfit === bestProfit)}
                         ${renderResultCell(trader.hodl, trader.hodl.netProfit === bestProfit)}
                    </tr>
                </tbody>
            </table>
        </div>
    `;

    const container = document.createElement('div');
    container.innerHTML = `
        <div class="mt-8">
            <h3 class="text-xl font-bold text-slate-300 mb-4" data-i18n-key="ptProjectionTitle"></h3>
             <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-0 md:p-2">
                 ${tableHTML}
             </div>
        </div>
    `;
    
    return container.innerHTML;
}


function renderPtCalculator() {
    if (!state) return;
    const calcState = state.ptCalculator;
    
    ptElements.mainContainer.innerHTML = `
        ${renderInputForm()}
        <div id="pt-market-overview-container">
            ${calcState.marketSubmitted ? renderMarketOverview() : ''}
        </div>
        <div id="pt-analysis-inputs-container">
            ${calcState.marketSubmitted ? renderAnalysisInputs() : ''}
        </div>
        <div id="pt-results-container">
            ${calcState.analysisSubmitted ? renderResults() : ''}
        </div>
    `;
    utils.translateUI(state.lang);
}

// --- LOGIC & CALCULATIONS ---

function getPtGuideContent() {
    const t = translations[state.lang];

    const createRuleItem = (num, contentKey) => `<li><span class="rule-number">${num}</span><div class="rule-text">${t[contentKey]}</div></li>`;
    
    const createStrategyCard = (borderColor, titleKey, descKey, profitPoints, lossPoints) => `
        <div class="p-4 bg-slate-900/50 rounded-lg border ${borderColor}">
            <strong class="${borderColor.replace('border-', 'text-')} text-lg">${t[titleKey]}</strong>
            <p class="mt-1 text-slate-400 text-sm">${t[descKey]}</p>
            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div class="p-3 bg-green-900/20 rounded-md">
                    <p class="font-semibold text-green-300">${t.ptGuideStrategyProfitScenarios}</p>
                    <ul class="list-disc list-inside mt-2 text-slate-400 space-y-1">
                        ${profitPoints.map(key => `<li>${t[key]}</li>`).join('')}
                    </ul>
                </div>
                <div class="p-3 bg-red-900/20 rounded-md">
                    <p class="font-semibold text-red-300">${t.ptGuideStrategyLossScenarios}</p>
                     <ul class="list-disc list-inside mt-2 text-slate-400 space-y-1">
                        ${lossPoints.map(key => `<li>${t[key]}</li>`).join('')}
                    </ul>
                </div>
            </div>
        </div>
    `;

    return `
        <p class="mb-4">${t.ptGuideIntro}</p>
        <h4 class="font-bold text-amber-400 mb-2 mt-4">${t.ptGuideHowToTitle}</h4>
        <ol class="rules-list">
            ${createRuleItem(1, 'ptGuideStep1')}
            ${createRuleItem(2, 'ptGuideStep2')}
            ${createRuleItem(3, 'ptGuideStep3')}
        </ol>
        <h4 class="font-bold text-amber-400 mb-2 mt-4">${t.ptGuideStrategiesTitle}</h4>
        <div class="space-y-4">
            ${createStrategyCard('border-green-400/30', 'ptGuideStrategyPTTitle', 'ptGuideStrategyPTDesc', ['ptGuideStrategyPTProfit1', 'ptGuideStrategyPTProfit2'], ['ptGuideStrategyPTLoss1'])}
            ${createStrategyCard('border-cyan-400/30', 'ptGuideStrategyYTTitle', 'ptGuideStrategyYTDesc', ['ptGuideStrategyYTProfit1', 'ptGuideStrategyYTProfit2'], ['ptGuideStrategyYTLoss1', 'ptGuideStrategyYTLoss2'])}
        </div>
        <h4 class="font-bold text-amber-400 mb-2 mt-4">${t.ptGuideRisksTitle}</h4>
        <div class="p-4 bg-red-900/20 rounded-lg border border-red-500/30 text-slate-400 text-sm space-y-2">
            <p>${t.ptGuideRiskVolatility}</p>
            <p>${t.ptGuideRiskLiquidity}</p>
            <p>${t.ptGuideRiskContract}</p>
            <p>${t.ptGuideRiskDisclaimer}</p>
        </div>
    `;
}

function showPtGuide() {
    const content = getPtGuideContent();
    utils.openGuideModal('ptGuideTitle', content);
}

function handleMarketSubmit() {
    const calcState = state.ptCalculator;

    const today = new Date();
    today.setHours(0,0,0,0);
    const maturity = new Date(calcState.maturityDate);
    if (maturity <= today) {
        utils.showToast('ptErrorMaturity', 'error');
        return;
    }
    const diffTime = Math.max(0, maturity.getTime() - today.getTime());
    const diffDays = diffTime / (1000 * 3600 * 24);
    const T = diffDays / 365.25;
    calcState.timeToMaturity = T;
    
    const impliedApy = parseFloat(calcState.impliedApy) / 100;
    
    const ptPriceUnderlying = 1 / Math.pow(1 + impliedApy, T);
    const ytPriceUnderlying = 1 - ptPriceUnderlying;
    
    const assetPrice = parseFloat(calcState.assetPrice);
    calcState.ptPrice = ptPriceUnderlying * assetPrice;
    calcState.ytPrice = ytPriceUnderlying * assetPrice;
    calcState.ptExchangeRate = 1 / ptPriceUnderlying;
    
    calcState.marketSubmitted = true;
    calcState.inputsDisabled = true;
    handleResetAnalysis(); // Reset analysis if market data is resubmitted
}

function handleReset() {
    state.ptCalculator = getInitialState();
     const today = new Date();
    today.setDate(today.getDate() + 30); // Default sale date 30 days from now
    state.ptCalculator.saleDate = today.toISOString().split('T')[0];
    renderPtCalculator();
}

function handleResetAnalysis() {
    state.ptCalculator.analysisSubmitted = false;
    state.ptCalculator.results = null;
    renderPtCalculator();
}

function handleAnalysis() {
    const investorResults = calculateInvestorResults();
    const traderResults = calculateTraderResults();
    if (!traderResults) return; 

    state.ptCalculator.results = {
        investor: investorResults,
        trader: traderResults
    };
    state.ptCalculator.analysisSubmitted = true;
    
    renderPtCalculator();
}

function calculateInvestorResults() {
    const calcState = state.ptCalculator;
    const I = parseFloat(calcState.investmentUSDC) || 0;
    const Pa = parseFloat(calcState.assetPrice) || 0;
    const T = calcState.timeToMaturity;
    const ptPrice_usdc = calcState.ptPrice;
    const ytPrice_usdc = calcState.ytPrice;
    const futureUnderlyingApy = parseFloat(calcState.futureUnderlyingApy) / 100;

    const ptResult = { cost: I };
    const ytResult = { cost: I };
    const hodlResult = { cost: I };

    if (I > 0 && Pa > 0 && T > 0) {
        // HODL
        const hodlEndValue = I * Math.pow(1 + futureUnderlyingApy, T);
        hodlResult.yieldEarned = hodlEndValue - I;
        hodlResult.salePrice = hodlEndValue; // Changed from I to hodlEndValue
        hodlResult.netProfit = hodlResult.yieldEarned;
        hodlResult.effectiveApy = (Math.pow(1 + (hodlResult.netProfit / I), 1 / T) - 1) * 100;
        
        // Buy PT
        const ptTokens = I / ptPrice_usdc;
        ptResult.maturityValue = ptTokens * 1 * Pa;
        ptResult.netProfit = ptResult.maturityValue - I;
        ptResult.effectiveApy = (Math.pow(1 + (ptResult.netProfit / I), 1 / T) - 1) * 100;
        
        // Buy YT
        const ytTokens = I / ytPrice_usdc;
        const yieldPerAsset = Math.pow(1 + futureUnderlyingApy, T) - 1;
        ytResult.yieldEarned = ytTokens * yieldPerAsset * Pa;
        ytResult.maturityValue = 0;
        ytResult.netProfit = ytResult.yieldEarned - I;
        ytResult.effectiveApy = (Math.pow(1 + (ytResult.netProfit / I), 1 / T) - 1) * 100;
    }
    
    return { pt: ptResult, yt: ytResult, hodl: hodlResult };
}

function calculateTraderResults() {
    const calcState = state.ptCalculator;
    const I = parseFloat(calcState.investmentUSDC) || 0;
    const Pa_initial = parseFloat(calcState.assetPrice) || 0;
    const T_total = calcState.timeToMaturity;
    const futureUnderlyingApy = parseFloat(calcState.futureUnderlyingApy) / 100;
    const futureImpliedApy = parseFloat(calcState.futureImpliedApy) / 100;
    
    const ptResult = { cost: I };
    const ytResult = { cost: I };
    const hodlResult = { cost: I };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    const saleDate = new Date(calcState.saleDate || today);
    const maturityDate = new Date(calcState.maturityDate);
    if (saleDate < today || saleDate > maturityDate) {
        utils.showToast('ptErrorSaleDate', 'error');
        return null;
    }
    const daysHeld = (saleDate.getTime() - today.getTime()) / (1000 * 3600 * 24);
    const T_hold = Math.max(0, daysHeld / 365.25);
    
    if (I > 0 && Pa_initial > 0) {
        const T_remaining = Math.max(0, T_total - T_hold);
        
        // HODL
        const hodlValueAtSale = I * Math.pow(1 + futureUnderlyingApy, T_hold);
        hodlResult.yieldEarned = hodlValueAtSale - I;
        hodlResult.salePrice = hodlValueAtSale; 
        hodlResult.netProfit = hodlResult.yieldEarned;
        hodlResult.effectiveApy = T_hold > 0 ? (Math.pow(1 + (hodlResult.netProfit / I), 1 / T_hold) - 1) * 100 : 0;

        // Buy PT
        const initialPtPrice = calcState.ptPrice;
        const ptTokens = I / initialPtPrice;
        const ptPriceAtSale_underlying = 1 / Math.pow(1 + futureImpliedApy, T_remaining);
        const ptPriceAtSale_usd = ptPriceAtSale_underlying * Pa_initial;
        ptResult.salePrice = ptTokens * ptPriceAtSale_usd;
        ptResult.netProfit = ptResult.salePrice - I;
        ptResult.effectiveApy = T_hold > 0 ? (Math.pow(1 + (ptResult.netProfit / I), 1 / T_hold) - 1) * 100 : 0;
        
        // Buy YT
        const initialYtPrice = calcState.ytPrice;
        const ytTokens = I / initialYtPrice;
        const yieldAccruedPerAsset = Pa_initial * (Math.pow(1 + futureUnderlyingApy, T_hold) - 1);
        ytResult.yieldEarned = ytTokens * yieldAccruedPerAsset;
        const ptPriceAtSale_underlying_forYT = 1 / Math.pow(1 + futureImpliedApy, T_remaining);
        const ytPriceAtSale_underlying = 1 - ptPriceAtSale_underlying_forYT;
        const ytPriceAtSale_usd = ytPriceAtSale_underlying * Pa_initial;
        ytResult.salePrice = ytTokens * ytPriceAtSale_usd;
        ytResult.netProfit = (ytResult.yieldEarned + ytResult.salePrice) - I;
        ytResult.effectiveApy = T_hold > 0 ? (Math.pow(1 + (ytResult.netProfit / I), 1 / T_hold) - 1) * 100 : 0;
    }

    return { pt: ptResult, yt: ytResult, hodl: hodlResult, daysHeld: Math.round(daysHeld) };
}

export const ptCalculatorApp = {
    initialState: getInitialState(),
    initialize: initializePtCalculator,
    render: renderPtCalculator,
};