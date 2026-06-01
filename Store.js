let allProducts = [];
let swiperInstance = null;

const API_BASE = "https://delight-backend--araindaniyalo2.replit.app";

// ─── Elements ────────────────────────────────────────────────
const searchInput        = document.getElementById("searchInput");
const searchPanel        = document.getElementById("searchPanel");
const recentList         = document.getElementById("recentSearches");
const clearBtn           = document.getElementById("clearHistoryBtn");
const itemContainer      = document.getElementById("itemContainer");
const skeletonContainer  = document.getElementById("skeletonContainer");
const suggestionsDropdown= document.getElementById("suggestionsDropdown");
const searchClearBtn     = document.getElementById("searchClearBtn");
const productsHeader     = document.getElementById("productsHeader");

let recentSearches = JSON.parse(localStorage.getItem("recentSearches") || "[]");

// ─── Helpers ─────────────────────────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function showSkeleton() {
  if (skeletonContainer) skeletonContainer.style.display = "grid";
  if (itemContainer)     itemContainer.style.display = "none";
  if (productsHeader)    productsHeader.style.display = "none";
}

function hideSkeleton() {
  if (skeletonContainer) skeletonContainer.style.display = "none";
  if (itemContainer)     itemContainer.style.display = "grid";
  if (productsHeader)    productsHeader.style.display = "flex";
}

function getAdName(ad) {
  const fields = ['name','title','text','label','caption','heading','description','adName','adTitle'];
  for (const f of fields) if (ad[f] && typeof ad[f] === 'string') return ad[f].trim();
  for (const k in ad) if (typeof ad[k] === 'string' && ad[k].length < 100) return ad[k].trim();
  return '';
}

async function incrementView(productId) {
  try { await fetch(`${API_BASE}/products/${productId}/view`, { method: "POST" }); } catch(e) {}
}

// ─── Search Engine ───────────────────────────────────────────
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
  'watches':'watch','clothes':'cloth','shoes':'shoe','jeans':'jean','pants':'pant',
  'sneakers':'sneaker','sandals':'sandal','slippers':'slipper','joggers':'jogger','caps':'cap',
  'dresses':'dress','handbags':'handbag','rings':'ring','necklaces':'necklace','earrings':'earring',
  'bracelets':'bracelet','anklets':'anklet','wallets':'wallet','toys':'toy','bottles':'bottle',
  'mats':'mat','gloves':'glove','speakers':'speaker','headphones':'headphone','earphones':'earphone',
  'earbuds':'earbud','chargers':'charger','cables':'cable','covers':'cover','banks':'bank',
  'keyboards':'keyboard','pads':'pad','drives':'drive','stands':'stand','gadgets':'gadget',
  'tools':'tool','accessories':'accessory','appliances':'appliance','products':'product','items':'item',
  'watch':'watches','shoe':'shoes','ring':'rings','bag':'bags','stand':'stands','keyboard':'keyboards'
};

function normalizeWord(word) {
  const lower = word.toLowerCase().trim();
  if (PLURAL_RULES[lower]) return PLURAL_RULES[lower];
  if (lower.endsWith('ies') && lower.length > 4) return lower.slice(0,-3) + 'y';
  if (lower.endsWith('es') && /ches|shes|xes|zes|oes/.test(lower)) return lower.slice(0,-2);
  if (lower.endsWith('s') && !lower.endsWith('ss') && lower.length > 2) return lower.slice(0,-1);
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
  const title = (product.title||'').toLowerCase();
  const cat   = (product.category||'').toLowerCase();
  const sub   = (product.subcategory||'').toLowerCase();
  const desc  = (product.description||'').toLowerCase();
  terms.forEach((term, idx) => {
    variations[idx].forEach(v => {
      if (title === v) score += 100;
      else if (title.startsWith(v+' ')) score += 80;
      else if (new RegExp(`\\b${v}\\b`,'i').test(title)) score += 60;
      else if (title.includes(v)) score += 40;
      if (sub === v) score += 70; else if (sub.includes(v)) score += 50;
      if (cat === v) score += 60; else if (cat.includes(v)) score += 40;
      if (desc.includes(v)) score += 20;
      if (idx === 0) score *= 1.5;
    });
  });
  if (terms.every((t,i) => variations[i].some(v => title.includes(v)))) score += 50;
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
  for (let i=0;i<=b.length;i++) m[i]=[i];
  for (let j=0;j<=a.length;j++) m[0][j]=j;
  for (let i=1;i<=b.length;i++)
    for (let j=1;j<=a.length;j++)
      m[i][j]=b[i-1]===a[j-1]?m[i-1][j-1]:Math.min(m[i-1][j-1]+1,m[i][j-1]+1,m[i-1][j]+1);
  return m[b.length][a.length];
}

