/**
 * Marg Drive — Booking Checkout Controller (booking.js)
 * 
 * Manages passenger details collection, journey address specifications,
 * trip summary verification, robust validation, and ₹500 UPI checkout.
 */

const PAYMENT_CONFIG = {
  provider: "MANUAL_UPI",
  amount: 500,
  currency: "INR",
  upiId: "7973785807@kotakbank",
  merchantName: "Marg Drive"
};

document.addEventListener("DOMContentLoaded", async () => {
  UI.injectNavigation("booking");

  // Ensure CitySearch is initialized synchronously
  if (typeof CitySearch !== "undefined" && typeof CitySearch.init === "function") {
    await CitySearch.init();
  }

  // 1. Authoritative check: Prioritize URL parameters over stale localStorage
  const urlParams = new URLSearchParams(window.location.search);
  let bookingData = null;

  if (urlParams.has("from") || urlParams.has("to") || urlParams.has("service") || urlParams.has("car")) {
    const pickupCity = (urlParams.get("from") || "Delhi").trim();
    const dropCity = (urlParams.get("to") || "Chandigarh").trim();
    const serviceType = urlParams.get("service") || "oneway";
    const car = urlParams.get("car") || "sedan";
    const distParam = parseInt(urlParams.get("dist"), 10);
    const fareParam = parseInt(urlParams.get("fare"), 10);

    // Calculate distance dynamically if missing or zero
    let dist = distParam;
    if (!dist || isNaN(dist) || dist <= 0) {
      if (typeof DistanceService !== "undefined" && typeof DistanceService.estimateDistanceByCoordinates === "function") {
        dist = DistanceService.estimateDistanceByCoordinates(pickupCity, dropCity);
      } else {
        dist = 250;
      }
    }

    const quote = PricingEngine.calculateOneWayFare({
      distanceKm: dist,
      carType: car,
      origin: pickupCity,
      destination: dropCity
    });

    const config = window.MargDriveConfig || { vehicles: [] };
    const vehMeta = (config.vehicles && config.vehicles.find((v) => v.id === car)) || { name: "Sedan" };

    bookingData = {
      serviceType: serviceType,
      pickupCity: pickupCity,
      dropCity: dropCity,
      fromCity: pickupCity,
      toCity: dropCity,
      pickupDate: urlParams.get("date") || FormValidator.formatDateForInput(new Date()),
      pickupTime: urlParams.get("time") || "08:00",
      returnDate: urlParams.get("returnDate") || "",
      returnTime: urlParams.get("returnTime") || "",
      phoneNumber: urlParams.get("phone") || "",
      distanceKm: dist,
      carType: car,
      carName: vehMeta.name,
      finalFare: (!isNaN(fareParam) && fareParam > 0) ? fareParam : quote.finalFare,
      baseFare: quote.baseFareSedan || quote.baseFare || 3000,
      vehicleAdjustment: quote.vehicleAdjustment || 0,
      regionalAdjustment: quote.regionalAdjustment || 0,
      specialRouteAdjustment: quote.specialRouteAdjustment || 0,
      appliedRules: quote.appliedRules || [],
      pricingVersion: PricingEngine.PRICING_VERSION
    };

    // Synchronize to localStorage so state persists across page interactions
    try {
      localStorage.setItem(MargDriveConfig.storageKeys.activeBooking, JSON.stringify(bookingData));
    } catch (e) {}
  } else {
    // Fall back to active booking state from localStorage
    try {
      bookingData = JSON.parse(localStorage.getItem(MargDriveConfig.storageKeys.activeBooking));
    } catch (e) {
      bookingData = null;
    }
  }

  if (!bookingData) {
    window.location.href = "index.html";
    return;
  }

  // Pre-fill form fields, attach live listeners, and populate summary
  initBookingForm(bookingData);
});

/**
 * Initializes and populates booking form fields, attaches live trip update listeners, and renders trip sidebar.
 */
