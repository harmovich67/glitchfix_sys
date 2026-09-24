import { useId, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  badge?: ReactNode;
}

/** Underline tabs with an animated indicator. */
export function Tabs<T extends string>({ items, value, onChange, className }: { items: TabItem<T>[]; value: T; onChange: (v: T) => void; className?: string }) {
  const id = useId();
  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-border', className)} role="tablist">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3 pt-2 pb-3 text-[13px] font-medium transition-colors',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {item.icon && <span className="[&>svg]:size-4">{item.icon}</span>}
            {item.label}
            {item.badge}
            {active && <motion.span layoutId={`tab-${id}`} className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
          </button>
        );
      })}
    </div>
  );
}
