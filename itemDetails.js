// itemDetails.js — Fully fixed: zoom, swipe, video, reviews
document.addEventListener("DOMContentLoaded", async function() {
  const API_BASE = "https://delight-backend--araindaniyalo2.replit.app";

  const urlParams = new URLSearchParams(window.location.search);
  const productFromUrl = urlParams.get('product');
  let item = null;

  if (productFromUrl) {
    try {
      const res = await fetch(API_BASE + "/products");
      if (res.ok) {
        const allProducts = await res.json();
        item = allProducts.find(p =>
          (p.title || "").toLowerCase() === decodeURIComponent(productFromUrl).toLowerCase()
        );
      }
    } catch (err) { console.warn("Backend fetch failed:", err); }
  }

  if (!item) item = JSON.parse(localStorage.getItem("selectedItem"));

  if (!item) {
    document.querySelector(".item-details").innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <p style="font-size:18px;color:#666;margin-bottom:16px;">No item selected.</p>
        <a href="index.html" style="color:#ef6c00;text-decoration:none;font-weight:600;">← Back to Home</a>
      </div>`;
    return;
  }

  function getPriceData(product) {
    if (product.finalPrice && product.originalPrice) {
      const d = product.originalPrice - product.finalPrice;
      const pct = product.originalPrice > 0 ? Math.round((d / product.originalPrice) * 100) : 0;
      return { originalPrice: product.originalPrice, finalPrice: product.finalPrice, discountAmount: d, discountPercentage: pct };
    }
    const basePrice = parseInt((product.price || "0").toString().replace(/[^\d]/g, "")) || 0;
    const discountAmount = parseInt((product.discount || "0").toString().replace(/[^\d]/g, "")) || 0;
    const finalPrice = basePrice - discountAmount;
    const discountPercentage = basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;
    return { originalPrice: basePrice, finalPrice, discountAmount, discountPercentage };
  }

  if (productFromUrl && item) {
    const pd = getPriceData(item);
    Object.assign(item, pd);
  }

  localStorage.setItem("selectedItem", JSON.stringify(item));
  if (productFromUrl && item.id) {
    fetch(API_BASE + "/products/" + item.id + "/view", { method: "POST" }).catch(() => {});
  }

  // ── State ──
  let currentIndex = 0;
  let sliderStartX = 0;
  let selectedColor = "";
  let selectedSize = "";
  let reviewRating = 0;
  let reviewPhotoFiles = [];
  let allReviews = [];
  let displayedReviews = 0;
  const REVIEWS_PER_PAGE = 3;

  const slider = document.getElementById("imageSlider");
  const dotsContainer = document.getElementById("dotsContainer");
  const titleEl = document.getElementById("title");
  const priceEl = document.getElementById("price");
  const descEl = document.getElementById("description");
  const supplierContainer = document.getElementById("supplier-container");
  const itemContainer = document.getElementById("itemContainer");
  const cartCountEl = document.getElementById("cartCount");

  // ═══════════════════════════════════════════════════
  // REVIEWS
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

      const rs = document.getElementById("ratingStars");
      const rsc = document.getElementById("ratingScore");
      const rc = document.getElementById("ratingCount");
      if (rs) rs.textContent = renderStars(avg);
      if (rsc) rsc.textContent = avg.toFixed(1);
      if (rc) rc.textContent = "(" + total + ")";

      const rbn = document.getElementById("ratingBigNumber");
      const rbs = document.getElementById("ratingBigStars");
      const rtt = document.getElementById("ratingTotalText");
      const rtc = document.getElementById("reviewsTotalCount");
      if (rbn) rbn.textContent = avg.toFixed(1);
      if (rbs) rbs.textContent = renderStars(avg);
      if (rtt) rtt.textContent = total + " Ratings";
      if (rtc) rtc.textContent = "(" + total + ")";

      const barsDiv = document.getElementById("ratingBarsDaraz");
      if (barsDiv && ratingData.ratingBreakdown) {
        barsDiv.innerHTML = [5,4,3,2,1].map(star => {
          const count = ratingData.ratingBreakdown[star] || 0;
          const pct = total > 0 ? (count / total * 100) : 0;
          return '<div class="rating-bar-daraz">' +
            '<span>' + star + '★</span>' +
            '<div class="rating-bar-track"><div class="rating-bar-fill-daraz" style="width:' + pct + '%"></div></div>' +
            '<span>' + count + '</span></div>';
        }).join("");
      }

      const revRes = await fetch(API_BASE + "/reviews/" + item.id);
      const revData = await revRes.json();
      allReviews = revData.reviews || [];
      displayedReviews = 0;
      renderReviewsList();
    } catch (err) { console.error("Load reviews error:", err); }
  }

  function renderReviewsList() {
    const container = document.getElementById("reviewsListDaraz");
    const loadMoreBtn = document.getElementById("loadMoreReviews");
    if (!container) return;
    if (allReviews.length === 0) {
      container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No reviews yet. Be the first!</p>';
      if (loadMoreBtn) loadMoreBtn.style.display = "none";
      return;
    }
    const toShow = allReviews.slice(0, displayedReviews + REVIEWS_PER_PAGE);
    container.innerHTML = toShow.map(review => {
      const initial = (review.buyerName || "A").charAt(0).toUpperCase();
      const maskedName = review.buyerName ? review.buyerName.charAt(0) + "***" + review.buyerName.slice(-1) : "Anonymous";
      const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
      return '<div class="review-card-daraz">' +
        '<div class="review-header-daraz">' +
          '<div class="review-buyer-info">' +
            '<div class="review-buyer-avatar">' + initial + '</div>' +
            '<div><div class="review-buyer-name">' + maskedName + '</div>' +
              (review.isVerifiedPurchase ? '<div class="review-verified">✓ Verified Purchase</div>' : '') +
            '</div></div>' +
          '<div class="review-stars-daraz">' + renderStars(review.rating) + '</div>' +
        '</div>' +
        '<div class="review-date-daraz">' + dateStr + '</div>' +
        '<div class="review-message-daraz">' + (review.message || "") + '</div>' +
        (review.images && review.images.length ? '<div class="review-photos-daraz">' + review.images.map(img => '<img src="' + img + '" onclick="openFullscreenViewerFromSrc(\'' + img + '\')">').join("") + '</div>' : '') +
      '</div>';
    }).join("");
    displayedReviews = toShow.length;
    if (loadMoreBtn) loadMoreBtn.style.display = displayedReviews < allReviews.length ? "block" : "none";
  }

  window.loadMoreReviews = () => renderReviewsList();

  window.showAllReviews = function() {
    const modal = document.getElementById("allReviewsModal");
    const content = document.getElementById("allReviewsContent");
    if (!modal || !content) return;
    content.innerHTML = allReviews.map(review => {
      const initial = (review.buyerName || "A").charAt(0).toUpperCase();
      const maskedName = review.buyerName ? review.buyerName.charAt(0) + "***" + review.buyerName.slice(-1) : "Anonymous";
      const dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });
      return '<div class="review-card-daraz" style="margin-bottom:16px;">' +
        '<div class="review-header-daraz">' +
          '<div class="review-buyer-info">' +
            '<div class="review-buyer-avatar">' + initial + '</div>' +
            '<div><div class="review-buyer-name">' + maskedName + '</div>' +
              (review.isVerifiedPurchase ? '<div class="review-verified">✓ Verified Purchase</div>' : '') +
            '</div></div>' +
          '<div class="review-stars-daraz">' + renderStars(review.rating) + '</div>' +
        '</div>' +
        '<div class="review-date-daraz">' + dateStr + '</div>' +
        '<div class="review-message-daraz">' + (review.message || "") + '</div>' +
        (review.images && review.images.length ? '<div class="review-photos-daraz">' + review.images.map(img => '<img src="' + img + '">').join("") + '</div>' : '') +
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
    if (!customer) { alert("Please login to write a review"); window.location.href = "login.html"; return; }
    const modal = document.getElementById("reviewModalDaraz");
    document.getElementById("reviewProductImg").src = item.images?.[0] || item.image || "noimg.png";
    document.getElementById("reviewProductTitle").textContent = item.title || "Product";
    reviewRating = 0; reviewPhotoFiles = [];
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
    document.querySelectorAll("#starRatingInputDaraz .star-big").forEach(star => {
      star.addEventListener("click", function() {
        reviewRating = parseInt(this.getAttribute("data-rating"));
        updateStarDisplay(reviewRating);
        const texts = ["Terrible","Poor","Average","Good","Excellent"];
        document.getElementById("ratingText").textContent = texts[reviewRating - 1] || "Tap a star to rate";
      });
    });
  }
  function updateStarDisplay(rating) {
    document.querySelectorAll("#starRatingInputDaraz .star-big").forEach((star, idx) => {
      star.textContent = idx < rating ? "★" : "☆";
      star.classList.toggle("active", idx < rating);
    });
  }

  window.handleReviewPhotos = function(input) {
    const preview = document.getElementById("reviewPhotoPreview");
    preview.innerHTML = ""; reviewPhotoFiles = [];
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
    if (reviewRating === 0) { alert("Please select a rating"); return; }
    const message = document.getElementById("reviewMessageDaraz").value.trim();
    if (!message) { alert("Please write a review message"); return; }
    const customer = JSON.parse(localStorage.getItem("customer"));
    if (!customer) { alert("Please login first"); return; }
    const btn = document.getElementById("submitReviewBtn");
    btn.disabled = true; btn.textContent = "Submitting...";
    try {
      const formData = new FormData();
      formData.append("buyerPhone", customer.phone);
      formData.append("buyerName", customer.name || "Anonymous");
      formData.append("rating", reviewRating);
      formData.append("message", message);
      reviewPhotoFiles.forEach(f => formData.append("images", f));
      const res = await fetch(API_BASE + "/reviews/" + item.id, { method: "POST", body: formData });
      const data = await res.json();
      if (data.success) { alert("✅ Review submitted!"); closeReviewModal(); loadRatingAndReviews(); }
      else alert(data.message || "Failed to submit review");
    } catch (err) { alert("❌ Error submitting review."); console.error(err); }
    btn.disabled = false; btn.textContent = "Submit Review";
  };

  // ═══════════════════════════════════════════════════
  // SHARE
  // ═══════════════════════════════════════════════════
  window.openShareModal = function() {
    const modal = document.getElementById("shareModal");
    const shareLink = document.getElementById("shareLink");
    const currentUrl = window.location.href.split('?')[0];
    shareLink.value = currentUrl + "?product=" + encodeURIComponent(item.title);
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };
  window.closeShareModalDirect = function() {
    document.getElementById("shareModal").classList.remove("active");
    document.body.style.overflow = "";
  };
  window.shareVia = function(platform) {
    const base = window.location.href.split('?')[0];
    const shareUrl = base + "?product=" + encodeURIComponent(item.title);
    const text = "🔥 Check this out!\n\n" + item.title + "\nPrice: Rs. " + (item.finalPrice || item.price) + "\n\n" + shareUrl;
    let url = "";
    if (platform === 'whatsapp') url = "https://wa.me/?text=" + encodeURIComponent(text);
    else if (platform === 'facebook') url = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl);
    else if (platform === 'sms') url = "sms:?&body=" + encodeURIComponent(text);
    if (url) window.open(url, '_blank');
    closeShareModalDirect();
  };
  window.copyLink = function() {
    const shareLink = document.getElementById("shareLink");
    shareLink.select(); shareLink.setSelectionRange(0, 99999);
    if (navigator.clipboard) navigator.clipboard.writeText(shareLink.value).catch(() => document.execCommand("copy"));
    else document.execCommand("copy");
    const btn = document.querySelector(".copy-btn");
    const orig = btn.textContent;
    btn.textContent = "Copied!"; btn.style.background = "#5cb85c";
    setTimeout(() => { btn.textContent = orig; btn.style.background = "#ef6c00"; }, 2000);
    closeShareModalDirect();
  };

  // ═══════════════════════════════════════════════════
  // RENDER PRODUCT
  // ═══════════════════════════════════════════════════
  if (!item.id) item.id = (item.title || "product").replace(/\s+/g, "_") + "_" + (item.finalPrice || item.price || "0");
  titleEl.textContent = item.title || "";

  const pd = getPriceData(item);
  priceEl.innerHTML =
    '<div class="price-wrapper">' +
      '<span class="new-price"><span class="rs">Rs.</span><strong>' + pd.finalPrice + '</strong></span>' +
      (pd.discountAmount > 0 ? '<span class="old-price"><span class="rs">Rs.</span>' + pd.originalPrice + '</span>' : '') +
      (pd.discountPercentage > 0 ? '<span class="discount-badge">' + pd.discountPercentage + '% OFF</span>' : '') +
    '</div>';

  function formatDescription(desc) {
    if (!desc) return "";
    desc = desc.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const clean = s => s.replace(/^[\s\-\*\u2022•]+/, "").replace(/^\d+\.\s*/, "").replace(/\s{2,}/g, " ").trim();
    if (desc.includes("•") || desc.includes("\u2022")) {
      const parts = desc.split(/•|\u2022/).map(clean).filter(Boolean);
      if (!parts.length) return "";
      if (parts.length > 1 && parts[0].length < 60 && !parts[0].includes(":")) {
        const intro = parts.shift();
        return "<p>" + intro + "</p><ul>" + parts.map(p => "<li>" + p + "</li>").join("") + "</ul>";
      }
      return "<ul>" + parts.map(p => "<li>" + p + "</li>").join("") + "</ul>";
    }
    const lines = desc.split("\n").map(clean).filter(Boolean);
    if (!lines.length) return "";
    if (lines.length === 1) return "<p>" + lines[0] + "</p>";
    const first = lines[0], rest = lines.slice(1);
    if (rest.length && first.length < 200 && !first.includes(":"))
      return "<p>" + first + "</p><ul>" + rest.map(l => "<li>" + l + "</li>").join("") + "</ul>";
    return "<ul>" + lines.map(l => "<li>" + l + "</li>").join("") + "</ul>";
  }
  descEl.innerHTML = formatDescription(item.description);

  // ═══════════════════════════════════════════════════
  // MEDIA SLIDER (main page - swipe works)
  // ═══════════════════════════════════════════════════
  const mediaList = [].concat(item.images || [], item.videos || []);

  function isVideo(src) {
    return typeof src === "string" && /\.(mp4|webm|ogg|mov)$/i.test(src);
  }

  function renderMedia() {
    slider.innerHTML = "";
    dotsContainer.innerHTML = "";
    if (!mediaList.length) {
      const slide = document.createElement("div");
      slide.className = "slide active";
      const img = document.createElement("img");
      img.src = "noimg.png"; img.alt = "No image";
      slide.appendChild(img); slider.appendChild(slide);
      return;
    }
    mediaList.forEach((media, index) => {
      const slide = document.createElement("div");
      slide.className = "slide" + (index === 0 ? " active" : "");
      let el;
      if (isVideo(media)) {
        el = document.createElement("video");
        el.src = media; el.controls = true; el.playsInline = true; el.preload = "metadata";
        // Video play badge
        const badge = document.createElement("div");
        badge.style.cssText = "position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,0.55);color:#fff;font-size:11px;padding:3px 10px;border-radius:10px;z-index:5;pointer-events:none;backdrop-filter:blur(4px)";
        badge.textContent = "▶ Video";
        slide.appendChild(badge);
      } else {
        el = document.createElement("img");
        el.src = media;
        el.alt = (item.title || 'Product') + " - " + (index + 1);
        el.loading = index === 0 ? "eager" : "lazy";
      }
      el.className = "slide-media";
      slide.appendChild(el);

      // Dot
      const dot = document.createElement("span");
      dot.className = "dot" + (index === 0 ? " active" : "");
      dot.onclick = () => showSlide(index);
      dot.setAttribute("role", "button");
      dotsContainer.appendChild(dot);

      slider.appendChild(slide);
    });

    // Counter
    const counter = document.createElement("div");
    counter.className = "image-counter";
    slider.appendChild(counter);
    updateSliderCounter();
  }

  function updateSliderCounter() {
    const counter = slider.querySelector(".image-counter");
    if (counter) counter.textContent = (currentIndex + 1) + " / " + (mediaList.length || 1);
  }

  window.showSlide = function(index) {
    const slides = slider.querySelectorAll(".slide");
    const dots = dotsContainer.querySelectorAll(".dot");
    if (!slides.length) return;
    index = (index + slides.length) % slides.length;
    slides.forEach(s => { s.classList.remove("active"); });
    dots.forEach(d => { d.classList.remove("active"); });
    slides[index].classList.add("active");
    dots[index].classList.add("active");
    currentIndex = index;
    updateSliderCounter();
  };

  // Swipe on main slider
  slider.addEventListener("touchstart", e => { sliderStartX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].clientX - sliderStartX;
    if (diff > 45) showSlide(currentIndex - 1);
    else if (diff < -45) showSlide(currentIndex + 1);
  }, { passive: true });

  renderMedia();

  // ═══════════════════════════════════════════════════
  // VARIANTS
  // ═══════════════════════════════════════════════════
  const variantContainer = document.createElement("div");
  variantContainer.className = "variant-container";
  const firstSection = document.querySelector(".section");
  if (firstSection) document.querySelector(".item-details").insertBefore(variantContainer, firstSection);
  else document.querySelector(".item-details").appendChild(variantContainer);

  const colors = Array.isArray(item.color) ? item.color
    : (item.color || item.colors ? (item.color || item.colors).toString().split(",").map(c => c.trim()).filter(Boolean) : []);
  if (colors.length) {
    const colorDiv = document.createElement("div");
    colorDiv.className = "color-options";
    colorDiv.innerHTML = "<h5>Select Color:</h5>";
    colors.forEach(color => {
      const btn = document.createElement("button");
      btn.textContent = color; btn.className = "color-btn"; btn.type = "button";
      btn.onclick = function() {
        colorDiv.querySelectorAll(".color-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected"); selectedColor = color;
      };
      colorDiv.appendChild(btn);
    });
    variantContainer.appendChild(colorDiv);
  }

  const sizes = Array.isArray(item.size) ? item.size
    : (item.size || item.sizes ? (item.size || item.sizes).toString().split(",").map(s => s.trim()).filter(Boolean) : []);
  if (sizes.length) {
    const sizeDiv = document.createElement("div");
    sizeDiv.className = "size-options";
    sizeDiv.innerHTML = "<h5>Select Size:</h5>";
    sizes.forEach(size => {
      const btn = document.createElement("button");
      btn.textContent = size; btn.className = "size-btn"; btn.type = "button";
      btn.onclick = function() {
        sizeDiv.querySelectorAll(".size-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected"); selectedSize = size;
      };
      sizeDiv.appendChild(btn);
    });
    variantContainer.appendChild(sizeDiv);
  }

  // ═══════════════════════════════════════════════════
  // SUPPLIER
  // ═══════════════════════════════════════════════════
  async function loadSupplierInfo(sellerPhone) {
    if (!sellerPhone) {
      supplierContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Seller info not available</p>';
      return;
    }
    let sellerName = "Unknown Seller", sellerLogo = "lo.png";
    try {
      const res = await fetch(API_BASE + "/all-stores");
      const stores = await res.json();
      const norm = p => p ? p.toString().replace(/\D/g, "") : "";
      const sp = norm(sellerPhone);
      let seller = stores.find(s => s.phone === sellerPhone);
      if (!seller) seller = stores.find(s => norm(s.phone) === sp);
      if (!seller) seller = stores.find(s => { const sn = norm(s.phone); return sn && sp && (sn.endsWith(sp) || sp.endsWith(sn)); });
      if (seller) {
        sellerName = seller.name || sellerName;
        sellerLogo = seller.logo || sellerLogo;
        if (seller.delivery) { item.delivery = seller.delivery; localStorage.setItem("selectedItem", JSON.stringify(item)); }
      }
    } catch (err) { console.warn("Supplier load error:", err); }

    supplierContainer.innerHTML =
      '<div class="supplier-info">' +
        '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">' +
          '<img src="' + sellerLogo + '" class="supplier-logo" onerror="this.src=\'lo.png\'">' +
          '<span class="supplier-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + sellerName + '</span>' +
        '</div>' +
        '<button id="viewSupplierBtn" class="view-supplier-btn">View Shop</button>' +
      '</div>';
    const btn = supplierContainer.querySelector("#viewSupplierBtn");
    if (btn) btn.onclick = () => { window.location.href = "Store.html?phone=" + encodeURIComponent(item.sellerPhone); };
  }

  // ═══════════════════════════════════════════════════
  // FULLSCREEN VIEWER — Pinch Zoom + Swipe + Video
  // ═══════════════════════════════════════════════════
  let fsMediaList = [];
  let fsIndex = 0;

  // Zoom state
  let fsScale = 1;
  let fsLastScale = 1;
  let fsDragX = 0, fsDragY = 0;
  let fsLastX = 0, fsLastY = 0;
  let fsPinchDist = 0;
  let fsIsDragging = false;
  let fsTouchCount = 0;
  let fsSwipeStartX = 0;

  const MIN_SCALE = 1, MAX_SCALE = 5;

  function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }

  function buildFsMedia() {
    // Build from main slider slides (images + videos)
    fsMediaList = [];
    document.querySelectorAll("#imageSlider .slide").forEach((slide, i) => {
      const vid = slide.querySelector("video");
      const img = slide.querySelector("img");
      if (vid) fsMediaList.push({ type: "video", src: vid.src });
      else if (img) fsMediaList.push({ type: "image", src: img.src });
    });
    // Fallback: use mediaList directly
    if (!fsMediaList.length) {
      mediaList.forEach(m => fsMediaList.push(isVideo(m) ? { type:"video", src:m } : { type:"image", src:m }));
    }
  }

  function renderFsMedia(direction) {
    const container = document.getElementById("fullscreenImageContainer");
    if (!container || !fsMediaList.length) return;
    const media = fsMediaList[fsIndex];

    // Reset zoom
    fsScale = 1; fsDragX = 0; fsDragY = 0;

    // Remove previous hint
    const oldHint = document.getElementById("zoomHint");
    if (oldHint) { oldHint.style.display = "none"; }

    if (media.type === "video") {
      container.innerHTML =
        '<video src="' + media.src + '" controls playsinline preload="metadata" ' +
        'style="max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;outline:none;"></video>' +
        '<div class="video-badge">▶ Video</div>';
    } else {
      const img = document.createElement("img");
      img.src = media.src;
      img.draggable = false;
      container.innerHTML = "";
      container.appendChild(img);

      // Add direction animation
      if (direction) {
        img.classList.add(direction === 1 ? "fs-enter-right" : "fs-enter-left");
        img.addEventListener("animationend", () => { img.classList.remove("fs-enter-right","fs-enter-left"); }, { once: true });
      }

      // Show hint once
      const hint = document.getElementById("zoomHint");
      if (hint) {
        hint.style.display = "";
        hint.style.animation = "none";
        void hint.offsetWidth;
        hint.style.animation = "";
      }

      setupFsZoom(img);
    }

    updateFsDots();
    updateFsCounter();
  }

  function setupFsZoom(img) {
    const container = document.getElementById("fullscreenImageContainer");
    if (!container || !img) return;

    function getTransform() {
      return `translate(${fsDragX}px, ${fsDragY}px) scale(${fsScale})`;
    }

    function applyTransform(smooth) {
      img.style.transition = smooth ? "transform 0.2s ease" : "none";
      img.style.transform = getTransform();
    }

    function clampDrag() {
      if (fsScale <= 1) { fsDragX = 0; fsDragY = 0; return; }
      const maxX = (img.offsetWidth * (fsScale - 1)) / 2;
      const maxY = (img.offsetHeight * (fsScale - 1)) / 2;
      fsDragX = clamp(fsDragX, -maxX, maxX);
      fsDragY = clamp(fsDragY, -maxY, maxY);
    }

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    container.addEventListener("dblclick", onDblClick);

    // Cleanup on next render
    img._cleanup = () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("dblclick", onDblClick);
    };

    function getTouchDist(t1, t2) {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx*dx + dy*dy);
    }

    function onTouchStart(e) {
      fsTouchCount = e.touches.length;
      fsIsDragging = false;

      if (e.touches.length === 2) {
        // Pinch start
        e.preventDefault();
        fsPinchDist = getTouchDist(e.touches[0], e.touches[1]);
        fsLastScale = fsScale;
      } else if (e.touches.length === 1) {
        fsSwipeStartX = e.touches[0].clientX;
        fsLastX = e.touches[0].clientX;
        fsLastY = e.touches[0].clientY;
        fsDragX = fsDragX;
        fsDragY = fsDragY;
      }
    }

    function onTouchMove(e) {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        const newScale = clamp(fsLastScale * (dist / fsPinchDist), MIN_SCALE, MAX_SCALE);
        fsScale = newScale;
        clampDrag();
        applyTransform(false);
        fsIsDragging = true;
      } else if (e.touches.length === 1) {
        if (fsScale > 1) {
          // Pan mode when zoomed
          e.preventDefault();
          const dx = e.touches[0].clientX - fsLastX;
          const dy = e.touches[0].clientY - fsLastY;
          fsDragX += dx; fsDragY += dy;
          fsLastX = e.touches[0].clientX;
          fsLastY = e.touches[0].clientY;
          clampDrag();
          applyTransform(false);
          fsIsDragging = true;
        }
        // If scale=1, don't preventDefault — allow swipe detection in touchend
      }
    }

    function onTouchEnd(e) {
      if (fsTouchCount === 1 && fsScale <= 1 && !fsIsDragging) {
        const endX = e.changedTouches[0].clientX;
        const diff = endX - fsSwipeStartX;
        if (diff > 50) changeFullscreenImage(-1);
        else if (diff < -50) changeFullscreenImage(1);
      }
      // Snap scale to 1 if very close
      if (fsScale < 1.05) {
        fsScale = 1; fsDragX = 0; fsDragY = 0;
        applyTransform(true);
      }
      fsTouchCount = 0;
    }

    function onDblClick(e) {
      if (fsScale > 1) {
        fsScale = 1; fsDragX = 0; fsDragY = 0;
      } else {
        fsScale = 2.5;
        // Center on tap point
        const rect = container.getBoundingClientRect();
        const tapX = e.clientX - rect.left - rect.width / 2;
        const tapY = e.clientY - rect.top - rect.height / 2;
        fsDragX = -tapX * (fsScale - 1) / fsScale;
        fsDragY = -tapY * (fsScale - 1) / fsScale;
        clampDrag();
      }
      applyTransform(true);
    }
  }

  window.openFullscreenViewer = function() {
    buildFsMedia();
    if (!fsMediaList.length) return;
    fsIndex = currentIndex || 0;
    if (fsIndex >= fsMediaList.length) fsIndex = 0;
    const viewer = document.getElementById("fullscreenViewer");
    renderFsMedia(null);
    viewer.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.openFullscreenViewerFromSrc = function(src) {
    fsMediaList = [{ type: isVideo(src) ? "video" : "image", src }];
    fsIndex = 0;
    const viewer = document.getElementById("fullscreenViewer");
    renderFsMedia(null);
    viewer.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeFullscreenViewer = function() {
    const viewer = document.getElementById("fullscreenViewer");
    // Pause any video
    const vid = viewer.querySelector("video");
    if (vid) vid.pause();
    viewer.classList.remove("active");
    document.body.style.overflow = "";
    // Cleanup zoom listeners
    const img = viewer.querySelector("img");
    if (img && img._cleanup) img._cleanup();
  };

  window.changeFullscreenImage = function(direction) {
    if (fsMediaList.length <= 1) return;
    // Cleanup old zoom
    const img = document.querySelector("#fullscreenImageContainer img");
    if (img && img._cleanup) img._cleanup();
    // Pause any video
    const vid = document.querySelector("#fullscreenImageContainer video");
    if (vid) vid.pause();
    fsIndex = (fsIndex + direction + fsMediaList.length) % fsMediaList.length;
    renderFsMedia(direction);
  };

  function updateFsDots() {
    const dotsDiv = document.getElementById("fullscreenDots");
    if (!dotsDiv) return;
    dotsDiv.innerHTML = "";
    fsMediaList.forEach((m, i) => {
      const dot = document.createElement("span");
      dot.className = "fullscreen-dot" + (i === fsIndex ? " active" : "") + (m.type === "video" ? " video-dot" : "");
      dot.onclick = () => {
        const d = i > fsIndex ? 1 : -1;
        const img = document.querySelector("#fullscreenImageContainer img");
        if (img && img._cleanup) img._cleanup();
        fsIndex = i;
        renderFsMedia(d);
      };
      dot.setAttribute("role", "button");
      dotsDiv.appendChild(dot);
    });
  }

  function updateFsCounter() {
    const el = document.getElementById("fullscreenCounter");
    if (el) el.textContent = (fsIndex + 1) + " / " + fsMediaList.length;
  }

  // ═══════════════════════════════════════════════════
  // CHAT BUTTON
  // ═══════════════════════════════════════════════════
  window.openDelightChat = function() {
    const customer = JSON.parse(localStorage.getItem("customer"));
    if (!customer) { alert("Please login to chat with seller"); window.location.href = "login.html"; return; }
    if (!item || !item.sellerPhone) { alert("Seller information not available"); return; }
    localStorage.setItem("selectedItem", JSON.stringify(item));
    window.location.href = "Delight Chat.html?product=" + encodeURIComponent(item.title) + "&seller=" + encodeURIComponent(item.sellerPhone);
  };

  // ═══════════════════════════════════════════════════
  // SIMILAR ITEMS
  // ═══════════════════════════════════════════════════
  async function loadSimilarItems(currentItem) {
    itemContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading...</div>';
    let backendItems = [];
    try { const res = await fetch(API_BASE + "/products"); if (res.ok) backendItems = await res.json(); } catch (err) {}
    const merged = [];
    (window.items || []).forEach(i => merged.push(i));
    backendItems.forEach(b => { if (!merged.find(m => (m.title||"").toLowerCase() === (b.title||"").toLowerCase())) merged.push(b); });
    const similar = merged.filter(p => {
      if ((p.title||"").toLowerCase() === (currentItem.title||"").toLowerCase()) return false;
      const cc = (currentItem.category||"").toLowerCase(), pc = (p.category||"").toLowerCase();
      const ct = (currentItem.title||"").toLowerCase(), pt = (p.title||"").toLowerCase();
      return (cc && pc && cc === pc) || ct.split(/\s+/).filter(w => w.length > 2).some(w => pt.includes(w));
    }).slice(0, 10);

    itemContainer.innerHTML = "";
    if (!similar.length) { itemContainer.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">No similar items</div>'; return; }

    similar.forEach(i => {
      const basePrice = parseInt((i.price||"0").toString().replace(/[^\d]/g,"")) || 0;
      const disc = parseInt((i.discount||"0").toString().replace(/[^\d]/g,"")) || 0;
      const finalPrice = basePrice - disc;
      const imgSrc = i.images?.[0] || i.image || "noimg.png";
      const card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML =
        '<img src="' + imgSrc + '" loading="lazy" onerror="this.src=\'noimg.png\'">' +
        '<h3>' + i.title + '</h3>' +
        '<p class="price-wrapper">' +
          '<span class="new-price"><span class="rs">Rs.</span><strong>' + finalPrice + '</strong></span>' +
          (disc > 0 ? '<span class="old-price"><span class="rs">Rs.</span>' + basePrice + '</span>' : '') +
        '</p>';
      card.onclick = () => {
        localStorage.setItem("selectedItem", JSON.stringify({
          ...i, finalPrice, originalPrice: basePrice, discountAmount: disc,
          discountPercentage: basePrice > 0 ? Math.round((disc/basePrice)*100) : 0
        }));
        window.location.href = "itemDetails.html";
      };
      itemContainer.appendChild(card);
    });
  }

  // ═══════════════════════════════════════════════════
  // CART
  // ═══════════════════════════════════════════════════
  function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const total = cart.reduce((s, it) => s + (it.quantity || 0), 0);
    cartCountEl.textContent = total;
    cartCountEl.style.display = total > 0 ? "inline" : "none";
  }
  updateCartCount();

  window.addToCart = function(event) {
    if (!item) return;
    if (!item.id) item.id = (item.title||"product").replace(/\s+/g,"_") + "_" + (item.finalPrice||item.price||"0");
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
    const fp = getPriceData(item).finalPrice;
    const existing = cart.find(p => p.id === item.id);
    if (existing) existing.quantity += 1;
    else cart.push({ id: item.id, title: item.title, price: fp, image: item.images?.[0] || item.image, quantity: 1, description: item.description||"", sellerPhone: item.sellerPhone||"", delivery: item.delivery||0, selectedColor, selectedSize });
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    animateFlyToCart(event);
  };

  window.goToOrderPage = function() {
    const pd = getPriceData(item);
    localStorage.setItem("orderProduct", JSON.stringify({ title: item.title, image: item.images?.[0]||item.image, selectedColor, selectedSize, originalPrice: pd.originalPrice, finalPrice: pd.finalPrice, discountPercentage: pd.discountPercentage, description: item.description||"", sellerPhone: item.sellerPhone||"", delivery: item.delivery||0, productId: item.id||Date.now() }));
    window.location.href = "order.html";
  };

  window.goToCart = () => { window.location.href = "cart.html"; };

  function animateFlyToCart(e) {
    try {
      const imgSrc = item.images?.[0] || item.image || "noimg.png";
      const flyImg = document.createElement("img");
      flyImg.src = imgSrc;
      flyImg.style.cssText = "position:fixed;z-index:9999;width:60px;height:60px;object-fit:cover;border-radius:50%;pointer-events:none;";
      document.body.appendChild(flyImg);
      const start = e.target.getBoundingClientRect();
      const cartIcon = document.querySelector(".cart-bag").getBoundingClientRect();
      flyImg.style.left = (start.left + start.width/2 - 30) + "px";
      flyImg.style.top  = (start.top + start.height/2 - 30) + "px";
      requestAnimationFrame(() => {
        flyImg.style.transition = "transform 0.7s cubic-bezier(0.2,0.8,0.2,1), opacity 0.7s ease";
        flyImg.style.transform = `translate(${cartIcon.left - start.left}px, ${cartIcon.top - start.top}px) scale(0.1)`;
        flyImg.style.opacity = "0";
      });
      setTimeout(() => flyImg.remove(), 750);
    } catch (err) {}
  }

  window.toggleSection = el => el.parentElement.classList.toggle("open");

  // ── INIT ──
  loadSupplierInfo(item.sellerPhone);
  loadSimilarItems(item);
  setupStarClicks();
  if (item.id) loadRatingAndReviews();
});
