CREATE TABLE "questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"level" text NOT NULL,
	"format" text NOT NULL,
	"prompt" text NOT NULL,
	"choices" jsonb,
	"answer" text,
	"intent" text,
	"published" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "questions_published_idx" ON "questions" USING btree ("published","created_at");