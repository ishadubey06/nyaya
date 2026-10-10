import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectRedis } from "./config/redis.js";
import { requireAuth } from "./middleware/auth.js";
import adviceRoutes from "./routes/advice.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import casesRoutes from "./routes/cases.routes.js";

const app = express();
const PORT = process.env.BACKEND_PORT || 8000;

app.use(cors());
app.use(express.json());

// Protected Routes — require valid Supabase JWT
app.use("/api/advice", requireAuth, adviceRoutes);
app.use("/api/chat", requireAuth, chatRoutes);
app.use("/api/cases", requireAuth, casesRoutes);

// Add health check route (public)
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, async () => {
  await connectRedis();
  console.log(`Legal Advisor Backend running on http://localhost:${PORT}`);
});
