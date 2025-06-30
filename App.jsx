import React, { useState, useEffect, useRef } from 'react';

const API_KEY = 'ca4cbc17c9524d5182b781c1e71ff6d5'; // Twelve Data API key
const BOT_TOKEN = '7682738545:AAEuqIzjzBr56AkT-dwuoZK_1bxjBqcMv00'; // Telegram Bot Token
const CHAT_ID = '573040944'; // Telegram Chat ID

const TICKERS = [
  { symbol: 'BTC/USD', key: 'BTC/USD' },
  { symbol: 'XAU/USD', key: 'XAU/USD' },
  { symbol: 'GBP/CAD', key: 'GBP/CAD' },
  { symbol: 'USD/JPY', key: 'USD/JPY' },
];

const ATR_THRESHOLD = 1.5; // 1.5% threshold

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
          try {
            // Fetch current price
            const priceRes = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${API_KEY}`);
            const priceJson = await priceRes.json();
            
            if (priceJson.status === 'error') {
              throw new Error(`Price API error for ${symbol}: ${priceJson.message}`);
            }

            // Fetch ATR data
            const atrRes = await fetch(`https://api.twelvedata.com/atr?symbol=${symbol}&interval=1day&time_period=14&apikey=${API_KEY}`);
            const atrJson = await atrRes.json();
            
            if (atrJson.status === 'error') {
              throw new Error(`ATR API error for ${symbol}: ${atrJson.message}`);
            }

            // Parse and validate data
            const price = parseFloat(priceJson.price);
            if (isNaN(price) || price <= 0) {
              throw new Error(`Invalid price for ${symbol}: ${priceJson.price}`);
            }

            // Get the most recent ATR value
            const atrValues = atrJson.values;
            if (!atrValues || !Array.isArray(atrValues) || atrValues.length === 0) {
              throw new Error(`No ATR data available for ${symbol}`);
            }

            const atrValue = parseFloat(atrValues[0]?.atr);
            if (isNaN(atrValue) || atrValue < 0) {
              throw new Error(`Invalid ATR value for ${symbol}: ${atrValues[0]?.atr}`);
            }

            // Calculate ATR percentage
            const atrPercent = (atrValue / price) * 100;
            
            // Calculate bulbs (1-5 scale based on threshold)
            const bulbs = Math.min(5, Math.max(1, Math.ceil((atrPercent / ATR_THRESHOLD) * 1)));

            // Format price based on symbol type
            let formattedPrice;
            if (symbol.includes('XAU') || symbol.includes('BTC')) {
              // No decimal for XAU and BTC
              formattedPrice = Math.round(price).toString();
            } else {
              // Two decimal places for all other pairs
              formattedPrice = price.toFixed(2);
            }

            return {
              symbol: key,
              price: formattedPrice,
              atr: atrValue.toFixed(2),
              atrPercent,
              bulbs,
              isAlert: atrPercent >= ATR_THRESHOLD,
            };
          } catch (tickerError) {
            console.error(`Error fetching ${symbol}:`, tickerError.message);
            return {
              symbol: key,
              price: 'Error',
              atr: 'Error',
              atrPercent: 0,
              bulbs: 0,
              isAlert: false,
              error: tickerError.message,
            };
          }
        })
      );

      // Sort by ATR percentage (highest first)
      results.sort((a, b) => b.atrPercent - a.atrPercent);
      setRows(results);

      // Check for alerts (ATR >= 1.5%)
      const triggered = results.filter(r => r.isAlert && !r.error);
      if (triggered.length > 0) {
        const msg = '⚠️ High Volatility Alert (ATR ≥ 1.5%):\n' + 
          triggered.map(r => `${r.symbol}: ${r.atrPercent.toFixed(2)}% (ATR: ${r.atr})`).join('\n');
        
        // Play alert sound
        audioRef.current?.play().catch(e => console.log('Audio play failed:', e));
        
        // Send Telegram alert
        sendTelegramAlert(msg);
      }

    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Failed to fetch data');
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

  const renderBulbs = (bulbs, isAlert) => {
    const bulbEmoji = '💡';
    const bulbString = bulbEmoji.repeat(Math.max(0, bulbs));
    return isAlert ? (
      <span style={{ color: '#ff4444', fontWeight: 'bold', animation: 'blink 1s infinite' }}>
        {bulbString}
      </span>
    ) : bulbString;
  };

  return (
    <div style={{ 
      fontFamily: 'Arial, sans-serif', 
      padding: '20px', 
      maxWidth: '800px', 
      margin: '0 auto',
      backgroundColor: '#f5f5f5'
    }}>
      <style>{`
        .alert-row { 
          background-color: #ffebee !important; 
          border-left: 4px solid #f44336;
        }
        .threshold-hit { 
          color: #f44336; 
          font-weight: bold; 
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.3; }
        }
        table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        th, td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background-color: #f8f9fa;
          font-weight: bold;
        }
        tr:hover {
          background-color: #f5f5f5;
        }
        .refresh-btn {
          background: #007bff;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          margin-bottom: 15px;
        }
        .refresh-btn:hover {
          background: #0056b3;
        }
        .error {
          color: #d32f2f;
          background: #ffebee;
          padding: 10px;
          border-radius: 4px;
          border-left: 4px solid #d32f2f;
        }
        .loading {
          color: #1976d2;
          font-weight: bold;
        }
      `}</style>

      <h1 style={{ color: '#333', textAlign: 'center' }}>
        Forex + BTC Volatility Monitor (ATR Threshold: 1.5%)
      </h1>

      <button 
        className="refresh-btn"
        onClick={() => { 
          fetchData(); 
          setCount(300); 
        }}
        disabled={loading}
      >
        {loading ? 'Refreshing...' : 'Refresh Now'}
      </button>

      <p style={{ color: '#666' }}>
        Next auto-refresh in: <strong style={{ color: '#007bff' }}>{count}s</strong>
        {!refreshAllowed() && (
          <span style={{ color: '#ff9800', marginLeft: '10px' }}>
            (Auto-refresh disabled outside IST 12:00-24:00, Mon-Fri)
          </span>
        )}
      </p>

      {loading && <p className="loading">Loading market data...</p>}
      {error && <p className="error">Error: {error}</p>}

      {!loading && rows.length > 0 && (
        <>
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Price</th>
                <th>ATR Value</th>
                <th>ATR %</th>
                <th>Volatility</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.symbol} className={r.isAlert ? 'alert-row' : ''}>
                  <td>
                    {r.symbol} 
                    {r.isAlert && ' 🔥'}
                    {r.error && ' ⚠️'}
                  </td>
                  <td>{r.price}</td>
                  <td>{r.atr}</td>
                  <td>
                    {r.error ? (
                      <span style={{ color: '#d32f2f' }}>Error</span>
                    ) : (
                      <>
                        {r.atrPercent.toFixed(2)}%
                        {r.isAlert && (
                          <span className="threshold-hit"> ≥ {ATR_THRESHOLD}%</span>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    {r.error ? '❌' : renderBulbs(r.bulbs, r.isAlert)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
            <p><strong>Legend:</strong></p>
            <p>💡 = Volatility level (1-5 bulbs) | 🔥 = High volatility alert (≥1.5%) | ⚠️ = Data error</p>
            <p>ATR = Average True Range (14-day) | Higher ATR% = Higher volatility</p>
          </div>

          <pre id="volatility-json" style={{ display: 'none' }}>
            {JSON.stringify(rows.filter(r => !r.error).map(r => ({ 
              symbol: r.symbol, 
              vol: parseFloat(r.atrPercent.toFixed(2)),
              atr: parseFloat(r.atr),
              alert: r.isAlert
            })), null, 2)}
          </pre>
        </>
      )}

      <audio 
        ref={audioRef} 
        src="https://actions.google.com/sounds/v1/alarms/alarm_clock.ogg" 
        preload="auto" 
      />
    </div>
  );
}
