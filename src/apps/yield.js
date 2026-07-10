
import { translations } from '../i18n/translations.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    createInfoIcon, 
    createPdfIcon,
    createEditIcon,
    createDuplicateIcon,
    createDeleteIcon,
    createImportIcon,
    createExportIcon,
    createChevronLeftIcon,
    createChevronRightIcon,
    createWarningIcon
} from '../components/icons.js';


// --- CONSTANTS & STATE ---
const YIELD_PORTFOLIO_KEY = 'yieldPortfolio';

const initialState = {
    initialized: false,
    portfolio: [], // { id, asset, investment, apr, selected }
    editingPositionId: null,
    currentPage: 1,
    rowsPerPage: 5,
    searchTerm: '',
    optimizer: {
        monthlyFee: '',
        investment: '',
        apr: '',
        result: null, // { fee, investment, apr }
    },
};

// Module-scoped variables for context passed from index.js
let state, elements, utils;

// DOM elements specific to the yield dashboard
const yieldElements = {};

// --- INITIALIZATION ---
function initializeYield(context) {
    // Set up context
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.yieldDashboard.initialized) return;
    
    // Cache DOM elements
    Object.assign(yieldElements, {
        mainContentContainer: document.getElementById('yield-dashboard-main-content'),
        yieldPositionModal: document.getElementById('yield-position-modal'),
        yieldPositionForm: document.getElementById('yield-position-form'),
        yieldModalTitle: document.getElementById('yield-modal-title'),
        yieldModalCloseBtn: document.getElementById('yield-modal-close-btn'),
        yieldModalCancelBtn: document.getElementById('yield-modal-cancel-btn'),
    });
    
    loadYieldPortfolioFromStorage();
    
    // Add event listeners
    elements.yieldDashboard.addEventListener('click', handleYieldDashboardClick);
    elements.yieldDashboard.addEventListener('input', (e) => {
        if (e.target.id === 'yield-search-input') {
            handleSearchInput(e.target.value);
        } else if (e.target.closest('#yield-optimizer-card')) {
            handleOptimizerInput(e.target);
        }
    });

    // Delegate checkbox events from the table
    elements.yieldDashboard.addEventListener('change', e => {
        const target = e.target;
        if(target.type !== 'checkbox') return;

        if(target.classList.contains('yield-select-all')) {
            handleSelectAll(target.checked);
        }
        if(target.classList.contains('yield-select-row')) {
            handleSelectRow(target.dataset.id, target.checked);
        }
    });
    
    yieldElements.yieldPositionForm.addEventListener('submit', (e) => {
        e.preventDefault();
        saveYieldPosition();
    });
    yieldElements.yieldModalCloseBtn.addEventListener('click', closeYieldModal);
    yieldElements.yieldModalCancelBtn.addEventListener('click', closeYieldModal);
    yieldElements.yieldPositionModal.addEventListener('click', (e) => {
        if (e.target === yieldElements.yieldPositionModal) closeYieldModal();
    });

    renderYieldDashboard();
    state.yieldDashboard.initialized = true;
}


// --- RENDER FUNCTIONS ---

function renderYieldDashboard(context) {
    if (context && context.state) {
        state = context.state;
    }
    if (!state) return;

  yieldElements.mainContentContainer.innerHTML = `
    <div id="yield-analysis-container" class="mb-8 space-y-8"></div>
    <div class="bg-slate-800/60 relative shadow-md sm:rounded-lg overflow-hidden border border-slate-700">
        <div id="yield-header-controls" class="flex flex-col md:flex-row items-center justify-between space-y-3 md:space-y-0 md:space-x-4 p-4">
            <!-- Header controls will be rendered here -->
        </div>
        <div class="overflow-x-auto custom-scrollbar">
            <table id="yield-dashboard-table" class="w-full text-sm text-left text-slate-400 table-layout-fixed">
                <thead class="text-xs text-slate-400 uppercase bg-slate-700/50">
                    <!-- Table head rendered by renderYieldTable -->
                </thead>
                <tbody>
                    <!-- Table body rendered by renderYieldTable -->
                </tbody>
            </table>
        </div>
        <nav id="yield-pagination-controls" class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-3 md:space-y-0 p-4" aria-label="Table navigation">
            <!-- Pagination will be rendered here -->
        </nav>
        <input type="file" id="csv-import-input" class="hidden" accept=".csv">
    </div>
  `;

  // Re-cache dynamic elements
  Object.assign(yieldElements, {
      analysisContainer: document.getElementById('yield-analysis-container'),
      headerControls: document.getElementById('yield-header-controls'),
      table: document.getElementById('yield-dashboard-table'),
      paginationControls: document.getElementById('yield-pagination-controls'),
      csvImportInput: document.getElementById('csv-import-input'),
  });
  
  yieldElements.csvImportInput.addEventListener('change', handleImportFileSelect);

  renderAnalysisSection();
  renderHeaderControls();
  renderYieldTable();
  renderPagination();
  utils.translateUI(state.lang);
}

