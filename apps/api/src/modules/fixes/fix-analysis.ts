import type { FixRequest } from '@prisma/client';
import { FIX_CATEGORIES, FIX_SEVERITIES, type FixCategory, type FixSeverity } from '@welco/shared';
import { BRIEF_LOCALES, type BriefLocale } from '../ai/brief-store';

/**
 * AI triage of a fix request: the client's (often vague, non-technical) description turned into what the
 * admin needs to act on. Kept per language like the project brief, as JSON in `FixRequest.aiAnalysis`.
 */
export interface FixAnalysis {
  technicalTitle: string;
  category: FixCategory;
  severity: FixSeverity;
  estimateHours: number | null;
  /** Markdown report (see FIX_SECTIONS). */
  text: string;
  generatedAt: string;
  model?: string;
  mock?: boolean;
}

export type FixAnalysisMap = Partial<Record<BriefLocale, FixAnalysis>>;

export function parseFixAnalyses(raw: string | null | undefined): FixAnalysisMap | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, FixAnalysis | undefined>;
    const map: FixAnalysisMap = {};
    for (const l of BRIEF_LOCALES) if (parsed[l] && typeof parsed[l]!.text === 'string') map[l] = parsed[l];
    return Object.keys(map).length ? map : null;
  } catch {
    return null;
  }
}

/** The fields the AI may read. Secrets are deliberately absent: only whether they were provided. */
export type FixSource = Pick<
  FixRequest,
  'siteUrl' | 'platform' | 'loginUrl' | 'username' | 'passwordEnc' | 'extraAccessEnc' | 'problem' | 'history' | 'urgency' | 'credentialsClearedAt'
>;

const provided = (v: unknown) => (v ? 'provided' : 'not provided');

/** Source pack for prompts. `clientFacing` drops everything about access (for documents the client reads). */
export function fixRequestContext(fix: FixSource, opts: { clientFacing?: boolean } = {}) {
  const lines = [
    '## Repair request for an existing, live site',
    `- Website: ${fix.siteUrl}`,
    `- Platform (client's own guess): ${fix.platform && fix.platform !== 'unknown' ? fix.platform : 'unknown'}`,
  ];
  if (!opts.clientFacing) {
    lines.push(
      `- Urgency chosen by the client: ${fix.urgency}`,
      '',
      '### Access the client handed over (values withheld from you)',
      `- Admin login page: ${provided(fix.loginUrl)}`,
      `- Username: ${provided(fix.username)}`,
      `- Password: ${provided(fix.passwordEnc)}`,
      `- Hosting / server / cPanel access notes: ${provided(fix.extraAccessEnc)}`,
    );
    if (fix.credentialsClearedAt) lines.push('- Note: the password and server access were removed after the job.');
  }
  lines.push('', "### The problem in the client's own words", '"""', fix.problem.slice(0, 8000), '"""');
  if (fix.history?.trim()) lines.push('', '### When it started / what they already tried', '"""', fix.history.slice(0, 4000), '"""');
  return lines.join('\n');
}

export const FIX_SECTIONS = {
  en: '1. Technical summary, 2. What the client reported (faithful restatement in precise terms), 3. Affected area, 4. Probable causes (ranked hypotheses), 5. Diagnostic plan, 6. Proposed fix, 7. Access & information needed, 8. Questions for the client, 9. Risks & precautions',
  ar: '1. الملخص التقني، 2. ما أبلغ عنه العميل (إعادة صياغة دقيقة)، 3. الجزء المتأثر، 4. الأسباب المحتملة (مرتبة حسب الاحتمال)، 5. خطة التشخيص، 6. الحل المقترح، 7. الصلاحيات والمعلومات المطلوبة، 8. أسئلة للعميل، 9. المخاطر والاحتياطات',
} as const;

