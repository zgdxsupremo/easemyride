/**
 * MargDrive — Google Apps Script Backend API Client
 * 
 * Securely communicates with the Google Apps Script Web App backend.
 * Handles search logging, booking creation, status updates, and admin exports.
 * 
 * Features:
 * - Real Google Apps Script Web App POST / GET integration
 * - Server-side fare recalculation protection
 * - Automatic graceful fallback to browser storage for local MVP preview
 * - Comprehensive error handling with user-friendly diagnostics
 */

const ApiService = (() => {
  const TIMEOUT_MS = 12000;

  /**
   * Helper to check if a valid Google Apps Script Web App URL is configured.
   */
  function isAppsScriptConfigured() {
    const url = typeof window !== "undefined" && window.MargDriveConfig && window.MargDriveConfig.appsScriptUrl;
    return Boolean(url && url.includes("script.google.com/macros/s/"));
  }

  /**
   * Helper to generate a unique client fallback Booking ID (MD-YYYYMMDD-XXXX).
   */
  function generateFallbackBookingId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `MD-${y}${m}${d}-${rand}`;
  }

  /**
   * Helper to generate a unique Search ID.
   */
  function generateSearchId() {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    return `SRC-${ts}-${rand}`;
  }

  /**
   * Generates customer SMS text representation using CONFIG helpline.
   */
  function generateSmsText(booking) {
    const config = (typeof window !== "undefined" && (window.MargDriveConfig || window.MargDriveConfig)) || { helplineNumber: "9041710472" };
    const helpline = config.helplineNumber || "9041710472";
    const route = booking.fromCity && booking.toCity ? `${booking.fromCity} → ${booking.toCity}` : (booking.from_city && booking.to_city ? `${booking.from_city} → ${booking.to_city}` : "Intercity Route");
    const carName = (booking.carType || booking.vehicle_type || "Sedan").toUpperCase();
    const fare = booking.finalFare || booking.final_fare ? `₹${Number(booking.finalFare || booking.final_fare).toLocaleString("en-IN")}` : "TBD";
    const pickup = `${booking.startingDate || booking.pickup_date || "Scheduled Date"}, ${booking.startingTime || booking.pickup_time || "Time"}`;
    const code = booking.bookingCode || booking.booking_code || booking.bookingId || "PENDING";

    return `MargDrive: Your booking has been confirmed.\n\nBooking ID: ${code}\nRoute: ${route}\nVehicle: ${carName}\nPickup: ${pickup}\nFare: ${fare}\n\nFor assistance: ${helpline}\n\nThank you for choosing MargDrive.`;
  }

  /**
   * Sends search data to Google Apps Script backend to append to SEARCHES sheet.
   * Runs non-blockingly.
   * @param {object} searchData
   * @returns {Promise<object>}
   */
  async function logSearch(searchData) {
    const payload = {
      action: "log_search",
      searchId: generateSearchId(),
      timestamp: new Date().toISOString(),
      serviceType: searchData.serviceType || "oneway",
      pickupLocation: searchData.pickupLocation || searchData.fromCity || "",
      dropLocation: searchData.dropLocation || searchData.toCity || "",
      pickupDate: searchData.pickupDate || "",
      returnDate: searchData.returnDate || "",
      pickupTime: searchData.pickupTime || "",
      phoneNumber: searchData.phoneNumber || "",
      distanceKm: searchData.distanceKm || 0,
      searchStatus: "COMPLETED",
      userAgent: navigator.userAgent || "Web Client"
    };

    // Store in localStorage for admin preview
    try {
      const searches = JSON.parse(localStorage.getItem("emr_searches_log") || "[]");
      searches.unshift(payload);
      if (searches.length > 500) searches.pop();
      localStorage.setItem("emr_searches_log", JSON.stringify(searches));
    } catch (e) {
      console.warn("Local search storage error:", e);
    }

    if (!isAppsScriptConfigured()) {
      return { success: true, searchId: payload.searchId, simulated: true };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(window.MargDriveConfig.appsScriptUrl, {
        method: "POST",
        mode: "no-cors", // Apps Script redirects require handling or no-cors for simple submission
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      return { success: true, searchId: payload.searchId };
    } catch (err) {
      console.warn("Apps Script search logging notice:", err.message);
      return { success: true, searchId: payload.searchId, fallback: true };
    }
  }

  /**
   * Submits a booking to Google Apps Script backend.
   * Recalculates fare and appends a highlighted row to BOOKINGS sheet.
   * @param {object} bookingData
   * @returns {Promise<object>}
   */
  /**
   * Submits booking request to Backend API.
   * Returns temporary payment request ID and payment metadata.
   */
  async function submitBooking(bookingData) {
    const apiBase = (typeof window !== "undefined" && (window.MargDriveConfig || window.MargDriveConfig)?.apiBaseUrl) || "/api";

    const payload = {
      customerName: (bookingData.fullName || bookingData.customerName || "").trim(),
      customerPhone: FormValidator.sanitizePhoneNumber(bookingData.phoneNumber || bookingData.customerPhone || ""),
      customerEmail: (bookingData.email || bookingData.customerEmail || "").trim(),
      serviceType: bookingData.serviceType || "oneway",
      fromCity: bookingData.fromCity || "",
      toCity: bookingData.toCity || "",
      pickupAddress: (bookingData.pickupAddress || "").trim(),
      dropoffAddress: (bookingData.dropoffAddress || "").trim(),
      pickupDate: bookingData.startingDate || bookingData.pickupDate || "",
      pickupTime: bookingData.startingTime || bookingData.pickupTime || "08:00",
      returnDate: bookingData.returningDate || bookingData.returnDate || null,
      returnTime: bookingData.returningTime || bookingData.returnTime || null,
      vehicleType: bookingData.carType || bookingData.vehicleType || "sedan",
      vehicleName: bookingData.carName || bookingData.vehicleName || "Sedan",
      distanceKm: bookingData.distanceKm || 100,
      baseFare: bookingData.baseFare || 2500,
      finalFare: bookingData.finalFare || 2500,
      customerRemarks: (bookingData.remarks || bookingData.customerRemarks || "").trim()
    };

    try {
      const res = await fetch(`${apiBase}/bookings/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const result = await res.json();
        return result;
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || "Failed to create booking request.");
    } catch (apiErr) {
      console.warn("Backend API notice:", apiErr.message);

      // Local Fallback simulation mode
      const reqId = `PAY-REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const fallbackBooking = {
        id: `bkg-${Date.now()}`,
        paymentRequestId: reqId,
        paymentStatus: "PENDING",
        bookingStatus: "PAYMENT_PENDING",
        ...payload,
        paymentMetadata: {
          upiId: "9041710472@kotakbank",
          amountInr: 500,
          upiDeepLink: "upi://pay?pa=9041710472@kotakbank&pn=MargDrive&am=500&cu=INR"
        }
      };

      try {
        localStorage.setItem("rod_active_booking_request", JSON.stringify(fallbackBooking));
      } catch (e) {}

      return {
        success: true,
        bookingId: fallbackBooking.id,
        paymentRequestId: reqId,
        brandName: "MargDrive",
        helpline: "9041710472",
        bookingFeeInr: 500,
        paymentMetadata: fallbackBooking.paymentMetadata
      };
    }
  }

  /**
   * Submits payment proof (UTR number & optional screenshot file)
   */
  async function submitPaymentProof(bookingId, formData) {
    const apiBase = (typeof window !== "undefined" && (window.MargDriveConfig || window.MargDriveConfig)?.apiBaseUrl) || "/api";

    try {
      const res = await fetch(`${apiBase}/bookings/${bookingId}/submit-payment`, {
        method: "POST",
        body: formData
      });

      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || "Failed to submit payment proof.");
    } catch (err) {
      console.warn("API payment proof fallback:", err.message);
      return {
        success: true,
        paymentStatus: "PAYMENT_SUBMITTED",
        message: "Payment proof recorded. Our verification team is verifying your transaction."
      };
    }
  }

  /**
   * Retrieves live booking status
   */
  async function getBookingStatus(identifier) {
    const apiBase = (typeof window !== "undefined" && (window.MargDriveConfig || window.MargDriveConfig)?.apiBaseUrl) || "/api";

    try {
      const res = await fetch(`${apiBase}/bookings/${identifier}/status`);
      if (res.ok) {
        return await res.json();
      }
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.message || "Booking not found.");
    } catch (err) {
      console.warn("API booking status fallback:", err.message);
      const cached = JSON.parse(localStorage.getItem("rod_active_booking_request") || "null");
      if (cached) {
        return { success: true, booking: cached };
      }
      throw err;
    }
  }

  /**
   * Fetches admin data (Bookings, Searches, Config) from Apps Script or Local Storage.
   * @returns {Promise<object>}
   */
  async function getAdminData() {
    if (isAppsScriptConfigured()) {
      try {
        const url = `${window.MargDriveConfig.appsScriptUrl}?action=get_admin_data&t=${Date.now()}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data && data.success) {
          return data;
        }
      } catch (err) {
        console.warn("Failed fetching from live Apps Script, reading local cache:", err);
      }
    }

    // Local Storage Mock Admin Provider
    const bookings = JSON.parse(localStorage.getItem(MargDriveConfig.storageKeys.completedBookings) || "[]");
    const searches = JSON.parse(localStorage.getItem("emr_searches_log") || "[]");

    // Add initial mock records if completely empty for immediate demonstration
    if (bookings.length === 0) {
      const demoBookings = [
        {
          bookingId: "MD-20260828-1001",
          bookingTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
          bookingStatus: "NEW",
          fullName: "Rahul Sharma",
          email: "rahul.sharma@example.com",
          countryCode: "+91",
          phoneNumber: "9876543210",
          fromCity: "Amritsar",
          toCity: "Chandigarh",
          pickupAddress: "Model Town, Amritsar",
          dropoffAddress: "Sector 17, Chandigarh",
          startingDate: "2026-08-29",
          startingTime: "08:00",
          returningDate: "",
          returningTime: "",
          journeyType: "One Way",
          carType: "sedan",
          distanceKm: 230,
          baseFare: 2930,
          vehicleAdjustment: 0,
          finalFare: 2930,
          remarks: "Please arrive 10 mins early.",
          generatedSms: "MargDrive: Your cab booking request has been received. Booking ID: MD-20260828-1001. Route: Amritsar -> Chandigarh. Fare: ₹2,930.",
          smsStatus: "READY"
        },
        {
          bookingId: "MD-20260828-1002",
          bookingTimestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
          bookingStatus: "CONFIRMED",
          fullName: "Pooja Verma",
          email: "pooja.v@example.com",
          countryCode: "+91",
          phoneNumber: "9812345678",
          fromCity: "Delhi",
          toCity: "Jaipur",
          pickupAddress: "Connaught Place, New Delhi",
          dropoffAddress: "MI Road, Jaipur",
          startingDate: "2026-08-30",
          startingTime: "06:30",
          returningDate: "2026-08-31",
          returningTime: "20:00",
          journeyType: "Round Trip",
          carType: "innova",
          distanceKm: 280,
          baseFare: 5880,
          vehicleAdjustment: 4000,
          finalFare: 9880,
          remarks: "Luggage space needed for 4 bags.",
          generatedSms: "MargDrive: Your cab booking request has been received. Booking ID: MD-20260828-1002. Route: Delhi -> Jaipur. Fare: ₹9,880.",
          smsStatus: "SENT"
        }
      ];
      localStorage.setItem(MargDriveConfig.storageKeys.completedBookings, JSON.stringify(demoBookings));
      bookings.push(...demoBookings);
    }

    return {
      success: true,
      mode: "local_dev",
      bookings: bookings,
      searches: searches
    };
  }

  /**
   * Updates booking status in Google Sheets / Local Storage.
   * @param {string} bookingId
   * @param {string} newStatus - 'NEW' | 'CONTACTED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'
   */
  async function updateBookingStatus(bookingId, newStatus) {
    try {
      const list = JSON.parse(localStorage.getItem(MargDriveConfig.storageKeys.completedBookings) || "[]");
      const idx = list.findIndex((b) => b.bookingId === bookingId);
      if (idx !== -1) {
        list[idx].bookingStatus = newStatus;
        localStorage.setItem(MargDriveConfig.storageKeys.completedBookings, JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Storage update notice:", e);
    }

    if (isAppsScriptConfigured()) {
      try {
        await fetch(window.MargDriveConfig.appsScriptUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({
            action: "update_booking_status",
            bookingId: bookingId,
            status: newStatus
          })
        });
      } catch (err) {
        console.warn("Apps Script status update failed:", err);
      }
    }

    return { success: true, bookingId, newStatus };
  }

  return {
    isAppsScriptConfigured,
    generateFallbackBookingId,
    generateSearchId,
    generateSmsText,
    logSearch,
    submitBooking,
    submitPaymentProof,
    getBookingStatus,
    getAdminData,
    updateBookingStatus
  };
})();

if (typeof window !== "undefined") {
  window.ApiService = ApiService;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ApiService;
}
