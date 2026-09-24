# Welco — Project Discovery Platform

A guided, visual journey that turns a client's idea into a complete, organised requirements brief,
with an AI consultant alongside, a Super Admin control plane, and a delivery workspace for the team.

- **Planning docs:** [`docs/`](docs) — architecture, database schema, user flows, UI structure, roadmap
- **Stack:** React 19 · Vite · Tailwind v4 · Motion · TanStack Query · React Hook Form + Zod · Recharts · Radix ·
  Express 5 · Prisma (SQLite locally / PostgreSQL in prod) · Socket.IO · Nodemailer · Google Gemini (REST)

## Quick start

Requires Node 20+.

```bash
npm install          # installs all workspaces and generates the Prisma client
npm run setup        # creates the SQLite database and seeds a full demo organisation
npm run dev          # API on :4000 + web on :5173
```

Open http://localhost:5173. Every demo account uses the password **`Welco123!`**. The login page also has one-click
buttons for each role.

| Role | Email |
|---|---|
| Super Admin | `superadmin@welco.dev` |
| Admin | `admin@welco.dev` |
| Project Manager | `pm@welco.dev` |
| Developer | `dev@welco.dev` (also `dev2@`, `dev3@`) |
| Client | `client@welco.dev` (also `client2@` … `client11@`) |

`npm run db:reset -w @welco/api` wipes the database and reseeds it.

## Configuration (`apps/api/.env`)

`.env` was generated from [`.env.example`](apps/api/.env.example) with a random `APP_SECRET`.

- **AI:** set `GEMINI_API_KEY`, or paste a key in **AI Assistant → API key** (stored AES-256-GCM encrypted).
  With no key, the assistant runs in an offline **demo mode**: keyword-based feature suggestions and a glossary,
  using the same response contract as the live model. The model defaults to `gemini-3.5-flash-lite`, with
  `gemini-2.5-flash-lite` as a fallback that is tried automatically when the main model is overloaded or rate-limited
  (503/429). Both are editable in AI settings. Use **Test connection** to confirm.
- **Email:** set `SMTP_*`. Without it, emails are printed to the API console (`✉️ [email:dev] …`).
- **PostgreSQL:** change `provider` in `apps/api/prisma/schema.prisma` to `postgresql`, point `DATABASE_URL` at your
  database, then run `npm run setup`.

## Project layout

```
packages/shared   roles & permissions, statuses, zod DTOs, workflow condition engine (used by web + api)
apps/api          Express: routes → services → repositories, domain events → notifications/email/sockets, audit log
apps/web          React SPA: design system (components/ui), app shell, feature folders per domain
docs/             planning documents
```

## What's in the box

- **Discovery wizard:** conditional steps and questions, 12 question types (visual cards with live style and font
  previews, feature checklists, colour palettes, file uploads, link lists, country picker…), autosave, review and submit.
- **AI assistant:** chat that returns one-click "Add to my answers" suggestions, "Improve with AI" on long answers,
  and an AI project brief for the team. On/off switch, model, persona, instructions, temperature, per-user daily
  limit, monthly token budget and individual capabilities are all admin-controlled.
- **Workflow Builder:** templates; add, remove, reorder (drag) and enable or disable steps and questions; condition
  builder; options editor with icons and previews; Arabic translations; journey simulator; versioned saves. Each
  project keeps a snapshot of the workflow it started with.
- **Project hub:** status tracker, requirements dossier, conversation with clarification requests, files and
  previews, timeline. The staff workspace adds a task board, internal thread and technical notes. The management tab
  covers status, priority, dates, team assignment, approve/lock and reopen.
- **Controlled conversations:** client and internal threads. Developer → client messaging can be direct, moderated
  (held for approval, the default) or disabled. Moderators can approve, hide and lock. The Super Admin sees everything.
- **Admin:** analytics (conversion, funnel, popular types and features, trend, workload), clients, team and role
  matrix, moderation queue, audit log, platform settings.
- **Platform:** light and dark themes, English LTR and Arabic RTL, real-time updates, dashboard and email
  notifications, RBAC with resource-level checks, rate limits, private file storage with an allow-list, audit trail.
