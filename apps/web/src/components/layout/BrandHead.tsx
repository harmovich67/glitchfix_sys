import { useEffect } from 'react';
import { useLocation } from 'react-router';
import { usePublicSettings } from '../../lib/brand';
import { useI18n } from '../../lib/i18n';

const JSON_LD_ID = 'brand-jsonld';

function meta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!content) return el?.remove();
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function link(rel: string, href: string, extra: Record<string, string> = {}) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!href) return el?.remove();
  if (!el) {
    el = document.createElement('link');
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  ['type'].forEach((k) => el!.removeAttribute(k));
  Object.entries(extra).forEach(([k, v]) => el!.setAttribute(k, v));
}

/** Route → navigation label, so browser tabs read "Projects · Acme" rather than the same title everywhere. */
const APP_TITLES: [string, string][] = [
  ['/app/projects', 'nav.projects'],
  ['/app/clients', 'nav.clients'],
  ['/app/team', 'nav.team'],
  ['/app/analytics', 'nav.analytics'],
  ['/app/moderation', 'nav.moderation'],
  ['/app/time-off', 'nav.timeOff'],
  ['/app/notifications', 'nav.notifications'],
  ['/app/settings', 'nav.settings'],
  ['/app/workflows', 'nav.workflows'],
  ['/app/ai', 'nav.ai'],
  ['/app/audit', 'nav.audit'],
  ['/app/reports', 'report.title'],
];

/**
 * Keeps <head> in step with the brand and SEO settings: title, description, canonical, robots,
 * Open Graph / Twitter cards, favicon and structured data. The private dashboard is always noindex.
 */
export function BrandHead() {
  const { pathname } = useLocation();
  const { locale, brand, t } = useI18n();
  const pub = usePublicSettings();
  const seo = pub.data?.seo;
  const contact = pub.data?.contact;

  useEffect(() => {
    const ar = locale === 'ar';
    const pick = (en?: string, arabic?: string) => (ar ? arabic || en : en || arabic) ?? '';
    const isHome = pathname === '/';
    const isAuth = pathname === '/login' || pathname === '/register';
    const isApp = pathname.startsWith('/app');
    const indexable = seo?.indexable !== false;
    const site = (seo?.siteUrl || window.location.origin).replace(/\/+$/, '');
    const abs = (u: string) => (!u ? '' : /^https?:\/\//.test(u) ? u : `${site}${u.startsWith('/') ? '' : '/'}${u}`);

    const homeTitle = pick(seo?.titleEn, seo?.titleAr) || (brand.tagline ? `${brand.name} · ${brand.tagline}` : brand.name);
    const appLabel = APP_TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? (isApp ? 'nav.dashboard' : '');
    const title = isHome
      ? homeTitle
      : pathname === '/login'
        ? `${t('auth.login')} · ${brand.name}`
        : pathname === '/register'
          ? `${t('auth.register')} · ${brand.name}`
          : appLabel
            ? `${t(appLabel)} · ${brand.name}`
            : homeTitle;
    const description = pick(seo?.descriptionEn, seo?.descriptionAr) || (brand.tagline ? `${brand.name} — ${brand.tagline}` : brand.name);
    const keywords = pick(seo?.keywordsEn, seo?.keywordsAr);
    const robots = !indexable || isApp ? 'noindex,nofollow' : isAuth ? 'noindex,follow' : 'index,follow,max-image-preview:large';
    const canonical = !isApp && indexable ? `${site}${isHome ? '/' : pathname}` : '';
    const image = abs(seo?.ogImage ?? '');
    const handle = seo?.twitterHandle ? `@${seo.twitterHandle.replace(/^@/, '')}` : '';

    document.title = title;
    document.documentElement.setAttribute('data-brand', brand.name);
    meta('name', 'description', description);
    meta('name', 'keywords', isHome ? keywords : '');
    meta('name', 'robots', robots);
    meta('name', 'application-name', brand.name);
    meta('name', 'apple-mobile-web-app-title', brand.name);
    link('canonical', canonical);
    link('icon', brand.faviconUrl || '/favicon.svg', brand.faviconUrl ? {} : { type: 'image/svg+xml' });

    // Open Graph & Twitter (what link previews use).
    meta('property', 'og:type', 'website');
    meta('property', 'og:site_name', brand.name);
    meta('property', 'og:title', title);
    meta('property', 'og:description', description);
    meta('property', 'og:url', canonical);
    meta('property', 'og:image', image);
    meta('property', 'og:image:alt', image ? brand.name : '');
    meta('property', 'og:locale', ar ? 'ar_AR' : 'en_US');
    meta('property', 'og:locale:alternate', ar ? 'en_US' : 'ar_AR');
    meta('name', 'twitter:card', image ? 'summary_large_image' : 'summary');
    meta('name', 'twitter:title', title);
    meta('name', 'twitter:description', description);
    meta('name', 'twitter:image', image);
    meta('name', 'twitter:site', handle);

    // Structured data for the public home page only.
    document.getElementById(JSON_LD_ID)?.remove();
    if (isHome && indexable) {
      const sameAs = [contact?.twitter, contact?.linkedin, contact?.instagram, contact?.github].filter((u): u is string => !!u && /^https?:\/\//.test(u));
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.id = JSON_LD_ID;
      script.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            name: brand.name,
            url: `${site}/`,
            ...(image || brand.logoUrl ? { logo: abs(brand.logoUrl || seo?.ogImage || '') } : {}),
            ...(contact?.email ? { email: contact.email } : {}),
            ...(contact?.phone ? { telephone: contact.phone } : {}),
            ...(sameAs.length ? { sameAs } : {}),
          },
          { '@type': 'WebSite', name: brand.name, url: `${site}/`, description, inLanguage: ['en', 'ar'] },
        ],
      }).replace(/</g, '\\u003c');
      document.head.appendChild(script);
    }
  }, [pathname, locale, brand, seo, contact, t]);

  return null;
}
