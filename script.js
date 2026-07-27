/* =========================================================
   ATELIER NOIR — script.js
   - PRODUCTS: the in-memory product catalogue (mirrors the
     "Inventory" Google Sheet columns: product_id, product_name,
     price, stock_quantity, category)
   - No data is persisted in the browser (no localStorage).
     Orders are sent straight to the n8n Webhook node.
   ========================================================= */

/* ---- Replace this with your real n8n Production Webhook URL (orders) ---- */
const WEBHOOK_URL = "https://mariam-3li.app.n8n.cloud/webhook/dd11b9b7-74f5-4f46-8b4d-9bd9aea23a0f";

/* ---- Replace this with your n8n chatbot Webhook URL (separate workflow) ---- */
const CHAT_WEBHOOK_URL = "https://mariam-3li.app.n8n.cloud/webhook/chatbot";

/* A simple per-tab session id, sent with every chat message so your n8n
   workflow can keep conversation memory per visitor if you want to. */
const CHAT_SESSION_ID =
  sessionStorage && sessionStorage.getItem("chat_session_id")
    ? sessionStorage.getItem("chat_session_id")
    : (() => {
        const id = "sess_" + Math.random().toString(36).slice(2) + Date.now();
        try { sessionStorage.setItem("chat_session_id", id); } catch (e) {}
        return id;
      })();

const PRODUCTS = [
  {
    id: 1,
    name: "Oversized Wool Coat",
    category: "Jackets",
    price: 189,
    stock: 6,
    description:
      "A structured, oversized coat cut from heavyweight wool. Built for cold-weather layering with a clean, undecorated silhouette.",
    image:
      "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 2,
    name: "Classic White Shirt",
    category: "Shirts",
    price: 59,
    stock: 14,
    description:
      "A crisp cotton-poplin shirt with a straight hem and mother-of-pearl buttons. The everyday foundation piece.",
    image:
      "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 3,
    name: "Slim Fit Jeans",
    category: "Pants",
    price: 79,
    stock: 3,
    description:
      "Mid-rise, slim through the leg, finished in a washed indigo denim that softens with every wear.",
    image:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 4,
    name: "Leather Ankle Boots",
    category: "Shoes",
    price: 149,
    stock: 8,
    description:
      "Hand-finished leather boots with a stacked block heel and a rounded toe. Built to be worn in.",
    image:
      "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 5,
    name: "Ribbed Knit Sweater",
    category: "Shirts",
    price: 89,
    stock: 11,
    description:
      "A fine-gauge ribbed knit in a relaxed fit, made from a merino-cotton blend for structure without bulk.",
    image:
      "https://images.unsplash.com/photo-1576871337622-98d48d1cf531?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 6,
    name: "Tailored Trousers",
    category: "Pants",
    price: 99,
    stock: 4,
    description:
      "Straight-leg tailored trousers with a flat front and a fluid drape, cut from a wool-blend twill.",
    image:
      "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 7,
    name: "Denim Jacket",
    category: "Jackets",
    price: 119,
    stock: 2,
    description:
      "A boxy, unlined denim jacket in a rigid indigo wash. Designed to layer over everything in the lookbook.",
    image:
      "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=900&auto=format&fit=crop",
  },
  {
    id: 8,
    name: "Canvas Low-Top Sneakers",
    category: "Shoes",
    price: 69,
    stock: 17,
    description:
      "Minimal canvas sneakers on a vulcanised rubber sole. Off-white upper, undyed laces, no branding.",
    image:
      "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=900&auto=format&fit=crop",
  },
];

/* ---------- helpers ---------- */

function money(n) {
  return "$" + n.toFixed(0);
}

function getParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function tag(n) {
  return "No. " + String(n).padStart(2, "0");
}

/* ---------- nav toggle (mobile) ---------- */

function initNavToggle() {
  const btn = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!btn || !links) return;
  btn.addEventListener("click", () => links.classList.toggle("open"));
}

/* ---------- render: product card ---------- */

