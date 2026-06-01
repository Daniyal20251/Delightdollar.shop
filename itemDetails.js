// itemDetails.js - Daraz Style Reviews - FULLY WORKING
document.addEventListener("DOMContentLoaded", async function() {
  const API_BASE = "https://delight-backend--araindaniyalo2.replit.app";
  
  const urlParams = new URLSearchParams(window.location.search);
  const productFromUrl = urlParams.get('product');
  let item = null;

  // ── Load Product ──
  if (productFromUrl) {
    try {
      const res = await fetch(API_BASE + "/products");
      if (res.ok) {
        const allProducts = await res.json();
        item = allProducts.find(p => 
          (p.title || "").toLowerCase() === decodeURIComponent(productFromUrl).toLowerCase()
        );
      }
    } catch (err) {
      console.warn("Backend fetch failed:", err);
    }
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

  // Price calculation
  function getPriceData(product) {
    if (product.finalPrice && product.originalPrice) {
      const discountAmount = product.originalPrice - product.finalPrice;
      const discountPercentage = product.originalPrice > 0 
        ? Math.round((discountAmount / product.originalPrice) * 100) : 0;
      return { originalPrice: product.originalPrice, finalPrice: product.finalPrice, discountAmount, discountPercentage };
    }
    const basePrice = parseInt((product.price || "0").toString().replace(/[^\d]/g, "")) || 0;
    const discountAmount = parseInt((product.discount || "0").toString().replace(/[^\d]/g, "")) || 0;
    const originalPrice = basePrice;
    const finalPrice = basePrice - discountAmount;
    const discountPercentage = basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;
    return { originalPrice, finalPrice, discountAmount, discountPercentage };
  }

  if (productFromUrl && item) {
    const pd = getPriceData(item);
    item.originalPrice = pd.originalPrice;
    item.finalPrice = pd.finalPrice;
    item.discountAmount = pd.discountAmount;
    item.discountPercentage = pd.discountPercentage;
  }

  localStorage.setItem("selectedItem", JSON.stringify(item));
  if (productFromUrl && item.id) {
    fetch(API_BASE + "/products/" + item.id + "/view", { method: "POST" }).catch(()=>{});
  }

  // ── State ──
  let currentIndex = 0;
  let startX = 0;
  let selectedColor = "";
  let selectedSize = "";
  let reviewRating = 0;
  let reviewPhotoFiles = [];
  let allReviews = [];
  let displayedReviews = 0;
  const REVIEWS_PER_PAGE = 3;

  // ── Elements ──
  const slider = document.getElementById("imageSlider");
  const dotsContainer = document.getElementById("dotsContainer");
  const titleEl = document.getElementById("title");
  const priceEl = document.getElementById("price");
  const descEl = document.getElementById("description");
  const supplierContainer = document.getElementById("supplier-container");
  const itemContainer = document.getElementById("itemContainer");
  const cartCountEl = document.getElementById("cartCount");

  // ═══════════════════════════════════════════════════
  // ⭐ REVIEWS SYSTEM - FULLY WORKING
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
      // Rating summary
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
        barsDiv.innerHTML = [5,4,3,2,1].map(function(star) {
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
    
    container.innerHTML = toShow.map(function(review) {
      var initial = (review.buyerName || "A").charAt(0).toUpperCase();
      var maskedName = review.buyerName ? review.buyerName.charAt(0) + "***" + review.buyerName.slice(-1) : "Anonymous";
      var dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
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
            review.images.map(function(img) { 
              return '<img src="' + img + '" onclick="openFullscreenViewerFromSrc(\'' + img + '\')">'; 
            }).join("") + 
          '</div>' : '') +
      '</div>';
    }).join("");
    
    displayedReviews = toShow.length;
    if (loadMoreBtn) {
      loadMoreBtn.style.display = displayedReviews < allReviews.length ? "block" : "none";
    }
  }

  window.loadMoreReviews = function() {
    renderReviewsList();
  };

  window.showAllReviews = function() {
    var modal = document.getElementById("allReviewsModal");
    var content = document.getElementById("allReviewsContent");
    if (!modal || !content) return;
    
    content.innerHTML = allReviews.map(function(review) {
      var initial = (review.buyerName || "A").charAt(0).toUpperCase();
      var maskedName = review.buyerName ? review.buyerName.charAt(0) + "***" + review.buyerName.slice(-1) : "Anonymous";
      var dateStr = new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      
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
            review.images.map(function(img) { 
              return '<img src="' + img + '" onclick="openFullscreenViewerFromSrc(\'' + img + '\')">'; 
            }).join("") + 
          '</div>' : '') +
      '</div>';
    }).join("");
    
    modal.style.display = "block";
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeAllReviews = function() {
    var modal = document.getElementById("allReviewsModal");
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }
    document.body.style.overflow = "";
  };

  // ── Review Modal ──
  window.openReviewModal = function() {
    var customer = JSON.parse(localStorage.getItem("customer"));
    if (!customer) {
      alert("Please login to write a review");
      window.location.href = "login.html";
      return;
    }
    
    var modal = document.getElementById("reviewModalDaraz");
    var productImg = document.getElementById("reviewProductImg");
    var productTitle = document.getElementById("reviewProductTitle");
    
    if (productImg) productImg.src = item.images?.[0] || item.image || "noimg.png";
    if (productTitle) productTitle.textContent = item.title || "Product";
    
    // Reset
    reviewRating = 0;
    reviewPhotoFiles = [];
    updateStarDisplay(0);
    document.getElementById("reviewMessageDaraz").value = "";
    document.getElementById("reviewPhotoPreview").innerHTML = "";
    document.getElementById("ratingText").textContent = "Tap a star to rate";
    
    if (modal) {
      modal.style.display = "flex";
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
    }
  };

  window.closeReviewModal = function() {
    var modal = document.getElementById("reviewModalDaraz");
    if (modal) {
      modal.style.display = "none";
      modal.classList.remove("active");
    }
    document.body.style.overflow = "";
  };

  // ── Star Rating Click ──
  function setupStarClicks() {
    var stars = document.querySelectorAll("#starRatingInputDaraz .star-big");
    stars.forEach(function(star) {
      star.addEventListener("click", function() {
        var rating = parseInt(this.getAttribute("data-rating"));
        reviewRating = rating;
        updateStarDisplay(rating);
        var texts = ["Terrible", "Poor", "Average", "Good", "Excellent"];
        document.getElementById("ratingText").textContent = texts[rating - 1] || "Tap a star to rate";
      });
    });
  }

  function updateStarDisplay(rating) {
    var stars = document.querySelectorAll("#starRatingInputDaraz .star-big");
    stars.forEach(function(star, idx) {
      star.textContent = idx < rating ? "★" : "☆";
      star.classList.toggle("active", idx < rating);
    });
  }

  // ── Photo Upload ──
  window.handleReviewPhotos = function(input) {
    var preview = document.getElementById("reviewPhotoPreview");
    preview.innerHTML = "";
    reviewPhotoFiles = [];
    
    Array.from(input.files).forEach(function(file) {
      reviewPhotoFiles.push(file);
      var reader = new FileReader();
      reader.onload = function(e) {
        var div = document.createElement("div");
        div.className = "review-photo-preview-item";
        div.innerHTML = 
          '<img src="' + e.target.result + '">' +
          '<button class="review-photo-remove" onclick="this.parentElement.remove()">✕</button>';
        preview.appendChild(div);
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Submit Review ──
  window.submitReviewDaraz = async function() {
    if (reviewRating === 0) {
      alert("Please select a rating by tapping the stars");
      return;
    }
    
    var message = document.getElementById("reviewMessageDaraz").value.trim();
    if (!message) {
      alert("Please write a review message");
      return;
    }
    
    var customer = JSON.parse(localStorage.getItem("customer"));
    if (!customer) {
      alert("Please login first");
      return;
    }
    
    var btn = document.getElementById("submitReviewBtn");
    btn.disabled = true;
    btn.textContent = "Submitting...";
    
    try {
      var formData = new FormData();
      formData.append("buyerPhone", customer.phone);
      formData.append("buyerName", customer.name || "Anonymous");
      formData.append("rating", reviewRating);
      formData.append("message", message);
      
      reviewPhotoFiles.forEach(function(file) {
        formData.append("images", file);
      });
      
      var res = await fetch(API_BASE + "/reviews/" + item.id, {
        method: "POST",
        body: formData
      });
      
      var data = await res.json();
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

  // ═══════════════════════════════════════════════════
  // SHARE FUNCTIONS
  // ═══════════════════════════════════════════════════
  window.openShareModal = function() {
    var modal = document.getElementById("shareModal");
    var shareLink = document.getElementById("shareLink");
    var currentUrl = window.location.href.split('?')[0];
    shareLink.value = currentUrl + "?product=" + encodeURIComponent(item.title);
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeShareModal = function(e) {
    if (e && e.target === document.getElementById("shareModal")) {
      document.getElementById("shareModal").classList.remove("active");
      document.body.style.overflow = "";
    }
  };

  window.closeShareModalDirect = function() {
    document.getElementById("shareModal").classList.remove("active");
    document.body.style.overflow = "";
  };

  window.shareVia = function(platform) {
    var currentUrl = window.location.href.split('?')[0];
    var shareUrl = currentUrl + "?product=" + encodeURIComponent(item.title);
    var text = "🔥 Check out this amazing deal!\n\n" + item.title + "\nPrice: Rs. " + (item.finalPrice || item.price) + "\n\n" + shareUrl;
    var url = "";
    if (platform === 'whatsapp') url = "https://wa.me/?text=" + encodeURIComponent(text);
    else if (platform === 'facebook') url = "https://www.facebook.com/sharer/sharer.php?u=" + encodeURIComponent(shareUrl);
    else if (platform === 'sms') url = "sms:?&body=" + encodeURIComponent(text);
    if (url) window.open(url, '_blank');
    closeShareModalDirect();
  };

  window.copyLink = function() {
    var shareLink = document.getElementById("shareLink");
    shareLink.select();
    shareLink.setSelectionRange(0, 99999);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareLink.value).catch(function() {
        document.execCommand("copy");
      });
    } else {
      document.execCommand("copy");
    }
    var btn = document.querySelector(".copy-btn");
    var orig = btn.textContent;
    btn.textContent = "Copied!";
    btn.style.background = "#5cb85c";
    setTimeout(function() {
      btn.textContent = orig;
      btn.style.background = "#ef6c00";
    }, 2000);
    closeShareModalDirect();
  };

  // ═══════════════════════════════════════════════════
  // RENDER PRODUCT
  // ═══════════════════════════════════════════════════
  if (!item.id) item.id = (item.title || "product").replace(/\s+/g, "_") + "_" + (item.finalPrice || item.price || "0");
  titleEl.textContent = item.title || "";

  var pd = getPriceData(item);
  priceEl.innerHTML = 
    '<div class="price-wrapper">' +
      '<span class="new-price"><span class="rs">Rs.</span><strong>' + pd.finalPrice + '</strong></span>' +
      (pd.discountAmount > 0 ? '<span class="old-price"><span class="rs">Rs.</span>' + pd.originalPrice + '</span>' : '') +
      (pd.discountPercentage > 0 ? '<span class="discount-badge">' + pd.discountPercentage + '% OFF</span>' : '') +
    '</div>';

  function formatDescription(desc) {
    if (!desc) return "";
    desc = desc.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    var clean = function(s) { return s.replace(/^[\s\-\*\u2022•]+/, "").replace(/^\d+\.\s*/, "").replace(/\s{2,}/g, " ").trim(); };
    if (desc.indexOf("•") >= 0 || desc.indexOf("\u2022") >= 0) {
      var parts = desc.split(/•|\u2022/).map(clean).filter(Boolean);
      if (!parts.length) return "";
      if (parts.length > 1 && parts[0].length < 60 && parts[0].indexOf(":") === -1) {
        var intro = parts.shift();
        return "<p>" + intro + "</p><ul>" + parts.map(function(p) { return "<li>" + p + "</li>"; }).join("") + "</ul>";
      }
      return "<ul>" + parts.map(function(p) { return "<li>" + p + "</li>"; }).join("") + "</ul>";
    }
    var lines = desc.split("\n").map(clean).filter(Boolean);
    if (!lines.length) return "";
    if (lines.length === 1) return "<p>" + lines[0] + "</p>";
    var first = lines[0], rest = lines.slice(1);
    if (rest.length && first.length < 200 && first.indexOf(":") === -1) {
      return "<p>" + first + "</p><ul>" + rest.map(function(l) { return "<li>" + l + "</li>"; }).join("") + "</ul>";
    }
    return "<ul>" + lines.map(function(l) { return "<li>" + l + "</li>"; }).join("") + "</ul>";
  }

  descEl.innerHTML = formatDescription(item.description);

  // ═══════════════════════════════════════════════════
  // MEDIA SLIDER
  // ═══════════════════════════════════════════════════
  var mediaList = [].concat(item.images || [], item.videos || []);

  function renderMedia() {
    slider.innerHTML = "";
    dotsContainer.innerHTML = "";
    if (!mediaList.length) {
      var img = document.createElement("img");
      img.src = "noimg.png";
      img.className = "slide active";
      img.alt = "No image";
      slider.appendChild(img);
      return;
    }
    mediaList.forEach(function(media, index) {
      var el;
      if (typeof media === "string" && media.toLowerCase().endsWith(".mp4")) {
        el = document.createElement("video");
        el.src = media; el.controls = true; el.playsInline = true; el.preload = "metadata";
      } else {
        el = document.createElement("img");
        el.src = media;
        el.alt = (item.title || 'Product') + " - Image " + (index + 1);
        el.loading = index === 0 ? "eager" : "lazy";
      }
      el.className = "slide" + (index === 0 ? " active" : "");
      slider.appendChild(el);

      var dot = document.createElement("span");
      dot.className = "dot" + (index === 0 ? " active" : "");
      dot.onclick = function() { showSlide(index); };
      dot.setAttribute("role", "button");
      dotsContainer.appendChild(dot);
    });
  }

  window.showSlide = function(index) {
    var slides = slider.querySelectorAll(".slide");
    var dots = dotsContainer.querySelectorAll(".dot");
    if (!slides.length) return;
    index = (index + slides.length) % slides.length;
    slides.forEach(function(s) { s.classList.remove("active"); });
    dots.forEach(function(d) { d.classList.remove("active"); });
    slides[index].classList.add("active");
    dots[index].classList.add("active");
    currentIndex = index;
    updateCounter();
  };

  slider.addEventListener("touchstart", function(e) { startX = e.touches[0].clientX; }, { passive: true });
  slider.addEventListener("touchend", function(e) {
    var endX = e.changedTouches[0].clientX;
    var diff = endX - startX;
    if (diff > 50) showSlide(currentIndex - 1);
    else if (diff < -50) showSlide(currentIndex + 1);
  }, { passive: true });

  renderMedia();

  var counter = document.createElement("div");
  counter.className = "image-counter";
  slider.appendChild(counter);

  function updateCounter() {
    counter.textContent = (currentIndex + 1) + " / " + (mediaList.length || 1);
  }
  updateCounter();

  // ═══════════════════════════════════════════════════
  // VARIANTS
  // ═══════════════════════════════════════════════════
  var variantContainer = document.createElement("div");
  variantContainer.className = "variant-container";
  var firstSection = document.querySelector(".section");
  if (firstSection) {
    document.querySelector(".item-details").insertBefore(variantContainer, firstSection);
  } else {
    document.querySelector(".item-details").appendChild(variantContainer);
  }

  var colors = Array.isArray(item.color) ? item.color : 
    (item.color || item.colors ? (item.color || item.colors).toString().split(",").map(function(c) { return c.trim(); }).filter(Boolean) : []);
  
  if (colors.length) {
    var colorDiv = document.createElement("div");
    colorDiv.className = "color-options";
    colorDiv.innerHTML = "<h5>Select Color:</h5>";
    colors.forEach(function(color) {
      var btn = document.createElement("button");
      btn.textContent = color;
      btn.className = "color-btn";
      btn.type = "button";
      btn.onclick = function() {
        colorDiv.querySelectorAll(".color-btn").forEach(function(b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
        selectedColor = color;
      };
      colorDiv.appendChild(btn);
    });
    variantContainer.appendChild(colorDiv);
  }

  var sizes = Array.isArray(item.size) ? item.size : 
    (item.size || item.sizes ? (item.size || item.sizes).toString().split(",").map(function(s) { return s.trim(); }).filter(Boolean) : []);
  
  if (sizes.length) {
    var sizeDiv = document.createElement("div");
    sizeDiv.className = "size-options";
    sizeDiv.innerHTML = "<h5>Select Size:</h5>";
    sizes.forEach(function(size) {
      var btn = document.createElement("button");
      btn.textContent = size;
      btn.className = "size-btn";
      btn.type = "button";
      btn.onclick = function() {
        sizeDiv.querySelectorAll(".size-btn").forEach(function(b) { b.classList.remove("selected"); });
        btn.classList.add("selected");
        selectedSize = size;
      };
      sizeDiv.appendChild(btn);
    });
    variantContainer.appendChild(sizeDiv);
  }

  // ═══════════════════════════════════════════════════
  // SUPPLIER INFO
  // ═══════════════════════════════════════════════════
  async function loadSupplierInfo(sellerPhone) {
    if (!sellerPhone) {
      supplierContainer.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">Seller info not available</p>';
      return;
    }
    var sellerName = "Unknown Seller";
    var sellerLogo = "lo.png";
    try {
      var res = await fetch(API_BASE + "/all-stores");
      var stores = await res.json();
      var norm = function(p) { return p ? p.toString().replace(/\D/g, "") : ""; };
      var sp = norm(sellerPhone);
      var seller = stores.find(function(s) { return s.phone === sellerPhone; });
      if (!seller) seller = stores.find(function(s) { return norm(s.phone) === sp; });
      if (!seller) {
        seller = stores.find(function(s) {
          var sn = norm(s.phone);
          return sn && sp && (sn.endsWith(sp) || sp.endsWith(sn));
        });
      }
      if (seller) {
        sellerName = seller.name || sellerName;
        sellerLogo = seller.logo || sellerLogo;
        if (seller.delivery) {
          item.delivery = seller.delivery;
          localStorage.setItem("selectedItem", JSON.stringify(item));
        }
      }
    } catch (err) {
      console.warn("Supplier load error:", err);
    }

    supplierContainer.innerHTML = 
      '<div class="supplier-info">' +
        '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0;">' +
          '<img src="' + sellerLogo + '" class="supplier-logo" onerror="this.src=\'lo.png\'">' +
          '<span class="supplier-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + sellerName + '</span>' +
        '</div>' +
        '<button id="viewSupplierBtn" class="view-supplier-btn">View Shop</button>' +
      '</div>';
    
    var btn = supplierContainer.querySelector("#viewSupplierBtn");
    if (btn) {
      btn.onclick = function() {
        window.location.href = "Store.html?phone=" + encodeURIComponent(item.sellerPhone);
      };
    }
  }

  // ═══════════════════════════════════════════════════
  // FULLSCREEN VIEWER
  // ═══════════════════════════════════════════════════
  var fullscreenMediaList = [];
  var fullscreenCurrentIndex = 0;

  window.openFullscreenViewer = function() {
    var viewer = document.getElementById("fullscreenViewer");
    var slides = document.querySelectorAll("#imageSlider .slide");
    fullscreenMediaList = [];
    slides.forEach(function(slide) {
      if (slide.tagName === 'IMG') fullscreenMediaList.push({ type: 'image', src: slide.src });
    });
    if (!fullscreenMediaList.length) return;
    fullscreenCurrentIndex = currentIndex || 0;
    updateFullscreenImage();
    updateFullscreenDots();
    updateFullscreenCounter();
    viewer.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.openFullscreenViewerFromSrc = function(src) {
    fullscreenMediaList = [{ type: 'image', src: src }];
    fullscreenCurrentIndex = 0;
    var viewer = document.getElementById("fullscreenViewer");
    updateFullscreenImage();
    updateFullscreenDots();
    updateFullscreenCounter();
    viewer.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.closeFullscreenViewer = function() {
    var viewer = document.getElementById("fullscreenViewer");
    viewer.classList.remove("active");
    document.body.style.overflow = "";
  };

  window.changeFullscreenImage = function(direction) {
    var img = document.getElementById("fullscreenImage");
    if (!img) return;
    fullscreenCurrentIndex = (fullscreenCurrentIndex + direction + fullscreenMediaList.length) % fullscreenMediaList.length;
    updateFullscreenImage();
    updateFullscreenDots();
    updateFullscreenCounter();
  };

  function updateFullscreenImage() {
    var img = document.getElementById("fullscreenImage");
    var media = fullscreenMediaList[fullscreenCurrentIndex];
    if (media && media.type === 'image') {
      img.src = media.src;
      img.style.display = 'block';
    }
  }

  function updateFullscreenDots() {
    var dotsContainer = document.getElementById("fullscreenDots");
    dotsContainer.innerHTML = "";
    fullscreenMediaList.forEach(function(_, index) {
      var dot = document.createElement("span");
      dot.className = "fullscreen-dot" + (index === fullscreenCurrentIndex ? " active" : "");
      dot.onclick = function() {
        fullscreenCurrentIndex = index;
        updateFullscreenImage();
        updateFullscreenDots();
        updateFullscreenCounter();
      };
      dot.setAttribute("role", "button");
      dotsContainer.appendChild(dot);
    });
  }

  function updateFullscreenCounter() {
    document.getElementById("fullscreenCounter").textContent = (fullscreenCurrentIndex + 1) + " / " + fullscreenMediaList.length;
  }

  // ═══════════════════════════════════════════════════
  // DELIGHT CHAT BUTTON
  // ═══════════════════════════════════════════════════
  function setupChatButton() {
    var chatAnchor = document.querySelector(".whatsapp-btn a");
    if (!chatAnchor) return
    
    chatAnchor.removeAttribute("href");
    chatAnchor.onclick = function(e) {
      e.preventDefault();
      openDelightChat();
    };
  }

  window.openDelightChat = function() {
    var customer = JSON.parse(localStorage.getItem("customer"));
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
  };  // ═══════════════════════════════════════════════════
  // SIMILAR ITEMS
  // ═══════════════════════════════════════════════════
  async function loadSimilarItems(currentItem) {
    var container = document.getElementById("itemContainer");
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">Loading...</div>';
    
    var backendItems = [];
    try {
      var res = await fetch(API_BASE + "/products");
      if (res.ok) backendItems = await res.json();
    } catch (err) {}
    
    var merged = [];
    (window.items || []).forEach(function(i) { merged.push(i); });
    backendItems.forEach(function(b) {
      var exists = merged.find(function(m) { return (m.title || "").toLowerCase() === (b.title || "").toLowerCase(); });
      if (!exists) merged.push(b);
    });
    
    var similar = merged.filter(function(p) {
      if ((p.title || "").toLowerCase() === (currentItem.title || "").toLowerCase()) return false;
      var cc = (currentItem.category || "").toLowerCase();
      var pc = (p.category || "").toLowerCase();
      var ct = (currentItem.title || "").toLowerCase();
      var pt = (p.title || "").toLowerCase();
      return (cc && pc && cc === pc) || ct.split(/\s+/).filter(function(w) { return w.length > 2; }).some(function(w) { return pt.indexOf(w) >= 0; });
    }).slice(0, 10);
    
    container.innerHTML = "";
    if (!similar.length) {
      container.innerHTML = '<div style="text-align:center;padding:20px;color:#999;">No similar items</div>';
      return;
    }
    
    similar.forEach(function(i) {
      var basePrice = parseInt((i.price || "0").toString().replace(/[^\d]/g, "")) || 0;
      var discountAmount = parseInt((i.discount || "0").toString().replace(/[^\d]/g, "")) || 0;
      var finalPrice = basePrice - discountAmount;
      var imgSrc = i.images?.[0] || i.image || "noimg.png";
      
      var card = document.createElement("div");
      card.className = "item-card";
      card.innerHTML = 
        '<img src="' + imgSrc + '" loading="lazy" onerror="this.src=\'noimg.png\'">' +
        '<h3>' + i.title + '</h3>' +
        '<p class="price-wrapper">' +
          '<span class="new-price"><span class="rs">Rs.</span><strong>' + finalPrice + '</strong></span>' +
          (discountAmount > 0 ? '<span class="old-price"><span class="rs">Rs.</span>' + basePrice + '</span>' : '') +
        '</p>';
      
      card.onclick = function() {
        localStorage.setItem("selectedItem", JSON.stringify({
          ...i, finalPrice, originalPrice: basePrice, discountAmount,
          discountPercentage: basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0
        }));
        window.location.href = "itemDetails.html";
      };
      container.appendChild(card);
    });
  }

  // ═══════════════════════════════════════════════════
  // CART
  // ═══════════════════════════════════════════════════
  function updateCartCount() {
    var cart = JSON.parse(localStorage.getItem("cart")) || [];
    var total = cart.reduce(function(sum, it) { return sum + (it.quantity || 0); }, 0);
    cartCountEl.textContent = total;
    cartCountEl.style.display = total > 0 ? "inline" : "none";
  }
  updateCartCount();

  window.addToCart = function(event) {
    if (!item) return;
    if (!item.id) item.id = (item.title || "product").replace(/\s+/g, "_") + "_" + (item.finalPrice || item.price || "0");
    var cart = JSON.parse(localStorage.getItem("cart")) || [];
    var fp = getPriceData(item).finalPrice;
    var existing = cart.find(function(p) { return p.id === item.id; });
    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({
        id: item.id, title: item.title, price: fp,
        image: item.images ? item.images[0] : item.image,
        quantity: 1, description: item.description || "",
        sellerPhone: item.sellerPhone || "", delivery: item.delivery || 0,
        selectedColor, selectedSize
      });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    animateFlyToCart(event);
  };

  window.goToOrderPage = function() {
    var pd = getPriceData(item);
    localStorage.setItem("orderProduct", JSON.stringify({
      title: item.title, image: item.images ? item.images[0] : item.image,
      selectedColor, selectedSize, originalPrice: pd.originalPrice,
      finalPrice: pd.finalPrice, discountPercentage: pd.discountPercentage,
      description: item.description || "", sellerPhone: item.sellerPhone || "",
      delivery: item.delivery || 0, productId: item.id || Date.now()
    }));
    window.location.href = "order.html";
  };

  window.goToCart = function() {
    window.location.href = "cart.html";
  };

  function animateFlyToCart(e) {
    try {
      var imgSrc = item.images ? item.images[0] : item.image || "noimg.png";
      var flyImg = document.createElement("img");
      flyImg.src = imgSrc;
      flyImg.style.cssText = "position:fixed;z-index:9999;width:60px;height:60px;object-fit:cover;border-radius:50%;pointer-events:none;";
      document.body.appendChild(flyImg);
      
      var start = e.target.getBoundingClientRect();
      var cartIcon = document.querySelector(".cart-bag").getBoundingClientRect();
      
      flyImg.style.left = (start.left + start.width/2 - 30) + "px";
      flyImg.style.top = (start.top + start.height/2 - 30) + "px";
      
      requestAnimationFrame(function() {
        flyImg.style.transition = "transform 0.7s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.7s ease";
        flyImg.style.transform = "translate(" + (cartIcon.left - start.left) + "px, " + (cartIcon.top - start.top) + "px) scale(0.1)";
        flyImg.style.opacity = "0";
      });
      setTimeout(function() { flyImg.remove(); }, 750);
    } catch (err) {}
  }

  // ═══════════════════════════════════════════════════
  // TOGGLE SECTION
  // ═══════════════════════════════════════════════════
  window.toggleSection = function(element) {
    element.parentElement.classList.toggle("open");
  };

  // ═══════════════════════════════════════════════════
  // INIT
  // ═══════════════════════════════════════════════════
  loadSupplierInfo(item.sellerPhone);
  setupChatButton();
  loadSimilarItems(item);
  setupStarClicks(); // ← IMPORTANT: Setup star clicks
  
  if (item.id) {
    loadRatingAndReviews();
  }
});
