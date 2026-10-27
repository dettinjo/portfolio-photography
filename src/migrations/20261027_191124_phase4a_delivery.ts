import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_photos_purpose" ADD VALUE 'final';
  ALTER TYPE "public"."enum_photos_status" ADD VALUE 'expired';
  ALTER TABLE "photos" ADD COLUMN "bytes" numeric;
  ALTER TABLE "projects" ADD COLUMN "delivery_delivered_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "delivery_expires_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "delivery_reminder30_sent_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "delivery_reminder7_sent_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "delivery_purged_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "photos" ALTER COLUMN "purpose" SET DATA TYPE text;
  ALTER TABLE "photos" ALTER COLUMN "purpose" SET DEFAULT 'portfolio'::text;
  DROP TYPE "public"."enum_photos_purpose";
  CREATE TYPE "public"."enum_photos_purpose" AS ENUM('portfolio', 'preview');
  ALTER TABLE "photos" ALTER COLUMN "purpose" SET DEFAULT 'portfolio'::"public"."enum_photos_purpose";
  ALTER TABLE "photos" ALTER COLUMN "purpose" SET DATA TYPE "public"."enum_photos_purpose" USING "purpose"::"public"."enum_photos_purpose";
  ALTER TABLE "photos" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "photos" ALTER COLUMN "status" SET DEFAULT 'pending'::text;
  DROP TYPE "public"."enum_photos_status";
  CREATE TYPE "public"."enum_photos_status" AS ENUM('pending', 'ready', 'failed', 'missing');
  ALTER TABLE "photos" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."enum_photos_status";
  ALTER TABLE "photos" ALTER COLUMN "status" SET DATA TYPE "public"."enum_photos_status" USING "status"::"public"."enum_photos_status";
  ALTER TABLE "photos" DROP COLUMN "bytes";
  ALTER TABLE "projects" DROP COLUMN "delivery_delivered_at";
  ALTER TABLE "projects" DROP COLUMN "delivery_expires_at";
  ALTER TABLE "projects" DROP COLUMN "delivery_reminder30_sent_at";
  ALTER TABLE "projects" DROP COLUMN "delivery_reminder7_sent_at";
  ALTER TABLE "projects" DROP COLUMN "delivery_purged_at";`)
}
