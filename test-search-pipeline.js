/**
 * MargDrive — Search Data Pipeline & Admin Follow-up Verification Test
 */
const assert = require('assert');

// Mock browser globals for testing
global.window = {
  MargDriveConfig: {
    appsScriptUrl: "https://script.google.com/macros/s/mock-url/exec",
    storageKeys: {
      lastSearch: "emr_last_search",
      activeBooking: "emr_active_booking",
      completedBookings: "emr_completed_bookings",
      adminAuth: "emr_admin_authenticated"
    }
  }
};

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock;
global.navigator = { userAgent: "Node.js Test Client" };

const ApiService = require('../easemyride/assets/js/api.js');

async function runTests() {
  console.log("==================================================");
  console.log("🚗 Testing MargDrive Search Data Pipeline & Admin Follow-up");
  console.log("==================================================");

  // 1. Test Search A: Delhi -> Agra (Phone: 9999999999)
  console.log("\n--- Test 1: Search A (Delhi -> Agra, Phone: 9999999999) ---");
  const searchAInput = {
    serviceType: "oneway",
    pickupCity: "Delhi",
    dropCity: "Agra",
    pickupDate: "2026-09-26",
    pickupTime: "08:00",
    phoneNumber: "9999999999",
    distanceKm: 230
  };

  const resA = await ApiService.logSearch(searchAInput);
  console.log("Result A:", resA);

  assert.strictEqual(resA.success, true, "Search A should succeed");
  assert.strictEqual(resA.payload.pickupLocation, "Delhi", "Pickup location must be Delhi");
  assert.strictEqual(resA.payload.dropLocation, "Agra", "Drop location must be Agra");
  assert.strictEqual(resA.payload.phoneNumber, "9999999999", "Phone number must be 9999999999");
  assert.strictEqual(resA.payload.serviceType, "oneway", "Service type must be oneway");
  assert.strictEqual(resA.payload.distanceKm, 230, "Distance must be 230");
  console.log("✅ [PASS] Search A correctly normalized and logged with non-blank fields.");

  // 2. Test Search B: Modified Search (Delhi -> Jaipur, Phone: 8888888888)
  console.log("\n--- Test 2: Search B Modified (Delhi -> Jaipur, Phone: 8888888888) ---");
  const searchBInput = {
    serviceType: "oneway",
    pickupLocation: "Delhi",
    dropLocation: "Jaipur",
    pickupDate: "2026-09-27",
    pickupTime: "10:00",
    phoneNumber: "8888888888",
    distanceKm: 280
  };

  const resB = await ApiService.logSearch(searchBInput);
  console.log("Result B:", resB);

  assert.strictEqual(resB.success, true, "Search B should succeed");
  assert.strictEqual(resB.payload.pickupLocation, "Delhi", "Pickup location must be Delhi");
  assert.strictEqual(resB.payload.dropLocation, "Jaipur", "Drop location must be Jaipur");
  assert.strictEqual(resB.payload.phoneNumber, "8888888888", "Phone number must be 8888888888");
  assert.strictEqual(resB.payload.distanceKm, 280, "Distance must be 280");
  console.log("✅ [PASS] Modified Search B correctly stored independently from Search A.");

  // 3. Test Admin Data Retrieval
  console.log("\n--- Test 3: Admin Data Retrieval & Search Leads Display ---");
  const adminData = await ApiService.getAdminData();
  const searches = adminData.searches;
  console.log(`Retrieved ${searches.length} searches from storage.`);

  const foundA = searches.find(s => s.searchId === resA.searchId);
  const foundB = searches.find(s => s.searchId === resB.searchId);

  assert(foundA, "Search A must be present in Admin Data");
  assert.strictEqual(foundA.pickupLocation, "Delhi");
  assert.strictEqual(foundA.dropLocation, "Agra");
  assert.strictEqual(foundA.phoneNumber, "9999999999");

  assert(foundB, "Search B must be present in Admin Data");
  assert.strictEqual(foundB.pickupLocation, "Delhi");
  assert.strictEqual(foundB.dropLocation, "Jaipur");
  assert.strictEqual(foundB.phoneNumber, "8888888888");
  console.log("✅ [PASS] Admin dashboard receives exact search records with full contact details.");

  // 4. Test Phone Normalization & Action Link Generation
  console.log("\n--- Test 4: Dynamic Call & WhatsApp Link Generation ---");
  function generateLinks(phone, from, to) {
    const rawPhone = phone.replace(/\D/g, "").slice(-10);
    const telLink = `tel:+91${rawPhone}`;
    const waMsg = encodeURIComponent(`Hello! We noticed you checked cabs from ${from} to ${to} on MargDrive. How can we assist you with your booking?`);
    const waLink = `https://wa.me/91${rawPhone}?text=${waMsg}`;
    return { telLink, waLink };
  }

  const linksA = generateLinks(foundA.phoneNumber, foundA.pickupLocation, foundA.dropLocation);
  console.log("Search A Links:", linksA);
  assert.strictEqual(linksA.telLink, "tel:+919999999999");
  assert(linksA.waLink.startsWith("https://wa.me/919999999999"));

  const linksB = generateLinks(foundB.phoneNumber, foundB.pickupLocation, foundB.dropLocation);
  console.log("Search B Links:", linksB);
  assert.strictEqual(linksB.telLink, "tel:+918888888888");
  assert(linksB.waLink.startsWith("https://wa.me/918888888888"));
  console.log("✅ [PASS] Call & WhatsApp links generated accurately with single +91 prefix.");

  // 5. Test Admin Follow-up Status Update
  console.log("\n--- Test 5: Admin Follow-up Status & Notes Update ---");
  const updateRes = await ApiService.updateSearchStatus(foundA.searchId, "INTERESTED", "Customer requested SUV pricing quotation");
  console.log("Update Result:", updateRes);
  assert.strictEqual(updateRes.success, true);
  assert.strictEqual(updateRes.followUpStatus, "INTERESTED");
  assert.strictEqual(updateRes.followUpNotes, "Customer requested SUV pricing quotation");

  const refreshedData = await ApiService.getAdminData();
  const updatedSearchA = refreshedData.searches.find(s => s.searchId === resA.searchId);
  assert.strictEqual(updatedSearchA.followUpStatus, "INTERESTED");
  assert.strictEqual(updatedSearchA.followUpNotes, "Customer requested SUV pricing quotation");
  console.log("✅ [PASS] Follow-up status and notes updated and persisted successfully.");

  // 6. Test Optional Phone handling (Empty phone number)
  console.log("\n--- Test 6: Optional Phone (No phone entered) ---");
  const searchNoPhone = {
    serviceType: "oneway",
    pickupCity: "Chandigarh",
    dropCity: "Amritsar",
    pickupDate: "2026-09-28",
    pickupTime: "12:00",
    phoneNumber: "",
    distanceKm: 230
  };

  const resNoPhone = await ApiService.logSearch(searchNoPhone);
  assert.strictEqual(resNoPhone.payload.phoneNumber, "", "Phone must be empty string, not N/A or fabricated");
  assert.strictEqual(resNoPhone.payload.pickupLocation, "Chandigarh");
  assert.strictEqual(resNoPhone.payload.dropLocation, "Amritsar");
  console.log("✅ [PASS] Optional phone properly left empty without inventing values or failing.");

  console.log("\n==================================================");
  console.log("🎉 ALL TESTS PASSED! Search Data Pipeline Verified 100%");
  console.log("==================================================");
}

runTests().catch(err => {
  console.error("Test failure:", err);
  process.exit(1);
});
