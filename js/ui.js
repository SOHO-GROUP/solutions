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
  initDocAuditSelector();
  initPrivacyModal();
  initCookieBanner();
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

  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem(STORAGE_KEY) || htmlEl.getAttribute('data-theme') || 'light';
  } catch (_) {
    savedTheme = htmlEl.getAttribute('data-theme') || 'light';
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
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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

/**
 * 7. One-time Cookie & Transparency Banner (Bottom Bar + Footer Trigger)
 */
function initCookieBanner() {
  const banner = document.getElementById('cookie-banner');
  const openBtns = document.querySelectorAll('[data-open-cookies]');
  const closeBtns = document.querySelectorAll('[data-close-cookies]');
  const COOKIE_STORAGE_KEY = 'soho_solutions_cookies_accepted';

  if (!banner) return;

  const showBanner = (e) => {
    if (e) e.preventDefault();
    banner.classList.remove('hidden');
  };

  const acceptAndHideBanner = () => {
    banner.classList.add('hidden');
    try {
      localStorage.setItem(COOKIE_STORAGE_KEY, 'true');
    } catch (_) {
      // Ignore storage restrictions
    }
  };

  // Automatically show once if visitor has not dismissed it yet
  let alreadyAccepted = false;
  try {
    alreadyAccepted = localStorage.getItem(COOKIE_STORAGE_KEY) === 'true';
  } catch (_) {
    alreadyAccepted = false;
  }

  if (!alreadyAccepted) {
    showBanner();
  }

  openBtns.forEach((btn) => btn.addEventListener('click', showBanner));
  closeBtns.forEach((btn) => btn.addEventListener('click', acceptAndHideBanner));
}

/**
 * 8. Interactive COMEXT Document Audit Level Selector & Synchronized Tabulator
 */
function initDocAuditSelector() {
  const tierButtons = document.querySelectorAll('[data-tier-btn]');
  const tierRows = document.querySelectorAll('[data-tier-row]');
  const slider = document.getElementById('tier-range-slider');
  const badgeEl = document.getElementById('selected-tier-badge');
  const movementsEl = document.getElementById('selected-tier-movements');
  const priceEl = document.getElementById('selected-tier-price');
  const bottomCtaBtn = document.getElementById('doc-audit-bottom-cta');

  if (!badgeEl || !movementsEl || !priceEl) return;

  const TIERS = {
    1: {
      id: 1,
      badge: 'NIVEL 1',
      movements: '1 a 30 movimientos mensuales',
      tableMovements: '1 a 30 movimientos',
      price: '$4,200 + IVA'
    },
    2: {
      id: 2,
      badge: 'NIVEL 2',
      movements: '31 a 70 movimientos mensuales',
      tableMovements: '31 a 70 movimientos',
      price: '$5,133.33 + IVA'
    },
    3: {
      id: 3,
      badge: 'NIVEL 3',
      movements: '71 a 130 movimientos mensuales',
      tableMovements: '71 a 130 movimientos',
      price: '$6,300 + IVA'
    },
    4: {
      id: 4,
      badge: 'NIVEL 4',
      movements: '131 a 250 movimientos mensuales',
      tableMovements: '131 a 250 movimientos',
      price: '$7,700 + IVA'
    },
    5: {
      id: 5,
      badge: 'NIVEL 5',
      movements: '251 a 500 movimientos mensuales',
      tableMovements: '251 a 500 movimientos',
      price: '$9,333.33 + IVA'
    },
    6: {
      id: 6,
      badge: 'NIVEL 6',
      movements: '501 movimientos en adelante',
      tableMovements: '501 movimientos en adelante',
      price: 'Costo variable'
    }
  };

  let activeTierId = 1;

  const selectTier = (tierNum) => {
    const data = TIERS[tierNum];
    if (!data) return;
    activeTierId = data.id;

    // 1. Update Highlight Panel
    badgeEl.textContent = data.badge;
    movementsEl.textContent = data.movements;
    priceEl.textContent = data.price;

    // 2. Sync Slider
    if (slider && String(slider.value) !== String(activeTierId)) {
      slider.value = String(activeTierId);
    }

    // 3. Sync Numeric Stop Marker Buttons (30, 70, 130, 250, 500, 501+)
    tierButtons.forEach((btn) => {
      const isMatch = parseInt(btn.getAttribute('data-tier-btn'), 10) === activeTierId;
      btn.classList.toggle('is-active', isMatch);
      btn.setAttribute('aria-pressed', String(isMatch));
    });

    // 4. Sync Table Rows
    tierRows.forEach((row) => {
      const isMatch = parseInt(row.getAttribute('data-tier-row'), 10) === activeTierId;
      row.classList.toggle('is-active', isMatch);
    });
  };

  // Bind Clickable Numeric Stop Markers
  tierButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const num = parseInt(btn.getAttribute('data-tier-btn'), 10);
      selectTier(num);
    });
  });

  // Bind Range Slider
  if (slider) {
    slider.addEventListener('input', (e) => {
      const num = parseInt(e.target.value, 10);
      selectTier(num);
    });
  }

  // Bind Table Rows (Click & Keyboard Enter/Space)
  tierRows.forEach((row) => {
    row.addEventListener('click', () => {
      const num = parseInt(row.getAttribute('data-tier-row'), 10);
      selectTier(num);
    });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const num = parseInt(row.getAttribute('data-tier-row'), 10);
        selectTier(num);
      }
    });
  });

  // Pre-fill Contact Form when clicking the Bottom Proposal CTA (#doc-audit-bottom-cta)
  const prefillAuditProposal = () => {
    const data = TIERS[activeTierId] || TIERS[1];
    const selectField = document.getElementById('area_necesidad');
    const messageField = document.getElementById('mensaje');

    if (selectField) {
      const targetOption = Array.from(selectField.options).find((opt) =>
        opt.value.includes('COMEXT')
      );
      if (targetOption) {
        selectField.value = targetOption.value;
        selectField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    if (messageField) {
      messageField.value = `Solicitud de propuesta: Auditoría Documental Fiscalizada — Administración Mensual (COMEXT) — Nivel ${data.id} (${data.tableMovements} | Iguala mensual: ${data.price}).`;
      messageField.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  if (bottomCtaBtn) {
    bottomCtaBtn.addEventListener('click', prefillAuditProposal);
  }

  // Initialize default Level 1
  selectTier(1);
}

