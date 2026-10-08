const OWNER_KEY = sessionStorage.getItem('jit_owner_key') || window.prompt('Masukkan OWNER_KEY JAVA ISLAND TRIP');
if (OWNER_KEY) sessionStorage.setItem('jit_owner_key', OWNER_KEY);

let activeTab = 'dashboard';
let adminPackages = [];
let adminFleet = [];
let adminBookings = [];
let adminPromos = [];
let adminReviews = [];
let adminFaqs = [];
let adminHomepage = [];
let adminRates = {};
let promoEditorId = null;

const rupiah = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const safe = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
const api = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', 'x-owner-key': OWNER_KEY || '', ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `API ${response.status}`);
  return data;
};

function layout(content) {
  return `<div class="admin-shell"><div class="admin-top"><a class="brand" href="index.html#home"><span class="brand-mark">JI</span><span><strong>JAVA ISLAND</strong><small>TRIP</small></span></a>
    <div class="admin-actions"><a class="small-btn" href="index.html" target="_blank" rel="noreferrer">Preview website -></a><span style="font-size:12px;color:var(--muted)">Owner</span></div></div>
    <div class="admin-layout"><aside class="admin-sidebar">${[['dashboard', 'Dashboard'], ['packages', 'Paket Trip'], ['fleet', 'Unit Armada'], ['promos', 'Promo'], ['faqs', 'FAQ'], ['homepage', 'Konten Home'], ['bookings', 'Booking'], ['reviews', 'Review']].map((item) => `<button class="admin-tab ${activeTab === item[0] ? 'active' : ''}" data-tab="${item[0]}">${item[1]}</button>`).join('')}</aside>
    <main class="admin-content">${content}</main></div></div>`;
}

function errorPage(error) {
  return `<div class="admin-card"><p class="section-kicker">OWNER CONTROL</p><h2>Data belum dapat dimuat</h2><p>${safe(error.message)}</p><button class="button button-sm" id="retryAdmin">Coba lagi</button></div>`;
}

function dashboard() {
  return `<div class="admin-card"><p class="section-kicker">OWNER CONTROL</p><h2>Selamat datang kembali.</h2><p>Semua perubahan disimpan ke database server. Website pelanggan tidak memiliki tautan ke halaman ini.</p></div>
    <div class="feature-grid"><div class="feature"><div class="feature-icon">!</div><h3>${adminBookings.filter((item) => item.status === 'PENDING_OWNER_CONFIRMATION').length}</h3><p>Menunggu konfirmasi</p></div>
    <div class="feature"><div class="feature-icon">+</div><h3>${adminBookings.filter((item) => item.status === 'CONFIRMED' || item.status === 'Dikonfirmasi').length}</h3><p>Booking resmi</p></div>
    <div class="feature"><div class="feature-icon">*</div><h3>${adminPackages.length}</h3><p>Paket aktif</p></div>
    <div class="feature"><div class="feature-icon">#</div><h3>${adminFleet.length}</h3><p>Unit armada</p></div></div>
    <div class="admin-card"><h3>Catatan operasional</h3><div class="admin-note">Harga paket memakai kurva pax 2-9, harga low/high/peak season, promo, dan surcharge unit. Harga final tetap dikonfirmasi Owner melalui WhatsApp.</div></div>`;
}

