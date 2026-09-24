import { AppError } from 'nano-fw/docs/index.ts';
import { asyncStorage, requireCurrentUserId } from '#api/asyncStorage.ts';
import DomainRepository from '#api/domain/DomainRepository.ts';
import EventRepository, { type OverviewBucket, type OverviewRevenue } from '#api/event/EventRepository.ts';

type OverviewParams = { domains: string[]; from: string; to: string };
type Summary = {
  visitors: number;
  visits: number;
  pageviews: number;
  viewsPerVisit: number;
  bounceRate: number;
  visitDuration: number;
  engagementRate: number;
  events: number;
  conversionRate: number;
  timeOnPage: number;
  scrollDepth: number;
};
type TimelinePoint = Summary & { label: string };
type Revenue = { currency: string; totalRevenue: number; averageRevenue: number; orders: number };

const percentage = (part: number, total: number) => (total ? (part / total) * 100 : 0);
const change = (current: number, previous: number) => (previous ? ((current - previous) / previous) * 100 : null);

const summarize = (rows: OverviewBucket[]): Summary => {
  const totals = rows.reduce(
    (total, row) => ({
      visitors: total.visitors + Number(row.visitors),
      visits: total.visits + Number(row.visits),
      pageviews: total.pageviews + Number(row.pageviews),
      events: total.events + Number(row.events),
      bounces: total.bounces + Number(row.bounces),
      engaged: total.engaged + Number(row.engaged),
      converted: total.converted + Number(row.converted),
      durationSeconds: total.durationSeconds + Number(row.duration_seconds),
      engagementSeconds: total.engagementSeconds + Number(row.engagement_seconds),
      scrollDepthTotal: total.scrollDepthTotal + Number(row.scroll_depth_total),
      scrollDepthCount: total.scrollDepthCount + Number(row.scroll_depth_count),
    }),
    {
      visitors: 0,
      visits: 0,
      pageviews: 0,
      events: 0,
      bounces: 0,
      engaged: 0,
      converted: 0,
      durationSeconds: 0,
      engagementSeconds: 0,
      scrollDepthTotal: 0,
      scrollDepthCount: 0,
    },
  );
  const summary: Summary = {
    visitors: totals.visitors,
    visits: totals.visits,
    pageviews: totals.pageviews,
    viewsPerVisit: totals.visits ? totals.pageviews / totals.visits : 0,
    bounceRate: percentage(totals.bounces, totals.visits),
    visitDuration: totals.visits ? totals.durationSeconds / totals.visits : 0,
    engagementRate: percentage(totals.engaged, totals.visits),
    events: totals.events,
    conversionRate: percentage(totals.converted, totals.visits),
    timeOnPage: totals.pageviews ? totals.engagementSeconds / totals.pageviews : 0,
    scrollDepth: totals.scrollDepthCount ? totals.scrollDepthTotal / totals.scrollDepthCount : 0,
  };
  return summary;
};

export default class AnalyticsService {
  static async overview({ domains, from, to }: OverviewParams) {
    const fromTime = Date.parse(from);
    const toTime = Date.parse(to);
    if (from >= to) throw new AppError(400, 'INVALID_DATE_RANGE', 'From must be before to.');
    if (!Number.isFinite(fromTime) || !Number.isFinite(toTime) || fromTime >= toTime) throw new RangeError('Invalid overview date range.');

    if (!domains.length) throw new AppError(404, 'DOMAIN_NOT_FOUND', 'No domains found.');

    // check all domains belong to the user
    const user_id = requireCurrentUserId();
    const user_domains = await DomainRepository.getem({ user_id });
    if (!user_domains.every((domain) => domains.includes(domain.domain))) throw new AppError(403, 'DOMAIN_NOT_FOUND', 'Some domains not found.');

    const previousFrom = new Date(fromTime - (toTime - fromTime)).toISOString();
    const query = { domains, previousFrom, from, to };
    const buckets = domains.length ? await EventRepository.getOverviewBuckets(query) : [];
    const revenueRows = domains.length ? await EventRepository.getOverviewRevenue(query) : [];
    const currentBuckets = buckets.filter((row) => row.period === 'current');
    const previousBuckets = buckets.filter((row) => row.period === 'previous');
    const summary = summarize(currentBuckets);
    const previous = summarize(previousBuckets);
    const bucketsByDay = new Map(currentBuckets.map((row) => [row.label, row]));
    const firstDay = new Date(fromTime);
    firstDay.setUTCHours(0, 0, 0, 0);
    const timeline: TimelinePoint[] = [];

    for (let day = firstDay.getTime(); day < toTime; day += 86400000) {
      const label = new Date(day).toISOString();
      const bucket = bucketsByDay.get(label.slice(0, 10));
      const point = { label, ...summarize(bucket ? [bucket] : []) };
      timeline.push(point);
    }
    const revenue: Revenue[] = revenueRows
      .filter((row) => row.period === 'current')
      .map((row) => ({
        currency: row.currency,
        totalRevenue: Number(row.totalRevenue),
        averageRevenue: Number(row.totalRevenue) / Number(row.orders),
        orders: Number(row.orders),
      }));
    const previousRevenue: OverviewRevenue[] = revenueRows.filter((row) => row.period === 'previous');
    const revenueChange =
      revenue.length === 1 && previousRevenue.length <= 1 && (!previousRevenue.length || previousRevenue[0].currency === revenue[0].currency)
        ? change(revenue[0].totalRevenue, Number(previousRevenue[0]?.totalRevenue ?? 0))
        : null;
    const result = {
      from,
      to,
      summary,
      previous,
      changes: {
        liveNow: null,
        users: change(summary.visitors, previous.visitors),
        views: change(summary.pageviews, previous.pageviews),
        sessions: change(summary.visits, previous.visits),
        sessionTime: change(summary.visitDuration, previous.visitDuration),
        engagement: change(summary.engagementRate, previous.engagementRate),
        events: change(summary.events, previous.events),
        conversion: change(summary.conversionRate, previous.conversionRate),
        revenue: revenueChange,
      },
      timeline,
      revenue,
      goals: [],
    };
    return result;
  }
}
