/** Copy shared by the crawler-visible HTML (static-seo.ts) and the React landing page. Keep it free of Node APIs. */

/** Real offerings, taken from what the platform does today. */
export const WORK = [
  { en: 'E-commerce stores', ar: 'المتاجر الإلكترونية', en2: 'Catalogue, cart, checkout and payment-gateway requirements written down before a line of code.', ar2: 'متطلبات الكتالوج والسلة والدفع وبوابات السداد موثّقة قبل كتابة أي كود.' },
  { en: 'Booking systems', ar: 'أنظمة الحجوزات', en2: 'Scheduling rules, reminders and staff calendars mapped into tickets your developers can pick up.', ar2: 'قواعد الجدولة والتذكيرات وتقويمات الفريق محوّلة إلى مهام جاهزة للمطورين.' },
  { en: 'SaaS platforms & dashboards', ar: 'منصات SaaS ولوحات التحكم', en2: 'Roles, workflows and reports scoped as a structured requirements document with a delivery board.', ar2: 'الأدوار ومسارات العمل والتقارير محددة في وثيقة متطلبات مع لوحة متابعة للتسليم.' },
  { en: 'Website repairs', ar: 'إصلاح المواقع القائمة', en2: 'Report a problem on a live site; AI triage ranks the likely causes and the team answers with a fix plan.', ar2: 'أبلغ عن مشكلة في موقعك الحالي ويقوم الذكاء الاصطناعي بترتيب الأسباب ويرد الفريق بخطة إصلاح.' },
];

/**
 * Sample quotes so the section exists on first deploy. They are NOT real customers:
 * replace them with genuine feedback (name, company, permission) before promoting the site.
 */
export const TESTIMONIALS = [
  { en: 'We stopped sending long voice notes. The brief we got back was something our developer could estimate the same day.', ar: 'توقفنا عن إرسال الرسائل الصوتية الطويلة. وصلتنا وثيقة استطاع المطور تسعيرها في نفس اليوم.', who: 'Online store owner · صاحب متجر إلكتروني' },
  { en: 'Our checkout broke after a plugin update. The fix request showed exactly what was needed and we always knew the status.', ar: 'تعطل الدفع عندنا بعد تحديث إضافة. طلب الإصلاح وضّح المطلوب بدقة وكنا نعرف الحالة دائماً.', who: 'Clinic manager · مدير عيادة' },
  { en: 'Proposals, files and messages live in one place per project, so nothing gets lost between WhatsApp and email.', ar: 'العروض والملفات والرسائل في مكان واحد لكل مشروع فلا يضيع شيء بين واتساب والبريد.', who: 'Agency founder · مؤسس وكالة' },
];

export interface Project {
  nameEn: string;
  nameAr: string;
  url: string;
  descEn: string;
  descAr: string;
}

/** Live projects shown in the portfolio section. */
export const PROJECTS: Project[] = [
  { nameEn: 'WORKORA', nameAr: 'ووركورا', url: 'https://mesahat.vercel.app/', descEn: 'Booking platform for coworking spaces, meeting rooms and private offices in Egypt, by the hour or day.', descAr: 'منصة حجز مساحات العمل المشتركة وقاعات الاجتماعات والمكاتب الخاصة في مصر بالساعة أو اليوم.' },
  { nameEn: 'Wameed Programming Academy', nameAr: 'أكاديمية وَمِيض للبرمجة', url: 'https://wamid-omega.vercel.app/', descEn: 'Interactive learning journey from computer basics to building real projects.', descAr: 'رحلة تعلّم تفاعلية من أساسيات الحاسوب إلى بناء مشاريع حقيقية.' },
  { nameEn: 'PharmaMarket POS Pro', nameAr: 'فارما ماركت كاشير', url: 'https://pos-sys-omega.vercel.app/', descEn: 'Point-of-sale system for pharmacies.', descAr: 'نظام كاشير ونقاط بيع للصيدليات.' },
  { nameEn: 'GlitchFix', nameAr: 'جليتش فيكس', url: 'https://glitchfixsys.vercel.app/', descEn: 'Digital projects, systems and issue-management platform — this site.', descAr: 'منصة إدارة المشاريع الرقمية والأنظمة ومتابعة الأعطال — هذا الموقع.' },
  { nameEn: 'Blato', nameAr: 'بلاتو', url: 'https://blato.42web.io/', descEn: 'A complete news platform with interactive features that keep readers engaged with every story.', descAr: 'منصة أخبار متكاملة بتفاعلات تُشرك القارئ مع كل خبر.' },
  { nameEn: 'Zaker', nameAr: 'ذاكر', url: 'https://ser.42web.io/zaker/', descEn: 'An AI-powered Islamic companion: daily adhkar review, Islamic research, hadith and fiqh search.', descAr: 'تطبيق إسلامي مدعوم بالذكاء الاصطناعي: مراجعة الأذكار، والبحث الإسلامي، والأحاديث، والفقه.' },
  { nameEn: 'Mozawed', nameAr: 'مزوّد', url: 'https://mozawed.gt.tc/', descEn: 'An all-in-one platform for building online stores and websites, smoothly and with the best tools.', descAr: 'منصة متكاملة لبناء المتاجر الإلكترونية والمواقع بأفضل طريقة وبسلاسة تامة.' },
  { nameEn: 'CVCret', nameAr: 'سي في كريت', url: 'https://ser.42web.io/cvcret/', descEn: 'A free, AI-assisted CV builder that turns your experience into a polished, professional résumé.', descAr: 'منصة مجانية لبناء السيرة الذاتية بمساعدة الذكاء الاصطناعي لتخرج بشكل احترافي مميز.' },
  { nameEn: 'Harmulizer', nameAr: 'هارمولايزر', url: 'https://harmulizer.freedev.app/', descEn: 'A desktop app for managing WordPress sites: create a new site or upload and deploy one in under a minute.', descAr: 'برنامج سطح مكتب لإدارة مواقع ووردبريس: أنشئ موقعاً جديداً أو ارفع موقعك ونفّذ كل الإدارة في أقل من دقيقة.' },
];
