import {
  OPTION_TYPES,
  allQuestions,
  evaluateCondition,
  formatAnswer,
  isEmptyValue,
  tr,
  visibleQuestions,
  visibleSteps,
  type AnswerMap,
  type WorkflowDefinition,
} from '@welco/shared';
import type { ChatResult } from '../ai.service';

/**
 * Deterministic offline assistant used when no Gemini key is configured. It is intentionally
 * simple, but it exercises the exact same contract as the live model (reply + applicable
 * suggestions + follow-ups) so the whole product works in demos and tests.
 */

const TYPE_KEYWORDS: Record<string, string[]> = {
  ecommerce: ['amazon', 'shop', 'store', 'sell', 'ecommerce', 'e-commerce', 'product', 'cart', 'متجر', 'بيع', 'منتج', 'أمازون', 'امازون'],
  booking: ['booking', 'appointment', 'reservation', 'salon', 'clinic', 'schedule', 'حجز', 'موعد', 'مواعيد', 'عيادة'],
  mobile_app: ['mobile', 'ios', 'android', 'app store', 'تطبيق', 'جوال'],
  saas: ['saas', 'subscription', 'software as a service', 'multi-tenant', 'اشتراك', 'اشتراكات'],
  real_estate: ['real estate', 'property', 'properties', 'apartment', 'rent', 'listing', 'عقار', 'عقارات', 'شقق'],
  landing_page: ['landing', 'campaign', 'launch page', 'waitlist', 'صفحة هبوط', 'حملة'],
  company_website: ['company website', 'corporate', 'portfolio', 'our services', 'agency', 'موقع شركة', 'تعريفي'],
};

const GLOSSARY: { terms: string[]; en: string; ar: string }[] = [
  { terms: ['payment gateway', 'بوابة دفع'], en: 'A payment gateway is the secure service that takes card or wallet payments on your site and sends the money to your bank (e.g. Stripe, Tap, PayPal).', ar: 'بوابة الدفع هي الخدمة الآمنة التي تستقبل مدفوعات البطاقات والمحافظ في موقعك وتحوّلها إلى حسابك البنكي.' },
  { terms: ['seo', 'سيو', 'محركات البحث'], en: 'SEO (search engine optimisation) means structuring pages so Google can understand and rank them, bringing you free visitors.', ar: 'تحسين محركات البحث (SEO) يعني بناء الصفحات بطريقة تساعد جوجل على فهمها وترتيبها لجلب زوار مجانيين.' },
  { terms: ['cms', 'content management', 'لوحة تحكم'], en: 'A CMS is an admin panel that lets your team edit texts, images and pages without a developer.', ar: 'نظام إدارة المحتوى هو لوحة تحكم تتيح لفريقك تعديل النصوص والصور والصفحات بدون مبرمج.' },
  { terms: ['api', 'integration', 'ربط', 'تكامل'], en: 'An API is a way for two systems to talk to each other automatically — for example your store sending orders to your accounting software.', ar: 'الـ API طريقة تتواصل بها الأنظمة مع بعضها تلقائياً، مثل إرسال الطلبات من متجرك إلى برنامج المحاسبة.' },
  { terms: ['mvp', 'minimum viable'], en: 'An MVP is the smallest first version that delivers real value, so you can launch sooner and improve with real feedback.', ar: 'النسخة الأولية (MVP) هي أصغر نسخة تقدّم قيمة حقيقية لتنطلق بسرعة وتطوّر بناءً على آراء المستخدمين.' },
  { terms: ['responsive', 'متجاوب'], en: 'Responsive design means the site automatically adapts to phones, tablets and desktops.', ar: 'التصميم المتجاوب يعني أن الموقع يتكيف تلقائياً مع الجوال والتابلت والكمبيوتر.' },
  { terms: ['hosting', 'domain', 'استضافة', 'نطاق', 'دومين'], en: 'The domain is your address (yourbrand.com); hosting is the server where the site lives. Both are small yearly costs.', ar: 'النطاق هو عنوان موقعك (yourbrand.com)، والاستضافة هي الخادم الذي يعمل عليه الموقع، وكلاهما تكلفة سنوية بسيطة.' },
  { terms: ['inventory', 'مخزون'], en: 'Inventory management tracks stock levels so products show “out of stock” automatically and you know when to reorder.', ar: 'إدارة المخزون تتابع الكميات لتظهر المنتجات "نفدت" تلقائياً وتعرف متى تعيد الطلب.' },
  { terms: ['crm'], en: 'A CRM keeps all your customer contacts, conversations and deals in one place.', ar: 'نظام إدارة العملاء (CRM) يجمع بيانات العملاء ومحادثاتهم وصفقاتهم في مكان واحد.' },
];

function detectType(text: string): string | null {
  const t = text.toLowerCase();
  let best: { type: string; hits: number } | null = null;
  for (const [type, words] of Object.entries(TYPE_KEYWORDS)) {
    const hits = words.filter((w) => t.includes(w)).length;
    if (hits && (!best || hits > best.hits)) best = { type, hits };
  }
  return best?.type ?? null;
}

