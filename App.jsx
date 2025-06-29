import React, { useState, useEffect } from 'react';
import './App.css';

const TICKERS = [
  { symbol: 'EURUSD=X', label: 'EUR/USD' },
  { symbol: 'USDJPY=X', label: 'USD/JPY' },
  { symbol: 'AUDUSD=X', label: 'AUD/USD' },
  { symbol: 'GBPUSD=X', label: 'GBP/USD' },
  { symbol: 'USDCAD=X', label: 'USD/CAD' },
  { symbol: 'NZDUSD=X', label: 'NZD/USD' },
  { symbol: 'USDCHF=X', label: 'USD/CHF' },
  { symbol: 'EURJPY=X', label: 'EUR/JPY' },
  { symbol: 'GBPJPY=X', label: 'GBP/JPY' },
];

function getATRScale(range) {
  if (range >= 1.5) return 10;
  if (range >= 1.2) return 9;
  if (range >= 1.0) return 8;
  if (range >= 0.8) return 7;
  if (range >= 0.6) return 6;
  if (range >= 0.4) return 5;
  if (range >= 0.3) return 4;
  if (range >= 0.2) return 3;
  if (range >= 0.1) return 2;
  return 1;
}

function App() {
  const [data, setData] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.body.className = darkMode ? 'dark' : '';
  }, [darkMode]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const symbols = TICKERS.map(t => t.symbol).join(',');
      const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbols}`);
      const json = await res.json();
      const quotes = json.quoteResponse.result;

      const mappedData = quotes.map((q, i) => {
        const price = q.regularMarketPrice;
        const change = q.regularMarketChangePercent;
        const range = q.regularMarketDayHigh - q.regularMarketDayLow;
        const atrScale = getATRScale(range);
        const support = (price * 0.995).toFixed(4);
        const resistance = (price * 1.005).toFixed(4);

        return {
          ticker: TICKERS[i].label,
          price,
          change,
          atrScale,
          support,
          resistance
        };
      });

      setData(mappedData);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from Yahoo Finance.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="app"><h2>Loading...</h2></div>;
  if (error) return <div className="app"><h2>{error}</h2></div>;

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
