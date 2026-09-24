import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';
import { useI18n } from '../../lib/i18n';

interface FaqItem {
  id: string;
  category: 'general' | 'ai' | 'agencies' | 'security';
  q: { ar: string; en: string };
  a: { ar: string; en: string };
}

const FAQS: FaqItem[] = [
  {
    id: 'f1',
    category: 'general',
    q: {
      ar: 'كيف يختلف ويلكو عن نماذج الاستبيانات التقليدية (Google Forms / Typeform)؟',
      en: 'How does Welco differ from standard questionnaires or forms?',
    },
    a: {
      ar: 'النماذج التقليدية تطرح أسئلة نصية عامة ومملة تسبب ارتباكاً للعميل. ويلكو يقدم رحلة بصرية ذكية متكيفة مع نوع المشروع، تحتوي على معاينات فورية للأنماط والألوان، ومستشار ذكاء اصطناعي يفكك المتطلبات ويسد الفجوات التقنية تلقائياً.',
      en: 'Standard forms ask bland, generic questions that confuse non-technical clients. Welco provides a smart adaptive visual journey with live design previews and an AI co-pilot that resolves technical ambiguities in real-time.',
    },
  },
  {
    id: 'f2',
    category: 'ai',
    q: {
      ar: 'كيف يساعد الذكاء الاصطناعي (Gemini) في تجهيز متطلبات المشروع؟',
      en: 'How does the Gemini AI assist in formulating the project brief?',
    },
    a: {
      ar: 'المساعد الذكي يستمع لشرحك العفوي (مثلاً: "أريد تطبيقاً مثل أوبر لكن لتأجير الدراجات")، ويقترح عليك الميزات المناسبة، ويشرح المصطلحات التقنية المعقدة بلغة مبسطة، ويكتب ملخصاً دقيقاً للمطورين يشمل معايير القبول.',
      en: 'The AI listens to your plain-language description and proposes core features, explains technical terms simply, and drafts structured acceptance criteria for engineering teams.',
    },
  },
  {
    id: 'f3',
    category: 'agencies',
    q: {
      ar: 'هل يمكن للوكالات والشركات البرمجية تخصيص مسار الأسئلة (Workflows)؟',
      en: 'Can software agencies customize questions and workflow steps?',
    },
    a: {
      ar: 'نعم تماماً! يوفر ويلكو منشئ مسارات متقدم (Workflow Builder) يتيح لك إضافة أسئلة شرطية، وتعديل الخيارات والألوان، وإنشاء نماذج مخصصة لكل خدمة تقدمها شركتك.',
      en: 'Absolutely! Welco includes an advanced drag-and-drop Workflow Builder that lets you add conditional logic, customize visual cards, and tailor journeys for every service you offer.',
    },
  },
  {
    id: 'f4',
    category: 'security',
    q: {
      ar: 'هل بيانات مشروعي وأفكاري محمية ومحفوظة بسرية؟',
      en: 'Are my project ideas and proprietary data secure and confidential?',
    },
    a: {
      ar: 'بالتأكيد. جميع البيانات مخزنة بتشفير AES-256، ولا يتم استخدام أفكار مشاريعك أو بياناتك الخاصة في تدريب أي نماذج عامة. كما نوفر سجل تدقيق وصلاحيات دقيقة للوصول.',
      en: 'Yes. All data is encrypted with AES-256. Your project briefs and requirements are never shared or used to train public AI models, protected by role-based access control and audit logs.',
    },
  },
  {
    id: 'f5',
    category: 'general',
    q: {
      ar: 'كم من الوقت تستغرق رحلة تحديد المتطلبات؟',
      en: 'How long does the discovery journey take to complete?',
    },
    a: {
      ar: 'تستغرق في المتوسط ما بين 8 إلى 14 دقيقة فقط، بدلاً من أسابيع من الاجتماعات والمراسلات المعقدة ذهاباً وإياباً. كما يمكنك حفظ تقدمك في أي لحظة والعودة لاحقاً.',
      en: 'On average, only 8 to 14 minutes, replacing weeks of scheduling discovery meetings and back-and-forth emails. You can also autosave and resume whenever convenient.',
    },
  },
  {
    id: 'f6',
    category: 'agencies',
    q: {
      ar: 'كيف يمنع ويلكو مشكلة تجاوز النطاق (Scope Creep) وتضارب التوقعات؟',
      en: 'How does Welco prevent scope creep and expectation mismatch?',
    },
    a: {
      ar: 'بمجرد اعتماد العميل للمواصفات، يتم قفل المتطلبات داخل ملف مرجعي موحد (Locked Dossier). أي طلب تعديل لاحق يُسجل كإضافة واضحة ومدروسة للتكلفة والجدول الزمني.',
      en: 'Once the client signs off, the brief is locked into a definitive dossier. Any subsequent change requests are explicitly tracked as scope additions with budget and timeline impacts.',
    },
  },
];

