import "dotenv/config";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { db } from "../db";
import { suktaSessions, suktaQuestions } from "@sukta/db/schema";
import { eq } from "drizzle-orm";
import { scrapeWebsite } from "./scraper";
import { askAI } from "./ai";

const connection = new IORedis({
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

// Worker for scraping websites
const scrapeWorker = new Worker(
  "sukta-scrape",
  async (job) => {
    const { sessionId, url } = job.data;
    console.log(`Scraping ${url} for session ${sessionId}`);

    try {
      const content = await scrapeWebsite(url);
      console.log(`Scraped ${content.length} characters`);

      await db
        .update(suktaSessions)
        .set({ content, status: "ready" })
        .where(eq(suktaSessions.id, sessionId));

      console.log(`Session ${sessionId} ready`);
    } catch (error) {
      console.error(`Scraping failed:`, error);
      const message = error instanceof Error ? error.message : "Unknown error";

      await db
        .update(suktaSessions)
        .set({ status: "failed", error: message })
        .where(eq(suktaSessions.id, sessionId));
    }
  },
  { connection }
);

// Worker for answering questions
const questionWorker = new Worker(
  "sukta-questions",
  async (job) => {
    const { questionId, content, question } = job.data;
    console.log(`Processing question ${questionId}`);

    try {
      await db
        .update(suktaQuestions)
        .set({ status: "processing" })
        .where(eq(suktaQuestions.id, questionId));

      const answer = await askAI(content, question);
      console.log(`Answer: ${answer.substring(0, 100)}...`);

      await db
        .update(suktaQuestions)
        .set({ answer, status: "completed" })
        .where(eq(suktaQuestions.id, questionId));
    } catch (error) {
      console.error(`Question failed:`, error);
      const message = error instanceof Error ? error.message : "Unknown error";

      await db
        .update(suktaQuestions)
        .set({ answer: `Error: ${message}`, status: "failed" })
        .where(eq(suktaQuestions.id, questionId));
    }
  },
  { connection }
);

scrapeWorker.on("completed", (job) => console.log(`Scrape job ${job.id} done`));
scrapeWorker.on("failed", (job, err) => console.error(`Scrape job ${job?.id} failed:`, err));

questionWorker.on("completed", (job) => console.log(`Question job ${job.id} done`));
questionWorker.on("failed", (job, err) => console.error(`Question job ${job?.id} failed:`, err));

console.log("Sukta workers started (scrape + questions)");
