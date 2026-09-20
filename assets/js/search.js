/**
 * Marg Drive — Vehicle Search Results Controller (search.js)
 * 
 * Single authoritative search state management, URL-synchronized routing,
 * dynamic vehicle pricing, and seamless search modification.
 */

// Single Authoritative Search State
let searchState = {
  serviceType: "oneway",
  pickupCity: "New Delhi",
  dropCity: "Jaipur",
  pickupDate: "",
  pickupTime: "08:00",
  returnDate: "",
  returnTime: "",
  airport: "",
  distanceKm: 280,
  duration: "4 hrs 30 mins",
  pricing: null
};

document.addEventListener("DOMContentLoaded", async () => {
  UI.injectNavigation("services");

  // Ensure CitySearch is initialized
  if (typeof CitySearch !== "undefined" && typeof CitySearch.init === "function") {
    await CitySearch.init();
  }

  // Initialize search state from URL or clean fallback
  await initializeSearchFromUrl();

  // Listen for browser Back/Forward navigation
  window.addEventListener("popstate", async () => {
    await initializeSearchFromUrl(false);
  });
});

/**
 * Initializes the search state from URL parameters (authoritative source).
 * @param {boolean} pushToHistory
 */
async function initializeSearchFromUrl(pushToHistory = false) {
  const urlParams = new URLSearchParams(window.location.search);
  const todayStr = FormValidator.formatDateForInput(new Date());

  if (urlParams.has("from") || urlParams.has("to") || urlParams.has("service")) {
    const serviceType = urlParams.get("service") || "oneway";
    const pickupCity = urlParams.get("from") || "New Delhi";
    const dropCity = urlParams.get("to") || "Jaipur";
    const pickupDate = urlParams.get("date") || todayStr;
    const pickupTime = urlParams.get("time") || "08:00";
    const returnDate = urlParams.get("returnDate") || "";
    const returnTime = urlParams.get("returnTime") || "";
    const airport = urlParams.get("airport") || "";
    const days = parseInt(urlParams.get("days"), 10) || 1;
    const packageId = urlParams.get("pkg") || "8hr80km";
    const transferType = urlParams.get("transferType") || "airport_to_city";

    // Recalculate authoritative distance
    let distData;
    try {
      distData = await DistanceService.calculateRoadDistance(pickupCity, dropCity, serviceType);
    } catch (e) {
      distData = { distanceKm: 250, duration: "4 hrs 30 mins" };
    }

    // Reconstruct fresh search state
    searchState = {
      serviceType,
      pickupCity,
      dropCity,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      airport,
      days,
      packageId,
      transferType,
      distanceKm: distData.distanceKm,
      duration: distData.duration,
      pricing: null
    };
  } else {
    // Fallback to localStorage or default
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(MargDriveConfig.storageKeys.lastSearch));
    } catch (e) {}

    if (saved && saved.pickupCity && saved.dropCity) {
      searchState = {
        serviceType: saved.serviceType || "oneway",
        pickupCity: saved.pickupCity || saved.fromCity || "New Delhi",
        dropCity: saved.dropCity || saved.toCity || "Jaipur",
        pickupDate: saved.pickupDate || todayStr,
        pickupTime: saved.pickupTime || "08:00",
        returnDate: saved.returnDate || "",
        returnTime: saved.returnTime || "",
        airport: saved.airport || "",
        days: saved.days || 1,
        packageId: saved.packageId || "8hr80km",
        transferType: saved.transferType || "airport_to_city",
        distanceKm: saved.distanceKm || 280,
        duration: saved.duration || "4 hrs 30 mins",
        pricing: null
      };
    } else {
      searchState = {
        serviceType: "oneway",
        pickupCity: "New Delhi",
        dropCity: "Jaipur",
        pickupDate: todayStr,
        pickupTime: "08:00",
        returnDate: "",
        returnTime: "",
        airport: "",
        days: 1,
        packageId: "8hr80km",
        transferType: "airport_to_city",
        distanceKm: 280,
        duration: "4 hrs 30 mins",
        pricing: null
      };
    }
  }

  // Update page title & URL if needed
  updatePageMetaAndUrl(pushToHistory);

  // Overwrite localStorage completely (no stale keys)
  localStorage.setItem(MargDriveConfig.storageKeys.lastSearch, JSON.stringify(searchState));

  // Render Route Summary Bar
  renderRouteSummary(searchState);

  // Calculate and Render Vehicle Options
  renderVehicleResults(searchState);

  // Setup Modify Search Modal
  setupModifySearchModal(searchState);
}

/**
 * Synchronizes URL parameters with current searchState.
 */
