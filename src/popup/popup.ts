import {
  calculatePrayerTimes,
  PrayerTimeCalculator,
  suggestMethodForLocation,
} from "@masaajid/prayer-times";

// Types
interface LocationData {
  latitude: number;
  longitude: number;
  city?: string;
  country?: string;
  timezone?: string;
}

interface PrayerTimesResult {
  times: any;
  tomorrowTimes: any;
  location: LocationData;
  method: string;
  madhab: string;
  date: string;
}

interface StoredSettings {
  location?: LocationData;
  calculationMethod?: string;
  madhab?: string;
  prayerTimes?: {
    date: string;
    times: any;
    tomorrowTimes: any;
    calculatedAt: string;
  };
}

// DOM Elements
const addressInput = document.getElementById("address") as HTMLInputElement;
const searchAddressBtn = document.getElementById("search-address") as HTMLButtonElement;
const useCurrentLocationBtn = document.getElementById("use-current-location") as HTMLButtonElement;
const latitudeInput = document.getElementById("latitude") as HTMLInputElement;
const longitudeInput = document.getElementById("longitude") as HTMLInputElement;
const coordsSection = document.getElementById("coords-section") as HTMLElement;
const calculationMethodSelect = document.getElementById("calculation-method") as HTMLSelectElement;
const madhabSelect = document.getElementById("madhab") as HTMLSelectElement;
const calculateBtn = document.getElementById("calculate") as HTMLButtonElement;

// Sections
const locationSection = document.getElementById("location-section") as HTMLElement;
const resultsSection = document.getElementById("results-section") as HTMLElement;
const errorSection = document.getElementById("error-section") as HTMLElement;
const loadingSection = document.getElementById("loading-section") as HTMLElement;

// Results elements
const locationDisplay = document.getElementById("location-display") as HTMLElement;
const dateDisplay = document.getElementById("date-display") as HTMLElement;
const countdownTimer = document.getElementById("countdown-timer") as HTMLElement;
const calculationInfo = document.getElementById("calculation-info") as HTMLElement;
const prayerTimesGrid = document.getElementById("prayer-times") as HTMLElement;
const errorMessage = document.getElementById("error-message") as HTMLElement;

// Action buttons
const showLocationBtn = document.getElementById("show-location") as HTMLButtonElement;
const refreshTimesBtn = document.getElementById("refresh-times") as HTMLButtonElement;
const retryCalculationBtn = document.getElementById("retry-calculation") as HTMLButtonElement;

// State
let currentLocation: LocationData | null = null;
let currentResults: PrayerTimesResult | null = null;
let countdownInterval: number | null = null;

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "REFRESH_PRAYER_TIMES") {
    // Refresh prayer times when requested by background script
    if (currentLocation) {
      calculateAndDisplayTimes();
    }
  }
});