export const FIX_ANALYSIS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    technicalTitle: { type: 'STRING', description: 'One precise technical line, max 12 words.' },
    category: { type: 'STRING', enum: [...FIX_CATEGORIES] },
    severity: { type: 'STRING', enum: [...FIX_SEVERITIES], description: 'Business impact: CRITICAL = site down, hacked or losing money now.' },
    estimateHours: { type: 'INTEGER', description: 'Realistic hours for diagnosis + fix (1-80).' },
    report: { type: 'STRING', description: 'The markdown report with the required sections.' },
  },
  required: ['technicalTitle', 'category', 'severity', 'report'],
};

/** Coerce whatever the model returned into a valid analysis, or null when there is no usable report. */
export function normalizeFixAnalysis(raw: unknown): Omit<FixAnalysis, 'generatedAt'> | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const text = typeof r.report === 'string' ? r.report.trim() : '';
  if (!text) return null;
  const hours = Number(r.estimateHours);
  return {
    technicalTitle: String(r.technicalTitle ?? '').trim().slice(0, 200),
    category: FIX_CATEGORIES.find((c) => c === r.category) ?? 'OTHER',
    severity: FIX_SEVERITIES.find((c) => c === r.severity) ?? 'MEDIUM',
    estimateHours: Number.isFinite(hours) && hours > 0 ? Math.min(400, Math.round(hours)) : null,
    text: text.slice(0, 30000),
  };
}

// ── Offline triage (no API key) ──────────────────────────────────────────────
// Keyword rules in English, Arabic and Egyptian dialect. Simple on purpose: it keeps the feature usable in demos
// and gives the admin a structured starting point with the same contract as the live model.

interface CategoryRule {
  words: string[];
  title: { en: string; ar: string };
  causes: { en: string[]; ar: string[] };
  checks: { en: string[]; ar: string[] };
  fix: { en: string; ar: string };
  server?: boolean;
}

