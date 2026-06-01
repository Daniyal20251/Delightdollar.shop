const API_BASE = "https://delight-backend--araindaniyalo2.replit.app";

// ─── State ───
let currentProduct = null;
let currentSeller = null;
let currentCustomer = null;
let threadId = null;
let chatMessages = [];
let isLoggedIn = false;
let pollTimer = null;
let lastMsgCount = 0;
let pendingImages = [];

// ─── DOM Ready ───
document.addEventListener("DOMContentLoaded", async function() {
  // 1. Check login
  const customer = JSON.parse(localStorage.getItem("customer") || "null");
  if (!customer) {
    showLoginModal();
    return;
  }
  currentCustomer = customer;
  isLoggedIn = true;

  // 2. Parse URL params
  const urlParams = new URLSearchParams(window.location.search);
  const productTitle = urlParams.get("product");
  const sellerPhone = urlParams.get("seller");

  // 3. Load product
  if (productTitle) {
    try {
      const res = await fetch(API_BASE + "/products");
      if (res.ok) {
        const products = await res.json();
        currentProduct = products.find(p =>
          (p.title || "").toLowerCase() === decodeURIComponent(productTitle).toLowerCase()
        );
      }
    } catch (e) { console.warn("Product fetch failed", e); }
  }
  if (!currentProduct) currentProduct = JSON.parse(localStorage.getItem("selectedItem") || "null");

  // 4. Load seller
  if (sellerPhone) {
    await loadSellerInfo(sellerPhone);
  } else if (currentProduct && currentProduct.sellerPhone) {
    await loadSellerInfo(currentProduct.sellerPhone);
  }

  // 5. Show product bar
  if (currentProduct) showProductBar();

  // 6. Start or get chat thread
  await startThread();

  // 7. Load messages & start polling
  await loadMessages();
  startPolling();

  // 8. Setup input events
  setupInputEvents();

  // 9. Send welcome
  sendWelcomeMessage();

  // 10. Auto seller busy message after 20 sec (buyer only)
  startSellerBusyMessage();
});

// ─── WHATSAPP CHAT FEATURE ───
function chatOnWhatsApp() {
  if (!currentSeller || !currentSeller.phone) {
    alert("Seller phone number not available");
    return;
  }

  const phone = currentSeller.phone.replace(/[^0-9]/g, "");
  const productTitle = currentProduct ? (currentProduct.title || "Product") : "Product";
  const basePrice = currentProduct ? (parseInt((currentProduct.price || "0").toString().replace(/[^\d]/g, "")) || 0) : 0;
  const discount = currentProduct ? (parseInt((currentProduct.discount || "0").toString().replace(/[^\d]/g, "")) || 0) : 0;
  const finalPrice = basePrice - discount;
  const priceText = finalPrice > 0 ? "Rs. " + finalPrice : "Price on request";

  const shareLink = generateProductShareLink();

  const message = `👋 Hi! I'm interested in this product\n\n` +
    `📦 *${productTitle}*\n` +
    `💰 *${priceText}*\n\n` +
    `🔗 ${shareLink}\n\n` +
    `Can you tell me more about this?`;

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;

  window.open(whatsappUrl, "_blank");
}

function generateProductShareLink() {
  let link = window.location.href;
  if (currentProduct && currentProduct.title) {
    const encodedTitle = encodeURIComponent(currentProduct.title);
    const sellerPhone = currentSeller ? currentSeller.phone : "";
    link = `${window.location.origin}${window.location.pathname}?product=${encodedTitle}&seller=${encodeURIComponent(sellerPhone)}`;
  }
  return link;
}

// ─── Start Thread ───
async function startThread() {
  if (!currentCustomer || !currentSeller) return;
  try {
    const res = await fetch(API_BASE + "/chat/start-thread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerPhone: currentCustomer.phone,
        sellerPhone: currentSeller.phone,
        productId: currentProduct ? currentProduct.id : null,
      }),
    });
    const data = await res.json();
    if (data.success) {
      threadId = data.threadId;
    }
  } catch (err) {
    console.error("Start thread error:", err);
    threadId = generateLocalThreadId();
  }
}

