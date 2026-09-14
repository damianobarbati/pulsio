import Stripe from 'stripe';
import ENV from '#api/env.ts';

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY);