function packageForm(index) {
  const item = index >= 0 ? adminPackages[index] : { id: `package-${Date.now()}`, title: '', enTitle: '', area: 'Jogja', duration: 1, price: 0, tag: 'Draft', image: '', desc: '', enDesc: '', variants: [], itinerary: [], priceTiers: [] };
  const tierValues = [2, 3, 4, 5, 6, 7, 8, 9].map((pax) => item.priceTiers?.find((tier) => Number(tier.pax) === pax)?.price || '').join(', ');
  const season = (name) => item.seasons?.find((entry) => entry.season === name) || {};
  return `<div class="admin-card"><h3>${index >= 0 ? 'Edit paket' : 'Tambah paket'}</h3><form id="packageForm" data-index="${index}"><div class="admin-grid">
    <div class="field"><label>Nama Indonesia</label><input name="title" value="${safe(item.title)}" required></div><div class="field"><label>English (opsional)</label><input name="enTitle" value="${safe(item.enTitle || item.title)}"></div>
    <div class="field"><label>Area</label><input name="area" value="${safe(item.area)}" required></div><div class="field"><label>Durasi (hari)</label><input name="duration" type="number" min="1" value="${item.duration}" required></div>
    <div class="field"><label>Harga pax 4 / normal</label><input name="price" type="number" value="${item.price}" required></div><div class="field"><label>Harga pax 2-9 (urut koma)</label><input name="tierPrices" value="${safe(tierValues)}" placeholder="2, 3, 4, 5, 6, 7, 8, 9"></div>
    <div class="field"><label>Low season price</label><input name="lowPrice" type="number" value="${season('Low season').price || ''}"></div><div class="field"><label>Low season dates</label><input name="lowStart" type="date" value="${season('Low season').startsOn || ''}"><input name="lowEnd" type="date" value="${season('Low season').endsOn || ''}" style="margin-top:5px"></div>
    <div class="field"><label>High season price</label><input name="highPrice" type="number" value="${season('High season').price || ''}"></div><div class="field"><label>High season dates</label><input name="highStart" type="date" value="${season('High season').startsOn || ''}"><input name="highEnd" type="date" value="${season('High season').endsOn || ''}" style="margin-top:5px"></div>
    <div class="field"><label>Peak season price</label><input name="peakPrice" type="number" value="${season('Peak season').price || ''}"></div><div class="field"><label>Peak season dates</label><input name="peakStart" type="date" value="${season('Peak season').startsOn || ''}"><input name="peakEnd" type="date" value="${season('Peak season').endsOn || ''}" style="margin-top:5px"></div>
    <div class="field"><label>Badge</label><input name="tag" value="${safe(item.tag || '')}"></div><div class="field"><label>Upload foto baru</label><input name="imageFile" type="file" accept="image/*"></div>
    <div class="field full"><label>URL foto tersimpan</label><input name="image" value="${safe(item.image || '')}"></div>
    <div class="field"><label>Deskripsi Indonesia</label><textarea name="desc" rows="4">${safe(item.desc || '')}</textarea></div><div class="field"><label>English (otomatis fallback ke Indonesia)</label><textarea name="enDesc" rows="4">${safe(item.enDesc || '')}</textarea></div>
    <div class="field full"><label>Varian rute lama (gunakan editor Varian untuk detail A-H)</label><input name="variants" value="${safe((item.variantDetails || []).map((variant) => variant.title || variant.code).join(', '))}"></div><div class="field full"><label>Itinerary fallback</label><textarea name="itinerary" rows="4">${safe((item.itinerary || []).join('\n'))}</textarea></div>
    </div><div class="admin-actions" style="margin-top:18px"><button class="button button-sm" type="submit">Simpan ke database</button><button class="small-btn" type="button" id="cancelEditor">Batal</button></div></form></div>`;
}

function packagesPage() {
  return `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">CATALOG</p><h2>Kelola Paket Trip</h2><p>Ubah harga normal, kurva pax, season, itinerary, terjemahan, foto, dan varian rute.</p></div><button class="button button-sm" id="addPackage">+ Paket baru</button></div>
     <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Paket</th><th>Area</th><th>Durasi</th><th>Pax 4</th><th>Aksi</th></tr></thead><tbody>${adminPackages.map((item, index) => `<tr><td><strong>${safe(item.title)}</strong><br><span style="font-size:11px;color:var(--muted)">${safe(item.tag || '')}${item.trail ? ` · via ${safe(item.trail)}` : ''}</span></td><td>${String(item.area).toLowerCase().includes('malaysia') ? `<span style="display:inline-block;background:#334EAC;color:#fff;border-radius:999px;padding:3px 11px;font-size:10px;font-weight:700;letter-spacing:.5px">🇲🇾 MALAYSIA · RM</span>` : safe(item.area)}</td><td>${item.duration} hari</td><td>${rupiah(item.price)}</td><td><button class="small-btn" data-edit-package="${index}">Edit</button> <button class="small-btn" data-edit-variants="${index}">Varian (${item.variantDetails?.length || 0})</button></td></tr>`).join('')}</tbody></table></div></div><div id="packageEditor"></div><div id="variantEditor"></div>`;
}

