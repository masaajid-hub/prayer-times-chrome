// Background service worker for Prayer Times Chrome Extension

// Extension installation handler
chrome.runtime.onInstalled.addListener((details) => {

  // Set default settings on first install
  if (details.reason === "install") {
    chrome.storage.sync.set({
      calculationMethod: "MWL",
      madhab: "Shafi",
      notificationsEnabled: false,
    });
  }

  // Start badge updates immediately
  startPeriodicUpdates();
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
  startPeriodicUpdates();
});

// Message handling from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  switch (message.type) {
    case "GET_TIMEZONE":
      handleGetTimezone(message.lat, message.lng)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });
      return true; // Indicates async response

    case "GEOCODE_ADDRESS":
      handleGeocodeAddress(message.address)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });
      return true;

    case "REVERSE_GEOCODE":
      handleReverseGeocode(message.lat, message.lng)
        .then((result) => {
          sendResponse(result);
        })
        .catch((error) => {
          sendResponse({ error: error.message });
        });
      return true;

    case "UPDATE_BADGE":
      // Update badge when popup calculates new prayer times
      if (message.prayerTimes) {
        updateBadge(message.prayerTimes);
        // Sync alarm timing with popup timer
        syncAlarmWithPopup();
      }
      sendResponse({ success: true });
      return true;

    default:
      sendResponse({ error: "Unknown message type" });
      break;
  }
});

// Timezone detection helper
async function handleGetTimezone(lat: number, lng: number): Promise<any> {
  try {
    // Use a more reliable timezone detection method
    // This uses the browser's Intl API as a fallback
    const date = new Date();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // For better accuracy, you could use a timezone API service
    // For now, return the browser's detected timezone
    return { timezone: timeZone };
  } catch (error) {
    return { timezone: "UTC" };
  }
}

// Geocoding helper using a free service
async function handleGeocodeAddress(address: string): Promise<any> {
  try {
    // Use Nominatim (OpenStreetMap) geocoding service - free and no API key required
    // Matches exactly the web version implementation
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
        display_name: result.display_name,
        city: result.address?.city || result.address?.town || result.address?.village || result.display_name.split(",")[0],
        country: result.address?.country || result.display_name.split(",").pop()?.trim(),
      };
    }

    throw new Error("No results found for this location");
  } catch (error) {
    throw error;
  }
}

// Reverse geocoding helper
async function handleReverseGeocode(lat: number, lng: number): Promise<any> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      {
        headers: {
          "User-Agent": "PrayerTimesCalculator/1.0",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Reverse geocoding request failed");
    }

    const data = await response.json();

    if (!data || !data.address) {
      throw new Error("No location information found");
    }

    const address = data.address;
    return {
      latitude: lat,
      longitude: lng,
      display_name: data.display_name,
      city: address.city || address.town || address.village || address.suburb,
      country: address.country,
      state: address.state,
    };
  } catch (error) {
    throw error;
  }
}

