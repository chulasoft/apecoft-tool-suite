

import { translations } from '../i18n/translations.js';
import { createInfoIcon, createTwitterIcon } from '../components/icons.js';

let state, elements, utils, luckElements;
let intervalId = null;

function getInitialState() {
    return {
        status: 'intro', // 'intro', 'decision', 'simulating', 'result'
        timer: 7,
        choice1Amount: 0,
        choice2Params: { initial: 0, multiplier: 0, days: 0 },
        userChoice: null, // 'choice1' or 'choice2'
        simulationLog: [], // [{ day: 1, amount: 100 }, ...]
        finalChoice2Value: 0,
    };
}

function initialize(context, sharedLuckElements) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;
    luckElements = sharedLuckElements;
}

function _renderChoicesRecap(game) {
    const t = translations[state.lang];
    const { choice1Amount, choice2Params, userChoice } = game;
    
    const choice1Classes = userChoice === 'choice1' ? 'selected-cyan' : 'border-slate-700 opacity-50';
    const choice2Classes = userChoice === 'choice2' ? 'selected-purple' : 'border-slate-700 opacity-50';

    const choice2DetailsHTML = `
        <div class="text-md text-white mt-2 space-y-1">
            <p class="flex justify-between"><span class="text-slate-400" data-i18n-key="bvrInitialAmount">${t.bvrInitialAmount}</span> <span class="font-bold">${utils.formatCurrency(choice2Params.initial)}</span></p>
            <p class="flex justify-between"><span class="text-slate-400" data-i18n-key="bvrMultiplier">${t.bvrMultiplier}</span> <span class="font-bold">x${choice2Params.multiplier.toFixed(2)}</span></p>
            <p class="flex justify-between"><span class="text-slate-400" data-i18n-key="bvrDuration">${t.bvrDuration}</span> <span class="font-bold">${choice2Params.days} ${t.daysUnit}</span></p>
        </div>
    `;

    return `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div class="bvr-choice-card p-4 text-left border-2 rounded-xl transition-all ${choice1Classes}">
                <h3 class="text-lg font-bold text-cyan-400" data-i18n-key="bvrTakeNow">${t.bvrTakeNow}</h3>
                <p class="text-2xl font-bold text-white mt-2">${utils.formatCurrency(choice1Amount)}</p>
            </div>
            <div class="bvr-choice-card p-4 text-left border-2 rounded-xl transition-all ${choice2Classes}">
                <h3 class="text-lg font-bold text-purple-400" data-i18n-key="bvrCompounding">${t.bvrCompounding}</h3>
                ${choice2DetailsHTML}
            </div>
        </div>
    `;
}

function _renderSimulationLog(game, isFinal = false) {
    const t = translations[state.lang];
    const logRows = game.simulationLog.map((row, index) => {
        const isLastRow = index === game.simulationLog.length - 1;
        const isShaking = !isFinal && isLastRow && row.day > game.choice2Params.days - 4 && row.day <= game.choice2Params.days;
        const amountIsClose = row.amount > game.choice1Amount * 0.8;
        
        const rowClass = isShaking ? 'shake-row' : '';
        const amountClass = amountIsClose ? 'animated-gradient-text' : 'text-white';

        return `
            <tr class="${rowClass}">
                <td class="p-2 text-slate-400 whitespace-nowrap">${t.bvrLogDay} ${row.day}</td>
                <td class="p-2 text-right font-mono ${amountClass}">${utils.formatCurrency(row.amount)}</td>
            </tr>
        `;
    }).join('');

    const spinnerHTML = isFinal ? '' : `<div class="p-2 flex justify-center items-center h-10"><div class="bvr-spinner"></div></div>`;
    
    return `
        <div class="max-w-md mx-auto">
            <div id="bvr-simulation-log" class="bg-slate-900/50 rounded-lg max-h-60 overflow-y-auto">
                <table class="simulation-log-table">
                    <tbody>${logRows}</tbody>
                </table>
            </div>
            ${spinnerHTML}
        </div>
    `;
}

