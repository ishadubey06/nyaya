# ⚖️ Nyaya AI — Agentic Indian Legal Intelligence Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-amber.svg)](https://opensource.org/licenses/MIT)
[![Node: >=20](https://img.shields.io/badge/Node.js->=20.0.0-emerald.svg)](https://nodejs.org/)
[![Vite: React 19](https://img.shields.io/badge/Frontend-React_19_|_Vite-blue.svg)](https://vitejs.dev/)
[![LangGraph](https://img.shields.io/badge/AI-LangGraph_DAG-indigo.svg)](https://www.langchain.com/langgraph)

> **Empowering Indian citizens and legal professionals with verified statutory guidance, precedent retrieval, and automated legal drafting powered by LangGraph.**

📺 **[Watch Demo Video on YouTube](https://youtu.be/Foa-N6lcDfI?si=yE4bPHtIYduF5AVA)**

---

## 📌 Overview

**Nyaya AI** is an intelligent, multi-agent legal companion designed specifically for the Indian judicial ecosystem. Navigating the legal system is often daunting due to complex statutory provisions, recent transitions to new criminal codes (**Bharatiya Nyaya Sanhita - BNS**, **BNSS**, and **BSA**), and inaccessible legalese.

Nyaya AI bridges this divide through:
* **Dual Operating Personas**: Seamlessly toggle between plain-English, empathetic **Citizen Mode** and citation-dense **Lawyer / Pro Mode**.
* **Autonomous Agent Pipeline**: A Directed Acyclic Graph (DAG) built with **LangGraph** orchestrating classification, entity extraction, case law retrieval, synthesis, and action planning.
* **Specialized Legal Drafters**: Form-assisted wizards for **RTI Applications** (RTI Act 2005) and **Bail Petitions** (Section 437/439 CrPC & corresponding BNSS provisions).
* **Zero-Setup Deployment**: Self-contained architecture with session storage and in-memory caching that deploys instantly without mandatory external database dependencies.

---

## 🏗 System Architecture

```mermaid
graph TD
    subgraph Client [Frontend Layer - Vite / React 19]
        UI["Glassmorphic Web Interface"]
        Speech["In-Browser Whisper Speech Worker"]
        Storage["Client Session / Local Storage"]
    end

    subgraph Server [API Layer - Express & TypeScript]
        API["Express REST API (Port 8000)"]
        SessionStore["In-Memory Session Manager"]
    end

    subgraph AgenticCore [AI Orchestration - LangGraph Engine]
        Triage["Triage & Context Switch Agent"]
        FactExtract["Fact Extractor (Zod Validated)"]
        KanoonSearch["Indian Kanoon Researcher"]
        LegalAdvisor["Dual-Persona Legal Advisor"]
        ActionPlanner["Action Plan & Portal Router"]
        RTIDrafter["RTI Applicability & Drafting Addon"]
    end

    subgraph ExternalServices [External Integrations & Caching]
        KanoonAPI[("Indian Kanoon API")]
        UpstashRedis[("Upstash Redis Cache")]
        LLM_Groq["Groq API (Llama 3 / OSS)"]
        LLM_Mistral["Mistral API (Mistral Nemo / Medium)"]
        WebSearch["Tavily & Firecrawl APIs"]
    end

    UI <-->|REST API| API
    Speech --> UI
    Storage <--> UI
    API <--> SessionStore
    API <--> Triage

    Triage --> FactExtract
    FactExtract --> KanoonSearch
    KanoonSearch <-->|24h Cache| UpstashRedis
    KanoonSearch <--> KanoonAPI
    KanoonSearch --> LegalAdvisor
    LegalAdvisor --> ActionPlanner
    ActionPlanner --> RTIDrafter

    LegalAdvisor <--> LLM_Groq
    LegalAdvisor -.->|Automatic Fallback| LLM_Mistral
    ActionPlanner <--> WebSearch
```

---

## 🧠 LangGraph Multi-Agent Pipeline

Rather than relying on generic prompt chains, Nyaya AI executes queries through a stateful **Directed Acyclic Graph (DAG)**:

```mermaid
graph LR
    UserQuery([User Input]) --> Triage{Triage Agent}
    
    Triage -->|Casual Greeting| ChatNode[Conversational Agent] --> FinalResponse([Final Response])
    
    Triage -->|Legal Issue| FactNode[Fact Extraction Agent]
    
    FactNode -->|Extraction Failed| FactNode
    FactNode -->|Success / Fallback| KanoonNode[Indian Kanoon RAG Agent]
    
    KanoonNode --> AdvisorNode[Legal Advisor Agent]
    AdvisorNode --> ActionNode[Action Plan Agent]
    ActionNode --> RTINode[RTI Addon Agent]
    RTINode --> FinalResponse

    classDef agent fill:#1e293b,stroke:#e2e8f0,stroke-width:1.5px,color:#f8fafc;
    class Triage,FactNode,KanoonNode,AdvisorNode,ActionNode,RTINode,ChatNode agent;
```

### Agent Roles:
1. **Triage Agent (`triageNode`)**: Classifies queries into branches (*Criminal*, *Civil*, *Family*, *Property*, *Labor*, *Corporate*, *Consumer*, *Cybercrime*). Employs context-switch detection to retain dialogue history while pivoting focus to new legal topics.
2. **Conversational Agent (`conversationalNode`)**: Bypasses heavy legal evaluation for greetings and casual prompts.
3. **Fact Extraction Agent (`factExtractorNode`)**: Extracts dates, involved parties, core grievances, and incident types into strict JSON with conditional retry edges.
4. **Kanoon Research Agent (`kanoonAPINode`)**: Queries `api.indiankanoon.org` to fetch relevant judicial precedents and bare act citations. Results are cached in Upstash Redis for 24 hours.
5. **Legal Advisor Agent (`legalAdvisorNode`)**: Generates statutory analysis authenticated with specific Acts and Sections (BNS, IPC, CrPC, BNSS). Adapts tone and technicality dynamically based on active persona.
6. **Action Plan Agent (`actionPlanNode`)**: Synthesizes advice into 3–5 concrete next steps, embedding clickable markdown links to verified government portals (e.g., [National Cyber Crime Reporting Portal](https://cybercrime.gov.in), [e-Daakhil Consumer Forum](https://edaakhil.nic.in), [RTI Online](https://rtionline.gov.in)).
7. **RTI Drafting Add-on (`rtiAddonNode`)**: Assesses whether the dispute involves a public/governmental entity and proactively drafts a formal Section 6(1) RTI structure when eligible.

---

## ✨ Key Features

| Feature | Description |
| :--- | :--- |
| **Dual Persona Engine** | Single-click toggle between **Citizen Mode** (plain language, actionable rights) and **Lawyer Mode** (procedural strategy, academic analysis, statutory citations). |
| **Model Fallback Chain** | Built-in resilience trying primary Groq LLMs (`openai/gpt-oss-20b`) with zero-downtime fallback to Mistral (`open-mistral-nemo`, `mistral-medium-3-5`). |
| **RTI Application Wizard** | Transform unstructured grievances against government authorities into structured, formal RTI petitions ready for submission. |
| **Bail Application Wizard** | Draft formal bail grounds under Sections 437/439 CrPC / BNSS formatted with standard court captions, prayer clauses, and memo details. |
| **Voice-First Input** | Client-side audio transcription powered by Web Workers and Whisper (`@xenova/transformers`) for accessible hands-free input. |
| **My Cases Workspace** | Local workspace managing draft petitions, saved legal discussions, and historical timelines without mandatory cloud account requirements. |
| **Portal Integration** | Direct routing to official grievance redressal portals including National Consumer Helpline, Cybercrime Portal, and Labor portals. |

---

## 🚀 Getting Started Locally

### Prerequisites
* **Node.js** (v20 or higher recommended)
* API Key for **Mistral AI** and/or **Groq**
* *(Optional)* API Token for **Indian Kanoon** & **Upstash Redis**

---

### 1. Repository Setup

```bash
git clone https://github.com/your-username/nyaya-ai.git
cd nyaya-ai/nyaya
```

---

### 2. Backend Configuration

Navigate to the `backend` folder and install dependencies:

```bash
cd backend
npm install
```

Create your `.env` file in `backend/`:

```env
# -----------------------------
# AI & MODEL APIS
# -----------------------------
GROQ_API_KEY="gsk_your_groq_api_key"
MISTRAL_API_KEY="your_mistral_api_key"

# -----------------------------
# LEGAL RESEARCH & SEARCH APIS
# -----------------------------
KANOON_API_TOKEN="your_kanoon_api_token"
TAVILY_API_KEY="tvly_your_tavily_key"
FIRECRAWL_API_KEY="fc_your_firecrawl_key"

# -----------------------------
# CACHE & APPLICATION CONFIG
# -----------------------------
REDIS_URL="rediss://default:password@your-redis-endpoint.upstash.io:6379"
FRONTEND_URL="http://localhost:5173"
BACKEND_PORT=8000
```

Start the backend development server:

```bash
npm run dev
```

*The backend runs at `http://localhost:8000` (Health Check: `http://localhost:8000/api/health`).*

---

### 3. Frontend Configuration

Open a new terminal window, navigate to `frontend/`, and install dependencies:

```bash
cd ../frontend
npm install
```

Create your `.env` file in `frontend/`:

```env
VITE_API_URL="http://localhost:8000"
```

Start the Vite development server:

```bash
npm run dev
```

*The frontend will be available at `http://localhost:5173`.*

---

## 🐳 Docker Deployment

To launch the complete application stack using Docker:

```bash
# From the nyaya directory
docker compose up --build -d
```

View running logs:
```bash
docker compose logs -f
```

The frontend will be accessible on `http://localhost:5173` and the backend on `http://localhost:8000`.

---

## ☁️ Cloud Deployment Guide

### Deploying the Backend (Render / Railway / Fly.io)
1. **Root Directory**: `nyaya/backend`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start` (runs `node dist/index.js`)
4. **Environment Variables**: Add `MISTRAL_API_KEY`, `GROQ_API_KEY`, `KANOON_API_TOKEN`, `REDIS_URL`, `FRONTEND_URL`, and `BACKEND_PORT=8000`.

### Deploying the Frontend (Vercel / Netlify / Cloudflare Pages)
1. **Root Directory**: `nyaya/frontend`
2. **Framework Preset**: `Vite`
3. **Build Command**: `npm run build`
4. **Output Directory**: `dist`
5. **Environment Variable**: Set `VITE_API_URL` to your deployed backend URL (e.g., `https://nyaya-backend.onrender.com`).
6. *Note*: `vercel.json` is pre-configured to handle React Router single-page application rewriting.

---

## 📁 Project Directory Structure

```text
nyaya/
├── backend/
│   ├── src/
│   │   ├── config/             # Redis client and configuration
│   │   ├── controllers/        # Advice, cases, and chat handlers (in-memory & session storage)
│   │   ├── middleware/         # Session authentication middleware
│   │   ├── routes/             # REST API endpoint definitions
│   │   ├── index.ts            # Express server initialization
│   │   ├── modelProvider.ts    # Multi-model LLM fallback chain
│   │   └── orchestrator.ts     # LangGraph multi-agent DAG pipeline
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/                 # Static brand assets
│   ├── src/
│   │   ├── assets/             # Brand logos & background artwork
│   │   ├── components/         # AIChat, RTIDrafting, BailDrafting, MyCases, Resources
│   │   ├── contexts/           # AuthContext & Session management
│   │   ├── hooks/              # Voice input hooks
│   │   ├── utils/              # API clients & local storage sync
│   │   ├── workers/            # Client-side Whisper STT Web Worker
│   │   ├── App.jsx             # Main router & persona switchers
│   │   └── main.jsx
│   ├── Dockerfile
│   ├── package.json
│   ├── vercel.json             # SPA routing rewrite configuration
│   └── vite.config.js
│
├── docker-compose.yml          # Multi-container local orchestration
└── README.md                   # Project documentation
```

---

## ⚖️ Legal Disclaimer

Nyaya AI is an automated artificial intelligence assistant developed for informational and educational purposes under the guidelines of Indian civic accessibility. Nyaya AI does not provide formal legal representation, nor does it establish an advocate-client relationship. Users should verify all statutory references and consult an enrolled Advocate with the Bar Council of India for formal judicial proceedings.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
