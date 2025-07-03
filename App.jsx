import React, { useState, useEffect } from "react";

const API_KEY = "495fa3a802b3498e96b09e7092ab0839";
const TICKERS = ["BTC/USD", "XAU/USD", "EUR/GBP", "AUD/JPY"];

const defaultThresholds = {
  "BTC/USD": 3.0,
  "XAU/USD": 1.5,
  "EUR/GBP": 1.5,
  "AUD/JPY": 1.5
};

function App() {
  const [data, setData] = useState([]);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }

    fetchData();
    const timer = setInterval(() => setRefreshIn((t) => (t > 0 ? t - 1 : 300)), 1000);
    const refresh = setInterval(() => fetchData(), 300000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, []);

  const notify = (symbol, atrPercent) => {
    if (!notificationsEnabled) return;

    const alertTitle = `🚨 High Volatility Alert: ${symbol}`;
    const alertBody = `ATR% reached ${atrPercent.toFixed(2)}%, exceeding your threshold of ${thresholds[symbol]}%.`;

    new Notification(alertTitle, {
      body: alertBody,
      icon: "📈",
      tag: symbol
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");

    try {
      const promises = TICKERS.map(async (symbol) => {
        try {
          const res = await fetch(
            `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${API_KEY}`
          );
          if (!res.ok) throw new Error(`API error: ${res.status}`);

          const json = await res.json();
          if (json.status === 'error') throw new Error(json.message || 'API returned error');

          const values = json.values;
          if (!values || values.length < 14) throw new Error('Insufficient data for ATR calculation');

          const currentPrice = parseFloat(values[0].close);
          const atr = calculateATR(values.slice(0, 14));
          const atrPercent = +(100 * (atr / currentPrice)).toFixed(2);

          if (atrPercent >= thresholds[symbol]) notify(symbol, atrPercent);

          return {
            symbol,
            price: currentPrice,
            atrPercent,
            change: ((currentPrice - parseFloat(values[1].close)) / parseFloat(values[1].close) * 100).toFixed(2),
            error: false,
            lastUpdate: new Date().toLocaleTimeString()
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            price: NaN,
            atrPercent: NaN,
            change: NaN,
            error: true,
            errorMessage: err.message,
            lastUpdate: new Date().toLocaleTimeString()
          };
        }
      });

      const results = await Promise.all(promises);
      setData(results);
      setRefreshIn(300);

      if (results.every(r => r.error)) {
        setError("All API requests failed. Please check your API key and connection.");
      }

    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const calculateATR = (prices) => {
    const ranges = [];
    for (let i = 0; i < prices.length - 1; i++) {
      const high = parseFloat(prices[i].high);
      const low = parseFloat(prices[i].low);
      const prevClose = parseFloat(prices[i + 1].close);
      const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      ranges.push(tr);
    }
    return ranges.reduce((sum, v) => sum + v, 0) / ranges.length;
  };

  const formatPrice = (symbol, price) => {
    if (isNaN(price)) return "Error";
    if (symbol === "BTC/USD" || symbol === "XAU/USD") {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }
  };

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
              <th className="px-4 py-3 text-center">Vol %</th>
              <th className="px-4 py-3 text-center">Bulbs</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 bg-black text-white">
            {data.map((item) => {
              const isAboveThreshold = item.atrPercent >= thresholds[item.symbol];
              return (
                <tr key={item.symbol} className="hover:bg-gray-800">
                  <td className="px-4 py-3 font-semibold">{item.symbol}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(item.symbol, item.price)}</td>
                  <td className="px-4 py-3 text-center">{item.error ? "Error" : `${item.atrPercent}%`}</td>
                  <td className="px-4 py-3 text-center text-xl">{item.error ? "❌" : "💡"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default App;
