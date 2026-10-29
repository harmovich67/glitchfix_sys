/**
 * Crawler-visible markup for the public home page.
 *
 * The app is a client-rendered SPA, so anything that reads the raw HTML (site auditors, link-preview bots,
 * search engines that do not run scripts) used to see an empty page. `vite.config.ts` injects what this
 * module renders into `index.html` at build time: head tags (canonical, Open Graph, Twitter, JSON-LD,
 * analytics) and a real content block inside `#root` that React replaces on mount.
 *
 * Everything the owner is expected to change lives in `SITE` below.
 */

import { PROJECTS, TESTIMONIALS, WORK } from './content';

export interface SiteConfig {
  url: string;
  nameEn: string;
  nameAr: string;
  email: string;
  phone: string;
  whatsapp: string;
  /** Optional booking page (Calendly, Cal.com…). Falls back to a pre-filled WhatsApp message. */
  bookingUrl: string;
  addressEn: string;
  addressAr: string;
  social: { label: string; url: string }[];
  /** Google Analytics 4 measurement id, e.g. G-XXXXXXXXXX. */
  gaId: string;
  /** Google Tag Manager container id, e.g. GTM-XXXXXXX. */
  gtmId: string;
}

const env = (key: string, fallback = '') => (process.env[key] ?? '').trim() || fallback;

export function resolveSite(): SiteConfig {
  const vercelHost = env('VERCEL_PROJECT_PRODUCTION_URL');
  const url = (env('VITE_SITE_URL') || (vercelHost ? `https://${vercelHost}` : 'https://glitchfixsys.vercel.app')).replace(/\/+$/, '');
  const social = [
    { label: 'X / Twitter', url: env('VITE_SOCIAL_X', 'https://x.com') },
    { label: 'LinkedIn', url: env('VITE_SOCIAL_LINKEDIN', 'https://linkedin.com') },
    { label: 'Facebook', url: env('VITE_SOCIAL_FACEBOOK') },
    { label: 'Instagram', url: env('VITE_SOCIAL_INSTAGRAM') },
    { label: 'GitHub', url: env('VITE_SOCIAL_GITHUB', 'https://github.com') },
  ].filter((s) => /^https?:\/\//.test(s.url));
  return {
    url,
    nameEn: 'GlitchFix',
    nameAr: 'جليتش فيكس',
    email: env('VITE_CONTACT_EMAIL', 'saidd.mahmoud4@gmail.com'),
    phone: env('VITE_CONTACT_PHONE', '+20 102 259 6130'),
    whatsapp: env('VITE_CONTACT_WHATSAPP', '+201022596130'),
    bookingUrl: env('VITE_BOOKING_URL'),
    addressEn: env('VITE_CONTACT_ADDRESS_EN', 'Egypt'),
    addressAr: env('VITE_CONTACT_ADDRESS_AR', 'مصر'),
    social,
    gaId: env('VITE_GA_ID'),
    gtmId: env('VITE_GTM_ID'),
  };
}

const TITLE = 'GlitchFix · جليتش فيكس — Digital projects, systems and fixes';
const DESCRIPTION =
  'GlitchFix turns your project idea into a clear AI-written brief and fixes live websites. جليتش فيكس: متطلبات المشاريع الرقمية وإصلاح المواقع.';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const digits = (s: string) => s.replace(/\D/g, '');

export function renderHead(site: SiteConfig): string {
  const home = `${site.url}/`;
  const logo = `${site.url}/icons/icon-512.png`;
  const image = `${site.url}/og-image.png`;
  const sameAs = site.social.map((s) => s.url);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${home}#organization`,
        name: site.nameEn,
        alternateName: site.nameAr,
        url: home,
        logo,
        email: site.email,
        telephone: site.phone,
        ...(sameAs.length ? { sameAs } : {}),
        contactPoint: [{ '@type': 'ContactPoint', contactType: 'customer support', email: site.email, telephone: site.phone, availableLanguage: ['English', 'Arabic'] }],
      },
      { '@type': 'WebSite', '@id': `${home}#website`, url: home, name: site.nameEn, description: DESCRIPTION, inLanguage: ['en', 'ar'], publisher: { '@id': `${home}#organization` } },
      {
        '@type': 'ProfessionalService',
        '@id': `${home}#service`,
        name: site.nameEn,
        url: home,
        image,
        description: DESCRIPTION,
        areaServed: 'Worldwide',
        address: { '@type': 'PostalAddress', addressLocality: site.addressEn },
        provider: { '@id': `${home}#organization` },
        hasOfferCatalog: {
          '@type': 'OfferCatalog',
          name: 'Services',
          itemListElement: WORK.map((w) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: w.en, description: w.en2 } })),
        },
      },
    ],
  };

  const lines = [
    `<meta name="robots" content="index,follow,max-image-preview:large" />`,
    `<link rel="canonical" href="${esc(home)}" />`,
    `<link rel="alternate" hreflang="en" href="${esc(home)}" />`,
    `<link rel="alternate" hreflang="ar" href="${esc(home)}" />`,
    `<link rel="alternate" hreflang="x-default" href="${esc(home)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${esc(site.nameEn)}" />`,
    `<meta property="og:title" content="${esc(TITLE)}" />`,
    `<meta property="og:description" content="${esc(DESCRIPTION)}" />`,
    `<meta property="og:url" content="${esc(home)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:alt" content="${esc(site.nameEn)}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:locale:alternate" content="ar_AR" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(TITLE)}" />`,
    `<meta name="twitter:description" content="${esc(DESCRIPTION)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    // Same id BrandHead.tsx uses, so the app replaces this block with the one built from live settings.
    `<script type="application/ld+json" id="brand-jsonld">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`,
    // Vercel Web Analytics (reports once enabled in the project dashboard; a harmless 404 before that).
    `<script>window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };</script>`,
    `<script defer src="/_vercel/insights/script.js"></script>`,
  ];
  if (site.gtmId) {
    lines.push(
      `<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${esc(site.gtmId)}');</script>`,
    );
  }
  if (site.gaId) {
    lines.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(site.gaId)}"></script>`,
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(site.gaId)}');</script>`,
    );
  }
  return lines.map((l) => `    ${l}`).join('\n');
}

