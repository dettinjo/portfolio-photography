import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_payments_kind" AS ENUM('deposit', 'balance', 'extras', 'addon');
  CREATE TYPE "public"."enum_payments_status" AS ENUM('open', 'processing', 'paid', 'failed', 'expired', 'partially_refunded', 'refunded');
  CREATE TABLE "projects_proposal_lines" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"amount" numeric NOT NULL
  );
  
  CREATE TABLE "payments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"project_id" integer NOT NULL,
  	"client_id" integer,
  	"kind" "enum_payments_kind" DEFAULT 'deposit' NOT NULL,
  	"status" "enum_payments_status" DEFAULT 'open' NOT NULL,
  	"label" varchar NOT NULL,
  	"amount" numeric NOT NULL,
  	"refunded" numeric DEFAULT 0,
  	"currency" varchar DEFAULT 'eur',
  	"paid_at" timestamp(3) with time zone,
  	"stripe_session_id" varchar,
  	"payment_intent_id" varchar,
  	"checkout_url" varchar,
  	"livemode" boolean,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "stripe_events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"event_id" varchar NOT NULL,
  	"type" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "projects" ADD COLUMN "proposal_note" varchar;
  ALTER TABLE "projects" ADD COLUMN "proposal_deposit_percent" numeric;
  ALTER TABLE "projects" ADD COLUMN "proposal_deposit_amount" numeric;
  ALTER TABLE "projects" ADD COLUMN "proposal_sent_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "proposal_accepted_at" timestamp(3) with time zone;
  ALTER TABLE "projects" ADD COLUMN "proposal_accepted_by_id" integer;
  ALTER TABLE "projects" ADD COLUMN "send_proposal" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "payments_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "stripe_events_id" integer;
  ALTER TABLE "projects_proposal_lines" ADD CONSTRAINT "projects_proposal_lines_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "projects_proposal_lines_order_idx" ON "projects_proposal_lines" USING btree ("_order");
  CREATE INDEX "projects_proposal_lines_parent_id_idx" ON "projects_proposal_lines" USING btree ("_parent_id");
  CREATE INDEX "payments_project_idx" ON "payments" USING btree ("project_id");
  CREATE INDEX "payments_client_idx" ON "payments" USING btree ("client_id");
  CREATE INDEX "payments_status_idx" ON "payments" USING btree ("status");
  CREATE UNIQUE INDEX "payments_stripe_session_id_idx" ON "payments" USING btree ("stripe_session_id");
  CREATE INDEX "payments_payment_intent_id_idx" ON "payments" USING btree ("payment_intent_id");
  CREATE INDEX "payments_updated_at_idx" ON "payments" USING btree ("updated_at");
  CREATE INDEX "payments_created_at_idx" ON "payments" USING btree ("created_at");
  CREATE UNIQUE INDEX "stripe_events_event_id_idx" ON "stripe_events" USING btree ("event_id");
  CREATE INDEX "stripe_events_updated_at_idx" ON "stripe_events" USING btree ("updated_at");
  CREATE INDEX "stripe_events_created_at_idx" ON "stripe_events" USING btree ("created_at");
  ALTER TABLE "projects" ADD CONSTRAINT "projects_proposal_accepted_by_id_clients_id_fk" FOREIGN KEY ("proposal_accepted_by_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_payments_fk" FOREIGN KEY ("payments_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stripe_events_fk" FOREIGN KEY ("stripe_events_id") REFERENCES "public"."stripe_events"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "projects_proposal_proposal_accepted_by_idx" ON "projects" USING btree ("proposal_accepted_by_id");
  CREATE INDEX "payload_locked_documents_rels_payments_id_idx" ON "payload_locked_documents_rels" USING btree ("payments_id");
  CREATE INDEX "payload_locked_documents_rels_stripe_events_id_idx" ON "payload_locked_documents_rels" USING btree ("stripe_events_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "projects_proposal_lines" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "payments" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "stripe_events" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "projects_proposal_lines" CASCADE;
  DROP TABLE "payments" CASCADE;
  DROP TABLE "stripe_events" CASCADE;
  ALTER TABLE "projects" DROP CONSTRAINT "projects_proposal_accepted_by_id_clients_id_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_payments_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_stripe_events_fk";
  
  DROP INDEX "projects_proposal_proposal_accepted_by_idx";
  DROP INDEX "payload_locked_documents_rels_payments_id_idx";
  DROP INDEX "payload_locked_documents_rels_stripe_events_id_idx";
  ALTER TABLE "projects" DROP COLUMN "proposal_note";
  ALTER TABLE "projects" DROP COLUMN "proposal_deposit_percent";
  ALTER TABLE "projects" DROP COLUMN "proposal_deposit_amount";
  ALTER TABLE "projects" DROP COLUMN "proposal_sent_at";
  ALTER TABLE "projects" DROP COLUMN "proposal_accepted_at";
  ALTER TABLE "projects" DROP COLUMN "proposal_accepted_by_id";
  ALTER TABLE "projects" DROP COLUMN "send_proposal";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "payments_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "stripe_events_id";
  DROP TYPE "public"."enum_payments_kind";
  DROP TYPE "public"."enum_payments_status";`)
}
