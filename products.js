/* =========================================================
   KILIÇARSLAN MOBİLYA — Ortak Veri Katmanı (Supabase)
   index.html, detay.html ve admin.html tarafından kullanılır.
   Bu dosyadan ÖNCE şu script'lerin yüklenmiş olması gerekir:
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   <script src="https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js"></script>
   ========================================================= */

const SUPABASE_URL = 'https://vmprdjqtllodupllhiol.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_wuk4zQJflaZfo3lkVb1a4w_bhwt6i56';

const sbClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/* Tek doğru kaynak (single source of truth): WhatsApp numarası SADECE burada
   tanımlanır. HTML'deki statik linkler data-wa-link ile işaretlenip
   initStaticWhatsAppLinks() tarafından bu sabitten doldurulur; main.js/detay.js
   içindeki dinamik linkler de doğrudan bu değişkeni kullanır. */
const WHATSAPP_NUMBER = '905074560303';

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
 * Kullanıcı/admin tarafından girilen metinleri innerHTML içine güvenli
 * şekilde yerleştirmek için endüstri standardı DOMPurify kütüphanesiyle
 * temizler (sanitize). XSS (Cross-Site Scripting) saldırılarına karşı
 * birincil savunma hattıdır. ALLOWED_TAGS/ALLOWED_ATTR boş bırakılarak
 * tüm HTML etiketleri ve öznitelikleri kaldırılır, yalnızca düz metin kalır.
 * KURAL: Bir değişken template literal (`${...}`) içinde innerHTML'e
 * yazılıyorsa ve kullanıcı girdisi (ürün başlığı, açıklama, özellik vb.)
 * içeriyorsa MUTLAKA sanitizeText() ile sarmalanmalıdır.
 */
