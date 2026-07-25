/* =========================================================
   MEŞE ATÖLYE — admin.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.
   ========================================================= */

const ADMIN_PASSCODE = 'atolye2026';

let products = loadProducts();
let editingId = null;
let isAdmin = false;

const adminLoginForm = document.getElementById('adminLoginForm');
const adminLoginBox = document.getElementById('adminLogin');
const adminPanel = document.getElementById('adminPanel');
const adminLoginError = document.getElementById('adminLoginError');

function renderAdmin() {
  if (isAdmin) {
    adminLoginBox.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    resetForm();
    renderAdminList();
  } else {
    adminLoginBox.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  }
}

adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = document.getElementById('adminPasscode').value;
  if (val === ADMIN_PASSCODE) {
    isAdmin = true;
    adminLoginError.classList.add('hidden');
    document.getElementById('adminPasscode').value = '';
    products = loadProducts(); // en güncel veriyi çek
    renderAdmin();
  } else {
    adminLoginError.classList.remove('hidden');
  }
});

document.getElementById('adminLogoutBtn').addEventListener('click', () => {
  isAdmin = false;
  renderAdmin();
});

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
      <div class="w-14 h-14 rounded-lg bg-cream flex items-center justify-center shrink-0">
        ${iconSvg(p.icon, 'w-7 h-7')}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-display text-walnut truncate">${p.title}</p>
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
  document.getElementById('formTitle').textContent = 'Yeni Ürün Ekle';
  document.getElementById('formSubmitBtn').textContent = 'Ürünü Kaydet';
  document.getElementById('formCancelBtn').classList.add('hidden');
  document.getElementById('productForm').reset();
  document.getElementById('productId').value = '';
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
  document.getElementById('productForm').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

document.getElementById('formCancelBtn').addEventListener('click', resetForm);

document.getElementById('productForm').addEventListener('submit', (e) => {
  e.preventDefault();

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

  if (editingId) {
    const idx = products.findIndex(p => p.id === editingId);
    if (idx > -1) products[idx] = { ...products[idx], ...data };
  } else {
    let id = slugify(title) || ('urun-' + Date.now());
    if (products.some(p => p.id === id)) id += '-' + Date.now().toString(36).slice(-4);
    products.push({ id, ...data });
  }

  const ok = saveProducts(products);
  if (ok) {
    resetForm();
    renderAdminList();
  }
});

function deleteProduct(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  if (!confirm(`"${p.title}" ürününü silmek istediğinize emin misiniz?`)) return;
  products = products.filter(x => x.id !== id);
  const ok = saveProducts(products);
  if (ok) renderAdminList();
}

/* ---- Başlangıç ---- */
renderAdmin();
