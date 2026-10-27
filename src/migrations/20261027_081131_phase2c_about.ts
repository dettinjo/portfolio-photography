import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "about_page_facts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "about_page_facts_locales" (
  	"label" varchar NOT NULL,
  	"value" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_page_faq" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"on_sessions" boolean DEFAULT false
  );
  
  CREATE TABLE "about_page_faq_locales" (
  	"question" varchar NOT NULL,
  	"answer" varchar NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" varchar NOT NULL
  );
  
  CREATE TABLE "about_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"portrait_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "about_page_locales" (
  	"bio" varchar,
  	"approach_title" varchar,
  	"approach" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "about_page_facts" ADD CONSTRAINT "about_page_facts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_facts_locales" ADD CONSTRAINT "about_page_facts_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_facts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_faq" ADD CONSTRAINT "about_page_faq_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page_faq_locales" ADD CONSTRAINT "about_page_faq_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page_faq"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_page" ADD CONSTRAINT "about_page_portrait_id_media_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "about_page_locales" ADD CONSTRAINT "about_page_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about_page"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "about_page_facts_order_idx" ON "about_page_facts" USING btree ("_order");
  CREATE INDEX "about_page_facts_parent_id_idx" ON "about_page_facts" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_page_facts_locales_locale_parent_id_unique" ON "about_page_facts_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_faq_order_idx" ON "about_page_faq" USING btree ("_order");
  CREATE INDEX "about_page_faq_parent_id_idx" ON "about_page_faq" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "about_page_faq_locales_locale_parent_id_unique" ON "about_page_faq_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "about_page_portrait_idx" ON "about_page" USING btree ("portrait_id");
  CREATE UNIQUE INDEX "about_page_locales_locale_parent_id_unique" ON "about_page_locales" USING btree ("_locale","_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "about_page_facts" CASCADE;
  DROP TABLE "about_page_facts_locales" CASCADE;
  DROP TABLE "about_page_faq" CASCADE;
  DROP TABLE "about_page_faq_locales" CASCADE;
  DROP TABLE "about_page" CASCADE;
  DROP TABLE "about_page_locales" CASCADE;`)
}
