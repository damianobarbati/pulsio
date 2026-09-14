import { AppError } from 'nano-fw/docs/index.ts';
import { type AnalyticsInput, type AnalyticsQuery, filterSchema, type GoalStats, overviewSchema } from '../../../types/src/analytics.ts';
import { GoalRepository } from '../goals/GoalRepository.ts';
import { AnalyticsRepository } from './AnalyticsRepository.ts';

export const AnalyticsService = {
  async query({ siteId, input }: { siteId: string; input: AnalyticsInput }): Promise<AnalyticsQuery> {
    const to = input.to || new Date().toISOString();
    const from = input.from || new Date(Date.parse(to) - 86400000).toISOString();
    if (Date.parse(from) >= Date.parse(to) || Date.parse(to) - Date.parse(from) > 366 * 86400000)
      throw new AppError(400, 'INVALID_RANGE', 'Select a date range of up to 366 days.');
    let filters: AnalyticsQuery['filters'] = [];
    try {
      filters = filterSchema
        .array()
        .max(12)
        .parse(input.filters ? JSON.parse(input.filters) : []);
    } catch {
      throw new AppError(400, 'INVALID_FILTERS', 'Invalid analytics filters.');
    }
    if (filters.some((filter) => filter.dimension === 'property' && !filter.key)) throw new AppError(400, 'INVALID_FILTERS', 'Select a custom property key.');
    const goals = input.goal ? await GoalRepository.list({ siteId }) : [];
    const goal = goals.find((item) => item.id === input.goal);
    if (input.goal && !goal) throw new AppError(404, 'GOAL_NOT_FOUND', 'Goal not found.');
    return { siteId, from, to, filters, goal };
  },
  async overview(input: AnalyticsQuery) {
    const summary = await AnalyticsRepository.summary(input);
    const duration = Date.parse(input.to) - Date.parse(input.from);
    const previous = await AnalyticsRepository.summary({ ...input, from: new Date(Date.parse(input.from) - duration).toISOString(), to: input.from });
    const points = await AnalyticsRepository.timeline(input);
    const step = duration <= 172800000 ? 3600000 : 86400000;
    const timeline: Record<string, string | number | null>[] = [];
    for (let timestamp = Math.floor(Date.parse(input.from) / step) * step; timestamp < Date.parse(input.to); timestamp += step) {
      const label = new Date(timestamp).toISOString().replace('.000Z', 'Z');
      timeline.push(
        points.find((point) => point.label === label) || {
          label,
          visitors: 0,
          visits: 0,
          pageviews: 0,
          viewsPerVisit: 0,
          bounceRate: 0,
          visitDuration: 0,
          timeOnPage: null,
          scrollDepth: null,
        },
      );
    }
    const topPages = await AnalyticsRepository.breakdown({ ...input, dimension: 'page' });
    const sources = await AnalyticsRepository.breakdown({ ...input, dimension: 'source' });
    const definitions = await GoalRepository.list({ siteId: input.siteId });
    const denominator = input.goal ? await AnalyticsRepository.summary({ ...input, goal: undefined }) : summary;
    const goals: GoalStats[] = [];
    for (const definition of definitions) goals.push(await AnalyticsRepository.conversions({ ...input, definition, denominator: Number(denominator.visitors) }));
    const revenue = await AnalyticsRepository.revenue(input);
    const live = await AnalyticsRepository.live(input);
    const result = overviewSchema.parse({ ...live, from: input.from, to: input.to, summary, previous, timeline, topPages, sources, goals, revenue });
    return result;
  },
};
