/**
 * RideOnDemand — Vehicle Search Results Controller (search.js)
 * 
 * Reads search criteria, executes PricingEngine computations, renders dynamic
 * vehicle cards with capacities and transparent pricing, and manages vehicle selection.
 */

document.addEventListener("DOMContentLoaded", () => {
  UI.injectNavigation("services");

  // Read URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  let searchData = null;

  if (urlParams.has("from")) {
    searchData = {
      serviceType: urlParams.get("service") || "oneway",
      fromCity: urlParams.get("from") || "Delhi",
      toCity: urlParams.get("to") || "Chandigarh",
      pickupDate: urlParams.get("date") || FormValidator.formatDateForInput(new Date()),
      pickupTime: urlParams.get("time") || "08:00",
      returnDate: urlParams.get("returnDate") || "",
      returnTime: urlParams.get("returnTime") || "",
      phoneNumber: urlParams.get("phone") || "",
      distanceKm: parseInt(urlParams.get("distance"), 10) || 250,
      duration: urlParams.get("duration") || "4 hrs 30 mins",
      days: parseInt(urlParams.get("days"), 10) || 1,
      packageId: urlParams.get("pkg") || "8hr80km",
      transferType: urlParams.get("transferType") || "airport_to_city"
    };
  } else {
    // Fallback to local storage
    try {
      searchData = JSON.parse(localStorage.getItem(RideOnDemandConfig.storageKeys.lastSearch));
    } catch (e) {
      searchData = null;
    }
  }

  // If no search state exists, use a sensible default
  if (!searchData) {
    searchData = {
      serviceType: "oneway",
      fromCity: "Delhi",
      toCity: "Chandigarh",
      pickupDate: FormValidator.formatDateForInput(new Date()),
      pickupTime: "08:00",
      phoneNumber: "9876543210",
      distanceKm: 250,
      duration: "4 hrs 30 mins",
      days: 1
    };
  }

  // Render Route Summary Bar
  renderRouteSummary(searchData);

  // Calculate and Render Vehicle Options
  renderVehicleResults(searchData);

  // Setup Modify Search Modal
  setupModifySearchModal(searchData);
});

/**
 * Renders the top summary banner with route info, date/time, and distance.
 */
