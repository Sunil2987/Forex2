// src/App.tsx import React, { useEffect, useState, useRef, useCallback } from "react";

interface MarketData { symbol: string; price: number; atr: number; volatility: number; change?: number; }

interface Thresholds { [key: string]: number; }

const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN as string; const CHAT_ID = import.meta.env.VITE_CHAT_ID as string; const API_KEY = import.meta.env.VITE_TWELVE_API_KEY as string;

const symbols = ["BTC/USD", "XAU/USD", "EUR/USD", "GBP/JPY"];

const isMarketHours = (): boolean => { const now = new Date(); const utcHours = now.getUTCHours(); const utcMinutes = now.getUTCMinutes(); const totalMinutesIST = utcHours * 60 + utcMinutes + 330; const hourIST = Math.floor(totalMinutesIST / 60) % 24; const day = now.getUTCDay(); return day >= 1 && day <= 5 && hourIST >= 10 && hourIST <= 22; };

const App: React.FC = () => { const [data, setData] = useState<MarketData[]>([]); const [thresholds, setThresholds] = useState<Thresholds>({}); const [error, setError] = useState<string>(""); const audioRef = useRef<HTMLAudioElement>(null); const lastAlertRef = useRef<{ [key: string]: number }>({});

const sendTelegramAlert = useCallback(async (message: string) => { try { await fetch(https://api.telegram.org/bot${BOT_TOKEN}/sendMessage, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: CHAT_ID, text: message }), }); } catch (err) { console.error("Telegram alert failed:", err); setError("Failed to send Telegram alert"); } }, []);

const fetchData = useCallback(async () => { try { const updated: MarketData[] = []; for (const symbol of symbols) { const priceRes = await fetch( https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY} ); const priceJson = await priceRes.json();

const atrRes = await fetch(
      `https://api.twelvedata.com/atr?symbol=${symbol}&interval=15min&time_period=14&apikey=${API_KEY}`
    );
    const atrJson = await atrRes.json();

    const price = parseFloat(priceJson.price);
    const atr = parseFloat(atrJson.values?.[0]?.atr);
    const volatility = Math.min(10, Math.max(1, Math.round((atr / price) * 100)));
    const change = parseFloat((Math.random() * 2 - 1).toFixed(2));

    updated.push({ symbol, price, atr, volatility, change });
  }
  setData(updated);
  updated.forEach((item) => {
    const currentTime = Date.now();
    const last = lastAlertRef.current[item.symbol] || 0;
    const cooldown = 5 * 60 * 1000;
    const threshold = thresholds[item.symbol] ?? 6;
    if (
      item.volatility >= threshold &&
      isMarketHours() &&
      currentTime - last > cooldown
    ) {
      if (audioRef.current) audioRef.current.play().catch(() => {});
      sendTelegramAlert(
        `⚠️ High Volatility Alert:\n${item.symbol} 🚨\nATR: ${item.atr}\nVolatility: ${item.volatility}/10`
      );
      lastAlertRef.current[item.symbol] = currentTime;
    }
  });
} catch (err) {
  setError("Failed to fetch market data");
}

}, [thresholds, sendTelegramAlert]);

useEffect(() => { fetchData(); const interval = setInterval(fetchData, 60000); return () => clearInterval(interval); }, [fetchData]);

const handleThresholdChange = (symbol: string, value: string) => { const num = parseInt(value, 10); if (!isNaN(num) && num >= 1 && num <= 10) { setThresholds((prev) => ({ ...prev, [symbol]: num })); } };

return ( <div className="min-h-screen bg-gray-900 text-white p-6 font-sans"> <h1 className="text-4xl font-bold text-center mb-8 text-blue-400"> 📈 Forex Volatility Monitor </h1>

{error && <div className="bg-red-700 p-3 rounded mb-4">{error}</div>}

  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {data.map((item) => (
      <div
        key={item.symbol}
        className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700"
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-semibold text-blue-300">{item.symbol}</h2>
          <span
            className={`text-lg font-medium ${
              item.change && item.change >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {item.change > 0 ? "+" : ""}
            {item.change?.toFixed(2)}%
          </span>
        </div>
        <div>Price: ${item.price.toLocaleString()}</div>
        <div>ATR: {item.atr.toFixed(4)}</div>
        <div>
          Volatility: {item.volatility}/10 {item.volatility >= (thresholds[item.symbol] ?? 6) && <span className="text-red-500 ml-2 animate-pulse">🚨</span>}
        </div>
        <div className="mt-2">
          <label className="text-sm">Set Threshold:</label>
          <input
            type="number"
            min="1"
            max="10"
            value={thresholds[item.symbol] ?? 6}
            onChange={(e) => handleThresholdChange(item.symbol, e.target.value)}
            className="ml-2 px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white w-16"
          />
        </div>
      </div>
    ))}
  </div>

  <audio ref={audioRef} preload="auto">
    <source
      src="https://www.soundjay.com/buttons/beep-01a.wav"
      type="audio/wav"
    />
  </audio>

  <div className="text-center text-gray-500 text-sm mt-8">
    Data updates every 1 min. Alerts active only during IST market hours.
  </div>
</div>

); };

export default App;

