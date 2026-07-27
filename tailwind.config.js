/** =========================================================
 *  MEŞE ATÖLYE — Tailwind Production Build Config
 *  Bu dosyayı projenizin kök klasörüne "tailwind.config.js"
 *  adıyla kaydedin. index.html'deki eski `tailwind.config = {...}`
 *  inline script'i ile BİREBİR aynı tema tanımlarını içerir.
 * ========================================================= */
module.exports = {
  // ÖNEMLİ: main.js, detay.js, admin.js dosyaları da buraya dahil edildi.
  // Çünkü kart/carousel/lightbox gibi bileşenlerin class'ları HTML'de değil,
  // JS template literal'ları (`${...}`) içinde üretiliyor. Bu dosyalar
  // content listesine eklenmezse, Tailwind o class'ları "kullanılmıyor"
  // sanıp CSS çıktısından siler ve sitenin tasarımı bozulur.
  content: [
    './index.html',
    './detay.html',
    './admin.html',
    './main.js',
    './detay.js',
    './admin.js',
    './products.js'
  ],
  theme: {
    extend: {
      colors: {
        cream: '#EDE4D3',
        paper: '#F7F1E6',
        walnut: '#3B2A1E',
        walnutlight: '#5A4230',
        clay: '#8B5E3C',
        sage: '#6B7A5E',
        sagedark: '#4A5641',
        gold: '#B8912F',
        ink: '#2A211B',
        danger: '#A3453A'
      },
      fontFamily: {
        display: ['Fraunces', 'serif'],
        body: ['Work Sans', 'sans-serif']
      }
    }
  },
  plugins: []
};
