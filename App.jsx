import React, { useState, useEffect } from "react";

const API_KEY = "fb112c39ecec4aa18bd73e881fb06fc4";
const TICKERS = ["BTC/USD", "XAU/USD", "EUR/USD", "USD/JPY", "GBP/JPY"];
const REFRESH_INTERVAL_SEC = 480; // 8 minutes

function App() {
  const [data, setData] = useState([]);
  const [refreshIn, setRefreshIn] = useState(REFRESH_INTERVAL_SEC);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        setNotificationsEnabled(true);
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then((perm) => {
          setNotificationsEnabled(perm === "granted");
        });
      }
    }

    const timer = setInterval(() => {
      setRefreshIn((t) => (t > 0 ? t - 1 : REFRESH_INTERVAL_SEC));
    }, 1000);
    
    const autoRefresh = setInterval(() => {
      if (isWithinActiveHours()) {
        fetchData();
      }
    }, REFRESH_INTERVAL_SEC * 1000);
    
    if (isWithinActiveHours()) {
      fetchData();
    }
    
    return () => {
      clearInterval(timer);
      clearInterval(autoRefresh);
    };
  }, []);

  const isWithinActiveHours = () => {
    const now = new Date();
    const istNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
    const day = istNow.getDay();
    const hour = istNow.getHours();
    return day >= 1 && day <= 5 && hour >= 11 && hour < 23;
  };

  const notifyADX = (symbol, adxValue, trend) => {
    if (!notificationsEnabled || adxValue < 25) return;
    new Notification(`⚡ ADX Alert: ${symbol}`, {
      body: `Strong trend detected. ADX: ${adxValue} (${trend})`,
      icon: "📊",
      tag: symbol + "-adx"
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
          if (json.status === "error") throw new Error(json.message || "API returned error");
          const values = json.values;
          if (!values || values.length < 15) throw new Error("Insufficient data");
          
          const current = values[0];
          const prev = values.slice(0, 14);
          const avgATR = calculateATR(prev);
          const todaysATR = Math.abs(parseFloat(current.high) - parseFloat(current.low));
          const { adx, diPlus, diMinus } = calculateADX(values.slice(0, 15));
          const trend = diPlus > diMinus ? "Bullish" : "Bearish";
          
          notifyADX(symbol, Math.round(adx), trend);
          
          return {
            symbol,
            price: parseFloat(current.close),
            avgATR,
            todaysATR,
            adx: Math.round(adx),
            trend,
            error: false
          };
        } catch (err) {
          return { symbol, error: true };
        }
      });
      
      const results = await Promise.all(promises);
      setData(results);
      setRefreshIn(REFRESH_INTERVAL_SEC);
      
      if (results.every((r) => r.error)) {
        setError("All API requests failed. Please check your API key and connection.");
      }
    } catch (err) {
      setError("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const calculateATR = (values) => {
    const trs = [];
    for (let i = 0; i < values.length - 1; i++) {
      const high = parseFloat(values[i].high);
      const low = parseFloat(values[i].low);
      const prevClose = parseFloat(values[i + 1].close);
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trs.push(tr);
    }
    return trs.reduce((a, b) => a + b, 0) / trs.length;
  };

  const calculateADX = (values) => {
    const pdm = [], ndm = [], trList = [];
    for (let i = 1; i < values.length; i++) {
      const current = values[i - 1];
      const prev = values[i];
      const upMove = parseFloat(current.high) - parseFloat(prev.high);
      const downMove = parseFloat(prev.low) - parseFloat(current.low);
      
      pdm.push(upMove > downMove && upMove > 0 ? upMove : 0);
      ndm.push(downMove > upMove && downMove > 0 ? downMove : 0);
      
      const tr = Math.max(
        parseFloat(current.high) - parseFloat(current.low),
        Math.abs(parseFloat(current.high) - parseFloat(prev.close)),
        Math.abs(parseFloat(current.low) - parseFloat(prev.close))
      );
      trList.push(tr);
    }
    
    const atr = trList.reduce((a, b) => a + b, 0) / trList.length;
    const pdi = (pdm.reduce((a, b) => a + b, 0) / atr) * 100;
    const ndi = (ndm.reduce((a, b) => a + b, 0) / atr) * 100;
    const dx = Math.abs(pdi - ndi) / (pdi + ndi) * 100;
    const adx = dx;
    
    return { adx, diPlus: pdi, diMinus: ndi };
  };

  const formatMetric = (symbol, value, isInteger = false) => {
    if (isNaN(value)) return "Error";
    const isCryptoOrGold = symbol === "BTC/USD" || symbol === "XAU/USD";
    if (isInteger || isCryptoOrGold) {
      return Math.round(value);
    } else {
      return value.toFixed(2);
    }
  };

  const formatPrice = (symbol, price) => {
    if (isNaN(price)) return "Error";
    const isCryptoOrGold = symbol === "BTC/USD" || symbol === "XAU/USD";
    const options = isCryptoOrGold 
      ? { maximumFractionDigits: 0 } 
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
    return price.toLocaleString(undefined, options);
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-green-300 mb-6">
          Forex + BTC Volatility Monitor
        </h1>
        
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={fetchData}
            disabled={loading}
            className={`px-4 py-2 rounded ${loading ? "bg-gray-600" : "bg-green-600 hover:bg-green-700"} text-white`}
          >
            {loading ? "Refreshing..." : "Refresh Now"}
          </button>
          
          <div className="text-gray-400">
            Next auto-refresh in: {refreshIn}s
          </div>
        </div>

        {error && (
          <div className="bg-red-900 text-red-200 p-3 rounded mb-6">
            ❌ {error}
          </div>
        )}

        <div className="rounded-lg overflow-x-auto mb-6">
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
                <tr key={item.symbol} className="hover:bg-gray-800 text-center">
                  <td className="px-4 py-3 font-semibold text-left">{item.symbol}</td>
                  <td className="px-4 py-3 text-right">{formatPrice(item.symbol, item.price)}</td>
                  <td className="px-4 py-3">{formatMetric(item.symbol, item.avgATR)}</td>
                  <td className="px-4 py-3">{formatMetric(item.symbol, item.todaysATR)}</td>
                  <td className="px-4 py-3">
                    {item.adx ? (
                      <>
                        <div>{formatMetric(item.symbol, item.adx, true)}</div>
                        <div className="text-xs text-gray-400">{item.trend}</div>
                      </>
                    ) : (
                      "Error"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
