import { checkoutInputSchema, paymentInputSchema } from 'types/payment.ts';
import { PaymentService } from './PaymentService.ts';
export const PaymentController = {
  async list({ accountId }: { accountId: string }) {
    const result = await PaymentService.list({ accountId });
    return result;
  },
  async create({ input }: { input: unknown }) {
    const payment = paymentInputSchema.parse(input);
    const result = await PaymentService.create({ payment });
    return result;
  },
  async billing({ accountId, trialEndsAt }: { accountId: string; trialEndsAt: Date }) {
    const result = await PaymentService.billing({ accountId, trialEndsAt });
    return result;
  },
  async checkout({ accountId, email, trialEndsAt, input }: { accountId: string; email: string; trialEndsAt: Date; input: unknown }) {
    const checkout = checkoutInputSchema.parse(input);
    const result = await PaymentService.checkout({ accountId, email, trialEndsAt, ...checkout });
    return result;
  },
  async cancel({ accountId }: { accountId: string }) {
    const result = await PaymentService.cancel({ accountId });
    return result;
  },
  async webhook({ body, signature }: { body: string; signature: string }) {
    await PaymentService.webhook({ body, signature });
  },
};
