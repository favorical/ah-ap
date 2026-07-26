/* =========================================================
   MEŞE ATÖLYE — Ortak Veri Katmanı (Supabase)
   index.html, detay.html ve admin.html tarafından kullanılır.
   Bu dosyadan ÖNCE Supabase CDN script'inin yüklenmiş olması gerekir:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ========================================================= */

const SUPABASE_URL = 'https://vmprdjqtllodupllhiol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wuk4zQJflaZfo3lkVb1a4w_bhwt6i56';

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WHATSAPP_NUMBER = '905551112233';

const icons = {
  table: '<path d="M4 8h16M6 8v10M18 8v10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  'coffee-table': '<rect x="5" y="9" width="14" height="4" rx="1" stroke="currentColor" stroke-width="1.5"/><path d="M7 13v5M17 13v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  shelf: '<path d="M5 6h14M5 12h14M5 18h14M8 6v12M16 6v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  clock: '<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v4l3 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  board: '<rect x="4" y="8" width="16" height="9" rx="4" stroke="currentColor" stroke-width="1.5"/><path d="M17 8V6a1 1 0 0 1 1-1h1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  box: '<path d="M4 8l8-4 8 4-8 4-8-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 8v8l8 4 8-4V8" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 12v8" stroke="currentColor" stroke-width="1.5"/>',
  default: '<path d="M12 3l7 4v10l-7 4-7-4V7l7-4z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M12 12v9M5 7l7 5 7-5" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>'
};

function iconSvg(key, sizeClass) {
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${sizeClass} text-clay/70" viewBox="0 0 24 24" fill="none">${icons[key] || icons.default}</svg>`;
}

function formatPrice(n) {
  return Number(n).toLocaleString('tr-TR') + ' ₺';
}

