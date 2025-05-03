// index.js  –  relay + cadastro de chaves (sem token)
const express = require("express");
const Database = require("@replit/database");
const path = require("path");

const app = express();
const db = new Database();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// -------- helper: existe chave? --------
async function keyExists(key) {
  /* db.get() devolve null se não existe, OU a string gravada. */
  return (await db.get(key)) !== null;
}

// -------- registro dinâmico -----------
app.post("/register", async (_req, res) => {
  const key = "MK" + Math.random().toString(36).slice(2, 8).toUpperCase();
  await db.set(key, "1"); // gravamos qualquer valor (timestamp, etc.)
  res.json({ master_key: key });
});

// -------- push ------------------------
const buckets = {};

app.post("/push", async (req, res) => {
  const { key, trade } = req.body;
  if (!key || !trade) return res.status(400).send("bad payload");
  if (!(await keyExists(key))) return res.status(403).send("unauthorized");

  (buckets[key] = buckets[key] || []).push(trade);
  res.sendStatus(200);
});

// -------- pull ------------------------
app.get("/pull", async (req, res) => {
  const key = req.query.key;
  if (!key || !(await keyExists(key)))
    return res.status(403).send("unauthorized");

  const out = buckets[key] || [];
  buckets[key] = [];
  res.json(out);
});

app.listen(PORT, () => console.log("relay on", PORT));
