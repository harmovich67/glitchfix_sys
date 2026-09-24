import type { Role } from '@welco/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
