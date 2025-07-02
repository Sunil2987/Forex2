import React, { useState, useEffect } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_TWELVE_API_KEY;
const TICKERS = ["BTC/USD", "XAU/USD", "USD/JPY", "GBP/CAD", "EUR/USD"];

interface TickerData {
  symbol: string;
  price: number;
  atr: number;
  atrPercent: number;
};

function App() {
  const [data, setData] = useState<TickerData[]>([]);
  const [threshold, setThreshold] = useState<number>(
    Number(localStorage.getItem("threshold")) || 1.5
  );
  const [refreshIn, setRefreshIn] = useState(300);

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
    try {
      const promises = TICKERS.map(async (symbol) => {
        const [base, quote] = symbol.split("/");
        const response = await axios.get(
          `https://api.twelvedata.com/atr?symbol=${base}${quote}&interval=15min&apikey=${API_KEY}`
        );
        const priceResp = await axios.get(
          `https://api.twelvedata.com/price?symbol=${base}${quote}&apikey=${API_KEY}`
        );
        const atr = parseFloat(response.data.value);
        const price = parseFloat(priceResp.data.price);
        return {
          symbol,
          price,
          atr,
          atrPercent: +(100 * (atr / price)).toFixed(2),
        };
      });

      const results = await Promise.all(promises);
      setData(results);
      setRefreshIn(300);
    } catch (error) {
      console.error("Data fetch failed", error);
    }
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setThreshold(value);
    localStorage.setItem("threshold", String(value));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-4">
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold mb-2">📊 Forex + BTC Volatility Monitor</h1>
        <p className="text-sm text-gray-400">
          ATR-based volatility alert system using 15-minute candles
        </p>
      </header>

      <section className="flex flex-col items-center mb-4">
        <label className="mb-2 text-sm font-medium">
          ATR Threshold (%)
        </label>
        <input
          type="number"
          step="0.1"
          value={threshold}
          onChange={handleThresholdChange}
          className="w-24 text-center bg-gray-700 border border-gray-600 rounded py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </section>

      <div className="flex flex-col items-center mb-4">
        <button
          onClick={fetchData}
          className="bg-blue-600 hover:bg-blue-700 transition px-5 py-2 rounded text-white font-semibold mb-2"
        >
          🔄 Refresh Now
        </button>
        <p className="text-sm text-gray-300">
          ⏱ Next auto-refresh in: <span className="font-semibold">{refreshIn}s</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((item) => (
          <div
            key={item.symbol}
            className={`rounded-xl p-4 transition-all duration-300 shadow-lg border ${
              item.atrPercent >= threshold
                ? "bg-red-700 border-red-400"
                : "bg-gray-800 border-gray-700"
            }`}
          >
            <h2 className="text-xl font-semibold mb-1">{item.symbol}</h2>
            <p className="text-sm">💰 Price: {item.price.toLocaleString()}</p>
            <p className="text-sm">📈 ATR: {item.atr.toFixed(2)}</p>
            <p className="text-sm">
              📊 ATR %:{" "}
              <span
                className={`font-bold ${
                  item.atrPercent >= threshold ? "text-yellow-300" : "text-gray-300"
                }`}
              >
                {item.atrPercent}%
              </span>
            </p>
            <div className="text-3xl mt-3 text-center">
              {item.atrPercent >= threshold ? "🔥" : "💡"}
            </div>
          </div>
        ))}
      </div>

      <footer className="mt-8 text-center text-xs text-gray-400">
        🔥 = High Volatility (≥ {threshold}%) | 💡 = Normal Volatility
      </footer>
    </div>
  );
}

export default App;
