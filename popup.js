// State management using Chrome storage
let state = {
  currentPrice: 0,
  eurPrice: 0,
  theme: "dark",
  currency: "usd",
  portfolioAmount: 0.1,
  alarms: [],
  priceData: {
    high24h: 0,
    low24h: 0,
    change24h: 0,
    changePercent24h: 0,
  },
};

// DOM elements
const elements = {
  body: document.getElementById("body"),
  priceValue: document.getElementById("price-value"),
  priceChange: document.getElementById("price-change"),
  priceHigh: document.getElementById("price-high"),
  priceLow: document.getElementById("price-low"),
  portfolioBtc: document.getElementById("portfolio-btc"),
  portfolioUsd: document.getElementById("portfolio-usd"),
  themeToggle: document.getElementById("theme-toggle"),
  currencyToggle: document.getElementById("currency-toggle"),
  editPortfolio: document.getElementById("edit-portfolio"),
  addAlarm: document.getElementById("add-alarm"),
  alarmsListContainer: document.getElementById("alarms-list"),

  // Modals
  portfolioModal: document.getElementById("portfolio-modal"),
  portfolioInput: document.getElementById("portfolio-input"),
  closePortfolio: document.getElementById("close-portfolio"),
  cancelPortfolio: document.getElementById("cancel-portfolio"),
  savePortfolio: document.getElementById("save-portfolio"),

  alarmModal: document.getElementById("alarm-modal"),
  alarmPrice: document.getElementById("alarm-price"),
  alarmType: document.getElementById("alarm-type"),
  closeAlarm: document.getElementById("close-alarm"),
  cancelAlarm: document.getElementById("cancel-alarm"),
  saveAlarm: document.getElementById("save-alarm"),

  chart: document.getElementById("bitcoin-chart"),
};

// Chrome storage utilities
const storage = {
  async get(keys) {
    return await chrome.storage.local.get(keys);
  },

  async set(data) {
    await chrome.storage.local.set(data);
  },

  async remove(keys) {
    await chrome.storage.local.remove(keys);
  },
};

// Load state from Chrome storage
const loadState = async () => {
  try {
    const result = await storage.get([
      "theme",
      "currency",
      "portfolioAmount",
      "alarms",
    ]);

    state.theme = result.theme || "dark";
    state.currency = result.currency || "usd";
    state.portfolioAmount = result.portfolioAmount || 0.1;
    state.alarms = result.alarms || [];
  } catch (error) {
    console.error("Failed to load state:", error);
  }
};

// Save state to Chrome storage
const saveState = async () => {
  try {
    await storage.set({
      theme: state.theme,
      currency: state.currency,
      portfolioAmount: state.portfolioAmount,
      alarms: state.alarms,
    });
  } catch (error) {
    console.error("Failed to save state:", error);
  }
};

// Utility functions
const formatPrice = (price) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: state.currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
};

const formatNumber = (num) => {
  return new Intl.NumberFormat("en-US").format(num);
};

// Theme management
const applyTheme = () => {
  if (state.theme === "light") {
    elements.body.setAttribute("data-theme", "light");
    elements.themeToggle.classList.add("active");
  } else {
    elements.body.removeAttribute("data-theme");
    elements.themeToggle.classList.remove("active");
  }
};

const toggleTheme = async () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  await saveState();
};

// Currency management
const applyCurrency = () => {
  elements.currencyToggle.textContent = state.currency.toUpperCase();
  if (state.currency === "eur") {
    elements.currencyToggle.classList.add("eur");
  } else {
    elements.currencyToggle.classList.remove("eur");
  }
  updatePriceDisplay();
  updatePortfolioDisplay();
};

const toggleCurrency = async () => {
  state.currency = state.currency === "usd" ? "eur" : "usd";
  applyCurrency();
  await saveState();
};

// Price data fetching
const fetchPriceData = async () => {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbols=%5B%22BTCUSDT%22,%22BTCEUR%22%5D"
    );
    const data = await response.json();

    if (data && data.length >= 2) {
      const btcUsdt = data.find((item) => item.symbol === "BTCUSDT");
      const btcEur = data.find((item) => item.symbol === "BTCEUR");

      if (btcUsdt && btcEur) {
        state.currentPrice = parseFloat(btcUsdt.lastPrice);
        state.eurPrice = parseFloat(btcEur.lastPrice);
        state.priceData = {
          high24h: parseFloat(btcUsdt.highPrice),
          low24h: parseFloat(btcUsdt.lowPrice),
          change24h: parseFloat(btcUsdt.priceChange),
          changePercent24h: parseFloat(btcUsdt.priceChangePercent),
        };

        updatePriceDisplay();
        updatePortfolioDisplay();
        checkAlarms();
      }
    }
  } catch (error) {
    console.error("Failed to fetch price data:", error);
    elements.priceValue.textContent = "Error loading price";
  }
};

// Chart data fetching and rendering
const fetchChartData = async () => {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24"
    );
    const data = await response.json();

    if (data && Array.isArray(data)) {
      const chartData = data.map((candle) => parseFloat(candle[4])); // closing prices
      drawChart(chartData);
    }
  } catch (error) {
    console.error("Failed to fetch chart data:", error);
    // Fallback to mock data if API fails
    drawChart(generateMockChartData());
  }
};