// Badge update functionality (for showing countdown to next prayer)
function updateBadge(prayerTimes?: any) {

  if (!prayerTimes || !prayerTimes.times) {
    chrome.action.setBadgeText({ text: "" });
    return;
  }

  const now = new Date();
  const times = prayerTimes.times;

  // Get all prayer times in order (excluding sunrise)
  const prayerList = [
    { name: "Fajr", time: new Date(times.fajr) },
    { name: "Dhuhr", time: new Date(times.dhuhr) },
    { name: "Asr", time: new Date(times.asr) },
    { name: "Maghrib", time: new Date(times.maghrib) },
    { name: "Isha", time: new Date(times.isha) },
  ].sort((a, b) => a.time.getTime() - b.time.getTime());

  // Find next prayer
  let nextPrayer = null;
  for (const prayer of prayerList) {
    if (now < prayer.time) {
      nextPrayer = prayer;
      break;
    }
  }

  // If no prayer found today, use tomorrow's Fajr if available
  if (!nextPrayer && prayerTimes.tomorrowTimes) {
    nextPrayer = { name: "Fajr", time: new Date(prayerTimes.tomorrowTimes.fajr) };
  }

  if (nextPrayer) {
    const timeDiff = nextPrayer.time.getTime() - now.getTime();
    const totalMinutes = Math.floor(timeDiff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let badgeText = "";
    if (hours > 0) {
      // Use shorter format: "6:10" instead of longer text
      badgeText = `${hours}:${minutes.toString().padStart(2, "0")}`;
    } else if (minutes > 0) {
      // For minutes only, use just the number to make it smaller
      badgeText = `${minutes}`;
    } else {
      badgeText = "0";
    }

    // Green background by default, red when less than 10 minutes
    const backgroundColor = totalMinutes < 10 ? "#dc3545" : "#2c5530"; // Red if < 10min, green otherwise

    chrome.action.setBadgeText({ text: badgeText });
    chrome.action.setBadgeBackgroundColor({ color: backgroundColor });

    // Try to make badge text smaller (Chrome extension API limitation - this may not work)
    try {
      chrome.action.setBadgeTextColor({ color: "#ffffff" });
    } catch (error) {
      // Badge text color not supported in this Chrome version
    }
  } else {
    chrome.action.setBadgeText({ text: "" });
  }
}

// Function to check storage and update badge immediately
async function checkAndUpdateBadge() {

  try {
    const settings = await chrome.storage.sync.get(["prayerTimes"]);

    if (settings.prayerTimes) {
      const today = getLocalDateString(new Date());

      if (settings.prayerTimes.date === today) {
        // Reconstruct date objects from stored strings
        const reconstructedTimes = reconstructDateObjects(settings.prayerTimes.times);
        const reconstructedTomorrowTimes = reconstructDateObjects(settings.prayerTimes.tomorrowTimes);

        updateBadge({
          times: reconstructedTimes,
          tomorrowTimes: reconstructedTomorrowTimes
        });
      } else {
        chrome.action.setBadgeText({ text: "" });
      }
    } else {
      chrome.action.setBadgeText({ text: "" });
    }
  } catch (error) {
    // Error checking and updating badge
  }
}

// Periodic prayer time updates using Chrome alarms

function startPeriodicUpdates() {

  // Clear any existing alarms
  chrome.alarms.clear("badge-update");

  // Update badge immediately
  checkAndUpdateBadge();

  // Create alarm to update every 15 seconds
  chrome.alarms.create("badge-update", {
    delayInMinutes: 0.25,
    periodInMinutes: 0.25
  });
}

// Function to sync alarm with popup timer
function syncAlarmWithPopup() {

  // Clear existing alarm
  chrome.alarms.clear("badge-update");

  // Calculate seconds until next 15-second boundary to sync with popup
  const now = new Date();
  const secondsIntoMinute = now.getSeconds();
  const secondsUntilNext15SecBoundary = 15 - (secondsIntoMinute % 15);
  const delayInMinutes = secondsUntilNext15SecBoundary / 60;


  // Create alarm that starts at the next 15-second boundary
  chrome.alarms.create("badge-update", {
    delayInMinutes: delayInMinutes,
    periodInMinutes: 0.25
  });
}

// Handle alarm events
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === "badge-update") {

    try {
      // Get current settings and location
      const settings = await chrome.storage.sync.get([
        "location",
        "calculationMethod",
        "madhab",
        "notificationsEnabled",
        "prayerTimes",
      ]);

      if (settings.location) {
        // Check if stored prayer times are outdated (daily refresh)
        const today = getLocalDateString(new Date());
        if (!settings.prayerTimes || settings.prayerTimes.date !== today) {
          // Send message to popup to refresh prayer times if it's open
          try {
            chrome.runtime.sendMessage({ type: "REFRESH_PRAYER_TIMES" });
          } catch (error) {
            // Popup not open, that's okay
          }
        }

        // Update badge with current prayer times countdown
        checkAndUpdateBadge();
      }
    } catch (error) {
      // Alarm update failed
    }
  }
});

// Storage change listener
chrome.storage.onChanged.addListener((changes, namespace) => {
  // When prayer times are updated, refresh the badge immediately
  if (changes.prayerTimes) {
    checkAndUpdateBadge();
  }
});

// Helper function to get local date string
function getLocalDateString(date: Date): string {
  // Get local date string in YYYY-MM-DD format (not UTC)
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper function to reconstruct Date objects from stored strings
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

export {};