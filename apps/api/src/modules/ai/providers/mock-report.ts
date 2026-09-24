import {
  allQuestions,
  formatAnswer,
  isEmptyValue,
  tr,
  visibleQuestions,
  visibleSteps,
  type AnswerMap,
  type WorkflowDefinition,
} from '@welco/shared';

/**
 * Offline (no API key) engineering report and ticket plan. Same section order as the live prompt so
 * the UI, history and table of contents behave identically in demo and live mode.
 */

export interface ReportFacts {
  code: string;
  title: string;
  status: string;
  priority: string;
  projectType: string | null;
  progress: number;
  dueDate: string | null;
  client: { name: string; company: string; industry: string; country: string; website: string };
  team: { name: string; role: string; title: string | null }[];
}

export interface PlannedTask {
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  stepKey: string | null;
  estimateHours: number | null;
}

/** Steps that describe the client/business rather than deliverables. */
const INFO_ONLY_STEPS = new Set(['project_type', 'business', 'timeline_budget', 'additional']);

type Bilingual = { en: string[]; ar: string[] };

const STACK_BY_TYPE: Record<string, Bilingual> = {
  ecommerce: {
    en: [
      'Storefront: React/Next.js (server rendering for SEO) on a headless commerce API',
      'Backend: Node.js + PostgreSQL, Redis for cart/session cache',
      'Payments: hosted gateway, so PCI-DSS scope stays with the provider',
      'Search & media: managed search and a CDN-backed image pipeline',
    ],
    ar: [
      'واجهة المتجر: React/Next.js مع تصيير من الخادم لتحسين SEO فوق واجهة تجارة إلكترونية',
      'الخلفية: Node.js + PostgreSQL مع Redis لذاكرة السلة والجلسات',
      'المدفوعات: بوابة دفع مستضافة ليبقى نطاق PCI-DSS لدى المزوّد',
      'البحث والوسائط: بحث مُدار وخط معالجة صور عبر CDN',
    ],
  },
  saas: {
    en: [
      'Frontend: React SPA with a shared design system',
      'Backend: Node.js/TypeScript API with multi-tenant data isolation',
      'Data: PostgreSQL and a background job queue for billing and e-mails',
      'Auth: e-mail login, SSO-ready, role-based access control',
    ],
    ar: [
      'الواجهة: تطبيق React مع نظام تصميم موحّد',
      'الخلفية: واجهة Node.js/TypeScript مع عزل بيانات متعدد المستأجرين',
      'البيانات: PostgreSQL وطابور مهام خلفية للفوترة والبريد',
      'المصادقة: دخول بالبريد وجاهزية SSO وصلاحيات حسب الدور',
    ],
  },
  mobile_app: {
    en: [
      'Client: cross-platform (React Native / Flutter) unless native features demand otherwise',
      'Backend: REST/GraphQL API plus a push-notification service',
      'Release: store-ready CI/CD with crash and analytics reporting',
    ],
    ar: [
      'العميل: تطبيق متعدد المنصات (React Native / Flutter) ما لم تتطلب الميزات تطويراً أصلياً',
      'الخلفية: واجهة REST/GraphQL وخدمة إشعارات فورية',
      'الإصدار: CI/CD جاهز للمتاجر مع تقارير الأعطال والتحليلات',
    ],
  },
  booking: {
    en: [
      'Availability engine with time-zone aware slots and conflict checks',
      'Backend: Node.js + PostgreSQL, reminders through an e-mail/SMS queue',
      'Frontend: responsive booking flow with calendar integration',
    ],
    ar: [
      'محرك توافر المواعيد يراعي المناطق الزمنية ويمنع التعارض',
      'الخلفية: Node.js + PostgreSQL وتذكيرات عبر طابور البريد/الرسائل',
      'الواجهة: مسار حجز متجاوب مع تكامل التقويم',
    ],
  },
};

const DEFAULT_STACK: Bilingual = {
  en: [
    'Frontend: React + TypeScript, responsive and accessible (WCAG AA)',
    'Backend: Node.js/TypeScript API with validation and structured logging',
    'Data: PostgreSQL (SQLite is enough for a small MVP) with automated backups',
    'Delivery: CI/CD with preview environments',
  ],
  ar: [
    'الواجهة: React + TypeScript متجاوبة ومتوافقة مع معايير الوصول',
    'الخلفية: واجهة Node.js/TypeScript مع تحقق من المدخلات وسجلات منظمة',
    'البيانات: PostgreSQL (تكفي SQLite لنسخة أولية صغيرة) مع نسخ احتياطي تلقائي',
    'التسليم: CI/CD مع بيئات معاينة',
  ],
};

