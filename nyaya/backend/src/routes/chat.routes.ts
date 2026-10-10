import { Router } from "express";
import { getChatHistory, getChatSession, saveChatSession, deleteChatSession } from "../controllers/chat.controller.js";

const router = Router();

router.get("/", getChatHistory);
router.get("/:id", getChatSession);
router.post("/", saveChatSession);
router.delete("/:id", deleteChatSession);

export default router;