function variantForm(packageIndex, variantIndex) {
  const packageItem = adminPackages[packageIndex];
  const item = variantIndex >= 0 ? packageItem.variantDetails?.[variantIndex] : { code: String.fromCharCode(65 + (packageItem.variantDetails?.length || 0)), title: '', enTitle: '', subtitle: '', enSubtitle: '', heroImage: packageItem.image || '', gallery: packageItem.image ? [packageItem.image] : [], itinerary: [], include: [], exclude: [], priceTiers: [] };
  const tierValues = [2,3,4,5,6,7,8,9].map((pax) => item.priceTiers?.find((tier) => Number(tier.pax) === pax)?.price || '').join(', ');
  return `<div class="admin-card"><h3>${variantIndex >= 0 ? 'Edit' : 'Tambah'} varian ${safe(item.code || '')} · ${safe(packageItem.title)}</h3><form id="variantForm" data-package-index="${packageIndex}" data-variant-index="${variantIndex}" data-variant-id="${item.id || ''}"><div class="admin-grid"><div class="field"><label>Kode (A-H)</label><input name="code" maxlength="8" value="${safe(item.code || '')}" required></div><div class="field"><label>Judul Indonesia</label><input name="title" value="${safe(item.title || '')}" required></div><div class="field"><label>Judul English</label><input name="enTitle" value="${safe(item.enTitle || item.title || '')}"></div><div class="field"><label>Subtitle Indonesia</label><input name="subtitle" value="${safe(item.subtitle || '')}"></div><div class="field"><label>Subtitle English</label><input name="enSubtitle" value="${safe(item.enSubtitle || item.subtitle || '')}"></div><div class="field"><label>Hero image URL</label><input name="heroImage" value="${safe(item.heroImage || '')}"></div><div class="field"><label>Upload hero</label><input name="heroImageFile" type="file" accept="image/*"></div><div class="field full"><label>Gallery image URL (satu per baris)</label><textarea name="gallery" rows="3">${safe((item.gallery || []).join('\n'))}</textarea></div><div class="field full"><label>Upload gallery tambahan</label><input name="galleryFiles" type="file" accept="image/*" multiple></div><div class="field full"><label>Itinerary Indonesia (satu baris per waktu/aktivitas)</label><textarea name="itinerary" rows="5">${safe((item.itinerary || []).join('\n'))}</textarea></div><div class="field full"><label>Itinerary English (satu baris per waktu/aktivitas)</label><textarea name="enItinerary" rows="5">${safe((item.enItinerary || []).join('\n'))}</textarea></div><div class="field"><label>Include Indonesia</label><textarea name="include" rows="4">${safe((item.include || []).join('\n'))}</textarea></div><div class="field"><label>Include English</label><textarea name="enInclude" rows="4">${safe((item.enInclude || []).join('\n'))}</textarea></div><div class="field"><label>Exclude Indonesia</label><textarea name="exclude" rows="4">${safe((item.exclude || []).join('\n'))}</textarea></div><div class="field"><label>Exclude English</label><textarea name="enExclude" rows="4">${safe((item.enExclude || []).join('\n'))}</textarea></div><div class="field full"><label>Harga pax 2-9 (urut koma)</label><input name="tierPrices" value="${safe(tierValues)}" placeholder="2, 3, 4, 5, 5, 5, 5, 5"></div><div class="field"><label>Catatan Indonesia</label><textarea name="note" rows="3">${safe(item.note || '')}</textarea></div><div class="field"><label>Catatan English</label><textarea name="enNote" rows="3">${safe(item.enNote || '')}</textarea></div></div><div class="admin-actions" style="margin-top:18px"><button class="button button-sm" type="submit">Simpan varian</button><button class="small-btn" type="button" id="cancelVariant">Batal</button></div></form></div>`;
}

function fleetPage() {
  return `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">FLEET</p><h2>Unit Armada</h2><p>Harga, kapasitas, status, dan foto unit yang tampil di website.</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Unit</th><th>Kapasitas</th><th>Status</th><th>Mulai dari</th><th>Aksi</th></tr></thead><tbody>${adminFleet.map((item, index) => `<tr><td><strong>${safe(item.name)}</strong></td><td>${item.capacity || '-'}</td><td>${safe(item.status || 'idle')}</td><td>${rupiah(item.from)}/hari</td><td><button class="small-btn" data-edit-fleet="${index}">Edit</button></td></tr>`).join('')}</tbody></table></div></div><div id="fleetEditor"></div>`;
}

function fleetForm(index) {
  const item = adminFleet[index];
  const rates = adminRates[item.id] || {};
  const rateOf = (s) => (rates[s] ?? '');
  return `<div class="admin-card"><h3>Edit ${safe(item.name)}</h3><form id="fleetForm" data-index="${index}"><div class="admin-grid"><div class="field"><label>Nama unit</label><input name="name" value="${safe(item.name)}"></div><div class="field"><label>Tipe</label><input name="type" value="${safe(item.type)}"></div>
    <div class="field"><label>Kapasitas</label><input name="capacity" type="number" value="${item.capacity || 4}"></div><div class="field"><label>Transmisi</label><input name="transmission" value="${safe(item.transmission || '')}"></div>
    <div class="field"><label>Status</label><select name="status"><option value="idle" ${item.status === 'idle' ? 'selected' : ''}>idle</option><option value="maintenance" ${item.status === 'maintenance' ? 'selected' : ''}>maintenance</option></select></div><div class="field"><label>Harga mulai / hari</label><input name="from" type="number" value="${item.from}"></div>
    <div class="field"><label>Tarif Mobil+Driver (12 jam)</label><input name="rateDriver" type="number" value="${rateOf('driver_only')}"></div><div class="field"><label>Tarif Driver+BBM (12 jam)</label><input name="rateFuel" type="number" value="${rateOf('driver_fuel')}"></div>
    <div class="field"><label>Tarif All-In (12 jam)</label><input name="rateAllIn" type="number" value="${rateOf('all_in')}"></div>
    <div class="field"><label>Upload foto baru</label><input name="imageFile" type="file" accept="image/*"></div><div class="field"><label>URL foto tersimpan</label><input name="image" value="${safe(item.image || '')}"></div>
    <div class="field full"><label>Spesifikasi (pisahkan koma)</label><input name="specs" value="${safe((item.specs || []).join(', '))}"></div></div><div class="admin-actions" style="margin-top:18px"><button class="button button-sm" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelEditor">Batal</button></div></form></div>`;
}

