import "dotenv/config";
import express from "express";
import cors from "cors";
import sessionRoutes from "./routes/session";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/session", sessionRoutes);
app.get("/health", (_, res) => {
  res.send("Sukta API running");
});

app.listen(4000, () => {
  console.log("Sukta API running on http://localhost:4000");
});
