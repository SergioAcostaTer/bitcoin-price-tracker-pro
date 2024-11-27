chrome.runtime.onInstalled.addListener(refreshStart);
chrome.runtime.onSuspend.addListener(refreshStart);
chrome.runtime.onSuspendCanceled.addListener(refreshStart);
chrome.runtime.onUpdateAvailable.addListener(refreshStart);
chrome.runtime.onStartup.addListener(refreshStart);
chrome.runtime.onConnect.addListener(refreshStart);

let cache = "0";
let loading = false;

async function refresh() {
  try {
    setLoading(true);
    const res = await fetch("https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22BTCEUR%22%5D");
    const data = await res.json();
    updateBadgeAndTitle(data);
  } catch (error) {
    console.error('Failed to fetch data:', error);
  } finally {
    setLoading(false);
  }
}

function updateBadgeAndTitle(data) {
  const price = parseFloat(data[0].lastPrice);
  const eurPrice = parseFloat(data[1].lastPrice);
  const usdPriceFormatted = formatPrice(price);
  const eurPriceFormatted = formatPrice(eurPrice);
  
  const subtr = usdPriceFormatted.substr(0, 4);

  updateBadge(subtr);

  cache = subtr;

  const minToday = formatPrice(parseFloat(data[0].lowPrice));
  const athToday = formatPrice(parseFloat(data[0].highPrice));

  chrome.action.setTitle({
    title: `Bitcoin Price \nUSD: ${usdPriceFormatted}$ \nEUR: ${eurPriceFormatted}€\nHigh 24h: ${athToday}$\nLow 24h: ${minToday}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
  });
  console.log(
    `Bitcoin Price \nUSD: ${usdPriceFormatted}$ \nEUR: ${eurPriceFormatted}€\nHigh 24h: ${athToday}$\nLow 24h: ${minToday}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
    `${subtr}K`,
    usdPriceFormatted
  );
}

function updateBadge(subtr) {
  if (parseFloat(subtr.replace(",", ".")) >= parseFloat(cache.replace(",", "."))) {
    chrome.action.setBadgeText({ text: `${subtr}K` });
    chrome.action.setBadgeBackgroundColor({ color: "#217908" });
  } else {
    chrome.action.setBadgeText({ text: `${subtr}K` });
    chrome.action.setBadgeBackgroundColor({ color: "#d32f2f" });
    setTimeout(() => {
      chrome.action.setBadgeBackgroundColor({ color: "#217908" });
    }, 3000);
  }
}

function formatPrice(price) {
  return price.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function setLoading(isLoading) {
  loading = isLoading;
  if (loading) {
    chrome.action.setBadgeText({ text: '...' });
  }
}

function refreshStart() {
  refresh();
  setInterval(refresh, 5000);
}

refresh();

setInterval(function () {
  fetch("https://api.binance.com/api/v3/ping");
}, 10000);
