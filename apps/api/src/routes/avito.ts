import { avitoCreateSchema, avitoUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const avitoRouter = createCrudRouter({
  model: 'avitoListing',
  createSchema: avitoCreateSchema,
  updateSchema: avitoUpdateSchema,
  sortFields: ['createdAt', 'updatedAt', 'price', 'title', 'status'],
  defaultSort: '-updatedAt',
  filterFields: ['status'],
});
