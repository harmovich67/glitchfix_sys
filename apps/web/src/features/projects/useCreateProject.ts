import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { api, errorMessage } from '../../lib/api';

export function useCreateProject() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: () => api.post<{ id: string }>('/projects', {}),
    onSuccess: (p) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      navigate(`/app/projects/${p.id}/journey`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
}
