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
        'relative flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-[#070814] border border-cyan-500/40 shadow-[0_0_12px_rgba(0,240,255,0.3)] overflow-hidden transition-all duration-300 hover:shadow-[0_0_18px_rgba(0,240,255,0.5)] hover:border-cyan-400',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 512 512" className="size-full p-0.5" fill="none">
        <defs>
          <linearGradient id="logo-neon-border" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f0ff" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
          <linearGradient id="logo-neon-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#00f0ff" />
          </linearGradient>
          <linearGradient id="logo-neon-f" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#c026d3" />
          </linearGradient>
        </defs>

        {/* Outer Neon Shield */}
        <path
          d="M 256 68 L 420 162 L 420 350 L 256 444 L 92 350 L 92 162 Z"
          stroke="url(#logo-neon-border)"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />

        {/* 'G' Arc */}
        <path
          d="M 345 180 L 280 180 A 84 84 0 0 0 172 256 A 84 84 0 0 0 256 340 L 326 340 L 326 270 L 260 270"
          stroke="url(#logo-neon-g)"
          strokeWidth="34"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 345 180 L 280 180 A 84 84 0 0 0 172 256 A 84 84 0 0 0 256 340 L 326 340 L 326 270 L 260 270"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Electric Repair Lightning Bolt ('F') */}
        <path
          d="M 320 130 L 230 250 L 285 250 L 205 380"
          stroke="url(#logo-neon-f)"
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 320 130 L 230 250 L 285 250 L 205 380"
          stroke="#ffffff"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
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