function initBookingForm(bookingData) {
  const form = document.getElementById("booking-checkout-form");
  const nameInput = document.getElementById("passenger-name");
  const phoneInput = document.getElementById("passenger-phone");
  const pickupCityInput = document.getElementById("booking-pickup-city");
  const dropCityInput = document.getElementById("booking-drop-city");
  const dropCityGroup = document.getElementById("group-booking-drop-city");
  const pickupAddressInput = document.getElementById("pickup-address");
  const dropAddressInput = document.getElementById("drop-address");
  const startDateInput = document.getElementById("booking-start-date");
  const startTimeInput = document.getElementById("booking-start-time");
  const returnGroup = document.getElementById("booking-return-group");
  const returnDateInput = document.getElementById("booking-return-date");
  const returnTimeInput = document.getElementById("booking-return-time");
  const remarksInput = document.getElementById("trip-remarks");

  // Pre-populate route cities
  if (pickupCityInput) {
    pickupCityInput.value = bookingData.pickupCity || bookingData.fromCity || "";
  }
  if (dropCityInput) {
    dropCityInput.value = bookingData.dropCity || bookingData.toCity || "";
    if (bookingData.serviceType === "local" && dropCityGroup) {
      dropCityGroup.style.display = "none";
    }
  }

  // Pre-populate known contact and journey fields
  if (phoneInput && bookingData.phoneNumber) {
    phoneInput.value = bookingData.phoneNumber;
  }
  if (startDateInput) {
    startDateInput.value = bookingData.pickupDate;
    startDateInput.min = FormValidator.formatDateForInput(new Date());
  }
  if (startTimeInput) {
    startTimeInput.value = bookingData.pickupTime;
  }

  // Round trip return dates
  if (bookingData.serviceType === "roundtrip" && returnGroup) {
    returnGroup.style.display = "grid";
    if (returnDateInput) returnDateInput.value = bookingData.returnDate;
    if (returnTimeInput) returnTimeInput.value = bookingData.returnTime;
  } else if (returnGroup) {
    returnGroup.style.display = "none";
  }

  // Live Trip Update Handler: Updates summary live on screen whenever user types/changes fields
  let updateDebounceTimer = null;
  async function handleLiveTripUpdate(recalcDistanceAndFare = true) {
    const pickupCity = pickupCityInput ? pickupCityInput.value.trim() : (bookingData.pickupCity || "Delhi");
    const dropCity = dropCityInput ? dropCityInput.value.trim() : (bookingData.dropCity || "Chandigarh");
    const startDate = startDateInput ? startDateInput.value : bookingData.pickupDate;
    const startTime = startTimeInput ? startTimeInput.value : bookingData.pickupTime;
    const returnDate = returnDateInput ? returnDateInput.value : bookingData.returnDate;
    const returnTime = returnTimeInput ? returnTimeInput.value : bookingData.returnTime;

    bookingData.pickupCity = pickupCity;
    bookingData.fromCity = pickupCity;
    bookingData.dropCity = dropCity;
    bookingData.toCity = dropCity;
    bookingData.pickupDate = startDate;
    bookingData.pickupTime = startTime;
    bookingData.returnDate = returnDate;
    bookingData.returnTime = returnTime;

    if (recalcDistanceAndFare && pickupCity && (dropCity || bookingData.serviceType === "local")) {
      try {
        if (typeof DistanceService !== "undefined") {
          const distData = await DistanceService.calculateRoadDistance(pickupCity, dropCity, bookingData.serviceType);
          bookingData.distanceKm = distData.distanceKm;

          if (typeof PricingEngine !== "undefined") {
            const quote = PricingEngine.calculateFare({
              serviceType: bookingData.serviceType,
              origin: pickupCity,
              destination: dropCity,
              distanceKm: distData.distanceKm,
              vehicleType: bookingData.carType,
              days: 1
            });

            bookingData.finalFare = quote.finalFare;
            bookingData.baseFare = quote.baseFareSedan || quote.baseFare;
            bookingData.vehicleAdjustment = quote.vehicleAdjustment || 0;
            bookingData.regionalAdjustment = quote.regionalAdjustment || 0;
            bookingData.specialRouteAdjustment = quote.specialRouteAdjustment || 0;
            bookingData.appliedRules = quote.appliedRules || [];
          }
        }
      } catch (err) {
        // Keep current fare on error
      }
    }

    // Immediately update sidebar summary in live time
    renderTripSidebar(bookingData);

    // Save synchronized state to localStorage
    try {
      localStorage.setItem(MargDriveConfig.storageKeys.activeBooking, JSON.stringify(bookingData));
    } catch (e) {}
  }

  // Bind Pan-India Autocomplete to Pickup & Destination City fields
  if (typeof CitySearch !== "undefined" && typeof CitySearch.attachAutocomplete === "function") {
    if (pickupCityInput) {
      CitySearch.attachAutocomplete(pickupCityInput, () => {
        handleLiveTripUpdate(true);
      });
    }
    if (dropCityInput) {
      CitySearch.attachAutocomplete(dropCityInput, () => {
        handleLiveTripUpdate(true);
      });
    }
  }

  // Attach live change listeners for real-time sidebar summary updates
  const liveInputs = [
    { el: pickupCityInput, recalc: true },
    { el: dropCityInput, recalc: true },
    { el: startDateInput, recalc: false },
    { el: startTimeInput, recalc: false },
    { el: returnDateInput, recalc: false },
    { el: returnTimeInput, recalc: false }
  ];

  liveInputs.forEach(({ el, recalc }) => {
    if (!el) return;
    el.addEventListener("input", () => {
      clearTimeout(updateDebounceTimer);
      updateDebounceTimer = setTimeout(() => handleLiveTripUpdate(recalc), 250);
    });
    el.addEventListener("change", () => {
      handleLiveTripUpdate(recalc);
    });
  });

  // Populate Sidebar Summary initially
  renderTripSidebar(bookingData);

  // Attach error-clearing handlers
  FormValidator.attachAutoClear(form);

  // Form Submission Handler
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let hasError = false;
      const fullName = nameInput ? nameInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
      const pickupCity = pickupCityInput ? pickupCityInput.value.trim() : (bookingData.pickupCity || "");
      const dropCity = dropCityInput ? dropCityInput.value.trim() : (bookingData.dropCity || "");
      const pickupAddress = pickupAddressInput ? pickupAddressInput.value.trim() : "";
      const dropAddress = dropAddressInput ? dropAddressInput.value.trim() : "";
      const startDate = startDateInput ? startDateInput.value : "";
      const startTime = startTimeInput ? startTimeInput.value : "";
      const returnDate = returnDateInput ? returnDateInput.value : "";
      const returnTime = returnTimeInput ? returnTimeInput.value : "";
      const remarks = remarksInput ? remarksInput.value.trim() : "";

      // 1. Full Name Validation
      if (!fullName || fullName.length < 3) {
        FormValidator.showFieldError(nameInput, "Please enter full passenger name (min 3 chars).");
        hasError = true;
      }

      // 2. Phone Validation
      if (!phone || !FormValidator.isValidIndianPhone(phone)) {
        FormValidator.showFieldError(phoneInput, "Enter a valid 10-digit Indian mobile number.");
        hasError = true;
      }

      // 3. Route City Validation
      if (!pickupCity) {
        if (pickupCityInput) FormValidator.showFieldError(pickupCityInput, "Please enter pickup city.");
        hasError = true;
      }
      if (bookingData.serviceType !== "local" && !dropCity) {
        if (dropCityInput) FormValidator.showFieldError(dropCityInput, "Please enter destination drop city.");
        hasError = true;
      }

      // 4. Pickup Address Validation
      if (!pickupAddress || pickupAddress.length < 5) {
        FormValidator.showFieldError(pickupAddressInput, "Please provide complete pickup address / landmark (min 5 chars).");
        hasError = true;
      }

      // 5. Pickup Date Validation
      if (!startDate || !FormValidator.isFutureOrTodayDate(startDate)) {
        FormValidator.showFieldError(startDateInput, "Pickup date cannot be in the past.");
        hasError = true;
      }

      // 6. Round Trip Return Date Validation
      if (bookingData.serviceType === "roundtrip") {
        if (!returnDate) {
          FormValidator.showFieldError(returnDateInput, "Please specify return date for round trip.");
          hasError = true;
        } else if (!FormValidator.isValidReturnDate(startDate, returnDate)) {
          FormValidator.showFieldError(returnDateInput, "Return date must be on or after pickup date.");
          hasError = true;
        }
      }

      if (hasError) {
        UI.showToast("Incomplete Details", "Please correct the highlighted fields before proceeding.", "error");
        return;
      }

      UI.showLoading("Creating booking request & generating payment link...");

      const finalBookingPayload = {
        customerName: fullName,
        customerPhone: FormValidator.sanitizePhoneNumber(phone),
        serviceType: bookingData.serviceType,
        fromCity: pickupCity || bookingData.pickupCity || bookingData.fromCity,
        toCity: dropCity || bookingData.dropCity || bookingData.toCity,
        pickupAddress: pickupAddress,
        dropoffAddress: dropAddress || `${dropCity || bookingData.dropCity || bookingData.toCity} City Center`,
        pickupDate: startDate,
        pickupTime: startTime || "08:00",
        returnDate: returnDate || null,
        returnTime: returnTime || null,
        vehicleType: bookingData.carType,
        vehicleName: bookingData.carName,
        distanceKm: bookingData.distanceKm,
        baseFare: bookingData.baseFare,
        finalFare: bookingData.finalFare,
        regionalAdjustment: bookingData.regionalAdjustment || 0,
        specialRouteAdjustment: bookingData.specialRouteAdjustment || 0,
        appliedRules: bookingData.appliedRules || [],
        pricingVersion: PricingEngine.PRICING_VERSION,
        customerRemarks: remarks || null
      };

      try {
        const result = await ApiService.submitBooking(finalBookingPayload);
        UI.hideLoading();

        if (result && result.success) {
          const bookingId = result.bookingId;
          const paymentRequestId = result.paymentRequestId;
          const paymentMeta = result.paymentMetadata || {};

          sessionStorage.setItem("rod_active_booking_id", bookingId);
          sessionStorage.setItem("rod_active_request_id", paymentRequestId);

          // Transition UI to Step 2: Payment Screen
          document.getElementById("booking-step-details").style.display = "none";
          const paymentStep = document.getElementById("booking-step-payment");
          paymentStep.style.display = "block";
          window.scrollTo({ top: 0, behavior: "smooth" });

          // Populate Payment details
          document.getElementById("payment-req-id-display").textContent = paymentRequestId;
          const upiId = paymentMeta.upiId || PAYMENT_CONFIG.upiId;
          document.getElementById("upi-id-text").textContent = upiId;

          const deepLinkEl = document.getElementById("btn-upi-deeplink");
          const deepLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(PAYMENT_CONFIG.merchantName)}&am=${PAYMENT_CONFIG.amount}&cu=INR`;
          if (deepLinkEl) {
            deepLinkEl.href = deepLink;
          }

          const qrImg = document.getElementById("upi-qr-image");
          if (qrImg) {
            qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(deepLink)}`;
          }

          // Initialize Payment Proof Submit Handler
          initPaymentProofHandler(bookingId, paymentRequestId);
        } else {
          UI.showToast(
            "Booking Notice",
            (result && result.message) || "We couldn't initialize your booking request. Please try again or contact support at 9041710472.",
            "error"
          );
        }
      } catch (err) {
        UI.hideLoading();
        console.error("Booking error:", err);
        UI.showToast(
          "Booking Notice",
          "We couldn't initialize your booking request. Please try again or contact support at 9041710472.",
          "error"
        );
      }
    });
  }

  // Copy UPI ID Button Handler
  const copyUpiBtn = document.getElementById("btn-copy-upi");
  if (copyUpiBtn) {
    copyUpiBtn.addEventListener("click", () => {
      const upiText = document.getElementById("upi-id-text")?.textContent || PAYMENT_CONFIG.upiId;
      navigator.clipboard.writeText(upiText).then(() => {
        UI.showToast("Copied!", `UPI ID ${upiText} copied to clipboard.`, "success");
      }).catch(() => {
        UI.showToast("UPI ID", upiText, "info");
      });
    });
  }
}