function renderHeaderControls() {
    const t = translations[state.lang];
    const { searchTerm, portfolio } = state.yieldDashboard;
    const numSelected = portfolio.filter(p => p.selected).length;

    yieldElements.headerControls.innerHTML = `
        <div class="w-full md:w-1/3">
            <form class="flex items-center">
                <label for="yield-search-input" class="sr-only">Search</label>
                <div class="relative w-full">
                    <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                         <svg aria-hidden="true" class="w-5 h-5 text-slate-400" fill="currentColor" viewbox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
                        </svg>
                    </div>
                    <input type="text" id="yield-search-input" value="${searchTerm}" class="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5" placeholder="${t.yieldSearchPlaceholder}">
                </div>
            </form>
        </div>
        <div class="w-full md:w-auto flex flex-col md:flex-row space-y-2 md:space-y-0 items-stretch md:items-center justify-end md:space-x-3 flex-shrink-0">
            <div class="flex items-center space-x-3 w-full md:w-auto">
                <button id="import-btn" type="button" class="w-full md:w-auto flex items-center justify-center text-white bg-slate-700 hover:bg-slate-600 focus:ring-4 focus:ring-slate-500 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none">
                    ${createImportIcon()} <span data-i18n-key="yieldImportBtn"></span>
                </button>
                <button id="export-btn" type="button" class="w-full md:w-auto flex items-center justify-center text-white bg-slate-700 hover:bg-slate-600 focus:ring-4 focus:ring-slate-500 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none" ${portfolio.length === 0 ? 'disabled' : ''}>
                    ${createExportIcon()} <span data-i18n-key="yieldExportBtn"></span>
                </button>
                 <button id="export-pdf-btn" type="button" class="w-full md:w-auto flex items-center justify-center text-white bg-slate-700 hover:bg-slate-600 focus:ring-4 focus:ring-slate-500 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none" ${portfolio.length === 0 ? 'disabled' : ''}>
                    ${createPdfIcon()} <span data-i18n-key="yieldExportPdfBtn"></span>
                </button>
                <button id="delete-selected-btn" type="button" class="w-full md:w-auto flex items-center justify-center text-white bg-red-700 hover:bg-red-800 focus:ring-4 focus:ring-red-300 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed" ${numSelected === 0 ? 'disabled' : ''}>
                    <svg class="h-3.5 w-3.5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.58.22-2.365.468a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"></path></svg>
                    <span data-i18n-key="yieldDeleteSelected"></span>&nbsp;<span>(${numSelected})</span>
                </button>
            </div>
            <button id="add-position-btn" type="button" class="flex items-center justify-center text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-300 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none">
                <svg class="h-3.5 w-3.5 mr-2" fill="currentColor" viewbox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path clip-rule="evenodd" fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" /></svg>
                <span data-i18n-key="addPositionBtn"></span>
            </button>
        </div>
    `;
}

