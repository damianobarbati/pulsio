import { faker } from '@faker-js/faker';
import type { IDomain } from 'types/Domain.ts';

export const createDomainRow = (params: Partial<IDomain.rowInsert> = {}): IDomain.rowInsert => {
  if (!params.user_id) throw new Error('createDomainRow: user_id is required');

  const result: IDomain.rowInsert = {
    user_id: params.user_id,
    domain: faker.internet.domainName(),
    ...params,
  };
  return result;
};
