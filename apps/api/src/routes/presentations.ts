import { presentationCreateSchema, presentationUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const presentationsRouter = createCrudRouter({
  model: 'presentation',
  createSchema: presentationCreateSchema,
  updateSchema: presentationUpdateSchema,
  sortFields: ['createdAt', 'updatedAt', 'title'],
  defaultSort: '-updatedAt',
});
