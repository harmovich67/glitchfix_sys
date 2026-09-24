import { Suspense, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'motion/react';
import {
  Bot, Building2, ChevronsUpDown, FolderKanban, LayoutDashboard, LogOut, Menu as MenuIcon, PieChart, Plus, ScrollText, Settings, ShieldCheck, Sparkles,
  UserRound, Users, Workflow,
} from 'lucide-react';
import { CalendarDays } from 'lucide-react';
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
import type { TimeOffSummary } from '../../lib/types';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  permission?: Permission;
  /** Hidden from clients (internal team only). */
  staffOnly?: boolean;
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

  const timeOff = useQuery({
    queryKey: ['timeoff', 'summary'],
    queryFn: () => api.get<TimeOffSummary>('/time-off/summary'),
    select: (r) => r.review,
    enabled: !isClient,
    refetchInterval: 60_000,
  });

  const main: NavItem[] = [
    { to: '/app', label: t('nav.dashboard'), icon: <LayoutDashboard />, end: true },
    { to: '/app/projects', label: isClient ? t('nav.myProjects') : t('nav.projects'), icon: <FolderKanban /> },
    { to: '/app/clients', label: t('nav.clients'), icon: <Building2 />, permission: 'clients.view' },
    { to: '/app/analytics', label: t('nav.analytics'), icon: <PieChart />, permission: 'analytics.view' },
    { to: '/app/moderation', label: t('nav.moderation'), icon: <ShieldCheck />, permission: 'messages.moderate', badge: moderation.data },
    { to: '/app/team', label: t('nav.team'), icon: <Users />, permission: 'users.manage' },
    { to: '/app/time-off', label: t('nav.timeOff'), icon: <CalendarDays />, staffOnly: true, badge: timeOff.data },
  ];
  const control: NavItem[] = [
    { to: '/app/workflows', label: t('nav.workflows'), icon: <Workflow />, permission: 'workflows.manage' },
    { to: '/app/ai', label: t('nav.ai'), icon: <Bot />, permission: 'ai.manage' },
    { to: '/app/audit', label: t('nav.audit'), icon: <ScrollText />, permission: 'audit.view' },
    { to: '/app/settings', label: t('nav.settings'), icon: <Settings />, permission: 'settings.manage' },
  ];
  const allowed = (i: NavItem) => (!i.permission || can(i.permission)) && (!i.staffOnly || !isClient);
  return { main: main.filter(allowed), control: control.filter(allowed) };
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <ul className="space-y-1">
      {items.map((item) => (
        <li key={item.to}>
          <NavLink
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-all duration-200 select-none',
                isActive
                  ? 'text-brand dark:text-brand-600 font-semibold'
                  : 'text-muted/80 hover:bg-surface-2/70 dark:hover:bg-white/[0.04] hover:text-fg',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <>
                    {/* Active Pill Background */}
                    <motion.span
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl bg-brand/10 dark:bg-brand/15 ring-1 ring-brand/20 dark:ring-brand/30 shadow-xs"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                    {/* Active Edge Indicator Bar */}
                    <motion.span
                      layoutId="nav-active-indicator"
                      className="absolute start-0 inset-y-2 w-1 rounded-full bg-gradient-to-b from-brand to-accent shadow-[0_0_8px_rgba(91,91,246,0.7)]"
                      transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  </>
                )}

                {/* Icon with smooth micro-interaction */}
                <span
                  className={cn(
                    'relative flex size-5 items-center justify-center transition-all duration-200 shrink-0 [&_svg]:size-[18px]',
                    isActive
                      ? 'text-brand dark:text-brand-600 scale-105'
                      : 'text-muted/70 group-hover:text-fg group-hover:scale-110',
                  )}
                >
                  {item.icon}
                </span>

                {/* Label */}
                <span className="relative flex-1 truncate">{item.label}</span>

                {/* Notification Badge */}
                {!!item.badge && (
                  <span className="relative flex items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs">
                    {item.badge}
                  </span>
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
  const { t, locale } = useI18n();
  const isAr = locale === 'ar';
  const { user, isClient, logout } = useAuth();
  const { main, control } = useNav();
  const navigate = useNavigate();
  const createProject = useCreateProject();

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Subtle ambient lighting effects */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-brand/5 via-accent/3 to-transparent dark:from-brand/10 dark:via-accent/4" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-brand/5 to-transparent dark:from-brand/8" />

      {/* Header & Logo */}
      <div className="relative flex h-16 items-center justify-between px-4 border-b border-border/50">
        <Logo to="/app" />
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 dark:bg-brand/20 px-2.5 py-0.5 text-[10.5px] font-semibold text-brand ring-1 ring-brand/20 dark:ring-brand/30">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>PRO</span>
        </span>
      </div>

      {/* Client CTA Button */}
      {isClient && (
        <div className="px-3 pt-3 pb-1">
          <Button
            className="w-full justify-center shadow-md shadow-brand/20 hover:shadow-lg hover:shadow-brand/35 transition-all duration-300 font-semibold rounded-xl bg-gradient-to-r from-brand via-brand-600 to-indigo-600 hover:brightness-105 active:scale-[0.98]"
            leftIcon={<Plus className="size-4" />}
            loading={createProject.isPending}
            onClick={() => createProject.mutate()}
          >
            {t('nav.newProject')}
          </Button>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 space-y-4 overflow-y-auto px-3 py-3 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-thumb]:rounded-full scrollbar-none">
        <NavList items={main} onNavigate={onNavigate} />

        {control.length > 0 && (
          <div className="pt-2">
            <div className="my-2 mx-2 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
            <div className="flex items-center gap-2 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-muted/70">
              <span className="size-1 rounded-full bg-brand/50" />
              <span>{t('nav.control')}</span>
            </div>
            <NavList items={control} onNavigate={onNavigate} />
          </div>
        )}
      </nav>

      {/* Help Card for Clients */}
      {isClient && (
        <div className="mx-3 mb-2 shrink-0 overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-brand/5 to-accent/10 p-3.5 backdrop-blur-sm shadow-xs transition-all hover:border-brand/35 hover:shadow-md">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Sparkles className="size-4" />
            </div>
            <p className="text-[13px] font-semibold text-fg">{t('nav.help')}</p>
          </div>
          <p className="text-xs text-muted leading-relaxed">{t('nav.helpBody')}</p>
        </div>
      )}

      {/* Footer User & Status Section */}
      <div className="mt-auto shrink-0 border-t border-border/60 bg-surface/50 dark:bg-surface-2/20 backdrop-blur-md p-3 space-y-2">
        {/* System Status Indicator */}
        <div className="flex items-center justify-between px-1.5 text-[11px] text-muted/70">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span className="font-medium text-[11px] text-muted">{isAr ? 'النظام متصل' : 'System online'}</span>
          </div>
          <span className="text-[10px] font-mono text-muted/50 font-medium tracking-wide">Welco OS</span>
        </div>

        {/* User Card */}
        <Menu.Root modal={false}>
          <Menu.Trigger asChild>
            <button
              type="button"
              className="group relative flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-surface/80 dark:bg-surface/50 p-2.5 text-start shadow-xs transition-all duration-200 hover:border-brand/40 hover:bg-surface dark:hover:bg-surface-2 hover:shadow-sm focus-visible:ring-2 focus-visible:ring-brand cursor-pointer"
            >
              <div className="relative shrink-0">
                <Avatar
                  name={user?.name ?? '?'}
                  size="sm"
                  className="ring-2 ring-brand/20 group-hover:ring-brand/50 transition-all duration-200"
                />
                <span className="absolute -bottom-0.5 -end-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-surface dark:ring-[#101017]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="block truncate text-[13px] font-semibold text-fg group-hover:text-brand transition-colors">
                    {user?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-block truncate rounded-md bg-brand-soft/80 px-1.5 py-0.5 text-[10px] font-semibold text-brand dark:text-brand-600">
                    {user ? t(`roles.${user.role}`) : ''}
                  </span>
                </div>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted/50 group-hover:text-fg transition-colors" />
            </button>
          </Menu.Trigger>
          <Menu.Content
            side="top"
            align="center"
            sideOffset={8}
            className="w-[var(--radix-dropdown-menu-trigger-width,244px)] min-w-[240px] shadow-2xl border border-border/80 backdrop-blur-xl bg-surface/95 dark:bg-[#12121c]/95"
          >
            <div className="px-3 py-2 border-b border-border/50">
              <p className="text-[11px] font-medium text-muted">{isAr ? 'مسجل الدخول كـ' : 'Signed in as'}</p>
              <p className="truncate text-xs font-semibold text-fg mt-0.5">{user?.email}</p>
            </div>
            <Menu.Item icon={<UserRound className="size-4" />} onSelect={() => navigate('/app/settings')}>
              {t('common.profile')}
            </Menu.Item>
            <Menu.Item icon={<Settings className="size-4" />} onSelect={() => navigate('/app/settings')}>
              {t('nav.settings')}
            </Menu.Item>
            <Menu.Separator />
            <Menu.Item
              icon={<LogOut className="size-4" />}
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
    <div className="flex min-h-screen min-w-0 w-full max-w-full overflow-x-clip bg-bg">
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 self-start border-e border-border/70 bg-surface/75 dark:bg-[#0c0c16]/80 backdrop-blur-2xl lg:block transition-all duration-300">
        <SidebarContent />
      </aside>
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen} title="Navigation" side="start" width="max-w-[280px]">
        <SidebarContent onNavigate={() => setMobileOpen(false)} />
      </Drawer>

      <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-clip pb-24 lg:pb-0">
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

        <main className="min-w-0 flex-1 w-full max-w-full px-3 sm:px-6 lg:px-10 py-4 sm:py-6 lg:py-8">
          {/* Enter-only transition: an exit animation around <Outlet> would render the *new* route twice. */}
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="mx-auto min-w-0 w-full max-w-[1400px]"
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
