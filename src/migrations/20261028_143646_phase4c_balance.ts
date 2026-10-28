import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" ADD COLUMN "billing_gate_downloads" boolean DEFAULT true;
  ALTER TABLE "projects" ADD COLUMN "billing_balance_paid_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "proofing_extras" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects" DROP COLUMN "billing_gate_downloads";
  ALTER TABLE "projects" DROP COLUMN "billing_balance_paid_at";
  ALTER TABLE "projects" DROP COLUMN "proofing_extras";`)
}