function slugify(text) {
  const map = { 'ç':'c','Ç':'c','ğ':'g','Ğ':'g','ı':'i','İ':'i','ö':'o','Ö':'o','ş':'s','Ş':'s','ü':'u','Ü':'u' };
  return text.replace(/[çÇğĞıİöÖşŞüÜ]/g, m => map[m]).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Kullanıcı/admin tarafından girilen metinleri innerHTML içine
 * güvenli şekilde yerleştirmek için HTML özel karakterlerini escape eder.
 * XSS (Cross-Site Scripting) saldırılarına karşı birincil savunma hattıdır.
 * KURAL: Bir değişken template literal (`${...}`) içinde innerHTML'e
 * yazılıyorsa ve kullanıcı girdisi (ürün başlığı, açıklama, özellik vb.)
 * içeriyorsa MUTLAKA escapeHTML() ile sarmalanmalıdır.
 */
function escapeHTML(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---- Supabase satırı <-> Uygulama ürün nesnesi dönüşümleri ---- */
function rowToProduct(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    price: row.price,
    icon: row.icon,
    images: row.image_urls || [],
    shortDesc: row.short_desc,
    longDesc: row.long_desc,
    specs: row.specs || []
  };
}

function productToRow(product) {
  return {
    title: product.title,
    category: product.category,
    price: product.price,
    icon: product.icon,
    image_urls: product.images || [],
    short_desc: product.shortDesc,
    long_desc: product.longDesc,
    specs: product.specs || []
  };
}

/** Sadece ilk görseli (ya da yoksa ikonu) gösteren basit HTML — küçük thumbnail'ler için. */
function productThumbnailHtml(p, iconSizeClass) {
  const first = (p.images && p.images[0]) || null;
  if (first) {
    return `<img src="${escapeHTML(first)}" alt="${escapeHTML(p.title)}" class="w-full h-full object-cover" loading="lazy">`;
  }
  return iconSvg(p.icon, iconSizeClass);
}

/**
 * Ürün için ana görsel alanını oluşturur: birden fazla görsel varsa
 * ok butonlu + noktalı bir carousel, tek görsel varsa düz görsel,
 * hiç görsel yoksa ikon döner.
 * Dönen { html, images } değerindeki images.length > 1 ise, DOM'a
 * eklendikten sonra attachCarouselHandlers(container) çağrılmalıdır.
 */
function renderProductVisual(p, iconSizeClass) {
  const images = p.images || [];

  if (images.length === 0) {
    return { html: iconSvg(p.icon, iconSizeClass), images: [] };
  }

  const dots = images.length > 1
    ? `<div class="carousel-dots absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">${images.map((_, i) => `<span class="w-1.5 h-1.5 rounded-full transition-colors ${i === 0 ? 'bg-white' : 'bg-white/40'}"></span>`).join('')}</div>`
    : '';

  const arrows = images.length > 1 ? `
    <button type="button" class="carousel-prev absolute left-2 top-1/2 -translate-y-1/2 bg-ink/50 hover:bg-ink/75 text-white w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors" aria-label="Önceki görsel">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
    </button>
    <button type="button" class="carousel-next absolute right-2 top-1/2 -translate-y-1/2 bg-ink/50 hover:bg-ink/75 text-white w-7 h-7 rounded-full flex items-center justify-center z-10 transition-colors" aria-label="Sonraki görsel">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
    </button>` : '';

  const html = `
    <div class="product-carousel relative w-full h-full">
      <img data-carousel-img src="${escapeHTML(images[0])}" alt="${escapeHTML(p.title)}" class="w-full h-full object-cover">
      ${arrows}
      ${dots}
    </div>`;

  return { html, images };
}

/** renderProductVisual ile oluşturulan bir carousel'e ok/nokta olaylarını, tıkla-yakınlaştır ve dokunmatik kaydırma (swipe) özelliğini bağlar. */
function attachCarouselHandlers(container, images) {
  const carousel = container.querySelector('.product-carousel');
  if (!carousel || images.length === 0) return;

  let index = 0;
  const imgEl = carousel.querySelector('[data-carousel-img]');
  const dots = carousel.querySelectorAll('.carousel-dots span');

  function show(i) {
    index = (i + images.length) % images.length;
    imgEl.src = images[index];
    dots.forEach((d, di) => {
      d.classList.toggle('bg-white', di === index);
      d.classList.toggle('bg-white/40', di !== index);
    });
  }

  const prevBtn = carousel.querySelector('.carousel-prev');
  const nextBtn = carousel.querySelector('.carousel-next');
  if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); show(index - 1); });
  if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); show(index + 1); });

  imgEl.style.cursor = 'zoom-in';
  imgEl.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLightbox(images, index);
  });

  /* ---- Mobil: parmakla sola/sağa kaydırarak görsel değiştirme ---- */
  if (images.length > 1) {
    let touchStartX = 0;
    let touchStartY = 0;

    carousel.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    carousel.addEventListener('touchend', (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchStartX;
      const dy = touch.clientY - touchStartY;
      // Sadece belirgin şekilde yatay bir kaydırmaysa görsel değiştir
      // (dikey kaydırma sayfa scrollu ile karışmasın diye hariç tutulur)
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) show(index + 1);
        else show(index - 1);
      }
    }, { passive: true });
  }
}

/**
 * Bir dosyayı 'product-images' bucket'ına yükler ve genel (public) URL'sini döner.
 * Hata olursa null döner ve kullanıcıya alert gösterir.
 */
async function uploadProductImage(file, idHint) {
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${idHint || 'urun'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: uploadError } = await sbClient
      .storage
      .from('product-images')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      console.error('Görsel yüklenemedi:', uploadError);
      alert('Görsel yüklenemedi: ' + uploadError.message);
      return null;
    }

    const { data } = sbClient.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('Görsel yükleme hatası:', e);
    alert('Görsel yüklenirken beklenmeyen bir hata oluştu.');
    return null;
  }
}

/** Tüm ürünleri Supabase'den çeker. */
async function fetchProducts() {
  const { data, error } = await sbClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Ürünler alınamadı:', error);
    alert('Ürünler yüklenirken bir hata oluştu: ' + error.message);
    return [];
  }
  return (data || []).map(rowToProduct);
}

/** Tek bir ürünü id'sine göre çeker. */
async function fetchProductById(id) {
  const { data, error } = await sbClient
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Ürün alınamadı:', error);
    return null;
  }
  return data ? rowToProduct(data) : null;
}

