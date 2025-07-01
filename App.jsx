import React, { useState, useEffect, useRef } from 'react'; import { AlertCircle, TrendingUp, Activity, RefreshCw, Zap } from 'lucide-react';

const SYMBOLS = [ { symbol: 'BTCUSD', display: 'BTC/USD', type: 'crypto' }, { symbol: 'XAUUSD', display: 'XAU/USD', type: 'metal' }, { symbol: 'GBPCAD', display: 'GBP/CAD', type: 'forex' }, { symbol: 'USDJPY', display: 'USD/JPY', type: 'forex' } ];

const ATR_THRESHOLD = 1.5; const DEFAULT_THRESHOLDS = { BTCUSD: 2.5, XAUUSD: 1.5, GBPCAD: 1.5, USDJPY: 1.5 };

const BOT_TOKEN = '7682738545:AAEuqIzjBr56AkT-dwuoZK_1bxjBqcMv00'; const CHAT_ID = '573040944';

export default function VolatilityMonitor() { const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [countdown, setCountdown] = useState(294); const [lastUpdate, setLastUpdate] = useState(null); const [thresholds, setThresholds] = useState(() => { const saved = localStorage.getItem('thresholds'); return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS; }); const [settingsOpen, setSettingsOpen] = useState(false); const intervalRef = useRef(null); const audioRef = useRef(null); const alertSentRef = useRef(new Set());

const calculateATR = (ohlcData, period = 14) => { if (!ohlcData || ohlcData.length < period + 1) return null; const trueRanges = []; for (let i = 1; i < ohlcData.length; i++) { const current = ohlcData[i]; const previous = ohlcData[i - 1]; const tr1 = current.high - current.low; const tr2 = Math.abs(current.high - previous.close); const tr3 = Math.abs(current.low - previous.close); trueRanges.push(Math.max(tr1, tr2, tr3)); } let atr = trueRanges.slice(0, period).reduce((sum, tr) => sum + tr, 0) / period; const multiplier = 2 / (period + 1); for (let i = period; i < trueRanges.length; i++) { atr = (trueRanges[i] * multiplier) + (atr * (1 - multiplier)); } return atr; };

const generateMockOHLC = (symbol, periods = 50) => { const basePrice = { 'BTCUSD': 106720, 'XAUUSD': 2507, 'GBPCAD': 1.78, 'USDJPY': 143.5 }[symbol] || 100;

const volatility = {
  'BTCUSD': 0.035,
  'XAUUSD': 0.015,
  'GBPCAD': 0.008,
  'USDJPY': 0.012
}[symbol] || 0.01;

const data = [];
let currentPrice = basePrice;
const now = Date.now();

for (let i = periods; i >= 0; i--) {
  const timestamp = now - (i * 3600000);
  const hour = new Date(timestamp).getUTCHours();
  const sessionMultiplier = (hour >= 8 && hour <= 16) ? 1.5 :
                           (hour >= 13 && hour <= 21) ? 1.8 : 0.7;

  const change = (Math.random() - 0.5) * volatility * sessionMultiplier * currentPrice;
  currentPrice = Math.max(currentPrice + change, basePrice * 0.8);

  const dayVolatility = volatility * sessionMultiplier * currentPrice * 0.3;
  const open = currentPrice;
  const close = currentPrice + (Math.random() - 0.5) * dayVolatility;
  const high = Math.max(open, close) + Math.random() * dayVolatility * 0.5;
  const low = Math.min(open, close) - Math.random() * dayVolatility * 0.5;

  data.push({
    timestamp,
    open: Math.max(low, open),
    high: Math.max(high, open, close),
    low: Math.min(low, open, close),
    close: Math.max(low, close)
  });
}

return data.sort((a, b) => a.timestamp - b.timestamp);

};

const sendTelegramAlert = async (message) => { try { await fetch(https://api.telegram.org/bot${BOT_TOKEN}/sendMessage, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' }), }); } catch (err) { console.error('Telegram alert failed:', err); } };

const fetchData = async () => { try { setLoading(true); setError('');

const results = await Promise.all(
    SYMBOLS.map(async ({ symbol, display, type }) => {
      try {
        const ohlcData = generateMockOHLC(symbol);
        const currentPrice = ohlcData[ohlcData.length - 1].close;
        const atrValue = calculateATR(ohlcData);
        const atrPercent = atrValue ? (atrValue / currentPrice) * 100 : 0;

        const threshold = thresholds[symbol] || ATR_THRESHOLD;
        const isAlert = atrPercent >= threshold;

        let formattedPrice = type === 'forex'
          ? currentPrice.toFixed(4)
          : Math.round(currentPrice).toLocaleString();

        const volatilityLevel = Math.min(5, Math.max(1,
          Math.ceil((atrPercent / threshold) * 3)
        ));

        return {
          symbol: display,
          price: formattedPrice,
          atrPercent,
          volatilityLevel,
          isAlert,
          type,
          change: ((Math.random() - 0.5) * 2).toFixed(2),
          threshold
        };
      } catch (err) {
        return {
          symbol: display,
          price: 'Error',
          atrPercent: 0,
          volatilityLevel: 0,
          isAlert: false,
          type,
          error: true
        };
      }
    })
  );

  results.sort((a, b) => b.atrPercent - a.atrPercent);
  setData(results);
  setLastUpdate(new Date());

  const highVolatility = results.filter(item => item.isAlert && !item.error);
  if (highVolatility.length > 0) {
    const alertKey = highVolatility.map(item => `${item.symbol}-${item.atrPercent.toFixed(1)}`).join('|');
    if (!alertSentRef.current.has(alertKey)) {
      alertSentRef.current.add(alertKey);
      if (audioRef.current) audioRef.current.play().catch(() => {});

      const message = `🚨 <b>High Volatility Alert</b> 🚨\n\n` +
        highVolatility.map(item =>
          `<b>${item.symbol}</b>: ${item.atrPercent.toFixed(2)}% (≥ ${item.threshold}%)\nPrice: ${item.price}`
        ).join('\n\n') +
        `\n\n⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

      sendTelegramAlert(message);
      setTimeout(() => alertSentRef.current.delete(alertKey), 600000);
    }
  }
} catch (err) {
  setError('Failed to fetch market data');
} finally {
  setLoading(false);
}

};

useEffect(() => { fetchData(); intervalRef.current = setInterval(() => { setCountdown(prev => { if (prev <= 1) { fetchData(); return 294; } return prev - 1; }); }, 1000); return () => clearInterval(intervalRef.current); }, []);

const formatCountdown = (seconds) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return ${mins}:${secs.toString().padStart(2, '0')}; };

return ( <div className="p-4"> <div className="mb-4"> <button onClick={() => { fetchData(); setCountdown(294); }} disabled={loading} className="bg-purple-600 text-white px-4 py-2 rounded shadow" > {loading ? 'Refreshing...' : 'Refresh Now'} </button> </div>

{/* Settings Toggle */}
  <div className="mb-4">
    <button
      onClick={() => setSettingsOpen(!settingsOpen)}
      className="text-sm text-purple-400 underline"
    >
      {settingsOpen ? 'Hide Settings' : 'Show Settings'}
    </button>
  </div>

  {/* Settings Panel */}
  {settingsOpen && (
    <div className="bg-gray-900 p-4 rounded-lg text-white mb-6">
      <h2 className="font-semibold mb-2">⚙️ ATR Threshold Settings</h2>
      {SYMBOLS.map(({ symbol, display }) => (
        <div key={symbol} className="flex justify-between items-center my-2">
          <span>{display}</span>
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={thresholds[symbol] || ''}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              const updated = { ...thresholds, [symbol]: value };
              setThresholds(updated);
              localStorage.setItem('thresholds', JSON.stringify(updated));
            }}
            className="bg-black border px-2 py-1 w-24 text-yellow-300 rounded"
          />
        </div>
      ))}
    </div>
  )}

  {/* Market Data Table (UI skipped here to save space) */}
</div>

); }

