import { createHash, randomBytes } from 'node:crypto';
import { AppError } from 'nano-fw/docs/index.ts';
import type { Domain, DomainShareCreateRequest, DomainUpdateRequest } from 'types/Domain.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';
import ENV from '#api/env.ts';
import EventRepository from '#api/event/EventRepository.ts';

const getTokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const getNotFoundError = () => new AppError(404, 'DOMAIN_NOT_FOUND', 'Domain not found.');

export default class DomainService {
  static async list({ user_id }: { user_id: string }): Promise<Domain[]> {
    const domains = await DomainRepository.getem({ user_id, sort: [['domain', 'asc']] });
    return domains;
  }

  static async update({ user_id, domainId, ...input }: DomainUpdateRequest & { user_id: string }): Promise<Domain> {
    const domain = await DomainService.getOwned({ domainId, user_id });
    const report_enabled = input.report_enabled ?? domain.report_enabled;
    const report_recipients = input.report_recipients ?? domain.report_recipients;

    if (report_enabled && report_recipients.length === 0) {
      throw new AppError(422, 'REPORT_RECIPIENTS_REQUIRED', 'At least one report recipient is required when reporting is enabled.');
    }

    const update = {
      ...input,
      report_enabled,
      report_recipients: report_recipients.length ? report_recipients : domain.report_recipients,
    };
    await DomainRepository.update(domain.id, update);
    const updatedDomain = await DomainRepository.get(domain.id);
    return updatedDomain;
  }

  static async createShare({ user_id, domainId, label }: DomainShareCreateRequest & { user_id: string }) {
    await DomainService.getOwned({ domainId, user_id });
    const token = randomBytes(32).toString('base64url');
    const share = await DomainShareRepository.create({ domain_id: domainId, label, token_hash: getTokenHash(token) });
    const result = {
      id: share.id,
      label: share.label,
      url: `${ENV.WEBAPP_URL}/share/${share.id}`,
      created_at: share.created_at,
      revoked_at: share.revoked_at,
      show_revenue: share.show_revenue,
    };
    return result;
  }

  static async revokeShare({ user_id, domainId, shareId }: { user_id: string; domainId: string; shareId: string }) {
    await DomainService.getOwned({ domainId, user_id });
    const share = await DomainShareRepository.findBy({ id: shareId, domain_id: domainId, revoked_at: null }, true);
    if (!share) throw new AppError(404, 'SHARE_NOT_FOUND', 'Share link not found.');
    await DomainShareRepository.update(share.id, { revoked_at: new Date().toISOString() });
    return true as const;
  }

  static async reset({ user_id, domainId }: { user_id: string; domainId: string }) {
    const domain = await DomainService.getOwned({ domainId, user_id });
    await EventRepository.removeByDomain(domain.domain);
    await DomainRepository.update(domain.id, { events_count: 0, last_event_at: null });
    return { reset: true as const };
  }

  static async remove({ user_id, domainId }: { user_id: string; domainId: string }) {
    const domain = await DomainService.getOwned({ domainId, user_id });
    await EventRepository.removeByDomain(domain.domain);
    await DomainRepository.remove(domain.id);
    return { deleted: true as const };
  }

  private static async getOwned({ domainId, user_id }: { domainId: string; user_id: string }): Promise<Domain> {
    const domain = await DomainRepository.findBy({ id: domainId, user_id });
    if (!domain) throw getNotFoundError();
    return domain;
  }
}
