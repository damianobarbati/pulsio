import type { Hono } from 'hono';
import { AppError, registerRoute } from 'nano-fw/docs/index.ts';
import { DomainSchemas } from 'types/Domain.ts';
import { ReportSchemas } from 'types/Report.ts';
import { asyncStorage } from '#api/asyncStorage.ts';
import { auth } from '#api/middleware.ts';
import ReportService from './ReportService.ts';

export const registerReportRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/domain/:domainId/report/send',
    meta: { section: 'Report', description: 'Send the current analytics report for a domain.' },
    requestSchema: DomainSchemas.idRequest,
    responseSchema: ReportSchemas.sendResponse,
    middlewares: [auth('user')],
    handler: async ({ domainId }) => {
      const user_id = asyncStorage.getStore()?.user_id;
      if (!user_id) throw new AppError(403, 'FORBIDDEN', 'This account cannot access this resource.');
      const result = await ReportService.send({ domainId, user_id });
      return result;
    },
  });
};
