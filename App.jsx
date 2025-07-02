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

  // Load saved thresholds from localStorage on component mount
  useEffect(() => {
    // Check if we're in browser environment
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const savedThresholds = localStorage.getItem('volatilityThresholds');
        if (savedThresholds) {
          const parsed = JSON.parse(savedThresholds);
          // Validate the loaded thresholds
          const validThresholds = {};
          TICKERS.forEach(symbol => {
            const value = parseFloat(parsed[symbol]);
            validThresholds[symbol] = !isNaN(value) && value >= 0 ? value : defaultThresholds[symbol];
          });
          setThresholds(validThresholds);
        }
      } catch (e) {
        console.error("Failed to parse saved thresholds", e);
      }
    }
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
          // Simulate API calls with demo data for now
          const simulatedData = {
            "BTC/USD": { price: 107783, atr: 2483.00 },
            "XAU/USD": { price: 2684, atr: 45.58 },
            "EUR/GBP": { price: 0.8234, atr: 0.0125 },
            "AUD/JPY": { price: 99.6150, atr: 1.23 }
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
          
          return {
            symbol,
            price: NaN,
            atrPercent: NaN,
            error: true
          };
          
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
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.setItem('volatilityThresholds', JSON.stringify(thresholds));
        setSuccessMessage("Thresholds saved successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (e) {
        console.error("Failed to save thresholds", e);
        setError("Failed to save thresholds");
      }
    }
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
      // Remove from localStorage to use defaults
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('volatilityThresholds');
      }
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
            Real-time ATR% monitoring with customizable alerts
          </p>
          
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
                    <span className="text-gray-600 text-sm">Threshold:</span>
                    <div className="text-sm font-mono text-gray-700">
                      {thresholds[item.symbol]}%
                    </div>
                  </div>
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
          <p>Data updates every 5 minutes • Using demo data</p>
        </div>
      </div>
    </div>
  );
}

export default App;
