import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_billing_settings_tax_mode" AS ENUM('none', 'smallBusiness', 'vat');
  CREATE TABLE "billing_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"tax_mode" "enum_billing_settings_tax_mode" DEFAULT 'none' NOT NULL,
  	"vat_rate" numeric DEFAULT 19,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "billing_settings" CASCADE;
  DROP TYPE "public"."enum_billing_settings_tax_mode";`)
}