export function mockChat(input: { message: string; locale: string; def: WorkflowDefinition; answers: AnswerMap }): ChatResult {
  const ar = input.locale === 'ar';
  const answered = typeof input.answers.project_type === 'string' ? input.answers.project_type : null;
  const detected = detectType(input.message);
  const type = detected ?? answered;
  const suggestions: ChatResult['suggestions'] = [];
  const parts: string[] = [];

  const typeQ = allQuestions(input.def).find((q) => q.key === 'project_type');
  const typeLabel = type && typeQ ? formatAnswer(typeQ, type, input.locale)[0] : null;

  if (detected && detected !== answered && typeQ) {
    suggestions.push({ questionKey: 'project_type', values: [detected], reason: ar ? 'يبدو أن هذا نوع مشروعك' : 'This sounds like your project type' });
  }

  if (type) {
    const probe = { ...input.answers, project_type: type };
    const featureQs = visibleSteps(input.def, probe)
      .flatMap((s) => visibleQuestions(s, probe))
      .filter((q) => q.type === 'feature_checklist' && evaluateCondition(q.conditions, probe));
    for (const q of featureQs.slice(0, 2)) {
      const current = Array.isArray(input.answers[q.key]) ? (input.answers[q.key] as string[]) : [];
      const picks = (q.options ?? []).map((o) => o.value).filter((v) => !current.includes(v)).slice(0, 6);
      if (picks.length) suggestions.push({ questionKey: q.key, values: picks, reason: ar ? 'ميزات أساسية لهذا النوع' : 'Core features for this kind of project' });
    }
    const labels = suggestions
      .filter((s) => s.questionKey !== 'project_type')
      .flatMap((s) => {
        const q = allQuestions(input.def).find((x) => x.key === s.questionKey);
        return q ? formatAnswer(q, s.values, input.locale) : [];
      });
    parts.push(
      ar
        ? `رائع! يبدو أنك تحتاج إلى **${typeLabel ?? type}**. لنسخة أولى قوية أنصحك بالبدء بـ:\n${labels.map((l) => `• ${l}`).join('\n')}`
        : `Great idea! It sounds like you need a **${typeLabel ?? type}**. For a strong first version I'd start with:\n${labels.map((l) => `• ${l}`).join('\n')}`,
    );
  }

  const term = GLOSSARY.find((g) => g.terms.some((t) => input.message.toLowerCase().includes(t)));
  if (term) parts.push(ar ? term.ar : term.en);

  if (!parts.length) {
    parts.push(
      ar
        ? 'أنا هنا لمساعدتك! أخبرني بفكرة مشروعك بجملة واحدة — مثل "متجر إلكتروني لبيع العطور" — وسأقترح عليك الميزات المناسبة وأشرح أي مصطلح تقني.'
        : 'I’m here to help! Describe your idea in one sentence — e.g. “an online store for handmade perfumes” — and I’ll suggest the right features and explain any technical term.',
    );
  }

  const followUps = ar
    ? ['من هم عملاؤك المستهدفون؟', 'هل تحتاج لغة عربية وإنجليزية؟']
    : ['Who are your main customers?', 'Do you need both Arabic and English?'];

  return { reply: parts.join('\n\n'), suggestions, followUps, mock: true };
}

export function mockImprove(text: string): string {
  const cleaned = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^\w|[.!?]\s+\w)/g, (m) => m.toUpperCase())
    .replace(/\bi\b/g, 'I');
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean);
  const body = sentences.map((s) => (/[.!?؟]$/.test(s) ? s : `${s}.`)).join(' ');
  return body;
}

export function mockBrief(input: { title: string; code: string; def: WorkflowDefinition; answers: AnswerMap; files: Map<string, string>; locale: string }) {
  const ar = input.locale === 'ar';
  const lines = [
    `# ${input.title} (${input.code})`,
    '',
    ar ? '_ملخص تلقائي (وضع العرض — اربط Gemini للحصول على ملخص أغنى)._' : '_Auto-generated summary (demo mode — connect Gemini for a richer brief)._',
    '',
  ];
  for (const step of visibleSteps(input.def, input.answers)) {
    const qs = visibleQuestions(step, input.answers).filter((q) => !isEmptyValue(input.answers[q.key]));
    if (!qs.length) continue;
    lines.push(`## ${tr(step, 'title', input.locale)}`);
    for (const q of qs) {
      const value = input.answers[q.key];
      const shown =
        q.type === 'file'
          ? (Array.isArray(value) ? value : []).map((id) => input.files.get(id) ?? 'file')
          : OPTION_TYPES.includes(q.type)
            ? formatAnswer(q, value, input.locale)
            : q.type === 'country' && typeof value === 'string'
              ? [new Intl.DisplayNames([input.locale], { type: 'region' }).of(value) ?? value]
              : Array.isArray(value)
                ? value
                : [String(value)];
      lines.push(`- **${tr(q, 'label', input.locale)}:** ${shown.join(ar ? '، ' : ', ')}`);
    }
    lines.push('');
  }
  lines.push(
    ...(ar
      ? ['## الخطوات التالية المقترحة', '- تأكيد النطاق والأولويات مع العميل', '- إعداد الهياكل الأولية للصفحات الرئيسية', '- تقدير الجهد لكل مجموعة ميزات']
      : ['## Suggested next steps', '- Confirm scope and priorities with the client', '- Prepare wireframes for the key pages', '- Estimate effort per feature group']),
  );
  return lines.join('\n');
}
