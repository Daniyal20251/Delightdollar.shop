document.addEventListener("DOMContentLoaded", async () => {

  // ─── Elements ─────────────────────────────────────────────────
  const container            = document.getElementById("itemContainer");
  const skeletonContainer    = document.getElementById("skeletonContainer");
  const flashSaleContainer   = document.getElementById("flashSaleContainer");
  const flashSaleBox         = document.getElementById("flashSaleBox");
  const recentlyViewedBox    = document.getElementById("recentlyViewedBox");
  const recentlyViewedContainer = document.getElementById("recentlyViewedContainer");
  const searchInput          = document.getElementById("searchInput");
  const searchPanel          = document.getElementById("searchPanel");
  const recentSearchesList   = document.getElementById("recentSearches");
  const clearHistoryBtn      = document.getElementById("clearHistoryBtn");
  const swiperWrapper        = document.getElementById("swiperWrapper");
  const adSlider             = document.getElementById("adSlider");
  const adsSkeleton          = document.getElementById("adsSkeleton");
  const suggestionsDropdown  = document.getElementById("suggestionsDropdown");
  const searchClearBtn       = document.getElementById("searchClearBtn");
  const allProductsHeader    = document.getElementById("allProductsHeader");

  let backendItems  = [];
  let swiperInstance = null;

  // ─── Helpers ──────────────────────────────────────────────────
  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function showProductsSkeleton() {
    if (skeletonContainer) skeletonContainer.style.display = "grid";
    if (container) container.style.display = "none";
    if (allProductsHeader) allProductsHeader.style.display = "none";
  }

  function hideProductsSkeleton() {
    if (skeletonContainer) skeletonContainer.style.display = "none";
    if (container) { container.style.display = "grid"; }
    if (allProductsHeader) allProductsHeader.style.display = "flex";
  }

  function showAdsSkeleton() {
    if (adsSkeleton) adsSkeleton.style.display = "block";
    if (adSlider) adSlider.style.display = "none";
  }

  function hideAdsSkeleton() {
    if (adsSkeleton) adsSkeleton.style.display = "none";
  }

  async function incrementView(productId) {
    try {
      await fetch(`https://delight-backend--araindaniyalo2.replit.app/products/${productId}/view`, { method: "POST" });
    } catch (e) {}
  }

  // ─── RECENTLY VIEWED ──────────────────────────────────────────
  function getRecentlyViewed() {
    try { return JSON.parse(localStorage.getItem("recentlyViewed") || "[]"); }
    catch { return []; }
  }

  function addToRecentlyViewed(product) {
    let list = getRecentlyViewed();
    list = list.filter(p => p.id !== product.id);
    list.unshift(product);
    if (list.length > 20) list = list.slice(0, 20);
    localStorage.setItem("recentlyViewed", JSON.stringify(list));
  }

  // ─── RENDER RECENTLY VIEWED (new dark design) ─────────────────
  function renderRecentlyViewed() {
    if (!recentlyViewedContainer || !recentlyViewedBox) return;
    const list = getRecentlyViewed();
    if (!list.length) { recentlyViewedBox.style.display = "none"; return; }

    recentlyViewedBox.style.display = "block";

    // count badge
    const badge = document.getElementById("rvBadge");
    if (badge) { badge.textContent = list.length; badge.classList.add("show"); }

    recentlyViewedContainer.innerHTML = list.map((p, i) => {
      const base  = parseInt((p.price||"0").toString().replace(/[^\d]/g,"")) || 0;
      const disc  = parseInt((p.discount||"0").toString().replace(/[^\d]/g,"")) || 0;
      const final = p.finalPrice || (base - disc);
      const img   = p.images?.[0] || p.image || 'https://via.placeholder.com/150';
      return `
        <div class="rv-card" style="animation-delay:${i*55}ms">
          <div class="rv-dot"></div>
          <img src="${img}" alt="${p.title||''}" loading="lazy">
          <div class="rv-card-body">
            <div class="rv-card-title">${p.title||''}</div>
            <div>
              <span class="rv-card-price">Rs. ${final}</span>
              ${base && disc > 0 ? `<span class="rv-card-old">Rs. ${base}</span>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    recentlyViewedContainer.querySelectorAll('.rv-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        const p = list[i];
        if (!p) return;
        addToRecentlyViewed(p);
        localStorage.setItem("selectedItem", JSON.stringify(p));
        window.location.href = "itemDetails.html";
      });
    });

    // clear button
    const rvClearBtn = document.getElementById("rvClearBtn");
    if (rvClearBtn) {
      rvClearBtn.onclick = () => {
        localStorage.removeItem("recentlyViewed");
        recentlyViewedBox.style.display = "none";
      };
    }
  }

  // ─── RENDER ITEMS ─────────────────────────────────────────────
  // Layout: first 6 → recently viewed → rest
  const containerRest = document.getElementById("itemContainerRest");

  function makeCard(item, index) {
    const basePrice  = parseInt(item.price?.toString().replace(/[^\d]/g, "")) || 0;
    const discount   = parseInt(item.discount?.toString().replace(/[^\d]/g, "")) || 0;
    const finalPrice = basePrice - discount;
    const card = document.createElement("div");
    card.className = "item-card";
    card.style.animationDelay = `${(index % 10) * 40}ms`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.images?.[0] || item.image || 'https://via.placeholder.com/150'}" alt="${item.title}" loading="lazy">
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <p class="price-wrapper">
          <span class="new-price"><span class="rs">Rs.</span><strong>${finalPrice}</strong></span>
          ${discount > 0 ? `<span class="old-price-inline">Rs. ${basePrice}</span>` : ''}
        </p>
      </div>`;
    card.addEventListener("click", () => {
      incrementView(item.id);
      const productData = { ...item, finalPrice, originalPrice: basePrice };
      addToRecentlyViewed(productData);
      localStorage.setItem("selectedItem", JSON.stringify(productData));
      window.location.href = "itemDetails.html";
    });
    return card;
  }

  function renderItems(itemsToRender, hideExtras = false) {
    if (adSlider) adSlider.style.display = hideExtras ? "none" : "block";
    if (flashSaleBox) flashSaleBox.style.display = hideExtras ? "none" : "block";
    if (allProductsHeader) allProductsHeader.style.display = hideExtras ? "none" : "flex";
    if (hideExtras && recentlyViewedBox) recentlyViewedBox.style.display = "none";

    hideProductsSkeleton();
    container.innerHTML = "";
    container.style.display = "grid";
    if (containerRest) { containerRest.innerHTML = ""; containerRest.style.display = "grid"; }

    if (!itemsToRender.length) {
      const searchTerm = searchInput ? searchInput.value.trim() : '';
      const suggestions = searchTerm ? getSuggestions(searchTerm) : [];
      container.innerHTML = `
        <div class="not-found">
          <img src="Delight icons/not-found.png" alt="No Results">
          <h3>Oops! Item Not Found</h3>
          <p>Try searching with a different keyword.</p>
          ${suggestions.length ? `<div class="try-tags">${suggestions.map(s => `<span class="try-tag" onclick="fillAndSearch('${s}')">${s}</span>`).join('')}</div>` : ''}
        </div>`;
      return;
    }

    // First 6 → container
    itemsToRender.slice(0, 6).forEach((item, i) => container.appendChild(makeCard(item, i)));

    // Recently viewed between first 6 and rest
    if (!hideExtras) renderRecentlyViewed();

    // Rest → containerRest
    if (containerRest) {
      itemsToRender.slice(6).forEach((item, i) => containerRest.appendChild(makeCard(item, i + 6)));
    }

    setupScrollReveal();
  }

  // Expose for back button in search
  window.renderItemsGlobal = () => renderItems(backendItems);
  const CATEGORY_MAP = {
    "Men Fashion": ["T-Shirts","Jeans","Shoes","Watches","Caps"],
    "Women Fashion": ["Dresses","Handbags","Jewelry Sets","Sandals","Makeup Kits"],
    "Mobiles": ["Smartphones","Keypad Phones","Mobile Covers","Chargers","Earbuds"],
    "Mobile Accessories": ["Power Banks","Smart Watches","Data Cables","Earphones","Stands & Holders"],
    "Electronics": ["LED TV","Bluetooth Speakers","Headphones","Cameras","Smart Gadgets"],
    "Beauty Products": ["Perfumes","Lipsticks","Face Creams","Hair Oils","Makeup Brushes"],
    "Home & Living": ["Home Gadgets","Cleaning Tools","Kitchen Accessories","Room Decor","Small Appliances"],
    "Watches": ["Smart Watches","Digital Watches","Analog Watches","Couple Watches","Fitness Bands"],
    "Shoes": ["Sneakers","Sandals","Joggers","Slippers","Formal Shoes"],
    "Bags": ["School Bags","Laptop Bags","Hand Bags","Travel Bags","Wallets"],
    "Jewelry": ["Rings","Necklaces","Earrings","Bracelets","Anklets"],
    "Baby Products": ["Baby Toys","Baby Clothes"],
    "Sports Items": ["Gym Gloves","Water Bottles","Dumbbells","Football","Yoga Mats"],
    "Gaming": ["Gamepads","Gaming Headsets","PS5 / Xbox Accessories","Mouse Pads","Gaming Keyboards"],
    "Computer Accessories": ["Keyboards","Mouse","USB Drives","Headsets","Laptop Stands"],
    "Other": ["Other Things"]
  };

  const PLURAL_RULES = {
    'watches':'watch','clothes':'cloth','shoes':'shoe','glasses':'glass','jeans':'jean','pants':'pant',
    'shorts':'short','sneakers':'sneaker','sandals':'sandal','slippers':'slipper','joggers':'jogger',
    'caps':'cap','dresses':'dress','handbags':'handbag','rings':'ring','necklaces':'necklace',
    'earrings':'earring','bracelets':'bracelet','anklets':'anklet','wallets':'wallet','toys':'toy',
    'bottles':'bottle','mats':'mat','gloves':'glove','speakers':'speaker','headphones':'headphone',
    'earphones':'earphone','earbuds':'earbud','chargers':'charger','cables':'cable','covers':'cover',
    'banks':'bank','keyboards':'keyboard','pads':'pad','drives':'drive','stands':'stand',
    'gadgets':'gadget','tools':'tool','accessories':'accessory','appliances':'appliance',
    'products':'product','items':'item','things':'thing',
    'watch':'watches','shoe':'shoes','ring':'rings','bag':'bags','stand':'stands',
    'keyboard':'keyboards','speaker':'speakers','headphone':'headphones'
  };

  function normalizeWord(word) {
    const lower = word.toLowerCase().trim();
    if (PLURAL_RULES[lower]) return PLURAL_RULES[lower];
    if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0, -3) + 'y';
    if (lower.endsWith('es') && /ches|shes|xes|zes|oes/.test(lower)) return lower.slice(0, -2);
    if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) return lower.slice(0, -1);
    return lower;
  }

  function getWordVariations(word) {
    const norm = normalizeWord(word);
    const vars = new Set([norm, word.toLowerCase().trim()]);
    if (PLURAL_RULES[norm]) vars.add(PLURAL_RULES[norm]);
    return Array.from(vars);
  }

  function calculateRelevance(product, terms, variations) {
    let score = 0;
    const title = (product.title || '').toLowerCase();
    const cat   = (product.category || '').toLowerCase();
    const sub   = (product.subcategory || '').toLowerCase();
    const desc  = (product.description || '').toLowerCase();
    terms.forEach((term, idx) => {
      variations[idx].forEach(v => {
        if (title === v) score += 100;
        else if (title.startsWith(v + ' ')) score += 80;
        else if (new RegExp(`\\b${v}\\b`, 'i').test(title)) score += 60;
        else if (title.includes(v)) score += 40;
        if (sub === v) score += 70;
        else if (sub.includes(v)) score += 50;
        if (cat === v) score += 60;
        else if (cat.includes(v)) score += 40;
        if (desc.includes(v)) score += 20;
        if (idx === 0) score *= 1.5;
      });
    });
    const allInTitle = terms.every((t, i) => variations[i].some(v => title.includes(v)));
    if (allInTitle) score += 50;
    return score;
  }

  function findRelatedCategories(term) {
    const related = new Set();
    const norm = normalizeWord(term);
    Object.entries(CATEGORY_MAP).forEach(([cat, subs]) => {
      const cl = cat.toLowerCase();
      if (cl.includes(norm) || norm.includes(cl)) { related.add(cat); subs.forEach(s => related.add(s)); }
      subs.forEach(sub => {
        const sl = sub.toLowerCase();
        if (sl.includes(norm) || norm.includes(sl)) { related.add(cat); related.add(sub); }
      });
    });
    return Array.from(related);
  }

  function levenshtein(a, b) {
    const m = [];
    for (let i = 0; i <= b.length; i++) m[i] = [i];
    for (let j = 0; j <= a.length; j++) m[0][j] = j;
    for (let i = 1; i <= b.length; i++)
      for (let j = 1; j <= a.length; j++)
        m[i][j] = b[i-1] === a[j-1] ? m[i-1][j-1] : Math.min(m[i-1][j-1]+1, m[i][j-1]+1, m[i-1][j]+1);
    return m[b.length][a.length];
  }

  function fuzzySearch(products, terms) {
    return products.filter(p => {
      const text = `${p.title||''} ${p.category||''} ${p.subcategory||''}`.toLowerCase();
      return terms.some(t => t.length > 4
        ? text.split(/\s+/).some(w => levenshtein(w, t) <= 2)
        : text.includes(t));
    });
  }

  function getSuggestions(term) {
    const norm = normalizeWord(term);
    const res = [];
    Object.entries(CATEGORY_MAP).forEach(([cat, subs]) => {
      if (cat.toLowerCase().includes(norm)) res.push(cat);
      subs.forEach(s => { if (s.toLowerCase().includes(norm)) res.push(s); });
    });
    return res.slice(0, 5);
  }

  // ─── LIVE AUTOCOMPLETE SUGGESTIONS ───────────────────────────
  function buildSuggestions(query) {
    if (!query || query.length < 1) return [];
    const q = query.toLowerCase().trim();
    const results = [];
    const seen = new Set();

    // Match from product titles (top-priority)
    backendItems.forEach(p => {
      const title = (p.title || '').toLowerCase();
      if (title.includes(q) && !seen.has(title)) {
        seen.add(title);
        results.push({ text: p.title, category: p.category || '', type: 'product' });
      }
    });

    // Match from categories/subcategories
    Object.entries(CATEGORY_MAP).forEach(([cat, subs]) => {
      if (cat.toLowerCase().includes(q) && !seen.has(cat.toLowerCase())) {
        seen.add(cat.toLowerCase());
        results.push({ text: cat, category: 'Category', type: 'category' });
      }
      subs.forEach(sub => {
        if (sub.toLowerCase().includes(q) && !seen.has(sub.toLowerCase())) {
          seen.add(sub.toLowerCase());
          results.push({ text: sub, category: cat, type: 'subcategory' });
        }
      });
    });

    return results.slice(0, 8);
  }

  function highlightMatch(text, query) {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return text.slice(0, idx) + `<em>${text.slice(idx, idx + query.length)}</em>` + text.slice(idx + query.length);
  }

  function showSuggestions(query) {
    if (!suggestionsDropdown) return;
    const items = buildSuggestions(query);
    if (!items.length || !query) {
      suggestionsDropdown.style.display = 'none';
      return;
    }
    suggestionsDropdown.innerHTML = items.map(item => `
      <div class="suggestion-item" onclick="fillAndSearch('${item.text.replace(/'/g, "\\'")}')">
        <i class="sug-icon fas ${item.type === 'product' ? 'fa-box' : item.type === 'category' ? 'fa-th-large' : 'fa-tag'}"></i>
        <span>${highlightMatch(item.text, query)}</span>
        <span class="sug-category">${item.category}</span>
      </div>`).join('');
    suggestionsDropdown.style.display = 'block';
    if (searchPanel) searchPanel.classList.remove('active');
  }

  function hideSuggestions() {
    if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
  }

  // ─── SEARCH PANEL ─────────────────────────────────────────────
  function renderRecentSearches() {
    if (!recentSearchesList) return;
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    recentSearchesList.innerHTML = recent.length
      ? recent.map(t => `<li onclick="fillAndSearch('${t.replace(/'/g,"\\'")}')">${t}</li>`).join('')
      : '<li style="color:#bbb;font-size:13px;">No recent searches</li>';
  }

  function toggleSearchPanel(show) {
    if (!searchPanel) return;
    if (show) {
      searchPanel.classList.add('active');
      renderRecentSearches();
      hideSuggestions();
    } else {
      searchPanel.classList.remove('active');
    }
  }

  window.fillAndSearch = function(item) {
    if (searchInput) searchInput.value = item;
    hideSuggestions();
    toggleSearchPanel(false);
    searchItems();
  };

  // ─── SCROLL REVEAL ────────────────────────────────────────────
  function setupScrollReveal() {
    const cards = document.querySelectorAll('.item-card');
    if (!('IntersectionObserver' in window)) {
      cards.forEach(c => c.classList.add('visible'));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    cards.forEach(c => observer.observe(c));
  }

  // ─── SEARCH ───────────────────────────────────────────────────
  window.searchItems = function() {
    const term = searchInput ? searchInput.value.trim() : '';
    if (!term) { renderItems(backendItems); return; }

    const rawTerms = term.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
    if (!rawTerms.length) { renderItems(backendItems); return; }

    const searchVariations = rawTerms.map(t => getWordVariations(t));
    const relatedCategories = rawTerms.flatMap(t => findRelatedCategories(t));

    const scored = backendItems.map(item => {
      let score = calculateRelevance(item, rawTerms, searchVariations);
      relatedCategories.forEach(rel => {
        const rl = rel.toLowerCase();
        if ((item.category || '').toLowerCase().includes(rl)) score += 30;
        if ((item.subcategory || '').toLowerCase().includes(rl)) score += 40;
        if ((item.title || '').toLowerCase().includes(rl)) score += 25;
      });
      return { item, score };
    });

    let matched = scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score).map(x => x.item);
    if (!matched.length) matched = fuzzySearch(backendItems, rawTerms);

    renderItems(matched, true);

    // Save to recent
    let recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const tl = term.toLowerCase().trim();
    if (!recent.includes(tl)) {
      recent.unshift(tl); if (recent.length > 10) recent.pop();
      localStorage.setItem("recentSearches", JSON.stringify(recent));
    }
    hideSuggestions();
    toggleSearchPanel(false);
  };

  // ─── SEARCH INPUT EVENTS ──────────────────────────────────────
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const val = searchInput.value.trim();
      if (searchClearBtn) searchClearBtn.style.display = val ? 'block' : 'none';
      const phEl = document.getElementById("searchPhAnim");
      if (phEl) phEl.style.display = val ? 'none' : 'block';
      if (val.length >= 1) {
        showSuggestions(val);
        toggleSearchPanel(false);
      } else {
        hideSuggestions();
        toggleSearchPanel(true);
      }
    });

    searchInput.addEventListener('focus', () => {
      const val = searchInput.value.trim();
      if (val.length >= 1) showSuggestions(val);
      else toggleSearchPanel(true);
    });

    searchInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { searchItems(); searchInput.blur(); }
    });
  }

  if (searchClearBtn) {
    searchClearBtn.addEventListener('click', () => {
      searchInput.value = '';
      searchClearBtn.style.display = 'none';
      const phEl = document.getElementById("searchPhAnim");
      if (phEl) phEl.style.display = 'block';
      hideSuggestions();
      renderItems(backendItems);
      searchInput.focus();
    });
  }

  document.addEventListener('click', e => {
    const inside = searchInput?.contains(e.target)
      || suggestionsDropdown?.contains(e.target)
      || searchPanel?.contains(e.target)
      || document.getElementById("searchBackBtn")?.contains(e.target);
    if (!inside) { hideSuggestions(); toggleSearchPanel(false); }
  });

  if (clearHistoryBtn) clearHistoryBtn.addEventListener('click', () => {
    localStorage.removeItem("recentSearches");
    renderRecentSearches();
  });

  // ─── TAB BAR ──────────────────────────────────────────────────
  window.setActiveTab = function(element, url) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    element.classList.add('active');
    const underline = document.querySelector('.underline');
    const idx = Array.from(document.querySelectorAll('.tab')).indexOf(element);
    if (underline) {
      underline.style.width = `${100 / document.querySelectorAll('.tab').length}%`;
      underline.style.transform = `translateX(${idx * 100}%)`;
    }
    setTimeout(() => {
      if (window.location.pathname.split('/').pop() !== url) window.location.href = url;
    }, 150);
  };

  // ─── ADS SLIDER ───────────────────────────────────────────────
  function getAdName(ad) {
    const fields = ['name','title','text','label','caption','heading','description','adName','adTitle'];
    for (const f of fields) if (ad[f] && typeof ad[f] === 'string') return ad[f].trim();
    for (const k in ad) if (typeof ad[k] === 'string' && ad[k].length < 100) return ad[k].trim();
    return '';
  }

  async function loadSliderImages() {
    showAdsSkeleton();
    try {
      const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/admin/ads");
      const ads = await res.json();
      const adFilters = ["Delight.pk","Delight.pk1","Delight.pk2","Delight.pk3","Delight.pk4","Delight.pk5","Delight.pk6","Delight.pk7"];
      const matched = adFilters.reduce((arr, f, i) => {
        const ad = ads.find(a => getAdName(a).toLowerCase() === f.toLowerCase());
        if (ad) arr.push({ ...ad, id: `ad${i+1}` });
        return arr;
      }, []);

      if (matched.length > 0) {
        swiperWrapper.innerHTML = matched.map(ad =>
          `<div class="swiper-slide" id="${ad.id}"><img src="${ad.image}" alt="${getAdName(ad)||'Ad'}" loading="lazy"></div>`
        ).join('');
        hideAdsSkeleton();
        adSlider.style.display = "block";
        if (swiperInstance) swiperInstance.destroy(true, true);
        swiperInstance = new Swiper(".mySwiper", {
          loop: matched.length > 1,
          autoplay: { delay: 3000, disableOnInteraction: false },
          pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: matched.length > 5 }
        });
      } else { hideAdsSkeleton(); adSlider.style.display = "none"; }
    } catch(e) { hideAdsSkeleton(); adSlider.style.display = "none"; }
  }

  // ─── FLASH SALE ───────────────────────────────────────────────
  async function loadFlashSale() {
    if (!flashSaleContainer) return;
    try {
      const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/products");
      let products = await res.json();
      products = products.map(p => {
        const price = parseInt(p.price?.toString().replace(/[^\d]/g, "")) || 0;
        const discount = parseInt(p.discount?.toString().replace(/[^\d]/g, "")) || 0;
        const pct = price > 0 ? Math.round((discount / price) * 100) : 0;
        return { ...p, discountPercentage: pct, finalPrice: price - discount };
      }).filter(p => p.discountPercentage >= 30);

      products = shuffleArray(products);
      flashSaleContainer.innerHTML = "";

      if (!products.length) {
        flashSaleContainer.innerHTML = `<p style="padding:16px;color:var(--primary);font-weight:700;">No flash sale items right now</p>`;
        return;
      }

      products.forEach(product => {
        const card = document.createElement("div");
        card.className = "flash-sale-card";
        card.innerHTML = `
          ${product.discountPercentage > 0 ? `<div class="discount-badge">SAVE ${product.discountPercentage}%</div>` : ""}
          <img src="${product.images?.[0] || product.image || 'https://via.placeholder.com/150'}" alt="${product.title}" loading="lazy">
          <div class="card-info">
            <div class="card-title">${product.title}</div>
            <div class="price-block">
              <span class="final-price">Rs. ${product.finalPrice}</span>
              ${product.price ? `<span class="old-price">Rs. ${product.price}</span>` : ""}
            </div>
            <div class="stock-badge">Limited Stock</div>
          </div>`;
        card.addEventListener("click", () => {
          addToRecentlyViewed({ ...product });
          localStorage.setItem("selectedItem", JSON.stringify(product));
          window.location.href = "itemDetails.html";
        });
        flashSaleContainer.appendChild(card);
      });
    } catch(e) {
      flashSaleContainer.innerHTML = "<p style='padding:16px;'>Keep Internet Connection</p>";
    }
  }

  // ─── ALL PRODUCTS ─────────────────────────────────────────────
  async function loadBackendProducts() {
    showProductsSkeleton();
    try {
      const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/products");
      const data = await res.json();
      backendItems = shuffleArray(data);
      renderItems(backendItems);
    } catch(e) {
      hideProductsSkeleton();
      container.innerHTML = "<p style='padding:20px;text-align:center;'>Keep Internet Connection</p>";
    }
  }

  // ─── CACHE HELPERS ────────────────────────────────────────────
  const CACHE_TTL = 5 * 60 * 1000;

  function saveCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch(e) {}
  }

  function loadCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) return null;
      return data;
    } catch(e) { return null; }
  }

  // ─── ADS WITH CACHE ───────────────────────────────────────────
  async function loadSliderWithCache() {
    const cached = loadCache("dlpk_ads");
    const matched = cached || await (async () => {
      showAdsSkeleton();
      try {
        const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/admin/ads");
        const ads = await res.json();
        const adFilters = ["Delight.pk","Delight.pk1","Delight.pk2","Delight.pk3","Delight.pk4","Delight.pk5","Delight.pk6","Delight.pk7"];
        const m = adFilters.reduce((arr, f, i) => {
          const ad = ads.find(a => getAdName(a).toLowerCase() === f.toLowerCase());
          if (ad) arr.push({ ...ad, id: `ad${i+1}` });
          return arr;
        }, []);
        saveCache("dlpk_ads", m);
        return m;
      } catch(e) { hideAdsSkeleton(); return []; }
    })();

    if (matched.length > 0) {
      swiperWrapper.innerHTML = matched.map(ad =>
        `<div class="swiper-slide" id="${ad.id}"><img src="${ad.image}" alt="${getAdName(ad)||'Ad'}" loading="lazy"></div>`
      ).join('');
      hideAdsSkeleton();
      adSlider.style.display = "block";
      if (swiperInstance) { try { swiperInstance.destroy(true,true); } catch(e){} }
      swiperInstance = new Swiper(".mySwiper", {
        loop: matched.length > 1,
        autoplay: { delay: 3000, disableOnInteraction: false },
        pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: matched.length > 5 }
      });
    } else {
      hideAdsSkeleton();
      adSlider.style.display = "none";
    }
  }

  // ─── FLASH SALE WITH CACHE ────────────────────────────────────
  async function loadFlashSaleWithCache() {
    if (!flashSaleContainer) return;
    const cached = loadCache("dlpk_flash");
    const productsToRender = cached || await (async () => {
      try {
        const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/products");
        let products = await res.json();
        products = products.map(p => {
          const price    = parseInt((p.price||"0").toString().replace(/[^\d]/g,"")) || 0;
          const discount = parseInt((p.discount||"0").toString().replace(/[^\d]/g,"")) || 0;
          const pct      = price > 0 ? Math.round((discount/price)*100) : 0;
          return { ...p, discountPercentage: pct, finalPrice: price - discount };
        }).filter(p => p.discountPercentage >= 30);
        products = shuffleArray(products);
        saveCache("dlpk_flash", products);
        return products;
      } catch(e) { return []; }
    })();

    flashSaleContainer.innerHTML = "";
    if (!productsToRender.length) {
      flashSaleContainer.innerHTML = `<p style="padding:16px;color:var(--primary);font-weight:700;">No flash sale items right now</p>`;
      return;
    }
    productsToRender.forEach(product => {
      const card = document.createElement("div");
      card.className = "flash-sale-card";
      card.innerHTML = `
        ${product.discountPercentage > 0 ? `<div class="discount-badge">SAVE ${product.discountPercentage}%</div>` : ""}
        <img src="${product.images?.[0] || product.image || ''}" alt="${product.title}" loading="lazy">
        <div class="card-info">
          <div class="card-title">${product.title}</div>
          <div class="price-block">
            <span class="final-price">Rs. ${product.finalPrice}</span>
            ${product.price ? `<span class="old-price">Rs. ${product.price}</span>` : ""}
          </div>
          <div class="stock-badge">Limited Stock</div>
        </div>`;
      card.addEventListener("click", () => {
        addToRecentlyViewed({ ...product });
        localStorage.setItem("selectedItem", JSON.stringify(product));
        window.location.href = "itemDetails.html";
      });
      flashSaleContainer.appendChild(card);
    });
  }

  // ─── PRODUCTS WITH CACHE ──────────────────────────────────────
  async function loadProductsWithCache() {
    const cached = loadCache("dlpk_products");
    if (cached) {
      backendItems = cached;
      renderItems(backendItems);
      return;
    }
    showProductsSkeleton();
    try {
      const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/products");
      const data = await res.json();
      backendItems = shuffleArray(data);
      saveCache("dlpk_products", backendItems);
      renderItems(backendItems);
    } catch(e) {
      hideProductsSkeleton();
      if (container) container.innerHTML = "<p style='padding:20px;text-align:center;'>Keep Internet Connection</p>";
    }
  }

  // ─── INIT ─────────────────────────────────────────────────────
  const savedScroll = sessionStorage.getItem("dlpk_scroll");
  await loadSliderWithCache();
  await loadFlashSaleWithCache();
  if (flashSaleBox) flashSaleBox.style.display = "block";
  await loadProductsWithCache(); // renderRecentlyViewed called inside renderItems

  if (savedScroll) {
    sessionStorage.removeItem("dlpk_scroll");
    requestAnimationFrame(() => window.scrollTo({ top: parseInt(savedScroll), behavior: "instant" }));
  }
});

