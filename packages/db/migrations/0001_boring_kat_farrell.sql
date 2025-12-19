CREATE TABLE "sukta_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sukta_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"content" text,
	"status" text DEFAULT 'scraping',
	"error" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
DROP TABLE "sukta_tasks" CASCADE;--> statement-breakpoint
ALTER TABLE "sukta_questions" ADD CONSTRAINT "sukta_questions_session_id_sukta_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sukta_sessions"("id") ON DELETE no action ON UPDATE no action;