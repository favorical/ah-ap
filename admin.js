/* =========================================================
   MEŞE ATÖLYE — admin.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.
   Giriş, Supabase Auth (e-posta + şifre) üzerinden yapılır.
   Yönetici hesabı: Supabase Dashboard → Authentication → Users
   ========================================================= */

/* =========================================================
   GÖRSEL SIKIŞTIRMA (Canvas API)
   Yüklenen görseller Supabase'e gönderilmeden önce tarayıcıda
   sıkıştırılır: genişlik en fazla 1200px'e indirilir ve
   %80 kalitede WebP formatına dönüştürülür. Bu; depolama
   alanından tasarruf sağlar ve sitenin açılış hızını artırır.
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

let products = [];
let editingId = null;
let existingImages = [];   // düzenlenen üründe zaten kayıtlı olan, silinmemiş görsel URL'leri
let pendingFiles = [];     // henüz yüklenmemiş, yeni seçilmiş dosyalar

const imageInput = document.getElementById('f-image');
const imagePreviewList = document.getElementById('imagePreviewList');

function renderImagePreviews() {
  imagePreviewList.innerHTML = '';

  existingImages.forEach((url, idx) => {
    const wrap = document.createElement('div');
    wrap.className = 'relative w-16 h-16';
    wrap.innerHTML = `
      <img src="${url}" class="w-16 h-16 object-cover rounded-lg border border-walnut/10">
      <button type="button" data-type="existing" data-idx="${idx}" class="remove-image-btn absolute -top-1.5 -right-1.5 bg-danger text-white w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none">×</button>
    `;
    imagePreviewList.appendChild(wrap);
  });

  pendingFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const wrap = document.createElement('div');
    wrap.className = 'relative w-16 h-16';
    wrap.innerHTML = `
      <img src="${url}" class="w-16 h-16 object-cover rounded-lg border border-sage/50">
      <button type="button" data-type="pending" data-idx="${idx}" class="remove-image-btn absolute -top-1.5 -right-1.5 bg-danger text-white w-5 h-5 rounded-full flex items-center justify-center text-xs leading-none">×</button>
      <span class="absolute bottom-0 inset-x-0 bg-sage/90 text-white text-[9px] text-center rounded-b-lg leading-tight">Yeni</span>
    `;
    imagePreviewList.appendChild(wrap);
  });

  imagePreviewList.querySelectorAll('.remove-image-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      if (btn.dataset.type === 'existing') existingImages.splice(idx, 1);
      else pendingFiles.splice(idx, 1);
      renderImagePreviews();
    });
  });
}

imageInput.addEventListener('change', () => {
  const files = Array.from(imageInput.files || []);
  files.forEach(file => {
    const isDup = pendingFiles.some(f => f.name === file.name && f.size === file.size && f.lastModified === file.lastModified);
    if (!isDup) pendingFiles.push(file);
  });
  imageInput.value = ''; // aynı pencereyi tekrar açıp başka dosya eklemeye izin verir
  renderImagePreviews();
});

const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginBox = document.getElementById('adminLogin');
const adminPanel = document.getElementById('adminPanel');
const adminLoginError = document.getElementById('adminLoginError');

function showLogin() {
  adminLoginBox.classList.remove('hidden');
  adminPanel.classList.add('hidden');
}

async function showPanel() {
  adminLoginBox.classList.add('hidden');
  adminPanel.classList.remove('hidden');
  resetForm();
  products = await fetchProducts();
  renderAdminList();
}

/* ---- Oturum kontrolü (sayfa her açıldığında) ---- */
async function checkSession() {
  const { data: { session } } = await sbClient.auth.getSession();
  if (session) {
    await showPanel();
  } else {
    showLogin();
  }
}

/* ---- Giriş formu ---- */
adminLoginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPasscode').value;
  const submitBtn = adminLoginForm.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Giriş yapılıyor...';

  const { error } = await sbClient.auth.signInWithPassword({ email, password });

  submitBtn.disabled = false;
  submitBtn.textContent = 'Giriş Yap';

  if (error) {
    adminLoginError.textContent = 'E-posta veya şifre hatalı.';
    adminLoginError.classList.remove('hidden');
  } else {
    adminLoginError.classList.add('hidden');
    document.getElementById('adminPasscode').value = '';
    await showPanel();
  }
});

/* ---- Çıkış ---- */
document.getElementById('adminLogoutBtn').addEventListener('click', async () => {
  await sbClient.auth.signOut();
  showLogin();
});

