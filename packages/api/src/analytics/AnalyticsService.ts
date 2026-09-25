import { AppError } from 'nano-fw/docs/index.ts';
import type { AnalyticsKPIRequest, AnalyticsTimeseriesRequest } from 'types/Analytics.ts';
import { requireCurrentUserId } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import EventRepository from '#api/event/EventRepository.ts';

export default class AnalyticsService {
  static async validateSelection({ domains, from, to }: AnalyticsKPIRequest) {
    if (Date.parse(to) < Date.parse(from)) throw new AppError(400, 'INVALID_DATE_RANGE', 'From must be before to.');
    if (!domains.length) throw new AppError(404, 'DOMAIN_NOT_FOUND', 'No domains found.');
    const user_id = requireCurrentUserId();
    const user_domains = await DomainRepository.getem({ user_id });
    if (!domains.every((domain) => user_domains.some((user_domain) => user_domain.domain === domain))) throw new AppError(403, 'DOMAIN_NOT_FOUND', 'Some domains not found.');
  }

  static async kpis(params: AnalyticsKPIRequest) {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getKPIs(params);
    return result;
  }

  static async timeseries(params: AnalyticsTimeseriesRequest) {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getMetricTimeseries(params);
    return result;
  }
}
