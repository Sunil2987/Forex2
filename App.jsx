import React, { useState, useEffect, useRef } from 'react';

const API_KEY = 'ca4cbc17c9524d5182b781c1e71ff6d5';

const TICKERS = [
  { symbol: 'BTC/USD', key: 'BTC/USD' },
  { symbol: 'XAU/USD', key: 'XAU/USD' },
  { symbol: 'GBP/CAD', key: 'GBP/CAD' },
  { symbol: 'USD/JPY', key: 'USD/JPY' },
  { symbol: 'GBP/USD', key: 'GBP/USD' },
  { symbol: 'AUD/USD', key: 'AUD/USD' },
];

// Format symbol for API (remove slash)
const formatSymbol = (symbol) => symbol.replace('/', '');

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(300); // 5 min
  const countdownRef = useRef(null);
  const soundRef = useRef(null);

  // Fetch data for all tickers
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all(
        TICKERS.map(async ({ symbol, key }) => {
          const priceRes = await fetch(
            `https://api.twelvedata.com/price?symbol=${formatSymbol(symbol)}&apikey=${API_KEY}`
          );
          const priceJson = await priceRes.json();
          if (priceJson.status === 'error') throw new Error(priceJson.message);

          const atrRes = await fetch(
            `https://api.twelvedata.com/atr?symbol=${formatSymbol(symbol)}&interval=1h&time_period=14&apikey=${API_KEY}`
          );
          const atrJson = await atrRes.json();
          if (atrJson.status === 'error') throw new Error(atrJson.message);

          const price = parseFloat(priceJson.price);
          const atr = parseFloat(atrJson.values?.[0]?.atr || 0);
          const atrPercent = price > 0 ? (atr / price) * 100 : 0;

          // Scale ATR % between 1 and 10 bulbs (1=0%, 10=100%)
          let bulbCount = Math.min(10, Math.max(1, Math.round((atrPercent / 100) * 10)));

          // Support & resistance
          const support = (price - atr).toFixed(4);
          const resistance = (price + atr).toFixed(4);

          return {
            symbol: key,
            price: price.toFixed(4),
            atrPercent,
            bulbCount,
            support,
            resistance,
          };
        })
      );

      // Sort descending by volatility
      results.sort((a, b) => b.atrPercent - a.atrPercent);
      setData(results);
      setLoading(false);

      // Play sound if volatility > 60%
      if (results.some((r) => r.atrPercent > 60)) {
        if (soundRef.current) {
          soundRef.current.play().catch(() => {});
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
      setLoading(false);
    }
  };

  // Check if refresh allowed (Mon-Fri, 12 PM to 12 AM IST)
  const isRefreshAllowed = () => {
    const now = new Date();
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const istOffset = 5.5 * 60 * 60000;
    const ist = new Date(utc + istOffset);

    const hour = ist.getHours();
    const day = ist.getDay();

    return day >= 1 && day <= 5 && hour >= 12 && hour < 24;
  };

  // Countdown timer & auto refresh
  useEffect(() => {
    fetchData();
    setCountdown(300);

    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (isRefreshAllowed()) {
            fetchData();
            return 300;
          }
          return c;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(countdownRef.current);
  }, []);

  const formatBulbs = (count) => '💡'.repeat(count);

  return (
    <div style={{ maxWidth: 700, margin: 'auto', padding: 16, fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Forex + BTC Volatility Monitor</h1>

      <button
        onClick={() => {
          fetchData();
          setCountdown(300);
        }}
        style={{
          padding: '10px 20px',
          marginBottom: 20,
          cursor: 'pointer',
          backgroundColor: '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: 6,
          display: 'block',
          marginLeft: 'auto',
          marginRight: 'auto',
        }}
      >
        Refresh Now
      </button>

      <p style={{ textAlign: 'center' }}>
        Next auto-refresh in: <strong>{countdown}s</strong>
      </p>

      {loading && <p style={{ textAlign: 'center' }}>Loading data...</p>}
      {error && <p style={{ color: 'red', textAlign: 'center' }}>Error: {error}</p>}

      {!loading && !error && (
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            textAlign: 'center',
            marginTop: 16,
          }}
        >
          <thead>
            <tr style={{ borderBottom: '2px solid #ddd' }}>
              <th>Ticker</th>
              <th>Price</th>
              <th>Volatility (%)</th>
              <th>Bulbs</th>
              <th>Support</th>
              <th>Resistance</th>
            </tr>
          </thead>
          <tbody>
            {data.map(({ symbol, price, atrPercent, bulbCount, support, resistance }) => {
              const showFire = atrPercent > 60;
              return (
                <tr
                  key={symbol}
                  style={{
                    backgroundColor: showFire ? '#fdd' : 'transparent',
                    fontWeight: showFire ? 'bold' : 'normal',
                  }}
                >
                  <td>
                    {symbol} {showFire && '🔥'}
                  </td>
                  <td>{price}</td>
                  <td>{atrPercent.toFixed(2)}</td>
                  <td>{formatBulbs(bulbCount)}</td>
                  <td>{support}</td>
                  <td>{resistance}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Audio for alert */}
      <audio
        ref={soundRef}
        src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg"
        preload="auto"
      ></audio>
    </div>
  );
}

export default App;
