import { Queue } from "bullmq";
import IORedis from "ioredis";

// Support both REDIS_URL and separate host/port/password
const connection = process.env.REDIS_URL
  ? new IORedis(process.env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    });

export const scrapeQueue = new Queue("sukta-scrape", { connection });
export const questionQueue = new Queue("sukta-questions", { connection });
