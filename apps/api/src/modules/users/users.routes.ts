import { Router } from 'express';
import { createUserSchema, updateClientSchema, updateUserSchema } from '@welco/shared';
import { requirePermission } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { currentUser, param } from '../../core/http';
import { usersService } from './users.service';

export const usersRoutes = Router();

const q = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 100) : undefined);

usersRoutes.get('/', requirePermission('users.manage'), async (req, res) => {
  res.json(await usersService.listTeam(q(req.query.q)));
});

usersRoutes.get('/assignable', requirePermission('projects.assign'), async (req, res) => {
  res.json(await usersService.assignable(currentUser(req)));
});

usersRoutes.post('/', requirePermission('users.manage'), validate(createUserSchema), async (req, res) => {
  res.status(201).json(await usersService.create(req, currentUser(req), req.body));
});

usersRoutes.patch('/:id', requirePermission('users.manage'), validate(updateUserSchema), async (req, res) => {
  res.json(await usersService.update(req, currentUser(req), param(req, 'id'), req.body));
});

export const clientsRoutes = Router();

clientsRoutes.get('/', requirePermission('clients.view'), async (req, res) => {
  res.json(await usersService.listClients(q(req.query.q)));
});

clientsRoutes.get('/:id', requirePermission('clients.view'), async (req, res) => {
  res.json(await usersService.getClient(param(req, 'id')));
});

clientsRoutes.patch('/:id', requirePermission('clients.view', 'projects.manage'), validate(updateClientSchema), async (req, res) => {
  res.json(await usersService.updateClient(req, param(req, 'id'), req.body));
});
