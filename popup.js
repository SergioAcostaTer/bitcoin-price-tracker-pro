// Retrieve Bitcoin price data from API
const priceDiv = document.getElementById("price");
const eurPriceDiv = document.getElementById("eur-price");
const url =
  "https://api.binance.com/api/v3/ticker/price?symbols=%5B%22BTCUSDT%22,%22BTCEUR%22%5D";
let actualColor = localStorage.getItem("actualColor") || false;
let actualCurrency = localStorage.getItem("actualCurrency") || false;

function refreshData() {
  chrome.runtime.sendMessage({ message: "wakeUp" });
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const price = parseFloat(data[0].price);
      const eurPrice = parseFloat(data[1].price);
      console.log(price, eurPrice);
      const onlyTwoDecimals = price.toFixed(2);
      const onlyTwoDecimalsEur = eurPrice.toFixed(2);
      const addThousandsSeparator = onlyTwoDecimals.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
      );
      priceDiv.innerHTML = `${addThousandsSeparator} $`;
      eurPriceDiv.innerHTML = `${onlyTwoDecimalsEur}`;

      const floatBitcoinAmount = parseFloat(
        bitcoinAmount.innerHTML.replace(",", ".")
      );

      if (!actualCurrency) {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (price * floatBitcoinAmount).toFixed(2)
        )} $`;
      } else {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (eurPrice * floatBitcoinAmount).toFixed(2)
        )} €`;
      }
    });
}

