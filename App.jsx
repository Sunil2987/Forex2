import React, { useEffect, useState } from 'react';
import './App.css';

const API_KEY = 'H0X70PXBT6UI7RDS';
const TICKERS = [
  { from: 'EUR', to: 'USD' },
  { from: 'USD', to: 'JPY' },
  { from: 'AUD', to: 'USD' },
  { from: 'GBP', to: 'USD' },
  { from: 'USD', to: 'CAD' },
  { from: 'NZD', to: 'USD' },
  { from: 'USD', to: 'CHF' },
  { from: 'EUR', to: 'JPY' },
  { from: 'GBP', to: 'JPY' }
];

const getATRScale = (atr) => {
  if (atr >= 1.5) return 10;
  if (atr >= 1.2) return 9;
  if (atr >= 1.0) return 8;
  if (atr >= 0.8) return 7;
  if (atr >= 0.6) return 6;
  if (atr >= 0.4) return 5;
  if (atr >= 0.3) return 4;
  if (atr >= 0.2) return 3;
  if (atr >= 0.1) return 2;
  return 1;
};

function App() {
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
  }, [darkMode]);

  const fetchData = async () => {
    const updatedData = [];
    for (let i = 0; i < TICKERS.length; i++) {
      const { from, to } = TICKERS[i];
      try {
        const priceRes = await fetch(
          `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=${from}&to_currency=${to}&apikey=${API_KEY}`
        );
        const priceJson = await priceRes.json();
        const priceData = priceJson['Realtime Currency Exchange Rate'];
        const price = parseFloat(priceData?.['5. Exchange Rate'] || 0);
        const change = parseFloat(priceData?.['10. Change Percent'] || 0);

        const atrRes = await fetch(
          `https://www.alphavantage.co/query?function=ATR&symbol=${from}${to}&interval=daily&time_period=14&series_type=close&apikey=${API_KEY}`
        );
        const atrJson = await atrRes.json();
        const atrData = atrJson['Technical Analysis: ATR'] || {};
        const atrValues = Object.values(atrData).slice(0, 14).map(d => parseFloat(d.ATR));
        const atr = atrValues.length ? atrValues[0] : 0;
        const atrScale = getATRScale(atr);

        const support = (price * 0.995).toFixed(4);
        const resistance = (price * 1.005).toFixed(4);

        updatedData.push({
          ticker: `${from}/${to}`,
          price,
          change,
          atrScale,
          atr,
          support,
          resistance
        });
      } catch (err) {
        console.error(`Error for ${from}/${to}:`, err);
      }
      if (i < TICKERS.length - 1) await new Promise(r => setTimeout(r, 15000));
    }
    setData(updatedData);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="app">
      <button className="toggle-btn" onClick={() => setDarkMode(!darkMode)}>
        {darkMode ? '☀️ Light Mode' : '🌙 Dark Mode'}
      </button>
      <h1 className="header">Forex Volatility Monitor</h1>
      <div className="card-grid">
        {data.map((row, idx) => (
          <div key={idx} className={`card ${row.atrScale >= 9 ? 'danger' : row.atrScale >= 7 ? 'high' : row.atrScale >= 4 ? 'medium' : 'low'}`}>
            <h2>{row.ticker}</h2>
            <p><strong>Price:</strong> {row.price.toFixed(4)}</p>
            <p><strong>Change:</strong> {row.change.toFixed(2)}%</p>
            <p><strong>Volatility:</strong> {row.atrScale}/10 {row.atrScale >= 9 ? '🔥' : ''}</p>
            <p><strong>Support:</strong> {row.support}</p>
            <p><strong>Resistance:</strong> {row.resistance}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