function promosPage() {
  const current = promoEditorId ? adminPromos.find((item) => item.id === promoEditorId) : null;
  return `<div class="admin-card"><p class="section-kicker">PROMO</p><h2>${current ? 'Edit promo' : 'Tambah promo'}</h2><form id="promoForm" data-id="${current?.id || ''}"><div class="admin-grid">
    <div class="field"><label>Nama Indonesia</label><input name="title" required value="${safe(current?.title || '')}"></div><div class="field"><label>English (opsional)</label><input name="enTitle" value="${safe(current?.en_title || '')}"></div>
    <div class="field"><label>Tipe diskon</label><select name="discountType"><option value="percent" ${current?.discount_type === 'percent' ? 'selected' : ''}>Persentase (%)</option><option value="nominal" ${current?.discount_type === 'nominal' ? 'selected' : ''}>Nominal (IDR)</option></select></div>
    <div class="field"><label>Nilai diskon</label><input name="discountValue" type="number" min="0" required value="${current?.discount_value || ''}"></div><div class="field"><label>Mulai berlaku</label><input name="startsOn" type="date" value="${current?.starts_on || ''}"></div><div class="field"><label>Selesai berlaku</label><input name="endsOn" type="date" value="${current?.ends_on || ''}"></div>
    <div class="field"><label>Paket terkait</label><select name="packageId"><option value="">Semua paket</option>${adminPackages.map((item) => `<option value="${safe(item.id)}" ${current?.package_id === item.id ? 'selected' : ''}>${safe(item.title)}</option>`).join('')}</select></div><div class="field"><label>URL foto banner</label><input name="image" value="${safe(current?.image || '')}"></div>
    </div><div class="admin-actions"><button class="button button-sm" type="submit">${current ? 'Simpan perubahan' : 'Simpan promo'}</button>${current ? '<button class="small-btn" type="button" id="cancelPromo">Batal</button>' : ''}</div></form></div>
    <div class="admin-card"><h3>Promo tersimpan</h3><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Promo</th><th>Diskon</th><th>Periode</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${adminPromos.length ? adminPromos.map((item) => `<tr><td><strong>${safe(item.title)}</strong></td><td>${item.discount_type === 'percent' ? item.discount_value + '%' : rupiah(item.discount_value)}</td><td>${safe(item.starts_on || '-')} s/d ${safe(item.ends_on || '-')}</td><td><span class="status ${item.active ? 'ok' : ''}">${item.active ? 'Aktif' : 'Nonaktif'}</span></td><td><button class="small-btn" data-edit-promo="${item.id}">Edit</button> <button class="small-btn" data-toggle-promo="${item.id}">${item.active ? 'Nonaktifkan' : 'Aktifkan'}</button></td></tr>`).join('') : '<tr><td colspan="5" style="color:var(--muted);padding:25px">Belum ada promo.</td></tr>'}</tbody></table></div></div>`;
}

