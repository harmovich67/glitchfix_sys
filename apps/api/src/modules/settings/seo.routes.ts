import { Router } from 'express';
import { env } from '../../config/env';
import { settingsService } from './settings.service';

/**
 * Crawler-facing files generated from the SEO settings. Serve them at the site root
 * (`/robots.txt`, `/sitemap.xml`) by proxying to these routes — the Vite dev server already does.
 */
export const seoRoutes = Router();

const siteUrl = (configured: string) => (configured || env.WEB_ORIGIN).replace(/\/+$/, '');

seoRoutes.get('/robots.txt', async (_req, res) => {
  const { seo } = await settingsService.get();
  const site = siteUrl(seo.siteUrl);
  const lines = seo.indexable
    ? ['User-agent: *', 'Allow: /', 'Disallow: /app', 'Disallow: /api', '', `Sitemap: ${site}/sitemap.xml`]
    : ['User-agent: *', 'Disallow: /'];
  res.type('text/plain').set('Cache-Control', 'public, max-age=300').send(`${lines.join('\n')}\n`);
});

seoRoutes.get('/sitemap.xml', async (_req, res) => {
  const { seo, allowClientRegistration } = await settingsService.get();
  const site = siteUrl(seo.siteUrl);
  // Only the public marketing pages belong here; the dashboard is private.
  const pages = seo.indexable ? [{ path: '/', priority: '1.0' }, ...(allowClientRegistration ? [{ path: '/register', priority: '0.5' }] : [])] : [];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    pages.map((p) => `  <url><loc>${site}${p.path === '/' ? '/' : p.path}</loc><changefreq>weekly</changefreq><priority>${p.priority}</priority></url>`).join('\n') +
    `\n</urlset>\n`;
  res.type('application/xml').set('Cache-Control', 'public, max-age=300').send(xml);
});