function productCard(p) {
  return `
    <article class="card">
      <a href="product.html?id=${p.id}" aria-label="${p.name}">
        <div class="card-media">
          <span class="card-tag">${tag(p.id)}</span>
          <img src="${p.image}" alt="${p.name}" loading="lazy">
        </div>
      </a>
      <div class="card-body">
        <span class="card-cat">${p.category}</span>
        <a href="product.html?id=${p.id}"><h3 class="card-name">${p.name}</h3></a>
        <span class="card-price">${money(p.price)}</span>
        <a class="btn btn-outline" href="product.html?id=${p.id}">View piece</a>
      </div>
    </article>`;
}

/* ---------- home page ---------- */

function renderHomeArrivals() {
  const el = document.getElementById("home-arrivals");
  if (!el) return;
  const featured = PRODUCTS.slice(0, 4);
  el.innerHTML = featured.map(productCard).join("");
}

/* ---------- products page ---------- */

function renderProductsGrid() {
  const el = document.getElementById("products-grid");
  if (!el) return;

  const buttons = document.querySelectorAll(".filter-btn");
  const draw = (category) => {
    const list =
      category === "all"
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category.toLowerCase() === category);
    el.innerHTML = list.map(productCard).join("");
  };

  buttons.forEach((b) => {
    b.addEventListener("click", () => {
      buttons.forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      draw(b.dataset.filter);
    });
  });

  draw("all");
}

/* ---------- product detail page ---------- */

function renderProductDetail() {
  const el = document.getElementById("product-detail");
  if (!el) return;

  const id = parseInt(getParam("id"), 10);
  const p = PRODUCTS.find((x) => x.id === id) || PRODUCTS[0];

  el.innerHTML = `
    <div class="product-media">
      <img src="${p.image}" alt="${p.name}">
    </div>
    <div class="product-info">
      <span class="cat">${tag(p.id)} — ${p.category}</span>
      <h1>${p.name}</h1>
      <div class="price">${money(p.price)}</div>
      <p class="desc">${p.description}</p>
      <div class="divider"></div>
      <div class="qty-row">
        <label for="qty">Quantity</label>
        <input type="number" id="qty" class="qty-input" value="1" min="1" max="${p.stock}">
      </div>
      <button class="btn btn-dark" id="buy-now">Buy now</button>
    </div>`;

  document.getElementById("buy-now").addEventListener("click", () => {
    const qty = Math.max(1, parseInt(document.getElementById("qty").value, 10) || 1);
    window.location.href = `checkout.html?id=${p.id}&qty=${qty}`;
  });
}

/* ---------- checkout page ---------- */

function populateProductSelect(selectEl, selectedId) {
  selectEl.innerHTML = PRODUCTS.map(
    (p) =>
      `<option value="${p.id}" ${p.id === selectedId ? "selected" : ""}>${p.name} — ${money(p.price)}</option>`
  ).join("");
}

function renderOrderSummary(p, qty) {
  const el = document.getElementById("order-summary-lines");
  if (!el) return;
  el.innerHTML = `
    <div class="line"><span>${p.name}</span><span>${money(p.price)}</span></div>
    <div class="line"><span>Quantity</span><span>${qty}</span></div>
    <div class="line total"><span>Total</span><span>${money(p.price * qty)}</span></div>`;
}

function initCheckout() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  const idParam = parseInt(getParam("id"), 10);
  const qtyParam = parseInt(getParam("qty"), 10) || 1;
  const initialProduct = PRODUCTS.find((p) => p.id === idParam) || PRODUCTS[0];

  const productSelect = document.getElementById("product");
  const qtyInput = document.getElementById("quantity");
  populateProductSelect(productSelect, initialProduct.id);
  qtyInput.value = qtyParam;

  const updateSummary = () => {
    const p = PRODUCTS.find((x) => x.id === parseInt(productSelect.value, 10));
    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
    renderOrderSummary(p, qty);
  };
  productSelect.addEventListener("change", updateSummary);
  qtyInput.addEventListener("input", updateSummary);
  updateSummary();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("form-msg");
    const submitBtn = document.getElementById("submit-order");
    const p = PRODUCTS.find((x) => x.id === parseInt(productSelect.value, 10));
    const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);

    const payload = {
      customer_name: document.getElementById("customer_name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      product_id: p.id,
      product_name: p.name,
      unit_price: p.price,
      quantity: qty,
      total: p.price * qty,
      order_date: new Date().toISOString(),
    };

    submitBtn.disabled = true;
    submitBtn.textContent = "Sending…";
    msgEl.textContent = "";
    msgEl.className = "form-msg";

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Webhook responded with status " + res.status);

      msgEl.textContent = "Order submitted. The team has been notified.";
      msgEl.classList.add("ok");
      form.reset();
      updateSummary();
    } catch (err) {
      msgEl.textContent =
        "Could not reach the order system (" + err.message + "). Check the WEBHOOK_URL in script.js.";
      msgEl.classList.add("err");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit order";
    }
  });
}

