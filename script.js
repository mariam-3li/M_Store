/* =========================================================
   ATELIER NOIR — script.js
   - PRODUCTS: the in-memory product catalogue (mirrors the
     "Inventory" Google Sheet columns: product_id, product_name,
     price, stock_quantity, category)
   - Orders are sent straight to the n8n Webhook node.
   - CART: persisted in localStorage so it survives navigation
     between pages (Home / Products / Product / Cart / Checkout).
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

/* Key used to store the cart in localStorage */
const CART_STORAGE_KEY = "atelier_cart_v1";

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

/* ============================================================
   CART
   Stored as an object map { "<productId>": quantity } in
   localStorage, e.g. { "1": 2, "4": 1 }. Quantities are always
   clamped between 1 and the product's stock_quantity, so a
   customer can pick MORE THAN ONE unit of the same product
   (up to what's in stock) but never more than that.
   ============================================================ */

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    /* localStorage unavailable — cart just won't persist across pages */
  }
  updateCartBadge();
}

/* Adds `qty` units of a product to the cart, capped at its stock */
function addToCart(productId, qty) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  const cart = getCart();
  const current = cart[productId] || 0;
  const next = Math.min(product.stock, Math.max(1, current + qty));
  cart[productId] = next;
  saveCart(cart);
}

/* Sets the exact quantity for a product already in the cart (used by the cart page) */
function setCartQty(productId, qty) {
  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) return;
  const cart = getCart();
  const clamped = Math.max(1, Math.min(product.stock, qty || 1));
  cart[productId] = clamped;
  saveCart(cart);
}

function removeFromCart(productId) {
  const cart = getCart();
  delete cart[productId];
  saveCart(cart);
}

function clearCart() {
  saveCart({});
}

/* Returns [{ product, qty, lineTotal }, ...] for everything currently in the cart */
function cartDetailed() {
  const cart = getCart();
  return Object.keys(cart)
    .map((idStr) => {
      const product = PRODUCTS.find((p) => p.id === parseInt(idStr, 10));
      if (!product) return null;
      const qty = cart[idStr];
      return { product, qty, lineTotal: product.price * qty };
    })
    .filter(Boolean);
}

function cartCount() {
  const cart = getCart();
  return Object.values(cart).reduce((sum, qty) => sum + qty, 0);
}

function cartGrandTotal() {
  return cartDetailed().reduce((sum, item) => sum + item.lineTotal, 0);
}

/* Keeps the little number on the "Cart" nav link in sync on every page */
function updateCartBadge() {
  const badge = document.getElementById("cart-badge");
  if (!badge) return;
  const count = cartCount();
  badge.textContent = count;
  badge.style.display = count > 0 ? "inline-flex" : "none";
}

/* Event delegation so "Add to cart" buttons work even on grids that
   get re-rendered (e.g. after clicking a category filter) */
