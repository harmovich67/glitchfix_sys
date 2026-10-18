import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function LogoMark({ className }: { className?: string }) {
  const { brand } = useI18n();
  const [imgError, setImgError] = useState(false);

  // A custom logo replaces the built-in mark everywhere it appears if valid
  if (brand.logoUrl && !imgError) {
    return (
      <img
        src={brand.logoUrl}
        alt={brand.name}
        onError={() => setImgError(true)}
        className={cn('size-8 rounded-[9px] object-contain shrink-0', className)}
      />
    );
  }

  return (
    <div
      className={cn(
        'relative flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-[#6d6bff] to-[#22d3ee] shadow-sm overflow-hidden',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 32 32" className="size-full p-1" fill="none">
        <path d="M16 5l10 11-10 11-10-11z" fill="#fff" opacity=".95" />
        <path d="M16 10l5 6-5 6-5-6z" fill="#6d6bff" />
      </svg>
    </div>
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  const { brand } = useI18n();
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-fg">{brand.name}</span>
    </Link>
  );
}
