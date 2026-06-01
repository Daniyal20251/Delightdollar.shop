// Final itemDetails.js — Clean, Bug-Free & Backend-Friendly
document.addEventListener("DOMContentLoaded", async () => {
  // 🔥 STEP 1: Check URL for product parameter
  const urlParams = new URLSearchParams(window.location.search);
  const productFromUrl = urlParams.get('product');

  let item = null;
  
    // 🔥 Increment View Count Function (also for direct link opens)
  async function incrementView(productId) {
    try {
      await fetch(`https://delight-backend--araindaniyalo2.replit.app/products/${productId}/view`, { method: "POST" });
    } catch (err) {
      console.error("View count error:", err);
    }
  }

  if (productFromUrl) {
    // 🔥 URL se product name mila → Backend se fetch karo
    try {
      const res = await fetch(`https://delight-backend--araindaniyalo2.replit.app/products`);
      if (res.ok) {
        const allProducts = await res.json();
        // Product name se match karo (case-insensitive)
        item = allProducts.find(p => 
          (p.title || "").toLowerCase() === decodeURIComponent(productFromUrl).toLowerCase()
        );
      }
    } catch (err) {
      console.warn("Backend fetch failed:", err);
    }
  }

  // 🔥 Agar URL se nahi mila, toh localStorage check karo
  if (!item) {
    item = JSON.parse(localStorage.getItem("selectedItem"));
  }

  // 🔥 Agar phir bhi nahi mila → Error show karo
  if (!item) {
    document.querySelector(".item-details").innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <p style="font-size:18px;color:#666;margin-bottom:16px;">No item selected.</p>
        <a href="index.html" style="color:#ef6c00;text-decoration:none;font-weight:600;">← Back to Home</a>
      </div>
    `;
    return;
  }

  // ✅ FIX: Index.js jaisa price calculation — discount = amount (rupees mein)
  function getPriceData(product) {
    // Agar pehle se finalPrice aur originalPrice hain (localStorage se), toh wohi use karo
    if (product.finalPrice && product.originalPrice) {
      const discountAmount = product.originalPrice - product.finalPrice;
      const discountPercentage = product.originalPrice > 0 
        ? Math.round((discountAmount / product.originalPrice) * 100) 
        : 0;
      return { 
        originalPrice: product.originalPrice, 
        finalPrice: product.finalPrice, 
        discountAmount,
        discountPercentage
      };
    }

    // 🔥 Index.js jaisa calculation — discount is AMOUNT not percentage
    const basePrice = parseInt(product.price?.toString().replace(/[^\d]/g, "")) || 0;
    const discountAmount = parseInt(product.discount?.toString().replace(/[^\d]/g, "")) || 0;
    const originalPrice = basePrice; // backend price = original
    const finalPrice = basePrice - discountAmount; // final = original - discount amount
    const discountPercentage = basePrice > 0 
      ? Math.round((discountAmount / basePrice) * 100) 
      : 0;

    return { originalPrice, finalPrice, discountAmount, discountPercentage };
  }

  // ✅ FIX: Agar item URL se aaya hai, toh uski price calculate karo aur inject karo
  if (productFromUrl && item) {
    const { originalPrice, finalPrice, discountAmount, discountPercentage } = getPriceData(item);
    item.originalPrice = originalPrice;
    item.finalPrice = finalPrice;
    item.discountAmount = discountAmount;
    item.discountPercentage = discountPercentage;
  }

  // 🔥 IMPORTANT: Save fetched item to localStorage for future use
  localStorage.setItem("selectedItem", JSON.stringify(item));

  // 🔥 FIX: Increment view count when opened via direct link
  if (productFromUrl && item.id) {
    incrementView(item.id);
  }


  // State
  let currentIndex = 0;
  let startX = 0;
  let selectedColor = "";
  let selectedSize = "";
  let reviewRating = 0;
  let reviewPhotoFiles = [];
  let allReviews = [];
  let displayedReviews = 0;
  const REVIEWS_PER_PAGE = 3;
  const API_BASE = "https://delight-backend--araindaniyalo2.replit.app";

  // Elements
  const slider = document.getElementById("imageSlider");
  const dotsContainer = document.getElementById("dotsContainer");
  const titleEl = document.getElementById("title");
  const priceEl = document.getElementById("price");
  const descEl = document.getElementById("description");
  const supplierContainer = document.getElementById("supplier-container");
  const container = document.getElementById("itemContainer");
  const cartCountEl = document.getElementById("cartCount");

  // ✅ FIXED: storePhone define karo (item se lo)
  const storePhone = item.sellerPhone || "";

  // Update cart link with store phone
  const cartLink = document.getElementById("cartLink");
  if (cartLink && storePhone) {
    cartLink.href = `Cart Stores.html?phone=${encodeURIComponent(storePhone)}`;
  }

  // ═══════════════════════════════════════════════════
  // 🔥 SHARE FUNCTIONS
  // ═══════════════════════════════════════════════════
  window.openShareModal = function() {
    const modal = document.getElementById("shareModal");
    const shareLink = document.getElementById("shareLink");

    const currentUrl = window.location.href.split('?')[0];
    const shareUrl = `${currentUrl}?product=${encodeURIComponent(item.title)}`;

    shareLink.value = shareUrl;
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeShareModal = function(e) {
    if (e && e.target && e.target.id === "shareModal") {
      document.getElementById("shareModal").classList.remove("active");
      document.body.style.overflow = "";
    }
  };

  window.closeShareModalDirect = function() {
    document.getElementById("shareModal").classList.remove("active");
    document.body.style.overflow = "";
  };

  window.shareVia = function(platform) {
    const currentUrl = window.location.href.split('?')[0];
    const shareUrl = `${currentUrl}?product=${encodeURIComponent(item.title)}`;

    const text = `🔥 Check out this amazing deal!\n\n${item.title}\nPrice: Rs. ${item.finalPrice || item.price}\n\n${shareUrl}`;

    let url = "";
    switch(platform) {
      case 'whatsapp':
        url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'sms':
        url = `sms:?&body=${encodeURIComponent(text)}`;
        break;
    }

    if (url) window.open(url, '_blank');
    document.getElementById("shareModal").classList.remove("active");
    document.body.style.overflow = "";
  };

  window.copyLink = function() {
    const shareLink = document.getElementById("shareLink");
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);

    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareLink.value).catch(() => {
        document.execCommand("copy");
      });
    } else {
      document.execCommand("copy");
    }

    const btn = document.querySelector(".copy-btn");
    const originalText = btn.textContent;
    btn.textContent = "Copied!";
    btn.style.background = "#5cb85c";

    setTimeout(() => {
      btn.textContent = originalText;
      btn.style.background = "#ef6c00";
    }, 2000);

    document.getElementById("shareModal").classList.remove("active");
    document.body.style.overflow = "";
  };

  // ═══════════════════════════════════════════════════
  // RENDER PRODUCT INFO
  // ═══════════════════════════════════════════════════
  if (!item.id) item.id = item.title.replace(/\s+/g, "_") + "_" + (item.finalPrice || item.price);
  titleEl.textContent = item.title || "";

  // ✅ FIX: Index.js jaisa price render
  const { originalPrice, finalPrice, discountAmount, discountPercentage } = getPriceData(item);
  priceEl.innerHTML = `
    <div class="price-wrapper">
      <span class="new-price"><span class="rs">Rs.</span><strong>${finalPrice}</strong></span>
      ${discountAmount > 0 ? `<span class="old-price"><span class="rs">Rs.</span>${originalPrice}</span>` : ""}
      ${discountPercentage > 0 ? `<span class="discount-badge">${discountPercentage}% OFF</span>` : ""}
    </div>
  `;

  // 🔹 Function: description ko paragraph + bullets me convert kare
  function formatDescription(desc) {
    if (!desc) return "";
    desc = desc.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();

    const clean = s => s
      .replace(/^[\s\-\*\u2022•]+/, "")
      .replace(/^\d+\.\s*/, "")
      .replace(/\s{2,}/g, " ")
      .trim();

    if (desc.includes("•") || desc.includes("\u2022")) {
      const parts = desc.split(/•|\u2022/)
        .map(p => clean(p))
        .filter(Boolean);
      if (!parts.length) return "";
      if (parts.length > 1 && parts[0].length < 60 && !parts[0].includes(":")) {
        const intro = parts.shift();
        return `<p>${intro}</p><ul>${parts.map(p => `<li>${p}</li>`).join("")}</ul>`;
      }
      return `<ul>${parts.map(p => `<li>${p}</li>`).join("")}</ul>`;
    }

    const lines = desc.split("\n").map(l => clean(l)).filter(Boolean);
    if (!lines.length) return "";
    if (lines.length === 1) return `<p>${lines[0]}</p>`;

    const first = lines[0];
    const rest = lines.slice(1);
    if (rest.length && first.length < 200 && !first.includes(":")) {
      return `<p>${first}</p><ul>${rest.map(l => `<li>${l}</li>`).join("")}</ul>`;
    }

    return `<ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>`;
  }

  descEl.innerHTML = formatDescription(item.description);

  // ═══════════════════════════════════════════════════
  // MEDIA SLIDER (images + videos)
  // ═══════════════════════════════════════════════════
  const mediaList = [...(item.images || []), ...(item.videos || [])];

  function renderMedia() {
    slider.innerHTML = "";
    dotsContainer.innerHTML = "";
    if (mediaList.length === 0) {
      const img = document.createElement("img");
      img.src = "noimg.png";
      img.classList.add("slide", "active");
      img.alt = "No image available";
      slider.appendChild(img);
      return;
    }
    mediaList.forEach((media, index) => {
      let el;
      if (typeof media === "string" && media.toLowerCase().endsWith(".mp4")) {
        el = document.createElement("video");
        el.src = media;
        el.controls = true;
        el.playsInline = true;
        el.preload = "metadata";
      } else {
        el = document.createElement("img");
        el.src = media;
        el.alt = `${item.title || 'Product'} - Image ${index + 1}`;
        el.loading = index === 0 ? "eager" : "lazy";
      }
      el.classList.add("slide");
      if (index === 0) el.classList.add("active");
      slider.appendChild(el);

      const dot = document.createElement("span");
      dot.className = "dot" + (index === 0 ? " active" : "");
      dot.addEventListener("click", () => showSlide(index));
      dot.setAttribute("role", "button");
      dot.setAttribute("aria-label", `Go to image ${index + 1}`);
      dotsContainer.appendChild(dot);
    });
  }

  let showSlide = function(index) {
    const slides = slider.querySelectorAll(".slide");
    const dots = dotsContainer.querySelectorAll(".dot");
    if (!slides.length) return;
    index = (index + slides.length) % slides.length;
    slides.forEach(s => s.classList.remove("active"));
    dots.forEach(d => d.classList.remove("active"));
    slides[index].classList.add("active");
    dots[index].classList.add("active");
    currentIndex = index;
    updateCounter();
  };

  // Mobile swipe
  slider.addEventListener("touchstart", e => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  slider.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].clientX;
    const diff = endX - startX;
    if (diff > 50) showSlide(currentIndex - 1);
    else if (diff < -50) showSlide(currentIndex + 1);
  }, { passive: true });

  renderMedia();

  // ✅ Add Daraz-style counter (1/11)
  const counter = document.createElement("div");
  counter.classList.add("image-counter");
  counter.setAttribute("aria-live", "polite");
  slider.appendChild(counter);

  function updateCounter() {
    counter.textContent = `${currentIndex + 1} / ${mediaList.length || 1}`;
  }
  updateCounter();

  // ═══════════════════════════════════════════════════
  // VARIANT SELECTORS (COLOR & SIZE)
  // ═══════════════════════════════════════════════════
  const variantContainer = document.createElement("div");
  variantContainer.classList.add("variant-container");
  const firstSection = document.querySelector(".section");
  if (firstSection) {
    document.querySelector(".item-details").insertBefore(variantContainer, firstSection);
  } else {
    document.querySelector(".item-details").appendChild(variantContainer);
  }

  // Colors
  const colors = Array.isArray(item.color)
    ? item.color
    : (item.color || item.colors ? (item.color || item.colors).toString().split(",").map(c => c.trim()).filter(Boolean) : []);
  if (colors.length) {
    const colorDiv = document.createElement("div");
    colorDiv.classList.add("color-options");
    const label = document.createElement("h5"); 
    label.textContent = "Select Color:";
    colorDiv.appendChild(label);
    colors.forEach(color => {
      const btn = document.createElement("button");
      btn.textContent = color;
      btn.classList.add("color-btn");
      btn.setAttribute("type", "button");
      btn.addEventListener("click", () => {
        colorDiv.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedColor = color;
      });
      colorDiv.appendChild(btn);
    });
    variantContainer.appendChild(colorDiv);
  }

  // Sizes
  const sizes = Array.isArray(item.size)
    ? item.size
    : (item.size || item.sizes ? (item.size || item.sizes).toString().split(",").map(s => s.trim()).filter(Boolean) : []);
  if (sizes.length) {
    const sizeDiv = document.createElement("div");
    sizeDiv.classList.add("size-options");
    const label = document.createElement("h5"); 
    label.textContent = "Select Size:";
    sizeDiv.appendChild(label);
    sizes.forEach(size => {
      const btn = document.createElement("button");
      btn.textContent = size;
      btn.classList.add("size-btn");
      btn.setAttribute("type", "button");
      btn.addEventListener("click", () => {
        sizeDiv.querySelectorAll(".size-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedSize = size;
      });
      sizeDiv.appendChild(btn);
    });
    variantContainer.appendChild(sizeDiv);
  }

  // ═══════════════════════════════════════════════════
  // SUPPLIER INFO
  // ═══════════════════════════════════════════════════
  async function loadSupplierInfo(sellerPhone) {
    if (!sellerPhone) {
      supplierContainer.innerHTML = `<p style="text-align:center;color:#999;padding:20px;">Seller info not available</p>`;
      return;
    }
    let sellerName = "Unknown Seller";
    let sellerLogo = "lo.png";
    try {
      const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/all-stores");
      const stores = await res.json();

      const norm = p => p?.toString().replace(/\D/g, "");
      const sp = norm(sellerPhone);

      let seller = stores.find(s => s.phone === sellerPhone);
      if (!seller) {
        seller = stores.find(s => norm(s.phone) === sp);
      }
      if (!seller) {
        seller = stores.find(s => {
          const sNorm = norm(s.phone);
          if (!sNorm || !sp) return false;
          return sNorm.endsWith(sp) || sp.endsWith(sNorm);
        });
      }

      if (seller) {
        sellerName = seller.name || sellerName;
        sellerLogo = seller.logo || sellerLogo;
        if (seller.delivery) {
          item.delivery = seller.delivery;
          localStorage.setItem("selectedItem", JSON.stringify(item));
        }
      } else {
        console.warn("Seller not found for phone:", sellerPhone);
      }
    } catch (err) {
      console.warn("Supplier info not loaded:", err);
    }

    supplierContainer.innerHTML = `
      <div class="supplier-info">
        <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">
          <img src="${sellerLogo}" alt="${sellerName}" class="supplier-logo" onerror="this.src='lo.png'">
          <span class="supplier-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sellerName}</span>
        </div>
        <button id="viewSupplierBtn" class="view-supplier-btn">View Shop</button>
      </div>
    `;
    const btn = supplierContainer.querySelector("#viewSupplierBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        window.location.href = `Store.html?phone=${encodeURIComponent(item.sellerPhone)}`;
      });
    }
  }

  // ═══════════════════════════════════════════════════
  // ⭐ RATINGS & REVIEWS SYSTEM
  // ═══════════════════════════════════════════════════
  function renderStars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5;
    let s = "";
    for (let i = 0; i < full; i++) s += "★";
    if (half) s += "½";
    for (let i = full + (half ? 1 : 0); i < 5; i++) s += "☆";
    return s;
  }

  async function loadRatingAndReviews() {
    if (!item || !item.id) return;
    try {
      const ratingRes = await fetch(API_BASE + "/product-rating/" + item.id);
      const ratingData = await ratingRes.json();
      const avg = ratingData.averageRating || 0;
      const total = ratingData.totalReviews || 0;

      // Inline header
      const rs = document.getElementById("ratingStars");
      const rsc = document.getElementById("ratingScore");
      const rc = document.getElementById("ratingCount");
      if (rs) rs.textContent = renderStars(avg);
      if (rsc) rsc.textContent = avg.toFixed(1);
      if (rc) rc.textContent = "(" + total + ")";

      // Big summary
      const rbn = document.getElementById("ratingBigNumber");
      const rbs = document.getElementById("ratingBigStars");
      const rtt = document.getElementById("ratingTotalText");
      const rtc = document.getElementById("reviewsTotalCount");
      if (rbn) rbn.textContent = avg.toFixed(1);
      if (rbs) rbs.textContent = renderStars(avg);
      if (rtt) rtt.textContent = total + " Ratings";
      if (rtc) rtc.textContent = "(" + total + ")";

      // Bars
      const barsDiv = document.getElementById("ratingBarsDaraz");
      if (barsDiv && ratingData.ratingBreakdown) {
        barsDiv.innerHTML = [5,4,3,2,1].map(star => {
          const count = ratingData.ratingBreakdown[star] || 0;
          const pct = total > 0 ? (count / total * 100) : 0;
          return '<div class="rating-bar-daraz">' +
            '<span>' + star + '★</span>' +
            '<div class="rating-bar-track"><div class="rating-bar-fill-daraz" style="width:' + pct + '%"></div></div>' +
            '<span>' + count + '</span>' +
          '</div>';
        }).join("");
      }

      // Reviews list
      const revRes = await fetch(API_BASE + "/reviews/" + item.id);
      const revData = await revRes.json();
      allReviews = revData.reviews || [];
      displayedReviews = 0;
      renderReviewsList();

    } catch (err) {
      console.error("Load reviews error:", err);
    }
  }

  function renderReviewsList() {
    const container = document.getElementById("reviewsListDaraz");
    const loadMoreBtn = document.getElementById("loadMoreReviews");
    if (!container) return;

    if (allReviews.length === 0) {
      container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No reviews yet. Be the first to review!</p>';
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      return;
    }

    const toShow = allReviews.slice(0, displayedReviews + REVIEWS_PER_PAGE);
    container.innerHTML = toShow.map(review => {
      const initial = (review.buyerName || "A").charAt(0).toUpperCase();
      const maskedName = review.buyerName ? review.buyerName.charAt(0) + "***" + review.buyerName.slice(-1) : "Anonymous";
      const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      return '<div class="review-card-daraz">' +
        '<div class="review-header-daraz">' +
          '<div class="review-buyer-info">' +
            '<div class="review-buyer-avatar">' + initial + '</div>' +
            '<div>' +
              '<div class="review-buyer-name">' + maskedName + '</div>' +
              (review.isVerifiedPurchase ? '<div class="review-verified">✓ Verified Purchase</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="review-stars-daraz">' + renderStars(review.rating) + '</div>' +
        '</div>' +
        '<div class="review-date-daraz">' + dateStr + '</div>' +
        '<div class="review-message-daraz">' + (review.message || "") + '</div>' +
        (review.images && review.images.length > 0 ?
          '<div class="review-photos-daraz">' +
            review.images.map(img => '<img src="' + img + '" onclick="openFullscreenViewerFromSrc(\'' + img + '\')">').join("") +
          '</div>' : '') +
      '</div>';
    }).join("");

    displayedReviews = toShow.length;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = displayedReviews < allReviews.length ? "block" : "none";
    }
  }

  window.loadMoreReviews = function() { renderReviewsList(); };

  window.showAllReviews = function() {
    const modal = document.getElementById("allReviewsModal");
    const content = document.getElementById("allReviewsContent");
    if (!modal || !content) return;
    content.innerHTML = allReviews.map(review => {
      const initial = (review.buyerName || "A").charAt(0).toUpperCase();
      const maskedName = review.buyerName ? review.buyerName.charAt(0) + "***" + review.buyerName.slice(-1) : "Anonymous";
      const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      return '<div class="review-card-daraz" style="margin-bottom:16px;">' +
        '<div class="review-header-daraz">' +
          '<div class="review-buyer-info">' +
            '<div class="review-buyer-avatar">' + initial + '</div>' +
            '<div>' +
              '<div class="review-buyer-name">' + maskedName + '</div>' +
              (review.isVerifiedPurchase ? '<div class="review-verified">✓ Verified Purchase</div>' : '') +
            '</div>' +
          '</div>' +
          '<div class="review-stars-daraz">' + renderStars(review.rating) + '</div>' +
        '</div>' +
        '<div class="review-date-daraz">' + dateStr + '</div>' +
        '<div class="review-message-daraz">' + (review.message || "") + '</div>' +
        (review.images && review.images.length > 0 ?
          '<div class="review-photos-daraz">' +
            review.images.map(img => '<img src="' + img + '" onclick="openFullscreenViewerFromSrc(\'' + img + '\')">').join("") +
          '</div>' : '') +
      '</div>';
    }).join("");
    modal.style.display = "block";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeAllReviews = function() {
    const modal = document.getElementById("allReviewsModal");
    if (modal) { modal.style.display = "none"; modal.classList.remove("active"); }
    document.body.style.overflow = "";
  };

  window.openReviewModal = function() {
    const customer = JSON.parse(localStorage.getItem("customer"));
    if (!customer) {
      alert("Please login to write a review");
      window.location.href = "login.html";
      return;
    }
    const modal = document.getElementById("reviewModalDaraz");
    const productImg = document.getElementById("reviewProductImg");
    const productTitle = document.getElementById("reviewProductTitle");
    if (productImg) productImg.src = item.images?.[0] || item.image || "noimg.png";
    if (productTitle) productTitle.textContent = item.title || "Product";
    reviewRating = 0;
    reviewPhotoFiles = [];
    updateStarDisplay(0);
    document.getElementById("reviewMessageDaraz").value = "";
    document.getElementById("reviewPhotoPreview").innerHTML = "";
    document.getElementById("ratingText").textContent = "Tap a star to rate";
    if (modal) { modal.style.display = "flex"; modal.classList.add("active"); document.body.style.overflow = "hidden"; }
  };

  window.closeReviewModal = function() {
    const modal = document.getElementById("reviewModalDaraz");
    if (modal) { modal.style.display = "none"; modal.classList.remove("active"); }
    document.body.style.overflow = "";
  };

  function setupStarClicks() {
    const stars = document.querySelectorAll("#starRatingInputDaraz .star-big");
    stars.forEach(star => {
      star.addEventListener("click", function() {
        const rating = parseInt(this.getAttribute("data-rating"));
        reviewRating = rating;
        updateStarDisplay(rating);
        const texts = ["Terrible", "Poor", "Average", "Good", "Excellent"];
        document.getElementById("ratingText").textContent = texts[rating - 1] || "Tap a star to rate";
      });
    });
  }

  function updateStarDisplay(rating) {
    const stars = document.querySelectorAll("#starRatingInputDaraz .star-big");
    stars.forEach((star, idx) => {
      star.textContent = idx < rating ? "★" : "☆";
      star.classList.toggle("active", idx < rating);
    });
  }

  window.handleReviewPhotos = function(input) {
    const preview = document.getElementById("reviewPhotoPreview");
    preview.innerHTML = "";
    reviewPhotoFiles = [];
    Array.from(input.files).forEach(file => {
      reviewPhotoFiles.push(file);
      const reader = new FileReader();
      reader.onload = e => {
        const div = document.createElement("div");
        div.className = "review-photo-preview-item";
        div.innerHTML = '<img src="' + e.target.result + '"><button class="review-photo-remove" onclick="this.parentElement.remove()">✕</button>';
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  };

  window.submitReviewDaraz = async function() {
    if (reviewRating === 0) { alert("Please select a rating by tapping the stars"); return; }
    const message = document.getElementById("reviewMessageDaraz").value.trim();
    if (!message) { alert("Please write a review message"); return; }
    const customer = JSON.parse(localStorage.getItem("customer"));
    if (!customer) { alert("Please login first"); return; }
    const btn = document.getElementById("submitReviewBtn");
    btn.disabled = true;
    btn.textContent = "Submitting...";
    try {
      const formData = new FormData();
      formData.append("buyerPhone", customer.phone);
      formData.append("buyerName", customer.name || "Anonymous");
      formData.append("rating", reviewRating);
      formData.append("message", message);
      reviewPhotoFiles.forEach(file => formData.append("images", file));
      const res = await fetch(API_BASE + "/reviews/" + item.id, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) {
        alert("✅ Review submitted successfully!");
        closeReviewModal();
        loadRatingAndReviews();
      } else {
        alert(data.message || "Failed to submit review");
      }
    } catch (err) {
      alert("❌ Error submitting review. Please try again.");
      console.error(err);
    }
    btn.disabled = false;
    btn.textContent = "Submit Review";
  };

  window.openFullscreenViewerFromSrc = function(src) {
    fullscreenMediaList = [{ type: 'image', src: src }];
    fullscreenCurrentIndex = 0;
    const viewer = document.getElementById("fullscreenViewer");
    updateFullscreenImage();
    updateFullscreenDots();
    updateFullscreenCounter();
    viewer.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  // ═══════════════════════════════════════════════════
  // ⭐ FULLSCREEN IMAGE VIEWER SYSTEM
  // ═══════════════════════════════════════════════════
  let fullscreenMediaList = [];
  let fullscreenCurrentIndex = 0;
  let isZoomed = false;
  let lastTapTime = 0;

  window.openFullscreenViewer = function() {
    const viewer = document.getElementById("fullscreenViewer");
    const img = document.getElementById("fullscreenImage");

    // Get current media list from slider
    const slides = document.querySelectorAll("#imageSlider .slide");
    fullscreenMediaList = [];

    slides.forEach(slide => {
      if (slide.tagName === 'IMG') {
        fullscreenMediaList.push({ type: 'image', src: slide.src });
      }
    });

    if (fullscreenMediaList.length === 0) return;

    fullscreenCurrentIndex = currentIndex || 0;
    updateFullscreenImage();
    updateFullscreenDots();
    updateFullscreenCounter();

    viewer.classList.add("active");
    document.body.style.overflow = "hidden";

    // Show zoom hint
    showZoomHint();
  };

  window.closeFullscreenViewer = function() {
    const viewer = document.getElementById("fullscreenViewer");
    viewer.classList.remove("active");
    document.body.style.overflow = "";
    isZoomed = false;

    const img = document.getElementById("fullscreenImage");
    if (img) {
      img.classList.remove("zoomed");
      img.style.transform = "";
    }
  };

  window.changeFullscreenImage = function(direction) {
    const img = document.getElementById("fullscreenImage");
    if (!img) return;

    if (direction > 0) {
      img.classList.add("slide-right");
    } else {
      img.classList.add("slide-left");
    }

    setTimeout(() => {
      fullscreenCurrentIndex = (fullscreenCurrentIndex + direction + fullscreenMediaList.length) % fullscreenMediaList.length;
      updateFullscreenImage();
      updateFullscreenDots();
      updateFullscreenCounter();

      setTimeout(() => {
        img.classList.remove("slide-right", "slide-left");
      }, 50);
    }, 150);
  };

  function updateFullscreenImage() {
    const img = document.getElementById("fullscreenImage");
    const media = fullscreenMediaList[fullscreenCurrentIndex];

    if (media && media.type === 'image') {
      img.src = media.src;
      img.style.display = 'block';
    }

    // Reset zoom
    isZoomed = false;
    img.classList.remove("zoomed");
    img.style.transform = "scale(1)";
  }

  function updateFullscreenDots() {
    const dotsContainer = document.getElementById("fullscreenDots");
    dotsContainer.innerHTML = "";

    fullscreenMediaList.forEach((_, index) => {
      const dot = document.createElement("span");
      dot.className = "fullscreen-dot" + (index === fullscreenCurrentIndex ? " active" : "");
      dot.addEventListener("click", () => {
        fullscreenCurrentIndex = index;
        updateFullscreenImage();
        updateFullscreenDots();
        updateFullscreenCounter();
      });
      dot.setAttribute("role", "button");
      dot.setAttribute("aria-label", `Go to image ${index + 1}`);
      dotsContainer.appendChild(dot);
    });
  }

  function updateFullscreenCounter() {
    const counter = document.getElementById("fullscreenCounter");
    counter.textContent = `${fullscreenCurrentIndex + 1} / ${fullscreenMediaList.length}`;
  }

  function showZoomHint() {
    const existing = document.querySelector(".zoom-hint");
    if (existing) existing.remove();

    const hint = document.createElement("div");
    hint.className = "zoom-hint";
    hint.textContent = "👆 Double tap to zoom";
    document.querySelector(".fullscreen-content").appendChild(hint);

    setTimeout(() => hint.remove(), 3500);
  }

  // Double tap to zoom
  function setupFullscreenGestures() {
    const img = document.getElementById("fullscreenImage");
    const container = document.getElementById("fullscreenImageContainer");

    if (!img || !container) return;

    // Double tap zoom
    img.addEventListener("click", function(e) {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTapTime;

      if (tapLength < 300 && tapLength > 0) {
        isZoomed = !isZoomed;

        if (isZoomed) {
          img.classList.add("zoomed");
          const rect = img.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          img.style.transformOrigin = `${x}% ${y}%`;
        } else {
          img.classList.remove("zoomed");
          img.style.transformOrigin = "center center";
        }
      }

      lastTapTime = currentTime;
    });

    // Swipe for next/prev in fullscreen
    let fsStartX = 0;
    let fsStartY = 0;

    container.addEventListener("touchstart", function(e) {
      fsStartX = e.touches[0].clientX;
      fsStartY = e.touches[0].clientY;
    }, { passive: true });

    container.addEventListener("touchend", function(e) {
      if (isZoomed) return;

      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const diffX = fsStartX - endX;
      const diffY = fsStartY - endY;

      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
        if (diffX > 0) {
          changeFullscreenImage(1);
        } else {
          changeFullscreenImage(-1);
        }
      }
    }, { passive: true });

    // Pinch zoom support
    let initialDistance = 0;
    let initialScale = 1;

    container.addEventListener("touchstart", function(e) {
      if (e.touches.length === 2) {
        initialDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialScale = isZoomed ? 2 : 1;
      }
    }, { passive: true });

    container.addEventListener("touchmove", function(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const currentDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );

        const scale = (currentDistance / initialDistance) * initialScale;

        if (scale > 1.5) {
          isZoomed = true;
          img.style.transform = `scale(${Math.min(scale, 3)})`;
        } else {
          isZoomed = false;
          img.style.transform = "scale(1)";
        }
      }
    }, { passive: false });

    container.addEventListener("touchend", function() {
      if (isZoomed) {
        img.classList.add("zoomed");
      } else {
        img.classList.remove("zoomed");
        img.style.transform = "";
      }
    });
  }

  // Keyboard navigation for fullscreen
  window.addEventListener("keydown", function(e) {
    const viewer = document.getElementById("fullscreenViewer");
    if (!viewer.classList.contains("active")) return;

    if (e.key === "Escape") closeFullscreenViewer();
    if (e.key === "ArrowLeft") changeFullscreenImage(-1);
    if (e.key === "ArrowRight") changeFullscreenImage(1);
  });

// ═══════════════════════════════════════════════════
// DELIGHT CHAT BUTTON
// ═══════════════════════════════════════════════════
function setupWhatsAppButton() {
  const chatAnchor = document.querySelector(".whatsapp-btn a");
  if (!chatAnchor) return;
  chatAnchor.removeAttribute("href");
  chatAnchor.onclick = function(e) {
    e.preventDefault();
    openDelightChat();
  };
}

window.openDelightChat = function() {
  const customer = JSON.parse(localStorage.getItem("customer"));
  if (!customer) {
    alert("Please login to chat with seller");
    window.location.href = "login.html";
    return;
  }
  if (!item || !item.sellerPhone) {
    alert("Seller information not available");
    return;
  }
  localStorage.setItem("selectedItem", JSON.stringify(item));
  window.location.href = "Delight Chat.html?product=" + encodeURIComponent(item.title) + "&seller=" + encodeURIComponent(item.sellerPhone);
};

  // ═══════════════════════════════════════════════════
  // ✅ SIMILAR ITEMS — SAME STORE ONLY
  // ═══════════════════════════════════════════════════
  async function loadSimilarItems(currentItem) {
    const container = document.getElementById("itemContainer");
    container.innerHTML = `<div style="text-align:center;padding:20px;color:#999;">Loading similar items...</div>`;

    const targetPhone = currentItem.sellerPhone || "";
    const normTarget = targetPhone.toString().replace(/\D/g, "");

    let backendItems = [];
    let localItems = window.items || [];
    try {
      const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/products");
      if (res.ok) backendItems = await res.json();
    } catch (err) {
      console.warn("Backend products not loaded:", err);
    }

    const merged = [...localItems];
    backendItems.forEach(b => {
      const exists = merged.find(m => (m.title || "").toLowerCase() === (b.title || "").toLowerCase());
      if (!exists) merged.push(b);
    });
    // Pehle sirf SAME STORE ke items filter karo
    const norm = p => p?.toString().replace(/\D/g, "");
    let sameStoreItems = merged.filter(i => {
      const itemPhone = norm(i.sellerPhone);
      if (!itemPhone || !normTarget) return false;
      return itemPhone === normTarget || 
             itemPhone.endsWith(normTarget) || 
             normTarget.endsWith(itemPhone);
    });

    // Seed word se title match karo
    const seed = (currentItem.title || "").split(" ")[0]?.toLowerCase() || "";
    let related = sameStoreItems.filter(i => {
      if (!i.title) return false;
      if (i.title === currentItem.title) return false;
      const t = i.title.toLowerCase();
      return t.includes(seed);
    });

    // Agar seed se kuch nahi mila, toh same store ke random items
    if (!related.length) related = sameStoreItems.slice(0, 10);

    // Agar same store mein kuch bhi nahi mila, tab fallback
    if (!related.length) {
      related = merged.filter(i => i.title !== currentItem.title).slice(0, 10);
    }

    related = related.sort(() => 0.5 - Math.random()).slice(0, 10);

    container.innerHTML = "";
    if (related.length === 0) {
      container.innerHTML = `<div style="text-align:center;padding:20px;color:#999;">No similar items found</div>`;
      return;
    }

    related.forEach(i => {
      const basePrice = parseInt(i.price?.toString().replace(/[^\d]/g, "")) || 0;
      const discountAmount = parseInt(i.discount?.toString().replace(/[^\d]/g, "")) || 0;
      const finalPrice = basePrice - discountAmount;
      const imgSrc = i.images?.[0] || i.image || "noimg.png";

      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = `
        <img src="${imgSrc}" alt="${i.title}" loading="lazy" onerror="this.src='noimg.png'">
        <h3>${i.title}</h3>
        <p class="price-wrapper">
          <span class="new-price">
            <span class="rs">Rs.</span><strong>${finalPrice}</strong>
          </span>
          ${discountAmount > 0 ? `
            <span class="old-price">
              <span class="rs">Rs.</span>${basePrice}
            </span>` : ""}
        </p>
      `;

      card.addEventListener("click", () => {
        localStorage.setItem("selectedItem", JSON.stringify({
          ...i,
          finalPrice,
          originalPrice: basePrice,
          discountAmount,
          discountPercentage: basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0
        }));
        window.location.href = "Stores itemDetails.html";
      });

      container.appendChild(card);
    });
  }

  // ═══════════════════════════════════════════════════
  // CART FUNCTIONS
  // ═══════════════════════════════════════════════════
  function updateCartCount() {
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    let total = cart.reduce((sum, it) => sum + (it.quantity || 0), 0);
    cartCountEl.textContent = total;
    cartCountEl.style.display = total > 0 ? "inline" : "none";
  }
  updateCartCount();

  window.addToCart = function(event) {
    if (!item) return;
    if (!item.id) item.id = item.title.replace(/\s+/g, "_") + "_" + (item.finalPrice || item.price);
    let cart = JSON.parse(localStorage.getItem("cart")) || [];
    const { finalPrice: fp } = getPriceData(item);
    const existing = cart.find(p => p.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: item.id,
        title: item.title,
        price: fp,
        image: item.images ? item.images[0] : item.image,
        quantity: 1,
        description: item.description || "",
        sellerPhone: item.sellerPhone || "",
        delivery: item.delivery || 0,
        selectedColor,
        selectedSize
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    animateFlyToCart(event);
  };

  // ✅ FIXED: Go to order page — sellerPhone ke saath bhejo
  window.goToOrderPage = function() {
    const { finalPrice: fp, originalPrice: op, discountPercentage } = getPriceData(item);
    localStorage.setItem("orderProduct", JSON.stringify({
      title: item.title,
      image: item.images ? item.images[0] : item.image,
      selectedColor,
      selectedSize,
      originalPrice: op,
      finalPrice: fp,
      discountPercentage,
      profit: item.profit || null,
      description: item.description || "",
      sellerPhone: item.sellerPhone || "",
      delivery: item.delivery || 0,
      productId: item.id || item.productId || Date.now()
    }));

    const phoneToSend = storePhone || item.sellerPhone || "";
    if (phoneToSend) {
      window.location.href = `Stores Orders.html?phone=${encodeURIComponent(phoneToSend)}`;
    } else {
      window.location.href = "order.html";
    }
  };

  // ✅ FIXED: Fly to cart animation
  function animateFlyToCart(e) {
    try {
      const imgSrc = item.images ? item.images[0] : item.image || "noimg.png";
      const flyImg = document.createElement("img");
      flyImg.src = imgSrc;
      flyImg.className = "fly-image";
      flyImg.style.position = "fixed";
      flyImg.style.zIndex = "9999";
      flyImg.style.width = "60px";
      flyImg.style.height = "60px";
      flyImg.style.objectFit = "cover";
      flyImg.style.borderRadius = "50%";
      flyImg.style.pointerEvents = "none";
      document.body.appendChild(flyImg);

      const start = e.target.getBoundingClientRect();
      flyImg.style.left = (start.left + start.width/2 - 30) + "px";
      flyImg.style.top = (start.top + start.height/2 - 30) + "px";

      const cartIcon = document.querySelector(".cart-bag").getBoundingClientRect();

      requestAnimationFrame(() => {
        flyImg.style.transition = "transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.7s ease";
        flyImg.style.transform = `translate(${cartIcon.left - start.left + cartIcon.width/2 - 30}px, ${cartIcon.top - start.top + cartIcon.height/2 - 30}px) scale(0.1)`;
        flyImg.style.opacity = "0";
      });

      setTimeout(() => flyImg.remove(), 750);
    } catch (err) {
      console.warn("Fly animation failed:", err);
    }
  }

  // ═══════════════════════════════════════════════════
  // SECTION TOGGLE
  // ═══════════════════════════════════════════════════
  window.toggleSection = function(element) {
    const section = element.parentElement;
    section.classList.toggle("open");
  };

  // ═══════════════════════════════════════════════════
  // INITIALIZE
  // ═══════════════════════════════════════════════════
  loadSupplierInfo(item.sellerPhone);
  setupWhatsAppButton();
  loadSimilarItems(item);
  setupFullscreenGestures();
  setupStarClicks();
  if (item.id) { loadRatingAndReviews(); }
});