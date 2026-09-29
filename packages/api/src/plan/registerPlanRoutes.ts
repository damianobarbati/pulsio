import type { Hono } from 'hono';
import { registerRoute } from 'nano-fw/docs/index.ts';
import { CommonSchemas } from 'types/common.ts';
import { PlanSchemas } from 'types/Plan.ts';
import PlanRepository from '#api/plan/PlanRepository.ts';

export const registerPlanRoutes = (app: Hono) => {
  registerRoute(app, {
    method: 'post',
    path: '/plan/list',
    meta: { section: 'Plan', description: 'List available plans and prices.' },
    requestSchema: CommonSchemas.any,
    responseSchema: PlanSchemas.listResponse,
    handler: (params) => PlanRepository.getem(params),
  });
};
