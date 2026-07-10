
import { translations } from '../i18n/translations.js';

const getInitialState = () => ({
    initialized: false,
});

let state, elements, utils;

function initialize(context) {
    state = context.state;
    elements = context.elements;
    utils = context.utils;

    if (state.wheelOfFortune.initialized) return;

    render();
    state.wheelOfFortune.initialized = true;
}

function render() {
    const t = translations[state.lang];
    const mainContainer = document.getElementById('wheel-of-fortune-main');
    if (mainContainer) {
        mainContainer.innerHTML = `
            <div class="text-center p-8 bg-slate-800/60 border border-slate-700 rounded-xl">
                 <h3 class="text-2xl font-bold text-slate-400" data-i18n-key="comingSoonTitle">${t.comingSoonTitle}</h3>
                 <p class="mt-2 text-slate-500" data-i18n-key="wheelOfFortuneGameTitle">${t.wheelOfFortuneGameTitle}</p>
            </div>
        `;
    }
}

export const wheelOfFortuneApp = {
    initialState: getInitialState(),
    initialize: initialize,
    render: render,
};
