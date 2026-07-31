import { createRequire } from "node:module";
import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { logger } from "./lib/logger";

// pino-http is CJS-only and its default-export typing resolves inconsistently
// across bundlers (works locally, fails under Vercel's function compiler).
// Load it via require to sidestep the interop ambiguity entirely.
const require = createRequire(import.meta.url);
const pinoHttp = require("pino-http");

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req: any) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res: any) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => res.redirect(302, "/api/healthz"));

app.use("/api", router);

export default app;
