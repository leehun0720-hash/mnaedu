CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"member_id" integer NOT NULL,
	"plan_code" text NOT NULL,
	"plan_name" text NOT NULL,
	"amount" integer NOT NULL,
	"days" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider" text DEFAULT 'manual' NOT NULL,
	"provider_key" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "paid_until" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_id_idx" ON "orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "orders_member_idx" ON "orders" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status","created_at");