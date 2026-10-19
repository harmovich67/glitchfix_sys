import type { FixRequest } from '@prisma/client';
import type { ProjectAccess } from '../projects/projects.access';
import { parseFixAnalyses } from './fix-analysis';

/** What the API returns: secrets become flags, and the AI triage is for the team only. */
export function serializeFixRequest(row: FixRequest | null | undefined, access: Pick<ProjectAccess, 'isClient'>) {
  if (!row) return null;
  const { passwordEnc, extraAccessEnc, aiAnalysis, ...rest } = row;
  return {
    ...rest,
    hasPassword: !!passwordEnc,
    hasExtraAccess: !!extraAccessEnc,
    analyses: access.isClient ? null : parseFixAnalyses(aiAnalysis),
  };
}
