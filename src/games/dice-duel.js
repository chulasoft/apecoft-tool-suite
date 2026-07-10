
import { translations } from '../i18n/translations.js';
import { createInfoIcon, createTwitterIcon } from '../components/icons.js';

// --- CONSTANTS ---
const INITIAL_CAPITAL = 1000000;
const MAX_ROUNDS = 3;
const DICE_DATA = {
    black: { faces: [3, 3, 4, 4, 8, 8], themeTextColor: 'text-slate-300', gradient: 'linear-gradient(145deg, #334155, #1e293b)' },
    white: { faces: [1, 1, 5, 5, 9, 9], themeTextColor: 'text-white',       gradient: 'linear-gradient(145deg, #94a3b8, #64748b)' },
    red:   { faces: [2, 2, 6, 6, 7, 7], themeTextColor: 'text-red-400',   gradient: 'linear-gradient(145deg, #b91c1c, #991b1b)' }
};

let state, elements, utils, luckElements;

function getInitialState() {
    return {
        currentRound: 1,
        playerCapital: INITIAL_CAPITAL,
        hostCapital: INITIAL_CAPITAL,
        selectedDie: null, // 'black', 'white', 'red'
        betAmount: '1000',
        isRolling: false,
        isGameOver: false,
        lastResult: null // { playerDie, hostDie, playerRoll, hostRoll, winner, amount }
    };
}

function initialize(context, sharedLuckElements) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;
    luckElements = sharedLuckElements;
}

