/**
 * Marg Drive — All-India City Search & Autocomplete Engine (city-search.js)
 */
const CitySearch = (() => {
  let citiesCache = [];
  let isLoaded = false;

  try {
    if (typeof __dirname !== "undefined") {
      const fs = require('fs');
      const path = require('path');
      const p = path.join(__dirname, '..', 'data', 'india-cities.json');
      if (fs.existsSync(p)) {
        citiesCache = JSON.parse(fs.readFileSync(p, 'utf8'));
        isLoaded = true;
      }
    }
  } catch (e) {}

  async function init() {
    if (isLoaded && citiesCache.length > 0) return citiesCache;
    const paths = ["assets/data/india-cities.json", "/assets/data/india-cities.json", "../assets/data/india-cities.json"];
    for (const p of paths) {
      try {
        if (typeof fetch !== "undefined") {
          const res = await fetch(p);
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              citiesCache = data;
              isLoaded = true;
              return citiesCache;
            }
          }
        }
      } catch (e) {}
    }
    return citiesCache;
  }

  if (typeof window !== "undefined") {
    init();
  }

  function searchCities(query, maxResults = 8) {
    if (!query || typeof query !== "string") return [];
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];

    const exactMatches = [];
    const prefixMatches = [];
    const aliasMatches = [];
    const stateMatches = [];
    const seenNames = new Set();

    for (const city of citiesCache) {
      const cityNameLower = (city.name || "").toLowerCase();
      const stateLower = (city.state || "").toLowerCase();
      const aliasesLower = (city.aliases || []).map(a => a.toLowerCase());

      if (cityNameLower === q) {
        if (!seenNames.has(city.name)) {
          exactMatches.push(city);
          seenNames.add(city.name);
        }
      } else if (cityNameLower.startsWith(q)) {
        if (!seenNames.has(city.name)) {
          prefixMatches.push(city);
          seenNames.add(city.name);
        }
      } else if (aliasesLower.some(a => a.startsWith(q) || a.includes(q))) {
        if (!seenNames.has(city.name)) {
          aliasMatches.push(city);
          seenNames.add(city.name);
        }
      } else if (cityNameLower.includes(q) || stateLower.includes(q)) {
        if (!seenNames.has(city.name)) {
          stateMatches.push(city);
          seenNames.add(city.name);
        }
      }
    }

    return [...exactMatches, ...prefixMatches, ...aliasMatches, ...stateMatches].slice(0, maxResults);
  }

  function getCityByName(cityName) {
    if (!cityName) return null;
    const nameLower = cityName.trim().toLowerCase();
    for (const city of citiesCache) {
      if ((city.name || "").toLowerCase() === nameLower) return city;
    }
    for (const city of citiesCache) {
      if ((city.aliases || []).some(a => a.toLowerCase() === nameLower)) return city;
    }
    for (const city of citiesCache) {
      if ((city.name || "").toLowerCase().includes(nameLower) || nameLower.includes((city.name || "").toLowerCase())) return city;
    }
    return null;
  }

  function attachAutocomplete(inputEl, onSelect) {
    if (!inputEl) return;

    let dropdown = inputEl.parentElement.querySelector(".city-autocomplete-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "city-autocomplete-dropdown";
      dropdown.style.cssText = "position:absolute; top:calc(100% + 4px); left:0; right:0; background:#ffffff; border:1.5px solid #CBD5E1; border-radius:10px; box-shadow:0 12px 30px rgba(0,0,0,0.15); max-height:280px; overflow-y:auto; z-index:99999; display:none;";
      inputEl.parentElement.style.position = "relative";
      inputEl.parentElement.appendChild(dropdown);
    }

    let activeIndex = -1;

    function renderSuggestions(results) {
      if (!results || results.length === 0) {
        dropdown.innerHTML = "";
        dropdown.style.display = "none";
        activeIndex = -1;
        return;
      }

      dropdown.innerHTML = results.map((city, idx) => {
        const terrainBadge = city.terrainCategory === "HIGH_ALTITUDE" ? '<span style="font-size:0.72rem; background:#FEF3C7; color:#B45309; padding:2px 7px; border-radius:10px; font-weight:700;">⛰️ Hill / Dham</span>' : (city.terrainCategory === "AIRPORT_HUB" ? '<span style="font-size:0.72rem; background:#E0F2FE; color:#0369A1; padding:2px 7px; border-radius:10px; font-weight:700;">✈️ Airport</span>' : "");
        return '<div class="city-suggest-item" data-index="' + idx + '" style="padding:11px 14px; cursor:pointer; border-bottom:1px solid #F1F5F9; display:flex; justify-content:space-between; align-items:center; transition:background 0.15s;">' +
          '<div><div style="font-weight:700; color:#0F172A; font-size:0.95rem;">' + city.name + '</div>' +
          '<div style="font-size:0.78rem; color:#64748B;">' + (city.state || "") + ' (' + (city.region || "") + ' India)</div></div>' +
          terrainBadge + '</div>';
      }).join("");

      dropdown.style.display = "block";
      activeIndex = -1;

      dropdown.querySelectorAll(".city-suggest-item").forEach((item, idx) => {
        item.addEventListener("mouseenter", () => highlightItem(idx));
        item.addEventListener("mousedown", (e) => {
          e.preventDefault();
          selectCity(results[idx]);
        });
      });
    }

    function highlightItem(index) {
      const items = dropdown.querySelectorAll(".city-suggest-item");
      items.forEach((it, i) => {
        it.style.background = (i === index) ? "#F1F5F9" : "#FFFFFF";
      });
      activeIndex = index;
    }

    function selectCity(city) {
      inputEl.value = city.name;
      dropdown.style.display = "none";
      activeIndex = -1;
      inputEl.dispatchEvent(new Event("input", { bubbles: true }));
      inputEl.dispatchEvent(new Event("change", { bubbles: true }));
      if (typeof onSelect === "function") {
        onSelect(city);
      }
    }

    async function handleInputSearch() {
      if (!isLoaded || citiesCache.length === 0) {
        await init();
      }
      const val = inputEl.value;
      if (val.trim().length >= 1) {
        const results = searchCities(val);
        renderSuggestions(results);
      } else {
        const topResults = searchCities("del", 6);
        renderSuggestions(topResults);
      }
    }

    inputEl.addEventListener("input", handleInputSearch);
    inputEl.addEventListener("focus", handleInputSearch);

    inputEl.addEventListener("keydown", (e) => {
      const items = dropdown.querySelectorAll(".city-suggest-item");
      if (dropdown.style.display === "block" && items.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
          highlightItem(next);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
          highlightItem(prev);
        } else if (e.key === "Enter") {
          if (activeIndex >= 0 && activeIndex < items.length) {
            e.preventDefault();
            const val = inputEl.value;
            const results = val.trim().length >= 1 ? searchCities(val) : searchCities("del", 6);
            if (results[activeIndex]) {
              selectCity(results[activeIndex]);
            }
          }
        } else if (e.key === "Escape") {
          dropdown.style.display = "none";
        }
      }
    });

    inputEl.addEventListener("blur", () => {
      setTimeout(() => {
        dropdown.style.display = "none";
      }, 250);
    });
  }

  return {
    init,
    searchCities,
    getCityByName,
    attachAutocomplete,
    getCachedCities: () => citiesCache
  };
})();

if (typeof window !== "undefined") {
  window.CitySearch = CitySearch;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = CitySearch;
}