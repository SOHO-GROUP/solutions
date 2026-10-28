/**
 * SOHO SOLUTIONS — Frontend UI, Theme Switcher & Executive Interaction Controller
 * Domain: www.solutions.sohog.org
 * Note: Strictly handles visual UI, Light/Dark theme switching, counters, mobile menu,
 *       and service pre-selection. Form validation and submission are handled exclusively by js/form-handler.js.
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeSwitcher();
  initMobileNavigation();
  initScrollReveal();
  initAuthorityCounters();
  initServicePreselection();
  initPrivacyModal();
});

/**
 * 1. Light / Dark Mode Theme Switcher
 * Palette:
 * - Light: Crisp Whites + SOHO Solutions Teal (#0F5E63) & Slate (#54626B)
 * - Dark: Soft Slate-Petroleum (Max 20% Black, #1E292E) + SOHO Solutions Teal & Slate
 */
function initThemeSwitcher() {
  const htmlEl = document.documentElement;
  const toggleButtons = document.querySelectorAll('[data-theme-toggle]');
  const STORAGE_KEY = 'soho_solutions_theme';

  const applyTheme = (theme) => {
    const validTheme = theme === 'light' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', validTheme);
    htmlEl.classList.toggle('dark', validTheme === 'dark');

    toggleButtons.forEach((btn) => {
      const sunIcon = btn.querySelector('.theme-icon-sun');
      const moonIcon = btn.querySelector('.theme-icon-moon');
      const labelEl = btn.querySelector('.theme-toggle-label');

      if (validTheme === 'dark') {
        // In Dark Mode, offer switch to Light Mode (or indicate current mode clearly)
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
        if (labelEl) labelEl.textContent = 'Modo Claro';
        btn.setAttribute('aria-label', 'Cambiar a Modo Claro');
        btn.setAttribute('title', 'Cambiar a Modo Claro');
      } else {
        // In Light Mode, offer switch to Dark Mode
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
        if (labelEl) labelEl.textContent = 'Modo Oscuro';
        btn.setAttribute('aria-label', 'Cambiar a Modo Oscuro');
        btn.setAttribute('title', 'Cambiar a Modo Oscuro');
      }
    });
  };

  let savedTheme = 'dark';
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY) || htmlEl.getAttribute('data-theme') || 'dark';
  } catch (_) {
    savedTheme = htmlEl.getAttribute('data-theme') || 'dark';
  }

  applyTheme(savedTheme);

  toggleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const current = htmlEl.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (_) {
        // Ignore storage errors in private mode
      }
    });
  });
}

/**
 * 2. Mobile Navigation Controller (Accessible toggle for 375px / 768px viewports)
 */
function initMobileNavigation() {
  const menuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('menu-icon-open');
  const iconClose = document.getElementById('menu-icon-close');

  if (!menuBtn || !mobileMenu) return;

  const toggleMenu = (forceClose = false) => {
    const isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
    const nextState = forceClose ? false : !isExpanded;

    menuBtn.setAttribute('aria-expanded', String(nextState));
    mobileMenu.classList.toggle('hidden', !nextState);

    if (iconOpen && iconClose) {
      iconOpen.classList.toggle('hidden', nextState);
      iconClose.classList.toggle('hidden', !nextState);
    }
  };

  menuBtn.addEventListener('click', () => toggleMenu());

  // Close mobile menu when clicking any navigation link inside it
  const mobileLinks = mobileMenu.querySelectorAll('a');
  mobileLinks.forEach((link) => {
    link.addEventListener('click', () => toggleMenu(true));
  });
}

/**
 * 3. Scroll Reveal Observer for Editorial Sections
 */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal-on-scroll');
  if (!revealElements.length) return;

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
  );

  revealElements.forEach((el) => observer.observe(el));
}

/**
 * 4. Authority Counters
 * Guarantees that the 5 authorized WEB SOHO strings are always displayed accurately:
 * - + 100 Diagnósticos
 * - + 20 Socios SOLUTIONS
 * - + 30 Blindajes Fiscales
 * - + 50 Juicios Fiscales
 * - + 100K millones optimizados
 */
function initAuthorityCounters() {
  const counters = document.querySelectorAll('[data-counter-target]');
  if (!counters.length) return;

  counters.forEach((el) => {
    const target = parseInt(el.getAttribute('data-counter-target'), 10);
    const prefix = el.getAttribute('data-counter-prefix') || '+ ';
    const suffix = el.getAttribute('data-counter-suffix') || '';
    const finalExactText = el.getAttribute('data-counter-exact') || `${prefix}${target}${suffix}`;
    el.textContent = finalExactText;
  });
}

/**
 * 5. Direct Service CTA Pre-selection (COMEXT / DEFENSE)
 * Smoothly selects the corresponding priority need in #area_necesidad when user clicks a unit CTA.
 */
function initServicePreselection() {
  const serviceTriggers = document.querySelectorAll('[data-select-service]');
  const selectField = document.getElementById('area_necesidad');

  if (!serviceTriggers.length || !selectField) return;

  serviceTriggers.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetValue = btn.getAttribute('data-select-service');
      if (!targetValue) return;

      const options = Array.from(selectField.options);
      const matchingOption = options.find(
        (opt) => opt.value === targetValue || opt.value.includes(targetValue)
      );

      if (matchingOption) {
        selectField.value = matchingOption.value;
        selectField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

/**
 * 6. Accessible Privacy Notice Modal (Footer)
 */
function initPrivacyModal() {
  const openBtns = document.querySelectorAll('[data-open-privacy]');
  const closeBtns = document.querySelectorAll('[data-close-privacy]');
  const modal = document.getElementById('privacy-modal');

  if (!modal) return;

  const openModal = (e) => {
    if (e) e.preventDefault();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  openBtns.forEach((btn) => btn.addEventListener('click', openModal));
  closeBtns.forEach((btn) => btn.addEventListener('click', closeModal));

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeModal();
    }
  });
}
