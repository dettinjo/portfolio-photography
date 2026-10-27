// Data only: the launch genres (decision D1 in docs/REDESIGN.md), and Formula 1
// filed under Events & Motorsport. Idempotent; never overwrites edits made in
// the admin panel (existing genres and already-set series genres are kept).
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

const GENRES: Array<{ slug: string; order: number; en: string; de: string }> = [
  { slug: 'portraits', order: 1, en: 'Portraits', de: 'Porträts' },
  { slug: 'events-motorsport', order: 2, en: 'Events & Motorsport', de: 'Events & Motorsport' },
  { slug: 'cars-brands', order: 3, en: 'Cars & Brands', de: 'Autos & Marken' },
  { slug: 'weddings', order: 4, en: 'Weddings', de: 'Hochzeiten' },
]

export async function up({ db }: MigrateUpArgs): Promise<void> {
  for (const g of GENRES) {
    await db.execute(sql`
      WITH inserted AS (
        INSERT INTO "genres" ("slug", "order") VALUES (${g.slug}, ${g.order})
        ON CONFLICT ("slug") DO NOTHING
        RETURNING "id"
      )
      INSERT INTO "genres_locales" ("name", "_locale", "_parent_id")
      SELECT ${g.en}, 'en'::"_locales", "id" FROM inserted
      UNION ALL
      SELECT ${g.de}, 'de'::"_locales", "id" FROM inserted;
    `)
  }
  await db.execute(sql`
    UPDATE "series" SET "genre_id" = (SELECT "id" FROM "genres" WHERE "slug" = 'events-motorsport')
    WHERE "slug" = 'formula-1' AND "genre_id" IS NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    UPDATE "series" SET "genre_id" = NULL
    WHERE "genre_id" IN (SELECT "id" FROM "genres" WHERE "slug" IN ('portraits','events-motorsport','cars-brands','weddings'));
    DELETE FROM "genres" WHERE "slug" IN ('portraits','events-motorsport','cars-brands','weddings');
  `)
}
