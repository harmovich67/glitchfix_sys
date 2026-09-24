import type { ReactNode } from 'react';
import type { WireframeBlock, WireframeScreen, WireframeSpec } from '@welco/shared';
import { cn } from '../../lib/utils';

/**
 * Draws a wireframe spec as grey boxes: no colours, photos or real copy, so the client judges structure and flow
 * rather than styling. Everything is plain text rendered by React, so nothing in a spec can inject markup.
 */

const line = 'block h-2 rounded-full bg-surface-3';
const box = 'rounded-lg border border-dashed border-border-strong bg-surface-2/60';

/** The classic crossed box that stands for an image. */
function Img({ className }: { className?: string }) {
  return (
    <div className={cn('relative overflow-hidden', box, className)} aria-hidden>
      <svg className="absolute inset-0 size-full text-border-strong" preserveAspectRatio="none" viewBox="0 0 100 100">
        <path d="M0 0 L100 100 M100 0 L0 100" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

const Heading = ({ children }: { children?: ReactNode }) => (children ? <p className="text-[13px] leading-tight font-bold text-fg">{children}</p> : null);
const Button = ({ children, solid = true }: { children: ReactNode; solid?: boolean }) => (
  <span className={cn('inline-flex h-7 items-center rounded-md px-3 text-[11px] font-semibold', solid ? 'bg-fg text-bg' : 'border border-border-strong text-fg-2')}>{children}</span>
);
const Bars = ({ n = 3 }: { n?: number }) => (
  <span className="block space-y-1.5" aria-hidden>
    {Array.from({ length: n }, (_, i) => (
      <span key={i} className={cn(line, i === n - 1 && 'w-2/3')} />
    ))}
  </span>
);

function Block({ b }: { b: WireframeBlock }) {
  const items = b.items ?? [];
  switch (b.type) {
    case 'navbar':
      return (
        <div className="flex items-center gap-3 border-b border-border-strong px-3 py-2.5">
          <span className="text-[12px] font-extrabold tracking-tight text-fg">{b.title || '●'}</span>
          <span className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-x-3 gap-y-1 text-[10.5px] text-fg-2">
            {items.map((i, k) => (
              <span key={k}>{i}</span>
            ))}
          </span>
        </div>
      );
    case 'hero':
      return (
        <div className="space-y-3 px-4 py-6 text-center">
          <Heading>{b.title}</Heading>
          {b.text ? <p className="mx-auto max-w-xs text-[11px] text-fg-2">{b.text}</p> : <Bars n={2} />}
          {items.length > 0 && (
            <span className="flex flex-wrap items-center justify-center gap-2">
              {items.map((i, k) => (
                <Button key={k} solid={k === 0}>{i}</Button>
              ))}
            </span>
          )}
          <Img className="mx-auto mt-2 h-24 w-full" />
        </div>
      );
    case 'features':
      return (
        <div className="space-y-3 px-4 py-4">
          <Heading>{b.title}</Heading>
          <div className="grid grid-cols-2 gap-2.5">
            {(items.length ? items : ['', '', '']).map((i, k) => (
              <div key={k} className="flex items-start gap-2">
                <span className="mt-0.5 size-5 shrink-0 rounded-full border border-dashed border-border-strong bg-surface-2" />
                <span className="min-w-0 flex-1 space-y-1">
                  {i ? <span className="block text-[11px] leading-snug font-medium text-fg-2">{i}</span> : <span className={line} />}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'cards':
      return (
        <div className="space-y-3 px-4 py-4">
          <Heading>{b.title}</Heading>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {(items.length ? items : ['', '', '']).map((i, k) => (
              <div key={k} className="space-y-1.5">
                <Img className="h-16 w-full" />
                {i ? <span className="block text-[10.5px] font-medium text-fg-2">{i}</span> : <Bars n={1} />}
              </div>
            ))}
          </div>
        </div>
      );
    case 'gallery':
      return (
        <div className="space-y-2 px-4 py-4">
          <Heading>{b.title}</Heading>
          <Img className="h-28 w-full" />
          <div className="grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((k) => (
              <Img key={k} className="h-9" />
            ))}
          </div>
        </div>
      );
    case 'text':
      return (
        <div className="space-y-2 px-4 py-4">
          <Heading>{b.title}</Heading>
          {b.text && <p className="text-[11px] leading-relaxed text-fg-2">{b.text}</p>}
          <Bars n={3} />
        </div>
      );
    case 'list':
      return (
        <div className="space-y-2 px-4 py-4">
          <Heading>{b.title}</Heading>
          <ul className="space-y-1.5">
            {(items.length ? items : ['', '', '']).map((i, k) => (
              <li key={k} className="flex items-center gap-2">
                <span className="size-3 shrink-0 rounded-sm border border-border-strong" />
                {i ? <span className="text-[11px] text-fg-2">{i}</span> : <span className={cn(line, 'flex-1')} />}
              </li>
            ))}
          </ul>
        </div>
      );
    case 'form':
      return (
        <div className="space-y-2.5 px-4 py-4">
          <Heading>{b.title}</Heading>
          {(items.length ? items : ['', '']).map((i, k) => (
            <div key={k} className="space-y-1">
              {i && <span className="block text-[10px] font-medium text-fg-2">{i}</span>}
              <span className={cn('block h-7 w-full', box)} />
            </div>
          ))}
          <Button>{b.text || '→'}</Button>
        </div>
      );
    case 'pricing':
      return (
        <div className="space-y-3 px-4 py-4">
          <Heading>{b.title}</Heading>
          <div className="grid grid-cols-3 gap-2">
            {(items.length ? items : ['', '', '']).slice(0, 4).map((i, k) => (
              <div key={k} className={cn('space-y-2 p-2.5 text-center', box, k === 1 && 'border-solid border-fg')}>
                <span className="block text-[10.5px] font-bold text-fg">{i}</span>
                <span className="mx-auto block h-4 w-10 rounded bg-surface-3" />
                <Bars n={2} />
                <Button solid={k === 1}>·</Button>
              </div>
            ))}
          </div>
        </div>
      );
    case 'testimonials':
      return (
        <div className="space-y-3 px-4 py-4">
          <Heading>{b.title}</Heading>
          <div className="grid grid-cols-2 gap-2.5">
            {[0, 1].map((k) => (
              <div key={k} className={cn('space-y-2 p-2.5', box)}>
                <Bars n={2} />
                <span className="flex items-center gap-1.5">
                  <span className="size-5 rounded-full bg-surface-3" />
                  <span className={cn(line, 'w-12')} />
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    case 'stats':
      return (
        <div className="space-y-3 px-4 py-4">
          <Heading>{b.title}</Heading>
          <div className="grid grid-cols-3 gap-2">
            {(items.length ? items : ['', '', '']).slice(0, 4).map((i, k) => (
              <div key={k} className={cn('space-y-1.5 p-2.5', box)}>
                <span className="block h-4 w-8 rounded bg-surface-3" />
                {i ? <span className="block text-[10px] text-fg-2">{i}</span> : <span className={line} />}
              </div>
            ))}
          </div>
        </div>
      );
    case 'table':
      return (
        <div className="space-y-2 px-4 py-4">
          <Heading>{b.title}</Heading>
          <div className={cn('overflow-hidden', box)}>
            <div className="flex gap-2 border-b border-border-strong bg-surface-3/60 px-2.5 py-1.5">
              {(items.length ? items : ['', '', '']).map((i, k) => (
                <span key={k} className="flex-1 text-[10px] font-semibold text-fg-2">{i}</span>
              ))}
            </div>
            {[0, 1, 2].map((r) => (
              <div key={r} className="flex gap-2 border-b border-border/60 px-2.5 py-2 last:border-0">
                {(items.length ? items : ['', '', '']).map((_, k) => (
                  <span key={k} className={cn(line, 'flex-1')} />
                ))}
              </div>
            ))}
          </div>
        </div>
      );
    case 'cta':
      return (
        <div className="space-y-2 bg-surface-2/70 px-4 py-5 text-center">
          <Heading>{b.title}</Heading>
          {b.text && <p className="text-[11px] text-fg-2">{b.text}</p>}
          <Button>{items[0] ?? '→'}</Button>
        </div>
      );
    case 'footer':
      return (
        <div className="space-y-2 border-t border-border-strong bg-surface-2/50 px-4 py-3">
          <span className="text-[11px] font-bold text-fg-2">{b.title}</span>
          <span className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
            {items.map((i, k) => (
              <span key={k}>{i}</span>
            ))}
          </span>
        </div>
      );
  }
}

function Frame({ screen, index }: { screen: WireframeScreen; index: number }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 flex items-baseline gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-fg text-[10px] font-bold text-bg">{index + 1}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold">{screen.name}</span>
          {screen.purpose && <span className="block text-[11.5px] leading-snug text-muted">{screen.purpose}</span>}
        </span>
      </figcaption>
      <div className="overflow-hidden rounded-xl bg-surface shadow-sm ring-1 ring-border-strong">
        <div className="flex items-center gap-1 border-b border-border bg-surface-2 px-3 py-1.5" aria-hidden>
          <span className="size-1.5 rounded-full bg-border-strong" />
          <span className="size-1.5 rounded-full bg-border-strong" />
          <span className="size-1.5 rounded-full bg-border-strong" />
        </div>
        <div className="divide-y divide-border/50">
          {screen.blocks.map((b, i) => (
            <Block key={i} b={b} />
          ))}
        </div>
      </div>
    </figure>
  );
}

export function WireframeCanvas({ spec, locale }: { spec: WireframeSpec; locale: 'en' | 'ar' }) {
  return (
    <div dir={locale === 'ar' ? 'rtl' : 'ltr'} lang={locale} className="grid gap-x-6 gap-y-8 md:grid-cols-2 2xl:grid-cols-3">
      {spec.screens.map((s, i) => (
        <Frame key={i} screen={s} index={i} />
      ))}
    </div>
  );
}
