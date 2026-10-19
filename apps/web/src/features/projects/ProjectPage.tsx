import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowLeft, ArrowRight, Building2, CalendarClock, CircleHelp, ClipboardList, FolderOpen, Languages, LayoutGrid, Lock, Mail, MessagesSquare, Phone,
  ScrollText, Settings2, Sparkles, Wrench, FileSignature, LayoutTemplate, Globe,
} from 'lucide-react';
import { formatAnswer, allQuestions } from '@welco/shared';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { useProjectRoom } from '../../lib/realtime';
import type { ProjectDetail, ProposalsResponse, ThreadsResponse, WireframesResponse } from '../../lib/types';
import { countryName, flag, formatDate, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge, Card, CardHeader, PriorityBadge, StatusBadge } from '../../components/ui/surfaces';
import { Avatar, EmptyState, PageLoader, ProgressRing } from '../../components/ui/feedback';
import { Tabs } from '../../components/ui/tabs';
import { SegmentedControl } from '../../components/ui/form';
import { Markdown } from '../../components/ui/markdown';
import { DueLabel, StatusTracker, TypeTile } from './components';
import { ThreadView } from './ThreadView';
import { FilesPanel } from './FilesPanel';
import { WorkspacePanel } from './WorkspacePanel';
import { ManagePanel } from './ManagePanel';
import { RequirementsView } from './RequirementsView';
import { TechnicalReportsPanel } from '../reports/TechnicalReportsPanel';
import { ProposalPanel } from '../proposals/ProposalPanel';
import { WireframePanel } from '../wireframes/WireframePanel';
import { Timeline } from './Timeline';
import { FixAccessCard, FixAnalysisCard, FixDetailsCard } from '../fixes/FixRequestPanel';

type Tab = 'overview' | 'requirements' | 'proposal' | 'design' | 'conversation' | 'files' | 'workspace' | 'manage';

type BriefLang = 'en' | 'ar';

/**
 * The brief follows the viewer's language: it shows their version when it exists, otherwise the
 * other language with a one-click "generate in my language". Both versions are kept side by side.
 */
