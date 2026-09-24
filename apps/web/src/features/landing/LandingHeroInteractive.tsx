import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router';
import {
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe2,
  CreditCard,
  MessageSquare,
  Bell,
  BarChart3,
  Smartphone,
  ShoppingBag,
  CalendarCheck,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';

interface ProjectPreset {
  id: string;
  name: { ar: string; en: string };
  icon: typeof ShoppingBag;
  accent: string;
  badge: { ar: string; en: string };
  defaultFeatures: string[];
  baseWeeks: number;
  allFeatures: {
    id: string;
    label: { ar: string; en: string };
    icon: typeof CreditCard;
    days: number;
  }[];
}

const PRESETS: ProjectPreset[] = [
  {
    id: 'ecommerce',
    name: { ar: 'متجر إلكتروني احترافي', en: 'Modern E-Commerce' },
    icon: ShoppingBag,
    accent: 'from-amber-500 to-rose-500',
    badge: { ar: 'الأكثر طلباً', en: 'Most Popular' },
    defaultFeatures: ['payments', 'ai_search', 'inventory', 'multilang'],
    baseWeeks: 2,
    allFeatures: [
      { id: 'payments', label: { ar: 'بوابات دفع (Apple Pay / Mada)', en: 'Apple Pay & Mada' }, icon: CreditCard, days: 3 },
      { id: 'ai_search', label: { ar: 'بحث ذكي وفلاتر ديناميكية', en: 'AI Search & Filters' }, icon: Sparkles, days: 4 },
      { id: 'inventory', label: { ar: 'إدارة المخزون والتنبيهات', en: 'Live Inventory & Alerts' }, icon: Layers, days: 4 },
      { id: 'multilang', label: { ar: 'متعدد اللغات (عربي / إنجليزي)', en: 'Bilingual (AR / EN)' }, icon: Globe2, days: 2 },
      { id: 'whatsapp', label: { ar: 'تتبع الطلبات عبر واتساب', en: 'WhatsApp Order Tracking' }, icon: MessageSquare, days: 3 },
      { id: 'analytics', label: { ar: 'لوحة تحليلات المبيعات', en: 'Sales Analytics Dashboard' }, icon: BarChart3, days: 3 },
    ],
  },
  {
    id: 'mobile_app',
    name: { ar: 'تطبيق جوال iOS و Android', en: 'iOS & Android App' },
    icon: Smartphone,
    accent: 'from-blue-500 to-indigo-600',
    badge: { ar: 'نمو سريع', en: 'Fast Growth' },
    defaultFeatures: ['auth', 'push_notes', 'geolocation', 'offline'],
    baseWeeks: 3,
    allFeatures: [
      { id: 'auth', label: { ar: 'تسجيل دخول اجتماعي وموثوق', en: 'Social Auth & FaceID' }, icon: ShieldCheck, days: 3 },
      { id: 'push_notes', label: { ar: 'إشعارات لحظية مخصصة', en: 'Smart Push Notifications' }, icon: Bell, days: 3 },
      { id: 'geolocation', label: { ar: 'تحديد الموقع والخرائط الحية', en: 'Live Maps & GPS' }, icon: Globe2, days: 5 },
      { id: 'offline', label: { ar: 'دعم العمل بدون إنترنت', en: 'Offline Sync Support' }, icon: Zap, days: 4 },
      { id: 'payments', label: { ar: 'شراء داخل التطبيق وسداد', en: 'In-App Purchases' }, icon: CreditCard, days: 4 },
      { id: 'chat', label: { ar: 'محادثة دعم فورية مدمجة', en: 'Real-time In-App Chat' }, icon: MessageSquare, days: 4 },
    ],
  },
  {
    id: 'saas',
    name: { ar: 'منصة برمجية SaaS', en: 'B2B SaaS Platform' },
    icon: Cpu,
    accent: 'from-violet-500 to-fuchsia-600',
    badge: { ar: 'مؤسسات وشركات', en: 'Enterprise Ready' },
    defaultFeatures: ['teams', 'subscriptions', 'api_access', 'audit'],
    baseWeeks: 4,
    allFeatures: [
      { id: 'teams', label: { ar: 'إدارة فرق العمل والصلاحيات', en: 'Multi-tenant Workspaces' }, icon: Layers, days: 5 },
      { id: 'subscriptions', label: { ar: 'اشتراكات شهرية وفواتير', en: 'Recurring Billing (Stripe)' }, icon: CreditCard, days: 4 },
      { id: 'api_access', label: { ar: 'واجهة API ومفاتيح الويب', en: 'REST & Webhooks API' }, icon: Zap, days: 4 },
      { id: 'audit', label: { ar: 'سجل تدقيق الأمان والامتثال', en: 'Audit Log & Compliance' }, icon: ShieldCheck, days: 3 },
      { id: 'analytics', label: { ar: 'تقارير الأداء ومقاييس النمو', en: 'Growth Metrics & BI' }, icon: BarChart3, days: 4 },
      { id: 'ai_assistant', label: { ar: 'وكيل ذكاء اصطناعي مساعد', en: 'Embedded AI Co-pilot' }, icon: Sparkles, days: 5 },
    ],
  },
  {
    id: 'booking',
    name: { ar: 'نظام حجوزات وجدولة', en: 'Booking & Scheduling' },
    icon: CalendarCheck,
    accent: 'from-emerald-500 to-teal-600',
    badge: { ar: 'أتمتة كاملة', en: 'Fully Automated' },
    defaultFeatures: ['calendar', 'reminders', 'deposits', 'staff'],
    baseWeeks: 2,
    allFeatures: [
      { id: 'calendar', label: { ar: 'تقويم ديناميكي للمواعيد', en: 'Real-time Calendar Sync' }, icon: CalendarCheck, days: 4 },
      { id: 'reminders', label: { ar: 'تذكير آلي بالرسائل القصيرة', en: 'Automated SMS Reminders' }, icon: Bell, days: 2 },
      { id: 'deposits', label: { ar: 'عربون وتأكيد الدفع المسبق', en: 'Deposit & Pre-payment' }, icon: CreditCard, days: 3 },
      { id: 'staff', label: { ar: 'جدول الموظفين والغرف', en: 'Staff & Resource Allocation' }, icon: Layers, days: 4 },
      { id: 'multilang', label: { ar: 'واجهة متعددة اللغات', en: 'Multilingual Booking Flow' }, icon: Globe2, days: 2 },
      { id: 'analytics', label: { ar: 'إحصائيات الإشغال والإلغاء', en: 'Occupancy & Revenue BI' }, icon: BarChart3, days: 3 },
    ],
  },
];

export function LandingHeroInteractive() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [activePresetId, setActivePresetId] = useState('ecommerce');
  const currentPreset = PRESETS.find((p) => p.id === activePresetId) ?? PRESETS[0];

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(currentPreset.defaultFeatures);
  const [activeStepTab, setActiveStepTab] = useState<'features' | 'style' | 'summary'>('features');
  const [selectedStyle, setSelectedStyle] = useState<'modern' | 'luxury' | 'dark' | 'minimal'>('modern');

  const handleSelectPreset = (preset: ProjectPreset) => {
    setActivePresetId(preset.id);
    setSelectedFeatures(preset.defaultFeatures);
  };

  const toggleFeature = (featureId: string) => {
    setSelectedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId],
    );
  };

  // Dynamic calculations
  const totalFeatureDays = currentPreset.allFeatures
    .filter((f) => selectedFeatures.includes(f.id))
    .reduce((acc, f) => acc + f.days, 0);

  const estimatedWeeks = Math.max(2, Math.round(currentPreset.baseWeeks + totalFeatureDays / 5));
  const readinessScore = Math.min(100, 50 + selectedFeatures.length * 8 + (selectedStyle ? 10 : 0));

  return (
    <div className="relative mx-auto mt-12 w-full max-w-5xl">
      {/* Decorative ambient blur glows */}
      <div className="absolute -inset-x-6 -top-10 -bottom-10 -z-10 rounded-[48px] bg-gradient-to-tr from-brand/20 via-fuchsia-500/15 to-accent/20 blur-3xl" />
      <div className="absolute -start-10 top-1/3 -z-10 size-72 rounded-full bg-brand/15 blur-2xl animate-pulse" />
      <div className="absolute -end-10 bottom-10 -z-10 size-72 rounded-full bg-accent/15 blur-2xl" />

      {/* Main Interactive Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden rounded-3xl bg-surface/90 shadow-2xl ring-1 ring-border/80 backdrop-blur-xl"
      >
        {/* Top Control Bar / Window Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-surface-2/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-rose-400/90 shadow-sm" />
            <span className="size-3 rounded-full bg-amber-400/90 shadow-sm" />
            <span className="size-3 rounded-full bg-emerald-400/90 shadow-sm" />
            <span className="ms-2 hidden text-xs font-mono font-medium text-muted sm:inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
              welco.app/interactive-sandbox
            </span>
          </div>

          {/* Interactive Preset Chips */}
          <div className="no-scrollbar flex w-full items-center gap-1.5 overflow-x-auto py-1 touch-pan-x sm:w-auto">
            {PRESETS.map((p) => {
              const active = p.id === activePresetId;
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`group relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    active
                      ? 'bg-surface text-fg shadow-sm ring-1 ring-border font-semibold'
                      : 'text-muted hover:text-fg hover:bg-surface/50'
                  }`}
                >
                  <Icon className={`size-3.5 ${active ? 'text-brand' : 'text-muted group-hover:text-fg'}`} />
                  <span>{isAr ? p.name.ar : p.name.en}</span>
                  {active && (
                    <motion.span
                      layoutId="preset-pill-indicator"
                      className="absolute inset-0 rounded-xl bg-brand/10 ring-1 ring-brand/30 -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Workspace Body: 2 Columns */}
        <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
          {/* Left / Main Workspace Interactive Area */}
          <div className="p-6 sm:p-8 border-b lg:border-b-0 lg:border-e border-border">
            {/* Step navigation tabs */}
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <SlidersHorizontal className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-fg">
                    {isAr ? 'مُحاكي استكشاف المتطلبات التفاعلي' : 'Interactive Discovery Sandbox'}
                  </h3>
                  <p className="text-xs text-muted">
                    {isAr ? 'جرّب تخصيص مشروعك وشاهد النتائج تتحدث لحظياً' : 'Customize your brief and watch specs update live'}
                  </p>
                </div>
              </div>

              {/* Sub-tabs inside playground */}
              <div className="flex rounded-lg bg-surface-2 p-1 text-xs">
                {(
                  [
                    { key: 'features', label: isAr ? 'الميزات' : 'Features' },
                    { key: 'style', label: isAr ? 'الهوية' : 'Style' },
                    { key: 'summary', label: isAr ? 'المواصفات' : 'Spec' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveStepTab(tab.key)}
                    className={`rounded-md px-3 py-1 font-medium transition-all ${
                      activeStepTab === tab.key ? 'bg-surface text-brand shadow-sm font-semibold' : 'text-muted hover:text-fg'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Interactive Content based on Tab */}
            <div className="mt-6 min-h-[290px]">
              <AnimatePresence mode="wait">
                {activeStepTab === 'features' && (
                  <motion.div
                    key="features"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                        {isAr ? 'اختر الميزات البرمجية لنطاق العمل:' : 'Select feature scope:'}
                      </span>
                      <span className="text-xs text-brand font-medium">
                        {selectedFeatures.length} {isAr ? 'ميزات محددة' : 'features active'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {currentPreset.allFeatures.map((feat) => {
                        const isSelected = selectedFeatures.includes(feat.id);
                        const Icon = feat.icon;
                        return (
                          <button
                            key={feat.id}
                            type="button"
                            onClick={() => toggleFeature(feat.id)}
                            className={`flex items-center justify-between gap-3 rounded-xl p-3 text-start transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-brand/5 border-2 border-brand shadow-sm text-fg'
                                : 'bg-surface-2/60 border border-border text-muted hover:bg-surface-2 hover:text-fg'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className={`flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                                  isSelected ? 'bg-brand text-white' : 'bg-surface-3 text-muted'
                                }`}
                              >
                                <Icon className="size-4" />
                              </span>
                              <span className="text-xs font-medium truncate">
                                {isAr ? feat.label.ar : feat.label.en}
                              </span>
                            </div>
                            <span
                              className={`flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] transition-all ${
                                isSelected ? 'bg-brand text-white scale-105' : 'border border-border-strong text-transparent'
                              }`}
                            >
                              ✓
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-surface-2/60 p-3 text-xs text-muted">
                      <span className="flex items-center gap-1.5">
                        <Sparkles className="size-3.5 text-amber-500" />
                        {isAr ? 'يمكنك دائماً إضافة ميزات مخصصة في مرحلة الاستكشاف' : 'Custom features can also be added in discovery'}
                      </span>
                      <button
                        onClick={() => setSelectedFeatures(currentPreset.allFeatures.map((f) => f.id))}
                        className="text-brand hover:underline font-medium"
                      >
                        {isAr ? 'تحديد الكل' : 'Select all'}
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeStepTab === 'style' && (
                  <motion.div
                    key="style"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted">
                      {isAr ? 'الاتجاه البصري والواجهة:' : 'Design direction & theme:'}
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      {(
                        [
                          {
                            id: 'modern',
                            name: { ar: 'عصري ناعم (Modern Glow)', en: 'Modern Clean' },
                            colors: ['#5b5bf6', '#06b6d4', '#ffffff'],
                            desc: { ar: 'ألوان مشرقة وتدرجات تقنية سريعة', en: 'Bright indigo & tech gradients' },
                          },
                          {
                            id: 'luxury',
                            name: { ar: 'فخم وراقي (Luxury Gold)', en: 'Luxury Elegance' },
                            colors: ['#1f1a17', '#c9a45c', '#f5efe6'],
                            desc: { ar: 'ذهبي مع عاجي ولمسات سيريف', en: 'Gold accents & editorial serif' },
                          },
                          {
                            id: 'dark',
                            name: { ar: 'داكن متوهج (Cyber Dark)', en: 'Cyber Dark' },
                            colors: ['#0a0a12', '#8b5cf6', '#ec4899'],
                            desc: { ar: 'تباين عالي وتوهج نيون جذاب', en: 'Deep dark with neon accents' },
                          },
                          {
                            id: 'minimal',
                            name: { ar: 'مينيمال أبيض (Pure Minimal)', en: 'Pure Minimal' },
                            colors: ['#000000', '#737373', '#ffffff'],
                            desc: { ar: 'بساطة فائقة وتركيز على القراءة', en: 'Ultra clean monochrome spacing' },
                          },
                        ] as const
                      ).map((st) => {
                        const active = selectedStyle === st.id;
                        return (
                          <button
                            key={st.id}
                            type="button"
                            onClick={() => setSelectedStyle(st.id)}
                            className={`rounded-2xl p-4 text-start transition-all cursor-pointer ${
                              active
                                ? 'bg-surface ring-2 ring-brand shadow-md'
                                : 'bg-surface-2/60 ring-1 ring-border hover:bg-surface-2'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 mb-2">
                              {st.colors.map((c) => (
                                <span
                                  key={c}
                                  className="size-4 rounded-full border border-black/10 shadow-xs"
                                  style={{ backgroundColor: c }}
                                />
                              ))}
                              {active && <span className="ms-auto text-xs text-brand font-bold">✓ {isAr ? 'مختارة' : 'Active'}</span>}
                            </div>
                            <p className="text-xs font-semibold text-fg">{isAr ? st.name.ar : st.name.en}</p>
                            <p className="mt-1 text-[11px] text-muted leading-tight">{isAr ? st.desc.ar : st.desc.en}</p>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {activeStepTab === 'summary' && (
                  <motion.div
                    key="summary"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3"
                  >
                    <div className="rounded-2xl bg-surface-2/80 p-4 ring-1 ring-border space-y-3">
                      <div className="flex items-center justify-between border-b border-border/70 pb-2">
                        <span className="text-xs font-semibold text-fg">
                          {isAr ? 'وثيقة المتطلبات المصغرة (Live PRD)' : 'Generated Mini PRD'}
                        </span>
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600">
                          {isAr ? 'جاهز للتنفيذ' : 'Ready for Dev'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-muted block text-[11px]">{isAr ? 'النوع:' : 'Type:'}</span>
                          <span className="font-semibold text-fg">{isAr ? currentPreset.name.ar : currentPreset.name.en}</span>
                        </div>
                        <div>
                          <span className="text-muted block text-[11px]">{isAr ? 'الأسلوب:' : 'Style:'}</span>
                          <span className="font-semibold text-fg uppercase">{selectedStyle}</span>
                        </div>
                        <div>
                          <span className="text-muted block text-[11px]">{isAr ? 'عدد الميزات:' : 'Scope:'}</span>
                          <span className="font-semibold text-brand">{selectedFeatures.length} {isAr ? 'ميزات أساسية' : 'Core modules'}</span>
                        </div>
                        <div>
                          <span className="text-muted block text-[11px]">{isAr ? 'المدة التقديرية:' : 'Est. Timeline:'}</span>
                          <span className="font-semibold text-emerald-600">{estimatedWeeks} {isAr ? 'أسابيع عمل' : 'Weeks'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-dashed border-border-strong p-3 text-center">
                      <p className="text-xs text-muted">
                        {isAr
                          ? 'عند بدء الرحلة، سيقوم المساعد الذكي بتفكيك هذه الخيارات إلى User Stories وتوصيات معمارية فورية.'
                          : 'Upon starting, Welco AI will convert these choices into complete User Stories and architecture.'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Column: Live Output & CTA */}
          <div className="flex flex-col justify-between bg-surface-2/40 p-6 sm:p-7">
            <div className="space-y-5">
              {/* Readiness Score Ring */}
              <div className="rounded-2xl bg-surface p-4 shadow-sm ring-1 ring-border">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-fg">{isAr ? 'مؤشر اكتمال النطاق' : 'Brief Readiness'}</span>
                  <span className="font-mono text-xs font-bold text-brand">{readinessScore}%</span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-surface-3">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand via-fuchsia-500 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${readinessScore}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted">
                  {readinessScore > 80
                    ? isAr
                      ? '✨ متطلباتك واضحة جداً وجاهزة للتسعير الفوري'
                      : '✨ Clear specs ready for instant quotation'
                    : isAr
                      ? '💡 أضف ميزات إضافية لرفع دقة المواصفات'
                      : '💡 Add more features for precise estimation'}
                </p>
              </div>

              {/* Dynamic Metrics */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl bg-surface p-3 ring-1 ring-border">
                  <span className="text-[10px] text-muted block">{isAr ? 'المدة التقديرية' : 'Estimated Time'}</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-fg">{estimatedWeeks}</span>
                    <span className="text-xs text-muted">{isAr ? 'أسابيع' : 'weeks'}</span>
                  </div>
                </div>

                <div className="rounded-xl bg-surface p-3 ring-1 ring-border">
                  <span className="text-[10px] text-muted block">{isAr ? 'الوضوح للبرمجة' : 'Dev Clarity'}</span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold text-emerald-600">99%</span>
                    <span className="text-[10px] text-emerald-600 font-medium">No drift</span>
                  </div>
                </div>
              </div>

              {/* AI Badge message */}
              <div className="flex items-start gap-2.5 rounded-xl bg-brand-soft/70 p-3 text-xs leading-relaxed text-brand">
                <Sparkles className="size-4 shrink-0 mt-0.5" />
                <span>
                  {isAr
                    ? 'المساعد الذكي جاهز لإكمال التفاصيل الفنية فور تسجيل الدخول.'
                    : 'Welco AI consultant is ready to detail technical specs upon sign up.'}
                </span>
              </div>
            </div>

            {/* Launch CTA */}
            <div className="mt-6 pt-4 border-t border-border/70 space-y-2">
              <Button asChild size="lg" className="w-full shadow-lg shadow-brand/20 group">
                <Link
                  to={`/register?preset=${activePresetId}&features=${selectedFeatures.join(',')}&style=${selectedStyle}`}
                  className="flex items-center justify-center gap-2"
                >
                  <span>{isAr ? 'ابدأ بهذا النطاق الآن' : 'Start With This Scope'}</span>
                  <ArrowRight className="rtl-flip size-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <p className="text-center text-[11px] text-muted">
                {isAr ? '⚡ يستغرق تجهيز المتطلبات أقل من 10 دقائق' : '⚡ Complete discovery takes ~10 minutes'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
