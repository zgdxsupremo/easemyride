/**
 * EaseMyRide — Public Client Configuration
 * Contains non-sensitive configuration, business defaults, vehicle metadata,
 * and routing presets.
 * 
 * IMPORTANT: Secret keys or private credentials MUST NEVER be placed here.
 */

const EaseMyRideConfig = {
  // Brand details
  companyName: "EaseMyRide",
  tagline: "Simple rides. Better journeys.",
  helplineNumber: "+91 98765 43210",
  whatsappNumber: "+919876543210",
  supportEmail: "support@easemyride.com",
  currentYear: 2026,

  // Google Apps Script Web App URL
  // Deploy your Google Apps Script and paste the Web App Exec URL here.
  // When left as empty string or "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",
  // the platform seamlessly operates in Development / Local Simulation Mode.
  appsScriptUrl: "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE",

  // Distance & Routing API Configuration
  // To use Google Maps Routes/Distance Matrix API, provide the public browser key here
  // or leave null to use the rich built-in Indian intercity matrix & fallback calculator.
  googleMapsApiKey: null,
  distanceFallbackMode: true,

  // Vehicle Categories & Specifications
  vehicles: [
    {
      id: "hatchback",
      name: "Hatchback",
      models: "WagonR, Swift, Celerio or equivalent",
      category: "Economical & Compact",
      capacity: "4 Passengers",
      passengers: 4,
      luggage: "2 Small Bags",
      ac: "Air Conditioned",
      badge: "Best Value",
      imageType: "hatchback",
      description: "Ideal for solo travelers or small families seeking the most economical ride."
    },
    {
      id: "sedan",
      name: "Sedan",
      models: "Dzire, Etios, Aura or equivalent",
      category: "Comfortable Intercity",
      capacity: "4 Passengers",
      passengers: 4,
      luggage: "2 Large + 1 Small Bag",
      ac: "Air Conditioned",
      badge: "Most Popular",
      recommended: true,
      imageType: "sedan",
      description: "The gold standard for outstation travel. Supreme legroom and smooth highway cruising."
    },
    {
      id: "suv",
      name: "SUV",
      models: "Ertiga, Carens, Triber or equivalent",
      category: "Extra Space & Comfort",
      capacity: "6 Passengers",
      passengers: 6,
      luggage: "3 Large Bags",
      ac: "Air Conditioned",
      badge: "Family Pick",
      imageType: "suv",
      description: "Generous seating for larger families or groups with substantial luggage requirements."
    },
    {
      id: "innova",
      name: "Innova",
      models: "Toyota Innova / Standard",
      category: "Spacious Group Travel",
      capacity: "6-7 Passengers",
      passengers: 7,
      luggage: "4 Large Bags",
      ac: "Air Conditioned",
      badge: "Highway Champion",
      imageType: "innova",
      description: "The trusted long-distance touring vehicle with legendary comfort and stability."
    },
    {
      id: "crysta",
      name: "Innova Crysta",
      models: "Toyota Innova Crysta / Executive",
      category: "Premium Executive Comfort",
      capacity: "6-7 Passengers",
      passengers: 7,
      luggage: "4 Large Bags",
      ac: "Air Conditioned",
      badge: "Luxury Travel",
      imageType: "crysta",
      description: "Top-of-the-line executive touring with plush seating and quiet, premium ride quality."
    }
  ],

  // Popular Routes for Dynamic Presentation
  popularRoutes: [
    { from: "Delhi", to: "Chandigarh", distanceKm: 250, baseFareSedan: 3150 },
    { from: "Delhi", to: "Jaipur", distanceKm: 280, baseFareSedan: 3480 },
    { from: "Amritsar", to: "Chandigarh", distanceKm: 230, baseFareSedan: 2930 },
    { from: "Delhi", to: "Agra", distanceKm: 210, baseFareSedan: 2710 },
    { from: "Chandigarh", to: "Shimla", distanceKm: 115, baseFareSedan: 1665 },
    { from: "Mumbai", to: "Pune", distanceKm: 150, baseFareSedan: 2050 },
    { from: "Bengaluru", to: "Mysuru", distanceKm: 145, baseFareSedan: 1995 },
    { from: "Delhi", to: "Dehradun", distanceKm: 260, baseFareSedan: 3260 }
  ],

  // Local Sightseeing Packages
  localPackages: [
    { id: "4hr40km", label: "4 Hours / 40 KM", hours: 4, distanceKm: 40, baseSedan: 1400 },
    { id: "8hr80km", label: "8 Hours / 80 KM (Full Day)", hours: 8, distanceKm: 80, baseSedan: 2400, default: true },
    { id: "12hr120km", label: "12 Hours / 120 KM (Extended Day)", hours: 12, distanceKm: 120, baseSedan: 3400 }
  ],

  // Major Airports
  airports: [
    { id: "DEL", city: "Delhi", name: "Indira Gandhi International Airport (DEL)", defaultPickupKm: 35 },
    { id: "IXC", city: "Chandigarh", name: "Shaheed Bhagat Singh International Airport (IXC)", defaultPickupKm: 25 },
    { id: "ATQ", city: "Amritsar", name: "Sri Guru Ram Dass Jee International Airport (ATQ)", defaultPickupKm: 20 },
    { id: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Maharaj International Airport (BOM)", defaultPickupKm: 30 },
    { id: "BLR", city: "Bengaluru", name: "Kempegowda International Airport (BLR)", defaultPickupKm: 45 },
    { id: "JAI", city: "Jaipur", name: "Jaipur International Airport (JAI)", defaultPickupKm: 20 },
    { id: "HYD", city: "Hyderabad", name: "Rajiv Gandhi International Airport (HYD)", defaultPickupKm: 35 }
  ],

  // Storage Keys for Browser State
  storageKeys: {
    lastSearch: "emr_last_search",
    activeBooking: "emr_active_booking",
    completedBookings: "emr_completed_bookings",
    adminAuth: "emr_admin_authenticated"
  }
};

// Export to window object for modular Vanilla JS architecture
if (typeof window !== "undefined") {
  window.EaseMyRideConfig = EaseMyRideConfig;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = EaseMyRideConfig;
}
