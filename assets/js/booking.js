/**
 * EaseMyRide — Booking Checkout Controller (booking.js)
 * 
 * Manages passenger details collection, journey address specifications,
 * trip summary verification, robust validation, and Apps Script submission.
 */

document.addEventListener("DOMContentLoaded", () => {
  UI.injectNavigation("booking");

  // Read active booking state from localStorage or query params
  let bookingData = null;
  try {
    bookingData = JSON.parse(localStorage.getItem(EaseMyRideConfig.storageKeys.activeBooking));
  } catch (e) {
    bookingData = null;
  }

  // If missing, parse from query params
  const urlParams = new URLSearchParams(window.location.search);
  if (!bookingData && urlParams.has("from")) {
    const dist = parseInt(urlParams.get("dist"), 10) || 250;
    const car = urlParams.get("car") || "sedan";
    const quote = PricingEngine.calculateOneWayFare(dist, car);

    bookingData = {
      serviceType: urlParams.get("service") || "oneway",
      fromCity: urlParams.get("from") || "Delhi",
      toCity: urlParams.get("to") || "Chandigarh",
      pickupDate: urlParams.get("date") || FormValidator.formatDateForInput(new Date()),
      pickupTime: urlParams.get("time") || "08:00",
      returnDate: urlParams.get("returnDate") || "",
      returnTime: urlParams.get("returnTime") || "",
      phoneNumber: urlParams.get("phone") || "",
      distanceKm: dist,
      carType: car,
      carName: (EaseMyRideConfig.vehicles.find((v) => v.id === car) || { name: "Sedan" }).name,
      finalFare: parseInt(urlParams.get("fare"), 10) || quote.finalFare,
      baseFare: quote.baseFareSedan,
      vehicleAdjustment: quote.vehicleAdjustment
    };
  }

  if (!bookingData) {
    // If no booking intent, redirect back to homepage
    window.location.href = "index.html";
    return;
  }

  // Pre-fill form fields and summary
  initBookingForm(bookingData);
});

/**
 * Initializes and populates booking form fields and trip sidebar.
 */
function initBookingForm(bookingData) {
  const form = document.getElementById("booking-checkout-form");
  const nameInput = document.getElementById("passenger-name");
  const emailInput = document.getElementById("passenger-email");
  const phoneInput = document.getElementById("passenger-phone");
  const pickupAddressInput = document.getElementById("pickup-address");
  const dropAddressInput = document.getElementById("drop-address");
  const startDateInput = document.getElementById("booking-start-date");
  const startTimeInput = document.getElementById("booking-start-time");
  const returnGroup = document.getElementById("booking-return-group");
  const returnDateInput = document.getElementById("booking-return-date");
  const returnTimeInput = document.getElementById("booking-return-time");
  const remarksInput = document.getElementById("trip-remarks");

  // Pre-populate known fields
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

  // Populate Sidebar Summary
  renderTripSidebar(bookingData);

  // Attach error-clearing handlers
  FormValidator.attachAutoClear(form);

  // Form Submission Handler
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      let hasError = false;
      const fullName = nameInput ? nameInput.value.trim() : "";
      const email = emailInput ? emailInput.value.trim() : "";
      const phone = phoneInput ? phoneInput.value.trim() : "";
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

      // 2. Email Validation
      if (!email) {
        FormValidator.showFieldError(emailInput, "Please enter your email address.");
        hasError = true;
      } else if (!FormValidator.isValidEmail(email)) {
        FormValidator.showFieldError(emailInput, "Enter a valid email address.");
        hasError = true;
      }

      // 3. Phone Validation
      if (!phone) {
        FormValidator.showFieldError(phoneInput, "Please enter your 10-digit mobile number.");
        hasError = true;
      } else if (!FormValidator.isValidIndianPhone(phone)) {
        FormValidator.showFieldError(phoneInput, "Enter a valid 10-digit Indian mobile number.");
        hasError = true;
      }

      // 4. Pickup Address Validation
      if (!pickupAddress || pickupAddress.length < 5) {
        FormValidator.showFieldError(pickupAddressInput, "Please enter complete pickup address / landmark.");
        hasError = true;
      }

      // 5. Dropoff Address Validation (if intercity/airport)
      if (bookingData.serviceType !== "local" && (!dropAddress || dropAddress.length < 3)) {
        FormValidator.showFieldError(dropAddressInput, "Please enter destination drop address / landmark.");
        hasError = true;
      }

      // 6. Date validation
      if (!startDate || !FormValidator.isFutureOrTodayDate(startDate)) {
        FormValidator.showFieldError(startDateInput, "Please select a valid future pickup date.");
        hasError = true;
      }

      if (bookingData.serviceType === "roundtrip") {
        if (!returnDate || !FormValidator.isValidReturnDate(startDate, returnDate)) {
          FormValidator.showFieldError(returnDateInput, "Return date must be on or after pickup date.");
          hasError = true;
        }
      }

      if (hasError) {
        UI.showToast("Incomplete Form", "Please correct the highlighted fields before proceeding.", "error");
        return;
      }

      // Build Complete Submission Payload
      const finalBookingPayload = {
        fullName: fullName,
        email: email,
        countryCode: "+91",
        phoneNumber: FormValidator.sanitizePhoneNumber(phone),
        fromCity: bookingData.fromCity,
        toCity: bookingData.toCity,
        pickupAddress: pickupAddress,
        dropoffAddress: dropAddress || `${bookingData.fromCity} City Tour`,
        startingDate: startDate,
        startingTime: startTime,
        returningDate: returnDate,
        returningTime: returnTime,
        journeyType: {
          oneway: "One Way",
          roundtrip: "Round Trip",
          local: "Local Sightseeing",
          airport: "Airport Transfer"
        }[bookingData.serviceType] || "One Way",
        carType: bookingData.carType,
        carName: bookingData.carName,
        distanceKm: bookingData.distanceKm,
        baseFare: bookingData.baseFare,
        vehicleAdjustment: bookingData.vehicleAdjustment,
        finalFare: bookingData.finalFare,
        remarks: remarks
      };

      UI.showLoading("Submitting your booking request securely...");

      try {
        const result = await ApiService.submitBooking(finalBookingPayload);

        if (result && result.success) {
          UI.hideLoading();
          // Store completed booking object for success screen
          localStorage.setItem(EaseMyRideConfig.storageKeys.activeBooking, JSON.stringify(result.booking));
          window.location.href = `success.html?id=${result.bookingId}`;
        } else {
          UI.hideLoading();
          UI.showToast(
            "Booking Notice",
            "We couldn't confirm your booking right now. Please try again or contact support.",
            "error"
          );
        }
      } catch (err) {
        UI.hideLoading();
        console.error("Booking error:", err);
        UI.showToast(
          "Booking Notice",
          "We couldn't confirm your booking right now. Please try again or contact support at +91 98765 43210.",
          "error"
        );
      }
    });
  }
}