function generateLocalThreadId() {
  const key = "thread_" + (currentSeller ? currentSeller.phone : "") + "_" + currentCustomer.phone;
  let id = localStorage.getItem(key);
  if (!id) {
    id = Date.now();
    localStorage.setItem(key, id);
  }
  return parseInt(id);
}

// ─── Load Seller ───
async function loadSellerInfo(phone) {
  try {
    const res = await fetch(API_BASE + "/seller/" + phone);
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        currentSeller = data.seller;
        updateSellerHeader();
        return;
      }
    }
  } catch (e) { console.warn("Seller fetch failed", e); }
  currentSeller = { name: "Seller", phone: phone, logo: "lo.png" };
  updateSellerHeader();
}

function updateSellerHeader() {
  const nameEl = document.getElementById("chatSellerName");
  const logoEl = document.getElementById("chatSellerLogo");
  if (nameEl) nameEl.textContent = currentSeller.name || "Seller";
  if (logoEl) logoEl.src = currentSeller.logo || currentSeller.logoUrl || "lo.png";
}

// ─── Product Bar ───
function showProductBar() {
  const bar = document.getElementById("chatProductBar");
  const img = document.getElementById("chatProductImg");
  const title = document.getElementById("chatProductTitle");
  const price = document.getElementById("chatProductPrice");
  if (!currentProduct || !bar) return;

  const imgSrc = currentProduct.images?.[0] || currentProduct.image || "noimg.png";
  const basePrice = parseInt((currentProduct.price || "0").toString().replace(/[^\d]/g, "")) || 0;
  const discount = parseInt((currentProduct.discount || "0").toString().replace(/[^\d]/g, "")) || 0;
  const finalPrice = basePrice - discount;

  if (img) img.src = imgSrc;
  if (title) title.textContent = currentProduct.title || "Product";
  if (price) price.textContent = "Rs. " + finalPrice;
  bar.style.display = "flex";
}

function viewProduct() {
  if (currentProduct) {
    localStorage.setItem("selectedItem", JSON.stringify(currentProduct));
    window.location.href = "itemDetails.html";
  }
}

// ─── Load Messages ───
async function loadMessages() {
  if (!threadId) return;
  try {
    const res = await fetch(API_BASE + "/chat/" + threadId);
    if (!res.ok) return;
    const data = await res.json();
    if (data.success && data.messages) {
      if (data.messages.length !== lastMsgCount) {
        chatMessages = data.messages;
        lastMsgCount = data.messages.length;
        renderMessages();
        scrollToBottom();
      }
    }
  } catch (err) {
    console.warn("Load messages:", err);
  }
}

// ─── Polling ───
function startPolling() {
  pollTimer = setInterval(loadMessages, 3000);
}
function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
}

// ═══════════════════════════════════════════════════════════
// 🔥 FINAL FIX: Render Messages with bulletproof detection
// ═══════════════════════════════════════════════════════════
function renderMessages() {
  const container = document.getElementById("chatMessages");
  const welcome = document.getElementById("chatWelcome");
  if (!container) return;

  if (chatMessages.length === 0) {
    if (welcome) welcome.style.display = "block";
    return;
  }
  if (welcome) welcome.style.display = "none";

  container.innerHTML = "";
  let lastDate = "";

  chatMessages.forEach(function(msg) {
    // Date separator
    const msgDate = new Date(msg.createdAt).toLocaleDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      const dateDiv = document.createElement("div");
      dateDiv.className = "chat-message system";
      dateDiv.textContent = formatDateLabel(msg.createdAt);
      container.appendChild(dateDiv);
    }

    // ─── MESSAGE CLASSIFICATION ───
    // Rule: MY messages (as buyer) go RIGHT, seller messages go LEFT

    let isMyMessage = false;

    // Method 1: senderType field (most reliable)
    if (msg.senderType === "buyer") {
      isMyMessage = true;
    } else if (msg.senderType === "seller") {
      isMyMessage = false;
    }
    // Method 2: senderPhone matches MY phone
    else if (msg.senderPhone && currentCustomer && msg.senderPhone === currentCustomer.phone) {
      isMyMessage = true;
    }
    // Method 3: senderPhone matches seller phone
    else if (msg.senderPhone && currentSeller && msg.senderPhone === currentSeller.phone) {
      isMyMessage = false;
    }
    // buyerPhone se check NAHI karte — woh har message mein hoti hai (unreliable)

    // Apply class: my message = "buyer" (RIGHT), other = "seller" (LEFT)
    const msgClass = isMyMessage ? "buyer" : "seller";

    const div = document.createElement("div");
    div.className = "chat-message " + msgClass;

    let html = "";

    // Images
    if (msg.images && msg.images.length > 0) {
      html += '<div class="chat-message-images">' +
        msg.images.map(function(img) {
          return '<img src="' + img + '" onclick="openImageModal(\'' + img + '\')">';
        }).join("") + '</div>';
    }

    // Text
    if (msg.message) {
      html += '<div class="chat-message-text">' + escapeHtml(msg.message) + '</div>';
    }

    // Time + read status (only for my messages)
    const timeStr = new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    const readStatus = isMyMessage ? '<span class="chat-read-status">&#10003;&#10003;</span>' : "";
    html += '<div class="chat-message-time">' + timeStr + " " + readStatus + "</div>";

    div.innerHTML = html;
    container.appendChild(div);
  });

  scrollToBottom();
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(text) {
  if (!text) return "";
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  const container = document.getElementById("chatMessages");
  if (container) container.scrollTop = container.scrollHeight;
}

