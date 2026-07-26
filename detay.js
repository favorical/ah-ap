/* =========================================================
   MEŞE ATÖLYE — detay.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.
   Kullanım: detay.html?id=p1
   ========================================================= */

const breadcrumb = document.getElementById('detailBreadcrumb');
const content = document.getElementById('detailContent');
const related = document.getElementById('detailRelated');

function renderNotFound() {
  breadcrumb.innerHTML = '';
  content.innerHTML = `
    <div class="text-center py-20">
      <h1 class="font-display text-2xl text-walnut mb-3">Ürün bulunamadı</h1>
      <p class="text-walnutlight mb-6">Aradığınız ürün kaldırılmış ya da bağlantı hatalı olabilir.</p>
      <a href="index.html#urunler" class="bg-walnut text-paper px-6 py-3 rounded-full font-medium">Kataloğa Dön</a>
    </div>`;
  related.innerHTML = '';
}

async function init() {
  const params = new URLSearchParams(window.location.search);
  const productId = params.get('id');

  if (!productId) {
    renderNotFound();
    return;
  }

  const [product, allProducts] = await Promise.all([
    fetchProductById(productId),
    fetchProducts()
  ]);

  if (!product) {
    renderNotFound();
    return;
  }

  document.title = product.title + ' | Meşe Atölye';

  breadcrumb.innerHTML = `
    <a href="index.html" class="hover:text-clay">Ana Sayfa</a>
    <span>/</span>
    <a href="index.html#urunler" class="hover:text-clay">Ürünlerimiz</a>
    <span>/</span>
    <span class="text-walnut">${product.title}</span>
  `;

  const waMsg = encodeURIComponent(`Merhaba, "${product.title}" ürününü sipariş etmek istiyorum.`);
  const specsHtml = (product.specs || []).map(s => `
    <li class="flex items-start gap-2 text-sm text-walnutlight">
      <svg class="w-4 h-4 mt-0.5 text-sage shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
      ${s}
    </li>`).join('');

  content.innerHTML = `
    <div class="grid md:grid-cols-2 gap-12 items-start">
      <div class="grain-bg bg-cream rounded-2xl border border-walnut/10 h-80 md:h-[420px] flex items-center justify-center">
        ${iconSvg(product.icon, 'w-32 h-32')}
      </div>
      <div>
        <span class="text-xs uppercase tracking-widest text-sage font-medium">${product.category === 'mobilya' ? 'Mobilya' : 'Hediyelik Eşya'}</span>
        <h1 class="font-display text-3xl sm:text-4xl text-walnut mt-2 mb-4">${product.title}</h1>
        <p class="font-display text-2xl text-clay mb-6">${formatPrice(product.price)}</p>
        <p class="text-walnutlight leading-relaxed mb-6">${product.shortDesc}</p>
        ${product.longDesc ? `<p class="text-walnutlight leading-relaxed mb-6">${product.longDesc}</p>` : ''}
        ${specsHtml ? `<ul class="flex flex-col gap-2 mb-8">${specsHtml}</ul>` : ''}
        <div class="flex flex-col sm:flex-row gap-3">
          <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${waMsg}" target="_blank" rel="noopener" class="bg-[#25D366] text-white text-center px-6 py-3.5 rounded-full font-medium hover:brightness-95 transition">WhatsApp'tan Sipariş Et</a>
          <a href="index.html#urunler" class="border border-walnut/25 text-walnut text-center px-6 py-3.5 rounded-full font-medium hover:border-clay hover:text-clay transition-colors">Diğer Ürünlere Dön</a>
        </div>
      </div>
    </div>
  `;

  const relatedItems = allProducts.filter(p => p.category === product.category && p.id !== product.id).slice(0, 3);
  if (relatedItems.length > 0) {
    related.innerHTML = `
      <h2 class="font-display text-2xl text-walnut mb-6">Benzer Ürünler</h2>
      <div class="grid sm:grid-cols-3 gap-6">
        ${relatedItems.map(p => `
          <a href="detay.html?id=${encodeURIComponent(p.id)}" class="card-lift block bg-paper border border-walnut/10 rounded-2xl overflow-hidden">
            <div class="h-32 grain-bg bg-cream flex items-center justify-center border-b border-walnut/10">
              ${iconSvg(p.icon, 'w-10 h-10')}
            </div>
            <div class="p-4">
              <h3 class="font-display text-base text-walnut mb-1">${p.title}</h3>
              <span class="text-clay text-sm">${formatPrice(p.price)}</span>
            </div>
          </a>
        `).join('')}
      </div>
    `;
  } else {
    related.innerHTML = '';
  }
}

init();
