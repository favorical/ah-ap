/* =========================================================
   KILIÇARSLAN MOBİLYA — index.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.

   Tüm durum (state) bir IIFE (Immediately Invoked Function
   Expression) içine alınmıştır; bu sayede loadedProducts,
   pageOffset, currentFilter gibi değişkenler global `window`
   nesnesine sızmaz ve diğer script'lerle (detay.js, admin.js
   ya da ileride eklenecek üçüncü parti kodlarla) çakışmaz.
   products.js'teki paylaşılan fonksiyonlar (fetchProductsPage,
   addToCart, sanitizeText vb.) kasıtlı olarak global bırakıldı;
   bu IIFE onları normal şekilde okuyabilir.
   ========================================================= */
(function () {
  const PAGE_SIZE = 12;

  let currentFilter = 'all';
  let searchQuery = '';
  let loadedProducts = [];
  let pageOffset = 0;
  let hasMorePages = true;
  let isLoadingMore = false;
  let searchDebounceTimer = null;

  /* ---- Mobil menü ---- */
  const menuBtn = document.getElementById('menuBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
  mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

  /* ---- Ürün ızgarası ---- */
  const grid = document.getElementById('productGrid');
  const loadMoreBtn = document.getElementById('loadMoreBtn');
  const loadMoreWrap = document.getElementById('loadMoreWrap');

  function renderProductGrid() {
    grid.innerHTML = '';

    if (loadedProducts.length === 0) {
      grid.innerHTML = `<p class="col-span-full text-center text-walnutlight py-10">${searchQuery.trim() ? 'Aramanızla eşleşen ürün bulunamadı.' : 'Bu kategoride henüz ürün yok.'}</p>`;
      return;
    }

    loadedProducts.forEach(p => {
      const waMsg = encodeURIComponent(`Merhaba, "${p.title}" ürünü hakkında bilgi almak istiyorum.`);
      const visual = renderProductVisual(p, 'w-16 h-16');
      const card = document.createElement('article');
      card.className = 'card-lift bg-paper border border-walnut/10 rounded-2xl overflow-hidden flex flex-col';
      card.innerHTML = `
        <div class="h-48 ${visual.images.length ? 'bg-cream' : 'grain-bg bg-cream'} flex items-center justify-center border-b border-walnut/10 overflow-hidden">
          ${visual.html}
        </div>
        <div class="p-6 flex flex-col flex-1">
          <span class="text-xs uppercase tracking-widest text-sage font-medium mb-2">${p.category === 'mobilya' ? 'Mobilya' : 'Hediyelik Eşya'}</span>
          <h3 class="font-display text-xl text-walnut mb-2">${sanitizeText(p.title)}</h3>
          <p class="text-sm text-walnutlight leading-relaxed flex-1">${sanitizeText(p.shortDesc)}</p>
          <div class="flex items-center justify-between mt-5 mb-4">
            <span class="font-display text-lg text-clay">${formatPrice(p.price)}</span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <button type="button" class="add-to-cart-btn bg-walnut text-paper text-sm font-medium text-center py-2.5 rounded-full hover:bg-sagedark transition-colors">Sepete Ekle</button>
            <a href="detay.html?id=${encodeURIComponent(p.id)}" class="border border-walnut/25 text-walnut text-sm font-medium text-center py-2.5 rounded-full hover:border-clay hover:text-clay transition-colors">Detaylı İncele</a>
          </div>
          <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}" target="_blank" rel="noopener" class="mt-2 bg-[#25D366] text-white text-sm font-medium text-center py-2.5 rounded-full hover:brightness-95 transition">WhatsApp'tan Sipariş Et</a>
        </div>
      `;
      card.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(p));
      grid.appendChild(card);
      attachCarouselHandlers(card, visual.images);
    });
  }

  function updateLoadMoreUI() {
    const searching = searchQuery.trim().length > 0;
    if (searching || !hasMorePages) {
      loadMoreWrap.classList.add('hidden');
      return;
    }
    loadMoreWrap.classList.remove('hidden');
    loadMoreBtn.disabled = isLoadingMore;
    loadMoreBtn.textContent = isLoadingMore ? 'Yükleniyor...' : 'Daha Fazla Yükle';
  }

  async function loadAndRender(reset) {
    if (reset) {
      pageOffset = 0;
      loadedProducts = [];
      hasMorePages = true;
    }
    if (isLoadingMore || (!hasMorePages && !reset)) return;

    isLoadingMore = true;
    updateLoadMoreUI();
    if (reset) {
      grid.innerHTML = '<div class="col-span-full flex justify-center py-14"><div class="spinner"></div></div>';
    }

    const q = searchQuery.trim();

    if (q) {
      // Arama sonuçları sunucu tarafında (Supabase ILIKE + .range()) sınırlı sayıda getirilir.
      loadedProducts = await searchProductsRemote(q, currentFilter);
      hasMorePages = false;
    } else {
      const newItems = await fetchProductsPage({ offset: pageOffset, limit: PAGE_SIZE, category: currentFilter });
      loadedProducts = reset ? newItems : [...loadedProducts, ...newItems];
      pageOffset += PAGE_SIZE;
      hasMorePages = newItems.length === PAGE_SIZE;
    }

    isLoadingMore = false;
    renderProductGrid();
    updateLoadMoreUI();
  }

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      loadAndRender(true);
    });
  });

  loadMoreBtn.addEventListener('click', () => loadAndRender(false));

  /* ---- Canlı arama (300ms gecikmeli — her tuş vuruşunda sunucuya gitmesin) ---- */
  const searchInput = document.getElementById('searchInput');
  const searchClearBtn = document.getElementById('searchClear');

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      searchClearBtn.classList.toggle('hidden', searchQuery.length === 0);
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => loadAndRender(true), 300);
    });

    searchClearBtn.addEventListener('click', () => {
      clearTimeout(searchDebounceTimer);
      searchQuery = '';
      searchInput.value = '';
      searchClearBtn.classList.add('hidden');
      searchInput.focus();
      loadAndRender(true);
    });
  }

  /* ---- Scroll reveal ---- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  /* ---- Başlangıç ---- */
  loadAndRender(true);
})();
