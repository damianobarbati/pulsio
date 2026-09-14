import { cache } from '../../dao/cache.ts';
import { database } from '../../dao/database.ts';
import { PaymentController } from './PaymentController.ts';

try {
  const result = await PaymentController.create({ input: JSON.parse(process.argv[2] ?? '') });
  console.log(JSON.stringify(result));
} finally {
  await database.destroy();
  await cache.quit();
}
