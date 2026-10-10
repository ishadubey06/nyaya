# NYAYA_AI Frontend — Briefing for AGENTS.md

**Repo root:** `/home/ironsing/Desktop/devel/NYAYA_AI` (monorepo: `frontend/`, `backend/`, `docker-compose.yml`, root `README.md`)
**No `frontend/README.md` exists** — the root README covers setup. No TypeScript in the frontend (backend is TS).

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **React 19.2** (`.jsx`, function components + hooks) | No TS, no PropTypes |
| Build | **Vite 8** + `@vitejs/plugin-react` | `vite.config.js` is stock — no aliases, no proxy, no custom config |
| Routing | **react-router-dom 7** (`BrowserRouter`) | All routes defined in `App.jsx` |
| Styling | **Vanilla CSS**, no framework/CSS-in-JS | `src/index.css` (design tokens, `:root` vars) + `src/App.css` (~2100 lines, component styles + dark theme + 5 media queries). Glassmorphism-ish custom design system. Dark mode via `body.dark-theme` class |
| Icons | **lucide-react** | |
| Markdown | **react-markdown** (used); **remark-gfm is a dependency but never imported** — dead dep |
| Auth | **Supabase Auth** (`@supabase/supabase-js` 2.x) | Email/password, OTP, password reset, Google OAuth |
| Voice input | **@xenova/transformers 2.x** running `Xenova/whisper-tiny.en` **in-browser** inside a Web Worker (`src/workers/whisper.worker.js`) | Model downloads from HF hub on first load, cached. Audio → 16 kHz mono Float32 → transcription |
| Lint | **oxlint** (replaces ESLint) | `.oxlintrc.json` enables `react` + `oxc` plugins, `react/rules-of-hooks: error` |
| Deploy config | `vercel.json` (SPA rewrite), `Dockerfile` (dev-mode only) | |

Environment (Node 24 / npm 11 available locally): plain Vite SPA, no SSR, no state library (all state is React `useState`/context), no test framework, no formatter config.

---

## 2. What It Actually Does

**Nyaya AI** is a legal-assistant SPA for Indian citizens/lawyers (hackathon project). Frontend is a thin client over an Express + LangGraph backend.

**Flow:** `Landing` (marketing splash → `AuthPage` if unauthenticated → `LoadingScreen`) → authenticated app shell with sidebar + bottom nav.

**Routes** (all in `App.jsx`; `currentView` derived from pathname):

| Route | Component | Purpose |
|---|---|---|
| `/` | `Landing` | Splash; gates auth |
| `/home` | `Home` | Dashboard / query launcher (single-screen layout) |
| `/chat` | `AIChat` (375 ln) | Main AI legal chat; markdown rendering, chat history sidebar, RTI add-on drafts, case saving |
| `/rti` | `RTIDrafting` | RTI application drafting wizard → `POST /api/advice/refine-rti` |
| `/bail` | `BailDrafting` | Bail application drafting → `POST /api/advice/refine-bail` |
| `/cases` | `MyCases` | Saved cases CRUD → `/api/cases` |
| `/resources` | `Resources` | Static legal resources directory |

**Key mechanisms:**
- **Auth guard:** `App.jsx` `useEffect` redirects to `/` when `!loading && !user` and path ≠ `/`. `AuthProvider` (`src/contexts/AuthContext.jsx`) exposes `{ user, session, loading, signOut, getAccessToken, supabase }`.
- **Persona toggle:** sidebar button flips `citizen` ⇄ `lawyer`, persisted in `localStorage` (`nyaya_persona`). Sent as `persona` field to `/api/advice` — the backend LangGraph changes its response register accordingly.
- **Theme:** `nyaya_theme` in localStorage → `body.dark-theme`.
- **Navigation with state:** `handleNavigate(path, query, autoSend, greeting, caseId)` passes bootstrap state to `/chat` via router `location.state` (compat layer for child components).
- **Voice:** `useVoiceInput` hook (`src/hooks/useVoiceInput.js`) + `VoiceMicButton` used on Home, AIChat, RTI, Bail. `MediaRecorder` → Web Worker → Whisper → transcript. Exposes model-download progress states.
- **Cross-page nav between drafts:** RTI/Bail/chat pass `caseId` through route state.

