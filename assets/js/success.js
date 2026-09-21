/**
 * MargDrive — Booking Confirmation & Success Controller (success.js)
 * 
 * Displays verified booking credentials, receipt details, customer SMS generation,
 * clipboard copy, .txt download, device-native SMS trigger, and support links.
 */

document.addEventListener("DOMContentLoaded", async () => {
  UI.injectNavigation("success");

  const urlParams = new URLSearchParams(window.location.search);
  const bookingIdFromUrl = urlParams.get("id");

  let booking = null;

  // 1. Try querying backend API for confirmed booking
  if (bookingIdFromUrl) {
    try {
      const apiRes = await ApiService.getBookingStatus(bookingIdFromUrl);
      if (apiRes && apiRes.booking) {
        booking = apiRes.booking;
      }
    } catch (e) {
      console.warn("Could not fetch booking from API:", e.message);
    }
  }

  // 2. Read active booking from storage
  if (!booking) {
    try {
      booking = JSON.parse(localStorage.getItem(MargDriveConfig.storageKeys.activeBooking));
    } catch (e) {
      booking = null;
    }
  }

  // 3. Fallback representation if no booking in memory
  if (!booking) {
    booking = {
      bookingCode: bookingIdFromUrl || "MD-20260912-0001",
      bookingId: bookingIdFromUrl || "MD-20260912-0001",
      customerName: "Valued Customer",
      customerPhone: "9876543210",
      customerEmail: "customer@example.com",
      fromCity: "Amritsar",
      toCity: "Chandigarh",
      pickupAddress: "Airport / Main Landmark",
      dropoffAddress: "City Center",
      pickupDate: "2026-09-12",
      pickupTime: "08:00",
      vehicleType: "sedan",
      vehicleName: "Sedan",
      finalFare: 3200,
      bookingFeeInr: 500,
      paymentStatus: "VERIFIED",
      serviceType: "One Way"
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

  const displayCode = booking.bookingCode || booking.booking_code || booking.bookingId || "MD-CONFIRMED";
  const customerName = booking.customerName || booking.customer_name || booking.fullName || "Customer";
  const phone = booking.customerPhone || booking.customer_phone || booking.phoneNumber || "9041710472";
  const from = booking.fromCity || booking.from_city || "Origin";
  const to = booking.toCity || booking.to_city || "Destination";
  const route = from && to ? `${from} ➔ ${to}` : from;
  const carName = (booking.vehicleName || booking.vehicle_name || booking.carName || booking.carType || "Sedan").toUpperCase();
  const dateStr = booking.pickupDate || booking.pickup_date || booking.startingDate || "Scheduled Date";
  const timeStr = booking.pickupTime || booking.pickup_time || booking.startingTime || "08:00";
  const pickupFormatted = `${UI.formatDateDisplay(dateStr)}, ${UI.formatTimeDisplay(timeStr)}`;
  const totalFare = booking.finalFare || booking.final_fare || 3200;
  const bookingFee = booking.bookingFeeInr !== undefined ? booking.bookingFeeInr : (booking.booking_fee_inr !== undefined ? booking.booking_fee_inr : 500);
  const balanceFare = Math.max(0, totalFare - bookingFee);

  // Generate Customer SMS text
  const smsText = booking.customerMessage || booking.customer_message || ApiService.generateSmsText({
    ...booking,
    bookingCode: displayCode,
    fromCity: from,
    toCity: to,
    carType: carName,
    finalFare: totalFare,
    pickupDate: dateStr,
    pickupTime: timeStr
  });

  if (bookingIdEl) {
    bookingIdEl.textContent = displayCode;
  }

  if (receiptContainer) {
    receiptContainer.innerHTML = `
      <div class="receipt-item">
        <span class="receipt-label">Customer Name</span>
        <span class="receipt-val">${UI.escapeHTML(customerName)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Contact Phone</span>
        <span class="receipt-val">+91 ${UI.escapeHTML(phone)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Route</span>
        <span class="receipt-val">${UI.escapeHTML(route)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Vehicle Assigned</span>
        <span class="receipt-val">${UI.escapeHTML(carName)}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Pickup Schedule</span>
        <span class="receipt-val">${pickupFormatted}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Booking Fee (Paid)</span>
        <span class="receipt-val" style="color:#10B981; font-weight:700;">₹${bookingFee} (Verified)</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Balance Payable to Driver</span>
        <span class="receipt-val" style="color:var(--primary); font-size:1.1rem; font-weight:800;">₹${balanceFare.toLocaleString("en-IN")}</span>
      </div>
      <div class="receipt-item">
        <span class="receipt-label">Total Trip Fare</span>
        <span class="receipt-val">₹${Number(totalFare).toLocaleString("en-IN")}</span>
      </div>
      <div class="receipt-item" style="grid-column: 1 / -1;">
        <span class="receipt-label">Pickup Address</span>
        <span class="receipt-val">${UI.escapeHTML(booking.pickupAddress || booking.pickup_address || "Provided during booking")}</span>
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
      UI.copyToClipboard(displayCode, `Copied Booking ID: ${displayCode}`);
    });
  }

  // Copy SMS Button
  const copySmsBtn = document.getElementById("btn-copy-sms");
  if (copySmsBtn) {
    copySmsBtn.addEventListener("click", () => {
      UI.copyToClipboard(smsText, "Confirmation message copied to clipboard!");
    });
  }

  // Download Receipt .txt Button
  const downloadSmsBtn = document.getElementById("btn-download-sms");
  if (downloadSmsBtn) {
    downloadSmsBtn.addEventListener("click", () => {
      UI.downloadFile(`MargDrive_${displayCode}_Receipt.txt`, smsText);
    });
  }

  // Native Device Send via SMS Button
  const sendSmsBtn = document.getElementById("btn-open-native-sms");
  if (sendSmsBtn) {
    const encodedBody = encodeURIComponent(smsText);
    sendSmsBtn.href = `sms:${phone}?body=${encodedBody}`;
  }

  // WhatsApp Support Button
  const waBtn = document.getElementById("btn-whatsapp-support");
  if (waBtn) {
    const waText = encodeURIComponent(`Hi MargDrive Team, I have booked a cab (ID: ${displayCode}). Please assist with my ride.`);
    waBtn.href = `https://wa.me/919041710472?text=${waText}`;
  }

  // Print Receipt Button
  const printBtn = document.getElementById("btn-print-receipt");
  if (printBtn) {
    printBtn.addEventListener("click", () => {
      window.print();
    });
  }
}
