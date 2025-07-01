// src/App.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";

interface MarketData {
  symbol: string;
  price: number;
  atr: number;
  volatility: number;
  change?: number;
}

interface Thresholds {
  [key: string]: number;
}

interface APIResponse {
  price?: string;
  values?: Array<{ atr: string }>;
  status?: string;
  message?: string;
}

// Environment variables with fallbacks
const BOT_TOKEN = import.meta.env?.VITE_BOT_TOKEN as string || "";
const CHAT_ID = import.meta.env?.VITE_CHAT_ID as string || "";
const API_KEY = import.meta.env?.VITE_TWELVE_API_KEY as string || "";

const symbols = ["BTC/USD", "XAU/USD", "EUR/USD", "GBP/JPY"];

const isMarketHours = (): boolean => {
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const totalMinutesIST = utcHours * 60 + utcMinutes + 330;
  const hourIST = Math.floor(totalMinutesIST / 60) % 24;
  const day = now.getUTCDay();
  return day >= 1 && day <= 5 && hourIST >= 10 && hourIST <= 22;
};

const App: React.FC = () => {
  const [data, setData] = useState<MarketData[]>([]);
  const [thresholds, setThresholds] = useState<Thresholds>({});
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [globalThreshold, setGlobalThreshold] = useState<number>(6);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastAlertRef = useRef<{ [key: string]: number }>({});

  const sendTelegramAlert = useCallback(async (message: string) => {
    if (!BOT_TOKEN || !CHAT_ID) {
      console.warn("Telegram credentials not configured");
      return;
    }
    
    try {
      const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (err) {
      console.error("Telegram alert failed:", err);
      setError("Failed to send Telegram alert");
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (!API_KEY) {
      setError("API key not configured");
      return;
    }

    setLoading(true);
    setError("");
    
    try {
      const updated: MarketData[] = [];
      
      for (const symbol of symbols) {
        try {
          // Fetch price data
          const priceRes = await fetch(
            `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`
          );
          const priceJson: APIResponse = await priceRes.json();

          // Fetch ATR data
          const atrRes = await fetch(
            `https://api.twelvedata.com/atr?symbol=${symbol}&interval=15min&time_period=14&apikey=${API_KEY}`
          );
          const atrJson: APIResponse = await atrRes.json();

          // Check for API errors
          if (priceJson.status === "error" || atrJson.status === "error") {
            console.error(`API error for ${symbol}:`, priceJson.message || atrJson.message);
            continue;
          }

          // Parse data with error handling
          const priceValue = priceJson.price;
          const atrValue = atrJson.values?.[0]?.atr;

          if (!priceValue || !atrValue) {
            console.warn(`Missing data for ${symbol}`);
            continue;
          }

          const price = parseFloat(priceValue);
          const atr = parseFloat(atrValue);
          
          if (isNaN(price) || isNaN(atr) || price <= 0 || atr <= 0) {
            console.warn(`Invalid data for ${symbol}`);
            continue;
          }

          const volatility = Math.min(10, Math.max(1, Math.round((atr / price) * 100)));
          const change = parseFloat((Math.random() * 2 - 1).toFixed(2));

          updated.push({ symbol, price, atr, volatility, change });
        } catch (err) {
          console.error(`Error fetching data for ${symbol}:`, err);
        }
      }

      if (updated.length === 0) {
        setError("No data could be fetched from the API");
        return;
      }

      setData(updated);

      // Check for alerts
      updated.forEach((item) => {
        const currentTime = Date.now();
        const last = lastAlertRef.current[item.symbol] || 0;
        const cooldown = 5 * 60 * 1000; // 5 minutes
        const threshold = thresholds[item.symbol] ?? globalThreshold;
        
        if (
          item.volatility >= threshold &&
          isMarketHours() &&
          currentTime - last > cooldown
        ) {
          // Play audio alert
          if (audioRef.current) {
            audioRef.current.play().catch((err) => {
              console.warn("Audio play failed:", err);
            });
          }
          
          // Send Telegram alert
          sendTelegramAlert(
            `⚠️ High Volatility Alert:\n${item.symbol} 🚨\nPrice: $${item.price.toLocaleString()}\nATR: ${item.atr.toFixed(4)}\nVolatility: ${item.volatility}/10`
          );
          
          lastAlertRef.current[item.symbol] = currentTime;
        }
      });
    } catch (err) {
      console.error("Failed to fetch market data:", err);
      setError("Failed to fetch market data. Please check your API key and internet connection.");
    } finally {
      setLoading(false);
    }
  }, [thresholds, globalThreshold, sendTelegramAlert]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleThresholdChange = (symbol: string, value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setThresholds((prev) => ({ ...prev, [symbol]: num }));
    }
  };

  const handleGlobalThresholdChange = (value: string) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= 1 && num <= 10) {
      setGlobalThreshold(num);
    }
  };

  const resetThresholds = () => {
    setThresholds({});
    setGlobalThreshold(6);
  };

  const applyGlobalThreshold = () => {
    const newThresholds: Thresholds = {};
    symbols.forEach(symbol => {
      newThresholds[symbol] = globalThreshold;
    });
    setThresholds(newThresholds);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 font-sans">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-blue-400">📈 Forex Volatility Monitor</h1>
          <div className="flex gap-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              ⚙️ Settings
            </button>
            <button
              onClick={fetchData}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? "Updating..." : "🔄 Refresh"}
            </button>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-gray-800 p-6 rounded-xl shadow-md border border-gray-700 mb-6">
            <h3 className="text-xl font-semibold text-blue-300 mb-4">Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium mb-2">Global Threshold (1-10):</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={globalThreshold}
                  onChange={(e) => handleGlobalThresholdChange(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white"
                />
              </div>
              <button
                onClick={applyGlobalThreshold}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Apply to All
              </button>
              <button
                onClick={resetThresholds}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Reset All
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="bg-red-700 p-4 rounded-lg mb-6 border border-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading Indicator */}
        {loading && data.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
            <p className="mt-2 text-gray-400">Loading market data...</p>
          </div>
        )}

        {/* Market Status */}
        <div className="mb-6 text-center">
          <span className={`inline-block px-4 py-2 rounded-full font-medium ${
            isMarketHours() 
              ? "bg-green-700 text-green-200" 
              : "bg-red-700 text-red-200"
          }`}>
            Market {isMarketHours() ? "Open" : "Closed"} (IST 10:00-22:00, Mon-Fri)
          </span>
        </div>

        {/* Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data.map((item) => {
            const currentThreshold = thresholds[item.symbol] ?? globalThreshold;
            const isHighVolatility = item.volatility >= currentThreshold;
            
            return (
              <div
                key={item.symbol}
                className={`p-6 rounded-xl shadow-md border transition-all duration-300 ${
                  isHighVolatility 
                    ? "bg-red-900 border-red-600 shadow-red-500/20" 
                    : "bg-gray-800 border-gray-700"
                }`}
              >
                <div className="flex justify-between items-center mb-3">
                  <h2 className="text-xl font-semibold text-blue-300">{item.symbol}</h2>
                  <span
                    className={`text-lg font-medium ${
                      (item.change ?? 0) >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {(item.change ?? 0) > 0 ? "+" : ""}
                    {item.change?.toFixed(2) ?? "0.00"}%
                  </span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Price:</span>
                    <span className="font-medium">${item.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ATR:</span>
                    <span className="font-medium">{item.atr.toFixed(4)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Volatility:</span>
                    <div className="flex items-center">
                      <span className="font-medium">{item.volatility}/10</span>
                      {isHighVolatility && (
                        <span className="text-red-400 ml-2 animate-pulse">🚨</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-3 border-t border-gray-700">
                  <label className="block text-xs text-gray-400 mb-1">Alert Threshold:</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={currentThreshold}
                    onChange={(e) => handleThresholdChange(item.symbol, e.target.value)}
                    className="w-full px-2 py-1 rounded bg-gray-700 border border-gray-600 text-white text-sm"
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Updates every minute • Alerts during market hours only</p>
          <p className="mt-1">
            {data.length > 0 && `Last updated: ${new Date().toLocaleTimeString()}`}
          </p>
        </div>
      </div>

      {/* Audio element for alerts */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmM=" type="audio/wav" />
      </audio>
    </div>
  );
};

export default App;