const RULES: Partial<Record<FixCategory, CategoryRule>> = {
  SECURITY: {
    words: ['hack', 'hacked', 'malware', 'virus', 'spam', 'redirect', 'phishing', 'defaced', 'اختراق', 'مخترق', 'اتهكر', 'هكر', 'فيروس', 'سبام', 'بيحول', 'تحويل'],
    title: { en: 'Possible compromise of the live site', ar: 'احتمال اختراق الموقع' },
    causes: {
      en: ['Outdated core, theme or plugin with a known vulnerability', 'Leaked or weak admin / FTP password', 'Injected code in theme files, .htaccess or the database (redirects, spam links)'],
      ar: ['نواة أو قالب أو إضافة قديمة بها ثغرة معروفة', 'كلمة مرور ضعيفة أو مسرّبة للوحة التحكم أو FTP', 'كود محقون في ملفات القالب أو .htaccess أو قاعدة البيانات (تحويلات أو روابط سبام)'],
    },
    checks: {
      en: ['Take a full file + database backup before touching anything', 'Scan files for recently modified PHP/JS and unknown admin users', 'Check Google Search Console security issues and Safe Browsing status'],
      ar: ['أخذ نسخة احتياطية كاملة للملفات وقاعدة البيانات قبل أي تعديل', 'فحص الملفات المعدّلة حديثاً والمستخدمين الإداريين غير المعروفين', 'مراجعة تنبيهات الأمان في Google Search Console وحالة Safe Browsing'],
    },
    fix: { en: 'Clean the infection, update everything, rotate all passwords and harden the install (WAF, 2FA, file permissions).', ar: 'تنظيف الإصابة وتحديث كل المكونات وتغيير كل كلمات المرور وتقوية الحماية (WAF، تحقق ثنائي، صلاحيات الملفات).' },
    server: true,
  },
  HOSTING: {
    words: ['down', 'not opening', "doesn't open", 'not loading', '500', '502', '503', '504', 'dns', 'domain', 'ssl', 'certificate', 'https', 'hosting', 'server', 'expired', 'لا يفتح', 'مش بيفتح', 'مبيفتحش', 'واقع', 'الدومين', 'النطاق', 'الاستضافة', 'شهادة', 'السيرفر', 'الخادم'],
    title: { en: 'Site unavailable / hosting or domain issue', ar: 'الموقع لا يعمل / مشكلة في الاستضافة أو النطاق' },
    causes: {
      en: ['Expired domain, hosting plan or SSL certificate', 'Wrong DNS records after a change of host', 'Server error (PHP version change, exhausted resources, broken update)'],
      ar: ['انتهاء النطاق أو خطة الاستضافة أو شهادة SSL', 'سجلات DNS خاطئة بعد تغيير الاستضافة', 'خطأ في الخادم (تغيير إصدار PHP أو نفاد الموارد أو تحديث معطوب)'],
    },
    checks: {
      en: ['Check domain expiry (WHOIS) and DNS A/CNAME records', 'Read the server error log at the time of failure', 'Verify SSL validity and hosting account status'],
      ar: ['التحقق من تاريخ انتهاء النطاق (WHOIS) وسجلات DNS', 'قراءة سجل أخطاء الخادم وقت المشكلة', 'التأكد من صلاحية شهادة SSL وحالة حساب الاستضافة'],
    },
    fix: { en: 'Restore service first (renewal, DNS or rollback), then fix the root cause and add uptime monitoring.', ar: 'إعادة تشغيل الخدمة أولاً (تجديد أو ضبط DNS أو استرجاع نسخة) ثم معالجة السبب الجذري وإضافة مراقبة للتشغيل.' },
    server: true,
  },
  PERFORMANCE: {
    words: ['slow', 'loading', 'speed', 'lag', 'heavy', 'بطيء', 'بطئ', 'بطيئ', 'تقيل', 'التحميل', 'سرعة', 'بيهنج'],
    title: { en: 'Slow page loads', ar: 'بطء في تحميل الصفحات' },
    causes: {
      en: ['Unoptimised images and no caching / CDN', 'Too many or heavy plugins and third-party scripts', 'Slow database queries or an under-sized hosting plan'],
      ar: ['صور غير مضغوطة وعدم وجود كاش أو CDN', 'إضافات أو سكربتات خارجية كثيرة وثقيلة', 'استعلامات قاعدة بيانات بطيئة أو خطة استضافة ضعيفة'],
    },
    checks: {
      en: ['Run PageSpeed Insights / WebPageTest on the slow pages', 'Measure server response time (TTFB) and slow-query log', 'List active plugins and external scripts'],
      ar: ['تشغيل PageSpeed Insights على الصفحات البطيئة', 'قياس زمن استجابة الخادم (TTFB) وسجل الاستعلامات البطيئة', 'حصر الإضافات النشطة والسكربتات الخارجية'],
    },
    fix: { en: 'Enable caching and a CDN, compress images, remove heavy plugins and tune the database or hosting.', ar: 'تفعيل الكاش وCDN وضغط الصور وإزالة الإضافات الثقيلة وتحسين قاعدة البيانات أو الاستضافة.' },
    server: true,
  },
  PAYMENT: {
    words: ['payment', 'checkout', 'paypal', 'stripe', 'paymob', 'fawry', 'card', 'order', 'cart', 'الدفع', 'الفيزا', 'بوابة', 'الشراء', 'الطلبات', 'السلة', 'فوري'],
    title: { en: 'Checkout / payment failure', ar: 'تعطل الدفع أو إتمام الطلب' },
    causes: {
      en: ['Expired or changed payment-gateway API keys / webhook URL', 'Plugin or theme update broke the checkout page', 'Gateway account restricted or currency / country not enabled'],
      ar: ['مفاتيح API أو رابط webhook لبوابة الدفع منتهية أو تغيّرت', 'تحديث إضافة أو قالب أفسد صفحة الدفع', 'تقييد حساب البوابة أو عدم تفعيل العملة أو الدولة'],
    },
    checks: {
      en: ['Place a test order end-to-end in sandbox mode', 'Read the gateway dashboard logs and webhook deliveries', 'Check the browser console and PHP log on the checkout page'],
      ar: ['تنفيذ طلب تجريبي كامل في وضع الاختبار', 'مراجعة سجلات لوحة البوابة وطلبات الـ webhook', 'فحص Console المتصفح وسجل PHP في صفحة الدفع'],
    },
    fix: { en: 'Reconnect the gateway with valid keys, repair the checkout flow and verify with a real low-value payment.', ar: 'إعادة ربط البوابة بمفاتيح صحيحة وإصلاح مسار الدفع والتحقق بعملية دفع حقيقية صغيرة.' },
  },
  EMAIL: {
    words: ['email', 'e-mail', 'mail', 'smtp', 'inbox', 'contact form', 'الإيميل', 'الايميل', 'البريد', 'رسائل', 'فورم'],
    title: { en: 'E-mails not delivered', ar: 'الرسائل البريدية لا تصل' },
    causes: {
      en: ['Site sends mail through PHP mail() without SMTP', 'Missing SPF / DKIM / DMARC records, so mail lands in spam', 'Mailbox quota or SMTP credentials changed'],
      ar: ['الموقع يرسل عبر PHP mail() بدون SMTP', 'غياب سجلات SPF/DKIM/DMARC فتذهب الرسائل للسبام', 'امتلاء صندوق البريد أو تغيّر بيانات SMTP'],
    },
    checks: {
      en: ['Send a test from the form and trace it in the mail log', 'Check SPF, DKIM and DMARC with an online checker', 'Confirm the SMTP host, port and credentials'],
      ar: ['إرسال تجربة من النموذج وتتبعها في سجل البريد', 'فحص SPF وDKIM وDMARC بأداة أونلاين', 'التأكد من خادم ومنفذ وبيانات SMTP'],
    },
    fix: { en: 'Route mail through authenticated SMTP or a transactional provider and publish the DNS records.', ar: 'إرسال البريد عبر SMTP موثّق أو مزود رسائل وإضافة سجلات DNS المطلوبة.' },
    server: true,
  },
  DATA: {
    words: ['database', 'data', 'lost', 'missing', 'disappeared', 'deleted', 'قاعدة البيانات', 'البيانات', 'اختفت', 'اتمسحت', 'ضاعت', 'محذوف'],
    title: { en: 'Missing or corrupted data', ar: 'بيانات مفقودة أو تالفة' },
    causes: {
      en: ['Accidental deletion or a failed import / migration', 'Database table corruption or a full disk', 'A plugin or sync job overwriting records'],
      ar: ['حذف بالخطأ أو استيراد / ترحيل فاشل', 'تلف في جداول قاعدة البيانات أو امتلاء المساحة', 'إضافة أو مزامنة تكتب فوق السجلات'],
    },
    checks: {
      en: ['Freeze changes and locate the latest good backup', 'Run a table check / repair and compare row counts', 'Review the audit / activity log around the incident'],
      ar: ['إيقاف التعديلات وتحديد آخر نسخة احتياطية سليمة', 'فحص وإصلاح الجداول ومقارنة أعداد السجلات', 'مراجعة سجل النشاط حول وقت المشكلة'],
    },
    fix: { en: 'Restore the affected records from backup without overwriting newer data, then remove the cause.', ar: 'استرجاع السجلات المتأثرة من النسخة الاحتياطية دون مسح البيانات الأحدث ثم إزالة السبب.' },
    server: true,
  },
  INTEGRATION: {
    words: ['api', 'integration', 'webhook', 'sync', 'whatsapp', 'google', 'facebook', 'pixel', 'erp', 'ربط', 'تكامل', 'مزامنة', 'واتساب'],
    title: { en: 'Third-party integration failure', ar: 'تعطل الربط مع خدمة خارجية' },
    causes: {
      en: ['Expired token or revoked API key', 'Provider changed its API version or endpoint', 'Firewall / CORS blocking the request'],
      ar: ['انتهاء التوكن أو إلغاء مفتاح API', 'تغيير المزود لإصدار الـ API أو الرابط', 'جدار حماية أو CORS يمنع الطلب'],
    },
    checks: {
      en: ['Reproduce the call and capture the exact error response', 'Check the provider status page and changelog', 'Verify credentials and callback URLs in the provider dashboard'],
      ar: ['إعادة تنفيذ الطلب والتقاط رسالة الخطأ بالضبط', 'مراجعة صفحة حالة المزود وسجل التغييرات', 'التحقق من بيانات الاعتماد وروابط الـ callback في لوحة المزود'],
    },
    fix: { en: 'Re-authenticate and update the integration to the current API, with error logging and alerts.', ar: 'إعادة التوثيق وتحديث الربط لإصدار الـ API الحالي مع تسجيل الأخطاء والتنبيه.' },
  },
  DESIGN: {
    words: ['design', 'layout', 'mobile', 'responsive', 'css', 'broken page', 'looks', 'menu', 'التصميم', 'الموبايل', 'الشكل', 'متجاوب', 'مكسور', 'المنيو', 'القائمة'],
    title: { en: 'Broken layout / display issue', ar: 'خلل في التصميم أو العرض' },
    causes: {
      en: ['Theme or plugin update changed CSS', 'Missing responsive rules for some screen sizes', 'Cached / minified assets out of date'],
      ar: ['تحديث القالب أو إضافة غيّر ملفات CSS', 'غياب قواعد التجاوب لبعض أحجام الشاشات', 'ملفات مخزنة مؤقتاً أو مضغوطة قديمة'],
    },
    checks: {
      en: ['Reproduce on the devices / browsers the client uses', 'Clear caches and compare with the previous theme version', 'Inspect the failing elements in DevTools'],
      ar: ['إعادة إنتاج المشكلة على الأجهزة والمتصفحات التي يستخدمها العميل', 'مسح الكاش والمقارنة مع إصدار القالب السابق', 'فحص العناصر المعطوبة بأدوات المطور'],
    },
    fix: { en: 'Patch the CSS in a child theme / override so updates do not undo it, then re-test on mobile and desktop.', ar: 'تعديل الـ CSS في قالب فرعي حتى لا تلغيه التحديثات ثم إعادة الاختبار على الجوال والكمبيوتر.' },
  },
  CONTENT: {
    words: ['text', 'image', 'images', 'content', 'price', 'photo', 'banner', 'المحتوى', 'الصور', 'النصوص', 'الأسعار', 'البانر', 'كلام'],
    title: { en: 'Content update needed', ar: 'تحديث المحتوى' },
    causes: {
      en: ['Client cannot find where the content is managed', 'Content hard-coded in the theme', 'Permissions prevent the client from editing'],
      ar: ['العميل لا يعرف مكان إدارة المحتوى', 'المحتوى مكتوب مباشرة داخل القالب', 'الصلاحيات تمنع العميل من التعديل'],
    },
    checks: {
      en: ['Locate where each item is stored (CMS, theme, code)', 'Collect the final texts / images from the client'],
      ar: ['تحديد مكان كل عنصر (لوحة التحكم أو القالب أو الكود)', 'استلام النصوص والصور النهائية من العميل'],
    },
    fix: { en: 'Apply the changes and, where possible, make them editable from the admin panel.', ar: 'تنفيذ التعديلات وجعلها قابلة للتعديل من لوحة التحكم إن أمكن.' },
  },
  FEATURE: {
    words: ['add', 'new feature', 'want to add', 'new page', 'إضافة', 'اضافة', 'ميزة', 'خاصية', 'عايز اضيف', 'صفحة جديدة'],
    title: { en: 'Change request on the existing site', ar: 'طلب تعديل أو إضافة على الموقع الحالي' },
    causes: {
      en: ['This is a change request rather than a fault'],
      ar: ['هذا طلب تطوير وليس عطلاً'],
    },
    checks: {
      en: ['Confirm the exact expected behaviour with the client', 'Check how the current code / platform supports it'],
      ar: ['تأكيد السلوك المطلوب بالضبط مع العميل', 'فحص مدى دعم الكود أو المنصة الحالية له'],
    },
    fix: { en: 'Scope it as a small change, quote it and implement on a staging copy first.', ar: 'تحديد النطاق كتعديل صغير وتسعيره وتنفيذه على نسخة تجريبية أولاً.' },
  },
  BUG: {
    words: ['error', 'bug', 'not working', "doesn't work", 'broken', 'button', 'login', 'form', 'crash', 'blank', 'خطأ', 'مشكلة', 'لا يعمل', 'مش شغال', 'مبيشتغلش', 'زرار', 'زر', 'تسجيل الدخول', 'عطل', 'بايظ', 'صفحة بيضاء'],
    title: { en: 'Functional bug on the live site', ar: 'خلل وظيفي في الموقع' },
    causes: {
      en: ['A recent update (core, plugin, library) introduced a conflict', 'JavaScript error stopping the page script', 'Server-side exception (PHP / Node) on that action'],
      ar: ['تحديث حديث (النواة أو إضافة أو مكتبة) سبب تعارضاً', 'خطأ JavaScript يوقف سكربت الصفحة', 'استثناء في الخادم (PHP / Node) عند هذا الإجراء'],
    },
    checks: {
      en: ['Reproduce the exact steps and note the URL', 'Read the browser console and the server error log at that time', 'Compare with recent updates / deployments'],
      ar: ['إعادة إنتاج الخطوات بالضبط وتسجيل الرابط', 'قراءة Console المتصفح وسجل أخطاء الخادم في نفس الوقت', 'مقارنة ذلك بآخر التحديثات أو عمليات النشر'],
    },
    fix: { en: 'Fix or roll back the offending change on staging, then deploy and re-test the flow.', ar: 'إصلاح التغيير المسبب أو التراجع عنه على نسخة تجريبية ثم النشر وإعادة اختبار المسار.' },
  },
};