export function answeredRows(def: WorkflowDefinition, answers: AnswerMap, files: Map<string, string>, locale: string) {
  return visibleSteps(def, answers).map((step) => ({
    step,
    rows: visibleQuestions(step, answers)
      .filter((q) => !isEmptyValue(answers[q.key]))
      .map((q) => {
        const value = answers[q.key];
        const shown =
          q.type === 'file'
            ? (Array.isArray(value) ? value : []).map((id) => files.get(String(id)) ?? 'file')
            : q.type === 'country' && typeof value === 'string'
              ? [new Intl.DisplayNames([locale], { type: 'region' }).of(value) ?? value]
              : formatAnswer(q, value, locale);
        return { q, shown };
      }),
  }));
}

export function mockTechnicalReport(input: {
  facts: ReportFacts;
  def: WorkflowDefinition;
  answers: AnswerMap;
  files: Map<string, string>;
  locale: string;
}) {
  const ar = input.locale === 'ar';
  const L = (en: string, a: string) => (ar ? a : en);
  const sep = ar ? '، ' : ', ';
  const { facts, def, answers } = input;
  const groups = answeredRows(def, answers, input.files, input.locale);
  const flat = groups.flatMap((g) => g.rows);

  const typeQ = allQuestions(def).find((q) => q.key === 'project_type');
  const typeLabel = facts.projectType && typeQ ? formatAnswer(typeQ, facts.projectType, input.locale)[0] : facts.projectType;
  const featureListCount = allQuestions(def).filter((q) => q.type === 'feature_checklist').length;
  const featureCount = flat.filter((r) => r.q.type === 'feature_checklist').reduce((n, r) => n + r.shown.length, 0);

  const visible = visibleSteps(def, answers).flatMap((s) => visibleQuestions(s, answers));
  const missing = visible.filter((q) => q.required && isEmptyValue(answers[q.key]));
  const optionalGaps = visible.filter((q) => !q.required && isEmptyValue(answers[q.key]));

  const stack = STACK_BY_TYPE[facts.projectType ?? ''] ?? DEFAULT_STACK;
  const integrations = flat.filter((r) => /integrat|payment|shipping|crm|analytics|social/i.test(r.q.key));
  const fileRows = flat.filter((r) => r.q.type === 'file');
  const n = (v: number) => String(v).padStart(2, '0');
  const notSpecified = L('Not specified', 'غير محدد');
  let fr = 0;

  const lines: string[] = [
    `# ${L('Technical report', 'تقرير تقني')} — ${facts.title}`,
    '',
    `> ${facts.code} · ${typeLabel ?? L('Type not specified', 'النوع غير محدد')} · ${L('Status', 'الحالة')}: ${facts.status} · ${L('Priority', 'الأولوية')}: ${facts.priority}`,
    '',
    `_${L(
      'Generated offline from the client answers (demo mode). Connect Gemini for a deeper architectural analysis.',
      'أُنشئ دون اتصال اعتماداً على إجابات العميل (وضع العرض). اربط Gemini للحصول على تحليل معماري أعمق.',
    )}_`,
    '',
    `## ${L('1. Executive summary', '1. الملخص التنفيذي')}`,
    L(
      `${facts.client.company || facts.client.name} requested a **${typeLabel ?? 'digital product'}** named “${facts.title}”. The client completed ${facts.progress}% of the discovery journey and selected **${featureCount} feature(s)** across ${featureListCount} feature list(s). ${missing.length ? `${missing.length} required answer(s) are still missing (see Open questions).` : 'All required answers are provided.'}`,
      `طلب ${facts.client.company || facts.client.name} منتجاً رقمياً من نوع **${typeLabel ?? 'غير محدد'}** باسم «${facts.title}». أكمل العميل ${facts.progress}٪ من رحلة الاكتشاف واختار **${featureCount} ميزة** ضمن ${featureListCount} قائمة ميزات. ${missing.length ? `ما زالت ${missing.length} إجابة مطلوبة ناقصة (راجع الأسئلة المفتوحة).` : 'جميع الإجابات المطلوبة مكتملة.'}`,
    ),
    '',
    `## ${L('2. Project & client context', '2. سياق المشروع والعميل')}`,
    `- **${L('Client', 'العميل')}:** ${facts.client.name}${facts.client.company ? ` — ${facts.client.company}` : ''}`,
    `- **${L('Industry', 'المجال')}:** ${facts.client.industry || notSpecified}`,
    `- **${L('Country', 'الدولة')}:** ${facts.client.country || notSpecified}`,
    `- **${L('Website', 'الموقع')}:** ${facts.client.website || notSpecified}`,
    `- **${L('Target delivery', 'موعد التسليم المستهدف')}:** ${facts.dueDate ? facts.dueDate.slice(0, 10) : L('Not set', 'غير محدد')}`,
    `- **${L('Delivery team', 'فريق التنفيذ')}:** ${
      facts.team.length ? facts.team.map((m) => `${m.name} (${m.title ?? m.role})`).join(sep) : L('Not assigned yet', 'لم يُسند بعد')
    }`,
    '',
    `## ${L('3. Functional requirements', '3. المتطلبات الوظيفية')}`,
  ];

  for (const g of groups) {
    const rows = g.rows.filter((r) => r.q.type !== 'file');
    if (!rows.length) continue;
    lines.push(`### ${tr(g.step, 'title', input.locale)}`);
    for (const r of rows) {
      if (r.q.type === 'feature_checklist') {
        for (const feature of r.shown) lines.push(`- **FR-${n(++fr)}** ${feature} — _${L('Must have', 'أساسي')}_`);
      } else {
        lines.push(`- **${tr(r.q, 'label', input.locale)}:** ${r.shown.join(sep)}`);
      }
    }
    lines.push('');
  }

  lines.push(
    `## ${L('4. Non-functional requirements', '4. المتطلبات غير الوظيفية')}`,
    `- ${L('Responsive on mobile, tablet and desktop; accessibility target WCAG 2.1 AA', 'متجاوب على الجوال والتابلت والحاسوب مع هدف وصول WCAG 2.1 AA')}`,
    `- ${L('Page load under 3 s on a mid-range mobile connection; images optimised and lazy-loaded', 'تحميل الصفحة أقل من 3 ثوانٍ على اتصال جوال متوسط مع صور محسّنة وتحميل كسول')}`,
    `- ${L('Secure by default: HTTPS, input validation, role-based access, audit trail for admin actions', 'آمن افتراضياً: HTTPS وتحقق من المدخلات وصلاحيات حسب الدور وسجل تدقيق لإجراءات الإدارة')}`,
    `- ${L('Backups and monitoring with alerting on errors and downtime', 'نسخ احتياطي ومراقبة مع تنبيه عند الأعطال والتوقف')}`,
    '',
    `## ${L('5. Recommended architecture & stack', '5. المعمارية والتقنيات المقترحة')}`,
    `_${L(
      'AI recommendation, not a client requirement. Validate before committing.',
      'توصية من المساعد الذكي وليست متطلباً من العميل. يُرجى التحقق منها قبل الاعتماد.',
    )}_`,
    ...(ar ? stack.ar : stack.en).map((x) => `- ${x}`),
    '',
    `## ${L('6. Integrations & assets', '6. التكاملات والملفات')}`,
    ...(integrations.length
      ? integrations.map((r) => `- **${tr(r.q, 'label', input.locale)}:** ${r.shown.join(sep)}`)
      : [`- ${L('No third-party integrations specified.', 'لم تُحدَّد تكاملات خارجية.')}`]),
    ...(fileRows.length
      ? fileRows.map((r) => `- **${tr(r.q, 'label', input.locale)}:** ${r.shown.join(sep)}`)
      : [`- ${L('No files uploaded yet.', 'لم تُرفع ملفات بعد.')}`]),
    '',
    `## ${L('7. Delivery plan', '7. خطة التنفيذ')}`,
    `1. **${L('Kickoff & architecture', 'الانطلاق والمعمارية')}** — ${L('repo, environments, CI/CD, data model', 'المستودع والبيئات وCI/CD ونموذج البيانات')} (~16h)`,
    `2. **${L('Design system & key screens', 'نظام التصميم والشاشات الرئيسية')}** — ${L('approved by the client', 'يعتمدها العميل')} (~${24 + featureCount * 2}h)`,
    `3. **${L('Core features', 'الميزات الأساسية')}** — ${L(`${featureCount} feature(s) in priority order`, `${featureCount} ميزة بترتيب الأولوية`)} (~${featureCount * 8}h)`,
    `4. **${L('QA, UAT & fixes', 'الاختبار وقبول العميل والإصلاحات')}** (~${Math.max(16, featureCount * 2)}h)`,
    `5. **${L('Deployment & handover', 'النشر والتسليم')}** (~12h)`,
    '',
    `## ${L('8. Risks & assumptions', '8. المخاطر والافتراضات')}`,
    `- ${
      missing.length
        ? L(`Scope risk: ${missing.length} required answer(s) missing.`, `خطر النطاق: ${missing.length} إجابة مطلوبة ناقصة.`)
        : L('Scope is well defined by the client answers.', 'النطاق واضح من إجابات العميل.')
    }`,
    `- ${L('Assumption: the client provides content, brand assets and timely feedback.', 'افتراض: يوفّر العميل المحتوى وملفات الهوية وملاحظات في الوقت المناسب.')}`,
    `- ${L('Assumption: third-party accounts (payments, e-mail, hosting) are opened by the client.', 'افتراض: يفتح العميل حسابات الأطراف الثالثة (الدفع والبريد والاستضافة).')}`,
    '',
    `## ${L('9. Open questions', '9. الأسئلة المفتوحة')}`,
    ...(missing.length
      ? missing.map((q) => `- **${L('Required', 'مطلوب')}:** ${tr(q, 'label', input.locale)}`)
      : [`- ${L('No required answers are missing.', 'لا توجد إجابات مطلوبة ناقصة.')}`]),
    ...(optionalGaps.length ? [`- ${L(`${optionalGaps.length} optional question(s) unanswered.`, `${optionalGaps.length} سؤال اختياري بلا إجابة.`)}`] : []),
    '',
    `## ${L('10. Definition of done', '10. تعريف الاكتمال')}`,
    `- ${L('Every requirement above is implemented, reviewed and demonstrated on a preview link.', 'كل متطلب أعلاه منفّذ ومراجَع ومعروض على رابط معاينة.')}`,
    `- ${L('Client acceptance is recorded in the project conversation.', 'موافقة العميل مسجّلة في محادثة المشروع.')}`,
  );
  return lines.join('\n');
}

