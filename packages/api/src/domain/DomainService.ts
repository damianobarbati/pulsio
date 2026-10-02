import { createHash, randomBytes } from 'node:crypto';
import { AppError } from 'nano-fw/docs/index.ts';
import type { IDomain } from 'types/Domain.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import DomainShareRepository from '#api/domain/DomainShareRepository.ts';
import ENV from '#api/env.ts';
import EventRepository from '#api/event/EventRepository.ts';

const getNotFoundError = () => new AppError(404, 'DOMAIN_NOT_FOUND', 'Domain not found.');

export default class DomainService {
  static getShareToken(shareId: string) {
    return createHash('sha256').update(shareId).digest('base64url').slice(0, 10);
  }

  static getTokenHash(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  static async list({ user_id }: { user_id: string }): Promise<IDomain.domain[]> {
    const domains = await DomainRepository.getem({ user_id, sort: [['domain', 'asc']] });
    return domains;
  }

  static async create({ user_id, domain }: IDomain.createRequest & { user_id: string }): Promise<IDomain.domain> {
    const existingDomain = await DomainRepository.findBy({ domain });
    if (existingDomain) {
      if (existingDomain.user_id !== user_id) throw new AppError(409, 'DOMAIN_ALREADY_IN_USE', 'Domain is already in use.');
      return existingDomain;
    }

    const createdDomain = await DomainRepository.create({ domain, user_id });
    return createdDomain;
  }

  static async update({ user_id, domainId, ...input }: IDomain.updateRequest & { user_id: string }): Promise<IDomain.domain> {
    const domain = await DomainService.getOwned({ domainId, user_id });
    const report_enabled = input.report_enabled ?? domain.report_enabled;
    const report_recipients = input.report_recipients ?? domain.report_recipients;

    if (report_enabled && report_recipients.length === 0) {
      throw new AppError(422, 'REPORT_RECIPIENTS_REQUIRED', 'At least one report recipient is required when reporting is enabled.');
    }

    const update = { ...input, report_enabled, report_recipients: report_recipients.length ? report_recipients : domain.report_recipients };
    const updatedDomain = await DomainRepository.update(domain.id, update);
    return updatedDomain;
  }

  static async createShare({ user_id, domainId, label }: IDomain.shareCreateRequest & { user_id: string }): Promise<IDomain.shareResponse> {
    await DomainService.getOwned({ domainId, user_id });
    const share = await DomainShareRepository.create({ domain_id: domainId, label, token_hash: DomainService.getTokenHash(randomBytes(32).toString('hex')) });
    const token = DomainService.getShareToken(share.id);
    await DomainShareRepository.update(share.id, { token_hash: DomainService.getTokenHash(token) });
    const result = {
      id: share.id,
      label: share.label,
      url: `${ENV.WEBAPP_URL}/share/${token}`,
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

  static async exportEvents({ user_id, domainId }: { user_id: string; domainId: string }): Promise<{ domain: string; csv: string }> {
    const domain = await DomainService.getOwned({ domainId, user_id });
    const csv = await EventRepository.exportByDomain(domain.domain);
    return { domain: domain.domain, csv };
  }

  static async syncEventCounts(): Promise<number> {
    const domains = await DomainRepository.getem({}, true);
    const counts = await EventRepository.getEventCounts({ domains: domains.map((domain) => domain.domain) });

    for (const domain of domains) {
      const events_count = counts[domain.domain] ?? 0;
      await DomainRepository.updateBy({ events_count }, { id: domain.id }, true);
    }

    return domains.length;
  }

  static async remove({ user_id, domainId }: { user_id: string; domainId: string }) {
    const domain = await DomainService.getOwned({ domainId, user_id });
    await EventRepository.removeByDomain(domain.domain);
    await DomainRepository.remove(domain.id);
    return { deleted: true as const };
  }

  static async removeForSuperadmin({ domainId }: { domainId: string }) {
    const domain = await DomainRepository.get(domainId);
    if (!domain) throw getNotFoundError();
    await EventRepository.removeByDomain(domain.domain);
    await DomainRepository.remove(domain.id);
    return { deleted: true as const };
  }

  static async getOwned({ domainId, user_id }: { domainId: string; user_id: string }): Promise<IDomain.domain> {
    const domain = await DomainRepository.findBy({ id: domainId, user_id });
    if (!domain) throw getNotFoundError();
    return domain;
  }
}
