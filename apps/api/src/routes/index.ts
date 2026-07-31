import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import bountyRouter from "./bounty.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bountyRouter);

export default router;
