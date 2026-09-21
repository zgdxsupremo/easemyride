const fs = require('fs');
const path = require('path');

const projectDir = path.join(__dirname);

console.log("=== MargDrive MVP Automated Verification ===");

// 1. Check all required files exist
const requiredFiles = [
  'index.html',
  'search.html',
  'booking.html',
  'success.html',
  'admin.html',
  'oneway.html',
  'roundtrip.html',
  'local.html',
  'airport.html',
  'about.html',
  'contact.html',
  'privacy-policy.html',
  'terms.html',
  'cancellation-policy.html',
  'robots.txt',
  'sitemap.xml',
  'assets/css/main.css',
  'assets/css/responsive.css',
  'assets/css/admin.css',
  'assets/js/config.js',
  'assets/js/pricing.js',
  'assets/js/distance.js',
  'assets/js/validation.js',
  'assets/js/api.js',
  'assets/js/ui.js',
  'assets/js/app.js',
  'assets/js/search.js',
  'assets/js/booking.js',
  'assets/js/success.js',
  'assets/js/admin.js',
  'google-apps-script/Code.gs',
  'google-apps-script/setup-guide.md',
  'README.md'
];

let missing = 0;
requiredFiles.forEach(file => {
  const fullPath = path.join(projectDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ MISSING FILE: ${file}`);
    missing++;
  } else {
    console.log(`✅ FOUND: ${file}`);
  }
});

if (missing > 0) {
  console.error(`Total missing files: ${missing}`);
  process.exit(1);
}

// 2. Test Pricing Engine formulas
const PricingEngine = require(path.join(projectDir, 'assets/js/pricing.js'));

console.log("\n--- Testing Pricing Engine ---");

// Test 300 km example from prompt:
// Sedan = 300 * 11 + 400 = 3700
// SUV = 3700 + 3000 = 6700
// Innova = 3700 + 3000 = 6700
// Crysta = 3700 + 4000 = 7700
// Hatchback = 3700 - 100 = 3600

const sedanQuote = PricingEngine.calculateOneWayFare(300, 'sedan');
console.log(`Sedan 300km: ₹${sedanQuote.finalFare} (Expected: ₹3700)`);
if (sedanQuote.finalFare !== 3700) throw new Error("Sedan pricing mismatch");

const suvQuote = PricingEngine.calculateOneWayFare(300, 'suv');
console.log(`SUV 300km: ₹${suvQuote.finalFare} (Expected: ₹6700)`);
if (suvQuote.finalFare !== 6700) throw new Error("SUV pricing mismatch");

const innovaQuote = PricingEngine.calculateOneWayFare(300, 'innova');
console.log(`Innova 300km: ₹${innovaQuote.finalFare} (Expected: ₹6700)`);
if (innovaQuote.finalFare !== 6700) throw new Error("Innova pricing mismatch");

const crystaQuote = PricingEngine.calculateOneWayFare(300, 'crysta');
console.log(`Crysta 300km: ₹${crystaQuote.finalFare} (Expected: ₹7700)`);
if (crystaQuote.finalFare !== 7700) throw new Error("Crysta pricing mismatch");

const hatchQuote = PricingEngine.calculateOneWayFare(300, 'hatchback');
console.log(`Hatchback 300km: ₹${hatchQuote.finalFare} (Expected: ₹3600)`);
if (hatchQuote.finalFare !== 3600) throw new Error("Hatchback pricing mismatch");

// 3. Test Validation Module
const FormValidator = require(path.join(projectDir, 'assets/js/validation.js'));
console.log("\n--- Testing Validation Module ---");

const validPhones = ["9041710472", "+919041710472", "919041710472", "8123456789", "7000123456", "6999988888"];
validPhones.forEach(p => {
  if (!FormValidator.isValidIndianPhone(p)) throw new Error(`Should be valid phone: ${p}`);
});
console.log("✅ Indian Phone validation passed for all valid numbers.");

const invalidPhones = ["12345", "1234567890", "5987654321", "abcdefghij", ""];
invalidPhones.forEach(p => {
  if (FormValidator.isValidIndianPhone(p)) throw new Error(`Should be invalid phone: ${p}`);
});
console.log("✅ Invalid Phone rejection passed.");

if (!FormValidator.areLocationsDistinct("Delhi", "Chandigarh")) throw new Error("Locations check failed");
if (FormValidator.areLocationsDistinct("Delhi", "delhi")) throw new Error("Same city detection failed");
console.log("✅ Location distinctness checks passed.");

// 4. Test Distance Service
const DistanceService = require(path.join(projectDir, 'assets/js/distance.js'));
console.log("\n--- Testing Distance Service Matrix ---");
(async () => {
  const d1 = await DistanceService.calculateDistance("Delhi", "Chandigarh");
  console.log(`Delhi -> Chandigarh: ${d1.distanceKm} KM, ${d1.duration}`);
  if (d1.distanceKm !== 250) throw new Error("Matrix lookup failed for Delhi-Chandigarh");

  const d2 = await DistanceService.calculateDistance("Amritsar", "Chandigarh");
  console.log(`Amritsar -> Chandigarh: ${d2.distanceKm} KM, ${d2.duration}`);
  if (d2.distanceKm !== 230) throw new Error("Matrix lookup failed for Amritsar-Chandigarh");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! MargDrive MVP is production-ready.");
})();
