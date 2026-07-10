
export function createCheckIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
    </svg>
  `;
}

export function createCloseIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${className}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  `;
}

export function createInfoIcon(className = "h-6 w-6") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${className}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
    </svg>
  `;
}

export function createLockIcon(className = "h-12 w-12") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="${className}">
      <path fill-rule="evenodd" d="M12 1.5a5.25 5.25 0 00-5.25 5.25v3a3 3 0 00-3 3v6.75a3 3 0 003 3h10.5a3 3 0 003-3v-6.75a3 3 0 00-3-3v-3A5.25 5.25 0 0012 1.5zm-3.75 5.25v3h7.5v-3a3.75 3.75 0 00-7.5 0z" clip-rule="evenodd" />
    </svg>
  `;
}

export function createPdfIcon(className = "h-4 w-4 mr-2") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm0 2h12v12H4V4z" clip-rule="evenodd" />
        <path d="M5.5 8.5a.5.5 0 01.5-.5h1.5a.5.5 0 01.5.5v3a.5.5 0 01-.5.5H6a.5.5 0 01-.5-.5V9.75a.5.5 0 01.5-.5H7a.5.5 0 000-1H6a.5.5 0 01-.5-.5z" />
        <path d="M8.5 8.5a.5.5 0 01.5-.5h2a.5.5 0 010 1H9.5a.5.5 0 00-.5.5v1a.5.5 0 00.5.5h2a.5.5 0 010 1H9a.5.5 0 01-.5-.5v-3z" />
        <path d="M12.5 8.5a.5.5 0 01.5-.5h1a.5.5 0 01.5.5v3a.5.5 0 01-1 0V9h-.5a.5.5 0 01-.5-.5z" />
    </svg>`;
}

export function createSearchIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${className}">
      <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  `;
}

export function createSwapIcon(className = "w-5 h-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="${className}">
      <path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  `;
}

export function createWarningIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 20 20" fill="currentColor">
      <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 3.001-1.742 3.001H4.42c-1.53 0-2.493-1.667-1.743-3.001l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd" />
    </svg>
  `;
}

export function createTwitterIcon(className = "h-5 w-5") {
    return `
    <svg class="${className}" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></svg>
    `;
}

// Icons moved from yield.js
export const createEditIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fill-rule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clip-rule="evenodd" /></svg>`;
export const createDuplicateIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" /><path d="M5 3a2 2 0 00-2 2v6a1 1 0 102 0V5h6a1 1 0 100-2H5z" /></svg>`;
export const createDeleteIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" /></svg>`;
export const createImportIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clip-rule="evenodd" /></svg>`;
export const createExportIcon = () => `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>`;
export const createChevronLeftIcon = (className = 'w-5 h-5') => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>`;
export const createChevronRightIcon = (className = 'w-5 h-5') => `<svg xmlns="http://www.w3.org/2000/svg" class="${className}" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>`;


// Icons for Rock-Paper-Scissors game
export function createHandRockIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <defs>
            <radialGradient id="rockGradient" cx="40%" cy="40%" r="60%">
                <stop offset="0%" style="stop-color:#94a3b8" />
                <stop offset="100%" style="stop-color:#475569" />
            </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="10" fill="url(#rockGradient)" stroke="#cbd5e1" stroke-width="1.5"/>
    </svg>
  `;
}

export function createHandPaperIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
       <defs>
            <radialGradient id="paperGradient" cx="40%" cy="40%" r="60%">
                <stop offset="0%" style="stop-color:#6ee7b7" />
                <stop offset="100%" style="stop-color:#059669" />
            </radialGradient>
        </defs>
        <rect x="3" y="3" width="18" height="18" rx="2" fill="url(#paperGradient)" stroke="#a7f3d0" stroke-width="1.5"/>
    </svg>
  `;
}

export function createHandScissorsIcon(className = "h-5 w-5") {
  return `
    <svg xmlns="http://www.w3.org/2000/svg" class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <defs>
            <radialGradient id="scissorsGradient" cx="50%" cy="70%" r="60%">
                <stop offset="0%" style="stop-color:#f87171" />
                <stop offset="100%" style="stop-color:#b91c1c" />
            </radialGradient>
        </defs>
        <path d="M12 2 L2 22 L22 22 Z" fill="url(#scissorsGradient)" stroke="#fca5a5" stroke-width="1.5"/>
    </svg>
  `;
}
