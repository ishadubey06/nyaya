import "dotenv/config";
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { SystemMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { callWithFallback, getLLM } from "./modelProvider.js";

// 1. Graph State (`LegalAgentState`)
export const LegalAgentState = Annotation.Root({
  user_story: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  persona: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "citizen",
  }),
  history: Annotation<any[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  law_category: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  key_facts: Annotation<Record<string, any>>({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  api_results: Annotation<any[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  legal_advice: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  action_plan: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
  errors: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  rti_addon: Annotation<Record<string, any>>({
    reducer: (x, y) => y ?? x,
    default: () => ({}),
  }),
  context_note: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => "",
  }),
});

// Infer the type from Annotation
export type LegalAgentStateType = typeof LegalAgentState.State;

// 2. Graph Nodes (The Agents)

// TriageNode: Classifies the user_story AND detects context switches.
async function triageNode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log("--- TRIAGE NODE ---");
  
  const triageSchema = z.object({
    category: z.string().describe("The legal category: 'Criminal', 'Civil', 'Family', 'Property', 'Corporate', 'Labor', 'General_Chat', or 'Other'."),
    is_context_switch: z.boolean().describe("True if the user's NEW message is about a COMPLETELY DIFFERENT legal issue than the conversation history. False if it's a follow-up to the same topic or there is no history.")
  });

  const hasHistory = state.history && state.history.length > 0;
  const historySnippet = hasHistory
    ? state.history.slice(-4).map((m: any) => `${m.role}: ${m.content?.substring(0, 100)}`).join('\n')
    : "No prior conversation.";

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are an expert Indian Legal routing assistant.

Task 1: Classify the user's NEW message into one of: 'Criminal', 'Civil', 'Family', 'Property', 'Corporate', 'Labor', 'General_Chat' (greetings, casual talk), or 'Other'.

Task 2: Determine if the user's NEW message is a CONTEXT SWITCH — meaning it describes a completely different legal problem from the conversation history.
Examples of context switches: History is about a landlord dispute, new message is about domestic violence. History is about theft, new message is about divorce.
Examples that are NOT context switches: History is about landlord, new message asks a follow-up about the landlord. No history at all.

Recent Conversation History:
{history_snippet}`],
    ["human", "{user_story}"]
  ]);

  try {
    const result = await callWithFallback(
      prompt,
      { user_story: state.user_story, history_snippet: historySnippet },
      { structuredSchema: triageSchema, structuredName: "triage_classifier" }
    );
    
    const category = result.category || "Other";
    const isSwitch = result.is_context_switch || false;

    if (isSwitch && hasHistory) {
      console.log("  ⚡ Context switch detected! Keeping history but adding focus note.");
      return { 
        law_category: category, 
        context_note: `IMPORTANT: The user has switched to a NEW legal issue (${category}). Their previous conversation was about a different topic. You MUST focus your response on the user's LATEST message. The old history is kept for reference but do NOT let it overshadow or confuse your response about the current issue.`
      };
    }

    return { law_category: category, context_note: "" };
  } catch (error: any) {
    // Fallback: simple classification without structured output
    console.error("Triage structured output failed, falling back to simple classification:", error.message);
    const fallbackPrompt = ChatPromptTemplate.fromMessages([
      ["system", "You are an expert Indian Legal routing assistant. Classify the user's story into one of: 'Criminal', 'Civil', 'Family', 'Property', 'Corporate', 'Labor', 'General_Chat', or 'Other'. Respond ONLY with the category name."],
      ["human", "{user_story}"]
    ]);
    const response = await callWithFallback(fallbackPrompt, { user_story: state.user_story });
    return { law_category: response.content.toString().trim(), context_note: "" };
  }
}

