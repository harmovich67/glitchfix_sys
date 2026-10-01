import { Router } from 'express';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateMeSchema } from '@welco/shared';
import { clearAuthCookie, requireAuth, setAuthCookie } from '../../middleware/auth';
import { authLimiter } from '../../middleware/rateLimit';
import { validate } from '../../middleware/validate';
import { currentUser } from '../../core/http';
import { usersRepository } from '../users/users.repository';
import { authService } from './auth.service';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), async (req, res) => {
  const { user, token } = await authService.register(req, req.body);
  setAuthCookie(res, token);
  res.status(201).json({ user });
});

authRoutes.post('/login', authLimiter, validate(loginSchema), async (req, res) => {
  const { user, token } = await authService.login(req, req.body);
  setAuthCookie(res, token);
  res.json({ user });
});

authRoutes.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), async (req, res) => {
  await authService.forgotPassword(req, req.body.email);
  res.json({ ok: true, message: 'If this email is registered, reset instructions have been sent.' });
});

authRoutes.post('/reset-password', authLimiter, validate(resetPasswordSchema), async (req, res) => {
  await authService.resetPassword(req, req.body.token, req.body.password);
  res.json({ ok: true, message: 'Password has been reset successfully.' });
});

authRoutes.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.status(204).end();
});

authRoutes.post('/logout-all', requireAuth, async (req, res) => {
  await authService.logoutEverywhere(currentUser(req).id);
  clearAuthCookie(res);
  res.status(204).end();
});

authRoutes.get('/me', async (req, res) => {
  if (!req.user) return res.json({ user: null });
  res.json({ user: await usersRepository.findById(req.user.id) });
});

authRoutes.patch('/me', requireAuth, validate(updateMeSchema), async (req, res) => {
  const { user, token } = await authService.updateMe(req, currentUser(req).id, req.body);
  if (token) setAuthCookie(res, token);
  res.json({ user });
});
