import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Link, Navigate, Outlet, Route, RouterProvider, createBrowserRouter, createRoutesFromElements, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { Compass } from 'lucide-react';
import type { Permission } from '@welco/shared';
import { useAuth, useLocaleSwitch } from './lib/auth';
import { useTheme } from './lib/theme';
import { useI18n } from './lib/i18n';
import { RealtimeBridge } from './lib/realtime';
import { AppShell } from './components/layout/AppShell';
import { EmptyState, PageLoader } from './components/ui/feedback';
import { Button } from './components/ui/button';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage, RegisterPage } from './features/auth/AuthPages';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProjectsPage } from './features/projects/ProjectsPage';

const ProjectPage = lazy(() => import('./features/projects/ProjectPage'));
const WizardPage = lazy(() => import('./features/wizard/WizardPage'));
const WorkflowsPage = lazy(() => import('./features/workflows/WorkflowsPage'));
const WorkflowBuilderPage = lazy(() => import('./features/workflows/WorkflowBuilderPage'));
const AISettingsPage = lazy(() => import('./features/ai/AISettingsPage'));
const AnalyticsPage = lazy(() => import('./features/analytics/AnalyticsPage'));
const ClientsPage = lazy(() => import('./features/clients/ClientsPage'));
const ClientDetailPage = lazy(() => import('./features/clients/ClientDetailPage'));
const TeamPage = lazy(() => import('./features/team/TeamPage'));
const ModerationPage = lazy(() => import('./features/moderation/ModerationPage'));
const AuditPage = lazy(() => import('./features/audit/AuditPage'));
const NotificationsPage = lazy(() => import('./features/notifications/NotificationsPage'));
const SettingsPage = lazy(() => import('./features/settings/SettingsPage'));

/** Keeps the account's saved language in step with the UI, so AI replies and emails match what the user sees. */
function LocaleSync() {
  const { user } = useAuth();
  const { locale } = useI18n();
  const switchLocale = useLocaleSwitch();
  useEffect(() => {
    if (user && user.locale !== locale) void switchLocale(locale);
  }, [user?.id, user?.locale, locale]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  return (
    <RealtimeBridge userId={user.id}>
      <LocaleSync />
      {children}
    </RealtimeBridge>
  );
}

function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { can } = useAuth();
  return can(permission) ? <>{children}</> : <NotFound />;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to="/app" replace /> : <>{children}</>;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <EmptyState
      icon={<Compass className="size-6" />}
      title="404"
      description={t('common.notFound')}
      action={
        <Button asChild variant="secondary">
          <Link to="/app">{t('common.goHome')}</Link>
        </Button>
      }
      className="min-h-[60vh]"
    />
  );
}

const guarded = (permission: Permission, node: ReactNode) => <RequirePermission permission={permission}>{node}</RequirePermission>;

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Suspense fallback={<PageLoader />}><Outlet /></Suspense>}>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
      <Route path="/app/projects/:id/journey" element={<RequireAuth><WizardPage /></RequireAuth>} />
      <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="projects/:id" element={<ProjectPage />} />
        <Route path="clients" element={guarded('clients.view', <ClientsPage />)} />
        <Route path="clients/:id" element={guarded('clients.view', <ClientDetailPage />)} />
        <Route path="team" element={guarded('users.manage', <TeamPage />)} />
        <Route path="workflows" element={guarded('workflows.manage', <WorkflowsPage />)} />
        <Route path="workflows/:id" element={guarded('workflows.manage', <WorkflowBuilderPage />)} />
        <Route path="ai" element={guarded('ai.manage', <AISettingsPage />)} />
        <Route path="analytics" element={guarded('analytics.view', <AnalyticsPage />)} />
        <Route path="moderation" element={guarded('messages.moderate', <ModerationPage />)} />
        <Route path="audit" element={guarded('audit.view', <AuditPage />)} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Route>,
  ),
);

export function App() {
  const { resolved } = useTheme();
  const { dir } = useI18n();
  return (
    <>
      <Toaster theme={resolved} position={dir === 'rtl' ? 'bottom-left' : 'bottom-right'} richColors closeButton dir={dir} />
      <RouterProvider router={router} />
    </>
  );
}
