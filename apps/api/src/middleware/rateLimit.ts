import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please slow down.' } },
};

export const globalLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 1500 });
export const authLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 30 });
export const aiLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 20 });
export const uploadLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 120 });
