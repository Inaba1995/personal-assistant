import { taskCreateSchema, taskUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const tasksRouter = createCrudRouter({
  model: 'task',
  createSchema: taskCreateSchema,
  updateSchema: taskUpdateSchema,
  sortFields: ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'],
  defaultSort: '-createdAt',
  filterFields: ['status', 'priority'],
});
