import type { Request, Response } from "express";

// In-memory session store for chats
const chatSessionsStore: Map<string, any> = new Map();

export const getChatHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const list = Array.from(chatSessionsStore.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching chat history:", error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

export const getChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const session = chatSessionsStore.get(id as string);
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }
    res.json(session);
  } catch (error: any) {
    console.error("Error fetching session:", error);
    res.status(500).json({ error: "Failed to fetch session" });
  }
};

export const saveChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const session = req.body;
    const userId = req.user?.id || "local-user-123";

    const sessionItem = {
      id: session.id,
      title: session.title || "New Chat",
      userId: userId,
      messages: session.messages || [],
      createdAt: session.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    chatSessionsStore.set(session.id, sessionItem);
    res.json({ success: true, session: sessionItem });
  } catch (error: any) {
    console.error("Error saving session:", error);
    res.status(500).json({ error: "Failed to save session" });
  }
};

export const deleteChatSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    chatSessionsStore.delete(id as string);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting session:", error);
    res.status(500).json({ error: "Failed to delete session" });
  }
};
