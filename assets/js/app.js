/**
 * EaseMyRide — Homepage Controller (app.js)
 * 
 * Manages the multi-tab booking search widget, dynamic fields per service,
 * date restrictions, autocomplete location hints, and search submission.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize Header, Footer, and Navigation
  UI.injectNavigation("home");
  UI.initAccordion();

  // Popular Routes Dynamic Rendering
  renderPopularRoutes();

  // Widget Elements
  const tabButtons = document.querySelectorAll(".widget-tabs .tab-btn");
  const searchForm = document.getElementById("hero-search-form");

  // Input Containers for Dynamic Tabs
  const dropGroup = document.getElementById("group-drop-city");
  const returnDateGroup = document.getElementById("group-return-date");
  const returnTimeGroup = document.getElementById("group-return-time");
  const localPackageGroup = document.getElementById("group-local-package");
  const airportFieldsGroup = document.getElementById("group-airport-fields");

  // Form Inputs
  const pickupCityInput = document.getElementById("pickup-city");
  const dropCityInput = document.getElementById("drop-city");
  const pickupDateInput = document.getElementById("pickup-date");
  const pickupTimeInput = document.getElementById("pickup-time");
  const returnDateInput = document.getElementById("return-date");
  const returnTimeInput = document.getElementById("return-time");
  const phoneInput = document.getElementById("customer-phone");
  const localPackageSelect = document.getElementById("local-package-select");
  const airportSelect = document.getElementById("airport-select");
  const airportLocationInput = document.getElementById("airport-location");

  let currentService = "oneway";

  // Set default initial dates and times
  const todayStr = FormValidator.formatDateForInput(new Date());
  if (pickupDateInput) {
    pickupDateInput.min = todayStr;
    pickupDateInput.value = todayStr;
  }
  if (pickupTimeInput) {
    pickupTimeInput.value = FormValidator.getDefaultTime();
  }
  if (returnDateInput) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = FormValidator.formatDateForInput(tomorrow);
    returnDateInput.min = todayStr;
    returnDateInput.value = tomorrowStr;
  }
  if (returnTimeInput) {
    returnTimeInput.value = "18:00";
  }

  // Attach error-clearing handlers
  FormValidator.attachAutoClear(searchForm);

  // Tab Switching Logic
  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabButtons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentService = btn.dataset.service;
      updateFormLayoutForService(currentService);
    });
  });

  /**
   * Adjusts the visible fields based on the selected service tab.
   * @param {string} service
   */
  function updateFormLayoutForService(service) {
    // Reset any field error highlights
    const errorGroups = searchForm.querySelectorAll(".has-error");
    errorGroups.forEach((g) => g.classList.remove("has-error"));

    const pickupLabel = document.getElementById("pickup-city-label");

    if (service === "oneway") {
      pickupLabel.textContent = "Pickup City";
      pickupCityInput.placeholder = "e.g., Delhi, NCR";
      dropGroup.style.display = "flex";
      returnDateGroup.style.display = "none";
      returnTimeGroup.style.display = "none";
      localPackageGroup.style.display = "none";
      airportFieldsGroup.style.display = "none";
    } else if (service === "roundtrip") {
      pickupLabel.textContent = "Pickup City";
      pickupCityInput.placeholder = "e.g., Delhi, NCR";
      dropGroup.style.display = "flex";
      returnDateGroup.style.display = "flex";
      returnTimeGroup.style.display = "flex";
      localPackageGroup.style.display = "none";
      airportFieldsGroup.style.display = "none";
    } else if (service === "local") {
      pickupLabel.textContent = "City for Sightseeing";
      pickupCityInput.placeholder = "e.g., Jaipur, Mumbai, Delhi";
      dropGroup.style.display = "none";
      returnDateGroup.style.display = "none";
      returnTimeGroup.style.display = "none";
      localPackageGroup.style.display = "flex";
      airportFieldsGroup.style.display = "none";
    } else if (service === "airport") {
      pickupLabel.textContent = "Pickup / Drop Address";
      pickupCityInput.placeholder = "e.g., Hotel, Residence or Area";
      dropGroup.style.display = "none";
      returnDateGroup.style.display = "none";
      returnTimeGroup.style.display = "none";
      localPackageGroup.style.display = "none";
      airportFieldsGroup.style.display = "flex";
    }
  }

  // Location Autocomplete Setup
  setupAutocomplete(pickupCityInput);
  setupAutocomplete(dropCityInput);
  setupAutocomplete(airportLocationInput);

  // Search Form Submission
  if (searchForm) {
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      let hasError = false;
      const pickupVal = pickupCityInput.value.trim();
      const phoneVal = phoneInput.value.trim();
      const pickupDateVal = pickupDateInput.value;
      const pickupTimeVal = pickupTimeInput.value;

      // 1. Validate Phone
      if (!phoneVal) {
        FormValidator.showFieldError(phoneInput, "Please enter your 10-digit mobile number.");
        hasError = true;
      } else if (!FormValidator.isValidIndianPhone(phoneVal)) {
        FormValidator.showFieldError(phoneInput, "Enter a valid 10-digit Indian mobile number.");
        hasError = true;
      }

      // 2. Validate Pickup Date
      if (!pickupDateVal) {
        FormValidator.showFieldError(pickupDateInput, "Please select pickup date.");
        hasError = true;
      } else if (!FormValidator.isFutureOrTodayDate(pickupDateVal)) {
        FormValidator.showFieldError(pickupDateInput, "Pickup date cannot be in the past.");
        hasError = true;
      }

      // 3. Service specific validations
      let dropVal = "";
      let returnDateVal = "";
      let returnTimeVal = "";
      let packageId = "";
      let airportId = "";
      let transferType = "";

      if (currentService === "oneway" || currentService === "roundtrip") {
        dropVal = dropCityInput.value.trim();

        if (!pickupVal) {
          FormValidator.showFieldError(pickupCityInput, "Enter pickup city.");
          hasError = true;
        }

        if (!dropVal) {
          FormValidator.showFieldError(dropCityInput, "Enter destination drop city.");
          hasError = true;
        } else if (!FormValidator.areLocationsDistinct(pickupVal, dropVal)) {
          FormValidator.showFieldError(dropCityInput, "Pickup and drop city cannot be identical.");
          hasError = true;
        }

        if (currentService === "roundtrip") {
          returnDateVal = returnDateInput.value;
          returnTimeVal = returnTimeInput.value;
          if (!returnDateVal) {
            FormValidator.showFieldError(returnDateInput, "Select return date.");
            hasError = true;
          } else if (!FormValidator.isValidReturnDate(pickupDateVal, returnDateVal)) {
            FormValidator.showFieldError(returnDateInput, "Return date must be on or after pickup date.");
            hasError = true;
          }
        }
      } else if (currentService === "local") {
        if (!pickupVal) {
          FormValidator.showFieldError(pickupCityInput, "Enter city for local package.");
          hasError = true;
        }
        packageId = localPackageSelect ? localPackageSelect.value : "8hr80km";
      } else if (currentService === "airport") {
        airportId = airportSelect ? airportSelect.value : "DEL";
        const transferRadio = searchForm.querySelector("input[name='airport_transfer_type']:checked");
        transferType = transferRadio ? transferRadio.value : "airport_to_city";

        if (!pickupVal) {
          FormValidator.showFieldError(pickupCityInput, "Enter pickup / drop location.");
          hasError = true;
        }
      }

      if (hasError) {
        UI.showToast("Incomplete Form", "Please check and correct the highlighted fields.", "error");
        return;
      }

      // Calculation & Submission State
      UI.showLoading("Calculating fastest route and best fares...");

      try {
        let distanceData;
        let originCity = pickupVal;
        let destCity = dropVal;

        if (currentService === "airport") {
          const selectedAirport = EaseMyRideConfig.airports.find((a) => a.id === airportId) || EaseMyRideConfig.airports[0];
          originCity = transferType === "airport_to_city" ? selectedAirport.name : pickupVal;
          destCity = transferType === "airport_to_city" ? pickupVal : selectedAirport.name;
          distanceData = await DistanceService.calculateDistance(originCity, destCity, "airport");
        } else if (currentService === "local") {
          destCity = `${pickupVal} Sightseeing`;
          distanceData = await DistanceService.calculateDistance(pickupVal, destCity, "local");
        } else {
          distanceData = await DistanceService.calculateDistance(pickupVal, dropVal, currentService);
        }

        // Calculate days for round trip
        let tripDays = 1;
        if (currentService === "roundtrip" && pickupDateVal && returnDateVal) {
          const p = new Date(pickupDateVal);
          const r = new Date(returnDateVal);
          const diffTime = Math.abs(r - p);
          tripDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
        }

        // Search Object to persist & log
        const searchPayload = {
          serviceType: currentService,
          pickupLocation: originCity,
          dropLocation: destCity,
          fromCity: pickupVal,
          toCity: dropVal || destCity,
          pickupDate: pickupDateVal,
          pickupTime: pickupTimeVal || "08:00",
          returnDate: returnDateVal,
          returnTime: returnTimeVal,
          phoneNumber: FormValidator.sanitizePhoneNumber(phoneVal),
          distanceKm: distanceData.distanceKm,
          duration: distanceData.duration,
          days: tripDays,
          packageId: packageId,
          airportId: airportId,
          transferType: transferType,
          searchedAt: new Date().toISOString()
        };

        // 1. Auto-log search data to Google Apps Script / SEARCHES sheet in background
        ApiService.logSearch(searchPayload);

        // 2. Save active search state in localStorage
        localStorage.setItem(EaseMyRideConfig.storageKeys.lastSearch, JSON.stringify(searchPayload));

        // 3. Build URL query params for sharing / bookmarking search results
        const params = new URLSearchParams({
          service: currentService,
          from: originCity,
          to: destCity,
          date: pickupDateVal,
          time: pickupTimeVal,
          phone: FormValidator.sanitizePhoneNumber(phoneVal),
          distance: distanceData.distanceKm,
          duration: distanceData.duration,
          days: tripDays
        });

        if (returnDateVal) params.append("returnDate", returnDateVal);
        if (returnTimeVal) params.append("returnTime", returnTimeVal);
        if (packageId) params.append("pkg", packageId);
        if (transferType) params.append("transferType", transferType);

        // Redirect to search results page
        setTimeout(() => {
          UI.hideLoading();
          window.location.href = `search.html?${params.toString()}`;
        }, 400);

      } catch (err) {
        UI.hideLoading();
        console.error("Search processing error:", err);
        UI.showToast("Error", "Could not calculate route. Please verify city names.", "error");
      }
    });
  }

  /**
   * Dynamically renders popular route cards from configuration.
   */
  function renderPopularRoutes() {
    const grid = document.getElementById("popular-routes-grid");
    if (!grid || !EaseMyRideConfig.popularRoutes) return;

    grid.innerHTML = EaseMyRideConfig.popularRoutes
      .map((r) => {
        return `
          <div class="route-card" data-from="${r.from}" data-to="${r.to}">
            <div class="route-info">
              <div class="route-cities">
                <span>${r.from}</span>
                <span style="color:var(--primary);">➔</span>
                <span>${r.to}</span>
              </div>
              <div class="route-meta">${r.distanceKm} KM approx. • One Way</div>
            </div>
            <div class="route-fare">
              <div class="route-price-label">Starting</div>
              <div class="route-price">${UI.formatCurrency(r.baseFareSedan)}</div>
            </div>
          </div>
        `;
      })
      .join("");

    // Attach click listeners to auto-fill search widget
    grid.querySelectorAll(".route-card").forEach((card) => {
      card.addEventListener("click", () => {
        const from = card.dataset.from;
        const to = card.dataset.to;
        if (pickupCityInput && dropCityInput) {
          pickupCityInput.value = from;
          dropCityInput.value = to;
          // Switch to one-way tab
          const onewayBtn = document.querySelector(".tab-btn[data-service='oneway']");
          if (onewayBtn) onewayBtn.click();

          // Scroll to widget
          document.getElementById("hero-search-form").scrollIntoView({ behavior: "smooth", block: "center" });
          phoneInput.focus();
        }
      });
    });
  }

  /**
   * Autocomplete helper for Indian cities
   */
  function setupAutocomplete(inputElement) {
    if (!inputElement) return;

    const suggestionsBox = document.createElement("div");
    suggestionsBox.className = "autocomplete-suggestions";
    inputElement.parentElement.appendChild(suggestionsBox);

    const commonCities = [
      "Delhi", "New Delhi", "Noida", "Gurgaon", "Chandigarh", "Amritsar", "Jaipur", "Agra",
      "Shimla", "Manali", "Dehradun", "Haridwar", "Rishikesh", "Lucknow", "Kanpur", "Varanasi",
      "Mumbai", "Pune", "Shirdi", "Nashik", "Goa", "Bengaluru", "Mysuru", "Chennai", "Hyderabad",
      "Ahmedabad", "Surat", "Vadodara", "Udaipur", "Jodhpur", "Kolkata", "Patna", "Indore"
    ];

    inputElement.addEventListener("input", () => {
      const val = inputElement.value.trim().toLowerCase();
      if (val.length < 2) {
        suggestionsBox.classList.remove("active");
        return;
      }

      const matches = commonCities.filter((c) => c.toLowerCase().includes(val)).slice(0, 6);
      if (matches.length === 0) {
        suggestionsBox.classList.remove("active");
        return;
      }

      suggestionsBox.innerHTML = matches
        .map((m) => `<div class="suggestion-item">📍 ${m}</div>`)
        .join("");
      suggestionsBox.classList.add("active");

      suggestionsBox.querySelectorAll(".suggestion-item").forEach((item) => {
        item.addEventListener("click", () => {
          inputElement.value = item.textContent.replace("📍 ", "");
          suggestionsBox.classList.remove("active");
        });
      });
    });

    document.addEventListener("click", (e) => {
      if (!inputElement.parentElement.contains(e.target)) {
        suggestionsBox.classList.remove("active");
      }
    });
  }
});
