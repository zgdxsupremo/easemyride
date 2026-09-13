/**
 * MargDrive — Validation Engine
 * 
 * Provides robust validation rules for Indian phone numbers, dates,
 * intercity route logic, and non-blocking inline error markers.
 */

const FormValidator = (() => {
  /**
   * Validates an Indian mobile number.
   * Accepts 10 digits starting with 6, 7, 8, or 9 (with optional +91, 91, or 0 prefix).
   * @param {string} phone
   * @returns {boolean}
   */
  function isValidIndianPhone(phone) {
    if (!phone) return false;
    const clean = phone.toString().replace(/[\s\-()]/g, "");
    // Match 10 digits starting with 6-9, with optional +91, 91, or 0 prefix
    const regex = /^(?:(?:\+|00)?91[\-\s]?)?[0]?[6-9]\d{9}$/;
    return regex.test(clean);
  }

  /**
   * Sanitizes phone number to standard 10-digit format.
   * @param {string} phone
   * @returns {string}
   */
  function sanitizePhoneNumber(phone) {
    if (!phone) return "";
    const digits = phone.toString().replace(/\D/g, "");
    if (digits.length > 10) {
      return digits.slice(-10);
    }
    return digits;
  }

  /**
   * Validates an email address.
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    if (!email) return false;
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email.trim());
  }

  /**
   * Validates that a date string (YYYY-MM-DD) is today or in the future.
   * @param {string} dateStr
   * @returns {boolean}
   */
  function isFutureOrTodayDate(dateStr) {
    if (!dateStr) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const inputDate = new Date(dateStr);
    inputDate.setHours(0, 0, 0, 0);

    return inputDate.getTime() >= today.getTime();
  }

  /**
   * Validates that return date is on or after pickup date.
   * @param {string} pickupDateStr
   * @param {string} returnDateStr
   * @returns {boolean}
   */
  function isValidReturnDate(pickupDateStr, returnDateStr) {
    if (!pickupDateStr || !returnDateStr) return false;
    const pickup = new Date(pickupDateStr);
    pickup.setHours(0, 0, 0, 0);

    const ret = new Date(returnDateStr);
    ret.setHours(0, 0, 0, 0);

    return ret.getTime() >= pickup.getTime();
  }

  /**
   * Validates that pickup and drop cities are distinct for intercity journeys.
   * @param {string} pickup
   * @param {string} drop
   * @returns {boolean}
   */
  function areLocationsDistinct(pickup, drop) {
    if (!pickup || !drop) return true;
    const p = pickup.trim().toLowerCase();
    const d = drop.trim().toLowerCase();
    return p !== d;
  }

  /**
   * Displays an inline validation error on a form group.
   * @param {HTMLElement|string} inputElementOrId
   * @param {string} errorMessage
   */
  function showFieldError(inputElementOrId, errorMessage) {
    const el = typeof inputElementOrId === "string" ? document.getElementById(inputElementOrId) : inputElementOrId;
    if (!el) return;

    const group = el.closest(".form-group") || el.parentElement;
    if (group) {
      group.classList.add("has-error");
      let feedback = group.querySelector(".invalid-feedback");
      if (!feedback) {
        feedback = document.createElement("span");
        feedback.className = "invalid-feedback";
        group.appendChild(feedback);
      }
      feedback.textContent = errorMessage;
      feedback.style.display = "block";
    }
    el.classList.add("is-invalid");
  }

  /**
   * Clears inline validation error on a form group.
   * @param {HTMLElement|string} inputElementOrId
   */
  function clearFieldError(inputElementOrId) {
    const el = typeof inputElementOrId === "string" ? document.getElementById(inputElementOrId) : inputElementOrId;
    if (!el) return;

    const group = el.closest(".form-group") || el.parentElement;
    if (group) {
      group.classList.remove("has-error");
      const feedback = group.querySelector(".invalid-feedback");
      if (feedback) {
        feedback.textContent = "";
        feedback.style.display = "none";
      }
    }
    el.classList.remove("is-invalid");
  }

  /**
   * Attaches automatic clearing of errors on user typing or interaction.
   * @param {HTMLFormElement} form
   */
  function attachAutoClear(form) {
    if (!form) return;
    const inputs = form.querySelectorAll("input, select, textarea");
    inputs.forEach((input) => {
      input.addEventListener("input", () => clearFieldError(input));
      input.addEventListener("change", () => clearFieldError(input));
      input.addEventListener("focus", () => clearFieldError(input));
    });
  }

  /**
   * Helper to format a Date object as YYYY-MM-DD for standard date inputs.
   * @param {Date} date
   * @returns {string}
   */
  function formatDateForInput(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /**
   * Helper to format default pickup time (e.g., current time + 1 hour).
   * @returns {string} HH:MM
   */
  function getDefaultTime() {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    const h = String(d.getHours()).padStart(2, "0");
    const m = "00";
    return `${h}:${m}`;
  }

  return {
    isValidIndianPhone,
    sanitizePhoneNumber,
    isValidEmail,
    isFutureOrTodayDate,
    isValidReturnDate,
    areLocationsDistinct,
    showFieldError,
    clearFieldError,
    attachAutoClear,
    formatDateForInput,
    getDefaultTime
  };
})();

if (typeof window !== "undefined") {
  window.FormValidator = FormValidator;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = FormValidator;
}
