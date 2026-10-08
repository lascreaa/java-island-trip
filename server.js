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
  CREATE TABLE IF NOT EXISTS booking_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL,
    item_type TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price INTEGER NOT NULL DEFAULT 0,
    subtotal INTEGER NOT NULL DEFAULT 0,
    snapshot_json TEXT NOT NULL DEFAULT '{}',
    FOREIGN KEY(booking_id) REFERENCES bookings(id) ON DELETE CASCADE
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
  CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INTEGER NOT NULL,
    permission_id INTEGER NOT NULL,
    PRIMARY KEY(role_id, permission_id),
    FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role_id INTEGER NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(role_id) REFERENCES roles(id)
  );
  CREATE TABLE IF NOT EXISTS admin_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT NOT NULL UNIQUE,
    admin_user_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    en_question TEXT NOT NULL DEFAULT '',
    answer TEXT NOT NULL,
    en_answer TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'general',
    sort_order INTEGER NOT NULL DEFAULT 0,
    published INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS homepage_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_key TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL DEFAULT '',
    en_title TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    en_body TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_type TEXT NOT NULL DEFAULT 'owner',
    actor_id INTEGER,
    action TEXT NOT NULL,
    entity TEXT NOT NULL,
    entity_id TEXT,
    before_json TEXT,
    after_json TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_bookings_date_status ON bookings(travel_date, status);
  CREATE INDEX IF NOT EXISTS idx_allocations_vehicle_dates ON booking_allocations(vehicle_id, starts_on, ends_on);
  CREATE INDEX IF NOT EXISTS idx_faqs_published_order ON faqs(published, archived, sort_order);
  CREATE INDEX IF NOT EXISTS idx_homepage_visible_order ON homepage_sections(visible, sort_order);
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
addColumn('packages', 'trail', "TEXT DEFAULT ''");

