# JAVA ISLAND TRIP

Website rental mobil dan paket trip per pax Jogja–Jawa Tengah.

## Jalankan dengan database lokal

Prasyarat: Node.js **22.5 atau lebih baru** karena prototype memakai modul SQLite bawaan Node (`node:sqlite`).

```powershell
node server.js
```

Buka website di `http://localhost:4173/`.

Panel Owner berada di URL privat:

`http://localhost:4173/owner-portal-jit-7f3c2a.html`

Saat membuka panel, masukkan `OWNER_KEY`. Untuk local development, server membuat kunci acak jika environment variable belum diatur dan mencetaknya ke console. Sebaiknya tetap mengatur kunci sendiri:

```powershell
$env:OWNER_KEY='buat-secret-panjang-dan-acak'
node server.js
```

## Database

Database SQLite tersimpan di `data/java-island-trip.db`. Tabel yang tersedia:

- `packages` — katalog paket trip bilingual dan harga dasar.
- `package_variants` — pilihan rute A–H dengan gallery, itinerary, include/exclude, dan catatan.
- `variant_price_tiers` — harga per pax 2–9 untuk setiap varian.
- `season_prices` — harga low, high, dan peak season beserta tanggal berlaku.
- `fleet` — unit armada, foto, spesifikasi, dan harga harian.
- `promos` — promo, periode, diskon, paket terkait, dan foto.
- `inquiries` — data booking yang masuk dan status konfirmasi Owner.
- `bookings` — booking resmi setelah request tersimpan, termasuk `variant_id`, locale, dan audience.
- `reviews` — testimoni yang hanya tampil setelah disetujui Owner.

Website publik membaca data dari `/api/public/bootstrap`. Panel Owner menyimpan perubahan melalui API yang dilindungi `x-owner-key`.

## Fitur dinamis

- Owner dapat memperbarui paket, harga dasar, harga low/high/peak season, pilihan rute A–H, gallery, itinerary bilingual, dan URL foto.
- Owner dapat memperbarui harga serta foto unit armada.
- Promo tersimpan di tabel database dan siap ditampilkan berdasarkan periode aktif.
- Booking masuk ke database sebagai `Menunggu Konfirmasi`; Owner dapat mengubahnya menjadi `Dikonfirmasi`.
- Form booking tetap membuat pesan WhatsApp ke `+62 878-3945-6221`.
- Layanan publik hanya mobil + driver, driver + BBM, dan All-In. Self-drive/lepas kunci serta upload KYC tidak tersedia untuk booking baru.
- Welcome lokal/internasional menyimpan `audience` dan mengatur locale Indonesia/English. Harga tetap Rupiah.

Untuk production, pindahkan SQLite ke PostgreSQL managed, simpan secret di environment server, tambahkan HTTPS, login Owner berbasis session, validasi upload gambar, backup otomatis, dan konfigurasi domain `javaislandtrip.com`.

## API v1 dan migrasi

Kompatibilitas endpoint lama tetap tersedia. Kontrak baru memakai response standar di `/api/v1`:

- `GET /api/v1/packages`, `/api/v1/trips`, `/api/v1/vehicles`, `/api/v1/promotions`
- `GET /api/v1/faqs`, `/api/v1/homepage`, `/api/v1/settings/public`
- `POST /api/v1/bookings/calculate`, `POST /api/v1/bookings`
- `GET /api/v1/availability`
- `POST /api/v1/auth/login`, `GET /api/v1/auth/session`
- `GET/POST /api/v1/admin/faqs`
- `GET/PATCH /api/v1/admin/homepage`
- `GET /api/v1/admin/audit-logs`

Skema tujuan PostgreSQL tersedia di `db/postgres-schema.sql`. Setelah dependency `pg` terpasang dan `DATABASE_URL` diatur, importer dijalankan dengan:

```powershell
npm run import:postgres
```

Tahap lokal tetap memakai SQLite agar frontend dan Owner portal yang ada tidak terputus selama migrasi.
