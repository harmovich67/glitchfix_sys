import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Calculator,
  Clock,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  CheckCircle,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { Button } from '../../components/ui/button';
import { Link } from 'react-router';

export function InteractiveRoiCalculator() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  const [featuresCount, setFeaturesCount] = useState<number>(18);
  const [projectsCount, setProjectsCount] = useState<number>(4);
  const [hourlyRate, setHourlyRate] = useState<number>(65);

  // Calculation formulas:
  // Traditional discovery takes ~ 2.5 hours per feature in meetings, drafting, back-and-forth
  // Welco discovery takes ~ 0.2 hours per feature
  const traditionalHoursPerProject = Math.round(featuresCount * 2.4 + 10);
  const welcoHoursPerProject = Math.max(1, Math.round(featuresCount * 0.25 + 0.5));
  const hoursSavedPerProject = traditionalHoursPerProject - welcoHoursPerProject;

  const totalAnnualHoursSaved = hoursSavedPerProject * projectsCount;
  const annualDollarsSaved = totalAnnualHoursSaved * hourlyRate;
  const speedMultiplier = Math.round(traditionalHoursPerProject / Math.max(1, welcoHoursPerProject));

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Decorative Glow */}
      <div className="absolute -inset-6 -z-10 rounded-[48px] bg-gradient-to-tr from-emerald-500/10 via-brand/10 to-accent/15 blur-3xl" />

      <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface/95 shadow-xl backdrop-blur-md">
        {/* Header */}
        <div className="border-b border-border/70 bg-surface-2/60 px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600">
                <Calculator className="size-3.5" />
                {isAr ? 'حاسبة العائد والوقت الموفر (ROI Calculator)' : 'Interactive ROI Calculator'}
              </span>
              <h3 className="mt-2 text-2xl font-bold sm:text-3xl text-fg">
                {isAr ? 'كم توفر من الساعات والأموال مع ويلكو؟' : 'Calculate Your Time & Capital Savings'}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-muted">
                {isAr
                  ? 'حرّك المؤشرات أدناه وشاهد التأثير المباشر على سرعة تسليم مشاريعك وتوفير ميزانية التحليل'
                  : 'Slide the controls below to estimate instant discovery cost & meeting hours saved'}
              </p>
            </div>

            <div className="rounded-2xl bg-surface px-4 py-2.5 text-end ring-1 ring-border">
              <span className="text-[10px] text-muted block uppercase font-mono">
                {isAr ? 'معدل تسريع مرحلة التحليل' : 'Discovery Acceleration'}
              </span>
              <span className="text-xl font-extrabold text-emerald-600">{speedMultiplier}x {isAr ? 'أسرع' : 'Faster'}</span>
            </div>
          </div>
        </div>

        {/* Sliders & Results Grid */}
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Interactive Sliders Column */}
          <div className="p-6 sm:p-8 space-y-7 border-b lg:border-b-0 lg:border-e border-border">
            {/* Slider 1: Features Count */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-fg flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-brand text-xs font-bold">1</span>
                  {isAr ? 'عدد ميزات / شاشات المشروع المقدرة:' : 'Estimated Features / Screens:'}
                </label>
                <span className="rounded-lg bg-surface-2 px-3 py-1 font-mono text-sm font-bold text-brand ring-1 ring-border">
                  {featuresCount} {isAr ? 'ميزة' : 'features'}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="1"
                value={featuresCount}
                onChange={(e) => setFeaturesCount(Number(e.target.value))}
                className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-brand"
              />
              <div className="flex justify-between text-[11px] text-muted">
                <span>5 {isAr ? '(بسيط)' : '(Simple MVP)'}</span>
                <span>25 {isAr ? '(متوسط)' : '(Medium App)'}</span>
                <span>50 {isAr ? '(نظام متكامل)' : '(Complex System)'}</span>
              </div>
            </div>

            {/* Slider 2: Projects per Year */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-fg flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-brand text-xs font-bold">2</span>
                  {isAr ? 'عدد المشاريع التي تطلقها سنوياً:' : 'Projects Launched Per Year:'}
                </label>
                <span className="rounded-lg bg-surface-2 px-3 py-1 font-mono text-sm font-bold text-fg ring-1 ring-border">
                  {projectsCount} {isAr ? 'مشاريع' : 'projects'}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="24"
                step="1"
                value={projectsCount}
                onChange={(e) => setProjectsCount(Number(e.target.value))}
                className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-brand"
              />
              <div className="flex justify-between text-[11px] text-muted">
                <span>1 {isAr ? 'مشروع سنوي' : '1 Project'}</span>
                <span>12 {isAr ? 'مشروع شهرياً' : '12 Projects'}</span>
                <span>24 {isAr ? 'وكالة برمجية' : '24 Agency Projects'}</span>
              </div>
            </div>

            {/* Slider 3: Hourly Rate */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-fg flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-md bg-brand-soft text-brand text-xs font-bold">3</span>
                  {isAr ? 'تكلفة ساعة العمل للمحلل أو الفريق ($):' : 'Hourly Rate / Consultant Cost ($):'}
                </label>
                <span className="rounded-lg bg-surface-2 px-3 py-1 font-mono text-sm font-bold text-emerald-600 ring-1 ring-border">
                  ${hourlyRate}/hr
                </span>
              </div>
              <input
                type="range"
                min="25"
                max="180"
                step="5"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-full h-2 bg-surface-3 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[11px] text-muted">
                <span>$25</span>
                <span>$75</span>
                <span>$180</span>
              </div>
            </div>
          </div>

          {/* Dynamic Computed Summary Column */}
          <div className="flex flex-col justify-between bg-surface-2/40 p-6 sm:p-8">
            <div className="space-y-6">
              {/* Highlight Metric: Dollars Saved */}
              <div className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-border text-center space-y-1 relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-brand to-accent" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted">
                  {isAr ? 'الوفر المالي السنوي التقديري' : 'Estimated Annual Savings'}
                </span>
                <motion.div
                  key={annualDollarsSaved}
                  initial={{ scale: 0.9, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-4xl sm:text-5xl font-extrabold text-emerald-600 tracking-tight"
                >
                  ${annualDollarsSaved.toLocaleString()}
                </motion.div>
                <p className="text-xs text-muted">
                  {isAr
                    ? `بناءً على توفير ${totalAnnualHoursSaved} ساعة عمل ضائعة في الاجتماعات وصياغة المستندات`
                    : `Based on saving ${totalAnnualHoursSaved} hours of meetings & documentation`}
                </p>
              </div>

              {/* Grid of Micro-Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-surface p-4 ring-1 ring-border space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <Clock className="size-3.5 text-brand" />
                    <span>{isAr ? 'لكل مشروع' : 'Per Project'}</span>
                  </div>
                  <div className="text-2xl font-bold text-fg">
                    {hoursSavedPerProject} <span className="text-xs font-normal text-muted">{isAr ? 'ساعة موفرة' : 'hrs saved'}</span>
                  </div>
                  <p className="text-[11px] text-muted">
                    {isAr ? 'بدلاً من 3 أسابيع نقاشات' : 'Zero scope paralysis'}
                  </p>
                </div>

                <div className="rounded-2xl bg-surface p-4 ring-1 ring-border space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>{isAr ? 'دقة المواصفات' : 'Spec Accuracy'}</span>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600">
                    99.4%
                  </div>
                  <p className="text-[11px] text-muted">
                    {isAr ? 'تلاشي ظاهرة الـ Scope Creep' : 'Eliminates scope creep'}
                  </p>
                </div>
              </div>

              {/* Guarantees checklist */}
              <div className="space-y-2 text-xs text-fg-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  <span>{isAr ? 'وثيقة متطلبات برمجية (PRD) متكاملة ومصدّقة' : 'Production-ready PRD exported in minutes'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  <span>{isAr ? 'فهم مشترك 100% بين العميل وفريق البرمجة' : '100% alignment between client and engineering'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="size-4 text-emerald-500 shrink-0" />
                  <span>{isAr ? 'مستشار ذكي يرشد العميل خطوة بخطوة بدون ارتباك' : 'Guided AI assistant removes all ambiguity'}</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 pt-4 border-t border-border/70">
              <Button asChild size="lg" className="w-full shadow-lg shadow-brand/20">
                <Link to="/register" className="flex items-center justify-center gap-2">
                  <Sparkles className="size-4" />
                  <span>{isAr ? 'ابدأ بتوفير وقتك الآن مجاناً' : 'Start Saving Time For Free'}</span>
                  <ArrowRight className="rtl-flip size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
