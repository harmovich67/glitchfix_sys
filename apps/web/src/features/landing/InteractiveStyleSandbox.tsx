import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette,
  Smartphone,
  Monitor,
  Heart,
  Star,
  Sparkles,
  ShoppingBag,
  ArrowUpRight,
  Sliders,
  Check,
} from 'lucide-react';
import { useI18n } from '../../lib/i18n';

type DesignStyleKey = 'modern' | 'luxury' | 'cyber' | 'minimal' | 'corporate';

interface DesignStyleMeta {
  id: DesignStyleKey;
  label: { ar: string; en: string };
  vibe: { ar: string; en: string };
  colors: string[];
  themeClasses: {
    container: string;
    navbar: string;
    card: string;
    btnPrimary: string;
    btnSecondary: string;
    heading: string;
    subtext: string;
    badge: string;
    accentGlow: string;
  };
}

const STYLES: DesignStyleMeta[] = [
  {
    id: 'modern',
    label: { ar: 'عصري نيو-تك (Modern)', en: 'Modern Neo-Tech' },
    vibe: { ar: 'تدرجات بنفسجية ناعمة مع لمسات زجاجية', en: 'Vibrant indigo glows with frosted glass' },
    colors: ['#5b5bf6', '#06b6d4', '#f1f1f6'],
    themeClasses: {
      container: 'bg-gradient-to-br from-indigo-50/70 via-white to-cyan-50/70 text-slate-900',
      navbar: 'bg-white/80 border-b border-indigo-100 backdrop-blur-md',
      card: 'bg-white rounded-2xl shadow-md shadow-indigo-500/5 ring-1 ring-indigo-100',
      btnPrimary: 'bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl shadow-md shadow-indigo-500/20 hover:opacity-95',
      btnSecondary: 'bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100',
      heading: 'text-slate-900 font-extrabold tracking-tight',
      subtext: 'text-slate-500',
      badge: 'bg-indigo-50 text-indigo-700 border border-indigo-200/60',
      accentGlow: 'from-indigo-500/20 to-cyan-400/20',
    },
  },
  {
    id: 'luxury',
    label: { ar: 'فخامة ملكية (Luxury Gold)', en: 'Imperial Luxury' },
    vibe: { ar: 'تناغم ذهبي مع عاجي راقي وهوامش فسيحة', en: 'Rich warm gold, ivory tones, editorial serif' },
    colors: ['#c9a45c', '#1f1a17', '#f5efe6'],
    themeClasses: {
      container: 'bg-[#faf6f0] text-[#1f1a17]',
      navbar: 'bg-[#faf6f0]/90 border-b border-[#c9a45c]/30 backdrop-blur-sm',
      card: 'bg-[#f3ede3] rounded-sm shadow-sm ring-1 ring-[#c9a45c]/40',
      btnPrimary: 'bg-[#1f1a17] text-[#e6caa4] rounded-none border border-[#c9a45c] hover:bg-[#2b2521]',
      btnSecondary: 'border border-[#c9a45c]/60 text-[#1f1a17] rounded-none hover:bg-[#c9a45c]/10',
      heading: 'text-[#1f1a17] font-serif italic tracking-wide',
      subtext: 'text-[#5c544d] font-serif',
      badge: 'bg-[#c9a45c]/15 text-[#8f6e2e] border border-[#c9a45c]/40',
      accentGlow: 'from-[#c9a45c]/20 to-amber-700/15',
    },
  },
  {
    id: 'cyber',
    label: { ar: 'سايبر دارك (Cyber Dark)', en: 'Cyber Dark' },
    vibe: { ar: 'خلفية ليلية عميقة مع توهج نيون وبنفسجي', en: 'Deep obsidian night with hyper neon flares' },
    colors: ['#a855f7', '#ec4899', '#09090f'],
    themeClasses: {
      container: 'bg-[#0a0a14] text-white',
      navbar: 'bg-[#0f0f1c]/90 border-b border-violet-500/20 backdrop-blur-md',
      card: 'bg-[#121224] rounded-2xl shadow-lg ring-1 ring-violet-500/20 hover:ring-violet-500/40',
      btnPrimary: 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-500 text-white rounded-xl shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50',
      btnSecondary: 'bg-white/5 text-white/90 rounded-xl hover:bg-white/10 ring-1 ring-white/10',
      heading: 'text-white font-bold tracking-tight',
      subtext: 'text-white/60',
      badge: 'bg-violet-500/20 text-violet-300 border border-violet-500/40',
      accentGlow: 'from-violet-600/30 to-fuchsia-600/30',
    },
  },
  {
    id: 'minimal',
    label: { ar: 'مينيمال نقي (Nordic Minimal)', en: 'Nordic Minimal' },
    vibe: { ar: 'أبيض وأسود صريح، تركيز على التباين والطباعة', en: 'Crisp black & white typography and space' },
    colors: ['#000000', '#525252', '#ffffff'],
    themeClasses: {
      container: 'bg-white text-black',
      navbar: 'bg-white border-b border-neutral-200',
      card: 'bg-neutral-50 rounded-lg shadow-none ring-1 ring-neutral-200',
      btnPrimary: 'bg-black text-white rounded-md hover:bg-neutral-800',
      btnSecondary: 'bg-transparent text-black rounded-md ring-1 ring-black hover:bg-neutral-100',
      heading: 'text-black font-medium tracking-tight',
      subtext: 'text-neutral-500',
      badge: 'bg-neutral-100 text-neutral-800 border border-neutral-300',
      accentGlow: 'from-neutral-200 to-neutral-300',
    },
  },
  {
    id: 'corporate',
    label: { ar: 'مؤسسي موثوق (Corporate Trust)', en: 'Corporate Trust' },
    vibe: { ar: 'كحلي عميق مع رمادي رسمي يوحي بالأمان والوقار', en: 'Deep navy and steel blue for financial clarity' },
    colors: ['#1e3a8a', '#3b82f6', '#f8fafc'],
    themeClasses: {
      container: 'bg-slate-50 text-slate-900',
      navbar: 'bg-white border-b border-slate-200',
      card: 'bg-white rounded-xl shadow-sm ring-1 ring-slate-200',
      btnPrimary: 'bg-[#1e40af] text-white rounded-lg hover:bg-[#1d4ed8]',
      btnSecondary: 'bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200',
      heading: 'text-[#0f172a] font-bold tracking-tight',
      subtext: 'text-slate-500',
      badge: 'bg-blue-50 text-blue-800 border border-blue-200',
      accentGlow: 'from-blue-600/15 to-indigo-600/15',
    },
  },
];

