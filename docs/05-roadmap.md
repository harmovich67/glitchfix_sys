# 05 · Development Roadmap

## Phase 1 — Foundation ✅ (this iteration)
- Monorepo (npm workspaces), shared domain package, env config
- Prisma schema, seed with default journey + demo organisation
- Auth (register/login/logout/me), RBAC, rate limiting, validation, error handling, audit log
- Design system, app shell, theming (light/dark), i18n (EN/AR, RTL)

## Phase 2 — Discovery journey ✅
- Workflow snapshot + condition engine, answer autosave, step progress, submission validation
- Wizard UI with all question types (visual choice, chips, features, colours, fonts, files, links…)
- Review & submit, success state

## Phase 3 — Collaboration ✅
- Project hub: overview, requirements dossier, files, timeline
- Threads (client / internal), clarifications, moderation queue, thread lock
- Tasks board, technical notes, preview uploads
- Notifications (DB + socket.io + email), notification center

## Phase 4 — Control plane ✅
- Workflow Builder: templates, steps, questions, reorder, conditions, translations, simulator
- AI management (settings, encrypted key, limits, usage), Gemini provider + offline mock
- AI assistant in wizard (chat, apply suggestions, improve answers) and AI project brief
- Analytics, clients directory, team management, platform settings

## Phase 5 — Hardening (next)
- Automated tests: service unit tests (vitest), API integration tests (supertest), Playwright E2E
- PostgreSQL + migrations in CI, object storage (S3) adapter for files, antivirus scan hook
- Refresh-token rotation, 2FA for staff, password reset by email
- Queue for email / AI jobs (BullMQ), structured logging + tracing
- Workflow template versioning UI (diff / rollback), per-industry templates
- PDF export of requirements dossier, proposals & quotes, payments
- Accessibility audit (WCAG 2.2 AA), performance budgets, SSR/marketing site
