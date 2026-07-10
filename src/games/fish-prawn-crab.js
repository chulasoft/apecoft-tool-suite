
import { translations } from '../i18n/translations.js';
import { createInfoIcon, createTwitterIcon } from '../components/icons.js';

let state, elements, utils, luckElements;
let timerInterval = null;

const SINGLE_ITEMS = ['crab', 'fish', 'gourd', 'tiger', 'chicken', 'prawn'];
const PAIRS = {
    'crab-gourd': ['crab', 'gourd'],
    'tiger-prawn': ['tiger', 'prawn'],
    'gourd-chicken': ['gourd', 'chicken'],
    'prawn-fish': ['prawn', 'fish'],
    'crab-chicken': ['crab', 'chicken'],
    'tiger-fish': ['tiger', 'fish'],
    'gourd-tiger': ['gourd', 'tiger'],
    'prawn-crab': ['prawn', 'crab'],
};
const ALL_BET_SPOTS = [...SINGLE_ITEMS, ...Object.keys(PAIRS)];

const CHIP_VALUES = [1000, 5000, 10000, 50000];
const INITIAL_PLAYER_CAPITAL = 100000000;
const INITIAL_HOST_CAPITAL = 500000000;
const BETTING_TIME = 15;


function getInitialState() {
    return {
        status: 'idle', // 'idle', 'betting', 'rolling', 'post-result', 'gameover'
        isPaused: false,
        playerCapital: INITIAL_PLAYER_CAPITAL,
        hostCapital: INITIAL_HOST_CAPITAL,
        bets: ALL_BET_SPOTS.reduce((acc, item) => ({ ...acc, [item]: 0 }), {}),
        selectedChip: CHIP_VALUES[0],
        timer: BETTING_TIME,
        lastRoll: [],
        payouts: {}, // Stores profit per winning spot for highlighting
        payoutDetails: null, // { stakeReturned, profitWon, stakeLost, netResult }
        winner: null,
    };
}

function initialize(context, sharedLuckElements) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;
    luckElements = sharedLuckElements;
}

function cleanUp() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function reset() {
    cleanUp();
    state.luckGame.brownVelvet = getInitialState();
    render();
}

function handleEvent(e) {
    // Handle right-click for bet removal
    if (e.type === 'contextmenu') {
        const betSpot = e.target.closest('.fpc-bet-spot');
        if (betSpot) {
            e.preventDefault();
            handleBetRemoval(betSpot.dataset.item);
        }
        return;
    }

    const target = e.target.closest('button');
    if (!target) return;
    
    // Check if game is paused and the action is not resume
    if (state.luckGame.brownVelvet.isPaused && target.id !== 'fpc-resume-btn') return;

    if (target.id === 'fpc-start-btn') startGame();
    if (target.id === 'fpc-next-round-btn') startNextRound();
    if (target.id === 'fpc-pause-btn' || target.id === 'fpc-resume-btn') togglePause();
    if (target.classList.contains('fpc-bet-spot')) handleBetPlacement(target.dataset.item);
    if (target.classList.contains('fpc-chip')) handleChipSelect(Number(target.dataset.value));
    if (target.id === 'fpc-roll-btn') handleRoll();
    if (target.id === 'fpc-clear-btn') handleClearBets();
    if (target.id === 'fpc-play-again-btn') reset();
    if (target.id === 'fpc-share-btn') handleShareToTwitter();
}

// --- RENDER FUNCTIONS ---

