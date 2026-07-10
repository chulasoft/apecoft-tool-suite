import { translations } from '../i18n/translations.js';
import { fetchTopTokens, fetchCoinDetails } from '../services/cryptoService.js';
import { CoinSelector } from '../components/CoinSelector.js';

const MOON_SHEET_STATE_KEY = 'moonSheetState';

const getInitialState = () => ({
    initialized: false,
    allCoins: [],
    selectedCoinId: 'bitcoin',
    coinData: null,
    holdings: '1',
    isLoading: false,
    error: null,
});

let state, elements, utils;
const msElements = {};

function initialize(context) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.moonSheet.initialized) return;

    Object.assign(msElements, {
        mainContainer: document.getElementById('moon-sheet-main'),
    });

    CoinSelector.init(elements.modalContainer);

    msElements.mainContainer.addEventListener('click', handleMainClick);
    msElements.mainContainer.addEventListener('input', handleHoldingsChange);

    loadStateFromStorage();
    render();

    loadTokenList().then(() => {
        loadCoinData();
    });

    state.moonSheet.initialized = true;
}

function saveStateToStorage() {
    try {
        const stateToSave = {
            selectedCoinId: state.moonSheet.selectedCoinId,
            holdings: state.moonSheet.holdings,
        };
        localStorage.setItem(MOON_SHEET_STATE_KEY, JSON.stringify(stateToSave));
    } catch (e) {
        console.error("Failed to save moon sheet state:", e);
    }
}

function loadStateFromStorage() {
    try {
        const storedState = localStorage.getItem(MOON_SHEET_STATE_KEY);
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            Object.assign(state.moonSheet, parsedState);
        }
    } catch (e) {
        console.error("Failed to load moon sheet state:", e);
    }
}

async function loadTokenList() {
    const msState = state.moonSheet;
    try {
        msState.isLoading = true;
        render();
        let tokens = await fetchTopTokens();
        msState.allCoins = tokens;
        CoinSelector.update(tokens);
        msState.error = null;
    } catch (e) {
        msState.error = 'coinList';
        console.error(e);
    } finally {
        msState.isLoading = false;
        render();
    }
}

async function loadCoinData() {
    const msState = state.moonSheet;
    if (!msState.selectedCoinId) return;

    msState.isLoading = true;
    msState.error = null;
    render();

    try {
        const details = await fetchCoinDetails([msState.selectedCoinId]);
        msState.coinData = details[msState.selectedCoinId] || null;
        if (!msState.coinData) throw new Error('Coin data not found');
    } catch (e) {
        msState.error = 'coinData';
        msState.coinData = null;
        console.error(e);
    } finally {
        msState.isLoading = false;
        render();
    }
}

function handleMainClick(e) {
    const target = e.target;
    const coinSelectorBtn = target.closest('#ms-coin-selector-btn');

    if (coinSelectorBtn && !coinSelectorBtn.disabled) {
        CoinSelector.show(state.moonSheet.allCoins, (coinId) => {
            state.moonSheet.selectedCoinId = coinId;
            saveStateToStorage();
            loadCoinData();
        });
    }
}

function handleHoldingsChange(e) {
    const target = e.target;
    if (target.id === 'ms-holdings-input') {
        state.moonSheet.holdings = target.value;
        saveStateToStorage();
        // Just re-render the table for efficiency
        const tableContainer = msElements.mainContainer.querySelector('#ms-table-container');
        if (tableContainer) {
            tableContainer.innerHTML = renderMoonSheetTable();
            utils.translateUI(state.lang);
        }
    }
}


function render() {
    const msState = state.moonSheet;
    let content;

    if (msState.isLoading && !msState.coinData) {
        content = `<div class="text-center p-8"><div class="bvr-spinner mx-auto"></div><p class="mt-4 text-slate-400" data-i18n-key="loadingPrices"></p></div>`;
    } else if (msState.error) {
        content = `<div class="text-center p-8 bg-red-500/10 rounded-lg"><p class="text-lg text-red-400" data-i18n-key="${msState.error === 'coinList' ? 'errorCoinList' : 'errorPriceData'}"></p></div>`;
    } else {
        content = `
            <div class="space-y-6">
                ${renderCoinSelectorAndStats()}
                <div id="ms-table-container">
                    ${renderMoonSheetTable()}
                </div>
            </div>
        `;
    }

    msElements.mainContainer.innerHTML = content;
    utils.translateUI(state.lang);
}