function fuzzySearch(products, terms) {
  return products.filter(p => {
    const text = `${p.title||''} ${p.category||''} ${p.subcategory||''}`.toLowerCase();
    return terms.some(t => t.length > 4
      ? text.split(/\s+/).some(w => levenshtein(w,t) <= 2)
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

// ─── Live Autocomplete ────────────────────────────────────────
function buildSuggestions(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().trim();
  const results = [];
  const seen = new Set();
  allProducts.forEach(p => {
    const t = (p.title||'').toLowerCase();
    if (t.includes(q) && !seen.has(t)) {
      seen.add(t);
      results.push({ text: p.title, category: p.category||'', type:'product' });
    }
  });
  Object.entries(CATEGORY_MAP).forEach(([cat, subs]) => {
    if (cat.toLowerCase().includes(q) && !seen.has(cat.toLowerCase())) {
      seen.add(cat.toLowerCase());
      results.push({ text: cat, category: 'Category', type:'category' });
    }
    subs.forEach(sub => {
      if (sub.toLowerCase().includes(q) && !seen.has(sub.toLowerCase())) {
        seen.add(sub.toLowerCase());
        results.push({ text: sub, category: cat, type:'subcategory' });
      }
    });
  });
  return results.slice(0, 8);
}

function highlightMatch(text, query) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return text.slice(0,idx) + `<em>${text.slice(idx,idx+query.length)}</em>` + text.slice(idx+query.length);
}

function showSuggestions(query) {
  if (!suggestionsDropdown) return;
  const items = buildSuggestions(query);
  if (!items.length || !query) { suggestionsDropdown.style.display='none'; return; }
  suggestionsDropdown.innerHTML = items.map(item => `
    <div class="suggestion-item" onclick="fillAndSearch('${item.text.replace(/'/g,"\\'")}')">
      <i class="sug-icon fas ${item.type==='product'?'fa-box':item.type==='category'?'fa-th-large':'fa-tag'}"></i>
      <span>${highlightMatch(item.text, query)}</span>
      <span class="sug-category">${item.category}</span>
    </div>`).join('');
  suggestionsDropdown.style.display = 'block';
  if (searchPanel) searchPanel.classList.remove('active');
}

function hideSuggestions() {
  if (suggestionsDropdown) suggestionsDropdown.style.display = 'none';
}

// ─── Ads / Flash Sale helpers ─────────────────────────────────
function hideAds() {
  const el = document.getElementById("adSlider");
  if (el) el.style.display = "none";
}
function showAds() {
  const el = document.getElementById("adSlider");
  if (el) el.style.display = "block";
}

// ─── Render Products ─────────────────────────────────────────
function renderProducts(list) {
  itemContainer.innerHTML = "";
  if (!list.length) {
    itemContainer.innerHTML = `
      <div class="not-found">
        <img src="Delight icons/not-found.png" alt="No Results">
        <h3>Item Not Found</h3>
        <p>Try a different search keyword.</p>
      </div>`;
    return;
  }
  list.forEach((item, index) => {
    const basePrice  = parseInt(String(item.price).replace(/[^\d]/g,"")) || 0;
    const discount   = parseInt(String(item.discount||0).replace(/[^\d]/g,"")) || 0;
    const finalPrice = basePrice - discount;

    const card = document.createElement("div");
    card.className = "item-card";
    card.style.animationDelay = `${(index % 10) * 40}ms`;
    card.innerHTML = `
      <div class="card-img-wrap">
        <img src="${item.images?.[0]||'Delight icons/store.png'}" alt="${item.title}" loading="lazy">
      </div>
      <div class="card-body">
        <h3>${item.title}</h3>
        <p class="price-wrapper">
          <span class="new-price"><span class="rs">Rs.</span><strong>${finalPrice||basePrice}</strong></span>
          ${discount > 0 ? `<span class="old-price-inline">Rs. ${basePrice}</span>` : ''}
        </p>
      </div>`;
    card.addEventListener("click", () => {
      incrementView(item.id);
      localStorage.setItem("selectedItem", JSON.stringify({...item, finalPrice, originalPrice: basePrice}));
      window.location.href = "Stores itemDetails.html";
    });
    itemContainer.appendChild(card);
  });
  setupScrollReveal();
}

// ─── Scroll Reveal ────────────────────────────────────────────
function setupScrollReveal() {
  const cards = document.querySelectorAll('.item-card');
  if (!('IntersectionObserver' in window)) { cards.forEach(c => c.classList.add('visible')); return; }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
  cards.forEach(c => observer.observe(c));
}

// ─── Recent Searches ──────────────────────────────────────────
function renderRecentSearches() {
  if (!recentList) return;
  recentList.innerHTML = recentSearches.length
    ? recentSearches.map(t => `<li onclick="fillAndSearch('${t.replace(/'/g,"\\'")}')"> ${t}</li>`).join('')
    : '<li style="color:#bbb;font-size:13px;">No recent searches</li>';
}

// ─── Search ───────────────────────────────────────────────────
function filterProducts(term) {
  hideAds();
  if (!term) { showAds(); renderProducts(allProducts); return; }
  const rawTerms = term.toLowerCase().trim().split(/\s+/).filter(t => t.length > 1);
  if (!rawTerms.length) { showAds(); renderProducts(allProducts); return; }

  const vars = rawTerms.map(t => getWordVariations(t));
  const related = rawTerms.flatMap(t => findRelatedCategories(t));
  const scored = allProducts.map(p => {
    let score = calculateRelevance(p, rawTerms, vars);
    related.forEach(r => {
      const rl = r.toLowerCase();
      if ((p.category||'').toLowerCase().includes(rl)) score += 30;
      if ((p.subcategory||'').toLowerCase().includes(rl)) score += 40;
      if ((p.title||'').toLowerCase().includes(rl)) score += 25;
    });
    return { p, score };
  });
  let matched = scored.filter(x => x.score > 0).sort((a,b) => b.score-a.score).map(x => x.p);
  if (!matched.length) matched = fuzzySearch(allProducts, rawTerms);
  renderProducts(matched);
}

window.searchItems = function() {
  const term = searchInput.value.trim();
  const tl = term.toLowerCase().trim();
  if (term && !recentSearches.includes(tl)) {
    recentSearches.unshift(tl);
    if (recentSearches.length > 10) recentSearches.pop();
    localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
  }
  filterProducts(term);
  hideSuggestions();
  if (searchPanel) searchPanel.classList.remove('active');
};

window.fillAndSearch = function(term) {
  searchInput.value = term;
  hideSuggestions();
  if (searchPanel) searchPanel.classList.remove('active');
  searchItems();
};

// ─── Search Input Events ──────────────────────────────────────
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const val = searchInput.value.trim();
    if (searchClearBtn) searchClearBtn.style.display = val ? 'block' : 'none';
    if (val.length >= 1) { showSuggestions(val); if(searchPanel) searchPanel.classList.remove('active'); }
    else { hideSuggestions(); renderRecentSearches(); if(searchPanel) searchPanel.classList.add('active'); showAds(); renderProducts(allProducts); }
  });
  searchInput.addEventListener('focus', () => {
    const val = searchInput.value.trim();
    if (val.length >= 1) showSuggestions(val);
    else { renderRecentSearches(); if(searchPanel) searchPanel.classList.add('active'); }
  });
  searchInput.addEventListener('keydown', e => { if (e.key==='Enter') { searchItems(); searchInput.blur(); } });
}

