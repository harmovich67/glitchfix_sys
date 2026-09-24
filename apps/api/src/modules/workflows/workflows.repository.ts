import { Prisma } from '@prisma/client';
import type { Condition, QuestionOption, QuestionValidation, Translations, WorkflowDefinition } from '@welco/shared';
import { prisma } from '../../core/prisma';

const treeInclude = {
  steps: {
    orderBy: { order: 'asc' },
    include: { questions: { orderBy: { order: 'asc' } } },
  },
} satisfies Prisma.WorkflowTemplateInclude;

export type TemplateTree = Prisma.WorkflowTemplateGetPayload<{ include: typeof treeInclude }>;

export function toDefinition(t: TemplateTree): WorkflowDefinition {
  return {
    templateId: t.id,
    name: t.name,
    version: t.version,
    steps: t.steps.map((s) => ({
      id: s.id,
      key: s.key,
      title: s.title,
      description: s.description,
      icon: s.icon,
      order: s.order,
      enabled: s.enabled,
      conditions: (s.conditions as Condition | null) ?? null,
      i18n: (s.i18n as Translations | null) ?? null,
      questions: s.questions.map((q) => ({
        id: q.id,
        key: q.key,
        type: q.type as WorkflowDefinition['steps'][number]['questions'][number]['type'],
        label: q.label,
        placeholder: q.placeholder,
        helpText: q.helpText,
        required: q.required,
        enabled: q.enabled,
        order: q.order,
        options: (q.options as QuestionOption[] | null) ?? null,
        conditions: (q.conditions as Condition | null) ?? null,
        validation: (q.validation as QuestionValidation | null) ?? null,
        aiHint: q.aiHint,
        i18n: (q.i18n as Translations | null) ?? null,
      })),
    })),
  };
}

const json = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));

export const workflowsRepository = {
  list: () =>
    prisma.workflowTemplate.findMany({
      orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }],
      include: {
        steps: { select: { enabled: true, _count: { select: { questions: true } } } },
        _count: { select: { projects: true } },
      },
    }),

  findTree: (id: string) => prisma.workflowTemplate.findUnique({ where: { id }, include: treeInclude }),
  findDefaultTree: () => prisma.workflowTemplate.findFirst({ where: { isDefault: true }, include: treeInclude }),

  create: (data: { name: string; description?: string | null; isDefault?: boolean }) =>
    prisma.workflowTemplate.create({ data, include: treeInclude }),

  /** Replace the whole step/question tree atomically, keeping ids that already belong to this template. */
  async replaceTree(id: string, def: Pick<WorkflowDefinition, 'steps'> & { name: string; description?: string | null }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.workflowStep.findMany({ where: { templateId: id }, select: { id: true, questions: { select: { id: true } } } });
      const stepIds = new Set(existing.map((s) => s.id));
      const questionIds = new Set(existing.flatMap((s) => s.questions.map((q) => q.id)));
      await tx.workflowStep.deleteMany({ where: { templateId: id } });
      for (const [si, s] of def.steps.entries()) {
        await tx.workflowStep.create({
          data: {
            id: s.id && stepIds.has(s.id) ? s.id : undefined,
            templateId: id,
            key: s.key,
            title: s.title,
            description: s.description ?? null,
            icon: s.icon ?? null,
            order: si,
            enabled: s.enabled,
            conditions: json(s.conditions),
            i18n: json(s.i18n),
            questions: {
              create: s.questions.map((q, qi) => ({
                id: q.id && questionIds.has(q.id) ? q.id : undefined,
                key: q.key,
                type: q.type,
                label: q.label,
                placeholder: q.placeholder ?? null,
                helpText: q.helpText ?? null,
                required: q.required,
                enabled: q.enabled,
                order: qi,
                options: json(q.options),
                conditions: json(q.conditions),
                validation: json(q.validation),
                aiHint: q.aiHint ?? null,
                i18n: json(q.i18n),
              })),
            },
          },
        });
      }
      return tx.workflowTemplate.update({
        where: { id },
        data: { name: def.name, description: def.description ?? null, version: { increment: 1 } },
        include: treeInclude,
      });
    });
  },

  async setDefault(id: string) {
    await prisma.$transaction([
      prisma.workflowTemplate.updateMany({ data: { isDefault: false } }),
      prisma.workflowTemplate.update({ where: { id }, data: { isDefault: true } }),
    ]);
  },

  delete: (id: string) => prisma.workflowTemplate.delete({ where: { id } }),
};
