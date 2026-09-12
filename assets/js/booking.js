/**
 * RideOnDemand — Booking Checkout Controller (booking.js)
 * 
 * Manages passenger details collection, journey address specifications,
 * trip summary verification, robust validation, and Apps Script submission.
 */

document.addEventListener("DOMContentLoaded", () => {
  UI.injectNavigation("booking");

  // Read active booking state from localStorage or query params
  let bookingData = null;
  try {
    bookingData = JSON.parse(localStorage.getItem(RideOnDemandConfig.storageKeys.activeBooking));
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
      carName: (RideOnDemandConfig.vehicles.find((v) => v.id === car) || { name: "Sedan" }).name,
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

      UI.showLoading("Creating your booking request securely...");

      try {
        const result = await ApiService.submitBooking(finalBookingPayload);

        UI.hideLoading();

        if (result && result.success) {
          const bookingId = result.bookingId;
          const paymentRequestId = result.paymentRequestId;
          const paymentMeta = result.paymentMetadata || {};

          // Store current booking context
          sessionStorage.setItem("rod_active_booking_id", bookingId);
          sessionStorage.setItem("rod_active_request_id", paymentRequestId);

          // Transition UI to Step 2: Payment Screen
          document.getElementById("booking-step-details").style.display = "none";
          const paymentStep = document.getElementById("booking-step-payment");
          paymentStep.style.display = "block";
          window.scrollTo({ top: 0, behavior: "smooth" });

          // Populate Payment details
          document.getElementById("payment-req-id-display").textContent = paymentRequestId;
          const upiId = paymentMeta.upiId || "muskankushwaha787-2@oksbi";
          document.getElementById("upi-id-text").textContent = upiId;
          document.getElementById("upi-id-bold").textContent = upiId;
          
          const deepLinkEl = document.getElementById("btn-upi-deeplink");
          if (deepLinkEl && paymentMeta.upiDeepLink) {
            deepLinkEl.href = paymentMeta.upiDeepLink;
          }

          // Initialize Payment Proof Submit Handler
          initPaymentProofHandler(bookingId, paymentRequestId);
        } else {
          UI.showToast(
            "Booking Notice",
            (result && result.message) || "We couldn't initialize your booking request. Please try again or contact support at 7973785807.",
            "error"
          );
        }
      } catch (err) {
        UI.hideLoading();
        console.error("Booking error:", err);
        UI.showToast(
          "Booking Notice",
          "We couldn't initialize your booking request. Please try again or contact support at 7973785807.",
          "error"
        );
      }
    });
  }

  // Copy UPI ID Button Handler
  const copyUpiBtn = document.getElementById("btn-copy-upi");
  if (copyUpiBtn) {
    copyUpiBtn.addEventListener("click", () => {
      const upiText = document.getElementById("upi-id-text")?.textContent || "muskankushwaha787-2@oksbi";
      navigator.clipboard.writeText(upiText).then(() => {
        UI.showToast("Copied!", `UPI ID ${upiText} copied to clipboard.`, "success");
      }).catch(() => {
        UI.showToast("UPI ID", upiText, "info");
      });
    });
  }
}

/**
 * Initializes the UTR / Payment Proof submission handler and live status tracker
 */
function initPaymentProofHandler(bookingId, paymentRequestId) {
  const proofForm = document.getElementById("payment-proof-form");
  const utrInput = document.getElementById("payment-utr");
  const screenshotInput = document.getElementById("payment-screenshot");
  const utrError = document.getElementById("utr-error");

  if (!proofForm) return;

  proofForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const utr = utrInput ? utrInput.value.trim() : "";
    if (!utr || utr.length < 6) {
      if (utrError) utrError.textContent = "Please enter a valid 12-digit UTR / transaction reference number (min 6 characters).";
      if (utrInput) utrInput.classList.add("is-invalid");
      return;
    }

    if (utrInput) utrInput.classList.remove("is-invalid");
    if (utrError) utrError.textContent = "";

    const formData = new FormData();
    formData.append("utrNumber", utr);
    formData.append("paymentAmount", 500);
    formData.append("paymentTimestamp", new Date().toISOString());

    if (screenshotInput && screenshotInput.files && screenshotInput.files[0]) {
      formData.append("screenshot", screenshotInput.files[0]);
    }

    UI.showLoading("Submitting payment proof for verification...");

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
        document.getElementById("tracker-utr").textContent = utr;

        UI.showToast("Proof Received", "Your ₹500 payment confirmation is under review. Polling verification status...", "success");

        // Start polling for verification every 4 seconds
        startStatusPolling(bookingId, paymentRequestId);
      } else {
        UI.showToast("Notice", (proofResult && proofResult.message) || "Unable to submit proof. Please try again.", "error");
      }
    } catch (err) {
      UI.hideLoading();
      console.error("Proof submission error:", err);
      UI.showToast("Notice", "Unable to submit proof. Please try again or contact helpline 7973785807.", "error");
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
      // Quiet background retry
    }
  }, 4000);
}

/**
 * Renders the sidebar trip recap and fare itemization.
 */
function renderTripSidebar(bookingData) {
  const container = document.getElementById("trip-summary-sidebar-container");
  if (!container) return;

  const config = window.RideOnDemandConfig || window.RideOnDemandConfig || { vehicles: [] };
  const vehList = config.vehicles || [];
  const vehMeta = vehList.find((v) => v.id === bookingData.carType) || vehList[1] || { name: "Sedan", category: "Comfortable Intercity" };

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
          <span>Estimated Total Fare</span>
          <span>₹${Number(bookingData.finalFare).toLocaleString("en-IN")}</span>
        </div>
        <div class="fare-breakdown-row" style="color:var(--primary); font-weight:700;">
          <span>Confirmation Fee Payable Now</span>
          <span>₹500</span>
        </div>
        <div class="fare-breakdown-row">
          <span>Balance Payable to Chauffeur</span>
          <span>₹${Math.max(0, Number(bookingData.finalFare) - 500).toLocaleString("en-IN")}</span>
        </div>
      </div>

      <div class="transparent-note">
        <strong>Payment Policy:</strong><br>
        A ₹500 booking fee confirms your cab assignment and locks the price. Balance fare is paid directly upon travel. Tolls & state permits extra per actuals.
      </div>

      <div style="font-size:0.85rem; color:var(--gray-500); display:flex; align-items:center; gap:0.4rem;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Helpline: <strong>7973785807</strong> (24/7 Support)</span>
      </div>
    </div>
  `;
}
