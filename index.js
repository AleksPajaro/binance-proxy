const express = require("express");
const fetch   = require("node-fetch");
const cors    = require("cors");

const app = express();
app.use(cors());
app.use(express.json());  // <-- подключаем разбор JSON-тела

const BINANCE = "https://fapi.binance.com/futures/data";

// Вспомогательная функция для одного запроса
async function fetchRatio(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/json" }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const arr = await res.json();
  return arr[0] || null;
}

// 1) Одиночный прокси-эндпоинт (GET /?url=…)
app.get("/", async (req, res) => {
  const target = req.query.url;
  if (!target || !target.startsWith(BINANCE)) {
    return res.status(400).json({ error: "Missing or invalid 'url' param" });
  }
  try {
    const data = await fetchRatio(target);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2) Батч-эндпоинт (POST /batch)
//    Ожидает JSON: { symbols: ["BTC","ETH",…], interval: "4h" }
app.post("/batch", async (req, res) => {
  const symbols  = req.body.symbols;
  const interval = req.body.interval || "4h";
  if (!Array.isArray(symbols) || symbols.length === 0) {
    return res.status(400).json({ error: "Missing symbols array" });
  }

  const results = await Promise.all(symbols.map(async symbol => {
    const pair = symbol + "USDT";
    try {
      const [g, a, p] = await Promise.all([
        fetchRatio(`${BINANCE}/globalLongShortAccountRatio?symbol=${pair}&period=${interval}&limit=1`),
        fetchRatio(`${BINANCE}/topLongShortAccountRatio?symbol=${pair}&period=${interval}&limit=1`),
        fetchRatio(`${BINANCE}/topLongShortPositionRatio?symbol=${pair}&period=${interval}&limit=1`)
      ]);
      return { symbol, timestamp: g && g.timestamp, global: g, acct: a, pos: p };
    } catch (e) {
      return { symbol, error: e.message };
    }
  }));

  res.json(results);
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Proxy listening on port ${port}`));



