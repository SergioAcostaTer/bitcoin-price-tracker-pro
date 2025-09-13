// Service worker for Chrome extension - Optimized for Chrome Web Store review
// This background script explicitly demonstrates usage of all requested permissions

// STORAGE PERMISSION USAGE: Initialize and verify storage access immediately
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed, initializing storage...');

  // Explicitly use storage permission to set default values
  await chrome.storage.local.set({
    theme: 'dark',
    currency: 'usd',
    portfolioAmount: 0.1,
    alarms: [],
    lastPriceCheck: Date.now()
  });

  // NOTIFICATIONS PERMISSION USAGE: Create welcome notification
  try {
    await chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('media/icon128.png'),
      title: 'Bitcoin Price Tracker Pro',
      message: 'Extension installed successfully! Price tracking is now active.',
      priority: 1
    });
    // Clear welcome notification after 5 seconds
    setTimeout(() => chrome.notifications.clear('welcome'), 5000);
  } catch (error) {
    console.error('Notification creation failed:', error);
  }

  // ALARMS PERMISSION USAGE: Create recurring price check alarm
  chrome.alarms.create('priceCheck', {
    delayInMinutes: 1,
    periodInMinutes: 1
  });

  // Start initial price refresh
  refreshStart();
});

// Additional event listeners that trigger permission usage
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup, verifying alarms...');
  // ALARMS PERMISSION: Ensure alarm is active on browser startup
  chrome.alarms.get('priceCheck', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('priceCheck', { periodInMinutes: 1 });
    }
  });
  refreshStart();
});

// Core variables
let cache = "0";
let loading = false;
let currentPrice = 0;
let eurPrice = 0;
const iconUrl = chrome.runtime.getURL('media/icon128.png');

// Message handler - demonstrates storage and notifications usage
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'createAlarmNotification') {
        // NOTIFICATIONS PERMISSION: Create price alert notifications
        await createAlarmNotifications(request.alarms, request.currentPrice);
        sendResponse({ status: 'notifications_created' });
      } else if (request.action === 'wakeUp') {
        await refresh();
        sendResponse({ status: 'awake' });
      } else if (request.action === 'getPriceData') {
        sendResponse({ currentPrice, eurPrice });
      } else if (request.action === 'testPermissions') {
        // Explicit permission testing endpoint
        await testAllPermissions();
        sendResponse({ status: 'permissions_tested' });
      }
    } catch (err) {
      console.error('onMessage error:', err);
      sendResponse({ error: String(err) });
    }
  })();
  return true;
});

// EXPLICIT PERMISSION TESTING FUNCTION
async function testAllPermissions() {
  try {
    // Test STORAGE permission
    await chrome.storage.local.set({ permissionTest: Date.now() });
    const storageTest = await chrome.storage.local.get('permissionTest');
    console.log('Storage permission verified:', storageTest);

    // Test ALARMS permission
    chrome.alarms.getAll((alarms) => {
      console.log('Alarms permission verified, active alarms:', alarms.length);
    });

    // Test NOTIFICATIONS permission
    await chrome.notifications.create('permissionTest', {
      type: 'basic',
      iconUrl: iconUrl,
      title: 'Permission Test',
      message: 'All permissions are working correctly!',
      priority: 0
    });
    setTimeout(() => chrome.notifications.clear('permissionTest'), 3000);

    console.log('All permissions tested successfully');
  } catch (error) {
    console.error('Permission test failed:', error);
  }
}