function bookingsPage() {
  return `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">BOOKING INBOX</p><h2>Permintaan Booking</h2><p>Konfirmasi setelah memeriksa ketersediaan unit dan detail varian trip.</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Pelanggan</th><th>Paket / Varian</th><th>Tanggal</th><th>Pax</th><th>Bahasa</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${adminBookings.length ? adminBookings.map((item) => `<tr><td><strong>${safe(item.name)}</strong><br><span style="font-size:11px;color:var(--muted)">${safe(item.phone)}</span></td><td>${safe(item.packageTitle || item.package_title || '-')}<br><span style="font-size:11px;color:var(--muted)">${safe(item.variantTitle || '-')}</span></td><td>${safe(item.date || item.travel_date || '-')}</td><td>${safe(item.pax)}</td><td>${safe(item.locale || 'id')} · ${safe(item.audience || 'local')}</td><td><span class="status ${item.status === 'CONFIRMED' || item.status === 'Dikonfirmasi' ? 'ok' : ''}">${safe(item.status)}</span></td><td><button class="small-btn primary" data-confirm-booking="${item.id}" ${item.status === 'CONFIRMED' ? 'disabled' : ''}>Konfirmasi</button></td></tr>`).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:35px">Belum ada permintaan booking.</td></tr>'}</tbody></table></div></div>`;
}
function reviewsPage() {
  return `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">SOCIAL PROOF</p><h2>Review pelanggan</h2><p>Review hanya tampil di halaman publik setelah disetujui Owner.</p></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Nama</th><th>Paket</th><th>Review</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${adminReviews.length ? adminReviews.map((item) => `<tr><td><strong>${safe(item.guest_name)}</strong></td><td>${safe(adminPackages.find((pkg) => pkg.id === item.package_id)?.title || item.package_id)}</td><td>${safe(item.text)}</td><td>${item.approved ? 'Disetujui' : 'Menunggu'}</td><td><button class="small-btn primary" data-approve-review="${item.id}" data-approved="${item.approved ? 'false' : 'true'}">${item.approved ? 'Sembunyikan' : 'Setujui'}</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:35px">Belum ada review.</td></tr>'}</tbody></table></div></div>`;
}

/* ===== FAQ admin ===== */
function faqsPage() {
  return `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">CONTENT</p><h2>FAQ</h2><p>Pertanyaan yang tampil di halaman publik (bagian FAQ).</p></div><button class="button button-sm" id="addFaq">+ FAQ baru</button></div>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Pertanyaan</th><th>Kategori</th><th>Urutan</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${adminFaqs.length ? adminFaqs.map((item, index) => `<tr><td><strong>${safe(item.question)}</strong><br><span style="font-size:11px;color:var(--muted)">${safe((item.answer || '').slice(0, 70))}…</span></td><td>${safe(item.category)}</td><td>${item.sort_order}</td><td>${item.published ? '<span class="status ok">Tampil</span>' : '<span class="status">Draft</span>'}</td><td><button class="small-btn" data-edit-faq="${index}">Edit</button> <button class="small-btn" data-toggle-faq="${item.id}" data-pub="${item.published ? '0' : '1'}">${item.published ? 'Sembunyikan' : 'Tampilkan'}</button></td></tr>`).join('') : '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:35px">Belum ada FAQ.</td></tr>'}</tbody></table></div></div><div id="faqEditor"></div>`;
}
function faqForm(index) {
  const item = index >= 0 ? adminFaqs[index] : { question: '', en_question: '', answer: '', en_answer: '', category: 'general', sort_order: adminFaqs.length + 1, published: 1 };
  return `<div class="admin-card"><h3>${index >= 0 ? 'Edit' : 'Tambah'} FAQ</h3><form id="faqForm" data-index="${index}"><div class="admin-grid">
    <div class="field full"><label>Pertanyaan (ID)</label><input name="question" value="${safe(item.question)}" required></div>
    <div class="field full"><label>Pertanyaan (EN)</label><input name="enQuestion" value="${safe(item.en_question)}"></div>
    <div class="field"><label>Jawaban (ID)</label><textarea name="answer" rows="3" required>${safe(item.answer)}</textarea></div>
    <div class="field"><label>Jawaban (EN)</label><textarea name="enAnswer" rows="3">${safe(item.en_answer)}</textarea></div>
    <div class="field"><label>Kategori</label><input name="category" value="${safe(item.category)}"></div>
    <div class="field"><label>Urutan</label><input name="sortOrder" type="number" value="${item.sort_order}"></div>
    <div class="field"><label>Status</label><select name="published"><option value="1" ${item.published ? 'selected' : ''}>Tampil</option><option value="0" ${!item.published ? 'selected' : ''}>Draft</option></select></div>
  </div><div class="admin-actions" style="margin-top:18px"><button class="button button-sm" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelEditor">Batal</button></div></form></div>`;
}

