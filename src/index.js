

import { translations } from './i18n/translations.js';
import { calculatorApp } from './apps/calculator.js';
import { yieldApp } from './apps/yield.js';
import { luckApp } from './games/luck.js';
import { comparatorApp } from './apps/comparator.js';
import { ptCalculatorApp } from './apps/pt-calculator.js';
import { moonSheetApp } from './apps/moon-sheet.js';
import { airdropApp } from './apps/airdrop.js';
import { yieldFinderApp } from './apps/yield-finder.js';
import { makeItOrRektItApp } from './apps/make-it-or-rekt-it.js';
import { repayOrInvestApp } from './apps/repay-or-invest.js';
import QRCode from 'qrcode';
import { fetchTopTokens } from './services/cryptoService.js';
import { CoinSelector } from './components/CoinSelector.js';
import { playLandingIntro, transitionView, pulseInput, setupCardSpotlight, startHoldProgress, cancelHoldProgress, revealOnScroll, playToolIntro } from './animations.js';


const SUI_WALLET_ADDRESS = '0x6c1d3e6dce6a63d6423c8417e6ab90b40500a23f71f11f9184fb5cacf59dd677';

// --- STATE MANAGEMENT ---
const state = {
  currentView: 'landing', // 'landing', 'calculator', 'yield-dashboard', 'comparator', 'luck-game', 'pt-calculator', 'donation', 'moon-sheet', 'airdrop', 'yield-finder', 'make-it-or-rekt-it', 'repay-or-invest'
  lang: 'en',
  allCoins: [], // Global cache for all supported coins
  isLoadingAllCoins: false,
  
  // App-specific states are imported from their modules
  calculator: calculatorApp.initialState,
  yieldDashboard: yieldApp.initialState,
  comparator: comparatorApp.initialState,
  luckGame: luckApp.initialState,
  ptCalculator: ptCalculatorApp.initialState,
  moonSheet: moonSheetApp.initialState,
  airdrop: airdropApp.initialState,
  yieldFinder: yieldFinderApp.initialState,
  makeItOrRektIt: makeItOrRektItApp.initialState,
  repayOrInvest: repayOrInvestApp.initialState,
};

// --- DOM ELEMENT REFERENCES (SHARED) ---
const elements = {
  root: document.getElementById('root'),
  modalContainer: document.getElementById('modal-container'),
  toastContainer: document.getElementById('toast-container'),

  // Views
  landingPage: document.getElementById('landing-page'),
  calculatorApp: document.getElementById('calculator-app'),
  yieldDashboard: document.getElementById('yield-dashboard'),
  yieldFinderApp: document.getElementById('yield-finder-app'),
  comparatorApp: document.getElementById('comparator-app'),
  luckGameApp: document.getElementById('luck-game-app'),
  ptCalculatorApp: document.getElementById('pt-calculator-app'),
  moonSheetApp: document.getElementById('moon-sheet-app'),
  airdropApp: document.getElementById('airdrop-app'),
  donationPage: document.getElementById('donation-page'),
  makeItOrRektItApp: document.getElementById('make-it-or-rekt-it-app'),
  repayOrInvestApp: document.getElementById('repay-or-invest-app'),
  
  // Navigation
  launchCalculatorBtn: document.getElementById('launch-calculator-btn'),
  launchYieldDashboardBtn: document.getElementById('launch-yield-dashboard-btn'),
  launchYieldFinderBtn: document.getElementById('launch-yield-finder-btn'),
  launchComparatorBtn: document.getElementById('launch-comparator-btn'),
  launchLuckGameBtn: document.getElementById('launch-luck-game-btn'),
  launchPtCalculatorBtn: document.getElementById('launch-pt-calculator-btn'),
  launchMoonSheetBtn: document.getElementById('launch-moon-sheet-btn'),
  launchAirdropAppBtn: document.getElementById('launch-airdrop-app-btn'),
  launchDonationBtn: document.getElementById('launch-donation-btn'),
  launchMakeItOrRektItBtn: document.getElementById('launch-make-it-or-rekt-it-btn'),
  launchRepayOrInvestBtn: document.getElementById('launch-repay-or-invest-btn'),
  
  // Donation page specific
  qrCodeContainer: document.getElementById('qr-code-container'),
  copyAddressBtn: document.getElementById('copy-address-btn'),
  
  // Confirmation Modal
  confirmationModal: document.getElementById('confirmation-modal'),
  confirmationTitle: document.getElementById('confirmation-title'),
  confirmationConfirmBtn: document.getElementById('confirmation-confirm-btn'),
  confirmationCancelBtn: document.getElementById('confirmation-cancel-btn'),

  // Guide Modal
  guideModal: document.getElementById('guide-modal'),
  guideModalTitle: document.getElementById('guide-modal-title'),
  guideModalContent: document.getElementById('guide-modal-content'),
  guideModalCloseBtn: document.getElementById('guide-modal-close-btn'),
};

