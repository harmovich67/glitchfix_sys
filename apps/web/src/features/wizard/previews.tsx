import { cn } from '../../lib/utils';

export type StyleKey = 'modern' | 'luxury' | 'minimal' | 'dark' | 'corporate' | 'creative';

/** Live mini-mockups of a website in each visual style — real examples instead of plain labels. */
const STYLES: Record<StyleKey, { root: string; nav: string; logo: string; h: string; sub: string; btn: string; card: string; accent: string; font: string }> = {
  modern: {
    root: 'bg-gradient-to-br from-indigo-50 via-white to-cyan-50',
    nav: 'bg-white/70',
    logo: 'bg-gradient-to-br from-indigo-500 to-cyan-400 rounded-md',
    h: 'text-slate-900 font-bold tracking-tight',
    sub: 'bg-slate-300',
    btn: 'bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full',
    card: 'bg-white rounded-lg shadow-sm ring-1 ring-slate-200',
    accent: 'bg-cyan-400',
    font: 'font-sans',
  },
  luxury: {
    root: 'bg-[#f5efe6]',
    nav: 'bg-transparent border-b border-[#c9a45c]/40',
    logo: 'bg-[#1f1a17] rounded-full',
    h: 'text-[#1f1a17] font-medium italic',
    sub: 'bg-[#c9a45c]/50',
    btn: 'bg-[#1f1a17] rounded-none border border-[#c9a45c]',
    card: 'bg-[#ebe2d4] rounded-none ring-1 ring-[#c9a45c]/40',
    accent: 'bg-[#c9a45c]',
    font: 'font-serif',
  },
  minimal: {
    root: 'bg-white',
    nav: 'bg-white',
    logo: 'bg-neutral-900 rounded-sm',
    h: 'text-neutral-900 font-light tracking-tight',
    sub: 'bg-neutral-200',
    btn: 'bg-transparent ring-1 ring-neutral-900 rounded-sm',
    card: 'bg-neutral-50 rounded-sm',
    accent: 'bg-neutral-900',
    font: 'font-sans',
  },
  dark: {
    root: 'bg-[#0a0a12]',
    nav: 'bg-white/5',
    logo: 'bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-md shadow-[0_0_12px_rgba(168,85,247,.7)]',
    h: 'text-white font-semibold',
    sub: 'bg-white/20',
    btn: 'bg-violet-500 rounded-md shadow-[0_0_14px_rgba(139,92,246,.8)]',
    card: 'bg-white/5 rounded-md ring-1 ring-white/10',
    accent: 'bg-fuchsia-400',
    font: 'font-display',
  },
  corporate: {
    root: 'bg-slate-50',
    nav: 'bg-[#0b2a5b]',
    logo: 'bg-white rounded-sm',
    h: 'text-[#0b2a5b] font-semibold',
    sub: 'bg-slate-300',
    btn: 'bg-[#1d4ed8] rounded',
    card: 'bg-white rounded ring-1 ring-slate-200',
    accent: 'bg-[#1d4ed8]',
    font: 'font-sans',
  },
  creative: {
    root: 'bg-[#fff4d6]',
    nav: 'bg-transparent',
    logo: 'bg-[#ff5c8a] rounded-full',
    h: 'text-[#1b1464] font-extrabold',
    sub: 'bg-[#1b1464]/25',
    btn: 'bg-[#ff5c8a] rounded-xl rotate-[-3deg]',
    card: 'bg-[#6ee7b7] rounded-2xl rotate-2',
    accent: 'bg-[#7c3aed]',
    font: 'font-rounded',
  },
};

export function StylePreview({ style, className }: { style: StyleKey; className?: string }) {
  const s = STYLES[style] ?? STYLES.modern;
  const title = { modern: 'Build faster', luxury: 'Maison', minimal: 'Less.', dark: 'Night mode', corporate: 'Trusted', creative: 'Hey there!' }[style];
  return (
    <div dir="ltr" className={cn('relative aspect-[4/3] w-full overflow-hidden', s.root, s.font, className)}>
      <div className={cn('flex items-center justify-between px-2.5 py-1.5', s.nav)}>
        <div className={cn('size-2.5', s.logo)} />
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn('h-1 w-3 rounded-full opacity-60', s.sub)} />
          ))}
        </div>
      </div>
      <div className="px-3 pt-2.5">
        <p className={cn('text-[13px] leading-none', s.h)}>{title}</p>
        <div className={cn('mt-1.5 h-1 w-3/4 rounded-full', s.sub)} />
        <div className={cn('mt-1 h-1 w-1/2 rounded-full', s.sub)} />
        <div className={cn('mt-2 h-3 w-10', s.btn)} />
      </div>
      <div className="absolute inset-x-3 bottom-2.5 grid grid-cols-3 gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn('h-6 p-1', s.card)}>
            <div className={cn('h-1 w-3 rounded-full', i === 1 ? s.accent : s.sub)} />
          </div>
        ))}
      </div>
    </div>
  );
}

const FONTS: Record<string, { family: string; sample: string; weight: number; label: string }> = {
  sans: { family: 'Inter, sans-serif', sample: 'Aa', weight: 600, label: 'Inter' },
  serif: { family: "'Playfair Display', serif", sample: 'Aa', weight: 500, label: 'Playfair' },
  display: { family: "'Space Grotesk', sans-serif", sample: 'Aa', weight: 700, label: 'Space Grotesk' },
  rounded: { family: 'Nunito, sans-serif', sample: 'Aa', weight: 800, label: 'Nunito' },
  mono: { family: "'JetBrains Mono', monospace", sample: 'Aa', weight: 500, label: 'JetBrains Mono' },
};

export function FontPreview({ font, className }: { font: string; className?: string }) {
  const f = FONTS[font] ?? FONTS.sans;
  return (
    <div dir="ltr" className={cn('flex aspect-[4/3] w-full flex-col items-center justify-center bg-surface-2', className)}>
      <span style={{ fontFamily: f.family, fontWeight: f.weight }} className="text-4xl text-fg">
        {f.sample}
      </span>
      <span style={{ fontFamily: f.family }} className="mt-1 text-[11px] text-muted">
        The quick brown fox
      </span>
    </div>
  );
}

/** Render the right preview for an option `preview` key like `style:luxury` or `font:serif`. */
export function OptionPreview({ preview, image }: { preview?: string; image?: string }) {
  if (image) return <img src={image} alt="" className="aspect-[4/3] w-full object-cover" loading="lazy" />;
  if (!preview) return null;
  const [kind, value] = preview.split(':');
  if (kind === 'style') return <StylePreview style={value as StyleKey} />;
  if (kind === 'font') return <FontPreview font={value} />;
  return null;
}

export const PREVIEW_KEYS = [
  ...Object.keys(STYLES).map((k) => `style:${k}`),
  ...Object.keys(FONTS).map((k) => `font:${k}`),
];
