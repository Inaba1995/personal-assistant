import { contractorCreateSchema, contractorUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const contractorsRouter = createCrudRouter({
  model: 'contractor',
  createSchema: contractorCreateSchema,
  updateSchema: contractorUpdateSchema,
  sortFields: ['createdAt', 'name', 'status'],
  defaultSort: 'name',
  filterFields: ['status'],
});