const ORDER: FixCategory[] = ['SECURITY', 'HOSTING', 'PAYMENT', 'DATA', 'EMAIL', 'PERFORMANCE', 'INTEGRATION', 'DESIGN', 'FEATURE', 'CONTENT', 'BUG'];

function detectCategory(text: string): FixCategory {
  const t = text.toLowerCase();
  let best: { c: FixCategory; hits: number } | null = null;
  for (const c of ORDER) {
    const hits = RULES[c]!.words.filter((w) => t.includes(w)).length;
    if (hits && (!best || hits > best.hits)) best = { c, hits };
  }
  return best?.c ?? 'OTHER';
}

export function mockFixAnalysis(input: { fix: FixSource; title: string; locale: BriefLocale }): Omit<FixAnalysis, 'generatedAt'> {
  const { fix } = input;
  const ar = input.locale === 'ar';
  const L = ar ? 'ar' : 'en';
  const category = detectCategory(`${fix.problem} ${fix.history ?? ''}`);
  const rule = RULES[category] ?? RULES.BUG!;
  const severity: FixSeverity =
    category === 'SECURITY' || fix.urgency === 'URGENT' ? 'CRITICAL' : category === 'HOSTING' || category === 'PAYMENT' || fix.urgency === 'HIGH' ? 'HIGH' : fix.urgency === 'LOW' ? 'LOW' : 'MEDIUM';
  const platform = fix.platform && fix.platform !== 'unknown' ? fix.platform : ar ? 'غير معروفة' : 'unknown';
  const yes = ar ? 'متوفر' : 'provided';
  const no = ar ? '**ناقص**' : '**missing**';
  const accessRows = [
    [ar ? 'رابط لوحة التحكم' : 'Admin login page', fix.loginUrl],
    [ar ? 'اسم المستخدم' : 'Username', fix.username],
    [ar ? 'كلمة المرور' : 'Password', fix.passwordEnc],
    ...(rule.server || fix.extraAccessEnc ? [[ar ? 'وصول الاستضافة / الخادم' : 'Hosting / server access', fix.extraAccessEnc]] : []),
  ] as [string, unknown][];
  const questions = ar
    ? [
        !fix.history?.trim() && 'متى بدأت المشكلة بالضبط؟ وهل تغيّر شيء قبلها (تحديث، إضافة، تغيير استضافة)؟',
        'ما الخطوات التي تؤدي للمشكلة؟ وعلى أي جهاز ومتصفح؟',
        'هل تظهر رسالة خطأ؟ يُرجى إرفاق لقطة شاشة.',
        'هل المشكلة عند كل الزوار أم عند بعضهم فقط؟',
      ]
    : [
        !fix.history?.trim() && 'When exactly did it start, and did anything change just before (update, new plugin, host change)?',
        'What are the exact steps that trigger it, and on which device / browser?',
        'Is there an error message? Please attach a screenshot.',
        'Does it happen for every visitor or only some?',
      ];
  const lines = [
    ar ? '_تحليل تلقائي (وضع العرض — اربط Gemini للحصول على تحليل أدق)._' : '_Automatic triage (demo mode — connect Gemini for a sharper analysis)._',
    '',
    ar ? '## 1. الملخص التقني' : '## 1. Technical summary',
    ar
      ? `${rule.title.ar} على ${fix.siteUrl} (المنصة: ${platform}).`
      : `${rule.title.en} on ${fix.siteUrl} (platform: ${platform}).`,
    '',
    ar ? '## 2. ما أبلغ عنه العميل' : '## 2. What the client reported',
    `> ${fix.problem.trim().replace(/\n+/g, '\n> ').slice(0, 1500)}`,
    ...(fix.history?.trim() ? ['', `**${ar ? 'السياق' : 'Context'}:** ${fix.history.trim().slice(0, 800)}`] : []),
    '',
    ar ? '## 3. الجزء المتأثر' : '## 3. Affected area',
    `- ${rule.title[L]}`,
    '',
    ar ? '## 4. الأسباب المحتملة' : '## 4. Probable causes',
    ...rule.causes[L].map((c, i) => `${i + 1}. ${c}`),
    '',
    ar ? '## 5. خطة التشخيص' : '## 5. Diagnostic plan',
    ...rule.checks[L].map((c) => `- ${c}`),
    '',
    ar ? '## 6. الحل المقترح' : '## 6. Proposed fix',
    rule.fix[L],
    '',
    ar ? '## 7. الصلاحيات والمعلومات المطلوبة' : '## 7. Access & information needed',
    ...accessRows.map(([label, v]) => `- **${label}:** ${v ? yes : no}`),
    '',
    ar ? '## 8. أسئلة للعميل' : '## 8. Questions for the client',
    ...questions.filter(Boolean).map((q) => `- ${q}`),
    '',
    ar ? '## 9. المخاطر والاحتياطات' : '## 9. Risks & precautions',
    ar
      ? '- أخذ نسخة احتياطية كاملة قبل أي تعديل على الموقع الحي، والعمل على نسخة تجريبية متى أمكن.'
      : '- Take a full backup before changing the live site and work on a staging copy when possible.',
  ];
  const hours: Record<string, number> = { SECURITY: 8, HOSTING: 3, PAYMENT: 5, DATA: 6, EMAIL: 3, PERFORMANCE: 6, INTEGRATION: 5, DESIGN: 3, FEATURE: 8, CONTENT: 2, BUG: 4, OTHER: 4 };
  return {
    technicalTitle: rule.title[L],
    category,
    severity,
    estimateHours: hours[category] ?? 4,
    text: lines.join('\n'),
  };
}
