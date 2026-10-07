# Hearth — talk to your CRM

AI-native CRM. The conversation is the interface; leads, contacts, companies, deals, tasks and activities are the views.

```bash
npm install
npm run dev
```

Runs immediately in **demo mode** (accounts + data stay in the browser). For cloud sync, copy `.env.example` to `.env`, fill in your Firebase web config, enable Email/Password + Google sign-in, and deploy `firestore.rules` (`firebase deploy --only firestore:rules`).

## Architecture

| Layer | Where |
|---|---|
| UI (React, Tailwind) | `src/app/*`, `src/components/*` |
| Business logic + validation | `src/lib/crm/service.ts`, `src/lib/crm-tools/schemas.ts` (zod, shared by forms and AI) |
| Persistence interface | `src/lib/crm/store.ts` → Firestore (`src/lib/firebase`) or local demo store |
| AI service (`ai.chat/generate/summarize/analyze`) | `src/lib/ai/index.ts` |
| Puter.js provider (only file that knows Puter) | `src/lib/puter.ts` |
| Whitelisted CRM tools | `src/lib/crm-tools/index.ts` |
| Agent loop (tool calls, proposals) | `src/lib/ai/agent.ts` |

- AI never touches the database: it can only call whitelisted tools with zod-validated args. Reads run automatically; **every write is shown as a preview and runs only after you confirm**.
- If Puter is unreachable, an offline rule-based assistant answers (clearly labelled) and the CRM stays fully usable.
- Security: per-user data under `users/{uid}/…`, shape-validated writes in `firestore.rules`, no raw HTML rendering.

Shortcuts: `Ctrl/⌘ K` palette, `G` then `C/D/L/O/M/P/T/A/S` to navigate.
Deploy: Vercel (`vercel.json` includes SPA rewrite).
