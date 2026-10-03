import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import civicRouter from "./civic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(civicRouter);

export default router;
