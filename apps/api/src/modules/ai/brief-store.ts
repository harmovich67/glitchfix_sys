/**
 * AI project briefs are kept per language so an Arabic-speaking manager and an English-speaking
 * developer each read the brief in their own language. Stored as JSON in `Project.aiBrief`;
 * older plain-text briefs are still readable (their language is detected from the script).
 */
export const BRIEF_LOCALES = ['en', 'ar'] as const;
export type BriefLocale = (typeof BRIEF_LOCALES)[number];

export interface StoredBrief {
  text: string;
  generatedAt: string;
  model?: string;
  mock?: boolean;
}

export type BriefMap = Partial<Record<BriefLocale, StoredBrief>>;

export const isBriefLocale = (v: unknown): v is BriefLocale => typeof v === 'string' && (BRIEF_LOCALES as readonly string[]).includes(v);

/** Mostly-Arabic text → 'ar', otherwise 'en'. */
export function detectLocale(text: string): BriefLocale {
  const letters = text.match(/\p{L}/gu) ?? [];
  const arabic = text.match(/[؀-ۿ]/g) ?? [];
  return letters.length && arabic.length / letters.length > 0.3 ? 'ar' : 'en';
}

export function parseBriefs(raw: string | null | undefined, fallbackDate?: Date): BriefMap | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const map: BriefMap = {};
      for (const l of BRIEF_LOCALES) {
        const b = (parsed as Record<string, StoredBrief | undefined>)[l];
        if (b && typeof b.text === 'string') map[l] = b;
      }
      return Object.keys(map).length ? map : null;
    }
  } catch {
    /* legacy plain-text brief */
  }
  return { [detectLocale(raw)]: { text: raw, generatedAt: (fallbackDate ?? new Date()).toISOString() } };
}

export const serializeBriefs = (map: BriefMap) => JSON.stringify(map);