function updatePageMetaAndUrl(pushToHistory = true) {
  const params = new URLSearchParams();
  params.set("service", searchState.serviceType);
  params.set("from", searchState.pickupCity);
  if (searchState.serviceType !== "local") {
    params.set("to", searchState.dropCity);
  }
  params.set("date", searchState.pickupDate);
  params.set("time", searchState.pickupTime);
  params.set("dist", searchState.distanceKm);

  if (searchState.returnDate) params.set("returnDate", searchState.returnDate);
  if (searchState.returnTime) params.set("returnTime", searchState.returnTime);
  if (searchState.days > 1) params.set("days", searchState.days);
  if (searchState.packageId) params.set("pkg", searchState.packageId);
  if (searchState.transferType) params.set("transferType", searchState.transferType);

  const newUrl = `${window.location.pathname}?${params.toString()}`;
  if (pushToHistory && window.location.search !== `?${params.toString()}`) {
    window.history.pushState({ searchState }, "", newUrl);
  } else {
    window.history.replaceState({ searchState }, "", newUrl);
  }

  // Update document title
  document.title = `${searchState.pickupCity} to ${searchState.dropCity} Cab — Marg Drive`;
}

/**
 * Renders the top summary banner with route info, date/time, and distance.
 */
function renderRouteSummary(state) {
  const titleEl = document.getElementById("summary-route-title");
  const metaEl = document.getElementById("summary-route-meta");

  if (titleEl) {
    if (state.serviceType === "local") {
      titleEl.innerHTML = `<span>📍 ${UI.escapeHTML(state.pickupCity)}</span> <span style="font-size:0.9rem; color:var(--gray-500); font-weight:500;">(Local Tour)</span>`;
    } else {
      titleEl.innerHTML = `
        <span>${UI.escapeHTML(state.pickupCity)}</span>
        <span style="color:var(--primary); margin: 0 0.4rem;">➔</span>
        <span>${UI.escapeHTML(state.dropCity)}</span>
      `;
    }
  }

  if (metaEl) {
    const serviceLabel = {
      oneway: "One Way",
      roundtrip: `Round Trip (${state.days || 1} Day${(state.days || 1) > 1 ? "s" : ""})`,
      local: `Local Sightseeing`,
      airport: "Airport Transfer"
    }[state.serviceType] || "One Way";

    metaEl.innerHTML = `
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${UI.formatDateDisplay(state.pickupDate)} at ${UI.formatTimeDisplay(state.pickupTime)}</span>
      </div>
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${state.duration || "Est. Duration"}</span>
      </div>
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        <span>${state.distanceKm} KM Road Distance</span>
      </div>
      <div class="meta-pill" style="background:var(--primary-subtle); color:var(--primary); font-weight:700;">
        <span>${serviceLabel}</span>
      </div>
    `;
  }
}

/**
 * Calculates fares and dynamically renders vehicle cards.
 */
