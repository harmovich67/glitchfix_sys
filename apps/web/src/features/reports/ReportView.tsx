import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, errorMessage } from '../../lib/api';
import type { ProjectDetail, TechnicalReportDetail } from '../../lib/types';
import { TaskPlanDialog } from '../tickets/TaskPlanDialog';
import { ReportDocument } from './ReportDocument';
import { ShareReportDialog } from './ShareReportDialog';

/** A report plus everything a manager can do with it: send it to the team or turn it into tickets. */
export function ReportView({
  report,
  latest,
  onRegenerate,
  regenerating,
}: {
  report: TechnicalReportDetail;
  latest?: boolean;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  const qc = useQueryClient();
  const [shareOpen, setShareOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const project = useQuery({
    queryKey: ['project', report.projectId],
    queryFn: () => api.get<ProjectDetail>(`/projects/${report.projectId}`),
    enabled: report.canManage,
  });

  const unshare = useMutation({
    mutationFn: (userId: string) =>
      api.del<TechnicalReportDetail>(`/ai/projects/${report.projectId}/technical-reports/${report.id}/share/${userId}`),
    onSuccess: (data) => {
      qc.setQueryData(['report', report.id], data);
      qc.invalidateQueries({ queryKey: ['reports', report.projectId] });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <>
      <ReportDocument
        report={report}
        latest={latest}
        onShare={report.canManage ? () => setShareOpen(true) : undefined}
        onCreateTickets={report.canManage && project.data ? () => setPlanOpen(true) : undefined}
        onRegenerate={report.canManage ? onRegenerate : undefined}
        regenerating={regenerating}
        onUnshare={report.canManage ? (id) => unshare.mutate(id) : undefined}
      />
      {report.canManage && (
        <ShareReportDialog report={report} members={project.data?.members.map((m) => m.user) ?? []} open={shareOpen} onOpenChange={setShareOpen} />
      )}
      {report.canManage && project.data && (
        <TaskPlanDialog project={project.data} open={planOpen} onOpenChange={setPlanOpen} initialReportId={report.id} />
      )}
    </>
  );
}