if (searchClearBtn) {
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = ''; searchClearBtn.style.display='none';
    hideSuggestions(); showAds(); renderProducts(allProducts); searchInput.focus();
  });
}

document.addEventListener('click', e => {
  const inside = searchInput?.contains(e.target) || suggestionsDropdown?.contains(e.target) || searchPanel?.contains(e.target);
  if (!inside) { hideSuggestions(); if(searchPanel) searchPanel.classList.remove('active'); }
});

if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    localStorage.removeItem("recentSearches");
    recentSearches = [];
    renderRecentSearches();
    searchInput.value = ''; if(searchClearBtn) searchClearBtn.style.display='none';
    showAds(); renderProducts(allProducts);
  });
}

// ─── Cache Helpers ────────────────────────────────────────────
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

function initSwiper(matched) {
  const swiperWrapper = document.getElementById("swiperWrapper");
  const adSlider      = document.getElementById("adSlider");
  if (!swiperWrapper || !adSlider) return;
  swiperWrapper.innerHTML = matched.map(ad =>
    `<div class="swiper-slide"><img src="${ad.image}" alt="${getAdName(ad)||'Ad'}" loading="lazy"></div>`
  ).join('');
  adSlider.style.display = "block";
  if (swiperInstance) { try { swiperInstance.destroy(true,true); } catch(e){} }
  swiperInstance = new Swiper(".mySwiper", {
    loop: matched.length > 1,
    autoplay: { delay: 3000, disableOnInteraction: false },
    pagination: { el: ".swiper-pagination", clickable: true, dynamicBullets: matched.length > 5 }
  });
}

