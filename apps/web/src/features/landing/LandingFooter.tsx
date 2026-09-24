import { Link } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Clock,
  ArrowUp,
  Globe2,
  Sparkles,
} from 'lucide-react';
import type { ContactInfo } from '@welco/shared';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { Logo } from '../../components/layout/Logo';
import { LanguageToggle, ThemeToggle } from '../../components/layout/Preferences';

const DEFAULT_FALLBACK_CONTACT: ContactInfo = {
  email: 'contact@welco.dev',
  phone: '+966 50 123 4567',
  whatsapp: '+966501234567',
  addressAr: 'الرياض، المملكة العربية السعودية - طريق الملك فهد',
  addressEn: 'Riyadh, Saudi Arabia - King Fahd Road',
  workingHoursAr: 'الأحد - الخميس: ٩:٠٠ ص - ٦:٠٠ م',
  workingHoursEn: 'Sun - Thu: 9:00 AM - 6:00 PM',
  bioAr: 'منصة استكشاف وتحديد متطلبات المشاريع الذكية، مدعومة بالذكاء الاصطناعي.',
  bioEn: 'AI-guided project discovery & requirements management platform.',
  twitter: 'https://x.com',
  linkedin: 'https://linkedin.com',
  instagram: '',
  github: 'https://github.com',
};

