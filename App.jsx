import React, { useState, useEffect } from "react";

const API_KEY = "demo"; // Replace with your actual API key
const TICKERS = ["BTC/USD", "XAU/USD", "USD/JPY", "GBP/CAD", "EUR/USD"];

function App() {
  const [data, setData] = useState([]);
  const [threshold, setThreshold] = useState(1.5);
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
          // Replace this with actual API calls when you have a valid API key
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
          
          // Uncomment below for actual API calls:
          /*
          const atrResponse = await fetch(
            `https://api.twelvedata.com/atr?symbol=${base}${quote}&interval=15min&apikey=${API_KEY}`
          );
          const atrData = await atrResponse.json();
          
          const priceResponse = await fetch(
            `https://api.twelvedata.com/price?symbol=${base}${quote}&apikey=${API_KEY}`
          );
          const priceData = await priceResponse.json();
          
          if (atrData.status === "error" || priceData.status === "error") {
            throw new Error(`API Error for ${symbol}`);
          }
          
          const atr = parseFloat(atrData.value || atrData.values?.[0]?.atr);
          const price = parseFloat(priceData.price);
          
          if (isNaN(atr) || isNaN(price) || price === 0) {
            throw new Error(`Invalid data for ${symbol}`);
          }
          
          return {
            symbol,
            price,
            atr,
            atrPercent: +(100 * (atr / price)).toFixed(2),
          };
          */
          
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

  const formatPrice = (price, symbol) => {
    if (symbol === "BTC/USD") {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    } else if (symbol === "XAU/USD") {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    } else if (symbol === "USD/JPY") {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    } else {
      return price.toLocaleString(undefined, {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="px-4 pt-8 pb-6">
        <h1 className="text-2xl font-bold text-green-400 mb-8 text-center">
          Forex + BTC Volatility Monitor
        </h1>
        
        {/* Refresh Button */}
        <div className="flex justify-center mb-4">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-green-400 text-black px-8 py-3 rounded-lg font-semibold disabled:opacity-50"
          >
            {loading ? "Loading..." : "Refresh Now"}
          </button>
        </div>
        
        {/* Timer */}
        <div className="text-center text-gray-400 mb-6">
          Next auto-refresh in: <span className="text-white">{refreshIn}s</span>
        </div>
      </div>

      {/* Table Header */}
      <div className="px-4">
        <div className="grid grid-cols-4 gap-4 pb-4 text-green-400 font-semibold">
          <div>Ticker</div>
          <div className="text-right">Price</div>
          <div className="text-right">Vol %</div>
          <div className="text-center">Bulbs</div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/30 border border-red-600 rounded-lg p-4 mb-4">
            <p className="text-red-200 text-center">{error}</p>
          </div>
        )}

        {/* Data Rows */}
        <div className="space-y-0">
          {data.length === 0 && !loading ? (
            <div className="py-8 text-center text-gray-400">
              No data available. Click Refresh Now to load data.
            </div>
          ) : (
            data.map((item, index) => (
              <div 
                key={item.symbol}
                className={`grid grid-cols-4 gap-4 py-4 border-b border-gray-800 ${
                  item.error ? 'text-red-400' : ''
                }`}
              >
                <div className="text-white font-medium">{item.symbol}</div>
                <div className="text-right text-white">
                  {item.error ? 'Error' : formatPrice(item.price, item.symbol)}
                </div>
                <div className="text-right text-white">
                  {item.error ? 'N/A' : item.atrPercent.toFixed(2)}
                </div>
                <div className="text-center text-xl">
                  {item.error ? '❌' : (item.atrPercent >= threshold ? '🔥' : '💡')}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Threshold Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 p-4 border-t border-gray-800">
        <div className="flex items-center justify-center space-x-4">
          <span className="text-sm text-gray-400">Threshold:</span>
          <input
            type="number"
            step="0.1"
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-20 text-center bg-gray-800 border border-gray-600 rounded py-1 px-2 text-white focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <span className="text-sm text-gray-400">%</span>
        </div>
        <div className="text-center text-xs text-gray-500 mt-2">
          🔥 = High Volatility (≥ {threshold}%) | 💡 = Normal Volatility
        </div>
      </div>
    </div>
  );
}

export default App;