/**
 * Initializes the Payment Confirmation submission handler and live status tracker
 */
function initPaymentProofHandler(bookingId, paymentRequestId) {
  const proofForm = document.getElementById("payment-proof-form");
  const screenshotInput = document.getElementById("payment-screenshot");

  if (!proofForm) return;

  proofForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append("utrNumber", "UPI-VERIFICATION-PENDING");
    formData.append("paymentAmount", PAYMENT_CONFIG.amount);
    formData.append("paymentTimestamp", new Date().toISOString());

    if (screenshotInput && screenshotInput.files && screenshotInput.files[0]) {
      formData.append("screenshot", screenshotInput.files[0]);
    }

    UI.showLoading("Submitting payment confirmation for verification...");

    try {
      const proofResult = await ApiService.submitPaymentProof(bookingId, formData);
      UI.hideLoading();

      if (proofResult && proofResult.success) {
        // Transition UI to Step 3: Tracker Screen
        document.getElementById("booking-step-payment").style.display = "none";
        const trackerStep = document.getElementById("booking-step-tracker");
        trackerStep.style.display = "block";
        window.scrollTo({ top: 0, behavior: "smooth" });

        document.getElementById("tracker-req-id").textContent = paymentRequestId;

        UI.showToast("Confirmation Received", "Your ₹500 payment confirmation is under review. Polling verification status...", "success");

        // Start polling for verification every 4 seconds
        startStatusPolling(bookingId, paymentRequestId);
      } else {
        UI.showToast("Notice", (proofResult && proofResult.message) || "Unable to submit confirmation. Please try again.", "error");
      }
    } catch (err) {
      UI.hideLoading();
      console.error("Confirmation error:", err);
      UI.showToast("Notice", "Unable to submit confirmation. Please try again or contact helpline 9041710472.", "error");
    }
  });

  // Check status button
  const checkStatusBtn = document.getElementById("btn-check-status");
  if (checkStatusBtn) {
    checkStatusBtn.addEventListener("click", async () => {
      UI.showLoading("Checking live payment verification...");
      try {
        const statusRes = await ApiService.getBookingStatus(bookingId);
        UI.hideLoading();
        if (statusRes && statusRes.booking && statusRes.booking.payment_status === "VERIFIED") {
          const finalCode = statusRes.booking.booking_code || bookingId;
          UI.showToast("Payment Verified!", `Booking confirmed with ID: ${finalCode}`, "success");
          setTimeout(() => {
            window.location.href = `success.html?id=${finalCode}`;
          }, 1000);
        } else if (statusRes && statusRes.booking && statusRes.booking.payment_status === "REJECTED") {
          UI.showToast("Payment Notice", `Verification was not approved: ${statusRes.booking.payment_rejection_reason || "Invalid reference"}. Please contact support.`, "error");
        } else {
          UI.showToast("Under Review", "Your ₹500 payment is currently being reviewed by our operations desk.", "info");
        }
      } catch (e) {
        UI.hideLoading();
        UI.showToast("Status Checked", "Verification is still in progress. Please hold on.", "info");
      }
    });
  }
}

