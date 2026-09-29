import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { AnySchema } from 'types/common.ts';
import { PlanListResponseSchema } from 'types/Plan.ts';
import PlanRepository from '#api/plan/PlanRepository.ts';

export const registerPlanRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/plan/list',
    meta: { section: 'Plan', description: 'List available plans and prices.' },
    requestSchema: AnySchema,
    responseSchema: PlanListResponseSchema,
    handler: (params) => PlanRepository.getem(params),
  });
};
