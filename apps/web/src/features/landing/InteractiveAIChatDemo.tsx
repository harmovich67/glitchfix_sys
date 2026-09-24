import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bot,
  Sparkles,
  Send,
  Plus,
  Check,
  Cpu,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';

interface PromptPreset {
  id: string;
  badge: { ar: string; en: string };
  userPrompt: { ar: string; en: string };
  aiSummary: { ar: string; en: string };
  suggestedFeatures: {
    id: string;
    title: { ar: string; en: string };
    tag: string;
    reason: { ar: string; en: string };
  }[];
  techStack: string[];
}

const PRESET_CHATS: PromptPreset[] = [
  {
    id: 'perfume_store',
    badge: { ar: 'تجارة إلكترونية فاخرة', en: 'Luxury E-commerce' },
    userPrompt: {
      ar: 'أريد متجر عطور فاخر بتجربة استثنائية للعميل، مع توصيل سريع في الخليج.',
      en: 'I want a luxury perfume boutique with a premium unboxing vibe and Gulf express delivery.',
    },
    aiSummary: {
      ar: 'فكرة ممتازة! للمتاجر الفاخرة، السر يكمن في تجربة تصفح مرئية أنيقة، وفاحص ذكي للروائح ونوتات العطر، وتكامل فوري مع بوابات الدفع المحلية وشركات الشحن السريع.',
      en: 'Outstanding concept! Luxury brands require an editorial visual feel, scent-profile finder, and seamless integration with Gulf couriers.',
    },
    suggestedFeatures: [
      {
        id: 'scent_quiz',
        title: { ar: 'مُستشار العطور التفاعلي (Scent Quiz)', en: 'Interactive Scent Quiz' },
        tag: 'UX / AI',
        reason: { ar: 'يرشد العميل لاختيار عطره المفضل في 3 أسئلة بسيطة', en: 'Guides customer to match their signature notes' },
      },
      {
        id: 'apple_pay',
        title: { ar: 'شراء سريع بنقرة واحدة (Apple Pay & Tabby)', en: 'Apple Pay & Buy Now Pay Later' },
        tag: 'Fintech',
        reason: { ar: 'يرفع نسبة إتمام الطلب بنسبة 35% في دول الخليج', en: 'Boosts conversion rate by 35% in GCC' },
      },
      {
        id: 'gift_card',
        title: { ar: 'خدمة التغليف الفاخر وبطاقات الإهداء', en: 'Luxury Gift Wrap & Custom Notes' },
        tag: 'Retention',
        reason: { ar: 'إتاحة إرسال كهدية مع كرت مخصص وفيديو مباركة', en: 'Adds high emotional value and average order value' },
      },
      {
        id: 'sms_tracking',
        title: { ar: 'تتبع الشحنة المباشر عبر واتساب وSMS', en: 'Live WhatsApp & SMS Dispatch' },
        tag: 'Logistics',
        reason: { ar: 'يقلل استفسارات خدمة العملاء بنسبة 60%', en: 'Cuts customer support inquiries by 60%' },
      },
    ],
    techStack: ['Next.js 15', 'Node.js', 'PostgreSQL', 'Stripe / Moyasar', 'Redis'],
  },
  {
    id: 'clinic_booking',
    badge: { ar: 'منصة طبية وصحية', en: 'Digital Health & Booking' },
    userPrompt: {
      ar: 'نظام حجز مواعيد لعيادات أسنان متعددة الفروع مع ملف طبي إلكتروني للمريض.',
      en: 'Multi-branch dental appointment booking system with digital patient health records.',
    },
    aiSummary: {
      ar: 'مشروع ذو أثر تشغيلي عالي. الأولوية هنا هي الحماية الصارمة لبيانات المرضى (HIPAA/الامتثال الصحي)، والتزامن الدقيق لجدول الأطباء بدون أي تعارض في المواعيد.',
      en: 'High operational impact! Core pillars here are strict patient data privacy, zero-conflict doctor calendar sync, and automated SMS reminders.',
    },
    suggestedFeatures: [
      {
        id: 'smart_calendar',
        title: { ar: 'تقويم مواعيد تفاعلي متعدد الفروع', en: 'Multi-location Doctor Calendar' },
        tag: 'Operations',
        reason: { ar: 'حجز فوري حسب الطبيب والتخصص والفرع الأقرب', en: 'Real-time slot booking without overlap' },
      },
      {
        id: 'digital_ehr',
        title: { ar: 'سجل طبي رقمي وصور الأشعة المشفرة', en: 'Encrypted Patient EHR & X-Rays' },
        tag: 'Compliance',
        reason: { ar: 'أمان عالي ومطابق لمعايير الحماية الطبية', en: 'Compliant with health data confidentiality laws' },
      },
      {
        id: 'whatsapp_confirm',
        title: { ar: 'تأكيد الحضور التلقائي عبر واتساب', en: 'Automated WhatsApp Attendance Ping' },
        tag: 'Automation',
        reason: { ar: 'يخفض نسبة الغياب أو التأخر (No-Shows) إلى أقل من 4%', en: 'Reduces no-shows to under 4%' },
      },
      {
        id: 'telehealth',
        title: { ar: 'استشارة فيديو آمنة عن بُعد', en: 'Secure HD Teleconsultation' },
        tag: 'Telehealth',
        reason: { ar: 'استشارات أولية ومتابعات سريعة للمرضى', en: 'Quick follow-ups from patient home' },
      },
    ],
    techStack: ['React', 'NestJS', 'PostgreSQL', 'WebRTC', 'Twilio'],
  },
  {
    id: 'saas_b2b',
    badge: { ar: 'منصة برمجية سحابية', en: 'B2B Workflow SaaS' },
    userPrompt: {
      ar: 'منصة لإدارة فواتير ومصروفات الشركات الصغيرة مع تصدير تقارير محاسبية فورية.',
      en: 'Invoicing and expense tracking SaaS for SMEs with instant tax-compliant reporting.',
    },
    aiSummary: {
      ar: 'سوق واعد جداً! التحدي الأساسي هو الامتثال للفوترة الإلكترونية (ZATCA)، وتسهيل تجربة الاستخدام لغير المحاسبين مع استخراج تقارير الأرباح والخسائر بلحظات.',
      en: 'A thriving market! Key focus is tax authority compliance (ZATCA phase 2), delightful UX for non-accountants, and one-click PDF audit exports.',
    },
    suggestedFeatures: [
      {
        id: 'zatca_ready',
        title: { ar: 'فوترة إلكترونية معتمدة مع QR Code مشفر', en: 'E-invoicing Compliant with QR Code' },
        tag: 'Legal/Tax',
        reason: { ar: 'مطابقة كاملة لمتطلبات الفوترة الإلكترونية الإلزامية', en: 'Full compliance with regional digital tax mandates' },
      },
      {
        id: 'ocr_receipts',
        title: { ar: 'مسح الإيصالات وقراءتها بالذكاء الاصطناعي (OCR)', en: 'AI Receipt OCR Scanner' },
        tag: 'AI / Automation',
        reason: { ar: 'استخراج المبالغ والتصنيف تلقائياً من صورة الفاتورة', en: 'Extracts totals and tax automatically from photos' },
      },
      {
        id: 'role_access',
        title: { ar: 'صلاحيات متعددة المستويات (محاسب / مدير / مدقق)', en: 'Granular Role-based Access (RBAC)' },
        tag: 'Security',
        reason: { ar: 'حماية سرية الرواتب والأرقام المالية الحساسة', en: 'Restricts payroll access to authorized eyes only' },
      },
      {
        id: 'bank_sync',
        title: { ar: 'تكامل الحسابات البنكية ومطابقة الحركات', en: 'Open Banking Auto-Reconciliation' },
        tag: 'Fintech',
        reason: { ar: 'مطابقة المدفوعات الواردة مع الفواتير آلياً', en: 'Automates matching bank feeds to issued invoices' },
      },
    ],
    techStack: ['Next.js', 'Go / Node', 'PostgreSQL', 'Tailwind', 'Docker'],
  },
];

