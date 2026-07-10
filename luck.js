
import { translations } from './translations.js';
import { createInfoIcon } from './icons.js';
import { startHoldProgress, cancelHoldProgress } from './animations.js';
import { diceDuelGame } from './dice-duel.js';
import { penneyRaceGame } from './penney-race.js';
import { designateChoiceGame } from './designate-choice.js';
import { fishPrawnCrabGame } from './fish-prawn-crab.js';
import { rpsGame } from './rps.js';

// --- CONSTANTS & STATE ---

const getInitialState = () => ({
    initialized: false,
    currentRoom: 'selection', // 'selection', 'black_velvet', 'red_velvet', 'blue_velvet', 'brown_velvet', 'rps_king'
    blackVelvet: diceDuelGame.getInitialState(),
    redVelvet: penneyRaceGame.getInitialState(),
    blueVelvet: designateChoiceGame.getInitialState(),
    brownVelvet: fishPrawnCrabGame.getInitialState(),
    rpsKing: rpsGame.getInitialState(),
});


// Module-scoped variables for context passed from index.js
let state, elements, utils, luckElements;

const comingSoonRenderer = (titleKey, backToHall = true) => {
    return () => {
        const t = translations[state.lang];
        let backButton = '';
        if (backToHall) {
            backButton = `
            <div class="relative flex items-center justify-center mb-4 h-10">
                <button class="back-to-rooms-btn absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-1 p-2 rounded-full text-slate-400 hover:bg-slate-700 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                    <span data-i18n-key="backToHall">${t.backToHall}</span>
                </button>
            </div>`;
        }
        luckElements.luckGameMain.innerHTML = `
            ${backButton}
            <div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl">
                 <h3 class="text-2xl font-bold text-slate-400" data-i18n-key="comingSoonTitle">${t.comingSoonTitle}</h3>
                 <p class="mt-2 text-slate-500" data-i18n-key="${titleKey}">${t[titleKey]}</p>
            </div>`;
        utils.translateUI(state.lang);
    };
};

const gameModules = {
    'black_velvet': diceDuelGame,
    'red_velvet': penneyRaceGame,
    'blue_velvet': designateChoiceGame,
    'brown_velvet': fishPrawnCrabGame,
    'rps_king': rpsGame,
    'wheel_of_fortune': { render: comingSoonRenderer('wheelOfFortuneGameDescription'), reset: () => {}, cleanUp: () => {} },
    'jukebox_game': { render: comingSoonRenderer('jukeboxGameDescription'), reset: () => {}, cleanUp: () => {} },
    'dice_nim_zero': { render: comingSoonRenderer('violetVelvetRoomDescription'), reset: () => {}, cleanUp: () => {} },
};


