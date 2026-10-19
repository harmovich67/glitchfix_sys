import { Link, Navigate, useSearchParams } from 'react-router';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Rocket, Sparkles, Wrench } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { useI18n } from '../../lib/i18n';
import { cn } from '../../lib/utils';
import { Card, PageHeader } from '../../components/ui/surfaces';
import { Spinner } from '../../components/ui/feedback';
import { useCreateProject } from '../projects/useCreateProject';
import { FixRequestForm } from './FixRequestForm';

function Choice({
  icon,
  tone,
  title,
  body,
  cta,
  onClick,
  busy,
  index,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  body: string;
  cta: string;
  onClick: () => void;
  busy?: boolean;
  index: number;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={busy}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group relative flex h-full flex-col items-start gap-4 overflow-hidden rounded-2xl bg-surface p-6 text-start shadow-xs ring-1 ring-border transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-brand/40 disabled:opacity-70"
    >
      <span className={cn('flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-md [&>svg]:size-7', tone)}>{icon}</span>
      <span className="space-y-1.5">
        <span className="block text-lg font-semibold text-fg">{title}</span>
        <span className="block text-sm leading-relaxed text-muted">{body}</span>
      </span>
      <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
        {busy ? <Spinner className="size-4" /> : null}
        {cta}
        <ArrowRight className="rtl-flip size-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
      </span>
    </motion.button>
  );
}

/** "New project" entry point: a brand-new build (discovery journey) or a repair of the client's existing site. */
export default function NewRequestPage() {
  const { t } = useI18n();
  const { isClient } = useAuth();
  const [params, setParams] = useSearchParams();
  const create = useCreateProject();
  const type = params.get('type');

  if (!isClient) return <Navigate to="/app" replace />;

  if (type === 'fix')
    return (
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => setParams({}, { replace: true })} className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="rtl-flip size-4" /> {t('newRequest.back')}
        </button>
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> {t('newRequest.fixTitle')}
            </span>
          }
          title={t('fix.formTitle')}
          subtitle={t('fix.formSubtitle')}
        />
        <Card className="p-5 sm:p-7">
          <FixRequestForm />
        </Card>
      </div>
    );

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/app/projects" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
        <ArrowLeft className="rtl-flip size-4" /> {t('nav.myProjects')}
      </Link>
      <PageHeader title={t('newRequest.title')} subtitle={t('newRequest.subtitle')} />
      <div className="grid gap-4 md:grid-cols-2">
        <Choice
          index={0}
          icon={<Rocket />}
          tone="from-brand to-indigo-600"
          title={t('newRequest.newTitle')}
          body={t('newRequest.newBody')}
          cta={t('newRequest.newCta')}
          busy={create.isPending}
          onClick={() => create.mutate()}
        />
        <Choice
          index={1}
          icon={<Wrench />}
          tone="from-orange-500 to-rose-500"
          title={t('newRequest.fixTitle')}
          body={t('newRequest.fixBody')}
          cta={t('newRequest.fixCta')}
          onClick={() => setParams({ type: 'fix' })}
        />
      </div>
    </div>
  );
}
