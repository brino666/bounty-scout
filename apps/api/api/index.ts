// Vercel entrypoint — anything under /api becomes a serverless function.
// This file just hands every request to the same Express app used for local dev.
import app from "../src/app.js";

export default app;
