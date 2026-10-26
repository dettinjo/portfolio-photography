import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'de');
  CREATE TYPE "public"."enum_photos_visibility" AS ENUM('public', 'hidden');
  CREATE TYPE "public"."enum_photos_status" AS ENUM('pending', 'ready', 'failed', 'missing');
  CREATE TABLE "series" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"genre_id" integer,
  	"cover_id" integer,
  	"order" numeric DEFAULT 0,
  	"draft" boolean DEFAULT false,
  	"nc_file_id" numeric,
  	"nc_path" varchar,
  	"photo_count" numeric DEFAULT 0,
  	"missing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "series_locales" (
  	"title" varchar NOT NULL,
  	"story" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"series_id" integer,
  	"visibility" "enum_photos_visibility" DEFAULT 'public',
  	"order" numeric,
  	"meta_title" varchar,
  	"meta_caption" varchar,
  	"meta_rating" numeric,
  	"meta_camera" varchar,
  	"meta_lens" varchar,
  	"meta_focal_length" numeric,
  	"meta_aperture" numeric,
  	"meta_exposure_time" numeric,
  	"meta_iso" numeric,
  	"taken_at" timestamp(3) with time zone,
  	"status" "enum_photos_status" DEFAULT 'pending',
  	"error" varchar,
  	"filename" varchar NOT NULL,
  	"nc_file_id" numeric NOT NULL,
  	"nc_path" varchar,
  	"etag" varchar,
  	"version" varchar,
  	"width" numeric,
  	"height" numeric,
  	"placeholder" varchar,
  	"color" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "photos_locales" (
  	"title" varchar,
  	"caption" varchar,
  	"alt" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "photos_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "photos_numbers" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"number" numeric,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL
  );
  
  CREATE TABLE "genres" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "genres_locales" (
  	"name" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "sync_status" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"last_reconcile_at" timestamp(3) with time zone,
  	"last_webhook_at" timestamp(3) with time zone,
  	"last_result" varchar,
  	"errors" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "series_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "photos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "genres_id" integer;
  ALTER TABLE "series" ADD CONSTRAINT "series_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "series" ADD CONSTRAINT "series_cover_id_photos_id_fk" FOREIGN KEY ("cover_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "series_locales" ADD CONSTRAINT "series_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "photos" ADD CONSTRAINT "photos_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photos_locales" ADD CONSTRAINT "photos_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "photos_texts" ADD CONSTRAINT "photos_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "photos_numbers" ADD CONSTRAINT "photos_numbers_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "genres_locales" ADD CONSTRAINT "genres_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "series_slug_idx" ON "series" USING btree ("slug");
  CREATE INDEX "series_genre_idx" ON "series" USING btree ("genre_id");
  CREATE INDEX "series_cover_idx" ON "series" USING btree ("cover_id");
  CREATE UNIQUE INDEX "series_nc_file_id_idx" ON "series" USING btree ("nc_file_id");
  CREATE INDEX "series_updated_at_idx" ON "series" USING btree ("updated_at");
  CREATE INDEX "series_created_at_idx" ON "series" USING btree ("created_at");
  CREATE UNIQUE INDEX "series_locales_locale_parent_id_unique" ON "series_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "photos_series_idx" ON "photos" USING btree ("series_id");
  CREATE INDEX "photos_taken_at_idx" ON "photos" USING btree ("taken_at");
  CREATE INDEX "photos_status_idx" ON "photos" USING btree ("status");
  CREATE UNIQUE INDEX "photos_nc_file_id_idx" ON "photos" USING btree ("nc_file_id");
  CREATE INDEX "photos_updated_at_idx" ON "photos" USING btree ("updated_at");
  CREATE INDEX "photos_created_at_idx" ON "photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "photos_locales_locale_parent_id_unique" ON "photos_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "photos_texts_order_parent" ON "photos_texts" USING btree ("order","parent_id");
  CREATE INDEX "photos_numbers_order_parent_idx" ON "photos_numbers" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "genres_slug_idx" ON "genres" USING btree ("slug");
  CREATE INDEX "genres_updated_at_idx" ON "genres" USING btree ("updated_at");
  CREATE INDEX "genres_created_at_idx" ON "genres" USING btree ("created_at");
  CREATE UNIQUE INDEX "genres_locales_locale_parent_id_unique" ON "genres_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_series_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_photos_fk" FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_genres_fk" FOREIGN KEY ("genres_id") REFERENCES "public"."genres"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_series_id_idx" ON "payload_locked_documents_rels" USING btree ("series_id");
  CREATE INDEX "payload_locked_documents_rels_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("photos_id");
  CREATE INDEX "payload_locked_documents_rels_genres_id_idx" ON "payload_locked_documents_rels" USING btree ("genres_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "series" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "series_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "photos_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "photos_texts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "photos_numbers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "genres" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "genres_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sync_status" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "series" CASCADE;
  DROP TABLE "series_locales" CASCADE;
  DROP TABLE "photos" CASCADE;
  DROP TABLE "photos_locales" CASCADE;
  DROP TABLE "photos_texts" CASCADE;
  DROP TABLE "photos_numbers" CASCADE;
  DROP TABLE "genres" CASCADE;
  DROP TABLE "genres_locales" CASCADE;
  DROP TABLE "sync_status" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_series_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_photos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_genres_fk";
  
  DROP INDEX "payload_locked_documents_rels_series_id_idx";
  DROP INDEX "payload_locked_documents_rels_photos_id_idx";
  DROP INDEX "payload_locked_documents_rels_genres_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "series_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "photos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "genres_id";
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum_photos_visibility";
  DROP TYPE "public"."enum_photos_status";`)
}