/**
 * Polls backend periodically to check if admin verified payment
 */
let pollingInterval = null;
function startStatusPolling(bookingId, paymentRequestId) {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    try {
      const statusRes = await ApiService.getBookingStatus(bookingId);
      if (statusRes && statusRes.booking) {
        if (statusRes.booking.payment_status === "VERIFIED") {
          clearInterval(pollingInterval);
          const finalCode = statusRes.booking.booking_code || bookingId;
          UI.showToast("Booking Confirmed!", `Your Booking ID ${finalCode} is ready!`, "success");
          setTimeout(() => {
            window.location.href = `success.html?id=${finalCode}`;
          }, 1200);
        } else if (statusRes.booking.payment_status === "REJECTED") {
          clearInterval(pollingInterval);
          UI.showToast("Payment Rejected", statusRes.booking.payment_rejection_reason || "Payment proof could not be verified.", "error");
        }
      }
    } catch (e) {
      // Background retry
    }
  }, 4000);
}

/**
 * Renders the sidebar trip recap and fare itemization.
 */
function renderTripSidebar(bookingData) {
  const container = document.getElementById("trip-summary-sidebar-container");
  if (!container) return;

  const config = window.MargDriveConfig || window.MargDriveConfig || { vehicles: [] };
  const vehList = config.vehicles || [];
  const vehMeta = vehList.find((v) => v.id === bookingData.carType) || vehList[1] || { name: "Sedan", category: "Comfortable Intercity" };

  const regAdj = bookingData.regionalAdjustment || 0;
  const routeAdj = bookingData.specialRouteAdjustment || 0;

  container.innerHTML = `
    <div class="trip-summary-sidebar">
      <h3 style="font-size:1.2rem; margin-bottom:1rem; color:var(--secondary);">Trip Summary</h3>
      
      <div class="summary-route-box">
        <div class="summary-cities">
          ${bookingData.serviceType === "local" ? `📍 ${UI.escapeHTML(bookingData.pickupCity || bookingData.fromCity)} (Local Package)` : `${UI.escapeHTML(bookingData.pickupCity || bookingData.fromCity)} ➔ ${UI.escapeHTML(bookingData.dropCity || bookingData.toCity)}`}
        </div>
        <div class="summary-meta">
          <span>📅 ${UI.formatDateDisplay(bookingData.pickupDate)} at ${UI.formatTimeDisplay(bookingData.pickupTime)}</span>
          <span>🚗 ${vehMeta.name} (${vehMeta.category})</span>
          <span>🛣️ ${bookingData.distanceKm} KM Road Distance</span>
        </div>
      </div>

      <div class="fare-breakdown-list">
        <div class="fare-breakdown-row">
          <span>Base Sedan Rate</span>
          <span>₹${Number(bookingData.baseFare || 3000).toLocaleString("en-IN")}</span>
        </div>
        ${bookingData.vehicleAdjustment ? `
          <div class="fare-breakdown-row">
            <span>Vehicle Adjustment (${bookingData.carType.toUpperCase()})</span>
            <span>${bookingData.vehicleAdjustment >= 0 ? `+ ₹${Number(bookingData.vehicleAdjustment).toLocaleString("en-IN")}` : `- ₹${Math.abs(bookingData.vehicleAdjustment)}`}</span>
          </div>
        ` : ""}
        ${regAdj > 0 ? `
          <div class="fare-breakdown-row">
            <span>Regional Adjustment (South India)</span>
            <span>+ ₹${Number(regAdj).toLocaleString("en-IN")}</span>
          </div>
        ` : ""}
        ${routeAdj > 0 ? `
          <div class="fare-breakdown-row">
            <span>Special Terrain Adjustment</span>
            <span>+ ₹${Number(routeAdj).toLocaleString("en-IN")}</span>
          </div>
        ` : ""}
        <div class="fare-breakdown-row" style="font-weight:700; border-top:1px solid #E2E8F0; padding-top:0.4rem;">
          <span>Estimated Total Fare</span>
          <span>₹${Number(bookingData.finalFare).toLocaleString("en-IN")}</span>
        </div>
        <div class="fare-breakdown-row" style="color:var(--primary); font-weight:700;">
          <span>Confirmation Fee Payable Now</span>
          <span>₹500</span>
        </div>
        <div class="fare-breakdown-row">
          <span>Balance Payable to Partner Driver</span>
          <span>₹${Math.max(0, Number(bookingData.finalFare) - 500).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div class="transparent-note">
        <strong>Payment Policy:</strong><br>
        The ₹500 advance confirmation amount is adjusted against the total trip fare. The remaining balance is payable directly to the partner driver during the journey. Tolls and state permits are extra per actual receipts.
      </div>

      <div style="font-size:0.85rem; color:var(--gray-500); display:flex; align-items:center; gap:0.4rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Helpline: <strong>9041710472</strong> (24/7 Support)</span>
      </div>
    </div>
  `;
}