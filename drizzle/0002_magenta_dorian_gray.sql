CREATE TABLE "answers" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"body" text NOT NULL,
	"choice_index" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"score" integer,
	"graded_by" text,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"graded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE UNIQUE INDEX "answers_member_question_idx" ON "answers" USING btree ("member_id","question_id");--> statement-breakpoint
CREATE INDEX "answers_status_idx" ON "answers" USING btree ("status","created_at");