// Generate mock chart data as fallback
const generateMockChartData = () => {
  const data = [];
  let basePrice = state.currentPrice || 43250;

  for (let i = 0; i < 24; i++) {
    const variation = (Math.random() - 0.5) * 1000;
    basePrice += variation;
    data.push(basePrice);
  }

  return data;
};

// Update UI
const updatePriceDisplay = () => {
  if (!state.currentPrice && !state.eurPrice) return;

  const price = state.currency === "usd" ? state.currentPrice : state.eurPrice;
  const currency = state.currency === "usd" ? "$" : "€";

  elements.priceValue.textContent = `${currency}${formatNumber(
    price.toFixed(2)
  )}`;

  // Price change
  const changePercent = state.priceData.changePercent24h;
  const isPositive = changePercent >= 0;

  elements.priceChange.className = `price-change ${isPositive ? "positive" : "negative"
    }`;
  elements.priceChange.innerHTML = `
        <span>${isPositive ? "↗" : "↘"}</span>
        <span>${isPositive ? "+" : ""}${changePercent.toFixed(2)}%</span>
    `;

  // 24h stats
  const conversionRate =
    state.currency === "eur" ? state.eurPrice / state.currentPrice : 1;
  const high24h = state.priceData.high24h * conversionRate;
  const low24h = state.priceData.low24h * conversionRate;

  elements.priceHigh.textContent = `${currency}${formatNumber(
    high24h.toFixed(2)
  )}`;
  elements.priceLow.textContent = `${currency}${formatNumber(
    low24h.toFixed(2)
  )}`;
};

const updatePortfolioDisplay = () => {
  if (!state.portfolioAmount) return;

  elements.portfolioBtc.textContent = `${state.portfolioAmount.toFixed(8)} BTC`;

  const price = state.currency === "usd" ? state.currentPrice : state.eurPrice;
  const currency = state.currency === "usd" ? "$" : "€";
  const portfolioValue = state.portfolioAmount * price;

  elements.portfolioUsd.textContent = `≈ ${currency}${formatNumber(
    portfolioValue.toFixed(2)
  )}`;
};

// Chart functionality
let chartInstance = null;

const drawChart = (data) => {
  const ctx = elements.chart.getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  const isDark = state.theme === "dark";
  const textColor = isDark ? "#EAECEF" : "#181A20";
  const gridColor = isDark ? "#2B3139" : "#E5E5E5";

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: Array.from({ length: 24 }, (_, i) => {
        const hour = new Date().getHours() - (23 - i);
        return hour < 0 ? hour + 24 : hour;
      }),
      datasets: [
        {
          label: "Bitcoin Price",
          data: data,
          borderColor: "#F0B90B",
          backgroundColor: "rgba(240, 185, 11, 0.1)",
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: "#F0B90B",
          pointHoverBorderColor: "#000",
          pointHoverBorderWidth: 2,
          fill: true,
          tension: 0.4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? "#2B3139" : "#FFFFFF",
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: isDark ? "#848E9C" : "#E5E5E5",
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: false,
          callbacks: {
            title: (context) => `${context[0].label}:00`,
            label: (context) => {
              const currency = state.currency === "usd" ? "$" : "€";
              return `${currency}${formatNumber(context.parsed.y.toFixed(2))}`;
            },
          },
        },
      },
      scales: {
        x: { display: false },
        y: {
          display: true,
          grid: {
            color: gridColor,
            drawBorder: false,
          },
          ticks: {
            color: textColor,
            font: { size: 11 },
            maxTicksLimit: 5,
            callback: function (value) {
              return formatNumber(value.toFixed(0));
            },
          },
        },
      },
      interaction: {
        intersect: false,
        mode: "index",
      },
    },
  });
};

// Alarm management
const checkAlarms = () => {
  // Note: Alarms are primarily checked in background script
  // This is just for immediate popup feedback
  if (!state.currentPrice || state.alarms.length === 0) return;

  const triggeredAlarms = state.alarms.filter((alarm) => {
    return alarm.type === "above"
      ? state.currentPrice >= alarm.price
      : state.currentPrice <= alarm.price;
  });

  if (triggeredAlarms.length > 0) {
    // Remove triggered alarms from popup state
    state.alarms = state.alarms.filter(
      (alarm) => !triggeredAlarms.includes(alarm)
    );
    saveState();
    renderAlarms();
  }
};

const addAlarm = async (price, type) => {
  const alarm = {
    id: Date.now(),
    price: parseFloat(price),
    type: type,
    created: new Date().toISOString(),
    currency: state.currency,
  };

  state.alarms.push(alarm);
  await saveState();
  renderAlarms();
};

const removeAlarm = async (alarmId) => {
  state.alarms = state.alarms.filter((alarm) => alarm.id !== alarmId);
  await saveState();
  renderAlarms();
};

