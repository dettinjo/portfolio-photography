import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_status" AS ENUM('new', 'replied', 'booked', 'declined');
  CREATE TYPE "public"."enum_inquiries_size" AS ENUM('small', 'medium', 'large');
  CREATE TYPE "public"."enum_inquiries_budget" AS ENUM('lt200', '200-500', '500-1000', 'gt1000', 'unsure');
  CREATE TABLE "offerings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"genre_id" integer NOT NULL,
  	"delivery_days" numeric,
  	"from_price" numeric,
  	"deposit_percent" numeric DEFAULT 30,
  	"image_quota" numeric,
  	"extra_image_price" numeric,
  	"revision_rounds" numeric DEFAULT 1,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "offerings_locales" (
  	"title" varchar NOT NULL,
  	"tagline" varchar,
  	"includes" varchar,
  	"duration" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_inquiries_status" DEFAULT 'new',
  	"locale" varchar,
  	"offering_id" integer,
  	"kind" varchar,
  	"date" timestamp(3) with time zone,
  	"date_flexible" boolean DEFAULT false,
  	"location" varchar,
  	"size" "enum_inquiries_size",
  	"budget" "enum_inquiries_budget",
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"message" varchar,
  	"photo_id" integer,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "sessions_settings_add_ons" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "sessions_settings_add_ons_locales" (
  	"label" varchar NOT NULL,
  	"price" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "sessions_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "sessions_settings_locales" (
  	"price_note" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "offerings_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "inquiries_id" integer;
  ALTER TABLE "offerings" ADD CONSTRAINT "offerings_genre_id_genres_id_fk" FOREIGN KEY ("genre_id") REFERENCES "public"."genres"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "offerings_locales" ADD CONSTRAINT "offerings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_offering_id_offerings_id_fk" FOREIGN KEY ("offering_id") REFERENCES "public"."offerings"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "sessions_settings_add_ons" ADD CONSTRAINT "sessions_settings_add_ons_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sessions_settings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sessions_settings_add_ons_locales" ADD CONSTRAINT "sessions_settings_add_ons_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sessions_settings_add_ons"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "sessions_settings_locales" ADD CONSTRAINT "sessions_settings_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."sessions_settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "offerings_slug_idx" ON "offerings" USING btree ("slug");
  CREATE INDEX "offerings_genre_idx" ON "offerings" USING btree ("genre_id");
  CREATE INDEX "offerings_updated_at_idx" ON "offerings" USING btree ("updated_at");
  CREATE INDEX "offerings_created_at_idx" ON "offerings" USING btree ("created_at");
  CREATE UNIQUE INDEX "offerings_locales_locale_parent_id_unique" ON "offerings_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "inquiries_offering_idx" ON "inquiries" USING btree ("offering_id");
  CREATE INDEX "inquiries_photo_idx" ON "inquiries" USING btree ("photo_id");
  CREATE INDEX "inquiries_updated_at_idx" ON "inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");
  CREATE INDEX "sessions_settings_add_ons_order_idx" ON "sessions_settings_add_ons" USING btree ("_order");
  CREATE INDEX "sessions_settings_add_ons_parent_id_idx" ON "sessions_settings_add_ons" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "sessions_settings_add_ons_locales_locale_parent_id_unique" ON "sessions_settings_add_ons_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "sessions_settings_locales_locale_parent_id_unique" ON "sessions_settings_locales" USING btree ("_locale","_parent_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_offerings_fk" FOREIGN KEY ("offerings_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_offerings_id_idx" ON "payload_locked_documents_rels" USING btree ("offerings_id");
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiries_id");`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "offerings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "offerings_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "inquiries" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sessions_settings_add_ons" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sessions_settings_add_ons_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sessions_settings" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "sessions_settings_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "offerings" CASCADE;
  DROP TABLE "offerings_locales" CASCADE;
  DROP TABLE "inquiries" CASCADE;
  DROP TABLE "sessions_settings_add_ons" CASCADE;
  DROP TABLE "sessions_settings_add_ons_locales" CASCADE;
  DROP TABLE "sessions_settings" CASCADE;
  DROP TABLE "sessions_settings_locales" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_offerings_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_inquiries_fk";
  
  DROP INDEX "payload_locked_documents_rels_offerings_id_idx";
  DROP INDEX "payload_locked_documents_rels_inquiries_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "offerings_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "inquiries_id";
  DROP TYPE "public"."enum_inquiries_status";
  DROP TYPE "public"."enum_inquiries_size";
  DROP TYPE "public"."enum_inquiries_budget";`)
}
