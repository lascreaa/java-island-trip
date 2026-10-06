const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const { DatabaseSync } = require('node:sqlite');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PRIVATE_DIR = path.join(DATA_DIR, 'private-uploads');
const PUBLIC_DIR = path.join(DATA_DIR, 'public-uploads');
fs.mkdirSync(PRIVATE_DIR, { recursive: true });
fs.mkdirSync(PUBLIC_DIR, { recursive: true });

const db = new DatabaseSync(process.env.JIT_DB_PATH || path.join(DATA_DIR, 'java-island-trip.db'));
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, en_title TEXT NOT NULL,
    area TEXT NOT NULL, duration INTEGER NOT NULL, theme TEXT DEFAULT 'culture',
    price INTEGER NOT NULL, tag TEXT, image TEXT, description TEXT, en_description TEXT,
    variants_json TEXT NOT NULL DEFAULT '[]', itinerary_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS package_price_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, package_id TEXT NOT NULL, pax INTEGER NOT NULL,
    price_per_pax INTEGER NOT NULL, season TEXT NOT NULL DEFAULT 'normal',
    UNIQUE(package_id, pax, season),
    FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS package_variants (
    id INTEGER PRIMARY KEY AUTOINCREMENT, package_id TEXT NOT NULL, code TEXT NOT NULL,
    title TEXT NOT NULL, en_title TEXT NOT NULL, subtitle TEXT DEFAULT '', en_subtitle TEXT DEFAULT '',
    hero_image TEXT DEFAULT '', gallery_json TEXT NOT NULL DEFAULT '[]', itinerary_json TEXT NOT NULL DEFAULT '[]',
    include_json TEXT NOT NULL DEFAULT '[]', exclude_json TEXT NOT NULL DEFAULT '[]', note TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0,
    UNIQUE(package_id, code), FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS variant_price_tiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, variant_id INTEGER NOT NULL, pax INTEGER NOT NULL,
    price_per_pax INTEGER NOT NULL, season TEXT NOT NULL DEFAULT 'normal',
    UNIQUE(variant_id, pax, season), FOREIGN KEY(variant_id) REFERENCES package_variants(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT, package_id TEXT NOT NULL, guest_name TEXT NOT NULL,
    text TEXT NOT NULL, en_text TEXT DEFAULT '', approved INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS season_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT, package_id TEXT NOT NULL, season TEXT NOT NULL,
    price INTEGER NOT NULL, starts_on TEXT, ends_on TEXT,
    FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS fleet (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, type TEXT, image TEXT,
    specs_json TEXT NOT NULL DEFAULT '[]', capacity INTEGER NOT NULL DEFAULT 4,
    transmission TEXT, status TEXT NOT NULL DEFAULT 'idle', from_price INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS rental_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT, vehicle_id INTEGER NOT NULL, service_type TEXT NOT NULL,
    duration_hours INTEGER NOT NULL, price INTEGER NOT NULL,
    UNIQUE(vehicle_id, service_type, duration_hours),
    FOREIGN KEY(vehicle_id) REFERENCES fleet(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS promos (
    id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, en_title TEXT,
    discount_type TEXT NOT NULL, discount_value INTEGER NOT NULL, starts_on TEXT, ends_on TEXT,
    package_id TEXT, image TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
    updated_at TEXT, FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT, code TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL,
    package_id TEXT, variant_id INTEGER, vehicle_id INTEGER, service_type TEXT NOT NULL DEFAULT 'driver_only',
    variant TEXT, locale TEXT DEFAULT 'id', audience TEXT DEFAULT 'local', travel_date TEXT NOT NULL, end_date TEXT, pax INTEGER NOT NULL DEFAULT 1,
    pickup TEXT, notes TEXT, base_amount INTEGER NOT NULL DEFAULT 0,
    discount_amount INTEGER NOT NULL DEFAULT 0, total_amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING_OWNER_CONFIRMATION',
    payment_status TEXT NOT NULL DEFAULT 'UNPAID', expires_at TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id), FOREIGN KEY(package_id) REFERENCES packages(id) ON DELETE SET NULL,
    FOREIGN KEY(variant_id) REFERENCES package_variants(id) ON DELETE SET NULL,
    FOREIGN KEY(vehicle_id) REFERENCES fleet(id) ON DELETE SET NULL
  );
  CREATE TABLE IF NOT EXISTS booking_allocations (
    id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL UNIQUE, vehicle_id INTEGER NOT NULL,
    starts_on TEXT NOT NULL, ends_on TEXT NOT NULL,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
    FOREIGN KEY(vehicle_id) REFERENCES fleet(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL,
    method TEXT NOT NULL DEFAULT 'whatsapp_manual', amount INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING', reference TEXT, paid_at TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS kyc_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT, booking_id INTEGER NOT NULL, document_type TEXT NOT NULL,
    storage_path TEXT NOT NULL, original_name TEXT, status TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    reviewed_at TEXT, created_at TEXT NOT NULL,
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS inquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
    package_id TEXT, package_title TEXT, variant_id INTEGER, variant TEXT, locale TEXT DEFAULT 'id', audience TEXT DEFAULT 'local', travel_date TEXT, pax INTEGER,
    vehicle TEXT, pickup TEXT, notes TEXT, status TEXT NOT NULL DEFAULT 'Menunggu Konfirmasi',
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(travel_date, status);
  CREATE INDEX IF NOT EXISTS idx_allocations_vehicle_dates ON booking_allocations(vehicle_id, starts_on, ends_on);
`);

function addColumn(table, column, definition) {
  try { db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`); }
  catch (error) { if (!String(error.message).includes('duplicate column')) throw error; }
}
addColumn('fleet', 'capacity', 'INTEGER NOT NULL DEFAULT 4');
addColumn('fleet', 'transmission', 'TEXT');
addColumn('fleet', 'status', "TEXT NOT NULL DEFAULT 'idle'");
addColumn('promos', 'updated_at', 'TEXT');
addColumn('bookings', 'variant_id', 'INTEGER');
addColumn('bookings', 'locale', "TEXT DEFAULT 'id'");
addColumn('bookings', 'audience', "TEXT DEFAULT 'local'");
addColumn('inquiries', 'variant_id', 'INTEGER');
addColumn('inquiries', 'locale', "TEXT DEFAULT 'id'");
addColumn('inquiries', 'audience', "TEXT DEFAULT 'local'");
addColumn('package_variants', 'en_itinerary_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('package_variants', 'en_include_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('package_variants', 'en_exclude_json', "TEXT NOT NULL DEFAULT '[]'");
addColumn('package_variants', 'en_note', "TEXT DEFAULT ''");

const now = () => new Date().toISOString();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const cleanPhone = (value) => String(value || '').replace(/[^\d+]/g, '').replace(/^0/, '62');
const roundPrice = (value) => Math.round(Number(value || 0) / 10000) * 10000;
const uniqueCode = () => `JIT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const parseJson = (value, fallback = []) => { try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; } };

const seedPackages = [
  { id: 'borobudur-merapi', title: 'Borobudur & Merapi Escape', enTitle: 'Borobudur & Merapi Escape', area: 'Jogja', duration: 1, theme: 'culture', price: 750000, tag: 'Best Seller', image: 'https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=900&q=85', desc: 'Candi megah, udara pegunungan, dan cerita lokal dalam satu hari.', enDesc: 'Ancient temples, mountain air, and local stories in one day.', variants: ['Borobudur - Merapi', 'Borobudur - Prambanan'], itinerary: ['Jemput pagi dan sarapan lokal', 'Eksplorasi Candi Borobudur', 'Jeep tour lereng Merapi', 'Kembali ke kota saat senja'] },
  { id: 'dieng-golden-sunrise', title: 'Dieng Golden Sunrise', enTitle: 'Dieng Golden Sunrise', area: 'Dieng', duration: 2, theme: 'nature', price: 1250000, tag: 'Popular', image: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=85', desc: 'Matahari terbit, telaga warna, dan dingin Dieng yang selalu dirindukan.', enDesc: 'Golden sunrises, colourful lakes, and Dieng highland air.', variants: ['Dieng Plateau', 'Dieng - Sikunir Sunrise'], itinerary: ['Berangkat malam menuju Dieng', 'Sunrise di Bukit Sikunir', 'Telaga Warna dan Kawah Sikidang', 'Kuliner lokal dan perjalanan pulang'] },
  { id: 'jogja-slow-escape', title: 'Jogja Slow Escape', enTitle: 'Jogja Slow Escape', area: 'Jogja', duration: 3, theme: 'culture', price: 1980000, tag: 'New', image: 'https://images.unsplash.com/photo-1555899434-94d1368aa7af?auto=format&fit=crop&w=900&q=85', desc: 'Tiga hari untuk menikmati sisi Jogja yang hangat, pelan, dan penuh rasa.', enDesc: 'Three days to experience Jogja at its warmest, slowest, most soulful pace.', variants: ['Heritage & Culinary', 'Heritage - Beach - Culture'], itinerary: ['Jelajah Keraton dan kampung heritage', 'Sunset di Parangtritis', 'Workshop batik dan kuliner malam', 'Waktu bebas dan oleh-oleh'] },
  { id: 'karimunjawa-blue', title: 'Karimunjawa Blue Days', enTitle: 'Karimunjawa Blue Days', area: 'Karimunjawa', duration: 3, theme: 'beach', price: 2750000, tag: 'Limited', image: 'https://images.unsplash.com/photo-1507527762-9a4d7d4c0e6f?auto=format&fit=crop&w=900&q=85', desc: 'Air sebening kaca, pulau-pulau kecil, dan hari-hari tanpa terburu-buru.', enDesc: 'Crystal waters, tiny islands, and unhurried days by the sea.', variants: ['Island Hopping', 'Island Hopping - Sunset Cruise'], itinerary: ['Ferry pagi dari Jepara', 'Snorkeling dan island hopping', 'Sunset cruise', 'Waktu bebas dan ferry kembali'] }
];
const seedFleet = [
  { name: 'Toyota Avanza', type: 'MPV - 6 seats', capacity: 6, transmission: 'Automatic', image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=85', specs: ['6 seats', 'Automatic', 'AC'], from: 450000 },
  { name: 'Toyota Innova Reborn', type: 'Premium MPV - 7 seats', capacity: 7, transmission: 'Automatic', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=85', specs: ['7 seats', 'Automatic', 'Captain seat'], from: 750000 },
  { name: 'Toyota Hiace Premio', type: 'Van - 14 seats', capacity: 14, transmission: 'Manual', image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=85', specs: ['14 seats', 'Manual', 'Luggage'], from: 1200000 }
];
const tierCurve = (base) => [2, 3, 4, 5, 6, 7, 8, 9].map((pax, index) => ({ pax, price: roundPrice(base * [1.8, 1.35, 1, 0.96, 0.92, 0.89, 0.86, 0.83][index]) }));

if (db.prepare('SELECT COUNT(*) AS n FROM packages').get().n === 0) {
  const insert = db.prepare('INSERT INTO packages (id,title,en_title,area,duration,theme,price,tag,image,description,en_description,variants_json,itinerary_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const tierInsert = db.prepare('INSERT INTO package_price_tiers (package_id,pax,price_per_pax,season) VALUES (?,?,?,?)');
  for (const item of seedPackages) {
    insert.run(item.id, item.title, item.enTitle, item.area, item.duration, item.theme, item.price, item.tag, item.image, item.desc, item.enDesc, JSON.stringify(item.variants), JSON.stringify(item.itinerary), now(), now());
    for (const tier of tierCurve(item.price)) tierInsert.run(item.id, tier.pax, tier.price, 'normal');
  }
}
if (db.prepare('SELECT COUNT(*) AS n FROM fleet').get().n === 0) {
  const insert = db.prepare('INSERT INTO fleet (name,type,image,specs_json,capacity,transmission,status,from_price,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const item of seedFleet) insert.run(item.name, item.type, item.image, JSON.stringify(item.specs), item.capacity, item.transmission, 'idle', item.from, now());
}
if (!db.prepare('SELECT COUNT(*) AS n FROM rental_rates').get().n) {
  const insert = db.prepare('INSERT OR IGNORE INTO rental_rates (vehicle_id,service_type,duration_hours,price) VALUES (?,?,?,?)');
  for (const vehicle of db.prepare('SELECT id,name,from_price FROM fleet').all()) {
    insert.run(vehicle.id, 'driver_only', 12, vehicle.from_price);
    insert.run(vehicle.id, 'driver_fuel', 12, Math.round(vehicle.from_price * 1.35));
    insert.run(vehicle.id, 'all_in', 12, Math.round(vehicle.from_price * 1.5));
  }
}
// Self-drive is retired. Existing historical bookings/KYC rows remain available for audit,
// while no new self-drive rate can appear in the public or Owner catalog.
db.prepare("DELETE FROM rental_rates WHERE service_type='self_drive'").run();

function normalizeServiceType(value) {
  const service = String(value || 'driver_only').toLowerCase();
  if (service === 'trip_with_driver') return 'driver_only';
  if (!['driver_only', 'driver_fuel', 'all_in'].includes(service)) throw Object.assign(new Error('Model layanan tidak tersedia'), { statusCode: 400 });
  return service;
}
function normalizeLocale(value) { return String(value || '').toLowerCase().startsWith('en') ? 'en' : 'id'; }
function normalizeAudience(value) { return String(value || '').toLowerCase() === 'international' ? 'international' : 'local'; }

function ensureVariantsForPackage(packageRow) {
  if (!packageRow) return [];
  const existing = db.prepare('SELECT id FROM package_variants WHERE package_id=? ORDER BY sort_order,id').all(packageRow.id);
  if (existing.length) return existing;
  const legacy = parseJson(packageRow.variants_json, []);
  const labels = legacy.length ? legacy : [`${packageRow.title} - Paket Utama`];
  const itinerary = parseJson(packageRow.itinerary_json, []);
  const tiers = db.prepare("SELECT pax,price_per_pax AS price FROM package_price_tiers WHERE package_id=? AND season='normal' ORDER BY pax").all(packageRow.id);
  const insertVariant = db.prepare('INSERT INTO package_variants (package_id,code,title,en_title,subtitle,en_subtitle,hero_image,gallery_json,itinerary_json,include_json,exclude_json,note,active,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const insertTier = db.prepare("INSERT OR IGNORE INTO variant_price_tiers (variant_id,pax,price_per_pax,season) VALUES (?,?,?,'normal')");
  const created = [];
  labels.forEach((label, index) => {
    const code = String.fromCharCode(65 + index);
    const result = insertVariant.run(packageRow.id, code, String(label), String(label), '', '', packageRow.image || '', JSON.stringify(packageRow.image ? [packageRow.image] : []), JSON.stringify(itinerary), JSON.stringify(['Kendaraan private dan driver', 'Air mineral']), JSON.stringify(['Tiket masuk destinasi', 'Pengeluaran pribadi']), '', 1, index);
    const id = Number(result.lastInsertRowid); created.push({ id });
    for (const tier of tiers.length ? tiers : tierCurve(Number(packageRow.price))) insertTier.run(id, Number(tier.pax), Number(tier.price || tier.price_per_pax));
  });
  return created;
}

for (const packageRow of db.prepare('SELECT * FROM packages').all()) ensureVariantsForPackage(packageRow);

function activeSeason(packageId, travelDate) {
  const date = travelDate || today();
  return db.prepare(`
    SELECT season,price FROM season_prices WHERE package_id=?
      AND (starts_on IS NULL OR starts_on<=?) AND (ends_on IS NULL OR ends_on>=?)
    ORDER BY CASE lower(season) WHEN 'peak season' THEN 3 WHEN 'high season' THEN 2 WHEN 'low season' THEN 1 ELSE 0 END DESC, id DESC LIMIT 1
  `).get(packageId, date, date) || null;
}
function rowToVariant(row, packageRow, travelDate) {
  const allTiers = db.prepare('SELECT pax,price_per_pax AS price,season FROM variant_price_tiers WHERE variant_id=? ORDER BY season,pax').all(row.id);
  const fallbackTiers = db.prepare("SELECT pax,price_per_pax AS price,season FROM package_price_tiers WHERE package_id=? ORDER BY season,pax").all(packageRow.id);
  const tiers = allTiers.length ? allTiers : fallbackTiers;
  const season = activeSeason(packageRow.id, travelDate);
  const normalPax4 = db.prepare("SELECT price_per_pax AS price FROM package_price_tiers WHERE package_id=? AND pax=4 AND season='normal'").get(packageRow.id)?.price || packageRow.price;
  const multiplier = season ? Number(season.price) / Number(normalPax4 || packageRow.price) : 1;
  const priceTiers = tiers.filter((tier) => tier.season === 'normal').map((tier) => ({ pax: tier.pax, price: roundPrice(Number(tier.price) * multiplier) }));
  return {
    ...row,
    enTitle: row.en_title,
    enSubtitle: row.en_subtitle,
    subtitle: row.subtitle,
    heroImage: row.hero_image || packageRow.image,
    gallery: parseJson(row.gallery_json, row.hero_image ? [row.hero_image] : packageRow.image ? [packageRow.image] : []),
    itinerary: parseJson(row.itinerary_json, parseJson(packageRow.itinerary_json, [])),
    include: parseJson(row.include_json, []),
    exclude: parseJson(row.exclude_json, []),
    enItinerary: parseJson(row.en_itinerary_json, []), enInclude: parseJson(row.en_include_json, []), enExclude: parseJson(row.en_exclude_json, []), enNote: row.en_note || '',
    priceTiers,
    price: priceTiers.find((tier) => tier.pax === 4)?.price || roundPrice(Number(packageRow.price) * multiplier)
  };
}
function rowToPackage(row, travelDate) {
  if (!row) return null;
  let tiers = db.prepare('SELECT pax,price_per_pax AS price,season FROM package_price_tiers WHERE package_id=? ORDER BY season,pax').all(row.id);
  if (!tiers.length) {
    tiers = tierCurve(Number(row.price)).map((tier) => ({ pax: tier.pax, price: tier.price, season: 'normal' }));
    const insertTier = db.prepare('INSERT OR IGNORE INTO package_price_tiers (package_id,pax,price_per_pax,season) VALUES (?,?,?,?)');
    for (const tier of tiers) insertTier.run(row.id, tier.pax, tier.price, 'normal');
  }
  const season = activeSeason(row.id, travelDate);
  const normalPax4 = tiers.find((tier) => tier.pax === 4 && tier.season === 'normal')?.price || row.price;
  const multiplier = season ? Number(season.price) / Number(normalPax4 || row.price) : 1;
  const priceTiers = tiers.filter((tier) => tier.season === 'normal').map((tier) => ({ pax: tier.pax, price: roundPrice(Number(tier.price) * multiplier) }));
  const variants = db.prepare('SELECT * FROM package_variants WHERE package_id=? AND active=1 ORDER BY sort_order,id').all(row.id).map((variant) => rowToVariant(variant, row, travelDate));
  return {
    ...row, enTitle: row.en_title, enDesc: row.en_description, desc: row.description,
    variants, legacyVariants: parseJson(row.variants_json), itinerary: parseJson(row.itinerary_json),
    variantDetails: variants,
    reviews: db.prepare('SELECT guest_name AS guestName,text,en_text AS enText FROM reviews WHERE package_id=? AND approved=1 ORDER BY id DESC').all(row.id),
    seasons: db.prepare('SELECT id,season,price,starts_on AS startsOn,ends_on AS endsOn FROM season_prices WHERE package_id=? ORDER BY id').all(row.id),
    priceTiers, price: priceTiers.find((tier) => tier.pax === 4)?.price || roundPrice(Number(row.price) * multiplier)
  };
}
const publicPackages = (travelDate) => db.prepare('SELECT * FROM packages ORDER BY created_at').all().map((row) => rowToPackage(row, travelDate));
const publicPromos = (date = today()) => db.prepare('SELECT * FROM promos WHERE active=1 AND (starts_on IS NULL OR starts_on<=?) AND (ends_on IS NULL OR ends_on>=?) ORDER BY id DESC').all(date, date);
const publicFleet = () => db.prepare("SELECT id,name,type,image,specs_json,capacity,transmission,status,from_price FROM fleet WHERE status!='retired' ORDER BY id").all().map((v) => ({ ...v, specs: parseJson(v.specs_json), from: v.from_price }));

function resolveVehicleId(value) {
  if (!value) return null;
  if (/^\d+$/.test(String(value))) return Number(value);
  return db.prepare('SELECT id FROM fleet WHERE lower(name)=lower(?)').get(String(value).split(' · ')[0].trim())?.id || null;
}
function calculateQuote({ packageId, variantId, pax, travelDate, vehicleId, serviceType = 'driver_only' }) {
  const row = db.prepare('SELECT * FROM packages WHERE id=?').get(packageId);
  if (!row) throw new Error('Package not found');
  const normalizedService = normalizeServiceType(serviceType);
  const people = Number(pax || 4);
  if (!Number.isInteger(people) || people < 2 || people > 9) throw Object.assign(new Error('Jumlah peserta harus 2–9 orang'), { statusCode: 400 });
  const date = travelDate || today();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date || date < today()) throw Object.assign(new Error('Tanggal perjalanan tidak valid atau sudah lewat'), { statusCode: 400 });
  const packageData = rowToPackage(row, travelDate);
  const variant = variantId ? packageData.variantDetails.find((entry) => Number(entry.id) === Number(variantId)) : packageData.variantDetails[0];
  if (!variant) throw Object.assign(new Error('Varian trip tidak ditemukan'), { statusCode: 400 });
  const tier = variant.priceTiers.find((item) => item.pax === people) || variant.priceTiers.reduce((closest, item) => Math.abs(item.pax - people) < Math.abs(closest.pax - people) ? item : closest);
  const baseAmount = Number(tier?.price || packageData.price) * people;
  const vehicle = vehicleId ? db.prepare('SELECT * FROM fleet WHERE id=?').get(Number(vehicleId)) : null;
  if (vehicleId && !vehicle) throw Object.assign(new Error('Unit kendaraan tidak ditemukan'), { statusCode: 400 });
  if (vehicle && vehicle.status !== 'idle') throw Object.assign(new Error('Unit kendaraan sedang tidak tersedia'), { statusCode: 409 });
  if (vehicle && people > Number(vehicle.capacity || 0)) throw Object.assign(new Error('Jumlah peserta melebihi kapasitas kendaraan'), { statusCode: 400 });
  const vehicleSurcharge = vehicle && vehicle.name.toLowerCase().includes('innova') ? 250000 : vehicle && vehicle.name.toLowerCase().includes('hiace') ? 650000 : 0;
  const promo = publicPromos(travelDate).find((item) => !item.package_id || item.package_id === packageId);
  const discountAmount = promo ? promo.discount_type === 'percent' ? Math.round(baseAmount * Number(promo.discount_value) / 100) : Math.min(baseAmount, Number(promo.discount_value)) : 0;
  return { packageId, variantId: variant.id, pax: people, travelDate, serviceType: normalizedService, vehicleId: vehicle?.id || null, baseAmount, vehicleSurcharge, discountAmount, totalAmount: Math.max(0, baseAmount + vehicleSurcharge - discountAmount), promo: promo ? { title: promo.title, discountType: promo.discount_type, discountValue: promo.discount_value } : null };
}
function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req, maxBytes = 12_000_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; if (Buffer.byteLength(data) > maxBytes) { reject(new Error('Request body terlalu besar')); req.destroy(); } });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { reject(new Error('JSON body tidak valid')); } });
    req.on('error', reject);
  });
}
function ownerKey() {
  if (process.env.OWNER_KEY) return process.env.OWNER_KEY;
  if (!globalThis.__jitOwnerKey) { globalThis.__jitOwnerKey = crypto.randomBytes(24).toString('hex'); console.warn(`OWNER_KEY belum diatur. Kunci sesi lokal: ${globalThis.__jitOwnerKey}`); }
  return globalThis.__jitOwnerKey;
}
const ownerAttempts = new Map();
function owner(req, res) {
  const ip = req.socket.remoteAddress || 'unknown';
  const attempt = ownerAttempts.get(ip) || { count: 0, at: Date.now() };
  if (Date.now() - attempt.at > 15 * 60 * 1000) attempt.count = 0;
  if (req.headers['x-owner-key'] !== ownerKey()) {
    attempt.count += 1; attempt.at = Date.now(); ownerAttempts.set(ip, attempt);
    if (attempt.count > 20) return json(res, 429, { error: 'Terlalu banyak percobaan autentikasi' });
    json(res, 401, { error: 'Owner authentication required' }); return false;
  }
  ownerAttempts.delete(ip); return true;
}
function safePublicFile(pathname) {
  const allowed = new Set(['/', '/index.html', '/app.js', '/styles.css', '/owner-portal-jit-7f3c2a.html', '/admin.js']);
  if (!allowed.has(pathname)) return null;
  return pathname === '/' ? path.join(ROOT, 'index.html') : path.join(ROOT, pathname.slice(1));
}
function serveStatic(req, res, pathname) {
  const file = safePublicFile(pathname);
  if (pathname.startsWith('/public-uploads/')) {
    const name = path.basename(pathname);
    if (!/^[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(name)) return false;
    const publicFile = path.join(PUBLIC_DIR, name);
    if (!fs.existsSync(publicFile)) return false;
    const extension = path.extname(name).toLowerCase(); const type = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.png' ? 'image/png' : extension === '.gif' ? 'image/gif' : 'image/webp';
    res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' }); fs.createReadStream(publicFile).pipe(res); return true;
  }
  if (!file || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return false;
  const type = pathname.endsWith('.html') || pathname === '/' ? 'text/html; charset=utf-8' : pathname.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/css; charset=utf-8';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'no-cache' }); fs.createReadStream(file).pipe(res); return true;
}
function savePrivateDocuments(bookingId, documents = []) {
  const insert = db.prepare('INSERT INTO kyc_documents (booking_id,document_type,storage_path,original_name,created_at) VALUES (?,?,?,?,?)');
  const saved = [];
  for (const document of documents) {
    if (!document?.type || !document?.dataUrl) continue;
    const match = String(document.dataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (!match) continue;
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 4_000_000) throw new Error('Setiap dokumen KYC maksimal 4 MB');
    const extension = match[1].includes('pdf') ? 'pdf' : match[1].split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
    const filename = `${bookingId}-${crypto.randomUUID()}.${extension}`;
    const relative = path.join('private-uploads', filename);
    fs.writeFileSync(path.join(DATA_DIR, relative), buffer, { flag: 'wx' });
    insert.run(bookingId, document.type, relative, String(document.name || filename).slice(0, 180), now());
    saved.push({ type: document.type, name: document.name || filename });
  }
  return saved;
}
function createBooking(body) {
  const name = String(body.name || '').trim();
  const phone = cleanPhone(body.phone);
  const date = String(body.date || '').slice(0, 10);
  const pax = Number(body.pax || 0);
  const packageId = body.packageId || null;
  const serviceType = normalizeServiceType(body.serviceType);
  const locale = normalizeLocale(body.locale);
  const audience = normalizeAudience(body.audience);
  if (!name || !phone || !date || !packageId || !Number.isInteger(pax) || pax < 1) throw new Error('Data booking belum lengkap');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Tanggal perjalanan tidak valid');
  if (date < today()) throw Object.assign(new Error('Tanggal perjalanan tidak boleh lewat'), { statusCode: 400 });
  const vehicleId = resolveVehicleId(body.vehicleId || body.vehicle);
  const packageRow = db.prepare('SELECT * FROM packages WHERE id=?').get(packageId);
  if (!packageRow) throw Object.assign(new Error('Paket trip tidak ditemukan'), { statusCode: 404 });
  ensureVariantsForPackage(packageRow);
  const variantId = body.variantId ? Number(body.variantId) : Number(db.prepare('SELECT id FROM package_variants WHERE package_id=? AND active=1 ORDER BY sort_order,id LIMIT 1').get(packageId)?.id || 0);
  const quote = calculateQuote({ packageId, variantId, pax, travelDate: date, vehicleId, serviceType });
  const endDate = body.endDate || date;
  if (endDate < date || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw Object.assign(new Error('Tanggal selesai tidak valid'), { statusCode: 400 });
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    const foundUser = db.prepare('SELECT id FROM users WHERE phone=?').get(phone);
    const userId = foundUser?.id || Number(db.prepare('INSERT INTO users (full_name,phone,email,created_at,updated_at) VALUES (?,?,?,?,?)').run(name, phone, body.email || null, now(), now()).lastInsertRowid);
    if (foundUser) db.prepare('UPDATE users SET full_name=?,email=?,updated_at=? WHERE id=?').run(name, body.email || null, now(), foundUser.id);
    const code = uniqueCode();
    const bookingId = Number(db.prepare(`
      INSERT INTO bookings (code,user_id,package_id,variant_id,vehicle_id,service_type,variant,locale,audience,travel_date,end_date,pax,pickup,notes,base_amount,discount_amount,total_amount,expires_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(code, userId, packageId, variantId, vehicleId, serviceType, body.variant || null, locale, audience, date, endDate, pax, body.pickup || null, body.notes || null, quote.baseAmount + quote.vehicleSurcharge, quote.discountAmount, quote.totalAmount, expiresAt, now(), now()).lastInsertRowid);
    if (vehicleId) {
      const conflict = db.prepare(`
        SELECT b.id FROM booking_allocations a JOIN bookings b ON b.id=a.booking_id
        WHERE a.vehicle_id=? AND a.starts_on < ? AND a.ends_on > ?
          AND b.status IN ('PENDING_OWNER_CONFIRMATION','CONFIRMED')
          AND (b.status='CONFIRMED' OR b.expires_at IS NULL OR b.expires_at>?) LIMIT 1
      `).get(vehicleId, `${endDate}T23:59:59.999Z`, `${date}T00:00:00.000Z`, now());
      if (conflict) throw Object.assign(new Error('Unit kendaraan sudah memiliki booking pada tanggal tersebut'), { statusCode: 409 });
      db.prepare('INSERT INTO booking_allocations (booking_id,vehicle_id,starts_on,ends_on) VALUES (?,?,?,?)').run(bookingId, vehicleId, `${date}T00:00:00.000Z`, `${endDate}T23:59:59.999Z`);
    }
    db.prepare('INSERT INTO payments (booking_id,method,amount,created_at) VALUES (?,?,?,?)').run(bookingId, 'whatsapp_manual', quote.totalAmount, now());
    db.prepare('INSERT INTO inquiries (name,phone,package_id,package_title,variant_id,variant,locale,audience,travel_date,pax,vehicle,pickup,notes,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(name, phone, packageId, db.prepare('SELECT title FROM packages WHERE id=?').get(packageId)?.title || '', variantId, body.variant || '', locale, audience, date, pax, body.vehicle || vehicleId || '', body.pickup || '', body.notes || '', 'Menunggu Konfirmasi', now());
    db.exec('COMMIT');
    return { id: bookingId, code, quote, status: 'Menunggu Konfirmasi', paymentStatus: 'UNPAID', locale, audience, variantId };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
function ownerBookingRows() {
  return db.prepare(`
    SELECT b.id,b.code,b.service_type,b.variant,b.variant_id,b.locale,b.audience,b.travel_date,b.end_date,b.pax,b.pickup,b.notes,
      b.base_amount,b.discount_amount,b.total_amount,b.status,b.payment_status,b.created_at,
      u.full_name AS name,u.phone,p.title AS package_title,f.name AS vehicle,pv.title AS variant_title
    FROM bookings b JOIN users u ON u.id=b.user_id
      LEFT JOIN packages p ON p.id=b.package_id LEFT JOIN package_variants pv ON pv.id=b.variant_id LEFT JOIN fleet f ON f.id=b.vehicle_id
    ORDER BY b.id DESC
  `).all().map((row) => ({ ...row, packageTitle: row.package_title, variantTitle: row.variant_title, date: row.travel_date, paymentStatus: row.payment_status }));
}
function publicVariantRows(packageId, travelDate = today()) {
  const packageRow = db.prepare('SELECT * FROM packages WHERE id=?').get(packageId);
  if (!packageRow) return [];
  ensureVariantsForPackage(packageRow);
  return db.prepare('SELECT * FROM package_variants WHERE package_id=? ORDER BY sort_order,id').all(packageId).map((row) => ({ ...rowToVariant(row, packageRow, travelDate), active: Boolean(row.active), sortOrder: row.sort_order, priceTiers: db.prepare("SELECT pax,price_per_pax AS price FROM variant_price_tiers WHERE variant_id=? AND season='normal' ORDER BY pax").all(row.id) }));
}
function saveVariant(packageId, body, variantId = null) {
  const packageRow = db.prepare('SELECT * FROM packages WHERE id=?').get(packageId);
  if (!packageRow) throw Object.assign(new Error('Package not found'), { statusCode: 404 });
  const code = String(body.code || 'A').trim().slice(0, 8).toUpperCase();
  if (!/^[A-H]$/.test(code) || !String(body.title || '').trim()) throw Object.assign(new Error('Kode harus A–H dan judul wajib diisi'), { statusCode: 400 });
  if (body.priceTiers && (body.priceTiers.length !== 8 || new Set(body.priceTiers.map(t => Number(t.pax))).size !== 8 || body.priceTiers.some(t => !Number.isInteger(Number(t.pax)) || Number(t.pax) < 2 || Number(t.pax) > 9 || !Number.isSafeInteger(Number(t.price)) || Number(t.price) <= 0))) throw Object.assign(new Error('Isi semua delapan harga pax 2–9 dengan angka positif'), { statusCode: 400 });
  const values = [packageId, code, body.title || `Pilihan ${code}`, body.enTitle || body.title || `Option ${code}`, body.subtitle || '', body.enSubtitle || body.subtitle || '', body.heroImage || body.hero_image || packageRow.image || '', JSON.stringify(body.gallery || []), JSON.stringify(body.itinerary || []), JSON.stringify(body.include || []), JSON.stringify(body.exclude || []), body.note || '', body.active === false ? 0 : 1, Number(body.sortOrder ?? body.sort_order ?? 0)];
  let id;
  if (variantId) {
    db.prepare('UPDATE package_variants SET code=?,title=?,en_title=?,subtitle=?,en_subtitle=?,hero_image=?,gallery_json=?,itinerary_json=?,include_json=?,exclude_json=?,note=?,active=?,sort_order=? WHERE id=? AND package_id=?').run(...values.slice(1), Number(variantId), packageId);
    id = Number(variantId);
  } else {
    id = Number(db.prepare('INSERT INTO package_variants (package_id,code,title,en_title,subtitle,en_subtitle,hero_image,gallery_json,itinerary_json,include_json,exclude_json,note,active,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(...values).lastInsertRowid);
  }
  if (body.priceTiers) {
    db.prepare('DELETE FROM variant_price_tiers WHERE variant_id=?').run(id);
    const insert = db.prepare("INSERT INTO variant_price_tiers (variant_id,pax,price_per_pax,season) VALUES (?,?,?,'normal')");
    for (const tier of body.priceTiers) if (Number(tier.pax) >= 2 && Number(tier.pax) <= 9 && Number(tier.price || tier.pricePerPax) > 0) insert.run(id, Number(tier.pax), Number(tier.price || tier.pricePerPax));
  }
  db.prepare('UPDATE package_variants SET en_itinerary_json=?,en_include_json=?,en_exclude_json=?,en_note=? WHERE id=?').run(JSON.stringify(body.enItinerary || []), JSON.stringify(body.enInclude || []), JSON.stringify(body.enExclude || []), body.enNote || '', id);
  return db.prepare('SELECT * FROM package_variants WHERE id=?').get(id);
}

async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const p = url.pathname;
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,x-owner-key', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,OPTIONS' }); return res.end(); }
  try {
    if (p === '/api/public/bootstrap' && req.method === 'GET') return json(res, 200, {
      packages: publicPackages(url.searchParams.get('date') || today()), fleet: publicFleet(),
      rentalRates: db.prepare("SELECT vehicle_id AS vehicleId,service_type AS serviceType,duration_hours AS durationHours,price FROM rental_rates WHERE service_type IN ('driver_only','driver_fuel','all_in')").all(),
      promos: publicPromos(url.searchParams.get('date') || today()),
      services: ['driver_only', 'driver_fuel', 'all_in'],
      supportedLocales: ['id', 'en'], supportedAudiences: ['local', 'international'],
      bookingPolicy: { ownerPhone: '+62 878-3945-6221', manualPayment: true, confirmationRequired: true, holdMinutes: 20, selfDriveAvailable: false }
    });
    if (p === '/api/public/quote' && req.method === 'POST') { const body = await readBody(req, 100000); return json(res, 200, calculateQuote({ packageId: body.packageId, variantId: body.variantId, pax: body.pax, travelDate: body.travelDate, vehicleId: resolveVehicleId(body.vehicleId || body.vehicle), serviceType: body.serviceType })); }
    if (p === '/api/public/inquiries' && req.method === 'POST') { const body = await readBody(req); return json(res, 201, createBooking(body)); }
    if (p === '/api/owner/session' && req.method === 'GET') return json(res, 200, { ok: req.headers['x-owner-key'] === ownerKey() });
    if (p.startsWith('/api/owner/') && !owner(req, res)) return;
    if (p === '/api/owner/packages' && req.method === 'GET') return json(res, 200, db.prepare('SELECT * FROM packages ORDER BY created_at').all().map(row => ({ ...rowToPackage(row), variants: parseJson(row.variants_json), variantDetails: publicVariantRows(row.id), priceTiers: db.prepare("SELECT pax,price_per_pax AS price FROM package_price_tiers WHERE package_id=? AND season='normal' ORDER BY pax").all(row.id) })));
    const packageVariantsMatch = p.match(/^\/api\/owner\/packages\/([^/]+)\/variants$/);
    if (packageVariantsMatch && req.method === 'GET') return json(res, 200, publicVariantRows(packageVariantsMatch[1]));
    if (packageVariantsMatch && req.method === 'POST') { const body = await readBody(req); return json(res, 201, saveVariant(packageVariantsMatch[1], body)); }
    const variantMatch = p.match(/^\/api\/owner\/variants\/(\d+)$/);
    if (variantMatch && ['PUT', 'PATCH'].includes(req.method)) { const body = await readBody(req); const existing = db.prepare('SELECT package_id FROM package_variants WHERE id=?').get(Number(variantMatch[1])); if (!existing) return json(res, 404, { error: 'Variant not found' }); return json(res, 200, saveVariant(existing.package_id, body, Number(variantMatch[1]))); }
    if (variantMatch && req.method === 'DELETE') { db.prepare('UPDATE package_variants SET active=0 WHERE id=?').run(Number(variantMatch[1])); return json(res, 200, { ok: true }); }
    if (p === '/api/owner/reviews' && req.method === 'GET') return json(res, 200, db.prepare('SELECT * FROM reviews ORDER BY id DESC').all());
    if (p === '/api/owner/reviews' && req.method === 'POST') { const body = await readBody(req); if (!body.packageId || !body.guestName || !body.text) return json(res,400,{error:'Paket, nama tamu, dan ulasan wajib diisi'}); const result = db.prepare('INSERT INTO reviews (package_id,guest_name,text,en_text,approved) VALUES (?,?,?,?,?)').run(body.packageId,body.guestName,body.text,body.enText || '',body.approved === true ? 1 : 0); return json(res,201,{id:Number(result.lastInsertRowid)}); }
    const reviewMatch = p.match(/^\/api\/owner\/reviews\/(\d+)$/);
    if (reviewMatch && req.method === 'PATCH') { const body = await readBody(req); db.prepare('UPDATE reviews SET approved=? WHERE id=?').run(body.approved === true ? 1 : 0, Number(reviewMatch[1])); return json(res,200,{ok:true}); }
    if (p === '/api/owner/packages' && req.method === 'POST') {
      const body = await readBody(req); const id = body.id || `package-${Date.now()}`;
      db.prepare('INSERT INTO packages (id,title,en_title,area,duration,theme,price,tag,image,description,en_description,variants_json,itinerary_json,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(id, body.title, body.enTitle || body.title, body.area || 'Jogja', Number(body.duration || 1), body.theme || 'culture', Number(body.price || 0), body.tag || 'Draft', body.image || '', body.desc || '', body.enDesc || body.desc || '', JSON.stringify(body.variants || []), JSON.stringify(body.itinerary || []), now(), now());
      const insertTier = db.prepare('INSERT OR REPLACE INTO package_price_tiers (package_id,pax,price_per_pax,season) VALUES (?,?,?,?)');
      for (const tier of body.priceTiers || tierCurve(Number(body.price || 0))) insertTier.run(id, Number(tier.pax), Number(tier.price || tier.pricePerPax), 'normal');
      ensureVariantsForPackage(db.prepare('SELECT * FROM packages WHERE id=?').get(id));
      return json(res, 201, rowToPackage(db.prepare('SELECT * FROM packages WHERE id=?').get(id)));
    }
    const packageMatch = p.match(/^\/api\/owner\/packages\/([^/]+)$/);
    if (packageMatch && req.method === 'PUT') {
      const id = packageMatch[1]; const body = await readBody(req);
      if (!db.prepare('SELECT id FROM packages WHERE id=?').get(id)) return json(res, 404, { error: 'Package not found' });
      db.prepare('UPDATE packages SET title=?,en_title=?,area=?,duration=?,theme=?,price=?,tag=?,image=?,description=?,en_description=?,variants_json=?,itinerary_json=?,updated_at=? WHERE id=?')
        .run(body.title, body.enTitle || body.title, body.area || 'Jogja', Number(body.duration || 1), body.theme || 'culture', Number(body.price || 0), body.tag || '', body.image || '', body.desc || '', body.enDesc || body.desc || '', JSON.stringify(body.variants || []), JSON.stringify(body.itinerary || []), now(), id);
      db.prepare('DELETE FROM season_prices WHERE package_id=?').run(id);
      const seasonInsert = db.prepare('INSERT INTO season_prices (package_id,season,price,starts_on,ends_on) VALUES (?,?,?,?,?)');
      for (const season of body.seasons || []) if (season?.price) seasonInsert.run(id, season.season, Number(season.price), season.startsOn || null, season.endsOn || null);
      db.prepare('DELETE FROM package_price_tiers WHERE package_id=?').run(id);
      const tierInsert = db.prepare('INSERT INTO package_price_tiers (package_id,pax,price_per_pax,season) VALUES (?,?,?,?)');
      for (const tier of body.priceTiers || tierCurve(Number(body.price || 0))) tierInsert.run(id, Number(tier.pax), Number(tier.price || tier.pricePerPax), 'normal');
      ensureVariantsForPackage(db.prepare('SELECT * FROM packages WHERE id=?').get(id));
      return json(res, 200, rowToPackage(db.prepare('SELECT * FROM packages WHERE id=?').get(id)));
    }
    if (p === '/api/owner/fleet' && req.method === 'GET') return json(res, 200, publicFleet());
    const fleetMatch = p.match(/^\/api\/owner\/fleet\/(\d+)$/);
    if (fleetMatch && req.method === 'PUT') {
      const body = await readBody(req);
      db.prepare('UPDATE fleet SET name=?,type=?,image=?,specs_json=?,capacity=?,transmission=?,status=?,from_price=?,updated_at=? WHERE id=?')
        .run(body.name, body.type, body.image, JSON.stringify(body.specs || []), Number(body.capacity || 4), body.transmission || null, body.status || 'idle', Number(body.from || 0), now(), Number(fleetMatch[1]));
      return json(res, 200, { ok: true });
    }
    if (p === '/api/owner/bookings' && req.method === 'GET') return json(res, 200, ownerBookingRows());
    const bookingMatch = p.match(/^\/api\/owner\/bookings\/(\d+)$/);
    if (bookingMatch && req.method === 'PATCH') {
      const body = await readBody(req); const bookingId = Number(bookingMatch[1]);
      const status = body.status === 'Dikonfirmasi' ? 'CONFIRMED' : body.status === 'Dibatalkan' ? 'CANCELLED' : body.status || 'CONFIRMED';
      if (!['PENDING_OWNER_CONFIRMATION','CONFIRMED','COMPLETED','CANCELLED'].includes(status)) return json(res,400,{error:'Status tidak valid'});
      if (status === 'CONFIRMED') {
        const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(bookingId);
        if (!booking) return json(res,404,{error:'Booking tidak ditemukan'});
        const conflict = db.prepare("SELECT a.booking_id FROM booking_allocations a JOIN bookings b ON b.id=a.booking_id WHERE a.vehicle_id=? AND a.booking_id!=? AND a.starts_on < ? AND a.ends_on > ? AND (b.status='CONFIRMED' OR (b.status='PENDING_OWNER_CONFIRMATION' AND b.expires_at>?)) LIMIT 1").get(booking.vehicle_id,bookingId,`${booking.end_date || booking.travel_date}T23:59:59.999Z`,`${booking.travel_date}T00:00:00.000Z`,now());
        if (conflict) return json(res,409,{error:'Unit sudah teralokasi ke booking lain'});
      }
      db.prepare('UPDATE bookings SET status=?,updated_at=? WHERE id=?').run(status, now(), bookingId);
      return json(res, 200, { ok: true, status });
    }
    if (p === '/api/owner/promos' && req.method === 'GET') return json(res, 200, db.prepare('SELECT * FROM promos ORDER BY id DESC').all());
    if (p === '/api/owner/promos' && req.method === 'POST') {
      const body = await readBody(req);
      const result = db.prepare('INSERT INTO promos (title,en_title,discount_type,discount_value,starts_on,ends_on,package_id,image,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
        .run(body.title, body.enTitle || body.title, body.discountType || 'percent', Number(body.discountValue || 0), body.startsOn || null, body.endsOn || null, body.packageId || null, body.image || '', body.active === false ? 0 : 1, now(), now());
      return json(res, 201, { id: Number(result.lastInsertRowid) });
    }
    const promoMatch = p.match(/^\/api\/owner\/promos\/(\d+)$/);
    if (promoMatch && ['PUT', 'PATCH'].includes(req.method)) {
      const body = await readBody(req);
      db.prepare('UPDATE promos SET title=?,en_title=?,discount_type=?,discount_value=?,starts_on=?,ends_on=?,package_id=?,image=?,active=?,updated_at=? WHERE id=?')
        .run(body.title, body.enTitle || body.title, body.discountType || 'percent', Number(body.discountValue || 0), body.startsOn || null, body.endsOn || null, body.packageId || null, body.image || '', body.active === false ? 0 : 1, now(), Number(promoMatch[1]));
      return json(res, 200, { ok: true });
    }
    if (p === '/api/owner/uploads' && req.method === 'POST') {
      const body = await readBody(req, 8000000); const match = String(body.dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return json(res, 400, { error: 'dataUrl gambar tidak valid' });
      const buffer = Buffer.from(match[2], 'base64'); if (buffer.length > 5000000) return json(res, 413, { error: 'Ukuran gambar maksimal 5 MB' });
      const extension = match[1].split('/')[1]?.replace(/[^a-z0-9]/gi, '') || 'bin';
      if (body.visibility === 'public' && !['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(extension.toLowerCase())) return json(res, 415, { error: 'Foto publik harus berupa JPG, PNG, WebP, atau GIF' });
      const publicImage = body.visibility === 'public'; const directory = publicImage ? PUBLIC_DIR : PRIVATE_DIR; const publicName = `${crypto.randomUUID()}.${extension}`;
      fs.writeFileSync(path.join(directory, publicName), buffer, { flag: 'wx' }); return json(res, 201, { path: publicImage ? `/public-uploads/${publicName}` : `private-uploads/${publicName}` });
    }
    if (!serveStatic(req, res, p)) return json(res, 404, { error: 'Not found' });
  } catch (error) { console.error(error); return json(res, error.statusCode || 500, { error: error.message || 'Server error' }); }
}
const PORT = Number(process.env.PORT || 4173);
http.createServer(handler).listen(PORT, () => console.log(`JAVA ISLAND TRIP server running at http://localhost:${PORT}`));
