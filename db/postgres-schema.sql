CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS roles (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS permissions (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id BIGINT NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email CITEXT NOT NULL UNIQUE,
  role_id BIGINT NOT NULL REFERENCES roles(id),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS admin_sessions (
  id BIGSERIAL PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS vehicle_categories (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS vehicles (
  id BIGSERIAL PRIMARY KEY,
  category_id BIGINT REFERENCES vehicle_categories(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  capacity INTEGER NOT NULL DEFAULT 4,
  transmission TEXT,
  image TEXT,
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS vehicle_units (
  id BIGSERIAL PRIMARY KEY,
  vehicle_id BIGINT NOT NULL REFERENCES vehicles(id),
  unit_code TEXT NOT NULL UNIQUE,
  plate_number TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  maintenance_note TEXT,
  archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS packages (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  en_title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  area TEXT NOT NULL,
  duration INTEGER NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'culture',
  image TEXT,
  description TEXT NOT NULL DEFAULT '',
  en_description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PUBLISHED',
  archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS package_variants (
  id BIGSERIAL PRIMARY KEY,
  package_id TEXT NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  en_title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  en_subtitle TEXT NOT NULL DEFAULT '',
  hero_image TEXT,
  gallery JSONB NOT NULL DEFAULT '[]',
  itinerary JSONB NOT NULL DEFAULT '[]',
  en_itinerary JSONB NOT NULL DEFAULT '[]',
  include_items JSONB NOT NULL DEFAULT '[]',
  exclude_items JSONB NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  en_note TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(package_id, code)
);
CREATE TABLE IF NOT EXISTS variant_price_tiers (
  id BIGSERIAL PRIMARY KEY,
  variant_id BIGINT NOT NULL REFERENCES package_variants(id) ON DELETE CASCADE,
  pax INTEGER NOT NULL CHECK (pax BETWEEN 2 AND 9),
  price_per_pax BIGINT NOT NULL CHECK (price_per_pax >= 0),
  season TEXT NOT NULL DEFAULT 'normal',
  UNIQUE(variant_id, pax, season)
);
CREATE TABLE IF NOT EXISTS promotions (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  en_title TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL,
  discount_value BIGINT NOT NULL DEFAULT 0,
  starts_on DATE,
  ends_on DATE,
  package_id TEXT REFERENCES packages(id) ON DELETE SET NULL,
  image TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS faqs (
  id BIGSERIAL PRIMARY KEY,
  question TEXT NOT NULL,
  en_question TEXT NOT NULL DEFAULT '',
  answer TEXT NOT NULL,
  en_answer TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'general',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS homepage_sections (
  id BIGSERIAL PRIMARY KEY,
  section_key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  en_title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  en_body TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  visible BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS bookings (
  id BIGSERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  package_id TEXT REFERENCES packages(id) ON DELETE SET NULL,
  variant_id BIGINT REFERENCES package_variants(id) ON DELETE SET NULL,
  vehicle_unit_id BIGINT REFERENCES vehicle_units(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  service_type TEXT NOT NULL,
  travel_date DATE NOT NULL,
  end_date DATE NOT NULL,
  pax INTEGER NOT NULL,
  pickup TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'WAITING_CONFIRMATION',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  subtotal BIGINT NOT NULL DEFAULT 0,
  discount_amount BIGINT NOT NULL DEFAULT 0,
  total_amount BIGINT NOT NULL DEFAULT 0,
  quote_snapshot JSONB NOT NULL DEFAULT '{}',
  product_snapshot JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS booking_items (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price BIGINT NOT NULL DEFAULT 0,
  subtotal BIGINT NOT NULL DEFAULT 0,
  snapshot JSONB NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS availability_blocks (
  id BIGSERIAL PRIMARY KEY,
  vehicle_unit_id BIGINT REFERENCES vehicle_units(id) ON DELETE CASCADE,
  starts_on DATE NOT NULL,
  ends_on DATE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_type TEXT NOT NULL,
  actor_id BIGINT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bookings_dates_status ON bookings(travel_date, end_date, status);
CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_faqs_public ON faqs(published, archived_at, sort_order);
CREATE INDEX IF NOT EXISTS idx_vehicle_units_status ON vehicle_units(status);
