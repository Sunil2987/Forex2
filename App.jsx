import React, { useState, useEffect, useRef } from 'react'; import { Activity, RefreshCw, Zap, TrendingUp, AlertCircle } from 'lucide-react';

const SYMBOLS = [ { symbol: 'BTCUSD', display: 'BTC/USD', type: 'crypto', defaultThreshold: 2.5 }, { symbol: 'XAUUSD', display: 'XAU/USD', type: 'metal', defaultThreshold: 1.5 }, { symbol: 'GBPCAD', display: 'GBP/CAD', type: 'forex', defaultThreshold: 1.5 }, { symbol: 'USDJPY', display: 'USD/JPY', type: 'forex', defaultThreshold: 1.5 } ];

const BOT_TOKEN = import.meta.env.VITE_BOT_TOKEN; const CHAT_ID = import.meta.env.VITE_CHAT_ID;

export default function VolatilityMonitor() { const [data, setData] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [countdown, setCountdown] = useState(294); const [lastUpdate, setLastUpdate] = useState(null); const [thresholds, setThresholds] = useState(() => { const stored = localStorage.getItem('thresholds'); return stored ? JSON.parse(stored) : SYMBOLS.reduce((acc, s) => { acc[s.symbol] = s.defaultThreshold; return acc; }, {}); });

const intervalRef = useRef(null); const audioRef = useRef(null); const alertSentRef = useRef(new Set());

const handleThresholdChange = (symbol, value) => { const val = parseFloat(value); if (!isNaN(val)) { const updated = { ...thresholds, [symbol]: val }; setThresholds(updated); localStorage.setItem('thresholds', JSON.stringify(updated)); } };

const calculateATR = (ohlcData, period = 14) => { if (!ohlcData || ohlcData.length < period + 1) return null; const tr = []; for (let i = 1; i < ohlcData.length; i++) { const cur = ohlcData[i], prev = ohlcData[i - 1]; tr.push(Math.max( cur.high - cur.low, Math.abs(cur.high - prev.close), Math.abs(cur.low - prev.close) )); } let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period; const mult = 2 / (period + 1); for (let i = period; i < tr.length; i++) atr = (tr[i] * mult) + (atr * (1 - mult)); return atr; };

const generateMockOHLC = (symbol, periods = 50) => { const base = { BTCUSD: 106720, XAUUSD: 2507, GBPCAD: 1.78, USDJPY: 143.5 }[symbol] || 100; const vol = { BTCUSD: 0.035, XAUUSD: 0.015, GBPCAD: 0.008, USDJPY: 0.012 }[symbol] || 0.01;

let price = base;
const data = [];
const now = Date.now();

for (let i = periods; i >= 0; i--) {
  const ts = now - i * 3600000;
  const hour = new Date(ts).getUTCHours();
  const session = (hour >= 8 && hour <= 16) ? 1.5 : (hour >= 13 && hour <= 21) ? 1.8 : 0.7;
  const change = (Math.random() - 0.5) * vol * session * price;
  price = Math.max(price + change, base * 0.8);
  const dv = vol * session * price * 0.3;
  const open = price, close = price + (Math.random() - 0.5) * dv;
  const high = Math.max(open, close) + Math.random() * dv * 0.5;
  const low = Math.min(open, close) - Math.random() * dv * 0.5;

  data.push({ timestamp: ts, open, high, low, close });
}
return data.sort((a, b) => a.timestamp - b.timestamp);

};

const sendTelegramAlert = async (message) => { try { await fetch(https://api.telegram.org/bot${BOT_TOKEN}/sendMessage, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CHAT_ID, text: message, parse_mode: 'HTML' }) }); } catch (err) { console.error('Telegram alert failed:', err); } };

const fetchData = async () => { try { setLoading(true); setError(''); const results = await Promise.all( SYMBOLS.map(async ({ symbol, display, type }) => { const ohlc = generateMockOHLC(symbol); const price = ohlc[ohlc.length - 1].close; const atr = calculateATR(ohlc); const atrPercent = atr ? (atr / price) * 100 : 0; const threshold = thresholds[symbol] || 1.5;

const isAlert = atrPercent >= threshold;
      const volatilityLevel = Math.min(5, Math.max(1, Math.ceil((atrPercent / threshold) * 3)));

      return {
        symbol: display,
        price: type === 'forex' ? price.toFixed(4) : Math.round(price).toLocaleString(),
        atrPercent,
        isAlert,
        volatilityLevel,
        type,
        change: ((Math.random() - 0.5) * 2).toFixed(2)
      };
    })
  );

  results.sort((a, b) => b.atrPercent - a.atrPercent);
  setData(results);
  setLastUpdate(new Date());

  const alerts = results.filter(r => r.isAlert);
  const alertKey = alerts.map(r => `${r.symbol}-${r.atrPercent.toFixed(1)}`).join('|');
  if (!alertSentRef.current.has(alertKey)) {
    alertSentRef.current.add(alertKey);
    audioRef.current?.play();

    const msg = `🚨 <b>High Volatility Alert</b> 🚨\n\n` +
      alerts.map(a => `<b>${a.symbol}</b>: ${a.atrPercent.toFixed(2)}%\nPrice: ${a.price}`).join('\n\n') +
      `\n\n⏰ Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
    sendTelegramAlert(msg);

    setTimeout(() => alertSentRef.current.delete(alertKey), 600000);
  }
} catch (e) {
  console.error(e);
  setError('Failed to fetch data');
} finally {
  setLoading(false);
}

};

const isMarketHours = () => { const now = new Date(); const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })); const h = ist.getHours(), d = ist.getDay(); return d >= 1 && d <= 5 && h >= 12 && h < 24; };

useEffect(() => { fetchData(); intervalRef.current = setInterval(() => { setCountdown(prev => { if (prev <= 1) { if (isMarketHours()) fetchData(); return 294; } return prev - 1; }); }, 1000); return () => clearInterval(intervalRef.current); }, []);

return ( <div className="min-h-screen bg-gray-900 text-white p-4"> <div className="max-w-4xl mx-auto"> <h1 className="text-3xl font-bold mb-4 flex items-center gap-2"> <Activity /> Forex + BTC Volatility Monitor </h1>

<div className="bg-gray-800 p-4 rounded-xl mb-6">
      <h2 className="font-semibold mb-2 flex items-center gap-2"><TrendingUp /> Settings</h2>
      {SYMBOLS.map(({ symbol }) => (
        <div key={symbol} className="mb-2">
          <label className="mr-2">{symbol} Threshold %:</label>
          <input
            type="number"
            value={thresholds[symbol]}
            step="0.1"
            min="0"
            className="text-black px-2 py-1 rounded"
            onChange={e => handleThresholdChange(symbol, e.target.value)}
          />
        </div>
      ))}
    </div>

    {error && <div className="bg-red-500 text-white p-2 rounded mb-4 flex items-center gap-2"><AlertCircle /> {error}</div>}

    {loading ? (
      <div className="animate-pulse">Loading market data...</div>
    ) : (
      <table className="w-full text-sm bg-gray-800 rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-gray-700">
            <th className="p-2 text-left">Ticker</th>
            <th className="p-2 text-left">Price</th>
            <th className="p-2 text-left">ATR%</th>
            <th className="p-2 text-left">Vol</th>
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr key={item.symbol} className={item.isAlert ? 'bg-red-900' : 'hover:bg-gray-700'}>
              <td className="p-2">{item.symbol} {item.isAlert && <Zap size={12} className="inline text-yellow-300" />}</td>
              <td className="p-2">{item.price}</td>
              <td className="p-2">{item.atrPercent.toFixed(2)}%</td>
              <td className="p-2">{'💡'.repeat(item.volatilityLevel)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}

    <div className="mt-4 text-sm text-gray-400">
      Last Updated: {lastUpdate?.toLocaleTimeString()} | Next Refresh in: {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')}
    </div>

    <audio ref={audioRef} preload="auto">
      <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559uIiCW3Oy1hTYEgoO8+fGOQAoUnNny0H4wBT2H0e++ijoIG3ax7pyBMgcjdtztupsWJmzW8OGfbyQhktfuvYs3BmCg4OmGGwUtmtrx1YQPBRiE5vaUjBcQhrzl+5MUCp/W8cyBOwYtdNXq5Ks6ASms2e7XiSwCKmzT8NBFRELfnSQAE1ek8+DfQkb3nSUAGG6z79SAOws0bNLttJI2CBx1vfv2lTYJJm/T7MWROQUigMf37KMMF1XJ8fGdNAgsgt/lqjEDAGq68/BQREF/vzv/vRUKmlej9enp0EZBhT8A" type="audio/wav" />
    </audio>
  </div>
</div>

); }

