import { Router } from "express";
import { getCases, getCase, saveCase } from "../controllers/cases.controller.js";

const router = Router();

router.get("/", getCases);
router.get("/:id", getCase);
router.post("/", saveCase);

export default router;
