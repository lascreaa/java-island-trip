/* ============================================================
   JAVA ISLAND TRIP — Frontend App
   Panel: Malaysia Hiking Trip (RM ONLY) + Trip & Rental (IDR)
   ============================================================ */
const PHONE = '6287839456221';
const VALID_LOCALES = ['id', 'en'];
const browserLocale = () => (navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en';
const storedLocale = localStorage.getItem('jit_lang');
const storedRegion = localStorage.getItem('jit_region');
const state = {
  lang: VALID_LOCALES.includes(storedLocale) ? storedLocale : browserLocale(),
  audience: localStorage.getItem('jit_audience') === 'international' ? 'international' : 'local',
  region: storedRegion === 'my' ? 'my' : storedRegion === 'id' ? 'id' : null, // null = belum pilih → welcome gate tampil
  packages: [], fleet: [], promos: [], rentalRates: [], faqs: [], homepage: []
};

/* ---------- i18n ---------- */
const translations = {
  id: {
    'nav.packages': 'Paket Trip', 'nav.rental': 'Rental Mobil', 'nav.promo': 'Promo', 'nav.about': 'Tentang Kami', 'nav.faq': 'FAQ', 'nav.changeAudience': 'Ganti pilihan', 'nav.malaysia': 'Malaysia Trip',
    'footer.tagline': 'Perjalanan yang terasa dekat, cerita yang tinggal lebih lama.', 'footer.explore': 'Jelajahi', 'footer.contact': 'Hubungi kami', 'footer.follow': 'Ikuti perjalanan', 'footer.legal': 'Syarat & Ketentuan | Kebijakan Privasi',
    heroEyebrow: 'JOGJA & JAWA TENGAH', heroTitle: 'Jelajah Jawa, dengan cara yang lebih berarti.',
    heroDesc: 'Paket trip yang dirancang dengan hati, kendaraan dengan driver yang siap menemani, dan tim lokal yang tahu setiap sudut terbaiknya.',
    explore: 'Lihat paket trip', rental: 'Lihat rental mobil', trust1: 'Paket pilihan', trust2: 'Harga transparan', trust3: 'Respons cepat',
    welcomeKicker: 'MULAI PERJALANANMU', welcomeTitle: 'Pilih cara kami menyambutmu.', welcomeDesc: 'Kami sesuaikan bahasa dan panduan booking dengan kebutuhan perjalananmu.',
    localTitle: 'Saya tinggal di Indonesia', localDesc: 'Paket Jogja dan Jawa Tengah dengan komunikasi WhatsApp berbahasa Indonesia.',
    internationalTitle: 'I am visiting from abroad', internationalDesc: 'Private trips, driver, pickup, and local support in English.',
    continue: 'Lihat paket trip', selected: 'Pilihan aktif', change: 'Ganti pilihan',
    featuredKicker: 'Pilihan untuk perjalananmu', featuredTitle: 'Mulai dari sini.', featuredDesc: 'Pilih satu layanan, lalu lihat detail yang paling sesuai.', viewAll: 'Lihat semua paket',
    serviceKicker: 'Pilih kebutuhanmu', serviceTitle: 'Dua cara untuk menjelajah Jawa.', serviceTrip: 'Paket Trip', serviceTripDesc: 'Rute terkurasi dengan harga per pax, itinerary, dan kalkulator instan.',
    serviceRental: 'Rental Mobil', serviceRentalDesc: 'Armada terawat dengan driver untuk perjalanan pribadi atau rombongan.', openService: 'Lihat pilihan', promoKicker: 'PROMO MUSIM INI', seePromo: 'Lihat paket',
    reviewsKicker: 'CATATAN BOOKING', reviewsTitle: 'Booking disimpan sebelum dikonfirmasi.',
    trustNote: 'Permintaan booking tersimpan di database, diperiksa Owner, lalu dilanjutkan melalui WhatsApp.',
    perPax: '/pax', duration: 'hari', detail: 'Lihat detail', book: 'Tanya & booking', start: 'Mulai dari', include: 'Termasuk', exclude: 'Tidak termasuk',
    selectPax: 'Jumlah peserta', vehicle: 'Kendaraan', pickup: 'Titik jemput', name: 'Nama lengkap', whatsapp: 'Nomor WhatsApp', date: 'Tanggal perjalanan', notes: 'Catatan tambahan',
    send: 'Kirim ke WhatsApp', calc: 'Estimasi total', bookingNote: 'Harga akhir dikonfirmasi Owner setelah mengecek ketersediaan.', back: 'Kembali', itinerary: 'Itinerary', pricing: 'Harga per pax',
    allPackages: 'Semua Paket Trip', allPackagesDesc: 'Pilih pengalaman yang paling sesuai dengan caramu menjelajah Jawa.', allRental: 'Rental Mobil', allRentalDesc: 'Kendaraan dengan driver yang terawat dan tim yang siap membantu.',
    vehicleDetail: 'Detail kendaraan', capacity: 'Kapasitas', transmission: 'Transmisi', rateDriver: 'Mobil + driver 12 jam', rateDriverFuel: 'Driver + BBM 12 jam', rateAllIn: 'All-In 12 jam',
    unavailable: 'Tidak tersedia', summary: 'Ringkasan booking', estimate: 'Estimasi sementara', faq: 'Catatan & FAQ', noData: 'Data belum tersedia.', chooseVariant: 'Pilih rute perjalanan',
    reviews: 'Review', otherTrips: 'Trip lainnya', note: 'Catatan', serviceType: 'Model layanan', tripWithDriver: 'Mobil + driver', driverFuel: 'Mobil + driver + BBM', allIn: 'Paket All-In', submitError: 'Booking belum tersimpan'
  },
  en: {
    'nav.packages': 'Trip Packages', 'nav.rental': 'Car Rental', 'nav.promo': 'Offers', 'nav.about': 'About Us', 'nav.faq': 'FAQ', 'nav.changeAudience': 'Change audience', 'nav.malaysia': 'Malaysia Trip',
    'footer.tagline': 'Journeys that feel close, stories that stay longer.', 'footer.explore': 'Explore', 'footer.contact': 'Contact us', 'footer.follow': 'Follow the journey', 'footer.legal': 'Terms & Conditions | Privacy Policy',
    heroEyebrow: 'YOGYAKARTA & CENTRAL JAVA', heroTitle: 'See Java, in a more meaningful way.',
    heroDesc: 'Thoughtfully designed trips, driver-led vehicles, and local people who know every beautiful corner.',
    explore: 'Explore packages', rental: 'Browse car rental', trust1: 'Curated packages', trust2: 'Clear pricing', trust3: 'Fast response',
    welcomeKicker: 'START YOUR JOURNEY', welcomeTitle: 'Choose how we welcome you.', welcomeDesc: 'We will adapt the language and booking guidance to your travel needs.',
    localTitle: 'Saya tinggal di Indonesia', localDesc: 'Jogja and Central Java packages with Indonesian WhatsApp support.',
    internationalTitle: 'I am visiting from abroad', internationalDesc: 'Private trips, driver, pickup, and local support in English.',
    continue: 'Explore trip packages', selected: 'Active choice', change: 'Change choice',
    featuredKicker: 'Made for your journey', featuredTitle: 'Start here.', featuredDesc: 'Choose one service, then explore the details that fit.', viewAll: 'See all packages',
    serviceKicker: 'Choose what you need', serviceTitle: 'Two ways to explore Java.', serviceTrip: 'Trip Packages', serviceTripDesc: 'Curated routes with per-guest pricing, itinerary, and instant calculator.',
    serviceRental: 'Car Rental', serviceRentalDesc: 'Well-maintained vehicles with a driver for private trips or groups.', openService: 'Explore options', promoKicker: 'SEASONAL OFFER', seePromo: 'View packages',
    reviewsKicker: 'BOOKING NOTE', reviewsTitle: 'Your request is saved before confirmation.',
    trustNote: 'Your booking request is saved to the database, checked by the Owner, then continued in WhatsApp.',
    perPax: '/guest', duration: 'days', detail: 'View details', book: 'Ask & book', start: 'From', include: 'Included', exclude: 'Not included',
    selectPax: 'Number of guests', vehicle: 'Vehicle', pickup: 'Pickup point', name: 'Full name', whatsapp: 'WhatsApp number', date: 'Travel date', notes: 'Additional notes',
    send: 'Send to WhatsApp', calc: 'Estimated total', bookingNote: 'Final price is confirmed by the Owner after availability is checked.', back: 'Back', itinerary: 'Itinerary', pricing: 'Price per guest',
    allPackages: 'All Trip Packages', allPackagesDesc: 'Choose an experience that fits your way of exploring Java.', allRental: 'Car Rental', allRentalDesc: 'Well-maintained vehicles with a driver and a team ready to help.',
    vehicleDetail: 'Vehicle details', capacity: 'Capacity', transmission: 'Transmission', rateDriver: 'Car + driver 12 hours', rateDriverFuel: 'Driver + fuel 12 hours', rateAllIn: 'All-In 12 hours',
    unavailable: 'Unavailable', summary: 'Booking summary', estimate: 'Estimated total', faq: 'Notes & FAQ', noData: 'Data is not available.', chooseVariant: 'Choose your route',
    reviews: 'Reviews', otherTrips: 'Other trips', note: 'Notes', serviceType: 'Service model', tripWithDriver: 'Car + driver', driverFuel: 'Car + driver + fuel', allIn: 'All-In package', submitError: 'Booking was not saved'
  }
};

const t = (key) => translations[state.lang][key] || translations.id[key] || key;
const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
/* Kurs acuan riset pasar: 1 MYR ≈ Rp 3.550 IDR. */
const IDR_PER_RM = 3550;
const moneyRM = (idrValue) => `RM ${new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 }).format(Math.round(Number(idrValue || 0) / IDR_PER_RM))}`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const today = () => new Date().toISOString().slice(0, 10);
const titleFor = (item) => state.lang === 'en' ? item.enTitle || item.title || item.name : item.title || item.name;
const variantTitle = (item) => state.lang === 'en' ? item.enTitle || item.title : item.title;
const variantSubtitle = (item) => state.lang === 'en' ? item.enSubtitle || item.subtitle : item.subtitle;
const descFor = (item) => state.lang === 'en' ? item.enDesc || item.desc || item.type : item.desc || item.type;
const isMalaysia = (item) => String(item?.area || '').toLowerCase().includes('malaysia');
const trailOf = (item) => (item?.trail || (item?.variantDetails?.[0]?.subtitle) || '').toString().trim();

function priceFor(item, pax) {
  const tier = (item?.priceTiers || []).find((entry) => Number(entry.pax) === Number(pax));
  return Number(tier?.price || item?.price || item?.from || 0);
}
function rateFor(vehicleId, serviceType) {
  return state.rentalRates.find((rate) => Number(rate.vehicleId) === Number(vehicleId) && rate.serviceType === serviceType) || null;
}
function setAudience(audience) {
  state.audience = audience === 'international' ? 'international' : 'local';
  state.lang = state.audience === 'international' ? 'en' : 'id';
  localStorage.setItem('jit_audience', state.audience);
  localStorage.setItem('jit_lang', state.lang);
  render();
}
function toggleLanguage() {
  state.lang = state.lang === 'id' ? 'en' : 'id';
  localStorage.setItem('jit_lang', state.lang);
  render();
}

/* ---------- Region (welcome gate) ---------- */
function setRegion(region, opts = {}) {
  state.region = region === 'my' ? 'my' : 'id';
  localStorage.setItem('jit_region', state.region);
  if (state.region === 'my') { state.audience = 'international'; if (!opts.keepLang) state.lang = 'en'; }
  else { state.audience = 'local'; if (!opts.keepLang) state.lang = 'id'; }
  localStorage.setItem('jit_audience', state.audience);
  localStorage.setItem('jit_lang', state.lang);
}
function openWelcomeGate() {
  const gate = document.querySelector('#welcomeGate');
  if (!gate) return;
  gate.hidden = false;
  document.body.classList.add('modal-open');
}
function closeWelcomeGate() {
  const gate = document.querySelector('#welcomeGate');
  if (!gate) return;
  gate.hidden = true;
  document.body.classList.remove('modal-open');
}
function chooseRegion(region) {
  setRegion(region);
  closeWelcomeGate();
  if (region === 'my') {
    if (location.hash !== '#malaysia') location.hash = '#malaysia';
    else render();
  } else {
    render();
  }
}
/* ---------- Settings popover ---------- */
function syncSettingsUI() {
  document.querySelectorAll('[data-set-region]').forEach((btn) => btn.classList.toggle('active', btn.dataset.setRegion === (state.region || 'id')));
  document.querySelectorAll('[data-set-lang]').forEach((btn) => btn.classList.toggle('active', btn.dataset.setLang === state.lang));
}
function openSettings() {
  syncSettingsUI();
  document.querySelector('#settingsOverlay')?.removeAttribute('hidden');
  document.querySelector('#settingsPopover')?.removeAttribute('hidden');
}
function closeSettings() {
  document.querySelector('#settingsOverlay')?.setAttribute('hidden', '');
  document.querySelector('#settingsPopover')?.setAttribute('hidden', '');
}
/* ---------- Currency mismatch note (agar kurs tidak tercampur) ---------- */
function currencyNote(item) {
  const malaysia = isMalaysia(item);
  if (!state.region) return '';
  if (state.region === 'my' && !malaysia) return `<span class="currency-note">IDR · Non-RM</span>`;
  if (state.region === 'id' && malaysia) return `<span class="currency-note rm">RM · Malaysia</span>`;
  return '';
}

/* ---------- Data loading ---------- */
/* ---------- Fallback data (mode pratinjau saat backend tak terjangkau, mis. Live Server) ---------- */
const FALLBACK = {
  packages: [
    { id: 'prau-patakbanteng', title: 'Mount Prau via Patak Banteng', enTitle: 'Mount Prau via Patak Banteng', area: 'Malaysia Trip', duration: 2, theme: 'hiking', price: 1650000, tag: 'Best Seller', trail: 'Patak Banteng', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85', desc: 'Golden sunrise dari Puncak Prau (2.565 mdpl) via jalur Patak Banteng.', enDesc: 'Golden sunrise from Prau Summit (2,565 masl) via the Patak Banteng trail.', priceTiers: [{ pax: 4, price: 1650000 }, { pax: 5, price: 1580000 }, { pax: 6, price: 1520000 }, { pax: 7, price: 1470000 }, { pax: 8, price: 1420000 }, { pax: 9, price: 1370000 }, { pax: 10, price: 1320000 }], variantDetails: [] },
    { id: 'merbabu-suwanting', title: 'Mount Merbabu via Suwanting', enTitle: 'Mount Merbabu via Suwanting', area: 'Malaysia Trip', duration: 2, theme: 'hiking', price: 2900000, tag: 'Popular', trail: 'Suwanting', image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=85', desc: 'Sabana luas menuju Puncak Merbabu (3.145 mdpl) via jalur Suwanting.', enDesc: 'Wide savanna to Merbabu Summit (3,145 masl) via the Suwanting route.', priceTiers: [{ pax: 4, price: 2900000 }, { pax: 5, price: 2780000 }, { pax: 6, price: 2670000 }, { pax: 7, price: 2580000 }, { pax: 8, price: 2490000 }, { pax: 9, price: 2410000 }, { pax: 10, price: 2320000 }], variantDetails: [] },
    { id: 'prau-merbabu-combo', title: 'Prau + Merbabu Combo Expedition', enTitle: 'Prau + Merbabu Combo Expedition', area: 'Malaysia Trip', duration: 4, theme: 'hiking', price: 4000000, tag: 'Limited', trail: 'Patak Banteng & Suwanting', image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=900&q=85', desc: 'Ekspedisi dua gunung: Prau via Patak Banteng dan Merbabu via Suwanting (4D3N).', enDesc: 'A two-mountain expedition: Prau via Patak Banteng and Merbabu via Suwanting (4D3N).', priceTiers: [{ pax: 4, price: 4000000 }, { pax: 5, price: 3840000 }, { pax: 6, price: 3680000 }, { pax: 7, price: 3560000 }, { pax: 8, price: 3440000 }, { pax: 9, price: 3320000 }, { pax: 10, price: 3200000 }], variantDetails: [] }
  ],
  fleet: [
    { id: 1, name: 'Toyota Avanza', type: 'MPV - 6 seats', capacity: 6, transmission: 'Automatic', image: '/image/avanza.jpg', specs: ['6 seats', 'Automatic', 'AC'], from: 500000 },
    { id: 2, name: 'Toyota Innova Reborn', type: 'Premium MPV - 7 seats', capacity: 7, transmission: 'Automatic', image: '/image/REBORN.jpg', specs: ['7 seats', 'Automatic', 'Captain seat'], from: 700000 },
    { id: 3, name: 'Toyota Hiace Premio', type: 'Van - 14 seats', capacity: 14, transmission: 'Manual', image: '/image/PREMIO.jpg', specs: ['14 seats', 'Manual', 'Luggage'], from: 1100000 },
    { id: 4, name: 'Toyota Hiace Commuter', type: 'Van - 14 seats', capacity: 14, transmission: 'Manual', image: '/image/COMMUTER.jpg', specs: ['14 seats', 'Manual', 'Luggage'], from: 900000 },
    { id: 5, name: 'Isuzu Elf Long', type: 'Minibus - 19 seats', capacity: 19, transmission: 'Manual', image: '/image/ELFLONG.jpg', specs: ['19 seats', 'Manual', 'Luggage besar'], from: 1100000 },
    { id: 6, name: 'Medium Bus Pariwisata', type: 'Bus - 31 seats', capacity: 31, transmission: 'Manual', image: '/image/BUSMEDIUM.jpg', specs: ['31 seats', 'Manual', 'Bagasi luas'], from: 1600000 }
  ],
  rentalRates: [
    { vehicleId: 1, serviceType: 'driver_only', price: 500000 }, { vehicleId: 1, serviceType: 'driver_fuel', price: 725000 }, { vehicleId: 1, serviceType: 'all_in', price: 850000 },
    { vehicleId: 2, serviceType: 'driver_only', price: 700000 }, { vehicleId: 2, serviceType: 'driver_fuel', price: 950000 }, { vehicleId: 2, serviceType: 'all_in', price: 1100000 },
    { vehicleId: 3, serviceType: 'driver_only', price: 1100000 }, { vehicleId: 3, serviceType: 'driver_fuel', price: 1450000 }, { vehicleId: 3, serviceType: 'all_in', price: 1850000 },
    { vehicleId: 4, serviceType: 'driver_only', price: 900000 }, { vehicleId: 4, serviceType: 'driver_fuel', price: 1200000 }, { vehicleId: 4, serviceType: 'all_in', price: 1550000 },
    { vehicleId: 5, serviceType: 'driver_only', price: 1100000 }, { vehicleId: 5, serviceType: 'driver_fuel', price: 1500000 }, { vehicleId: 5, serviceType: 'all_in', price: 1650000 },
    { vehicleId: 6, serviceType: 'driver_only', price: 1600000 }, { vehicleId: 6, serviceType: 'driver_fuel', price: 2050000 }, { vehicleId: 6, serviceType: 'all_in', price: 2250000 }
  ]
};

/* Deteksi environment: apakah dibuka lewat backend (port 4173) atau bukan (Live Server/file). */
function backendReachable() {
  const port = location.port;
  if (location.protocol === 'file:') return false;
  return port === '4173' || (port === '' && /localhost|127\.0\.0\.1/.test(location.hostname));
}

async function loadDatabase() {
  try {
    const response = await fetch(`/api/public/bootstrap?date=${today()}&locale=${state.lang}`);
    if (!response.ok) throw new Error('Database unavailable');
    const data = await response.json();
    state.packages = data.packages || [];
    state.fleet = data.fleet || [];
    state.promos = data.promos || [];
    state.rentalRates = data.rentalRates || [];
    state.faqs = data.faqs || [];
    state.homepage = data.homepage || [];
    state.offline = false;
  } catch (error) {
    console.error(error);
    /* Mode pratinjau: pakai fallback agar katalog tetap tampil saat backend mati / dibuka via Live Server. */
    state.packages = FALLBACK.packages;
    state.fleet = FALLBACK.fleet;
    state.rentalRates = FALLBACK.rentalRates;
    state.promos = []; state.faqs = []; state.homepage = [];
    state.offline = true;
    showToast(state.lang === 'en'
      ? 'Backend not reachable — showing preview data. Run "node server.js" for live data.'
      : 'Backend tidak terjangkau — menampilkan data pratinjau. Jalankan "node server.js" untuk data live.');
  }
  render();
}

function applyI18n() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach((element) => { element.textContent = t(element.dataset.i18n); });
}

/* ---------- Cards ---------- */
function card(item) {
  const malaysia = isMalaysia(item);
  const priceHtml = malaysia
    ? `<div class="price price-rm">${moneyRM(item.price)} <small>${t('perPax')}</small></div>`
    : `<div class="price">${money(item.price)} <small>${t('perPax')}</small></div>`;
  const badge = malaysia ? `<span class="badge badge-rm">RM ONLY</span>` : `<span class="badge">${esc(item.tag || '')}</span>`;
  const note = currencyNote(item);
  const trail = malaysia && trailOf(item) ? `<span class="badge badge-min">VIA ${esc(trailOf(item).toUpperCase())}</span>` : '';
  const link = malaysia ? `#malaysia/${encodeURIComponent(item.id)}` : `#package/${encodeURIComponent(item.id)}`;
  return `<article class="card package-card"><a href="${link}"><div class="card-image" style="background-image:url('${esc(item.image)}')">${badge}</div><div class="card-body"><div class="card-meta"><span>${esc(item.area)} · ${item.duration} ${t('duration')}</span><span>${t('perPax')}</span></div><h3>${esc(titleFor(item))}</h3><p>${esc(descFor(item))}</p>${(trail || note) ? `<div style="margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap">${trail}${note}</div>` : ''}<div class="card-foot">${priceHtml}<span class="link-arrow">${t('detail')} →</span></div></div></a></article>`;
}
function fleetCard(vehicle) {
  return `<article class="fleet-card"><a href="#vehicle/${encodeURIComponent(vehicle.id)}"><div class="fleet-image" style="background-image:url('${esc(vehicle.image)}')"></div><div class="fleet-card-content"><div class="card-meta"><span>${esc(vehicle.type || '')}</span><span>${vehicle.capacity || '-'} pax</span></div><h3>${esc(vehicle.name)}</h3><div class="specs">${(vehicle.specs || []).slice(0, 4).map((spec) => `<span class="spec">${esc(spec)}</span>`).join('')}</div><div class="card-foot"><div class="price">${money(vehicle.from)} <small>/day</small></div><span class="link-arrow">${t('detail')} →</span></div></div></a></article>`;
}

/* ---------- Bubble Panel Chooser ---------- */
function panelChooser() {
  const myCount = state.packages.filter(isMalaysia).length;
  const umumCount = state.packages.filter((p) => !isMalaysia(p)).length;
  return `<section class="section panel-section" id="panel"><div class="section-head compact"><p class="section-kicker">${state.lang === 'en' ? 'CHOOSE YOUR PANEL' : 'PILIH PANEL PERJALANANMU'}</p><h2>${state.lang === 'en' ? 'Two ways to travel with us.' : 'Dua cara untuk menjelajah bersama kami.'}</h2><p>${state.lang === 'en' ? 'Malaysia hiking packages are priced in RM. Trip & car rental use universal IDR pricing.' : 'Paket hiking Malaysia dihargai dalam RM. Trip & rental mobil memakai harga universal IDR.'}</p></div><div class="panel-bubbles">
    <a class="panel-bubble panel-malaysia" href="#malaysia">
      <span class="bubble-flag"><span class="bubble-badge solid">🇲🇾 RM ONLY</span><span class="bubble-badge">MIN 4 PAX</span></span>
      <h3>${state.lang === 'en' ? 'Malaysia Hiking Trip' : 'Trip Hiking Malaysia'}</h3>
      <p>${state.lang === 'en' ? `${myCount || 3} curated volcano hikes — Prau & Merbabu — for our Malaysian guests.` : `${myCount || 3} pendakian gunung terkurasi — Prau & Merbabu — untuk tamu Malaysia.`}</p>
      <span class="bubble-cta">${state.lang === 'en' ? 'Explore Malaysia trips' : 'Lihat trip Malaysia'} →</span>
    </a>
    <a class="panel-bubble panel-umum" href="#all-packages">
      <span class="bubble-flag"><span class="bubble-badge">IDR · UNIVERSAL</span></span>
      <h3>${state.lang === 'en' ? 'Trip & Car Rental' : 'Trip & Rental Mobil'}</h3>
      <p>${state.lang === 'en' ? `${umumCount || 'All'} trips plus a well-maintained fleet with driver, priced in IDR for everyone.` : `${umumCount || 'Semua'} trip plus armada terawat dengan driver, harga IDR untuk semua.`}</p>
      <span class="bubble-cta">${state.lang === 'en' ? 'Browse trips & rental' : 'Lihat trip & rental'} →</span>
    </a>
  </div></section>`;
}

/* ---------- Home sections ---------- */
function serviceCards() {
  return `<section class="section service-section"><div class="section-head compact"><div><p class="section-kicker">${t('serviceKicker')}</p><h2>${t('serviceTitle')}</h2></div></div><div class="service-grid"><a class="service-card service-trip" href="#all-packages"><span class="service-icon">✦</span><div><p class="section-kicker">${t('serviceTrip')}</p><h3>${t('serviceTrip')}</h3><p>${t('serviceTripDesc')}</p><span class="link-arrow">${t('openService')} →</span></div></a><a class="service-card service-rental" href="#rental-page"><span class="service-icon">↗</span><div><p class="section-kicker">${t('serviceRental')}</p><h3>${t('serviceRental')}</h3><p>${t('serviceRentalDesc')}</p><span class="link-arrow">${t('openService')} →</span></div></a></div></section>`;
}
function promoMarkup() {
  const promo = state.promos[0]; if (!promo) return '';
  const title = state.lang === 'en' ? promo.en_title || promo.title : promo.title;
  const discount = promo.discount_type === 'percent' ? `${promo.discount_value}%` : money(promo.discount_value);
  return `<section class="promo-band" id="promo"><div><p class="section-kicker">${t('promoKicker')}</p><h2>${esc(title)}</h2><p>${esc(discount)} ${state.lang === 'en' ? 'discount for selected travel dates.' : 'potongan untuk tanggal perjalanan tertentu.'}</p></div><a class="button button-light" href="#all-packages">${t('seePromo')} →</a></section>`;
}
function homepageContent(key, fallback) { const section = state.homepage.find((entry) => entry.sectionKey === key); return section ? section.body || fallback : fallback; }
function faqMarkup() {
  if (!state.faqs.length) return '';
  return `<section class="section faq-section" id="faq"><div class="section-head compact"><div><p class="section-kicker">${t('faq')}</p><h2>${state.lang === 'en' ? 'Questions, answered.' : 'Pertanyaan yang sering ditanyakan.'}</h2></div></div><div class="detail-accordions">${state.faqs.slice(0, 8).map((faq) => accordion(state.lang === 'en' ? faq.enQuestion || faq.question : faq.question, `<p>${esc(state.lang === 'en' ? faq.enAnswer || faq.answer : faq.answer)}</p>`)).join('')}</div></section>`;
}
function shellHome() {
  const heroCopy = homepageContent('hero', t('heroDesc'));
  const featured = state.packages.filter((p) => !isMalaysia(p)).slice(0, 3);
  return `<section class="hero" id="home"><div class="hero-copy"><p class="eyebrow">${t('heroEyebrow')}</p><h1>${t('heroTitle')}</h1><p>${esc(heroCopy)}</p><div class="hero-actions"><a class="button" href="#panel">${state.lang === 'en' ? 'Start exploring' : 'Mulai menjelajah'} →</a><a class="button button-outline" href="#rental-page">${t('rental')}</a></div><div class="trust-row"><div><strong>${state.packages.length || 0}</strong><span>${t('trust1')}</span></div><div><strong>IDR / RM</strong><span>${t('trust2')}</span></div><div><strong>20 min</strong><span>${t('trust3')}</span></div></div></div><div class="hero-visual"><div class="hero-note"><div><span>${state.lang === 'en' ? 'Next stop' : 'Perjalanan berikutnya'}</span><strong>${state.lang === 'en' ? 'Prau & Merbabu sunrise' : 'Sunrise Prau & Merbabu'}</strong></div><div class="mini-mark">✦</div></div></div></section>${panelChooser()}${serviceCards()}<section class="section featured-section" id="packages"><div class="section-head"><div><p class="section-kicker">${t('featuredKicker')}</p><h2>${t('featuredTitle')}</h2></div><div><p>${t('featuredDesc')}</p><a class="link-arrow" href="#all-packages">${t('viewAll')} →</a></div></div>${catalogHelp()}<div class="carousel-wrap"><div class="carousel" id="featuredCarousel">${featured.map(card).join('') || `<div class="empty">${t('noData')}</div>`}</div><div class="arrow-controls"><button class="arrow" id="prevPackages" aria-label="Previous">←</button><button class="arrow" id="nextPackages" aria-label="Next">→</button></div></div></section>${promoMarkup()}<section class="section trust-section" id="about"><div class="section-head compact"><div><p class="section-kicker">${t('reviewsKicker')}</p><h2>${t('reviewsTitle')}</h2></div></div><div class="trust-note"><span class="feature-icon">✓</span><p>${t('trustNote')}</p></div></section>${faqMarkup()}`;
}

/* ---------- Catalog (IDR) ---------- */
function pageAll() {
  const list = state.packages.filter((p) => !isMalaysia(p));
  return `<section class="page-hero"><div><p class="section-kicker">JAVA ISLAND TRIP · IDR</p><h1>${t('allPackages')}</h1><p>${t('allPackagesDesc')}</p></div></section><section class="section catalog-section">${catalogHelp()}<div class="filter-row"><button class="filter-chip active" data-filter="all">All</button><button class="filter-chip" data-filter="Jogja">Jogja</button><button class="filter-chip" data-filter="Dieng">Dieng</button><button class="filter-chip" data-filter="Karimunjawa">Karimunjawa</button><button class="filter-chip" data-filter="culture">Culture</button><button class="filter-chip" data-filter="nature">Nature</button></div><div class="package-grid" id="allPackageGrid">${list.map(card).join('') || `<div class="empty">${t('noData')}</div>`}</div></section>`;
}
function pageRental() {
  return `<section class="page-hero"><div><p class="section-kicker">JAVA ISLAND TRIP · IDR UNIVERSAL</p><h1>${t('allRental')}</h1><p>${t('allRentalDesc')}</p></div></section><section class="section catalog-section">${catalogHelp()}<div class="fleet-grid">${state.fleet.map(fleetCard).join('') || `<div class="empty">${t('noData')}</div>`}</div></section>`;
}

/* ---------- Malaysia catalog (RM ONLY) ---------- */
function pageMalaysia() {
  const list = state.packages.filter(isMalaysia);
  const cards = list.map(card).join('') || `<div class="empty">${t('noData')}</div>`;
  return `<section class="page-hero"><div><p class="section-kicker">JAVA ISLAND TRIP · MALAYSIA 🇲🇾</p><h1>${state.lang === 'en' ? 'Malaysia Hiking Trip' : 'Trip Hiking Malaysia'}</h1><p>${state.lang === 'en' ? 'Volcano hikes curated for our Malaysian guests — prices shown in RM, minimum 4 guests per group.' : 'Pendakian gunung yang dikurasi untuk tamu Malaysia — harga dalam RM, minimal 4 peserta per grup.'}</p><div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap"><span class="bubble-badge solid">RM ONLY</span><span class="bubble-badge warn">MIN 4 PAX</span></div></div></section><section class="section catalog-section"><div class="package-grid">${cards}</div></section>`;
}

/* ---------- Detail helpers ---------- */
function defaultVariant(item) { return item?.variantDetails?.[0] || { id: '', code: 'A', title: item?.title || '', enTitle: item?.enTitle || item?.title || '', heroImage: item?.image || '', gallery: item?.image ? [item.image] : [], itinerary: item?.itinerary || [], include: ['Kendaraan private dan driver', 'Air mineral'], exclude: ['Tiket masuk destinasi', 'Pengeluaran pribadi'], priceTiers: item?.priceTiers || [], price: item?.price || 0 }; }
function selectedVariant(item) { const query = new URLSearchParams((location.hash.split('?')[1] || '')); const id = Number(query.get('variant')); return item.variantDetails?.find((variant) => Number(variant.id) === id) || defaultVariant(item); }
function galleryMarkup(item, variant) {
  const images = [...new Set([variant.heroImage || item.image, ...(variant.gallery || [])].filter(Boolean))];
  const thumbs = images.map((image, index) => `<button class="gallery-thumb ${index === 0 ? 'active' : ''}" data-gallery-image="${esc(image)}" aria-label="Image ${index + 1}"><img src="${esc(image)}" alt="${esc(variantTitle(variant))} ${index + 1}" loading="lazy"></button>`).join('');
  return `<div class="detail-gallery"><div class="thumb-rail">${thumbs}</div><button class="gallery-main" id="galleryMain"><img src="${esc(images[0] || item.image)}" alt="${esc(variantTitle(variant))}" fetchpriority="high"></button><div class="gallery-side"><img src="${esc(images[1] || images[0] || item.image)}" alt="${esc(variantTitle(variant))} preview" loading="lazy"></div></div>`;
}
function variantButtons(item, variant) {
  return `<div class="variant-selector"><p class="section-kicker">${t('chooseVariant')}</p><div class="variant-grid">${(item.variantDetails || [variant]).map((entry) => `<button class="variant-option ${Number(entry.id) === Number(variant.id) ? 'active' : ''}" data-variant-id="${entry.id}"><strong>${esc(entry.code || 'A')}</strong><span>${esc(variantTitle(entry))}</span><small>${esc(variantSubtitle(entry) || '')}</small></button>`).join('')}</div></div>`;
}
function itineraryMarkup(variant) {
  const entries = state.lang === 'en' && variant.enItinerary?.length ? variant.enItinerary : variant.itinerary || [];
  return `<div class="itinerary">${entries.map((entry, index) => { const parts = String(entry).split(/\s{2,}|\|/); return `<div class="day"><div class="day-label">${parts.length > 1 ? esc(parts.shift()) : `${state.lang === 'en' ? 'Stop' : 'Sesi'} ${index + 1}`}</div><div>${esc(parts.join(' | ') || entry)}</div></div>`; }).join('')}</div>`;
}
function localizedList(variant, key) { if (state.lang !== 'en') return variant[key] || []; const translated = variant[`en${key.charAt(0).toUpperCase()}${key.slice(1)}`]; return translated?.length ? translated : variant[key] || []; }
function priceTable(variant, malaysia) {
  return `<div class="price-table">${(variant.priceTiers || []).map((tier) => `<div><span>${tier.pax} pax</span><strong>${malaysia ? moneyRM(tier.price) : money(tier.price)} <small>${t('perPax')}</small></strong></div>`).join('')}</div>`;
}
function accordion(title, content, open = false) { return `<details class="accordion" ${open ? 'open' : ''}><summary>${title}<span>+</span></summary><div class="accordion-content">${content}</div></details>`; }
function whatsappForPackage(item, variant) {
  const title = titleFor(item); const selected = variantTitle(variant);
  const malaysia = isMalaysia(item);
  const message = malaysia
    ? (state.lang === 'en' ? `Hello JAVA ISLAND TRIP, I would like to ask about the Malaysia hiking trip ${title} — ${selected} (RM pricing, min 4 pax). Please check availability.` : `Halo JAVA ISLAND TRIP, saya ingin bertanya tentang trip hiking Malaysia ${title} — ${selected} (harga RM, min 4 pax). Mohon cek ketersediaannya.`)
    : (state.lang === 'en' ? `Hello JAVA ISLAND TRIP, I would like to ask about ${title} — ${selected}. Please check availability.` : `Halo JAVA ISLAND TRIP, saya ingin bertanya tentang ${title} — ${selected}. Mohon cek ketersediaannya.`);
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`;
}
function minPaxWarning() {
  return `<div class="min-pax-warning"><span class="feature-icon">!</span><div><strong>${state.lang === 'en' ? 'Minimum 4 guests.' : 'Minimal 4 peserta.'}</strong><p>${state.lang === 'en' ? 'Malaysia hiking trips run with a minimum of 4 guests per group. Travelling with fewer? Chat us on WhatsApp to join an open group.' : 'Trip hiking Malaysia berjalan dengan minimal 4 peserta per grup. Berangkat dengan lebih sedikit? Chat kami di WhatsApp untuk gabung open trip.'}</p></div></div>`;
}

function detailTabs(item, variant) {
  const malaysia = isMalaysia(item);
  const related = state.packages.filter((entry) => entry.id !== item.id && isMalaysia(entry) === malaysia).slice(0, 3).map(card).join('');
  const include = localizedList(variant, 'include'); const exclude = localizedList(variant, 'exclude');
  const reviews = (item.reviews || []).map((review) => `<article class="review-card"><strong>${esc(review.guestName)}</strong><p>${esc(state.lang === 'en' ? review.enText || review.text : review.text)}</p></article>`).join('');
  return `<section class="detail-tabs"><div class="tab-list" role="tablist"><button class="tab-button active" data-tab="trip">${t('chooseVariant')}</button><button class="tab-button" data-tab="reviews">${t('reviews')}</button><button class="tab-button" data-tab="other">${t('otherTrips')}</button><button class="tab-button" data-tab="note">${t('note')}</button></div><div class="tab-panel active" data-panel="trip">${variantButtons(item, variant)}${malaysia ? minPaxWarning() : ''}<div class="detail-columns"><div>${accordion(t('itinerary'), itineraryMarkup(variant), true)}${accordion(t('include'), `<ul class="detail-list">${include.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul>`)}</div><div>${accordion(t('pricing'), priceTable(variant, malaysia), true)}${accordion(t('exclude'), `<ul class="detail-list">${exclude.map((entry) => `<li>${esc(entry)}</li>`).join('')}</ul>`)}</div></div></div><div class="tab-panel" data-panel="reviews">${reviews || `<div class="empty">${state.lang === 'en' ? 'Verified guest reviews will appear here after approval.' : 'Testimoni tamu terverifikasi akan tampil setelah disetujui.'}</div>`}</div><div class="tab-panel" data-panel="other"><div class="related-grid">${related || `<div class="empty">${t('noData')}</div>`}</div></div><div class="tab-panel" data-panel="note"><div class="note-box"><p>${t('bookingNote')}</p><p>${state.lang === 'en' ? 'Payment is arranged manually through WhatsApp after Owner confirmation.' : 'Pembayaran dilakukan manual melalui WhatsApp setelah konfirmasi Owner.'}</p>${variant.note ? `<p>${esc(state.lang === 'en' ? variant.enNote || variant.note : variant.note)}</p>` : ''}</div></div></section>`;
}

/* ---------- Detail page (shared) ---------- */
function detailPageMarkup(item, variant, malaysia) {
  const basePax = malaysia ? 4 : 4;
  const price = malaysia ? moneyRM(priceFor(variant, basePax)) : money(priceFor(variant, basePax));
  const trail = malaysia && trailOf(item) ? `<span class="bubble-badge warn" style="position:static">VIA ${esc(trailOf(item).toUpperCase())}</span>` : '';
  const paxOptions = [2, 3, 4, 5, 6, 7, 8, 9].map((pax) => `<option value="${pax}" ${pax === basePax ? 'selected' : ''}>${pax} pax</option>`).join('');
  const calcDefault = malaysia ? moneyRM(priceFor(variant, basePax) * basePax) : money(priceFor(variant, basePax) * basePax);
  const backLink = malaysia ? '#malaysia' : '#all-packages';
  const bookLink = `#book/${encodeURIComponent(item.id)}?variant=${encodeURIComponent(variant.id)}`;
  return `<section class="detail-page"><div class="detail-top"><a href="${backLink}" class="back-link">← ${t('back')}</a>${malaysia ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px"><span class="bubble-badge solid">RM ONLY</span><span class="bubble-badge warn">MIN 4 PAX</span>${trail}</div>` : ''}${galleryMarkup(item, variant)}<div class="detail-heading"><div><p class="section-kicker">${esc(item.area)} · ${item.duration} ${t('duration')}</p><h1 id="detailTitle">${esc(titleFor(item))}</h1><p id="detailSubtitle">${esc(variantSubtitle(variant) || variantTitle(variant))}</p></div><div class="detail-price" id="detailPrice">${price} <small>${t('perPax')}</small></div><div class="detail-calculator"><div class="field"><label>${t('selectPax')}</label><select id="paxSelect">${paxOptions}</select></div><div class="field"><label>${t('date')}</label><input id="quoteDate" type="date" min="${today()}" value="${today()}"></div><div class="field"><label>${t('vehicle')}</label><select id="vehicleSelect"><option value="">${state.lang === 'en' ? 'Standard vehicle — included' : 'Kendaraan standar — termasuk'}</option>${state.fleet.filter((vehicle) => !/avanza/i.test(vehicle.name)).map((vehicle) => `<option value="${vehicle.id}">${esc(vehicle.name)}</option>`).join('')}</select></div><div class="calc-result"><span>${t('calc')}</span><strong id="calcTotal">${calcDefault}</strong></div></div>${malaysia ? minPaxWarning() : `<p class="booking-note">${t('bookingNote')}</p>`}<div class="detail-actions"><a class="button" href="${bookLink}">${t('book')} →</a><a class="button button-outline" href="${whatsappForPackage(item, variant)}" target="_blank" rel="noreferrer">WhatsApp ↗</a></div></div></div></section>${detailTabs(item, variant)}`;
}
function pageDetail(id) {
  const item = state.packages.find((entry) => entry.id === id);
  if (!item) return `<section class="section"><div class="empty">${t('noData')}</div></section>`;
  return detailPageMarkup(item, selectedVariant(item), isMalaysia(item));
}
function pageMalaysiaDetail(id) {
  const item = state.packages.find((entry) => entry.id === id && isMalaysia(entry)) || state.packages.find(isMalaysia);
  if (!item) return `<section class="section"><div class="empty">${t('noData')}</div></section>`;
  return detailPageMarkup(item, selectedVariant(item), true);
}

/* ---------- Vehicle detail ---------- */
function rateRows(vehicle) {
  return [['driver_only', t('rateDriver')], ['driver_fuel', t('rateDriverFuel')], ['all_in', t('rateAllIn')]].map(([type, label]) => { const rate = rateFor(vehicle.id, type); return `<div class="rate-row"><span>${label}</span><strong>${rate ? money(rate.price) : t('unavailable')}</strong></div>`; }).join('');
}
function pageVehicle(id) {
  const vehicle = state.fleet.find((entry) => String(entry.id) === String(id)) || state.fleet[0];
  if (!vehicle) return `<section class="section"><div class="empty">${t('noData')}</div></section>`;
  const message = state.lang === 'en' ? `Hello JAVA ISLAND TRIP, I would like to rent ${vehicle.name}. Please check availability.` : `Halo JAVA ISLAND TRIP, saya ingin menyewa ${vehicle.name}. Mohon cek ketersediaannya.`;
  return `<section class="detail-hero vehicle-detail-hero"><a href="#rental-page" class="back-link">← ${t('back')}</a><div class="detail-layout"><div class="detail-photo vehicle-photo" style="background-image:url('${esc(vehicle.image)}')"></div><div class="detail-panel"><p class="section-kicker">${esc(vehicle.type || '')}</p><h1>${esc(vehicle.name)}</h1><p>${(vehicle.specs || []).map(esc).join(' · ')}</p><div class="vehicle-facts"><span><strong>${vehicle.capacity || '-'}</strong>${t('capacity')}</span><span><strong>${esc(vehicle.transmission || '-')}</strong>${t('transmission')}</span></div><div class="rate-table"><h3>${t('pricing')}</h3>${rateRows(vehicle)}</div><a class="button sticky-mobile-cta" href="https://wa.me/${PHONE}?text=${encodeURIComponent(message)}" target="_blank" rel="noreferrer">${t('book')} →</a></div></div></section>`;
}

/* ---------- Booking ---------- */
function bookingFromHash() { const [path, query] = location.hash.split('?'); return { id: decodeURIComponent((path.split('/')[1] || '')), variantId: new URLSearchParams(query || '').get('variant') }; }
function pageBook(id) {
  const item = state.packages.find((entry) => entry.id === id) || state.packages[0];
  if (!item) return `<section class="section"><div class="empty">${t('noData')}</div></section>`;
  const info = bookingFromHash();
  const variant = item.variantDetails?.find((entry) => String(entry.id) === String(info.variantId)) || defaultVariant(item);
  const malaysia = isMalaysia(item);
  const startPax = malaysia ? 4 : 2;
  const estBase = malaysia ? moneyRM(priceFor(variant, startPax) * startPax) : money(priceFor(variant, startPax) * startPax);
  const paxOptions = [2, 3, 4, 5, 6, 7, 8, 9].map((pax) => `<option value="${pax}" ${pax === startPax ? 'selected' : ''}>${pax} pax</option>`).join('');
  return `<section class="page-hero"><div><p class="section-kicker">JAVA ISLAND TRIP · BOOKING</p><h1>${state.lang === 'en' ? 'Send a booking request' : 'Kirim permintaan booking'}</h1><p>${esc(titleFor(item))} · ${esc(variantTitle(variant))}</p>${malaysia ? `<div style="margin-top:14px"><span class="bubble-badge solid">RM ONLY</span> <span class="bubble-badge warn">MIN 4 PAX</span></div>` : ''}</div></section><section class="booking-section"><form class="booking-form" id="bookingForm" data-package="${esc(item.id)}" data-variant="${esc(variant.id)}"><div class="booking-summary"><p class="section-kicker">${t('summary')}</p><h2>${esc(titleFor(item))}</h2><p>${esc(variantTitle(variant))} · ${esc(item.area)} · ${item.duration} ${t('duration')}</p><strong id="bookingEstimate">${t('estimate')}: ${estBase}</strong></div>${malaysia ? minPaxWarning() : ''}<div class="form-grid"><div class="field"><label>${t('name')}</label><input name="name" required autocomplete="name"></div><div class="field"><label>${t('whatsapp')}</label><input name="phone" required inputmode="tel" autocomplete="tel" placeholder="${state.lang === 'en' ? '+60...' : '08...'}"></div><div class="field"><label>Email (${state.lang === 'en' ? 'optional' : 'opsional'})</label><input name="email" type="email" autocomplete="email" placeholder="nama@email.com"></div><div class="field"><label>${t('date')}</label><input name="date" type="date" min="${today()}" required></div><div class="field"><label>${t('selectPax')}</label><select name="pax" id="bookingPax">${paxOptions}</select></div><div class="field"><label>${t('serviceType')}</label><select name="serviceType" id="serviceType"><option value="driver_only">${t('tripWithDriver')}</option><option value="driver_fuel">${t('driverFuel')}</option><option value="all_in">${t('allIn')}</option></select></div><div class="field"><label>${t('vehicle')}</label><select name="vehicleId" id="bookingVehicle"><option value="">${state.lang === 'en' ? 'Standard vehicle' : 'Kendaraan standar'}</option>${state.fleet.map((vehicle) => `<option value="${vehicle.id}">${esc(vehicle.name)}</option>`).join('')}</select></div><div class="field full"><label>${t('pickup')}</label><input name="pickup" autocomplete="street-address"></div><div class="field full"><label>${t('notes')}</label><textarea name="notes" rows="3"></textarea></div><div class="field full"><button class="button button-block" type="submit">${t('send')} →</button></div></div></form></section>`;
}

/* ---------- Router ---------- */
/* Banner mode pratinjau + panel bantuan backend */
function envBanner() {
  if (state.offline) {
    return `<div class="env-banner" role="alert"><div class="env-banner-copy"><strong>${state.lang === 'en' ? 'Preview mode' : 'Mode pratinjau'}</strong> — ${state.lang === 'en' ? 'Backend not reachable, showing sample data.' : 'Backend tidak terjangkau, menampilkan data contoh.'}</div><button class="env-banner-retry" id="retryCatalog" type="button">${state.lang === 'en' ? 'Retry' : 'Coba lagi'}</button></div>`;
  }
  if (!backendReachable()) {
    return `<div class="env-banner warn" role="alert"><div class="env-banner-copy"><strong>${state.lang === 'en' ? 'Wrong port?' : 'Port salah?'}</strong> — ${state.lang === 'en' ? 'Run "node server.js" and open http://localhost:4173 (not Live Server).' : 'Jalankan "node server.js" lalu buka http://localhost:4173 (bukan Live Server).'}</div></div>`;
  }
  return '';
}

function catalogHelp() {
  if (!state.offline) return '';
  return `<div class="catalog-help"><h3>${state.lang === 'en' ? 'Catalog could not be loaded' : 'Katalog belum bisa dimuat'}</h3><p>${state.lang === 'en' ? 'This site needs its backend. Run "npm start" (or "node server.js") then open http://localhost:4173 — not via Live Server or opening the file directly. You are seeing sample data now.' : 'Website ini butuh server backend. Jalankan "npm start" (atau "node server.js") lalu buka http://localhost:4173 — bukan lewat Live Server atau buka file langsung. Anda sedang melihat data contoh.'}</p><button class="button" id="retryCatalog" type="button">${state.lang === 'en' ? 'Retry loading' : 'Coba muat lagi'}</button></div>`;
}

function render() {
  const hash = location.hash || '#home';
  const route = hash.split('?')[0];
  let html;
  if (route.startsWith('#malaysia/')) html = pageMalaysiaDetail(decodeURIComponent(route.split('/')[1]));
  else if (route === '#malaysia') html = pageMalaysia();
  else if (route.startsWith('#package/')) html = pageDetail(decodeURIComponent(route.split('/')[1]));
  else if (route.startsWith('#vehicle/')) html = pageVehicle(decodeURIComponent(route.split('/')[1]));
  else if (route.startsWith('#book/')) html = pageBook(decodeURIComponent(route.split('/')[1]));
  else if (route === '#all-packages') html = pageAll();
  else if (route === '#rental-page') html = pageRental();
  else html = shellHome();
  document.querySelector('#app').innerHTML = envBanner() + html;
  applyI18n(); bind();
  document.querySelector('#retryCatalog')?.addEventListener('click', loadDatabase);
  /* Welcome gate wajib pilih: tampil bila region belum dipilih */
  if (!state.region) openWelcomeGate(); else closeWelcomeGate();
  if (route.startsWith('#package/') || route.startsWith('#malaysia/')) updateQuote();
  if (route.startsWith('#book/')) updateBookingEstimate();
  if (['#packages', '#promo', '#about', '#panel'].includes(route)) setTimeout(() => document.querySelector(route)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 20);
}

/* ---------- Booking submit / quotes ---------- */
async function submitBooking(event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const response = await fetch('/api/public/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, packageId: form.dataset.package, variantId: Number(form.dataset.variant), locale: state.lang, audience: state.audience }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || t('submitError'));
    const item = state.packages.find((entry) => entry.id === form.dataset.package);
    const variant = item.variantDetails?.find((entry) => String(entry.id) === String(form.dataset.variant)) || defaultVariant(item);
    const malaysia = isMalaysia(item);
    const serviceLabel = document.querySelector('#serviceType')?.selectedOptions[0]?.text || data.serviceType;
    const vehicle = document.querySelector('#bookingVehicle')?.selectedOptions[0]?.text || '-';
    const totalText = malaysia ? moneyRM(result.quote.totalAmount) : money(result.quote.totalAmount);
    const message = state.lang === 'en'
      ? `Hello JAVA ISLAND TRIP, I have submitted booking ${result.code}.\n\nName: ${data.name}\nWhatsApp: ${data.phone}\nEmail: ${data.email || '-'}\nPackage: ${titleFor(item)}\nRoute: ${variantTitle(variant)}\nTravel date: ${data.date}\nGuests: ${data.pax}\nService: ${serviceLabel}\nVehicle: ${vehicle}\nPickup: ${data.pickup}\nEstimated total: ${totalText}\n\nPlease check availability and confirm my booking.`
      : `Halo JAVA ISLAND TRIP, saya sudah mengirim booking ${result.code}.\n\nNama: ${data.name}\nNomor WhatsApp: ${data.phone}\nEmail: ${data.email || '-'}\nPaket: ${titleFor(item)}\nRute: ${variantTitle(variant)}\nTanggal perjalanan: ${data.date}\nJumlah peserta: ${data.pax}\nLayanan: ${serviceLabel}\nKendaraan: ${vehicle}\nTitik jemput: ${data.pickup}\nEstimasi total: ${totalText}\n\nMohon cek ketersediaan dan konfirmasi booking saya.`;
    window.open(`https://wa.me/${PHONE}?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    showToast(state.lang === 'en' ? 'Request saved. Continue in WhatsApp.' : 'Permintaan tersimpan. Lanjutkan di WhatsApp.');
    form.reset();
  } catch (error) { console.error(error); showToast(error.message || t('submitError')); }
}
async function updateQuote() {
  const route = location.hash.split('?')[0];
  const isMy = route.startsWith('#malaysia/');
  const isPkg = route.startsWith('#package/');
  if (!isMy && !isPkg) return;
  const id = decodeURIComponent(route.split('/')[1]);
  const item = state.packages.find((entry) => entry.id === id);
  const variant = item && selectedVariant(item);
  if (!item || !variant) return;
  const malaysia = isMalaysia(item);
  const pax = Number(document.querySelector('#paxSelect')?.value || 4);
  const travelDate = document.querySelector('#quoteDate')?.value || today();
  const vehicleId = document.querySelector('#vehicleSelect')?.value || '';
  const fmt = malaysia ? moneyRM : money;
  try {
    const response = await fetch('/api/public/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: item.id, variantId: variant.id, pax, travelDate, vehicleId, serviceType: 'driver_only', locale: state.lang, audience: state.audience }) });
    const quote = await response.json();
    if (response.ok) {
      document.querySelector('#calcTotal')?.replaceChildren(document.createTextNode(fmt(quote.totalAmount)));
      document.querySelector('#detailPrice')?.replaceChildren(document.createTextNode(`${fmt(quote.totalAmount / Math.max(1, pax))} ${t('perPax')}`));
    }
  } catch (error) { console.error(error); }
}
async function updateBookingEstimate() {
  const form = document.querySelector('#bookingForm'); if (!form) return;
  const item = state.packages.find((entry) => entry.id === form.dataset.package);
  const malaysia = isMalaysia(item);
  const data = Object.fromEntries(new FormData(form).entries());
  const fmt = malaysia ? moneyRM : money;
  try {
    const response = await fetch('/api/public/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packageId: form.dataset.package, variantId: Number(form.dataset.variant), pax: Number(data.pax || 2), travelDate: data.date || today(), vehicleId: data.vehicleId || '', serviceType: data.serviceType || 'driver_only', locale: state.lang, audience: state.audience }) });
    const quote = await response.json();
    if (response.ok) document.querySelector('#bookingEstimate').textContent = `${t('estimate')}: ${fmt(quote.totalAmount)}`;
  } catch (error) { console.error(error); }
}

/* ---------- Bindings ---------- */
function bindDetail(item) {
  document.querySelectorAll('[data-gallery-image]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-gallery-image]').forEach((entry) => entry.classList.remove('active'));
    button.classList.add('active');
    const main = document.querySelector('#galleryMain img');
    if (main) main.src = button.dataset.galleryImage;
  }));
  document.querySelectorAll('[data-variant-id]').forEach((button) => button.addEventListener('click', () => {
    const variant = item.variantDetails.find((entry) => String(entry.id) === String(button.dataset.variantId));
    if (!variant) return;
    const query = new URLSearchParams(location.hash.split('?')[1] || '');
    query.set('variant', variant.id);
    const base = isMalaysia(item) ? 'malaysia' : 'package';
    history.replaceState(null, '', `#${base}/${encodeURIComponent(item.id)}?${query}`);
    render();
  }));
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-tab]').forEach((entry) => entry.classList.remove('active'));
    document.querySelectorAll('[data-panel]').forEach((entry) => entry.classList.remove('active'));
    button.classList.add('active');
    document.querySelector(`[data-panel="${button.dataset.tab}"]`)?.classList.add('active');
  }));
}
function bind() {
  document.querySelector('#menuToggle')?.addEventListener('click', () => { const nav = document.querySelector('#siteNav'); const button = document.querySelector('#menuToggle'); const open = nav?.classList.toggle('open'); button?.setAttribute('aria-expanded', String(Boolean(open))); });
  document.querySelectorAll('#siteNav a').forEach((link) => link.addEventListener('click', () => document.querySelector('#siteNav')?.classList.remove('open')));
  /* Welcome gate — wajib pilih (tidak ada tombol tutup) */
  document.querySelectorAll('#welcomeGate [data-region]').forEach((btn) => btn.addEventListener('click', () => chooseRegion(btn.dataset.region)));
  /* Settings popover */
  document.querySelector('#settingsBtn')?.addEventListener('click', (e) => { e.stopPropagation(); const open = !document.querySelector('#settingsPopover')?.hasAttribute('hidden'); if (open) closeSettings(); else openSettings(); });
  document.querySelector('#settingsClose')?.addEventListener('click', closeSettings);
  document.querySelector('#settingsOverlay')?.addEventListener('click', closeSettings);
  document.querySelectorAll('[data-set-region]').forEach((btn) => btn.addEventListener('click', () => { const r = btn.dataset.setRegion; setRegion(r, { keepLang: true }); syncSettingsUI(); if (r === 'my' && location.hash !== '#malaysia') { closeSettings(); location.hash = '#malaysia'; } else render(); }));
  document.querySelectorAll('[data-set-lang]').forEach((btn) => btn.addEventListener('click', () => { state.lang = btn.dataset.setLang === 'en' ? 'en' : 'id'; localStorage.setItem('jit_lang', state.lang); syncSettingsUI(); render(); }));
  document.querySelector('#prevPackages')?.addEventListener('click', () => document.querySelector('#featuredCarousel')?.scrollBy({ left: -340, behavior: 'smooth' }));
  document.querySelector('#nextPackages')?.addEventListener('click', () => document.querySelector('#featuredCarousel')?.scrollBy({ left: 340, behavior: 'smooth' }));
  document.querySelectorAll('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    document.querySelectorAll('[data-filter]').forEach((entry) => entry.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    document.querySelector('#allPackageGrid').innerHTML = state.packages.filter((item) => !isMalaysia(item) && (filter === 'all' || item.area === filter || item.theme === filter)).map(card).join('') || `<div class="empty">${t('noData')}</div>`;
  }));
  if (location.hash.startsWith('#package/') || location.hash.startsWith('#malaysia/')) {
    const id = decodeURIComponent(location.hash.split('?')[0].split('/')[1]);
    const item = state.packages.find((entry) => entry.id === id);
    if (item) bindDetail(item);
  }
  ['#paxSelect', '#quoteDate', '#vehicleSelect'].forEach((selector) => document.querySelector(selector)?.addEventListener('change', updateQuote));
  ['#bookingPax', '#serviceType', '#bookingVehicle', '[name="date"]'].forEach((selector) => document.querySelector(selector)?.addEventListener('change', updateBookingEstimate));
  document.querySelector('#bookingForm')?.addEventListener('submit', submitBooking);
}
function showToast(message) { const element = document.querySelector('#toast'); if (!element) return; element.textContent = message; element.classList.add('show'); setTimeout(() => element.classList.remove('show'), 4000); }

window.addEventListener('hashchange', render);
render();
loadDatabase();
