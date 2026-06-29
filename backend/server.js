import express from "express";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

import issuesRouter from "./routes/issues.js";
import usersRouter from "./routes/users.js";
import aiRouter from "./routes/ai.js";
import authRouter from "./routes/auth.js";
import rewardsRouter from "./routes/rewards.js";

function loadBackendEnv() {
  const currentDir = process.cwd();
  // Ensure we safely look for .env whether starting from root or inside backend folder directly
  const backendEnvDir = currentDir.endsWith("backend")
    ? currentDir
    : path.resolve(currentDir, "backend");

  const envFiles =
    process.env.NODE_ENV === "production"
      ? [".env.production", ".env.local", ".env"]
      : [".env.local", ".env"];

  for (const file of envFiles) {
    const envPath = path.join(backendEnvDir, file);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
  }
}

loadBackendEnv();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Register routes
app.use("/api/auth", authRouter);
app.use("/api/issues", issuesRouter);
app.use("/api/users", usersRouter);
app.use("/api/ai", aiRouter);
app.use("/api/rewards", rewardsRouter);

app.get("/", (req, res) => {
  res.json({ message: "Community Hero API Backend is running." });
});

async function startServer() {
  app.listen(PORT, () => {
    console.log(
      `[Community Hero Platform] AI-Backend core is active on port ${PORT}`,
    );
  });
}

// In a real Vercel deployment, Vercel imports the app instead of starting it locally if we export it.
// We export the app to allow serverless functions deployment while explicitly starting the server underneath.
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer().catch((error) => {
    console.error("Failed to start server matrix:", error);
    process.exit(1);
  });
}

export default app;