function renderCoinSelectorAndStats() {
    const t = translations[state.lang];
    const msState = state.moonSheet;
    const { allCoins, selectedCoinId, coinData, holdings } = msState;
    const selectedCoinInfo = allCoins.find(c => c.id === selectedCoinId);
    const isLoadingList = allCoins.length === 0;

    let selectorContent;
    if (isLoadingList && !selectedCoinInfo) {
        selectorContent = `<span class="opacity-50" data-i18n-key="loadingPrices"></span>`;
    } else if (selectedCoinInfo) {
        selectorContent = `
            <img src="${selectedCoinInfo.image}" alt="${selectedCoinInfo.name}" class="w-8 h-8 mr-3 rounded-full">
            <span class="flex flex-col text-left">
              <span class="text-xl font-bold leading-tight">${selectedCoinInfo.symbol.toUpperCase()}</span>
              <span class="text-sm text-slate-400 leading-tight">${selectedCoinInfo.name}</span>
            </span>`;
    } else {
        selectorContent = `<span data-i18n-key="selectCoinPlaceholder"></span>`;
    }

    const statRow = (labelKey, value) => {
        if (value === null || value === undefined) return '';
        return `<div class="flex justify-between items-baseline py-2 border-b border-slate-700/50">
            <span class="text-sm text-slate-400" data-i18n-key="${labelKey}"></span>
            <span class="font-mono font-semibold text-white">${value}</span>
        </div>`;
    }

    let statsContent = '<div class="bvr-spinner mx-auto"></div>';
    if (coinData) {
        const fdv = coinData.total_supply ? coinData.current_price * coinData.total_supply : null;
        statsContent = `
            ${statRow('currentPriceLabel', utils.formatValue(coinData.current_price, 2, false))}
            ${statRow('marketCap', '$' + utils.formatBigNumber(coinData.market_cap))}
            ${statRow('msFdv', fdv ? '$' + utils.formatBigNumber(fdv) : 'N/A')}
            ${statRow('circulatingSupply', utils.formatBigNumber(coinData.circulating_supply))}
            ${statRow('msTotalSupply', utils.formatBigNumber(coinData.total_supply))}
        `;
    }
    
    return `
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6 flex flex-col justify-center">
                <label class="block text-sm font-medium text-slate-300 mb-2" data-i18n-key="msCoinSelectorLabel"></label>
                <button id="ms-coin-selector-btn" ${isLoadingList ? 'disabled' : ''} class="flex items-center w-full bg-slate-800 border border-slate-600 rounded-md shadow-sm p-3 text-left text-white focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed hover:border-purple-500 transition-colors">
                    ${selectorContent}
                </button>
            </div>
             <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <h3 class="text-lg font-bold text-slate-300 mb-2" data-i18n-key="msCurrentStats"></h3>
                ${statsContent}
                <div class="mt-4">
                    <label for="ms-holdings-input" class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="msYourHoldings"></label>
                    <input type="number" id="ms-holdings-input" value="${holdings}" class="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                </div>
            </div>
        </div>
    `;
}

function renderMoonSheetTable() {
    const t = translations[state.lang];
    const { coinData, holdings } = state.moonSheet;
    
    if (!coinData || !coinData.circulating_supply || coinData.circulating_supply <= 0) {
        return `<div class="text-center p-8 bg-slate-800/60 rounded-lg"><p class="text-slate-400">Please select a coin with valid data to see projections.</p></div>`;
    }

    const currentMcap = coinData.market_cap;
    const multipliers = [1, 3, 9, 27, 81, 243];
    const userHoldings = parseFloat(holdings) || 0;

    const tableRows = multipliers.map(x => {
        const targetMcap = currentMcap * x;
        const newPrice = targetMcap / coinData.circulating_supply;
        const yourValue = newPrice * userHoldings;
        const impliedFdv = coinData.total_supply ? newPrice * coinData.total_supply : null;

        return `
            <tr class="hover:bg-slate-700/50 transition-colors">
                <td class="px-4 py-3 font-mono text-white">${'$' + utils.formatBigNumber(targetMcap)}</td>
                <td class="px-4 py-3 font-bold text-lg text-amber-400">${x}x</td>
                <td class="px-4 py-3 font-mono font-bold text-cyan-400">${utils.formatValue(newPrice, 4)}</td>
                <td class="px-4 py-3 font-mono font-bold text-green-400">${utils.formatValue(yourValue, 2)}</td>
                <td class="px-4 py-3 font-mono text-slate-400">${impliedFdv ? '$' + utils.formatBigNumber(impliedFdv) : 'N/A'}</td>
            </tr>
        `;
    }).join('');

    return `
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl overflow-x-auto custom-scrollbar">
            <table class="w-full text-sm text-center clean-table">
                <thead>
                    <tr>
                        <th data-i18n-key="msTableTargetMcap"></th>
                        <th data-i18n-key="msTableMultiplier"></th>
                        <th data-i18n-key="msTablePricePerToken"></th>
                        <th data-i18n-key="msTableYourValue"></th>
                        <th data-i18n-key="msTableImpliedFdv"></th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

export const moonSheetApp = {
    initialState: getInitialState(),
    initialize: initialize,
    render: render,
};