function renderVehicleResults(state) {
  const container = document.getElementById("vehicle-cards-container");
  if (!container) return;

  const vehicleFares = PricingEngine.getAllVehicleFares({
    serviceType: state.serviceType,
    origin: state.pickupCity,
    destination: state.dropCity,
    distanceKm: state.distanceKm,
    days: state.days,
    packageId: state.packageId,
    transferType: state.transferType
  });

  container.innerHTML = MargDriveConfig.vehicles
    .map((veh) => {
      const quote = vehicleFares.find((f) => f.carType === veh.id) || vehicleFares[1];
      const fareAmount = quote ? quote.finalFare : 3000;
      const isRecommended = veh.recommended;
      const hasRegionalAdj = quote && quote.regionalAdjustment > 0;
      const hasRouteAdj = quote && quote.specialRouteAdjustment > 0;

      return `
        <div class="car-card ${isRecommended ? "recommended" : ""}" id="car-card-${veh.id}">
          ${veh.badge ? `<div class="card-badge">${veh.badge}</div>` : ""}

          <div class="car-image-box">
            ${UI.getCarSvg(veh.imageType)}
            <span style="font-size:0.75rem; color:var(--gray-500); margin-top:0.4rem;">Sample Images</span>
          </div>

          <div class="car-details">
            <div class="car-header">
              <h3 class="car-name">${veh.name}</h3>
              <span class="car-models-sample">(${veh.models})</span>
            </div>

            <p style="font-size:0.88rem; color:var(--gray-600); margin-bottom:0.25rem;">
              ${veh.description}
            </p>

            <div class="car-specs">
              <div class="spec-item" title="Passenger Capacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span>${veh.capacity}</span>
              </div>
              <div class="spec-item" title="Luggage Capacity">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                <span>${veh.luggage}</span>
              </div>
              <div class="spec-item" title="Air Conditioning">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg>
                <span>AC Cab</span>
              </div>
            </div>

            <ul class="car-features-list">
              <li>Clean & Sanitized</li>
              <li>Trained Highway Chauffeur</li>
              <li>24x7 Helpline Support</li>
              ${hasRegionalAdj || hasRouteAdj ? '<li style="color:var(--primary); font-weight:600;">Special Route Pricing Applied</li>' : ''}
            </ul>
          </div>

          <div class="car-pricing-action">
            <div class="car-fare-amount">
              <span class="currency">₹</span>${fareAmount.toLocaleString("en-IN")}
            </div>
            <div class="car-fare-tag">
              <span>Base Fare</span>
              <span class="toll-note-badge">Toll Taxes Extra</span>
            </div>
            
            <button 
              type="button" 
              class="btn btn-outline btn-sm view-breakdown-btn" 
              data-cartype="${veh.id}"
              data-fare="${fareAmount}"
              data-sedan="${quote ? quote.baseFareSedan : 0}"
              data-adj="${quote ? quote.vehicleAdjustment : 0}"
              data-reg="${quote ? quote.regionalAdjustment : 0}"
              data-route="${quote ? quote.specialRouteAdjustment : 0}"
              data-rules='${JSON.stringify(quote ? quote.appliedRules : [])}'
              style="font-size:0.78rem; padding:0.3rem 0.6rem; border:none; text-decoration:underline; color:var(--gray-600);"
            >
              View Fare Breakdown
            </button>

            <button 
              type="button" 
              class="btn btn-primary btn-block select-vehicle-btn"
              data-cartype="${veh.id}"
              data-carname="${veh.name}"
              data-fare="${fareAmount}"
              data-sedanfare="${quote ? quote.baseFareSedan : 0}"
              data-adj="${quote ? quote.vehicleAdjustment : 0}"
              data-reg="${quote ? quote.regionalAdjustment : 0}"
              data-route="${quote ? quote.specialRouteAdjustment : 0}"
              data-rules='${JSON.stringify(quote ? quote.appliedRules : [])}'
            >
              Select ${veh.name}
            </button>
          </div>
        </div>
      `;
    })
    .join("");

  // Attach Select Vehicle listeners
  container.querySelectorAll(".select-vehicle-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const carType = btn.dataset.cartype;
      const carName = btn.dataset.carname;
      const fare = parseInt(btn.dataset.fare, 10);
      const sedanFare = parseInt(btn.dataset.sedanfare, 10);
      const adj = parseInt(btn.dataset.adj, 10);
      const reg = parseInt(btn.dataset.reg, 10) || 0;
      const routeAdj = parseInt(btn.dataset.route, 10) || 0;
      const appliedRules = JSON.parse(btn.dataset.rules || "[]");

      // Package full booking state
      const bookingIntent = {
        serviceType: searchState.serviceType,
        pickupCity: searchState.pickupCity,
        dropCity: searchState.dropCity,
        pickupDate: searchState.pickupDate,
        pickupTime: searchState.pickupTime,
        returnDate: searchState.returnDate,
        returnTime: searchState.returnTime,
        distanceKm: searchState.distanceKm,
        carType,
        carName,
        finalFare: fare,
        baseFare: sedanFare,
        vehicleAdjustment: adj,
        regionalAdjustment: reg,
        specialRouteAdjustment: routeAdj,
        appliedRules,
        pricingVersion: PricingEngine.PRICING_VERSION,
        selectedAt: new Date().toISOString()
      };

      localStorage.setItem(MargDriveConfig.storageKeys.activeBooking, JSON.stringify(bookingIntent));

      // Build Booking checkout URL
      const params = new URLSearchParams({
        service: searchState.serviceType,
        from: searchState.pickupCity,
        to: searchState.dropCity,
        car: carType,
        fare: fare,
        date: searchState.pickupDate,
        time: searchState.pickupTime,
        dist: searchState.distanceKm
      });

      if (searchState.returnDate) params.append("returnDate", searchState.returnDate);
      if (searchState.returnTime) params.append("returnTime", searchState.returnTime);

      window.location.href = `booking.html?${params.toString()}`;
    });
  });

  // Attach Fare Breakdown modal listeners
  container.querySelectorAll(".view-breakdown-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const carType = btn.dataset.cartype;
      const fare = parseInt(btn.dataset.fare, 10);
      const sedan = parseInt(btn.dataset.sedan, 10);
      const adj = parseInt(btn.dataset.adj, 10);
      const reg = parseInt(btn.dataset.reg, 10) || 0;
      const routeAdj = parseInt(btn.dataset.route, 10) || 0;
      const appliedRules = JSON.parse(btn.dataset.rules || "[]");

      const modalContent = document.getElementById("breakdown-modal-content");
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="fare-breakdown-list">
            <div class="fare-breakdown-row">
              <span>Distance & Base Rate (${searchState.distanceKm} KM)</span>
              <span>₹${sedan.toLocaleString("en-IN")}</span>
            </div>
            <div class="fare-breakdown-row">
              <span>Vehicle Category Adjustment (${carType.toUpperCase()})</span>
              <span>${adj >= 0 ? `+ ₹${adj.toLocaleString("en-IN")}` : `- ₹${Math.abs(adj)}`}</span>
            </div>
            ${reg > 0 ? `
              <div class="fare-breakdown-row">
                <span>Regional Pricing Adjustment (South India)</span>
                <span>+ ₹${reg.toLocaleString("en-IN")}</span>
              </div>
            ` : ""}
            ${routeAdj > 0 ? `
              <div class="fare-breakdown-row">
                <span>Special Terrain / High-Altitude Adjustment</span>
                <span>+ ₹${routeAdj.toLocaleString("en-IN")}</span>
              </div>
            ` : ""}
            <div class="fare-breakdown-row total">
              <span>Estimated Base Fare</span>
              <span>₹${fare.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <div style="font-size:0.75rem; color:var(--gray-500); margin: 0.5rem 0;">
            Applied Pricing Rules: <code>${appliedRules.join(", ")}</code>
          </div>
          <div class="transparent-note">
            <strong>Transparent Fare Guarantee:</strong><br>
            • Included: Vehicle, Chauffeur allowance, Fuel & Base km coverage.<br>
            • Excluded: Highway toll taxes, State entry permits, and Airport parking fees (payable directly as per actual receipts).
          </div>
        `;
      }
      UI.openModal("modal-fare-breakdown");
    });
  });
}

/**
 * Sets up the Modify Search modal functionality.
 */
function setupModifySearchModal(currentState) {
  const modifyBtn = document.getElementById("btn-modify-search");
  const modalClose = document.getElementById("btn-close-modify-modal");
  const modifyForm = document.getElementById("modify-search-form");

  const modFrom = document.getElementById("mod-pickup-city");
  const modTo = document.getElementById("mod-drop-city");
  const modDate = document.getElementById("mod-pickup-date");
  const modTime = document.getElementById("mod-pickup-time");

  // Attach city autocomplete to modal inputs
  if (typeof CitySearch !== "undefined" && typeof CitySearch.attachAutocomplete === "function") {
    if (modFrom) CitySearch.attachAutocomplete(modFrom);
    if (modTo) CitySearch.attachAutocomplete(modTo);
  }

  if (modifyBtn) {
    modifyBtn.addEventListener("click", () => {
      if (modFrom) modFrom.value = currentState.pickupCity;
      if (modTo) modTo.value = currentState.dropCity;
      if (modDate) {
        modDate.value = currentState.pickupDate;
        modDate.min = FormValidator.formatDateForInput(new Date());
      }
      if (modTime) modTime.value = currentState.pickupTime;

      UI.openModal("modal-modify-search");
    });
  }

  if (modalClose) {
    modalClose.addEventListener("click", () => UI.closeModal("modal-modify-search"));
  }

  const breakdownClose = document.getElementById("btn-close-breakdown-modal");
  if (breakdownClose) {
    breakdownClose.addEventListener("click", () => UI.closeModal("modal-fare-breakdown"));
  }

  if (modifyForm) {
    modifyForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const newFrom = modFrom.value.trim();
      const newTo = modTo ? modTo.value.trim() : "";
      const newDate = modDate.value;
      const newTime = modTime.value;

      if (!newFrom || (currentState.serviceType !== "local" && !newTo)) {
        UI.showToast("Missing Cities", "Please enter valid pickup and drop destinations.", "error");
        return;
      }

      UI.closeModal("modal-modify-search");
      UI.showLoading("Recalculating route and fares...");

      try {
        const distData = await DistanceService.calculateRoadDistance(newFrom, newTo, currentState.serviceType);

        // Completely destroy and replace searchState
        searchState = {
          serviceType: currentState.serviceType,
          pickupCity: newFrom,
          dropCity: newTo,
          pickupDate: newDate,
          pickupTime: newTime,
          returnDate: currentState.returnDate || "",
          returnTime: currentState.returnTime || "",
          airport: currentState.airport || "",
          days: currentState.days || 1,
          packageId: currentState.packageId || "8hr80km",
          transferType: currentState.transferType || "airport_to_city",
          distanceKm: distData.distanceKm,
          duration: distData.duration,
          pricing: null
        };

        // Update URL with pushState so history is clean
        updatePageMetaAndUrl(true);

        // Overwrite localStorage
        localStorage.setItem(MargDriveConfig.storageKeys.lastSearch, JSON.stringify(searchState));

        // Re-render UI
        renderRouteSummary(searchState);
        renderVehicleResults(searchState);

        UI.hideLoading();
        UI.showToast("Search Updated", `${newFrom} → ${newTo} loaded.`, "success");
      } catch (err) {
        UI.hideLoading();
        UI.showToast("Error", "Could not calculate route distance.", "error");
      }
    });
  }
}