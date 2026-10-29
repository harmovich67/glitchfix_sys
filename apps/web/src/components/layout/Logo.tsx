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
    <img
      src="/icons/logo-mark.png"
      alt=""
      aria-hidden
      draggable={false}
      className={cn(
        'size-8 shrink-0 rounded-[9px] border border-cyan-500/40 bg-[#00010f] object-cover shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all duration-300 hover:border-cyan-400 hover:shadow-[0_0_18px_rgba(0,240,255,0.5)]',
        className,
      )}
    />
  );
}

export function Logo({ to = '/', className }: { to?: string; className?: string }) {
  const { brand } = useI18n();
  return (
    <Link to={to} className={cn('flex items-center gap-2.5 group', className)}>
      <LogoMark />
      <span className="text-[17px] font-bold tracking-tight text-fg transition-colors group-hover:text-cyan-400">
        {brand.name}
      </span>
    </Link>
  );
}
