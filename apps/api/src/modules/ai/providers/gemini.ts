import { AppError } from '../../../core/errors';

export interface GenerateRequest {
  model: string;
  apiKey: string;
  system: string;
  history: { role: 'user' | 'model'; text: string }[];
  prompt: string;
  temperature: number;
  maxOutputTokens: number;
  /** OpenAPI-subset schema; when set, the model must answer with JSON matching it. */
  responseSchema?: Record<string, unknown>;
}

export interface GenerateResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Google Gemini via the Generative Language REST API (no SDK needed). */
export async function geminiGenerate(req: GenerateRequest): Promise<GenerateResult> {
  const body = {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [
      ...req.history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      { role: 'user', parts: [{ text: req.prompt }] },
    ],
    generationConfig: {
      temperature: req.temperature,
      maxOutputTokens: req.maxOutputTokens,
      ...(req.responseSchema ? { responseMimeType: 'application/json', responseSchema: req.responseSchema } : {}),
    },
  };

  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(req.model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': req.apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (err) {
    throw new AppError(502, 'AI_UNREACHABLE', `Could not reach the AI provider: ${(err as Error).message}`, { retryable: true });
  }

  const data = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    const msg = data.error?.message ?? `HTTP ${res.status}`;
    // Overload / rate-limit / transient server errors can be retried on a fallback model.
    const retryable = [429, 500, 502, 503, 504].includes(res.status);
    throw new AppError(res.status === 429 ? 429 : 502, 'AI_PROVIDER_ERROR', `AI provider error: ${msg}`, { retryable, upstreamStatus: res.status });
  }
  if (data.promptFeedback?.blockReason) throw new AppError(422, 'AI_BLOCKED', 'The AI declined to answer this request.');

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p) => !p.thought)
    .map((p) => p.text ?? '')
    .join('')
    .trim();
  if (!text) {
    const reason = candidate?.finishReason === 'MAX_TOKENS' ? ' (raise “max output tokens” in AI settings)' : '';
    throw new AppError(502, 'AI_EMPTY', `The AI returned an empty response${reason}.`);
  }
  const u = data.usageMetadata ?? {};
  return {
    text,
    inputTokens: u.promptTokenCount ?? 0,
    outputTokens: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
  };
}
