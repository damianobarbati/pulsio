import { AppError } from 'nano-fw/docs/index.ts';
import type { IAnalytics } from 'types/Analytics.ts';
import { asyncStorage, requireCurrentUserId } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import EventRepository from '#api/event/EventRepository.ts';

export default class AnalyticsService {
  static async validateSelection({ domains, from, to }: Pick<IAnalytics.kpiRequest, 'domains' | 'from' | 'to'>): Promise<void> {
    if (Date.parse(to) < Date.parse(from)) throw new AppError(400, 'INVALID_DATE_RANGE', 'From must be before to.');
    if (!domains.length) throw new AppError(404, 'DOMAIN_NOT_FOUND', 'No domains found.');
    const share_domain_id = asyncStorage.getStore()?.share_domain_id;
    if (share_domain_id) {
      const domain = await DomainRepository.get(share_domain_id);
      if (!domain || domains.length !== 1 || domains[0] !== domain.domain) throw new AppError(403, 'DOMAIN_NOT_FOUND', 'Some domains not found.');
      return;
    }
    const user_id = requireCurrentUserId();
    const user_domains = await DomainRepository.getem({ user_id });
    if (!domains.every((domain) => user_domains.some((user_domain) => user_domain.domain === domain))) throw new AppError(403, 'DOMAIN_NOT_FOUND', 'Some domains not found.');
  }

  static async kpis(params: IAnalytics.kpiRequest): Promise<IAnalytics.kpiResponse> {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getKPIs(params);
    return result;
  }

  static async timeseries(params: IAnalytics.timeseriesRequest): Promise<IAnalytics.timeseriesResponse> {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getMetricTimeseries(params);
    return result;
  }

  static async events(params: IAnalytics.eventsRequest): Promise<IAnalytics.eventsResponse> {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getCustomEvents(params);
    return result;
  }

  static async demographics(params: IAnalytics.demographicsRequest): Promise<IAnalytics.demographicsResponse> {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getDemographics(params);
    return result;
  }

  static async acquisition(params: IAnalytics.acquisitionRequest): Promise<IAnalytics.acquisitionResponse> {
    await AnalyticsService.validateSelection(params);
    const result = await EventRepository.getAcquisition(params);
    return result;
  }
}
