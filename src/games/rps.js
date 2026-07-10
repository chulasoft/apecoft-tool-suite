
import { translations } from '../i18n/translations.js';
import { createInfoIcon, createHandRockIcon, createHandPaperIcon, createHandScissorsIcon, createCheckIcon, createTwitterIcon } from '../components/icons.js';

let state, elements, utils, luckElements;
const CHOICES = ['rock', 'paper', 'scissors'];
const BUFF_TYPES = ['tenacity', 'drunken_fist', 'poison'];
const LADDER_STEPS = 7; // 5 guards, 1 queen, 1 king

const BUFF_COLORS = {
    tenacity: 'text-cyan-400',
    drunken_fist: 'text-blue-400',
    poison: 'text-purple-400'
};

const ICONS = {
    knight: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-cyan-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9.5 5.5L12 9L14.5 5.5L12 2M18 6L14 10L16.5 12.5L20.5 8.5L18 6M6 6L3.5 8.5L7.5 12.5L10 10L6 6M12 10.5C10.62 10.5 9.5 11.62 9.5 13V22H14.5V13C14.5 11.62 13.38 10.5 12 10.5Z" /></svg>`,
    guard: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-slate-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1Z" /></svg>`,
    queen: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-pink-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L9 6H15L12 2M19 8H5L3 14L5 20H19L21 14L19 8M12 10A2 2 0 1 1 10 12A2 2 0 0 1 12 10Z" /></svg>`,
    king: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-amber-400" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5M19 19C19 19.55 18.55 20 18 20H6C5.45 20 5 19.55 5 19V18H19V19Z" /></svg>`,
    buff: {
        tenacity: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5V11C3 16.55 6.84 21.73 12 23C17.16 21.73 21 16.55 21 11V5L12 1M12 6C13.66 6 15 7.34 15 9C15 10.66 13.66 12 12 12S9 10.66 9 9C9 7.34 10.34 6 12 6M12 13C14.76 13 17 14.12 17 15.5V17H7V15.5C7 14.12 9.24 13 12 13Z"/></svg>`,
        drunken_fist: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M19,19C19,20.1 18.1,21 17,21H7C5.9,21 5,20.1 5,19V9H19V19M5,7V4H19V7H5Z" /></svg>`,
        poison: `<svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M13,9H11V7H13M13,13H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z" /></svg>`,
    }
};

function getOpponent(step) {
    if (step <= 5) return { nameKey: 'rps_opponent_guard', icon: ICONS.guard };
    if (step === 6) return { nameKey: 'rps_opponent_queen', icon: ICONS.queen };
    return { nameKey: 'rps_opponent_king', icon: ICONS.king };
}

