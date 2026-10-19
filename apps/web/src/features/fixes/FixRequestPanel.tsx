import { useState, type ReactNode } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, ExternalLink, Eye, EyeOff, ImagePlus, KeyRound, Languages, Pencil, ShieldCheck, Sparkles, Trash2, TriangleAlert, Wrench } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { FixCredentials, FixRequestDetail, ProjectDetail } from '../../lib/types';
import { FIX_SEVERITY_STYLE } from '../../lib/meta';
import { cn, timeAgo } from '../../lib/utils';
import { Button } from '../../components/ui/button';
import { Badge, Card, CardHeader, PriorityBadge } from '../../components/ui/surfaces';
import { SegmentedControl } from '../../components/ui/form';
import { Markdown } from '../../components/ui/markdown';
import { Modal } from '../../components/ui/overlay';
import { FixRequestForm } from './FixRequestForm';

type Lang = 'en' | 'ar';

const fixOf = (project: ProjectDetail) => project.fixRequest as FixRequestDetail;

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 px-5 py-3 sm:grid-cols-[150px_1fr] sm:gap-4">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 text-[13.5px] text-fg">{children}</dd>
    </div>
  );
}

/** The request as the client wrote it. The client (until approved) or a manager can correct it. */
export function FixDetailsCard({ project, onFiles }: { project: ProjectDetail; onFiles?: () => void }) {
  const { t } = useI18n();
  const fix = fixOf(project);
  const [editing, setEditing] = useState(false);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('fix.details')}
        icon={<Wrench className="size-4" />}
        action={
          <div className="flex flex-wrap justify-end gap-2">
            {onFiles && project.access.isOwner && (
              <Button size="sm" variant="secondary" leftIcon={<ImagePlus className="size-4" />} onClick={onFiles}>
                {t('fix.addScreenshots')}
              </Button>
            )}
            {project.access.canEditAnswers && (
              <Button size="sm" leftIcon={<Pencil className="size-4" />} onClick={() => setEditing(true)}>
                {t('fix.edit')}
              </Button>
            )}
          </div>
        }
      />
      <dl className="divide-y divide-border border-t border-border">
        <Row label={t('fix.siteLabel')}>
          <a href={fix.siteUrl} target="_blank" rel="noopener noreferrer nofollow" dir="ltr" className="inline-flex items-center gap-1.5 break-all font-medium text-brand hover:underline">
            {fix.siteUrl} <ExternalLink className="size-3.5 shrink-0" />
          </a>
        </Row>
        <Row label={t('fix.platformLabel')}>{fix.platform ? t(`fix.platforms.${fix.platform}`) : '—'}</Row>
        <Row label={t('fix.urgencyLabel')}>
          <span className="inline-flex items-center gap-2">
            <PriorityBadge priority={fix.urgency} />
            <span className="text-muted">{t(`fix.urgencyOptions.${fix.urgency}`)}</span>
          </span>
        </Row>
        <Row label={t('fix.reportedProblem')}>
          <p dir="auto" className="whitespace-pre-wrap leading-relaxed">{fix.problem}</p>
        </Row>
        {fix.history && (
          <Row label={t('fix.historyLabel')}>
            <p dir="auto" className="whitespace-pre-wrap leading-relaxed text-fg-2">{fix.history}</p>
          </Row>
        )}
      </dl>
      <Modal open={editing} onOpenChange={setEditing} title={t('fix.editTitle')} size="lg">
        <FixRequestForm project={project} onDone={() => setEditing(false)} />
      </Modal>
    </Card>
  );
}

