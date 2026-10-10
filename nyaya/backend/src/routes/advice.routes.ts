import { Router } from "express";
import { getAdvice, refineRti, refineBail } from "../controllers/advice.controller.js";

const router = Router();

router.post("/", getAdvice);
router.post("/refine-rti", refineRti);
router.post("/refine-bail", refineBail);

export default router;
