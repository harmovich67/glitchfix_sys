import { useQuery } from '@tanstack/react-query';
import type { BrandSettings, ContactInfo, Role, SeoSettings } from '@welco/shared';
import { api } from './api';

/** What the public site needs from the platform settings (no login required). */
export interface PublicSettings {
  allowClientRegistration: boolean;
  /** One-click sign-in buttons: demo accounts that still exist with the demo password. */
  demoAccounts?: { email: string; role: Role }[];
  contact?: ContactInfo;
  brand?: Partial<BrandSettings>;
  seo?: Partial<SeoSettings>;
}

export const DEFAULT_BRAND: BrandSettings = {
  nameEn: 'Welco',
  nameAr: 'ويلكو',
  taglineEn: 'Project Discovery',
  taglineAr: 'استكشاف المشاريع',
  logoUrl: '',
  faviconUrl: '',
};

/** The name every built-in string was written with; swapped for the configured brand at render time. */
const BUILT_IN_NAME = /\bWelco\b|ويلكو/g;

export function brandify(text: string, name: string) {
  return text.replace(/WELCO/g, name.toUpperCase()).replace(BUILT_IN_NAME, name);
}

/** Latin, URL-safe form of the English name — for the fake addresses and codes shown in the landing demos. */
export const brandSlug = (nameEn: string) => nameEn.toLowerCase().replace(/[^a-z0-9]+/g, '') || 'app';

export interface ResolvedBrand {
  name: string;
  /** e.g. "nexora" — used in demo URLs and codes. */
  slug: string;
  tagline: string;
  logoUrl: string;
  faviconUrl: string;
}

export function resolveBrand(brand: Partial<BrandSettings> | undefined, locale: 'en' | 'ar'): ResolvedBrand {
  const b = { ...DEFAULT_BRAND, ...brand };
  const ar = locale === 'ar';
  return {
    slug: brandSlug(b.nameEn),
    name: (ar ? b.nameAr || b.nameEn : b.nameEn || b.nameAr) || 'Welco',
    tagline: (ar ? b.taglineAr || b.taglineEn : b.taglineEn || b.taglineAr) ?? '',
    logoUrl: b.logoUrl,
    faviconUrl: b.faviconUrl,
  };
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.get<PublicSettings>('/settings/public'),
    staleTime: 5 * 60_000,
  });
}
