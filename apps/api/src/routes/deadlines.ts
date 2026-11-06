import { deadlineCreateSchema, deadlineUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const deadlinesRouter = createCrudRouter({
  model: 'deadline',
  createSchema: deadlineCreateSchema,
  updateSchema: deadlineUpdateSchema,
  sortFields: ['createdAt', 'date', 'title'],
  defaultSort: 'date',
  filterFields: ['taskId'],
});