/** Yeni ürün ekler. product nesnesinde id de bulunmalıdır. */
async function insertProduct(product) {
  const row = { id: product.id, ...productToRow(product) };
  const { error } = await sbClient.from('products').insert(row);
  if (error) {
    console.error('Ürün eklenemedi:', error);
    alert('Ürün eklenemedi: ' + error.message);
    return false;
  }
  return true;
}

/** Var olan bir ürünü günceller. */
async function updateProductById(id, product) {
  const row = productToRow(product);
  const { error } = await sbClient.from('products').update(row).eq('id', id);
  if (error) {
    console.error('Ürün güncellenemedi:', error);
    alert('Ürün güncellenemedi: ' + error.message);
    return false;
  }
  return true;
}

/** Bir ürünü siler. */
async function deleteProductById(id) {
  const { error } = await sbClient.from('products').delete().eq('id', id);
  if (error) {
    console.error('Ürün silinemedi:', error);
    alert('Ürün silinemedi: ' + error.message);
    return false;
  }
  return true;
}

/* =========================================================
   LIGHTBOX — Tam ekran görsel yakınlaştırma
   Ürün görsellerine tıklandığında açılır. Masaüstünde tıklayarak
   veya fare tekerleğiyle, mobilde iki parmakla (pinch) ya da
   çift dokunarak yakınlaştırma yapılabilir. Yakınlaştırıldığında
   sürükleyerek gezinilebilir.
   ========================================================= */

let lightboxImages = [];
let lightboxIndex = 0;
let lightboxScale = 1;
let lightboxPanX = 0;
let lightboxPanY = 0;
let lightboxDragging = false;
let lightboxDragMoved = false;
let lightboxDragStartX = 0;
let lightboxDragStartY = 0;
let lightboxPanStartX = 0;
let lightboxPanStartY = 0;
let lightboxPinchStartDist = 0;
let lightboxPinchStartScale = 1;
let lightboxLastTapTime = 0;

