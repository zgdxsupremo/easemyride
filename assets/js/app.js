/**
 * Marg Drive — Homepage Controller (app.js)
 * 
 * Manages the multi-tab booking search widget, dynamic fields per service,
 * date restrictions, pan-India city autocomplete, and search submission.
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Header, Footer, and Navigation
  UI.injectNavigation("home");
  UI.initAccordion();

  // Initialize CitySearch dataset
  if (typeof CitySearch !== "undefined" && typeof CitySearch.init === "function") {
    await CitySearch.init();
  }

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

  // Bind Pan-India City Autocomplete Engine
  if (typeof CitySearch !== "undefined" && typeof CitySearch.attachAutocomplete === "function") {
    CitySearch.attachAutocomplete(pickupCityInput);
    CitySearch.attachAutocomplete(dropCityInput);
    if (airportLocationInput) CitySearch.attachAutocomplete(airportLocationInput);
  }

  // Search Form Submission
  if (searchForm) {
    searchForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      let hasError = false;
      const pickupVal = pickupCityInput.value.trim();
      const phoneVal = phoneInput ? phoneInput.value.trim() : "";
      const pickupDateVal = pickupDateInput.value;
      const pickupTimeVal = pickupTimeInput.value;

      // 1. Validate Phone if present
      if (phoneInput) {
        if (!phoneVal) {
          FormValidator.showFieldError(phoneInput, "Please enter your 10-digit mobile number.");
          hasError = true;
        } else if (!FormValidator.isValidIndianPhone(phoneVal)) {
          FormValidator.showFieldError(phoneInput, "Enter a valid 10-digit Indian mobile number.");
          hasError = true;
        }
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
          const selectedAirport = MargDriveConfig.airports.find((a) => a.id === airportId) || MargDriveConfig.airports[0];
          originCity = transferType === "airport_to_city" ? selectedAirport.name : pickupVal;
          destCity = transferType === "airport_to_city" ? pickupVal : selectedAirport.name;
          distanceData = await DistanceService.calculateRoadDistance(originCity, destCity, "airport");
        } else if (currentService === "local") {
          destCity = `${pickupVal} Sightseeing`;
          distanceData = await DistanceService.calculateRoadDistance(pickupVal, destCity, "local");
        } else {
          distanceData = await DistanceService.calculateRoadDistance(pickupVal, dropVal, currentService);
        }

        let tripDays = 1;
        if (currentService === "roundtrip" && pickupDateVal && returnDateVal) {
          const p = new Date(pickupDateVal);
          const r = new Date(returnDateVal);
          const diffTime = Math.abs(r - p);
          tripDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
        }

        const cleanPhone = phoneVal ? FormValidator.sanitizePhoneNumber(phoneVal) : "";

        // Authoritative Search State Object with Canonical Mapping
        const newSearchState = {
          serviceType: currentService,
          pickupLocation: originCity,
          dropLocation: destCity,
          pickupCity: originCity,
          dropCity: destCity,
          fromCity: originCity,
          toCity: destCity,
          pickupDate: pickupDateVal,
          pickupTime: pickupTimeVal || "08:00",
          returnDate: returnDateVal,
          returnTime: returnTimeVal,
          phoneNumber: cleanPhone,
          airport: airportId,
          days: tripDays,
          packageId,
          transferType,
          distanceKm: distanceData.distanceKm,
          duration: distanceData.duration,
          pricing: null
        };

        // 1. Log search to Google Apps Script webhook
        ApiService.logSearch(newSearchState);

        // 2. Overwrite localStorage completely
        localStorage.setItem(MargDriveConfig.storageKeys.lastSearch, JSON.stringify(newSearchState));

        // 3. Build URL query params
        const params = new URLSearchParams({
          service: currentService,
          from: originCity,
          to: destCity,
          date: pickupDateVal,
          time: pickupTimeVal,
          dist: distanceData.distanceKm,
          days: tripDays
        });

        if (cleanPhone) params.set("phone", cleanPhone);
        if (returnDateVal) params.set("returnDate", returnDateVal);
        if (returnTimeVal) params.set("returnTime", returnTimeVal);
        if (packageId) params.set("pkg", packageId);
        if (transferType) params.set("transferType", transferType);

        setTimeout(() => {
          UI.hideLoading();
          window.location.href = `search.html?${params.toString()}`;
        }, 300);

      } catch (err) {
        UI.hideLoading();
        console.error("Search error:", err);
        UI.showToast("Error", "Could not calculate route. Please verify city names.", "error");
      }
    });
  }

  /**
   * Dynamically renders popular route cards from configuration.
   */
  function renderPopularRoutes() {
    const grid = document.getElementById("popular-routes-grid");
    if (!grid || !MargDriveConfig.popularRoutes) return;

    grid.innerHTML = MargDriveConfig.popularRoutes
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

    grid.querySelectorAll(".route-card").forEach((card) => {
      card.addEventListener("click", () => {
        const from = card.dataset.from;
        const to = card.dataset.to;
        if (pickupCityInput && dropCityInput) {
          pickupCityInput.value = from;
          dropCityInput.value = to;
          const onewayBtn = document.querySelector(".tab-btn[data-service='oneway']");
          if (onewayBtn) onewayBtn.click();
          document.getElementById("hero-search-form").scrollIntoView({ behavior: "smooth", block: "center" });
          if (phoneInput) phoneInput.focus();
        }
      });
    });
  }
});