export function InteractiveStyleSandbox() {
  const { locale, b, brand } = useI18n();
  const isAr = locale === 'ar';

  const [activeStyleKey, setActiveStyleKey] = useState<DesignStyleKey>('modern');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [interactiveCounter, setInteractiveCounter] = useState(1);
  const [isLiked, setIsLiked] = useState(false);

  const currentStyle = STYLES.find((s) => s.id === activeStyleKey) ?? STYLES[0];
  const { themeClasses: th } = currentStyle;

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Top Description and Selectors */}
      <div className="flex flex-col items-center justify-between gap-4 md:flex-row pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Palette className="size-3.5" />
            {isAr ? 'مختبر الأنماط والهوية البصرية' : 'Design Direction Sandbox'}
          </span>
          <h3 className="mt-2 text-2xl font-bold sm:text-3xl text-fg">
            {isAr ? 'شاهد كيف يبدو مشروعك بـ 5 أساليب مختلفة' : 'Experience 5 Real Design Directions Live'}
          </h3>
          <p className="mt-1 text-sm text-muted">
            {isAr
              ? 'انقر على أي نمط لرؤية التغيير الفوري في الخطوط والألوان والبطاقات والأزرار'
              : 'Switch styles below to watch typography, palettes, and buttons transform'}
          </p>
        </div>

        {/* Viewport Toggle */}
        <div className="flex items-center gap-1 rounded-xl bg-surface-2 p-1 ring-1 ring-border">
          <button
            onClick={() => setDeviceMode('desktop')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              deviceMode === 'desktop' ? 'bg-surface text-brand shadow-sm font-semibold' : 'text-muted hover:text-fg'
            }`}
          >
            <Monitor className="size-3.5" />
            <span>{isAr ? 'شاشة حاسوب' : 'Desktop'}</span>
          </button>
          <button
            onClick={() => setDeviceMode('mobile')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              deviceMode === 'mobile' ? 'bg-surface text-brand shadow-sm font-semibold' : 'text-muted hover:text-fg'
            }`}
          >
            <Smartphone className="size-3.5" />
            <span>{isAr ? 'شاشة جوال' : 'Mobile'}</span>
          </button>
        </div>
      </div>

      {/* Style selector pills */}
      <div className="no-scrollbar flex w-full items-center gap-2 overflow-x-auto pb-6 touch-pan-x sm:flex-wrap">
        {STYLES.map((st) => {
          const active = st.id === activeStyleKey;
          return (
            <button
              key={st.id}
              onClick={() => setActiveStyleKey(st.id)}
              className={`group flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-2xl p-2.5 px-4 text-xs font-semibold transition-all cursor-pointer ${
                active
                  ? 'bg-surface text-fg ring-2 ring-brand shadow-md scale-102'
                  : 'bg-surface-2/70 text-muted hover:bg-surface-2 hover:text-fg ring-1 ring-border'
              }`}
            >
              <div className="flex -space-x-1 rtl:space-x-reverse">
                {st.colors.map((c) => (
                  <span
                    key={c}
                    className="size-3.5 rounded-full border border-black/10 shadow-xs"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="whitespace-nowrap">{isAr ? st.label.ar : st.label.en}</span>
              {active && <Check className="size-3.5 text-brand ms-1" />}
            </button>
          );
        })}
      </div>

      {/* Active Style Vibe Banner */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted pb-4 px-1">
        <span className="font-semibold text-fg flex items-center gap-1.5 shrink-0">
          <Sparkles className="size-3.5 text-brand" />
          {isAr ? currentStyle.label.ar : currentStyle.label.en}:
        </span>
        <span className="text-muted leading-relaxed">{isAr ? currentStyle.vibe.ar : currentStyle.vibe.en}</span>
      </div>

      {/* Sandbox Window Preview */}
      <div className="relative mx-auto flex justify-center">
        <motion.div
          layout
          className={`w-full transition-all duration-500 overflow-hidden rounded-3xl border border-border shadow-2xl ${
            deviceMode === 'mobile' ? 'max-w-md' : 'max-w-full'
          }`}
        >
          {/* Mock Browser Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2/90 px-3 sm:px-4 py-2 sm:py-2.5">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="size-2.5 rounded-full bg-rose-400" />
              <span className="size-2.5 rounded-full bg-amber-400" />
              <span className="size-2.5 rounded-full bg-emerald-400" />
            </div>
            <div className="rounded-lg bg-surface px-3 py-1 text-center font-mono text-[10.5px] sm:text-[11px] text-muted ring-1 ring-border/70 truncate max-w-[200px]">
              preview.{brand.slug}.app/{activeStyleKey}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                {isAr ? 'مباشر' : 'Live'}
              </span>
            </div>
          </div>

          {/* Rendered Mockup Container */}
          <div className={`p-6 sm:p-8 transition-colors duration-500 ${th.container}`}>
            {/* Mock Navigation Bar */}
            <div className={`flex items-center justify-between rounded-xl px-4 py-3 mb-6 transition-all ${th.navbar}`}>
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-current text-inverted font-black text-xs">
                  {brand.name.charAt(0).toUpperCase()}
                </span>
                <span className={`text-sm font-bold ${th.heading}`}>{brand.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`hidden text-xs sm:inline-block ${th.subtext}`}>
                  {isAr ? 'المنتجات' : 'Products'}
                </span>
                <span className={`hidden text-xs sm:inline-block ${th.subtext}`}>
                  {isAr ? 'عن المتجر' : 'About'}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLiked(!isLiked)}
                  className="p-1.5 transition-transform hover:scale-110 cursor-pointer"
                >
                  <Heart className={`size-4 ${isLiked ? 'fill-rose-500 text-rose-500' : th.subtext}`} />
                </button>
              </div>
            </div>

            {/* Mock Hero Content inside Sandbox */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${th.badge}`}>
                  <Sparkles className="size-3" />
                  {isAr ? 'مجموعة 2026 الحصرية' : 'Exclusive 2026 Collection'}
                </span>
              </div>

              <div className="grid gap-6 md:grid-cols-2 items-center">
                <div className="space-y-3">
                  <h4 className={`text-2xl sm:text-3xl ${th.heading}`}>
                    {isAr ? 'صُمّم ليمنحك الانطباع الأول الذي لا يُنسى' : 'Engineered for Unforgettable First Impressions'}
                  </h4>
                  <p className={`text-xs sm:text-sm leading-relaxed ${th.subtext}`}>
                    {b(isAr ? 'هذا النموذج الحي يوضح دقة ويلكو في محاذاة الهوية البصرية مع رغبة عميلك الحقيقية.' : 'This live sandbox demonstrates how Welco captures your exact visual identity.')}
                  </p>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setInteractiveCounter((c) => c + 1)}
                      className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${th.btnPrimary}`}
                    >
                      <ShoppingBag className="size-3.5" />
                      <span>{isAr ? 'إضافة إلى السلة' : 'Add to Cart'}</span>
                      <span className="ms-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                        ({interactiveCounter})
                      </span>
                    </button>

                    <button
                      type="button"
                      className={`px-3 py-2.5 text-xs font-medium transition-all ${th.btnSecondary}`}
                    >
                      {isAr ? 'معاينة التفاصيل' : 'Explore'}
                    </button>
                  </div>
                </div>

                {/* Mock Visual Product Card inside Sandbox */}
                <div className={`p-4 transition-all ${th.card}`}>
                  <div className="aspect-[4/3] rounded-xl overflow-hidden relative bg-gradient-to-br from-black/5 to-black/20 flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span className="relative z-10 text-white font-bold text-lg drop-shadow-md">
                      {isAr ? 'المنتج التجريبي المضيء' : 'Product Visual'}
                    </span>
                    <span className="absolute top-2 end-2 z-10 rounded-full bg-black/40 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm flex items-center gap-1">
                      <Star className="size-3 fill-amber-400 text-amber-400" /> 4.9
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className={`text-xs font-bold ${th.heading}`}>
                        {isAr ? 'إصدار التميز المحدود' : 'Signature Edition'}
                      </p>
                      <p className={`text-[11px] ${th.subtext}`}>SKU: {brand.slug.toUpperCase()}-2026</p>
                    </div>
                    <span className={`text-sm font-bold ${th.heading}`}>$249.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
