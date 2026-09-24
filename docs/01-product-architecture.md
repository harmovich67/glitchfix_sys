# 01 · Product Architecture

**Welco** is a guided project-discovery platform. Clients describe a digital project through a visual,
branching journey (not a form); an AI consultant helps them; the Super Admin controls every step without
code changes; delivery teams receive a structured requirements dossier.

## 1. System overview

```
┌──────────────────────────── apps/web (React SPA) ───────────────────────────┐
│  Landing · Auth · Discovery Wizard · Client Dashboard · Dev Workspace ·     │
│  Admin Console (Projects, Clients, Team, Workflow Builder, AI, Analytics,    │
│  Moderation, Audit, Settings)                                               │
│  TanStack Query ── REST (/api)      socket.io-client ── realtime events     │
└───────────────┬───────────────────────────────────────┬─────────────────────┘
                │ HTTPS + httpOnly JWT cookie            │ WS (same cookie)
┌───────────────▼───────────────────────────────────────▼─────────────────────┐
│ apps/api (Express 5)                                                        │
│  middleware: helmet · cors · rate-limit · auth · RBAC · zod validation      │
│  modules/<domain>/ {routes → controller → service → repository}            │
│  core/events (domain event bus) ──► notifications (DB + socket + email)     │
│                                  └► audit log                               │
│  ai/ GeminiProvider (REST) | MockProvider (offline demo)                    │
│  storage/ private file store (served only through permission checks)        │
└───────────────┬─────────────────────────────────────────────────────────────┘
                │ Prisma
          SQLite (dev) / PostgreSQL (prod)

packages/shared  ← imported by both apps: roles, permissions, statuses, zod DTOs,
                   workflow types + condition engine (same logic client & server)
```

## 2. Monorepo layout

```
welco_sys/
├─ docs/                      planning documents (this folder)
├─ packages/shared/src/       domain contracts shared by web + api
│   ├─ roles.ts               roles, permission matrix, can()
│   ├─ constants.ts           project statuses, priorities, file categories…
│   ├─ workflow.ts            Step/Question/Condition types + evaluator
│   └─ schemas.ts             zod DTOs for every write endpoint
├─ apps/api/
│   ├─ prisma/schema.prisma   data model  ·  prisma/seed.ts demo data + default journey
│   └─ src/
│       ├─ config/            env parsing
│       ├─ core/              errors, event bus, http helpers, crypto
│       ├─ middleware/        auth, permissions, validation, rate limits, errors
│       ├─ modules/           auth, users, clients, projects, workflows, files,
│       │                     messages, tasks, notes, notifications, ai,
│       │                     analytics, audit, settings
│       └─ realtime/          socket.io server (rooms: user:<id>, project:<id>)
└─ apps/web/src/
    ├─ components/ui/         design system primitives
    ├─ components/layout/     app shell, sidebar, topbar
    ├─ features/<domain>/     pages + domain components
    └─ lib/                   api client, socket, i18n, theme, utils
```

## 3. Backend layering (clean architecture)

| Layer        | Responsibility                                                      | Knows about        |
|--------------|---------------------------------------------------------------------|--------------------|
| Route        | URL + middleware chain (auth, permission, validation, rate limit)  | controller         |
| Controller   | Translate HTTP ⇄ service call; no business rules                    | service            |
| Service      | Business rules, access checks, transactions, emits domain events   | repository, events |
| Repository   | Persistence queries (Prisma); returns plain records                 | prisma             |
| Event bus    | Decouples side effects: notifications, emails, sockets, audit       | listeners          |

Domain events: `project.created`, `project.submitted`, `project.statusChanged`, `project.assigned`,
`project.approved`, `message.created`, `message.pendingApproval`, `clarification.requested`,
`file.uploaded`, `task.assigned`.

## 4. Key design decisions

1. **Workflow snapshot per project.** When a client starts a project the active workflow template
   (steps + questions) is copied into `Project.workflowSnapshot`. Admins can reshape the journey at
   any time without breaking in-progress projects; answers are keyed by stable `questionKey`.
2. **One condition engine, two runtimes.** `packages/shared/workflow.ts` evaluates visibility rules
   in the browser (live branching) and on the server (submission validation).
3. **Controlled conversations.** Each project has a `CLIENT` thread (client + team) and an `INTERNAL`
   thread (staff only). A platform setting governs developer→client messages: `direct`, `moderated`
   (held for admin approval — default) or `disabled`. Super Admin sees every thread, including hidden
   and pending messages, and can lock threads.
4. **AI behind a provider interface.** `GeminiProvider` calls the Gemini REST API with a JSON response
   schema so replies carry machine-applicable suggestions (`questionKey → values`). With no API key the
   `MockProvider` produces deterministic keyword-based suggestions so the product works offline.
   Everything (on/off, model, persona, instructions, temperature, per-user daily limit, monthly token
   cap, individual capabilities) is admin-controlled and stored in `AISettings`; the API key is stored
   AES-256-GCM encrypted.
5. **Private file storage.** Uploads go to `apps/api/storage/` with random names, MIME + extension
   allow-list and size cap; downloads stream through `/api/files/:id/download` after an access check.
   Files have `CLIENT` or `INTERNAL` visibility.
6. **Auth.** JWT in an httpOnly, SameSite=Lax cookie; `tokenVersion` on the user allows global
   revocation (logout-all, deactivation, password change). Sockets authenticate with the same cookie.

## 5. Roles

| Capability                          | Super Admin | Admin | Project Mgr | Developer        | Client     |
|-------------------------------------|:-----------:|:-----:|:-----------:|:----------------:|:----------:|
| Start & fill discovery journeys     |             |       |             |                  | ✓ own      |
| View projects                       | all         | all   | all         | assigned         | own        |
| Change status / priority / dates    | ✓           | ✓     | ✓           |                  |            |
| Assign team                         | ✓           | ✓     | ✓           |                  |            |
| Approve / reopen requirements       | ✓           | ✓     | ✓           |                  |            |
| Internal thread, notes, tasks       | ✓           | ✓     | ✓           | ✓ assigned       |            |
| Request clarification / previews    | ✓           | ✓     | ✓           | ✓ assigned       |            |
| Moderate messages                   | ✓           | ✓     |             |                  |            |
| Manage team users                   | ✓           | ✓ (non-super) |     |                  |            |
| Workflow builder                    | ✓           |       |             |                  |            |
| AI management                       | ✓           |       |             |                  |            |
| Analytics                           | ✓           | ✓     | ✓           |                  |            |
| Audit log, platform settings        | ✓           |       |             |                  |            |

## 6. Non-functional

- **Security:** helmet, strict CORS, rate limiting (global, auth, AI, uploads), zod validation on every
  write, RBAC + resource-level checks in services, audit log for sensitive actions.
- **Real-time:** socket.io rooms; the web app invalidates TanStack Query caches on events.
- **Email:** nodemailer; in development messages are logged to the console (JSON transport) unless SMTP
  is configured.
- **i18n:** English (LTR) and Arabic (RTL); UI dictionaries + per-field translations inside workflow
  content (`i18n.ar`). Layout uses logical CSS properties so RTL mirrors automatically.
- **Theming:** light/dark/system via design tokens (CSS variables).
