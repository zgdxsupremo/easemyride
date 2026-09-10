/**
 * EaseMyRide — Admin Dashboard Controller (admin.js)
 * 
 * Provides KPI analytics, live booking status management, dual tab viewing
 * (Confirmed Bookings & Search Inquiries/Leads), search filtering, and CSV exports.
 */

let currentAdminTab = "bookings"; // 'bookings' | 'searches'
let adminDataCache = { bookings: [], searches: [] };

document.addEventListener("DOMContentLoaded", () => {
  // Check auth state
  const isAuth = sessionStorage.getItem(EaseMyRideConfig.storageKeys.adminAuth) === "true";
  const authOverlay = document.getElementById("admin-auth-overlay");
  const authForm = document.getElementById("admin-login-form");
  const authPassInput = document.getElementById("admin-passcode");

  if (!isAuth && authOverlay) {
    authOverlay.style.display = "flex";
  } else if (authOverlay) {
    authOverlay.style.display = "none";
    initDashboard();
  }

  // Handle Login
  if (authForm) {
    authForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const entered = authPassInput.value.trim();
      // Default development passcode
      if (entered === "admin123" || entered === "easemyride2026") {
        sessionStorage.setItem(EaseMyRideConfig.storageKeys.adminAuth, "true");
        if (authOverlay) authOverlay.style.display = "none";
        UI.showToast("Welcome", "Authenticated to EaseMyRide Admin Portal.", "success");
        initDashboard();
      } else {
        UI.showToast("Access Denied", "Invalid administrative passcode.", "error");
      }
    });
  }

  // Refresh button
  const refreshBtn = document.getElementById("btn-admin-refresh");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      initDashboard();
      UI.showToast("Refreshed", "Admin data reloaded.", "info", 1500);
    });
  }

  // Logout button
  const logoutBtn = document.getElementById("btn-admin-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(EaseMyRideConfig.storageKeys.adminAuth);
      window.location.reload();
    });
  }

  // Tab buttons setup
  const tabBookingsBtn = document.getElementById("btn-tab-bookings");
  const tabSearchesBtn = document.getElementById("btn-tab-searches");
  const viewBookings = document.getElementById("view-bookings-table");
  const viewSearches = document.getElementById("view-searches-table");

  if (tabBookingsBtn && tabSearchesBtn) {
    tabBookingsBtn.addEventListener("click", () => {
      currentAdminTab = "bookings";
      tabBookingsBtn.className = "btn btn-sm btn-primary";
      tabSearchesBtn.className = "btn btn-sm btn-outline";
      if (viewBookings) viewBookings.style.display = "block";
      if (viewSearches) viewSearches.style.display = "none";
      applyFilters();
    });

    tabSearchesBtn.addEventListener("click", () => {
      currentAdminTab = "searches";
      tabSearchesBtn.className = "btn btn-sm btn-primary";
      tabBookingsBtn.className = "btn btn-sm btn-outline";
      if (viewBookings) viewBookings.style.display = "none";
      if (viewSearches) viewSearches.style.display = "block";
      applyFilters();
    });
  }
});

/**
 * Initializes dashboard data, metrics, and event listeners.
 */
async function initDashboard() {
  UI.showLoading("Loading admin analytics...");
  try {
    const data = await ApiService.getAdminData();
    adminDataCache.bookings = data.bookings || [];
    adminDataCache.searches = data.searches || [];

    // Update Tab Badges
    const bBadge = document.getElementById("badge-bookings-count");
    const sBadge = document.getElementById("badge-searches-count");
    if (bBadge) bBadge.textContent = adminDataCache.bookings.length;
    if (sBadge) sBadge.textContent = adminDataCache.searches.length;

    renderKPICards(adminDataCache);
    applyFilters();
    setupTableFilters();
    setupCsvExports();

    UI.hideLoading();
  } catch (err) {
    UI.hideLoading();
    console.error("Admin init error:", err);
    UI.showToast("Error", "Could not fetch admin data.", "error");
  }
}

/**
 * Computes and renders KPI counters.
 */
