import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_photos_publish_consent" AS ENUM('unknown', 'yes', 'no');
  CREATE TYPE "public"."enum_feedback_moment" AS ENUM('booking', 'sneak-peek');
  CREATE TABLE "feedback" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"client_id" integer NOT NULL,
  	"moment" "enum_feedback_moment" NOT NULL,
  	"rating" numeric NOT NULL,
  	"comment" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "photos" ADD COLUMN "publish_consent" "enum_photos_publish_consent" DEFAULT 'unknown';
  ALTER TABLE "photos" ADD COLUMN "consent_by_id" integer;
  ALTER TABLE "photos" ADD COLUMN "consent_at" timestamp(3) with time zone;
  ALTER TABLE "reviews" ADD COLUMN "project_id" integer;
  ALTER TABLE "reviews" ADD COLUMN "client_id" integer;
  ALTER TABLE "reviews" ADD COLUMN "series_id" integer;
  ALTER TABLE "reviews" ADD COLUMN "favourite_photo_id" integer;
  ALTER TABLE "projects" ADD COLUMN "delivery_review_requested_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "feedback_id" integer;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "feedback" ADD CONSTRAINT "feedback_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "feedback_project_idx" ON "feedback" USING btree ("project_id");
  CREATE INDEX "feedback_client_idx" ON "feedback" USING btree ("client_id");
  CREATE INDEX "feedback_updated_at_idx" ON "feedback" USING btree ("updated_at");
  CREATE INDEX "feedback_created_at_idx" ON "feedback" USING btree ("created_at");
  CREATE UNIQUE INDEX "project_client_moment_idx" ON "feedback" USING btree ("project_id","client_id","moment");
  ALTER TABLE "photos" ADD CONSTRAINT "photos_consent_by_id_clients_id_fk" FOREIGN KEY ("consent_by_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "reviews" ADD CONSTRAINT "reviews_favourite_photo_id_photos_id_fk" FOREIGN KEY ("favourite_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_feedback_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."feedback"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "photos_consent_by_idx" ON "photos" USING btree ("consent_by_id");
  CREATE INDEX "reviews_project_idx" ON "reviews" USING btree ("project_id");
  CREATE INDEX "reviews_client_idx" ON "reviews" USING btree ("client_id");
  CREATE INDEX "reviews_series_idx" ON "reviews" USING btree ("series_id");
  CREATE INDEX "reviews_favourite_photo_idx" ON "reviews" USING btree ("favourite_photo_id");
  CREATE INDEX "payload_locked_documents_rels_feedback_id_idx" ON "payload_locked_documents_rels" USING btree ("feedback_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "feedback" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "feedback" CASCADE;
  ALTER TABLE "photos" DROP CONSTRAINT "photos_consent_by_id_clients_id_fk";
  
  ALTER TABLE "reviews" DROP CONSTRAINT "reviews_project_id_projects_id_fk";
  
  ALTER TABLE "reviews" DROP CONSTRAINT "reviews_client_id_clients_id_fk";
  
  ALTER TABLE "reviews" DROP CONSTRAINT "reviews_series_id_series_id_fk";
  
  ALTER TABLE "reviews" DROP CONSTRAINT "reviews_favourite_photo_id_photos_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_feedback_fk";
  
  DROP INDEX "photos_consent_by_idx";
  DROP INDEX "reviews_project_idx";
  DROP INDEX "reviews_client_idx";
  DROP INDEX "reviews_series_idx";
  DROP INDEX "reviews_favourite_photo_idx";
  DROP INDEX "payload_locked_documents_rels_feedback_id_idx";
  ALTER TABLE "photos" DROP COLUMN "publish_consent";
  ALTER TABLE "photos" DROP COLUMN "consent_by_id";
  ALTER TABLE "photos" DROP COLUMN "consent_at";
  ALTER TABLE "reviews" DROP COLUMN "project_id";
  ALTER TABLE "reviews" DROP COLUMN "client_id";
  ALTER TABLE "reviews" DROP COLUMN "series_id";
  ALTER TABLE "reviews" DROP COLUMN "favourite_photo_id";
  ALTER TABLE "projects" DROP COLUMN "delivery_review_requested_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "feedback_id";
  DROP TYPE "public"."enum_photos_publish_consent";
  DROP TYPE "public"."enum_feedback_moment";`)
}
