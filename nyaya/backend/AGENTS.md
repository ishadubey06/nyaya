# NYAYA_AI Backend — Briefing for AGENTS.md

**Repo:** `/home/ironsing/Desktop/devel/NYAYA_AI` monorepo (`frontend/`, `backend/`, `docker-compose.yml`). No backend README — setup lives in the root `README.md`. Backend **is TypeScript**; frontend is plain JSX.

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js (Docker image: `node:20-alpine`; local is v24) | ESM (`"type": "module"`) |
| Web framework | **Express 5** | `src/index.ts` — 29 lines, whole app wired here |
| Language | **TypeScript 7** (`strict: true`, `module: nodenext`) | Run via **tsx** (no compile step in dev) |
| AI orchestration | **LangGraph** (`@langchain/langgraph` 1.x `StateGraph`) + `@langchain/core` prompts/messages | `src/orchestrator.ts` — the core of the product |
| LLM providers | **Groq** (`@langchain/groq`) primary → **Mistral** fallback (via `ChatOpenAI` + `baseURL: https://api.mistral.ai/v1`) | Model chain in `src/modelProvider.ts` |
| Structured output | **zod** schemas + `llm.withStructuredOutput()` | Used by triage / fact-extraction / RTI nodes |
| ORM / DB | **Prisma 5** → PostgreSQL (Supabase) | `prisma/schema.prisma`; `DATABASE_URL` (pooler) + `DIRECT_URL` (migrations) |
| Auth | Supabase Auth verified by **outbound HTTP call** (`fetch ${SUPABASE_URL}/auth/v1/user`) — *not* local JWKS/JWT decode | `src/middleware/auth.ts` |
| Cache | **Redis** (`redis` client → Upstash) | Only used for Kanoon query caching, 24 h TTL |
| Validation / misc | `zod`, `cors`, `dotenv`, `jsonwebtoken` (dep present, **unused in src**), `multer` (**unused**), `@tavily/core` + `@vitalets/google-translate-api` (**both unused**) | |
| Tests | **None** | No test script, no framework |
| Lint/format | **None** | No ESLint/Prettier/Biome config |

Scripts (`backend/package.json`):
```bash
npm run dev     # tsx src/index.ts  → http://localhost:8000
npm run build   # tsc → dist/
npm start       # node dist/index.js
```
No `prisma` scripts are defined — migrations are run manually (`npx prisma db push`, `npx prisma generate`).

---

## 2. What It Actually Does

**Server layout** (`src/`, ~1050 LOC total):

```
index.ts            Express app: cors, json, route mounting, /api/health, redis connect
middleware/auth.ts  requireAuth — verifies Supabase JWT via HTTP, sets req.user {id, email}
routes/             advice | chat | cases routers (thin)
controllers/        advice (LangGraph) | chat (Prisma) | cases (Prisma)
orchestrator.ts     LangGraph StateGraph — the AI pipeline (416 lines)
modelProvider.ts    LLM fallback chain + callWithFallback()
config/db.ts        PrismaClient singleton
config/redis.ts     redis client + connectRedis() (skips if REDIS_URL unset)
prisma/schema.prisma  ChatSession → Message (cascade), Case
```

**Route surface** — all three routers mounted behind `requireAuth`; only `GET /api/health` is public. CORS is fully open (`cors()` with no options).

| Endpoint | Handler | Notes |
|---|---|---|
| `POST /api/advice` | `getAdvice` | `{story, history[], persona}` → invokes LangGraph → `{success, data:{category, facts, kanoon_results, advice, action_plan, rti_addon}}` |
| `POST /api/advice/refine-rti` | `refineRti` | `{raw_text}` → single LLM call (temp 0.2) → `{success, refined_text}` |
| `POST /api/advice/refine-bail` | `refineBail` | `{raw_text, form_data}` → LLM grounds + **server-side template** wraps it into a full bail application → `{success, refined_text}` |
| `GET /api/chat` | `getChatHistory` | last 50 sessions w/ messages, filtered by `req.user.id` |
| `GET /api/chat/:id` | `getChatSession` | 403 if owned by another user |
| `POST /api/chat` | `saveChatSession` | upsert session, then **delete-all + re-insert** messages (naive sync) |
| `DELETE /api/chat/:id` | `deleteChatSession` | ownership check first |
| `GET /api/cases` | `getCases` | last 20, filtered by user |
| `GET /api/cases/:id` | `getCase` | 403 on ownership mismatch |
| `POST /api/cases` | `saveCase` | upsert keyed on client-supplied `id` |