// ConversationalNode: Handles basic greetings without legal processing.
async function conversationalNode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log("--- CONVERSATIONAL NODE ---");
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are Nyaya, a friendly AI Indian legal assistant. The user just said a greeting or made casual conversation. Respond in a friendly, conversational manner. Let them know you are here to help with any legal issues or questions they might have. Keep it brief and human-like."],
    ["human", "{user_story}"]
  ]);

  const response = await callWithFallback(prompt, { user_story: state.user_story });
  
  return { legal_advice: response.content.toString() };
}

// FactExtractorNode: Extracts entities into strict JSON.
async function factExtractorNode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log("--- FACT EXTRACTOR NODE ---");
  
  const factSchema = z.object({
    incident_type: z.string().describe("The primary nature of the incident (e.g., theft, divorce, breach of contract)."),
    date_of_incident: z.string().describe("The date or time period the incident occurred, if mentioned. Otherwise 'Unknown'."),
    parties_involved: z.array(z.string()).describe("The roles of the people involved (e.g., Landlord, Tenant, Spouse, Employer)."),
    core_issue_summary: z.string().describe("A 1-sentence summary of the main legal issue."),
  });

  try {
    const extractedFacts = await callWithFallback(
      null, 
      [
        new SystemMessage("You are an expert legal data extractor. Extract the key facts from the user's story into the required JSON structure."),
        new HumanMessage(state.user_story)
      ],
      { structuredSchema: factSchema, structuredName: "extract_facts" }
    );
    return { key_facts: extractedFacts };
  } catch (error: any) {
    return { errors: [error.message || "Extraction Failed"] };
  }
}

// KanoonAPINode: Takes extracted facts, queries Kanoon API (with Redis Caching).
import redisClient from "./config/redis.js";

async function kanoonAPINode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log("--- KANOON API NODE ---");
  
  const token = process.env.KANOON_API_TOKEN;
  if (!token) {
    console.warn("KANOON_API_TOKEN not found in environment. Using mock data.");
    return { api_results: [{ 
      case: "Mock State vs Defendant", 
      summary: "Mock result: Section 379 IPC for theft applies. The court held that taking property without consent is punishable." 
    }] };
  }

  try {
    const query = `${state.key_facts.incident_type || ""} ${state.key_facts.core_issue_summary || ""}`.trim();
    if (!query) return { api_results: [] };

    const encodedQuery = encodeURIComponent(query);
    const cacheKey = `kanoon:${encodedQuery}`;

    // Try hitting Redis Cache
    if (redisClient.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log("  → Found results in Redis Cache!");
        return { api_results: JSON.parse(cached) };
      }
    }
    
    const url = `https://api.indiankanoon.org/search/?formInput=${encodedQuery}`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`Kanoon API returned ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const docs = data.docs || [];
    
    const api_results = docs.slice(0, 3).map((doc: any) => ({
      title: doc.title,
      headline: doc.headline, 
      docsource: doc.docsource
    }));

    // Save to Redis Cache (Expire in 24 hours = 86400 seconds)
    if (redisClient.isOpen && api_results.length > 0) {
      await redisClient.setEx(cacheKey, 86400, JSON.stringify(api_results));
    }

    return { api_results };
  } catch (error: any) {
    console.error("Kanoon API Error:", error.message);
    return { errors: [error.message || "Failed to fetch from Kanoon API"] };
  }
}

// LegalAdvisorNode: Acts as a RAG agent, translating legalese.
async function legalAdvisorNode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log(`--- LEGAL ADVISOR NODE (Persona: ${state.persona}) ---`);
  
  const contextNote = state.context_note 
    ? `\n\n${state.context_note}` 
    : "";

  const systemPrompt = state.persona === 'lawyer' 
    ? `You are an elite Indian Legal Expert assisting a fellow legal professional. Provide precise, highly technical legal analysis. Heavily cite specific statutes (BNS, BNSS, IPC, CrPC, etc.) and case precedents. Maintain a formal, academic, and professional tone.
    
IMPORTANT FORMATTING RULES:
1. Provide your response as a clear, point-wise list.
2. Clearly separate statutory references from case law.

