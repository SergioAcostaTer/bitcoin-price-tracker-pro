// Retrieve Bitcoin price data from API
const priceDiv = document.getElementById("price");
const url = "https://api.coindesk.com/v1/bpi/currentprice.json";

chrome.runtime.onInstalled.addListener((details) => {
  refreshData();
});

function refreshData() {
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      const price = data.bpi.USD.rate_float;
      const onlyTwoDecimals = price.toFixed(2);
      const addThousandsSeparator = onlyTwoDecimals.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        ","
      );
      priceDiv.innerHTML = `${addThousandsSeparator} $`;
      const toText = addThousandsSeparator.toString();
      const subtr = toText.substr(0, 4);
    });
}

refreshData();

//refresh data every 5 seconds

setInterval(refreshData, 5000);

// Path: popup.html

////////////////////////////////////////////////////////////////////////////////////////////////////

document.addEventListener("DOMContentLoaded", function () {
  /// Define the canvas element and retrieve its context
  const canvas = document.getElementById("bitcoin-chart");
  const context = canvas.getContext("2d");

  // Define the function that fetches the Bitcoin price data
  async function fetchBitcoinData() {
    try {
      // Make a request to the CoinGecko API for Bitcoin price data
      const response = await fetch(
        "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=1&interval=hourly"
      );
      const json = await response.json();

      // Extract the data from the API response
      const data = json.prices.map((price) => {
        return price[1];
      });

      // Draw the chart with the data
      drawChart(data);
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
        const valueToDisplay = value
          .toFixed(2)
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        ctx.save();

        ctx.fillStyle = "#c16900";
        ctx.fillRect(active.element.x - 45, active.element.y - 33, 90, 23);

        //white text
        ctx.fillStyle = "#fff";

        ctx.font = `18px Arial`;

        ctx.fillStyle =
          data.datasets[active.datasetIndex].borderColor[active.index];

        ctx.textAlign = "center";

        ctx.fillText(valueToDisplay, active.element.x, active.element.y - 15);

        //add background

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
  }

  // Call the fetchBitcoinData function to fetch the data and draw the chart
  fetchBitcoinData();
});

////////////////////////////////////////////////////////////////////////////////////////////////////
// function refreshInfo(price, usd, eur) {
//   usd = usd.toFixed(2);
//   eur = eur.toFixed(2);

//   usd = usd.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
//   eur = eur.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");

//   chrome.action.setBadgeText({ text: `${price}K` });
//   chrome.action.setBadgeBackgroundColor({ color: "#217908" });

// let newImage = new Image();
// newImage.src = "./icon.png";
// newImage.onload = function () {
//   fill_canvas(newImage); // FILL THE CANVAS WITH THE IMAGE.
// };

// function fill_canvas(img) {
//   // CREATE CANVAS CONTEXT.
//   let canvas = document.getElementById("pic");
//   let ctx = canvas.getContext("2d");
//   console.log(img.width, img.height)
//   canvas.width = img.width;
//   canvas.height = img.height;
//   ctx.drawImage(img, 0, 0); // DRAW THE IMAGE TO THE CANVAS.
//   // ctx.font = "bold 46px Arial";
//   // ctx.fillStyle = "white";
//   // ctx.fillText(`${price}K`, 2, 115);

//   // GET THE IMAGE DATA FROM THE CANVAS.
//   var Pic = canvas.toDataURL("image/png");

//   console.log(Pic);
//   chrome.browserAction.setIcon({
//     path: Pic,
//   });
// }
// }