//space every 3 digits by left
const spaceEveryThreeDigits = (x) => {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const brightColorPalette = ["#FFFFFF", "#000000"];

const darkColorPalette = ["#071530", "#FFFFFF"];

const h1 = document.getElementById("h1");
const body = document.getElementById("body");
const canvas = document.getElementById("bitcoin-chart");
const colorButton = document.getElementById("color");
const colorButton2 = document.getElementById("button");
// const changeButton = document.getElementById("change-button");
const bitcoinAmount = document.getElementById("btcq");
const dolarAmount = document.getElementById("usdq");
const amountScreen = document.getElementById("amount-screen");
const amountPanel = document.getElementById("amount-panel");
const amountButton = document.getElementById("amount-button");
const amountInput = document.getElementById("amount-input");
const modify = document.getElementById("modify");
const money = document.getElementById("money");
const dollar = document.getElementById("dollar");
const euro = document.getElementById("euro");
const cross = document.getElementById("cross");
const twoElements = document.querySelectorAll(".changepls");

// let actualColor = false;

//retrieve actual color from chrome storage or set default
// let actualColor = chrome.storage.sync.get("actualColor") || false;

function saveActualColor() {
  // chrome.storage.sync.set({ actualColor: actualColor });
  localStorage.setItem("actualColor", actualColor);
}

document.addEventListener("DOMContentLoaded", function () {
  // money
  twoElements.forEach((element) => {
    element.addEventListener("click", function () {
      actualCurrency = !actualCurrency;
      localStorage.setItem("actualCurrency", actualCurrency);
      if (actualCurrency) {
        dollar.style.display = "none";
        euro.style.display = "block";
        money.style.backgroundColor = "#1e53e6";
      } else {
        dollar.style.display = "block";
        euro.style.display = "none";
        money.style.backgroundColor = "#23be3d";
      }

      const globalAmount = parseFloat(localStorage.getItem("bitcoinAmount"));

      const price = parseFloat(
        priceDiv.innerHTML.replace(" $", "").replace(",", "")
      );

      const eurPrice = parseFloat(eurPriceDiv.innerHTML.replace(",", ""));

      console.log(eurPrice);

      if (actualCurrency) {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (globalAmount * eurPrice).toFixed(2)
        )} €`;
      } else {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (globalAmount * price).toFixed(2)
        )} $`;
      }
    });
  });

  if (localStorage.getItem("actualCurrency") === "true") {
    if (actualCurrency) {
      dollar.style.display = "none";
      euro.style.display = "block";
      money.style.backgroundColor = "#1e53e6";
    } else {
      dollar.style.display = "block";
      euro.style.display = "none";
      money.style.backgroundColor = "#23be3d";
    }
  } else {
    actualCurrency = false;
  }

  if (localStorage.getItem("bitcoinAmount")) {
    bitcoinAmount.innerHTML = parseFloat(
      localStorage.getItem("bitcoinAmount")
    ).toFixed(3);
  }

  modify.addEventListener("click", function () {
    amountScreen.style.display = "flex";
    amountPanel.style.display = "flex";

    amountInput.focus();
  });

  cross.addEventListener("click", function () {
    amountScreen.style.display = "none";
    amountPanel.style.display = "none";
  });

  amountInput.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
      amountButton.click();
    }
  });

  amountButton.addEventListener("click", function () {
    
    amountScreen.style.display = "none";
    amountPanel.style.display = "none";

    const amount = amountInput.value;

    const fixedAmount = parseFloat(amount).toFixed(3);

    const price = parseFloat(
      priceDiv.innerHTML.replace(" $", "").replace(",", "")
    );
    const eurPrice = parseFloat(eurPriceDiv.innerHTML.replace(",", ""));

    if (!isNaN(amount) && amount !== "") {
      bitcoinAmount.innerHTML = fixedAmount;

      if (actualCurrency) {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (amount * eurPrice).toFixed(2)
        )} €`;
      } else {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (amount * price).toFixed(2)
        )} $`;
      }

      localStorage.setItem("bitcoinAmount", parseFloat(amount));
    }
    if (!isNaN(amount.replace(",", ".")) && amount !== "") {
      bitcoinAmount.innerHTML = parseFloat(amount.replace(",", ".")).toFixed(3);

      if (actualCurrency) {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (amount.replace(",", ".") * eurPrice).toFixed(2)
        )} €`;
      } else {
        dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
          (amount.replace(",", ".") * price).toFixed(2)
        )} $`;
      }

      localStorage.setItem(
        "bitcoinAmount",
        parseFloat(amount.replace(",", "."))
      );
    }
    amountInput.value = "";

    //localStorage
  });

  //color behavior
  const h1 = document.getElementById("h1");
  const body = document.getElementById("body");
  const canvas = document.getElementById("bitcoin-chart");

  function changeBackground(colors) {
    body.style.backgroundColor = [colors[0]];
    h1.style.backgroundColor = [colors[0]];
    h1.style.color = [colors[1]];
    canvas.style.backgroundColor = [colors[0]];
    h1.style.borderBottom = `2px solid ${colors[1]}`;
    colorButton2.style.backgroundColor = [colors[0]];
    colorButton.style.backgroundColor = [colors[1]];
    // dolarAmount.style.color = [colors[1]];
    // bitcoinAmount.style.color = [colors[1]];
    // modify.style.backgroundColor = [colors[1]];
  }

  changeBackground(darkColorPalette);

  if (localStorage.getItem("actualColor") === "true") {
    changeBackground(brightColorPalette);
    colorButton2.style.marginRight = "18px";
  } else {
    actualColor = false;
  }

  colorButton.addEventListener("click", function () {
    actualColor = !actualColor;

    console.log(actualColor);

    if (!actualColor) {
      changeBackground(darkColorPalette);
      colorButton2.style.marginRight = "40px";
    } else {
      changeBackground(brightColorPalette);
      colorButton2.style.marginRight = "18px";
    }

    saveActualColor();
  });

  colorButton2.addEventListener("click", function () {
    actualColor = !actualColor;

    console.log(actualColor);

    if (!actualColor) {
      changeBackground(darkColorPalette);
      colorButton2.style.marginRight = "40px";
    } else {
      changeBackground(brightColorPalette);
      colorButton2.style.marginRight = "18px";
    }

    saveActualColor();
  });

  /// Define the canvas element and retrieve its context
  const context = canvas.getContext("2d");

  // Define the function that fetches the Bitcoin price data
  async function fetchBitcoinData() {
    try {
      // Make a request to the CoinGecko API for Bitcoin price data
      const acutalTime = Math.floor(new Date().getTime() / 1000);
      const startTime = (acutalTime - 86400) * 1000;
      const response = await fetch(
        // "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly"
        "https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&startTime=" +
          startTime
      );
      const json = await response.json();

      //for echa convert timestamp to date
      // json.forEach((element) => {
      //   element[0] = new Date(element[0]);
      // });
      console.log(json);

      // Extract the data from the API response
      const data = json.map((price) => {
        return parseFloat(price[4]);
      });

      console.log(data);

      // data.push(parseFloat(priceDiv.innerHTML.replace(" $", "").replace(",", "")));

      // Draw the chart with the data
      drawChart(data);
      console.log(data);
    } catch (error) {
      console.error("Error retrieving Bitcoin price data:", error);
    }
  }

  //chart js plugin

  // hoverValue plugin block
  const hoverValue = {
    id: "hoverValue",
    afterDatasetsDraw(chart, args, pluginOptions) {
      const { ctx, data, options } = chart;
      chart.getActiveElements().forEach((active) => {
        const value = data.datasets[active.datasetIndex].data[active.index];
        const valueToDisplay =
          value
            .toFixed(2)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " $";
        ctx.save();

        ctx.fillStyle = "#c16900";
        ctx.fillRect(active.element.x - 50, active.element.y - 33, 100, 23);

        //white text
        ctx.fillStyle = "#fff";

        ctx.font = `18px Arial`;

        ctx.fillStyle =
          data.datasets[active.datasetIndex].borderColor[active.index];

        ctx.textAlign = "center";

        ctx.fillText(valueToDisplay, active.element.x, active.element.y - 15);

        ctx.restore();
      });
    },
  };

  // Define the function that draws the chart
  function drawChart(data) {
    // Define the chart configuration
    const config = {
      type: "line",
      data: {
        labels: [
          "1",
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8",
          "9",
          "10",
          "11",
          "12",
          "13",
          "14",
          "15",
          "16",
          "17",
          "18",
          "19",
          "20",
          "21",
          "22",
          "23",
          "24",
        ],
        datasets: [
          {
            label: "Bitcoin Price",
            data: data,
            backgroundColor: "rgba(255, 99, 132, 0.2)",
            borderColor: "#F7931A",
            pointBorderColor: "#fff",
            pointHoverRadius: 8,
            lineTension: 0.35,
            pointRadius: 4,
            pointHoverBackgroundColor: "#F7931A",
          },
        ],
      },
      options: {
        plugins: {
          chartAreaBorder: {
            borderColor: "white",
            borderWidth: 2,
          },
        },
        responsive: true,
        scales: {
          y: {
            ticks: {
              padding: 11,
              color: "#fff",
              maxTicksLimit: 5,
              font: {
                family: "Poppins",
                size: 15,
              },
            },
            grid: {
              display: false,
            },
          },
          x: {
            ticks: {
              display: false,
            },
            grid: {
              display: false,
            },
          },
        },
        plugins: {
          tooltip: {
            enabled: false,
            mode: "dataset",
          },
          legend: {
            display: false,
          },
        },
      },
      plugins: [hoverValue],
    };

    // Create the chart
    const chart = new Chart(context, config);

    document.addEventListener("DOMContentLoaded", function () {
      if (!actualColor) {
        chart.config.options.scales.y.ticks.color = "#fff";
        chart.config.data.datasets[0].pointBorderColor = "#fff";
      } else {
        chart.config.options.scales.y.ticks.color = darkColorPalette[0];
        chart.config.data.datasets[0].pointBorderColor = darkColorPalette[0];
      }

      chart.update();

      saveActualColor();
    });

    if (localStorage.getItem("actualColor") === "true") {
      chart.config.options.scales.y.ticks.color = darkColorPalette[0];
      chart.config.data.datasets[0].pointBorderColor = darkColorPalette[0];
      chart.update();
    }

    colorButton.addEventListener("click", function () {
      if (!actualColor) {
        chart.config.options.scales.y.ticks.color = "#fff";
        chart.config.data.datasets[0].pointBorderColor = "#fff";
      } else {
        chart.config.options.scales.y.ticks.color = darkColorPalette[0];
        chart.config.data.datasets[0].pointBorderColor = darkColorPalette[0];
      }

      chart.update();

      saveActualColor();
    });

    colorButton2.addEventListener("click", function () {
      if (!actualColor) {
        chart.config.options.scales.y.ticks.color = "#fff";
        chart.config.data.datasets[0].pointBorderColor = "#fff";
      } else {
        chart.config.options.scales.y.ticks.color = darkColorPalette[0];
        chart.config.data.datasets[0].pointBorderColor = darkColorPalette[0];
      }

      chart.update();

      saveActualColor();
    });
  }

  // Call the fetchBitcoinData function to fetch the data and draw the chart
  fetchBitcoinData();
});

