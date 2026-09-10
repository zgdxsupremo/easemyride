/**
 * EaseMyRide — Reusable UI Components & Helpers
 * 
 * Provides interactive modals, toast notifications, accordion controllers,
 * mobile drawer management, clipboard helpers, and formatters.
 */

const UI = (() => {
  /**
   * Displays a modern toast alert in bottom-right corner.
   * @param {string} title
   * @param {string} message
   * @param {string} type - 'info' | 'success' | 'warning' | 'error'
   * @param {number} duration - milliseconds
   */
  function showToast(title, message, type = "info", duration = 4000) {
    let container = document.getElementById("toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-title">${escapeHTML(title)}</div>
        <div class="toast-msg">${escapeHTML(message)}</div>
      </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Shows global loading overlay with custom spinner message.
   * @param {string} message
   */
  function showLoading(message = "Processing your ride...") {
    let overlay = document.getElementById("global-loading-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "global-loading-overlay";
      overlay.className = "loading-overlay";
      overlay.innerHTML = `
        <div class="spinner"></div>
        <div id="loading-msg-text" style="font-weight:600; font-size:1.1rem;">${escapeHTML(message)}</div>
      `;
      document.body.appendChild(overlay);
    } else {
      const msgEl = document.getElementById("loading-msg-text");
      if (msgEl) msgEl.textContent = message;
    }
    overlay.classList.add("active");
  }

  /**
   * Hides global loading overlay.
   */
  function hideLoading() {
    const overlay = document.getElementById("global-loading-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  /**
   * Opens a modal dialog.
   * @param {string} modalId
   */
  function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  }

  /**
   * Closes a modal dialog.
   * @param {string} modalId
   */
  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      document.body.style.overflow = "";
    }
  }

  /**
   * Toggles mobile navigation drawer.
   */
  function toggleMobileNav() {
    const drawer = document.getElementById("mobile-nav-drawer");
    const backdrop = document.getElementById("nav-backdrop");
    if (drawer && backdrop) {
      const isOpen = drawer.classList.contains("open");
      if (isOpen) {
        drawer.classList.remove("open");
        backdrop.classList.remove("active");
        document.body.style.overflow = "";
      } else {
        drawer.classList.add("open");
        backdrop.classList.add("active");
        document.body.style.overflow = "hidden";
      }
    }
  }

  /**
   * Initializes FAQ accordion functionality on `.faq-item` elements.
   */
  function initAccordion() {
    const items = document.querySelectorAll(".faq-item");
    items.forEach((item) => {
      const btn = item.querySelector(".faq-question");
      if (btn) {
        btn.addEventListener("click", () => {
          const isActive = item.classList.contains("active");
          items.forEach((other) => {
            other.classList.remove("active");
            const ans = other.querySelector(".faq-answer");
            if (ans) ans.style.maxHeight = null;
          });

          if (!isActive) {
            item.classList.add("active");
            const answer = item.querySelector(".faq-answer");
            if (answer) {
              answer.style.maxHeight = `${answer.scrollHeight + 30}px`;
            }
          }
        });
      }
    });
  }

  /**
   * Copies text to clipboard with fallback.
   * @param {string} text
   * @param {string} successMessage
   */
  async function copyToClipboard(text, successMessage = "Copied to clipboard!") {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      showToast("Success", successMessage, "success");
    } catch (err) {
      console.error("Clipboard error:", err);
      showToast("Notice", "Unable to copy automatically. Please select text manually.", "warning");
    }
  }

  /**
   * Downloads a plain text or CSV file to user's device.
   * @param {string} filename
   * @param {string} content
   * @param {string} mimeType
   */
  function downloadFile(filename, content, mimeType = "text/plain;charset=utf-8") {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Downloaded", `Saved ${filename}`, "success");
  }

  /**
   * Formats a number to Indian Rupee currency string (e.g. ₹3,700).
   * @param {number} amount
   * @returns {string}
   */
  function formatCurrency(amount) {
    const val = Math.round(Number(amount) || 0);
    return `₹${val.toLocaleString("en-IN")}`;
  }

  /**
   * Formats YYYY-MM-DD date to friendly string (e.g. 15 Sep 2026).
   * @param {string} dateStr
   * @returns {string}
   */
  function formatDateDisplay(dateStr) {
    if (!dateStr) return "";
    try {
      const parts = dateStr.split("-");
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
      }
      return dateStr;
    } catch (e) {
      return dateStr;
    }
  }

  /**
   * Formats 24hr time (HH:MM) to 12hr with AM/PM.
   * @param {string} timeStr
   * @returns {string}
   */
  function formatTimeDisplay(timeStr) {
    if (!timeStr) return "";
    try {
      const [hStr, mStr] = timeStr.split(":");
      let h = parseInt(hStr, 10);
      const m = mStr || "00";
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12;
      h = h ? h : 12;
      return `${h}:${m} ${ampm}`;
    } catch (e) {
      return timeStr;
    }
  }

  /**
   * Helper to escape HTML tags to prevent XSS injection.
   */
  function escapeHTML(str) {
    if (!str) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Injects the standard header and footer into pages dynamically if placeholders exist.
   * @param {string} activePage
   */
  function injectNavigation(activePage = "home") {
    const headerEl = document.getElementById("site-header");
    if (headerEl) {
      headerEl.innerHTML = `
        <div class="container nav-container">
          <a href="index.html" class="brand-logo" aria-label="EaseMyRide Home">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
            <span>Ease<span class="highlight">My</span>Ride</span>
          </a>

          <ul class="nav-links">
            <li><a href="index.html" class="${activePage === "home" ? "active" : ""}">Home</a></li>
            <li><a href="oneway.html" class="${activePage === "oneway" ? "active" : ""}">One Way</a></li>
            <li><a href="roundtrip.html" class="${activePage === "roundtrip" ? "active" : ""}">Round Trip</a></li>
            <li><a href="local.html" class="${activePage === "local" ? "active" : ""}">Local Sightseeing</a></li>
            <li><a href="airport.html" class="${activePage === "airport" ? "active" : ""}">Airport Transfer</a></li>
            <li><a href="about.html" class="${activePage === "about" ? "active" : ""}">About</a></li>
            <li><a href="contact.html" class="${activePage === "contact" ? "active" : ""}">Contact</a></li>
          </ul>

          <div class="nav-actions">
            <a href="tel:+919876543210" class="nav-helpline" title="24/7 Helpline">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
              <span>+91 98765 43210</span>
            </a>
            <a href="index.html#booking-widget" class="btn btn-primary btn-sm">Book a Cab</a>
            <button class="mobile-menu-btn" id="mobile-menu-btn" aria-label="Toggle Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      `;

      // Mobile Menu Button Event
      const toggleBtn = document.getElementById("mobile-menu-btn");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", toggleMobileNav);
      }
    }

    const footerEl = document.getElementById("site-footer");
    if (footerEl) {
      footerEl.innerHTML = `
        <div class="footer-top">
          <div class="container footer-grid">
            <div class="footer-brand">
              <div class="footer-logo">Ease<span class="highlight" style="color:var(--accent);">My</span>Ride</div>
              <p class="footer-tagline">Simple rides. Better journeys. Verified drivers, transparent fares and seamless intercity travel across India.</p>
              <div class="footer-contact-info">
                <div class="footer-contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>24/7 Helpline: <strong>+91 98765 43210</strong></span>
                </div>
                <div class="footer-contact-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  <span>Email: support@easemyride.com</span>
                </div>
              </div>
            </div>

            <div class="footer-col">
              <h4>Services</h4>
              <ul class="footer-links">
                <li><a href="oneway.html">One Way Cabs</a></li>
                <li><a href="roundtrip.html">Round Trip Cabs</a></li>
                <li><a href="local.html">Local Sightseeing</a></li>
                <li><a href="airport.html">Airport Transfers</a></li>
                <li><a href="index.html#popular-routes">Popular Routes</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>Company</h4>
              <ul class="footer-links">
                <li><a href="about.html">About Us</a></li>
                <li><a href="contact.html">Contact Support</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>Policies & Legal</h4>
              <ul class="footer-links">
                <li><a href="privacy-policy.html">Privacy Policy</a></li>
                <li><a href="terms.html">Terms & Conditions</a></li>
                <li><a href="cancellation-policy.html">Cancellation & Refunds</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div class="footer-bottom">
          <div class="container footer-bottom-flex">
            <p>© 2026 EaseMyRide. All rights reserved. Built for seamless travel.</p>
            <p style="font-size:0.8rem; color:var(--gray-500);">Tolls, parking & applicable taxes extra as per actuals.</p>
          </div>
        </div>
      `;
    }

    // Insert Mobile Nav Drawer and Backdrop if not present
    if (!document.getElementById("mobile-nav-drawer")) {
      const drawer = document.createElement("div");
      drawer.id = "mobile-nav-drawer";
      drawer.className = "mobile-nav-drawer";
      drawer.innerHTML = `
        <div class="mobile-nav-header">
          <div class="brand-logo">
            <span>Ease<span class="highlight">My</span>Ride</span>
          </div>
          <button class="modal-close-btn" id="close-drawer-btn" aria-label="Close Navigation">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <ul class="mobile-nav-links">
          <li><a href="index.html">Home</a></li>
          <li><a href="oneway.html">One Way Cabs</a></li>
          <li><a href="roundtrip.html">Round Trip Cabs</a></li>
          <li><a href="local.html">Local Sightseeing</a></li>
          <li><a href="airport.html">Airport Transfers</a></li>
          <li><a href="about.html">About Us</a></li>
          <li><a href="contact.html">Contact</a></li>
        </ul>
        <div class="mobile-nav-footer">
          <a href="tel:+919876543210" class="btn btn-outline btn-block">📞 Call +91 98765 43210</a>
          <a href="index.html#booking-widget" class="btn btn-primary btn-block">Book a Cab</a>
        </div>
      `;

      const backdrop = document.createElement("div");
      backdrop.id = "nav-backdrop";
      backdrop.className = "nav-backdrop";

      document.body.appendChild(drawer);
      document.body.appendChild(backdrop);

      document.getElementById("close-drawer-btn").addEventListener("click", toggleMobileNav);
      backdrop.addEventListener("click", toggleMobileNav);
    }
  }

  /**
   * Helper to return clean SVG illustration of vehicle types.
   */
  function getCarSvg(imageType) {
    if (imageType === "suv" || imageType === "innova" || imageType === "crysta") {
      return `<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 36C12 36 15 24 28 20L48 18L72 22C80 24 88 28 88 36H12Z" fill="#CBD5E1"/>
        <path d="M28 20L32 28H48V18L28 20Z" fill="#94A3B8"/>
        <path d="M52 18V28H70L68 21L52 18Z" fill="#94A3B8"/>
        <rect x="8" y="32" width="84" height="8" rx="4" fill="#1E293B"/>
        <circle cx="26" cy="38" r="7" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>
        <circle cx="74" cy="38" r="7" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>
        <circle cx="26" cy="38" r="3" fill="#94A3B8"/>
        <circle cx="74" cy="38" r="3" fill="#94A3B8"/>
      </svg>`;
    } else if (imageType === "hatchback") {
      return `<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 36C18 36 22 24 34 22L54 22L70 26C78 28 84 32 84 36H18Z" fill="#CBD5E1"/>
        <path d="M34 22L38 28H52V22L34 22Z" fill="#94A3B8"/>
        <path d="M56 22V28H68L66 25L56 22Z" fill="#94A3B8"/>
        <rect x="14" y="32" width="72" height="8" rx="4" fill="#1E293B"/>
        <circle cx="30" cy="38" r="6" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>
        <circle cx="70" cy="38" r="6" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>
      </svg>`;
    } else {
      // Sedan
      return `<svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 36C10 36 18 28 26 24L48 20L72 24C82 26 90 32 90 36H10Z" fill="#CBD5E1"/>
        <path d="M28 24L32 28H48V20L28 24Z" fill="#94A3B8"/>
        <path d="M52 20V28H70L66 23L52 20Z" fill="#94A3B8"/>
        <rect x="6" y="32" width="88" height="8" rx="4" fill="#0F5132"/>
        <circle cx="24" cy="38" r="7" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>
        <circle cx="76" cy="38" r="7" fill="#0F172A" stroke="#E2E8F0" stroke-width="2"/>
        <circle cx="24" cy="38" r="3" fill="#94A3B8"/>
        <circle cx="76" cy="38" r="3" fill="#94A3B8"/>
      </svg>`;
    }
  }

  return {
    showToast,
    showLoading,
    hideLoading,
    openModal,
    closeModal,
    toggleMobileNav,
    initAccordion,
    copyToClipboard,
    downloadFile,
    formatCurrency,
    formatDateDisplay,
    formatTimeDisplay,
    escapeHTML,
    injectNavigation,
    getCarSvg
  };
})();

if (typeof window !== "undefined") {
  window.UI = UI;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = UI;
}
