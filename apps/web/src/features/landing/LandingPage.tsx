import { useState } from 'react';
import { Link } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Star,
  Users,
  Compass,
  Laptop,
  Menu,
  X,
  SlidersHorizontal,
  Palette,
  Calculator,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { Button } from '../../components/ui/button';
import { Logo } from '../../components/layout/Logo';
import { LanguageToggle, ThemeToggle } from '../../components/layout/Preferences';
import { DynamicIcon } from '../../lib/icons';
import { TYPE_GRADIENT, TYPE_ICON } from '../../lib/meta';

import { LandingHeroInteractive } from './LandingHeroInteractive';
import { InteractiveAIChatDemo } from './InteractiveAIChatDemo';
import { InteractiveStyleSandbox } from './InteractiveStyleSandbox';
import { InteractiveRoiCalculator } from './InteractiveRoiCalculator';
import { InteractivePerspectiveTabs } from './InteractivePerspectiveTabs';
import { InteractiveFaq } from './InteractiveFaq';
import { LandingFooter } from './LandingFooter';

const TYPES: { key: string; en: string; ar: string; count: string }[] = [
  { key: 'ecommerce', en: 'Ecommerce Store', ar: 'متجر إلكتروني', count: '140+ تم إنجازه' },
  { key: 'mobile_app', en: 'Mobile App', ar: 'تطبيق جوال', count: '95+ تم إنجازه' },
  { key: 'saas', en: 'SaaS Platform', ar: 'منصة برمجية SaaS', count: '78+ تم إنجازه' },
  { key: 'booking', en: 'Booking System', ar: 'نظام حجوزات', count: '64+ تم إنجازه' },
  { key: 'company_website', en: 'Company Website', ar: 'موقع تعريفي للشركة', count: '110+ تم إنجازه' },
  { key: 'real_estate', en: 'Real Estate', ar: 'منصة عقارية', count: '45+ تم إنجازه' },
  { key: 'landing_page', en: 'Landing Page', ar: 'صفحة هبوط تسويقية', count: '210+ تم إنجازه' },
  { key: 'custom', en: 'Custom System', ar: 'نظام مخصص معقد', count: '50+ تم إنجازه' },
];

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