const renderAlarms = () => {
  if (state.alarms.length === 0) {
    elements.alarmsListContainer.innerHTML = `
      <div style="color: var(--text-muted); font-size: 12px; text-align: center; padding: 16px 0;">
        No price alerts set
      </div>
    `;
    return;
  }

  elements.alarmsListContainer.innerHTML = state.alarms
    .map(
      (alarm) => `
    <div class="alarm-item">
      <div>
        <div class="alarm-price">${alarm.currency === "usd" ? "$" : "€"
        }${formatNumber(alarm.price)}</div>
        <div class="alarm-type">${alarm.type === "above" ? "Above" : "Below"
        } target</div>
      </div>
      <button class="alarm-delete" data-id="${alarm.id
        }" aria-label="Delete alarm">×</button>
    </div>
  `
    )
    .join("");
};

// Modal management
const showModal = (modal) => {
  modal.style.display = "flex";
};

const hideModal = (modal) => {
  modal.style.display = "none";
};

// Portfolio management
const openPortfolioModal = () => {
  elements.portfolioInput.value = state.portfolioAmount;
  showModal(elements.portfolioModal);
  elements.portfolioInput.focus();
};

const savePortfolio = async () => {
  const amount = parseFloat(elements.portfolioInput.value);

  if (!isNaN(amount) && amount >= 0) {
    state.portfolioAmount = amount;
    updatePortfolioDisplay();
    await saveState();
    hideModal(elements.portfolioModal);
  } else {
    elements.portfolioInput.style.borderColor = "var(--accent-red)";
    setTimeout(() => {
      elements.portfolioInput.style.borderColor = "var(--border-color)";
    }, 2000);
  }
};

// Alarm modal management
const openAlarmModal = () => {
  elements.alarmPrice.value = "";
  elements.alarmType.value = "above";
  showModal(elements.alarmModal);
  elements.alarmPrice.focus();
};

const saveAlarmModal = async () => {
  const price = parseFloat(elements.alarmPrice.value);
  const type = elements.alarmType.value;

  if (!isNaN(price) && price > 0) {
    await addAlarm(price, type);
    hideModal(elements.alarmModal);
  } else {
    elements.alarmPrice.style.borderColor = "var(--accent-red)";
    setTimeout(() => {
      elements.alarmPrice.style.borderColor = "var(--border-color)";
    }, 2000);
  }
};

// Event listeners
const setupEventListeners = () => {
  // Theme toggle
  elements.themeToggle.addEventListener("click", toggleTheme);

  // Currency toggle
  elements.currencyToggle.addEventListener("click", toggleCurrency);

  // Portfolio modal
  elements.editPortfolio.addEventListener("click", openPortfolioModal);
  elements.closePortfolio.addEventListener("click", () =>
    hideModal(elements.portfolioModal)
  );
  elements.cancelPortfolio.addEventListener("click", () =>
    hideModal(elements.portfolioModal)
  );
  elements.savePortfolio.addEventListener("click", savePortfolio);

  // Portfolio input enter key
  elements.portfolioInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") savePortfolio();
  });

  // Alarm modal
  elements.addAlarm.addEventListener("click", openAlarmModal);
  elements.closeAlarm.addEventListener("click", () =>
    hideModal(elements.alarmModal)
  );
  elements.cancelAlarm.addEventListener("click", () =>
    hideModal(elements.alarmModal)
  );
  elements.saveAlarm.addEventListener("click", saveAlarmModal);
  elements.alarmsListContainer.addEventListener("click", (e) => {
    const btn = e.target.closest(".alarm-delete");
    if (!btn) return;
    const id = Number(btn.dataset.id);
    removeAlarm(id);
  });

  // Alarm input enter key
  elements.alarmPrice.addEventListener("keypress", (e) => {
    if (e.key === "Enter") saveAlarmModal();
  });

  // Click outside modal to close
  elements.portfolioModal.addEventListener("click", (e) => {
    if (e.target === elements.portfolioModal)
      hideModal(elements.portfolioModal);
  });

  elements.alarmModal.addEventListener("click", (e) => {
    if (e.target === elements.alarmModal) hideModal(elements.alarmModal);
  });
};

// Global functions for onclick handlers
window.removeAlarm = removeAlarm;

// Initialize app
const init = async () => {
  try {
    // Load saved state
    await loadState();

    // Apply initial theme and currency
    applyTheme();
    applyCurrency();

    // Setup event listeners
    setupEventListeners();

    // Render initial alarms
    renderAlarms();

    // Fetch initial data
    await fetchPriceData();
    await fetchChartData();

    // Setup periodic updates (only while popup is open)
    const priceUpdateInterval = setInterval(fetchPriceData, 5000);
    const chartUpdateInterval = setInterval(fetchChartData, 60000);

    // Clean up intervals when popup closes
    window.addEventListener("beforeunload", () => {
      clearInterval(priceUpdateInterval);
      clearInterval(chartUpdateInterval);
    });

    // Wake up background script and test permissions
    try {
      await chrome.runtime.sendMessage({ action: "wakeUp" });
      await chrome.runtime.sendMessage({ action: 'testPermissions' });
    } catch (error) {
      console.log("Background script communication failed:", error);
    }
  } catch (error) {
    console.error("Failed to initialize app:", error);
  }
};

// Start the application
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}