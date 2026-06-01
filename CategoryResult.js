document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("itemContainer");
  const loading = document.getElementById("loading");
  const title = document.getElementById("categoryTitle");

  // Get category name from URL
  const params = new URLSearchParams(window.location.search);
  const categoryName = params.get("category") || "Category";

  // Extract only Subcategory for display title (last part after " - ")
  const displayTitle = categoryName.includes(" - ")
    ? categoryName.split(" - ").pop().trim()
    : categoryName.trim();

  title.textContent = displayTitle;

  // Increment View Count
  async function incrementView(productId) {
    try {
      await fetch(`https://delight-backend--araindaniyalo2.replit.app/products/${productId}/view`, { method: "POST" });
    } catch (err) {
      console.error("View count error:", err);
    }
  }

  // Fetch products
  try {
    const res = await fetch("https://delight-backend--araindaniyalo2.replit.app/products");
    const data = await res.json();

    console.log("Total products loaded:", data.length);
    console.log("Searching for category:", categoryName);

    // Filter by category - check if product.category contains the URL category
    const filteredItems = data.filter(item => {
      const itemCategory = (item.category || "").toLowerCase();
      const searchTerm = categoryName.toLowerCase().trim();
      return itemCategory.includes(searchTerm);
    });

    console.log("Filtered items found:", filteredItems.length);

    if (filteredItems.length === 0) {
      container.innerHTML = `
        <div class="not-found" style="grid-column: 1 / -1; text-align: center; padding: 50px 20px;">
          <img src="Delight icons/not-found.png" alt="No Results" style="width:180px; opacity:0.8; margin-bottom: 14px;">
          <h3 style="font-size: 18px; font-weight: 800; color: #ff6b00; margin-bottom: 6px;">Oops! No Items Found</h3>
          <p style="color: #555577; font-size: 14px;">Try another category.</p>
        </div>`;
      if (loading) loading.style.display = "none";
      return;
    }

    renderItems(filteredItems);
  } catch (err) {
    console.error("Error fetching products:", err);
    container.innerHTML = "<p style='text-align:center; padding: 20px;'>Unable to load products. Check internet connection.</p>";
  } finally {
    if (loading) loading.style.display = "none";
  }

  // Render Items with proper card structure matching Home.css
  function renderItems(items) {
    container.innerHTML = "";

    items.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "item-card";

      // Animation delay for staggered effect
      card.style.animationDelay = `${(index % 10) * 40}ms`;

      // Parse price & discount
      const basePrice = parseInt(item.price?.toString().replace(/[^\d]/g, "")) || 0;
      const discount = parseInt(item.discount?.toString().replace(/[^\d]/g, "")) || 0;
      const finalPrice = Math.max(basePrice - discount, 0);

      // Get image
      const img = item.images?.[0] || item.image || 'https://via.placeholder.com/150';

      card.innerHTML = `
        <div class="card-img-wrap">
          <img src="${img}" alt="${item.title || ''}" loading="lazy">
        </div>
        <div class="card-body">
          <h3>${item.title || ''}</h3>
          <p class="price-wrapper">
            <span class="new-price"><span class="rs">Rs.</span><strong>${finalPrice}</strong></span>
            ${discount > 0 ? `<span class="old-price-inline">Rs. ${basePrice}</span>` : ''}
          </p>
        </div>`;

      card.addEventListener("click", () => {
        incrementView(item.id);
        const productData = { ...item, finalPrice, originalPrice: basePrice };
        localStorage.setItem("selectedItem", JSON.stringify(productData));
        window.location.href = "itemDetails.html";
      });

      container.appendChild(card);
    });

    // Trigger scroll reveal animation
    setupScrollReveal();
  }

  // Scroll reveal animation
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
});
