/* =========================================================
   KILIÇARSLAN MOBİLYA — admin.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.
   Giriş, Supabase Auth (e-posta + şifre) üzerinden yapılır.
   Yönetici hesabı: Supabase Dashboard → Authentication → Users

   Not: Görsel sıkıştırma (Canvas API + WebP) artık burada değil,
   products.js içindeki uploadProductImage() fonksiyonunun kendi
   içinde otomatik olarak yapılıyor — bu dosyanın bunu bilmesine
   gerek yok, sadece dosyayı gönderiyor.

   Tüm mantık bir IIFE içine alınmıştır (bkz. main.js'teki
   açıklama) — bu dosyanın kendi iç değişkenleri (products,
   editingId, pendingFiles vb.) global scope'a sızmaz.
   ========================================================= */
(function () {
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
          <p class="font-display text-walnut truncate">${sanitizeText(p.title)}</p>
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

    // Not: Sıkıştırma (Canvas API + WebP) uploadProductImage() içinde otomatik
    // yapılıyor — burada sadece orijinal dosyayı gönderiyoruz.
    const uploadedUrls = [];
    if (pendingFiles.length > 0) {
      for (let i = 0; i < pendingFiles.length; i++) {
        const file = pendingFiles[i];
        if (file.size > 5 * 1024 * 1024) {
          showToast(`"${file.name}" 5 MB'tan büyük olduğu için atlandı.`, 'error');
          continue;
        }
        submitBtn.textContent = `Görsel yükleniyor (${i + 1}/${pendingFiles.length})...`;
        const url = await uploadProductImage(file, newId);
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
})();
