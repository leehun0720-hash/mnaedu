CREATE TABLE IF NOT EXISTS "qna" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"answer" text,
	"answered_at" timestamp with time zone,
	"secret" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "qna_published_idx" ON "qna" USING btree ("published","created_at");