// ─── Send Message ───
async function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();

  if (!text && pendingImages.length === 0) return;
  if (!isLoggedIn || !currentCustomer) { showLoginModal(); return; }
  if (!threadId) { alert("Chat not ready. Please wait."); return; }

  const btn = document.getElementById("chatSendBtn");
  btn.disabled = true;

  try {
    const formData = new FormData();
    formData.append("threadId", threadId);
    formData.append("orderId", threadId);
    formData.append("senderType", "buyer");
    formData.append("senderPhone", currentCustomer.phone);
    formData.append("message", text);
    formData.append("buyerPhone", currentCustomer.phone);
    if (currentSeller) formData.append("sellerPhone", currentSeller.phone);
    if (currentProduct) formData.append("productId", currentProduct.id);

    pendingImages.forEach(function(file) {
      formData.append("images", file);
    });

    const res = await fetch(API_BASE + "/chat/send", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      input.value = "";
      pendingImages = [];
      hideAttachMenu();
      await loadMessages();
    } else {
      alert(data.message || "Failed to send");
    }
  } catch (err) {
    console.error("Send error:", err);
    addLocalMessage(text);
    input.value = "";
  }

  btn.disabled = false;
  input.focus();
}

function addLocalMessage(text, senderType) {
  const container = document.getElementById("chatMessages");
  const welcome = document.getElementById("chatWelcome");
  if (welcome) welcome.style.display = "none";

  const div = document.createElement("div");
  div.className = "chat-message " + (senderType || "buyer");

  const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  div.innerHTML = '<div class="chat-message-text">' + escapeHtml(text) + '</div>' +
    '<div class="chat-message-time">' + timeStr + '</div>';
  container.appendChild(div);
  scrollToBottom();
}

// ─── Input Events ───
function setupInputEvents() {
  const input = document.getElementById("chatInput");
  input.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  document.addEventListener("click", function(e) {
    const menu = document.getElementById("chatAttachMenu");
    const btn = document.querySelector(".chat-attach-btn");
    if (menu && !menu.contains(e.target) && e.target !== btn) {
      menu.style.display = "none";
    }
  });
}

// ─── Attach Menu ───
function toggleAttachMenu() {
  const menu = document.getElementById("chatAttachMenu");
  menu.style.display = menu.style.display === "none" ? "flex" : "none";
}
function hideAttachMenu() {
  document.getElementById("chatAttachMenu").style.display = "none";
}
function openPhotoPicker() {
  document.getElementById("chatPhotoInput").click();
  hideAttachMenu();
}
function handleChatPhotos(input) {
  pendingImages = Array.from(input.files);
  if (pendingImages.length > 0) {
    const inputEl = document.getElementById("chatInput");
    inputEl.placeholder = pendingImages.length + " photo" + (pendingImages.length > 1 ? "s" : "") + " selected";
    inputEl.focus();
  }
}
function shareProduct() {
  if (!currentProduct) { alert("No product to share"); return; }
  const msg = "📦 " + currentProduct.title + " - Rs. " + (currentProduct.finalPrice || currentProduct.price);
  document.getElementById("chatInput").value = msg;
  hideAttachMenu();
  sendMessage();
}

