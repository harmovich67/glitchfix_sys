import { motion } from 'motion/react';
import { Briefcase, ExternalLink, MessageCircle, Quote } from 'lucide-react';
import { useI18n } from '../../lib/i18n';
import { PROJECTS, TESTIMONIALS, WORK } from '../../../seo/content';

const fadeUp = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

/** Portfolio ("our work") and client feedback, mirroring the crawler-visible copy in index.html. */
export function LandingProof() {
  const { locale } = useI18n();
  const isAr = locale === 'ar';

  return (
    <>
      <section id="portfolio" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <motion.div {...fadeUp} className="text-center space-y-2 mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <Briefcase className="size-3.5" />
            {isAr ? 'أعمالنا' : 'Our work'}
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">{isAr ? 'مشاريع نديرها اليوم' : 'Projects we run today'}</h2>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto">
            {isAr ? 'من الفكرة إلى التسليم، ومن العطل إلى الإصلاح' : 'From idea to delivery, and from breakdown to fix'}
          </p>
        </motion.div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {WORK.map((w, i) => (
            <motion.article
              key={w.en}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.05 }}
              className="rounded-2xl border border-border bg-surface p-5 transition-all hover:border-brand/40 hover:shadow-lg"
            >
              <h3 className="text-sm font-bold text-fg">{isAr ? w.ar : w.en}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted">{isAr ? w.ar2 : w.en2}</p>
            </motion.article>
          ))}
        </div>
        <h3 className="mt-12 mb-4 text-center text-xl font-bold">{isAr ? 'مشاريع منشورة' : 'Live projects'}</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROJECTS.map((p, i) => (
            <motion.a
              key={p.url}
              href={p.url}
              target="_blank"
              rel="noopener"
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: (i % 3) * 0.05 }}
              className="group rounded-2xl border border-border bg-surface p-5 transition-all hover:border-brand/40 hover:shadow-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-bold text-fg">{isAr ? p.nameAr : p.nameEn}</h4>
                <ExternalLink className="rtl-flip size-4 shrink-0 text-muted transition-colors group-hover:text-brand" />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{isAr ? p.descAr : p.descEn}</p>
              <p className="mt-3 truncate text-[11px] text-brand" dir="ltr">{p.url.replace(/^https?:\/\//, '')}</p>
            </motion.a>
          ))}
        </div>
        <p className="mt-6 text-center text-sm">
          <a href="/showcase.html" className="font-semibold text-brand hover:underline">
            {isAr ? 'استعرض معرض المشاريع ←' : 'Browse the project showcase →'}
          </a>
        </p>
      </section>

      <section id="testimonials" className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-16 lg:py-20 border-t border-border/60">
        <motion.div {...fadeUp} className="text-center space-y-2 mb-8 sm:mb-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
            <MessageCircle className="size-3.5" />
            {isAr ? 'آراء العملاء' : 'Client reviews'}
          </span>
          <h2 className="text-3xl font-bold sm:text-4xl">{isAr ? 'ماذا يقول عملاؤنا' : 'What clients say'}</h2>
        </motion.div>
        <div className="grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((q, i) => {
            const [who, whoAr] = q.who.split(' · ');
            return (
              <motion.figure
                key={q.en}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: i * 0.08 }}
                className="rounded-2xl border border-border bg-surface p-6"
              >
                <Quote className="size-5 text-brand/60" />
                <blockquote className="mt-3 text-sm leading-relaxed text-fg">{isAr ? q.ar : q.en}</blockquote>
                <figcaption className="mt-4 text-xs font-medium text-muted">— {isAr ? whoAr ?? who : who}</figcaption>
              </motion.figure>
            );
          })}
        </div>
      </section>
    </>
  );
}