function BriefCard({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const briefs = project.aiBriefs ?? {};
  const mine = locale as BriefLang;
  const other: BriefLang = mine === 'ar' ? 'en' : 'ar';
  const [viewing, setViewing] = useState<BriefLang | null>(null);
  const shownLang: BriefLang | null = viewing && briefs[viewing] ? viewing : briefs[mine] ? mine : briefs[other] ? other : null;
  const shown = shownLang ? briefs[shownLang] : undefined;
  const langName = (l: BriefLang) => t(l === 'ar' ? 'hub.langAr' : 'hub.langEn');

  const gen = useMutation({
    mutationFn: (target: BriefLang) => api.post<{ locale: BriefLang }>(`/ai/projects/${project.id}/brief`, { locale: target }),
    onSuccess: (r) => {
      setViewing(r.locale);
      qc.invalidateQueries({ queryKey: ['project', project.id] });
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('hub.brief')}
        icon={<Sparkles className="size-4" />}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {briefs.en && briefs.ar && shownLang && (
              <SegmentedControl
                size="sm"
                value={shownLang}
                onChange={setViewing}
                options={[
                  { value: 'ar', label: 'عربي' },
                  { value: 'en', label: 'EN' },
                ]}
              />
            )}
            {briefs[mine] ? (
              <Button size="sm" variant="secondary" loading={gen.isPending} onClick={() => gen.mutate(shownLang ?? mine)} leftIcon={<Sparkles className="size-4" />}>
                {t('hub.regenerateBrief')}
              </Button>
            ) : (
              <Button size="sm" loading={gen.isPending} onClick={() => gen.mutate(mine)} leftIcon={<Sparkles className="size-4" />}>
                {shown ? t('hub.generateIn', { lang: langName(mine) }) : t('hub.generateBrief')}
              </Button>
            )}
          </div>
        }
      />
      <div className="px-5 pb-5">
        {shown && shownLang ? (
          <>
            {shownLang !== mine && !briefs[mine] && (
              <p className="mb-3 flex items-center gap-2 rounded-xl bg-info-soft/60 px-3.5 py-2.5 text-[13px] text-fg-2 ring-1 ring-info/15">
                <Languages className="size-4 shrink-0 text-info" />
                {t('hub.briefOtherLang', { lang: langName(shownLang) })}
              </p>
            )}
            <div dir={shownLang === 'ar' ? 'rtl' : 'ltr'} lang={shownLang} className="max-h-[520px] overflow-y-auto rounded-xl bg-surface-2/50 p-5 ring-1 ring-border">
              <Markdown source={shown.text} />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {t('hub.briefMeta', { time: timeAgo(shown.generatedAt, locale), lang: langName(shownLang) })}
              {shown.model ? ` · ${shown.model}` : shown.mock ? ` · ${t('common.demo')}` : ''}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">{t('hub.briefEmpty')}</p>
        )}
      </div>
    </Card>
  );
}

function Overview({ project, threads, onTab }: { project: ProjectDetail; threads?: ThreadsResponse; onTab: (t: Tab) => void }) {
  const { t, locale } = useI18n();
  const { isClient } = useAuth();
  const typeQ = allQuestions(project.workflow).find((q) => q.key === 'project_type');
  const openClarifications =
    threads?.threads.find((th) => th.type === 'CLIENT')?.messages.filter((m) => m.kind === 'CLARIFICATION' && !m.resolvedAt && m.status === 'VISIBLE') ?? [];
  const cp = project.client.clientProfile;
  const proposals = useQuery({ queryKey: ['proposals', project.id], queryFn: () => api.get<ProposalsResponse>(`/projects/${project.id}/proposals`), enabled: isClient });
  const waiting = proposals.data?.proposals.find((p) => p.status === 'SENT' && !p.expired);
  const fix = project.kind === 'FIX' ? project.fixRequest : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        {waiting && (
          <Card className="overflow-hidden bg-gradient-to-br from-brand-soft via-surface to-surface p-5 ring-brand/25">
            <div className="flex flex-wrap items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand text-white"><FileSignature className="size-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">{t('proposal.feed.awaitingYou')}</p>
                <p className="text-[13px] text-muted">{t('proposal.feed.validFor', { date: formatDate(waiting.validUntil, locale) })}</p>
              </div>
              <Button onClick={() => onTab('proposal')} rightIcon={<ArrowRight className="rtl-flip size-4" />}>{t('proposal.feed.reviewApprove')}</Button>
            </div>
          </Card>
        )}
        <Card className="p-6">
          <p className="mb-5 text-sm font-semibold">{t('status_tracker.title')}</p>
          <StatusTracker status={project.status} />
        </Card>

        {openClarifications.length > 0 && (
          <Card className="bg-warning-soft/40 p-5 ring-warning/25">
            <div className="flex items-center gap-2 text-sm font-semibold text-warning">
              <CircleHelp className="size-4" /> {t('hub.openClarifications')} · {openClarifications.length}
            </div>
            <ul className="mt-3 space-y-2">
              {openClarifications.map((m) => (
                <li key={m.id} className="rounded-xl bg-surface p-3 text-sm ring-1 ring-border">
                  <p className="text-fg">{m.body}</p>
                  <p className="mt-1 text-xs text-muted">{m.author?.name}</p>
                </li>
              ))}
            </ul>
            <Button size="sm" className="mt-3" onClick={() => onTab('conversation')} rightIcon={<ArrowRight className="rtl-flip size-4" />}>
              {t('hub.answerIt')}
            </Button>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {fix ? (
            <Card className="flex items-center gap-4 p-5">
              <TypeTile type="fix" />
              <div className="min-w-0">
                <p className="text-xs text-muted">{t('fix.kindBadge')}</p>
                <p className="text-sm font-semibold">{project.submittedAt ? t('hub.submittedOn', { date: formatDate(project.submittedAt, locale) }) : '—'}</p>
              </div>
            </Card>
          ) : (
            <Card className="flex items-center gap-4 p-5">
              <ProgressRing value={project.progress} />
              <div>
                <p className="text-xs text-muted">{t('hub.progress')}</p>
                <p className="text-sm font-semibold">{project.submittedAt ? t('hub.submittedOn', { date: formatDate(project.submittedAt, locale) }) : t('hub.notSubmitted')}</p>
              </div>
            </Card>
          )}
          <Card className="flex items-center gap-4 p-5">
            {fix ? (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg-2 ring-1 ring-border">
                <Globe className="size-5" />
              </div>
            ) : (
              <TypeTile type={project.projectType} />
            )}
            <div className="min-w-0">
              <p className="text-xs text-muted">{fix ? t('fix.platformLabel') : t('hub.projectType')}</p>
              <p className="truncate text-sm font-semibold">
                {fix ? (fix.platform ? t(`fix.platforms.${fix.platform}`) : '—') : project.projectType && typeQ ? formatAnswer(typeQ, project.projectType, locale)[0] : '—'}
              </p>
            </div>
          </Card>
          <Card className="flex items-center gap-4 p-5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-info-soft text-info">
              <CalendarClock className="size-5" />
            </div>
            <div>
              <p className="text-xs text-muted">{t('common.dueDate')}</p>
              <p className="text-sm font-semibold">{project.dueDate ? formatDate(project.dueDate, locale) : t('common.notSet')}</p>
              <DueLabel date={project.dueDate} />
            </div>
          </Card>
        </div>

        {fix ? (
          <>
            {isClient && project.status === 'UNDER_REVIEW' && (
              <Card className="bg-gradient-to-br from-brand-soft via-surface to-surface p-5">
                <p className="text-sm text-fg-2">{t('fix.clientNext')}</p>
              </Card>
            )}
            {project.access.canWork && <FixAnalysisCard project={project} />}
            <FixDetailsCard project={project} onFiles={() => onTab('files')} />
          </>
        ) : (
          <>
            {project.access.canWork && <BriefCard project={project} />}
            {isClient && <RequirementsView project={project} />}
          </>
        )}
      </div>

      <div className="space-y-6">
        {fix && (project.access.canWork || project.access.isOwner) && <FixAccessCard project={project} />}
        <Card>
          <CardHeader title={t('hub.teamTitle')} />
          <div className="space-y-1 px-3 pb-4">
            {project.members.length ? (
              project.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                  <Avatar name={m.user.name} />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{m.user.name}</p>
                    <p className="truncate text-xs text-muted">{m.role === 'MANAGER' ? t('manage.asManager') : m.user.developerProfile?.title ?? t('manage.asDeveloper')}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-2 text-sm text-muted">{t('hub.noTeam')}</p>
            )}
          </div>
        </Card>

        {!isClient && (
          <Card>
            <CardHeader title={t('hub.clientContact')} />
            <div className="space-y-3 px-5 pb-5 text-[13px]">
              <div className="flex items-center gap-3">
                <Avatar name={project.client.name} />
                <div className="min-w-0">
                  <Link to={`/app/clients/${project.client.id}`} className="font-medium hover:text-brand">{project.client.name}</Link>
                  <p className="text-xs text-muted">{cp?.companyName}</p>
                </div>
              </div>
              <p className="flex items-center gap-2 text-fg-2"><Mail className="size-4 text-muted" />{project.client.email}</p>
              {cp?.phone && <p className="flex items-center gap-2 text-fg-2" dir="ltr"><Phone className="size-4 text-muted" />{cp.phone}</p>}
              {cp?.country && <p className="flex items-center gap-2 text-fg-2"><Building2 className="size-4 text-muted" />{flag(cp.country)} {countryName(cp.country, locale)}</p>}
            </div>
          </Card>
        )}

        <Timeline projectId={project.id} />
      </div>
    </div>
  );
}

/** Requirements tab: the client's dossier, plus (for the team) the AI technical reports and their version log. */
function RequirementsTab({ project }: { project: ProjectDetail }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const view: 'dossier' | 'reports' = params.get('view') === 'reports' && project.access.canWork ? 'reports' : 'dossier';
  const setView = (v: 'dossier' | 'reports') =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (v === 'reports') next.set('view', 'reports');
      else next.delete('view');
      return next;
    }, { replace: true });

  return (
    <div className="space-y-5">
      {project.access.canWork && (
        <SegmentedControl
          value={view}
          onChange={setView}
          options={[
            { value: 'dossier', label: <span className="inline-flex items-center gap-2"><ClipboardList className="size-4" />{t('report.tabDossier')}</span> },
            { value: 'reports', label: <span className="inline-flex items-center gap-2"><ScrollText className="size-4" />{t('report.tabReports')}</span> },
          ]}
        />
      )}
      {view === 'reports' ? (
        <TechnicalReportsPanel project={project} />
      ) : project.kind === 'FIX' && project.fixRequest ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
          <FixDetailsCard project={project} />
          <FixAccessCard project={project} />
        </div>
      ) : (
        <RequirementsView project={project} />
      )}
    </div>
  );
}