async function initializeApp() {
  try {
    // Load saved settings
    const settings = await loadSettings();

    // Apply settings to form elements first
    if (settings.calculationMethod) {
      calculationMethodSelect.value = settings.calculationMethod;
    }

    if (settings.madhab) {
      madhabSelect.value = settings.madhab;
    }

    if (settings.location) {
      currentLocation = settings.location;
      populateLocationInputs(currentLocation);

      // Show location in header
      if (currentLocation.city && currentLocation.country) {
        locationDisplay.textContent = `${currentLocation.city}, ${currentLocation.country}`;
      } else {
        locationDisplay.textContent = `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
      }

      // Always calculate fresh prayer times when popup opens
      calculateAndDisplayTimes();
    } else {
      showSection("location");
    }

    // Add event listeners
    setupEventListeners();
  } catch (error) {
    console.error("Failed to initialize app:", error);
    showError("Failed to initialize the application. Please try refreshing.");
  }
}

function setupEventListeners() {
  // Location search
  searchAddressBtn.addEventListener("click", handleAddressSearch);
  addressInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleAddressSearch();
    }
  });

  // Current location
  useCurrentLocationBtn.addEventListener("click", handleUseCurrentLocation);

  // Coordinate inputs
  latitudeInput.addEventListener("input", handleCoordinateInput);
  longitudeInput.addEventListener("input", handleCoordinateInput);

  // Calculate button
  calculateBtn.addEventListener("click", handleCalculate);

  // Action buttons
  showLocationBtn.addEventListener("click", () => showSection("location"));
  refreshTimesBtn.addEventListener("click", () => calculateAndDisplayTimes());
  retryCalculationBtn.addEventListener("click", () => showSection("location"));

  // Settings changes
  calculationMethodSelect.addEventListener("change", saveCurrentSettings);
  madhabSelect.addEventListener("change", saveCurrentSettings);
}

async function handleAddressSearch() {
  const address = addressInput.value.trim();
  if (!address) {
    showError("Please enter a location to search.");
    return;
  }

  // Update button to show searching state
  searchAddressBtn.textContent = "🔍 Searching...";
  searchAddressBtn.disabled = true;

  try {
    const location = await geocodeAddress(address);
    currentLocation = location;
    populateLocationInputs(location);
    await saveCurrentSettings();

    // Get recommended calculation method for this location (like web version)
    try {
      const { suggestMethodForLocation } = await import("@masaajid/prayer-times");
      const recommendation = suggestMethodForLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (recommendation && recommendation.recommended) {
        calculationMethodSelect.value = recommendation.recommended;
        await saveCurrentSettings();
      }
    } catch (error) {
      console.warn("Method suggestion failed:", error);
    }

    // Success feedback with location name (like web version)
    const locationName = location.city || location.country || "Location";
    searchAddressBtn.textContent = "✅ Found";

    // Show location in header
    if (location.city && location.country) {
      locationDisplay.textContent = `${location.city}, ${location.country}`;
    } else {
      locationDisplay.textContent = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }

    setTimeout(() => {
      searchAddressBtn.textContent = "🔍 Search";
      searchAddressBtn.disabled = false;
    }, 1500);

    // Don't auto-calculate - user needs to click Calculate button
  } catch (error) {
    console.error("Geocoding failed:", error);
    showError("Failed to find location. Please try a different search term or enter coordinates manually.");
    searchAddressBtn.textContent = "🔍 Search";
    searchAddressBtn.disabled = false;
  }
}

async function handleUseCurrentLocation() {
  // Update button to show loading state
  useCurrentLocationBtn.textContent = "📍 Getting location...";
  useCurrentLocationBtn.disabled = true;

  try {
    const position = await getCurrentPosition();
    const location: LocationData = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };

    // Try to reverse geocode to get city/country
    try {
      const reverseLocation = await reverseGeocode(location.latitude, location.longitude);
      location.city = reverseLocation.city;
      location.country = reverseLocation.country;
      location.timezone = reverseLocation.timezone;
    } catch (error) {
      console.warn("Reverse geocoding failed:", error);
    }

    currentLocation = location;
    populateLocationInputs(location);
    await saveCurrentSettings();

    // Get recommended calculation method for this location (like web version)
    try {
      const { suggestMethodForLocation } = await import("@masaajid/prayer-times");
      const recommendation = suggestMethodForLocation({
        latitude: location.latitude,
        longitude: location.longitude,
      });

      if (recommendation && recommendation.recommended) {
        calculationMethodSelect.value = recommendation.recommended;
        await saveCurrentSettings();
      }
    } catch (error) {
      console.warn("Method suggestion failed:", error);
    }

    // Success feedback
    useCurrentLocationBtn.textContent = "✅ Location found";

    // Show location in header
    if (location.city && location.country) {
      locationDisplay.textContent = `${location.city}, ${location.country}`;
    } else {
      locationDisplay.textContent = `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }

    setTimeout(() => {
      useCurrentLocationBtn.textContent = "📍 Use Current Location";
      useCurrentLocationBtn.disabled = false;
    }, 1500);

    // Don't auto-calculate - user needs to click Calculate button
  } catch (error) {
    console.error("Geolocation failed:", error);
    showError("Failed to get current location. Please enable location access or enter coordinates manually.");
    useCurrentLocationBtn.textContent = "📍 Use Current Location";
    useCurrentLocationBtn.disabled = false;
  }
}

function handleCoordinateInput() {
  const lat = parseFloat(latitudeInput.value);
  const lng = parseFloat(longitudeInput.value);

  if (!isNaN(lat) && !isNaN(lng)) {
    currentLocation = { latitude: lat, longitude: lng };
  }
}

async function handleCalculate() {
  if (!currentLocation) {
    showError("Please select a location first.");
    return;
  }

  await saveCurrentSettings();
  calculateAndDisplayTimes();
}

async function calculateAndDisplayTimes() {
  if (!currentLocation) {
    showError("No location selected.");
    return;
  }

  showSection("loading");

  try {
    const method = calculationMethodSelect.value;
    const madhab = madhabSelect.value;

    // Use current local time, but ensure we're using the correct date
    const today = new Date();

    // Get timezone if not already set
    if (!currentLocation.timezone) {
      currentLocation.timezone = await getTimezoneForLocation(currentLocation.latitude, currentLocation.longitude);
    }

    // Create calculator without date in config, pass date to calculate() method
    const calculator = new PrayerTimeCalculator({
      location: [currentLocation.latitude, currentLocation.longitude],
      method: method as any,
      asrSchool: madhab === "Hanafi" ? "Hanafi" : "Standard",
    });

    // Create UTC date objects that represent local dates
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const tomorrowUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + 1));

    const times = calculator.calculate(todayUTC);
    const tomorrowTimes = calculator.calculate(tomorrowUTC);

    currentResults = {
      times,
      tomorrowTimes,
      location: currentLocation,
      method,
      madhab,
      date: getLocalDateString(today),
    };

    // Store prayer times for future use (notifications, etc.)
    await storePrayerTimes(currentResults);

    // Update extension badge with countdown
    try {
      chrome.runtime.sendMessage({
        type: "UPDATE_BADGE",
        prayerTimes: {
          times: currentResults.times,
          tomorrowTimes: currentResults.tomorrowTimes
        }
      });
    } catch (error) {
      // Badge update failed, not critical
    }

    displayPrayerTimes(currentResults);
    startCountdown();
    showSection("results");
  } catch (error) {
    console.error("Prayer time calculation failed:", error);
    showError("Failed to calculate prayer times. Please check your location and try again.");
  }
}

