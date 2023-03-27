const url = "https://api.coindesk.com/v1/bpi/currentprice.json";

async function refresh() {
  const firstFetch = await fetch(url);
  const data = await firstFetch.json();
  const price = data.bpi.USD.rate_float;
  const eurPrice = data.bpi.EUR.rate_float;
  const onlyTwoDecimals = price.toFixed(2);
  const onlyTwoDecimalsEur = eurPrice.toFixed(2);
  const addThousandsSeparator = onlyTwoDecimals.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
  );
  const addThousandsSeparatorEur = onlyTwoDecimalsEur.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ","
    );
  const toText = addThousandsSeparator.toString();
  const toTextEur = addThousandsSeparatorEur.toString();
  const subtr = toText.substr(0, 4);

  chrome.action.setBadgeText({ text: `${subtr}K` });
  chrome.action.setBadgeBackgroundColor({ color: "#217908" });

  const secondFetch = await fetch(
    "https://api.coingecko.com/api/v3/coins/bitcoin"
  );
  const data2 = await secondFetch.json();
  const minToday = data2.market_data.low_24h.usd;
  const minThousands = minToday
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const athToday = data2.market_data.high_24h.usd;
  const athThousands = athToday
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  chrome.action.setTitle({
    title: `Bitcoin Pice \nUSD: ${toText}$ \nEUR: ${toTextEur}€\nHigh 24h: ${athThousands}$\nLow 24h: ${minThousands}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
  });
  console.log(
    `Bitcoin Pice \nUSD: ${toText}$ \nEUR: ${toTextEur}€\nHigh 24h: ${athThousands}$\nLow 24h: ${minThousands}$ \n\nLast updated: ${new Date().toLocaleTimeString()}`,
    `${subtr}K`,
    toText
  );
}

refresh();

//Every 5 seconds

setInterval(refresh, 10000);