function renderYieldTable() {
    const t = translations[state.lang];
    const { portfolio, currentPage, rowsPerPage, searchTerm } = state.yieldDashboard;
    const tableHead = yieldElements.table.querySelector('thead');
    const tableBody = yieldElements.table.querySelector('tbody');

    const filteredPortfolio = portfolio.filter(pos => 
        (pos.asset?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedItems = filteredPortfolio.slice(startIndex, endIndex);

    const isAllVisibleSelected = paginatedItems.length > 0 && paginatedItems.every(p => p.selected);

    tableHead.innerHTML = `<tr>
        <th scope="col" class="p-4 w-[4%]"><input type="checkbox" class="yield-select-all bg-slate-700 border-slate-500 rounded text-indigo-500 focus:ring-indigo-500" ${isAllVisibleSelected ? 'checked' : ''}/></th>
        <th scope="col" class="px-4 py-3 text-left w-[24%]" data-i18n-key="assetCol"></th>
        <th scope="col" class="px-4 py-3 text-center w-[15%]" data-i18n-key="investmentCol"></th>
        <th scope="col" class="px-4 py-3 text-center w-[8%]" data-i18n-key="aprCol"></th>
        <th scope="col" class="px-4 py-3 text-center w-[13%]" data-i18n-key="hourlyCol"></th>
        <th scope="col" class="px-4 py-3 text-center w-[13%]" data-i18n-key="dailyCol"></th>
        <th scope="col" class="px-4 py-3 text-center w-[13%]" data-i18n-key="monthlyCol"></th>
        <th scope="col" class="px-4 py-3 text-center w-[10%]" data-i18n-key="actionsCol"></th>
    </tr>`;

    let tableBodyHtml = '';
    if (filteredPortfolio.length === 0) {
        const messageKey = searchTerm ? 'noResultsFound' : 'noPositions';
        tableBodyHtml = `<tr><td colspan="8" class="text-center text-slate-400 py-16" data-i18n-key="${messageKey}"></td></tr>`;
    } else {
        tableBodyHtml = paginatedItems.map(pos => {
            const investment = parseFloat(pos.investment) || 0;
            const apr = parseFloat(pos.apr) || 0;
            const hourlyYield = investment * (apr / 100 / 365 / 24);
            const dailyYield = hourlyYield * 24;
            const monthlyYield = dailyYield * 30;
            
            return `<tr class="border-b border-slate-700 hover:bg-slate-800/50 h-[61px]" data-id="${pos.id}">
                <td class="w-4 p-4"><input type="checkbox" class="yield-select-row bg-slate-700 border-slate-500 rounded text-indigo-500 focus:ring-indigo-500" data-id="${pos.id}" ${pos.selected ? 'checked' : ''}/></td>
                <td scope="row" class="px-4 py-3 font-medium text-white whitespace-nowrap text-left truncate">
                    <div>${pos.asset}</div>
                </td>
                <td class="px-4 py-3 text-center font-mono">${utils.formatValue(investment)}</td>
                <td class="px-4 py-3 text-center font-mono">${utils.formatPercent(apr)}</td>
                <td class="px-4 py-3 text-center font-mono text-green-400">${utils.formatValue(hourlyYield, 4)}</td>
                <td class="px-4 py-3 text-center font-mono text-green-400">${utils.formatValue(dailyYield)}</td>
                <td class="px-4 py-3 text-center font-mono text-green-400">${utils.formatValue(monthlyYield)}</td>
                <td class="px-4 py-3 text-center">
                    <div class="flex items-center justify-center space-x-2">
                        <button class="edit-position-btn p-1.5 text-slate-400 hover:text-cyan-400 rounded-md hover:bg-slate-700" data-id="${pos.id}" aria-label="${t.editAction}">${createEditIcon()}</button>
                        <button class="duplicate-position-btn p-1.5 text-slate-400 hover:text-amber-400 rounded-md hover:bg-slate-700" data-id="${pos.id}" aria-label="${t.duplicateAction}">${createDuplicateIcon()}</button>
                        <button class="remove-position-btn p-1.5 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700" data-id="${pos.id}" aria-label="${t.deleteAction}">${createDeleteIcon()}</button>
                    </div>
                </td>
            </tr>`;
        }).join('');

        const emptyRowsCount = rowsPerPage - paginatedItems.length;
        if (emptyRowsCount > 0) {
            for (let i = 0; i < emptyRowsCount; i++) {
                tableBodyHtml += `<tr class="border-b border-slate-700 h-[61px]"><td colspan="8"></td></tr>`;
            }
        }
    }
    tableBody.innerHTML = tableBodyHtml;
}

function renderPagination() {
    const { portfolio, rowsPerPage, searchTerm } = state.yieldDashboard;
    const filteredPortfolio = portfolio.filter(pos => (pos.asset?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
    const totalItems = filteredPortfolio.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
    const currentPage = state.yieldDashboard.currentPage > totalPages ? totalPages : state.yieldDashboard.currentPage;

    yieldElements.paginationControls.innerHTML = '';

    const startItem = totalItems > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0;
    const endItem = Math.min(currentPage * rowsPerPage, totalItems);
    
    let pageButtons = [];
    if (totalPages <= 7) {
        for (let i = 1; i <= totalPages; i++) pageButtons.push(i);
    } else {
        pageButtons.push(1);
        if (currentPage > 3) pageButtons.push('...');
        if (currentPage > 2) pageButtons.push(currentPage - 1);
        if (currentPage > 1 && currentPage < totalPages) pageButtons.push(currentPage);
        if (currentPage < totalPages - 1) pageButtons.push(currentPage + 1);
        if (currentPage < totalPages - 2) pageButtons.push('...');
        pageButtons.push(totalPages);
    }
    pageButtons = [...new Set(pageButtons)];

    const pageButtonsHTML = pageButtons.map(p => {
        if (p === '...') return `<li><span class="flex items-center justify-center text-sm py-2 px-3 leading-tight text-slate-400 bg-slate-800 border border-slate-700">...</span></li>`;
        const activeClass = currentPage === p ? 'z-10 text-white bg-indigo-600 border-indigo-500' : 'text-slate-400 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white';
        return `<li><button class="pagination-btn flex items-center justify-center text-sm py-2 px-3 leading-tight border ${activeClass}" data-page="${p}">${p}</button></li>`;
    }).join('');
    
    yieldElements.paginationControls.innerHTML = `
        <span class="text-sm font-normal text-slate-400 ${totalItems === 0 ? 'invisible' : ''}" data-i18n-key="yieldShowing" data-i18n-param-start="${startItem}" data-i18n-param-end="${endItem}" data-i18n-param-total="${totalItems}"></span>
        <ul class="inline-flex items-center -space-x-px">
            <li><button class="pagination-btn flex items-center justify-center text-sm p-2.5 rounded-l-lg border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>${createChevronLeftIcon('w-4 h-4')}</button></li>
            ${pageButtonsHTML}
            <li><button class="pagination-btn flex items-center justify-center text-sm p-2.5 rounded-r-lg border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>${createChevronRightIcon('w-4 h-4')}</button></li>
        </ul>
    `;
}

function renderAnalysisSection() {
    const { portfolio, optimizer } = state.yieldDashboard;
    
    const totalInvestment = portfolio.reduce((acc, pos) => acc + (parseFloat(pos.investment) || 0), 0);
    const weightedAprSum = portfolio.reduce((acc, pos) => acc + (parseFloat(pos.investment) || 0) * (parseFloat(pos.apr) || 0), 0);
    const averageApr = totalInvestment > 0 ? weightedAprSum / totalInvestment : 0;
    const hourlyYield = totalInvestment * (averageApr / 100 / 365 / 24);
    const dailyYield = hourlyYield * 24;
    const monthlyYield = dailyYield * 30;

    const summaryCard = `
        <div id="yield-summary-card" class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <div class="flex justify-between items-start">
                <h3 class="text-xl font-bold text-slate-300 mb-4" data-i18n-key="portfolioSummaryTitle"></h3>
                <button id="yield-guide-btn" class="p-2 -mt-2 -mr-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-i18n-key="guideButton" aria-label="Open Guide">
                    ${createInfoIcon('h-6 w-6')}
                </button>
            </div>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                <div><p class="text-sm text-slate-400" data-i18n-key="totalInvestment"></p><p class="text-2xl font-bold text-white">${utils.formatValue(totalInvestment)}</p></div>
                <div><p class="text-sm text-slate-400" data-i18n-key="averageApr"></p><p class="text-2xl font-bold text-cyan-400">${utils.formatPercent(averageApr)}</p></div>
                <div><p class="text-sm text-slate-400" data-i18n-key="totalHourlyYield"></p><p class="text-2xl font-bold text-green-400">${utils.formatValue(hourlyYield, 4)}</p></div>
                <div><p class="text-sm text-slate-400" data-i18n-key="totalDailyYield"></p><p class="text-2xl font-bold text-green-400">${utils.formatValue(dailyYield)}</p></div>
                <div><p class="text-sm text-slate-400" data-i18n-key="totalMonthlyYield"></p><p class="text-2xl font-bold text-green-400">${utils.formatValue(monthlyYield)}</p></div>
            </div>
        </div>
    `;

    let optimizerResultHTML = '';
    if (optimizer.result) {
        const { fee, investment, apr } = optimizer.result;
        optimizerResultHTML = `
            <div class="mt-4 p-4 bg-slate-900/50 rounded-lg text-center text-slate-300">
                <p data-i18n-key="optimizerResultSentence" 
                   data-i18n-param-fee="${utils.formatValue(fee)}"
                   data-i18n-param-investment="${utils.formatValue(investment)}"
                   data-i18n-param-apr="${utils.formatPercent(apr)}">
                </p>
            </div>`;
    }

    const renderOptimizerInput = (id, labelKey, value, step, unit) => `
        <div>
            <label class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="${labelKey}"></label>
            <div class="custom-number-input">
                <button type="button" class="number-btn decrement-btn" data-input-id="${id}" aria-label="Decrement">-</button>
                <div class="relative flex-grow">
                    <input type="number" id="${id}" value="${value}" data-step="${step}" class="w-full h-10 bg-slate-700 border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-left"/>
                    <span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">${unit}</span>
                </div>
                 <button type="button" class="number-btn increment-btn" data-input-id="${id}" aria-label="Increment">+</button>
            </div>
        </div>
    `;

    const optimizerCard = `
        <div id="yield-optimizer-card" class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <h3 class="text-xl font-bold text-slate-300" data-i18n-key="optimizerTitle"></h3>
            <p class="text-sm text-slate-400 mt-1 mb-4" data-i18n-key="optimizerDescription"></p>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                ${renderOptimizerInput('optimizer-monthlyFee', 'targetMonthlyFee', optimizer.monthlyFee, 100, 'USD')}
                ${renderOptimizerInput('optimizer-investment', 'requiredInvestment', optimizer.investment, 1000, 'USD')}
                ${renderOptimizerInput('optimizer-apr', 'requiredApr', optimizer.apr, 0.1, '%')}
            </div>
            <div class="flex flex-col sm:flex-row gap-3 mt-4">
                <button id="optimizer-start-btn" class="flex-1 bg-slate-600 hover:bg-slate-500 font-bold py-2 px-4 rounded-md transition-colors" data-i18n-key="startWithPortfolioBtn"></button>
                <button id="optimizer-run-btn" class="flex-1 bg-indigo-500 hover:bg-indigo-600 font-bold py-2 px-4 rounded-md transition-colors" data-i18n-key="runCalculationBtn"></button>
                <button id="optimizer-reset-btn" class="flex-1 bg-red-700 hover:bg-red-600 font-bold py-2 px-4 rounded-md transition-colors" data-i18n-key="resetBtn"></button>
            </div>
            ${optimizerResultHTML}
        </div>
    `;

    const dailyLossCoverage = totalInvestment > 0 ? (dailyYield / totalInvestment) * 100 : 0;
    const monthlyLossCoverage = totalInvestment > 0 ? (monthlyYield / totalInvestment) * 100 : 0;

    const riskCard = `
         <div id="yield-risk-card" class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
            <h3 class="text-xl font-bold text-slate-300" data-i18n-key="riskAnalysisTitle"></h3>
            <p class="text-sm text-slate-400 mt-1 mb-4" data-i18n-key="riskAnalysisDescription"></p>
            <div class="p-4 bg-slate-900/50 rounded-lg text-center text-slate-300">
                <p data-i18n-key="riskToleranceResult" 
                    data-i18n-param-daily="${utils.formatPercent(dailyLossCoverage)}"
                    data-i18n-param-monthly="${utils.formatPercent(monthlyLossCoverage)}">
                </p>
            </div>
        </div>
    `;

    yieldElements.analysisContainer.innerHTML = summaryCard + optimizerCard + riskCard;
    utils.translateUI(state.lang);
}


// --- PERSISTENCE ---
const saveYieldPortfolioToStorage = () => {
    try {
        const portfolioToSave = state.yieldDashboard.portfolio.map(({ id, asset, investment, apr }) => ({ id, asset, investment, apr }));
        localStorage.setItem(YIELD_PORTFOLIO_KEY, JSON.stringify(portfolioToSave));
    } catch (e) { console.error("Failed to save yield portfolio:", e); }
};

const loadYieldPortfolioFromStorage = () => {
    try {
        const storedPortfolio = localStorage.getItem(YIELD_PORTFOLIO_KEY);
        if (storedPortfolio) {
            const parsedPortfolio = JSON.parse(storedPortfolio);
            // Ensure loaded data has the `selected` property
            state.yieldDashboard.portfolio = parsedPortfolio.map(p => ({ ...p, selected: false }));
        }
    } catch (e) { console.error("Failed to load yield portfolio:", e); }
};

// --- EVENT HANDLERS & LOGIC ---

function handleYieldDashboardClick(e) {
    const target = e.target.closest('button');
    if (!target) return;
    
    // Header buttons
    if (target.id === 'add-position-btn') openYieldModal();
    if (target.id === 'import-btn') yieldElements.csvImportInput.click();
    if (target.id === 'export-btn') handleExportCSV();
    if (target.id === 'export-pdf-btn') handleExportPDF();
    if (target.id === 'delete-selected-btn') handleDeleteSelected();
    if (target.id === 'yield-guide-btn') showYieldGuide();

    // Table action buttons
    if (target.classList.contains('edit-position-btn')) openYieldModal(target.dataset.id);
    if (target.classList.contains('remove-position-btn')) handleDeletePosition(target.dataset.id);
    if (target.classList.contains('duplicate-position-btn')) handleDuplicatePosition(target.dataset.id);
    
    // Pagination
    if (target.classList.contains('pagination-btn')) handlePaginationClick(parseInt(target.dataset.page));
    
    // Optimizer
    if (target.id === 'optimizer-run-btn') handleOptimizerLogic('run');
    if (target.id === 'optimizer-start-btn') handleOptimizerLogic('start');
    if (target.id === 'optimizer-reset-btn') handleOptimizerLogic('reset');
}

function handlePaginationClick(page) {
    const { portfolio, rowsPerPage, searchTerm } = state.yieldDashboard;
    const filteredPortfolio = portfolio.filter(pos => (pos.asset?.toLowerCase() || '').includes(searchTerm.toLowerCase()));
    const totalPages = Math.ceil(filteredPortfolio.length / rowsPerPage);
    if (page >= 1 && page <= totalPages) {
        state.yieldDashboard.currentPage = page;
        renderYieldTable();
        renderPagination();
        utils.translateUI(state.lang);
    }
}

function handleSearchInput(value) {
    state.yieldDashboard.searchTerm = value;
    state.yieldDashboard.currentPage = 1; // Reset to first page on search
    renderYieldTable();
    renderPagination();
    utils.translateUI(state.lang);
}

function handleSelectRow(id, isSelected) {
    const pos = state.yieldDashboard.portfolio.find(p => p.id === id);
    if (pos) {
        pos.selected = isSelected;
        renderHeaderControls(); // Update delete count
        utils.translateUI(state.lang);
    }
}

function handleSelectAll(isSelected) {
    const { portfolio, currentPage, rowsPerPage, searchTerm } = state.yieldDashboard;
    const filteredPortfolio = portfolio.filter(pos => 
        (pos.asset?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );
    const paginatedItems = filteredPortfolio.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
    
    paginatedItems.forEach(pos => {
        const p = state.yieldDashboard.portfolio.find(item => item.id === pos.id);
        if (p) p.selected = isSelected;
    });
    renderYieldTable();
    renderHeaderControls();
    utils.translateUI(state.lang);
}

function openYieldModal(positionId = null) {
    state.yieldDashboard.editingPositionId = positionId;
    const t = translations[state.lang];
    yieldElements.yieldPositionForm.reset();
    if (positionId) {
        const position = state.yieldDashboard.portfolio.find(p => p.id === positionId);
        yieldElements.yieldModalTitle.textContent = t.yieldModalTitleEdit;
        document.getElementById('yield-asset-input').value = position.asset;
        document.getElementById('yield-investment-input').value = position.investment;
        document.getElementById('yield-apr-input').value = position.apr;
    } else {
        yieldElements.yieldModalTitle.textContent = t.yieldModalTitleAdd;
        document.getElementById('yield-asset-input').value = '';
        // Set default values for new positions
        document.getElementById('yield-investment-input').value = 1000;
        document.getElementById('yield-apr-input').value = 10;
    }
    yieldElements.yieldPositionModal.classList.add('open');
}

function closeYieldModal() {
    yieldElements.yieldPositionModal.classList.remove('open');
    state.yieldDashboard.editingPositionId = null;
}

function saveYieldPosition() {
    const { editingPositionId } = state.yieldDashboard;
    const formData = new FormData(yieldElements.yieldPositionForm);
    const newPosition = {
        asset: formData.get('asset'),
        investment: formData.get('investment'),
        apr: formData.get('apr'),
        selected: false
    };

    if (editingPositionId) {
        const index = state.yieldDashboard.portfolio.findIndex(p => p.id === editingPositionId);
        state.yieldDashboard.portfolio[index] = { ...state.yieldDashboard.portfolio[index], ...newPosition };
    } else {
        newPosition.id = `pos_${Date.now()}`;
        state.yieldDashboard.portfolio.unshift(newPosition);
    }
    closeYieldModal();
    saveYieldPortfolioToStorage();
    renderYieldDashboard();
    utils.showToast('toastPositionSaved', 'success');
}

function handleDeletePosition(id) {
    utils.showConfirmationModal({
        messageKey: 'confirmDeleteMessage',
        confirmTextKey: 'confirmBtn',
        onConfirm: () => {
            state.yieldDashboard.portfolio = state.yieldDashboard.portfolio.filter(p => p.id !== id);
            saveYieldPortfolioToStorage();
            renderYieldDashboard();
            utils.showToast('toastPositionRemoved', 'success');
        }
    });
}

function handleDeleteSelected() {
    const selectedPositions = state.yieldDashboard.portfolio.filter(p => p.selected);
    if (selectedPositions.length === 0) return;

    utils.showConfirmationModal({
        messageKey: 'confirmDeleteSelectedMessage',
        messageParams: { count: selectedPositions.length },
        confirmTextKey: 'confirmBtn',
        onConfirm: () => {
            const selectedIds = new Set(selectedPositions.map(p => p.id));
            state.yieldDashboard.portfolio = state.yieldDashboard.portfolio.filter(p => !selectedIds.has(p.id));
            saveYieldPortfolioToStorage();
            renderYieldDashboard();
            utils.showToast('toastPositionRemoved', 'success');
        }
    });
}

function handleDuplicatePosition(id) {
    const original = state.yieldDashboard.portfolio.find(p => p.id === id);
    if (original) {
        const newPosition = { ...original, id: `pos_${Date.now()}`, selected: false };
        state.yieldDashboard.portfolio.unshift(newPosition);
        saveYieldPortfolioToStorage();
        renderYieldDashboard();
        utils.showToast('toastPositionDuplicated', 'success');
    }
}


function handleOptimizerInput(target) {
    const optimizer = state.yieldDashboard.optimizer;
    if (target.id === 'optimizer-monthlyFee') optimizer.monthlyFee = target.value;
    if (target.id === 'optimizer-investment') optimizer.investment = target.value;
    if (target.id === 'optimizer-apr') optimizer.apr = target.value;

    // Clear previous result to avoid showing stale data when inputs change.
    if (optimizer.result) {
        optimizer.result = null;
        renderAnalysisSection();
    }
}

function handleOptimizerLogic(action) {
    const optimizer = state.yieldDashboard.optimizer;
    if (action === 'reset') {
        optimizer.monthlyFee = '';
        optimizer.investment = '';
        optimizer.apr = '';
        optimizer.result = null;
    } else if (action === 'start') {
        const { portfolio } = state.yieldDashboard;
        const totalInvestment = portfolio.reduce((acc, pos) => acc + (parseFloat(pos.investment) || 0), 0);
        const weightedAprSum = portfolio.reduce((acc, pos) => acc + (parseFloat(pos.investment) || 0) * (parseFloat(pos.apr) || 0), 0);
        const averageApr = totalInvestment > 0 ? weightedAprSum / totalInvestment : 0;
        const monthlyYield = totalInvestment * (averageApr / 100 / 12);
        
        optimizer.monthlyFee = monthlyYield > 0 ? monthlyYield.toFixed(2) : '';
        optimizer.investment = totalInvestment > 0 ? totalInvestment.toFixed(2) : '';
        optimizer.apr = averageApr > 0 ? averageApr.toFixed(2) : '';
        optimizer.result = null; // Clear result when starting with portfolio
    } else if (action === 'run') {
        const monthlyFee = parseFloat(optimizer.monthlyFee);
        const investment = parseFloat(optimizer.investment);
        const apr = parseFloat(optimizer.apr);
        
        const filledCount = [monthlyFee, investment, apr].filter(v => !isNaN(v)).length;
        if (filledCount !== 2) {
            utils.showToast('optimizerError', 'error');
            return;
        }

        let result = { fee: monthlyFee, investment: investment, apr: apr };
        if (isNaN(monthlyFee)) {
            result.fee = investment * (apr / 100 / 12);
        } else if (isNaN(investment)) {
            result.investment = apr > 0 ? monthlyFee / (apr / 100 / 12) : 0;
        } else { // apr is NaN
            result.apr = investment > 0 ? (monthlyFee * 12 / investment) * 100 : 0;
        }
        optimizer.result = result;
        
        // Update the state with the calculated values so the inputs repopulate
        optimizer.monthlyFee = result.fee > 0 ? result.fee.toFixed(2) : '';
        optimizer.investment = result.investment > 0 ? result.investment.toFixed(2) : '';
        optimizer.apr = result.apr > 0 ? result.apr.toFixed(2) : '';
    }

    renderAnalysisSection();
}

function handleImportFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        handleImportCSV(event.target.result);
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
}

function handleImportCSV(csvText) {
    try {
        const lines = csvText.trim().split(/\r?\n/);
        const header = lines[0].split(',').map(h => h.trim());
        const assetIndex = header.indexOf('asset');
        const investmentIndex = header.indexOf('investment');
        const aprIndex = header.indexOf('apr');

        if (assetIndex === -1 || investmentIndex === -1 || aprIndex === -1) {
            throw new Error("CSV must contain 'asset', 'investment', and 'apr' columns.");
        }

        const newPortfolio = lines.slice(1).map(line => {
            const values = line.split(',');
            return {
                id: `pos_${Date.now()}_${Math.random()}`,
                asset: values[assetIndex],
                investment: values[investmentIndex],
                apr: values[aprIndex],
                selected: false,
            };
        });

        state.yieldDashboard.portfolio = newPortfolio;
        saveYieldPortfolioToStorage();
        renderYieldDashboard();
        utils.showToast('toastImportSuccess', 'success');
    } catch (error) {
        console.error("CSV Import Error:", error);
        utils.showToast('toastImportError', 'error');
    }
}

function handleExportCSV() {
    try {
        const portfolio = state.yieldDashboard.portfolio;
        if (portfolio.length === 0) return;
        
        const header = ['asset', 'investment', 'apr'];
        const rows = portfolio.map(pos => 
            [pos.asset, pos.investment, pos.apr].join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + header.join(',') + "\n" + rows.join("\n");
        
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `yield_portfolio_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        utils.showToast('toastExportSuccess', 'success');
    } catch (error) {
         console.error("CSV Export Error:", error);
        utils.showToast('toastExportError', 'error');
    }
}

function handleExportPDF() {
    const { portfolio } = state.yieldDashboard;
    if (portfolio.length === 0) return;
    const t = translations[state.lang];
    const doc = new jsPDF();
    
    // --- Calculate summary data ---
    const totalInvestment = portfolio.reduce((acc, pos) => acc + (parseFloat(pos.investment) || 0), 0);
    const weightedAprSum = portfolio.reduce((acc, pos) => acc + (parseFloat(pos.investment) || 0) * (parseFloat(pos.apr) || 0), 0);
    const averageApr = totalInvestment > 0 ? weightedAprSum / totalInvestment : 0;
    const dailyYield = totalInvestment * (averageApr / 100 / 365);
    const monthlyYield = dailyYield * 30;

    // --- Report Header ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(47, 79, 79); // DarkSlateGray
    doc.text(t.pdfReportTitleYield, 14, 22);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128); // Gray
    doc.text(`${t.pdfGeneratedOn}: ${new Date().toLocaleDateString(state.lang)}`, 14, 28);

    // --- Summary Cards ---
    let yPos = 40;
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(t.portfolioSummaryTitle, 14, yPos);
    yPos += 5;

    const summaryData = [
        { label: t.totalInvestment, value: utils.formatCurrency(totalInvestment), color: [67, 56, 202] }, // Indigo
        { label: t.averageApr, value: utils.formatPercent(averageApr), color: [8, 145, 178] }, // Cyan
        { label: t.totalDailyYield, value: utils.formatCurrency(dailyYield), color: [5, 150, 105] }, // Emerald
        { label: t.totalMonthlyYield, value: utils.formatCurrency(monthlyYield), color: [5, 150, 105] }, // Emerald
    ];

    const cardWidth = (doc.internal.pageSize.getWidth() - 28 - 15) / 4;
    const cardHeight = 25;
    summaryData.forEach((item, index) => {
        const x = 14 + index * (cardWidth + 5);
        doc.setFillColor(248, 250, 252); // slate-50
        doc.roundedRect(x, yPos, cardWidth, cardHeight, 3, 3, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(item.label, x + cardWidth / 2, yPos + 8, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(item.color[0], item.color[1], item.color[2]);
        doc.text(item.value, x + cardWidth / 2, yPos + 18, { align: 'center' });
        doc.setFont('helvetica', 'normal');
    });

    yPos += cardHeight + 15;
    
    // --- Asset Allocation Chart ---
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(t.pdfAssetAllocation, 14, yPos);
    yPos += 7;

    const allocationData = portfolio.map(p => ({
        asset: p.asset,
        investment: parseFloat(p.investment) || 0,
        percentage: totalInvestment > 0 ? ((parseFloat(p.investment) || 0) / totalInvestment) * 100 : 0
    })).sort((a, b) => b.investment - a.investment);
    
    const chartColors = ['#4f46e5', '#0891b2', '#059669', '#d97706', '#be123c'];
    const maxBarWidth = 100;
    allocationData.slice(0, 5).forEach((item, index) => {
        if(yPos > 260) { doc.addPage(); yPos = 20; }
        doc.setFontSize(10);
        doc.setTextColor(80,80,80);
        doc.text(item.asset, 14, yPos);
        const barWidth = (item.percentage / 100) * maxBarWidth;
        doc.setFillColor(chartColors[index % chartColors.length]);
        doc.rect(80, yPos - 4, barWidth, 5, 'F');
        doc.text(`${item.percentage.toFixed(1)}%`, 85 + maxBarWidth, yPos);
        yPos += 10;
    });


    // --- Portfolio Detail Table ---
    yPos += 5;
    if(yPos > 250) { doc.addPage(); yPos = 20; }
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text(t.assetCol + ' Details', 14, yPos);
    yPos += 2;

    const tableColumns = [t.assetCol, t.investmentCol, t.aprCol, t.dailyCol, t.monthlyCol];
    const tableRows = portfolio.map(pos => {
        const investment = parseFloat(pos.investment) || 0;
        const apr = parseFloat(pos.apr) || 0;
        const daily = investment * (apr / 100 / 365);
        const monthly = daily * 30;
        return [
            pos.asset,
            utils.formatCurrency(investment),
            utils.formatPercent(apr),
            utils.formatCurrency(daily),
            utils.formatCurrency(monthly)
        ];
    });

    autoTable(doc, {
        startY: yPos,
        head: [tableColumns],
        body: tableRows,
        foot: [[
            t.pdfTotal,
            utils.formatCurrency(totalInvestment),
            utils.formatPercent(averageApr),
            utils.formatCurrency(dailyYield),
            utils.formatCurrency(monthlyYield)
        ]],
        theme: 'grid',
        headStyles: { fillColor: [47, 79, 79], textColor: 255 },
        footStyles: { fillColor: [230, 230, 230], textColor: 40, fontStyle: 'bold' },
        didDrawPage: function(data) {
            // Footer
            const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
            doc.setFontSize(8);
            doc.setTextColor(150,150,150);
            doc.text(`${t.footerDisclaimer} | Apecoft Tool Suite`, 14, pageHeight - 10);
            doc.text(`Page ${doc.internal.getNumberOfPages()}`, doc.internal.pageSize.getWidth() - 20, pageHeight - 10);
        }
    });

    // --- Save ---
    doc.save(`Yield_Report_${new Date().toISOString().split('T')[0]}.pdf`);
}


// --- Guide Modal ---
function getYieldGuideContent() {
    const t = translations[state.lang];
    
    const listItem = (num, titleKey, contentKey) => `
        <li>
            <span class="rule-number">${num}</span>
            <div class="rule-text">
                <strong class="text-indigo-400" data-i18n-key="${titleKey}"></strong>
                <p class="mt-1 text-slate-400" data-i18n-key="${contentKey}"></p>
            </div>
        </li>`;

    const advancedToolsContent = `
        <li>
            <span class="rule-number">3</span>
            <div class="rule-text">
                <strong class="text-indigo-400" data-i18n-key="guideYieldStep3Title"></strong>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-3">
                    <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <h5 class="font-bold text-amber-400" data-i18n-key="optimizerTitle"></h5>
                        <p class="text-slate-400 text-sm mt-1" data-i18n-key="guideYieldStep3Content_Optimizer"></p>
                        <div class="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-sm">
                            <strong>${t.exampleTitle || 'Example'}:</strong> ${t.optimizerResultSentence
                                .replace('{fee}', '$500')
                                .replace('{investment}', '$25,000')
                                .replace('{apr}', '24%')}
                        </div>
                    </div>
                    <div class="p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                        <h5 class="font-bold text-amber-400" data-i18n-key="riskAnalysisTitle"></h5>
                        <p class="text-slate-400 text-sm mt-1" data-i18n-key="guideYieldStep3Content_Risk"></p>
                        <div class="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50 text-sm">
                             <strong>${t.exampleTitle || 'Example'}:</strong> ${t.riskToleranceResult
                                 .replace('{daily}', '1.2%')
                                 .replace('{monthly}', '36%')}
                        </div>
                    </div>
                </div>
            </div>
        </li>`;

    const riskSectionHTML = `
        <div class="mt-6 p-4 bg-red-900/20 rounded-lg border border-red-500/30 text-slate-400 text-sm space-y-3">
            <h4 class="font-bold text-amber-400 flex items-center gap-2 -mt-1 mb-2" data-i18n-key="yieldGuideRiskTitle"></h4>
            <p data-i18n-key="yieldGuideRiskPlatform"></p>
            <p data-i18n-key="yieldGuideRiskVolatility"></p>
            <p data-i18n-key="yieldGuideRiskAPR"></p>
            <hr class="border-red-500/20 !my-3"/>
            <p data-i18n-key="yieldGuideRiskDisclaimer"></p>
        </div>`;

    return `
        <p class="mb-4" data-i18n-key="yieldGuideIntro"></p>
        <ol class="rules-list">
            ${listItem(1, 'guideYieldStep1Title', 'guideYieldStep1Content')}
            ${listItem(2, 'guideYieldStep2Title', 'guideYieldStep2Content')}
            ${advancedToolsContent}
            ${listItem(4, 'guideYieldStep4Title', 'guideYieldStep4Content')}
        </ol>
        ${riskSectionHTML}
    `;
}

function showYieldGuide() {
    const content = getYieldGuideContent();
    utils.openGuideModal('yieldGuideTitle', content);
    utils.translateUI(state.lang); // Important to translate the newly injected content
}


// --- EXPORT MODULE ---
export const yieldApp = {
    initialState,
    initialize: initializeYield,
    render: renderYieldDashboard
};
