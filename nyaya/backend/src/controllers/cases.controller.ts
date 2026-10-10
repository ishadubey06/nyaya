import type { Request, Response } from "express";

// In-memory session store for cases
const casesStore: Map<string, any> = new Map();

export const getCases = async (req: Request, res: Response): Promise<void> => {
  try {
    const list = Array.from(casesStore.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    res.json(list);
  } catch (error: any) {
    console.error("Error fetching cases:", error);
    res.status(500).json({ error: "Failed to fetch cases" });
  }
};

export const getCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const caseRecord = casesStore.get(id as string);
    if (!caseRecord) {
      res.status(404).json({ error: "Case not found" });
      return;
    }
    res.json(caseRecord);
  } catch (error: any) {
    console.error("Error fetching case:", error);
    res.status(500).json({ error: "Failed to fetch case" });
  }
};

export const saveCase = async (req: Request, res: Response): Promise<void> => {
  try {
    const newCase = req.body;
    const userId = req.user?.id || "local-user-123";

    const caseItem = {
      id: newCase.id,
      title: newCase.title,
      description: newCase.description || null,
      status: newCase.status || "Open",
      category: newCase.category || null,
      statusColor: newCase.statusColor || null,
      type: newCase.type || null,
      snippet: newCase.snippet || null,
      data: newCase.data || null,
      userId: userId,
      date: new Date().toISOString()
    };

    casesStore.set(newCase.id, caseItem);
    res.json({ success: true, case: caseItem });
  } catch (error: any) {
    console.error("Error saving case:", error);
    res.status(500).json({ error: "Failed to save case" });
  }
};
