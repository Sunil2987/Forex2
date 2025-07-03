import React, { useState, useEffect } from 'react';

const TWELVE_API_KEY = 'fb112c39ecec4aa18bd73e881fb06fc4';
const ALPHA_API_KEY = 'XCHRXA73EI71XJHG';

const TICKERS = ['BTC/USD', 'XAU/USD', 'EUR/USD', 'GBP/JPY', 'AUD/CAD'];

const defaultThresholds = {
  'BTC/USD': 3.0,
  'XAU/USD': 1.5,
  'EUR/USD': 1.5,
  'GBP/JPY': 1.5,
  'AUD/CAD': 1.5
};

function App() {
  const [data, setData] = useState([]);
  const [refreshIn, setRefreshIn] = useState(480);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission().catch(console.error);
    }

    fetchData();

    // Set up intervals
    const interval = setInterval(() => {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      if (day >= 1 && day <= 5 && hour >= 5.5 && hour <= 17.5) {
        fetchData();
      }
    }, 480000);

    const countdown = setInterval(() => {
      setRefreshIn(prev => (prev > 0 ? prev - 1 : 480));
    }, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, []);

  const fetchADX = async (symbol) => {
    const fxSymbol = symbol.replace('/', '');
    const url = `https://www.alphavantage.co/query?function=ADX&symbol=${fxSymbol}&interval=daily&time_period=14&apikey=${ALPHA_API_KEY}`;
    const diUrl = `https://www.alphavantage.co/query?function=PLUS_DI&symbol=${fxSymbol}&interval=daily&time_period=14&apikey=${ALPHA_API_KEY}`;
    const mdiUrl = `https://www.alphavantage.co/query?function=MINUS_DI&symbol=${fxSymbol}&interval=daily&time_period=14&apikey=${ALPHA_API_KEY}`;

    try {
      const [adxRes, diRes, mdiRes] = await Promise.all([
        fetch(url),
        fetch(diUrl),
        fetch(mdiUrl)
      ]);

      const [adxJson, diJson, mdiJson] = await Promise.all([
        adxRes.json(),
        diRes.json(),
        mdiRes.json()
      ]);

      // Safely extract values
      const adxValue = parseFloat(Object.values(adxJson['Technical Analysis: ADX'] || {})[0]?.ADX || 0);
      const plusDI = parseFloat(Object.values(diJson['Technical Analysis: PLUS_DI'] || {})[0]?.PLUS_DI || 0);
      const minusDI = parseFloat(Object.values(mdiJson['Technical Analysis: MINUS_DI'] || {})[0]?.MINUS_DI || 0);

      return {
        adx: Math.round(adxValue),
        plusDI,
        minusDI
      };
    } catch (err) {
      console.error(`Error fetching ADX for ${symbol}:`, err);
      return {
        adx: null,
        plusDI: null,
        minusDI: null
      };
    }
  };

  const calculateATR = (arr) => {
    if (!arr || arr.length < 2) return 0;
    
    let sum = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      const high = parseFloat(arr[i]?.high || 0);
      const low = parseFloat(arr[i]?.low || 0);
      const prevClose = parseFloat(arr[i + 1]?.close || 0);
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );
      sum += tr;
    }
    return sum / (arr.length - 1);
  };

  const fetchData = async () => {
    if (loading) return;
    
    setLoading(true);
    setError('');

    try {
      const results = await Promise.all(
        TICKERS.map(async (symbol) => {
          try {
            const res = await fetch(
              `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=1day&outputsize=30&apikey=${TWELVE_API_KEY}`
            );
            
            if (!res.ok) throw new Error('Network response was not ok');
            
            const json = await res.json();
            
            if (json.status === 'error') {
              throw new Error(json.message || 'API error');
            }

            const values = json.values || [];
            if (values.length === 0) throw new Error('No data available');

            const currentPrice = parseFloat(values[0]?.close || 0);
            const todayATR = parseFloat(values[0]?.high || 0) - parseFloat(values[0]?.low || 0);
            const avgATR = calculateATR(values.slice(0, 14));
            const atrPercent = +(100 * (avgATR / currentPrice)).toFixed(2);

            const { adx, plusDI, minusDI } = await fetchADX(symbol);
            const trend = plusDI > minusDI ? 'Bullish' : 'Bearish';

            if (adx > 25 && Notification.permission === 'granted') {
              new Notification(`Strong Trend in ${symbol}`, {
                body: `ADX is ${adx} (${trend})`,
                tag: `ADX-${symbol}`
              });
            }

            return {
              symbol,
              price: currentPrice,
              avgATR,
              todayATR,
              atrPercent,
              adx,
              trend,
              error: false
            };
          } catch (err) {
            console.error(`Error processing ${symbol}:`, err);
            return {
              symbol,
              error: true,
              errorMessage: err.message || 'Unknown error'
            };
          }
        })
      );

      setData(results);
      setRefreshIn(480);

      if (results.every(item => item.error)) {
        setError('Failed to fetch all data. Please try again later.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Failed to fetch data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (symbol, value) => {
    if (isNaN(value)) return 'N/A';
    if (symbol === 'BTC/USD' || symbol === 'XAU/USD') {
      return Math.round(value).toLocaleString();
    }
    return value.toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-center text-green-400 mb-4">
          Forex + BTC Volatility Monitor
        </h1>
        
        <div className="text-center mb-6">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh Now'}
          </button>
          
          <div className="mt-2 text-gray-300">
            Next auto-refresh in: <span className="font-bold">{refreshIn}s</span>
          </div>
          
          {error && (
            <div className="mt-2 text-red-400">
              ❌ {error}
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-800 text-green-400">
                <th className="p-3 text-left">Ticker</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Avg ATR</th>
                <th className="p-3 text-right">Today's ATR</th>
                <th className="p-3 text-right">ATR%</th>
                <th className="p-3 text-right">ADX</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.symbol} className="border-b border-gray-700 hover:bg-gray-800">
                  <td className="p-3">{item.symbol}</td>
                  <td className="p-3 text-right">{formatValue(item.symbol, item.price)}</td>
                  <td className="p-3 text-right">{formatValue(item.symbol, item.avgATR)}</td>
                  <td className="p-3 text-right">{formatValue(item.symbol, item.todayATR)}</td>
                  <td className="p-3 text-right">{item.atrPercent || 'N/A'}%</td>
                  <td className="p-3 text-right">
                    {item.adx || 'N/A'}
                    <br />
                    <small className={item.trend === 'Bullish' ? 'text-green-400' : 'text-red-400'}>
                      {item.trend || 'N/A'}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
