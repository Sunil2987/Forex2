import React, { useState, useEffect } from "react";

const API_KEY = "demo"; // Replace with your actual API key
const TICKERS = ["BTC/USD", "XAU/USD", "EUR/GBP", "AUD/JPY"];

// Default thresholds
const defaultThresholds = {
  "BTC/USD": 2.5,
  "XAU/USD": 2.5,
  "EUR/GBP": 2.5,
  "AUD/JPY": 2.5
};

function App() {
  const [data, setData] = useState([]);
  const [thresholds, setThresholds] = useState(defaultThresholds);
  const [refreshIn, setRefreshIn] = useState(300);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Load saved thresholds from localStorage on component mount
  useEffect(() => {
    const savedThresholds = localStorage.getItem('volatilityThresholds');
    if (savedThresholds) {
      try {
        const parsed = JSON.parse(savedThresholds);
        // Validate the loaded thresholds
        const validThresholds = {};
        TICKERS.forEach(symbol => {
          const value = parseFloat(parsed[symbol]);
          validThresholds[symbol] = !isNaN(value) && value >= 0 ? value : defaultThresholds[symbol];
        });
        setThresholds(validThresholds);
      } catch (e) {
        console.error("Failed to parse saved thresholds", e);
      }
    }
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => setRefreshIn((t) => (t > 0 ? t - 1 : 300)), 1000);
    const refresh = setInterval(() => fetchData(), 300000);
    return () => {
      clearInterval(timer);
      clearInterval(refresh);
    };
  }, []);

  const notify = (symbol, atrPercent) => {
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
      return;
    }

    const alertTitle = `High Volatility Alert: ${symbol}`;
    const alertBody = `ATR% reached ${atrPercent.toFixed(2)}%, exceeding your threshold of ${thresholds[symbol]}%.`;

    if (Notification.permission === "granted") {
      new Notification(alertTitle, {
        body: alertBody
      });
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(permission => {
        if (permission === "granted") {
          new Notification(alertTitle, {
            body: alertBody
          });
        }
      });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    
    try {
      const promises = TICKERS.map(async (symbol) => {
        const [base, quote] = symbol.split("/");
        
        try {
          // Simulate API calls with demo data for now
          const simulatedData = {
            "BTC/USD": { price: 107783, atr: 248.00 },
            "XAU/USD": { price: 3284, atr: 5.58 },
            "EUR/GBP": { price: 1.0234, atr: 0.0015 },
            "AUD/JPY": { price: 144.6150, atr: 0.23 }
          };
          
          const mockData = simulatedData[symbol];
          if (mockData) {
            const { price, atr } = mockData;
            const atrPercent = +(100 * (atr / price)).toFixed(2);
            
            // Check if we need to send notification
            if (atrPercent >= thresholds[symbol]) {
              notify(symbol, atrPercent);
            }
            
            return {
              symbol,
              price,
              atrPercent,
              error: false
            };
          }
          
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, err);
          return {
            symbol,
            price: NaN,
            atrPercent: NaN,
            error: true
          };
        }
      });

      const results = await Promise.all(promises);
      setData(results);
      setRefreshIn(300);
    } catch (error) {
      console.error("Data fetch failed", error);
      setError("Failed to fetch data. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (symbol, price) => {
    if (isNaN(price)) return "Error";
    
    // BTC and XAU should be without decimals
    if (symbol === "BTC/USD" || symbol === "XAU/USD") {
      return price.toLocaleString(undefined, {
        maximumFractionDigits: 0
      });
    }
    
    // Others with 4 decimals
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    });
  };

  const saveThresholds = () => {
    // Save to localStorage
    localStorage.setItem('volatilityThresholds', JSON.stringify(thresholds));
    setSuccessMessage("Thresholds saved successfully!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const updateThreshold = (symbol, value) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setThresholds(prev => ({
        ...prev,
        [symbol]: numValue
      }));
    }
  };

  const resetThresholds = () => {
    if (window.confirm("Are you sure you want to reset all thresholds to default values?")) {
      setThresholds(defaultThresholds);
      // Remove from localStorage to use defaults
      localStorage.removeItem('volatilityThresholds');
      setSuccessMessage("Thresholds reset to defaults!");
      setTimeout(() => setSuccessMessage(""), 3000);
    }
  };

  // ... rest of the component code remains the same ...
}

export default App;
