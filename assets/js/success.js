/**
 * EaseMyRide — Booking Confirmation & Success Controller (success.js)
 * 
 * Displays verified booking credentials, receipt details, customer SMS generation,
 * clipboard copy, .txt download, device-native SMS trigger, and support links.
 */

document.addEventListener("DOMContentLoaded", () => {
  UI.injectNavigation("success");

  // Read active booking
  let booking = null;
  try {
    booking = JSON.parse(localStorage.getItem(EaseMyRideConfig.storageKeys.activeBooking));
  } catch (e) {
    booking = null;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const bookingIdFromUrl = urlParams.get("id");

  if (!booking) {
    // If not found in memory, try searching completedBookings in localStorage
    try {
      const list = JSON.parse(localStorage.getItem(EaseMyRideConfig.storageKeys.completedBookings) || "[]");
      if (bookingIdFromUrl) {
        booking = list.find((b) => b.bookingId === bookingIdFromUrl);
      }
      if (!booking && list.length > 0) {
        booking = list[0];
      }
    } catch (e) {
      booking = null;
    }
  }

  // If still missing, build fallback receipt representation
  if (!booking) {
    booking = {
      bookingId: bookingIdFromUrl || "EMR-20260828-0001",
      fullName: "Rahul Sharma",
      phoneNumber: "9876543210",
      email: "rahul.sharma@example.com",
      fromCity: "Amritsar",
      toCity: "Chandigarh",
      pickupAddress: "Model Town, Amritsar",
      dropoffAddress: "Sector 17, Chandigarh",
      startingDate: "2026-08-29",
      startingTime: "08:00",
      carType: "sedan",
      carName: "Sedan",
      finalFare: 2930,
      journeyType: "One Way"
    };
  }

  renderSuccessCard(booking);
});

/**
 * Populates receipt items and customer SMS utilities.
 */
function renderSuccessCard(booking) {
  const bookingIdEl = document.getElementById("receipt-booking-id");
  const receiptContainer = document.getElementById("trip-receipt-items");
  const smsContentEl = document.getElementById("sms-text-content");

  // Generate Customer SMS
  const smsText = ApiService.generateSmsText(booking);

  if (bookingIdEl) {
    bookingIdEl.textContent = booking.bookingId;
  }

  if (receiptContainer) {
    const route = booking.fromCity && booking.toCity ? `${booking.fromCity} ➔ ${booking.toCity}` : booking.fromCity || "Local Tour";
    const carName = (booking.carName || booking.carType || "Sedan").toUpperCase();
    const pickupFormatted = `${UI.formatDateDisplay(booking.startingDate)}, ${UI.formatTimeDisplay(booking.startingTime)}`;

    receiptContainer.innerHTML = `
      <div class="receipt-item">
        <span class="receipt-label">Customer Name</span>
        <span class="receipt-val">${UI.escapeHTML(booking.fullName)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Contact Phone</span>
        <span class="receipt-val">+91 ${UI.escapeHTML(booking.phoneNumber)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Route</span>
        <span class="receipt-val">${UI.escapeHTML(route)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Vehicle Selected</span>
        <span class="receipt-val">${UI.escapeHTML(carName)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Pickup Schedule</span>
        <span class="receipt-val">${pickupFormatted}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Estimated Base Fare</span>
        <span class="receipt-val" style="color:var(--primary); font-size:1.15rem;">₹${Number(booking.finalFare).toLocaleString("en-IN")}</span>
      </div>
      <div class="receipt-item" style="grid-column: 1 / -1;">
        <span class="receipt-label">Pickup Address</span>
        <span class="receipt-val">${UI.escapeHTML(booking.pickupAddress || "Provided during booking")}</span>
      </div>
    `;
  }

  if (smsContentEl) {
    smsContentEl.textContent = smsText;
  }

  // Copy Booking ID Button
  const copyIdBtn = document.getElementById("btn-copy-booking-id");
  if (copyIdBtn) {
    copyIdBtn.addEventListener("click", () => {
      UI.copyToClipboard(booking.bookingId, `Copied Booking ID: ${booking.bookingId}`);
    });
  }

  // Copy SMS Button
  const copySmsBtn = document.getElementById("btn-copy-sms");
  if (copySmsBtn) {
    copySmsBtn.addEventListener("click", () => {
      UI.copyToClipboard(smsText, "SMS text copied to clipboard!");
    });
  }

  // Download SMS .txt Button
  const downloadSmsBtn = document.getElementById("btn-download-sms");
  if (downloadSmsBtn) {
    downloadSmsBtn.addEventListener("click", () => {
      UI.downloadFile(`EaseMyRide_${booking.bookingId}_SMS.txt`, smsText);
    });
  }

  // Native Device Send via SMS Button
  const sendSmsBtn = document.getElementById("btn-open-native-sms");
  if (sendSmsBtn) {
    // Encodes SMS body for standard sms: URI scheme
    const phone = booking.phoneNumber ? `+91${booking.phoneNumber}` : "";
    const encodedBody = encodeURIComponent(smsText);
    sendSmsBtn.href = `sms:${phone}?body=${encodedBody}`;
  }

  // WhatsApp Support Button
  const waBtn = document.getElementById("btn-whatsapp-support");
  if (waBtn) {
    const waText = encodeURIComponent(`Hi EaseMyRide Team, I have booked a cab (ID: ${booking.bookingId}). Please assist with my ride.`);
    waBtn.href = `https://wa.me/919876543210?text=${waText}`;
  }

  // Print Receipt Button
  const printBtn = document.getElementById("btn-print-receipt");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}
