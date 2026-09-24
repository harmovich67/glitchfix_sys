import { Link } from 'react-router';
import { cn } from '../../lib/utils';
import { useI18n } from '../../lib/i18n';

export function LogoMark({ className }: { className?: string }) {
  const { brand } = useI18n();
  // A custom logo replaces the built-in mark everywhere it appears.
  if (brand.logoUrl) return <img src={brand.logoUrl} alt={brand.name} className={cn('size-8 rounded-[9px] object-contain', className)} />;
  return (
    <svg viewBox="0 0 32 32" className={cn('size-8', className)} aria-hidden>
      <defs>
        <linearGradient id="welco-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6d6bff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#welco-g)" />
      <path d="M16 7l9 9-9 9-9-9z" fill="#fff" opacity=".95" />
      <path d="M16 12l4 4-4 4-4-4z" fill="url(#welco-g)" />
    </svg>
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
