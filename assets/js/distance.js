/**
 * MargDrive — Distance & Route Calculation Module
 * 
 * Abstraction layer for calculating real driving distances between Indian cities.
 * Integrates with Google Routes API / Google Distance Matrix when configured,
 * and provides a comprehensive Indian intercity distance matrix + intelligent
 * geographical routing fallback for development and offline operation.
 */

const DistanceService = (() => {
  // Built-in Indian Intercity Road Distance Matrix (in KM)
  // Curated road distances between prominent hubs across India
  const DISTANCE_MATRIX = {
    "delhi-chandigarh": 250,
    "chandigarh-delhi": 250,
    "delhi-jaipur": 280,
    "jaipur-delhi": 280,
    "delhi-agra": 210,
    "agra-delhi": 210,
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
    "mandarmani-kolkata": 170
  };

  // Indian Hub Coordinates for Geodesic Estimation Fallback
  const CITY_COORDINATES = {
    "delhi": { lat: 28.6139, lng: 77.2090 },
    "new delhi": { lat: 28.6139, lng: 77.2090 },
    "noida": { lat: 28.5355, lng: 77.3910 },
    "gurgaon": { lat: 28.4595, lng: 77.0266 },
    "gurugram": { lat: 28.4595, lng: 77.0266 },
    "chandigarh": { lat: 30.7333, lng: 76.7794 },
    "amritsar": { lat: 31.6340, lng: 74.8723 },
    "jaipur": { lat: 26.9124, lng: 75.7873 },
    "agra": { lat: 27.1767, lng: 78.0081 },
    "shimla": { lat: 31.1048, lng: 77.1734 },
    "manali": { lat: 32.2432, lng: 77.1892 },
    "dehradun": { lat: 30.3165, lng: 78.0322 },
    "haridwar": { lat: 29.9457, lng: 78.1642 },
    "rishikesh": { lat: 30.0869, lng: 78.2676 },
    "lucknow": { lat: 26.8467, lng: 80.9462 },
    "kanpur": { lat: 26.4499, lng: 80.3319 },
    "varanasi": { lat: 25.3176, lng: 82.9739 },
    "mumbai": { lat: 19.0760, lng: 72.8777 },
    "pune": { lat: 18.5204, lng: 73.8567 },
    "nashik": { lat: 19.9975, lng: 73.7898 },
    "shirdi": { lat: 19.7667, lng: 74.4770 },
    "goa": { lat: 15.2993, lng: 74.1240 },
    "bengaluru": { lat: 12.9716, lng: 77.5946 },
    "bangalore": { lat: 12.9716, lng: 77.5946 },
    "mysuru": { lat: 12.2958, lng: 76.6394 },
    "mysore": { lat: 12.2958, lng: 76.6394 },
    "chennai": { lat: 13.0827, lng: 80.2707 },
    "hyderabad": { lat: 17.3850, lng: 78.4867 },
    "kolkata": { lat: 22.5726, lng: 88.3639 },
    "ahmedabad": { lat: 23.0225, lng: 72.5714 },
    "surat": { lat: 21.1702, lng: 72.8311 },
    "patna": { lat: 25.5941, lng: 85.1376 },
    "bhopal": { lat: 23.2599, lng: 77.4126 },
    "indore": { lat: 22.7196, lng: 75.8577 },
    "jodhpur": { lat: 26.2389, lng: 73.0243 },
    "udaipur": { lat: 24.5854, lng: 73.7125 },
    "cochin": { lat: 9.9312, lng: 76.2673 },
    "kochi": { lat: 9.9312, lng: 76.2673 },
    "trivandrum": { lat: 8.5241, lng: 76.9366 }
  };

  /**
   * Helper to normalize city names for clean lookups.
   */
  function normalizeCityName(name) {
    if (!name) return "";
    return name.toLowerCase()
      .replace(/[,.-]/g, " ")
      .split(" ")
      .filter(Boolean)[0] || "";
  }

  /**
   * Calculates approximate road distance using Haversine distance * road tortuosity factor (1.28x)
   */
  function estimateDistanceByCoordinates(origin, destination) {
    const origNorm = normalizeCityName(origin);
    const destNorm = normalizeCityName(destination);
    const c1 = CITY_COORDINATES[origNorm];
    const c2 = CITY_COORDINATES[destNorm];

    if (!c1 || !c2) {
      // Default standard intercity trip fallback when unknown custom locations are provided
      return 220;
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
   * Primary Distance Calculation Abstraction.
   * 
   * Returns:
   * {
   *   distanceKm: number,
   *   duration: string,
   *   origin: string,
   *   destination: string,
   *   isLiveApi: boolean
   * }
   * 
   * @param {string} origin
   * @param {string} destination
   * @param {string} serviceType
   * @returns {Promise<object>}
   */
  async function calculateDistance(origin, destination, serviceType = "oneway") {
    const origClean = (origin || "").trim();
    const destClean = (destination || "").trim();

    if (!origClean) {
      throw new Error("Origin pickup location is required.");
    }

    // Handle Local Sightseeing
    if (serviceType === "local") {
      return {
        distanceKm: 80,
        duration: "8 hrs package",
        origin: origClean,
        destination: "Local City Tour",
        isLiveApi: false
      };
    }

    // Handle Airport Transfer
    if (serviceType === "airport") {
      return {
        distanceKm: 35,
        duration: "1 hr 15 mins",
        origin: origClean,
        destination: destClean || "Airport Terminal",
        isLiveApi: false
      };
    }

    if (!destClean) {
      throw new Error("Drop location is required for intercity trips.");
    }

    // 1. Check if Google Maps API Key is configured for real live routing
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
          return {
            distanceKm: distKm,
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
    const key = `${normalizeCityName(origClean)}-${normalizeCityName(destClean)}`;
    let distanceKm = DISTANCE_MATRIX[key];

    if (!distanceKm) {
      // 3. Coordinate Estimation Fallback
      distanceKm = estimateDistanceByCoordinates(origClean, destClean);
    }

    const duration = formatDuration(distanceKm);

    return {
      distanceKm: distanceKm,
      duration: duration,
      origin: origClean,
      destination: destClean,
      isLiveApi: false,
      isFallback: true
    };
  }

  return {
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