function SecretRow({ label, value, mono = true }: { label: string; value: string | null; mono?: boolean }) {
  const { t } = useI18n();
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(t('common.copied'));
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <div className="flex items-start gap-3 px-5 py-2.5">
      <span className="w-28 shrink-0 pt-0.5 text-[12.5px] text-muted">{label}</span>
      <span dir="ltr" className={cn('min-w-0 flex-1 whitespace-pre-wrap break-all text-[13px] text-fg', mono && 'font-mono')}>{value}</span>
      <button type="button" onClick={copy} title={t('common.copy')} className="shrink-0 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-fg">
        <Copy className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Site access. The team decrypts it on demand (each view is audited); the client only sees what is stored.
 * Either side can wipe the secrets once the job is done.
 */
export function FixAccessCard({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const fix = fixOf(project);
  const [creds, setCreds] = useState<FixCredentials | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const canReveal = project.access.canWork;
  const canClear = (project.access.isOwner || project.access.canWork) && (fix.hasPassword || fix.hasExtraAccess);
  const anything = fix.loginUrl || fix.username || fix.hasPassword || fix.hasExtraAccess;

  const reveal = useMutation({
    mutationFn: () => api.post<FixCredentials>(`/projects/${project.id}/fix/credentials`),
    onSuccess: setCreds,
    onError: (e) => toast.error(errorMessage(e)),
  });
  const clear = useMutation({
    mutationFn: () => api.del<ProjectDetail>(`/projects/${project.id}/fix/credentials`),
    onSuccess: (p) => {
      qc.setQueryData(['project', project.id], p);
      qc.invalidateQueries({ queryKey: ['timeline', project.id] });
      setCreds(null);
      setConfirmClear(false);
      toast.success(t('fix.cleared'));
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={t('fix.accessTitle')}
        icon={<KeyRound className="size-4" />}
        action={
          canReveal && anything ? (
            creds ? (
              <Button size="sm" variant="secondary" leftIcon={<EyeOff className="size-4" />} onClick={() => setCreds(null)}>{t('fix.hide')}</Button>
            ) : (
              <Button size="sm" leftIcon={<Eye className="size-4" />} loading={reveal.isPending} onClick={() => reveal.mutate()}>{t('fix.reveal')}</Button>
            )
          ) : undefined
        }
      />
      <div className="border-t border-border py-2">
        {!anything ? (
          <p className="px-5 py-2 text-sm text-muted">{fix.credentialsClearedAt ? t('fix.accessCleared', { time: timeAgo(fix.credentialsClearedAt, locale) }) : t('fix.accessNone')}</p>
        ) : creds ? (
          <>
            <SecretRow label={t('fix.loginUrl')} value={creds.loginUrl} />
            <SecretRow label={t('fix.username')} value={creds.username} />
            <SecretRow label={t('fix.password')} value={creds.password} />
            <SecretRow label={t('fix.extraAccess')} value={creds.extraAccess} mono={false} />
          </>
        ) : (
          <ul className="space-y-1.5 px-5 py-2 text-[13px]">
            {fix.loginUrl && <li dir="ltr" className="truncate text-fg-2 rtl:text-end">{fix.loginUrl}</li>}
            {fix.username && <li dir="ltr" className="truncate font-mono text-fg-2 rtl:text-end">{fix.username}</li>}
            {fix.hasPassword && <li className="flex items-center gap-2 text-success"><ShieldCheck className="size-4" />{t('fix.storedPassword')}</li>}
            {fix.hasExtraAccess && <li className="flex items-center gap-2 text-success"><ShieldCheck className="size-4" />{t('fix.storedExtra')}</li>}
          </ul>
        )}
        {fix.credentialsClearedAt && anything && (
          <p className="px-5 pt-1 text-xs text-muted">{t('fix.accessCleared', { time: timeAgo(fix.credentialsClearedAt, locale) })}</p>
        )}
      </div>
      {(canReveal || canClear) && anything && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface-2/40 px-5 py-3">
          <p className="text-[11.5px] text-muted">{canReveal ? t('fix.revealNote') : ''}</p>
          {canClear && (
            <Button size="xs" variant="ghost" className="text-danger" leftIcon={<Trash2 className="size-3.5" />} onClick={() => setConfirmClear(true)}>
              {t('fix.clear')}
            </Button>
          )}
        </div>
      )}
      <Modal
        open={confirmClear}
        onOpenChange={setConfirmClear}
        title={t('fix.clear')}
        description={t('fix.clearConfirm')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmClear(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" loading={clear.isPending} onClick={() => clear.mutate()}>{t('common.delete')}</Button>
          </>
        }
      />
    </Card>
  );
}

/** The AI triage for the team, per language like the project brief. */
export function FixAnalysisCard({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const qc = useQueryClient();
  const fix = fixOf(project);
  const analyses = fix.analyses ?? {};
  const mine = locale as Lang;
  const other: Lang = mine === 'ar' ? 'en' : 'ar';
  const [viewing, setViewing] = useState<Lang | null>(null);
  const shownLang: Lang | null = viewing && analyses[viewing] ? viewing : analyses[mine] ? mine : analyses[other] ? other : null;
  const shown = shownLang ? analyses[shownLang] : undefined;
  const langName = (l: Lang) => t(l === 'ar' ? 'hub.langAr' : 'hub.langEn');
  const stale = !!(shown && fix.editedAt && new Date(fix.editedAt) > new Date(shown.generatedAt));

  const gen = useMutation({
    mutationFn: (target: Lang) => api.post<{ locale: Lang }>(`/projects/${project.id}/fix/analysis`, { locale: target }),
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
        title={t('fix.analysisTitle')}
        icon={<Sparkles className="size-4" />}
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {analyses.en && analyses.ar && shownLang && (
              <SegmentedControl size="sm" value={shownLang} onChange={setViewing} options={[{ value: 'ar', label: 'عربي' }, { value: 'en', label: 'EN' }]} />
            )}
            {analyses[mine] ? (
              <Button size="sm" variant="secondary" loading={gen.isPending} onClick={() => gen.mutate(shownLang ?? mine)} leftIcon={<Sparkles className="size-4" />}>
                {t('fix.reanalyze')}
              </Button>
            ) : (
              <Button size="sm" loading={gen.isPending} onClick={() => gen.mutate(mine)} leftIcon={<Sparkles className="size-4" />}>
                {shown ? t('hub.generateIn', { lang: langName(mine) }) : t('fix.analyze')}
              </Button>
            )}
          </div>
        }
      />
      <div className="px-5 pb-5">
        {shown && shownLang ? (
          <>
            <div className="mb-4 rounded-xl bg-gradient-to-br from-brand-soft/70 via-surface to-surface p-4 ring-1 ring-brand/15">
              {shown.technicalTitle && (
                <p dir={shownLang === 'ar' ? 'rtl' : 'ltr'} className="text-[15px] font-semibold text-fg">{shown.technicalTitle}</p>
              )}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <Badge className={FIX_SEVERITY_STYLE[shown.severity]}>
                  <TriangleAlert className="size-3" /> {t('fix.severity')}: {t(`fix.severities.${shown.severity}`)}
                </Badge>
                <Badge>{t('fix.category')}: {t(`fix.categories.${shown.category}`)}</Badge>
                {shown.estimateHours ? <Badge>{t('fix.estimate')}: {t('fix.hours', { n: shown.estimateHours })}</Badge> : null}
              </div>
            </div>
            {stale && (
              <p className="mb-3 flex items-center gap-2 rounded-xl bg-warning-soft/60 px-3.5 py-2.5 text-[13px] text-fg-2 ring-1 ring-warning/20">
                <TriangleAlert className="size-4 shrink-0 text-warning" /> {t('fix.analysisStale')}
              </p>
            )}
            {shownLang !== mine && !analyses[mine] && (
              <p className="mb-3 flex items-center gap-2 rounded-xl bg-info-soft/60 px-3.5 py-2.5 text-[13px] text-fg-2 ring-1 ring-info/15">
                <Languages className="size-4 shrink-0 text-info" />
                {t('hub.briefOtherLang', { lang: langName(shownLang) })}
              </p>
            )}
            <div dir={shownLang === 'ar' ? 'rtl' : 'ltr'} lang={shownLang} className="max-h-[620px] overflow-y-auto rounded-xl bg-surface-2/50 p-5 ring-1 ring-border">
              <Markdown source={shown.text} />
            </div>
            <p className="mt-2 text-[11px] text-muted">
              {t('hub.briefMeta', { time: timeAgo(shown.generatedAt, locale), lang: langName(shownLang) })}
              {shown.model ? ` · ${shown.model}` : shown.mock ? ` · ${t('common.demo')}` : ''}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">{t('fix.analysisEmpty')}</p>
        )}
      </div>
    </Card>
  );
}