**LangGraph pipeline** (`orchestrator.ts`, compiled → `legalAdvisorApp`):

```
START → triage ──(general_chat)──► conversational → END
         │
         └─(legal)→ factExtractor ⇄ (retry ≤3) → kanoonApi → legalAdvisor → actionPlan → rtiAddon → END
```

- **State** (`Annotation.Root`): `user_story, persona, history, law_category, key_facts, api_results, legal_advice, action_plan, errors (concat reducer), rti_addon, context_note`.
- **triage**: zod structured output — classifies into `Criminal/Civil/Family/Property/Corporate/Labor/General_Chat/Other` **and detects context switches** (injects `context_note` telling downstream nodes to focus on the latest issue). Falls back to plain-string classification on structured-output failure.
- **conversational**: greeting short-circuit; bypasses all legal processing.
- **factExtractor**: zod `{incident_type, date_of_incident, parties_involved, core_issue_summary}`; conditional-edge retry loop (max 3) then proceeds with empty facts.
- **kanoonApi**: builds query from extracted facts → Redis GET cache (`kanoon:<query>`) → `POST https://api.indiankanoon.org/search/?formInput=...` (Token auth) → top 3 docs → `SETEX` 24 h. **If `KANOON_API_TOKEN` is unset it returns hard-coded mock data.** Errors are pushed to `state.errors`, pipeline continues.
- **legalAdvisor**: RAG node; system prompt switches on `state.persona` (citizen plain-English vs. lawyer technical with BNS/IPC/CrPC citations).
- **actionPlan**: 3–5 bullets; citizen persona has hard-coded directives to emit clickable markdown links to official portals (cybercrime.gov.in, rtionline.gov.in…).
- **rtiAddon**: zod `{needs_rti, department, rti_draft}` — only drafts when the dispute is against a government/public body.

**LLM fallback** (`modelProvider.ts`): `MODEL_CHAIN = [llama-3.3-70b-versatile (groq), llama3-70b-8192 (groq), mistral-medium-3.5 (mistral)]`. `callWithFallback(prompt, inputs, {temperature, structuredSchema, structuredName})` walks the chain on rate-limit **or** any error. Default temperature 0. All nodes go through it.

**DB schema** (`prisma/schema.prisma`): `ChatSession{id, title, userId?, messages[], createdAt, updatedAt}` → `Message{id, sessionId, sender, text, citation?, createdAt}` (`onDelete: Cascade`); `Case{id, title, description?, status, date, category?, statusColor?, type?, snippet?, data: Json?, userId?}`. String PKs (client-generated ids), nullable `userId`, **no relations/indexes on userId** — ownership is enforced in controller code, not schema.

**Auth flow**: frontend sends `Authorization: Bearer <supabase access_token>` → `requireAuth` forwards it to `GET {SUPABASE_URL}/auth/v1/user` with `apikey` header → on OK, `req.user = {id, email}`; 401 on bad token, 503 if Supabase unreachable, 500 on other errors. Note the quoted-stripping (`replace(/"/g,'')` on env vars) — env values sometimes arrive quoted.

**Persona** is passed through untouched from the client into graph state; only `legalAdvisorNode` and `actionPlanNode` branch on it.


---

## 3. Dev Setup

**Env** — create `backend/.env` (gitignored, **not currently present**). Full list from root README:

```env
SUPABASE_URL="https://<ref>.supabase.co"
SUPABASE_ANON_KEY="<anon key>"
SERVICE_ROLE_KEY="<service-role key>"          # present in README; not referenced in src/
DATABASE_URL="postgresql://...pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://...supabase.com:5432/postgres"
REDIS_URL="rediss://...upstash.io:6379"        # optional — kanoon caching skipped if absent
GROQ_API_KEY="gsk_..."
MISTRAL_API_KEY="..."
KANOON_API_TOKEN="..."                         # optional — kanoon node returns mock data if absent
FRONTEND_URL="http://localhost:5173"           # in README; CORS in src is wide open, not used
BACKEND_PORT=8000                              # defaults to 8000 if unset
```