function renderKPICards({ bookings, searches }) {
  const totalSearches = searches.length;
  const totalBookings = bookings.length;

  const todayStr = FormValidator.formatDateForInput(new Date());
  const todayBookings = bookings.filter((b) => (b.startingDate === todayStr || (b.bookingTimestamp && b.bookingTimestamp.startsWith(todayStr)))).length;

  const newBookings = bookings.filter((b) => b.bookingStatus === "NEW").length;
  const pendingBookings = bookings.filter((b) => b.bookingStatus === "CONTACTED").length;
  const confirmedBookings = bookings.filter((b) => b.bookingStatus === "CONFIRMED").length;
  const cancelledBookings = bookings.filter((b) => b.bookingStatus === "CANCELLED").length;

  document.getElementById("kpi-total-searches").textContent = totalSearches.toLocaleString("en-IN");
  document.getElementById("kpi-total-bookings").textContent = totalBookings.toLocaleString("en-IN");
  document.getElementById("kpi-today-bookings").textContent = todayBookings.toLocaleString("en-IN");
  document.getElementById("kpi-new-bookings").textContent = newBookings.toLocaleString("en-IN");
  document.getElementById("kpi-pending-bookings").textContent = pendingBookings.toLocaleString("en-IN");
  document.getElementById("kpi-confirmed-bookings").textContent = confirmedBookings.toLocaleString("en-IN");
  document.getElementById("kpi-cancelled-bookings").textContent = cancelledBookings.toLocaleString("en-IN");
}

/**
 * Renders the interactive bookings table with inline status selectors.
 */
function renderBookingsTable(bookings) {
  const tbody = document.getElementById("admin-bookings-tbody");
  const countEl = document.getElementById("admin-table-count");
  if (!tbody) return;

  if (countEl) countEl.textContent = `Showing ${bookings.length} Bookings`;

  if (bookings.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align:center; padding: 2.5rem; color:var(--gray-500);">
          No bookings found. When a customer completes checkout on <code>booking.html</code>, it appears here immediately.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = bookings
    .map((b) => {
      const isNew = b.bookingStatus === "NEW";
      const route = b.fromCity && b.toCity ? `${b.fromCity} ➔ ${b.toCity}` : b.fromCity || "Local";
      const dateDisplay = UI.formatDateDisplay(b.startingDate || b.pickupDate);
      const fareDisplay = UI.formatCurrency(b.finalFare);

      return `
        <tr class="${isNew ? "row-new" : ""}" id="booking-row-${b.bookingId}">
          <td>
            <span class="booking-id-tag">${UI.escapeHTML(b.bookingId)}</span>
            ${isNew ? '<span class="status-pill status-new" style="font-size:0.65rem; margin-left:0.3rem;">NEW</span>' : ''}
          </td>
          <td>
            <div style="font-weight:600;">${dateDisplay}</div>
            <div style="font-size:0.75rem; color:var(--gray-500);">${UI.formatTimeDisplay(b.startingTime || b.pickupTime)}</div>
          </td>
          <td>
            <div style="font-weight:600; color:var(--secondary);">${UI.escapeHTML(b.fullName)}</div>
            <div style="font-size:0.75rem; color:var(--gray-500);">${UI.escapeHTML(b.email || "No email")}</div>
          </td>
          <td>
            <a href="tel:+91${b.phoneNumber}" style="font-weight:700; color:var(--primary); display:inline-flex; align-items:center; gap:0.25rem;">
              📞 +91 ${UI.escapeHTML(b.phoneNumber)}
            </a>
          </td>
          <td>
            <div style="font-weight:600;">${UI.escapeHTML(route)}</div>
            <div style="font-size:0.75rem; color:var(--gray-600); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${UI.escapeHTML(b.pickupAddress || '')}">
              📍 ${UI.escapeHTML(b.pickupAddress || 'Address in details')}
            </div>
          </td>
          <td>
            <span style="font-size:0.82rem; font-weight:600;">${UI.escapeHTML(b.journeyType || "One Way")}</span>
          </td>
          <td>
            <span style="text-transform:uppercase; font-size:0.82rem; font-weight:700; color:var(--gray-700);">${UI.escapeHTML(b.carType || "sedan")}</span>
          </td>
          <td>
            <strong style="color:var(--secondary); font-size:1rem;">${fareDisplay}</strong>
          </td>
          <td>
            <select class="form-control status-select" data-booking-id="${b.bookingId}" style="padding:0.35rem 0.5rem; font-size:0.82rem; font-weight:700;">
              <option value="NEW" ${b.bookingStatus === "NEW" ? "selected" : ""}>🟢 NEW</option>
              <option value="CONTACTED" ${b.bookingStatus === "CONTACTED" ? "selected" : ""}>🔵 CONTACTED</option>
              <option value="CONFIRMED" ${b.bookingStatus === "CONFIRMED" ? "selected" : ""}>🟡 CONFIRMED</option>
              <option value="COMPLETED" ${b.bookingStatus === "COMPLETED" ? "selected" : ""}>🟣 COMPLETED</option>
              <option value="CANCELLED" ${b.bookingStatus === "CANCELLED" ? "selected" : ""}>🔴 CANCELLED</option>
            </select>
          </td>
        </tr>
      `;
    })
    .join("");

  // Attach status change event handlers
  tbody.querySelectorAll(".status-select").forEach((select) => {
    select.addEventListener("change", async (e) => {
      const bId = select.dataset.bookingId;
      const newStatus = select.value;
      const row = document.getElementById(`booking-row-${bId}`);

      if (row) {
        if (newStatus === "NEW") row.classList.add("row-new");
        else row.classList.remove("row-new");
      }

      UI.showToast("Updating", `Updating status for ${bId}...`, "info", 1500);
      await ApiService.updateBookingStatus(bId, newStatus);
      UI.showToast("Status Updated", `Booking ${bId} marked as ${newStatus}`, "success");

      // Update cached record
      const match = adminDataCache.bookings.find((b) => b.bookingId === bId);
      if (match) match.bookingStatus = newStatus;
      renderKPICards(adminDataCache);
    });
  });
}

/**
 * Renders the Customer Searches & Leads table
 */
function renderSearchesTable(searches) {
  const tbody = document.getElementById("admin-searches-tbody");
  const countEl = document.getElementById("admin-table-count");
  if (!tbody) return;

  if (countEl) countEl.textContent = `Showing ${searches.length} Search Inquiries / Leads`;

  if (searches.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align:center; padding: 2.5rem; color:var(--gray-500);">
          No search queries logged yet. Every time a customer searches on the homepage, it appears here automatically.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = searches
    .map((s) => {
      const ts = s.timestamp ? new Date(s.timestamp).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) : "Recent";
      const pickupDate = s.pickupDate ? UI.formatDateDisplay(s.pickupDate) : "Flexible";
      const pickupTime = s.pickupTime ? UI.formatTimeDisplay(s.pickupTime) : "";

      return `
        <tr>
          <td>
            <span class="booking-id-tag" style="color:var(--gray-700); font-size:0.8rem;">${UI.escapeHTML(s.searchId || "SRC-N/A")}</span>
          </td>
          <td>
            <div style="font-size:0.85rem; color:var(--gray-700);">${ts}</div>
          </td>
          <td>
            ${s.phoneNumber ? `<a href="tel:+91${s.phoneNumber}" style="font-weight:700; color:var(--primary);">📞 +91 ${UI.escapeHTML(s.phoneNumber)}</a>` : '<span style="color:var(--gray-400);">Not provided</span>'}
          </td>
          <td>
            <strong>${UI.escapeHTML(s.pickupLocation || s.fromCity || "N/A")}</strong>
          </td>
          <td>
            <strong>${UI.escapeHTML(s.dropLocation || s.toCity || "N/A")}</strong>
          </td>
          <td>
            <div>${pickupDate}</div>
            <div style="font-size:0.75rem; color:var(--gray-500);">${pickupTime}</div>
          </td>
          <td>
            <span style="font-size:0.8rem; font-weight:700; text-transform:uppercase; background:var(--gray-100); padding:0.2rem 0.5rem; border-radius:var(--radius-sm);">
              ${UI.escapeHTML(s.serviceType || "oneway")}
            </span>
          </td>
          <td>
            <strong>${s.distanceKm || 0} KM</strong>
          </td>
        </tr>
      `;
    })
    .join("");
}

/**
 * Filter & Search handlers
 */
function setupTableFilters() {
  const searchInput = document.getElementById("admin-table-search");
  const statusFilter = document.getElementById("admin-filter-status");

  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);
}

