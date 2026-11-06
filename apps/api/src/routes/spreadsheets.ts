import { spreadsheetCreateSchema, spreadsheetUpdateSchema } from '@assistant/shared';
import { createCrudRouter } from '../lib/crudFactory';

export const spreadsheetsRouter = createCrudRouter({
  model: 'spreadsheet',
  createSchema: spreadsheetCreateSchema,
  updateSchema: spreadsheetUpdateSchema,
  sortFields: ['createdAt', 'updatedAt', 'name'],
  defaultSort: '-updatedAt',
});
