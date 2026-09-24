import type { Role } from '@welco/shared';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  locale: string;
  /** Set by the Super Admin: may see prices, offers and the client's budget (a Super Admin always can). */
  financeAccess: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