function getInitialState() {
    return {
        gameStatus: 'intro', // intro, playing, won, lost
        currentStep: 1,
        kingBattleState: { playerScore: 0, kingScore: 0 },
        buffs: [], // { type: 'tenacity' | 'drunken_fist' | 'poison' }
        activeBuff: null,
        playerChoice: null,
        opponentChoice: null,
        queenEncountered: false,
        roundMessage: '',
        buffInfoMessage: null,
        roundEventMessage: '',
        isRevealing: false,
        furthestStepReached: 1,
        shareMessage: '',
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
    const game = state.luckGame.rpsKing;

    const roomHeader = `<div class="relative flex items-center justify-center mb-4 h-10">
            <button class="back-to-rooms-btn absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                <span data-i18n-key="backToHall"></span>
            </button>
            <h2 class="text-2xl font-bold text-green-400" data-i18n-key="rpsKingGameTitle"></h2>
            <button class="rules-btn absolute right-0 top-1/2 -translate-y-1/2 p-2 rounded-full text-slate-400 hover:bg-slate-700 hover:text-amber-400 transition-colors" data-room="rps_king">
                ${createInfoIcon('h-6 w-6')}
            </button>
        </div>`;
    
    let contentHTML = '';
    if (game.gameStatus === 'intro') {
         contentHTML = `
            <div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl">
                 <h3 class="text-3xl font-bold text-slate-300" data-i18n-key="rps_challenge_king_title"></h3>
                 <button id="rps-start-btn" class="mt-6 bg-green-500 text-white font-bold py-3 px-8 rounded-md hover:bg-green-400 transition-colors text-lg">
                    <span data-i18n-key="rps_challenge_king_btn"></span>
                 </button>
            </div>
        `;
    } else if (game.gameStatus === 'playing') {
        const rpsTriangleSVG = `
            <svg viewBox="0 0 120 120" class="h-32 w-32 mx-auto mt-2">
                <defs>
                    <marker id="red-circle" markerWidth="6" markerHeight="6" refX="3" refY="3">
                        <circle cx="3" cy="3" r="2.5" fill="#ef4444" />
                    </marker>
                    <!-- Icon gradients -->
                    <radialGradient id="rockGradient" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#94a3b8" /><stop offset="100%" stop-color="#475569" /></radialGradient>
                    <radialGradient id="paperGradient" cx="40%" cy="40%" r="60%"><stop offset="0%" stop-color="#6ee7b7" /><stop offset="100%" stop-color="#059669" /></radialGradient>
                    <radialGradient id="scissorsGradient" cx="50%" cy="70%" r="60%"><stop offset="0%" stop-color="#f87171" /><stop offset="100%" stop-color="#b91c1c" /></radialGradient>
                </defs>

                <!-- Icons (equilateral triangle) -->
                <g transform="translate(45.6, 11.3) scale(1.2)">
                    <circle cx="12" cy="12" r="10" fill="url(#rockGradient)" stroke="#cbd5e1" stroke-width="1.5"/>
                </g>
                <g transform="translate(85.6, 80.6) scale(1.2)">
                    <path d="M12 2 L2 22 L22 22 Z" fill="url(#scissorsGradient)" stroke="#fca5a5" stroke-width="1.5"/>
                </g>
                <g transform="translate(5.6, 80.6) scale(1.2)">
                     <rect x="3" y="3" width="18" height="18" rx="2" fill="url(#paperGradient)" stroke="#a7f3d0" stroke-width="1.5"/>
                </g>
                
                <!-- Paths for equilateral triangle -->
                <path d="M 67.5 38.7 L 92.5 82.0" stroke="#64748b" stroke-width="1.5" marker-end="url(#red-circle)"></path> <!-- Rock -> Scissors -->
                <path d="M 85 95 L 35 95" stroke="#64748b" stroke-width="1.5" marker-end="url(#red-circle)"></path> <!-- Scissors -> Paper -->
                <path d="M 27.5 82.0 L 52.5 38.7" stroke="#64748b" stroke-width="1.5" marker-end="url(#red-circle)"></path> <!-- Paper -> Rock -->
            </svg>
        `;
        
        const furthestStepHTML = `
            <div class="mt-4 text-center p-2 bg-slate-900/50 rounded-md">
                <p class="text-xs text-slate-400 uppercase" data-i18n-key="rps_furthest_step"></p>
                <p class="text-lg font-bold text-amber-400">${game.furthestStepReached} / ${LADDER_STEPS}</p>
            </div>
        `;

        const ladderHTML = `
            <div class="p-4 bg-slate-800/60 border border-slate-700 rounded-xl h-full flex flex-col justify-center">
                <div class="flex flex-col-reverse items-center space-y-reverse space-y-2">
                ${[...Array(LADDER_STEPS)].map((_, i) => {
                    const step = i + 1;
                    const opponent = getOpponent(step);
                    const isActive = step === game.currentStep;
                    const isCompleted = step < game.currentStep;
                    
                    const iconContainerClass = isCompleted ? 'border-green-500 bg-green-900/50' : isActive ? 'border-cyan-400 bg-cyan-900/50' : 'border-slate-600';
                    const textClass = isActive ? 'text-white font-bold' : 'text-slate-500';

                    let statusIndicator = isActive ? ICONS.knight : isCompleted ? createCheckIcon('h-6 w-6 text-green-400') : opponent.icon;

                    return `
                    <div class="flex items-center w-full">
                        <div class="flex-shrink-0 w-12 h-12 flex items-center justify-center border-2 ${iconContainerClass} rounded-full">${statusIndicator}</div>
                        <span class="ml-3 font-semibold text-sm ${textClass}" data-i18n-key="${opponent.nameKey}"></span>
                    </div>`;
                }).join('')}
                </div>
                ${furthestStepHTML}
                ${rpsTriangleSVG}
            </div>
        `;

        const renderChoiceIcon = (choice, size = 'h-24 w-24') => {
            if (!choice) {
                 return `<div class="${size} bg-slate-700 rounded-full flex items-center justify-center p-4">
                    <div class="w-full h-full bg-slate-800/50 rounded-full animate-pulse"></div>
                </div>`;
            }
            const iconMap = { rock: createHandRockIcon, paper: createHandPaperIcon, scissors: createHandScissorsIcon };
            return `<div class="${size}">${iconMap[choice]('w-full h-full')}</div>`;
        };
        
        let messageContentHTML = '';
        if (game.buffInfoMessage) {
            const { name, desc, type, title } = game.buffInfoMessage;
            const colorClass = BUFF_COLORS[type] || 'text-cyan-400';
            const titleHTML = title ? `<p class="text-sm text-amber-400 mb-1">${title}</p>` : '';
            messageContentHTML = `
                <div class="fade-in-scale-anim text-center">
                    ${titleHTML}
                    <p class="text-xl font-bold ${colorClass}">${name}</p>
                    <p class="text-sm mt-1 ${colorClass}">${desc}</p>
                </div>
            `;
        } else {
            const roundMsgColor = game.roundMessage.includes(t.rps_round_win) ? 'text-green-400' 
                                : game.roundMessage.includes(t.rps_round_loss) ? 'text-red-400' 
                                : 'text-amber-400';
            messageContentHTML = `
                <p class="text-2xl font-bold fade-in-scale-anim ${roundMsgColor}">${game.roundMessage}</p>
                <p class="text-md font-semibold text-cyan-400 fade-in-scale-anim text-center">${game.roundEventMessage}</p>
            `;
        }

        const opponent = getOpponent(game.currentStep);
        const battleAreaHTML = `
            <div class="p-4 bg-slate-900/50 border border-slate-700 rounded-xl flex flex-col justify-between h-full">
                <!-- Opponent -->
                <div class="p-4 rounded-lg bg-red-900/20 border border-red-500/30">
                     <div class="flex items-center justify-center gap-2">
                        ${opponent.icon}
                        <span class="text-xl font-bold text-red-400" data-i18n-key="${opponent.nameKey}"></span>
                        ${game.currentStep === LADDER_STEPS ? `<span class="text-lg font-mono text-white">${game.kingBattleState.kingScore}/2</span>` : ''}
                    </div>
                    <div class="flex justify-center my-4">
                        ${renderChoiceIcon(game.opponentChoice)}
                    </div>
                </div>

                <!-- Result Message -->
                <div class="my-4 min-h-[56px] flex flex-col justify-center items-center">
                    ${messageContentHTML}
                </div>

                <!-- Player -->
                <div class="p-4 rounded-lg bg-cyan-900/20 border border-cyan-500/30">
                    <div class="flex justify-center my-4">
                        ${renderChoiceIcon(game.playerChoice)}
                    </div>
                     <div class="flex items-center justify-center gap-2">
                        <span class="text-xl font-bold text-cyan-400" data-i18n-key="rps_knight"></span>
                         ${game.currentStep === LADDER_STEPS ? `<span class="text-lg font-mono text-white">${game.kingBattleState.playerScore}/2</span>` : ''}
                    </div>
                </div>
            </div>
        `;

        const controlsHTML = `
            <div class="mt-6 space-y-4">
                 <!-- Buffs -->
                <div class="min-h-[70px]">
                ${game.buffs.length > 0 ? `
                    <h4 class="text-center text-sm text-slate-400 mb-2" data-i18n-key="rps_use_buff"></h4>
                    <div class="flex justify-center gap-3">
                    ${game.buffs.map((buff, index) => {
                        const isActive = game.activeBuff === buff;
                        const colorClass = BUFF_COLORS[buff.type] || 'text-slate-400';
                        return `<button class="rps-buff-btn p-3 rounded-full transition-all ${colorClass} ${isActive ? 'bg-amber-500 ring-2 ring-amber-300 scale-110' : 'bg-slate-700 hover:bg-slate-600'}" data-index="${index}" title="${t[`rps_buff_${buff.type}_name`]}">${ICONS.buff[buff.type]}</button>`;
                    }).join('')}
                    </div>
                ` : ''}
                </div>
                
                <!-- Choices -->
                <div class="grid grid-cols-3 gap-4">
                 ${CHOICES.map(choice => {
                     const colorMap = { rock: 'text-slate-300', paper: 'text-green-400', scissors: 'text-red-400'};
                     return `
                        <button class="rps-choice-btn p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group" data-choice="${choice}" ${game.isRevealing ? 'disabled' : ''}>
                            <div class="w-16 h-16 transition-transform group-hover:scale-110">${renderChoiceIcon(choice, 'w-full h-full')}</div>
                            <span class="font-bold capitalize ${colorMap[choice]}" data-i18n-key="rps_${choice}"></span>
                        </button>`;
                 }).join('')}
                </div>
            </div>`;

        contentHTML = `<div class="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div class="md:col-span-1">${ladderHTML}</div>
            <div class="md:col-span-3 flex flex-col">
                ${battleAreaHTML}
                ${controlsHTML}
            </div>
        </div>`;
    } else { // won or lost
        const isWin = game.gameStatus === 'won';
         const shareButtonHTML = `
            <button id="rps-share-btn" class="bg-slate-800 text-white font-bold py-3 px-8 rounded-md hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 text-lg">
                ${createTwitterIcon('w-5 h-5')}
            </button>
        `;
        contentHTML = `
            <div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl">
                 <h3 class="text-4xl font-bold ${isWin ? 'text-green-400' : 'text-red-400'}" data-i18n-key="${isWin ? 'rps_new_king_title' : 'rps_defeat_title'}"></h3>
                 <p class="mt-2 text-slate-400" style="${isWin ? 'display:none;' : ''}"><span data-i18n-key="rps_furthest_step"></span>: ${game.furthestStepReached} / ${LADDER_STEPS}</p>
                 <div class="mt-6 flex items-center justify-center gap-4">
                     <button id="rps-play-again-btn" class="bg-amber-500 text-slate-900 font-bold py-3 px-8 rounded-md hover:bg-amber-400 transition-colors text-lg">
                        <span data-i18n-key="rps_play_again"></span>
                     </button>
                    ${shareButtonHTML}
                 </div>
            </div>`;
    }
    luckElements.luckGameMain.innerHTML = roomHeader + contentHTML;
    utils.translateUI(state.lang);
}

function handleEvent(e) {
    const game = state.luckGame.rpsKing;
    const startBtn = e.target.closest('#rps-start-btn');
    const choiceBtn = e.target.closest('.rps-choice-btn');
    const buffBtn = e.target.closest('.rps-buff-btn');
    const playAgainBtn = e.target.closest('#rps-play-again-btn');
    const shareBtn = e.target.closest('#rps-share-btn');

    if (startBtn) startGame();
    if (playAgainBtn) reset();
    if (shareBtn) handleShareToTwitter();
    
    if (game.gameStatus === 'playing' && !game.isRevealing) {
        if (choiceBtn) handleChoice(choiceBtn.dataset.choice);
        if (buffBtn) handleBuffSelect(parseInt(buffBtn.dataset.index));
    }
}

function handleShareToTwitter() {
    const game = state.luckGame.rpsKing;
    if (!game.shareMessage) return;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(game.shareMessage)}`;
    window.open(url, '_blank', 'width=550,height=420');
}

function startGame() {
    state.luckGame.rpsKing = getInitialState();
    state.luckGame.rpsKing.gameStatus = 'playing';
    addRandomBuff();
    render();
}

function addRandomBuff() {
    const game = state.luckGame.rpsKing;
    const t = translations[state.lang];
    const randomBuff = BUFF_TYPES[Math.floor(Math.random() * BUFF_TYPES.length)];
    game.buffs.push({ type: randomBuff });
    
    const buffName = t[`rps_buff_${randomBuff}_name`];
    const buffDescKey = `rpsBuff${randomBuff.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Desc`;
    const buffDesc = t[buffDescKey];
    
    game.buffInfoMessage = { title: (t.rps_buff_awarded || ''), name: buffName, desc: buffDesc, type: randomBuff };
}

function handleBuffSelect(index) {
    const game = state.luckGame.rpsKing;
    const t = translations[state.lang];
    const selectedBuff = game.buffs[index];
    
    if (game.activeBuff === selectedBuff) {
        game.activeBuff = null;
        game.buffInfoMessage = null;
    } else {
        game.activeBuff = selectedBuff;
        const buffName = (t[`rps_buff_${selectedBuff.type}_name`] || '');
        const buffDescKey = `rpsBuff${selectedBuff.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('')}Desc`;
        const buffDesc = (t[buffDescKey] || '');
        game.buffInfoMessage = { name: buffName, desc: buffDesc, type: selectedBuff.type };
    }
    render();
}


function getOpponentMove() {
    return CHOICES[Math.floor(Math.random() * CHOICES.length)];
}

function handleChoice(playerChoice) {
    const game = state.luckGame.rpsKing;
    const t = translations[state.lang];
    game.isRevealing = true;
    game.buffInfoMessage = null;
    game.roundEventMessage = '';
    
    let finalPlayerChoice = playerChoice;
    let opponentChoice = getOpponentMove();
    
    if(game.currentStep === 6 && !game.queenEncountered) {
        game.queenEncountered = true;
        const otherChoices = CHOICES.filter(c => c !== finalPlayerChoice);
        finalPlayerChoice = otherChoices[Math.floor(Math.random() * otherChoices.length)];
        game.roundEventMessage = (t.rps_queen_poisons_you || '')
            .replace('{original}', (t[`rps_${playerChoice}`] || ''))
            .replace('{new}', (t[`rps_${finalPlayerChoice}`] || ''));
    }
    
    if (game.activeBuff?.type === 'poison') {
        const originalOpponentChoice = opponentChoice;
        const otherChoices = CHOICES.filter(c => c !== originalOpponentChoice);
        opponentChoice = otherChoices[Math.floor(Math.random() * otherChoices.length)];
        game.roundEventMessage = (t.rps_poison_activates || '')
            .replace('{original}', (t[`rps_${originalOpponentChoice}`] || ''))
            .replace('{new}', (t[`rps_${opponentChoice}`] || ''));
    }

    game.playerChoice = finalPlayerChoice;
    game.opponentChoice = opponentChoice;
    
    const result = determineWinner(game.playerChoice, game.opponentChoice, game.activeBuff?.type);
    
    if (result === 1) { 
        game.roundMessage = (t.rps_round_win || ''); 
        if(game.playerChoice === game.opponentChoice && game.activeBuff?.type === 'drunken_fist') {
             game.roundEventMessage = (t.rps_drunken_fist_activates || '');
        }
    } 
    else if (result === -1) { game.roundMessage = (t.rps_round_loss || ''); }
    else { game.roundMessage = (t.rps_round_draw || ''); }
    
    render();
    
    setTimeout(() => {
        updateGameState(result);
    }, 2500);
}

function determineWinner(player, opponent, activeBuffType) {
    if (player === opponent) {
        return activeBuffType === 'drunken_fist' ? 1 : 0;
    }
    if (
        (player === 'rock' && opponent === 'scissors') ||
        (player === 'scissors' && opponent === 'paper') ||
        (player === 'paper' && opponent === 'rock')
    ) {
        return 1;
    }
    return -1;
}

function updateGameState(result) {
    const game = state.luckGame.rpsKing;
    const t = translations[state.lang];
    let previousStep = game.currentStep;
    game.roundMessage = '';
    
    if (result === -1) {
        if (game.activeBuff?.type === 'tenacity') {
            const buffDescKey = `rpsBuffTenacityDesc`;
            game.roundEventMessage = (t[buffDescKey] || '');
        } else if (game.currentStep === 1) {
            game.gameStatus = 'lost';
        } else if (game.currentStep === LADDER_STEPS) {
            game.kingBattleState.kingScore++;
        } else {
            game.currentStep = Math.max(1, game.currentStep - 1);
        }
    } 
    else if (result === 1) { 
        if (game.currentStep === LADDER_STEPS) {
            game.kingBattleState.playerScore++;
        } else {
            game.currentStep++;
            game.furthestStepReached = Math.max(game.furthestStepReached, game.currentStep);
        }
    }

    if (result === 1 && (previousStep === 3 || previousStep === 5)) {
        addRandomBuff();
    } else {
        if(!(game.roundEventMessage || '').includes(t.rpsBuffTenacityDesc || 'xxx-no-key-xxx')) {
            game.roundEventMessage = '';
        }
    }
    
    if(game.activeBuff) {
        game.buffs = game.buffs.filter(b => b !== game.activeBuff);
    }
    
    if (game.kingBattleState.playerScore >= 2) {
        game.gameStatus = 'won';
        game.furthestStepReached = LADDER_STEPS;
        game.shareMessage = (t.rps_share_win_tweet || '');
    } else if (game.kingBattleState.kingScore >= 2 || game.gameStatus === 'lost') {
        game.gameStatus = 'lost';
        game.shareMessage = (t.rps_share_loss_tweet || '')
            .replace('{step}', game.furthestStepReached)
            .replace('{totalSteps}', LADDER_STEPS);
    }
    
    game.playerChoice = null;
    game.opponentChoice = null;
    game.activeBuff = null;
    game.isRevealing = false;
    
    render();
}

function reset() {
    state.luckGame.rpsKing = getInitialState();
    render();
}

export const rpsGame = {
    getInitialState,
    initialize,
    render,
    handleEvent,
    reset,
    cleanUp: () => {},
    ICONS,
};
