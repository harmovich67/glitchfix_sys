import type { AISettings } from '@prisma/client';
import type { AISettingsInput, AIPersona } from '@welco/shared';
import { env } from '../../config/env';
import { prisma } from '../../core/prisma';
import { decryptSecret, encryptSecret, maskSecret } from '../../core/crypto';

export const DEFAULT_INSTRUCTIONS = `You help clients of a digital agency describe the project they want built.
- Most clients are not technical: avoid jargon, and when you use a technical term explain it in one short sentence.
- Recommend features that match the client's business goals. Prefer a focused first version (MVP) over everything at once.
- Ask at most two smart follow-up questions that uncover missing requirements (audience, content, integrations, scale).
- Never promise prices, delivery dates or specific technologies; say the team will confirm these after review.
- Keep replies under 140 words, friendly and confident, using short paragraphs or bullet points.`;

export const PERSONAS: Record<AIPersona, string> = {
  consultant:
    'You are Welco Assistant, a senior digital product consultant. You are warm, structured and business-focused, like a trusted advisor in a discovery workshop.',
  friendly: 'You are Welco Assistant, an upbeat and encouraging guide. You celebrate progress and keep things light and simple.',
  concise: 'You are Welco Assistant. You answer in the fewest words possible, using bullet points, with no small talk.',
  technical:
    'You are Welco Assistant, a pragmatic solutions architect. You are precise and may mention common technical approaches, while staying understandable.',
};

export async function getAISettings(): Promise<AISettings> {
  const existing = await prisma.aISettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return prisma.aISettings.create({ data: { id: 1, model: env.GEMINI_MODEL, systemPrompt: DEFAULT_INSTRUCTIONS } });
}

/** Key from admin settings (encrypted in DB) takes precedence over the env fallback. */
export function effectiveApiKey(s: AISettings): string | null {
  return decryptSecret(s.apiKeyEnc) || env.GEMINI_API_KEY || null;
}

export function publicSettings(s: AISettings) {
  const stored = decryptSecret(s.apiKeyEnc);
  const { apiKeyEnc: _omit, ...rest } = s;
  return {
    ...rest,
    apiKeyMasked: maskSecret(stored),
    apiKeySource: stored ? 'settings' : env.GEMINI_API_KEY ? 'environment' : 'none',
    mode: effectiveApiKey(s) ? 'live' : 'demo',
  };
}

export async function updateAISettings(input: AISettingsInput, actorId: string) {
  const { apiKey, ...rest } = input;
  const data: Partial<AISettings> = { ...rest, updatedById: actorId };
  if (apiKey === '__clear__') data.apiKeyEnc = null;
  else if (apiKey && apiKey.trim()) data.apiKeyEnc = encryptSecret(apiKey.trim());
  await getAISettings();
  return prisma.aISettings.update({ where: { id: 1 }, data });
}
