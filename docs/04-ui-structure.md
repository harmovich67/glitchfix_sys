# 04 · UI Structure & Design System

## Routes

| Route | Audience | Screen |
|---|---|---|
| `/` | public | Landing: hero, how it works, project types, CTA |
| `/login`, `/register` | public | Split-screen auth with animated brand panel |
| `/app` | all | Role dashboard (client: my projects · developer: assignments · staff: command center) |
| `/app/projects` | all (scoped) | Projects table / cards with filters |
| `/app/projects/:id` | all (scoped) | Project hub — tabs: Overview · Requirements · Conversation · Files · Workspace (staff: tasks, notes, internal thread) · Manage (staff) |
| `/app/projects/:id/journey` | client | Discovery wizard (full-screen focus mode) |
| `/app/clients`, `/app/clients/:id` | staff | Client directory and profile/history |
| `/app/team` | admins | Team members & roles |
| `/app/workflows`, `/app/workflows/:id` | super admin | Workflow Builder |
| `/app/ai` | super admin | AI management |
| `/app/analytics` | managers | Analytics |
| `/app/moderation` | admins | Held messages queue |
| `/app/audit` | super admin | Audit log |
| `/app/notifications` | all | Notification center |
| `/app/settings` | all | Profile, appearance, language (+ platform settings for super admin) |

## Layout

```
┌───────────┬─────────────────────────────────────────────────────┐
│ ◆ Welco   │  Topbar: breadcrumb · search · theme · lang · 🔔 · avatar │
│           ├─────────────────────────────────────────────────────┤
│ nav items │                                                     │
│ (by role) │   page content (max-w 1400, 24–32px gutters)        │
│           │                                                     │
│ user card │                                                     │
└───────────┴─────────────────────────────────────────────────────┘
Mobile: sidebar becomes a slide-over drawer.
```

Wizard (focus mode):

```
┌─────────────────┬───────────────────────────────────────┬──────────────┐
│ Step rail       │  Step eyebrow · Title · description   │ AI assistant │
│ ● Project type  │  ┌─────────────────────────────────┐  │ (drawer on   │
│ ● Business      │  │ question cards (visual choices, │  │  <xl)        │
│ ○ Brand         │  │ chips, colour pickers, uploads) │  │              │
│ ○ …             │  └─────────────────────────────────┘  │ suggestions  │
│ progress ring   │  Back               Saved ✓   Next →  │ + Apply      │
└─────────────────┴───────────────────────────────────────┴──────────────┘
```

## Design system

**Tokens** (CSS variables, swapped by `.dark`): `--bg`, `--surface`, `--surface-2`, `--border`,
`--fg`, `--muted`, `--brand` (indigo-violet 500/600), `--accent` (cyan), semantic `--success`, `--warning`,
`--danger`, `--info`; radii `sm 8 / md 12 / lg 16 / xl 24`; shadow scale `xs → xl` + `glow`.

**Typography:** Inter (Latin) / IBM Plex Sans Arabic (Arabic), display weight 600 with tight tracking;
scale 12 · 13 · 14 · 16 · 18 · 24 · 30 · 36 · 48 · 60.

**Spacing:** 4-pt grid (Tailwind default); cards `p-5/p-6`, sections `gap-6`.

**Components** (`apps/web/src/components/ui`): Button (primary, secondary, ghost, outline, danger ·
sm/md/lg · loading), IconButton, Input, Textarea, Select, Label/Field, Checkbox, Switch, Badge,
StatusBadge, PriorityBadge, Card, GlassCard, Modal, Drawer, Tabs, DropdownMenu, Tooltip, Table,
Avatar/AvatarStack, Progress, ProgressRing, Skeleton, EmptyState, Spinner, Kbd, Stat card, toasts.

**Motion:** 150–250 ms ease-out for micro-interactions; spring for cards & drawers; direction-aware
step transitions (mirrored in RTL); `prefers-reduced-motion` respected.

**Visual choices:** design styles render live CSS mini-mockups (Modern, Luxury, Minimal, Dark,
Corporate, Creative); font preferences render real type specimens; project types use gradient icon
tiles.
