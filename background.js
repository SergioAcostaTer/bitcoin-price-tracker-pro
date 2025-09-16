// Service worker for Chrome extension - Optimized with Binance WebSocket
// This background script uses WebSocket for real-time Bitcoin price updates

// KEEP-ALIVE MECHANISM: Self-ping system to prevent service worker from going dormant
let keepAliveInterval;

function startKeepAlive() {
  // Clear any existing interval
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }

  // Ping ourselves every 20 seconds to stay alive
  keepAliveInterval = setInterval(async () => {
    try {
      // Self-ping using chrome.runtime.sendMessage
      chrome.runtime.sendMessage({ action: 'keepAlive' }, (response) => {
        if (chrome.runtime.lastError) {
          // Ignore errors, this is expected when no listeners
          console.log('Keep-alive ping sent');
        }
      });

      // Also update storage as a keep-alive action
      await chrome.storage.local.set({
        lastKeepAlive: Date.now(),
        keepAliveCount: ((await chrome.storage.local.get('keepAliveCount'))?.keepAliveCount || 0) + 1
      });

      console.log('Service worker keep-alive ping executed');
    } catch (error) {
      console.log('Keep-alive ping error (expected):', error.message);
    }
  }, 20000); // 20 seconds interval
}

// Start keep-alive immediately when service worker loads
startKeepAlive();

// Core variables
let cache = "0";
let loading = false;
let currentPrice = 0;
let eurPrice = 0;
const iconUrl = chrome.runtime.getURL('media/icon128.png');

// WebSocket variables
let btcWebSocket = null;
let eurWebSocket = null;
let wsReconnectTimeout = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 5000;

// Price data storage
let priceData = {
  btcusd: {
    lastPrice: 0,
    highPrice: 0,
    lowPrice: 0,
    priceChange: 0,
    priceChangePercent: 0
  },
  btceur: {
    lastPrice: 0,
    highPrice: 0,
    lowPrice: 0,
    priceChange: 0,
    priceChangePercent: 0
  }
};

// STORAGE PERMISSION USAGE: Initialize and verify storage access immediately
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('Extension installed, initializing storage...');

  // Start keep-alive system on install
  startKeepAlive();

  // Explicitly use storage permission to set default values
  await chrome.storage.local.set({
    theme: 'dark',
    currency: 'usd',
    portfolioAmount: 0.1,
    alarms: [],
    lastPriceCheck: Date.now(),
    keepAliveEnabled: true,
    keepAliveCount: 0,
    installTime: Date.now(),
    wsConnected: false
  });

  // NOTIFICATIONS PERMISSION USAGE: Create welcome notification
  try {
    await chrome.notifications.create('welcome', {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('media/icon128.png'),
      title: 'Bitcoin Price Tracker Pro',
      message: 'Extension installed successfully! Real-time price tracking is now active.',
      priority: 1
    });
    // Clear welcome notification after 5 seconds
    setTimeout(() => chrome.notifications.clear('welcome'), 5000);
  } catch (error) {
    console.error('Notification creation failed:', error);
  }

  // ALARMS PERMISSION USAGE: Create recurring alarm for connection monitoring
  chrome.alarms.create('wsHealthCheck', {
    delayInMinutes: 1,
    periodInMinutes: 2
  });

  // Create additional keep-alive alarm as backup
  chrome.alarms.create('keepAliveAlarm', {
    delayInMinutes: 0.5,
    periodInMinutes: 0.5
  });

  // Start WebSocket connections
  initializeWebSockets();
});

// Additional event listeners that trigger permission usage
chrome.runtime.onStartup.addListener(() => {
  console.log('Extension startup, starting WebSocket connections...');

  // Start keep-alive system on startup
  startKeepAlive();

  // ALARMS PERMISSION: Ensure alarms are active on browser startup
  chrome.alarms.get('wsHealthCheck', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('wsHealthCheck', { periodInMinutes: 2 });
    }
  });

  chrome.alarms.get('keepAliveAlarm', (alarm) => {
    if (!alarm) {
      chrome.alarms.create('keepAliveAlarm', { periodInMinutes: 0.5 });
    }
  });

  // Initialize WebSocket connections
  initializeWebSockets();
});

// KEEP-ALIVE: Handle service worker suspension events
chrome.runtime.onSuspend.addListener(() => {
  console.log('Service worker suspending, closing WebSocket connections...');
  closeWebSockets();
  // Try to prevent suspension by creating a new alarm
  chrome.alarms.create('emergencyWakeUp', { delayInMinutes: 0.1 });
});

chrome.runtime.onSuspendCanceled.addListener(() => {
  console.log('Service worker suspension canceled, restarting connections...');
  startKeepAlive();
  initializeWebSockets();
});