function renderRouteSummary(searchData) {
  const titleEl = document.getElementById("summary-route-title");
  const metaEl = document.getElementById("summary-route-meta");

  if (titleEl) {
    if (searchData.serviceType === "local") {
      titleEl.innerHTML = `<span>📍 ${UI.escapeHTML(searchData.fromCity)}</span> <span style="font-size:0.9rem; color:var(--gray-500); font-weight:500;">(Local Tour)</span>`;
    } else {
      titleEl.innerHTML = `
        <span>${UI.escapeHTML(searchData.fromCity)}</span>
        <span style="color:var(--primary); margin: 0 0.4rem;">➔</span>
        <span>${UI.escapeHTML(searchData.toCity)}</span>
      `;
    }
  }

  if (metaEl) {
    const serviceLabel = {
      oneway: "One Way",
      roundtrip: `Round Trip (${searchData.days || 1} Day${(searchData.days || 1) > 1 ? "s" : ""})`,
      local: `Local Sightseeing`,
      airport: "Airport Transfer"
    }[searchData.serviceType] || "One Way";

    metaEl.innerHTML = `
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        <span>${UI.formatDateDisplay(searchData.pickupDate)} at ${UI.formatTimeDisplay(searchData.pickupTime)}</span>
      </div>
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>${searchData.duration || "Est. Duration"}</span>
      </div>
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
        <span>${searchData.distanceKm} KM Road Distance</span>
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
function renderVehicleResults(searchData) {
  const container = document.getElementById("vehicle-cards-container");
  if (!container) return;

  const vehicleFares = PricingEngine.getAllVehicleFares(searchData);

  container.innerHTML = RideOnDemandConfig.vehicles
    .map((veh) => {
      const quote = vehicleFares.find((f) => f.carType === veh.id) || vehicleFares[1];
      const fareAmount = quote ? quote.finalFare : 3000;
      const isRecommended = veh.recommended;

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
              <li>Trained Highway Driver</li>
              <li>24x7 Helpline Support</li>
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
              data-sedan="${quote.baseFareSedan}"
              data-adj="${quote.vehicleAdjustment}"
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
              data-sedanfare="${quote.baseFareSedan}"
              data-adj="${quote.vehicleAdjustment}"
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

      // Package full booking state
      const bookingIntent = {
        ...searchData,
        carType: carType,
        carName: carName,
        finalFare: fare,
        baseFare: sedanFare,
        vehicleAdjustment: adj,
        selectedAt: new Date().toISOString()
      };

      localStorage.setItem(RideOnDemandConfig.storageKeys.activeBooking, JSON.stringify(bookingIntent));

      // Build Booking checkout URL
      const params = new URLSearchParams({
        service: searchData.serviceType,
        from: searchData.fromCity,
        to: searchData.toCity,
        car: carType,
        fare: fare,
        date: searchData.pickupDate,
        time: searchData.pickupTime,
        phone: searchData.phoneNumber,
        dist: searchData.distanceKm
      });

      if (searchData.returnDate) params.append("returnDate", searchData.returnDate);
      if (searchData.returnTime) params.append("returnTime", searchData.returnTime);

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

      const modalContent = document.getElementById("breakdown-modal-content");
      if (modalContent) {
        modalContent.innerHTML = `
          <div class="fare-breakdown-list">
            <div class="fare-breakdown-row">
              <span>Distance & Base Rate (${searchData.distanceKm} KM)</span>
              <span>₹${sedan.toLocaleString("en-IN")}</span>
            </div>
            <div class="fare-breakdown-row">
              <span>Vehicle Category Adjustment (${carType.toUpperCase()})</span>
              <span>${adj >= 0 ? `+ ₹${adj.toLocaleString("en-IN")}` : `- ₹${Math.abs(adj)}`}</span>
            </div>
            <div class="fare-breakdown-row total">
              <span>Estimated Base Fare</span>
              <span>₹${fare.toLocaleString("en-IN")}</span>
            </div>
          </div>
          <div class="transparent-note">
            <strong>Transparent Fare Guarantee:</strong><br>
            • Included: Vehicle, Driver allowance, Fuel & Base km coverage.<br>
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
function setupModifySearchModal(currentData) {
  const modifyBtn = document.getElementById("btn-modify-search");
  const modalClose = document.getElementById("btn-close-modify-modal");
  const modal = document.getElementById("modal-modify-search");
  const modifyForm = document.getElementById("modify-search-form");

  if (modifyBtn) {
    modifyBtn.addEventListener("click", () => {
      const modFrom = document.getElementById("mod-pickup-city");
      const modTo = document.getElementById("mod-drop-city");
      const modDate = document.getElementById("mod-pickup-date");
      const modTime = document.getElementById("mod-pickup-time");

      if (modFrom) modFrom.value = currentData.fromCity;
      if (modTo) modTo.value = currentData.toCity;
      if (modDate) {
        modDate.value = currentData.pickupDate;
        modDate.min = FormValidator.formatDateForInput(new Date());
      }
      if (modTime) modTime.value = currentData.pickupTime;

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
      const newFrom = document.getElementById("mod-pickup-city").value.trim();
      const newTo = document.getElementById("mod-drop-city").value.trim();
      const newDate = document.getElementById("mod-pickup-date").value;
      const newTime = document.getElementById("mod-pickup-time").value;

      if (!newFrom || !newTo) {
        UI.showToast("Missing Cities", "Please enter both pickup and destination cities.", "error");
        return;
      }

      UI.closeModal("modal-modify-search");
      UI.showLoading("Recalculating route...");

      try {
        const distData = await DistanceService.calculateDistance(newFrom, newTo, currentData.serviceType);
        const updated = {
          ...currentData,
          fromCity: newFrom,
          toCity: newTo,
          pickupDate: newDate,
          pickupTime: newTime,
          distanceKm: distData.distanceKm,
          duration: distData.duration
        };

        localStorage.setItem(RideOnDemandConfig.storageKeys.lastSearch, JSON.stringify(updated));
        renderRouteSummary(updated);
        renderVehicleResults(updated);
        UI.hideLoading();
        UI.showToast("Updated", "Search criteria and fares recalculated.", "success");
      } catch (err) {
        UI.hideLoading();
        UI.showToast("Error", "Could not calculate distance for new route.", "error");
      }
    });
  }
}
