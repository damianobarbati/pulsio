import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import { AnalyticsSchemas, type IAnalytics } from 'types/Analytics.ts';
import { CommonSchemas } from 'types/common.ts';
import AnalyticsService from '#api/analytics/AnalyticsService.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import EventRepository from '#api/event/EventRepository.ts';
import { auth, authOrShare } from '#api/middleware.ts';

export const registerAnalyticsRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/analytics/kpis',
    meta: { section: 'Analytics', description: 'Get KPIs for selected domains and date range.' },
    requestSchema: AnalyticsSchemas.kpiRequest,
    responseSchema: AnalyticsSchemas.kpiResponse,
    middlewares: [authOrShare],
    handler: AnalyticsService.kpis,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/timeseries',
    meta: { section: 'Analytics', description: 'Get metric trend for selected domains and date range.' },
    requestSchema: AnalyticsSchemas.timeseriesRequest,
    responseSchema: AnalyticsSchemas.timeseriesResponse,
    middlewares: [authOrShare],
    handler: AnalyticsService.timeseries,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/live',
    meta: { section: 'Analytics', description: 'Get current visitors for selected domains.' },
    requestSchema: AnalyticsSchemas.liveRequest,
    responseSchema: AnalyticsSchemas.liveResponse,
    middlewares: [authOrShare],
    handler: async (params: IAnalytics.liveRequest) => {
      const share_domain_id = asyncStorage.getStore()?.share_domain_id;
      if (!share_domain_id) {
        const result = await EventRepository.getLiveVisitors(params);
        return result;
      }
      if (params.domains.length !== 1) throw new AppError(403, 'DOMAIN_NOT_FOUND', 'Some domains not found.');
      const domain = await DomainRepository.get(share_domain_id);
      if (!domain || params.domains[0] !== domain.domain) throw new AppError(403, 'DOMAIN_NOT_FOUND', 'Some domains not found.');
      const result = await EventRepository.getLiveVisitors({ domains: [domain.domain] });
      return result;
    },
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/acquisition',
    meta: { section: 'Analytics', description: 'Get acquisition statistics for selected domains, date range and dimension.' },
    requestSchema: AnalyticsSchemas.acquisitionRequest,
    responseSchema: AnalyticsSchemas.acquisitionResponse,
    middlewares: [authOrShare],
    handler: AnalyticsService.acquisition,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/demographics',
    meta: { section: 'Analytics', description: 'Get user demographics for selected domains, date range and dimension.' },
    requestSchema: AnalyticsSchemas.demographicsRequest,
    responseSchema: AnalyticsSchemas.demographicsResponse,
    middlewares: [authOrShare],
    handler: AnalyticsService.demographics,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/events',
    meta: { section: 'Analytics', description: 'Get custom event statistics for selected domains and date range.' },
    requestSchema: AnalyticsSchemas.eventsRequest,
    responseSchema: AnalyticsSchemas.eventsResponse,
    middlewares: [authOrShare],
    handler: AnalyticsService.events,
  });

  registerRoute(app, {
    method: 'get',
    path: '/settings/filter-presets',
    meta: { section: 'Analytics', description: 'Get saved filters presets.' },
    requestSchema: CommonSchemas.any,
    responseSchema: CommonSchemas.any,
    middlewares: [auth('user')],
    handler: () => [],
  });
};
