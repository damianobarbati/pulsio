import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import {
  AnalyticsAcquisitionRequestSchema,
  AnalyticsAcquisitionResponseSchema,
  AnalyticsDemographicsRequestSchema,
  AnalyticsDemographicsResponseSchema,
  AnalyticsEventsRequestSchema,
  AnalyticsEventsResponseSchema,
  AnalyticsKPIRequestSchema,
  AnalyticsKPIResponseSchema,
  AnalyticsLiveRequestSchema,
  AnalyticsLiveResponseSchema,
  AnalyticsTimeseriesRequestSchema,
  AnalyticsTimeseriesResponseSchema,
} from 'types/Analytics.ts';
import { AnySchema } from 'types/common.ts';
import AnalyticsService from '#api/analytics/AnalyticsService.ts';
import EventRepository from '#api/event/EventRepository.ts';
import { auth } from '#api/middleware.ts';

export const registerAnalyticsRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/analytics/kpis',
    meta: { section: 'Analytics', description: 'Get KPIs for selected domains and date range.' },
    requestSchema: AnalyticsKPIRequestSchema,
    responseSchema: AnalyticsKPIResponseSchema,
    middlewares: [auth('user')],
    handler: AnalyticsService.kpis,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/timeseries',
    meta: { section: 'Analytics', description: 'Get metric trend for selected domains and date range.' },
    requestSchema: AnalyticsTimeseriesRequestSchema,
    responseSchema: AnalyticsTimeseriesResponseSchema,
    middlewares: [auth('user')],
    handler: AnalyticsService.timeseries,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/live',
    meta: { section: 'Analytics', description: 'Get current visitors for selected domains.' },
    requestSchema: AnalyticsLiveRequestSchema,
    responseSchema: AnalyticsLiveResponseSchema,
    middlewares: [auth('user')],
    handler: EventRepository.getLiveVisitors,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/acquisition',
    meta: { section: 'Analytics', description: 'Get acquisition statistics for selected domains, date range and dimension.' },
    requestSchema: AnalyticsAcquisitionRequestSchema,
    responseSchema: AnalyticsAcquisitionResponseSchema,
    middlewares: [auth('user')],
    handler: AnalyticsService.acquisition,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/demographics',
    meta: { section: 'Analytics', description: 'Get user demographics for selected domains, date range and dimension.' },
    requestSchema: AnalyticsDemographicsRequestSchema,
    responseSchema: AnalyticsDemographicsResponseSchema,
    middlewares: [auth('user')],
    handler: AnalyticsService.demographics,
  });

  registerRoute(app, {
    method: 'post',
    path: '/analytics/events',
    meta: { section: 'Analytics', description: 'Get custom event statistics for selected domains and date range.' },
    requestSchema: AnalyticsEventsRequestSchema,
    responseSchema: AnalyticsEventsResponseSchema,
    middlewares: [auth('user')],
    handler: AnalyticsService.events,
  });

  registerRoute(app, {
    method: 'get',
    path: '/settings/filter-presets',
    meta: { section: 'Analytics', description: 'Get saved filters presets.' },
    requestSchema: AnySchema,
    responseSchema: AnySchema,
    middlewares: [auth('user')],
    handler: () => [],
  });
};
