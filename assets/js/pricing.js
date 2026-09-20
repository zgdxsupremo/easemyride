/**
 * Marg Drive — Core Pricing Engine (pricing.js)
 * 
 * Implements transparent, deterministic, and configurable fare calculations with:
 * - Deterministic base formulas across all vehicle categories
 * - Regional adjustments (e.g. South India 1.05x multiplier)
 * - Direction-aware High-Altitude / Himalayan route pricing (e.g. mountain descent 1.08x)
 * - Transparent rule auditing with appliedRules breakdown
 */

const PricingEngine = (() => {
  // Versioning for tracking & backend sync
  const PRICING_VERSION = "2026-09-19-v1";

  // Configurable base parameters
  const BASE_RATES = {
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
    roundTripDriverAllowancePerDay: 400,
    roundTripSedanKmRate: 10.5
  };

  // Configurable regional pricing adjustments
  const REGIONAL_PRICING_RULES = {
    South: {
      multiplier: 1.05,
      ruleCode: "SOUTH_REGION_MULTIPLIER",
      description: "South India Regional Pricing (5% adjustment)"
    }
  };

  // Configurable terrain & mountain route adjustments
  const HIGH_ALTITUDE_RULES = {
    HIMALAYAN_DESCENT: {
      multiplier: 1.08,
      ruleCode: "HIMALAYAN_DESCENT",
      description: "Himalayan Mountain Descent Route Adjustment (8%)"
    },
    HIGH_ALTITUDE_STANDARD: {
      multiplier: 1.06,
      ruleCode: "HIGH_ALTITUDE_STANDARD",
      description: "High-Altitude Route Adjustment (6%)"
    }
  };

  let _citySearchModule = null;
  try {
    if (typeof require !== "undefined") {
      _citySearchModule = require('./city-search');
    }
  } catch (e) {}

  /**
   * Helper to lookup city metadata (using CitySearch if available)
   */
  function getCityMeta(cityName) {
    if (!cityName) return null;
    const cs = (typeof CitySearch !== "undefined" && CitySearch) || (typeof window !== "undefined" && window.CitySearch) || (typeof global !== "undefined" && global.CitySearch) || _citySearchModule;
    if (cs && typeof cs.getCityByName === "function") {
      return cs.getCityByName(cityName);
    }
    // Fallback basic terrain check
    const highAltNames = [
      "badrinath", "kedarnath", "uttarkashi", "joshimath", "rishikesh",
      "mussoorie", "nainital", "shimla", "manali", "dharamshala", "kullu",
      "katra", "srinagar", "darjeeling", "shillong", "gangtok", "munnar",
      "ooty", "kodaikanal", "coorg", "lonavala", "mahabaleshwar"
    ];
    const nameLower = cityName.toLowerCase();
    const isHigh = highAltNames.some(h => nameLower.includes(h));
    return {
      name: cityName,
      region: "North",
      terrainCategory: isHigh ? "HIGH_ALTITUDE" : "STANDARD"
    };
  }

  /**
   * Classifies a route to determine terrain and regional directionality.
   * @param {string|object} origin 
   * @param {string|object} destination 
   * @returns {object} Classification outcome
   */
  function classifyRoute(origin, destination) {
    const originMeta = typeof origin === "object" && origin ? origin : getCityMeta(origin);
    const destMeta = typeof destination === "object" && destination ? destination : getCityMeta(destination);

    const originRegion = originMeta ? originMeta.region : "North";
    const destRegion = destMeta ? destMeta.region : "North";
    const originTerrain = originMeta ? originMeta.terrainCategory : "STANDARD";
    const destTerrain = destMeta ? destMeta.terrainCategory : "STANDARD";

    let regionalRule = null;
    let terrainRule = null;

    // 1. Regional classification: Check South India
    if (originRegion === "South" || destRegion === "South") {
      regionalRule = "South";
    }

    // 2. High-Altitude Directional Classification
    if (originTerrain === "HIGH_ALTITUDE" && destTerrain !== "HIGH_ALTITUDE") {
      // Descending from high altitude toward lower/standard plains (e.g. Badrinath -> Rishikesh / Delhi)
      terrainRule = "HIMALAYAN_DESCENT";
    } else if (originTerrain === "HIGH_ALTITUDE" || destTerrain === "HIGH_ALTITUDE") {
      // Ascending or high-altitude internal route (e.g. Delhi -> Badrinath or Rishikesh -> Badrinath)
      terrainRule = "HIGH_ALTITUDE_STANDARD";
    }

    return {
      originCity: originMeta ? originMeta.name : (origin || "Origin"),
      destinationCity: destMeta ? destMeta.name : (destination || "Destination"),
      originRegion,
      destRegion,
      originTerrain,
      destTerrain,
      regionalRule,
      terrainRule
    };
  }

  /**
   * Calculates the base sedan fare for a given distance in kilometers.
   * Formula: (km * 11) + 400 (minimum ₹800)
   * @param {number} distanceKm 
   * @returns {number}
   */
  function calculateSedanBaseFare(distanceKm) {
    const km = Math.max(1, Number(distanceKm) || 1);
    const calculated = (km * BASE_RATES.sedanPerKm) + BASE_RATES.sedanBaseFare;
    return Math.max(BASE_RATES.minimumFare, Math.round(calculated));
  }

  /**
   * Calculates One Way fare with regional and terrain adjustments.
   * @param {object} params
   * @returns {object} Fare breakdown
   */
  function calculateOneWayFare(params) {
    // Support either object or legacy (distanceKm, carType) signature
    let distanceKm = 100;
    let carType = "sedan";
    let origin = "Delhi";
    let destination = "Chandigarh";

    if (typeof params === "object" && params !== null) {
      distanceKm = params.distanceKm || params.distance || 100;
      carType = params.carType || params.vehicleType || "sedan";
      origin = params.origin || params.fromCity || params.pickupCity || "Delhi";
      destination = params.destination || params.toCity || params.dropCity || "Chandigarh";
    } else {
      distanceKm = arguments[0] || 100;
      carType = arguments[1] || "sedan";
    }

    const type = carType.toLowerCase();
    const appliedRules = ["SEDAN_BASE"];

    // 1. Base Sedan Fare
    const baseSedan = calculateSedanBaseFare(distanceKm);

    // 2. Vehicle Adjustment
    const vehAdj = BASE_RATES.adjustments[type] !== undefined ? BASE_RATES.adjustments[type] : 0;
    if (type !== "sedan") {
      appliedRules.push(type.toUpperCase() + "_ADJUSTMENT");
    }

    const subtotal = Math.max(BASE_RATES.minimumFare, baseSedan + vehAdj);

    // 3. Route Classification
    const routeClassification = classifyRoute(origin, destination);
    let regionalMultiplier = 1.0;
    let regionalAdjustment = 0;

    if (routeClassification.regionalRule && REGIONAL_PRICING_RULES[routeClassification.regionalRule]) {
      const regConfig = REGIONAL_PRICING_RULES[routeClassification.regionalRule];
      regionalMultiplier = regConfig.multiplier;
      appliedRules.push(regConfig.ruleCode);
    }

    // 4. Terrain Adjustment
    let terrainMultiplier = 1.0;
    let specialRouteAdjustment = 0;

    if (routeClassification.terrainRule && HIGH_ALTITUDE_RULES[routeClassification.terrainRule]) {
      const terConfig = HIGH_ALTITUDE_RULES[routeClassification.terrainRule];
      terrainMultiplier = terConfig.multiplier;
      appliedRules.push(terConfig.ruleCode);
    }

    // Calculate adjustments sequentially without double-multiplying
    if (regionalMultiplier > 1.0) {
      regionalAdjustment = Math.round(subtotal * (regionalMultiplier - 1.0));
    }
    if (terrainMultiplier > 1.0) {
      specialRouteAdjustment = Math.round(subtotal * (terrainMultiplier - 1.0));
    }

    const finalFare = subtotal + regionalAdjustment + specialRouteAdjustment;

    return {
      serviceType: "oneway",
      carType: type,
      distanceKm: Math.round(distanceKm),
      baseFareSedan: baseSedan,
      vehicleAdjustment: vehAdj,
      regionalAdjustment,
      specialRouteAdjustment,
      finalFare,
      ratePerKm: BASE_RATES.sedanPerKm,
      appliedRules,
      routeClassification,
      tollIncluded: false,
      disclaimer: "Estimated fare. Toll taxes, state permits & parking are payable as per actual receipts."
    };
  }

  /**
   * Calculates Round Trip fare.
   * @param {object} params
   * @returns {object} Fare breakdown
   */
  function calculateRoundTripFare(params) {
    let distanceKm = 100;
    let days = 1;
    let carType = "sedan";
    let origin = "Delhi";
    let destination = "Chandigarh";

    if (typeof params === "object" && params !== null) {
      distanceKm = params.distanceKm || params.distance || 100;
      days = params.days || 1;
      carType = params.carType || params.vehicleType || "sedan";
      origin = params.origin || params.fromCity || params.pickupCity || "Delhi";
      destination = params.destination || params.toCity || params.dropCity || "Chandigarh";
    } else {
      distanceKm = arguments[0] || 100;
      days = arguments[1] || 1;
      carType = arguments[2] || "sedan";
    }

    const type = carType.toLowerCase();
    const tripDays = Math.max(1, parseInt(days, 10) || 1);
    const rawTotalKm = (Number(distanceKm) || 1) * 2;
    const minBillableKm = tripDays * BASE_RATES.roundTripMinKmPerDay;
    const billableKm = Math.max(rawTotalKm, minBillableKm);

    const appliedRules = ["ROUNDTRIP_BASE"];

    const baseDistanceFare = Math.round(billableKm * BASE_RATES.roundTripSedanKmRate);
    const driverAllowance = tripDays * BASE_RATES.roundTripDriverAllowancePerDay;
    const sedanTotal = baseDistanceFare + driverAllowance;

    const baseAdj = BASE_RATES.adjustments[type] !== undefined ? BASE_RATES.adjustments[type] : 0;
    const vehicleAdjustment = type === "sedan" ? 0 : (baseAdj > 0 ? baseAdj + ((tripDays - 1) * 1000) : baseAdj * tripDays);
    if (type !== "sedan") {
      appliedRules.push(type.toUpperCase() + "_ADJUSTMENT");
    }

    const subtotal = Math.max(BASE_RATES.minimumFare * 2, sedanTotal + vehicleAdjustment);

    const routeClassification = classifyRoute(origin, destination);
    let regionalAdjustment = 0;
    let specialRouteAdjustment = 0;

    if (routeClassification.regionalRule && REGIONAL_PRICING_RULES[routeClassification.regionalRule]) {
      const regConfig = REGIONAL_PRICING_RULES[routeClassification.regionalRule];
      regionalAdjustment = Math.round(subtotal * (regConfig.multiplier - 1.0));
      appliedRules.push(regConfig.ruleCode);
    }

    if (routeClassification.terrainRule && HIGH_ALTITUDE_RULES[routeClassification.terrainRule]) {
      const terConfig = HIGH_ALTITUDE_RULES[routeClassification.terrainRule];
      specialRouteAdjustment = Math.round(subtotal * (terConfig.multiplier - 1.0));
      appliedRules.push(terConfig.ruleCode);
    }

    const finalFare = subtotal + regionalAdjustment + specialRouteAdjustment;

    return {
      serviceType: "roundtrip",
      carType: type,
      oneWayDistanceKm: Math.round(distanceKm),
      billableKm: Math.round(billableKm),
      days: tripDays,
      baseFareSedan: sedanTotal,
      driverAllowance,
      vehicleAdjustment,
      regionalAdjustment,
      specialRouteAdjustment,
      finalFare,
      appliedRules,
      routeClassification,
      tollIncluded: false,
      disclaimer: "Estimated fare for complete round trip. State border taxes, highway tolls and parking extra."
    };
  }

  /**
   * Calculates Local Sightseeing package fare.
   * @param {object} params
   * @returns {object} Fare breakdown
   */
  function calculateLocalFare(params) {
    let packageId = "8hr80km";
    let carType = "sedan";
    let origin = "Delhi";

    if (typeof params === "object" && params !== null) {
      packageId = params.packageId || "8hr80km";
      carType = params.carType || params.vehicleType || "sedan";
      origin = params.origin || params.fromCity || params.pickupCity || "Delhi";
    } else {
      packageId = arguments[0] || "8hr80km";
      carType = arguments[1] || "sedan";
    }

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

    const appliedRules = ["LOCAL_PACKAGE_" + packageId.toUpperCase()];
    const adjustment = localAdjustments[type] !== undefined ? localAdjustments[type] : 0;
    if (type !== "sedan") {
      appliedRules.push(type.toUpperCase() + "_LOCAL_ADJUSTMENT");
    }

    const subtotal = pkg.sedanPrice + adjustment;
    const originMeta = getCityMeta(origin);
    let regionalAdjustment = 0;

    if (originMeta && originMeta.region === "South") {
      regionalAdjustment = Math.round(subtotal * 0.05);
      appliedRules.push("SOUTH_REGION_MULTIPLIER");
    }

    const finalFare = subtotal + regionalAdjustment;

    return {
      serviceType: "local",
      packageId,
      packageLabel: pkg.label,
      hours: pkg.hours,
      distanceKm: pkg.km,
      carType: type,
      baseFareSedan: pkg.sedanPrice,
      vehicleAdjustment: adjustment,
      regionalAdjustment,
      specialRouteAdjustment: 0,
      finalFare,
      appliedRules,
      tollIncluded: false,
      disclaimer: "Tolls, parking and monument entry fees payable directly."
    };
  }

  /**
   * Calculates Airport Transfer fare.
   * @param {object} params
   * @returns {object} Fare breakdown
   */
  function calculateAirportFare(params) {
    let distanceKm = 35;
    let transferType = "airport_to_city";
    let carType = "sedan";
    let origin = "Delhi Airport";
    let destination = "Delhi NCR";

    if (typeof params === "object" && params !== null) {
      distanceKm = params.distanceKm || params.distance || 35;
      transferType = params.transferType || "airport_to_city";
      carType = params.carType || params.vehicleType || "sedan";
      origin = params.origin || params.airport || "Delhi Airport";
      destination = params.destination || params.dropCity || "Delhi NCR";
    } else {
      distanceKm = arguments[0] || 35;
      transferType = arguments[1] || "airport_to_city";
      carType = arguments[2] || "sedan";
    }

    const type = carType.toLowerCase();
    const km = Math.max(10, Number(distanceKm) || 35);
    const oneWay = calculateOneWayFare({
      origin,
      destination,
      distanceKm: km,
      carType: type
    });

    const finalFare = Math.max(999, oneWay.finalFare);
    const appliedRules = [...oneWay.appliedRules];
    if (finalFare === 999 && oneWay.finalFare < 999) {
      appliedRules.push("AIRPORT_MINIMUM_FARE_FLOOR");
    }

    return {
      serviceType: "airport",
      transferType,
      distanceKm: Math.round(km),
      carType: type,
      baseFareSedan: oneWay.baseFareSedan,
      vehicleAdjustment: oneWay.vehicleAdjustment,
      regionalAdjustment: oneWay.regionalAdjustment,
      specialRouteAdjustment: oneWay.specialRouteAdjustment,
      finalFare,
      appliedRules,
      tollIncluded: false,
      disclaimer: "Airport terminal parking & toll charges extra as per receipt."
    };
  }

  /**
   * Central Master Fare Calculator for any request.
   * @param {object} params
   * @returns {object}
   */
  function calculateFare(params) {
    const serviceType = (params.serviceType || "oneway").toLowerCase();
    switch (serviceType) {
      case "roundtrip":
        return calculateRoundTripFare(params);
      case "local":
        return calculateLocalFare(params);
      case "airport":
        return calculateAirportFare(params);
      case "oneway":
      default:
        return calculateOneWayFare(params);
    }
  }

  /**
   * Generates quotes for all 5 vehicle types for a given search.
   * @param {object} searchParams 
   * @returns {Array<object>}
   */
  function getAllVehicleFares(searchParams) {
    const vehicleTypes = ["hatchback", "sedan", "suv", "innova", "crysta"];
    return vehicleTypes.map((type) => {
      return calculateFare({
        ...searchParams,
        carType: type,
        vehicleType: type
      });
    });
  }

  return {
    PRICING_VERSION,
    RATES: BASE_RATES,
    REGIONAL_PRICING_RULES,
    HIGH_ALTITUDE_RULES,
    classifyRoute,
    calculateSedanBaseFare,
    calculateOneWayFare,
    calculateRoundTripFare,
    calculateLocalFare,
    calculateAirportFare,
    calculateFare,
    getAllVehicleFares
  };
})();

if (typeof window !== "undefined") {
  window.PricingEngine = PricingEngine;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = PricingEngine;
}