/* ===== Homepage content admin ===== */
function homepagePage() {
  const rows = adminHomepage.map((s) => `<tr><td><strong>${safe(s.section_key)}</strong><br><span style="font-size:11px;color:var(--muted)">${safe(s.title)}</span></td><td>${safe((s.body || '').slice(0, 90))}…</td><td>${s.visible ? '<span class="status ok">Tampil</span>' : '<span class="status">Sembunyi</span>'}</td><td><button class="small-btn" data-edit-home="${safe(s.section_key)}">Edit</button></td></tr>`).join('');
  return `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">CONTENT</p><h2>Konten Homepage</h2><p>Teks hero & catatan booking yang tampil di beranda.</p></div></div>
    <div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Section</th><th>Isi</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rows || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:35px">Belum ada konten.</td></tr>'}</tbody></table></div></div><div id="homeEditor"></div>`;
}
function homeForm(key) {
  const s = adminHomepage.find((x) => x.section_key === key) || { section_key: key, title: '', en_title: '', body: '', en_body: '', visible: 1, sort_order: 0 };
  return `<div class="admin-card"><h3>Edit section: ${safe(key)}</h3><form id="homeForm" data-key="${safe(key)}"><div class="admin-grid">
    <div class="field"><label>Judul (ID)</label><input name="title" value="${safe(s.title)}"></div>
    <div class="field"><label>Judul (EN)</label><input name="enTitle" value="${safe(s.en_title)}"></div>
    <div class="field"><label>Isi (ID)</label><textarea name="body" rows="4">${safe(s.body)}</textarea></div>
    <div class="field"><label>Isi (EN)</label><textarea name="enBody" rows="4">${safe(s.en_body)}</textarea></div>
    <div class="field"><label>Urutan</label><input name="sortOrder" type="number" value="${s.sort_order}"></div>
    <div class="field"><label>Status</label><select name="visible"><option value="1" ${s.visible ? 'selected' : ''}>Tampil</option><option value="0" ${!s.visible ? 'selected' : ''}>Sembunyi</option></select></div>
  </div><div class="admin-actions" style="margin-top:18px"><button class="button button-sm" type="submit">Simpan</button><button class="small-btn" type="button" id="cancelEditor">Batal</button></div></form></div>`;
}

function renderAdmin(error = null) {
  const content = error ? errorPage(error) : activeTab === 'dashboard' ? dashboard() : activeTab === 'packages' ? packagesPage() : activeTab === 'fleet' ? fleetPage() : activeTab === 'promos' ? promosPage() : activeTab === 'faqs' ? faqsPage() : activeTab === 'homepage' ? homepagePage() : activeTab === 'reviews' ? reviewsPage() : bookingsPage();
  document.querySelector('#adminApp').innerHTML = layout(content);
  document.querySelectorAll('[data-tab]').forEach((button) => button.addEventListener('click', () => { activeTab = button.dataset.tab; renderAdmin(); }));
  document.querySelector('#retryAdmin')?.addEventListener('click', loadAdminData);
  document.querySelector('#addPackage')?.addEventListener('click', () => { document.querySelector('#packageEditor').innerHTML = packageForm(-1); bindForms(); });
  document.querySelectorAll('[data-edit-package]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#packageEditor').innerHTML = packageForm(Number(button.dataset.editPackage)); bindForms(); }));
  document.querySelector('#addFaq')?.addEventListener('click', () => { document.querySelector('#faqEditor').innerHTML = faqForm(-1); bindForms(); });
  document.querySelectorAll('[data-edit-faq]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#faqEditor').innerHTML = faqForm(Number(button.dataset.editFaq)); bindForms(); }));
  document.querySelectorAll('[data-toggle-faq]').forEach((button) => button.addEventListener('click', async () => { await api(`/api/owner/faqs/${button.dataset.toggleFaq}`, { method: 'PATCH', body: JSON.stringify({ published: button.dataset.pub === '1' }) }); await loadAdminData(); }));
  document.querySelectorAll('[data-edit-home]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#homeEditor').innerHTML = homeForm(button.dataset.editHome); bindForms(); }));
  document.querySelectorAll('[data-edit-variants]').forEach((button) => button.addEventListener('click', () => { const packageIndex = Number(button.dataset.editVariants); const packageItem = adminPackages[packageIndex]; document.querySelector('#variantEditor').innerHTML = `<div class="admin-card"><div class="section-head"><div><p class="section-kicker">VARIANTS</p><h3>${safe(packageItem.title)}</h3><p>Setiap pilihan memiliki gallery, itinerary, include/exclude, dan harga pax sendiri.</p></div><button class="button button-sm" id="addVariant">+ Varian</button></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Kode</th><th>Varian</th><th>Harga pax 4</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${(packageItem.variantDetails || []).map((variant, variantIndex) => `<tr><td><strong>${safe(variant.code)}</strong></td><td>${safe(variant.title)}</td><td>${rupiah(variant.priceTiers?.find((tier) => Number(tier.pax) === 4)?.price || variant.price)}</td><td>${variant.active === false ? 'Nonaktif' : 'Aktif'}</td><td><button class="small-btn" data-edit-variant="${variantIndex}">Edit</button></td></tr>`).join('')}</tbody></table></div></div>`; document.querySelector('#addVariant')?.addEventListener('click', () => { document.querySelector('#variantEditor').insertAdjacentHTML('beforeend', variantForm(packageIndex, -1)); bindVariantForm(); }); document.querySelectorAll('[data-edit-variant]').forEach((variantButton) => variantButton.addEventListener('click', () => { document.querySelector('#variantEditor').insertAdjacentHTML('beforeend', variantForm(packageIndex, Number(variantButton.dataset.editVariant))); bindVariantForm(); })); }));
  document.querySelectorAll('[data-edit-fleet]').forEach((button) => button.addEventListener('click', () => { document.querySelector('#fleetEditor').innerHTML = fleetForm(Number(button.dataset.editFleet)); bindForms(); }));
  document.querySelectorAll('[data-confirm-booking]').forEach((button) => button.addEventListener('click', async () => { await api(`/api/owner/bookings/${button.dataset.confirmBooking}`, { method: 'PATCH', body: JSON.stringify({ status: 'Dikonfirmasi' }) }); await loadAdminData(); }));
  document.querySelectorAll('[data-approve-review]').forEach((button) => button.addEventListener('click', async () => { await api(`/api/owner/reviews/${button.dataset.approveReview}`, { method: 'PATCH', body: JSON.stringify({ approved: button.dataset.approved === 'true' }) }); await loadAdminData(); }));
  document.querySelectorAll('[data-edit-promo]').forEach((button) => button.addEventListener('click', () => { promoEditorId = Number(button.dataset.editPromo); renderAdmin(); }));
  document.querySelectorAll('[data-toggle-promo]').forEach((button) => button.addEventListener('click', async () => { const promo = adminPromos.find((item) => item.id === Number(button.dataset.togglePromo)); await api(`/api/owner/promos/${promo.id}`, { method: 'PATCH', body: JSON.stringify({ ...promo, enTitle: promo.en_title, discountType: promo.discount_type, discountValue: promo.discount_value, startsOn: promo.starts_on, endsOn: promo.ends_on, packageId: promo.package_id, active: !promo.active }) }); await loadAdminData(); }));
  document.querySelector('#cancelPromo')?.addEventListener('click', () => { promoEditorId = null; renderAdmin(); });
  document.querySelector('#promoForm')?.addEventListener('submit', submitPromo);
}

