// Centralized animation helpers powered by anime.js v4.
// Degrades gracefully: if the CDN import fails or the user prefers reduced
// motion, every helper becomes a cheap no-op and the UI still works.

// Loaded lazily (no top-level await: that would delay evaluation of every
// module importing this one past DOMContentLoaded and break app startup).
let anime = null;
const animeReady = import('animejs')
    .then(m => { anime = m; })
    .catch(e => console.warn('anime.js unavailable, falling back to CSS-only transitions.', e));

const prefersReducedMotion = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const canAnimate = () => anime && !prefersReducedMotion();

// --- Landing page intro: hero fades up, tool cards stagger in ---
export async function playLandingIntro() {
    await animeReady;
    if (!canAnimate()) return;

    const hero = document.querySelectorAll('#landing-page > header > *');
    const cards = document.querySelectorAll('#landing-page .tool-card');

    if (hero.length) {
        anime.animate(hero, {
            opacity: [0, 1],
            translateY: [18, 0],
            duration: 550,
            delay: anime.stagger(90),
            ease: 'outCubic',
        });
    }
    if (cards.length) {
        anime.animate(cards, {
            opacity: [0, 1],
            translateY: [26, 0],
            scale: [0.97, 1],
            duration: 500,
            delay: anime.stagger(45, { start: 120 }),
            ease: 'outCubic',
        });
    }
}

// --- View transitions: fade/slide the root between views ---
export function transitionView(rootEl, applySwitch) {
    if (!canAnimate()) {
        // Preserve the original behavior as fallback
        rootEl.style.opacity = 0;
        setTimeout(() => {
            applySwitch();
            rootEl.style.opacity = 1;
        }, 200);
        return;
    }

    anime.animate(rootEl, {
        opacity: [1, 0],
        translateY: [0, -10],
        duration: 180,
        ease: 'inQuad',
        onComplete: () => {
            applySwitch();
            anime.animate(rootEl, {
                opacity: [0, 1],
                translateY: [14, 0],
                duration: 320,
                ease: 'outCubic',
            });
        },
    });
}

// --- Micro-interaction: pulse an input when stepped up/down ---
export function pulseInput(inputEl) {
    if (prefersReducedMotion()) return;
    inputEl.classList.remove('input-pulse');
    // Force reflow so the animation can replay on rapid clicks
    void inputEl.offsetWidth;
    inputEl.classList.add('input-pulse');
}

// --- Mouse-tracking spotlight on landing cards ---
export function setupCardSpotlight(containerEl) {
    if (!containerEl || prefersReducedMotion()) return;
    containerEl.addEventListener('mousemove', (e) => {
        const card = e.target.closest('.tool-card');
        if (!card) return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
}

// --- Hold-to-unlock progress ring for dev-locked cards ---
// Shows feedback only while an admin is actively long-pressing,
// so the lock stays invisible during normal browsing.
export function startHoldProgress(cardEl) {
    if (!cardEl || cardEl.querySelector('.hold-ring')) return;

    const ring = document.createElement('div');
    ring.className = 'hold-ring';
    ring.innerHTML = `
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle class="track" cx="28" cy="28" r="22"></circle>
            <circle class="progress" cx="28" cy="28" r="22"></circle>
        </svg>`;
    cardEl.appendChild(ring);
    // Next frame, activate to kick off the 5s CSS stroke transition
    requestAnimationFrame(() => requestAnimationFrame(() => ring.classList.add('active')));
}

export function cancelHoldProgress(cardEl) {
    if (!cardEl) return;
    cardEl.querySelectorAll('.hold-ring').forEach(el => el.remove());
}
