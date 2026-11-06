import { documentCreateSchema, documentUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const documentsRouter = createCrudRouter({
  model: 'document',
  createSchema: documentCreateSchema,
  updateSchema: documentUpdateSchema,
  sortFields: ['createdAt', 'updatedAt', 'title', 'type'],
  defaultSort: '-updatedAt',
  filterFields: ['type'],
});
