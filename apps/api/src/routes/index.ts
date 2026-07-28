import { Router, type IRouter } from "express";
import healthRouter from "./health";
import bountyRouter from "./bounty";

const router: IRouter = Router();

router.use(healthRouter);
router.use(bountyRouter);

export default router;