**API contract** (`src/utils/storage.js` + 3 direct fetches):
```
API_BASE = VITE_API_URL + '/api'  ||  'http://localhost:8000/api'
```
All calls attach `Authorization: Bearer <supabase access_token>` via `getAuthHeaders()`.

| Endpoint | Where |
|---|---|
| `POST /api/advice` `{story, history[], persona}` → `{success, data:{advice, action_plan, category, kanoon_results[], rti_addon}}` | `AIChat.jsx` |
| `POST /api/advice/refine-rti` | `RTIDrafting.jsx` |
| `POST /api/advice/refine-bail` | `BailDrafting.jsx` |
| `GET/POST /api/cases`, `GET /api/cases/:id` | `storage.js` |
| `GET/POST /api/chat`, `GET/DELETE /api/chat/:id` | `storage.js` |

Backend (`backend/src/index.ts`) mounts all three routers behind `requireAuth` (Supabase JWT) + `GET /api/health`. Responses are **plain JSON, not streamed** — AIChat fakes a loading message.


---

## 3. Dev Setup

**Env** — create `frontend/.env` (gitignored, **not currently present**):
```env
VITE_SUPABASE_URL="https://<ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<anon key>"
VITE_API_URL="http://localhost:8000"   # optional; defaults to localhost:8000
```

**Scripts** (`frontend/package.json` — package name is still the Vite scaffold's `your-legal-advisor`):
```bash
npm install
npm run dev       # vite → http://localhost:5173
npm run build     # vite build → dist/
npm run preview   # vite preview (prod build locally)
npm run lint      # oxlint
```

**Full stack:** backend needs its own `backend/.env` (Supabase + `DATABASE_URL`/`DIRECT_URL`, `REDIS_URL`, `GROQ_API_KEY`, `MISTRAL_API_KEY`, `KANOON_API_TOKEN`) then `npx prisma db push && npm run dev` → port 8000. Or `docker compose up --build -d` from root (frontend container runs **dev mode** on 5173 with volume mounts; backend 8000).

**Deploy:** frontend → Vercel (framework preset: Vite; `vercel.json` handles SPA rewrites; set `VITE_API_URL` there); backend → Render; update Supabase Auth URL config for the live domain + localhost redirect.

---

## Gotchas worth putting in AGENTS.md

1. **Dead files:** `fix-css.cjs` / `fix-css2.cjs` are one-off hackathon scripts that mangled-and-patched `App.css` — don't run them. Root `package-lock.json` (87 bytes) is a stray.
2. **`remark-gfm` installed but unused**; markdown tables/GFM won't render in chat until it's wired into `ReactMarkdown`.
3. **No ESLint/Prettier/TS/tests** — lint is oxlint only, and it's barely configured (2 rules).
4. **Auth guard lives in `App.jsx`**, not routes/`ProtectedRoute` — new routes must be added there to inherit it; nav chrome (sidebar/bottom-nav) visibility is also pathname-derived in `App.jsx` (`landing`/`rti`/`chat` conditions).
5. **Two API-base patterns coexist:** `storage.js` normalizes `VITE_API_URL + '/api'`, while `AIChat`/`RTIDrafting`/`BailDrafting` inline `${VITE_API_URL || 'http://localhost:8000'}/api/...` — consolidate when extending.
6. **Whisper model (~40 MB) downloads on first mic use** — worker is initialized on mount of any component using `useVoiceInput`, so this fires early; can be a problem on slow networks/offline.
7. **`localStorage` keys:** `nyaya_persona`, `nyaya_theme` (only touched in `App.jsx`).
8. **`App.css` is a 2100-line monolith** with ad-hoc dark-theme selectors (`body.dark-theme <specific-class>`) — expect specificity fights; prefer `var(--color-*)` tokens from `index.css`.
9. State is passed via `location.state` for chat bootstrap — direct URL loads to `/chat` work but start with an empty conversation.
10. `AuthPage`/`LoadingScreen` are only mounted via `Landing` — they're not routes.

