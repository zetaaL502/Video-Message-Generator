import { Router, type IRouter } from "express";
import healthRouter from "./health";
import {
  voicesRouter,
  previewVoiceRouter,
  audioGenerationRouter,
  uploadRouter,
  exportRouter,
} from "./imessage";

const router: IRouter = Router();

router.use(healthRouter);
router.use(voicesRouter);
router.use(previewVoiceRouter);
router.use(audioGenerationRouter);
router.use(uploadRouter);
router.use(exportRouter);

export default router;