const now = () => new Date().toISOString();
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const cleanPhone = (value) => String(value || '').replace(/[^\d+]/g, '').replace(/^0/, '62');
const roundPrice = (value) => Math.round(Number(value || 0) / 10000) * 10000;
const uniqueCode = () => `JIT-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const parseJson = (value, fallback = []) => { try { return JSON.parse(value || JSON.stringify(fallback)); } catch { return fallback; } };
const publicStatus = (status) => ({
  PENDING_OWNER_CONFIRMATION: 'WAITING_CONFIRMATION',
  'Menunggu Konfirmasi': 'WAITING_CONFIRMATION',
  Dikonfirmasi: 'CONFIRMED',
  Dibatalkan: 'CANCELLED'
}[status] || status || 'PENDING');
const legacyStatus = (status) => ({
  WAITING_CONFIRMATION: 'PENDING_OWNER_CONFIRMATION',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED'
}[status] || status);
function audit(action, entity, entityId, before = null, after = null, actorType = 'owner', actorId = null) {
  db.prepare('INSERT INTO audit_logs (actor_type,actor_id,action,entity,entity_id,before_json,after_json,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(actorType, actorId, action, entity, entityId == null ? null : String(entityId), before ? JSON.stringify(before) : null, after ? JSON.stringify(after) : null, now());
}
function seedAdminModel() {
  const roles = [
    ['SUPER_ADMIN', 'Super Admin'],
    ['ADMIN', 'Admin'],
    ['STAFF', 'Staff']
  ];
  const permissions = [
    ['catalog:read', 'Read catalog'], ['catalog:write', 'Manage catalog'],
    ['booking:read', 'Read bookings'], ['booking:write', 'Manage bookings'],
    ['content:write', 'Manage content'], ['settings:write', 'Manage settings'],
    ['users:write', 'Manage users'], ['audit:read', 'Read audit logs']
  ];
  const roleInsert = db.prepare('INSERT OR IGNORE INTO roles (code,name,created_at) VALUES (?,?,?)');
  const permissionInsert = db.prepare('INSERT OR IGNORE INTO permissions (code,name) VALUES (?,?)');
  roles.forEach((role) => roleInsert.run(role[0], role[1], now()));
  permissions.forEach((permission) => permissionInsert.run(permission[0], permission[1]));
  const roleIds = Object.fromEntries(db.prepare('SELECT id,code FROM roles').all().map((row) => [row.code, row.id]));
  const permissionIds = Object.fromEntries(db.prepare('SELECT id,code FROM permissions').all().map((row) => [row.code, row.id]));
  const link = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id,permission_id) VALUES (?,?)');
  Object.entries({
    SUPER_ADMIN: Object.keys(permissionIds),
    ADMIN: ['catalog:read', 'catalog:write', 'booking:read', 'booking:write', 'content:write', 'audit:read'],
    STAFF: ['catalog:read', 'booking:read', 'booking:write']
  }).forEach(([role, codes]) => codes.forEach((code) => link.run(roleIds[role], permissionIds[code])));
  const ownerEmail = process.env.OWNER_EMAIL || 'owner@javaislandtrip.com';
  db.prepare('INSERT OR IGNORE INTO admin_users (full_name,email,role_id,active,created_at,updated_at) VALUES (?,?,?,?,?,?)')
    .run('JAVA ISLAND TRIP Owner', ownerEmail, roleIds.SUPER_ADMIN, 1, now(), now());
}
seedAdminModel();
function publicFaqs(locale = 'id') {
  return db.prepare('SELECT id,question,en_question AS enQuestion,answer,en_answer AS enAnswer,category,sort_order AS sortOrder FROM faqs WHERE published=1 AND archived=0 ORDER BY sort_order,id')
    .all().map((item) => ({ ...item, question: locale === 'en' ? item.enQuestion || item.question : item.question, answer: locale === 'en' ? item.enAnswer || item.answer : item.answer }));
}
function publicHomepage(locale = 'id') {
  return db.prepare('SELECT section_key AS sectionKey,title,en_title AS enTitle,body,en_body AS enBody,image,sort_order AS sortOrder FROM homepage_sections WHERE visible=1 ORDER BY sort_order,id')
    .all().map((item) => ({ ...item, title: locale === 'en' ? item.enTitle || item.title : item.title, body: locale === 'en' ? item.enBody || item.body : item.body }));
}
function adminAuth(req, requiredPermission = null) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '') || String(req.headers['x-admin-session'] || '');
  if (!token) return null;
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  const user = db.prepare(`SELECT au.*,r.code AS role_code,GROUP_CONCAT(p.code) AS permission_codes
    FROM admin_sessions s JOIN admin_users au ON au.id=s.admin_user_id
    JOIN roles r ON r.id=au.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id
    LEFT JOIN permissions p ON p.id=rp.permission_id
    WHERE s.token_hash=? AND au.active=1 AND s.expires_at>? GROUP BY au.id`).get(hash, now());
  if (!user) return null;
  const permissionsList = String(user.permission_codes || '').split(',').filter(Boolean);
  if (requiredPermission && user.role_code !== 'SUPER_ADMIN' && !permissionsList.includes(requiredPermission)) return null;
  return { ...user, permissions: permissionsList };
}
function requireAdmin(req, res, permission = null) {
  const sessionUser = adminAuth(req, permission);
  if (sessionUser) return sessionUser;
  if (req.headers['x-owner-key'] === ownerKey()) return { id: null, role_code: 'SUPER_ADMIN', permissions: ['*'] };
  json(res, 401, { success: false, message: 'Authentication required', error: { code: 'AUTH_REQUIRED' } });
  return null;
}
function v1Success(res, status, message, data) {
  return json(res, status, { success: true, message, data });
}
function v1Error(res, status, message, code = 'REQUEST_ERROR') {
  return json(res, status, { success: false, message, error: { code } });
}
if (db.prepare('SELECT COUNT(*) AS n FROM faqs').get().n === 0) {
  const faqInsert = db.prepare('INSERT INTO faqs (question,en_question,answer,en_answer,category,sort_order,published,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
  [
    ['Apakah harga sudah termasuk driver?', 'Does the price include a driver?', 'Ya, layanan publik kami menggunakan kendaraan dengan driver.', 'Yes. Our public services include a professional driver.', 'booking', 1],
    ['Bagaimana cara melakukan pembayaran?', 'How do I pay?', 'Pembayaran dilakukan manual melalui WhatsApp setelah Owner mengonfirmasi ketersediaan.', 'Payment is arranged manually through WhatsApp after the Owner confirms availability.', 'payment', 2],
    ['Berapa jumlah peserta yang dapat dipilih?', 'How many guests can I select?', 'Kalkulator paket mendukung 2 sampai 9 peserta. Untuk rombongan lebih besar, hubungi kami melalui WhatsApp.', 'Package pricing supports 2 to 9 guests. Contact us on WhatsApp for larger groups.', 'booking', 3],
    ['Apakah ada paket khusus wisatawan Malaysia?', 'Is there a package for Malaysian travellers?', 'Ya. Paket Hiking Malaysia (Gunung Prau via Patak Banteng, Gunung Merbabu via Suwanting, dan Combo) dihargai dalam Ringgit (RM) dengan minimal 4 peserta per grup.', 'Yes. The Malaysia Hiking packages (Mount Prau via Patak Banteng, Mount Merbabu via Suwanting, and a Combo) are priced in Ringgit (RM) with a minimum of 4 guests per group.', 'booking', 4]
  ].forEach((item) => faqInsert.run(item[0], item[1], item[2], item[3], item[4], item[5], 1, 0, now(), now()));
}
/* Ensure Malaysia FAQ exists even if faqs were already seeded (idempotent). */
(function ensureMalaysiaFaq() {
  const exists = db.prepare("SELECT 1 FROM faqs WHERE question LIKE '%Malaysia%' OR en_question LIKE '%Malaysia%'").get();
  if (!exists) {
    db.prepare('INSERT INTO faqs (question,en_question,answer,en_answer,category,sort_order,published,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
      .run('Apakah ada paket khusus wisatawan Malaysia?', 'Is there a package for Malaysian travellers?', 'Ya. Paket Hiking Malaysia (Gunung Prau via Patak Banteng, Gunung Merbabu via Suwanting, dan Combo) dihargai dalam Ringgit (RM) dengan minimal 4 peserta per grup.', 'Yes. The Malaysia Hiking packages (Mount Prau via Patak Banteng, Mount Merbabu via Suwanting, and a Combo) are priced in Ringgit (RM) with a minimum of 4 guests per group.', 'booking', 4, 1, 0, now(), now());
  }
})();
if (db.prepare('SELECT COUNT(*) AS n FROM homepage_sections').get().n === 0) {
  const sectionInsert = db.prepare('INSERT INTO homepage_sections (section_key,title,en_title,body,en_body,image,sort_order,visible,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)');
  [
    ['hero', 'Jelajah Jawa dengan cara yang lebih berarti.', 'See Java in a more meaningful way.', 'Paket trip terkurasi, kendaraan dengan driver, dan bantuan lokal untuk perjalanan yang terasa dekat.', 'Thoughtfully curated trips, driver-led vehicles, and local support for a more personal journey.', '', 1],
    ['booking_note', 'Booking disimpan sebelum dikonfirmasi.', 'Your request is saved before confirmation.', 'Permintaan booking diperiksa Owner sebelum pembayaran manual dilakukan melalui WhatsApp.', 'The Owner checks every request before manual payment is arranged through WhatsApp.', '', 2]
  ].forEach((item) => sectionInsert.run(item[0], item[1], item[2], item[3], item[4], item[5], item[6], 1, now(), now()));
}

const seedPackages = [
  {
    id: 'prau-patakbanteng',
    title: 'Mount Prau via Patak Banteng', enTitle: 'Mount Prau via Patak Banteng',
    area: 'Malaysia Trip', duration: 2, theme: 'hiking', price: 1650000, tag: 'Best Seller',
    image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=900&q=85',
    desc: 'Golden sunrise dari Puncak Prau (2.565 mdpl) melalui jalur populer Patak Banteng yang lebih singkat dan landai di awal. Cocok untuk pendaki pemula hingga berpengalaman.',
    enDesc: 'Golden sunrise from Prau Summit (2,565 masl) via the popular Patak Banteng trail — shorter and gentler at the start. Great for beginners and seasoned hikers.',
    trail: 'Patak Banteng',
    variants: ['Prau via Patak Banteng - Standard', 'Prau via Patak Banteng - Private Camp'],
    itinerary: [
      'Hari 1  Penjemputan & perjalanan ke basecamp Patak Banteng, Dieng',
      'Hari 1  Registrasi, briefing, dan trekking sore via Patak Banteng',
      'Hari 1  Mendirikan camp di area Puncak Prau, makan malam',
      'Hari 2  Summit attack dini hari, golden sunrise di Puncak Prau',
      'Hari 2  Turun via Patak Banteng, bersih diri, eksplor singkat Dieng',
      'Hari 2  Perjalanan pulang'
    ]
  },
  {
    id: 'merbabu-suwanting',
    title: 'Mount Merbabu via Suwanting', enTitle: 'Mount Merbabu via Suwanting',
    area: 'Malaysia Trip', duration: 2, theme: 'hiking', price: 2900000, tag: 'Popular',
    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=85',
    desc: 'Sabana luas dan trek yang memanjakan mata menuju Puncak Merbabu (3.145 mdpl) via jalur favorit Suwanting, dengan panorama Merapi yang megah saat sunrise.',
    enDesc: 'Wide savanna and a scenic trail to Merbabu Summit (3,145 masl) via the favourite Suwanting route, with majestic Merapi views at sunrise.',
    trail: 'Suwanting',
    variants: ['Merbabu via Suwanting - Standard', 'Merbabu via Suwanting - Private Camp'],
    itinerary: [
      'Hari 1  Penjemputan & perjalanan ke basecamp Suwanting, Magelang',
      'Hari 1  Registrasi, briefing, trekking via pos-pos Suwanting',
      'Hari 1  Camp di area sabana, makan malam, istirahat',
      'Hari 2  Summit attack ke Puncak Trianggulasi/Kenteng Songo',
      'Hari 2  Sunrise dengan view Merapi, turun via Suwanting',
      'Hari 2  Perjalanan pulang'
    ]
  },
  {
    id: 'prau-merbabu-combo',
    title: 'Prau + Merbabu Combo Expedition', enTitle: 'Prau + Merbabu Combo Expedition',
    area: 'Malaysia Trip', duration: 4, theme: 'hiking', price: 4000000, tag: 'Limited',
    image: 'https://images.unsplash.com/photo-1454496522488-7a8e488e8606?auto=format&fit=crop&w=900&q=85',
    desc: 'Ekspedisi dua gunung dalam satu perjalanan: Prau via Patak Banteng dan Merbabu via Suwanting, dengan hari pemulihan di Dataran Tinggi Dieng.',
    enDesc: 'A two-mountain expedition in one journey: Prau via Patak Banteng and Merbabu via Suwanting, with a recovery day on the Dieng Plateau.',
    trail: 'Patak Banteng & Suwanting',
    variants: ['Combo 4D3N - Standard', 'Combo 4D3N - Full Support'],
    itinerary: [
      'Hari 1  Penjemputan, menuju basecamp Patak Banteng (Prau)',
      'Hari 1-2  Trekking & sunrise Puncak Prau via Patak Banteng',
      'Hari 3  Hari pemulihan & eksplor Dataran Tinggi Dieng',
      'Hari 4  Trekking Merbabu via Suwanting, sunrise, pulang'
    ]
  }
];
/* Tarif dari riset pasar (harga pasar.txt) — titik tengah rentang, IDR per 12 jam.
   driver_only diestimasi dari Mobil+Driver+BBM dikurangi porsi BBM. */
const seedFleet = [
  { name: 'Toyota Avanza', type: 'MPV - 6 seats', capacity: 6, transmission: 'Automatic', image: '/image/avanza.jpg', specs: ['6 seats', 'Automatic', 'AC'], from: 500000, rates: { driver_only: 500000, driver_fuel: 725000, all_in: 850000 } },
  { name: 'Toyota Innova Reborn', type: 'Premium MPV - 7 seats', capacity: 7, transmission: 'Automatic', image: '/image/REBORN.jpg', specs: ['7 seats', 'Automatic', 'Captain seat'], from: 700000, rates: { driver_only: 700000, driver_fuel: 950000, all_in: 1100000 } },
  { name: 'Toyota Hiace Premio', type: 'Van - 14 seats', capacity: 14, transmission: 'Manual', image: '/image/PREMIO.jpg', specs: ['14 seats', 'Manual', 'Luggage'], from: 1100000, rates: { driver_only: 1100000, driver_fuel: 1450000, all_in: 1850000 } },
  { name: 'Toyota Hiace Commuter', type: 'Van - 14 seats', capacity: 14, transmission: 'Manual', image: '/image/COMMUTER.jpg', specs: ['14 seats', 'Manual', 'Luggage'], from: 900000, rates: { driver_only: 900000, driver_fuel: 1200000, all_in: 1550000 } },
  { name: 'Isuzu Elf Long', type: 'Minibus - 19 seats', capacity: 19, transmission: 'Manual', image: '/image/ELFLONG.jpg', specs: ['19 seats', 'Manual', 'Luggage besar'], from: 1100000, rates: { driver_only: 1100000, driver_fuel: 1500000, all_in: 1650000 } },
  { name: 'Medium Bus Pariwisata', type: 'Bus - 31 seats', capacity: 31, transmission: 'Manual', image: '/image/BUSMEDIUM.jpg', specs: ['31 seats', 'Manual', 'Bagasi luas'], from: 1600000, rates: { driver_only: 1600000, driver_fuel: 2050000, all_in: 2250000 } }
];
const tierCurve = (base) => [2, 3, 4, 5, 6, 7, 8, 9].map((pax, index) => ({ pax, price: roundPrice(base * [1.8, 1.35, 1, 0.96, 0.92, 0.89, 0.86, 0.83][index]) }));
/* Malaysia hiking packages start at 4 pax (min-4-pax rule). */
const tierCurveMalaysia = (base) => [4, 5, 6, 7, 8, 9, 10].map((pax, index) => ({ pax, price: roundPrice(base * [1, 0.96, 0.92, 0.89, 0.86, 0.83, 0.80][index]) }));

/* One-time idempotent migration: replace legacy leisure packages with the 3 Malaysia hiking packages. */
(function migrateLegacyPackages() {
  const legacyIds = ['borobudur-merapi', 'dieng-golden-sunrise', 'jogja-slow-escape', 'karimunjawa-blue'];
  const hasLegacy = legacyIds.some((id) => db.prepare('SELECT 1 FROM packages WHERE id=?').get(id));
  const hasNew = db.prepare('SELECT 1 FROM packages WHERE id=?').get('prau-patakbanteng');
  if (hasLegacy && !hasNew) {
    db.exec('BEGIN');
    try {
      for (const id of legacyIds) db.prepare('DELETE FROM packages WHERE id=?').run(id);
      const insert = db.prepare('INSERT INTO packages (id,title,en_title,area,duration,theme,price,tag,image,description,en_description,variants_json,itinerary_json,trail,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
      const tierInsert = db.prepare('INSERT OR IGNORE INTO package_price_tiers (package_id,pax,price_per_pax,season) VALUES (?,?,?,?)');
      for (const item of seedPackages) {
        insert.run(item.id, item.title, item.enTitle, item.area, item.duration, item.theme, item.price, item.tag, item.image, item.desc, item.enDesc, JSON.stringify(item.variants), JSON.stringify(item.itinerary), item.trail || '', now(), now());
        for (const tier of tierCurveMalaysia(item.price)) tierInsert.run(item.id, tier.pax, tier.price, 'normal');
      }
      db.exec('COMMIT');
      console.log('[migrate] Replaced legacy packages with Malaysia hiking packages.');
    } catch (error) { db.exec('ROLLBACK'); console.error('[migrate] Failed:', error.message); }
  }
})();
/* Backfill trail for existing hiking packages (idempotent). */
(function backfillTrail() {
  const trails = { 'prau-patakbanteng': 'Patak Banteng', 'merbabu-suwanting': 'Suwanting', 'prau-merbabu-combo': 'Patak Banteng & Suwanting' };
  const update = db.prepare("UPDATE packages SET trail=? WHERE id=? AND (trail IS NULL OR trail='')");
  for (const [id, trail] of Object.entries(trails)) update.run(trail, id);
})();
/* Terapkan harga hiking dari riset pasar (idempotent — hanya jika harga masih nilai placeholder lama). */
(function applyRisetHikingPrices() {
  const targets = [
    { id: 'prau-patakbanteng', oldPrice: 3150000, price: 1650000 },
    { id: 'merbabu-suwanting', oldPrice: 3420000, price: 2900000 },
    { id: 'prau-merbabu-combo', oldPrice: 5850000, price: 4000000 }
  ];
  const updPkg = db.prepare('UPDATE packages SET price=?,updated_at=? WHERE id=?');
  const updTier = db.prepare("UPDATE package_price_tiers SET price_per_pax=? WHERE package_id=? AND pax=? AND season='normal'");
  const variants = db.prepare('SELECT id FROM package_variants WHERE package_id=?');
  const updVarTier = db.prepare("UPDATE variant_price_tiers SET price_per_pax=? WHERE variant_id=? AND pax=? AND season='normal'");
  for (const t of targets) {
    const row = db.prepare('SELECT price FROM packages WHERE id=?').get(t.id);
    if (!row || Number(row.price) !== t.oldPrice) continue; // sudah di-update / diubah admin
    db.exec('BEGIN');
    try {
      updPkg.run(t.price, now(), t.id);
      const tiers = tierCurveMalaysia(t.price);
      for (const tier of tiers) {
        updTier.run(tier.price, t.id, tier.pax);
        for (const v of variants.all(t.id)) updVarTier.run(tier.price, v.id, tier.pax);
      }
      db.exec('COMMIT');
      console.log(`[migrate] Harga riset diterapkan: ${t.id} -> ${t.price}`);
    } catch (e) { db.exec('ROLLBACK'); console.error('[migrate] harga gagal:', e.message); }
  }
})();

if (db.prepare('SELECT COUNT(*) AS n FROM packages').get().n === 0) {
  const insert = db.prepare('INSERT INTO packages (id,title,en_title,area,duration,theme,price,tag,image,description,en_description,variants_json,itinerary_json,trail,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
  const tierInsert = db.prepare('INSERT INTO package_price_tiers (package_id,pax,price_per_pax,season) VALUES (?,?,?,?)');
  for (const item of seedPackages) {
    insert.run(item.id, item.title, item.enTitle, item.area, item.duration, item.theme, item.price, item.tag, item.image, item.desc, item.enDesc, JSON.stringify(item.variants), JSON.stringify(item.itinerary), item.trail || '', now(), now());
    const curve = String(item.area).toLowerCase().includes('malaysia') ? tierCurveMalaysia : tierCurve;
    for (const tier of curve(item.price)) tierInsert.run(item.id, tier.pax, tier.price, 'normal');
  }
}
if (db.prepare('SELECT COUNT(*) AS n FROM fleet').get().n === 0) {
  const insert = db.prepare('INSERT INTO fleet (name,type,image,specs_json,capacity,transmission,status,from_price,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  for (const item of seedFleet) insert.run(item.name, item.type, item.image, JSON.stringify(item.specs), item.capacity, item.transmission, 'idle', item.from, now());
}
/* Idempotent sync: arahkan fleet ke foto lokal + tambah unit baru + terapkan tarif riset. */
(function syncFleetAndRates() {
  const upsertRate = db.prepare('INSERT INTO rental_rates (vehicle_id,service_type,duration_hours,price) VALUES (?,?,?,?) ON CONFLICT(vehicle_id,service_type,duration_hours) DO UPDATE SET price=excluded.price');
  const insertFleet = db.prepare('INSERT INTO fleet (name,type,image,specs_json,capacity,transmission,status,from_price,updated_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const updateImage = db.prepare('UPDATE fleet SET image=?,from_price=?,updated_at=? WHERE id=?');
  for (const item of seedFleet) {
    let row = db.prepare('SELECT id FROM fleet WHERE lower(name)=lower(?)').get(item.name);
    if (!row) {
      const r = insertFleet.run(item.name, item.type, item.image, JSON.stringify(item.specs), item.capacity, item.transmission, 'idle', item.from, now());
      row = { id: Number(r.lastInsertRowid) };
    } else if (String(db.prepare('SELECT image FROM fleet WHERE id=?').get(row.id).image || '').includes('unsplash') || !String(db.prepare('SELECT image FROM fleet WHERE id=?').get(row.id).image || '').startsWith('/image/')) {
      updateImage.run(item.image, item.from, now(), row.id);
    }
    for (const [service, price] of Object.entries(item.rates)) upsertRate.run(row.id, service, 12, price);
  }
})();
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
  if (!Number.isInteger(people) || people < 2 || people > 10) throw Object.assign(new Error('Jumlah peserta harus 2–10 orang'), { statusCode: 400 });
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
  const addonTotal = 0;
  const pickupFee = 0;
  const destinationFee = 0;
  const serviceFee = 0;
  const tax = 0;
  const subtotal = baseAmount + vehicleSurcharge + addonTotal + pickupFee + destinationFee + serviceFee + tax;
  return {
    packageId, variantId: variant.id, pax: people, travelDate, serviceType: normalizedService,
    vehicleId: vehicle?.id || null, baseAmount, vehicleSurcharge, addonTotal, pickupFee,
    destinationFee, serviceFee, tax, subtotal, discountAmount,
    totalAmount: Math.max(0, subtotal - discountAmount),
    promo: promo ? { title: promo.title, discountType: promo.discount_type, discountValue: promo.discount_value } : null
  };
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
function serveImageFile(res, filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const type = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.png' ? 'image/png' : extension === '.gif' ? 'image/gif' : 'image/webp';
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' });
  fs.createReadStream(filePath).pipe(res);
  return true;
}
function serveStatic(req, res, pathname) {
  const file = safePublicFile(pathname);
  if (pathname.startsWith('/image/')) {
    const name = path.basename(pathname);
    if (!/^[a-z0-9._-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(name) || name.includes('..')) return false;
    const imgFile = path.join(ROOT, 'image', name);
    if (!fs.existsSync(imgFile)) return false;
    return serveImageFile(res, imgFile);
  }
  if (pathname.startsWith('/public-uploads/')) {
    const name = path.basename(pathname);
    if (!/^[a-z0-9-]+\.(?:jpg|jpeg|png|webp|gif)$/i.test(name)) return false;
    const publicFile = path.join(PUBLIC_DIR, name);
    if (!fs.existsSync(publicFile)) return false;
    return serveImageFile(res, publicFile);
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
    const variantRow = db.prepare('SELECT title,en_title FROM package_variants WHERE id=?').get(variantId);
    const packageSnapshot = db.prepare('SELECT title,en_title FROM packages WHERE id=?').get(packageId);
    db.prepare(`INSERT INTO booking_items
      (booking_id,item_type,product_id,product_name,quantity,unit_price,subtotal,snapshot_json)
      VALUES (?,?,?,?,?,?,?,?)`).run(
      bookingId, 'package', packageId, packageSnapshot?.title || packageId, pax,
      Math.round(quote.baseAmount / Math.max(1, pax)), quote.baseAmount,
      JSON.stringify({ package: packageSnapshot, variant: variantRow, quote })
    );
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
    audit('CREATE', 'booking', bookingId, null, { code, packageId, variantId, quote, status: 'WAITING_CONFIRMATION' });
    db.exec('COMMIT');
    return { id: bookingId, code, quote, status: 'WAITING_CONFIRMATION', legacyStatus: 'Menunggu Konfirmasi', paymentStatus: 'UNPAID', locale, audience, variantId };
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
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,Authorization,x-owner-key,x-admin-session', 'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' }); return res.end(); }
  try {
    if (p === '/api/v1/auth/login' && req.method === 'POST') {
      const body = await readBody(req, 100000);
      const suppliedKey = String(body.ownerKey || body.password || req.headers['x-owner-key'] || '');
      if (!suppliedKey || suppliedKey !== ownerKey()) return v1Error(res, 401, 'Invalid credentials', 'AUTH_INVALID');
      const email = String(body.email || process.env.OWNER_EMAIL || 'owner@javaislandtrip.com').trim().toLowerCase();
      const user = db.prepare('SELECT au.id,au.full_name AS fullName,au.email,r.code AS role FROM admin_users au JOIN roles r ON r.id=au.role_id WHERE au.email=? AND au.active=1').get(email)
        || db.prepare('SELECT au.id,au.full_name AS fullName,au.email,r.code AS role FROM admin_users au JOIN roles r ON r.id=au.role_id WHERE au.email=?').get(process.env.OWNER_EMAIL || 'owner@javaislandtrip.com');
      if (!user) return v1Error(res, 403, 'Admin user is not configured', 'ADMIN_NOT_CONFIGURED');
      const rawToken = crypto.randomBytes(32).toString('hex');
      db.prepare('INSERT INTO admin_sessions (token_hash,admin_user_id,expires_at,created_at) VALUES (?,?,?,?)')
        .run(crypto.createHash('sha256').update(rawToken).digest('hex'), user.id, new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), now());
      audit('LOGIN', 'admin_session', user.id, null, { role: user.role }, 'admin', user.id);
      return v1Success(res, 200, 'Login successful', { token: rawToken, user });
    }
    if (p === '/api/v1/auth/session' && req.method === 'GET') {
      const user = adminAuth(req);
      return user ? v1Success(res, 200, 'Session active', { id: user.id, name: user.full_name, role: user.role_code, permissions: user.permissions })
        : v1Error(res, 401, 'Session expired', 'AUTH_REQUIRED');
    }
    const locale = normalizeLocale(url.searchParams.get('locale'));
    if (p === '/api/v1/packages' && req.method === 'GET') return v1Success(res, 200, 'Packages retrieved successfully', publicPackages(url.searchParams.get('date') || today()));
    const packageSlug = p.match(/^\/api\/v1\/packages\/([^/]+)$/);
    if (packageSlug && req.method === 'GET') {
      const item = rowToPackage(db.prepare('SELECT * FROM packages WHERE id=?').get(decodeURIComponent(packageSlug[1])), url.searchParams.get('date') || today());
      return item ? v1Success(res, 200, 'Package retrieved successfully', item) : v1Error(res, 404, 'Package not found', 'PACKAGE_NOT_FOUND');
    }
    if (p === '/api/v1/trips' && req.method === 'GET') return v1Success(res, 200, 'Trips retrieved successfully', publicPackages(url.searchParams.get('date') || today()));
    if (p === '/api/v1/vehicles' && req.method === 'GET') return v1Success(res, 200, 'Vehicles retrieved successfully', publicFleet());
    if (p === '/api/v1/promotions' && req.method === 'GET') return v1Success(res, 200, 'Promotions retrieved successfully', publicPromos(url.searchParams.get('date') || today()));
    if (p === '/api/v1/faqs' && req.method === 'GET') return v1Success(res, 200, 'FAQs retrieved successfully', publicFaqs(locale));
    if (p === '/api/v1/homepage' && req.method === 'GET') return v1Success(res, 200, 'Homepage content retrieved successfully', publicHomepage(locale));
    if (p === '/api/v1/settings/public' && req.method === 'GET') {
      const settings = Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((row) => [row.key, row.value]));
      return v1Success(res, 200, 'Public settings retrieved successfully', { ...settings, whatsapp: settings.whatsapp || '+62 878-3945-6221', currency: settings.currency || 'IDR', timezone: settings.timezone || 'Asia/Jakarta' });
    }
    if (p === '/api/v1/bookings/calculate' && req.method === 'POST') {
      const body = await readBody(req, 100000);
      return v1Success(res, 200, 'Booking estimate calculated successfully', calculateQuote({ packageId: body.packageId, variantId: body.variantId, pax: body.pax, travelDate: body.travelDate, vehicleId: resolveVehicleId(body.vehicleId || body.vehicle), serviceType: body.serviceType }));
    }
    if (p === '/api/v1/bookings' && req.method === 'POST') {
      const body = await readBody(req);
      return v1Success(res, 201, 'Booking created successfully', createBooking(body));
    }
    if (p === '/api/v1/availability' && req.method === 'GET') {
      const date = url.searchParams.get('date') || today();
      const rows = publicFleet().map((vehicle) => {
        const busy = db.prepare(`SELECT 1 FROM booking_allocations a JOIN bookings b ON b.id=a.booking_id
          WHERE a.vehicle_id=? AND a.starts_on<=? AND a.ends_on>=?
          AND b.status IN ('PENDING_OWNER_CONFIRMATION','CONFIRMED','WAITING_CONFIRMATION') LIMIT 1`)
          .get(vehicle.id, `${date}T23:59:59.999Z`, `${date}T00:00:00.000Z`);
        return { ...vehicle, available: !busy && vehicle.status === 'idle' };
      });
      return v1Success(res, 200, 'Availability retrieved successfully', rows);
    }
    if (p.startsWith('/api/v1/admin/')) {
      const user = requireAdmin(req, res);
      if (!user) return;
      const resource = p.split('/')[4];
      const resourceId = p.split('/')[5];
      if (resource === 'faqs' && req.method === 'GET') return v1Success(res, 200, 'FAQs retrieved successfully', db.prepare('SELECT * FROM faqs WHERE archived=0 ORDER BY sort_order,id').all());
      if (resource === 'homepage' && req.method === 'GET') return v1Success(res, 200, 'Homepage content retrieved successfully', db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order,id').all());
      if (resource === 'audit-logs' && req.method === 'GET') return v1Success(res, 200, 'Audit logs retrieved successfully', db.prepare('SELECT * FROM audit_logs ORDER BY id DESC LIMIT 500').all());
      if (resource === 'bookings' && req.method === 'GET') return v1Success(res, 200, 'Bookings retrieved successfully', ownerBookingRows().map((row) => ({ ...row, status: publicStatus(row.status) })));
      if (resource === 'bookings' && resourceId && ['PATCH'].includes(req.method)) {
        if (user.role_code !== 'SUPER_ADMIN' && !user.permissions.includes('*') && !user.permissions.includes('booking:write')) return v1Error(res, 403, 'Permission denied', 'FORBIDDEN');
        const id = Number(resourceId); const booking = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
        if (!booking) return v1Error(res, 404, 'Booking not found', 'BOOKING_NOT_FOUND');
        const requested = String((await readBody(req)).status || '').toUpperCase();
        const next = legacyStatus(requested);
        const allowed = new Set(['PENDING_OWNER_CONFIRMATION', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'WAITING_CONFIRMATION', 'PENDING', 'IN_PROGRESS', 'EXPIRED']);
        if (!allowed.has(requested) && !allowed.has(next)) return v1Error(res, 400, 'Invalid booking status', 'INVALID_STATUS');
        const normalized = next === 'PENDING' ? 'PENDING_OWNER_CONFIRMATION' : next === 'WAITING_CONFIRMATION' ? 'PENDING_OWNER_CONFIRMATION' : next;
        db.prepare('UPDATE bookings SET status=?,updated_at=? WHERE id=?').run(normalized, now(), id);
        audit('STATUS_CHANGE', 'booking', id, { status: booking.status }, { status: normalized }, 'admin', user.id);
        return v1Success(res, 200, 'Booking status updated successfully', { id, status: publicStatus(normalized) });
      }
      if (resource === 'settings' && req.method === 'GET') return v1Success(res, 200, 'Settings retrieved successfully', db.prepare('SELECT * FROM settings ORDER BY key').all());
      if (resource === 'faqs' && ['POST'].includes(req.method)) {
        if (user.role_code !== 'SUPER_ADMIN' && !user.permissions.includes('*') && !user.permissions.includes('content:write')) return v1Error(res, 403, 'Permission denied', 'FORBIDDEN');
        const body = await readBody(req); const result = db.prepare('INSERT INTO faqs (question,en_question,answer,en_answer,category,sort_order,published,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
          .run(String(body.question || '').trim(), body.enQuestion || body.question || '', String(body.answer || '').trim(), body.enAnswer || body.answer || '', body.category || 'general', Number(body.sortOrder || 0), body.published === false ? 0 : 1, 0, now(), now());
        audit('CREATE', 'faq', result.lastInsertRowid, null, body, 'admin', user.id);
        return v1Success(res, 201, 'FAQ created successfully', { id: Number(result.lastInsertRowid) });
      }
      if (resource === 'faqs' && resourceId && ['PUT', 'PATCH', 'DELETE'].includes(req.method)) {
        if (user.role_code !== 'SUPER_ADMIN' && !user.permissions.includes('*') && !user.permissions.includes('content:write')) return v1Error(res, 403, 'Permission denied', 'FORBIDDEN');
        const id = Number(resourceId); const previous = db.prepare('SELECT * FROM faqs WHERE id=?').get(id);
        if (!previous) return v1Error(res, 404, 'FAQ not found', 'FAQ_NOT_FOUND');
        if (req.method === 'DELETE') {
          db.prepare('UPDATE faqs SET archived=1,updated_at=? WHERE id=?').run(now(), id);
          audit('ARCHIVE', 'faq', id, previous, { archived: 1 }, 'admin', user.id);
          return v1Success(res, 200, 'FAQ archived successfully', { id });
        }
        const body = await readBody(req);
        db.prepare(`UPDATE faqs SET question=?,en_question=?,answer=?,en_answer=?,category=?,sort_order=?,published=?,archived=?,updated_at=? WHERE id=?`)
          .run(body.question ?? previous.question, body.enQuestion ?? previous.en_question, body.answer ?? previous.answer, body.enAnswer ?? previous.en_answer, body.category ?? previous.category, Number(body.sortOrder ?? previous.sort_order), body.published === false ? 0 : 1, body.archived === true ? 1 : 0, now(), id);
        const after = db.prepare('SELECT * FROM faqs WHERE id=?').get(id);
        audit('UPDATE', 'faq', id, previous, after, 'admin', user.id);
        return v1Success(res, 200, 'FAQ updated successfully', after);
      }
      if (resource === 'settings' && ['PUT', 'PATCH'].includes(req.method)) {
        if (user.role_code !== 'SUPER_ADMIN' && !user.permissions.includes('*') && !user.permissions.includes('settings:write')) return v1Error(res, 403, 'Permission denied', 'FORBIDDEN');
        const body = await readBody(req);
        for (const [key, value] of Object.entries(body)) {
          const previous = db.prepare('SELECT value FROM settings WHERE key=?').get(key);
          db.prepare('INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at').run(key, String(value ?? ''), now());
          audit('UPDATE', 'setting', key, previous, { value }, 'admin', user.id);
        }
        return v1Success(res, 200, 'Settings updated successfully', body);
      }
      if (resource === 'homepage' && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        if (user.role_code !== 'SUPER_ADMIN' && !user.permissions.includes('*') && !user.permissions.includes('content:write')) return v1Error(res, 403, 'Permission denied', 'FORBIDDEN');
        const body = await readBody(req); const key = body.sectionKey || body.section_key;
        if (!key) return v1Error(res, 400, 'sectionKey is required', 'VALIDATION_ERROR');
        const previous = db.prepare('SELECT * FROM homepage_sections WHERE section_key=?').get(key);
        db.prepare(`INSERT INTO homepage_sections (section_key,title,en_title,body,en_body,image,sort_order,visible,created_at,updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(section_key) DO UPDATE SET title=excluded.title,en_title=excluded.en_title,body=excluded.body,en_body=excluded.en_body,image=excluded.image,sort_order=excluded.sort_order,visible=excluded.visible,updated_at=excluded.updated_at`)
          .run(key, body.title || '', body.enTitle || body.title || '', body.body || '', body.enBody || body.body || '', body.image || '', Number(body.sortOrder || 0), body.visible === false ? 0 : 1, now(), now());
        audit(previous ? 'UPDATE' : 'CREATE', 'homepage_section', key, previous, body, 'admin', user.id);
        return v1Success(res, 200, 'Homepage section saved successfully', db.prepare('SELECT * FROM homepage_sections WHERE section_key=?').get(key));
      }
      return v1Error(res, 404, 'Admin resource not found', 'RESOURCE_NOT_FOUND');
    }
    if (p === '/api/public/bootstrap' && req.method === 'GET') return json(res, 200, {
      packages: publicPackages(url.searchParams.get('date') || today()), fleet: publicFleet(),
      rentalRates: db.prepare("SELECT vehicle_id AS vehicleId,service_type AS serviceType,duration_hours AS durationHours,price FROM rental_rates WHERE service_type IN ('driver_only','driver_fuel','all_in')").all(),
      promos: publicPromos(url.searchParams.get('date') || today()),
      faqs: publicFaqs(normalizeLocale(url.searchParams.get('locale'))),
      homepage: publicHomepage(normalizeLocale(url.searchParams.get('locale'))),
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
    /* ===== FAQ (Owner) ===== */
    if (p === '/api/owner/faqs' && req.method === 'GET') return json(res, 200, db.prepare('SELECT * FROM faqs ORDER BY sort_order,id').all());
    if (p === '/api/owner/faqs' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body.question || !body.answer) return json(res, 400, { error: 'Pertanyaan & jawaban wajib diisi' });
      const r = db.prepare('INSERT INTO faqs (question,en_question,answer,en_answer,category,sort_order,published,archived,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(body.question, body.enQuestion || '', body.answer, body.enAnswer || '', body.category || 'general', Number(body.sortOrder || 0), body.published === false ? 0 : 1, 0, now(), now());
      audit('CREATE', 'faq', Number(r.lastInsertRowid), null, body);
      return json(res, 201, { id: Number(r.lastInsertRowid) });
    }
    const faqMatch = p.match(/^\/api\/owner\/faqs\/(\d+)$/);
    if (faqMatch && ['PUT', 'PATCH'].includes(req.method)) {
      const body = await readBody(req); const id = Number(faqMatch[1]);
      const prev = db.prepare('SELECT * FROM faqs WHERE id=?').get(id);
      if (!prev) return json(res, 404, { error: 'FAQ tidak ditemukan' });
      db.prepare('UPDATE faqs SET question=?,en_question=?,answer=?,en_answer=?,category=?,sort_order=?,published=?,updated_at=? WHERE id=?')
        .run(body.question ?? prev.question, body.enQuestion ?? prev.en_question, body.answer ?? prev.answer, body.enAnswer ?? prev.en_answer, body.category ?? prev.category, Number(body.sortOrder ?? prev.sort_order), body.published === undefined ? prev.published : (body.published ? 1 : 0), now(), id);
      audit('UPDATE', 'faq', id, prev, body);
      return json(res, 200, { ok: true });
    }
    if (faqMatch && req.method === 'DELETE') {
      const id = Number(faqMatch[1]);
      db.prepare('UPDATE faqs SET archived=1,updated_at=? WHERE id=?').run(now(), id);
      audit('ARCHIVE', 'faq', id, null, null);
      return json(res, 200, { ok: true });
    }
    /* ===== Homepage content (Owner) ===== */
    if (p === '/api/owner/homepage' && req.method === 'GET') return json(res, 200, db.prepare('SELECT * FROM homepage_sections ORDER BY sort_order,id').all());
    const homeMatch = p.match(/^\/api\/owner\/homepage\/([^/]+)$/);
    if (homeMatch && ['PUT', 'PATCH', 'POST'].includes(req.method)) {
      const body = await readBody(req); const key = decodeURIComponent(homeMatch[1]);
      const prev = db.prepare('SELECT * FROM homepage_sections WHERE section_key=?').get(key);
      db.prepare('INSERT INTO homepage_sections (section_key,title,en_title,body,en_body,image,sort_order,visible,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(section_key) DO UPDATE SET title=excluded.title,en_title=excluded.en_title,body=excluded.body,en_body=excluded.en_body,image=excluded.image,sort_order=excluded.sort_order,visible=excluded.visible,updated_at=excluded.updated_at')
        .run(key, body.title || '', body.enTitle || body.title || '', body.body || '', body.enBody || body.body || '', body.image || '', Number(body.sortOrder || 0), body.visible === false ? 0 : 1, now(), now());
      audit(prev ? 'UPDATE' : 'CREATE', 'homepage_section', key, prev, body);
      return json(res, 200, { ok: true });
    }
    /* ===== Fleet rental rates (Owner) ===== */
    const fleetRateMatch = p.match(/^\/api\/owner\/fleet\/(\d+)\/rates$/);
    if (fleetRateMatch && req.method === 'GET') return json(res, 200, db.prepare('SELECT service_type AS serviceType,price FROM rental_rates WHERE vehicle_id=? AND duration_hours=12').all(Number(fleetRateMatch[1])));
    if (fleetRateMatch && ['PUT', 'POST'].includes(req.method)) {
      const body = await readBody(req); const vid = Number(fleetRateMatch[1]);
      const vehicle = db.prepare('SELECT id FROM fleet WHERE id=?').get(vid);
      if (!vehicle) return json(res, 404, { error: 'Unit tidak ditemukan' });
      const upd = db.prepare('UPDATE rental_rates SET price=? WHERE vehicle_id=? AND service_type=? AND duration_hours=12');
      const ins = db.prepare('INSERT INTO rental_rates (vehicle_id,service_type,duration_hours,price) VALUES (?,?,12,?)');
      for (const service of ['driver_only', 'driver_fuel', 'all_in']) {
        if (body[service] === undefined) continue;
        const price = Number(body[service] || 0);
        const res1 = upd.run(price, vid, service);
        if (res1.changes === 0) ins.run(vid, service, price);
      }
      audit('UPDATE', 'rental_rates', vid, null, body);
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
