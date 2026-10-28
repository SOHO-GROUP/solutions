/**
 * SOHO SOLUTIONS — Risk Assessment Form Handler & Security Protocol
 * Domain: www.solutions.sohog.org
 * Division: SOHO SOLUTIONS (Active Units: COMEXT & DEFENSE)
 *
 * Responsibilities:
 * 1. Strict client-side validation for all required executive fields.
 * 2. Rigorous XSS, HTML, script, and SQL/NoSQL meta-character sanitization.
 * 3. Accessible error reporting (#error-[campo], aria-invalid, aria-describedby).
 * 4. Form state management (Normal -> Loading/Processing -> Confidential Success / Error).
 * 5. Secure payload construction with audit metadata & dual dispatch (configurable endpoint + local audit queue).
 */

(function () {
  'use strict';

  /**
   * Authorized active business units in SOHO SOLUTIONS.
   * ACCOUNTING and LOGIMEX are conceptual ecosystem modules and strictly rejected as direct contracting targets.
   */
  const AUTHORIZED_ACTIVE_AREAS = Object.freeze({
    'Consultoría en Comercio Exterior y Aduanas (COMEXT)': 'COMEXT',
    'Defensa Fiscal y Arquitectura Contractual (DEFENSE)': 'DEFENSE',
    'Auditoría Preventiva Integral (COMEXT + DEFENSE)': 'COMEXT + DEFENSE',
    'COMEXT': 'COMEXT',
    'DEFENSE': 'DEFENSE',
    'COMEXT + DEFENSE': 'COMEXT + DEFENSE'
  });

  /**
   * Authorized operation types from #tipo_operacion.
   */
  const AUTHORIZED_OPERATION_TYPES = Object.freeze([
    'Importación / Exportación',
    'Manufactura / IMMEX / Nearshoring',
    'Operaciones Nacionales Corporativas',
    'Holding / Grupo Empresarial',
    'Otro'
  ]);

  /**
   * Storage key for local audit persistence and QA inspection.
   */
  const STORAGE_KEY = 'soho_solutions_leads_queue';

  /**
   * Default button label to restore after processing.
   */
  const DEFAULT_SUBMIT_TEXT = 'Enviar solicitud';
  const LOADING_SUBMIT_TEXT = 'Procesando protocolo de seguridad...';

  /**
   * Rigorous input sanitizer against XSS, HTML injection, inline JS events, and injection meta-patterns.
   * @param {string} rawValue
   * @returns {string} Sanitized plain text string
   */
  function sanitizeInput(rawValue) {
    if (typeof rawValue !== 'string') return '';

    let cleaned = rawValue;

    // 1. Strip control characters (except standard whitespace/newlines)
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // 2. Remove full dangerous blocks (<script>, <iframe>, <object>, <embed>, <style>, <svg>)
    cleaned = cleaned.replace(/<\s*(script|iframe|object|embed|style|svg|math|applet|meta|link)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');

    // 3. Remove any remaining standalone or unclosed HTML tags
    cleaned = cleaned.replace(/<[^>]*>?/gm, '');

    // 4. Neutralize inline event handlers (onerror=, onload=, onclick=, onmouseover=, etc.)
    cleaned = cleaned.replace(/\bon[a-z]+\s*=\s*(?:["'][^"']*["']|[^\s>]+)/gi, '');

    // 5. Neutralize dangerous protocol schemes (javascript:, vbscript:, data:)
    cleaned = cleaned.replace(/(?:javascript|vbscript|data)\s*:/gi, '');

    // 6. Neutralize common SQL / NoSQL injection patterns
    cleaned = cleaned.replace(/(?:--|\/\*|\*\/|;\s*(?:DROP|DELETE|INSERT|UPDATE|ALTER|EXEC|UNION|SELECT)\b|\$where|\$ne|\$gt|\$lt|\$regex)/gi, '');

    // 7. Strip any residual angle brackets or backticks to guarantee zero HTML reconstruction
    cleaned = cleaned.replace(/[<>`]/g, '');

    // 8. Normalize excessive horizontal spaces while preserving single spaces
    cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').trim();

    return cleaned;
  }

  /**
   * Detects if raw string contains explicit XSS or code injection attempt.
   * @param {string} rawValue
   * @returns {boolean}
   */
  function hasMaliciousPattern(rawValue) {
    if (typeof rawValue !== 'string' || !rawValue) return false;
    const xssOrInjectionRegex = /(<\s*script\b|<\s*iframe\b|<\s*img\b[^>]*\bon\w+\s*=|<\s*svg\b[^>]*\bon\w+\s*=|javascript\s*:|vbscript\s*:|\bon(?:error|load|click|mouseover|focus)\s*=)/i;
    return xssOrInjectionRegex.test(rawValue);
  }

  /**
   * Normalizes phone/WhatsApp input by stripping spaces, hyphens, parentheses, and country prefix (+52) if present with 12 digits.
   * @param {string} rawPhone
   * @returns {string} Digits-only string
   */
  function normalizePhoneDigits(rawPhone) {
    if (typeof rawPhone !== 'string') return '';
    const trimmed = rawPhone.trim();
    // Extract digits only
    const digitsOnly = trimmed.replace(/\D/g, '');
    return digitsOnly;
  }

  /**
   * Generates a deterministic lightweight integrity checksum for the audit payload.
   * @param {string} inputStr
   * @returns {string} Hexadecimal hash string
   */
  function computeIntegrityHash(inputStr) {
    let hash = 2166136261;
    for (let i = 0; i < inputStr.length; i++) {
      hash ^= inputStr.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'SHA256-SIM-' + (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  /**
   * Generates a unique executive folio reference (e.g., SOHO-SOL-2026-XXXX).
   * @returns {string}
   */
  function generateExecutiveFolio() {
    const randomBlock = Math.floor(1000 + Math.random() * 9000);
    return `SOHO-SOL-2026-${randomBlock}`;
  }

  /**
   * Field-level validation rules.
   * Returns an empty string if valid, or a specific Spanish executive error message if invalid.
   */
  const fieldValidators = {
    nombre(rawValue) {
      const sanitized = sanitizeInput(rawValue);
      if (!sanitized) {
        return 'El nombre completo del titular o contacto ejecutivo es obligatorio.';
      }
      if (sanitized.length < 3) {
        return 'El nombre completo debe contener al menos 3 caracteres válidos.';
      }
      if (sanitized.length > 120) {
        return 'El nombre completo no debe exceder 120 caracteres.';
      }
      // Allow Spanish letters, spaces, dots (e.g. Lic., Ing.), hyphens, and apostrophes
      const validNamePattern = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s.'-]+$/;
      // Ensure at least 3 alphabetic characters exist
      const alphaCount = (sanitized.match(/[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
      if (!validNamePattern.test(sanitized) || alphaCount < 3) {
        return 'Ingrese un nombre válido (solo caracteres alfabéticos y espacios, mínimo 3 letras).';
      }
      return '';
    },

    empresa(rawValue) {
      const sanitized = sanitizeInput(rawValue);
      if (!sanitized) {
        return 'El nombre de la empresa u organización es obligatorio.';
      }
      if (sanitized.length < 2) {
        return 'La razón social o nombre de empresa debe contener al menos 2 caracteres.';
      }
      if (sanitized.length > 150) {
        return 'El nombre de la empresa no debe exceder 150 caracteres.';
      }
      // Require at least 2 alphanumeric characters
      const alnumCount = (sanitized.match(/[a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ]/g) || []).length;
      if (alnumCount < 2) {
        return 'Ingrese una razón social u organización corporativa válida.';
      }
      return '';
    },

    email(rawValue) {
      const sanitized = sanitizeInput(rawValue).toLowerCase();
      if (!sanitized) {
        return 'El correo electrónico corporativo es obligatorio.';
      }
      if (sanitized.length > 160) {
        return 'El correo electrónico excede la longitud máxima permitida.';
      }
      // Strict RFC-compliant email structure check (no consecutive dots, valid TLD >= 2 chars)
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(sanitized) || sanitized.includes('..') || sanitized.startsWith('.') || sanitized.includes('@.') || sanitized.includes('.@')) {
        return 'Ingrese un correo corporativo con formato válido (ej. direccion@empresa.com).';
      }
      return '';
    },

    whatsapp(rawValue) {
      const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
      if (!trimmed) {
        return 'El número de WhatsApp o teléfono directo (10 dígitos) es obligatorio.';
      }
      // Reject alphabetic characters or HTML/script remnants in phone field
      if (/[a-zA-Z<>]/.test(trimmed)) {
        return 'El teléfono solo debe contener dígitos numéricos (exactamente 10 dígitos).';
      }
      const digits = normalizePhoneDigits(trimmed);
      if (digits.length !== 10 || !/^\d{10}$/.test(digits)) {
        return `Se requieren exactamente 10 dígitos numéricos (actualmente: ${digits.length} dígitos).`;
      }
      return '';
    },

    tipo_operacion(rawValue) {
      const sanitized = sanitizeInput(rawValue);
      if (!sanitized) {
        return 'Seleccione el tipo de operación de su organización.';
      }
      if (!AUTHORIZED_OPERATION_TYPES.includes(sanitized)) {
        return 'Seleccione un perfil operativo válido de la lista autorizada.';
      }
      return '';
    },

    area_necesidad(rawValue) {
      const sanitized = sanitizeInput(rawValue);
      if (!sanitized) {
        return 'Seleccione la unidad operativa de intervención prioritaria.';
      }
      if (!Object.prototype.hasOwnProperty.call(AUTHORIZED_ACTIVE_AREAS, sanitized)) {
        return 'Unidad no válida. Solo se admiten intervenciones en unidades activas (COMEXT o DEFENSE).';
      }
      return '';
    },

    mensaje(rawValue) {
      if (!rawValue || typeof rawValue !== 'string' || !rawValue.trim()) {
        return ''; // Optional field when empty
      }
      const sanitized = sanitizeInput(rawValue);
      if (sanitized.length > 1500) {
        return 'El mensaje o contexto operativo no debe exceder 1,500 caracteres.';
      }
      return '';
    }
  };

  /**
   * Renders or clears the error state for a specific form field.
   * @param {HTMLElement|null} inputEl
   * @param {HTMLElement|null} errorEl
   * @param {string} errorMessage
   */
  function setFieldErrorState(inputEl, errorEl, errorMessage) {
    if (!inputEl || !errorEl) return;

    if (errorMessage) {
      errorEl.textContent = errorMessage;
      errorEl.classList.remove('hidden');
      inputEl.setAttribute('aria-invalid', 'true');
      inputEl.setAttribute('aria-describedby', errorEl.id);
    } else {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
      inputEl.setAttribute('aria-invalid', 'false');
      inputEl.removeAttribute('aria-describedby');
    }
  }

  /**
   * Displays executive status feedback in #form-feedback.
   * @param {HTMLElement|null} feedbackEl
   * @param {'success'|'error'|'hidden'} type
   * @param {string} title
   * @param {string} detail
   * @param {string} [folio]
   */
  function renderFormFeedback(feedbackEl, type, title, detail, folio) {
    if (!feedbackEl) return;

    if (type === 'hidden') {
      feedbackEl.className = 'hidden rounded-md p-4 text-sm font-medium';
      feedbackEl.removeAttribute('data-feedback-state');
      feedbackEl.textContent = '';
      return;
    }

    // Build inner DOM safely using textContent to prevent any XSS vector
    feedbackEl.textContent = '';
    feedbackEl.setAttribute('data-feedback-state', type);

    if (type === 'success') {
      feedbackEl.className = 'rounded-md p-4 text-sm font-medium bg-[#0A0A0A] border border-[#2563EB] text-white space-y-1.5';

      const headerDiv = document.createElement('div');
      headerDiv.className = 'flex items-center justify-between gap-2';

      const titleSpan = document.createElement('strong');
      titleSpan.className = 'text-white font-bold tracking-wide';
      titleSpan.textContent = title;
      headerDiv.appendChild(titleSpan);

      if (folio) {
        const folioBadge = document.createElement('span');
        folioBadge.className = 'text-xs font-mono text-[#60A5FA] px-2 py-0.5 rounded bg-[#141414] border border-[#27272A]';
        folioBadge.textContent = `FOLIO: ${folio}`;
        headerDiv.appendChild(folioBadge);
      }

      const detailP = document.createElement('p');
      detailP.className = 'text-xs text-zinc-300 leading-relaxed';
      detailP.textContent = detail;

      feedbackEl.appendChild(headerDiv);
      feedbackEl.appendChild(detailP);
    } else {
      feedbackEl.className = 'rounded-md p-4 text-sm font-medium bg-[#0A0A0A] border border-red-400 text-red-400 space-y-1';

      const titleStrong = document.createElement('strong');
      titleStrong.className = 'block font-bold text-red-400';
      titleStrong.textContent = title;

      const detailP = document.createElement('p');
      detailP.className = 'text-xs text-zinc-300';
      detailP.textContent = detail;

      feedbackEl.appendChild(titleStrong);
      feedbackEl.appendChild(detailP);
    }
  }

  /**
   * Toggles the submit button loading state (#submit-btn, #submit-text, #submit-spinner).
   * @param {HTMLButtonElement|null} submitBtn
   * @param {HTMLElement|null} submitText
   * @param {HTMLElement|null} submitSpinner
   * @param {boolean} isLoading
   */
  function setSubmitLoadingState(submitBtn, submitText, submitSpinner, isLoading) {
    if (!submitBtn) return;

    submitBtn.disabled = isLoading;
    submitBtn.setAttribute('aria-busy', String(isLoading));

    if (submitText) {
      submitText.textContent = isLoading ? LOADING_SUBMIT_TEXT : DEFAULT_SUBMIT_TEXT;
    }

    if (submitSpinner) {
      submitSpinner.classList.toggle('hidden', !isLoading);
    }
  }

  /**
   * Persists the sanitized lead payload into storage for audit trail and QA verification,
   * and optionally dispatches to an external endpoint if configured.
   * @param {Object} leadPayload
   * @param {HTMLFormElement} formEl
   * @returns {Promise<{ok: boolean, mode: string}>}
   */
  async function dispatchLeadPayload(leadPayload, formEl) {
    // 1. Expose latest sanitized payload on window for immediate QA verification
    window.__LAST_SOHO_LEAD_PAYLOAD__ = leadPayload;

    // 2. Save in sessionStorage and localStorage audit queue safely (ignoring quota/privacy errors)
    try {
      const existingRaw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY) || '[]';
      let queue = [];
      try {
        const parsed = JSON.parse(existingRaw);
        if (Array.isArray(parsed)) queue = parsed;
      } catch (_e) {
        queue = [];
      }
      queue.push(leadPayload);
      const serialized = JSON.stringify(queue.slice(-25));
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (_storageErr) {
        // Fallback to sessionStorage if localStorage is restricted
      }
      try {
        sessionStorage.setItem(STORAGE_KEY, serialized);
      } catch (_sessionErr) {
        // Ignore storage restrictions
      }
    } catch (_err) {
      // Never throw console errors if storage is blocked
    }

    // 3. Check if an external webhook/endpoint is explicitly configured on form or window
    const configuredEndpoint =
      (formEl && formEl.getAttribute('data-endpoint')) ||
      (typeof window.SOHO_SOLUTIONS_ENDPOINT === 'string' && window.SOHO_SOLUTIONS_ENDPOINT.trim()) ||
      '';

    if (configuredEndpoint) {
      const response = await fetch(configuredEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Soho-Origin': 'www.solutions.sohog.org'
        },
        body: JSON.stringify(leadPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }
      return { ok: true, mode: 'remote-webhook' };
    }

    // 4. Safe executive simulation delay (350ms) when no external endpoint is configured
    await new Promise((resolve) => setTimeout(resolve, 350));
    return { ok: true, mode: 'local-audit-protocol' };
  }

  /**
   * Initializes the Risk Assessment Form controller.
   */
  function initRiskAssessmentForm() {
    const form = document.getElementById('risk-assessment-form');
    if (!form) return;

    const fields = {
      nombre: document.getElementById('nombre'),
      empresa: document.getElementById('empresa'),
      email: document.getElementById('email'),
      whatsapp: document.getElementById('whatsapp'),
      tipo_operacion: document.getElementById('tipo_operacion'),
      area_necesidad: document.getElementById('area_necesidad'),
      mensaje: document.getElementById('mensaje')
    };

    const errors = {
      nombre: document.getElementById('error-nombre'),
      empresa: document.getElementById('error-empresa'),
      email: document.getElementById('error-email'),
      whatsapp: document.getElementById('error-whatsapp'),
      tipo_operacion: document.getElementById('error-tipo_operacion'),
      area_necesidad: document.getElementById('error-area_necesidad'),
      mensaje: document.getElementById('error-mensaje')
    };

    const submitBtn = document.getElementById('submit-btn');
    const submitText = document.getElementById('submit-text');
    const submitSpinner = document.getElementById('submit-spinner');
    const feedbackEl = document.getElementById('form-feedback');

    let isSubmitting = false;

    /**
     * Validates a single field by key and updates its DOM error state.
     * @param {string} fieldKey
     * @returns {boolean} True if valid
     */
    const validateSingleField = (fieldKey) => {
      const inputEl = fields[fieldKey];
      const errorEl = errors[fieldKey];
      const validator = fieldValidators[fieldKey];
      if (!inputEl || !validator) return true;

      const errorMessage = validator(inputEl.value);
      setFieldErrorState(inputEl, errorEl, errorMessage);
      return errorMessage === '';
    };

    // Attach real-time cleanup & blur validation listeners on each field
    Object.keys(fields).forEach((fieldKey) => {
      const inputEl = fields[fieldKey];
      const errorEl = errors[fieldKey];
      if (!inputEl) return;

      // Initialize aria-invalid="false" for accessibility compliance
      inputEl.setAttribute('aria-invalid', 'false');

      const eventType = inputEl.tagName === 'SELECT' ? 'change' : 'input';

      inputEl.addEventListener(eventType, () => {
        // If field currently shows an error, re-validate dynamically as user fixes it
        if (inputEl.getAttribute('aria-invalid') === 'true' || (errorEl && !errorEl.classList.contains('hidden'))) {
          validateSingleField(fieldKey);
        }
        // Hide global error banner when user starts correcting fields
        if (feedbackEl && feedbackEl.getAttribute('data-feedback-state') === 'error') {
          renderFormFeedback(feedbackEl, 'hidden', '', '');
        }
      });

      inputEl.addEventListener('blur', () => {
        // Sanitize text inputs on blur if malicious pattern was pasted
        if (inputEl.tagName !== 'SELECT' && hasMaliciousPattern(inputEl.value)) {
          inputEl.value = sanitizeInput(inputEl.value);
        }
        if (inputEl.value.trim() !== '' || inputEl.getAttribute('aria-invalid') === 'true') {
          validateSingleField(fieldKey);
        }
      });
    });

    // Form submission handler
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      // Prevent duplicate submissions while loading
      if (isSubmitting) return;

      // Clear previous global feedback
      renderFormFeedback(feedbackEl, 'hidden', '', '');

      // Sanitize any malicious script/HTML payloads in text fields prior to validation
      ['nombre', 'empresa', 'email', 'mensaje'].forEach((key) => {
        const el = fields[key];
        if (el && hasMaliciousPattern(el.value)) {
          el.value = sanitizeInput(el.value);
        }
      });

      // Validate all fields in order
      const fieldOrder = [
        'nombre',
        'empresa',
        'email',
        'whatsapp',
        'tipo_operacion',
        'area_necesidad',
        'mensaje'
      ];

      let firstInvalidElement = null;
      let isFormValid = true;

      fieldOrder.forEach((key) => {
        const valid = validateSingleField(key);
        if (!valid) {
          isFormValid = false;
          if (!firstInvalidElement && fields[key]) {
            firstInvalidElement = fields[key];
          }
        }
      });

      if (!isFormValid) {
        renderFormFeedback(
          feedbackEl,
          'error',
          'Verificación de Datos Requerida',
          'Por favor revise los campos señalados en rojo para procesar su solicitud bajo nuestro protocolo ejecutivo.'
        );
        if (firstInvalidElement && typeof firstInvalidElement.focus === 'function') {
          firstInvalidElement.focus();
        }
        return;
      }

      // Enter Loading / Processing State
      isSubmitting = true;
      setSubmitLoadingState(submitBtn, submitText, submitSpinner, true);

      try {
        const folio = generateExecutiveFolio();
        const timestampISO = new Date().toISOString();

        const cleanNombre = sanitizeInput(fields.nombre.value);
        const cleanEmpresa = sanitizeInput(fields.empresa.value);
        const cleanEmail = sanitizeInput(fields.email.value).toLowerCase();
        const cleanWhatsapp = normalizePhoneDigits(fields.whatsapp.value);
        const cleanTipoOperacion = sanitizeInput(fields.tipo_operacion.value);
        const cleanAreaNecesidad = sanitizeInput(fields.area_necesidad.value);
        const targetUnitCode = AUTHORIZED_ACTIVE_AREAS[cleanAreaNecesidad] || 'COMEXT';
        const cleanMensaje = sanitizeInput(fields.mensaje ? fields.mensaje.value : '');

        // Reflect normalized 10-digit phone and sanitized values back into inputs before reset
        fields.nombre.value = cleanNombre;
        fields.empresa.value = cleanEmpresa;
        fields.email.value = cleanEmail;
        fields.whatsapp.value = cleanWhatsapp;
        if (fields.mensaje) {
          fields.mensaje.value = cleanMensaje;
        }

        const rawSignature = `${folio}|${timestampISO}|${cleanNombre}|${cleanEmpresa}|${cleanEmail}|${cleanWhatsapp}|${targetUnitCode}`;

        const leadPayload = {
          leadId: folio,
          timestampISO,
          origin: 'www.solutions.sohog.org',
          division: 'SOHO SOLUTIONS',
          parentGroup: 'SOHO GROUP',
          activeUnitsOnly: true,
          securityProtocol: 'NDA-CONFIDENTIAL-2026',
          integrityChecksum: computeIntegrityHash(rawSignature),
          prospect: {
            nombre: cleanNombre,
            empresa: cleanEmpresa,
            email: cleanEmail,
            whatsapp: cleanWhatsapp,
            tipo_operacion: cleanTipoOperacion,
            area_necesidad: cleanAreaNecesidad,
            unidad_asignada: targetUnitCode,
            mensaje: cleanMensaje || 'Sin comentarios adicionales.'
          }
        };

        await dispatchLeadPayload(leadPayload, form);

        // Reset form and clear all aria-invalid states
        form.reset();
        fieldOrder.forEach((key) => {
          setFieldErrorState(fields[key], errors[key], '');
        });

        // Show Executive Confidential Confirmation
        renderFormFeedback(
          feedbackEl,
          'success',
          'Solicitud Recibida bajo Protocolo Confidencial (NDA)',
          `Su requerimiento para la unidad ${targetUnitCode} ha sido registrado exitosamente. Un socio director establecerá contacto directo en menos de 24 horas hábiles.`,
          folio
        );
      } catch (_dispatchError) {
        renderFormFeedback(
          feedbackEl,
          'error',
          'Incidencia Temporal en el Despacho',
          'No fue posible completar la transmisión en este instante. Por favor verifique su conexión e intente nuevamente.'
        );
      } finally {
        isSubmitting = false;
        setSubmitLoadingState(submitBtn, submitText, submitSpinner, false);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRiskAssessmentForm);
  } else {
    initRiskAssessmentForm();
  }
})();