function applyFilters() {
  const searchInput = document.getElementById("admin-table-search");
  const statusFilter = document.getElementById("admin-filter-status");
  const term = searchInput ? searchInput.value.trim().toLowerCase() : "";
  const status = statusFilter ? statusFilter.value : "ALL";

  if (currentAdminTab === "bookings") {
    let filtered = adminDataCache.bookings.filter((b) => {
      const matchStatus = status === "ALL" || b.bookingStatus === status;
      const matchTerm =
        !term ||
        (b.bookingId && b.bookingId.toLowerCase().includes(term)) ||
        (b.fullName && b.fullName.toLowerCase().includes(term)) ||
        (b.phoneNumber && b.phoneNumber.includes(term)) ||
        (b.fromCity && b.fromCity.toLowerCase().includes(term)) ||
        (b.toCity && b.toCity.toLowerCase().includes(term));

      return matchStatus && matchTerm;
    });

    renderBookingsTable(filtered);
  } else {
    let filtered = adminDataCache.searches.filter((s) => {
      const matchTerm =
        !term ||
        (s.searchId && s.searchId.toLowerCase().includes(term)) ||
        (s.phoneNumber && s.phoneNumber.includes(term)) ||
        (s.pickupLocation && s.pickupLocation.toLowerCase().includes(term)) ||
        (s.dropLocation && s.dropLocation.toLowerCase().includes(term));

      return matchTerm;
    });

    renderSearchesTable(filtered);
  }
}

/**
 * CSV Generation & 1-Click Export Handlers
 */
