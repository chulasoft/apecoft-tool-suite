
import { translations } from '../i18n/translations.js';

const getInitialState = () => ({
    initialized: false,
});

let state, elements, utils;

function initialize(context) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.jukeboxGame.initialized) return;

    render();
    state.jukeboxGame.initialized = true;
}

function render() {
    const t = translations[state.lang];
    const mainContainer = document.getElementById('jukebox-game-main');
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl">
                 <h3 class="text-2xl font-bold text-slate-400" data-i18n-key="comingSoonTitle">${t.comingSoonTitle}</h3>
                 <p class="mt-2 text-slate-500" data-i18n-key="jukeboxGameTitle">${t.jukeboxGameTitle}</p>
            </div>
        `;
    }
}

export const jukeboxGameApp = {
    initialState: getInitialState(),
    initialize: initialize,
    render: render,
};
