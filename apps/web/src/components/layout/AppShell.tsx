import { Suspense, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Bot, Building2, FolderKanban, LayoutDashboard, LogOut, Menu as MenuIcon, PieChart, Plus, ScrollText, Settings, ShieldCheck, Sparkles,
  UserRound, Users, Workflow,
} from 'lucide-react';
import type { Permission } from '@welco/shared';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { api } from '../../lib/api';
import { cn } from '../../lib/utils';
import { Logo } from './Logo';
import { NotificationBell } from './NotificationBell';
import { LanguageToggle, ThemeToggle } from './Preferences';
import { Avatar, PageLoader } from '../ui/feedback';
import { Menu } from '../ui/overlay';
import { Button } from '../ui/button';
import { Drawer } from '../ui/overlay';
import { useCreateProject } from '../../features/projects/useCreateProject';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  permission?: Permission;
  end?: boolean;
  badge?: number;
}

function useNav() {
  const { t } = useI18n();
  const { can, isClient } = useAuth();
  const moderation = useQuery({
    queryKey: ['moderation', 'count'],
    queryFn: () => api.get<{ counts: { pending: number } }>('/moderation?status=PENDING').then((r) => r.counts.pending),
    enabled: can('messages.moderate'),
    refetchInterval: 60_000,
  });

  const main: NavItem[] = [
    { to: '/app', label: t('nav.dashboard'), icon: <LayoutDashboard />, end: true },
    { to: '/app/projects', label: isClient ? t('nav.myProjects') : t('nav.projects'), icon: <FolderKanban /> },
    { to: '/app/clients', label: t('nav.clients'), icon: <Building2 />, permission: 'clients.view' },
    { to: '/app/analytics', label: t('nav.analytics'), icon: <PieChart />, permission: 'analytics.view' },
    { to: '/app/moderation', label: t('nav.moderation'), icon: <ShieldCheck />, permission: 'messages.moderate', badge: moderation.data },
    { to: '/app/team', label: t('nav.team'), icon: <Users />, permission: 'users.manage' },
  ];
  const control: NavItem[] = [
    { to: '/app/workflows', label: t('nav.workflows'), icon: <Workflow />, permission: 'workflows.manage' },
    { to: '/app/ai', label: t('nav.ai'), icon: <Bot />, permission: 'ai.manage' },
    { to: '/app/audit', label: t('nav.audit'), icon: <ScrollText />, permission: 'audit.view' },
    { to: '/app/settings', label: t('nav.settings'), icon: <Settings />, permission: 'settings.manage' },
  ];
  const allowed = (i: NavItem) => !i.permission || can(i.permission);
  return { main: main.filter(allowed), control: control.filter(allowed) };
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-0.5">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13.5px] font-medium transition-colors [&_svg]:size-[18px]',
                isActive ? 'text-fg' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-border"
                    transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                  />
                )}
                <span className={cn('relative', isActive ? 'text-brand' : '')}>{item.icon}</span>
                <span className="relative flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="relative rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-semibold text-white">{item.badge}</span>
                )}
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const { user, isClient, logout } = useAuth();
  const { main, control } = useNav();
  const navigate = useNavigate();
  const createProject = useCreateProject();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-5">
        <Logo to="/app" />
      </div>

      {isClient && (
        <div className="px-3 pb-3">
          <Button className="w-full" leftIcon={<Plus className="size-4" />} loading={createProject.isPending} onClick={() => createProject.mutate()}>
            {t('nav.newProject')}
          </Button>
        </div>
      )}

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-2">
        <NavList items={main} onNavigate={onNavigate} />
        {control.length > 0 && (
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold tracking-wider text-muted/80 uppercase">{t('nav.control')}</p>
            <NavList items={control} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      {isClient && (
        <div className="mx-3 mb-3 overflow-hidden rounded-2xl bg-gradient-to-br from-brand/12 via-fuchsia-500/8 to-accent/12 p-4 ring-1 ring-brand/15">
          <Sparkles className="mb-2 size-5 text-brand" />
          <p className="text-[13px] font-semibold text-fg">{t('nav.help')}</p>
          <p className="mt-1 text-xs text-muted">{t('nav.helpBody')}</p>
        </div>
      )}

      <div className="border-t border-border p-3">
        <Menu.Root>
          <Menu.Trigger asChild>
            <button className="flex w-full items-center gap-3 rounded-xl p-2 text-start transition-colors hover:bg-surface-2">
              <Avatar name={user?.name ?? '?'} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-fg">{user?.name}</span>
                <span className="block truncate text-[11px] text-muted">{user ? t(`roles.${user.role}`) : ''}</span>
              </span>
            </button>
          </Menu.Trigger>
          <Menu.Content align="start" className="w-56">
            <Menu.Label>{user?.email}</Menu.Label>
            <Menu.Item icon={<UserRound />} onSelect={() => navigate('/app/settings')}>
              {t('common.profile')}
            </Menu.Item>
            <Menu.Item icon={<Settings />} onSelect={() => navigate('/app/settings')}>
              {t('nav.settings')}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              icon={<LogOut />}
              danger
              onSelect={async () => {
                await logout();
                navigate('/login');
              }}
            >
              {t('common.signOut')}
            </Menu.Item>
          </Menu.Content>
        </Menu.Root>
      </div>
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { t, locale } = useI18n();
  const isAr = locale === 'ar';
  const { isClient } = useAuth();
  const createProject = useCreateProject();

  return (
    <div className="flex min-h-screen w-full max-w-full overflow-x-hidden bg-bg">
      <aside className="sticky top-0 hidden h-screen w-[260px] shrink-0 border-e border-border bg-bg lg:block">
        <SidebarContent />
      </aside>
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} title="Navigation" side="start" width="max-w-[280px]">
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 flex-1 w-full max-w-full flex-col pb-24 lg:pb-0 overflow-x-hidden">
        <header className="glass sticky top-0 z-30 flex h-14 sm:h-16 w-full max-w-full items-center gap-2 sm:gap-3 border-b border-border px-3 sm:px-6 lg:px-8">
          <Button variant="ghost" size="icon-sm" className="lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Menu">
            <MenuIcon className="size-5" />
          </Button>
          <div className="lg:hidden">
            <Logo to="/app" />
          </div>
          <div className="flex-1" />
          <LanguageToggle />
          <ThemeToggle />
          <NotificationBell />
        </header>

        <main className="flex-1 w-full max-w-full overflow-x-hidden px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
          {/* Enter-only transition: an exit animation around <Outlet> would render the *new* route twice. */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mx-auto w-full max-w-[1400px] overflow-x-hidden"
          >
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </motion.div>
        </main>

        {/* Mobile & Tablet Native App Bottom Dock */}
        <nav
          aria-label="Mobile Navigation Dock"
          className="glass fixed bottom-0 inset-x-0 z-40 border-t border-border/80 lg:hidden px-1.5 pt-1 pb-safe shadow-2xl backdrop-blur-xl"
        >
          <div className="flex items-center justify-between w-full max-w-lg mx-auto">
            <NavLink
              to="/app"
              end
              className={({ isActive }) =>
                cn(
                  'flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand font-bold' : 'text-muted hover:text-fg',
                )
              }
            >
              <LayoutDashboard className="size-4 sm:size-5 shrink-0" />
              <span className="mt-0.5 truncate text-[10px] sm:text-[11px] leading-tight text-center w-full">{t('nav.dashboard')}</span>
            </NavLink>

            <NavLink
              to="/app/projects"
              className={({ isActive }) =>
                cn(
                  'flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand font-bold' : 'text-muted hover:text-fg',
                )
              }
            >
              <FolderKanban className="size-4 sm:size-5 shrink-0" />
              <span className="mt-0.5 truncate text-[10px] sm:text-[11px] leading-tight text-center w-full">{isClient ? t('nav.myProjects') : t('nav.projects')}</span>
            </NavLink>

            {isClient ? (
              <button
                type="button"
                onClick={() => createProject.mutate()}
                className="flex-1 min-w-0 flex flex-col items-center justify-center -mt-5"
                title={t('nav.newProject')}
              >
                <div className="flex size-11 items-center justify-center rounded-full bg-brand text-white shadow-lg shadow-brand/40 ring-4 ring-bg transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                  <Plus className="size-5 shrink-0" />
                </div>
              </button>
            ) : (
              <NavLink
                to="/app/notifications"
                className={({ isActive }) =>
                  cn(
                    'flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium transition-colors',
                    isActive ? 'text-brand font-bold' : 'text-muted hover:text-fg',
                  )
                }
              >
                <NotificationBell />
                <span className="mt-0.5 truncate text-[10px] sm:text-[11px] leading-tight text-center w-full">{t('nav.notifications')}</span>
              </NavLink>
            )}

            <NavLink
              to="/app/settings"
              className={({ isActive }) =>
                cn(
                  'flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium transition-colors',
                  isActive ? 'text-brand font-bold' : 'text-muted hover:text-fg',
                )
              }
            >
              <Settings className="size-4 sm:size-5 shrink-0" />
              <span className="mt-0.5 truncate text-[10px] sm:text-[11px] leading-tight text-center w-full">{t('nav.settings')}</span>
            </NavLink>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex-1 min-w-0 flex flex-col items-center justify-center py-1.5 px-0.5 rounded-xl text-[10px] font-medium text-muted hover:text-fg transition-colors cursor-pointer"
            >
              <MenuIcon className="size-4 sm:size-5 shrink-0" />
              <span className="mt-0.5 truncate text-[10px] sm:text-[11px] leading-tight text-center w-full">{isAr ? 'المزيد' : 'More'}</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}
