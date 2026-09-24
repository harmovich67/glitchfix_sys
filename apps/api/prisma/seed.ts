/* Seeds a complete demo organisation: team, clients, the default journey, projects in every stage,
   conversations, tasks, notes, notifications and AI usage. Run: npm run db:seed -w @welco/api */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  journeyProgress,
  visibleSteps,
  type AnswerMap,
  type ProjectStatus,
  type Role,
  type WorkflowDefinition,
} from '@welco/shared';
import { DEFAULT_STEPS } from './default-workflow';

const prisma = new PrismaClient();
const DAY = 24 * 3600 * 1000;
const ago = (days: number, hours = 0) => new Date(Date.now() - days * DAY - hours * 3600 * 1000);
const PASSWORD = 'Welco123!';
const j = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));

// Deterministic PRNG so every seed produces the same demo.
let seed = 42;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
const sample = <T,>(arr: T[], n: number) => [...arr].sort(() => rand() - 0.5).slice(0, n);

async function wipe() {
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.aIUsage.deleteMany();
  await prisma.project.deleteMany();
  await prisma.workflowTemplate.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.aISettings.deleteMany();
  const storage = path.resolve(process.cwd(), 'storage');
  if (fs.existsSync(storage)) for (const f of fs.readdirSync(storage)) fs.rmSync(path.join(storage, f), { force: true });
}

