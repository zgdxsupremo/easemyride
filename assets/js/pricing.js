/**
 * RideOnDemand — Core Pricing Engine
 * 
 * Implements transparent, deterministic fare calculations for all vehicle
 * categories across One Way, Round Trip, Local Sightseeing, and Airport Transfers.
 * 
 * Rules:
 * - Sedan Base Formula: (distanceKm * 11) + 400
 * - SUV: Sedan Fare + 3,000
 * - Innova: Sedan Fare + 3,000 (Configurable)
 * - Innova Crysta: Sedan Fare + 4,000
 * - Hatchback: Sedan Fare - 100
 * 
 * Note: Tolls, permits, and parking are NOT included in the base fare.
 */

const PricingEngine = (() => {
  // Configurable base parameters
  const RATES = {
    sedanPerKm: 11,
    sedanBaseFare: 400,
    adjustments: {
      hatchback: -100,
      sedan: 0,
      suv: 3000,
      innova: 3000,
      crysta: 4000
    },
    minimumFare: 800,
    roundTripMinKmPerDay: 250,
    roundTripDriverAllowancePerDay: 400
  };

  /**
   * Calculates the base sedan fare for a given distance in kilometers.
   * @param {number} distanceKm 
   * @returns {number}
   */
  function calculateSedanBaseFare(distanceKm) {
    const km = Math.max(1, Number(distanceKm) || 1);
    const calculated = (km * RATES.sedanPerKm) + RATES.sedanBaseFare;
    return Math.max(RATES.minimumFare, Math.round(calculated));
  }

  /**
   * Calculates One Way fare for a specific vehicle category.
   * @param {number} distanceKm 
   * @param {string} carType - 'hatchback' | 'sedan' | 'suv' | 'innova' | 'crysta'
   * @returns {object} Fare breakdown
   */
  function calculateOneWayFare(distanceKm, carType = "sedan") {
    const type = carType.toLowerCase();
    const sedanFare = calculateSedanBaseFare(distanceKm);
    const adjustment = RATES.adjustments[type] !== undefined ? RATES.adjustments[type] : 0;
    const finalFare = Math.max(RATES.minimumFare, sedanFare + adjustment);

    return {
      serviceType: "oneway",
      carType: type,
      distanceKm: Math.round(distanceKm),
      baseFareSedan: sedanFare,
      vehicleAdjustment: adjustment,
      finalFare: finalFare,
      ratePerKm: RATES.sedanPerKm,
      tollIncluded: false,
      disclaimer: "Estimated fare. Toll, parking and applicable taxes may be extra."
    };
  }

  /**
   * Calculates Round Trip fare.
   * Formula: Total distance (2x one way or minimum 250km/day) at round-trip rate + vehicle adjustment + driver allowance.
   * @param {number} distanceKm - One way distance
   * @param {number} days - Number of trip days
   * @param {string} carType
   * @returns {object} Fare breakdown
   */
  function calculateRoundTripFare(distanceKm, days = 1, carType = "sedan") {
    const type = carType.toLowerCase();
    const tripDays = Math.max(1, parseInt(days, 10) || 1);
    const rawTotalKm = (Number(distanceKm) || 1) * 2;
    const minBillableKm = tripDays * RATES.roundTripMinKmPerDay;
    const billableKm = Math.max(rawTotalKm, minBillableKm);

    // Sedan Round trip rate: ₹10.5/km + driver allowance
    const roundTripSedanKmRate = 10.5;
    const baseDistanceFare = Math.round(billableKm * roundTripSedanKmRate);
    const driverAllowance = tripDays * RATES.roundTripDriverAllowancePerDay;
    const sedanTotal = baseDistanceFare + driverAllowance;

    // Vehicle adjustment proportional to trip duration
    const baseAdj = RATES.adjustments[type] !== undefined ? RATES.adjustments[type] : 0;
    // For round trips, SUV/Innova adjustment scales reasonably with multi-day trips
    const vehicleAdjustment = type === "sedan" ? 0 : (baseAdj > 0 ? baseAdj + ((tripDays - 1) * 1000) : baseAdj * tripDays);
    const finalFare = Math.max(RATES.minimumFare * 2, sedanTotal + vehicleAdjustment);

    return {
      serviceType: "roundtrip",
      carType: type,
      oneWayDistanceKm: Math.round(distanceKm),
      billableKm: Math.round(billableKm),
      days: tripDays,
      baseFareSedan: sedanTotal,
      driverAllowance: driverAllowance,
      vehicleAdjustment: vehicleAdjustment,
      finalFare: finalFare,
      tollIncluded: false,
      disclaimer: "Estimated fare for complete round trip. State tax, toll and parking extra."
    };
  }

  /**
   * Calculates Local Sightseeing package fare.
   * @param {string} packageId - '4hr40km' | '8hr80km' | '12hr120km'
   * @param {string} carType
   * @returns {object} Fare breakdown
   */
  function calculateLocalFare(packageId = "8hr80km", carType = "sedan") {
    const type = carType.toLowerCase();
    const pkgMap = {
      "4hr40km": { hours: 4, km: 40, sedanPrice: 1400, label: "4 Hrs / 40 KM" },
      "8hr80km": { hours: 8, km: 80, sedanPrice: 2400, label: "8 Hrs / 80 KM" },
      "12hr120km": { hours: 12, km: 120, sedanPrice: 3400, label: "12 Hrs / 120 KM" }
    };

    const pkg = pkgMap[packageId] || pkgMap["8hr80km"];
    const localAdjustments = {
      hatchback: -200,
      sedan: 0,
      suv: 1000,
      innova: 1200,
      crysta: 1600
    };

    const adjustment = localAdjustments[type] !== undefined ? localAdjustments[type] : 0;
    const finalFare = pkg.sedanPrice + adjustment;

    return {
      serviceType: "local",
      packageId: packageId,
      packageLabel: pkg.label,
      hours: pkg.hours,
      distanceKm: pkg.km,
      carType: type,
      baseFareSedan: pkg.sedanPrice,
      vehicleAdjustment: adjustment,
      finalFare: finalFare,
      tollIncluded: false,
      disclaimer: "Tolls, parking and entry fees to tourist locations to be paid directly."
    };
  }

  /**
   * Calculates Airport Transfer fare.
   * @param {number} distanceKm
   * @param {string} transferType - 'airport_to_city' | 'city_to_airport'
   * @param {string} carType
   * @returns {object} Fare breakdown
   */
  function calculateAirportFare(distanceKm = 35, transferType = "airport_to_city", carType = "sedan") {
    const type = carType.toLowerCase();
    const km = Math.max(10, Number(distanceKm) || 35);
    // Airport transfer formula: standard one-way with minimum ₹999 for airport reliability
    const oneWay = calculateOneWayFare(km, type);
    const finalFare = Math.max(999, oneWay.finalFare);

    return {
      serviceType: "airport",
      transferType: transferType,
      distanceKm: Math.round(km),
      carType: type,
      baseFareSedan: oneWay.baseFareSedan,
      vehicleAdjustment: oneWay.vehicleAdjustment,
      finalFare: finalFare,
      tollIncluded: false,
      disclaimer: "Airport parking & toll taxes (if applicable) are extra."
    };
  }

  /**
   * Master dispatcher for all vehicle options given search parameters.
   * Returns an array of pricing quotes for all 5 car categories.
   * @param {object} searchParams
   * @returns {Array<object>}
   */
  function getAllVehicleFares(searchParams) {
    const serviceType = (searchParams.serviceType || "oneway").toLowerCase();
    const vehicleTypes = ["hatchback", "sedan", "suv", "innova", "crysta"];

    return vehicleTypes.map((type) => {
      let quote;
      if (serviceType === "roundtrip") {
        quote = calculateRoundTripFare(searchParams.distanceKm || 200, searchParams.days || 1, type);
      } else if (serviceType === "local") {
        quote = calculateLocalFare(searchParams.packageId || "8hr80km", type);
      } else if (serviceType === "airport") {
        quote = calculateAirportFare(searchParams.distanceKm || 35, searchParams.transferType, type);
      } else {
        quote = calculateOneWayFare(searchParams.distanceKm || 200, type);
      }
      return quote;
    });
  }

  return {
    RATES,
    calculateSedanBaseFare,
    calculateOneWayFare,
    calculateRoundTripFare,
    calculateLocalFare,
    calculateAirportFare,
    getAllVehicleFares
  };
})();

if (typeof window !== "undefined") {
  window.PricingEngine = PricingEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PricingEngine;
}