// async function refresh() {
//   const firstFetch = await fetch(url);
//   const data = await firstFetch.json();
//   const price = parseFloat(data[0].price);
//   const eurPrice = parseFloat(data[1].price);
//   const onlyTwoDecimals = price.toFixed(2);
//   const onlyTwoDecimalsEur = eurPrice.toFixed(2);
//   const addThousandsSeparator = onlyTwoDecimals.replace(
//     /\B(?=(\d{3})+(?!\d))/g,
//     ","
//   );
//   const addThousandsSeparatorEur = onlyTwoDecimalsEur.replace(
//     /\B(?=(\d{3})+(?!\d))/g,
//     ","
//   );
//   const toText = addThousandsSeparator.toString();
//   const toTextEur = addThousandsSeparatorEur.toString();
//   const subtr = toText.substr(0, 4);

//   chrome.action.setBadgeText({ text: `${subtr}K` });
//   chrome.action.setBadgeBackgroundColor({ color: "#217908" });

//   const secondFetch = await fetch(
//     "https://api.coingecko.com/api/v3/coins/bitcoin"
//   );
//   const data2 = await secondFetch.json();
//   const minToday = data2.market_data.low_24h.usd;
//   const minThousands = minToday
//     .toString()
//     .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   const athToday = data2.market_data.high_24h.usd;
//   const athThousands = athToday
//     .toString()
//     .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