// ─── Welcome Message ───
function sendWelcomeMessage() {
  const key = "welcome_sent_" + threadId;
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, "true");

  setTimeout(function() {
    const name = currentSeller ? currentSeller.name : "Seller";
    addLocalMessage("👋 Hi! Welcome to " + name + "'s store. How can I help you today? Feel free to ask about any product!", "seller");
  }, 1200);
}

// ─── Login Modal ───
function showLoginModal() {
  document.getElementById("chatLoginModal").style.display = "flex";
}
function closeLoginModal() {
  document.getElementById("chatLoginModal").style.display = "none";
}
function goToLogin() {
  window.location.href = "login.html";
}

// ─── Image Modal ───
function openImageModal(src) {
  const modal = document.getElementById("chatImageModal");
  const img = document.getElementById("chatImageModalImg");
  img.src = src;
  modal.style.display = "flex";
}
function closeImageModal() {
  document.getElementById("chatImageModal").style.display = "none";
}

// ─── Go Back ───
function goBack() {
  stopPolling();
  window.history.back();
}

// ─── Seller Busy Auto Message (20 sec) ───
function startSellerBusyMessage() {
  // Only for buyer view, only once per thread
  const key = "busy_msg_sent_" + threadId;
  if (localStorage.getItem(key)) return;

  setTimeout(function() {
    // If seller already replied, don't show
    const hasSellerReply = chatMessages.some(function(m) {
      return m.senderType === "seller";
    });
    if (hasSellerReply) return;

    localStorage.setItem(key, "true");

    const container = document.getElementById("chatMessages");
    const welcome = document.getElementById("chatWelcome");
    if (!container) return;
    if (welcome) welcome.style.display = "none";

    // Build WhatsApp link with product info
    const phone = currentSeller ? currentSeller.phone.replace(/[^0-9]/g, "") : "";
    const productTitle = currentProduct ? (currentProduct.title || "Product") : "Product";
    const basePrice = currentProduct ? (parseInt((currentProduct.price || "0").toString().replace(/[^\d]/g, "")) || 0) : 0;
    const discount = currentProduct ? (parseInt((currentProduct.discount || "0").toString().replace(/[^\d]/g, "")) || 0) : 0;
    const finalPrice = basePrice - discount;
    const priceText = finalPrice > 0 ? "Rs. " + finalPrice : "";
    const productLink = currentProduct && currentProduct.title
      ? window.location.origin + window.location.pathname + "?product=" + encodeURIComponent(currentProduct.title) + "&seller=" + encodeURIComponent(phone)
      : window.location.href;

    const waText = "👋 Hi! I'm interested in:\n\n📦 *" + productTitle + "*" +
      (priceText ? "\n💰 *" + priceText + "*" : "") +
      "\n\n🔗 " + productLink + "\n\nCan you tell me more?";
    const waLink = "https://wa.me/" + phone + "?text=" + encodeURIComponent(waText);

    // Message bubble
    const div = document.createElement("div");
    div.className = "chat-message seller";
    const timeStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    div.innerHTML =
      '<div class="chat-message-text" style="line-height:1.6;">' +
        '⏰ Fori Jawab Chahiye?<br>' +
        'Delight Chat per reply me time lag sakta hai.Fast reply ka liya WhatsApp per Contact Karain Thanks.<a href="' + waLink + '" target="_blank" style="' +
          'color:#25D366;font-weight:700;text-decoration:none;' +
          'display:inline-flex;align-items:center;gap:4px;margin-top:2px;">' +
          '<svg viewBox="0 0 24 24" width="14" height="14" fill="#25D366" style="flex-shrink:0"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
          'Chat on WhatsApp' +
        '</a>' +
      '</div>' +
      '<div class="chat-message-time">' + timeStr + '</div>';

    container.appendChild(div);
    scrollToBottom();
  }, 60000);
}

// ─── Cleanup ───
window.addEventListener("beforeunload", stopPolling);
window.addEventListener("pagehide", stopPolling);