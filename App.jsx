import React, { useState, useEffect } from "react";

const API_KEY = "fb112c39ecec4aa18bd73e881fb06fc4";
const TICKERS = ["BTC/USD", "XAU/USD", "EUR/USD", "USD/JPY", "GBP/JPY"];

const defaultThresholds = {
  "BTC/USD": 3.0,
  "XAU/USD": 1.5,
  "EUR/USD": 1.5,
  "USD/JPY": 1.5,
  "GBP/JPY": 1.5
};

function App() {
  const [data, setData] = useState([]);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [refreshIn, setRefreshIn] = useState(480);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const isActiveTime = () => {
    const now = new Date();
    const utcHour = now.getUTCHours();
    const day = now.getUTCDay();
    return day >= 1 && day <= 5 && utcHour >= 5.5 && utcHour < 17.5; // 11AM–11PM IST
  };

  const notify = (title, message, tag) => {
    if (!notificationsEnabled) return;
    new Notification(title, {
      body: message,
      tag: tag,
    });
  };

  const calcTodayATR = (day) => {
    if (!day || !day.high || !day.low) return 0;
    return parseFloat(day.high) - parseFloat(day.low);
  };

  const calculateATR = (prices) => {
    if (!prices || prices.length < 2) return 0;
    
    const ranges = [];
    for (let i = 0; i < prices.length - 1; i++) {
      const high = parseFloat(prices[i]?.high || 0);
      const low = parseFloat(prices[i]?.low || 0);
      const prevClose = parseFloat(prices[i + 1]?.close || 0);
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      ranges.push(tr);
    }
    return ranges.reduce((sum, v) => sum + v, 0) / ranges.length;
  };

  const fetchData = async () => {
    if (loading) return;
    
    setLoading(true);
    setError("");

    try {
      const promises = TICKERS.map(async (symbol) => {
        try {
          const [priceRes, adxRes] = await Promise.all([
            fetch(`https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${API_KEY}`),
            fetch(`https://api.twelvedata.com/indicator?symbol=${symbol}&interval=1day&indicator=adx&apikey=${API_KEY}`)
          ]);

          if (!priceRes.ok || !adxRes.ok) throw new Error("API request failed");

          const [priceJson, adxJson] = await Promise.all([priceRes.json(), adxRes.json()]);

          if (priceJson.status === "error") throw new Error(priceJson.message || "Price API error");
          if (adxJson.status === "error") throw new Error(adxJson.message || "ADX API error");

          const values = priceJson.values || [];
          const adxValues = adxJson.values || [];

          if (values.length < 14 || adxValues.length === 0)
            throw new Error("Insufficient data");

          const currentPrice = parseFloat(values[0]?.close || 0);
          const todayATR = calcTodayATR(values[0]);
          const avgATR = calculateATR(values.slice(0, 14));
          const atrPercent = +(100 * (avgATR / currentPrice)).toFixed(2);

          const adx = parseFloat(adxValues[0]?.adx || 0);
          const plusDI = parseFloat(adxValues[0]?.["+DI"] || 0);
          const minusDI = parseFloat(adxValues[0]?.["-DI"] || 0);
          const trend = plusDI > minusDI ? "Bullish" : "Bearish";

          if (atrPercent >= thresholds[symbol]) {
            notify(`Volatility Alert: ${symbol}`, `ATR% = ${atrPercent}`, symbol + "-atr");
          }

          if (adx > 25) {
            notify(`ADX Alert: ${symbol}`, `ADX = ${adx}, Trend = ${trend}`, symbol + "-adx");
          }

          return {
            symbol,
            price: currentPrice,
            avgATR,
            todayATR,
            atrPercent,
            adx: Math.round(adx),
            trend,
            error: false,
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            error: true,
            errorMessage: err.message || "Unknown error",
          };
        }
      });

      const results = await Promise.all(promises);
      setData(results);

      if (results.every((r) => r.error)) {
        setError("All data fetches failed. Please try again later.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("Unexpected fetch error. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (symbol, value) => {
    if (isNaN(value)) return "Err";
    if (symbol === "BTC/USD" || symbol === "XAU/USD") {
      return Math.round(value).toLocaleString();
    }
    return value.toFixed(2);
  };

  useEffect(() => {
    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then(permission => {
        setNotificationsEnabled(permission === "granted");
      });
    }

    if (isActiveTime()) fetchData();

    const timer = setInterval(() => {
      setRefreshIn((prev) => {
        if (prev <= 1) {
          if (isActiveTime()) fetchData();
          return 480;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white py-8 px-4">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-extrabold text-green-300">Forex + BTC Volatility Monitor</h1>
        <button
          onClick={fetchData}
          disabled={loading}
          className="mt-4 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-black font-bold px-6 py-2 rounded-full"
        >
          {loading ? "Refreshing..." : "Refresh Now"}
        </button>
        <div className="mt-2 text-gray-300">
          Next auto-refresh in: <span className="font-bold text-white">{refreshIn}s</span>
        </div>
        {error && <div className="mt-4 text-red-400">❌ {error}</div>}
      </div>

      <div className="rounded-lg overflow-hidden mb-6">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-900 text-green-300">
              <th className="px-4 py-3">Ticker</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-center">Avg ATR</th>
              <th className="px-4 py-3 text-center">Today's ATR</th>
              <th className="px-4 py-3 text-center">ADX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-black text-white">
            {data.map((item) => (
              <tr key={item.symbol} className="hover:bg-gray-800">
                <td className="px-4 py-3 font-semibold">{item.symbol}</td>
                <td className="px-4 py-3 text-right">{formatNumber(item.symbol, item.price)}</td>
                <td className="px-4 py-3 text-center">{formatNumber(item.symbol, item.avgATR)}</td>
                <td className="px-4 py-3 text-center">{formatNumber(item.symbol, item.todayATR)}</td>
                <td className="px-4 py-3 text-center">
                  {!item.error && item.adx !== undefined ? (
                    <>
                      <span className="font-bold">{item.adx}</span>
                      <div className={`text-xs ${item.trend === "Bullish" ? "text-green-400" : "text-red-400"}`}>
                        {item.trend}
                      </div>
                    </>
                  ) : (
                    item.error ? "Error" : "Loading..."
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
