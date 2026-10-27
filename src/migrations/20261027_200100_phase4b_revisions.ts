import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_revisions_status" AS ENUM('draft', 'requested', 'done', 'approved', 'changes');
  CREATE TABLE "revisions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"photo_id" integer NOT NULL,
  	"client_id" integer,
  	"body" varchar NOT NULL,
  	"status" "enum_revisions_status" DEFAULT 'draft' NOT NULL,
  	"round" numeric DEFAULT 1 NOT NULL,
  	"x" numeric,
  	"y" numeric,
  	"version_requested" varchar,
  	"requested_at" timestamp(3) with time zone,
  	"done_at" timestamp(3) with time zone,
  	"reviewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "photos" ADD COLUMN "previous_version" varchar;
  ALTER TABLE "photos" ADD COLUMN "revised_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "revision_rounds_included" numeric;
  ALTER TABLE "projects" ADD COLUMN "revision_rounds_used" numeric DEFAULT 0;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "revisions_id" integer;
  ALTER TABLE "revisions" ADD CONSTRAINT "revisions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revisions" ADD CONSTRAINT "revisions_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "revisions" ADD CONSTRAINT "revisions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "revisions_project_idx" ON "revisions" USING btree ("project_id");
  CREATE INDEX "revisions_photo_idx" ON "revisions" USING btree ("photo_id");
  CREATE INDEX "revisions_client_idx" ON "revisions" USING btree ("client_id");
  CREATE INDEX "revisions_status_idx" ON "revisions" USING btree ("status");
  CREATE INDEX "revisions_updated_at_idx" ON "revisions" USING btree ("updated_at");
  CREATE INDEX "revisions_created_at_idx" ON "revisions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_revisions_fk" FOREIGN KEY ("revisions_id") REFERENCES "public"."revisions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_revisions_id_idx" ON "payload_locked_documents_rels" USING btree ("revisions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "revisions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "revisions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_revisions_fk";
  
  DROP INDEX "payload_locked_documents_rels_revisions_id_idx";
  ALTER TABLE "photos" DROP COLUMN "previous_version";
  ALTER TABLE "photos" DROP COLUMN "revised_at";
  ALTER TABLE "projects" DROP COLUMN "revision_rounds_included";
  ALTER TABLE "projects" DROP COLUMN "revision_rounds_used";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "revisions_id";
  DROP TYPE "public"."enum_revisions_status";`)
}