async function main() {
  console.log('🌱 Seeding Welco…');
  await wipe();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const mkUser = (email: string, name: string, role: Role, extra: Partial<Prisma.UserCreateInput> = {}, daysAgo = 120) =>
    prisma.user.create({ data: { email, name, role, passwordHash, createdAt: ago(daysAgo), lastLoginAt: ago(rand() * 3), ...extra } });

  // ── Team ───────────────────────────────────────────────────────────────────
  const superAdmin = await mkUser('superadmin@welco.dev', 'Sara Al-Mansour', 'SUPER_ADMIN');
  const admin = await mkUser('admin@welco.dev', 'Omar Haddad', 'ADMIN');
  const pm = await mkUser('pm@welco.dev', 'Lina Farouk', 'PROJECT_MANAGER');
  const dev = await mkUser('dev@welco.dev', 'Yusuf Karim', 'DEVELOPER', {
    developerProfile: { create: { title: 'Senior Full-stack Engineer', skills: ['React', 'Node.js', 'PostgreSQL', 'Shopify'], capacity: 4 } },
  });
  const dev2 = await mkUser('dev2@welco.dev', 'Maya Chen', 'DEVELOPER', {
    developerProfile: { create: { title: 'Mobile Engineer', skills: ['Flutter', 'Swift', 'Kotlin', 'Firebase'], capacity: 3 } },
  });
  const dev3 = await mkUser('dev3@welco.dev', 'Adam Nour', 'DEVELOPER', {
    developerProfile: { create: { title: 'Product Designer & Frontend', skills: ['Figma', 'Design systems', 'Tailwind'], capacity: 3 } },
  });

  // ── Clients ────────────────────────────────────────────────────────────────
  const client = await mkUser('client@welco.dev', 'Khalid Al-Rashid', 'CLIENT', {
    clientProfile: { create: { companyName: 'Aurora Perfumes', industry: 'beauty', country: 'SA', phone: '+966 55 123 4567', website: 'aurora-perfumes.sa' } },
  }, 60);
  const client2 = await mkUser('client2@welco.dev', 'Emma Wilson', 'CLIENT', {
    clientProfile: { create: { companyName: 'Northwind Dental', industry: 'health', country: 'GB', website: 'northwinddental.co.uk' } },
  }, 20);
  const client3 = await mkUser('client3@welco.dev', 'Faisal Nasser', 'CLIENT', {
    clientProfile: { create: { companyName: 'Nasser Properties', industry: 'real_estate', country: 'AE' } },
  }, 75);
  const extraClients = await Promise.all(
    [
      ['Noura Saleh', 'Bloom Florist', 'retail', 'KW'],
      ['Daniel Brooks', 'Peak Fitness', 'services', 'US'],
      ['Huda Al-Amri', 'Qalam Academy', 'education', 'OM'],
      ['Leo Martins', 'Tasca Lisboa', 'food', 'PT'],
      ['Reem Jaber', 'Jaber Legal', 'services', 'JO'],
      ['Sofia Rossi', 'Verde Travel', 'travel', 'IT'],
      ['Tariq Aziz', 'LedgerLite', 'finance', 'EG'],
      ['Mona Fahad', 'Hessa Abayas', 'retail', 'SA'],
    ].map(([name, company, industry, country], i) =>
      mkUser(`client${i + 4}@welco.dev`, name, 'CLIENT', { clientProfile: { create: { companyName: company, industry, country } } }, 10 + Math.floor(rand() * 80)),
    ),
  );

  // ── Workflow ───────────────────────────────────────────────────────────────
  const template = await prisma.workflowTemplate.create({
    data: {
      name: 'Standard discovery journey',
      description: 'Adaptive journey covering every project type, with branches for stores, websites, apps and platforms.',
      isDefault: true,
      steps: {
        create: DEFAULT_STEPS.map((s) => ({
          key: s.key,
          title: s.title,
          description: s.description,
          icon: s.icon,
          order: s.order,
          enabled: s.enabled,
          conditions: j(s.conditions),
          i18n: j(s.i18n),
          questions: {
            create: s.questions.map((q) => ({
              key: q.key,
              type: q.type,
              label: q.label,
              placeholder: q.placeholder ?? null,
              helpText: q.helpText ?? null,
              required: q.required,
              enabled: q.enabled,
              order: q.order,
              options: j(q.options),
              conditions: j(q.conditions),
              validation: j(q.validation),
              aiHint: q.aiHint ?? null,
              i18n: j(q.i18n),
            })),
          },
        })),
      },
    },
  });
  await prisma.workflowTemplate.create({
    data: { name: 'Quick landing page brief', description: 'Short journey for campaign pages (draft).', isDefault: false },
  });
  const { toDefinition } = await import('../src/modules/workflows/workflows.repository');
  const tree = await prisma.workflowTemplate.findUniqueOrThrow({
    where: { id: template.id },
    include: { steps: { orderBy: { order: 'asc' }, include: { questions: { orderBy: { order: 'asc' } } } } },
  });
  const snapshot: WorkflowDefinition = toDefinition(tree);

  // ── Settings ───────────────────────────────────────────────────────────────
  const { DEFAULT_INSTRUCTIONS } = await import('../src/modules/ai/ai.settings');
  await prisma.aISettings.create({ data: { id: 1, model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite', systemPrompt: DEFAULT_INSTRUCTIONS } });
  await prisma.setting.create({
    data: { key: 'platform', value: { developerClientMode: 'moderated', emailNotifications: true, allowClientRegistration: true } },
  });

  // ── Projects ───────────────────────────────────────────────────────────────
  let codeSeq = 1000;
  interface ProjectSeed {
    client: { id: string };
    answers: AnswerMap;
    status: ProjectStatus;
    priority?: string;
    createdDaysAgo: number;
    submittedDaysAgo?: number;
    approvedDaysAgo?: number;
    dueInDays?: number;
    members?: { user: { id: string; name: string }; role: 'MANAGER' | 'DEVELOPER' }[];
    currentStepKey?: string;
  }

  async function createProject(p: ProjectSeed) {
    const visible = visibleSteps(snapshot, p.answers).map((s) => s.key);
    const submitted = p.submittedDaysAgo !== undefined;
    const project = await prisma.project.create({
      data: {
        code: `WLC-${++codeSeq}`,
        title: (p.answers.project_name as string) || 'Untitled project',
        clientId: p.client.id,
        templateId: template.id,
        workflowSnapshot: snapshot as unknown as Prisma.InputJsonValue,
        status: p.status,
        priority: p.priority ?? 'MEDIUM',
        projectType: (p.answers.project_type as string) ?? null,
        progress: journeyProgress(snapshot, p.answers),
        currentStepKey: p.currentStepKey ?? (submitted ? null : visible[Math.min(visible.length - 1, Object.keys(p.answers).length > 6 ? 3 : 1)]),
        submittedAt: submitted ? ago(p.submittedDaysAgo!) : null,
        approvedAt: p.approvedDaysAgo !== undefined ? ago(p.approvedDaysAgo) : null,
        startDate: p.approvedDaysAgo !== undefined ? ago(p.approvedDaysAgo - 1) : null,
        dueDate: p.dueInDays !== undefined ? new Date(Date.now() + p.dueInDays * DAY) : null,
        createdAt: ago(p.createdDaysAgo),
        updatedAt: ago(Math.min(p.createdDaysAgo, p.submittedDaysAgo ?? p.createdDaysAgo) * 0.3),
        threads: { create: [{ type: 'CLIENT' }, { type: 'INTERNAL' }] },
        steps: {
          create: snapshot.steps.map((s) => ({
            stepKey: s.key,
            status: submitted ? (visible.includes(s.key) ? 'COMPLETED' : 'SKIPPED') : 'PENDING',
            completedAt: submitted && visible.includes(s.key) ? ago(p.submittedDaysAgo!) : null,
          })),
        },
        answers: {
          create: Object.entries(p.answers)
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([questionKey, value]) => ({
              questionKey,
              stepKey: snapshot.steps.find((s) => s.questions.some((q) => q.key === questionKey))!.key,
              value: value as Prisma.InputJsonValue,
            })),
        },
        members: { create: (p.members ?? []).map((m) => ({ userId: m.user.id, role: m.role, assignedAt: ago((p.approvedDaysAgo ?? 1) + 1) })) },
      },
      include: { threads: true },
    });

    const ev = (type: string, title: string, daysAgo: number, actorId: string | null, visibility = 'CLIENT', meta?: object) =>
      prisma.projectEvent.create({
        data: { projectId: project.id, type, title, actorId, visibility, createdAt: ago(daysAgo), meta: meta as Prisma.InputJsonValue },
      });
    await ev('created', 'Project started', p.createdDaysAgo, p.client.id);
    if (submitted) await ev('submitted', 'Requirements submitted', p.submittedDaysAgo!, p.client.id);
    for (const m of p.members ?? [])
      await ev('assigned', `${m.user.name} joined as ${m.role === 'MANAGER' ? 'project manager' : 'developer'}`, (p.approvedDaysAgo ?? 1) + 1, admin.id, 'CLIENT', { userId: m.user.id });
    if (p.approvedDaysAgo !== undefined) await ev('approved', 'Requirements approved', p.approvedDaysAgo, pm.id);
    const flow: ProjectStatus[] = ['DESIGN', 'DEVELOPMENT', 'TESTING', 'COMPLETED'];
    const reached = flow.slice(0, flow.indexOf(p.status) + 1);
    for (const [i, s] of reached.entries()) {
      const labels: Record<string, string> = { DESIGN: 'Design Phase', DEVELOPMENT: 'Development Phase', TESTING: 'Testing', COMPLETED: 'Completed' };
      await ev('status', `Moved to ${labels[s]}`, Math.max(0.2, (p.approvedDaysAgo ?? 2) - (i + 1) * 3), pm.id, 'CLIENT', { to: s });
    }
    return project;
  }

  // 1 · Flagship: Aurora Perfumes store (design phase, full collaboration history)
  const aurora = await createProject({
    client,
    status: 'DESIGN',
    priority: 'HIGH',
    createdDaysAgo: 24,
    submittedDaysAgo: 19,
    approvedDaysAgo: 15,
    dueInDays: 48,
    members: [{ user: pm, role: 'MANAGER' }, { user: dev, role: 'DEVELOPER' }, { user: dev3, role: 'DEVELOPER' }],
    answers: {
      project_type: 'ecommerce',
      project_name: 'Aurora Perfumes Online Store',
      project_goal: 'Launch our first online store to sell our perfume collections across the GCC and reach 500 orders per month within the first year.',
      company_name: 'Aurora Perfumes',
      industry: 'beauty',
      business_description:
        'Aurora is a Riyadh-based house of niche perfumes blending Arabian oud with modern French notes. We sell through two boutiques and Instagram, and want a premium online experience that feels like our stores.',
      target_customers: 'Women and men aged 25–45 in Saudi Arabia and the GCC who buy premium fragrances for themselves and as gifts.',
      country: 'SA',
      languages: ['ar', 'en'],
      brand_status: 'full',
      brand_colors: ['#1F1A17', '#C9A45C', '#F4EDE4'],
      font_style: 'serif',
      existing_website: 'https://aurora-perfumes.sa',
      social_links: ['https://instagram.com/auroraperfumes', 'https://tiktok.com/@auroraperfumes'],
      design_style: ['luxury', 'minimal'],
      color_mode: 'light',
      inspiration: ['https://www.byredo.com', 'https://www.diptyqueparis.com'],
      product_count: '50_500',
      payment_methods: ['cards', 'apple_pay', 'mada', 'bnpl', 'cod'],
      shipping_methods: ['local_courier', 'international', 'pickup'],
      features_ecommerce: ['products', 'categories', 'payments', 'shipping', 'accounts', 'reviews', 'coupons', 'wishlist', 'inventory', 'loyalty'],
      integrations: ['google_analytics', 'whatsapp', 'email_marketing'],
      budget: '15k_50k',
      timeline: '1_3',
      notes: 'Gift wrapping with a personal message is very important for us, especially during Ramadan and Eid.',
      competitors: ['https://www.arabianoud.com', 'https://www.ajmal.com'],
    },
  });

  // 2 · Same client, draft mobile app in progress (resume the journey)
  await createProject({
    client,
    status: 'REQUIREMENTS',
    createdDaysAgo: 2,
    currentStepKey: 'brand',
    answers: {
      project_type: 'mobile_app',
      project_name: 'Aurora Loyalty App',
      project_goal: 'Reward repeat customers and send them early access to new collections.',
      company_name: 'Aurora Perfumes',
      industry: 'beauty',
      business_description: 'Premium perfume house with two boutiques in Riyadh and an online store in progress.',
      target_customers: 'Existing loyal customers who visit our boutiques.',
      country: 'SA',
      languages: ['ar', 'en'],
    },
  });

  // 3 · Northwind Dental booking — submitted, waiting for assignment
  const northwind = await createProject({
    client: client2,
    status: 'UNDER_REVIEW',
    priority: 'MEDIUM',
    createdDaysAgo: 4,
    submittedDaysAgo: 1,
    answers: {
      project_type: 'booking',
      project_name: 'Northwind Dental Online Booking',
      project_goal: 'Let patients book, move and pay deposits for appointments online to cut phone calls by half.',
      company_name: 'Northwind Dental',
      industry: 'health',
      business_description: 'Family dental clinic in Leeds with 6 dentists and 2 hygienists, open six days a week.',
      target_customers: 'Families and working professionals in Leeds.',
      country: 'GB',
      languages: ['en'],
      brand_status: 'partial',
      brand_colors: ['#0E7490', '#F0FDFA'],
      design_style: ['modern', 'corporate'],
      user_roles: 'Patients book and manage appointments; receptionists manage the calendar; dentists see their daily schedule; the practice manager sees reports.',
      booking_type: 'appointments',
      features_booking: ['calendar', 'services_catalog', 'online_payment', 'reminders', 'staff', 'cancellations'],
      integrations: ['google_analytics', 'email_marketing'],
      budget: '5k_15k',
      timeline: '1_3',
    },
  });

  // 4 · Nasser Properties — in development
  const nasser = await createProject({
    client: client3,
    status: 'DEVELOPMENT',
    priority: 'URGENT',
    createdDaysAgo: 58,
    submittedDaysAgo: 52,
    approvedDaysAgo: 47,
    dueInDays: 12,
    members: [{ user: pm, role: 'MANAGER' }, { user: dev2, role: 'DEVELOPER' }, { user: dev, role: 'DEVELOPER' }],
    answers: {
      project_type: 'real_estate',
      project_name: 'Nasser Properties Portal',
      company_name: 'Nasser Properties',
      industry: 'real_estate',
      business_description: 'Dubai brokerage specialised in off-plan apartments and luxury villas with 25 agents.',
      target_customers: 'International investors and families relocating to the UAE.',
      country: 'AE',
      languages: ['en', 'ar'],
      brand_status: 'full',
      brand_colors: ['#0B1F3A', '#D4AF37'],
      design_style: ['luxury', 'dark'],
      user_roles: 'Visitors search and enquire; agents manage listings and leads; admins approve listings.',
      property_types: ['apartments', 'villas', 'offices'],
      features_real_estate: ['listings', 'filters', 'map_search', 'agents', 'inquiries', 'virtual_tours', 'favorites'],
      integrations: ['crm', 'whatsapp', 'maps'],
      budget: '50k_plus',
      timeline: 'asap',
    },
  });

  // 5+ · A realistic spread for analytics
  const types = ['ecommerce', 'company_website', 'mobile_app', 'saas', 'booking', 'landing_page', 'custom', 'real_estate'];
  const featureKey: Record<string, string> = {
    ecommerce: 'features_ecommerce',
    company_website: 'features_company',
    mobile_app: 'features_app',
    saas: 'features_saas',
    booking: 'features_booking',
    landing_page: 'features_landing',
    custom: 'features_custom',
    real_estate: 'features_real_estate',
  };
  const statusPool: ProjectStatus[] = ['STARTED', 'REQUIREMENTS', 'REQUIREMENTS', 'UNDER_REVIEW', 'DESIGN', 'DEVELOPMENT', 'TESTING', 'COMPLETED', 'COMPLETED'];
  const names: Record<string, string[]> = {
    ecommerce: ['Online Store', 'Shop Relaunch', 'Marketplace'],
    company_website: ['Corporate Website', 'Brand Website'],
    mobile_app: ['Member App', 'Delivery App'],
    saas: ['Client Portal', 'Analytics Platform'],
    booking: ['Class Booking', 'Reservations'],
    landing_page: ['Launch Page', 'Campaign Page'],
    custom: ['Operations Hub', 'Internal CRM'],
    real_estate: ['Listings Portal'],
  };
  for (let i = 0; i < 16; i++) {
    const c = extraClients[i % extraClients.length];
    const profile = await prisma.clientProfile.findUnique({ where: { userId: c.id } });
    const type = pick(types);
    const status = pick(statusPool);
    const created = 3 + Math.floor(rand() * 85);
    const submittedAgo = ['STARTED', 'REQUIREMENTS'].includes(status) ? undefined : Math.max(0.5, created - 2 - rand() * 5);
    const approved = submittedAgo !== undefined && status !== 'UNDER_REVIEW' ? Math.max(0.3, submittedAgo - 2) : undefined;
    const fq = snapshot.steps.flatMap((s) => s.questions).find((q) => q.key === featureKey[type]);
    const answers: AnswerMap = {
      project_type: type,
      project_name: `${profile?.companyName} ${pick(names[type])}`,
      company_name: profile?.companyName ?? '',
      ...(status === 'STARTED'
        ? {}
        : {
            industry: profile?.industry ?? 'other',
            business_description: `${profile?.companyName} is growing fast and needs a better digital presence to reach new customers.`,
            target_customers: 'Local customers aged 20–50',
            country: profile?.country ?? 'SA',
            languages: pick([['ar', 'en'], ['en'], ['ar']]),
            design_style: sample(['modern', 'luxury', 'minimal', 'dark', 'corporate', 'creative'], 1 + Math.floor(rand() * 2)),
            [featureKey[type]]: sample((fq?.options ?? []).map((o) => o.value), 3 + Math.floor(rand() * 5)),
            budget: pick(['under_5k', '5k_15k', '15k_50k', '50k_plus', 'not_sure']),
            timeline: pick(['asap', '1_3', '3_6', 'flexible']),
            brand_status: pick(['full', 'partial', 'none']),
          }),
    };
    await createProject({
      client: c,
      answers,
      status,
      priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH']),
      createdDaysAgo: created,
      submittedDaysAgo: submittedAgo,
      approvedDaysAgo: approved,
      dueInDays: approved !== undefined && status !== 'COMPLETED' ? 10 + Math.floor(rand() * 60) : undefined,
      members: approved !== undefined ? [{ user: pick([pm, admin]), role: 'MANAGER' }, { user: pick([dev, dev2, dev3]), role: 'DEVELOPER' }] : [],
    });
  }

  // ── Conversations ──────────────────────────────────────────────────────────
  const threadOf = (p: { threads: { id: string; type: string }[] }, type: 'CLIENT' | 'INTERNAL') => p.threads.find((t) => t.type === type)!.id;
  const msg = (threadId: string, authorId: string, body: string, hoursAgo: number, extra: Partial<Prisma.MessageUncheckedCreateInput> = {}) =>
    prisma.message.create({ data: { threadId, authorId, body, createdAt: ago(0, hoursAgo), ...extra } });

  const aC = threadOf(aurora, 'CLIENT');
  const aI = threadOf(aurora, 'INTERNAL');
  await msg(aC, pm.id, 'Hi Khalid! 👋 I’m Lina, your project manager. We’ve reviewed your requirements — they’re excellent. We’ll share the first design direction this week.', 24 * 14);
  await msg(aC, client.id, 'Thank you Lina! Very excited. Please keep the gift-wrapping experience in mind, it’s our signature.', 24 * 14 - 3);
  await msg(aC, dev.id, 'For gift wrapping, would you like customers to choose between several wrapping styles, each with its own price, or a single premium option?', 24 * 6, {
    kind: 'CLARIFICATION',
    resolvedAt: ago(5),
    moderatedById: admin.id,
    moderatedAt: ago(6),
  });
  await msg(aC, client.id, 'Three styles please: Classic (free), Signature box (+25 SAR) and Ramadan edition (+40 SAR) during the season.', 24 * 5);
  await msg(aC, dev3.id, 'The first homepage concept is ready in the Files tab — we went with warm ivory, deep brown and gold foil accents. Let us know what you think!', 20);
  await msg(aC, dev.id, 'Quick question: do you already have a Tabby or Tamara merchant account for buy-now-pay-later, or should we plan the onboarding?', 2, { kind: 'CLARIFICATION', status: 'PENDING' });
  await msg(aI, pm.id, 'Client is very detail-oriented on packaging. Let’s make the gift options a first-class part of checkout.', 24 * 13);
  await msg(aI, dev.id, 'Proposing Medusa + Next.js storefront; payments via Moyasar (mada, Apple Pay) + Tabby. Need to confirm BNPL accounts.', 24 * 12);
  await msg(aI, dev3.id, 'Moodboard is up. Using Cormorant for display and IBM Plex Sans Arabic for body.', 24 * 9);

  await msg(threadOf(nasser, 'CLIENT'), pm.id, 'Faisal, the listings module is live on staging. The map search goes live next week.', 30);
  await msg(threadOf(nasser, 'CLIENT'), client3.id, 'Great progress. Can agents upload videos too?', 26);
  await msg(threadOf(nasser, 'INTERNAL'), dev2.id, 'Video upload: suggest Mux for transcoding. Adds ~2 days.', 20);
  await msg(threadOf(northwind, 'CLIENT'), client2.id, 'Hello! Just submitted — happy to jump on a call if helpful.', 20);

  // ── Tasks & notes ──────────────────────────────────────────────────────────
  const tasks: [string, string, string, string | null, number | null][] = [
    ['Moodboard & design direction', 'DONE', 'HIGH', dev3.id, -6],
    ['Homepage concept (desktop + mobile)', 'REVIEW', 'HIGH', dev3.id, 2],
    ['Product page with gift-wrapping options', 'IN_PROGRESS', 'HIGH', dev3.id, 6],
    ['Set up Medusa backend & product import', 'IN_PROGRESS', 'MEDIUM', dev.id, 10],
    ['Payments: Moyasar + Tabby integration spike', 'TODO', 'HIGH', dev.id, 14],
    ['Arabic RTL typography QA', 'TODO', 'MEDIUM', null, 20],
  ];
  for (const [i, [title, status, priority, assigneeId, due]] of tasks.entries())
    await prisma.task.create({
      data: { projectId: aurora.id, title, status, priority, assigneeId, createdById: pm.id, order: i, dueDate: due === null ? null : new Date(Date.now() + due * DAY) },
    });
  await prisma.task.create({ data: { projectId: nasser.id, title: 'Map search with clustering', status: 'IN_PROGRESS', priority: 'URGENT', assigneeId: dev2.id, createdById: pm.id, dueDate: new Date(Date.now() + 5 * DAY) } });
  await prisma.task.create({ data: { projectId: nasser.id, title: 'Agent lead inbox + WhatsApp handoff', status: 'TODO', priority: 'HIGH', assigneeId: dev.id, createdById: pm.id, dueDate: new Date(Date.now() + 9 * DAY) } });

  await prisma.note.create({ data: { projectId: aurora.id, authorId: dev.id, pinned: true, body: 'Stack decision: Medusa v2 backend, Next.js storefront, Postgres, Cloudinary for imagery. Moyasar for mada/Apple Pay, Tabby for BNPL.' } });
  await prisma.note.create({ data: { projectId: aurora.id, authorId: dev3.id, body: 'Gift wrapping = product add-on with 3 variants; show a live preview of the box on the product page.' } });

  // A brand notes file so the Files tab isn't empty.
  const storage = path.resolve(process.cwd(), 'storage');
  fs.mkdirSync(storage, { recursive: true });
  const key = `${crypto.randomUUID()}.txt`;
  const content = 'Aurora Perfumes — brand notes\n\nPrimary: #1F1A17 (Oud Brown)\nAccent: #C9A45C (Gold)\nBackground: #F4EDE4 (Ivory)\n\nTone: warm, refined, generous.\n';
  fs.writeFileSync(path.join(storage, key), content);
  await prisma.file.create({
    data: { projectId: aurora.id, uploaderId: client.id, category: 'BRAND', visibility: 'CLIENT', originalName: 'aurora-brand-notes.txt', mimeType: 'text/plain', size: Buffer.byteLength(content), storageKey: key, createdAt: ago(20) },
  });

  // ── Notifications & AI usage ───────────────────────────────────────────────
  const notes: [string, string, string, string, string | null][] = [
    [superAdmin.id, 'project.submitted', `New project submitted · ${northwind.code}`, '“Northwind Dental Online Booking” is ready for review.', `/app/projects/${northwind.id}`],
    [superAdmin.id, 'message.pending', `Message awaiting approval · ${aurora.code}`, 'A developer message to the client is waiting for moderation.', '/app/moderation'],
    [admin.id, 'project.submitted', `New project submitted · ${northwind.code}`, '“Northwind Dental Online Booking” is ready for review.', `/app/projects/${northwind.id}`],
    [pm.id, 'project.submitted', `New project submitted · ${northwind.code}`, '“Northwind Dental Online Booking” is ready for review.', `/app/projects/${northwind.id}`],
    [client.id, 'project.status', `${aurora.code} is now in Design Phase`, 'Your project “Aurora Perfumes Online Store” moved to Design Phase.', `/app/projects/${aurora.id}`],
    [client.id, 'preview', `New preview available · ${aurora.code}`, 'The team shared a new preview of your project.', `/app/projects/${aurora.id}?tab=files`],
    [dev.id, 'project.assigned', `You were assigned to ${aurora.code}`, 'You joined “Aurora Perfumes Online Store” as developer.', `/app/projects/${aurora.id}`],
    [dev2.id, 'task.assigned', `New task on ${nasser.code}`, 'Map search with clustering', `/app/projects/${nasser.id}?tab=workspace`],
  ];
  for (const [i, [userId, type, title, body, link]] of notes.entries())
    await prisma.notification.create({ data: { userId, type, title, body, link, createdAt: ago(0, i * 3 + 1), readAt: i > 5 ? ago(0, 1) : null } });

  for (let d = 0; d < 30; d++) {
    const n = Math.floor(rand() * 9);
    for (let k = 0; k < n; k++)
      await prisma.aIUsage.create({
        data: {
          userId: pick([client, client2, client3, ...extraClients]).id,
          kind: pick(['CHAT', 'CHAT', 'CHAT', 'IMPROVE', 'BRIEF']),
          inputTokens: 600 + Math.floor(rand() * 1800),
          outputTokens: 120 + Math.floor(rand() * 500),
          mock: true,
          createdAt: ago(d, rand() * 20),
        },
      });
  }

  await prisma.auditLog.create({ data: { actorId: superAdmin.id, action: 'workflow.saved', entityType: 'WorkflowTemplate', entityId: template.id, meta: { version: 1 }, createdAt: ago(30) } });
  await prisma.auditLog.create({ data: { actorId: admin.id, action: 'project.member_added', entityType: 'Project', entityId: aurora.id, meta: { userId: dev.id, role: 'DEVELOPER' }, createdAt: ago(16) } });

  console.log(`✅ Seed complete — ${await prisma.project.count()} projects, ${await prisma.user.count()} users.`);
  console.log(`   Sign in with any of these (password: ${PASSWORD}):`);
  console.log('   superadmin@welco.dev · admin@welco.dev · pm@welco.dev · dev@welco.dev · client@welco.dev');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
