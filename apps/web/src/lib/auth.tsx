import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { can, hasFinanceAccess, isStaff, type Permission } from '@welco/shared';
import { api } from './api';
import type { User } from './types';
import { useI18n, type Locale } from './i18n';

export function useAuth() {
  const qc = useQueryClient();
  const me = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<{ user: User | null }>('/auth/me').then((r) => r.user),
    staleTime: 5 * 60 * 1000,
  });
  const user = me.data ?? null;

  const logout = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      qc.clear();
      qc.setQueryData(['me'], null);
    },
  });

  return {
    user,
    loading: me.isLoading,
    can: (p: Permission) => can(user?.role, p),
    isStaff: isStaff(user?.role),
    /** Prices, offers and budgets: Super Admin, or staff they granted it to. */
    canViewFinance: hasFinanceAccess(user),
    isClient: user?.role === 'CLIENT',
    logout: () => logout.mutateAsync(),
    setUser: (u: User | null) => qc.setQueryData(['me'], u),
  };
}

/** Switch UI language and persist it on the account so emails & AI replies match. */
export function useLocaleSwitch() {
  const { setLocale } = useI18n();
  const { user, setUser } = useAuth();
  return async (l: Locale) => {
    setLocale(l);
    if (user && user.locale !== l) {
      const res = await api.patch<{ user: User }>('/auth/me', { locale: l }).catch(() => null);
      if (res) setUser(res.user);
    }
  };
}