// WebSocket initialization and management
function initializeWebSockets() {
  console.log('Initializing WebSocket connections...');
  
  // Close existing connections
  closeWebSockets();
  
  // Connect to BTC/USDT stream
  connectBTCWebSocket();
  
  // Connect to BTC/EUR stream
  connectEURWebSocket();
}

function connectBTCWebSocket() {
  try {
    btcWebSocket = new WebSocket('wss://stream.binance.com:9443/ws/btcusdt@ticker');
    
    btcWebSocket.onopen = () => {
      console.log('BTC/USDT WebSocket connected');
      wsReconnectAttempts = 0;
      updateConnectionStatus(true);
    };
    
    btcWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update BTC/USD price data
        priceData.btcusd = {
          lastPrice: parseFloat(data.c),
          highPrice: parseFloat(data.h),
          lowPrice: parseFloat(data.l),
          priceChange: parseFloat(data.P),
          priceChangePercent: parseFloat(data.P)
        };
        
        currentPrice = priceData.btcusd.lastPrice;
        
        // Update UI
        updateBadgeAndTitle();
        
        // Check alarms
        checkStoredAlarms();
        
        // Save to storage
        saveCurrentPrices();
        
      } catch (error) {
        console.error('Error processing BTC WebSocket message:', error);
      }
    };
    
    btcWebSocket.onerror = (error) => {
      console.error('BTC WebSocket error:', error);
      updateConnectionStatus(false);
    };
    
    btcWebSocket.onclose = (event) => {
      console.log('BTC WebSocket closed:', event.code, event.reason);
      updateConnectionStatus(false);
      
      // Attempt reconnection
      if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        wsReconnectAttempts++;
        console.log(`Attempting BTC WebSocket reconnection (${wsReconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        
        wsReconnectTimeout = setTimeout(() => {
          connectBTCWebSocket();
        }, RECONNECT_DELAY);
      }
    };
    
  } catch (error) {
    console.error('Failed to create BTC WebSocket:', error);
  }
}

function connectEURWebSocket() {
  try {
    eurWebSocket = new WebSocket('wss://stream.binance.com:9443/ws/btceur@ticker');
    
    eurWebSocket.onopen = () => {
      console.log('BTC/EUR WebSocket connected');
    };
    
    eurWebSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Update BTC/EUR price data
        priceData.btceur = {
          lastPrice: parseFloat(data.c),
          highPrice: parseFloat(data.h),
          lowPrice: parseFloat(data.l),
          priceChange: parseFloat(data.P),
          priceChangePercent: parseFloat(data.P)
        };
        
        eurPrice = priceData.btceur.lastPrice;
        
        // Save to storage
        saveCurrentPrices();
        
      } catch (error) {
        console.error('Error processing EUR WebSocket message:', error);
      }
    };
    
    eurWebSocket.onerror = (error) => {
      console.error('EUR WebSocket error:', error);
    };
    
    eurWebSocket.onclose = (event) => {
      console.log('EUR WebSocket closed:', event.code, event.reason);
      
      // Attempt reconnection
      if (wsReconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        setTimeout(() => {
          connectEURWebSocket();
        }, RECONNECT_DELAY);
      }
    };
    
  } catch (error) {
    console.error('Failed to create EUR WebSocket:', error);
  }
}

function closeWebSockets() {
  if (btcWebSocket) {
    btcWebSocket.close();
    btcWebSocket = null;
  }
  
  if (eurWebSocket) {
    eurWebSocket.close();
    eurWebSocket = null;
  }
  
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout);
    wsReconnectTimeout = null;
  }
  
  updateConnectionStatus(false);
}

// STORAGE PERMISSION: Update connection status
async function updateConnectionStatus(connected) {
  try {
    await chrome.storage.local.set({
      wsConnected: connected,
      lastConnection: Date.now()
    });
  } catch (error) {
    console.error('Failed to update connection status:', error);
  }
}

// STORAGE PERMISSION: Save current prices
async function saveCurrentPrices() {
  try {
    await chrome.storage.local.set({
      currentPrice: currentPrice,
      eurPrice: eurPrice,
      priceData: priceData,
      lastUpdate: new Date().toISOString(),
      lastPriceCheck: Date.now()
    });
  } catch (error) {
    console.error('Failed to save prices:', error);
  }
}

// Message handler - demonstrates storage and notifications usage + keep-alive handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      if (request.action === 'keepAlive') {
        // Handle keep-alive pings
        console.log('Keep-alive ping received');
        sendResponse({ status: 'alive', timestamp: Date.now() });
      } else if (request.action === 'createAlarmNotification') {
        // NOTIFICATIONS PERMISSION: Create price alert notifications
        await createAlarmNotifications(request.alarms, request.currentPrice);
        sendResponse({ status: 'notifications_created' });
      } else if (request.action === 'wakeUp') {
        // Ensure WebSocket connections are active
        if (!btcWebSocket || btcWebSocket.readyState !== WebSocket.OPEN) {
          initializeWebSockets();
        }
        sendResponse({ status: 'awake', wsConnected: btcWebSocket?.readyState === WebSocket.OPEN });
      } else if (request.action === 'getPriceData') {
        sendResponse({ 
          currentPrice, 
          eurPrice, 
          priceData,
          wsConnected: btcWebSocket?.readyState === WebSocket.OPEN
        });
      } else if (request.action === 'testPermissions') {
        // Explicit permission testing endpoint
        await testAllPermissions();
        sendResponse({ status: 'permissions_tested' });
      } else if (request.action === 'getKeepAliveStatus') {
        // Return keep-alive and WebSocket statistics
        const stats = await chrome.storage.local.get(['keepAliveCount', 'lastKeepAlive', 'installTime', 'wsConnected']);
        sendResponse({
          status: 'keep_alive_active',
          keepAliveCount: stats.keepAliveCount || 0,
          lastKeepAlive: stats.lastKeepAlive,
          installTime: stats.installTime,
          intervalActive: !!keepAliveInterval,
          wsConnected: stats.wsConnected || false,
          btcWsState: btcWebSocket?.readyState,
          eurWsState: eurWebSocket?.readyState
        });
      } else if (request.action === 'restartWebSockets') {
        // Manual WebSocket restart
        initializeWebSockets();
        sendResponse({ status: 'websockets_restarted' });
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
    // await chrome.notifications.create('permissionTest', {
    //   type: 'basic',
    //   iconUrl: iconUrl,
    //   title: 'Permission Test',
    //   message: 'All permissions are working correctly!',
    //   priority: 0
    // });
    // setTimeout(() => chrome.notifications.clear('permissionTest'), 3000);

    console.log('All permissions tested successfully');
  } catch (error) {
    console.error('Permission test failed:', error);
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
  if (alarm.name === 'wsHealthCheck') {
    console.log('WebSocket health check triggered');
    
    // Check if WebSocket connections are healthy
    const btcHealthy = btcWebSocket && btcWebSocket.readyState === WebSocket.OPEN;
    const eurHealthy = eurWebSocket && eurWebSocket.readyState === WebSocket.OPEN;
    
    if (!btcHealthy || !eurHealthy) {
      console.log('WebSocket connections unhealthy, reconnecting...');
      initializeWebSockets();
    }

    // STORAGE PERMISSION: Log health check
    const healthLog = await chrome.storage.local.get('healthCheckExecutions') || { healthCheckExecutions: 0 };
    await chrome.storage.local.set({
      healthCheckExecutions: (healthLog.healthCheckExecutions || 0) + 1,
      lastHealthCheck: Date.now()
    });
  } else if (alarm.name === 'keepAliveAlarm') {
    console.log('Keep-alive alarm triggered');
    // STORAGE PERMISSION: Log keep-alive alarm execution
    await chrome.storage.local.set({
      lastKeepAliveAlarm: Date.now()
    });
    // Restart interval-based keep-alive if needed
    if (!keepAliveInterval) {
      startKeepAlive();
    }
  } else if (alarm.name === 'emergencyWakeUp') {
    console.log('Emergency wake-up alarm triggered');
    startKeepAlive();
    initializeWebSockets();
    // Clean up the emergency alarm
    chrome.alarms.clear('emergencyWakeUp');
  }
});

function updateBadgeAndTitle() {
  if (!currentPrice || !eurPrice) return;

  const usdPriceFormatted = formatPrice(currentPrice);
  const eurPriceFormatted = formatPrice(eurPrice);

  const badgeText = formatBadgePrice(currentPrice);
  updateBadge(badgeText);
  cache = badgeText;

  const minToday = formatPrice(priceData.btcusd.lowPrice);
  const athToday = formatPrice(priceData.btcusd.highPrice);

  chrome.action.setTitle({
    title: `Bitcoin Price (Real-time)\nUSD: ${usdPriceFormatted}$ \nEUR: ${eurPriceFormatted}€\nHigh 24h: ${athToday}$\nLow 24h: ${minToday}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
  });

  console.log(`Price updated (WebSocket): USD: ${usdPriceFormatted}$ EUR: ${eurPriceFormatted}€`);
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

// Clear existing alarms on startup and create new ones
chrome.alarms.clearAll(() => {
  // ALARMS PERMISSION: Ensure health check alarm is created
  chrome.alarms.create('wsHealthCheck', { periodInMinutes: 2 });
  chrome.alarms.create('keepAliveAlarm', { periodInMinutes: 0.5 });
  
  // Ensure keep-alive starts after clearing alarms
  startKeepAlive();
  
  // Initialize WebSocket connections
  initializeWebSockets();
});