/** Deterministic ticket breakdown of the client requirements (used when no API key is configured). */
export function mockTaskPlan(input: { def: WorkflowDefinition; answers: AnswerMap; files: Map<string, string>; locale: string }): PlannedTask[] {
  const L = (en: string, a: string) => (input.locale === 'ar' ? a : en);
  const tasks: PlannedTask[] = [
    {
      title: L('Technical kickoff & architecture setup', 'الانطلاق التقني وإعداد المعمارية'),
      description: L(
        'Create the repository, environments, CI/CD pipeline and data model based on the approved requirements.',
        'إنشاء المستودع والبيئات وخط CI/CD ونموذج البيانات بناءً على المتطلبات المعتمدة.',
      ),
      priority: 'HIGH',
      stepKey: null,
      estimateHours: 16,
    },
  ];

  for (const g of answeredRows(input.def, input.answers, input.files, input.locale)) {
    if (INFO_ONLY_STEPS.has(g.step.key)) continue;
    const stepTitle = tr(g.step, 'title', input.locale);
    const features = g.rows.filter((r) => r.q.type === 'feature_checklist');
    for (const r of features) {
      for (const feature of r.shown) {
        tasks.push({
          title: `${L('Implement', 'تنفيذ')}: ${feature}`,
          description: `${L('Requirement group', 'مجموعة المتطلبات')}: ${stepTitle}\n${L('Feature selected by the client', 'ميزة اختارها العميل')}: ${feature}`,
          priority: 'MEDIUM',
          stepKey: g.step.key,
          estimateHours: 8,
        });
      }
    }
    const details = g.rows.filter((r) => r.q.type !== 'feature_checklist' && r.q.type !== 'file');
    if (!features.length && details.length) {
      tasks.push({
        title: `${L('Implement', 'تنفيذ')}: ${stepTitle}`,
        description: details.map((r) => `- ${tr(r.q, 'label', input.locale)}: ${r.shown.join(', ')}`.slice(0, 400)).join('\n'),
        priority: 'MEDIUM',
        stepKey: g.step.key,
        estimateHours: Math.max(4, details.length * 2),
      });
    }
  }

  tasks.push(
    {
      title: L('QA, cross-device testing & client UAT', 'الاختبار على الأجهزة وقبول العميل'),
      description: L(
        'Test every ticket above on mobile and desktop, fix defects and collect the client acceptance.',
        'اختبار كل التذاكر أعلاه على الجوال والحاسوب وإصلاح العيوب والحصول على موافقة العميل.',
      ),
      priority: 'MEDIUM',
      stepKey: null,
      estimateHours: 16,
    },
    {
      title: L('Deployment & handover', 'النشر والتسليم'),
      description: L(
        'Deploy to production, configure monitoring and backups, hand over the documentation.',
        'النشر على الإنتاج وإعداد المراقبة والنسخ الاحتياطي وتسليم التوثيق.',
      ),
      priority: 'MEDIUM',
      stepKey: null,
      estimateHours: 12,
    },
  );
  return tasks.slice(0, 60);
}