//   chrome.action.setTitle({
//     title: `Bitcoin Pice \nUSD: ${toText}$ \nEUR: ${toTextEur}€\nHigh 24h: ${athThousands}$\nLow 24h: ${minThousands}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
//   });
//   console.log(
//     `Bitcoin Pice \nUSD: ${toText}$ \nEUR: ${toTextEur}€\nHigh 24h: ${athThousands}$\nLow 24h: ${minThousands}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
//     `${subtr}K`,
//     toText
//   );
//   function refreshBitcoinPrice() {
//     const intPrice = parseFloat(toText.replace(",", ""));
//     const eurPrice = parseFloat(eurPriceDiv.innerHTML.replace(",", ""));
//     const floatBitcoinAmount = parseFloat(
//       bitcoinAmount.innerHTML.replace(",", ".")
//     );
//     console.log(intPrice, floatBitcoinAmount, eurPrice);

//     if (!actualCurrency) {
//       dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
//         (intPrice * floatBitcoinAmount).toFixed(2)
//       )} $`;
//     } else {
//       dolarAmount.innerHTML = `≈ ${spaceEveryThreeDigits(
//         (eurPrice * floatBitcoinAmount).toFixed(2)
//       )} €`;
//     }
//   }
//   refreshBitcoinPrice();
// }

refreshData();

setInterval(refreshData, 4000);

//wake up background script
