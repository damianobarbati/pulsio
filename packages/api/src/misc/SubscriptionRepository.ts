import Repository from 'nano-fw/database/Repository.ts';
import type { ISubscription } from 'types/Subscription.ts';
import { pg } from '#dao/pg.ts';

class SubscriptionRepository extends Repository<ISubscription.subscription> {}

export default new SubscriptionRepository({ database: pg, tableName: 'subscriptions', uniqueSortColumn: 'id' });
