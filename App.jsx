import React, { useState, useEffect, useRef } from 'react';

const API_KEY = 'ca4cbc17c9524d5182b781c1e71ff6d5'; // Twelve Data API key
const BOT_TOKEN = '7682738545:AAEuqIzjzBr56AkT-dwuoZK_1bxjBqcMv00'; // Telegram Bot Token
const CHAT_ID = '573040944'; // Your Telegram Chat ID

const TICKERS = [
  { symbol: 'BTC/USD', key: 'BTC/USD' },
  { symbol: 'XAU/USD', key: 'XAU/USD' },
  { symbol: 'GBP/CAD', key: 'GBP/CAD' },
  { symbol: 'USD/JPY', key: 'USD/JPY' },
];

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [count, setCount] = useState(300);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  const refreshAllowed = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60000);
    const h = ist.getHours();
    const d = ist.getDay();
    return d >= 1 && d <= 5 && h >= 12 && h < 24;
  };

  const sendTelegramAlert = async (message) => {
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
      });
    } catch (err) {
      console.error('Telegram alert failed:', err.message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        TICKERS.map(async ({ symbol, key }) => {
          const priceRes = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`);
          const priceJson = await priceRes.json();
          if (priceJson.status === 'error') throw new Error(priceJson.message);

          const atrRes = await fetch(`https://api.twelvedata.com/atr?symbol=${symbol}&interval=1h&time_period=14&apikey=${API_KEY}`);
          const atrJson = await atrRes.json();
          if (atrJson.status === 'error') throw new Error(atrJson.message);

          const price = parseFloat(priceJson.price);
          const atr = parseFloat(atrJson.values?.[0]?.atr ?? 0);
          const atrPercent = price ? (atr / price) * 100 : 0;
          const bulbs = atrPercent >= 1.5 ? 5 : Math.max(1, Math.round((atrPercent / 1.5) * 5));

          return {
            symbol: key,
            price: price.toFixed(4),
            atrPercent,
            bulbs,
          };
        })
      );

      results.sort((a, b) => b.atrPercent - a.atrPercent);
      setRows(results);

      const triggered = results.filter(r => r.atrPercent >= 1.5);
      if (triggered.length > 0) {
        const msg = '⚠️ High Volatility Alert:\n' + triggered.map(r => `${r.symbol}: ${r.atrPercent.toFixed(2)}%`).join('\n');
        audioRef.current?.play().catch(() => {});
        sendTelegramAlert(msg);
      }

    } catch (err) {
      setError(err.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (refreshAllowed()) {
            fetchData();
            return 300;
          }
          return c;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const bulbs = (n, isAlert) =>
    isAlert ? <span className="bulbs-alert">{'💡'.repeat(n)}</span> : '💡'.repeat(n);

  return (
    <div className="app">
      <h1 className="header">Forex + BTC Volatility Monitor</h1>

      <button className="refresh-btn" onClick={() => { fetchData(); setCount(300); }}>
        Refresh Now
      </button>

      <p className="countdown">Next auto-refresh in: <strong>{count}s</strong></p>

      {loading && <p className="loading">Loading…</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && !error && (
        <>
          <table className="volatility-table">
            <thead>
              <tr>
                <th>Ticker</th><th>Price</th><th>Vol %</th><th>Bulbs</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.symbol} className={r.atrPercent >= 1.5 ? 'alert-row' : ''}>
                  <td>{r.symbol} {r.atrPercent >= 1.5 && '🔥'}</td>
                  <td>{r.price}</td>
                  <td>
                    {r.atrPercent.toFixed(2)}%
                    {r.atrPercent >= 1.5 && <span className="threshold-hit"> / 1.5%</span>}
                  </td>
                  <td>{bulbs(r.bulbs, r.atrPercent >= 1.5)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <pre id="volatility-json" style={{ display: 'none' }}>
            {JSON.stringify(rows.map(r => ({ symbol: r.symbol, vol: parseFloat(r.atrPercent.toFixed(2)) })))}
          </pre>
        </>
      )}

      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto" />
    </div>
  );
}