**Bootstrap:**
```bash
cd backend
npm install                       # note: .npmrc sets legacy-peer-deps=true (Docker uses --legacy-peer-deps)
npx prisma generate
npx prisma db push                # no migrations dir — schema-push only
npm run dev                       # tsx src/index.ts → :8000
```

`node_modules/` is **not installed yet** in this checkout. Redis connects lazily inside `app.listen` and failure is logged but non-fatal; Prisma connects on first query.

**Docker:** `backend/Dockerfile` = node:20-alpine + openssl, `npm install --legacy-peer-deps`, `npx prisma generate`, `CMD npm run dev`, EXPOSE 8000. Root `docker-compose.yml` runs both services with `env_file: ./backend/.env`, bind-mounts source (`/app/node_modules` anonymous vol), `NODE_ENV=development`, backend on 8000 / frontend on 5173.

**Deploy:** Render (build `npm install && npm run build`, start `npm start` → `node dist/index.js`); UptimeRobot ping `/api/health` to avoid free-tier cold starts. Requires `npx prisma generate` in the build (Dockerfile does this; Render needs it in the build command).

---

## Gotchas worth putting in AGENTS.md

1. **`node_modules` absent** — install first; `.npmrc` `legacy-peer-deps=true` is load-bearing (TS 7 / LangChain peer conflicts).
2. **Dead root files:** `test.ts`/`test2.ts`/`test3.ts` (+ their compiled `.js`/`.d.ts`/`.map` twins) are scratch Express experiments sitting in the backend root. They're outside `tsconfig` `include: ["src/**/*"]`, so `tsc` won't emit them, but they're clutter — delete or ignore.
3. **Dead dependencies:** `@tavily/core`, `@vitalets/google-translate-api`, `jsonwebtoken`, `multer`, `ts-node` are declared but never imported in `src/`. README's architecture diagram mentions Prisma→Redis→Kanoon accurately, but also implies middleware-level JWT verification that doesn't exist (verification is a per-request HTTP call to Supabase).
4. **No tests, no lint, no formatter.** Only type-checking is `tsc` via `npm run build`. Don't assume a `verify` command exists.
5. **`orchestrator.ts` prompts are the product.** Almost all quality levers (persona tone, citation rules, RTI eligibility, portal-link mandates, category taxonomy) live as inline template strings there — expect to edit this file more than any other.
6. **`callWithFallback` swallows non-rate-limit errors too** and walks the chain; a misconfigured `GROQ_API_KEY` surfaces as "All models failed" after 3 attempts.
7. **Kanoon node degrades silently** to mock data when `KANOON_API_TOKEN` is missing — responses look real in dev. Redis absence likewise only disables caching (`redisClient.isOpen` guards).
8. **Auth is per-request HTTP to Supabase** — latency on every API call, and Supabase downtime = 503 for all routes. Env vars strip stray quotes (`.env` values sometimes double-wrapped).
9. **Ownership checks are app-level, not schema-level:** list queries filter `where: { userId }` only when `userId` is truthy, single-item fetches 403 only if *both* records have a userId. Nullable `userId` + no DB constraint = easy to leak rows if you add endpoints carelessly.
10. **`saveChatSession` does delete-all + recreate messages** on every save — O(n) writes per keystroke-save; client drives ids.
11. **Express 5** (not 4) — path/route semantics differ slightly (`app.use` wildcards, async error handling).
12. **No streaming:** `POST /api/advice` resolves the whole 6-node graph before responding; frontend shows a fake loading message. Latency = sum of ~5–7 sequential LLM calls + Kanoon.
13. **`package.json` name is just `backend`**; there are no Prisma or type-check scripts — add them if you extend.
14. **TS config oddities:** `"types": []` (no @types/node auto-included — relies on `skipLibCheck`), `verbatimModuleSyntax: true`, and all relative imports must use **`.js` extensions** (`./config/db.js` even though source is `.ts`) due to `module: nodenext`.