export function InteractiveAIChatDemo() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [activePreset, setActivePreset] = useState<PromptPreset>(PRESET_CHATS[0]);
  const [addedFeatures, setAddedFeatures] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [, startTransition] = useTransition();

  const handleSelectPreset = (preset: PromptPreset) => {
    setIsTyping(true);
    setActivePreset(preset);
    setAddedFeatures([]);
    setTimeout(() => {
      setIsTyping(false);
    }, 450);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;

    setIsTyping(true);
    // Find closest or dynamically adapt
    setTimeout(() => {
      startTransition(() => {
        setActivePreset({
          id: 'custom_' + Date.now(),
          badge: { ar: 'فكرتك المخصصة', en: 'Your Custom Project' },
          userPrompt: { ar: customInput, en: customInput },
          aiSummary: {
            ar: `تحليل رائع! فكرتك "${customInput}" تحتاج إلى تركيز أساسي على تجربة المستخدم، واجهة سريعة الاستجابة، وتكامل سحابي موثوق مع قاعدة بيانات مرنة وقابلة للتوسع.`,
            en: `Great concept! Your idea "${customInput}" requires sharp UX focus, high-velocity responsive frontend, and a scalable cloud database architecture.`,
          },
          suggestedFeatures: [
            {
              id: 'custom_f1',
              title: { ar: 'واجهة استخدام حديثة وسريعة الاستجابة', en: 'Modern High-Velocity Web & Mobile App' },
              tag: 'Frontend',
              reason: { ar: 'مبنية بأحدث تقنيات الويب مع دعم الشاشات الذكية', en: 'Built with latest responsive design standards' },
            },
            {
              id: 'custom_f2',
              title: { ar: 'نظام إدارة محتوى وصلاحيات متكامل', en: 'Integrated Admin & CMS Dashboard' },
              tag: 'Control Plane',
              reason: { ar: 'تحكم كامل بالمستخدمين والبيانات والإحصائيات', en: 'Complete control over data and metrics' },
            },
            {
              id: 'custom_f3',
              title: { ar: 'محرك أمان وتوثيق ومصادقة مشفرة', en: 'Encrypted Auth & Token Security' },
              tag: 'Security',
              reason: { ar: 'حماية بياناتك وحسابات الزوار بأعلى المعايير', en: 'Enterprise-grade identity and data protection' },
            },
            {
              id: 'custom_f4',
              title: { ar: 'مساعد ذكي مدمج لتسهيل الخدمة', en: 'Embedded AI Discovery Co-pilot' },
              tag: 'AI Agent',
              reason: { ar: 'أتمتة خدمة العملاء والإجابة على الاستفسارات فوراً', en: 'Instant customer support and contextual answers' },
            },
          ],
          techStack: ['React 19', 'Express / Node', 'Prisma', 'PostgreSQL', 'Tailwind'],
        });
        setAddedFeatures([]);
        setIsTyping(false);
        setCustomInput('');
      });
    }, 600);
  };

  const toggleAddFeature = (id: string) => {
    setAddedFeatures((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Background glow mesh */}
      <div className="absolute -inset-4 -z-10 rounded-[40px] bg-gradient-to-r from-brand/15 via-accent/10 to-violet-600/15 blur-3xl" />

      {/* Outer Shell */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface/95 shadow-xl backdrop-blur-md">
        {/* Terminal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-surface-2/60 px-4 sm:px-6 py-3.5 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex size-8 sm:size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-white shadow-md shadow-brand/20">
              <Bot className="size-4 sm:size-5" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-fg truncate">
                  {isAr ? 'مستشار الذكاء الاصطناعي (Gemini Live Consultant)' : 'AI Project Consultant'}
                </h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[9.5px] sm:text-[10px] font-semibold text-emerald-600 shrink-0">
                  {isAr ? 'متاح ومباشر' : 'Online & Active'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-muted truncate">
                {isAr
                  ? 'يحلل فكرتك، يفككها إلى متطلبات تقنية، ويقترح ميزات دقيقة للمطورين'
                  : 'Analyzes your idea, decomposes specs, and crafts tech requirements'}
              </p>
            </div>
          </div>

          {/* Quick preset selector buttons */}
          <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto py-1 touch-pan-x sm:w-auto">
            <span className="shrink-0 whitespace-nowrap text-[11px] font-semibold text-muted me-1">
              {isAr ? 'جرّب أمثلة سريعة:' : 'Quick examples:'}
            </span>
            {PRESET_CHATS.map((p) => {
              const active = p.id === activePreset.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handleSelectPreset(p)}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-brand text-white shadow-sm ring-2 ring-brand/30'
                      : 'bg-surface-2 text-fg-2 hover:bg-surface-3'
                  }`}
                >
                  {isAr ? p.badge.ar : p.badge.en}
                </button>
              );
            })}
          </div>
        </div>

        {/* Chat Body & Dissection Grid */}
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Chat Stream View */}
          <div className="p-4 sm:p-7 space-y-4 sm:space-y-5 border-b lg:border-b-0 lg:border-e border-border">
            {/* User Message Bubble */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-xs font-bold text-fg">
                {isAr ? 'أنت' : 'You'}
              </span>
              <div className="min-w-0 max-w-full rounded-2xl rounded-ss-xs bg-brand-soft/70 px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-fg shadow-xs ring-1 ring-brand/20 break-words leading-relaxed">
                {isAr ? activePreset.userPrompt.ar : activePreset.userPrompt.en}
              </div>
            </div>

            {/* AI Response Card */}
            <div className="flex items-start gap-2.5 sm:gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-white shadow-xs">
                <Sparkles className="size-3.5" />
              </span>
              <div className="min-w-0 flex-1 space-y-3 sm:space-y-4 rounded-2xl rounded-ss-xs bg-surface-2/60 p-3.5 sm:p-4 ring-1 ring-border">
                {isTyping ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-muted">
                    <span className="size-2 animate-ping rounded-full bg-brand" />
                    <span>{isAr ? 'جارٍ تحليل الفكرة وتفكيك المتطلبات التقنية…' : 'Decomposing specs & matching features…'}</span>
                  </div>
                ) : (
                  <>
                    <p className="text-xs sm:text-sm leading-relaxed text-fg-2 font-normal break-words">
                      {isAr ? activePreset.aiSummary.ar : activePreset.aiSummary.en}
                    </p>

                    {/* Features extracted */}
                    <div className="space-y-2 pt-2 border-t border-border/70">
                      <div className="flex flex-wrap items-center justify-between gap-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                          <Layers className="size-3 text-brand" />
                          {isAr ? 'الميزات المقترحة (انقر للإضافة إلى متطلباتك):' : 'Suggested Scope Modules (Click to Add):'}
                        </span>
                        {addedFeatures.length > 0 && (
                          <span className="text-[11px] font-bold text-emerald-600">
                            {isAr ? `✓ تم اختيار ${addedFeatures.length}` : `✓ ${addedFeatures.length} added`}
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        {activePreset.suggestedFeatures.map((feat) => {
                          const isAdded = addedFeatures.includes(feat.id);
                          return (
                            <motion.button
                              key={feat.id}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              type="button"
                              onClick={() => toggleAddFeature(feat.id)}
                              className={`group w-full rounded-xl p-3 text-start transition-all cursor-pointer flex items-center justify-between gap-2.5 sm:gap-3 ${
                                isAdded
                                  ? 'bg-emerald-500/10 border-2 border-emerald-500/80 text-fg shadow-xs'
                                  : 'bg-surface border border-border text-fg-2 hover:border-brand/50 hover:bg-brand/5'
                              }`}
                            >
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                  <span className="text-xs font-semibold text-fg">
                                    {isAr ? feat.title.ar : feat.title.en}
                                  </span>
                                  <span className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono text-muted">
                                    {feat.tag}
                                  </span>
                                </div>
                                <p className="text-[11px] text-muted line-clamp-1">
                                  {isAr ? feat.reason.ar : feat.reason.en}
                                </p>
                              </div>

                              <span
                                className={`flex size-6 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                  isAdded
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-surface-2 text-muted group-hover:bg-brand group-hover:text-white'
                                }`}
                              >
                                {isAdded ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
                              </span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Interactive "Try your own idea" input */}
            <form onSubmit={handleCustomSubmit} className="relative mt-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                placeholder={
                  isAr
                    ? 'اكتب فكرة مشروعك هنا (مثال: منصة حجوزات تأجير يخوت فاخرة)…'
                    : 'Type your custom project idea here…'
                }
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 pe-24 text-xs sm:text-sm text-fg placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
              <button
                type="submit"
                disabled={!customInput.trim() || isTyping}
                className="absolute end-2 top-2 bottom-2 flex items-center gap-1.5 rounded-xl bg-brand px-3 text-xs font-semibold text-white shadow-sm transition-all hover:bg-brand-600 disabled:opacity-40"
              >
                <span>{isAr ? 'تحليل الفكرة' : 'Analyze'}</span>
                <Send className="size-3 rtl-flip" />
              </button>
            </form>
          </div>

          {/* Right Column: Instant PRD Blueprint */}
          <div className="flex flex-col justify-between bg-surface-2/30 p-6 sm:p-7">
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-border/70 pb-3">
                <span className="flex items-center gap-2 text-xs font-bold text-fg uppercase tracking-wider">
                  <Cpu className="size-4 text-brand" />
                  {isAr ? 'مواصفات المعمارية المقترحة' : 'Architecture Blueprint'}
                </span>
                <span className="text-[11px] font-mono text-muted">Welco SRS v2.4</span>
              </div>

              {/* Recommended Stack */}
              <div className="rounded-2xl bg-surface p-4 ring-1 ring-border space-y-2.5">
                <span className="text-xs font-semibold text-muted block">
                  {isAr ? 'التقنيات الموصى بها لهذا المشروع:' : 'Recommended Tech Stack:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePreset.techStack.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-mono font-medium text-fg ring-1 ring-border"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Added Features Tray */}
              <div className="rounded-2xl bg-surface p-4 ring-1 ring-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-fg">
                    {isAr ? 'الميزات المعتمدة في الملخص:' : 'Selected Scope Dossier:'}
                  </span>
                  <span className="text-xs font-mono font-bold text-brand">
                    {addedFeatures.length} / {activePreset.suggestedFeatures.length}
                  </span>
                </div>

                {addedFeatures.length === 0 ? (
                  <p className="text-xs text-muted italic">
                    {isAr
                      ? '👈 انقر على علامة (+) بجانب أي ميزة لإضافتها إلى وثيقة متطلباتك'
                      : '👈 Click (+) on any feature on the left to add it to your dossier'}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {addedFeatures.map((id) => {
                      const feat = activePreset.suggestedFeatures.find((f) => f.id === id);
                      if (!feat) return null;
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700"
                        >
                          <Check className="size-3" />
                          {isAr ? feat.title.ar : feat.title.en}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Value proposition note */}
              <div className="rounded-xl bg-gradient-to-r from-brand/10 to-accent/10 p-3.5 ring-1 ring-brand/20 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-brand">
                  <ShieldCheck className="size-4" />
                  <span>{isAr ? 'دقة وتجنب التخبط البرمجي' : 'Zero Ambiguity Guarantee'}</span>
                </div>
                <p className="text-[11px] text-fg-2 leading-relaxed">
                  {isAr
                    ? 'المساعد الذكي يحول رغباتك العفوية إلى مواصفات فنية ومخطط جداول قاعدة بيانات يفهمه المطورون بدقة 100%.'
                    : 'The AI translates casual client intent into exact database schemas and acceptance criteria developers understand.'}
                </p>
              </div>
            </div>

            {/* Direct CTA to convert this session */}
            <div className="mt-6 pt-4 border-t border-border/70">
              <Button asChild size="lg" className="w-full shadow-lg shadow-brand/20">
                <a href="#types" className="flex items-center justify-center gap-2">
                  <span>{isAr ? 'استكشف نماذج المشاريع كاملة' : 'Explore Full Project Types'}</span>
                  <ArrowRight className="rtl-flip size-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
