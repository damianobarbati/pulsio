import { AppError } from 'nano-fw/docs/index.ts';
import nodemailer from 'nodemailer';
import type { AnalyticsKPIResponse, Metric } from 'types/Analytics.ts';
import type { ReportFrequency, ReportSendResponse } from 'types/Report.ts';
import { Email } from 'ui/email';
import DomainRepository from '#api/domain/DomainRepository.ts';
import ENV from '#api/env.ts';
import EventRepository from '#api/event/EventRepository.ts';

const mailer = nodemailer.createTransport(ENV.SMTP_URI);

const metricLabels: Record<Metric, string> = {
  users_count: 'Visitors',
  sessions_count: 'Visits',
  pageviews_count: 'Page views',
  events_count: 'Events',
  pageviews_per_session_avg: 'Page views per visit',
  duration_per_session_avg: 'Average visit duration',
  engagement_rate: 'Engagement rate',
  conversion_rate: 'Conversion rate',
  conversions_count: 'Conversions',
  transactions_count: 'Transactions',
  revenue_sum: 'Revenue',
  revenue_per_transaction_avg: 'Average transaction value',
};

const metrics = Object.keys(metricLabels) as Metric[];
type EmailKpi = { label: string; value: string; delta: string };
type DateRange = { from: string; to: string };

const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const getCurrentPeriodStart = (frequency: ReportFrequency, now: Date) => {
  const day = startOfUtcDay(now);
  if (frequency === 'daily') return day;
  if (frequency === 'weekly') return new Date(day.getTime() - ((day.getUTCDay() + 6) % 7) * 86_400_000);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
};

const getPreviousPeriodStart = (frequency: ReportFrequency, currentStart: Date) => {
  if (frequency === 'daily') return new Date(currentStart.getTime() - 86_400_000);
  if (frequency === 'weekly') return new Date(currentStart.getTime() - 7 * 86_400_000);
  return new Date(Date.UTC(currentStart.getUTCFullYear(), currentStart.getUTCMonth() - 1, 1));
};

export const getReportPeriods = ({ frequency, now = new Date() }: { frequency: ReportFrequency; now?: Date }) => {
  const currentStart = getCurrentPeriodStart(frequency, now);
  const previousStart = getPreviousPeriodStart(frequency, currentStart);
  const current: DateRange = { from: currentStart.toISOString(), to: now.toISOString() };
  const previous: DateRange = { from: previousStart.toISOString(), to: currentStart.toISOString() };
  return { current, previous };
};

const getDelta = (value: number, previousValue: number) => {
  if (previousValue === 0) return null;
  return ((value - previousValue) / Math.abs(previousValue)) * 100;
};

const formatValue = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
const formatDelta = (delta: number | null) => (delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`);

const getOwnedDomain = async ({ domainId, user_id }: { domainId: string; user_id: string }) => {
  const domain = await DomainRepository.findBy({ id: domainId, user_id });
  if (!domain) throw new AppError(404, 'DOMAIN_NOT_FOUND', 'Domain not found.');
  return domain;
};

export default class ReportService {
  static async send({ domainId, user_id }: { domainId: string; user_id: string }): Promise<ReportSendResponse> {
    const domain = await getOwnedDomain({ domainId, user_id });
    if (!domain.report_recipients.length) throw new AppError(422, 'REPORT_RECIPIENTS_REQUIRED', 'At least one report recipient is required.');

    const periods = getReportPeriods({ frequency: domain.report_frequency });
    const kpis = await EventRepository.getKPIs({ domains: [domain.domain], ...periods.current });
    const previousKpis = await EventRepository.getKPIs({ domains: [domain.domain], ...periods.previous });
    const emailKpis = ReportService.getEmailKpis({ kpis, previousKpis });
    const html = Email.render({
      template: 'report',
      data: {
        domain: domain.domain,
        frequency: domain.report_frequency,
        periodStart: periods.current.from,
        periodEnd: periods.current.to,
        kpis: emailKpis,
      },
    });

    await mailer.sendMail({
      attachments: [{ cid: Email.logo.cid, filename: Email.logo.filename, path: Email.logo.path }],
      from: ENV.EMAIL_FROM,
      to: domain.report_recipients,
      subject: `${domain.domain} ${domain.report_frequency} analytics report`,
      html,
    });
    await DomainRepository.update(domain.id, { report_last_sent_at: new Date().toISOString() });

    return { sent: true, recipients: domain.report_recipients, frequency: domain.report_frequency, period_start: periods.current.from, period_end: periods.current.to, kpis };
  }

  static getEmailKpis({ kpis, previousKpis }: { kpis: AnalyticsKPIResponse; previousKpis: AnalyticsKPIResponse }) {
    const result: EmailKpi[] = [];
    for (const metric of metrics) {
      const value = kpis[metric];
      const delta = getDelta(value, previousKpis[metric]);
      result.push({ label: metricLabels[metric], value: formatValue(value), delta: formatDelta(delta) });
    }
    return result;
  }
}
