import { Router } from 'express';
import { bulkCreateTasksSchema, createNoteSchema, createTaskSchema, updateNoteSchema, updateTaskSchema } from '@welco/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { tasksService } from './tasks.service';

export const projectTasksRoutes = Router({ mergeParams: true });
projectTasksRoutes.use(requireAuth);
projectTasksRoutes.get('/', async (req, res) => res.json(await tasksService.list(currentUser(req), param(req, 'id'))));
projectTasksRoutes.post('/', validate(createTaskSchema), async (req, res) =>
  res.status(201).json(await tasksService.create(req, currentUser(req), param(req, 'id'), req.body)),
);

projectTasksRoutes.post('/bulk', validate(bulkCreateTasksSchema), async (req, res) =>
  res.status(201).json(await tasksService.bulkCreate(req, currentUser(req), param(req, 'id'), req.body)),
);

export const tasksRoutes = Router();
tasksRoutes.use(requireAuth);
const q = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : undefined);
tasksRoutes.get('/board', async (req, res) =>
  res.json(await tasksService.board(currentUser(req), { projectId: q(req.query.projectId), assigneeId: q(req.query.assigneeId) })),
);
tasksRoutes.get('/mine', async (req, res) => res.json(await tasksService.mine(currentUser(req))));
tasksRoutes.patch('/:id', validate(updateTaskSchema), async (req, res) =>
  res.json(await tasksService.update(req, currentUser(req), param(req, 'id'), req.body)),
);
tasksRoutes.delete('/:id', async (req, res) => {
  await tasksService.remove(req, currentUser(req), param(req, 'id'));
  res.status(204).end();
});

export const projectNotesRoutes = Router({ mergeParams: true });
projectNotesRoutes.use(requireAuth);
projectNotesRoutes.get('/', async (req, res) => res.json(await tasksService.listNotes(currentUser(req), param(req, 'id'))));
projectNotesRoutes.post('/', validate(createNoteSchema), async (req, res) =>
  res.status(201).json(await tasksService.createNote(currentUser(req), param(req, 'id'), req.body)),
);

export const notesRoutes = Router();
notesRoutes.use(requireAuth);
notesRoutes.patch('/:id', validate(updateNoteSchema), async (req, res) =>
  res.json(await tasksService.updateNote(currentUser(req), param(req, 'id'), req.body.pinned)),
);
notesRoutes.delete('/:id', async (req, res) => {
  await tasksService.removeNote(currentUser(req), param(req, 'id'));
  res.status(204).end();
});