export default function ProjectPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const { isClient } = useAuth();
  const [params, setParams] = useSearchParams();
  useProjectRoom(id);

  const projectQ = useQuery({ queryKey: ['project', id], queryFn: () => api.get<ProjectDetail>(`/projects/${id}`) });
  const threads = useQuery({ queryKey: ['threads', id], queryFn: () => api.get<ThreadsResponse>(`/projects/${id}/threads`), enabled: !!projectQ.data });
  const project = projectQ.data;
  const proposalsQ = useQuery({
    queryKey: ['proposals', id],
    queryFn: () => api.get<ProposalsResponse>(`/projects/${id}/proposals`),
    // Offers carry prices: the client, and the people cleared for finances, are the only ones who load them.
    enabled: !!project && (project.access.canViewFinance || isClient),
  });
  const wireframesQ = useQuery({
    queryKey: ['wireframes', id],
    queryFn: () => api.get<WireframesResponse>(`/projects/${id}/wireframes`),
    enabled: !!project && project.kind !== 'FIX' && (isClient || project.access.canWork),
  });

  if (projectQ.isLoading) return <PageLoader />;
  if (!project)
    return <EmptyState title="404" description={errorMessage(projectQ.error)} action={<Button asChild variant="secondary"><Link to="/app/projects">{t('common.back')}</Link></Button>} />;

  const tabs: { value: Tab; label: string; icon: React.ReactNode; badge?: React.ReactNode }[] = [
    { value: 'overview', label: t('hub.overview'), icon: <LayoutGrid /> },
    { value: 'requirements', label: t('hub.requirements'), icon: <ClipboardList /> },
    ...(project.access.canViewFinance || (isClient && proposalsQ.data?.proposals.length)
      ? [{
          value: 'proposal' as Tab,
          label: t('proposal.tab'),
          icon: <FileSignature />,
          badge: isClient && proposalsQ.data?.proposals.some((p) => p.status === 'SENT' && !p.expired) ? <span className="size-2 rounded-full bg-warning" /> : undefined,
        }]
      : []),
    ...(project.kind !== 'FIX' && (project.access.canManage || (wireframesQ.data?.wireframes.length ?? 0) > 0)
      ? [{
          value: 'design' as Tab,
          label: t('wireframe.tab'),
          icon: <LayoutTemplate />,
          badge: isClient && wireframesQ.data?.wireframes.some((w) => w.status === 'SHARED') ? <span className="size-2 rounded-full bg-warning" /> : undefined,
        }]
      : []),
    { value: 'conversation', label: t('hub.conversation'), icon: <MessagesSquare /> },
    { value: 'files', label: t('hub.files'), icon: <FolderOpen /> },
  ];
  if (project.access.canWork) tabs.push({ value: 'workspace', label: t('hub.workspace'), icon: <Wrench /> });
  if (project.access.canManage || project.access.canAssign) tabs.push({ value: 'manage', label: t('hub.manage'), icon: <Settings2 /> });
  if (isClient) tabs.splice(1, 1); // clients see the dossier inside the overview

  const requested = params.get('tab') as Tab | null;
  const tab: Tab = requested && tabs.some((x) => x.value === requested) ? requested : 'overview';
  const setTab = (v: Tab) => setParams(v === 'overview' ? {} : { tab: v }, { replace: true });
  const draft = project.status === 'STARTED' || project.status === 'REQUIREMENTS';
  const clientThread = threads.data?.threads.find((th) => th.type === 'CLIENT');

  return (
    <>
      <Link to="/app/projects" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="rtl-flip size-4" /> {isClient ? t('nav.myProjects') : t('nav.projects')}
      </Link>

      <div className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-center">
        <TypeTile type={project.kind === 'FIX' ? 'fix' : project.projectType} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold sm:text-[28px]">{project.title}</h1>
            <StatusBadge status={project.status} />
            {project.kind === 'FIX' && (
              <Badge className="bg-orange-500/10 text-orange-700 ring-orange-500/25 dark:text-orange-300">
                <Wrench className="size-3" /> {t('fix.kindBadge')}
              </Badge>
            )}
            {!isClient && <PriorityBadge priority={project.priority} />}
            {project.approvedAt && (
              <Badge className="bg-success-soft text-success ring-success/20">
                <Lock className="size-3" /> {t('hub.locked')}
              </Badge>
            )}
          </div>
          <p className="mt-1 font-mono text-xs text-muted">
            {project.code}
            {!isClient && ` · ${project.client.clientProfile?.companyName || project.client.name}`}
          </p>
        </div>
        {project.kind !== 'FIX' && project.access.canEditAnswers && (isClient || draft) && (
          <Button asChild size="lg" rightIcon={<ArrowRight className="rtl-flip size-4" />}>
            <Link to={`/app/projects/${project.id}/journey`}>{draft ? t('hub.continue') : t('hub.editAnswers')}</Link>
          </Button>
        )}
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} className="mb-6" />

      {tab === 'overview' && <Overview project={project} threads={threads.data} onTab={setTab} />}
      {tab === 'requirements' && <RequirementsTab project={project} />}
      {tab === 'proposal' && <ProposalPanel project={project} />}
      {tab === 'design' && <WireframePanel project={project} />}
      {tab === 'conversation' && (
        <Card className="overflow-hidden">
          {clientThread ? (
            <ThreadView
              thread={clientThread}
              projectId={project.id}
              canModerate={!!threads.data?.canModerate}
              canResolve={project.access.isOwner || project.access.canWork}
              developerClientMode={threads.data?.developerClientMode}
              heightClass="h-[calc(100vh-320px)] min-h-[480px]"
            />
          ) : (
            <PageLoader />
          )}
        </Card>
      )}
      {tab === 'files' && <FilesPanel project={project} />}
      {tab === 'workspace' && <WorkspacePanel project={project} threads={threads.data} />}
      {tab === 'manage' && <ManagePanel project={project} />}
    </>
  );
}
