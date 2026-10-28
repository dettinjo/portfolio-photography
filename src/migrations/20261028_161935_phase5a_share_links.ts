import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "share_links" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"created_by_id" integer,
  	"label" varchar NOT NULL,
  	"token" varchar NOT NULL,
  	"downloads" boolean DEFAULT false,
  	"revoked_at" timestamp(3) with time zone,
  	"views" numeric DEFAULT 0,
  	"last_viewed_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "share_links_id" integer;
  ALTER TABLE "share_links" ADD CONSTRAINT "share_links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_id_clients_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "share_links_project_idx" ON "share_links" USING btree ("project_id");
  CREATE INDEX "share_links_created_by_idx" ON "share_links" USING btree ("created_by_id");
  CREATE UNIQUE INDEX "share_links_token_idx" ON "share_links" USING btree ("token");
  CREATE INDEX "share_links_updated_at_idx" ON "share_links" USING btree ("updated_at");
  CREATE INDEX "share_links_created_at_idx" ON "share_links" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_share_links_fk" FOREIGN KEY ("share_links_id") REFERENCES "public"."share_links"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_share_links_id_idx" ON "payload_locked_documents_rels" USING btree ("share_links_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "share_links" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "share_links" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_share_links_fk";
  
  DROP INDEX "payload_locked_documents_rels_share_links_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "share_links_id";`)
}
