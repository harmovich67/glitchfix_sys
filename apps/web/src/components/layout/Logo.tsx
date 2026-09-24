import { Link } from 'react-router';
import { cn } from '../../lib/utils';

export function LogoMark({ className }: { className?: string }) {
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
  return (
    <Link to={to} className={cn('flex items-center gap-2.5', className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-tight text-fg">Welco</span>
    </Link>
  );
}