// --- INITIALIZATION ---
function initializeLuckGame(context) {
    // Set up context
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.luckGame.initialized) return;

    // Cache DOM elements
    luckElements = {};
    Object.assign(luckElements, {
        luckGameMain: document.getElementById('luck-game-main'),
        rulesModal: document.getElementById('rules-modal'),
        rulesModalTitle: document.getElementById('rules-modal-title'),
        rulesModalContent: document.getElementById('rules-modal-content'),
        rulesModalCloseBtn: document.getElementById('rules-modal-close-btn'),
    });
    
    // Initialize each game module with the shared context
    Object.values(gameModules).forEach(module => {
      if (typeof module.initialize === 'function') {
        module.initialize(context, luckElements);
      }
    });
    
    // --- Event Listeners ---
    let pressTimer;
    let pressedCard = null;
    const handlePressEnd = () => {
        clearTimeout(pressTimer);
        if (pressedCard) {
            cancelHoldProgress(pressedCard);
            pressedCard = null;
        }
    };

    const handlePressStart = (e) => {
        const card = e.target.closest('.room-card.dev-locked-card');
        if (card && card.dataset.room) {
            // Prevent default for touch events to stop scrolling, etc.
            if (e.type === 'touchstart') e.preventDefault();

            pressedCard = card;
            startHoldProgress(card);
            pressTimer = setTimeout(() => {
                cancelHoldProgress(card);
                handleRoomSelection(card.dataset.room);
            }, 5000);
        }
    };
    
    elements.luckGameApp.addEventListener('mousedown', handlePressStart);
    elements.luckGameApp.addEventListener('mouseup', handlePressEnd);
    elements.luckGameApp.addEventListener('mouseleave', handlePressEnd);
    elements.luckGameApp.addEventListener('touchstart', handlePressStart, { passive: false });
    elements.luckGameApp.addEventListener('touchend', handlePressEnd);

    elements.luckGameApp.addEventListener('click', handleLuckAppClick);
    elements.luckGameApp.addEventListener('input', handleLuckAppInput);
    elements.luckGameApp.addEventListener('contextmenu', handleLuckAppContextMenu);

    luckElements.rulesModalCloseBtn.addEventListener('click', closeRulesModal);
    luckElements.rulesModal.addEventListener('click', (e) => {
        if (e.target === luckElements.rulesModal) closeRulesModal();
    });

    renderLuckGame();
    state.luckGame.initialized = true;
}

// --- RENDER FUNCTIONS ---
function renderLuckGame() {
    if (!state) return;
    const { currentRoom } = state.luckGame;
    
    const activeModule = gameModules[currentRoom];
    if (activeModule) {
        activeModule.render();
    } else {
        renderLuckRoomSelection();
    }

    utils.translateUI(state.lang);
}