/**
 * Renders the sidebar trip recap and fare itemization.
 */
function renderTripSidebar(bookingData) {
  const container = document.getElementById("trip-summary-sidebar-container");
  if (!container) return;

  const vehMeta = EaseMyRideConfig.vehicles.find((v) => v.id === bookingData.carType) || EaseMyRideConfig.vehicles[1];

  container.innerHTML = `
    <div class="trip-summary-sidebar">
      <h3 style="font-size:1.2rem; margin-bottom:1rem; color:var(--secondary);">Trip Summary</h3>
      
      <div class="summary-route-box">
        <div class="summary-cities">
          ${bookingData.serviceType === "local" ? `📍 ${UI.escapeHTML(bookingData.fromCity)} (Local Package)` : `${UI.escapeHTML(bookingData.fromCity)} ➔ ${UI.escapeHTML(bookingData.toCity)}`}
        </div>
        <div class="summary-meta">
          <span>📅 ${UI.formatDateDisplay(bookingData.pickupDate)} at ${UI.formatTimeDisplay(bookingData.pickupTime)}</span>
          <span>🚗 ${vehMeta.name} (${vehMeta.category})</span>
          <span>🛣️ ${bookingData.distanceKm} KM Estimated Route</span>
        </div>
      </div>

      <div class="fare-breakdown-list">
        <div class="fare-breakdown-row">
          <span>Base Sedan Rate</span>
          <span>₹${(bookingData.baseFare || bookingData.finalFare).toLocaleString("en-IN")}</span>
        </div>
        ${
          bookingData.vehicleAdjustment !== 0
            ? `
          <div class="fare-breakdown-row">
            <span>${vehMeta.name} Adjustment</span>
            <span>${bookingData.vehicleAdjustment > 0 ? `+ ₹${bookingData.vehicleAdjustment.toLocaleString("en-IN")}` : `- ₹${Math.abs(bookingData.vehicleAdjustment)}`}</span>
          </div>
        `
            : ""
        }
        <div class="fare-breakdown-row total">
          <span>Estimated Base Fare</span>
          <span>₹${Number(bookingData.finalFare).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div class="transparent-note">
        <strong>Fare Policy:</strong><br>
        Tolls, interstate permits, and parking charges are not included in base fare and are payable directly as per actual trip receipts.
      </div>

      <div style="font-size:0.85rem; color:var(--gray-500); display:flex; align-items:center; gap:0.4rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>No advance payment needed to book.</span>
      </div>
    </div>
  `;
}
