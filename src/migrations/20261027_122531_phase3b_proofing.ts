import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_photos_purpose" AS ENUM('portfolio', 'preview');
  CREATE TABLE "picks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"photo_id" integer NOT NULL,
  	"client_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"photo_id" integer NOT NULL,
  	"client_id" integer,
  	"resolved" boolean DEFAULT false,
  	"body" varchar NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "photos" ADD COLUMN "purpose" "enum_photos_purpose" DEFAULT 'portfolio';
  ALTER TABLE "photos" ADD COLUMN "project_id" integer;
  ALTER TABLE "photos" ADD COLUMN "watermark" varchar;
  ALTER TABLE "projects" ADD COLUMN "proofing_quota" numeric;
  ALTER TABLE "projects" ADD COLUMN "proofing_extra_price" numeric;
  ALTER TABLE "projects" ADD COLUMN "proofing_previews_ready_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "proofing_submitted_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "sync_previews" boolean DEFAULT false;
  ALTER TABLE "projects" ADD COLUMN "nc_folder_id" numeric;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "picks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "comments_id" integer;
  ALTER TABLE "picks" ADD CONSTRAINT "picks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "picks" ADD CONSTRAINT "picks_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "picks" ADD CONSTRAINT "picks_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "comments" ADD CONSTRAINT "comments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "picks_project_idx" ON "picks" USING btree ("project_id");
  CREATE INDEX "picks_photo_idx" ON "picks" USING btree ("photo_id");
  CREATE INDEX "picks_client_idx" ON "picks" USING btree ("client_id");
  CREATE INDEX "picks_updated_at_idx" ON "picks" USING btree ("updated_at");
  CREATE INDEX "picks_created_at_idx" ON "picks" USING btree ("created_at");
  CREATE UNIQUE INDEX "photo_client_idx" ON "picks" USING btree ("photo_id","client_id");
  CREATE INDEX "comments_project_idx" ON "comments" USING btree ("project_id");
  CREATE INDEX "comments_photo_idx" ON "comments" USING btree ("photo_id");
  CREATE INDEX "comments_client_idx" ON "comments" USING btree ("client_id");
  CREATE INDEX "comments_updated_at_idx" ON "comments" USING btree ("updated_at");
  CREATE INDEX "comments_created_at_idx" ON "comments" USING btree ("created_at");
  ALTER TABLE "photos" ADD CONSTRAINT "photos_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_picks_fk" FOREIGN KEY ("picks_id") REFERENCES "public"."picks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_comments_fk" FOREIGN KEY ("comments_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "photos_purpose_idx" ON "photos" USING btree ("purpose");
  CREATE INDEX "photos_project_idx" ON "photos" USING btree ("project_id");
  CREATE INDEX "projects_nc_folder_id_idx" ON "projects" USING btree ("nc_folder_id");
  CREATE INDEX "payload_locked_documents_rels_picks_id_idx" ON "payload_locked_documents_rels" USING btree ("picks_id");
  CREATE INDEX "payload_locked_documents_rels_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("comments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "picks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "comments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "picks" CASCADE;
  DROP TABLE "comments" CASCADE;
  ALTER TABLE "photos" DROP CONSTRAINT "photos_project_id_projects_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_picks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_comments_fk";
  
  DROP INDEX "photos_purpose_idx";
  DROP INDEX "photos_project_idx";
  DROP INDEX "projects_nc_folder_id_idx";
  DROP INDEX "payload_locked_documents_rels_picks_id_idx";
  DROP INDEX "payload_locked_documents_rels_comments_id_idx";
  ALTER TABLE "photos" DROP COLUMN "purpose";
  ALTER TABLE "photos" DROP COLUMN "project_id";
  ALTER TABLE "photos" DROP COLUMN "watermark";
  ALTER TABLE "projects" DROP COLUMN "proofing_quota";
  ALTER TABLE "projects" DROP COLUMN "proofing_extra_price";
  ALTER TABLE "projects" DROP COLUMN "proofing_previews_ready_at";
  ALTER TABLE "projects" DROP COLUMN "proofing_submitted_at";
  ALTER TABLE "projects" DROP COLUMN "sync_previews";
  ALTER TABLE "projects" DROP COLUMN "nc_folder_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "picks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "comments_id";
  DROP TYPE "public"."enum_photos_purpose";`)
}
