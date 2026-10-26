// Baseline schema. Written to be idempotent: production was created before
// migrations existed (Payload only pushes schema in development), so this must
// complete on an empty database AND on the partially existing production one.
// It only ever adds missing types, tables, columns, indexes and constraints, and
// never changes data: a constraint or unique index that existing rows violate is
// skipped with a notice instead of failing the migration.
import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  DO $$ BEGIN
    CREATE TYPE "public"."enum_albums_approval_status" AS ENUM('pending', 'notified', 'submitted', 'approved');
  EXCEPTION WHEN duplicate_object THEN null;
  END $$;
  CREATE TABLE IF NOT EXISTS "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  ALTER TABLE "users_sessions" ADD COLUMN IF NOT EXISTS "_order" integer;
  ALTER TABLE "users_sessions" ADD COLUMN IF NOT EXISTS "_parent_id" integer;
  ALTER TABLE "users_sessions" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone;
  ALTER TABLE "users_sessions" ADD COLUMN IF NOT EXISTS "expires_at" timestamp(3) with time zone;
  CREATE TABLE IF NOT EXISTS "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "name" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_token" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "reset_password_expiration" timestamp(3) with time zone;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "salt" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hash" varchar;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "login_attempts" numeric DEFAULT 0;
  ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lock_until" timestamp(3) with time zone;
  CREATE TABLE IF NOT EXISTS "albums_selections" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"filename" varchar NOT NULL,
  	"comment" varchar
  );
  ALTER TABLE "albums_selections" ADD COLUMN IF NOT EXISTS "_order" integer;
  ALTER TABLE "albums_selections" ADD COLUMN IF NOT EXISTS "_parent_id" integer;
  ALTER TABLE "albums_selections" ADD COLUMN IF NOT EXISTS "filename" varchar;
  ALTER TABLE "albums_selections" ADD COLUMN IF NOT EXISTS "comment" varchar;
  CREATE TABLE IF NOT EXISTS "albums" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"client_name" varchar,
  	"client_email" varchar,
  	"approval_token" varchar,
  	"approval_status" "enum_albums_approval_status" DEFAULT 'pending',
  	"selection_min" numeric,
  	"selection_max" numeric,
  	"publication_consent" boolean DEFAULT false,
  	"allow_downloads" boolean DEFAULT false,
  	"approval_terms" varchar,
  	"published" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "slug" varchar;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "title" varchar;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "client_name" varchar;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "client_email" varchar;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "approval_token" varchar;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "approval_status" "enum_albums_approval_status" DEFAULT 'pending';
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "selection_min" numeric;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "selection_max" numeric;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "publication_consent" boolean DEFAULT false;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "allow_downloads" boolean DEFAULT false;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "approval_terms" varchar;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "published" boolean DEFAULT false;
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "albums" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  CREATE TABLE IF NOT EXISTS "reviews" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"album_id" integer,
  	"name" varchar NOT NULL,
  	"role" varchar,
  	"quote" varchar NOT NULL,
  	"avatar_id" integer,
  	"communication" numeric DEFAULT 5,
  	"creativity" numeric DEFAULT 5,
  	"professionalism" numeric DEFAULT 5,
  	"value" numeric DEFAULT 5,
  	"approved" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "album_id" integer;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "name" varchar;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "role" varchar;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "quote" varchar;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "avatar_id" integer;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "communication" numeric DEFAULT 5;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "creativity" numeric DEFAULT 5;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "professionalism" numeric DEFAULT 5;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "value" numeric DEFAULT 5;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "approved" boolean DEFAULT false;
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  CREATE TABLE IF NOT EXISTS "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "alt" varchar;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "url" varchar;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "thumbnail_u_r_l" varchar;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "filename" varchar;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "filesize" numeric;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "width" numeric;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "height" numeric;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "focal_x" numeric;
  ALTER TABLE "media" ADD COLUMN IF NOT EXISTS "focal_y" numeric;
  CREATE TABLE IF NOT EXISTS "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  ALTER TABLE "payload_kv" ADD COLUMN IF NOT EXISTS "key" varchar;
  ALTER TABLE "payload_kv" ADD COLUMN IF NOT EXISTS "data" jsonb;
  CREATE TABLE IF NOT EXISTS "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "payload_locked_documents" ADD COLUMN IF NOT EXISTS "global_slug" varchar;
  ALTER TABLE "payload_locked_documents" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "payload_locked_documents" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  CREATE TABLE IF NOT EXISTS "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"albums_id" integer,
  	"reviews_id" integer,
  	"media_id" integer
  );
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "order" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "parent_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "path" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "users_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "albums_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "reviews_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "media_id" integer;
  CREATE TABLE IF NOT EXISTS "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "payload_preferences" ADD COLUMN IF NOT EXISTS "key" varchar;
  ALTER TABLE "payload_preferences" ADD COLUMN IF NOT EXISTS "value" jsonb;
  ALTER TABLE "payload_preferences" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "payload_preferences" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  CREATE TABLE IF NOT EXISTS "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "order" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "parent_id" integer;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "path" varchar;
  ALTER TABLE "payload_preferences_rels" ADD COLUMN IF NOT EXISTS "users_id" integer;
  CREATE TABLE IF NOT EXISTS "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  ALTER TABLE "payload_migrations" ADD COLUMN IF NOT EXISTS "name" varchar;
  ALTER TABLE "payload_migrations" ADD COLUMN IF NOT EXISTS "batch" numeric;
  ALTER TABLE "payload_migrations" ADD COLUMN IF NOT EXISTS "updated_at" timestamp(3) with time zone DEFAULT now();
  ALTER TABLE "payload_migrations" ADD COLUMN IF NOT EXISTS "created_at" timestamp(3) with time zone DEFAULT now();
  DO $$ BEGIN
    ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint users_sessions_parent_id_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "albums_selections" ADD CONSTRAINT "albums_selections_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint albums_selections_parent_id_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_album_id_albums_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."albums"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint reviews_album_id_albums_id_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "reviews" ADD CONSTRAINT "reviews_avatar_id_media_id_fk" FOREIGN KEY ("avatar_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint reviews_avatar_id_media_id_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_locked_documents_rels_parent_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_locked_documents_rels_users_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_albums_fk" FOREIGN KEY ("albums_id") REFERENCES "public"."albums"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_locked_documents_rels_albums_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_reviews_fk" FOREIGN KEY ("reviews_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_locked_documents_rels_reviews_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_locked_documents_rels_media_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_preferences_rels_parent_fk: existing rows violate it';
  END $$;
  DO $$ BEGIN
    ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN foreign_key_violation THEN RAISE NOTICE 'skipped constraint payload_preferences_rels_users_fk: existing rows violate it';
  END $$;
  CREATE INDEX IF NOT EXISTS "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX IF NOT EXISTS "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "users_created_at_idx" ON "users" USING btree ("created_at");
  DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "users_email_idx" ON "users" USING btree ("email");
  EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'skipped unique index users_email_idx: duplicate values exist';
  END $$;
  CREATE INDEX IF NOT EXISTS "albums_selections_order_idx" ON "albums_selections" USING btree ("_order");
  CREATE INDEX IF NOT EXISTS "albums_selections_parent_id_idx" ON "albums_selections" USING btree ("_parent_id");
  DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "albums_slug_idx" ON "albums" USING btree ("slug");
  EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'skipped unique index albums_slug_idx: duplicate values exist';
  END $$;
  DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "albums_approval_token_idx" ON "albums" USING btree ("approval_token");
  EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'skipped unique index albums_approval_token_idx: duplicate values exist';
  END $$;
  CREATE INDEX IF NOT EXISTS "albums_updated_at_idx" ON "albums" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "albums_created_at_idx" ON "albums" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "reviews_album_idx" ON "reviews" USING btree ("album_id");
  CREATE INDEX IF NOT EXISTS "reviews_avatar_idx" ON "reviews" USING btree ("avatar_id");
  CREATE INDEX IF NOT EXISTS "reviews_updated_at_idx" ON "reviews" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "reviews_created_at_idx" ON "reviews" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "media_created_at_idx" ON "media" USING btree ("created_at");
  DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "media_filename_idx" ON "media" USING btree ("filename");
  EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'skipped unique index media_filename_idx: duplicate values exist';
  END $$;
  DO $$ BEGIN
    CREATE UNIQUE INDEX IF NOT EXISTS "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  EXCEPTION
    WHEN unique_violation THEN RAISE NOTICE 'skipped unique index payload_kv_key_idx: duplicate values exist';
  END $$;
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_albums_id_idx" ON "payload_locked_documents_rels" USING btree ("albums_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_reviews_id_idx" ON "payload_locked_documents_rels" USING btree ("reviews_id");
  CREATE INDEX IF NOT EXISTS "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX IF NOT EXISTS "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX IF NOT EXISTS "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX IF NOT EXISTS "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX IF NOT EXISTS "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "albums_selections" CASCADE;
  DROP TABLE "albums" CASCADE;
  DROP TABLE "reviews" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_albums_approval_status";`)
}