/* ---- Ürün listesi ---- */
function renderAdminList() {
  const list = document.getElementById('adminProductList');
  document.getElementById('adminCount').textContent = products.length;
  list.innerHTML = '';

  if (products.length === 0) {
    list.innerHTML = '<p class="text-walnutlight text-sm">Henüz ürün eklenmemiş.</p>';
    return;
  }

  products.forEach(p => {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-4 bg-paper border border-walnut/10 rounded-xl p-3';
    row.innerHTML = `
      <div class="w-14 h-14 rounded-lg bg-cream flex items-center justify-center shrink-0 overflow-hidden">
        ${productThumbnailHtml(p, 'w-7 h-7')}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-display text-walnut truncate">${escapeHTML(p.title)}</p>
        <p class="text-xs text-walnutlight/70">${p.category === 'mobilya' ? 'Mobilya' : 'Hediyelik Eşya'} · ${formatPrice(p.price)}</p>
      </div>
      <a href="detay.html?id=${encodeURIComponent(p.id)}" target="_blank" class="text-sm border border-walnut/20 text-walnut px-3 py-1.5 rounded-full hover:border-clay hover:text-clay transition-colors">Görüntüle</a>
      <button data-id="${p.id}" class="edit-btn text-sm border border-walnut/20 text-walnut px-3 py-1.5 rounded-full hover:border-clay hover:text-clay transition-colors">Düzenle</button>
      <button data-id="${p.id}" class="delete-btn text-sm border border-danger/30 text-danger px-3 py-1.5 rounded-full hover:bg-danger/10 transition-colors">Sil</button>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll('.edit-btn').forEach(b => b.addEventListener('click', () => startEdit(b.dataset.id)));
  list.querySelectorAll('.delete-btn').forEach(b => b.addEventListener('click', () => deleteProduct(b.dataset.id)));
}

function resetForm() {
  editingId = null;
  existingImages = [];
  pendingFiles = [];
  document.getElementById('formTitle').textContent = 'Yeni Ürün Ekle';
  document.getElementById('formSubmitBtn').textContent = 'Ürünü Kaydet';
  document.getElementById('formCancelBtn').classList.add('hidden');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
  renderImagePreviews();
}

function startEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  editingId = id;
  document.getElementById('formTitle').textContent = 'Ürünü Güncelle';
  document.getElementById('formSubmitBtn').textContent = 'Değişiklikleri Kaydet';
  document.getElementById('formCancelBtn').classList.remove('hidden');
  document.getElementById('productId').value = p.id;
  document.getElementById('f-title').value = p.title;
  document.getElementById('f-category').value = p.category;
  document.getElementById('f-price').value = p.price;
  document.getElementById('f-icon').value = p.icon;
  document.getElementById('f-shortdesc').value = p.shortDesc;
  document.getElementById('f-longdesc').value = p.longDesc || '';
  document.getElementById('f-specs').value = (p.specs || []).join(', ');

  existingImages = [...(p.images || [])];
  pendingFiles = [];
  imageInput.value = '';
  renderImagePreviews();

  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('formCancelBtn').addEventListener('click', resetForm);

/* ---- Ürün ekle / güncelle ---- */
document.getElementById('productForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = document.getElementById('formSubmitBtn');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Kaydediliyor...';

  const title = document.getElementById('f-title').value.trim();
  const data = {
    title,
    category: document.getElementById('f-category').value,
    price: Number(document.getElementById('f-price').value) || 0,
    icon: document.getElementById('f-icon').value,
    shortDesc: document.getElementById('f-shortdesc').value.trim(),
    longDesc: document.getElementById('f-longdesc').value.trim(),
    specs: document.getElementById('f-specs').value.split(',').map(s => s.trim()).filter(Boolean)
  };

  const newId = editingId || slugify(title) || ('urun-' + Date.now());

  const uploadedUrls = [];
  if (pendingFiles.length > 0) {
    submitBtn.textContent = `Görseller işleniyor (0/${pendingFiles.length})...`;
    for (let i = 0; i < pendingFiles.length; i++) {
      const file = pendingFiles[i];
      if (file.size > 5 * 1024 * 1024) {
        alert(`"${file.name}" 5 MB'tan büyük olduğu için atlandı.`);
        continue;
      }
      submitBtn.textContent = `Görsel sıkıştırılıyor (${i + 1}/${pendingFiles.length})...`;
      const compressed = await compressImage(file);
      submitBtn.textContent = `Görsel yükleniyor (${i + 1}/${pendingFiles.length})...`;
      const url = await uploadProductImage(compressed, newId);
      if (url) uploadedUrls.push(url);
    }
  }

  data.images = [...existingImages, ...uploadedUrls];

  submitBtn.textContent = 'Kaydediliyor...';

  let ok;
  if (editingId) {
    ok = await updateProductById(editingId, data);
  } else {
    let id = newId;
    if (products.some(p => p.id === id)) id += '-' + Date.now().toString(36).slice(-4);
    data.id = id;
    ok = await insertProduct(data);
  }

  submitBtn.disabled = false;
  submitBtn.textContent = originalText;

  if (ok) {
    products = await fetchProducts();
    resetForm();
    renderAdminList();
  }
});

/* ---- Ürün sil ---- */
async function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`"${p.title}" ürününü silmek istediğinize emin misiniz?`)) return;

  const ok = await deleteProductById(id);
  if (ok) {
    products = await fetchProducts();
    renderAdminList();
  }
}

/* ---- Başlangıç ---- */
checkSession();