/* ---------- chatbot widget ----------
   The bubble (#chatbot-placeholder) already exists in every HTML page.
   This function builds the chat panel entirely in JS and injects it
   next to the bubble, so no HTML file needs to change:
     - a message list (chat box)
     - a text input field
     - a send button
   On send, the message is POSTed as JSON to CHAT_WEBHOOK_URL. The
   n8n workflow should end with a "Respond to Webhook" node returning
   JSON like { "reply": "..." } — that text is shown as the bot message. */
function buildChatPanel() {
  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Customer support chat");
  panel.innerHTML = `
    <div class="chat-header">
      <span>Support</span>
      <button type="button" id="chat-close" aria-label="Close chat">&times;</button>
    </div>
    <div class="chat-messages" id="chat-messages" aria-live="polite"></div>
    <form class="chat-input-row" id="chat-form" novalidate>
      <input type="text" id="chat-input" placeholder="Type a message…" autocomplete="off" required>
      <button type="submit" id="chat-send">Send</button>
    </form>`;
  document.body.appendChild(panel);
  return panel;
}

function appendChatMessage(text, from) {
  const list = document.getElementById("chat-messages");
  const bubble = document.createElement("div");
  const kind = from === "user" ? "chat-msg-user" : from === "typing" ? "chat-msg-typing" : "chat-msg-bot";
  bubble.className = "chat-msg " + kind;
  bubble.textContent = text;
  list.appendChild(bubble);
  list.scrollTop = list.scrollHeight;
}

function initChatbotPlaceholder() {
  const bubble = document.getElementById("chatbot-placeholder");
  if (!bubble) return;

  const panel = buildChatPanel();
  const closeBtn = document.getElementById("chat-close");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  let greeted = false;
  const openPanel = () => {
    panel.classList.add("open");
    if (!greeted) {
      appendChatMessage("Hi! Ask us anything about sizing, orders or shipping.", "bot");
      greeted = true;
    }
    input.focus();
  };
  const closePanel = () => panel.classList.remove("open");

  bubble.addEventListener("click", () => {
    panel.classList.contains("open") ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;

    appendChatMessage(text, "user");
    input.value = "";
    input.disabled = true;

    appendChatMessage("Typing…", "typing");

    try {
      const res = await fetch(CHAT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          session_id: CHAT_SESSION_ID,
          page: window.location.pathname,
        }),
      });

      if (!res.ok) throw new Error("status " + res.status);

      const data = await res.json();
      const reply = (data && (data.reply || data.output || data.message)) ||
        "Sorry, I didn't get a response from the assistant.";

      document.querySelector(".chat-msg-typing")?.remove();
      appendChatMessage(reply, "bot");
    } catch (err) {
      document.querySelector(".chat-msg-typing")?.remove();
      appendChatMessage(
        "Could not reach the chat assistant. Check CHAT_WEBHOOK_URL in script.js.",
        "bot"
      );
    } finally {
      input.disabled = false;
      input.focus();
    }
  });
}

/* ---------- boot ---------- */

document.addEventListener("DOMContentLoaded", () => {
  initNavToggle();
  renderHomeArrivals();
  renderProductsGrid();
  renderProductDetail();
  initCheckout();
  initChatbotPlaceholder();
});