function displayPrayerTimes(results: PrayerTimesResult) {
  // Update location display
  const locationText = results.location.city && results.location.country
    ? `${results.location.city}, ${results.location.country}`
    : `${results.location.latitude.toFixed(4)}, ${results.location.longitude.toFixed(4)}`;
  locationDisplay.textContent = locationText;

  // Update date display
  const date = new Date(results.date + "T00:00:00");
  dateDisplay.textContent = date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Update calculation info display
  const methodName = getMethodDisplayName(results.method);
  const madhabName = results.madhab === "Hanafi" ? "Hanafi" : "Shafi/Maliki/Hanbali";
  calculationInfo.innerHTML = `
    <strong>Method:</strong> ${methodName}<br>
    <strong>Asr School:</strong> ${madhabName}
  `;

  // Display prayer times
  const times = results.times;
  const prayerNames = [
    { key: "fajr", name: "Fajr", icon: "🌅" },
    { key: "sunrise", name: "Sunrise", icon: "☀️" },
    { key: "dhuhr", name: "Dhuhr", icon: "🌞" },
    { key: "asr", name: "Asr", icon: "🌤️" },
    { key: "maghrib", name: "Maghrib", icon: "🌅" },
    { key: "isha", name: "Isha", icon: "🌙" },
  ];

  const now = new Date();

  // Find the current prayer period (only actual prayers, not sunrise)
  const actualPrayers = [
    { key: "fajr", name: "Fajr", time: times.fajr ? new Date(times.fajr) : null },
    { key: "dhuhr", name: "Dhuhr", time: times.dhuhr ? new Date(times.dhuhr) : null },
    { key: "asr", name: "Asr", time: times.asr ? new Date(times.asr) : null },
    { key: "maghrib", name: "Maghrib", time: times.maghrib ? new Date(times.maghrib) : null },
    { key: "isha", name: "Isha", time: times.isha ? new Date(times.isha) : null },
  ]
    .filter(p => p.time !== null)
    .sort((a, b) => a.time!.getTime() - b.time!.getTime());

  let currentPrayerKey: string | null = null;

  // Find which prayer period we're currently in
  for (let i = 0; i < actualPrayers.length; i++) {
    const prayer = actualPrayers[i];
    const nextPrayer = actualPrayers[i + 1];

    if (now >= prayer.time!) {
      if (!nextPrayer || now < nextPrayer.time!) {
        // We're between this prayer and the next one (or after the last prayer)
        currentPrayerKey = prayer.key;
        break;
      }
    } else {
      // We're before the first prayer of the day - no current prayer yet
      break;
    }
  }

  prayerTimesGrid.innerHTML = "";

  prayerNames.forEach(({ key, name, icon }) => {
    const time = times[key];
    if (time) {
      const card = document.createElement("div");
      card.className = "prayer-time-card";

      // Mark the current prayer period
      if (key === currentPrayerKey) {
        card.classList.add("current");
      }

      card.innerHTML = `
        <div class="prayer-icon">${icon}</div>
        <div class="prayer-name">${name}</div>
        <div class="prayer-time">${formatTime(time)}</div>
      `;

      prayerTimesGrid.appendChild(card);
    }
  });
}

