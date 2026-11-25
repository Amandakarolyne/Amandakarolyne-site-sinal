const $ = (selector) => document.querySelector(selector);
const money = value => Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const today = new Date().toISOString().slice(0, 10);
$("#sale-date").value = today;

async function api(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Não foi possível concluir a operação.");
  return data;
}
function toast(message) {
  const el = $("#toast"); el.textContent = message; el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2600);
}
function render(data) {
  $("#stat-products").textContent = data.stats.products;
  $("#stat-sales").textContent = data.stats.sales;
  $("#stat-attention").textContent = data.stats.attention;
  $("#stat-critical").textContent = data.stats.critical;
  $("#alert-count").textContent = data.alerts.length;

  $("#alerts-list").innerHTML = data.alerts.length ? data.alerts.map(a => `
    <article class="alert-item ${a.severity}">
      <span class="alert-pill">${a.severity === "critical" ? "Crítico" : "Atenção"}</span>
      <div class="alert-title">${escapeHtml(a.title)}</div>
      <div class="alert-detail">${escapeHtml(a.detail)} Variação de ${a.change}% em relação ao período anterior.</div>
    </article>`).join("") : '<p class="muted">Nenhuma mudança significativa encontrada. Continue registrando as vendas!</p>';

  $("#products-table").innerHTML = data.products.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${escapeHtml(p.category)}</td><td>${money(p.price)}</td><td>${p.stock}</td></tr>`).join("");
  $("#sale-product").innerHTML = data.products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join("");
  $("#decisions-list").innerHTML = data.decisions.slice(0, 4).map(d => `<div class="decision"><b>${escapeHtml(d.alertTitle)}</b>${escapeHtml(d.action)} · ${escapeHtml(d.result)}</div>`).join("");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
}
async function refresh() { render(await api("/api/dashboard")); }
$("#show-product-form").addEventListener("click", () => $("#product-form").classList.toggle("hidden"));
$("#product-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api("/api/products", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    event.target.reset(); event.target.classList.add("hidden"); await refresh(); toast("Produto cadastrado!");
  } catch (error) { toast(error.message); }
});
$("#sale-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api("/api/sales", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    event.target.quantity.value = ""; await refresh(); toast("Venda registrada e sinais atualizados!");
  } catch (error) { toast(error.message); }
});
$("#decision-form").addEventListener("submit", async event => {
  event.preventDefault();
  const form = new FormData(event.target);
  try {
    await api("/api/decisions", { method: "POST", body: JSON.stringify(Object.fromEntries(form)) });
    event.target.reset(); await refresh(); toast("Decisão registrada!");
  } catch (error) { toast(error.message); }
});
refresh().catch(error => toast(error.message));