function renderLuckRoomSelection() {
    const t = translations[state.lang];
    
    const roomCard = (id, roomKey, titleKey, subtitleKey, descKey, color, hoverGradient, shimmerGradient, isLocked = false, isDevLocked = false) => {
        const lockedClass = isDevLocked ? 'dev-locked-card' : isLocked ? 'locked-room-card opacity-70 cursor-not-allowed' : 'interactive-hover';
        const cursorClass = isLocked ? '' : 'cursor-pointer';
        const finalId = isLocked ? '' : `id="${id}"`;

        return `
        <div ${finalId} class="room-card tool-card ${lockedClass} border border-slate-700 rounded-2xl p-1 text-left ${cursorClass} flex flex-col h-full" data-room="${roomKey}" style="--hover-gradient: ${hoverGradient}; --shimmer-gradient: ${shimmerGradient};">
            <div class="relative-content p-4">
                <div class="flex-grow">
                    <h3 class="text-xl font-bold ${color}" data-i18n-key="${titleKey}">${t[titleKey]}</h3>
                    <p class="text-sm shimmering-gradient-text mt-1" data-i18n-key="${subtitleKey}">${t[subtitleKey]}</p>
                    <p class="mt-1 text-sm text-slate-400" data-i18n-key="${descKey}">${t[descKey]}</p>
                </div>
                <div class="mt-4 inline-block font-bold ${color} group">
                    <span data-i18n-key="enterRoom">${t.enterRoom}</span>
                    <span class="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">&rarr;</span>
                </div>
            </div>
        </div>
        `;
    };

    luckElements.luckGameMain.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            ${roomCard('select-black-velvet', 'black_velvet', 'blackVelvetRoomTitle', 'blackVelvetRoomSubtitle', 'blackVelvetRoomDescription', 'text-slate-300', 'linear-gradient(110deg, transparent 30%, rgba(203, 213, 225, 0.3) 50%, transparent 70%)', 'linear-gradient(90deg, #94a3b8, #e2e8f0, #94a3b8)')}
            ${roomCard('select-red-velvet', 'red_velvet', 'redVelvetRoomTitle', 'redVelvetRoomSubtitle', 'redVelvetRoomDescription', 'text-red-400', 'linear-gradient(110deg, transparent 30%, rgba(239, 68, 68, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #f87171, #fca5a5, #f87171)')}
            ${roomCard('select-blue-velvet', 'blue_velvet', 'blueVelvetRoomTitle', 'blueVelvetRoomSubtitle', 'blueVelvetRoomDescription', 'text-blue-400', 'linear-gradient(110deg, transparent 30%, rgba(96, 165, 250, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #60a5fa, #93c5fd, #60a5fa)')}
            ${roomCard('select-brown-velvet', 'brown_velvet', 'brownVelvetRoomTitle', 'brownVelvetRoomSubtitle', 'brownVelvetRoomDescription', 'text-orange-400', 'linear-gradient(110deg, transparent 30%, rgba(251, 146, 60, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #fb923c, #fcd34d, #fb923c)', false, false)}
            ${roomCard('', 'wheel_of_fortune', 'wheelOfFortuneGameTitle', 'yellowVelvetRoomTitle', 'wheelOfFortuneGameDescription', 'text-yellow-400', 'linear-gradient(110deg, transparent 30%, rgba(250, 204, 21, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #facc15, #fde047, #facc15)', false, true)}
            ${roomCard('', 'jukebox_game', 'jukeboxGameTitle', 'pinkVelvetRoomTitle', 'jukeboxGameDescription', 'text-pink-400', 'linear-gradient(110deg, transparent 30%, rgba(236, 72, 153, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #ec4899, #f9a8d4, #ec4899)', false, true)}
            ${roomCard('', 'rps_king', 'rpsKingGameTitle', 'greenVelvetRoomTitle', 'greenVelvetRoomDescription', 'text-green-400', 'linear-gradient(110deg, transparent 30%, rgba(77, 182, 172, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #4ade80, #86efac, #4ade80)', false, true)}
            ${roomCard('', 'dice_nim_zero', 'gourdCrabFishKingEditionGameTitle', 'violetVelvetRoomTitle', 'violetVelvetRoomDescription', 'text-purple-400', 'linear-gradient(110deg, transparent 30%, rgba(168, 85, 247, 0.4) 50%, transparent 70%)', 'linear-gradient(90deg, #a855f7, #d8b4fe, #a855f7)', false, true)}
        </div>
    `;
}

// --- EVENT HANDLERS & LOGIC ---

function handleLuckAppClick(e) {
    const { currentRoom } = state.luckGame;
    const target = e.target;
    
    // Shared Controls
    const backToRoomsBtn = target.closest('.back-to-rooms-btn');
    if (backToRoomsBtn) {
        resetToSelection();
        return;
    }

    const rulesBtn = target.closest('.rules-btn');
    if (rulesBtn) {
        openRulesModal(rulesBtn.dataset.room);
        return;
    }

    // Room Selection
    if (currentRoom === 'selection') {
        const card = target.closest('.tool-card');
        if (!card) return;
        
        // This handles regular, non-locked cards
        if (card.classList.contains('room-card') && !card.classList.contains('dev-locked-card') && !card.classList.contains('locked-room-card')) {
            handleRoomSelection(card.dataset.room);
        }
        return;
    }
    
    // Delegate to active game module
    const activeModule = gameModules[currentRoom];
    if (activeModule && typeof activeModule.handleEvent === 'function') {
        activeModule.handleEvent(e);
    }
}

function handleLuckAppInput(e) {
    const { currentRoom } = state.luckGame;
    const activeModule = gameModules[currentRoom];
    if (activeModule && typeof activeModule.handleEvent === 'function') {
        activeModule.handleEvent(e);
    }
}

function handleLuckAppContextMenu(e) {
    const { currentRoom } = state.luckGame;
    const activeModule = gameModules[currentRoom];
    if (activeModule && typeof activeModule.handleEvent === 'function') {
        activeModule.handleEvent(e);
    }
}

function handleRoomSelection(roomKey) {
    const mainContainer = luckElements.luckGameMain;
    
    mainContainer.style.opacity = 0;
    setTimeout(() => {
        const previousRoom = state.luckGame.currentRoom;
        const previousModule = gameModules[previousRoom];
        if (previousModule && typeof previousModule.cleanUp === 'function') {
            previousModule.cleanUp();
        }

        state.luckGame.currentRoom = roomKey;
        const newModule = gameModules[roomKey];
        if (newModule) {
            newModule.reset();
        }
        
        renderLuckGame();
        mainContainer.style.opacity = 1;
    }, 200);
}

function resetToSelection(context) {
    if (context) {
        state = context.state;
        utils = context.utils;
    }
    handleRoomSelection('selection');
}


// --- RULES MODAL ---

function getRulesContent(room) {
    const t = translations[state.lang];
    let titleKey = '';
    let contentHTML = 'No rules available for this room.';

    const createRuleItem = (number, content) => `<li><span class="rule-number">${number}</span><div class="rule-text">${content}</div></li>`;
    const createHeader = (text) => `<h4 class="font-bold text-amber-400 mb-2 mt-4">${text}</h4>`;

    switch (room) {
        case 'black_velvet':
            titleKey = 'ddGuideTitle';
            contentHTML = `
                <p class="mb-2">${t.ddGuideIntro_p1}</p>
                <p class="mb-4 text-slate-400">${t.ddGuideIntro_p2}</p>
                
                ${createHeader(t.ddGuideTheDice)}
                <ul class="space-y-3 mt-3">
                    <li class="p-3 bg-slate-900/50 rounded-lg">${t.ddGuideDieDesc_black}</li>
                    <li class="p-3 bg-slate-900/50 rounded-lg">${t.ddGuideDieDesc_white}</li>
                    <li class="p-3 bg-slate-900/50 rounded-lg">${t.ddGuideDieDesc_red}</li>
                </ul>

                ${createHeader(t.ddGuideHowTo)}
                <ol class="rules-list">
                    ${createRuleItem(1, t.ddGuideStep1)}
                    ${createRuleItem(2, t.ddGuideStep2)}
                    ${createRuleItem(3, t.ddGuideStep3)}
                </ol>

                ${createHeader(t.ddGuideExampleTitle)}
                <div class="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
                    <p>${t.ddGuideExampleContent}</p>
                </div>`;
            break;
        case 'red_velvet':
             titleKey = 'prGuideTitle';
             contentHTML = `
                <p class="mb-4">${t.prGuideIntro_p1}</p>
                
                ${createHeader(t.prGuideHowTo)}
                <ol class="rules-list">
                    ${createRuleItem(1, t.prGuideStep1)}
                    ${createRuleItem(2, t.prGuideStep2)}
                    ${createRuleItem(3, t.prGuideStep3)}
                </ol>

                ${createHeader(t.prGuideExampleTitle)}
                <div class="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
                    <p>${t.prGuideExampleContent}</p>
                </div>`;
            break;
        case 'blue_velvet':
            titleKey = 'bvrTitle';
            contentHTML = `
                <p class="mb-4">${t.bvrGuideIntro}</p>
                ${createHeader(t.bvrGuideDilemma)}
                <p class="text-slate-300">${t.bvrGuideDilemmaDesc}</p>
                <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="p-3 bg-slate-900/50 rounded-lg border border-cyan-500/50">
                        <strong class="text-cyan-400">${t.bvrGuideChoice1}</strong>
                        <p class="text-sm text-slate-400 mt-1">${t.bvrGuideChoice1Desc}</p>
                    </div>
                    <div class="p-3 bg-slate-900/50 rounded-lg border border-purple-500/50">
                        <strong class="text-purple-400">${t.bvrGuideChoice2}</strong>
                        <p class="text-sm text-slate-400 mt-1">${t.bvrGuideChoice2Desc}</p>
                    </div>
                </div>
                ${createHeader(t.bvrGuideVerdict)}
                <p class="text-slate-300">${t.bvrGuideVerdictDesc}</p>`;
            break;
        case 'brown_velvet':
            titleKey = 'brownVelvetRoomTitle';
            contentHTML = `
                <p class="mb-4">${t.fpcGuideIntro}</p>
                ${createHeader(t.fpcGuideHowTo)}
                <ol class="rules-list">
                    ${createRuleItem(1, t.fpcGuideStep1)}
                    ${createRuleItem(2, t.fpcGuideStep2)}
                </ol>
                ${createHeader(t.fpcGuidePayouts)}
                <ul class="rules-list">
                    <li><span class="rule-number">1:1</span><div class="rule-text">${t.fpcGuidePayoutsSingle}</div></li>
                    <li><span class="rule-number">5:1</span><div class="rule-text">${t.fpcGuidePayoutsPair}</div></li>
                </ul>
                ${createHeader(t.fpcGuideExampleTitle)}
                <div class="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50 space-y-2">
                    <div><p>${t.fpcGuideExampleSetup}</p></div>
                    <ul class="list-disc list-inside text-slate-300">
                        <li>${t.fpcGuideExampleResult1}</li>
                        <li>${t.fpcGuideExampleResult2}</li>
                        <li>${t.fpcGuideExampleTotal}</li>
                    </ul>
                </div>`;
            break;
        case 'rps_king':
            titleKey = 'rpsKingGameTitle';
            contentHTML = `
                <p class="mb-4">${t.rpsGuideIntro}</p>
                ${createHeader(t.rpsGuideFlow)}
                <ol class="rules-list">
                    ${createRuleItem(1, t.rpsGuideStep1)}
                    ${createRuleItem(2, t.rpsGuideStep2)}
                    ${createRuleItem(3, t.rpsGuideStep3)}
                </ol>
                ${createHeader(t.rpsGuideBuffs)}
                <p class="mb-2 text-slate-300">${t.rpsGuideBuffsDesc}</p>
                <ul class="space-y-3 mt-4">
                  <li class="flex items-start gap-4 p-3 bg-slate-900/50 rounded-lg">
                    <div class="flex-shrink-0 text-cyan-400">${rpsGame.ICONS.buff.tenacity}</div>
                    <div><strong class="text-cyan-400">${t.rps_buff_tenacity_name}</strong><p class="text-sm text-slate-400 mt-1">${t.rpsBuffTenacityDesc}</p></div>
                  </li>
                  <li class="flex items-start gap-4 p-3 bg-slate-900/50 rounded-lg">
                     <div class="flex-shrink-0 text-blue-400">${rpsGame.ICONS.buff.drunken_fist}</div>
                    <div><strong class="text-blue-400">${t.rps_buff_drunken_fist_name}</strong><p class="text-sm text-slate-400 mt-1">${t.rpsBuffDrunkenFistDesc}</p></div>
                  </li>
                   <li class="flex items-start gap-4 p-3 bg-slate-900/50 rounded-lg">
                     <div class="flex-shrink-0 text-purple-400">${rpsGame.ICONS.buff.poison}</div>
                    <div><strong class="text-purple-400">${t.rps_buff_poison_name}</strong><p class="text-sm text-slate-400 mt-1">${t.rpsBuffPoisonDesc}</p></div>
                  </li>
                </ul>`;
            break;
    }

    return { title: t[titleKey] || 'Rules', content: contentHTML };
}

function openRulesModal(room) {
    const { title, content } = getRulesContent(room);
    luckElements.rulesModalTitle.innerHTML = title;
    luckElements.rulesModalContent.innerHTML = content;
    luckElements.rulesModal.classList.add('open');
    // No need to call translateUI as content is built with translated text
}

function closeRulesModal() {
    luckElements.rulesModal.classList.remove('open');
}


// --- EXPORT MODULE ---
export const luckApp = {
    initialState: getInitialState(),
    initialize: initializeLuckGame,
    render: renderLuckGame,
    resetToSelection
};