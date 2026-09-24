import { useEffect, useMemo, useState } from 'react';
import { Globe, ImageIcon, Save, Search, Sparkles } from 'lucide-react';
import type { BrandSettings, PlatformSettings, SeoSettings } from '@welco/shared';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Field, Input, SegmentedControl, Switch, Textarea } from '../../components/ui/form';
import { Card, CardHeader } from '../../components/ui/surfaces';

const BRAND_DEFAULT: BrandSettings = { nameEn: 'Welco', nameAr: 'ويلكو', taglineEn: '', taglineAr: '', logoUrl: '', faviconUrl: '' };
const SEO_DEFAULT: SeoSettings = {
  titleEn: '', titleAr: '', descriptionEn: '', descriptionAr: '', keywordsEn: '', keywordsAr: '',
  siteUrl: '', ogImage: '', twitterHandle: '', indexable: true,
};

/** Recommended lengths before search engines truncate the snippet. */
const TITLE_MAX = 60;
const DESC_MAX = 160;

function Counter({ value, max }: { value: string; max: number }) {
  return <span className={cn('text-[11px] tabular-nums', value.length > max ? 'text-warning' : 'text-muted')}>{value.length}/{max}</span>;
}

/** Platform name + SEO: what the site, dashboard, e-mails, browser tabs and link previews call the product. */
export function BrandSeoCard({ settings, onSave, isPending }: { settings: PlatformSettings; onSave: (s: PlatformSettings) => void; isPending: boolean }) {
  const { locale } = useI18n();
  const ar = locale === 'ar';
  const L = (en: string, a: string) => (ar ? a : en);

  const [brand, setBrand] = useState<BrandSettings>({ ...BRAND_DEFAULT, ...settings.brand });
  const [seo, setSeo] = useState<SeoSettings>({ ...SEO_DEFAULT, ...settings.seo });
  const [lang, setLang] = useState<'en' | 'ar'>(locale);
  useEffect(() => {
    setBrand({ ...BRAND_DEFAULT, ...settings.brand });
    setSeo({ ...SEO_DEFAULT, ...settings.seo });
  }, [settings.brand, settings.seo]);

  const dirty = useMemo(
    () => JSON.stringify({ brand, seo }) !== JSON.stringify({ brand: { ...BRAND_DEFAULT, ...settings.brand }, seo: { ...SEO_DEFAULT, ...settings.seo } }),
    [brand, seo, settings.brand, settings.seo],
  );

  const name = lang === 'ar' ? brand.nameAr || brand.nameEn : brand.nameEn || brand.nameAr;
  const tagline = lang === 'ar' ? brand.taglineAr || brand.taglineEn : brand.taglineEn || brand.taglineAr;
  const title = (lang === 'ar' ? seo.titleAr || seo.titleEn : seo.titleEn || seo.titleAr) || (tagline ? `${name} · ${tagline}` : name);
  const description = (lang === 'ar' ? seo.descriptionAr || seo.descriptionEn : seo.descriptionEn || seo.descriptionAr) || (tagline ? `${name} — ${tagline}` : name);
  const site = (seo.siteUrl || 'https://your-site.com').replace(/\/+$/, '');
  const b = <K extends keyof BrandSettings>(k: K) => (e: React.ChangeEvent<HTMLInputElement>) => setBrand({ ...brand, [k]: e.target.value });
  const s = <K extends keyof SeoSettings>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSeo({ ...seo, [k]: e.target.value });

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title={L('Platform name & SEO', 'اسم المنصة وبيانات السيو')}
        description={L('The name shown across the site, dashboard, e-mails and the AI assistant, plus how search engines and link previews present you.', 'الاسم الذي يظهر في الموقع ولوحة التحكم والبريد والمساعد الذكي، وكيف تعرضك محركات البحث ومعاينات الروابط.')}
        icon={<Sparkles className="size-4" />}
      />
      <div className="grid gap-8 px-5 pb-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-8">
          {/* Brand */}
          <section className="space-y-4">
            <h4 className="text-[13px] font-semibold">{L('Brand', 'الهوية')}</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L('Name (English)', 'الاسم (English)')} required><Input value={brand.nameEn} onChange={b('nameEn')} maxLength={40} /></Field>
              <Field label={L('Name (Arabic)', 'الاسم (عربي)')} required><Input value={brand.nameAr} onChange={b('nameAr')} maxLength={40} dir="rtl" /></Field>
              <Field label={L('Tagline (English)', 'الوصف المختصر (English)')}><Input value={brand.taglineEn} onChange={b('taglineEn')} maxLength={120} /></Field>
              <Field label={L('Tagline (Arabic)', 'الوصف المختصر (عربي)')}><Input value={brand.taglineAr} onChange={b('taglineAr')} maxLength={120} dir="rtl" /></Field>
              <Field label={L('Logo URL', 'رابط الشعار')} hint={L('Square image, https:// link or /path. Empty keeps the built-in mark.', 'صورة مربعة، رابط https:// أو مسار /. اتركه فارغاً لاستخدام الشعار الافتراضي.')}>
                <Input value={brand.logoUrl} onChange={b('logoUrl')} dir="ltr" placeholder="https://…/logo.png" icon={<ImageIcon className="size-4" />} />
              </Field>
              <Field label={L('Favicon URL', 'رابط الأيقونة (Favicon)')} hint={L('PNG, SVG or ICO. Empty keeps the default.', 'PNG أو SVG أو ICO. اتركه فارغاً للأيقونة الافتراضية.')}>
                <Input value={brand.faviconUrl} onChange={b('faviconUrl')} dir="ltr" placeholder="https://…/favicon.png" />
              </Field>
            </div>
          </section>

          {/* SEO */}
          <section className="space-y-4">
            <h4 className="text-[13px] font-semibold">{L('Search & sharing', 'محركات البحث والمشاركة')}</h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={L('Home title (English)', 'عنوان الصفحة الرئيسية (English)')} hint={<Counter value={seo.titleEn} max={TITLE_MAX} />}>
                <Input value={seo.titleEn} onChange={s('titleEn')} maxLength={70} />
              </Field>
              <Field label={L('Home title (Arabic)', 'عنوان الصفحة الرئيسية (عربي)')} hint={<Counter value={seo.titleAr} max={TITLE_MAX} />}>
                <Input value={seo.titleAr} onChange={s('titleAr')} maxLength={70} dir="rtl" />
              </Field>
              <Field label={L('Description (English)', 'الوصف (English)')} hint={<Counter value={seo.descriptionEn} max={DESC_MAX} />}>
                <Textarea value={seo.descriptionEn} onChange={s('descriptionEn')} maxLength={200} className="min-h-24" />
              </Field>
              <Field label={L('Description (Arabic)', 'الوصف (عربي)')} hint={<Counter value={seo.descriptionAr} max={DESC_MAX} />}>
                <Textarea value={seo.descriptionAr} onChange={s('descriptionAr')} maxLength={200} className="min-h-24" dir="rtl" />
              </Field>
              <Field label={L('Keywords (English)', 'الكلمات المفتاحية (English)')} hint={L('Comma separated.', 'افصل بينها بفاصلة.')}>
                <Input value={seo.keywordsEn} onChange={s('keywordsEn')} maxLength={300} />
              </Field>
              <Field label={L('Keywords (Arabic)', 'الكلمات المفتاحية (عربي)')} hint={L('Comma separated.', 'افصل بينها بفاصلة.')}>
                <Input value={seo.keywordsAr} onChange={s('keywordsAr')} maxLength={300} dir="rtl" />
              </Field>
              <Field label={L('Site address', 'عنوان الموقع')} hint={L('Used for canonical links, the sitemap and social cards.', 'يُستخدم للرابط الأساسي وخريطة الموقع وبطاقات المشاركة.')}>
                <Input value={seo.siteUrl} onChange={s('siteUrl')} dir="ltr" placeholder="https://example.com" icon={<Globe className="size-4" />} />
              </Field>
              <Field label={L('Share image URL', 'رابط صورة المشاركة')} hint={L('1200×630 works best for link previews.', 'الأفضل 1200×630 لمعاينة الروابط.')}>
                <Input value={seo.ogImage} onChange={s('ogImage')} dir="ltr" placeholder="https://…/og.png" />
              </Field>
              <Field label={L('X / Twitter handle', 'حساب X / تويتر')}>
                <Input value={seo.twitterHandle} onChange={s('twitterHandle')} dir="ltr" placeholder="@yourbrand" maxLength={16} />
              </Field>
            </div>
            <label className="flex items-center justify-between gap-4 rounded-xl bg-surface-2/60 px-4 py-3 ring-1 ring-border">
              <span>
                <span className="block text-[13px] font-medium">{L('Allow search engines to index the site', 'السماح لمحركات البحث بفهرسة الموقع')}</span>
                <span className="block text-xs text-muted">{L('Turn off to send noindex and block everything in robots.txt (e.g. while staging). The dashboard is never indexed.', 'أوقفه لإرسال noindex وحظر كل شيء في robots.txt (مثلاً أثناء الاختبار). لوحة التحكم لا تُفهرس أبداً.')}</span>
              </span>
              <Switch checked={seo.indexable} onCheckedChange={(v) => setSeo({ ...seo, indexable: v })} />
            </label>
          </section>

          <div className="flex items-center gap-3">
            <Button leftIcon={<Save className="size-4" />} disabled={!dirty || !brand.nameEn.trim() || !brand.nameAr.trim()} loading={isPending} onClick={() => onSave({ ...settings, brand, seo })}>
              {L('Save changes', 'حفظ التغييرات')}
            </Button>
            {dirty && <span className="text-xs text-muted">{L('Unsaved changes', 'تغييرات غير محفوظة')}</span>}
          </div>
        </div>

        {/* Live preview */}
        <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <div className="flex items-center justify-between">
            <h4 className="flex items-center gap-2 text-[13px] font-semibold"><Search className="size-4 text-muted" />{L('Preview', 'معاينة')}</h4>
            <SegmentedControl<'en' | 'ar'> size="sm" value={lang} onChange={setLang} options={[{ value: 'en', label: 'EN' }, { value: 'ar', label: 'عربي' }]} />
          </div>

          <div className="rounded-xl bg-surface-2/60 p-3 ring-1 ring-border" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-1.5 text-xs ring-1 ring-border">
              {brand.faviconUrl ? <img src={brand.faviconUrl} alt="" className="size-4 rounded-sm" /> : <span className="size-4 rounded-sm bg-gradient-to-br from-brand to-accent" />}
              <span className="truncate font-medium">{title}</span>
            </div>
          </div>

          <div className="rounded-xl bg-surface p-4 ring-1 ring-border" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <p dir="ltr" className="truncate text-start text-[12px] text-muted">{site}/</p>
            <p className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab] dark:text-[#8ab4f8]">{title}</p>
            <p className="mt-1 line-clamp-3 text-[13px] leading-relaxed text-fg-2">{description}</p>
          </div>

          <div className="overflow-hidden rounded-xl bg-surface ring-1 ring-border" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            {seo.ogImage ? (
              <img src={seo.ogImage} alt="" className="aspect-[1.91/1] w-full object-cover" />
            ) : (
              <div className="flex aspect-[1.91/1] items-center justify-center bg-gradient-to-br from-brand/80 to-accent/70 text-2xl font-bold text-white">{name}</div>
            )}
            <div className="space-y-0.5 border-t border-border bg-surface-2/50 px-3.5 py-2.5">
              <p dir="ltr" className="truncate text-start text-[11px] uppercase tracking-wide text-muted">{site.replace(/^https?:\/\//, '')}</p>
              <p className="line-clamp-1 text-[13px] font-semibold">{title}</p>
              <p className="line-clamp-2 text-xs text-muted">{description}</p>
            </div>
          </div>
        </aside>
      </div>
    </Card>
  );
}