function render() {
    const t = translations[state.lang];
    const game = state.luckGame.blueVelvet;

    const roomHeader = `<div class="relative flex items-center justify-center mb-4 h-10">
            <button class="back-to-rooms-btn absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                <span data-i18n-key="backToHall">${t.backToHall}</span>
            </button>
            <h2 class="text-2xl font-bold text-blue-400" data-i18n-key="bvrTitle">${t.bvrTitle}</h2>
             <button class="rules-btn absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-room="blue_velvet">
                ${createInfoIcon('h-6 w-6')}
            </button>
        </div>`;
    
    let contentHTML = '';

    if (game.status === 'intro') {
        contentHTML = `
            <div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl">
                 <p class="text-slate-400 max-w-lg mx-auto" data-i18n-key="blueVelvetRoomDescription">${t.blueVelvetRoomDescription}</p>
                 <button id="bvr-start-btn" class="mt-6 bg-blue-500 text-white font-bold py-3 px-8 rounded-md hover:bg-blue-400 transition-colors text-lg">
                    <span data-i18n-key="bvrStartGame">${t.bvrStartGame}</span>
                 </button>
            </div>
        `;
    } else if (game.status === 'decision') {
        const { choice1Amount, choice2Params, timer } = game;
        const timerColor = timer > 3 ? 'text-green-400' : timer > 1 ? 'text-amber-400' : 'text-red-400';
        
        const choice2DetailsHTML = `
            <div class="text-lg text-white my-4 space-y-2">
                <p class="flex justify-between"><span class="text-slate-400" data-i18n-key="bvrInitialAmount">${t.bvrInitialAmount}</span> <span class="font-bold">${utils.formatCurrency(choice2Params.initial)}</span></p>
                <p class="flex justify-between"><span class="text-slate-400" data-i18n-key="bvrMultiplier">${t.bvrMultiplier}</span> <span class="font-bold">x${choice2Params.multiplier.toFixed(2)}</span></p>
                <p class="flex justify-between"><span class="text-slate-400" data-i18n-key="bvrDuration">${t.bvrDuration}</span> <span class="font-bold">${choice2Params.days} ${t.daysUnit}</span></p>
            </div>
        `;

        contentHTML = `
            <div id="bvr-timer-container" class="text-center mb-4 text-2xl font-bold ${timerColor}" data-i18n-key="bvrTimeLeft" data-i18n-param-seconds="${timer}">
                ${t.bvrTimeLeft.replace('{seconds}', timer)}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Choice 1 Card -->
                <button class="bvr-choice-btn tool-card p-6 text-left border-2 border-slate-700 hover:border-cyan-400 rounded-xl flex flex-col justify-between transition-all duration-200" data-choice="choice1">
                    <div>
                        <h3 class="text-xl font-bold text-cyan-400" data-i18n-key="bvrTakeNow">${t.bvrTakeNow}</h3>
                        <p class="text-4xl font-bold text-white my-4">${utils.formatCurrency(choice1Amount)}</p>
                    </div>
                </button>
                <!-- Choice 2 Card -->
                 <button class="bvr-choice-btn tool-card p-6 text-left border-2 border-slate-700 hover:border-purple-400 rounded-xl flex flex-col justify-between transition-all duration-200" data-choice="choice2">
                    <div>
                        <h3 class="text-xl font-bold text-purple-400" data-i18n-key="bvrCompounding">${t.bvrCompounding}</h3>
                        ${choice2DetailsHTML}
                    </div>
                </button>
            </div>
        `;
    } else if (game.status === 'simulating') {
        contentHTML = `
            <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                <h3 class="text-2xl font-bold text-amber-400 text-center mb-4" data-i18n-key="bvrSimulatingTitle">${t.bvrSimulatingTitle}</h3>
                <p class="text-center text-slate-400 mb-4 -mt-2" data-i18n-key="bvrYourChoiceWas">${t.bvrYourChoiceWas}</p>
                ${_renderChoicesRecap(game)}
                <div class="mt-6">${_renderSimulationLog(game, false)}</div>
            </div>
        `;
    } else if (game.status === 'result') {
        const choice1Value = game.choice1Amount;
        const choice2Value = game.finalChoice2Value;
        
        const yourAmount = game.userChoice === 'choice1' ? choice1Value : choice2Value;
        const otherAmount = game.userChoice === 'choice1' ? choice2Value : choice1Value;
        const difference = Math.abs(yourAmount - otherAmount);
        
        let message = '';
        let messageColor = 'text-slate-300';
        if (yourAmount > otherAmount) {
            message = t.bvrWinMessage.replace('{amount}', utils.formatCurrency(difference));
            messageColor = 'text-green-400';
        } else if (otherAmount > yourAmount) {
            message = t.bvrLossMessage.replace('{amount}', utils.formatCurrency(difference));
            messageColor = 'text-red-400';
        } else {
            message = t.bvrDrawMessage;
        }

        const verdictCardHTML = `
            <div class="text-center space-y-4 mb-6">
                <h3 class="text-3xl font-bold text-amber-400" data-i18n-key="bvrResultTitle">${t.bvrResultTitle}</h3>
                <p class="text-2xl font-semibold ${messageColor}">${message}</p>
                <div class="flex items-center justify-center gap-4">
                    <button id="bvr-play-again-btn" class="bg-amber-500 text-slate-900 font-bold py-3 px-8 rounded-md hover:bg-amber-400 transition-colors text-lg">
                        <span data-i18n-key="bvrPlayAgain">${t.bvrPlayAgain}</span>
                    </button>
                     <button id="bvr-share-btn" class="bg-slate-800 text-white font-bold py-3 px-8 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-lg" data-i18n-key="bvrShareButton">
                        ${createTwitterIcon('w-5 h-5')}
                     </button>
                </div>
            </div>
        `;

        contentHTML = `
            <div class="bg-slate-800/60 border border-slate-700 rounded-xl p-6">
                ${verdictCardHTML}
                ${_renderChoicesRecap(game)}
                <div class="mt-6">${_renderSimulationLog(game, true)}</div>
            </div>
        `;
    }

    luckElements.luckGameMain.innerHTML = roomHeader + contentHTML;

    if (game.status === 'result') {
        const logContainer = document.getElementById('bvr-simulation-log');
        if (logContainer) {
            setTimeout(() => { logContainer.scrollTop = logContainer.scrollHeight; }, 0);
        }
    }
}

