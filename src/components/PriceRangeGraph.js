import { translations } from '../i18n/translations.js';

const formatGraphNumber = (value) => {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
    }).format(value);
};

export function createPriceRangeGraph({ minPrice, maxPrice, currentPrice, tokenASymbol, tokenBSymbol, lang }) {
  if (minPrice >= maxPrice || maxPrice <= 0) {
    return null;
  }
  
  const t = translations[lang];
  const container = document.createElement('div');
  container.className = 'mt-4 space-y-3';

  const range = maxPrice - minPrice;
  const currentPositionPercent = Math.max(0, Math.min(100, ((currentPrice - minPrice) / range) * 100));
  const isOutOfRange = currentPrice < minPrice || currentPrice > maxPrice;

  const warningHTML = isOutOfRange ? `
    <div class="text-center text-xs text-red-400 mt-2 p-2 bg-red-500/10 rounded-md border border-red-500/30">
        ${t.graphWarning}
    </div>
  ` : '';

  container.innerHTML = `
    <div class="relative h-2 w-full rounded-full bg-gradient-to-r from-teal-500 to-indigo-500">
        <div 
            class="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
            style="left: ${currentPositionPercent}%"
        >
            <div class="w-4 h-4 rounded-full border-2 ${isOutOfRange ? 'bg-red-500 border-red-300' : 'bg-cyan-400 border-white'} shadow-lg"></div>
            <div class="absolute top-6 left-1/2 -translate-x-1/2 text-center text-xs p-1 bg-slate-900 rounded-md w-max z-10">
                <div class="w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-b-4 border-b-slate-900 mx-auto -mt-2"></div>
                <span class="font-bold text-white whitespace-nowrap">${t.graphCurrent}: ${formatGraphNumber(currentPrice)}</span>
            </div>
        </div>
    </div>
    <div class="relative flex justify-between text-xs text-slate-400">
        <div class="text-left">
            <div class="font-bold text-teal-400">${t.graphMin}</div>
            <div>${formatGraphNumber(minPrice)}</div>
            <div class="text-slate-300">${t.graphAssetA.replace('{token}', tokenASymbol)}</div>
        </div>
        <div class="text-right">
            <div class="font-bold text-indigo-400">${t.graphMax}</div>
            <div>${formatGraphNumber(maxPrice)}</div>
            <div class="text-slate-300">${t.graphAssetB.replace('{token}', tokenBSymbol)}</div>
        </div>
    </div>
    ${warningHTML}
  `;
  
  return container;
}
