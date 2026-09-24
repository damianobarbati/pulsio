import { faker } from '@faker-js/faker';
import type { DomainRowInsert } from 'types/Domain.ts';

export const createDomainRow = (params: Partial<DomainRowInsert> = {}): DomainRowInsert => {
  if (!params.user_id) throw new Error('createDomainRow: user_id is required');

  const result: DomainRowInsert = {
    user_id: params.user_id,
    domain: faker.internet.domainName(),
    ...params,
  };
  return result;
};