// ─── Main Init ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  const adsSkeleton  = document.getElementById("adsSkeleton");
  const adSlider     = document.getElementById("adSlider");
  const sellerNameEl = document.getElementById("sellerName");
  const sellerLogoEl = document.getElementById("sellerLogo");
  const storeLabel   = document.getElementById("storeProductsLabel");

  const sellerPhone = new URLSearchParams(window.location.search).get("phone");
  if (!sellerPhone) {
    hideSkeleton();
    itemContainer.innerHTML = "<p style='text-align:center;padding:40px;color:#777;'>⚠️ Seller not found!</p>";
    return;
  }

  const cacheKey_products = `dlpk_store_products_${sellerPhone}`;
  const cacheKey_ads      = `dlpk_store_ads_${sellerPhone}`;
  const cacheKey_store    = `dlpk_store_info_${sellerPhone}`;

  // ── Restore scroll position ──
  const savedScroll = sessionStorage.getItem("dlpk_store_scroll");

  // ── Load store info ──
  const cachedStore = loadCache(cacheKey_store);
  let storeName = "Store";

  if (cachedStore) {
    storeName = cachedStore.name || "Store";
    if (sellerNameEl) sellerNameEl.textContent = storeName;
    if (sellerLogoEl) sellerLogoEl.src = cachedStore.logo || "Delight icons/store.png";
  } else {
    try {
      const storeRes  = await fetch(`${API_BASE}/all-stores`);
      const allStores = await storeRes.json();
      const store     = allStores.find(s => s.phone === sellerPhone);
      if (store) {
        storeName = store.name || "Store";
        if (sellerNameEl) sellerNameEl.textContent = storeName;
        if (sellerLogoEl) sellerLogoEl.src = store.logo || "Delight icons/store.png";
        saveCache(cacheKey_store, store);
      } else {
        if (sellerNameEl) sellerNameEl.textContent = "Unknown Seller";
      }
    } catch(e) { if (sellerNameEl) sellerNameEl.textContent = "Store"; }
  }
  if (storeLabel) storeLabel.textContent = storeName + " Products";

  // ── Load Ads ──
  const cachedAds = loadCache(cacheKey_ads);
  if (cachedAds && cachedAds.length > 0) {
    if (adsSkeleton) adsSkeleton.style.display = 'none';
    initSwiper(cachedAds);
  } else {
    if (adsSkeleton) adsSkeleton.style.display = 'block';
    if (adSlider)    adSlider.style.display = 'none';
    try {
      const adsRes = await fetch(`${API_BASE}/admin/ads`);
      const ads    = await adsRes.json();
      const adFilters = [storeName,"Delight.pk1","Delight.pk2","Delight.pk3","Delight.pk4","Delight.pk5","Delight.pk6","Delight.pk7"];
      const matched = adFilters.reduce((arr, f) => {
        const ad = ads.find(a => getAdName(a).toLowerCase() === f.toLowerCase());
        if (ad) arr.push(ad);
        return arr;
      }, []);
      if (adsSkeleton) adsSkeleton.style.display = 'none';
      if (matched.length > 0) { saveCache(cacheKey_ads, matched); initSwiper(matched); }
      else if (adSlider)       adSlider.style.display = 'none';
    } catch(e) {
      if (adsSkeleton) adsSkeleton.style.display = 'none';
      if (adSlider)    adSlider.style.display = 'none';
    }
  }

  // ── Load Products ──
  const cachedProducts = loadCache(cacheKey_products);
  if (cachedProducts) {
    allProducts = cachedProducts;
    hideSkeleton();
    renderProducts(allProducts);
  } else {
    showSkeleton();
    try {
      const res  = await fetch(`${API_BASE}/products`);
      const data = await res.json();
      allProducts = shuffleArray(data.filter(item => item.sellerPhone === sellerPhone));
      saveCache(cacheKey_products, allProducts);
      hideSkeleton();
      if (!allProducts.length) {
        itemContainer.style.display = 'grid';
        itemContainer.innerHTML = `<p style='grid-column:1/-1;text-align:center;padding:40px;color:#777;'>No products in this store yet.</p>`;
        return;
      }
      renderProducts(allProducts);
    } catch(err) {
      hideSkeleton();
      itemContainer.style.display = 'grid';
      itemContainer.innerHTML = `<p style='grid-column:1/-1;text-align:center;padding:40px;color:#777;'>⚠️ Error loading products!</p>`;
    }
  }

  // ── Scroll restore after render ──
  if (savedScroll) {
    sessionStorage.removeItem("dlpk_store_scroll");
    requestAnimationFrame(() => window.scrollTo({ top: parseInt(savedScroll), behavior: "instant" }));
  }
});

// ─── Scroll Save On Leave ──────────────────────────────────────
window.addEventListener("pagehide", () => {
  sessionStorage.setItem("dlpk_store_scroll", String(window.scrollY));
});