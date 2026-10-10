import type { Request, Response } from "express";
import { legalAdvisorApp } from "../orchestrator.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { callWithFallback } from "../modelProvider.js";

export const getAdvice = async (req: Request, res: Response): Promise<void> => {
  try {
    const { story, history, persona } = req.body;
    
    if (!story) {
       res.status(400).json({ error: "Please provide a 'story' in the request body." });
       return;
    }

    console.log(`Starting LangGraph workflow for new story (Persona: ${persona})...`);
    
    const result = await legalAdvisorApp.invoke({
      user_story: story,
      history: history || [],
      persona: persona || 'citizen'
    });

    res.json({
      success: true,
      data: {
        category: result.law_category,
        facts: result.key_facts,
        kanoon_results: result.api_results,
        advice: result.legal_advice,
        action_plan: result.action_plan,
        rti_addon: result.rti_addon
      }
    });
  } catch (error: any) {
    console.error("Error processing story:", error);
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
};

export const refineRti = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raw_text } = req.body;
    if (!raw_text) {
       res.status(400).json({ error: "Missing raw_text" });
       return;
    }

    console.log("Refining RTI request...");
    const { ChatPromptTemplate } = await import("@langchain/core/prompts");
    const chatPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are an expert legal assistant specializing in the Indian Right to Information (RTI) Act, 2005."],
      ["human", `The user has provided a raw, informal description of the information they want to request from a government department.
Your task is to reframe and properly address their request into a formal, clear, and highly specific numbered list of questions or document requests suitable for an official RTI application.

Guidelines:
1. Make it sound highly professional and legally formal.
2. Structure it as a clear numbered list.
3. Remove any emotional language, complaints, or unnecessary backstory.
4. Ensure the scope is specific so the department cannot reject it for being "vague".
5. Only output the refined request text. DO NOT include greetings, closings, or any surrounding text.

User's Raw Request:
{raw_text}

Formal RTI Request Text:`]
    ]);

    const response = await callWithFallback(chatPrompt, { raw_text }, { temperature: 0.2 });
    res.json({ success: true, refined_text: response.content });
  } catch (error: any) {
    console.error("Error refining RTI:", error);
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
};

export const refineBail = async (req: Request, res: Response): Promise<void> => {
  try {
    const { raw_text, form_data = {} } = req.body;
    if (!raw_text) {
       res.status(400).json({ error: "Missing raw_text" });
       return;
    }

    console.log("Refining Bail grounds...");
    const { ChatPromptTemplate } = await import("@langchain/core/prompts");
    const chatPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are an expert Indian criminal defense lawyer drafting a bail application under Section 437/439 of the CrPC / corresponding BNSS sections."],
      ["human", `The user has provided raw facts and grounds for why the accused should be granted bail (e.g., false implication, parity, health issues).
Your task is to take these raw notes and rewrite them into a highly formal, persuasive, and legally sound "MOST RESPECTFULLY SHOWETH" section for a bail application.

Guidelines:
1. Use highly professional and formal legal language typical in Indian courts.
2. Structure the arguments logically into numbered paragraphs.
3. Start the first paragraph with "That the present applicant/accused is an innocent person and has been falsely implicated in the present case." (if applicable based on raw text).
4. Do NOT include the case caption, court name, or prayer clause. ONLY output the body paragraphs of the grounds for bail.

User's Raw Notes:
{raw_text}

Formal Bail Grounds Text:`]
    ]);

    const response = await callWithFallback(chatPrompt, { raw_text }, { temperature: 0.2 });
    
    const fullDoc = `IN THE COURT OF ${(form_data.courtName || '_____').toUpperCase()}

IN THE MATTER OF:
${(form_data.accusedName || '_____').toUpperCase()} ...APPLICANT

VERSUS

STATE ...RESPONDENT

FIR NO: ${form_data.firDetails || '_____'}
U/S: ${form_data.sections || '_____'}

APPLICATION FOR BAIL

MOST RESPECTFULLY SHOWETH:
${response.content}

PRAYER:
In view of the facts and circumstances stated above, it is most respectfully prayed that this Hon'ble Court may be pleased to grant bail to the applicant/accused in the interest of justice.

PLACE:
DATE:                                                                            ADVOCATE FOR APPLICANT`;

    res.json({ success: true, refined_text: fullDoc });
  } catch (error: any) {
    console.error("Error refining Bail:", error);
    res.status(500).json({ success: false, error: error.message || "Internal Server Error" });
  }
};