Use the following context to inform your advice:
Category: {law_category}
Key Facts: {key_facts}
Case Laws & Statutes (from API): {api_results}
Conversation History: {history}${contextNote}`
    : `You are a compassionate and knowledgeable Indian Legal Advisor. Your goal is to explain the user's legal situation to them in simple, plain English that a layperson can understand. 
    
CRITICAL DIRECTIVE - AUTHENTICATE YOUR ADVICE: 
You MUST explicitly cite the specific legal sections, penal codes (e.g., IPC, BNS - Bharatiya Nyaya Sanhita, CrPC, BNSS, or relevant civil/corporate acts), and statutory provisions that apply to their situation. Every piece of legal advice must be backed by mentioning the exact Section number and Act to authenticate the response and empower the user.

IMPORTANT FORMATTING RULES:
1. Do NOT use markdown tables.
2. Provide your response as a clear, easy-to-read, point-wise list. 
3. Keep paragraphs short and concise. Do not write a wall of text.

Use the following context to inform your advice:
Category: {law_category}
Key Facts: {key_facts}
Case Laws & Statutes (from API): {api_results}
Conversation History: {history}${contextNote}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "Here is my latest story: {user_story}\n\nPlease give me clear legal advice based on this and our history."]
  ]);

  const response = await callWithFallback(prompt, {
    law_category: state.law_category,
    key_facts: JSON.stringify(state.key_facts, null, 2),
    api_results: JSON.stringify(state.api_results, null, 2),
    history: JSON.stringify(state.history, null, 2),
    user_story: state.user_story
  });

  return { legal_advice: response.content.toString() };
}

// ActionPlanNode: Drafts 3-5 immediate steps.
async function actionPlanNode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log(`--- ACTION PLAN NODE (Persona: ${state.persona}) ---`);
  
  const contextNote = state.context_note
    ? `\nCRITICAL: ${state.context_note} Base your action plan ONLY on the legal advice provided above (which already addresses the current issue).`
    : "";

  const systemPrompt = state.persona === 'lawyer'
    ? `You are an elite legal strategist. Based on the provided legal advice and the user's situation, outline a highly professional legal strategy and procedural action plan (e.g., Drafting of SLP, Filing Anticipatory Bail under Sec 438 CrPC, Issuing Sec 138 NI Act notice). Keep it to 3 to 5 concrete bullet points. Maintain absolute legal precision.${contextNote}`
    : `You are a legal strategist. Based on the provided legal advice and the user's situation, create a highly actionable, step-by-step plan for the user. Keep it to 3 to 5 concrete bullet points. Be direct and clear.

IMPORTANT DIRECTIVE - SUBMISSION LINKS: You MUST provide exact URLs to relevant Indian government complaint portals where applicable. If the user is drafting a document (like an RTI, Consumer Complaint, or FIR), you MUST provide the exact official government URL where they can submit it online.
CRITICAL: You must format all URLs as clickable markdown links, for example: [National Cyber Crime Portal](https://cybercrime.gov.in) or [RTI Online Portal](https://rtionline.gov.in). Do not just output raw text URLs. Do not give generic advice like "file a complaint online" without giving the exact, clickable portal link.
CRITICAL: You MUST always generate a concrete action plan. Never say you cannot create a plan. Use the user's situation and key facts below to generate actionable steps even if the legal advice is brief.${contextNote}`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", "User's Situation:\n{user_story}\n\nKey Facts:\n{key_facts}\n\nLegal Advice:\n{legal_advice}\n\nWhat should I do next?"]
  ]);

  const response = await callWithFallback(prompt, { 
    legal_advice: state.legal_advice,
    user_story: state.user_story,
    key_facts: JSON.stringify(state.key_facts, null, 2)
  });

  return { action_plan: response.content.toString() };
}