function sanitizeText(value) {
  if (value === null || value === undefined) return '';
  return DOMPurify.sanitize(String(value), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
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
    return `<img src="${sanitizeText(first)}" alt="${sanitizeText(p.title)}" class="w-full h-full object-cover" loading="lazy">`;
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
      <img data-carousel-img src="${sanitizeText(images[0])}" alt="${sanitizeText(p.title)}" class="w-full h-full object-cover" loading="lazy">
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

/* =========================================================
   GÖRSEL SIKIŞTIRMA (Canvas API)
   uploadProductImage() tarafından otomatik olarak kullanılır.
   Yüklenen görseller Supabase'e gönderilmeden önce tarayıcıda
   sıkıştırılır: genişlik en fazla 1200px'e indirilir ve
   %80 kalitede WebP formatına dönüştürülür.
   ========================================================= */

/** Bir File/Blob'u <img> ya da ImageBitmap olarak yükler (tarayıcı desteğine göre). */
function loadImageSource(file) {
  if (window.createImageBitmap) {
    return createImageBitmap(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => { resolve(img); URL.revokeObjectURL(url); };
    img.onerror = (err) => { URL.revokeObjectURL(url); reject(err); };
    img.src = url;
  });
}

/**
 * Görseli en fazla maxWidth genişliğe küçültüp WebP'ye çevirir.
 * Sıkıştırma başarısız olursa (ör. tarayıcı WebP desteklemiyorsa)
 * orijinal dosyayı olduğu gibi döner — böylece yükleme hiçbir
 * zaman tamamen başarısız olmaz.
 */
async function compressImage(file, maxWidth = 1200, quality = 0.8) {
  try {
    const source = await loadImageSource(file);
    const sourceWidth = source.width;
    const sourceHeight = source.height;

    const scale = Math.min(1, maxWidth / sourceWidth);
    const targetWidth = Math.round(sourceWidth * scale);
    const targetHeight = Math.round(sourceHeight * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/webp', quality);
    });

    if (!blob) {
      console.warn('Tarayıcı WebP dönüşümünü desteklemiyor, orijinal dosya kullanılacak.');
      return file;
    }

    const newName = file.name.replace(/\.[^./\\]+$/, '') + '.webp';
    return new File([blob], newName, { type: 'image/webp' });
  } catch (e) {
    console.warn('Görsel sıkıştırılamadı, orijinal dosya kullanılacak.', e);
    return file;
  }
}

/**
 * Bir görseli sıkıştırıp (Canvas API + WebP, bkz. compressImage) 'product-images'
 * bucket'ına yükler ve genel (public) URL'sini döner. Sıkıştırma bu fonksiyonun
 * içinde otomatik yapılır — çağıran kod (admin.js) bunu ayrıca yapmak zorunda
 * değildir. Hata olursa null döner ve kullanıcıya toast bildirimi gösterir.
 */
async function uploadProductImage(file, idHint) {
  try {
    const compressed = await compressImage(file);
    const ext = (compressed.name.split('.').pop() || 'webp').toLowerCase();
    const path = `${idHint || 'urun'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const { error: uploadError } = await sbClient
      .storage
      .from('product-images')
      .upload(path, compressed, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      console.error('Görsel yüklenemedi:', uploadError);
      showToast('Görsel yüklenemedi: ' + uploadError.message, 'error');
      return null;
    }

    const { data } = sbClient.storage.from('product-images').getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error('Görsel yükleme hatası:', e);
    showToast('Görsel yüklenirken beklenmeyen bir hata oluştu.', 'error');
    return null;
  }
}

/** Tüm ürünleri Supabase'den çeker. (Admin paneli ve "benzer ürünler" için.) */
async function fetchProducts() {
  const { data, error } = await sbClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Ürünler alınamadı:', error);
    showToast('Ürünler yüklenirken bir hata oluştu: ' + error.message, 'error');
    return [];
  }
  return (data || []).map(rowToProduct);
}

/**
 * Ürünleri sayfalayarak (pagination) çeker — vitrin/kategori sayfaları için.
 * Ürün sayısı arttıkça tüm kataloğu tek seferde çekmek yerine bu kullanılmalı.
 */
async function fetchProductsPage({ offset = 0, limit = 12, category = 'all' } = {}) {
  let query = sbClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    console.error('Ürünler alınamadı:', error);
    showToast('Ürünler yüklenirken bir hata oluştu: ' + error.message, 'error');
    return [];
  }
  return (data || []).map(rowToProduct);
}

/**
 * Başlık/kısa açıklamada arama yapar — sunucu tarafında (Supabase ILIKE) çalışır.
 * Performans için sonuçlar .range() ile sınırlandırılır (varsayılan: ilk 20 eşleşme);
 * bu sayede geniş bir kataloğa karşı sınırsız bir sonuç kümesi dönmez.
 */
async function searchProductsRemote(searchTerm, category = 'all', { offset = 0, limit = 20 } = {}) {
  // .or() filtresinin sözdizimini bozabilecek karakterleri (virgül, parantez) temizle
  const safeTerm = searchTerm.replace(/[,()]/g, ' ').trim();
  if (!safeTerm) return [];

  let query = sbClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: true })
    .or(`title.ilike.%${safeTerm}%,short_desc.ilike.%${safeTerm}%`)
    .range(offset, offset + limit - 1);

  if (category !== 'all') query = query.eq('category', category);

  const { data, error } = await query;
  if (error) {
    console.error('Arama başarısız:', error);
    showToast('Arama sırasında bir hata oluştu: ' + error.message, 'error');
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
    showToast('Ürün eklenemedi: ' + error.message, 'error');
    return false;
  }
  showToast('Ürün başarıyla eklendi.', 'success');
  return true;
}

/** Var olan bir ürünü günceller. */
async function updateProductById(id, product) {
  const row = productToRow(product);
  const { error } = await sbClient.from('products').update(row).eq('id', id);
  if (error) {
    console.error('Ürün güncellenemedi:', error);
    showToast('Ürün güncellenemedi: ' + error.message, 'error');
    return false;
  }
  showToast('Ürün başarıyla güncellendi.', 'success');
  return true;
}

/** Bir ürünü siler. */
async function deleteProductById(id) {
  const { error } = await sbClient.from('products').delete().eq('id', id);
  if (error) {
    console.error('Ürün silinemedi:', error);
    showToast('Ürün silinemedi: ' + error.message, 'error');
    return false;
  }
  showToast('Ürün silindi.', 'success');
  return true;
}

/* =========================================================
   ERİŞİLEBİLİRLİK — Odak Hapsi (Focus Trapping)
   Bir modal (sepet paneli, lightbox) açıkken Tab / Shift+Tab ile
   klavye odağının arka plandaki elemanlara kaçmasını engeller.
   Modal kapandığında odak, modalı açan elemana geri döner.
   ========================================================= */

let focusTrapLastFocusedEl = null;
let focusTrapHandler = null;
let focusTrapContainer = null;

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(
    'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null);
}

/** Odağı container'ın içine hapseder; önceki odaklanmış elemanı hatırlar. */
function trapFocus(container) {
  releaseFocusTrap();
  focusTrapLastFocusedEl = document.activeElement;
  focusTrapContainer = container;

  const focusables = getFocusableElements(container);
  (focusables[0] || container).focus();

  focusTrapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const items = getFocusableElements(container);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  container.addEventListener('keydown', focusTrapHandler);
}

/** Odak hapsini kaldırır ve odağı modalı açan elemana geri verir. */
function releaseFocusTrap() {
  if (focusTrapContainer && focusTrapHandler) {
    focusTrapContainer.removeEventListener('keydown', focusTrapHandler);
  }
  focusTrapHandler = null;
  focusTrapContainer = null;
  if (focusTrapLastFocusedEl && typeof focusTrapLastFocusedEl.focus === 'function') {
    focusTrapLastFocusedEl.focus();
  }
  focusTrapLastFocusedEl = null;
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
    <div id="lightboxOverlay" class="fixed inset-0 z-[999] bg-ink/95 hidden items-center justify-center" role="dialog" aria-modal="true" aria-label="Görsel önizleme">
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
  trapFocus(overlay);
}

function closeLightbox() {
  const overlay = document.getElementById('lightboxOverlay');
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.classList.remove('flex');
  document.body.style.overflow = '';
  releaseFocusTrap();
}

/* =========================================================
   TOAST BİLDİRİMLERİ
   alert()/confirm() yerine ekranın sağ üstünde belirip
   kendiliğinden kaybolan, akışı bloke etmeyen bildirimler.
   ========================================================= */

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'fixed top-5 right-5 z-[1000] flex flex-col gap-2 items-end pointer-events-none';
    document.body.appendChild(container);
  }

  const styles = {
    success: 'bg-sage text-white',
    error: 'bg-danger text-white',
    info: 'bg-walnut text-paper'
  };

  const toast = document.createElement('div');
  toast.className = `toast-enter ${styles[type] || styles.info} px-4 py-3 rounded-xl shadow-lg text-sm max-w-xs pointer-events-auto`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    setTimeout(() => toast.remove(), 500); // transitionend tetiklenmezse yedek temizlik
  }, 3500);
}

/* =========================================================
   SEPET (localStorage tabanlı — gerçek bir web sitesi olduğu
   için burada localStorage kullanmak doğru ve standart yaklaşımdır)
   Ödeme altyapısı içermez; sepet içeriği tek bir WhatsApp
   mesajına dönüştürülüp atölyeye gönderilir.
   ========================================================= */

const CART_STORAGE_KEY = 'kilicarslan-mobilya-cart';

function getCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn('Sepet okunamadı.', e);
    return [];
  }
}

function saveCart(cart) {
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (e) {
    console.warn('Sepet kaydedilemedi.', e);
  }
  updateCartBadge();
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: product.price,
      image: (product.images && product.images[0]) || null,
      icon: product.icon,
      qty
    });
  }
  saveCart(cart);
  renderCartDrawer();
  showToast(`"${product.title}" sepete eklendi.`, 'success');
}

function removeFromCart(id) {
  saveCart(getCart().filter(i => i.id !== id));
  renderCartDrawer();
}

function updateCartQty(id, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty = Math.max(1, qty);
  saveCart(cart);
  renderCartDrawer();
}

function getCartCount() {
  return getCart().reduce((sum, i) => sum + i.qty, 0);
}

function getCartTotal(cart) {
  return cart.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (!badge) return;
  const count = getCartCount();
  badge.textContent = count;
  badge.classList.toggle('hidden', count === 0);
}

function initCartUI() {
  if (document.getElementById('cartDrawer')) {
    updateCartBadge();
    return;
  }

  document.body.insertAdjacentHTML('beforeend', `
    <div id="cartOverlay" class="fixed inset-0 z-[998] bg-ink/50 hidden"></div>
    <aside id="cartDrawer" class="fixed top-0 right-0 h-full w-full sm:w-96 bg-paper z-[999] shadow-2xl translate-x-full transition-transform duration-300 flex flex-col" role="dialog" aria-modal="true" aria-label="Sepetiniz">
      <div class="flex items-center justify-between px-6 py-5 border-b border-walnut/10">
        <h2 class="font-display text-xl text-walnut">Sepetiniz</h2>
        <button id="cartCloseBtn" type="button" aria-label="Kapat" class="text-walnut/60 hover:text-walnut w-8 h-8 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div id="cartItemsWrap" class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4"></div>
      <div class="border-t border-walnut/10 px-6 py-5">
        <div class="flex items-center justify-between mb-4">
          <span class="text-walnutlight text-sm">Toplam</span>
          <span id="cartTotal" class="font-display text-xl text-clay">0 ₺</span>
        </div>
        <button id="cartCheckoutBtn" type="button" class="w-full bg-[#25D366] text-white font-medium py-3 rounded-full hover:brightness-95 transition-colors">WhatsApp'tan Sipariş Ver</button>
      </div>
    </aside>
  `);

  document.getElementById('cartCloseBtn').addEventListener('click', closeCart);
  document.getElementById('cartOverlay').addEventListener('click', closeCart);
  document.getElementById('cartCheckoutBtn').addEventListener('click', checkoutViaWhatsApp);

  document.addEventListener('keydown', (e) => {
    const drawer = document.getElementById('cartDrawer');
    if (!drawer || drawer.classList.contains('translate-x-full')) return;
    if (e.key === 'Escape') closeCart();
  });

  const toggleBtn = document.getElementById('cartToggleBtn');
  if (toggleBtn) toggleBtn.addEventListener('click', openCart);

  updateCartBadge();
}

function openCart() {
  initCartUI();
  renderCartDrawer();
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  overlay.classList.remove('hidden');
  drawer.classList.remove('translate-x-full');
  document.body.style.overflow = 'hidden';
  trapFocus(drawer);
}

function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  const drawer = document.getElementById('cartDrawer');
  if (!overlay || !drawer) return;
  overlay.classList.add('hidden');
  drawer.classList.add('translate-x-full');
  document.body.style.overflow = '';
  releaseFocusTrap();
}

function renderCartDrawer() {
  const wrap = document.getElementById('cartItemsWrap');
  if (!wrap) return;
  const cart = getCart();

  if (cart.length === 0) {
    wrap.innerHTML = '<p class="text-walnutlight text-sm text-center py-10">Sepetiniz boş.</p>';
  } else {
    wrap.innerHTML = cart.map(item => {
      const visual = item.image
        ? `<img src="${sanitizeText(item.image)}" alt="${sanitizeText(item.title)}" class="w-full h-full object-cover">`
        : iconSvg(item.icon, 'w-7 h-7');
      return `
        <div class="flex gap-3 items-center" data-cart-id="${sanitizeText(item.id)}">
          <div class="w-16 h-16 rounded-lg bg-cream overflow-hidden flex items-center justify-center shrink-0">${visual}</div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-walnut truncate">${sanitizeText(item.title)}</p>
            <p class="text-xs text-walnutlight">${formatPrice(item.price)}</p>
            <div class="flex items-center gap-2 mt-1">
              <button type="button" class="cart-qty-decrease w-6 h-6 rounded-full border border-walnut/20 text-walnut hover:border-clay hover:text-clay transition-colors">−</button>
              <span class="text-sm w-5 text-center">${item.qty}</span>
              <button type="button" class="cart-qty-increase w-6 h-6 rounded-full border border-walnut/20 text-walnut hover:border-clay hover:text-clay transition-colors">+</button>
            </div>
          </div>
          <button type="button" class="cart-remove-btn text-danger text-xs underline underline-offset-2 shrink-0">Kaldır</button>
        </div>`;
    }).join('');

    wrap.querySelectorAll('[data-cart-id]').forEach(row => {
      const id = row.dataset.cartId;
      row.querySelector('.cart-qty-decrease').addEventListener('click', () => {
        const item = getCart().find(i => i.id === id);
        if (!item) return;
        if (item.qty - 1 <= 0) removeFromCart(id);
        else updateCartQty(id, item.qty - 1);
      });
      row.querySelector('.cart-qty-increase').addEventListener('click', () => {
        const item = getCart().find(i => i.id === id);
        if (item) updateCartQty(id, item.qty + 1);
      });
      row.querySelector('.cart-remove-btn').addEventListener('click', () => removeFromCart(id));
    });
  }

  document.getElementById('cartTotal').textContent = formatPrice(getCartTotal(cart));
  updateCartBadge();
}

function checkoutViaWhatsApp() {
  const cart = getCart();
  if (cart.length === 0) {
    showToast('Sepetiniz boş.', 'error');
    return;
  }
  const lines = cart.map(item => `• ${item.title} x${item.qty} — ${formatPrice(item.price * item.qty)}`);
  const total = formatPrice(getCartTotal(cart));
  const message = `Merhaba, aşağıdaki ürünleri sipariş etmek istiyorum:\n\n${lines.join('\n')}\n\nToplam: ${total}`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

/* =========================================================
   TEK DOĞRU KAYNAK (Single Source of Truth) — WhatsApp Linkleri
   Statik HTML'de (footer, sabit buton, "Özel Tasarım" butonu vb.)
   numarayı elle yazmak yerine, ilgili elemanı data-wa-link ile
   işaretleyip href'i burada, tek bir yerden (WHATSAPP_NUMBER) doldururuz.
   Mesaj metni istenirse data-wa-message özniteliğiyle verilebilir.
   Örnek: <a data-wa-link data-wa-message="Merhaba...">...</a>
   ========================================================= */
function initStaticWhatsAppLinks() {
  document.querySelectorAll('[data-wa-link]').forEach(el => {
    const message = el.getAttribute('data-wa-message') || '';
    const url = `https://wa.me/${WHATSAPP_NUMBER}` + (message ? `?text=${encodeURIComponent(message)}` : '');
    el.setAttribute('href', url);
  });
}

/* Her sayfa yüklendiğinde sepet rozetini (badge) ve statik WhatsApp linklerini güncel tut. */
document.addEventListener('DOMContentLoaded', () => {
  initCartUI();
  initStaticWhatsAppLinks();
});
