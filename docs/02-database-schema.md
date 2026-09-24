# 02 · Database Schema

Source of truth: [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma). SQLite in
development; PostgreSQL (change `provider`) or MySQL (`npm run db:mysql -w @welco/api`, see the README) in production. Enum-like columns are strings validated by
the shared zod schemas so both databases behave identically.

## Entity map

```
User 1─0..1 ClientProfile            User 1─0..1 DeveloperProfile
 │
 ├─< Project (as client) >─ WorkflowTemplate 1─< WorkflowStep 1─< Question
 │     │
 │     ├─< ProjectMember >─ User (manager / developer)
 │     ├─< ProjectStep        (per-project step progress)
 │     ├─< Answer             (questionKey → JSON value)
 │     ├─< ProjectEvent       (timeline)
 │     ├─< File
 │     ├─< Thread 1─< Message
 │     ├─< Task
 │     ├─< Note               (developer technical notes)
 │     └─< AIMessage          (assistant conversation)
 │
 ├─< Notification
 ├─< AIUsage
 └─< AuditLog

AISettings (singleton)   Setting (key/value platform settings)
```

## Tables

| Entity | Key columns | Notes |
|---|---|---|
| **User** | id, email (unique), name, passwordHash, role, locale, isActive, tokenVersion, lastLoginAt | role ∈ SUPER_ADMIN, ADMIN, PROJECT_MANAGER, DEVELOPER, CLIENT |
| **ClientProfile** | userId (unique), companyName, industry, country, phone, website, internalNotes | "Clients" entity |
| **DeveloperProfile** | userId (unique), title, skills (JSON string[]), capacity | "Developers" entity |
| **WorkflowTemplate** | id, name, description, isDefault, version | version bumps on each save |
| **WorkflowStep** | templateId, key, title, description, icon, order, enabled, conditions (JSON), i18n (JSON) | unique (templateId, key) |
| **Question** | stepId, key, type, label, placeholder, helpText, required, order, enabled, options (JSON), conditions (JSON), validation (JSON), aiHint, i18n (JSON) | key unique inside template |
| **Project** | code (unique, e.g. `WLC-1042`), title, clientId, templateId, workflowSnapshot (JSON), status, priority, projectType, progress, currentStepKey, submittedAt, approvedAt, startDate, dueDate, aiBrief | approvedAt locks client editing |
| **ProjectMember** | projectId, userId, role (MANAGER / DEVELOPER) | unique (projectId, userId) |
| **ProjectStep** | projectId, stepKey, status, completedAt | "Project Steps" entity |
| **Answer** | projectId, questionKey, stepKey, value (JSON) | unique (projectId, questionKey) |
| **ProjectEvent** | projectId, type, title, body, actorId, visibility, meta | CLIENT / INTERNAL visibility |
| **File** | projectId, uploaderId, questionKey, category, originalName, mimeType, size, storageKey, visibility | category ∈ BRAND, REFERENCE, ATTACHMENT, SCREENSHOT, PREVIEW |
| **Thread** | projectId, type (CLIENT / INTERNAL), locked | unique (projectId, type) |
| **Message** | threadId, authorId, kind, body, status, resolvedAt, moderatedById, moderatedAt | kind ∈ MESSAGE, CLARIFICATION, SYSTEM · status ∈ VISIBLE, PENDING, HIDDEN |
| **Task** | projectId, title, description, status, priority, assigneeId, createdById, dueDate | status ∈ TODO, IN_PROGRESS, REVIEW, DONE |
| **Note** | projectId, authorId, body, pinned | internal only |
| **Notification** | userId, type, title, body, link, readAt | |
| **AISettings** | id=1, enabled, model, apiKeyEnc, persona, systemPrompt, temperature, maxOutputTokens, dailyUserLimit, monthlyTokenLimit, allowSuggest, allowImprove, allowExplain | API key AES-GCM encrypted |
| **AIUsage** | userId, projectId, kind, inputTokens, outputTokens, mock | powers limits + analytics |
| **AIMessage** | projectId, userId, role (USER / MODEL), content, meta (JSON suggestions) | |
| **AuditLog** | actorId, action, entityType, entityId, meta, ip, userAgent | append-only |
| **Setting** | key (PK), value (JSON) | e.g. `messaging.developerClientMode` |

## Workflow JSON shapes

```ts
// Question.options
[{ value: "ecommerce", label: "Ecommerce Store", description: "...", icon: "ShoppingBag",
   preview?: "style:luxury" | "font:serif", image?: "https://…",
   i18n?: { ar: { label: "…", description: "…" } } }]

// WorkflowStep.conditions / Question.conditions
{ match: "all" | "any",
  rules: [{ question: "project_type", op: "in", value: ["ecommerce"] }] }
// ops: eq, neq, in, nin, includes, excludes, filled, empty

// Question.validation
{ min?: number, max?: number, maxFiles?: number, accept?: "image" | "document" | "any" }
```

## Status lifecycle

```
STARTED ─► REQUIREMENTS ─► UNDER_REVIEW ─► DESIGN ─► DEVELOPMENT ─► TESTING ─► COMPLETED
(created)   (client filling)  (submitted)   ──────────── staff controlled ────────────
```
