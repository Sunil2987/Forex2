import React, { useState, useEffect } from "react";

const API_KEY = "demo"; // Replace with your actual API key
const TICKERS = ["BTC/USD", "XAU/USD", "USD/JPY", "GBP/CAD", "EUR/USD"];

function App() {
  const [data, setData] = useState([]);
  const [threshold, setThreshold] = useState(2.5);
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedThreshold, setSavedThreshold] = useState(2.5);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setRefreshIn((t) => (t > 0 ? t - 1 : 300)), 1000);
    const refresh = setInterval(() => fetchData(), 300000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const promises = TICKERS.map(async (symbol) => {
        const [base, quote] = symbol.split("/");
        
        try {
          // Simulate API calls with demo data for now
          const simulatedData = {
            "BTC/USD": { price: 107783.3900, atr: 248.00 },
            "XAU/USD": { price: 3284.3000, atr: 5.58 },
            "USD/JPY": { price: 144.6150, atr: 0.23 },
            "GBP/CAD": { price: 1.8767, atr: 0.0028 },
            "EUR/USD": { price: 1.0234, atr: 0.0015 }
          };
          
          const mockData = simulatedData[symbol];
          if (mockData) {
            const { price, atr } = mockData;
            return {
              symbol,
              price,
              atr,
              atrPercent: +(100 * (atr / price)).toFixed(2),
            };
          }
          
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            price: NaN,
            atr: NaN,
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
      setError("Failed to fetch data. Please check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    if (isNaN(price)) return "NaN";
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  };

  const formatAtr = (atr) => {
    if (isNaN(atr)) return "NaN";
    return atr.toFixed(2);
  };

  const formatAtrPercent = (atrPercent) => {
    if (isNaN(atrPercent)) return "NaN%";
    return `${atrPercent.toFixed(2)}%`;
  };

  const saveThreshold = () => {
    setSavedThreshold(threshold);
    alert(`Threshold saved: ${threshold}%`);
  };

  const getStatusIcon = (item) => {
    if (item.error || isNaN(item.atrPercent)) return '❌';
    return item.atrPercent >= savedThreshold ? '🔥' : '💡';
  };

  const getStatusText = (item) => {
    if (item.error || isNaN(item.atrPercent)) return 'Error';
    return item.atrPercent >= savedThreshold ? 'High Volatility' : 'Normal';
  };

  const getRowClass = (item) => {
    if (item.error || isNaN(item.atrPercent)) return 'bg-red-900/20 border-red-600/30';
    if (item.atrPercent >= savedThreshold) return 'bg-orange-900/20 border-orange-600/30';
    return 'bg-gray-800/50 border-gray-600/30';
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
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
          {/* Threshold Controls */}
          <div className="flex-1">
            <label className="block text-white text-sm font-medium mb-2">
              ATR Threshold (%)
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0)}
                className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={saveThreshold}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-medium whitespace-nowrap"
              >
                Save
              </button>
            </div>
          </div>

          {/* Refresh Controls */}
          <div className="flex-1">
            <label className="block text-white text-sm font-medium mb-2">
              Controls
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

      {/* Error Message */}
      {error && (
        <div className="mb-4 bg-red-900/30 border border-red-600 rounded-lg p-4">
          <p className="text-red-200 text-center text-sm">{error}</p>
        </div>
      )}

      {/* Table View */}
      <div className="bg-gray-900/50 rounded-lg overflow-hidden border border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800 border-b border-gray-600">
                <th className="text-left p-4 text-white font-medium">Symbol</th>
                <th className="text-right p-4 text-white font-medium">Price</th>
                <th className="text-right p-4 text-white font-medium">ATR</th>
                <th className="text-right p-4 text-white font-medium">ATR %</th>
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
                        {formatPrice(item.price)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="text-white font-mono">
                        {formatAtr(item.atr)}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className={`font-mono font-medium ${
                        item.error || isNaN(item.atrPercent) ? 'text-red-400' :
                        item.atrPercent >= savedThreshold ? 'text-orange-400' : 'text-green-400'
                      }`}>
                        {formatAtrPercent(item.atrPercent)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <span className="text-2xl">{getStatusIcon(item)}</span>
                        <span className={`text-sm font-medium ${
                          item.error || isNaN(item.atrPercent) ? 'text-red-400' :
                          item.atrPercent >= savedThreshold ? 'text-orange-400' : 'text-green-400'
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
          <span>🔥 High Volatility (≥ {savedThreshold}%)</span>
          <span>💡 Normal Volatility</span>
          <span>❌ Data Error</span>
        </div>
      </div>
    </div>
  );
}

export default App;
