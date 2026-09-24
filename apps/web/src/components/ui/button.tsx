import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Slot } from 'radix-ui';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'soft';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white shadow-[0_1px_0_0_rgb(255_255_255/0.18)_inset,0_1px_2px_rgb(0_0_0/0.2),0_6px_16px_-6px_var(--brand)] hover:bg-brand-600 dark:text-white',
  secondary: 'bg-surface text-fg ring-1 ring-inset ring-border shadow-xs hover:bg-surface-2 hover:ring-border-strong',
  outline: 'bg-transparent text-fg ring-1 ring-inset ring-border hover:bg-surface-2',
  ghost: 'bg-transparent text-fg-2 hover:bg-surface-2 hover:text-fg',
  soft: 'bg-brand-soft text-brand hover:bg-brand/15',
  danger: 'bg-danger text-white hover:opacity-90 shadow-sm',
};

const sizes: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs gap-1.5 rounded-lg',
  sm: 'h-8 px-3 text-[13px] gap-1.5 rounded-[10px]',
  md: 'h-10 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-6 text-[15px] gap-2.5 rounded-2xl',
  icon: 'size-10 rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  asChild?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, asChild, leftIcon, rightIcon, className, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    <Comp
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center font-medium whitespace-nowrap transition-all duration-150',
        'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="size-4 animate-spin" /> : leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </Comp>
  );
});
