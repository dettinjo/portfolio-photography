import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_project_files_kind" AS ENUM('moodboard');
  CREATE TABLE "offerings_plan_questions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "offerings_plan_questions_locales" (
  	"question" varchar NOT NULL,
  	"help" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "projects_plan_schedule" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"time" varchar NOT NULL,
  	"item" varchar NOT NULL
  );
  
  CREATE TABLE "projects_plan_answers" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"question" varchar NOT NULL,
  	"answer" varchar
  );
  
  CREATE TABLE "projects_plan_shot_list" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar NOT NULL,
  	"done" boolean DEFAULT false
  );
  
  CREATE TABLE "project_files" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"client_id" integer,
  	"kind" "enum_project_files_kind" DEFAULT 'moodboard',
  	"note" varchar,
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
  	"focal_y" numeric,
  	"sizes_thumb_url" varchar,
  	"sizes_thumb_width" numeric,
  	"sizes_thumb_height" numeric,
  	"sizes_thumb_mime_type" varchar,
  	"sizes_thumb_filesize" numeric,
  	"sizes_thumb_filename" varchar
  );
  
  CREATE TABLE "messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"client_id" integer,
  	"body" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "projects" ADD COLUMN "plan_meeting_point" varchar;
  ALTER TABLE "projects" ADD COLUMN "plan_updated_by_client_at" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "project_files_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "messages_id" integer;
  ALTER TABLE "offerings_plan_questions" ADD CONSTRAINT "offerings_plan_questions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offerings"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "offerings_plan_questions_locales" ADD CONSTRAINT "offerings_plan_questions_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."offerings_plan_questions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plan_schedule" ADD CONSTRAINT "projects_plan_schedule_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plan_answers" ADD CONSTRAINT "projects_plan_answers_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "projects_plan_shot_list" ADD CONSTRAINT "projects_plan_shot_list_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "project_files" ADD CONSTRAINT "project_files_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "offerings_plan_questions_order_idx" ON "offerings_plan_questions" USING btree ("_order");
  CREATE INDEX "offerings_plan_questions_parent_id_idx" ON "offerings_plan_questions" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "offerings_plan_questions_locales_locale_parent_id_unique" ON "offerings_plan_questions_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "projects_plan_schedule_order_idx" ON "projects_plan_schedule" USING btree ("_order");
  CREATE INDEX "projects_plan_schedule_parent_id_idx" ON "projects_plan_schedule" USING btree ("_parent_id");
  CREATE INDEX "projects_plan_answers_order_idx" ON "projects_plan_answers" USING btree ("_order");
  CREATE INDEX "projects_plan_answers_parent_id_idx" ON "projects_plan_answers" USING btree ("_parent_id");
  CREATE INDEX "projects_plan_shot_list_order_idx" ON "projects_plan_shot_list" USING btree ("_order");
  CREATE INDEX "projects_plan_shot_list_parent_id_idx" ON "projects_plan_shot_list" USING btree ("_parent_id");
  CREATE INDEX "project_files_project_idx" ON "project_files" USING btree ("project_id");
  CREATE INDEX "project_files_client_idx" ON "project_files" USING btree ("client_id");
  CREATE INDEX "project_files_updated_at_idx" ON "project_files" USING btree ("updated_at");
  CREATE INDEX "project_files_created_at_idx" ON "project_files" USING btree ("created_at");
  CREATE UNIQUE INDEX "project_files_filename_idx" ON "project_files" USING btree ("filename");
  CREATE INDEX "project_files_sizes_thumb_sizes_thumb_filename_idx" ON "project_files" USING btree ("sizes_thumb_filename");
  CREATE INDEX "messages_project_idx" ON "messages" USING btree ("project_id");
  CREATE INDEX "messages_client_idx" ON "messages" USING btree ("client_id");
  CREATE INDEX "messages_updated_at_idx" ON "messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_files_fk" FOREIGN KEY ("project_files_id") REFERENCES "public"."project_files"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_project_files_id_idx" ON "payload_locked_documents_rels" USING btree ("project_files_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "offerings_plan_questions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "offerings_plan_questions_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plan_schedule" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plan_answers" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "projects_plan_shot_list" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "project_files" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "offerings_plan_questions" CASCADE;
  DROP TABLE "offerings_plan_questions_locales" CASCADE;
  DROP TABLE "projects_plan_schedule" CASCADE;
  DROP TABLE "projects_plan_answers" CASCADE;
  DROP TABLE "projects_plan_shot_list" CASCADE;
  DROP TABLE "project_files" CASCADE;
  DROP TABLE "messages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_project_files_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_messages_fk";
  
  DROP INDEX "payload_locked_documents_rels_project_files_id_idx";
  DROP INDEX "payload_locked_documents_rels_messages_id_idx";
  ALTER TABLE "projects" DROP COLUMN "plan_meeting_point";
  ALTER TABLE "projects" DROP COLUMN "plan_updated_by_client_at";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "project_files_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "messages_id";
  DROP TYPE "public"."enum_project_files_kind";`)
}