function formatTime(timeString: string): string {
  const time = new Date(timeString);
  return time.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function getMethodDisplayName(methodCode: string): string {
  const methodNames: { [key: string]: string } = {
    MWL: "Muslim World League",
    ISNA: "Islamic Society of North America",
    Egypt: "Egyptian General Authority",
    Karachi: "University of Islamic Sciences, Karachi",
    UmmAlQura: "Umm Al-Qura University, Makkah",
    Dubai: "Dubai",
    Moonsighting: "Moonsighting Committee",
    Qatar: "Qatar",
    Singapore: "Singapore",
    JAKIM: "Jabatan Kemajuan Islam Malaysia",
    JAKIMKN: "Jabatan Kemajuan Islam Malaysia (Kelantan)",
    Kemenag: "Kementerian Agama, Indonesia",
    Tehran: "Institute of Geophysics, University of Tehran",
    Turkey: "Turkey Diyanet",
    France12: "France (12°)",
    France15: "France (15°)",
    France18: "France (18°)",
    Russia: "Russia",
  };

  return methodNames[methodCode] || methodCode;
}

function startCountdown() {
  // Clear any existing interval
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  updateCountdown();
  // Update every minute - but use a shorter interval to ensure it works
  countdownInterval = setInterval(() => {
    updateCountdown();
  }, 15000); // 15 seconds

  // Also add a visibility change listener to restart timer when popup becomes visible
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      updateCountdown(); // Update immediately when popup becomes visible
    }
  });
}

function updateCountdown() {
  if (!currentResults) return;

  const now = new Date();
  const times = currentResults.times;

  // Get all prayer times in order (excluding sunrise - it's not a prayer)
  const prayerTimes = [
    { name: "Fajr", time: new Date(times.fajr), key: "fajr" },
    { name: "Dhuhr", time: new Date(times.dhuhr), key: "dhuhr" },
    { name: "Asr", time: new Date(times.asr), key: "asr" },
    { name: "Maghrib", time: new Date(times.maghrib), key: "maghrib" },
    { name: "Isha", time: new Date(times.isha), key: "isha" },
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  // Find next prayer
  let nextPrayer = null;
  for (const prayer of prayerTimes) {
    if (now < prayer.time) {
      nextPrayer = prayer;
      break;
    }
  }

  // If no prayer found today, use tomorrow's Fajr (already calculated)
  if (!nextPrayer) {
    const tomorrowFajr = new Date(currentResults.tomorrowTimes.fajr);

    // Calculate time difference to tomorrow's Fajr
    const timeDiff = tomorrowFajr.getTime() - now.getTime();
    const hours = Math.floor(timeDiff / (1000 * 60 * 60));
    const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

    let timeString = "";
    if (hours > 0) {
      timeString = `${hours}h ${minutes}m`;
    } else {
      timeString = `${minutes}m`;
    }

    countdownTimer.innerHTML = `Time until Fajr: <span class="time-left">${timeString}</span>`;
    return;
  }

  // Calculate time difference
  const timeDiff = nextPrayer.time.getTime() - now.getTime();
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

  // Format countdown
  let timeString = "";
  if (hours > 0) {
    timeString = `${hours}h ${minutes}m`;
  } else {
    timeString = `${minutes}m`;
  }

  countdownTimer.innerHTML = `Time until ${nextPrayer.name}: <span class="time-left">${timeString}</span>`;
}

function showSection(section: "location" | "results" | "error" | "loading") {
  // Clear countdown when not showing results
  if (section !== "results" && countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }

  locationSection.style.display = section === "location" ? "block" : "none";
  resultsSection.style.display = section === "results" ? "block" : "none";
  errorSection.style.display = section === "error" ? "block" : "none";
  loadingSection.style.display = section === "loading" ? "block" : "none";
}

function showError(message: string) {
  errorMessage.textContent = message;
  showSection("error");
}

function populateLocationInputs(location: LocationData) {
  latitudeInput.value = location.latitude.toString();
  longitudeInput.value = location.longitude.toString();

  if (location.city && location.country) {
    addressInput.value = `${location.city}, ${location.country}`;
  }

  coordsSection.style.display = "block";
}

// Geocoding functions
async function geocodeAddress(address: string): Promise<LocationData> {
  try {
    // Try background script first
    return await geocodeViaBackground(address);
  } catch (error) {
    // Fallback to direct geocoding
    return await geocodeDirect(address);
  }
}

async function geocodeViaBackground(address: string): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Background script timeout"));
    }, 10000); // 10 second timeout

    chrome.runtime.sendMessage(
      { type: "GEOCODE_ADDRESS", address },
      (response) => {
        clearTimeout(timeout);

        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.error) {
          reject(new Error(response.error));
        } else if (response) {
          resolve({
            latitude: response.latitude,
            longitude: response.longitude,
            city: response.city,
            country: response.country,
            timezone: getLocalTimezone(),
          });
        } else {
          reject(new Error("No response from background script"));
        }
      }
    );
  });
}

