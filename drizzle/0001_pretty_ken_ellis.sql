CREATE TABLE "members" (
	"id" serial PRIMARY KEY NOT NULL,
	"auth_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"tier" text DEFAULT 'free' NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"cleared_level" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "point_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"kind" text NOT NULL,
	"amount" integer NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "unlocked_explanations" (
	"id" serial PRIMARY KEY NOT NULL,
	"member_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "questions" ADD COLUMN "explanation" text;--> statement-breakpoint
CREATE UNIQUE INDEX "members_auth_id_idx" ON "members" USING btree ("auth_id");--> statement-breakpoint
CREATE INDEX "point_ledger_member_idx" ON "point_ledger" USING btree ("member_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "unlocked_member_question_idx" ON "unlocked_explanations" USING btree ("member_id","question_id");