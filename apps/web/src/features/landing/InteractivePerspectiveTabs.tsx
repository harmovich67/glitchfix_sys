import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  Briefcase,
  Code2,
  CheckCircle2,
  Clock,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldAlert,
  GitBranch,
  Terminal,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';

type PerspectiveKey = 'client' | 'pm' | 'developer';

export function InteractivePerspectiveTabs() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [activeTab, setActiveTab] = useState<PerspectiveKey>('client');

  const PERSPECTIVES = [
    {
      id: 'client' as const,
      icon: UserCheck,
      title: { ar: 'تجربة العميل (صاحب المشروع)', en: 'The Client Experience' },
      short: { ar: 'العميل', en: 'Client' },
      tagline: {
        ar: 'رحلة مرئية ممتعة وسلسة خالية تماماً من المصطلحات التقنية المعقدة',
        en: 'A guided, delightful visual journey with zero engineering jargon',
      },
      benefits: [
        { ar: 'اختيار الألوان والأسلوب والميزات عبر بطاقات تفاعلية أنيقة', en: 'Visual selection of styles, features and palettes' },
        { ar: 'مستشار ذكي بجانبه يشرح أي خيار ويقترح أفضل الممارسات', en: 'Live AI consultant clarifying every question in plain language' },
        { ar: 'وضوح تام حول ما سيحصل عليه بدون مفاجآت في التسليم', en: 'Total transparency on deliverables and zero scope surprises' },
      ],
      previewCard: {
        badge: { ar: 'الخطوة 3: الهوية والمظهر', en: 'Step 3: Identity & Aesthetics' },
        headline: { ar: 'ما هو الأسلوب الأقرب لشخصية علامتك؟', en: 'Which visual style resonates with your brand?' },
        mockItems: [
          { title: { ar: 'عصري نيو-تك', en: 'Modern Clean' }, tag: '88% اختاروا هذا', active: true },
          { title: { ar: 'فخم وراقي', en: 'Imperial Luxury' }, tag: 'منتجات فاخرة', active: false },
          { title: { ar: 'داكن جذاب', en: 'Cyber Dark' }, tag: 'تطبيقات تقنية', active: false },
        ],
      },
    },
    {
      id: 'pm' as const,
      icon: Briefcase,
      title: { ar: 'لوحة تحكم مدير المشروع (PM & Agency)', en: 'Project Manager Control Plane' },
      short: { ar: 'مدير المشروع', en: 'Project Manager' },
      tagline: {
        ar: 'تحكم شامل بالمراحل، تسعير دقيق، منع تجاوز النطاق (Scope Creep)',
        en: 'Unified control over requirements, pricing estimates, and change logs',
      },
      benefits: [
        { ar: 'استلام متطلبات مفصلة ومصنفة تلقائياً بدلاً من مكالمات طويلة', en: 'Receive structured requirements instead of messy email threads' },
        { ar: 'إشراف كامل على محادثات المطورين والعميل لضمان الاتساق', en: 'Moderated communication channels between clients and devs' },
        { ar: 'تحويل المتطلبات إلى مهام وجداول زمنية بنقرة واحدة', en: 'Convert briefs into prioritized kanban tasks in one click' },
      ],
      previewCard: {
        badge: { ar: 'لوحة إدارة المشروع', en: 'PM Governance Board' },
        headline: { ar: 'حالة المتطلبات: متجر أورورا للعطور', en: 'Dossier Status: Aurora Boutique' },
        mockItems: [
          { title: { ar: 'المتطلبات المكتملة', en: 'Approved Scope' }, tag: '100% Locked', active: true },
          { title: { ar: 'الميزانية والوقت', en: 'Budget & Time' }, tag: '3.5 Weeks est.', active: false },
          { title: { ar: 'إشراف الرسائل', en: 'Thread Moderation' }, tag: '0 Pending', active: false },
        ],
      },
    },
    {
      id: 'developer' as const,
      icon: Code2,
      title: { ar: 'جاهز للمطورين (Engineering Ready)', en: 'Developer & Tech Specs' },
      short: { ar: 'فريق البرمجة', en: 'Engineers' },
      tagline: {
        ar: 'مواصفات برمجية واضحة 100% مع User Stories ومخططات قاعدة البيانات',
        en: 'Unambiguous technical PRD, database schema, and testable user stories',
      },
      benefits: [
        { ar: 'معايير قبول دقيقة (Acceptance Criteria) لكل ميزة دون تخمين', en: 'Crystal-clear Acceptance Criteria for every user story' },
        { ar: 'مخطط العلاقات وجداول البيانات المقترحة مسبقاً', en: 'Pre-architected ERD and data model blueprints' },
        { ar: 'لا مزيد من التعديلات العشوائية في منتصف التطوير', en: 'Zero mid-sprint requirement ambiguity or wasted sprints' },
      ],
      previewCard: {
        badge: { ar: 'وثيقة المواصفات البرمجية (Tech PRD)', en: 'Engineering SRS Spec' },
        headline: { ar: 'Module: Auth & Multi-tenant Database', en: 'Module: Auth & Multi-tenant Database' },
        mockItems: [
          { title: { ar: 'POST /api/v1/checkout/session', en: 'POST /api/v1/checkout/session' }, tag: '200 OK', active: true },
          { title: { ar: 'Zod DTO Validation Schema', en: 'Zod DTO Validation Schema' }, tag: 'Strict Typed', active: false },
          { title: { ar: 'Webhook: payment.succeeded', en: 'Webhook: payment.succeeded' }, tag: 'Idempotent', active: false },
        ],
      },
    },
  ];

  const current = PERSPECTIVES.find((p) => p.id === activeTab) ?? PERSPECTIVES[0];
  const Icon = current.icon;

  return (
    <div className="relative mx-auto max-w-6xl">
      <div className="text-center space-y-2 mb-10">
        <h3 className="text-3xl font-bold sm:text-4xl text-fg">
          {isAr ? 'منصة واحدة تجمع كل أطراف المشروع' : 'One Platform, Three Tailored Perspectives'}
        </h3>
        <p className="text-muted text-sm sm:text-base max-w-2xl mx-auto">
          {isAr
            ? 'سواء كنت عميلاً يبحث عن السهولة، أو مديراً يريد التنظيم، أو مطوراً يريد كوداً نقياً بدون غموض'
            : 'Whether you are a founder, project manager, or developer — Welco delivers perfection'}
        </p>
      </div>

      {/* Tabs Switcher */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-2xl bg-surface-2 p-1.5 ring-1 ring-border shadow-sm">
          {PERSPECTIVES.map((tab) => {
            const active = tab.id === activeTab;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  active ? 'bg-surface text-fg shadow-sm ring-1 ring-border' : 'text-muted hover:text-fg'
                }`}
              >
                <TabIcon className={`size-4 ${active ? 'text-brand' : 'text-muted'}`} />
                <span>{isAr ? tab.short.ar : tab.short.en}</span>
                {active && (
                  <motion.div
                    layoutId="active-perspective-tab"
                    className="absolute inset-0 rounded-xl bg-brand/5 ring-1 ring-brand/30 -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Perspective Card Container */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="overflow-hidden rounded-3xl border border-border bg-surface shadow-xl"
      >
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Details & Benefits */}
          <div className="p-8 sm:p-10 space-y-6 border-b lg:border-b-0 lg:border-e border-border">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-brand text-xs font-bold uppercase tracking-wider">
                <Icon className="size-4" />
                <span>{isAr ? current.title.ar : current.title.en}</span>
              </div>
              <h4 className="text-xl sm:text-2xl font-bold text-fg">
                {isAr ? current.tagline.ar : current.tagline.en}
              </h4>
            </div>

            <div className="space-y-3.5 pt-2">
              {current.benefits.map((benefit, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mt-0.5">
                    <CheckCircle2 className="size-4" />
                  </span>
                  <p className="text-xs sm:text-sm text-fg-2 leading-relaxed">
                    {isAr ? benefit.ar : benefit.en}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border flex items-center gap-3 text-xs text-muted">
              <span className="flex size-2 rounded-full bg-emerald-500" />
              <span>
                {isAr
                  ? 'مُعتمد ومُجرب عبر عشرات المشاريع الناجحة'
                  : 'Validated across dozens of enterprise projects'}
              </span>
            </div>
          </div>

          {/* Perspective Interactive Simulation Mock */}
          <div className="bg-surface-2/40 p-8 sm:p-10 flex flex-col justify-center">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                  {isAr ? current.previewCard.badge.ar : current.previewCard.badge.en}
                </span>
                <span className="text-xs font-mono text-muted">LIVE SYNC</span>
              </div>

              <h5 className="text-sm font-bold text-fg">
                {isAr ? current.previewCard.headline.ar : current.previewCard.headline.en}
              </h5>

              <div className="space-y-2">
                {current.previewCard.mockItems.map((item, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-xl p-3 text-xs font-medium transition-all ${
                      item.active
                        ? 'bg-brand/10 border-2 border-brand/80 text-fg font-semibold'
                        : 'bg-surface-2/70 border border-border text-muted'
                    }`}
                  >
                    <span>{isAr ? item.title.ar : item.title.en}</span>
                    <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] font-mono text-fg shadow-2xs">
                      {item.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
