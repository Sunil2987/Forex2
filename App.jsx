// src/App.tsx
import React, { useState, useEffect } from "react";
import axios from "axios";

const API_KEY = import.meta.env.VITE_TWELVE_API_KEY;
const TICKERS = ["BTC/USD", "XAU/USD", "USD/JPY", "GBP/CAD", "EUR/USD"];

interface TickerData {
  symbol: string;
  price: number;
  atr: number;
  atrPercent: number;
}

function App() {
  const [data, setData] = useState<TickerData[]>([]);
  const [threshold, setThreshold] = useState<number>(
    Number(localStorage.getItem("threshold")) || 1.5
  );
  const [refreshIn, setRefreshIn] = useState(300);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setRefreshIn((t) => (t > 0 ? t - 1 : 0)), 1000);
    const refresh = setInterval(() => fetchData(), 300000); // 5 min
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
    <div className="min-h-screen bg-gray-900 text-white px-4 py-6">
      <h1 className="text-2xl font-bold mb-2 text-center">
        Forex + BTC Volatility Monitor
      </h1>
      <p className="text-center mb-4">
        ATR Threshold:{" "}
        <input
          type="number"
          className="bg-gray-800 border px-2 py-1 rounded w-20 text-white text-center"
          value={threshold}
          onChange={handleThresholdChange}
          step="0.1"
        />{" "}
        %
      </p>
      <button
        onClick={fetchData}
        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded mb-4 block mx-auto"
      >
        Refresh Now
      </button>
      <p className="text-center text-sm mb-2">Next auto-refresh in: {refreshIn}s</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.map((item) => (
          <div
            key={item.symbol}
            className={`p-4 rounded shadow-md ${
              item.atrPercent >= threshold ? "bg-red-700" : "bg-gray-800"
            }`}
          >
            <h2 className="text-lg font-semibold">{item.symbol}</h2>
            <p>Price: {item.price.toLocaleString()}</p>
            <p>ATR: {item.atr.toFixed(2)}</p>
            <p>
              ATR %:{" "}
              <span
                className={
                  item.atrPercent >= threshold ? "text-yellow-300 font-bold" : ""
                }
              >
                {item.atrPercent}%
              </span>
            </p>
            <p className="text-xl mt-2">
              {item.atrPercent >= threshold ? "🔥" : "💡"}
            </p>
          </div>
        ))}
      </div>

      <div className="text-xs text-gray-400 mt-6 text-center">
        🔥 = High Volatility (≥ {threshold}%) | 💡 = Normal Volatility
      </div>
    </div>
  );
}

export default App;
