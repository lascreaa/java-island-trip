const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { Client } = require('pg');

const sqlitePath = process.env.JIT_DB_PATH || path.join(__dirname, '..', 'data', 'java-island-trip.db');
const schemaPath = path.join(__dirname, '..', 'db', 'postgres-schema.sql');

async function main() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
  const sqlite = new DatabaseSync(sqlitePath);
  const pg = new Client({ connectionString: process.env.DATABASE_URL });
  await pg.connect();
  await pg.query(fs.readFileSync(schemaPath, 'utf8'));
  await pg.query('BEGIN');
  try {
    const packages = sqlite.prepare('SELECT * FROM packages').all();
    for (const item of packages) {
      await pg.query(`INSERT INTO packages
        (id,title,en_title,slug,area,duration,theme,image,description,en_description)
        VALUES ($1,$2,$3,$1,$4,$5,$6,$7,$8,$9)
        ON CONFLICT (id) DO UPDATE SET title=excluded.title,en_title=excluded.en_title`,
        [item.id, item.title, item.en_title, item.area, item.duration, item.theme, item.image, item.description || '', item.en_description || '']);
      const variants = sqlite.prepare('SELECT * FROM package_variants WHERE package_id=? ORDER BY sort_order,id').all(item.id);
      for (const variant of variants) {
        const result = await pg.query(`INSERT INTO package_variants
          (package_id,code,title,en_title,subtitle,en_subtitle,hero_image,gallery,itinerary,include_items,exclude_items,note,active,sort_order,en_itinerary,en_note)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14,$15::jsonb,$16)
          ON CONFLICT (package_id,code) DO UPDATE SET title=excluded.title,en_title=excluded.en_title
          RETURNING id`, [
          item.id, variant.code, variant.title, variant.en_title || variant.title, variant.subtitle || '', variant.en_subtitle || '',
          variant.hero_image || '', variant.gallery_json || '[]', variant.itinerary_json || '[]',
          variant.include_json || '[]', variant.exclude_json || '[]', variant.note || '',
          Boolean(variant.active), variant.sort_order || 0, variant.en_itinerary_json || '[]', variant.en_note || ''
        ]);
        const variantId = result.rows[0].id;
        const tiers = sqlite.prepare("SELECT pax,price_per_pax,season FROM variant_price_tiers WHERE variant_id=?").all(variant.id);
        for (const tier of tiers) {
          await pg.query(`INSERT INTO variant_price_tiers (variant_id,pax,price_per_pax,season)
            VALUES ($1,$2,$3,$4) ON CONFLICT (variant_id,pax,season) DO UPDATE SET price_per_pax=excluded.price_per_pax`,
            [variantId, tier.pax, tier.price_per_pax, tier.season]);
        }
      }
    }
    await pg.query('COMMIT');
  } catch (error) {
    await pg.query('ROLLBACK');
    throw error;
  } finally {
    await pg.end();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