export function renderBody(site: SiteConfig): string {
  const wa = digits(site.whatsapp);
  const waLink = (text: string) => `https://wa.me/${wa}?text=${encodeURIComponent(text)}`;
  const bookEn = site.bookingUrl || (wa ? waLink('Hello GlitchFix, I would like to book a call.') : `mailto:${site.email}?subject=Book%20a%20call`);
  const bookAr = site.bookingUrl || (wa ? waLink('مرحباً جليتش فيكس، أرغب في حجز موعد.') : `mailto:${site.email}?subject=حجز%20موعد`);
  const social = site.social.map((s) => `<a href="${esc(s.url)}" rel="me noopener" target="_blank">${esc(s.label)}</a>`).join(' · ');
  const external = (href: string, label: string) => `<a href="${esc(href)}" rel="noopener" target="_blank">${esc(label)}</a>`;

  return `
      <style>
        #seo-fallback{max-width:960px;margin:0 auto;padding:32px 20px 64px;color:#e5e7f5;background:#06070f;font:16px/1.7 Inter,'IBM Plex Sans Arabic',system-ui,sans-serif}
        #seo-fallback a{color:#67e8f9}#seo-fallback h1{font-size:34px;line-height:1.2;margin:0 0 12px}
        #seo-fallback h2{font-size:22px;margin:36px 0 10px}#seo-fallback h3{font-size:17px;margin:16px 0 4px}
        #seo-fallback .cta a{display:inline-block;margin:6px 8px 6px 0;padding:10px 18px;border-radius:12px;background:#22d3ee;color:#06070f;font-weight:700;text-decoration:none}
        #seo-fallback .cta a.alt{background:transparent;color:#67e8f9;border:1px solid #67e8f9}
        #seo-fallback blockquote{margin:10px 0;padding:8px 16px;border-inline-start:3px solid #22d3ee}
      </style>
      <main id="seo-fallback">
        <section lang="en" dir="ltr">
          <h1>Project briefs and website fixes for business owners and agencies</h1>
          <p>${esc(site.nameEn)} is a digital projects, systems and issue-management platform. Describe what you want to build in plain words; our AI consultant asks the right follow-up questions, suggests missing features and hands your developers a structured requirements document they can estimate and start on. Already have a website with a problem? Report it and get a clear diagnosis and fix plan.</p>
          <p class="cta">
            <a href="/register">Start your project free</a>
            <a class="alt" href="${esc(bookEn)}" rel="noopener">Book a call</a>
            <a class="alt" href="${wa ? esc(waLink('Hello GlitchFix, I have a question about my project.')) : `mailto:${esc(site.email)}`}" rel="noopener">Chat on WhatsApp</a>
            <a class="alt" href="/login">Sign in</a>
          </p>

          <h2>How ${esc(site.nameEn)} works</h2>
          <ol>
            <li><strong>Describe your idea.</strong> Pick the type of project — store, booking system, SaaS, company website — and answer guided visual questions instead of filling a long form.</li>
            <li><strong>Review the brief.</strong> The AI consultant structures your answers into scope, features, roles and a wireframe, and you approve a clear proposal with a price and timeline.</li>
            <li><strong>Track delivery.</strong> Follow tasks on a board, exchange files and messages in one thread, and see every status change as it happens.</li>
            <li><strong>Fix what breaks.</strong> Submit a repair request for an existing website; the team receives an AI triage report with probable causes and a diagnostic plan.</li>
          </ol>

          <h2 id="portfolio">Our work and projects</h2>
          <p>The kinds of projects teams run through ${esc(site.nameEn)} today. Browse a visual walkthrough in the <a href="/showcase.html">project showcase</a>.</p>
          <ul>${WORK.map((w) => `<li><h3>${esc(w.en)}</h3><p>${esc(w.en2)}</p></li>`).join('')}</ul>
          <h3>Live projects</h3>
          <ul>${PROJECTS.map((p) => `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.nameEn)}</a> — ${esc(p.descEn)}</li>`).join('')}</ul>

          <h2 id="testimonials">Client reviews and testimonials</h2>
          ${TESTIMONIALS.map((q) => `<blockquote><p>“${esc(q.en)}”</p><footer>— ${esc(q.who.split(' · ')[0])}</footer></blockquote>`).join('')}

          <h2>Contact us</h2>
          <ul>
            <li>Email: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>
            <li>Phone: <a href="tel:${esc(digits(site.phone) ? '+' + digits(site.phone) : site.phone)}">${esc(site.phone)}</a></li>
            ${wa ? `<li>WhatsApp: ${external(waLink('Hello GlitchFix'), site.whatsapp)}</li>` : ''}
            <li>Location: ${esc(site.addressEn)}</li>
          </ul>
          ${social ? `<p>Follow us: ${social}</p>` : ''}
        </section>

        <section lang="ar" dir="rtl">
          <h2>${esc(site.nameAr)} — حوّل فكرة مشروعك إلى مواصفات واضحة ثم نفّذها وأصلح أعطالها</h2>
          <p>${esc(site.nameAr)} منصة لإدارة المشاريع الرقمية والأنظمة ومتابعة الأعطال. اشرح فكرتك بكلماتك البسيطة فيسألك المستشار الذكي الأسئلة المناسبة ويقترح الميزات الناقصة ويسلّم فريق البرمجة وثيقة متطلبات منظمة جاهزة للتسعير والتنفيذ. وإن كان لديك موقع قائم به مشكلة فأبلغ عنها لتحصل على تشخيص وخطة إصلاح واضحة.</p>
          <p class="cta">
            <a href="/register">ابدأ مشروعك مجاناً</a>
            <a class="alt" href="${esc(bookAr)}" rel="noopener">احجز موعداً</a>
            <a class="alt" href="${wa ? esc(waLink('مرحباً جليتش فيكس، لدي استفسار عن مشروعي.')) : `mailto:${esc(site.email)}`}" rel="noopener">تواصل عبر واتساب</a>
            <a class="alt" href="/login">تسجيل الدخول</a>
          </p>

          <h2>أعمالنا ومشاريعنا</h2>
          <ul>${WORK.map((w) => `<li><h3>${esc(w.ar)}</h3><p>${esc(w.ar2)}</p></li>`).join('')}</ul>
          <h3>مشاريع منشورة</h3>
          <ul>${PROJECTS.map((p) => `<li><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.nameAr)}</a> — ${esc(p.descAr)}</li>`).join('')}</ul>

          <h2>آراء العملاء</h2>
          ${TESTIMONIALS.map((q) => `<blockquote><p>«${esc(q.ar)}»</p><footer>— ${esc(q.who.split(' · ')[1] ?? q.who)}</footer></blockquote>`).join('')}

          <h2>تواصل معنا</h2>
          <ul>
            <li>البريد الإلكتروني: <a href="mailto:${esc(site.email)}">${esc(site.email)}</a></li>
            <li>الهاتف: <a href="tel:${esc(digits(site.phone) ? '+' + digits(site.phone) : site.phone)}" dir="ltr">${esc(site.phone)}</a></li>
            ${wa ? `<li>واتساب: ${external(waLink('مرحباً جليتش فيكس'), site.whatsapp)}</li>` : ''}
            <li>الموقع: ${esc(site.addressAr)}</li>
          </ul>
          ${social ? `<p>تابعنا على: ${social}</p>` : ''}
        </section>
        <noscript><p>JavaScript is required to use the ${esc(site.nameEn)} dashboard.</p></noscript>
      </main>
    `;
}

export const META = { title: TITLE, description: DESCRIPTION };