// RTI Addon Node: Evaluates if RTI is applicable and drafts application.
async function rtiAddonNode(state: LegalAgentStateType): Promise<Partial<LegalAgentStateType>> {
  console.log("--- RTI DRAFTING ADDON NODE ---");
  
  const rtiSchema = z.object({
    needs_rti: z.boolean().describe("True if the user's issue is against a government/public body and eligible for an RTI application. False otherwise."),
    department: z.string().nullable().optional().describe("The name of the government department or public body (if eligible)."),
    rti_draft: z.string().nullable().optional().describe("The drafted RTI application text containing placeholders for user details (if eligible).")
  });

  const systemPrompt = `You are an RTI Drafting Add-on that runs AFTER the Rights Navigator.
You NEVER alter or replace the Navigator's response. You only evaluate if RTI is applicable and draft it.

Step 1 — Check eligibility:
RTI can only be filed against a GOVERNMENT/PUBLIC body (municipal office, police station, PDS/ration office, rent control office, any govt department) that is not responding, has an unclear complaint status, or took a decision the user wants explained/recorded.
If the dispute is with a PRIVATE party (landlord, employer, shopkeeper, private company) → RTI does not apply.

Step 2 — If NOT eligible:
Set needs_rti to false. (Leave department and rti_draft blank).

Step 3 — If eligible:
Draft a formal RTI application with the following structure:
- To: The Public Information Officer, [Department]
- Subject line
- Body: 3-5 specific, factual, numbered questions (derived from the user's issue and navigator's response) — no opinions, no vague asks.
- Applicant name: [Your Name], Address: [Your Address], Date, Place
- Reference: Section 6(1), Right to Information Act, 2005

Be conservative on eligibility; when unsure, set needs_rti to false.`;

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
    ["human", `User Issue: {user_issue}\n\nNavigator Response:\n{navigator_response}`]
  ]);

  try {
    const rtiResult = await callWithFallback(
      prompt,
      {
        user_issue: state.user_story,
        navigator_response: `${state.legal_advice}\n\n${state.action_plan}`
      },
      { structuredSchema: rtiSchema, structuredName: "rti_evaluator" }
    );
    
    return { rti_addon: rtiResult };
  } catch (error: any) {
    console.error("RTI Addon Error:", error.message);
    return { rti_addon: { needs_rti: false } };
  }
}

// Conditional Edge Logic for Triage
function routeFromTriage(state: LegalAgentStateType): string {
  if (state.law_category.toLowerCase().includes("general_chat")) {
    return "conversational";
  }
  return "factExtractor";
}

// Conditional Edge Logic for Fact Extractor Retry Loop
function checkExtractionSuccess(state: LegalAgentStateType): string {
  if (state.errors.length > 0 && Object.keys(state.key_facts).length === 0) {
    if (state.errors.length < 3) {
      console.log("--- RETRYING FACT EXTRACTION ---");
      return "retry"; 
    } else {
      console.log("--- MAX RETRIES REACHED, PROCEEDING WITH EMPTY FACTS ---");
      return "proceed";
    }
  }
  return "proceed";
}

// 3. Graph Wiring
const workflow = new StateGraph(LegalAgentState)
  .addNode("triage", triageNode)
  .addNode("conversational", conversationalNode)
  .addNode("factExtractor", factExtractorNode)
  .addNode("kanoonApi", kanoonAPINode)
  .addNode("legalAdvisor", legalAdvisorNode)
  .addNode("actionPlan", actionPlanNode)
  .addNode("rtiAddon", rtiAddonNode)
  .addEdge(START, "triage")
  .addConditionalEdges(
    "triage",
    routeFromTriage,
    {
      conversational: "conversational",
      factExtractor: "factExtractor"
    }
  )
  .addEdge("conversational", END)
  .addConditionalEdges(
    "factExtractor",
    checkExtractionSuccess,
    {
      retry: "factExtractor",
      proceed: "kanoonApi"
    }
  )
  .addEdge("kanoonApi", "legalAdvisor")
  .addEdge("legalAdvisor", "actionPlan")
  .addEdge("actionPlan", "rtiAddon")
  .addEdge("rtiAddon", END);

// Compile the graph
export const legalAdvisorApp = workflow.compile();