function initLightbox() {
  if (document.getElementById('lightboxOverlay')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <div id="lightboxOverlay" class="fixed inset-0 z-[999] bg-ink/95 hidden items-center justify-center">
      <button id="lightboxClose" type="button" aria-label="Kapat" class="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/80 hover:text-white w-10 h-10 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      <button id="lightboxPrev" type="button" aria-label="Önceki görsel" class="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
      </button>
      <button id="lightboxNext" type="button" aria-label="Sonraki görsel" class="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white/80 hover:text-white w-11 h-11 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors z-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
      </button>
      <div id="lightboxImgWrap" class="w-full h-full flex items-center justify-center overflow-hidden">
        <img id="lightboxImg" src="" alt="" draggable="false" class="max-w-[92vw] max-h-[85vh] select-none transition-transform duration-150 ease-out">
      </div>
      <div id="lightboxDots" class="absolute bottom-16 sm:bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10"></div>
      <p class="hidden sm:block absolute bottom-6 right-6 text-white/40 text-xs z-10">Yakınlaştırmak için tıklayın, kaydırın veya sürükleyin</p>
    </div>
  `);

  const overlay = document.getElementById('lightboxOverlay');
  const imgWrap = document.getElementById('lightboxImgWrap');
  const imgEl = document.getElementById('lightboxImg');

  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', () => lightboxShow(lightboxIndex - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => lightboxShow(lightboxIndex + 1));

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (overlay.classList.contains('hidden')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') lightboxShow(lightboxIndex - 1);
    if (e.key === 'ArrowRight') lightboxShow(lightboxIndex + 1);
  });

  // Tıklayarak yakınlaştır / uzaklaştır (sürükleme sonrası tıklamayı yok say)
  imgEl.addEventListener('click', (e) => {
    e.stopPropagation();
    if (lightboxDragMoved) { lightboxDragMoved = false; return; }
    toggleLightboxZoom();
  });

  // Fare tekerleği ile yakınlaştırma
  imgWrap.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.3 : 0.3;
    setLightboxScale(lightboxScale + delta);
  }, { passive: false });

  // Fare ile sürükleyerek gezinme (yakınlaştırılmışken)
  imgWrap.addEventListener('mousedown', (e) => {
    if (lightboxScale <= 1) return;
    lightboxDragging = true;
    lightboxDragMoved = false;
    lightboxDragStartX = e.clientX;
    lightboxDragStartY = e.clientY;
    lightboxPanStartX = lightboxPanX;
    lightboxPanStartY = lightboxPanY;
  });
  window.addEventListener('mousemove', (e) => {
    if (!lightboxDragging) return;
    const dx = e.clientX - lightboxDragStartX;
    const dy = e.clientY - lightboxDragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) lightboxDragMoved = true;
    lightboxPanX = lightboxPanStartX + dx;
    lightboxPanY = lightboxPanStartY + dy;
    applyLightboxTransform();
  });
  window.addEventListener('mouseup', () => { lightboxDragging = false; });

  // Mobil: iki parmakla yakınlaştırma (pinch) ve tek parmakla gezinme
  imgWrap.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      lightboxPinchStartDist = getTouchDistance(e.touches);
      lightboxPinchStartScale = lightboxScale;
    } else if (e.touches.length === 1 && lightboxScale > 1) {
      lightboxDragging = true;
      lightboxDragStartX = e.touches[0].clientX;
      lightboxDragStartY = e.touches[0].clientY;
      lightboxPanStartX = lightboxPanX;
      lightboxPanStartY = lightboxPanY;
    }
  }, { passive: true });

  imgWrap.addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const dist = getTouchDistance(e.touches);
      setLightboxScale(lightboxPinchStartScale * (dist / lightboxPinchStartDist));
    } else if (e.touches.length === 1 && lightboxDragging) {
      e.preventDefault();
      lightboxPanX = lightboxPanStartX + (e.touches[0].clientX - lightboxDragStartX);
      lightboxPanY = lightboxPanStartY + (e.touches[0].clientY - lightboxDragStartY);
      applyLightboxTransform();
    }
  }, { passive: false });

  imgWrap.addEventListener('touchend', (e) => {
    if (e.touches.length === 0) lightboxDragging = false;
  });

  // Mobil: çift dokunarak yakınlaştır / uzaklaştır
  imgEl.addEventListener('touchend', () => {
    const now = Date.now();
    if (now - lightboxLastTapTime < 300) toggleLightboxZoom();
    lightboxLastTapTime = now;
  });
}

function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function setLightboxScale(newScale) {
  lightboxScale = Math.min(4, Math.max(1, newScale));
  if (lightboxScale === 1) { lightboxPanX = 0; lightboxPanY = 0; }
  applyLightboxTransform();
}

function toggleLightboxZoom() {
  setLightboxScale(lightboxScale > 1 ? 1 : 2.2);
}

function applyLightboxTransform() {
  const imgEl = document.getElementById('lightboxImg');
  imgEl.style.transform = `translate(${lightboxPanX}px, ${lightboxPanY}px) scale(${lightboxScale})`;
  imgEl.style.cursor = lightboxScale > 1 ? 'grab' : 'zoom-in';
}

function renderLightboxNav() {
  const prevBtn = document.getElementById('lightboxPrev');
  const nextBtn = document.getElementById('lightboxNext');
  const dotsEl = document.getElementById('lightboxDots');
  const multi = lightboxImages.length > 1;
  prevBtn.classList.toggle('hidden', !multi);
  nextBtn.classList.toggle('hidden', !multi);
  dotsEl.innerHTML = multi
    ? lightboxImages.map((_, i) => `<span class="w-2 h-2 rounded-full ${i === lightboxIndex ? 'bg-white' : 'bg-white/40'}"></span>`).join('')
    : '';
}

function lightboxShow(i) {
  lightboxIndex = (i + lightboxImages.length) % lightboxImages.length;
  document.getElementById('lightboxImg').src = lightboxImages[lightboxIndex];
  setLightboxScale(1);
  renderLightboxNav();
}

/** Tam ekran görsel görüntüleyiciyi açar. images: URL dizisi, startIndex: başlangıç görseli. */
function openLightbox(images, startIndex) {
  if (!images || images.length === 0) return;
  initLightbox();
  lightboxImages = images;
  lightboxShow(startIndex || 0);
  const overlay = document.getElementById('lightboxOverlay');
  overlay.classList.remove('hidden');
  overlay.classList.add('flex');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const overlay = document.getElementById('lightboxOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  document.body.style.overflow = '';
}
