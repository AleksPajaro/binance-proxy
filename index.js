const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());

app.get("/", async (req, res) => {
  const url = req.query.url;
  if (!url || !url.startsWith("https://fapi.binance.com")) {
    return res.status(400).json({ error: "Missing or invalid 'url' param" });
  }
  try {
    const r = await fetch(url, {
      headers: { "User-Agent":"Mozilla/5.0","Accept":"application/json" }
    });
    res.json(await r.json());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Proxy listening on", port));