function render() {
    const t = translations[state.lang];
    const game = state.luckGame.blackVelvet;
    
    const scoreboardHTML = `
        <div class="grid grid-cols-2 gap-4 text-center p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
            <div>
                <div class="text-sm text-slate-400" data-i18n-key="luckPlayerCapital">${t.luckPlayerCapital}</div>
                <div class="text-2xl font-bold text-cyan-400">${utils.formatCurrency(game.playerCapital)}</div>
            </div>
            <div>
                <div class="text-sm text-slate-400" data-i18n-key="luckHostCapital">${t.luckHostCapital}</div>
                <div class="text-2xl font-bold text-red-400">${utils.formatCurrency(game.hostCapital)}</div>
            </div>
        </div>`;

    const roomHeader = `<div class="relative flex items-center justify-center mb-2 h-10">
            <button class="back-to-rooms-btn absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                <span data-i18n-key="backToHall">${t.backToHall}</span>
            </button>
            <h2 class="text-2xl font-bold text-slate-300" data-i18n-key="blackVelvetRoomTitle">${t.blackVelvetRoomTitle}</h2>
            <button class="rules-btn absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-room="black_velvet">
                ${createInfoIcon('h-6 w-6')}
            </button>
        </div>`;

    let roundCounterHTML;
    if (game.isGameOver) {
        roundCounterHTML = ''; // No counter when game is over
    } else if (game.currentRound === 1 && !game.lastResult && !game.isRolling) {
        roundCounterHTML = `<div class="text-center font-bold text-xl text-slate-400 my-4" data-i18n-key="luckGetReady">${t.luckGetReady}</div>`;
    } else {
        roundCounterHTML = `<div class="text-center font-bold text-xl text-slate-300 my-4" data-i18n-key="luckRound">${(t.luckRound || '').replace('{current}', game.currentRound).replace('{max}', MAX_ROUNDS)}</div>`;
    }

    let controlsHTML = '';
    if (!game.isGameOver) {
        const diceHTML = Object.entries(DICE_DATA).map(([key, data]) => {
            const isSelected = game.selectedDie === key;
            const style = isSelected ? `--die-bg-color: ${data.gradient};` : `background: radial-gradient(ellipse at top, rgba(255, 255, 255, 0.05), transparent 70%), ${data.gradient};`;
            return `<div class="die-card ${isSelected ? 'selected' : ''} flex flex-col" data-die="${key}" style="${style}">
                    <div class="pt-3 pb-2 text-center border-b border-white/10"><h4 class="font-bold text-lg capitalize ${data.themeTextColor}" data-i18n-key="luckDie_${key}">${t[`luckDie_${key}`]}</h4></div>
                    <div class="grid grid-cols-6 gap-2 p-2 flex-grow items-center ${data.themeTextColor}">${data.faces.map(face => `<div class="aspect-square flex items-center justify-center font-bold text-xl rounded-md bg-black/20">${face}</div>`).join('')}</div>
                </div>`;
        }).join('');

        controlsHTML = `<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-4">
                 <h3 class="text-lg font-bold text-amber-400" data-i18n-key="luckChooseDie">${t.luckChooseDie}</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">${diceHTML}</div>
                <div>
                    <label class="block text-sm font-medium text-slate-300 mb-1" data-i18n-key="luckBetAmount">${t.luckBetAmount}</label>
                    <div class="custom-number-input">
                        <button type="button" class="number-btn decrement-btn" aria-label="Decrement" ${game.isRolling ? 'disabled' : ''}>-</button>
                        <div class="relative flex-grow"><input type="number" id="luck-bet-input" data-step="1000" value="${game.betAmount}" class="w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm pl-3 pr-12 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500" ${game.isRolling ? 'disabled' : ''} /><span class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">USD</span></div>
                        <button type="button" class="number-btn increment-btn" aria-label="Increment" ${game.isRolling ? 'disabled' : ''}>+</button>
                    </div>
                </div>
                <button id="luck-roll-btn" class="w-full bg-red-500 text-white font-bold py-3 px-5 rounded-md hover:bg-red-400 transition-colors flex items-center justify-center gap-2 text-xl disabled:opacity-50 disabled:cursor-not-allowed" ${!game.selectedDie || game.isRolling ? 'disabled' : ''}>
                    ${game.isRolling ? `<svg class="animate-spin h-5 w-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>` : ''}
                    <span data-i18n-key="luckRollBtn">${t.luckRollBtn}</span>
                </button>
            </div>`;
    }
    
    let resultsHTML = '<div id="luck-results-container" class="min-h-[200px] flex items-center justify-center"></div>';
    if(game.isRolling || game.lastResult) {
        let content = '';
        if (game.isRolling) {
            const playerDie = DICE_DATA[game.selectedDie];
            const hostDieKey = getHostDie(game.selectedDie);
            const hostDie = DICE_DATA[hostDieKey];
            content = `<div class="w-full grid grid-cols-3 items-center text-center gap-4 p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
                    <div class="flex flex-col items-center gap-2">
                        <h4 class="font-bold" data-i18n-key="luckPlayer">${t.luckPlayer}</h4>
                        <div class="text-5xl h-24 w-24 rolling-die flex items-center justify-center rounded-lg font-bold ${playerDie.themeTextColor}" style="background-image: ${playerDie.gradient};">?</div>
                        <div class="text-xs capitalize mt-2" data-i18n-key="luckDie_${game.selectedDie}">${t[`luckDie_${game.selectedDie}`]}</div>
                    </div>
                    <div class="text-2xl font-bold text-amber-500 animate-pulse">VS</div>
                     <div class="flex flex-col items-center gap-2">
                        <h4 class="font-bold" data-i18n-key="luckHost">${t.luckHost}</h4>
                        <div class="text-5xl h-24 w-24 rolling-die flex items-center justify-center rounded-lg font-bold ${hostDie.themeTextColor}" style="background-image: ${hostDie.gradient}; animation-delay: 0.1s;">?</div>
                        <div class="text-xs capitalize mt-2" data-i18n-key="luckDie_${hostDieKey}">${t[`luckDie_${hostDieKey}`]}</div>
                    </div></div>`;
        } else if (game.lastResult) {
             const { playerDie, hostDie, playerRoll, hostRoll, winner, amount } = game.lastResult;
             const playerDieData = DICE_DATA[playerDie];
             const hostDieData = DICE_DATA[hostDie];
             let winnerColor, winnerLine1 = '', winnerLine2 = '';
             if (winner === 'player') {
                winnerColor = 'text-green-400';
                [winnerLine1, winnerLine2] = (t.luckResultWin || '').replace('{amount}', utils.formatCurrency(amount)).split('<br/>');
             } else if (winner === 'host') {
                 winnerColor = 'text-red-400';
                 [winnerLine1, winnerLine2] = (t.luckResultLoss || '').replace('{amount}', utils.formatCurrency(amount)).split('<br/>');
             } else {
                 winnerColor = 'text-slate-400';
                 winnerLine1 = t.luckResultDraw;
             }
             content = `<div class="w-full grid grid-cols-3 items-center text-center gap-4 p-6 bg-slate-900/50 border border-slate-600 rounded-xl">
                    <div class="flex flex-col items-center gap-2">
                        <h4 class="font-bold text-lg" data-i18n-key="luckPlayer">${t.luckPlayer}</h4>
                        <div class="text-6xl h-24 w-24 flex items-center justify-center rounded-lg font-bold ${playerDieData.themeTextColor}" style="background-image: ${playerDieData.gradient};">${playerRoll}</div>
                        <div class="text-sm capitalize mt-2 ${playerDieData.themeTextColor}" data-i18n-key="luckDie_${playerDie}">${t[`luckDie_${playerDie}`]}</div>
                    </div>
                    <div class="text-center flex flex-col justify-center">
                        <p class="text-3xl font-bold ${winnerColor}">${winnerLine1}</p>
                        ${winnerLine2 ? `<p class="text-xl mt-1 font-semibold ${winnerColor}">${winnerLine2}</p>` : ''}
                    </div>
                     <div class="flex flex-col items-center gap-2">
                        <h4 class="font-bold text-lg" data-i18n-key="luckHost">${t.luckHost}</h4>
                        <div class="text-6xl h-24 w-24 flex items-center justify-center rounded-lg font-bold ${hostDieData.themeTextColor}" style="background-image: ${hostDieData.gradient};">${hostRoll}</div>
                        <div class="text-sm capitalize mt-2 ${hostDieData.themeTextColor}" data-i18n-key="luckDie_${hostDie}">${t[`luckDie_${hostDie}`]}</div>
                    </div></div>`;
        }
        resultsHTML = `<div id="luck-results-container" class="min-h-[200px] flex items-center justify-center">${content}</div>`;
    }

    let gameOverHTML = '';
    if (game.isGameOver) {
        const hasWon = game.playerCapital > INITIAL_CAPITAL;
        const resultTextKey = hasWon ? 'luckGameOverWin' : 'luckGameOverLoss';
        const resultColor = hasWon ? 'text-green-400' : 'text-red-400';
        gameOverHTML = `<div class="text-center p-6 bg-slate-800/60 border border-slate-600 rounded-xl space-y-4">
                <h3 class="text-3xl font-bold ${resultColor}" data-i18n-key="${resultTextKey}">${t[resultTextKey]}</h3>
                <div class="flex items-center justify-center gap-4">
                    <button id="luck-reset-btn" class="bg-amber-500 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-400 transition-colors text-lg" data-i18n-key="luckPlayAgainBtn">${t.luckPlayAgainBtn}</button>
                    <button id="dd-share-btn" class="bg-slate-800 text-white font-bold py-3 px-4 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-lg">
                        ${createTwitterIcon('w-5 h-5')}
                    </button>
                </div>
            </div>`;
    }
    luckElements.luckGameMain.innerHTML = roomHeader + scoreboardHTML + roundCounterHTML + resultsHTML + controlsHTML + gameOverHTML;
}

function handleShareToTwitter() {
    const t = translations[state.lang];
    const game = state.luckGame.blackVelvet;
    const hasWon = game.playerCapital > INITIAL_CAPITAL;
    const tweetKey = hasWon ? 'ddShareWinTweet' : 'ddShareLossTweet';
    const capital = utils.formatCurrency(game.playerCapital);
    const tweetText = (t[tweetKey] || '').replace('{capital}', capital);
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

function handleEvent(e) {
    const target = e.target;
    if (target.closest('.die-card')) handleDieSelect(target.closest('.die-card').dataset.die);
    if (target.closest('#luck-roll-btn')) handleRoll();
    if (target.closest('#luck-reset-btn')) reset();
    if (target.closest('#dd-share-btn')) handleShareToTwitter();
    if(target.id === 'luck-bet-input') {
        handleBetChange(target.value);
    }
}

function handleDieSelect(dieKey) {
    if (state.luckGame.blackVelvet.isRolling) return;
    state.luckGame.blackVelvet.selectedDie = dieKey;
    render();
}

function handleBetChange(newValue) {
    if (state.luckGame.blackVelvet.isRolling) return;
    let bet = Math.max(0, parseInt(newValue) || 0);
    bet = Math.min(bet, state.luckGame.blackVelvet.playerCapital);
    state.luckGame.blackVelvet.betAmount = bet.toString();
    const betInput = document.getElementById('luck-bet-input');
    if (betInput && betInput.value !== state.luckGame.blackVelvet.betAmount) {
        betInput.value = state.luckGame.blackVelvet.betAmount;
    }
}

function getHostDie(playerDie) {
    if (playerDie === 'black') return 'white';
    if (playerDie === 'white') return 'red';
    return 'black';
}

function handleRoll() {
    const game = state.luckGame.blackVelvet;
    if (!game.selectedDie || game.isRolling || game.isGameOver) return;
    
    const bet = parseInt(game.betAmount);
    if (isNaN(bet) || bet <= 0 || bet > game.playerCapital) {
        utils.showToast('luckInvalidBet', 'error');
        return;
    }
    game.isRolling = true;
    game.lastResult = null;
    render();

    setTimeout(() => {
        const playerDieKey = game.selectedDie;
        const hostDieKey = getHostDie(playerDieKey);
        const playerRoll = DICE_DATA[playerDieKey].faces[Math.floor(Math.random() * 6)];
        const hostRoll = DICE_DATA[hostDieKey].faces[Math.floor(Math.random() * 6)];
        let winner;

        if (playerRoll > hostRoll) {
            winner = 'player';
            game.playerCapital += bet;
            game.hostCapital -= bet;
        } else if (hostRoll > playerRoll) {
            winner = 'host';
            game.playerCapital -= bet;
            game.hostCapital += bet;
        } else {
            winner = 'draw';
        }
        game.lastResult = { playerDie: playerDieKey, hostDie: hostDieKey, playerRoll, hostRoll, winner, amount: bet };
        if(game.currentRound < MAX_ROUNDS && game.playerCapital > 0 && game.hostCapital > 0) {
            game.currentRound += 1;
            game.selectedDie = null;
        } else {
            game.isGameOver = true;
        }
        game.isRolling = false;
        render();
    }, 1500);
}

function reset() {
    state.luckGame.blackVelvet = getInitialState();
    render();
}

export const diceDuelGame = {
    getInitialState,
    initialize,
    render,
    handleEvent,
    reset,
};