/* =========================================================
   MEŞE ATÖLYE — index.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.
   ========================================================= */

let allProducts = [];
let currentFilter = 'all';

/* ---- Mobil menü ---- */
const menuBtn = document.getElementById('menuBtn');
const mobileMenu = document.getElementById('mobileMenu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('open'));
mobileMenu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mobileMenu.classList.remove('open')));

/* ---- Ürün ızgarası ---- */
const grid = document.getElementById('productGrid');

function renderProductGrid() {
  const items = allProducts.filter(p => currentFilter === 'all' || p.category === currentFilter);
  grid.innerHTML = '';

  if (items.length === 0) {
    grid.innerHTML = '<p class="col-span-full text-center text-walnutlight py-10">Bu kategoride henüz ürün yok.</p>';
    return;
  }

  items.forEach(p => {
    const waMsg = encodeURIComponent(`Merhaba, "${p.title}" ürünü hakkında bilgi almak istiyorum.`);
    const card = document.createElement('article');
    card.className = 'card-lift bg-paper border border-walnut/10 rounded-2xl overflow-hidden flex flex-col';
    card.innerHTML = `
      <div class="h-48 ${p.imageUrl ? 'bg-cream' : 'grain-bg bg-cream'} flex items-center justify-center border-b border-walnut/10 overflow-hidden">
        ${productVisualHtml(p, 'w-16 h-16')}
      </div>
      <div class="p-6 flex flex-col flex-1">
        <span class="text-xs uppercase tracking-widest text-sage font-medium mb-2">${p.category === 'mobilya' ? 'Mobilya' : 'Hediyelik Eşya'}</span>
        <h3 class="font-display text-xl text-walnut mb-2">${p.title}</h3>
        <p class="text-sm text-walnutlight leading-relaxed flex-1">${p.shortDesc}</p>
        <div class="flex items-center justify-between mt-5 mb-4">
          <span class="font-display text-lg text-clay">${formatPrice(p.price)}</span>
        </div>
        <div class="flex flex-col gap-2">
          <a href="detay.html?id=${encodeURIComponent(p.id)}" class="border border-walnut/25 text-walnut text-sm font-medium text-center py-2.5 rounded-full hover:border-clay hover:text-clay transition-colors">Detaylı İncele</a>
          <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}" target="_blank" rel="noopener" class="bg-[#25D366] text-white text-sm font-medium text-center py-2.5 rounded-full hover:brightness-95 transition">WhatsApp'tan Sipariş Et</a>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderProductGrid();
  });
});

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
(async function init() {
  allProducts = await fetchProducts();
  renderProductGrid();
})();
