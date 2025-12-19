import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";

// Stores scraped website content
export const suktaSessions = pgTable("sukta_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  url: text("url").notNull(),
  content: text("content"),
  status: text("status")
    .$type<"scraping" | "ready" | "failed">()
    .default("scraping"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Stores Q&A for each session
export const suktaQuestions = pgTable("sukta_questions", {
  id: uuid("id").defaultRandom().primaryKey(),
  sessionId: uuid("session_id").notNull().references(() => suktaSessions.id),
  question: text("question").notNull(),
  answer: text("answer"),
  status: text("status")
    .$type<"pending" | "processing" | "completed" | "failed">()
    .default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});
