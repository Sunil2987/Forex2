import React, { useState, useEffect } from "react";

const API_KEY = "495fa3a802b3498e96b09e7092ab0839"; // Replace with your actual Twelve Data API key
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
  const [viewMode, setViewMode] = useState("table"); // table or cards
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    // Check notification permission status
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
      tag: symbol // Prevents duplicate notifications
    });
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const promises = TICKERS.map(async (symbol) => {
        try {
          // Fetch time series data for more accurate ATR calculation
          const timeSeriesResponse = await fetch(
            `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${API_KEY}`
          );
          
          if (!timeSeriesResponse.ok) {
            throw new Error(`API error: ${timeSeriesResponse.status}`);
          }
          
          const timeSeriesData = await timeSeriesResponse.json();
          
          if (timeSeriesData.status === 'error') {
            throw new Error(timeSeriesData.message || 'API returned error');
          }
          
          const values = timeSeriesData.values;
          if (!values || values.length < 14) {
            throw new Error('Insufficient data for ATR calculation');
          }
          
          // Calculate ATR manually for more accurate results
          const currentPrice = parseFloat(values[0].close);
          const atr = calculateATR(values.slice(0, 14));
          const atrPercent = +(100 * (atr / currentPrice)).toFixed(2);
          
          // Check if we need to send notification
          if (atrPercent >= thresholds[symbol]) {
            notify(symbol, atrPercent);
          }
          
          return {
            symbol,
            price: currentPrice,
            atrPercent,
            atrValue: atr,
            high24h: Math.max(...values.slice(0, 1).map(v => parseFloat(v.high))),
            low24h: Math.min(...values.slice(0, 1).map(v => parseFloat(v.low))),
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
            atrValue: NaN,
            high24h: NaN,
            low24h: NaN,
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

  // Calculate ATR (Average True Range)
  const calculateATR = (prices) => {
    if (prices.length < 2) return 0;
    
    const trueRanges = [];
    for (let i = 0; i < prices.length - 1; i++) {
      const current = prices[i];
      const previous = prices[i + 1];
      
      const high = parseFloat(current.high);
      const low = parseFloat(current.low);
      const prevClose = parseFloat(previous.close);
      
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      trueRanges.push(tr);
    }
    
    return trueRanges.reduce((sum, tr) => sum + tr, 0) / trueRanges.length;
  };

  const formatPrice = (symbol, price) => {
    if (isNaN(price)) return "Error";
    
    if (symbol === "BTC/USD") {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else if (symbol === "XAU/USD") {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    } else {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission();
      setNotificationsEnabled(permission === "granted");
      if (permission === "granted") {
        setSuccessMessage("Notifications enabled successfully!");
        setTimeout(() => setSuccessMessage(""), 3000);
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
      setSuccessMessage("Thresholds reset to defaults!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  const getVolatilityStatus = (atrPercent, threshold) => {
    if (atrPercent >= threshold * 1.5) return { status: "High", color: "text-red-600", bg: "bg-red-50", icon: "🔥" };
    if (atrPercent >= threshold) return { status: "Alert", color: "text-orange-600", bg: "bg-orange-50", icon: "⚠️" };
    if (atrPercent >= threshold * 0.7) return { status: "Medium", color: "text-yellow-600", bg: "bg-yellow-50", icon: "📊" };
    return { status: "Low", color: "text-green-600", bg: "bg-green-50", icon: "📈" };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-4 md:mb-0">
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📈 Forex & Crypto Volatility Monitor
              </h1>
              <p className="text-gray-600">
                Real-time ATR% monitoring with enhanced calculations
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setViewMode(viewMode === "table" ? "cards" : "table")}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                {viewMode === "table" ? "📊 Card View" : "📋 Table View"}
              </button>
              
              {!notificationsEnabled && (
                <button
                  onClick={requestNotificationPermission}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  🔔 Enable Alerts
                </button>
              )}
            </div>
          </div>
          
          {/* Status Messages */}
          {error && (
            <div className="mt-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
              ❌ {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg">
              ✅ {successMessage}
            </div>
          )}
          
          {/* Refresh Timer */}
          <div className="mt-4 flex items-center justify-between">
            <div className="text-gray-600">
              ⏱️ Next refresh in: <span className="font-mono font-bold text-indigo-600">{Math.floor(refreshIn / 60)}:{(refreshIn % 60).toString().padStart(2, '0')}</span>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {loading ? "🔄 Loading..." : "🔄 Refresh Now"}
            </button>
          </div>
        </div>

        {/* Data Display */}
        {viewMode === "table" ? (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider">Symbol</th>
                    <th className="px-8 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">ATR%</th>
                    <th className="px-8 py-4 text-right text-sm font-semibold text-gray-700 uppercase tracking-wider">Price</th>
                    <th className="px-8 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">24h Change</th>
                    <th className="px-8 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((item) => {
                    const volatility = getVolatilityStatus(item.atrPercent, thresholds[item.symbol]);
                    return (
                      <tr key={item.symbol} className={`hover:bg-gray-50 ${volatility.bg} border-b border-gray-100`}>
                        <td className="px-8 py-6 whitespace-nowrap">
                          <div className="text-lg font-bold text-gray-900">{item.symbol}</div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center">
                          <div className={`text-xl font-bold ${volatility.color}`}>
                            {item.error ? 'Error' : `${item.atrPercent}%`}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-right">
                          <div className="text-lg font-mono font-semibold text-gray-900">
                            {formatPrice(item.symbol, item.price)}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center">
                          <div className={`text-lg font-bold ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {item.error ? 'Error' : `${item.change >= 0 ? '+' : ''}${item.change}%`}
                          </div>
                        </td>
                        <td className="px-8 py-6 whitespace-nowrap text-center">
                          <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${volatility.color.replace('text-', 'bg-').replace('600', '100')} ${volatility.color}`}>
                            {volatility.icon} {volatility.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Table Footer with Additional Info */}
            <div className="bg-gray-50 px-8 py-4 border-t border-gray-200">
              <div className="flex flex-wrap justify-between items-center gap-4">
                <div className="flex flex-wrap gap-6">
                  {data.map((item) => (
                    <div key={item.symbol} className="text-sm text-gray-600">
                      <span className="font-medium">{item.symbol}</span> threshold: {thresholds[item.symbol]}%
                    </div>
                  ))}
                </div>
                <div className="text-sm text-gray-500">
                  Last updated: {data.length > 0 ? data[0].lastUpdate : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            {data.map(item => {
              const volatility = getVolatilityStatus(item.atrPercent, thresholds[item.symbol]);
              
              return (
                <div
                  key={item.symbol}
                  className={`bg-white rounded-lg shadow-lg p-6 border-l-4 transition-all hover:shadow-xl ${
                    item.error 
                      ? 'border-red-500' 
                      : volatility.status === 'High' 
                        ? 'border-red-500' 
                        : volatility.status === 'Alert'
                          ? 'border-orange-500'
                          : 'border-green-500'
                  } ${volatility.bg}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">
                      {item.symbol}
                    </h3>
                    <span className="text-2xl">{volatility.icon}</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Price:</span>
                      <span className="text-lg font-mono font-bold text-gray-800">
                        {formatPrice(item.symbol, item.price)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">24h Change:</span>
                      <span className={`text-sm font-mono font-bold ${
                        item.error ? 'text-red-500' : item.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.error ? 'Error' : `${item.change >= 0 ? '+' : ''}${item.change}%`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">ATR%:</span>
                      <span className={`text-lg font-mono font-bold ${volatility.color}`}>
                        {item.error ? 'Error' : `${item.atrPercent}%`}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600 text-sm">Status:</span>
                      <span className={`text-sm font-medium ${volatility.color}`}>
                        {volatility.status}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Threshold: {thresholds[item.symbol]}%</span>
                        <span>{item.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Threshold Settings */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            ⚙️ Threshold Settings
          </h2>
          <p className="text-gray-600 mb-6">
            Set custom ATR% thresholds for volatility alerts. These settings are stored in memory and will reset on page refresh.
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
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  <span className="text-gray-500 text-sm">%</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={resetThresholds}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              🔄 Reset to Defaults
            </button>
            <div className="text-sm text-gray-500 flex items-center">
              💡 Tip: Settings are stored in memory and will reset on page refresh
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>Data updates every 5 minutes • Enhanced ATR calculations • Real-time notifications</p>
          <p className="mt-1">
            <a 
              href="https://twelvedata.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              Powered by Twelve Data API
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
