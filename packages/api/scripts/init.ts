import { fileURLToPath } from 'node:url';
import AuthService from '#api/auth/AuthService.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import DomainService from '#api/domain/DomainService.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';
import ENV from '#api/env.ts';
import PlanRepository from '#api/plan/PlanRepository.ts';
import UserRepository from '#api/user/UserRepository.ts';

export const initScript = async () => {
  // create superadmin user
  let superadmin = await UserRepository.findBy({ email: ENV.SUPERADMIN_EMAIL });
  if (!superadmin) {
    const password_hash = await AuthService.hashPassword(ENV.SUPERADMIN_EMAIL);
    superadmin = await UserRepository.create({ email: ENV.SUPERADMIN_EMAIL, password_hash, role: 'superadmin' });
  }

  // create public domain share
  let domain = await DomainRepository.findBy({ domain: 'pulsio.live' });
  if (!domain) {
    domain = await DomainRepository.create({ domain: 'pulsio.live', user_id: superadmin.id });
  }

  let public_share = await DomainShareRepository.findBy({ domain_id: domain.id, label: 'Pulsio public report', revoked_at: null });
  if (!public_share) {
    public_share = await DomainShareRepository.create({ domain_id: domain.id, label: 'Pulsio public report', token_hash: DomainService.getTokenHash('initializing') });
  }

  const public_share_token = DomainService.getShareToken(public_share.id);
  if (public_share.token_hash !== DomainService.getTokenHash(public_share_token)) {
    await DomainShareRepository.update(public_share.id, { token_hash: DomainService.getTokenHash(public_share_token) });
  }

  // create plans
  const plans_exist = await PlanRepository.count();
  if (!plans_exist) {
    await PlanRepository.create([
      {
        name: 'free',
        max_domains: 1,
        max_events: 100_000,
        monthly_price: 0,
        yearly_price: 0,
        valid_from: new Date().toISOString(),
        description: 'For personal projects.',
        features: ['Analytics', 'Goals tracking', 'Revenue tracking', 'Reports'],
      },
      {
        name: 'solo',
        max_domains: 3,
        max_events: 500_000,
        monthly_price: 12,
        yearly_price: 120,
        valid_from: new Date().toISOString(),
        description: 'For freelancers and startups.',
        features: [],
      },
      {
        name: 'agency',
        max_domains: 15,
        max_events: 2_000_000,
        monthly_price: 39,
        yearly_price: 390,
        valid_from: new Date().toISOString(),
        description: 'For web and marketing agencies.',
        features: [],
      },
      {
        name: 'studio',
        max_domains: 50,
        max_events: 10_000_000,
        monthly_price: 99,
        yearly_price: 990,
        valid_from: new Date().toISOString(),
        description: 'For companies.',
        features: [],
      },
      /*
      {
        name: 'enterprise',
        max_domains: 1_000_000,
        max_events: 50_000_000,
        monthly_price: 0,
        yearly_price: 0,
        valid_from: new Date().toISOString(),
        description: 'For enterprises.',
        features: ['Custom limits', 'Managed proxy'],
      },
      */
    ]);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await initScript();
}
