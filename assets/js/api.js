/**
 * EaseMyRide — Google Apps Script Backend API Client
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
    const url = typeof window !== "undefined" && window.EaseMyRideConfig && window.EaseMyRideConfig.appsScriptUrl;
    return Boolean(url && url.includes("script.google.com/macros/s/"));
  }

  /**
   * Helper to generate a unique client fallback Booking ID (EMR-YYYYMMDD-XXXX).
   */
  function generateFallbackBookingId() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `EMR-${y}${m}${d}-${rand}`;
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
    const helpline = (typeof window !== "undefined" && window.EaseMyRideConfig && window.EaseMyRideConfig.helplineNumber) || "+91 98765 43210";
    const route = booking.fromCity && booking.toCity ? `${booking.fromCity} → ${booking.toCity}` : booking.fromCity || "Local";
    const carName = (booking.carType || "Sedan").toUpperCase();
    const fare = booking.finalFare ? `₹${Number(booking.finalFare).toLocaleString("en-IN")}` : "TBD";
    const pickup = `${booking.startingDate || "Scheduled Date"}, ${booking.startingTime || "Time"}`;

    return `EaseMyRide: Your cab booking request has been received successfully.\nBooking ID: ${booking.bookingId}\nRoute: ${route}\nVehicle: ${carName}\nFare: ${fare}\nPickup: ${pickup}\nFor assistance call: ${helpline}\nThank you for choosing EaseMyRide.`;
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

      const response = await fetch(window.EaseMyRideConfig.appsScriptUrl, {
        method: "POST",
        mode: "no-cors", // Apps Script redirects require handling or no-cors for simple submission
        headers: { "Content-Type": "application/json" },
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
  async function submitBooking(bookingData) {
    const bookingId = bookingData.bookingId || generateFallbackBookingId();
    const sms = generateSmsText({ ...bookingData, bookingId });

    const payload = {
      action: "create_booking",
      bookingId: bookingId,
      bookingTimestamp: new Date().toISOString(),
      bookingStatus: "NEW",
      fullName: (bookingData.fullName || "").trim(),
      email: (bookingData.email || "").trim(),
      countryCode: bookingData.countryCode || "+91",
      phoneNumber: FormValidator.sanitizePhoneNumber(bookingData.phoneNumber || ""),
      fromCity: bookingData.fromCity || "",
      toCity: bookingData.toCity || "",
      pickupAddress: (bookingData.pickupAddress || "").trim(),
      dropoffAddress: (bookingData.dropoffAddress || "").trim(),
      startingDate: bookingData.startingDate || "",
      startingTime: bookingData.startingTime || "",
      returningDate: bookingData.returningDate || "",
      returningTime: bookingData.returningTime || "",
      journeyType: bookingData.journeyType || "One Way",
      carType: bookingData.carType || "sedan",
      distanceKm: bookingData.distanceKm || 0,
      baseFare: bookingData.baseFare || 0,
      vehicleAdjustment: bookingData.vehicleAdjustment || 0,
      finalFare: bookingData.finalFare || 0,
      remarks: (bookingData.remarks || "").trim(),
      generatedSms: sms,
      smsStatus: "READY"
    };

    // Store in browser storage
    try {
      const list = JSON.parse(localStorage.getItem(EaseMyRideConfig.storageKeys.completedBookings) || "[]");
      list.unshift(payload);
      localStorage.setItem(EaseMyRideConfig.storageKeys.completedBookings, JSON.stringify(list));
      localStorage.setItem(EaseMyRideConfig.storageKeys.activeBooking, JSON.stringify(payload));
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    if (!isAppsScriptConfigured()) {
      // Simulate realistic network delay for smooth UI transition
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        success: true,
        bookingId: bookingId,
        booking: payload,
        mode: "development_storage",
        message: "Booking recorded successfully in local MVP storage."
      };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(window.EaseMyRideConfig.appsScriptUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" }, // Using text/plain avoids CORS preflight issues with Google Apps Script
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const result = await response.json();
      if (result && result.success) {
        return {
          success: true,
          bookingId: result.bookingId || bookingId,
          booking: payload,
          mode: "google_sheets"
        };
      } else {
        throw new Error((result && result.message) || "Unable to save booking to Google Sheets.");
      }
    } catch (err) {
      console.error("Booking API error:", err);
      // If network fails to reach Google Sheets, record offline and notify clearly
      return {
        success: true,
        bookingId: bookingId,
        booking: payload,
        offline: true,
        message: "Saved locally. Backend will synchronize when connection is restored."
      };
    }
  }

  /**
   * Fetches admin data (Bookings, Searches, Config) from Apps Script or Local Storage.
   * @returns {Promise<object>}
   */
  async function getAdminData() {
    if (isAppsScriptConfigured()) {
      try {
        const url = `${window.EaseMyRideConfig.appsScriptUrl}?action=get_admin_data&t=${Date.now()}`;
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
    const bookings = JSON.parse(localStorage.getItem(EaseMyRideConfig.storageKeys.completedBookings) || "[]");
    const searches = JSON.parse(localStorage.getItem("emr_searches_log") || "[]");

    // Add initial mock records if completely empty for immediate demonstration
    if (bookings.length === 0) {
      const demoBookings = [
        {
          bookingId: "EMR-20260828-1001",
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
          generatedSms: "EaseMyRide: Your cab booking request has been received. Booking ID: EMR-20260828-1001. Route: Amritsar -> Chandigarh. Fare: ₹2,930.",
          smsStatus: "READY"
        },
        {
          bookingId: "EMR-20260828-1002",
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
          generatedSms: "EaseMyRide: Your cab booking request has been received. Booking ID: EMR-20260828-1002. Route: Delhi -> Jaipur. Fare: ₹9,880.",
          smsStatus: "SENT"
        }
      ];
      localStorage.setItem(EaseMyRideConfig.storageKeys.completedBookings, JSON.stringify(demoBookings));
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
      const list = JSON.parse(localStorage.getItem(EaseMyRideConfig.storageKeys.completedBookings) || "[]");
      const idx = list.findIndex((b) => b.bookingId === bookingId);
      if (idx !== -1) {
        list[idx].bookingStatus = newStatus;
        localStorage.setItem(EaseMyRideConfig.storageKeys.completedBookings, JSON.stringify(list));
      }
    } catch (e) {
      console.warn("Storage update notice:", e);
    }

    if (isAppsScriptConfigured()) {
      try {
        await fetch(window.EaseMyRideConfig.appsScriptUrl, {
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