function setupCsvExports() {
  function escapeCsvCell(val) {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  }

  // 1. Export Bookings CSV
  const exportBookingsBtn = document.getElementById("btn-export-bookings-csv");
  if (exportBookingsBtn) {
    exportBookingsBtn.onclick = () => {
      const headers = [
        "Booking ID", "Booking Timestamp", "Booking Status", "Full Name", "Email",
        "Country Code", "Phone Number", "From City", "To City", "Pickup Address",
        "Dropoff Address", "Starting Date", "Starting Time", "Returning Date",
        "Returning Time", "Journey Type", "Car Type", "Distance KM", "Base Fare",
        "Vehicle Adjustment", "Final Fare", "Remarks", "Generated SMS", "SMS Status"
      ];

      const rows = adminDataCache.bookings.map((b) => [
        escapeCsvCell(b.bookingId),
        escapeCsvCell(b.bookingTimestamp || ""),
        escapeCsvCell(b.bookingStatus || "NEW"),
        escapeCsvCell(b.fullName || ""),
        escapeCsvCell(b.email || ""),
        escapeCsvCell(b.countryCode || "+91"),
        escapeCsvCell(b.phoneNumber || ""),
        escapeCsvCell(b.fromCity || ""),
        escapeCsvCell(b.toCity || ""),
        escapeCsvCell(b.pickupAddress || ""),
        escapeCsvCell(b.dropoffAddress || ""),
        escapeCsvCell(b.startingDate || ""),
        escapeCsvCell(b.startingTime || ""),
        escapeCsvCell(b.returningDate || ""),
        escapeCsvCell(b.returningTime || ""),
        escapeCsvCell(b.journeyType || "One Way"),
        escapeCsvCell(b.carType || "sedan"),
        escapeCsvCell(b.distanceKm || 0),
        escapeCsvCell(b.baseFare || 0),
        escapeCsvCell(b.vehicleAdjustment || 0),
        escapeCsvCell(b.finalFare || 0),
        escapeCsvCell(b.remarks || ""),
        escapeCsvCell(b.generatedSms || ""),
        escapeCsvCell(b.smsStatus || "READY")
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const dateStr = FormValidator.formatDateForInput(new Date());
      UI.downloadFile(`EaseMyRide_Bookings_${dateStr}.csv`, csvContent, "text/csv;charset=utf-8;");
    };
  }

  // 2. Export Searches CSV
  const exportSearchesBtn = document.getElementById("btn-export-searches-csv");
  if (exportSearchesBtn) {
    exportSearchesBtn.onclick = () => {
      const headers = [
        "Search ID", "Timestamp", "Service Type", "Pickup Location",
        "Drop Location", "Pickup Date", "Return Date", "Pickup Time",
        "Phone Number", "Distance KM", "Search Status", "User Agent"
      ];

      const rows = adminDataCache.searches.map((s) => [
        escapeCsvCell(s.searchId || ApiService.generateSearchId()),
        escapeCsvCell(s.timestamp || new Date().toISOString()),
        escapeCsvCell(s.serviceType || "oneway"),
        escapeCsvCell(s.pickupLocation || s.fromCity || ""),
        escapeCsvCell(s.dropLocation || s.toCity || ""),
        escapeCsvCell(s.pickupDate || ""),
        escapeCsvCell(s.returnDate || ""),
        escapeCsvCell(s.pickupTime || ""),
        escapeCsvCell(s.phoneNumber || ""),
        escapeCsvCell(s.distanceKm || 0),
        escapeCsvCell(s.searchStatus || "COMPLETED"),
        escapeCsvCell(s.userAgent || "Web Client")
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const dateStr = FormValidator.formatDateForInput(new Date());
      UI.downloadFile(`EaseMyRide_Searches_${dateStr}.csv`, csvContent, "text/csv;charset=utf-8;");
    };
  }

  // 3. Export Customer SMS CSV
  const exportSmsBtn = document.getElementById("btn-export-sms-csv");
  if (exportSmsBtn) {
    exportSmsBtn.onclick = () => {
      const headers = ["Booking ID", "Customer Name", "Phone Number", "Final Fare", "Generated SMS Text"];

      const rows = adminDataCache.bookings.map((b) => [
        escapeCsvCell(b.bookingId),
        escapeCsvCell(b.fullName || ""),
        escapeCsvCell(`+91${b.phoneNumber || ""}`),
        escapeCsvCell(`₹${b.finalFare || 0}`),
        escapeCsvCell(b.generatedSms || ApiService.generateSmsText(b))
      ].join(","));

      const csvContent = [headers.join(","), ...rows].join("\r\n");
      const dateStr = FormValidator.formatDateForInput(new Date());
      UI.downloadFile(`EaseMyRide_Customer_SMS_${dateStr}.csv`, csvContent, "text/csv;charset=utf-8;");
    };
  }
}
