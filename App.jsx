import React, { useState, useEffect } from "react";

const API_KEY = import.meta.env.VITE_TWELVE_API_KEY;
const TICKERS = ["BTC/USD", "XAU/USD", "USD/JPY", "GBP/CAD", "EUR/USD"];

function App() {
  const [data, setData] = useState([]);
  const [threshold, setThreshold] = useState(
    Number(localStorage.getItem("threshold")) || 1.5
  );
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setRefreshIn((t) => (t > 0 ? t - 1 : 0)), 1000);
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
          const atrResponse = await fetch(
            `https://api.twelvedata.com/atr?symbol=${base}${quote}&interval=15min&apikey=${API_KEY}`
          );
          const atrData = await atrResponse.json();
          
          const priceResponse = await fetch(
            `https://api.twelvedata.com/price?symbol=${base}${quote}&apikey=${API_KEY}`
          );
          const priceData = await priceResponse.json();
          
          // Check for API errors
          if (atrData.status === "error" || priceData.status === "error") {
            throw new Error(`API Error for ${symbol}`);
          }
          
          const atr = parseFloat(atrData.value || atrData.values?.[0]?.atr);
          const price = parseFloat(priceData.price);
          
          // Validate numbers
          if (isNaN(atr) || isNaN(price) || price === 0) {
            throw new Error(`Invalid data for ${symbol}`);
          }
          
          return {
            symbol,
            price,
            atr,
            atrPercent: +(100 * (atr / price)).toFixed(2),
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            price: 0,
            atr: 0,
            atrPercent: 0,
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

  const handleThresholdChange = (e) => {
    const value = parseFloat(e.target.value);
    setThreshold(value);
    localStorage.setItem("threshold", String(value));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-8 pt-8">
          <h1 className="text-4xl font-bold mb-2 text-cyan-400">
            📊 Forex + BTC Volatility Monitor
          </h1>
          <p className="text-sm text-gray-400">
            ATR-based volatility alert system using 15-minute candles
          </p>
        </header>

        <div className="flex flex-col items-center mb-6">
          <label className="mb-2 text-sm font-medium">
            ATR Threshold (%)
          </label>
          <input
            type="number"
            step="0.1"
            value={threshold}
            onChange={handleThresholdChange}
            className="w-24 text-center bg-gray-700 border border-gray-600 rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex flex-col items-center mb-8">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-600 transition px-8 py-3 rounded-lg text-white font-semibold mb-4"
          >
            {loading ? "⏳ Loading..." : "🔄 Refresh Now"}
          </button>
          <p className="text-sm text-gray-300">
            ⏱ Next auto-refresh in: <span className="font-semibold">{refreshIn}s</span>
          </p>
        </div>

        {error && (
          <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-6 text-center">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Table Layout */}
        <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl">
          <div className="grid grid-cols-4 gap-4 p-4 bg-gray-700 font-semibold text-cyan-400">
            <div>Ticker</div>
            <div className="text-right">Price</div>
            <div className="text-right">Vol %</div>
            <div className="text-center">Status</div>
          </div>
          
          {data.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-400">
              No data available. Click Refresh Now to load data.
            </div>
          ) : (
            data.map((item, index) => (
              <div 
                key={item.symbol}
                className={`grid grid-cols-4 gap-4 p-4 border-b border-gray-700 last:border-b-0 ${
                  item.error ? 'bg-red-900/20' : 'hover:bg-gray-700/50'
                }`}
              >
                <div className="font-semibold text-lg">{item.symbol}</div>
                <div className="text-right">
                  {item.error ? 'Error' : item.price.toLocaleString(undefined, {
                    minimumFractionDigits: item.price < 10 ? 4 : 2,
                    maximumFractionDigits: item.price < 10 ? 4 : 2
                  })}
                </div>
                <div className="text-right font-bold">
                  {item.error ? 'N/A' : `${item.atrPercent}%`}
                </div>
                <div className="text-center text-2xl">
                  {item.error ? '❌' : (item.atrPercent >= threshold ? '🔥' : '💡')}
                </div>
              </div>
            ))
          )}
        </div>

        <footer className="mt-8 text-center text-xs text-gray-400">
          🔥 = High Volatility (≥ {threshold}%) | 💡 = Normal Volatility | ❌ = Data Error
        </footer>
      </div>
    </div>
  );
}

export default App;
