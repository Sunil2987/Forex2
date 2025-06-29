import React, { useState, useEffect, useRef } from 'react';

const API_KEY = 'ca4cbc17c9524d5182b781c1e71ff6d5';  // Your Twelve Data API key

const TICKERS = [
  { symbol: 'BTC/USD', key: 'BTC/USD' },
  { symbol: 'XAU/USD', key: 'XAU/USD' },
  { symbol: 'GBP/CAD', key: 'GBP/CAD' },
  { symbol: 'USD/JPY', key: 'USD/JPY' },
   ];

export default function App() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [count, setCount]   = useState(300);   // 5-min countdown
  const timerRef            = useRef(null);
  const audioRef            = useRef(null);

  // ── time-window helper ───────────────────────────────────────────
  const refreshAllowed = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const ist = new Date(utc + 5.5 * 60 * 60000);   // IST = UTC+5:30
    const h   = ist.getHours();
    const d   = ist.getDay();                       // 0-Sun … 6-Sat
    return d >= 1 && d <= 5 && h >= 12 && h < 24;   // Mon-Fri 12:00-23:59
  };

  // ── fetch logic ──────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        TICKERS.map(async ({ symbol, key }) => {
          const priceRes = await fetch(
            `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`
          );
          const priceJson = await priceRes.json();
          if (priceJson.status === 'error') throw new Error(priceJson.message);

          const atrRes = await fetch(
            `https://api.twelvedata.com/atr?symbol=${symbol}&interval=1h&time_period=14&apikey=${API_KEY}`
          );
          const atrJson = await atrRes.json();
          if (atrJson.status === 'error') throw new Error(atrJson.message);

          const price      = parseFloat(priceJson.price);
          const atr        = parseFloat(atrJson.values?.[0]?.atr ?? 0);
          const atrPercent = price ? (atr / price) * 100 : 0;
          const bulbs      = Math.min(10, Math.max(1, Math.round((atrPercent / 100) * 10)));
          return {
            symbol: key,
            price : price.toFixed(4),
            atrPercent,
            bulbs,

          };
        })
      );
      results.sort((a, b) => b.atrPercent - a.atrPercent);
      setRows(results);
      if (results.some(r => r.atrPercent > 60)) audioRef.current?.play().catch(() => {});
    } catch (err) {
      setError(err.message || 'Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  // ── first load & countdown timer ─────────────────────────────────
  useEffect(() => {
    fetchData();
    timerRef.current = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          if (refreshAllowed()) { fetchData(); return 300; }
          return c;   // pause outside window
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  const bulbs = (n) => '💡'.repeat(n);

  return (
    <div className="app">
      <h1 className="header">Forex + BTC Volatility Monitor</h1>

      <button className="refresh-btn" onClick={() => { fetchData(); setCount(300); }}>
        Refresh Now
      </button>

      <p className="countdown">
        Next auto-refresh in: <strong>{count}s</strong>
      </p>

      {loading && <p className="loading">Loading…</p>}
      {error   && <p className="error">Error: {error}</p>}

      {!loading && !error && (
        <table className="volatility-table">
          <thead>
            <tr>
              <th>Ticker</th><th>Price</th><th>Vol %</th><th>Bulbs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.symbol} className={r.atrPercent > 60 ? 'alert-row' : ''}>
                <td>{r.symbol} {r.atrPercent > 60 && '🔥'}</td>
                <td>{r.price}</td>
                <td>{r.atrPercent.toFixed(2)}</td>
                <td>{bulbs(r.bulbs)}</td>
                
                
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <audio ref={audioRef} src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" preload="auto" />
    </div>
  );
}
