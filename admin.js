/* =========================================================
   MEŞE ATÖLYE — admin.html'e özel mantık
   products.js'in bu dosyadan ÖNCE yüklenmiş olması gerekir.
   Giriş, Supabase Auth (e-posta + şifre) üzerinden yapılır.
   Yönetici hesabı: Supabase Dashboard → Authentication → Users
   ========================================================= */

let products = [];
let editingId = null;

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

  let ok;
  if (editingId) {
    ok = await updateProductById(editingId, data);
  } else {
    let id = slugify(title) || ('urun-' + Date.now());
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
