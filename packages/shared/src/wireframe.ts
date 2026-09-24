/**
 * AI wireframes: a rough, low-fidelity first look at the product that the team can show the client.
 * A wireframe is plain data (screens made of blocks) — never HTML — so it is safe to render for anyone
 * and the API, the AI and the UI all speak the same small vocabulary.
 */

export const WIREFRAME_STATUSES = ['DRAFT', 'SHARED', 'APPROVED', 'CHANGES_REQUESTED', 'WITHDRAWN', 'SUPERSEDED'] as const;
export type WireframeStatus = (typeof WIREFRAME_STATUSES)[number];

export const WIREFRAME_BLOCKS = [
  'navbar',
  'hero',
  'features',
  'cards',
  'gallery',
  'text',
  'list',
  'form',
  'pricing',
  'testimonials',
  'stats',
  'table',
  'cta',
  'footer',
] as const;
export type WireframeBlockType = (typeof WIREFRAME_BLOCKS)[number];

export interface WireframeBlock {
  type: WireframeBlockType;
  title?: string;
  text?: string;
  /** Short labels: menu entries, feature names, form fields, table columns… */
  items?: string[];
}

export interface WireframeScreen {
  name: string;
  /** One line on what the visitor does on this screen. */
  purpose?: string;
  blocks: WireframeBlock[];
}

export interface WireframeSpec {
  title: string;
  summary?: string;
  screens: WireframeScreen[];
}

export const WIREFRAME_LIMITS = { screens: 8, blocks: 12, items: 8 } as const;

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/**
 * Turn whatever the AI (or an old row) returned into a valid spec: unknown block types become plain text,
 * over-long values are trimmed and empty screens are dropped. Returns null when nothing usable is left.
 */
export function normalizeWireframeSpec(raw: unknown): WireframeSpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const screens: WireframeScreen[] = (Array.isArray(r.screens) ? r.screens : [])
    .slice(0, WIREFRAME_LIMITS.screens)
    .map((s: unknown) => {
      const sc = (s ?? {}) as Record<string, unknown>;
      const blocks: WireframeBlock[] = (Array.isArray(sc.blocks) ? sc.blocks : [])
        .slice(0, WIREFRAME_LIMITS.blocks)
        .map((b: unknown) => {
          const bl = (b ?? {}) as Record<string, unknown>;
          const type = (WIREFRAME_BLOCKS as readonly string[]).includes(String(bl.type)) ? (bl.type as WireframeBlockType) : 'text';
          const items = (Array.isArray(bl.items) ? bl.items : []).map((i) => clip(i, 60)).filter(Boolean).slice(0, WIREFRAME_LIMITS.items);
          return {
            type,
            ...(clip(bl.title, 80) ? { title: clip(bl.title, 80) } : {}),
            ...(clip(bl.text, 240) ? { text: clip(bl.text, 240) } : {}),
            ...(items.length ? { items } : {}),
          };
        });
      return { name: clip(sc.name, 60), ...(clip(sc.purpose, 160) ? { purpose: clip(sc.purpose, 160) } : {}), blocks };
    })
    .filter((s) => s.name && s.blocks.length > 0);
  if (!screens.length) return null;
  return { title: clip(r.title, 120) || screens[0]!.name, ...(clip(r.summary, 400) ? { summary: clip(r.summary, 400) } : {}), screens };
}
