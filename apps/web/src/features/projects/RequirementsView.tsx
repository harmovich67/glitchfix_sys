import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { Pencil, Printer } from 'lucide-react';
import { tr, visibleQuestions, visibleSteps } from '@welco/shared';
import { api } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { FileItem, ProjectDetail } from '../../lib/types';
import { DynamicIcon } from '../../lib/icons';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/surfaces';
import { AnswerPreview } from '../wizard/AnswerPreview';

/** The organised requirements dossier developers work from. */
export function RequirementsView({ project }: { project: ProjectDetail }) {
  const { t, locale } = useI18n();
  const files = useQuery({ queryKey: ['files', project.id], queryFn: () => api.get<FileItem[]>(`/projects/${project.id}/files`) });
  const steps = visibleSteps(project.workflow, project.answers);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{t('hub.dossier')}</h2>
          <p className="text-xs text-muted">
            {project.template?.name} · v{project.workflow.version}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" leftIcon={<Printer className="size-4" />} onClick={() => window.print()}>
            {t('hub.print')}
          </Button>
          {project.access.canEditAnswers && (
            <Button asChild size="sm" leftIcon={<Pencil className="size-4" />}>
              <Link to={`/app/projects/${project.id}/journey`}>{t('hub.editAnswers')}</Link>
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {steps.map((s) => (
          <Card key={s.key} className="break-inside-avoid overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-border bg-surface-2/40 px-5 py-3.5">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <DynamicIcon name={s.icon} className="size-4" />
              </span>
              <p className="text-sm font-semibold">{tr(s, 'title', locale)}</p>
            </div>
            <dl className="divide-y divide-border">
              {visibleQuestions(s, project.answers).map((q) => (
                <div key={q.key} className="grid gap-1.5 px-5 py-3 sm:grid-cols-[180px_1fr] sm:gap-4">
                  <dt className="text-[13px] text-muted">{tr(q, 'label', locale)}</dt>
                  <dd className="min-w-0">
                    <AnswerPreview q={q} value={project.answers[q.key]} files={files.data ?? []} />
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
    </div>
  );
}