function initAddToCartDelegation() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-cart-btn");
    if (!btn) return;
    const id = parseInt(btn.dataset.id, 10);
    addToCart(id, 1);
    const original = btn.textContent;
    btn.textContent = "Added ✓";
    btn.disabled = true;
    setTimeout(() => {
      btn.textContent = original;
      btn.disabled = false;
    }, 1100);
  });
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
        <div class="card-actions">
          <a class="btn btn-outline" href="product.html?id=${p.id}">View piece</a>
          <button type="button" class="btn btn-dark add-cart-btn" data-id="${p.id}">Add to cart</button>
        </div>
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
        <span style="font-size:12px; color:var(--ash);">${p.stock} in stock</span>
      </div>
      <div class="product-actions">
        <button class="btn btn-dark" id="add-cart-detail">Add to cart</button>
        <a class="btn btn-outline" href="cart.html">View cart</a>
      </div>
    </div>`;

  document.getElementById("add-cart-detail").addEventListener("click", () => {
    const qtyInput = document.getElementById("qty");
    const qty = Math.max(1, Math.min(p.stock, parseInt(qtyInput.value, 10) || 1));
    addToCart(p.id, qty);

    const btn = document.getElementById("add-cart-detail");
    const original = btn.textContent;
    btn.textContent = "Added ✓";
    setTimeout(() => { btn.textContent = original; }, 1100);
  });
}

/* ---------- cart page ---------- */

function cartRow(item) {
  const p = item.product;
  return `
    <div class="cart-row">
      <img src="${p.image}" alt="${p.name}">
      <div class="cart-row-info">
        <span class="cart-row-cat">${p.category}</span>
        <h4>${p.name}</h4>
        <span class="cart-row-price">${money(p.price)} each · ${p.stock} in stock</span>
      </div>
      <input type="number" class="qty-input cart-qty-input" data-id="${p.id}" value="${item.qty}" min="1" max="${p.stock}">
      <span class="cart-row-total">${money(item.lineTotal)}</span>
      <button type="button" class="cart-remove" data-id="${p.id}" aria-label="Remove ${p.name}">&times;</button>
    </div>`;
}

function renderCartPage() {
  const el = document.getElementById("cart-page");
  if (!el) return;

  const items = cartDetailed();

  if (items.length === 0) {
    el.innerHTML = `
      <div class="cart-empty">
        <p>Your cart is empty.</p>
        <a href="products.html" class="btn btn-dark">Browse the collection</a>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="cart-list">${items.map(cartRow).join("")}</div>
    <aside class="cart-summary">
      <h3>Summary</h3>
      <div class="line"><span>Items</span><span>${cartCount()}</span></div>
      <div class="line total"><span>Total</span><span>${money(cartGrandTotal())}</span></div>
      <a href="checkout.html" class="btn btn-dark" style="width:100%; text-align:center; margin-top:22px;">Proceed to checkout</a>
      <a href="products.html" class="btn btn-outline" style="width:100%; text-align:center; margin-top:12px;">Continue shopping</a>
    </aside>`;

  el.querySelectorAll(".cart-qty-input").forEach((input) => {
    input.addEventListener("change", () => {
      const id = parseInt(input.dataset.id, 10);
      setCartQty(id, parseInt(input.value, 10) || 1);
      renderCartPage();
    });
  });

  el.querySelectorAll(".cart-remove").forEach((btn) => {
    btn.addEventListener("click", () => {
      removeFromCart(parseInt(btn.dataset.id, 10));
      renderCartPage();
    });
  });
}

/* ---------- checkout page ---------- */

function renderCheckoutSummary() {
  const summaryEl = document.getElementById("order-summary-lines");
  const submitBtn = document.getElementById("submit-order");
  if (!summaryEl || !submitBtn) return;

  const items = cartDetailed();

  if (items.length === 0) {
    summaryEl.innerHTML = `<p style="font-size:14px; color:var(--ash);">Your cart is empty. <a href="products.html" style="text-decoration:underline; color:var(--ink);">Browse the collection</a>.</p>`;
    submitBtn.disabled = true;
    return;
  }

  summaryEl.innerHTML =
    items
      .map(
        (item) =>
          `<div class="line"><span>${item.product.name} × ${item.qty}</span><span>${money(item.lineTotal)}</span></div>`
      )
      .join("") +
    `<div class="line total"><span>Total</span><span>${money(cartGrandTotal())}</span></div>`;
  submitBtn.disabled = false;
}

function initCheckout() {
  const form = document.getElementById("checkout-form");
  if (!form) return;

  renderCheckoutSummary();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const msgEl = document.getElementById("form-msg");
    const submitBtn = document.getElementById("submit-order");
    const items = cartDetailed();
    if (items.length === 0) return;

    const payload = {
      customer_name: document.getElementById("customer_name").value.trim(),
      email: document.getElementById("email").value.trim(),
      phone: document.getElementById("phone").value.trim(),
      address: document.getElementById("address").value.trim(),
      items: items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.name,
        unit_price: item.product.price,
        quantity: item.qty,
        line_total: item.lineTotal,
      })),
      total: cartGrandTotal(),
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
      clearCart();
      renderCheckoutSummary();
    } catch (err) {
      msgEl.textContent =
        "Could not reach the order system (" + err.message + "). Check the WEBHOOK_URL in script.js.";
      msgEl.classList.add("err");
      submitBtn.disabled = false;
    } finally {
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
  const backdrop = document.createElement("div");
  backdrop.id = "chat-backdrop";

  const panel = document.createElement("div");
  panel.id = "chat-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
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

  backdrop.appendChild(panel);
  document.body.appendChild(backdrop);
  return { backdrop, panel };
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

  const { backdrop, panel } = buildChatPanel();
  const closeBtn = document.getElementById("chat-close");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");

  let greeted = false;
  const openPanel = () => {
    backdrop.classList.add("open");
    if (!greeted) {
      appendChatMessage("Hi! Ask us anything about sizing, orders or shipping.", "bot");
      greeted = true;
    }
    input.focus();
  };
  const closePanel = () => backdrop.classList.remove("open");

  bubble.addEventListener("click", () => {
    backdrop.classList.contains("open") ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);

  // Close when clicking the dark backdrop (outside the modal itself)
  backdrop.addEventListener("click", (e) => {
    if (e.target === backdrop) closePanel();
  });

  // Close with the Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && backdrop.classList.contains("open")) closePanel();
  });

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
      console.error(err);
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
  renderCartPage();
  initCheckout();
  initChatbotPlaceholder();
  initAddToCartDelegation();
  updateCartBadge();
});