async function geocodeDirect(address: string): Promise<LocationData> {

  const encodedAddress = encodeURIComponent(address);
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "PrayerTimesCalculator/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (data && data.length > 0) {
    const result = data[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      city: result.address?.city || result.address?.town || result.address?.village || result.display_name.split(",")[0],
      country: result.address?.country || result.display_name.split(",").pop()?.trim(),
      timezone: getLocalTimezone(),
    };
  }

  throw new Error("No results found for this location");
}

async function reverseGeocode(lat: number, lng: number): Promise<LocationData> {
  // Using background script for reverse geocoding
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "REVERSE_GEOCODE", lat, lng },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        if (response && response.error) {
          reject(new Error(response.error));
        } else if (response) {
          resolve({
            latitude: response.latitude,
            longitude: response.longitude,
            city: response.city,
            country: response.country,
            timezone: getLocalTimezone(),
          });
        } else {
          reject(new Error("No response from background script"));
        }
      }
    );
  });
}

async function getTimezoneForLocation(lat: number, lng: number): Promise<string> {
  try {
    // Using background script for timezone detection
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: "GET_TIMEZONE", lat, lng },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve(getLocalTimezone());
            return;
          }
          resolve((response && response.timezone) ? response.timezone : getLocalTimezone());
        }
      );
    });
  } catch (error) {
    // Failed to get timezone, using local
    return getLocalTimezone();
  }
}

function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    return "UTC";
  }
}

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000, // 5 minutes
    });
  });
}

// Chrome storage functions
async function loadSettings(): Promise<StoredSettings> {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['location', 'calculationMethod', 'madhab', 'prayerTimes'], (result) => {
      resolve({
        location: result.location,
        calculationMethod: result.calculationMethod || 'MWL',
        madhab: result.madhab || 'Shafi',
        prayerTimes: result.prayerTimes,
      });
    });
  });
}

async function saveCurrentSettings(): Promise<void> {
  const settings: StoredSettings = {
    location: currentLocation || undefined,
    calculationMethod: calculationMethodSelect.value,
    madhab: madhabSelect.value,
  };

  return new Promise((resolve) => {
    chrome.storage.sync.set(settings, resolve);
  });
}

async function storePrayerTimes(results: PrayerTimesResult): Promise<void> {
  // Convert Date objects to ISO strings for proper storage
  const prayerTimesData = {
    date: results.date,
    times: convertDatesToStrings(results.times),
    tomorrowTimes: convertDatesToStrings(results.tomorrowTimes),
    calculatedAt: new Date().toISOString(),
  };


  return new Promise((resolve) => {
    chrome.storage.sync.set({ prayerTimes: prayerTimesData }, resolve);
  });
}

function convertDatesToStrings(prayerTimes: any): any {
  if (!prayerTimes) return prayerTimes;

  const converted: any = {};
  for (const [key, value] of Object.entries(prayerTimes)) {
    if (value instanceof Date) {
      converted[key] = value.toISOString();
    } else {
      converted[key] = value;
    }
  }
  return converted;
}

function reconstructDateObjects(prayerTimes: any): any {
  if (!prayerTimes) return prayerTimes;

  const reconstructed: any = {};
  for (const [key, value] of Object.entries(prayerTimes)) {
    if (typeof value === 'string' && value.includes('T')) {
      // This looks like an ISO date string, convert it back to Date
      reconstructed[key] = new Date(value);
    } else {
      reconstructed[key] = value;
    }
  }
  return reconstructed;
}

function getLocalDateString(date: Date): string {
  // Get local date string in YYYY-MM-DD format (not UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}