const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "data.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const initialData = {
  products: [
    { id: 1, name: "Cappuccino", category: "Bebidas", price: 12, stock: 35 },
    { id: 2, name: "Pão de queijo", category: "Salgados", price: 7, stock: 50 },
    { id: 3, name: "Suco natural", category: "Bebidas", price: 10, stock: 22 }
  ],
  sales: [
    { id: 1, productId: 1, quantity: 10, date: "2026-11-02" },
    { id: 2, productId: 2, quantity: 24, date: "2026-11-03" },
    { id: 3, productId: 3, quantity: 13, date: "2026-11-04" },
    { id: 4, productId: 1, quantity: 8, date: "2026-11-09" },
    { id: 5, productId: 2, quantity: 20, date: "2026-11-10" },
    { id: 6, productId: 3, quantity: 12, date: "2026-11-11" },
    { id: 7, productId: 1, quantity: 5, date: "2026-11-16" },
    { id: 8, productId: 2, quantity: 18, date: "2026-11-17" },
    { id: 9, productId: 3, quantity: 11, date: "2026-11-18" }
  ],
  decisions: []
};

function readData() {
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
}
function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}
function makeAlerts(data) {
  return data.products.map(product => {
    const rows = data.sales.filter(s => s.productId === product.id);
    const dates = [...new Set(rows.map(s => s.date))].sort();
    const recentDates = dates.slice(-3);
    const previousDates = dates.slice(-6, -3);
    const sum = list => rows.filter(s => list.includes(s.date)).reduce((n, s) => n + s.quantity, 0);
    const recent = sum(recentDates);
    const previous = sum(previousDates);
    if (!previous || !recentDates.length) return null;
    const change = Math.round(((recent - previous) / previous) * 100);
    if (change > -10) return null;
    const severity = change <= -30 ? "critical" : "attention";
    return {
      id: `sales-${product.id}`, product: product.name, change, recent, previous,
      severity, title: `Queda de ${Math.abs(change)}% nas vendas de ${product.name}`,
      detail: `Foram vendidas ${recent} unidades nos últimos ${recentDates.length} registros, contra ${previous} no período anterior.`
    };
  }).filter(Boolean);
}

app.get("/api/dashboard", (req, res) => {
  const data = readData();
  const alerts = makeAlerts(data);
  const totalUnits = data.sales.reduce((n, s) => n + s.quantity, 0);
  res.json({
    products: data.products,
    sales: data.sales,
    decisions: data.decisions,
    alerts,
    stats: {
      products: data.products.length,
      sales: totalUnits,
      attention: alerts.filter(a => a.severity === "attention").length,
      critical: alerts.filter(a => a.severity === "critical").length
    }
  });
});

app.post("/api/products", (req, res) => {
  const { name, category, price, stock } = req.body;
  if (!name || !Number.isFinite(Number(price)) || Number(price) < 0) {
    return res.status(400).json({ error: "Informe nome e preço válido." });
  }
  const data = readData();
  const product = {
    id: Date.now(), name: String(name).trim(), category: String(category || "Geral"),
    price: Number(price), stock: Math.max(0, Number(stock) || 0)
  };
  data.products.push(product);
  writeData(data);
  res.status(201).json(product);
});

app.post("/api/sales", (req, res) => {
  const { productId, quantity, date } = req.body;
  const data = readData();
  const product = data.products.find(p => p.id === Number(productId));
  if (!product) return res.status(404).json({ error: "Produto não encontrado." });
  if (!Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
    return res.status(400).json({ error: "A quantidade deve ser um número inteiro maior que zero." });
  }
  const sale = {
    id: Date.now(), productId: product.id, quantity: Number(quantity),
    date: date || new Date().toISOString().slice(0, 10)
  };
  data.sales.push(sale);
  writeData(data);
  res.status(201).json(sale);
});

app.post("/api/decisions", (req, res) => {
  const { alertTitle, action, result } = req.body;
  if (!action || !String(action).trim()) return res.status(400).json({ error: "Descreva a ação realizada." });
  const data = readData();
  const decision = {
    id: Date.now(), alertTitle: alertTitle || "Ação preventiva",
    action: String(action).trim(), result: result || "Em acompanhamento",
    createdAt: new Date().toISOString()
  };
  data.decisions.unshift(decision);
  writeData(data);
  res.status(201).json(decision);
});

app.listen(PORT, () => console.log(`SINAL disponível em http://localhost:${PORT}`));
