
import { createSearchIcon, createCloseIcon } from './icons.js';
import { translations } from '../i18n/translations.js';

export const CoinSelector = (() => {
  let modalElement;
  let onSelectCallback;
  let allCoins = [];
  let searchTerm = "";

  function renderList() {
    const listElement = modalElement.querySelector('.coin-list');
    // Fall back to English: a stale saved language (e.g. 'th') has no entry
    // in `translations` and would crash rendering otherwise.
    const t = translations[localStorage.getItem('appLanguage') || 'en'] || translations.en;

    const filteredCoins = searchTerm
      ? allCoins.filter(coin =>
          coin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : allCoins;

    if (filteredCoins.length > 0) {
      listElement.innerHTML = filteredCoins.map(coin => `
        <li data-coin-id="${coin.id}" class="flex items-center px-4 py-3 hover:bg-slate-700 cursor-pointer text-slate-200 transition-colors">
          <img src="${coin.image}" alt="${coin.name}" class="w-8 h-8 mr-4 rounded-full" />
          <div class="flex flex-col">
            <span class="font-bold">${coin.symbol.toUpperCase()}</span>
            <span class="text-slate-400 text-sm">${coin.name}</span>
          </div>
        </li>
      `).join('');
    } else {
      listElement.innerHTML = `<li class="px-4 py-6 text-center text-slate-400">${t.noResultsFound}</li>`;
    }
  }

  function hide() {
    modalElement.classList.remove('open');
    onSelectCallback = null;
    modalElement.querySelector('.coin-search-input').value = "";
    searchTerm = "";
  }
  
  function init(container) {
    const lang = localStorage.getItem('appLanguage') || 'en';
    const t = translations[lang] || translations.en;

    modalElement = document.createElement('div');
    modalElement.className = 'modal-overlay';
    modalElement.innerHTML = `
      <div class="modal-content coin-selector-modal-content">
        <header class="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0">
          <h3 class="text-lg font-bold text-white">${t.selectCoinPlaceholder}</h3>
          <button type="button" class="p-1 rounded-full text-slate-400 hover:bg-slate-600 hover:text-white transition-colors modal-close-button">
            ${createCloseIcon('h-6 w-6')}
          </button>
        </header>
        <div class="p-3 border-b border-slate-700 flex-shrink-0">
          <div class="relative">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400">${createSearchIcon()}</div>
            <input
              type="text"
              placeholder="${t.searchCoinPlaceholder}"
              class="w-full bg-slate-700 text-white rounded-md pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 coin-search-input"
            />
          </div>
        </div>
        <ul class="overflow-y-auto custom-scrollbar flex-grow coin-list">
          <!-- Coin items will be rendered here -->
        </ul>
      </div>
    `;

    container.appendChild(modalElement);

    // Event listeners
    modalElement.querySelector('.modal-close-button').addEventListener('click', hide);
    modalElement.addEventListener('click', (e) => {
        if (e.target === modalElement) { // Only close if overlay is clicked, not content
            hide();
        }
    });

    modalElement.querySelector('.coin-search-input').addEventListener('input', (e) => {
      searchTerm = e.target.value;
      renderList();
    });

    modalElement.querySelector('.coin-list').addEventListener('click', (e) => {
      const li = e.target.closest('li[data-coin-id]');
      if (li && onSelectCallback) {
        onSelectCallback(li.dataset.coinId);
        hide();
      }
    });
  }

  function show(coins, onSelect) {
    allCoins = coins;
    onSelectCallback = onSelect;
    modalElement.classList.add('open');
    renderList();
    setTimeout(() => modalElement.querySelector('.coin-search-input')?.focus(), 100);
  }

  function update(newCoins) {
    allCoins = newCoins;
    if(modalElement && modalElement.classList.contains('open')) {
      renderList();
    }
  }

  return { init, show, update, hide };
})();