async function uploadImage(file, visibility = 'public') {
  if (!file) return null;
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const result = await api('/api/owner/uploads', { method: 'POST', body: JSON.stringify({ dataUrl, visibility }) });
  return result.path;
}

function bindForms() {
  document.querySelector('#cancelEditor')?.addEventListener('click', () => renderAdmin());
  document.querySelector('#packageForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const formData = Object.fromEntries(new FormData(event.target).entries());
      const index = Number(event.target.dataset.index);
      const existing = index >= 0 ? adminPackages[index] : {};
      const uploaded = await uploadImage(event.target.imageFile.files[0]);
      const prices = formData.tierPrices.split(',').map((value) => Number(value.trim())).filter(Boolean);
      const priceTiers = [2, 3, 4, 5, 6, 7, 8, 9].map((pax, tierIndex) => ({ pax, price: prices[tierIndex] || Number(formData.price) })).filter((tier) => tier.price);
      const payload = { ...existing, id: existing.id || `package-${Date.now()}`, ...formData, image: uploaded || formData.image, duration: Number(formData.duration), price: Number(formData.price), variants: formData.variants.split(',').map((item) => item.trim()).filter(Boolean), itinerary: formData.itinerary.split('\n').map((item) => item.trim()).filter(Boolean), priceTiers, seasons: [['low', 'Low season'], ['high', 'High season'], ['peak', 'Peak season']].map(([key, season]) => ({ season, price: Number(formData[`${key}Price`] || 0), startsOn: formData[`${key}Start`] || null, endsOn: formData[`${key}End`] || null })).filter((item) => item.price) };
      await api(index < 0 ? '/api/owner/packages' : `/api/owner/packages/${payload.id}`, { method: index < 0 ? 'POST' : 'PUT', body: JSON.stringify(payload) });
      await loadAdminData();
    } catch (error) { alert(error.message); }
  });
  document.querySelector('#fleetForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.target).entries());
      const item = adminFleet[Number(event.target.dataset.index)];
      const uploaded = await uploadImage(event.target.imageFile.files[0]);
      await api(`/api/owner/fleet/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, ...data, image: uploaded || data.image, capacity: Number(data.capacity), from: Number(data.from), specs: data.specs.split(',').map((value) => value.trim()).filter(Boolean) }) });
      await api(`/api/owner/fleet/${item.id}/rates`, { method: 'PUT', body: JSON.stringify({ driver_only: Number(data.rateDriver || 0), driver_fuel: Number(data.rateFuel || 0), all_in: Number(data.rateAllIn || 0) }) });
      await loadAdminData();
    } catch (error) { alert(error.message); }
  });
  document.querySelector('#faqForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.target).entries());
      const index = Number(event.target.dataset.index);
      const existing = index >= 0 ? adminFaqs[index] : null;
      await api(existing ? `/api/owner/faqs/${existing.id}` : '/api/owner/faqs', { method: existing ? 'PUT' : 'POST', body: JSON.stringify({ ...data, sortOrder: Number(data.sortOrder || 0), published: data.published === '1' }) });
      await loadAdminData();
    } catch (error) { alert(error.message); }
  });
  document.querySelector('#homeForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const data = Object.fromEntries(new FormData(event.target).entries());
      await api(`/api/owner/homepage/${encodeURIComponent(event.target.dataset.key)}`, { method: 'PUT', body: JSON.stringify({ ...data, sortOrder: Number(data.sortOrder || 0), visible: data.visible === '1' }) });
      await loadAdminData();
    } catch (error) { alert(error.message); }
  });
}

function bindVariantForm() {
  document.querySelector('#cancelVariant')?.addEventListener('click', (event) => event.target.closest('.admin-card')?.remove());
  document.querySelector('#variantForm')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const form = event.target; const data = Object.fromEntries(new FormData(form).entries()); const packageItem = adminPackages[Number(form.dataset.packageIndex)];
      const prices = String(data.tierPrices || '').split(',').map((value) => Number(value.trim()));
      const priceTiers = [2,3,4,5,6,7,8,9].map((pax, index) => ({ pax, price: prices[index] })).filter((tier) => tier.price > 0);
      const lines = (value) => String(value || '').split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean);
      const uploadedHero = await uploadImage(form.heroImageFile?.files?.[0], 'public');
      const uploadedGallery = await Promise.all(Array.from(form.galleryFiles?.files || []).map((file) => uploadImage(file, 'public')));
      const payload = { code: data.code, title: data.title, enTitle: data.enTitle, subtitle: data.subtitle, enSubtitle: data.enSubtitle, heroImage: uploadedHero || data.heroImage, gallery: [...lines(data.gallery), ...uploadedGallery.filter(Boolean)], itinerary: lines(data.itinerary), enItinerary: lines(data.enItinerary), include: lines(data.include), enInclude: lines(data.enInclude), exclude: lines(data.exclude), enExclude: lines(data.enExclude), note: data.note, enNote: data.enNote, sortOrder: Number(form.dataset.variantIndex) >= 0 ? Number(form.dataset.variantIndex) : (packageItem.variantDetails?.length || 0), priceTiers };
      const variantId = form.dataset.variantId; await api(variantId ? `/api/owner/variants/${variantId}` : `/api/owner/packages/${encodeURIComponent(packageItem.id)}/variants`, { method: variantId ? 'PUT' : 'POST', body: JSON.stringify(payload) }); await loadAdminData();
    } catch (error) { alert(error.message); }
  });
}

async function submitPromo(event) {
  event.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(event.target).entries());
    const id = event.target.dataset.id;
    await api(id ? `/api/owner/promos/${id}` : '/api/owner/promos', { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) });
    promoEditorId = null; await loadAdminData();
  } catch (error) { alert(error.message); }
}

async function loadAdminData() {
  if (!OWNER_KEY) return renderAdmin(new Error('OWNER_KEY diperlukan untuk membuka panel Owner.'));
  try {
    const session = await api('/api/owner/session');
    if (!session.ok) throw new Error('OWNER_KEY tidak valid.');
    const [catalog, ownerPackages, bookings, promos, reviews, faqs, homepage] = await Promise.all([api('/api/public/bootstrap'), api('/api/owner/packages'), api('/api/owner/bookings'), api('/api/owner/promos'), api('/api/owner/reviews'), api('/api/owner/faqs'), api('/api/owner/homepage')]);
    adminPackages = ownerPackages || []; adminFleet = catalog.fleet || []; adminBookings = bookings || []; adminPromos = promos || []; adminReviews = reviews || []; adminFaqs = faqs || []; adminHomepage = homepage || [];
    /* Kelompokkan rental rates per vehicleId untuk prefill form armada. */
    adminRates = {};
    (catalog.rentalRates || []).forEach((r) => { (adminRates[r.vehicleId] = adminRates[r.vehicleId] || {})[r.serviceType] = r.price; });
    renderAdmin();
  } catch (error) { renderAdmin(error); }
}

loadAdminData();
