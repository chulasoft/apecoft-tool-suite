

import { translations } from '../i18n/translations.js';
import { createInfoIcon, createTwitterIcon } from '../components/icons.js';

let state, elements, utils, luckElements;
let intervalId = null;

function getInitialState() {
    return {
        playerSequence: ['H', 'H', 'H'],
        hostSequence: [],
        flipStream: [],
        gameStatus: 'predicting', // 'predicting', 'playing', 'finished'
        winner: null, // 'player', 'host'
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
    const game = state.luckGame.redVelvet;

    const roomHeader = `<div class="relative flex items-center justify-center mb-4 h-10">
            <button class="back-to-rooms-btn absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                <span data-i18n-key="backToHall">${t.backToHall}</span>
            </button>
            <h2 class="text-2xl font-bold text-red-400" data-i18n-key="redVelvetRoomTitle">${t.redVelvetRoomTitle}</h2>
            <button class="rules-btn absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-room="red_velvet">
                ${createInfoIcon('h-6 w-6')}
            </button>
        </div>`;

    const getCoinHTML = (face, { size = 'text-3xl', highlight = false } = {}) => {
        const isHeads = face === 'H';
        const text = isHeads ? t.heads[0] : t.tails[0];
        const color = isHeads ? 'bg-amber-400 text-amber-900' : 'bg-slate-400 text-slate-900';
        const highlightClass = highlight ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-green-400 scale-110' : '';
        return `<span class="inline-flex items-center justify-center w-12 h-12 ${size} font-bold ${color} rounded-full shadow-md transition-transform ${highlightClass}">${text}</span>`;
    };
    
    let predictionHTML = '';
    if (game.gameStatus === 'predicting') {
        const predictionSlots = game.playerSequence.map((face, index) => {
             const isHeads = face === 'H';
             const headsBtnClass = isHeads ? 'bg-amber-500 text-amber-900' : 'bg-transparent text-slate-300 hover:bg-slate-600';
             const tailsBtnClass = !isHeads ? 'bg-slate-300 text-slate-800' : 'bg-transparent text-slate-300 hover:bg-slate-600';
             return `
                <div class="flex flex-col items-center gap-3">
                    ${getCoinHTML(face)}
                    <div class="inline-flex rounded-md shadow-sm bg-slate-700 p-1" role="group">
                        <button type="button" class="pred-btn rounded-l-md px-3 py-1 text-sm font-semibold transition-colors ${headsBtnClass}" data-index="${index}" data-value="H">${t.heads}</button>
                        <button type="button" class="pred-btn rounded-r-md px-3 py-1 text-sm font-semibold transition-colors ${tailsBtnClass}" data-index="${index}" data-value="T">${t.tails}</button>
                    </div>
                </div>`;
        }).join('');
        predictionHTML = `<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-6">
                <h3 class="text-lg text-center font-bold text-amber-400" data-i18n-key="yourPrediction">${t.yourPrediction}</h3>
                <div class="flex justify-center items-start gap-4 md:gap-8">${predictionSlots}</div>
                <button id="red-velvet-lock-btn" class="w-full bg-red-500 text-white font-bold py-3 px-5 rounded-md hover:bg-red-400 transition-colors text-xl">
                    <span data-i18n-key="lockInPrediction">${t.lockInPrediction}</span>
                </button>
            </div>`;
    }

    let resultsHTML = '';
    if (game.gameStatus !== 'predicting') {
        const playerSeqHTML = game.playerSequence.map(face => getCoinHTML(face, { size: 'text-2xl' })).join('');
        const hostSeqHTML = game.hostSequence.map(face => getCoinHTML(face, { size: 'text-2xl' })).join('');
        
        let winningIndexStart = -1;
        if (game.gameStatus === 'finished') {
            const winningSequenceString = game.winner === 'player' ? game.playerSequence.join('') : game.hostSequence.join('');
            winningIndexStart = game.flipStream.join('').lastIndexOf(winningSequenceString);
        }

        const flipStreamHTML = game.flipStream.length > 0 
            ? `<div class="flex flex-wrap justify-center gap-3 p-2">${game.flipStream.map((face, index) => {
                const isWinnerSegment = winningIndexStart !== -1 && index >= winningIndexStart && index < winningIndexStart + 3;
                return getCoinHTML(face, { size: 'text-xl', highlight: isWinnerSegment });
              }).join('')}</div>`
            : `<p class="text-slate-400 animate-pulse" data-i18n-key="gameInProgress">${t.gameInProgress}</p>`;
            
        let finalMessageHTML = '';
        if (game.gameStatus === 'finished') {
            const winnerTextKey = game.winner === 'player' ? 'playerWinsMessage' : 'hostWinsMessage';
            const winnerColor = game.winner === 'player' ? 'text-green-400' : 'text-red-400';
            finalMessageHTML = `<div class="text-center space-y-4">
                    <p class="text-3xl font-bold ${winnerColor}" data-i18n-key="${winnerTextKey}">${t[winnerTextKey]}</p>
                    <div class="flex items-center justify-center gap-4">
                        <button id="red-velvet-reset-btn" class="bg-amber-500 text-slate-900 font-bold py-2 px-6 rounded-md hover:bg-amber-400 transition-colors text-lg" data-i18n-key="luckPlayAgainBtn">${t.luckPlayAgainBtn}</button>
                        <button id="pr-share-btn" class="bg-slate-800 text-white font-bold py-3 px-4 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-lg">
                            ${createTwitterIcon('w-5 h-5')}
                        </button>
                    </div>
                </div>`;
        }
        
        const playerHighlightClass = game.gameStatus === 'finished' && game.winner === 'player' ? 'ring-2 ring-green-400' : 'border-slate-700';
        const hostHighlightClass = game.gameStatus === 'finished' && game.winner === 'host' ? 'ring-2 ring-green-400' : 'border-slate-700';

        resultsHTML = `<div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6 space-y-6 text-center">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="border rounded-lg p-3 transition-all ${playerHighlightClass}">
                        <h4 class="text-lg font-bold text-cyan-400 mb-2" data-i18n-key="yourPrediction">${t.yourPrediction}</h4>
                        <div class="flex justify-center gap-2">${playerSeqHTML}</div>
                    </div>
                    <div class="border rounded-lg p-3 transition-all ${hostHighlightClass}">
                        <h4 class="text-lg font-bold text-red-400 mb-2" data-i18n-key="hostPrediction">${t.hostPrediction}</h4>
                        <div class="flex justify-center gap-2">${hostSeqHTML}</div>
                    </div>
                </div>
                <hr class="border-slate-700"/>
                <div>
                    <h4 class="text-lg font-bold text-amber-400 mb-3" data-i18n-key="flipStreamTitle">${t.flipStreamTitle}</h4>
                    <div class="p-4 bg-slate-900/50 rounded-lg min-h-[80px] flex items-center justify-center">
                       ${flipStreamHTML}
                    </div>
                </div>
                ${game.gameStatus === 'finished' ? `<div class="pt-4 border-t border-slate-700 mt-4">${finalMessageHTML}</div>` : ''}
            </div>`;
    }

    luckElements.luckGameMain.innerHTML = roomHeader + (predictionHTML || resultsHTML);
}

function handleShareToTwitter() {
    const t = translations[state.lang];
    const game = state.luckGame.redVelvet;
    const hasWon = game.winner === 'player';
    const tweetKey = hasWon ? 'prShareWinTweet' : 'prShareLossTweet';
    const tweetText = t[tweetKey];
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

function handleEvent(e) {
    const target = e.target;
    const predBtn = target.closest('.pred-btn');
    if (predBtn) {
        handlePredictionChange(parseInt(predBtn.dataset.index), predBtn.dataset.value);
    }
    if (target.closest('#red-velvet-lock-btn')) {
        handleLockIn();
    }
    if (target.closest('#red-velvet-reset-btn')) {
        reset();
    }
    if (target.closest('#pr-share-btn')) {
        handleShareToTwitter();
    }
}

function handlePredictionChange(index, value) {
    state.luckGame.redVelvet.playerSequence[index] = value;
    render();
}

function handleLockIn() {
    const game = state.luckGame.redVelvet;
    const playerSeq = game.playerSequence;
    const oppositeSecond = playerSeq[1] === 'H' ? 'T' : 'H';
    game.hostSequence = [oppositeSecond, playerSeq[0], playerSeq[1]];
    game.gameStatus = 'playing';
    render();
    
    intervalId = setInterval(() => {
        game.flipStream.push(Math.random() < 0.5 ? 'H' : 'T');
        if (game.flipStream.length >= 3) {
            const lastThree = game.flipStream.slice(-3).join('');
            const winner = lastThree === game.playerSequence.join('') ? 'player' : lastThree === game.hostSequence.join('') ? 'host' : null;
            if (winner) {
                cleanUp();
                game.winner = winner;
                game.gameStatus = 'finished';
            }
        }
        render();
    }, 1000);
}

function cleanUp() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function reset() {
    cleanUp();
    state.luckGame.redVelvet = getInitialState();
    render();
}

export const penneyRaceGame = {
    getInitialState,
    initialize,
    render,
    handleEvent,
    reset,
    cleanUp,
};