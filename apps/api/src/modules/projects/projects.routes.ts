import { Router } from 'express';
import { addMemberSchema, createFixRequestSchema, createProjectSchema, projectListQuery, saveAnswersSchema, updateProjectSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { projectsService } from './projects.service';
import { fixesService } from '../fixes/fixes.service';

export const projectsRoutes = Router();

projectsRoutes.use(requireAuth);

projectsRoutes.get('/', validate(projectListQuery, 'query'), async (req, res) => {
  res.json(await projectsService.list(currentUser(req), res.locals.query));
});

projectsRoutes.post('/', validate(createProjectSchema), async (req, res) => {
  res.status(201).json(await projectsService.create(req, currentUser(req), req.body));
});

/** A repair request for the client's existing site (instead of the discovery journey). */
projectsRoutes.post('/fix', validate(createFixRequestSchema), async (req, res) => {
  res.status(201).json(await fixesService.create(req, currentUser(req), req.body));
});

projectsRoutes.get('/:id', async (req, res) => {
  res.json(await projectsService.get(currentUser(req), param(req, 'id')));
});

projectsRoutes.patch('/:id', validate(updateProjectSchema), async (req, res) => {
  res.json(await projectsService.update(req, currentUser(req), param(req, 'id'), req.body));
});

projectsRoutes.delete('/:id', async (req, res) => {
  await projectsService.remove(req, currentUser(req), param(req, 'id'));
  res.status(204).end();
});

projectsRoutes.patch('/:id/answers', validate(saveAnswersSchema), async (req, res) => {
  res.json(await projectsService.saveAnswers(req, currentUser(req), param(req, 'id'), req.body));
});

projectsRoutes.post('/:id/submit', async (req, res) => {
  res.json(await projectsService.submit(req, currentUser(req), param(req, 'id')));
});

projectsRoutes.post('/:id/approve', async (req, res) => {
  res.json(await projectsService.approve(req, currentUser(req), param(req, 'id')));
});

projectsRoutes.post('/:id/reopen', async (req, res) => {
  res.json(await projectsService.reopen(req, currentUser(req), param(req, 'id')));
});

projectsRoutes.post('/:id/members', validate(addMemberSchema), async (req, res) => {
  res.json(await projectsService.addMember(req, currentUser(req), param(req, 'id'), req.body));
});

projectsRoutes.delete('/:id/members/:userId', async (req, res) => {
  res.json(await projectsService.removeMember(req, currentUser(req), param(req, 'id'), param(req, 'userId')));
});

projectsRoutes.get('/:id/timeline', async (req, res) => {
  res.json(await projectsService.timeline(currentUser(req), param(req, 'id')));
});
