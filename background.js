// Service worker for Chrome extension
chrome.runtime.onInstalled.addListener(refreshStart);
chrome.runtime.onSuspend.addListener(refreshStart);
chrome.runtime.onSuspendCanceled.addListener(refreshStart);
chrome.runtime.onUpdateAvailable.addListener(refreshStart);
chrome.runtime.onStartup.addListener(refreshStart);
chrome.runtime.onConnect.addListener(refreshStart);

let cache = "0";
let loading = false;
let currentPrice = 0;
let eurPrice = 0;
const iconUrl = chrome.runtime.getURL('icon128.png');


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'createAlarmNotification') {
        await createAlarmNotifications(request.alarms, request.currentPrice);
        sendResponse({ status: 'notifications_created' });
      } else if (request.action === 'wakeUp') {
        await refresh();
        sendResponse({ status: 'awake' });
      } else if (request.action === 'getPriceData') {
        sendResponse({ currentPrice, eurPrice });
      }
    } catch (err) {
      console.error('onMessage error:', err);
      sendResponse({ error: String(err) });
    }
  })();
  return true;
});


async function refresh() {
  try {
    setLoading(true);
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22BTCEUR%22%5D");
    const data = await res.json();
    
    // Update global price variables
    currentPrice = parseFloat(data[0].lastPrice);
    eurPrice = parseFloat(data[1].lastPrice);
    
    updateBadgeAndTitle(data);
    
    // Check alarms whenever price updates
    await checkStoredAlarms();
    
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
}

// Check stored alarms against current price
async function checkStoredAlarms() {
  try {
    const result = await chrome.storage.local.get(['alarms']);
    const alarms = result.alarms || [];
    
    if (alarms.length === 0 || currentPrice === 0) return;
    
    const triggeredAlarms = [];
    const remainingAlarms = [];
    
    alarms.forEach(alarm => {
      const {currency} = alarm;
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
      // Create notifications for triggered alarms
      await createAlarmNotifications(triggeredAlarms, currentPrice);
      
      // Update storage to remove triggered alarms
      await chrome.storage.local.set({ alarms: remainingAlarms });
      
      console.log(`Triggered ${triggeredAlarms.length} alarm(s)`);
    }
    
  } catch (error) {
    console.error('Error checking alarms:', error);
  }
}

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


// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  // Open popup when notification is clicked
  chrome.action.openPopup();
  chrome.notifications.clear(notificationId);
});

function updateBadgeAndTitle(data) {
  const price = parseFloat(data[0].lastPrice);
  const eurPriceVal = parseFloat(data[1].lastPrice);

  const usdPriceFormatted = formatPrice(price);
  const eurPriceFormatted = formatPrice(eurPriceVal);

  // Generate compact badge text
  const badgeText = formatBadgePrice(price);

  updateBadge(badgeText);

  cache = badgeText;

  const minToday = formatPrice(parseFloat(data[0].lowPrice));
  const athToday = formatPrice(parseFloat(data[0].highPrice));

  chrome.action.setTitle({
    title: `Bitcoin Price \nUSD: ${usdPriceFormatted}$ \nEUR: ${eurPriceFormatted}€\nHigh 24h: ${athToday}$\nLow 24h: ${minToday}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
  });

  console.log(
    `Bitcoin Price \nUSD: ${usdPriceFormatted}$ \nEUR: ${eurPriceFormatted}€\nHigh 24h: ${athToday}$\nLow 24h: ${minToday}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
    badgeText,
    usdPriceFormatted
  );
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

// Format price into compact badge text
function formatBadgePrice(price) {
  if (price >= 1000000) {
    return (price / 1000000).toFixed(1) + "M"; // e.g. 1.2M
  } else if (price >= 1000) {
    return (price / 1000).toFixed(1); // e.g. 43.2K, 100.0K
  } else {
    return price.toFixed(0); // if it ever went <1k
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
  // Create Chrome alarm instead of setInterval
  chrome.alarms.create('priceCheck', { periodInMinutes: 10 / 60 }); // every 10 seconds
}

// Handle Chrome alarms
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'priceCheck') {
    refresh();
  }
});

// Clear existing alarms on startup and create new one
chrome.alarms.clear('priceCheck', () => {
  refreshStart();
});

// Initialize on startup
refresh();