import { describe, expect, it } from 'vitest';
import { getReportPeriods, isReportDue } from './ReportService.ts';

describe('ReportService', () => {
  const now = new Date('2026-09-28T12:00:00.000Z');

  it('uses current and previous day for daily reports', () => {
    const periods = getReportPeriods({ frequency: 'daily', now });
    expect(periods).toEqual({
      current: { from: '2026-09-28T00:00:00.000Z', to: '2026-09-28T12:00:00.000Z' },
      previous: { from: '2026-09-27T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' },
    });
  });

  it('uses current and previous Monday-based week for weekly reports', () => {
    const periods = getReportPeriods({ frequency: 'weekly', now });
    expect(periods).toEqual({
      current: { from: '2026-09-28T00:00:00.000Z', to: '2026-09-28T12:00:00.000Z' },
      previous: { from: '2026-09-21T00:00:00.000Z', to: '2026-09-28T00:00:00.000Z' },
    });
  });

  it('uses current and previous month for monthly reports', () => {
    const periods = getReportPeriods({ frequency: 'monthly', now });
    expect(periods).toEqual({
      current: { from: '2026-09-01T00:00:00.000Z', to: '2026-09-28T12:00:00.000Z' },
      previous: { from: '2026-08-01T00:00:00.000Z', to: '2026-09-01T00:00:00.000Z' },
    });
  });

  it('sends each frequency once per current period', () => {
    expect(isReportDue({ frequency: 'daily', lastSentAt: '2026-09-27T23:59:59.000Z', now })).toBe(true);
    expect(isReportDue({ frequency: 'daily', lastSentAt: '2026-09-28T00:00:00.000Z', now })).toBe(false);
    expect(isReportDue({ frequency: 'weekly', lastSentAt: '2026-09-27T23:59:59.000Z', now })).toBe(true);
    expect(isReportDue({ frequency: 'weekly', lastSentAt: '2026-09-28T00:00:00.000Z', now })).toBe(false);
    expect(isReportDue({ frequency: 'monthly', lastSentAt: '2026-08-31T23:59:59.000Z', now })).toBe(true);
    expect(isReportDue({ frequency: 'monthly', lastSentAt: '2026-09-01T00:00:00.000Z', now })).toBe(false);
  });

  it('sends a report when it has never been sent', () => {
    expect(isReportDue({ frequency: 'monthly', lastSentAt: null, now })).toBe(true);
  });
});
