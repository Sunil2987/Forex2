import React, { useState, useEffect } from "react";

const API_KEY = "demo"; // Replace with your actual Twelve Data API key
const TICKERS = ["BTC/USD", "XAU/USD", "EUR/GBP", "AUD/JPY"];

// Default thresholds
const defaultThresholds = {
  "BTC/USD": 2.5,
  "XAU/USD": 2.5,
  "EUR/GBP": 2.5,
  "AUD/JPY": 2.5
};

// Map symbols to Twelve Data format
const symbolMapping = {
  "BTC/USD": "BTC/USD",
  "XAU/USD": "XAU/USD", 
  "EUR/GBP": "EUR/GBP",
  "AUD/JPY": "AUD/JPY"
};

function App() {
  const [data, setData] = useState([]);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load saved thresholds from memory on component mount
  useEffect(() => {
    // Since we can't use localStorage, we'll just use the default thresholds
    // In a real environment, you could implement server-side storage
  }, []);

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
        body: alertBody,
        icon: "📈"
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(alertTitle, {
            body: alertBody,
            icon: "📈"
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
        try {
          const mappedSymbol = symbolMapping[symbol];
          
          // Fetch current price
          const priceResponse = await fetch(
            `https://api.twelvedata.com/price?symbol=${mappedSymbol}&apikey=${API_KEY}`
          );
          
          if (!priceResponse.ok) {
            throw new Error(`Price API error: ${priceResponse.status}`);
          }
          
          const priceData = await priceResponse.json();
          
          if (priceData.status === 'error') {
            throw new Error(priceData.message || 'Price API returned error');
          }
          
          // Fetch ATR data
          const atrResponse = await fetch(
            `https://api.twelvedata.com/atr?symbol=${mappedSymbol}&interval=1day&time_period=14&apikey=${API_KEY}`
          );
          
          if (!atrResponse.ok) {
            throw new Error(`ATR API error: ${atrResponse.status}`);
          }
          
          const atrData = await atrResponse.json();
          
          if (atrData.status === 'error') {
            throw new Error(atrData.message || 'ATR API returned error');
          }
          
          const price = parseFloat(priceData.price);
          const atr = parseFloat(atrData.values[0].atr);
          
          if (isNaN(price) || isNaN(atr)) {
            throw new Error('Invalid price or ATR data received');
          }
          
          const atrPercent = +(100 * (atr / price)).toFixed(2);
          
          // Check if we need to send notification
          if (atrPercent >= thresholds[symbol]) {
            notify(symbol, atrPercent);
          }
          
          return {
            symbol,
            price,
            atrPercent,
            error: false,
            lastUpdate: new Date().toLocaleTimeString()
          };
          
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            price: NaN,
            atrPercent: NaN,
            error: true,
            errorMessage: err.message,
            lastUpdate: new Date().toLocaleTimeString()
          };
        }
      });

      const results = await Promise.all(promises);
      setData(results);
      setRefreshIn(300);
      
      // Check if all requests failed
      const allFailed = results.every(result => result.error);
      if (allFailed) {
        setError("All API requests failed. Please check your API key and connection.");
      }
      
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
    // Since we can't use localStorage in this environment, 
    // we'll just show a success message for the in-memory storage
    setSuccessMessage("Thresholds saved successfully! (Note: Settings will reset on page refresh)");
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

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            📈 Forex & Crypto Volatility Monitor
          </h1>
          <p className="text-gray-600 mb-4">
            Real-time ATR% monitoring with Twelve Data API
          </p>
          
          {/* API Key Warning */}
          {API_KEY === "demo" && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              ⚠️ Using demo API key. Replace with your actual Twelve Data API key for full functionality.
            </div>
          )}
          
          {/* Notification Permission Button */}
          {typeof window !== 'undefined' && "Notification" in window && Notification.permission !== "granted" && (
            <button
              onClick={requestNotificationPermission}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-4 mr-2"
            >
              🔔 Enable Notifications
            </button>
          )}
          
          {/* Status Messages */}
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              ❌ {error}
            </div>
          )}
          
          {successMessage && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              ✅ {successMessage}
            </div>
          )}
          
          {/* Refresh Timer */}
          <div className="flex items-center justify-between mb-6">
            <div className="text-gray-600">
              ⏱️ Next refresh in: <span className="font-mono font-bold">{Math.floor(refreshIn / 60)}:{(refreshIn % 60).toString().padStart(2, '0')}</span>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded"
            >
              {loading ? "🔄 Loading..." : "🔄 Refresh Now"}
            </button>
          </div>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {data.map(item => {
            const isHighVolatility = !item.error && item.atrPercent >= thresholds[item.symbol];
            
            return (
              <div
                key={item.symbol}
                className={`bg-white rounded-lg shadow-lg p-6 border-l-4 ${
                  item.error 
                    ? 'border-red-500' 
                    : isHighVolatility 
                      ? 'border-orange-500 bg-orange-50' 
                      : 'border-green-500'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {item.symbol}
                  </h3>
                  {isHighVolatility && (
                    <span className="text-orange-500 text-xl">⚠️</span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div>
                    <span className="text-gray-600 text-sm">Price:</span>
                    <div className="text-xl font-mono font-bold text-gray-800">
                      {formatPrice(item.symbol, item.price)}
                    </div>
                  </div>
                  
                  <div>
                    <span className="text-gray-600 text-sm">ATR%:</span>
                    <div className={`text-lg font-mono font-bold ${
                      item.error 
                        ? 'text-red-500' 
                        : isHighVolatility 
                          ? 'text-orange-600' 
                          : 'text-green-600'
                    }`}>
                      {item.error ? 'Error' : `${item.atrPercent}%`}
                    </div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-gray-600 text-sm">Threshold:</span>
                        <div className="text-sm font-mono text-gray-700">
                          {thresholds[item.symbol]}%
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-600 text-xs">Last update:</span>
                        <div className="text-xs font-mono text-gray-500">
                          {item.lastUpdate}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {item.error && item.errorMessage && (
                    <div className="pt-2 border-t border-red-200">
                      <span className="text-red-600 text-xs">Error:</span>
                      <div className="text-xs text-red-500">
                        {item.errorMessage}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Threshold Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ⚙️ Threshold Settings
          </h2>
          <p className="text-gray-600 mb-6">
            Set custom ATR% thresholds for volatility alerts
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {TICKERS.map(symbol => (
              <div key={symbol} className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  {symbol}
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={thresholds[symbol]}
                    onChange={(e) => updateThreshold(symbol, e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex space-x-4">
            <button
              onClick={saveThresholds}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded"
            >
              💾 Save Thresholds
            </button>
            <button
              onClick={resetThresholds}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded"
            >
              🔄 Reset to Defaults
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Data updates every 5 minutes • Powered by Twelve Data API</p>
          <p className="mt-1">
            <a 
              href="https://twelvedata.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700"
            >
              Get your free Twelve Data API key
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
