import { type actionAddress, type txAction } from '~/server/db/schema';

export type ActionGroup = {
  action: typeof txAction.$inferInsert;
  actionAddresses: (Omit<typeof actionAddress.$inferInsert, 'actionId'> & { txIndex: number })[];
};
