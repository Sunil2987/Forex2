import React, { useState, useEffect } from "react";

const API_KEY = "demo"; // Replace with your actual API key
const TICKERS = ["BTC/USD", "XAU/USD", "EUR/GBP", "AUD/JPY"];

// Default thresholds
const defaultThresholds = {
  "BTC/USD": 2.5,
  "XAU/USD": 2.5,
  "EUR/GBP": 2.5,
  "AUD/JPY": 2.5
};

function App() {
  const [data, setData] = useState([]);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setRefreshIn((t) => (t > 0 ? t - 1 : 300)), 1000);
    const refresh = setInterval(() => fetchData(), 300000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, []);

  const notify = (symbol, atrPercent) => {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }

    const alertTitle = `High Volatility Alert: ${symbol}`;
    const alertBody = `ATR% reached ${atrPercent.toFixed(2)}%, exceeding your threshold of ${thresholds[symbol]}%.`;

    if (Notification.permission === "granted") {
      new Notification(alertTitle, {
        body: alertBody
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(alertTitle, {
            body: alertBody
          });
        }
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const promises = TICKERS.map(async (symbol) => {
        const [base, quote] = symbol.split("/");
        
        try {
          // Simulate API calls with demo data for now
          const simulatedData = {
            "BTC/USD": { price: 107783, atr: 248.00 },
            "XAU/USD": { price: 3284, atr: 5.58 },
            "EUR/GBP": { price: 1.0234, atr: 0.0015 },
            "AUD/JPY": { price: 144.6150, atr: 0.23 }
          };
          
          const mockData = simulatedData[symbol];
          if (mockData) {
            const { price, atr } = mockData;
            const atrPercent = +(100 * (atr / price)).toFixed(2);
            
            // Check if we need to send notification
            if (atrPercent >= thresholds[symbol]) {
              notify(symbol, atrPercent);
            }
            
            return {
              symbol,
              price,
              atrPercent,
              error: false
            };
          }
          
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            price: NaN,
            atrPercent: NaN,
            error: true
          };
        }
      });

      const results = await Promise.all(promises);
      setData(results);
      setRefreshIn(300);
    } catch (error) {
      console.error("Data fetch failed", error);
      setError("Failed to fetch data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (symbol, price) => {
    if (isNaN(price)) return "Error";
    
    // BTC and XAU should be without decimals
    if (symbol === "BTC/USD" || symbol === "XAU/USD") {
      return price.toLocaleString(undefined, {
        maximumFractionDigits: 0
      });
    }
    
    // Others with 4 decimals
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  };

  const saveThresholds = () => {
    setSuccessMessage("Thresholds saved successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const updateThreshold = (symbol, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setThresholds(prev => ({
        ...prev,
        [symbol]: numValue
      }));
    }
  };

  const resetThresholds = () => {
    if (window.confirm("Are you sure you want to reset all thresholds to default values?")) {
      setThresholds(defaultThresholds);
      setSuccessMessage("Thresholds reset to defaults!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const getStatusIcon = (item) => {
    if (item.error || isNaN(item.atrPercent)) return '❌';
    return item.atrPercent >= thresholds[item.symbol] ? '🔥' : '💡';
  };

  const getStatusText = (item) => {
    if (item.error || isNaN(item.atrPercent)) return 'Error';
    return item.atrPercent >= thresholds[item.symbol] ? 'High Volatility' : 'Normal';
  };

  const getRowClass = (item) => {
    if (item.error || isNaN(item.atrPercent)) return 'bg-red-900/20 border-red-600/30';
    if (item.atrPercent >= thresholds[item.symbol]) return 'bg-orange-900/20 border-orange-600/30';
    return 'bg-gray-800/50 border-gray-600/30';
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <div className="mr-3">📊</div>
          <h1 className="text-xl font-bold text-white">
            Forex + BTC Volatility Monitor
          </h1>
        </div>
        
        <p className="text-sm text-gray-400 mb-6">
          ATR-based volatility alert system using 15-minute candles
        </p>

        {/* Controls Row */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Refresh Controls */}
          <div className="flex-1">
            <label className="block text-white text-sm font-medium mb-2">
              Data Controls
            </label>
            <button
              onClick={fetchData}
              disabled={loading}
              className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 px-4 py-2 rounded text-white font-medium flex items-center justify-center"
            >
              <span className="mr-2">🔄</span>
              {loading ? "Loading..." : "Refresh Now"}
            </button>
          </div>
        </div>
        
        {/* Timer */}
        <div className="text-gray-400 text-sm flex items-center">
          <span className="mr-2">⏱</span>
          Next auto-refresh in: <span className="text-white ml-1">{refreshIn}s</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-600 rounded-lg p-4">
          <p className="text-red-200 text-center text-sm">{error}</p>
        </div>
      )}
      
      {successMessage && (
        <div className="mb-4 bg-green-900/30 border border-green-600 rounded-lg p-4">
          <p className="text-green-200 text-center text-sm">{successMessage}</p>
        </div>
      )}

      {/* Threshold Settings */}
      <div className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700 mb-6 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Custom Threshold Settings (%)</h2>
          <button
            onClick={resetThresholds}
            className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            Reset Defaults
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {TICKERS.map(symbol => (
            <div key={symbol} className="mb-2">
              <label className="block text-white text-sm font-medium mb-1">
                {symbol}
              </label>
              <div className="flex items-center">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={thresholds[symbol]}
                  onChange={(e) => updateThreshold(symbol, e.target.value)}
                  className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="ml-2 text-gray-400">%</span>
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex justify-end mt-4">
          <button
            onClick={saveThresholds}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-medium"
          >
            Save All Thresholds
          </button>
        </div>
      </div>

      {/* Table View */}
      <div className="bg-gray-900/50 rounded-lg overflow-hidden border-2 border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-600">
                <th className="text-left p-4 text-white font-medium">Symbol</th>
                <th className="text-right p-4 text-white font-medium">Price</th>
                <th className="text-right p-4 text-white font-medium">ATR %</th>
                <th className="text-right p-4 text-white font-medium">Threshold</th>
                <th className="text-center p-4 text-white font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 && !loading ? (
                <tr>
                  <td colSpan="5" className="text-center py-8 text-gray-400">
                    No data available. Click Refresh Now to load data.
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                  <tr key={item.symbol} className={`border-b border-gray-700/50 ${getRowClass(item)} hover:bg-gray-700/30 transition-colors`}>
                    <td className="p-4">
                      <div className="font-medium text-white text-lg">{item.symbol}</div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-mono">
                        {formatPrice(item.symbol, item.price)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-mono font-medium ${
                        item.error || isNaN(item.atrPercent) ? 'text-red-400' :
                        item.atrPercent >= thresholds[item.symbol] ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {item.error || isNaN(item.atrPercent) ? "Error" : `${item.atrPercent.toFixed(2)}%`}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-gray-300 font-mono">
                        {thresholds[item.symbol]}%
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">{getStatusIcon(item)}</span>
                        <span className={`text-sm font-medium ${
                          item.error || isNaN(item.atrPercent) ? 'text-red-400' :
                          item.atrPercent >= thresholds[item.symbol] ? 'text-orange-400' : 'text-green-400'
                        }`}>
                          {getStatusText(item)}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 text-center text-xs text-gray-500">
        <div className="flex flex-wrap justify-center gap-4">
          <span className="flex items-center"><span className="mr-1">🔥</span> High Volatility (≥ threshold)</span>
          <span className="flex items-center"><span className="mr-1">💡</span> Normal Volatility</span>
          <span className="flex items-center"><span className="mr-1">❌</span> Data Error</span>
        </div>
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-center text-xs text-gray-600">
        <p>Thresholds are saved in component state during this session</p>
        <p className="mt-1">Notifications will alert you when ATR% exceeds your set thresholds</p>
      </div>
    </div>
  );
}

export default App;