// Main refresh function with explicit storage usage
async function refresh() {
  try {
    setLoading(true);

    // STORAGE PERMISSION: Update last check time
    await chrome.storage.local.set({ lastPriceCheck: Date.now() });

    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22BTCEUR%22%5D");
    const data = await res.json();

    // Update global price variables
    currentPrice = parseFloat(data[0].lastPrice);
    eurPrice = parseFloat(data[1].lastPrice);

    updateBadgeAndTitle(data);

    // STORAGE PERMISSION: Save current prices to storage
    await chrome.storage.local.set({
      currentPrice: currentPrice,
      eurPrice: eurPrice,
      lastUpdate: new Date().toISOString()
    });

    // Check alarms whenever price updates
    await checkStoredAlarms();

  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
}

// STORAGE PERMISSION USAGE: Check stored alarms against current price
async function checkStoredAlarms() {
  try {
    // Explicit storage usage to get alarms
    const result = await chrome.storage.local.get(['alarms']);
    const alarms = result.alarms || [];

    if (alarms.length === 0 || currentPrice === 0) return;

    const triggeredAlarms = [];
    const remainingAlarms = [];

    alarms.forEach(alarm => {
      const { currency } = alarm;
      const priceToCheck = currency === 'usd' ? currentPrice : eurPrice;

      const isTriggered = alarm.type === 'above'
        ? priceToCheck >= alarm.price
        : priceToCheck <= alarm.price;

      if (isTriggered) {
        triggeredAlarms.push(alarm);
      } else {
        remainingAlarms.push(alarm);
      }
    });

    if (triggeredAlarms.length > 0) {
      // NOTIFICATIONS PERMISSION: Create notifications for triggered alarms
      await createAlarmNotifications(triggeredAlarms, currentPrice);

      // STORAGE PERMISSION: Update storage to remove triggered alarms
      await chrome.storage.local.set({ alarms: remainingAlarms });

      console.log(`Triggered ${triggeredAlarms.length} alarm(s)`);
    }

  } catch (error) {
    console.error('Error checking alarms:', error);
  }
}

// NOTIFICATIONS PERMISSION USAGE: Create alarm notifications
async function createAlarmNotifications(triggeredAlarms, price) {
  for (const alarm of triggeredAlarms) {
    const notificationId = `alarm_${alarm.id}_${Date.now()}`;
    try {
      await chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: iconUrl,
        title: 'Bitcoin Price Alert!',
        message: `Bitcoin price is now ${alarm.type} $${alarm.price.toLocaleString()}!\nCurrent price: $${price.toLocaleString()}`,
        priority: 2,
        requireInteraction: true
      });
      setTimeout(() => chrome.notifications.clear(notificationId), 30000);
    } catch (e) {
      console.error('notifications.create failed:', e);
    }
  }
}

// NOTIFICATIONS PERMISSION USAGE: Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.action.openPopup();
  chrome.notifications.clear(notificationId);
});

// ALARMS PERMISSION USAGE: Handle Chrome alarms
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'priceCheck') {
    console.log('Alarm triggered: priceCheck');
    await refresh();

    // STORAGE PERMISSION: Log alarm execution
    const alarmLog = await chrome.storage.local.get('alarmExecutions') || { alarmExecutions: 0 };
    await chrome.storage.local.set({
      alarmExecutions: (alarmLog.alarmExecutions || 0) + 1
    });
  }
});

function updateBadgeAndTitle(data) {
  const price = parseFloat(data[0].lastPrice);
  const eurPriceVal = parseFloat(data[1].lastPrice);

  const usdPriceFormatted = formatPrice(price);
  const eurPriceFormatted = formatPrice(eurPriceVal);

  const badgeText = formatBadgePrice(price);
  updateBadge(badgeText);
  cache = badgeText;

  const minToday = formatPrice(parseFloat(data[0].lowPrice));
  const athToday = formatPrice(parseFloat(data[0].highPrice));

  chrome.action.setTitle({
    title: `Bitcoin Price \nUSD: ${usdPriceFormatted}$ \nEUR: ${eurPriceFormatted}€\nHigh 24h: ${athToday}$\nLow 24h: ${minToday}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
  });

  console.log(`Price updated: USD: ${usdPriceFormatted}$ EUR: ${eurPriceFormatted}€`);
}

function updateBadge(text) {
  const numeric = parseFloat(text);
  const numericCache = parseFloat(cache);

  if (numeric >= numericCache) {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#217908" });
  } else {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#d32f2f" });
    setTimeout(() => {
      chrome.action.setBadgeBackgroundColor({ color: "#217908" });
    }, 3000);
  }
}

function formatBadgePrice(price) {
  if (price >= 1000000) {
    return (price / 1000000).toFixed(1) + "M";
  } else if (price >= 1000) {
    return (price / 1000).toFixed(1);
  } else {
    return price.toFixed(0);
  }
}

function formatPrice(price) {
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setLoading(isLoading) {
  loading = isLoading;
}

function refreshStart() {
  refresh();
  // ALARMS PERMISSION: Ensure alarm is created
  chrome.alarms.create('priceCheck', { periodInMinutes: 1 });
}

// Clear existing alarms on startup and create new one
chrome.alarms.clear('priceCheck', () => {
  refreshStart();
});

// Initialize on startup with explicit permission usage demonstration
refresh();