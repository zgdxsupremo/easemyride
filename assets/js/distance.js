/**
 * Marg Drive — Distance & Route Calculation Module (distance.js)
 * 
 * Abstraction layer for calculating real driving distances between Indian cities.
 * Integrates with Google Routes API / Google Distance Matrix when configured,
 * and provides a comprehensive Indian intercity distance matrix + CitySearch dataset
 * coordinates routing fallback for development and offline operation.
 */

const DistanceService = (() => {
  // Built-in Indian Intercity Road Distance Matrix (in KM)
  const DISTANCE_MATRIX = {
    "delhi-chandigarh": 250,
    "chandigarh-delhi": 250,
    "delhi-jaipur": 280,
    "jaipur-delhi": 280,
    "delhi-agra": 210,
    "agra-delhi": 210,
    "delhi-vrindavan": 180,
    "vrindavan-delhi": 180,
    "new delhi-vrindavan": 180,
    "vrindavan-new delhi": 180,
    "amritsar-chandigarh": 230,
    "chandigarh-amritsar": 230,
    "delhi-amritsar": 450,
    "amritsar-delhi": 450,
    "chandigarh-shimla": 115,
    "shimla-chandigarh": 115,
    "delhi-shimla": 345,
    "shimla-delhi": 345,
    "delhi-dehradun": 260,
    "dehradun-delhi": 260,
    "delhi-haridwar": 220,
    "haridwar-delhi": 220,
    "delhi-rishikesh": 240,
    "rishikesh-delhi": 240,
    "delhi-badrinath": 540,
    "badrinath-delhi": 540,
    "rishikesh-badrinath": 295,
    "badrinath-rishikesh": 295,
    "delhi-kedarnath": 450,
    "kedarnath-delhi": 450,
    "delhi-manali": 530,
    "manali-delhi": 530,
    "chandigarh-manali": 300,
    "manali-chandigarh": 300,
    "delhi-lucknow": 535,
    "lucknow-delhi": 535,
    "delhi-udaipur": 660,
    "udaipur-delhi": 660,
    "jaipur-udaipur": 395,
    "udaipur-jaipur": 395,
    "jaipur-agra": 240,
    "agra-jaipur": 240,
    "mumbai-pune": 150,
    "pune-mumbai": 150,
    "mumbai-shirdi": 240,
    "shirdi-mumbai": 240,
    "mumbai-nashik": 165,
    "nashik-mumbai": 165,
    "mumbai-goa": 590,
    "goa-mumbai": 590,
    "pune-goa": 445,
    "goa-pune": 445,
    "pune-shirdi": 200,
    "shirdi-pune": 200,
    "bengaluru-mysuru": 145,
    "mysuru-bengaluru": 145,
    "bengaluru-coorg": 250,
    "coorg-bengaluru": 250,
    "bengaluru-ooty": 275,
    "ooty-bengaluru": 275,
    "bengaluru-chennai": 345,
    "chennai-bengaluru": 345,
    "chennai-pondicherry": 150,
    "pondicherry-chennai": 150,
    "hyderabad-vijayawada": 275,
    "vijayawada-hyderabad": 275,
    "hyderabad-warangal": 150,
    "warangal-hyderabad": 150,
    "ahmedabad-surat": 265,
    "surat-ahmedabad": 265,
    "ahmedabad-vadodara": 110,
    "vadodara-ahmedabad": 110,
    "kolkata-digha": 185,
    "digha-kolkata": 185,
    "kolkata-mandarmani": 170,
    "mandarmani-kolkata": 170,
    "manohar international airport-candolim": 38,
    "candolim-manohar international airport": 38,
    "gox-candolim": 38,
    "candolim-gox": 38
  };

  /**
   * Helper to normalize city names for clean lookups.
   */
  function normalizeCityName(name) {
    if (!name) return "";
    return name.toLowerCase()
      .replace(/[,.-]/g, " ")
      .trim();
  }

  let _citySearchModule = null;
  try {
    if (typeof require !== "undefined") {
      _citySearchModule = require('./city-search');
    }
  } catch (e) {}

  /**
   * Calculates approximate road distance using Haversine distance * road factor (1.28x)
   */
  function estimateDistanceByCoordinates(origin, destination) {
    let c1 = null;
    let c2 = null;

    const cs = (typeof CitySearch !== "undefined" && CitySearch) || (typeof window !== "undefined" && window.CitySearch) || (typeof global !== "undefined" && global.CitySearch) || _citySearchModule;
    if (cs && typeof cs.getCityByName === "function") {
      const city1 = cs.getCityByName(origin);
      const city2 = cs.getCityByName(destination);
      if (city1 && city1.latitude && city1.longitude) {
        c1 = { lat: city1.latitude, lng: city1.longitude };
      }
      if (city2 && city2.latitude && city2.longitude) {
        c2 = { lat: city2.latitude, lng: city2.longitude };
      }
    }

    if (!c1 || !c2) {
      return 220; // Sensible default fallback
    }

    const R = 6371; // Earth radius in KM
    const dLat = (c2.lat - c1.lat) * (Math.PI / 180);
    const dLng = (c2.lng - c1.lng) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(c1.lat * (Math.PI / 180)) *
      Math.cos(c2.lat * (Math.PI / 180)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightKm = R * c;

    // Road factor: Indian highway routes average 1.28x of straight-line distance
    const roadKm = Math.round(straightKm * 1.28);
    return Math.max(30, roadKm);
  }

  /**
   * Formats estimated duration into human-readable hours and minutes.
   * Assumes average intercity highway speed of 55 km/h + 20 min buffer.
   */
  function formatDuration(distanceKm) {
    const totalMinutes = Math.round((distanceKm / 55) * 60) + 15;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    if (hours === 0) return `${mins} mins`;
    if (mins === 0) return `${hours} hrs`;
    return `${hours} hrs ${mins} mins`;
  }

  /**
   * Primary Road Distance Calculation Abstraction.
   * @param {string} origin
   * @param {string} destination
   * @param {string} serviceType
   * @returns {Promise<object>}
   */
  async function calculateRoadDistance(origin, destination, serviceType = "oneway") {
    const origClean = (origin || "").trim();
    const destClean = (destination || "").trim();

    if (!origClean) {
      throw new Error("Origin pickup location is required.");
    }

    // Handle Local Sightseeing
    if (serviceType === "local") {
      return {
        distanceKm: 80,
        durationMinutes: 480,
        duration: "8 hrs package",
        origin: origClean,
        destination: "Local City Tour",
        isLiveApi: false
      };
    }

    // Handle Airport Transfer
    if (serviceType === "airport") {
      const isGOX = origClean.toLowerCase().includes("manohar") || origClean.toLowerCase().includes("gox") || (destClean && (destClean.toLowerCase().includes("manohar") || destClean.toLowerCase().includes("gox")));
      const dist = isGOX ? 38 : 35;
      return {
        distanceKm: dist,
        durationMinutes: 75,
        duration: "1 hr 15 mins",
        origin: origClean,
        destination: destClean || "Airport Terminal",
        isLiveApi: false
      };
    }

    if (!destClean) {
      throw new Error("Drop location is required for intercity trips.");
    }

    // 1. Google Maps Routes API if configured
    if (typeof window !== "undefined" && window.MargDriveConfig && window.MargDriveConfig.googleMapsApiKey && typeof google !== "undefined" && google.maps) {
      try {
        const matrixService = new google.maps.DistanceMatrixService();
        const response = await new Promise((resolve, reject) => {
          matrixService.getDistanceMatrix({
            origins: [origClean],
            destinations: [destClean],
            travelMode: google.maps.TravelMode.DRIVING,
            unitSystem: google.maps.UnitSystem.METRIC,
          }, (res, status) => {
            if (status === "OK") resolve(res);
            else reject(new Error(`Google Maps API error: ${status}`));
          });
        });

        if (response.rows && response.rows[0] && response.rows[0].elements[0] && response.rows[0].elements[0].status === "OK") {
          const element = response.rows[0].elements[0];
          const distKm = Math.round(element.distance.value / 1000);
          const durationMins = Math.round(element.duration.value / 60);
          return {
            distanceKm: distKm,
            durationMinutes: durationMins,
            duration: element.duration.text,
            origin: response.originAddresses[0] || origClean,
            destination: response.destinationAddresses[0] || destClean,
            isLiveApi: true
          };
        }
      } catch (err) {
        console.warn("Google Maps Distance API call failed, falling back to local matrix:", err);
      }
    }

    // 2. Matrix Lookup
    const normOrig = normalizeCityName(origClean);
    const normDest = normalizeCityName(destClean);
    const key1 = `${normOrig}-${normDest}`;
    const key2 = `${origClean.toLowerCase().replace(/ delhi/g, '')}-${destClean.toLowerCase().replace(/ delhi/g, '')}`;

    let distanceKm = DISTANCE_MATRIX[key1] || DISTANCE_MATRIX[key2];

    if (!distanceKm) {
      // 3. Coordinate Estimation Fallback
      distanceKm = estimateDistanceByCoordinates(origClean, destClean);
    }

    const duration = formatDuration(distanceKm);
    const totalMinutes = Math.round((distanceKm / 55) * 60) + 15;

    return {
      distanceKm: distanceKm,
      durationMinutes: totalMinutes,
      duration: duration,
      origin: origClean,
      destination: destClean,
      isLiveApi: false,
      isFallback: true
    };
  }

  // Alias calculateDistance to calculateRoadDistance
  const calculateDistance = calculateRoadDistance;

  return {
    calculateRoadDistance,
    calculateDistance,
    formatDuration,
    estimateDistanceByCoordinates,
    DISTANCE_MATRIX
  };
})();

if (typeof window !== "undefined") {
  window.DistanceService = DistanceService;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = DistanceService;
}