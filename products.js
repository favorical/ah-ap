/* =========================================================
   MEŞE ATÖLYE — Ortak Veri Katmanı
   index.html, detay.html ve admin.html tarafından kullanılır.
   Veriler tarayıcının localStorage'ında saklanır: admin.html'de
   yapılan değişiklikler AYNI TARAYICIDA index.html ve detay.html'e yansır.
   Not: localStorage tarayıcıya özeldir; farklı cihaz/tarayıcılar
   arasında paylaşım için bir sunucu/veritabanı gerekir.
   ========================================================= */

const STORAGE_KEY = 'mese-atolye-products';
const WHATSAPP_NUMBER = '905551112233';

const defaultProducts = [
  { id: 'p1', title: 'Masif Ahşap Yemek Masası', category: 'mobilya', price: 18500, icon: 'table',
    shortDesc: 'Ceviz ağacından, 8 kişilik, doğal kenar dokusu korunmuş tek parça masa.',
    longDesc: 'Bu yemek masası, tek bir ceviz kütüğünden, ağacın doğal kenar hattı korunarak üretilmiştir. Yüzey, çok katmanlı doğal yağ ile cilalanarak hem dokunuşta sıcak hem de leke ve neme dayanıklı hale getirilmiştir. Her masa kendine has damar deseniyle biriciktir.',
    specs: ['Ceviz ağacı', '8 kişilik', '220 x 95 cm', 'Doğal yağ cila', 'Kenar hattı korunmuş'] },
  { id: 'p2', title: 'Epoksi Ahşap Sehpa', category: 'mobilya', price: 7200, icon: 'coffee-table',
    shortDesc: 'Meşe gövde ve lacivert epoksi reçine dolgulu, oturma odaları için orta sehpa.',
    longDesc: 'Meşe ahşabın doğal çatlakları, UV dayanımlı epoksi reçine ile doldurularak nehir görünümü elde edilmiştir. Metal ayaklar siyah elektrostatik boya ile kaplanmıştır.',
    specs: ['Meşe ahşap', 'Epoksi reçine dolgu', 'Metal ayak', '110 x 55 cm'] },
  { id: 'p3', title: 'Ahşap Kitaplık', category: 'mobilya', price: 9800, icon: 'shelf',
    shortDesc: 'Gürgen ahşaptan, duvara monteli, 5 raflı minimalist kitaplık.',
    longDesc: 'Duvara sabitlenen bu kitaplık, gürgen ahşabın doğal sarı tonunu korur. Görünür vida veya bağlantı parçası bulunmaz; gizli montaj sistemi kullanılmıştır.',
    specs: ['Gürgen ahşap', '5 raf', 'Gizli montaj', '160 x 180 cm'] },
  { id: 'p4', title: 'Kişiselleştirilmiş Ahşap Saat', category: 'hediyelik', price: 650, icon: 'clock',
    shortDesc: 'İsim veya tarih işlemeli, ceviz kaplama duvar saati.',
    longDesc: 'İstediğiniz ismi, tarihi veya kısa bir mesajı lazer işleme ile saatin üzerine işliyoruz. Sessiz mekanizma sayesinde tik-tak sesi neredeyse duyulmaz.',
    specs: ['Ceviz kaplama', 'Lazer kişiselleştirme', 'Sessiz mekanizma', 'Çap 30 cm'] },
  { id: 'p5', title: 'Ahşap Sunum Tahtası', category: 'hediyelik', price: 450, icon: 'board',
    shortDesc: 'Zeytin ağacından, kulplu, kahvaltılık ve peynir sunumları için.',
    longDesc: 'Zeytin ağacının kendine özgü desenleri, her tahtayı farklı kılar. Gıdayla temasa uygun doğal yağ ile kaplanmıştır, kulpu sayesinde kolayca taşınır.',
    specs: ['Zeytin ağacı', 'Gıda dostu yağ kaplama', 'Taşıma kulpu', '40 x 24 cm'] },
  { id: 'p6', title: 'El Yapımı Ahşap Kutu', category: 'hediyelik', price: 380, icon: 'box',
    shortDesc: 'Menteşeli, kadife astarlı, takı veya anı saklama kutusu.',
    longDesc: 'İç kısmı yumuşak kadife ile astarlanmış bu kutu, takı, saat veya anlam taşıyan küçük eşyaları saklamak için üretilmiştir. İsteğe bağlı kapak üzeri gravür yapılabilir.',
    specs: ['Ceviz/meşe seçenekli', 'Kadife astar', 'Pirinç menteşe', '18 x 13 x 8 cm'] }
];

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

/** Ürünleri localStorage'dan okur; hiç kayıt yoksa varsayılanları yazıp döner. */
function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Ürünler okunamadı, varsayılanlar kullanılıyor.', e);
  }
  saveProducts(defaultProducts);
  return defaultProducts.slice();
}

/** Ürün listesini localStorage'a yazar. Başarısız olursa false döner. */
function saveProducts(products) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return true;
  } catch (e) {
    console.error('Depolama hatası:', e);
    alert('Veriler kaydedilirken bir hata oluştu. Tarayıcı depolama alanı dolu ya da gizli sekme modunda olabilirsiniz.');
    return false;
  }
}