export function LandingPage() {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const isAr = locale === 'ar';
  const startHref = user ? '/app' : '/register';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-fg selection:bg-brand selection:text-white pb-0">
      {/* Dynamic Background Grid & Radial Highlights */}
      <div className="bg-grid pointer-events-none absolute inset-x-0 top-0 h-[1000px] [mask-image:radial-gradient(ellipse_at_top,black_35%,transparent_75%)]" />
      <div className="pointer-events-none absolute top-[-100px] left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-gradient-to-tr from-brand/20 via-accent/15 to-transparent blur-[120px]" />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/85 backdrop-blur-xl transition-all">
        <div className="mx-auto flex h-16 sm:h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Logo />

          <nav className="hidden items-center gap-7 text-[13px] font-medium text-muted md:flex">
            <a href="#sandbox" className="transition-colors hover:text-fg">
              {isAr ? 'المُحاكي التفاعلي' : 'Interactive Sandbox'}
            </a>
            <a href="#types" className="transition-colors hover:text-fg">
              {isAr ? 'أنواع المشاريع' : 'Project Types'}
            </a>
            <a href="#ai" className="transition-colors hover:text-fg">
              {isAr ? 'المستشار الذكي' : 'AI Consultant'}
            </a>
            <a href="#styles" className="transition-colors hover:text-fg">
              {isAr ? 'مختبر التصميم' : 'Design Lab'}
            </a>
            <a href="#calculator" className="transition-colors hover:text-fg">
              {isAr ? 'حاسبة التوفير' : 'ROI Calculator'}
            </a>
            <a href="#perspectives" className="transition-colors hover:text-fg">
              {isAr ? 'كيف يعمل' : 'How it Works'}
            </a>
            <a href="#faq" className="transition-colors hover:text-fg">
              {isAr ? 'الأسئلة الشائعة' : 'FAQ'}
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle />
            <ThemeToggle />

            {user ? (
              <Button asChild size="sm" className="hidden sm:inline-flex ms-1">
                <Link to="/app">{t('nav.dashboard')}</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="ms-1 hidden sm:inline-flex">
                  <Link to="/login">{t('landing.ctaSecondary')}</Link>
                </Button>
                <Button asChild size="sm" className="hidden sm:inline-flex shadow-md shadow-brand/20">
                  <Link to="/register">{t('landing.cta')}</Link>
                </Button>
              </>
            )}

            {/* Quick Mobile Header CTA */}
            <Button asChild size="sm" className="md:hidden font-bold text-xs px-3 py-1 shadow-sm shadow-brand/20">
              <Link to={startHref}>{user ? (isAr ? 'التحكم' : 'App') : isAr ? 'ابدأ الآن' : 'Start'}</Link>
            </Button>

            {/* Mobile / Tablet Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex size-9 items-center justify-center rounded-xl bg-surface-2 ring-1 ring-border text-fg md:hidden cursor-pointer"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="border-b border-border/80 bg-surface/95 backdrop-blur-2xl md:hidden overflow-hidden"
            >
              <div className="space-y-4 px-5 py-6">
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  <a
                    href="#sandbox"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-fg ring-1 ring-border"
                  >
                    <SlidersHorizontal className="size-4 text-brand" />
                    <span>{isAr ? 'المُحاكي' : 'Sandbox'}</span>
                  </a>
                  <a
                    href="#ai"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-fg ring-1 ring-border"
                  >
                    <Bot className="size-4 text-violet-500" />
                    <span>{isAr ? 'المستشار الذكي' : 'AI Consultant'}</span>
                  </a>
                  <a
                    href="#styles"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-fg ring-1 ring-border"
                  >
                    <Palette className="size-4 text-accent" />
                    <span>{isAr ? 'مختبر التصميم' : 'Design Lab'}</span>
                  </a>
                  <a
                    href="#calculator"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-fg ring-1 ring-border"
                  >
                    <Calculator className="size-4 text-emerald-500" />
                    <span>{isAr ? 'حاسبة التوفير' : 'ROI Calculator'}</span>
                  </a>
                  <a
                    href="#types"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-fg ring-1 ring-border"
                  >
                    <Layers className="size-4 text-amber-500" />
                    <span>{isAr ? 'أنواع المشاريع' : 'Project Types'}</span>
                  </a>
                  <a
                    href="#faq"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 rounded-xl bg-surface-2 p-3 text-fg ring-1 ring-border"
                  >
                    <HelpCircle className="size-4 text-rose-500" />
                    <span>{isAr ? 'الأسئلة الشائعة' : 'FAQ'}</span>
                  </a>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                  <Button asChild size="lg" className="w-full shadow-md shadow-brand/20">
                    <Link to={startHref} onClick={closeMobileMenu}>
                      <span>{isAr ? 'ابدأ مشروعك مجاناً' : 'Start Free Discovery'}</span>
                      <ArrowRight className="rtl-flip size-4 ms-2" />
                    </Link>
                  </Button>
                  {!user && (
                    <Button asChild variant="secondary" size="lg" className="w-full">
                      <Link to="/login" onClick={closeMobileMenu}>
                        {isAr ? 'تسجيل الدخول' : 'Sign In'}
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 pt-6 pb-12 text-center sm:pt-14 sm:pb-16">
        {/* Animated Pill Badge */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-surface px-4 py-1.5 text-xs font-semibold text-fg shadow-sm backdrop-blur-md"
        >
          <span className="flex size-4 items-center justify-center rounded-full bg-gradient-to-br from-brand to-accent text-white shadow-xs">
            <Sparkles className="size-2.5" />
          </span>
          <span>{isAr ? '✨ استكشاف وتحديد متطلبات المشاريع بالذكاء الاصطناعي' : '✨ Next-Gen AI Project Discovery'}</span>
          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand">
            {isAr ? 'تفاعلي 100%' : '100% Interactive'}
          </span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto mt-6 max-w-4xl text-[40px] leading-[1.08] font-bold tracking-[-0.035em] sm:text-6xl lg:text-7xl"
        >
          {isAr ? 'حوّل فكرة مشروعك العفوية إلى' : 'Turn Any Casual Idea into a'}{' '}
          <br className="hidden sm:inline" />
          <span className="text-gradient">
            {isAr ? 'مواصفات برمجية كاملة بدقة 100%' : 'Flawless Technical Spec'}
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        >
          {isAr
            ? 'استبدل النماذج المملة والاجتماعات المضيعة للوقت برحلة استكشاف بصرية ممتعة. مستشار ذكي يفكك فكرتك، يقترح الميزات المناسبة، ويُسلّم فريق البرمجة وثيقة متطلبات دقيقة وجاهزة للتنفيذ.'
            : 'Replace confusing briefs and wasted meetings with a beautiful guided visual journey. Welco AI consultant asks the right questions and equips your dev team with structured PRDs.'}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <Button asChild size="lg" className="shadow-xl shadow-brand/25 group px-7">
            <Link to={startHref} className="flex items-center gap-2">
              <span>{isAr ? 'ابدأ مشروعك الآن مجاناً' : 'Start Your Project Free'}</span>
              <ArrowRight className="rtl-flip size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="px-6">
            <a href="#sandbox">{isAr ? 'جرّب المُحاكي التفاعلي ↓' : 'Try The Sandbox Below ↓'}</a>
          </Button>
        </motion.div>

        {/* Live Social Proof / Stats Ticker */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mx-auto mt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-muted"
        >
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-fg">
              {isAr ? '19 عميل يحددون متطلباتهم الآن' : '19 clients crafting briefs live'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-emerald-500" />
            <span>{isAr ? 'مجاني تماماً · بدون بطاقة بنكية' : 'Zero card required · Free'}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            <span>{isAr ? '4.9/5 تقييم الرضا' : '4.9/5 Satisfaction Score'}</span>
          </div>
        </motion.div>

        {/* Main Interactive Hero Sandbox Component */}
        <div id="sandbox" className="scroll-mt-24">
          <LandingHeroInteractive />
        </div>
      </section>

      {/* How it Works / 3 Core Steps */}
      <section id="how" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <motion.div {...fadeUp} className="text-center space-y-2 mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Compass className="size-3.5" />
            {isAr ? 'خطوات بسيطة ونتائج مبهرة' : 'Seamless 3-Step Journey'}
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">
            {isAr ? 'كيف يعمل ويلكو لتحويل فكرتك إلى واقع؟' : 'How Welco Accelerates Discovery'}
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            {isAr
              ? 'رحلة تفاعلية منظمة ترشدك من اللحظة الأولى حتى استلام كود المشروع'
              : 'From casual intuition to engineering sign-off with zero friction'}
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              step: '01',
              icon: Sparkles,
              color: 'from-blue-500 to-indigo-600',
              title: isAr ? '1. اختر نوع المشروع وحدد رؤيتك' : '1. Select Type & Describe Vision',
              body: isAr
                ? 'متجر إلكتروني، تطبيق جوال، منصة SaaS، أو نظام حجوزات مخصص. يتكيف المسار بالكامل مع تخصص مشروعك.'
                : 'Ecommerce, Mobile App, SaaS, or bespoke booking system. The workflow adapts instantly to your industry.',
            },
            {
              step: '02',
              icon: Bot,
              color: 'from-violet-500 to-fuchsia-600',
              title: isAr ? '2. استشر المساعد الذكي واختر بصرياً' : '2. Consult AI & Pick Visually',
              body: isAr
                ? 'اختر الأنماط والألوان والميزات عبر بطاقات بصرية حية. لست متأكداً؟ الذكاء الاصطناعي يقترح الخيار الأنسب لمشروعك.'
                : 'Browse visual mockups, palettes, and feature checklists. The AI suggests missing components and best practices.',
            },
            {
              step: '03',
              icon: ShieldCheck,
              color: 'from-emerald-500 to-teal-600',
              title: isAr ? '3. استلم وثيقة برمجية جاهزة للتنفيذ' : '3. Export Production-Ready PRD',
              body: isAr
                ? 'وثيقة متطلبات برمجية (PRD) متكاملة مع جداول البيانات وUser Stories. فريق البرمجة يستلم كل شيء دون غموض أو تخبط.'
                : 'Full requirements dossier with user stories, API endpoints, and database models ready for developers.',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.1 }}
                className="group relative rounded-3xl border border-border bg-surface p-8 shadow-sm transition-all hover:border-brand/50 hover:shadow-xl"
              >
                <div className="flex items-center justify-between">
                  <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md ${item.color}`}>
                    <Icon className="size-6" />
                  </div>
                  <span className="font-mono text-xl font-bold text-muted/50 group-hover:text-brand transition-colors">
                    {item.step}
                  </span>
                </div>
                <h3 className="mt-6 text-lg font-bold text-fg">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Section: Project Types with Stats */}
      <section id="types" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <motion.div {...fadeUp} className="text-center space-y-2 mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Zap className="size-3.5" />
            {isAr ? 'نغطي كل قطاعات البرمجيات' : 'Full Spectrum Coverage'}
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">
            {isAr ? 'مهما كان نوع المشروع الذي تبنيه' : 'Whatever You Are Building'}
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            {isAr
              ? 'نماذج متخصصة ومسارات ذكية تم اختبارها وصقلها لكل نموذج عمل'
              : 'Specialized discovery engines tailored for every business model'}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {TYPES.map((type, i) => (
            <motion.div
              key={type.key}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:border-brand/40 hover:shadow-lg cursor-pointer"
            >
              <div className={`flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-110 ${TYPE_GRADIENT[type.key]}`}>
                <DynamicIcon name={TYPE_ICON[type.key]} className="size-6" />
              </div>
              <p className="mt-4 text-sm font-bold text-fg">{isAr ? type.ar : type.en}</p>
              <p className="mt-1 text-[11px] font-medium text-brand">{type.count}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Interactive AI Consultant Section */}
      <section id="ai" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <motion.div {...fadeUp} className="text-center space-y-3 mb-8 sm:mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-600">
            <Bot className="size-3.5" />
            {isAr ? 'الذكاء الاصطناعي في خدمتك' : 'Interactive Gemini Consultant'}
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">
            {isAr ? 'جرّب استشارة الذكاء الاصطناعي الآن مباشرة' : 'Test Drive the AI Consultant Live'}
          </h2>
          <p className="text-muted text-sm sm:text-base max-w-2xl mx-auto">
            {isAr
              ? 'اختر نموذجاً أو اكتب فكرتك الخاصة وشاهد كيف يحللها المساعد الذكي ويفكك ميزاتها ويحدد تقنياتها في ثوانٍ'
              : 'Click an example prompt or type your custom idea to watch the AI decompose features in real time'}
          </p>
        </motion.div>

        <InteractiveAIChatDemo />
      </section>

      {/* Interactive Design Style Sandbox */}
      <section id="styles" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <InteractiveStyleSandbox />
      </section>

      {/* Interactive ROI Calculator */}
      <section id="calculator" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <InteractiveRoiCalculator />
      </section>

      {/* 3 Perspectives: Client vs PM vs Developer */}
      <section id="perspectives" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <InteractivePerspectiveTabs />
      </section>

      {/* Interactive FAQ Section */}
      <section id="faq" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <InteractiveFaq />
      </section>

      {/* Final Call to Action */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20">
        <motion.div
          {...fadeUp}
          className="relative overflow-hidden rounded-[30px] sm:rounded-[36px] bg-gradient-to-br from-[#0c0c1e] via-[#141432] to-[#1e1b4b] p-6 sm:p-14 text-center text-white shadow-2xl"
        >
          <div className="absolute -top-24 -start-24 size-80 rounded-full bg-brand/30 blur-3xl" />
          <div className="absolute -bottom-24 -end-24 size-80 rounded-full bg-accent/25 blur-3xl" />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-md">
              <Sparkles className="size-3.5 text-amber-400" />
              {isAr ? 'جاهزون لبدء مشروعك اليوم' : 'Ready When You Are'}
            </span>

            <h2 className="text-3xl font-extrabold sm:text-5xl tracking-tight leading-tight">
              {isAr ? 'توقف عن إضاعة الأسابيع في الاجتماعات. ابدأ مواصفاتك الآن.' : 'Stop Wasting Weeks in Meetings. Start Your Brief Now.'}
            </h2>

            <p className="text-base text-white/75 sm:text-lg max-w-2xl mx-auto leading-relaxed">
              {isAr
                ? 'انضم إلى مئات الشركات والوكالات التي تستخدم ويلكو لتحديد نطاق المشاريع بدقة متناهية وسرعة فائقة.'
                : 'Join hundreds of agencies and founders who craft unambiguous project briefs with Welco.'}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto px-8 py-3.5 bg-brand text-white hover:bg-brand-600 shadow-xl shadow-brand/40 text-base font-semibold">
                <Link to={startHref} className="flex items-center justify-center gap-2">
                  <span>{isAr ? 'ابدأ مشروعك مجاناً' : 'Start Free Discovery'}</span>
                  <ArrowRight className="rtl-flip size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto px-8 py-3.5 bg-white/10 text-white hover:bg-white/20 border border-white/20 text-base">
                <Link to="/login">{isAr ? 'تسجيل الدخول' : 'Sign In'}</Link>
              </Button>
            </div>

            <p className="text-xs text-white/50 pt-2">
              {isAr ? '⚡ يستغرق تجهيز المتطلبات أقل من 10 دقائق · بدون بطاقة بنكية' : '⚡ Takes ~10 minutes · No credit card required'}
            </p>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <LandingFooter />
    </div>
  );
}
