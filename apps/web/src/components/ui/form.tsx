import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { Switch as RSwitch, Checkbox as RCheckbox } from 'radix-ui';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

const fieldBase =
  'w-full rounded-xl bg-surface text-fg text-sm ring-1 ring-inset ring-border placeholder:text-muted/70 transition-shadow ' +
  'hover:ring-border-strong focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60 aria-[invalid=true]:ring-danger';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }>(function Input(
  { className, icon, ...props },
  ref,
) {
  if (!icon) return <input ref={ref} className={cn(fieldBase, 'h-10 px-3.5', className)} {...props} />;
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted">{icon}</span>
      <input ref={ref} className={cn(fieldBase, 'h-10 ps-9 pe-3.5', className)} {...props} />
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(fieldBase, 'min-h-28 px-3.5 py-3 leading-relaxed resize-y', className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select ref={ref} className={cn(fieldBase, 'h-10 appearance-none ps-3.5 pe-9 cursor-pointer', className)} {...props}>
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
    </div>
  );
});

export function Label({ children, htmlFor, className, required }: { children: ReactNode; htmlFor?: string; className?: string; required?: boolean }) {
  return (
    <label htmlFor={htmlFor} className={cn('block text-[13px] font-medium text-fg-2', className)}>
      {children}
      {required && <span className="ms-0.5 text-danger">*</span>}
    </label>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  required,
  className,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? <p className="text-xs text-danger">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  id?: string;
}) {
  return (
    <RSwitch.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full bg-surface-3 ring-1 ring-inset ring-border transition-colors data-[state=checked]:bg-brand data-[state=checked]:ring-brand disabled:opacity-50"
    >
      <RSwitch.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-[18px] rtl:data-[state=checked]:-translate-x-[18px] rtl:-translate-x-0.5" />
    </RSwitch.Root>
  );
}

export function Checkbox({ checked, onCheckedChange, className }: { checked: boolean; onCheckedChange?: (v: boolean) => void; className?: string }) {
  return (
    <RCheckbox.Root
      checked={checked}
      onCheckedChange={(v) => onCheckedChange?.(v === true)}
      className={cn(
        'flex size-5 shrink-0 items-center justify-center rounded-md ring-1 ring-inset ring-border-strong bg-surface transition-colors data-[state=checked]:bg-brand data-[state=checked]:ring-brand',
        className,
      )}
    >
      <RCheckbox.Indicator>
        <Check className="size-3.5 text-white" strokeWidth={3} />
      </RCheckbox.Indicator>
    </RCheckbox.Root>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-xl bg-surface-2 p-1 ring-1 ring-inset ring-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg font-medium transition-all',
            size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3.5 py-1.5 text-[13px]',
            value === o.value ? 'bg-surface text-fg shadow-sm ring-1 ring-border' : 'text-muted hover:text-fg',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