// --- UTILITY & FORMATTING FUNCTIONS ---
const formatValue = (value, digits = 2, isManual = false, manualSymbol = 'USD') => {
    if (isManual) {
        const symbol = manualSymbol.toUpperCase();
        return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value)} ${symbol}`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
};
const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};
const formatNumber = (value) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(value);
const formatPercent = (value, minDigits = 2, maxDigits) => {
    if (maxDigits === undefined) maxDigits = minDigits;
    return `${new Intl.NumberFormat('en-US', { minimumFractionDigits: minDigits, maximumFractionDigits: maxDigits }).format(value)}%`;
};
const formatBigNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (num < 1e3) return num.toString();
    if (num >= 1e3 && num < 1e6) return +(num / 1e3).toFixed(1) + 'K';
    if (num >= 1e6 && num < 1e9) return +(num / 1e6).toFixed(1) + 'M';
    if (num >= 1e9 && num < 1e12) return +(num / 1e9).toFixed(1) + 'B';
    if (num >= 1e12) return +(num / 1e12).toFixed(1) + 'T';
};

// --- UI FEEDBACK (MODALS & TOASTS) ---
function showToast(messageKey, type = 'success') {
    const t = translations[state.lang];
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = t[messageKey] || messageKey;
    toast.setAttribute('role', 'alert');
    elements.toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 4000);
}

function showConfirmationModal({ titleKey, messageKey, confirmTextKey, onConfirm, messageParams = {} }) {
    const t = translations[state.lang];
    
    let message = t[messageKey] || messageKey;
    for (const key in messageParams) {
        message = message.replace(`{${key}}`, messageParams[key]);
    }
    
    elements.confirmationTitle.textContent = message;
    
    elements.confirmationConfirmBtn.textContent = t[confirmTextKey] || confirmTextKey;
    elements.confirmationCancelBtn.textContent = t.cancelBtn || 'Cancel';

    const confirmHandler = () => {
        hideConfirmationModal();
        onConfirm();
    };

    elements.confirmationConfirmBtn.onclick = confirmHandler;
    elements.confirmationModal.classList.add('open');
}

function hideConfirmationModal() {
    elements.confirmationModal.classList.remove('open');
    elements.confirmationConfirmBtn.onclick = null;
}

function openGuideModal(titleKey, contentHTML) {
    const t = translations[state.lang];
    elements.guideModalTitle.textContent = t[titleKey] || titleKey;
    elements.guideModalContent.innerHTML = contentHTML;
    elements.guideModal.classList.add('open');
}

function closeGuideModal() {
    elements.guideModal.classList.remove('open');
}


// --- INTERNATIONALIZATION (i18n) ---
function translateUI(lang) {
  document.querySelectorAll('[data-i18n-key]').forEach(el => {
    const key = el.getAttribute('data-i18n-key');
    let text = translations[lang]?.[key] || translations['en'][key];
    
    if (text === undefined || text === null) return;

    const params = el.dataset;
    Object.keys(params).forEach(pKey => {
      if (pKey.startsWith('i18nParam')) {
        const paramName = pKey.substring(9).toLowerCase(); // e.g., i18nParamDays -> days
        const paramValue = params[pKey];
        text = text.replace(new RegExp(`\\{${paramName}\\}`, 'g'), paramValue);
      }
    });

    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        if(el.placeholder !== text) el.placeholder = text;
    } else if (el.hasAttribute('aria-label')) {
        if(el.getAttribute('aria-label') !== text) el.setAttribute('aria-label', text); 
    } else {
        if(el.innerHTML !== text) el.innerHTML = text;
    }
  });
  
  let titleKey;
  switch(state.currentView) {
    case 'calculator': titleKey = 'htmlTitle'; break;
    case 'yield-dashboard': titleKey = 'yieldCalculatorTitle'; break;
    case 'yield-finder': titleKey = 'seekerToolTitle'; break;
    case 'comparator': titleKey = 'comparatorHeaderTitle'; break;
    case 'luck-game': titleKey = 'luckGameTitle'; break;
    case 'pt-calculator': titleKey = 'ptHeaderTitle'; break;
    case 'moon-sheet': titleKey = 'moonSheetHeaderTitle'; break;
    case 'airdrop': titleKey = 'airdropHeaderTitle'; break;
    case 'donation': titleKey = 'donationHeader'; break;
    case 'make-it-or-rekt-it': titleKey = 'makeItOrRektItHeaderTitle'; break;
    case 'repay-or-invest': titleKey = 'repayOrInvestHeaderTitle'; break;
    default: titleKey = 'landingTitle'; break;
  }
  document.title = translations[state.lang]?.[titleKey] || translations['en'][titleKey];
}

// --- VIEW MANAGEMENT ---
function setView(viewName) {
    state.currentView = viewName;

    transitionView(elements.root, () => {
        elements.landingPage.style.display = viewName === 'landing' ? 'flex' : 'none';
        elements.calculatorApp.style.display = viewName === 'calculator' ? 'block' : 'none';
        elements.yieldDashboard.style.display = viewName === 'yield-dashboard' ? 'block' : 'none';
        elements.yieldFinderApp.style.display = viewName === 'yield-finder' ? 'block' : 'none';
        elements.comparatorApp.style.display = viewName === 'comparator' ? 'block' : 'none';
        elements.luckGameApp.style.display = viewName === 'luck-game' ? 'block' : 'none';
        elements.ptCalculatorApp.style.display = viewName === 'pt-calculator' ? 'block' : 'none';
        elements.moonSheetApp.style.display = viewName === 'moon-sheet' ? 'block' : 'none';
        elements.airdropApp.style.display = viewName === 'airdrop' ? 'block' : 'none';
        elements.donationPage.style.display = viewName === 'donation' ? 'block' : 'none';
        elements.makeItOrRektItApp.style.display = viewName === 'make-it-or-rekt-it' ? 'block' : 'none';
        elements.repayOrInvestApp.style.display = viewName === 'repay-or-invest' ? 'block' : 'none';
    
        // Collect all shared context to pass to modules
        const context = {
            state,
            elements,
            utils: { formatValue, formatCurrency, formatNumber, formatPercent, formatBigNumber, showToast, translateUI, showConfirmationModal, openGuideModal },
        };

        if (viewName === 'calculator' && !state.calculator.initialized) {
            calculatorApp.initialize(context);
        } else if (viewName === 'yield-dashboard' && !state.yieldDashboard.initialized) {
            yieldApp.initialize(context);
        } else if (viewName === 'yield-finder' && !state.yieldFinder.initialized) {
            yieldFinderApp.initialize(context);
        } else if (viewName === 'comparator' && !state.comparator.initialized) {
            comparatorApp.initialize(context);
        } else if (viewName === 'luck-game' && !state.luckGame.initialized) {
            luckApp.initialize(context);
        } else if (viewName === 'pt-calculator' && !state.ptCalculator.initialized) {
            ptCalculatorApp.initialize(context);
        } else if (viewName === 'moon-sheet' && !state.moonSheet.initialized) {
            moonSheetApp.initialize(context);
        } else if (viewName === 'airdrop' && !state.airdrop.initialized) {
            airdropApp.initialize(context);
        } else if (viewName === 'make-it-or-rekt-it' && !state.makeItOrRektIt.initialized) {
            makeItOrRektItApp.initialize(context);
        } else if (viewName === 'repay-or-invest' && !state.repayOrInvest.initialized) {
            repayOrInvestApp.initialize(context);
        }

        // Specific actions on view change
        if (viewName === 'luck-game') {
            luckApp.resetToSelection(context);
        }
        if (viewName === 'yield-finder') {
            yieldFinderApp.resetToSelection(context);
        }

        translateUI(state.lang); // Ensure UI is translated for the new view
        window.scrollTo(0, 0);

        if (viewName === 'landing') {
            playLandingIntro();
        } else {
            // Reveal any [data-reveal] sections in the newly shown tool view.
            const activeView = elements.root.querySelector('[id$="-app"]:not([style*="display: none"]), #yield-dashboard:not([style*="display: none"])');
            revealOnScroll(activeView || elements.root);
            // Stagger the input/result panels of card-based tool views on enter.
            if (viewName === 'calculator') {
                playToolIntro(elements.calculatorApp);
            } else if (viewName === 'yield-dashboard') {
                playToolIntro(elements.yieldDashboard, '#yield-analysis-container > div, #yield-dashboard-main-content > .shadow-md');
            }
        }
    });
}

// --- SHARED RENDER & EVENT HANDLERS ---
function renderLangSelector() {
    const container = document.getElementById('global-lang-selector-placeholder');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'flex items-center gap-x-2'; // Add gap for spacing

    const langs = [{code: 'en', name: 'EN'}, {code: 'th', name: 'TH'}, {code: 'ko', name: 'KO'}];
    langs.forEach(langInfo => {
        const button = document.createElement('button');
        button.textContent = langInfo.name;
        
        if (langInfo.code === 'en') {
            button.className = `px-3 py-1.5 text-sm font-bold rounded-md transition-colors bg-cyan-500 text-slate-900`;
        } else {
            button.className = `px-3 py-1.5 text-sm font-bold rounded-md transition-colors bg-slate-700 text-slate-300 filter blur-sm opacity-50 cursor-not-allowed`;
            button.disabled = true;
        }
        container.appendChild(button);
    });
}

function setupCustomNumberInputs() {
    document.body.addEventListener('click', (e) => {
        const target = e.target;
        const isIncrement = target.classList.contains('increment-btn');
        const isDecrement = target.classList.contains('decrement-btn');
        if (!isIncrement && !isDecrement) return;

        const container = target.closest('.custom-number-input');
        if (!container) return;
        
        let input;
        if (target.dataset.inputId) {
            input = document.getElementById(target.dataset.inputId);
        } else {
            input = container.querySelector('input[type="number"]');
        }

        if (!input) return;

        const getPriceStep = (price) => {
            if (price >= 1000) return 10; if (price >= 100) return 1; if (price >= 1) return 0.1;
            if (price >= 0.01) return 0.001; if (price >= 0.0001) return 0.00001;
            return 0.000001;
        };
        const getPrecision = (value) => (String(value).split('.')[1] || '').length;

        const stepType = input.dataset.step;
        const stepValue = stepType === 'auto' ? getPriceStep(parseFloat(input.value) || 0) : parseFloat(stepType) || 1;
        const amount = isIncrement ? stepValue : -stepValue;
        const oldValue = parseFloat(input.value) || 0;
        let newValue = oldValue + amount;

        const finalPrecision = Math.max(getPrecision(stepValue), getPrecision(oldValue));
        newValue = parseFloat(newValue.toFixed(Math.min(finalPrecision, 8)));
        const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
        if (newValue < min) newValue = min;
        input.value = newValue;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        pulseInput(input);
    });
}

async function generateQRCode() {
    try {
        const canvas = document.createElement('canvas');
        await QRCode.toCanvas(canvas, SUI_WALLET_ADDRESS, { width: 220, margin: 1, color: { dark: '#1e293b', light: '#ffffff' } });
        elements.qrCodeContainer.innerHTML = '';
        elements.qrCodeContainer.appendChild(canvas);
    } catch (err) {
        console.error('Failed to generate QR code', err);
        elements.qrCodeContainer.textContent = 'Error generating QR Code.';
    }
}

function handleCopyAddress() {
    navigator.clipboard.writeText(SUI_WALLET_ADDRESS).then(() => {
        showToast('toastAddressCopied', 'success');
    }).catch(err => {
        console.error('Failed to copy address:', err);
    });
}

async function loadGlobalCoinList() {
    if (state.allCoins.length > 0) return;
    state.isLoadingAllCoins = true;
    try {
        state.allCoins = await fetchTopTokens();
        CoinSelector.update(state.allCoins); // Update the selector's internal list
    } catch (e) {
        console.error("Failed to load global coin list", e);
        // Modules will show their own errors if they need the list and it's empty
    } finally {
        state.isLoadingAllCoins = false;
    }
}


// --- INITIALIZATION ---
async function initialize() {
    const savedLang = localStorage.getItem('appLanguage') || 'en';
    state.lang = 'en'; // Force english
    
    renderLangSelector();
    setupCustomNumberInputs();
    setupCardSpotlight(elements.landingPage);
    generateQRCode();
    
    // Standard click listeners
    elements.launchCalculatorBtn.addEventListener('click', () => setView('calculator'));
    elements.launchYieldDashboardBtn.addEventListener('click', () => setView('yield-dashboard'));
    elements.launchComparatorBtn.addEventListener('click', () => setView('comparator'));
    elements.launchLuckGameBtn.addEventListener('click', () => setView('luck-game'));
    elements.launchPtCalculatorBtn.addEventListener('click', () => setView('pt-calculator'));
    elements.launchDonationBtn.addEventListener('click', (e) => { e.preventDefault(); setView('donation'); });

    // --- Dev Lock Long-Press Logic ---
    let pressTimer;
    let pressedCard = null;

    const handlePressStart = (element, view) => {
        pressedCard = element;
        startHoldProgress(element);
        pressTimer = setTimeout(() => {
            cancelHoldProgress(element);
            setView(view);
        }, 5000);
    };

    const handlePressEnd = () => {
        clearTimeout(pressTimer);
        if (pressedCard) {
            cancelHoldProgress(pressedCard);
            pressedCard = null;
        }
    };

    const setupLongPress = (element, viewName) => {
        if (!element) return;
        element.addEventListener('mousedown', () => handlePressStart(element, viewName));
        element.addEventListener('mouseup', handlePressEnd);
        element.addEventListener('mouseleave', handlePressEnd);
        element.addEventListener('touchstart', (e) => { e.preventDefault(); handlePressStart(element, viewName); }, { passive: false });
        element.addEventListener('touchend', handlePressEnd);
    };

    setupLongPress(elements.launchYieldFinderBtn, 'yield-finder');
    setupLongPress(elements.launchMoonSheetBtn, 'moon-sheet');
    setupLongPress(elements.launchAirdropAppBtn, 'airdrop');
    setupLongPress(elements.launchMakeItOrRektItBtn, 'make-it-or-rekt-it');
    setupLongPress(elements.launchRepayOrInvestBtn, 'repay-or-invest');
    
    // Delegated listener for all back buttons
    elements.root.addEventListener('click', e => {
        const backButton = e.target.closest('[id^="back-to-landing-"]');
        if (backButton) {
            setView('landing');
        }
    });

    elements.copyAddressBtn.addEventListener('click', handleCopyAddress);
    
    // Modal listeners
    elements.confirmationCancelBtn.addEventListener('click', hideConfirmationModal);
    elements.confirmationModal.addEventListener('click', (e) => {
        if(e.target === elements.confirmationModal) hideConfirmationModal();
    });

    elements.guideModalCloseBtn.addEventListener('click', closeGuideModal);
    elements.guideModal.addEventListener('click', (e) => {
        if(e.target === elements.guideModal) closeGuideModal();
    });

    setView('landing'); 
    await loadGlobalCoinList();
}

// The document may already be interactive/complete by the time this module
// evaluates (module graphs load asynchronously), so don't rely solely on
// DOMContentLoaded or initialization silently never runs.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
} else {
    initialize();
}