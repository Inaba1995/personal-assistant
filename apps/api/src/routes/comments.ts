import { commentCreateSchema, commentUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const commentsRouter = createCrudRouter({
  model: 'comment',
  createSchema: commentCreateSchema,
  updateSchema: commentUpdateSchema,
  sortFields: ['createdAt', 'status', 'platform', 'author'],
  defaultSort: '-createdAt',
  filterFields: ['status', 'platform'],
});
