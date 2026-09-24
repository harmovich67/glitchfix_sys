import { Link, useParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { api, errorMessage } from '../../lib/api';
import { useI18n } from '../../lib/i18n';
import type { TechnicalReportDetail } from '../../lib/types';
import { Button } from '../../components/ui/button';
import { EmptyState, PageLoader } from '../../components/ui/feedback';
import { ReportView } from './ReportView';

/** Standalone report viewer — where a colleague lands from the "report shared with you" notification. */
export default function ReportPage() {
  const { id = '' } = useParams();
  const { t } = useI18n();
  const report = useQuery({ queryKey: ['report', id], queryFn: () => api.get<TechnicalReportDetail>(`/ai/technical-reports/${id}`) });

  if (report.isLoading) return <PageLoader />;
  if (!report.data)
    return (
      <EmptyState
        title="404"
        description={errorMessage(report.error) || t('report.notFound')}
        action={<Button asChild variant="secondary"><Link to="/app">{t('common.goHome')}</Link></Button>}
        className="min-h-[50vh]"
      />
    );

  const r = report.data;
  return (
    <>
      {r.canManage && (
        <Link to={`/app/projects/${r.projectId}?tab=requirements`} className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-fg">
          <ArrowLeft className="rtl-flip size-4" /> {t('report.backProject')}
        </Link>
      )}
      <ReportView report={r} />
    </>
  );
}