// ─── SCROLL SAVE ON LEAVE ─────────────────────────────────────
window.addEventListener("pagehide", () => {
  sessionStorage.setItem("dlpk_scroll", String(window.scrollY));
});
// ─── WHATSAPP BUTTON ──────────────────────────────────────────
(function() {
  const btn = document.getElementById("waBtn");
  if (!btn) return;
  let visible = false, hideTimer = null;

  function showWa() {
    if (visible) return;
    visible = true;
    btn.classList.add("visible");
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideWa, 60000); // hide after 1 min
  }
  function hideWa() {
    visible = false;
    btn.classList.remove("visible");
  }

  window.addEventListener("scroll", () => { if (window.scrollY > 180) showWa(); }, { passive: true });
  setTimeout(showWa, 3000); // show after 3s on mobile
})();

// ─── ANIMATED SEARCH PLACEHOLDER (Daraz style) ───────────────
(function() {
  const input  = document.getElementById("searchInput");
  const phEl   = document.getElementById("searchPhAnim");
  const header = document.getElementById("mainHeader");
  const backBtn= document.getElementById("searchBackBtn");
  const iconEl = document.getElementById("searchIconEl");
  const clearBtn= document.getElementById("searchClearBtn");
  if (!input || !phEl || !header) return;

  const TEXTS = [
    "Search products...",
    "Smart Watches ⌚",
    "Earbuds & Headphones 🎧",
    "Fashion & Dresses 👗",
    "Home Gadgets 🏠",
    "Power Banks 🔋",
    "Tripod Stands 📷",
    "Jewelry & Rings 💍",
  ];

  let idx = 0, timer = null, active = true;

  function type(text, cb) {
    let i = 0;
    phEl.textContent = "";
    phEl.style.opacity = "1";
    const iv = setInterval(() => {
      if (!active) { clearInterval(iv); return; }
      phEl.textContent = text.slice(0, ++i);
      if (i >= text.length) {
        clearInterval(iv);
        setTimeout(() => {
          phEl.style.transition = "opacity 0.3s ease";
          phEl.style.opacity = "0";
          setTimeout(() => { if (active && cb) cb(); }, 340);
        }, 1800);
      }
    }, 55);
  }

  function rotate() {
    if (!active) return;
    phEl.style.transition = "none";
    type(TEXTS[idx], () => {
      idx = (idx + 1) % TEXTS.length;
      timer = setTimeout(rotate, 200);
    });
  }

  function startAnim() {
    active = true;
    phEl.style.display = "block";
    rotate();
  }

  function stopAnim() {
    active = false;
    clearTimeout(timer);
    phEl.style.opacity = "0";
    setTimeout(() => { phEl.style.display = "none"; }, 300);
  }

  setTimeout(startAnim, 500);

  // Search expand
  function expandSearch() {
    header.classList.add("search-active");
    stopAnim();
  }
  function collapseSearch() {
    header.classList.remove("search-active");
    if (!input.value.trim()) startAnim();
  }

  input.addEventListener("focus", expandSearch);
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!document.activeElement?.closest(".search-input-box")) {
        if (!input.value.trim()) collapseSearch();
      }
    }, 150);
  });
  input.addEventListener("input", () => {
    const v = input.value.trim();
    phEl.style.display = v ? "none" : "block";
    if (clearBtn) clearBtn.style.display = v ? "block" : "none";
  });

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      input.value = "";
      if (clearBtn) clearBtn.style.display = "none";
      phEl.style.display = "block";
      collapseSearch();
      input.blur();
      // re-render all products
      if (typeof renderItemsGlobal === "function") renderItemsGlobal();
    });
  }
})();