function render() {
    const t = translations[state.lang];
    const game = state.luckGame.brownVelvet;

    const renderHeader = () => {
        const pauseButton = `
         <button id="${game.isPaused ? 'fpc-resume-btn' : 'fpc-pause-btn'}" class="flex items-center gap-2 px-3 py-1.5 text-sm font-bold rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition-colors">
            ${game.isPaused 
                ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M7 6.22C7 5.23 7.94 4.51 8.85 4.9L17.15 9.18C18.06 9.63 18.06 10.87 17.15 11.32L8.85 15.6C7.94 16.05 7 15.33 7 14.28V6.22Z"/></svg>`
                : `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M9 19.38H7C6.34 19.38 5.81 18.85 5.81 18.19V5.81C5.81 5.15 6.34 4.62 7 4.62H9C9.66 4.62 10.19 5.15 10.19 5.81V18.19C10.19 18.85 9.66 19.38 9 19.38ZM17 19.38H15C14.34 19.38 13.81 18.85 13.81 18.19V5.81C13.81 5.15 14.34 4.62 15 4.62H17C17.66 4.62 18.19 5.15 18.19 5.81V18.19C18.19 18.85 17.66 19.38 17 19.38Z"/></svg>`
            }
            <span data-i18n-key="${game.isPaused ? 'fpc_resumeGame' : 'fpc_pauseGame'}"></span>
         </button>`;
        return `<div class="relative flex items-center justify-center mb-4 h-10">
            <button class="back-to-rooms-btn absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                <span data-i18n-key="backToHall"></span>
            </button>
            <h2 class="text-2xl font-bold text-orange-400" data-i18n-key="brownVelvetRoomTitle"></h2>
            <div class="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                ${game.status === 'betting' ? pauseButton : ''}
                <button class="rules-btn p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-room="brown_velvet">${createInfoIcon('h-6 w-6')}</button>
            </div>
        </div>`;
    }

    const renderScoreboard = () => `<div class="grid grid-cols-2 gap-4 text-center p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
        <div>
            <div class="text-sm text-slate-400" data-i18n-key="luckPlayerCapital"></div>
            <div class="text-2xl font-bold text-cyan-400">${utils.formatCurrency(game.playerCapital)}</div>
        </div>
        <div>
            <div class="text-sm text-slate-400" data-i18n-key="luckHostCapital"></div>
            <div class="text-2xl font-bold text-red-400">${utils.formatCurrency(game.hostCapital)}</div>
        </div>
    </div>`;

    const renderBoard = () => {
        const isBetting = game.status === 'betting';
        const isPostResult = game.status === 'post-result';

        const singleSpots = SINGLE_ITEMS.map((item) => {
            const isWinner = isPostResult && game.payouts[item] > 0;
            return `
            <button class="fpc-bet-spot fpc-bg-${item} border-2 border-transparent rounded-lg flex flex-col items-center justify-center p-3 transition-all duration-200 transform hover:scale-105 ${isWinner ? 'fpc-winner' : ''} aspect-square" data-item="${item}" ${!isBetting ? 'disabled' : ''}>
                <span class="text-2xl font-bold text-white mix-blend-plus-lighter capitalize" data-i18n-key="fpc_item_${item}"></span>
                <span class="font-mono text-white text-sm h-6 mt-1">${game.bets[item] > 0 ? utils.formatBigNumber(game.bets[item]) : ''}</span>
            </button>
        `}).join('');

        const pairSpots = Object.keys(PAIRS).map((pairKey) => {
            const isWinner = isPostResult && game.payouts[pairKey] > 0;
            const pairKeyCss = pairKey.replace(/&/g, '').replace(/\s+/g, '-').toLowerCase();
            return `
            <button class="fpc-bet-spot fpc-bg-${pairKeyCss} border-2 border-transparent rounded-lg flex flex-col items-center justify-center p-2 transition-all duration-200 transform hover:scale-105 ${isWinner ? 'fpc-winner' : ''}" data-item="${pairKey}" ${!isBetting ? 'disabled' : ''}>
                 <span class="text-xs text-white mix-blend-plus-lighter text-center" data-i18n-key="fpc_pair_${pairKey.replace('-', '_')}"></span>
                 <span class="font-mono text-xs h-5 mt-1 text-white">${game.bets[pairKey] > 0 ? utils.formatBigNumber(game.bets[pairKey]) : ''}</span>
            </button>
        `}).join('');
        
        return `<div class="space-y-2">
            <div class="grid grid-cols-3 gap-2">
                ${singleSpots}
            </div>
            <div class="grid grid-cols-4 gap-2">
                ${pairSpots}
            </div>
        </div>`;
    };
    
    const renderBettingControls = () => {
        const totalBet = Object.values(game.bets).reduce((sum, val) => sum + val, 0);
        const chips = CHIP_VALUES.map(value => `
            <button class="fpc-chip flex-1 py-2 px-4 rounded-md font-bold text-sm transition-all ${game.selectedChip === value ? 'bg-amber-500 text-slate-900 ring-2 ring-amber-300' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}" data-value="${value}">
                ${utils.formatBigNumber(value)}
            </button>
        `).join('');

        return `<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-4">
            <div class="flex items-center justify-between">
                <div class="text-sm font-bold text-slate-300" data-i18n-key="fpc_totalBet"></div>
                <div class="font-mono text-lg text-white">${utils.formatCurrency(totalBet)}</div>
            </div>
            <div class="flex gap-2">${chips}</div>
            <div class="grid grid-cols-2 gap-4">
                 <button id="fpc-clear-btn" class="w-full bg-slate-600 text-white font-bold py-3 rounded-md hover:bg-slate-500 transition-colors disabled:opacity-50" ${totalBet === 0 ? 'disabled' : ''} data-i18n-key="fpc_clearBets"></button>
                 <button id="fpc-roll-btn" class="w-full bg-red-500 text-white font-bold py-3 rounded-md hover:bg-red-400 transition-colors flex items-center justify-center disabled:opacity-50" ${totalBet === 0 ? 'disabled' : ''}>
                    <span data-i18n-key="fpc_rollDice"></span>
                 </button>
            </div>
            <p class="text-xs text-center text-slate-500 pt-1" data-i18n-key="fpc_removeBetHint"></p>
        </div>`;
    };
    
    const renderPostResultControls = () => {
        const t = translations[state.lang];
        const { payoutDetails } = game;
        if (!payoutDetails) return '';
        
        const { stakeReturned, profitWon, stakeLost, netResult } = payoutDetails;

        let resultMessage = '';
        if (netResult > 0) {
            resultMessage = `<p class="text-2xl font-bold text-green-400" data-i18n-key="fpc_win"></p>`;
        } else if (netResult < 0) {
            resultMessage = `<p class="text-2xl font-bold text-red-400" data-i18n-key="fpc_lose"></p>`;
        } else {
            resultMessage = `<p class="text-2xl font-bold text-slate-300" data-i18n-key="fpc_draw"></p>`;
        }
        
        const resultRow = (labelKey, value, valueClass = '') => `
            <div class="flex justify-between">
                <span data-i18n-key="${labelKey}"></span>
                <span class="font-mono ${valueClass}">${utils.formatCurrency(value)}</span>
            </div>
        `;

        return `
        <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-4 space-y-3">
            <div class="text-center">${resultMessage}</div>
            <div class="text-sm text-slate-300 space-y-2 p-2 bg-slate-900/50 rounded-md">
                ${resultRow('fpc_stakeReturned', stakeReturned, 'text-green-400')}
                ${resultRow('fpc_profitWon', profitWon, 'text-green-400')}
                ${resultRow('fpc_stakeLost', stakeLost, 'text-red-400')}
                <hr class="border-slate-700 !my-1"/>
                ${resultRow('fpc_netResult', netResult, `font-bold ${netResult > 0 ? 'text-green-400' : netResult < 0 ? 'text-red-400' : 'text-slate-300'}`)}
            </div>
            <div class="grid grid-cols-3 gap-2 pt-2">
                <button id="fpc-end-game-btn" class="back-to-rooms-btn w-full bg-slate-600 text-white font-bold py-2 rounded-md hover:bg-slate-500 transition-colors text-sm" data-i18n-key="fpc_endGame"></button>
                <button id="fpc-share-btn" class="w-full bg-slate-800 text-white font-bold py-2 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2" data-i18n-key="fpcShareButton">${createTwitterIcon('w-5 h-5')}</button>
                <button id="fpc-next-round-btn" class="w-full bg-green-500 text-white font-bold py-2 rounded-md hover:bg-green-400 transition-colors text-sm" data-i18n-key="fpc_nextRound"></button>
            </div>
        </div>
        `;
    };


    const renderStatusArea = () => {
        if (game.status === 'betting') {
            return `<div id="fpc-timer-display" class="text-center text-amber-400 font-semibold h-10 flex items-center justify-center" data-i18n-key="fpc_bettingClosesIn" data-i18n-param-seconds="${game.timer}"></div>`;
        }
        if (game.status === 'rolling' || game.status === 'post-result') {
            const dice = game.status === 'rolling' 
                ? [1, 2, 3].map(i => `<div class="h-20 w-20 rounded-lg flex items-center justify-center text-2xl font-bold bg-slate-700/50 text-amber-400 capitalize fpc-rolling-die" style="animation-delay: ${i*0.1}s">?</div>`).join('')
                : game.lastRoll.map(item => {
                    const isWinner = Object.values(game.payouts).some((p, i) => {
                        const spot = Object.keys(game.payouts)[i];
                        if (p <= 0) return false;
                        if (PAIRS[spot]) return PAIRS[spot].includes(item);
                        return spot === item;
                    });
                    return `<div class="h-20 w-20 rounded-lg flex items-center justify-center text-2xl font-bold text-white mix-blend-plus-lighter capitalize p-1 text-center leading-tight fpc-bg-${item} ${isWinner ? 'fpc-die-highlight' : ''}" data-i18n-key="fpc_item_${item}"></div>`;
                  }).join('');
            
            return `<div class="space-y-3 min-h-[180px] flex flex-col items-center justify-center">
                <div class="grid grid-cols-3 gap-4">${dice}</div>
            </div>`;
        }
        return `<div class="h-10"></div>`; // Placeholder
    };
    
    const renderGameOver = () => {
        if (game.status !== 'gameover') return '';
        const hasWon = game.winner === 'player';
        const messageKey = hasWon ? 'fpc_gameOverWin' : 'fpc_gameOverLose';
        const color = hasWon ? 'text-green-400' : 'text-red-400';
        return `
        <div class="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center text-center p-4 z-20">
            <h3 class="text-4xl font-bold ${color} mb-6" data-i18n-key="${messageKey}"></h3>
             <div class="flex items-center gap-4">
                <button id="fpc-play-again-btn" class="bg-amber-500 text-slate-900 font-bold py-3 px-8 rounded-md hover:bg-amber-400 transition-colors text-lg" data-i18n-key="luckPlayAgainBtn"></button>
                <button id="fpc-share-btn" class="bg-slate-800 text-white font-bold py-3 px-8 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-lg" data-i18n-key="fpcShareButton">${createTwitterIcon('w-5 h-5')}</button>
            </div>
        </div>
        `;
    };
    
    const renderPauseOverlay = () => {
        if (!game.isPaused) return '';
        return `
            <div id="fpc-pause-overlay">
                <button id="fpc-resume-btn" class="bg-amber-500 text-slate-900 font-bold py-3 px-8 rounded-md hover:bg-amber-400 transition-colors text-lg" data-i18n-key="fpc_resumeGame"></button>
            </div>
        `;
    }

    let mainContent;
    if (game.status === 'idle') {
        mainContent = `<div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl min-h-[400px] flex flex-col justify-center items-center">
                 <button id="fpc-start-btn" class="bg-orange-500 text-white font-bold py-3 px-8 rounded-md hover:bg-orange-400 transition-colors text-lg">
                    <span data-i18n-key="fpc_startGame"></span>
                 </button>
            </div>`;
    } else {
        const leftColumn = `
            <div class="lg:col-span-3">
                ${renderBoard()}
            </div>
        `;
        
        const rightColumn = `
            <div class="lg:col-span-2 space-y-4">
                ${renderScoreboard()}
                ${renderStatusArea()}
                ${game.status === 'betting' ? renderBettingControls() : ''}
                ${game.status === 'post-result' ? renderPostResultControls() : ''}
            </div>
        `;

        mainContent = `
            <div class="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                ${leftColumn}
                ${rightColumn}
            </div>
        `;
    }

    luckElements.luckGameMain.innerHTML = `
        <div class="relative">
            ${renderHeader()}
            ${mainContent}
            ${renderGameOver()}
            ${renderPauseOverlay()}
        </div>`;
    
    utils.translateUI(state.lang);
}


// --- LOGIC FUNCTIONS ---

function updateTimerDisplay() {
    const t = translations[state.lang];
    const game = state.luckGame.brownVelvet;
    const timerElement = document.getElementById('fpc-timer-display');
    if (timerElement) {
        timerElement.textContent = (t.fpc_bettingClosesIn || '').replace('{seconds}', game.timer);
    }
}

function startGame() {
    state.luckGame.brownVelvet.status = 'betting';
    startBettingTimer();
}

function startNextRound() {
    const game = state.luckGame.brownVelvet;
    if (game.playerCapital <= 0 || game.hostCapital <= 0) {
        game.winner = game.playerCapital > 0 ? 'player' : 'host';
        game.status = 'gameover';
    } else {
        game.status = 'betting';
        game.bets = ALL_BET_SPOTS.reduce((acc, item) => ({ ...acc, [item]: 0 }), {});
        game.lastRoll = [];
        game.payouts = {};
        game.payoutDetails = null;
        startBettingTimer();
    }
    render();
}

function togglePause() {
    const game = state.luckGame.brownVelvet;
    game.isPaused = !game.isPaused;
    render();
}

function startBettingTimer() {
    cleanUp();
    const game = state.luckGame.brownVelvet;
    game.timer = BETTING_TIME;
    render();
    
    timerInterval = setInterval(() => {
        if (!game.isPaused) {
            game.timer--;
            if (game.timer <= 0) {
                handleRoll();
            } else {
                updateTimerDisplay();
            }
        }
    }, 1000);
}

function handleChipSelect(value) {
    state.luckGame.brownVelvet.selectedChip = value;
    render();
}

function handleBetPlacement(item) {
    const game = state.luckGame.brownVelvet;
    const newBet = game.bets[item] + game.selectedChip;
    const totalBet = Object.values(game.bets).reduce((sum, val) => sum + val, 0) - game.bets[item] + newBet;
    
    if (totalBet <= game.playerCapital) {
        game.bets[item] = newBet;
    }
    render();
}

function handleBetRemoval(item) {
    const game = state.luckGame.brownVelvet;
    if (game.status !== 'betting' || game.isPaused) return;

    const currentBet = game.bets[item];
    const chipValue = game.selectedChip;

    if (currentBet > 0) {
        game.bets[item] = Math.max(0, currentBet - chipValue);
        render();
    }
}

function handleClearBets() {
    const game = state.luckGame.brownVelvet;
    game.bets = ALL_BET_SPOTS.reduce((acc, item) => ({ ...acc, [item]: 0 }), {});
    render();
}

function handleRoll() {
    cleanUp();
    const game = state.luckGame.brownVelvet;
    if (game.status !== 'betting') return;

    game.status = 'rolling';
    render();

    setTimeout(() => {
        const roll = [SINGLE_ITEMS[Math.floor(Math.random()*6)], SINGLE_ITEMS[Math.floor(Math.random()*6)], SINGLE_ITEMS[Math.floor(Math.random()*6)]];
        game.lastRoll = roll;

        const diceResultCounts = roll.reduce((acc, face) => { acc[face] = (acc[face] || 0) + 1; return acc; }, {});
        const uniqueFaces = Object.keys(diceResultCounts);
        
        let stakeReturned = 0;
        let profitWon = 0;
        let stakeLost = 0;
        game.payouts = {}; // Reset payouts per spot for highlighting winners

        ALL_BET_SPOTS.forEach(spotKey => {
            const betAmount = game.bets[spotKey];
            if (betAmount > 0) {
                let isWinner = false;
                let profitForItem = 0;

                if (PAIRS[spotKey]) {
                    const [itemA, itemB] = PAIRS[spotKey];
                    if (uniqueFaces.includes(itemA) && uniqueFaces.includes(itemB)) {
                        isWinner = true;
                        profitForItem = betAmount * 5;
                    }
                } else { // Single item
                    const matches = diceResultCounts[spotKey] || 0;
                    if (matches > 0) {
                        isWinner = true;
                        profitForItem = betAmount * matches;
                    }
                }

                if (isWinner) {
                    stakeReturned += betAmount;
                    profitWon += profitForItem;
                    game.payouts[spotKey] = profitForItem;
                } else {
                    stakeLost += betAmount;
                    game.payouts[spotKey] = 0;
                }
            }
        });
        
        const netResult = profitWon - stakeLost;
        game.payoutDetails = { stakeReturned, profitWon, stakeLost, netResult };
        
        game.playerCapital += netResult;
        game.hostCapital -= netResult;
        
        game.status = 'post-result';
        render();
    }, 2000); // Wait for animation
}

function handleShareToTwitter() {
    const t = translations[state.lang];
    const game = state.luckGame.brownVelvet;
    const initialCapital = INITIAL_PLAYER_CAPITAL;
    const finalCapital = game.playerCapital;
    const netResult = finalCapital - initialCapital;

    let tweetKey;
    let value;
    if (netResult >= 0) {
        tweetKey = 'fpcShareWinTweet';
        value = utils.formatCurrency(netResult);
    } else {
        tweetKey = 'fpcShareLossTweet';
        value = utils.formatCurrency(Math.abs(netResult));
    }
    
    const tweetText = (t[tweetKey] || '')
        .replace('{profit}', value)
        .replace('{loss}', value);
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

export const fishPrawnCrabGame = {
    getInitialState,
    initialize,
    render,
    handleEvent,
    reset,
    cleanUp,
};