function handleEvent(e) {
    const target = e.target;
    if (target.closest('#bvr-start-btn')) startDecisionPhase();
    if (target.closest('.bvr-choice-btn')) handleChoice(target.closest('.bvr-choice-btn').dataset.choice);
    if (target.closest('#bvr-play-again-btn')) reset();
    if (target.closest('#bvr-share-btn')) handleShareToTwitter();
}

function cleanUp() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
}

function reset() {
    cleanUp();
    state.luckGame.blueVelvet = getInitialState();
    render();
}

function startDecisionPhase() {
    const bvState = state.luckGame.blueVelvet;
    
    bvState.choice1Amount = Math.floor(Math.random() * (100000000 - 500000 + 1)) + 500000;
    bvState.choice2Params.initial = Math.floor(Math.random() * (1000 - 10 + 1)) + 10;
    bvState.choice2Params.days = Math.floor(Math.random() * (45 - 7 + 1)) + 7;
    bvState.choice2Params.multiplier = parseFloat((Math.random() * (2.0 - 1.1) + 1.1).toFixed(2));
    
    bvState.status = 'decision';
    bvState.timer = 7;
    render();
    utils.translateUI(state.lang);

    intervalId = setInterval(() => {
        bvState.timer--;
        const timerContainer = document.getElementById('bvr-timer-container');
        if (timerContainer) {
            const t = translations[state.lang];
            const newTime = bvState.timer;
            timerContainer.textContent = t.bvrTimeLeft.replace('{seconds}', newTime);
            timerContainer.className = `text-center mb-4 text-2xl font-bold ${newTime > 3 ? 'text-green-400' : newTime > 1 ? 'text-amber-400' : 'text-red-400'}`;
        }
        if (bvState.timer <= 0) {
            cleanUp();
            reset();
        }
    }, 1000);
}

function handleChoice(choice) {
    const bvState = state.luckGame.blueVelvet;
    if (bvState.status !== 'decision') return;

    cleanUp();
    bvState.userChoice = choice;
    bvState.status = 'simulating';
    render();
    runSimulation();
}

function runSimulation() {
    const bvState = state.luckGame.blueVelvet;
    const { initial, multiplier, days } = bvState.choice2Params;
    let currentAmount = initial;
    let day = 1;

    bvState.simulationLog.push({ day: 0, amount: initial });

    const simulateStep = () => {
        if (day > days) {
            cleanUp();
            bvState.finalChoice2Value = bvState.simulationLog[bvState.simulationLog.length - 1].amount;
            bvState.status = 'result';
            render();
            return;
        }
        
        currentAmount *= multiplier;
        bvState.simulationLog.push({ day, amount: currentAmount });
        day++;
        render();
        
        const logContainer = document.getElementById('bvr-simulation-log');
        if(logContainer) logContainer.scrollTop = logContainer.scrollHeight;
    };
    
    simulateStep();
    intervalId = setInterval(simulateStep, 1000);
}

function handleShareToTwitter() {
    const t = translations[state.lang];
    const game = state.luckGame.blueVelvet;
    const choice1Value = game.choice1Amount;
    const choice2Value = game.finalChoice2Value;
    
    const yourAmount = game.userChoice === 'choice1' ? choice1Value : choice2Value;
    const otherAmount = game.userChoice === 'choice1' ? choice2Value : choice1Value;
    const difference = utils.formatCurrency(Math.abs(yourAmount - otherAmount));

    let tweetKey;
    if (yourAmount > otherAmount) {
        tweetKey = 'bvrShareWinTweet';
    } else if (otherAmount > yourAmount) {
        tweetKey = 'bvrShareLossTweet';
    } else {
        tweetKey = 'bvrShareDrawTweet';
    }
    
    const tweetText = t[tweetKey].replace('{amount}', difference);
    
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank', 'width=550,height=420');
}


export const designateChoiceGame = {
    getInitialState,
    initialize,
    render,
    handleEvent,
    reset,
    cleanUp,
};