# Permission Usage Documentation
## Bitcoin Price Tracker Pro Extension

This document explains how each requested permission is used in our Chrome extension.

## Required Permissions and Their Usage

### 1. `storage` Permission
**Purpose**: Store user preferences and configuration data locally

**Files where used**:
- `popup.js` (lines 32-50): Storage utilities and state management
- `background.js` (lines 15-25): Save price data and alarm configurations

**Specific usage examples**:
```javascript
// Save user theme preference
await chrome.storage.local.set({ theme: 'dark' });

// Save portfolio amount
await chrome.storage.local.set({ portfolioAmount: 0.1 });

// Store price alerts/alarms
await chrome.storage.local.set({ alarms: userAlarms });

// Retrieve stored data
const result = await chrome.storage.local.get(['theme', 'currency', 'alarms']);
```

**Why it's essential**: Users expect their preferences (theme, currency, portfolio amount, price alerts) to persist between browser sessions.

### 2. `alarms` Permission
**Purpose**: Schedule periodic Bitcoin price updates in the background

**Files where used**:
- `background.js` (lines 200-210): Create and manage recurring alarms
- `background.js` (lines 190-200): Handle alarm events

**Specific usage examples**:
```javascript
// Create recurring price check alarm (every minute)
chrome.alarms.create('priceCheck', { periodInMinutes: 1 });

// Handle alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'priceCheck') {
    refresh(); // Fetch latest Bitcoin price
  }
});

// Clear old alarms on startup
chrome.alarms.clear('priceCheck');
```

**Why it's essential**: Without alarms, the extension cannot update Bitcoin prices in the background, making price alerts non-functional and badge prices outdated.

### 3. `notifications` Permission
**Purpose**: Show price alert notifications when Bitcoin reaches user-defined thresholds

**Files where used**:
- `background.js` (lines 80-100): Create price alert notifications
- `background.js` (lines 105-110): Handle notification clicks

**Specific usage examples**:
```javascript
// Create price alert notification
await chrome.notifications.create(notificationId, {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('media/icon128.png'),
  title: 'Bitcoin Price Alert!',
  message: `Bitcoin price is now above $50,000!`,
  priority: 2,
  requireInteraction: true
});

// Handle notification clicks
chrome.notifications.onClicked.addListener((notificationId) => {
  chrome.action.openPopup(); // Open extension popup
});
```

**Why it's essential**: Price alerts are a core feature. Users set target prices and expect to be notified when Bitcoin reaches those levels.

## Feature-to-Permission Mapping

| Feature | Required Permission | Justification |
|---------|-------------------|---------------|
| Theme preference (dark/light) | `storage` | Must persist user's theme choice |
| Currency toggle (USD/EUR) | `storage` | Must remember user's preferred currency |
| Portfolio tracking | `storage` | Must save user's Bitcoin amount |
| Price alerts/alarms | `storage` + `notifications` + `alarms` | Must save alert thresholds, schedule checks, and notify users |
| Background price updates | `alarms` | Must update prices periodically even when popup is closed |
| Real-time badge updates | `alarms` | Badge shows current Bitcoin price, needs background updates |

## User Journey Examples

### Setting a Price Alert:
1. User opens popup and clicks "Add Alert"
2. User sets target price (e.g., $50,000)
3. Extension saves alert using `storage` permission
4. Background script uses `alarms` to check price every minute
5. When target is reached, `notifications` shows alert to user

### Daily Usage:
1. User sees current Bitcoin price in extension badge (updated via `alarms`)
2. User opens popup to see detailed charts and portfolio value
3. User's preferences (theme, currency, portfolio) load from `storage`
4. If user has active alerts, they're displayed from `storage`

## Testing Permission Usage

To verify all permissions are actively used:

1. Install extension
2. Change theme → `storage` permission used
3. Set portfolio amount → `storage` permission used  
4. Create price alert → `storage` + `alarms` + `notifications` used
5. Wait for price change → `notifications` shows alert
6. Check badge updates → `alarms` updating in background

## Code Comments for Reviewers

All permission usage is explicitly commented in the code with "PERMISSION USAGE:" markers to help reviewers quickly identify where each permission is utilized.