export function LandingFooter() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const { data } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.get<{ allowClientRegistration: boolean; contact?: ContactInfo }>('/settings/public'),
    staleTime: 60_000,
  });

  const contact: ContactInfo = {
    ...DEFAULT_FALLBACK_CONTACT,
    ...(data?.contact ?? {}),
  };

  const address = isAr
    ? contact.addressAr || contact.addressEn
    : contact.addressEn || contact.addressAr;

  const workingHours = isAr
    ? contact.workingHoursAr || contact.workingHoursEn
    : contact.workingHoursEn || contact.workingHoursAr;

  const bio = isAr
    ? contact.bioAr || contact.bioEn
    : contact.bioEn || contact.bioAr;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // WhatsApp formatted link
  const waDigits = contact.whatsapp.replace(/\D/g, '');
  const waHref = waDigits ? `https://wa.me/${waDigits}` : '';

  return (
    <footer className="relative z-10 border-t border-border/80 bg-surface-2/40 text-fg">
      {/* Upper Main Footer Grid */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Column 1: Brand & Bio (Spans 2 cols on lg) */}
          <div className="space-y-4 lg:col-span-2">
            <Logo />
            <p className="text-xs sm:text-sm leading-relaxed text-muted max-w-sm">
              {bio}
            </p>

            {workingHours && (
              <div className="inline-flex items-center gap-2 rounded-xl bg-surface px-3 py-1.5 text-xs text-muted ring-1 ring-border">
                <Clock className="size-3.5 text-brand" />
                <span>{workingHours}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1 text-xs text-emerald-600 font-medium">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isAr ? 'فريق الاستشارات البرمجية متواجد للمساعدة' : 'Consultancy team is online'}</span>
            </div>
          </div>

          {/* Column 2: Direct Contact Info (بيانات التواصل) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg">
              {isAr ? 'بيانات التواصل' : 'Contact Us'}
            </h4>
            <ul className="space-y-2.5 text-xs text-muted">
              {contact.email && (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2 transition-colors hover:text-brand"
                  >
                    <Mail className="size-3.5 shrink-0 text-brand" />
                    <span>{contact.email}</span>
                  </a>
                </li>
              )}

              {contact.phone && (
                <li>
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2 transition-colors hover:text-brand"
                    dir="ltr"
                  >
                    <Phone className="size-3.5 shrink-0 text-emerald-600" />
                    <span>{contact.phone}</span>
                  </a>
                </li>
              )}

              {contact.whatsapp && waHref && (
                <li>
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-emerald-600 transition-colors hover:text-emerald-700 font-medium"
                    dir="ltr"
                  >
                    <MessageCircle className="size-3.5 shrink-0 text-emerald-500" />
                    <span>{contact.whatsapp} (WhatsApp)</span>
                  </a>
                </li>
              )}

              {address && (
                <li className="flex items-start gap-2 pt-1">
                  <MapPin className="size-3.5 shrink-0 text-rose-500 mt-0.5" />
                  <span className="leading-relaxed">{address}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Column 3: Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg">
              {isAr ? 'استكشف المنصة' : 'Discovery Tools'}
            </h4>
            <ul className="space-y-2 text-xs text-muted">
              <li>
                <a href="#sandbox" className="transition-colors hover:text-fg">
                  {isAr ? 'المُحاكي التفاعلي' : 'Interactive Sandbox'}
                </a>
              </li>
              <li>
                <a href="#ai" className="transition-colors hover:text-fg">
                  {isAr ? 'مستشار الذكاء الاصطناعي' : 'Gemini AI Consultant'}
                </a>
              </li>
              <li>
                <a href="#styles" className="transition-colors hover:text-fg">
                  {isAr ? 'مختبر الأنماط البصرية' : 'Design Direction Lab'}
                </a>
              </li>
              <li>
                <a href="#calculator" className="transition-colors hover:text-fg">
                  {isAr ? 'حاسبة العائد والتوفير' : 'ROI Calculator'}
                </a>
              </li>
              <li>
                <a href="#faq" className="transition-colors hover:text-fg">
                  {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Social Links & Account */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-fg">
              {isAr ? 'التواصل الاجتماعي' : 'Follow & Connect'}
            </h4>
            <div className="flex flex-wrap gap-2 text-xs">
              {contact.twitter && (
                <a
                  href={contact.twitter}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-surface px-3 py-1.5 text-muted ring-1 ring-border transition-all hover:bg-brand/10 hover:text-brand hover:ring-brand/40"
                >
                  X / Twitter
                </a>
              )}
              {contact.linkedin && (
                <a
                  href={contact.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-surface px-3 py-1.5 text-muted ring-1 ring-border transition-all hover:bg-brand/10 hover:text-brand hover:ring-brand/40"
                >
                  LinkedIn
                </a>
              )}
              {contact.instagram && (
                <a
                  href={contact.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-surface px-3 py-1.5 text-muted ring-1 ring-border transition-all hover:bg-brand/10 hover:text-brand hover:ring-brand/40"
                >
                  Instagram
                </a>
              )}
              {contact.github && (
                <a
                  href={contact.github}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-surface px-3 py-1.5 text-muted ring-1 ring-border transition-all hover:bg-brand/10 hover:text-brand hover:ring-brand/40"
                >
                  GitHub
                </a>
              )}
            </div>

            <div className="pt-3">
              <span className="text-[11px] text-muted block mb-1.5">
                {isAr ? 'الحساب ولوحة التحكم:' : 'Account & Control:'}
              </span>
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="rounded-lg bg-surface px-3 py-1 text-xs font-medium text-fg ring-1 ring-border hover:bg-surface-2"
                >
                  {isAr ? 'تسجيل الدخول' : 'Sign In'}
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white shadow-xs hover:bg-brand-600"
                >
                  {isAr ? 'إنشاء حساب' : 'Register'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar: Copyright, Language, Back to Top */}
      <div className="border-t border-border/60 bg-surface/60 px-6 py-6">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-xs text-muted sm:flex-row">
          <p>© {new Date().getFullYear()} Welco Platform. {isAr ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <button
              type="button"
              onClick={scrollToTop}
              className="flex items-center gap-1.5 rounded-lg bg-surface px-3 py-1.5 text-xs text-muted ring-1 ring-border transition-colors hover:text-fg"
            >
              <ArrowUp className="size-3.5" />
              <span>{isAr ? 'للأعلى' : 'Back to top'}</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
