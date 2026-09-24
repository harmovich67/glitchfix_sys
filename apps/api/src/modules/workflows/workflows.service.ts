import type { Request } from 'express';
import type { SaveWorkflowInput } from '@welco/shared';
import { badRequest, notFound } from '../../core/errors';
import { auditService } from '../audit/audit.service';
import { toDefinition, workflowsRepository } from './workflows.repository';

export const workflowsService = {
  async list() {
    const rows = await workflowsRepository.list();
    return rows.map(({ steps, _count, ...t }) => ({
      ...t,
      stepCount: steps.length,
      enabledSteps: steps.filter((s) => s.enabled).length,
      questionCount: steps.reduce((n, s) => n + s._count.questions, 0),
      projectCount: _count.projects,
    }));
  },

  async get(id: string) {
    const t = await workflowsRepository.findTree(id);
    if (!t) throw notFound('Workflow');
    return { ...toDefinition(t), id: t.id, description: t.description, isDefault: t.isDefault, updatedAt: t.updatedAt };
  },

  async defaultDefinition() {
    const t = await workflowsRepository.findDefaultTree();
    if (!t) throw badRequest('No default workflow is configured. Ask an administrator to publish one.');
    return toDefinition(t);
  },

  async create(req: Request, input: { name: string; description?: string }) {
    const t = await workflowsRepository.create(input);
    await auditService.log(req, { action: 'workflow.created', entityType: 'WorkflowTemplate', entityId: t.id });
    return this.get(t.id);
  },

  async duplicate(req: Request, id: string) {
    const src = await this.get(id);
    const copy = await workflowsRepository.create({ name: `${src.name} (copy)`, description: src.description });
    await workflowsRepository.replaceTree(copy.id, {
      name: copy.name,
      description: copy.description,
      steps: src.steps.map((s) => ({ ...s, id: undefined, questions: s.questions.map((q) => ({ ...q, id: undefined })) })),
    });
    await auditService.log(req, { action: 'workflow.duplicated', entityType: 'WorkflowTemplate', entityId: copy.id, meta: { from: id } });
    return this.get(copy.id);
  },

  async save(req: Request, id: string, input: SaveWorkflowInput) {
    const before = await workflowsRepository.findTree(id);
    if (!before) throw notFound('Workflow');
    await workflowsRepository.replaceTree(id, input);
    await auditService.log(req, {
      action: 'workflow.saved',
      entityType: 'WorkflowTemplate',
      entityId: id,
      meta: { version: before.version + 1, steps: input.steps.length, questions: input.steps.reduce((n, s) => n + s.questions.length, 0) },
    });
    return this.get(id);
  },

  async setDefault(req: Request, id: string) {
    await this.get(id);
    await workflowsRepository.setDefault(id);
    await auditService.log(req, { action: 'workflow.set_default', entityType: 'WorkflowTemplate', entityId: id });
    return this.get(id);
  },

  async remove(req: Request, id: string) {
    const t = await this.get(id);
    if (t.isDefault) throw badRequest('The default workflow cannot be deleted. Make another workflow the default first.');
    await workflowsRepository.delete(id);
    await auditService.log(req, { action: 'workflow.deleted', entityType: 'WorkflowTemplate', entityId: id, meta: { name: t.name } });
  },
};