export function InteractiveFaq() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [activeCategory, setActiveCategory] = useState<'all' | 'general' | 'ai' | 'agencies' | 'security'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openIds, setOpenIds] = useState<string[]>(['f1']);

  const categories = [
    { id: 'all' as const, label: { ar: 'الكل', en: 'All Questions' } },
    { id: 'general' as const, label: { ar: 'عام', en: 'General' } },
    { id: 'ai' as const, label: { ar: 'المساعد الذكي', en: 'AI Co-pilot' } },
    { id: 'agencies' as const, label: { ar: 'الوكالات والمطورين', en: 'Agencies & Devs' } },
    { id: 'security' as const, label: { ar: 'الأمان والسرية', en: 'Privacy & Security' } },
  ];

  const filteredFaqs = FAQS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const textToSearch = (item.q.ar + ' ' + item.q.en + ' ' + item.a.ar + ' ' + item.a.en).toLowerCase();
    const matchesSearch = !searchQuery.trim() || textToSearch.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleAccordion = (id: string) => {
    setOpenIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  return (
    <div className="relative mx-auto max-w-4xl">
      <div className="text-center space-y-3 mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
          <HelpCircle className="size-3.5" />
          {isAr ? 'الأسئلة الشائعة والأجوبة الفورية' : 'Frequently Asked Questions'}
        </span>
        <h3 className="text-3xl font-bold sm:text-4xl text-fg">
          {isAr ? 'كل ما تحتاج معرفته عن منصة ويلكو' : 'Everything You Need to Know About Welco'}
        </h3>
        <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
          {isAr
            ? 'إجابات واضحة ومباشرة حول كيفية عمل المنصة، الذكاء الاصطناعي، وتسليم المشاريع'
            : 'Clear answers on discovery workflows, AI capabilities, and engineering deliverables'}
        </p>
      </div>

      {/* Interactive Search Bar & Categories */}
      <div className="space-y-4 mb-8">
        <div className="relative">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 size-4 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isAr ? 'ابحث في الأسئلة الشائعة…' : 'Search questions…'}
            className="w-full rounded-2xl border border-border bg-surface ps-11 pe-4 py-3 text-sm text-fg placeholder:text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {categories.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  active
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-surface-2 text-muted hover:text-fg hover:bg-surface-3'
                }`}
              >
                {isAr ? cat.label.ar : cat.label.en}
              </button>
            );
          })}
        </div>
      </div>

      {/* Accordion List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center text-muted text-sm">
            {isAr ? 'لا توجد نتائج مطابقة لبحثك.' : 'No matching questions found.'}
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = openIds.includes(faq.id);
            return (
              <div
                key={faq.id}
                className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition-all hover:border-brand/40"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(faq.id)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-start cursor-pointer transition-colors hover:bg-surface-2/40"
                >
                  <span className="text-sm sm:text-base font-semibold text-fg">
                    {isAr ? faq.q.ar : faq.q.en}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"
                  >
                    <ChevronDown className="size-4" />
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                    >
                      <div className="border-t border-border/60 bg-surface-2/30 p-5 pt-3 text-xs sm:text-sm leading-relaxed text-fg-2">
                        {isAr ? faq.a.ar : faq.a.en}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
