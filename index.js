const express   = require("express");
const fetch     = require("node-fetch");
const cors      = require("cors");

const app = express();
app.use(cors());

const BINANCE = "https://fapi.binance.com/futures/data";

async function fetchRatio(url) {
  const res = await fetch(url, {
    headers: {"User-Agent":"Mozilla/5.0","Accept":"application/json"}
  });
  if (!res.ok) throw new Error(`${res.status}`);
  const arr = await res.json();
  return arr[0] || null;
}

// Существующий одиночный прокси
app.get("/", async (req, res) => {
  const target = req.query.url;
  if (!target || !target.startsWith(BINANCE)) {
    return res.status(400).json({ error: "Missing or invalid 'url' param" });
  }
  try {
    const data = await (await fetch(target, {
      headers: {"User-Agent":"Mozilla/5.0","Accept":"application/json"}
    })).json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Новый batch-эндпоинт
app.get("/batch", async (req, res) => {
  const symbolsParam = req.query.symbols;      // CSV: "BTC,ETH,XRP,…"
  const interval     = req.query.interval || "4h";
  if (!symbolsParam) return res.status(400).json({ error: "Missing symbols" });

  const symbols = symbolsParam.split(",").filter(s => s);
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
app.listen(port, () => console.log("Listening on", port));
