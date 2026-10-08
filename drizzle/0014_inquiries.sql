CREATE TABLE IF NOT EXISTS "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"area" text NOT NULL,
	"name" text NOT NULL,
	"org" text,
	"phone" text,
	"email" text NOT NULL,
	"message" text NOT NULL,
	"source" text,
	"status" text DEFAULT '접수' NOT NULL,
	"memo" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "inquiries_status_idx" ON "inquiries" USING btree ("status","created_at");
