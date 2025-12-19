import { Router } from "express";
import { db } from "../db";
import { suktaSessions, suktaQuestions } from "@sukta/db/schema";
import { eq } from "drizzle-orm";
import { scrapeQueue, questionQueue } from "../worker/queue";

const router = Router();

// Create a new session (scrape website)
router.post("/", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const [session] = await db
      .insert(suktaSessions)
      .values({ url })
      .returning();

    // Queue scraping job
    await scrapeQueue.add("scrape", { sessionId: session.id, url });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error("Error creating session:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to create session", details: message });
  }
});

// Get session status
router.get("/:id", async (req, res) => {
  try {
    const [session] = await db
      .select()
      .from(suktaSessions)
      .where(eq(suktaSessions.id, req.params.id))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(session);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch session" });
  }
});

// Ask a question in a session
router.post("/:id/question", async (req, res) => {
  const { question } = req.body;
  const sessionId = req.params.id;

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    // Check if session is ready
    const [session] = await db
      .select()
      .from(suktaSessions)
      .where(eq(suktaSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.status !== "ready") {
      return res.status(400).json({ error: "Session not ready yet" });
    }

    // Create question
    const [q] = await db
      .insert(suktaQuestions)
      .values({ sessionId, question })
      .returning();

    // Queue AI processing
    await questionQueue.add("answer", {
      questionId: q.id,
      content: session.content,
      question,
    });

    res.json({ questionId: q.id });
  } catch (error) {
    console.error("Error creating question:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({ error: "Failed to create question", details: message });
  }
});

// Get question status
router.get("/:sessionId/question/:questionId", async (req, res) => {
  try {
    const [question] = await db
      .select()
      .from(suktaQuestions)
      .where(eq(suktaQuestions.id, req.params.questionId))
      .limit(1);

    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    res.json(question);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch question" });
  }
});

export default router;
