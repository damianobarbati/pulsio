import { randomUUID } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import { AppError } from 'nano-fw/docs/index.ts';
import nodemailer from 'nodemailer';
import type { IUptime } from 'types/Uptime.ts';
import BillingService from '#api/billing/BillingService.ts';
import ENV from '#api/env.ts';
import PlanRepository from '#api/plan/PlanRepository.ts';
import { UptimeGroupRepository, UptimeMonitorRepository } from '#api/uptime/UptimeRepository.ts';
import { cache } from '#dao/cache.ts';
import { ch } from '#dao/ch.ts';

const mailer = nodemailer.createTransport(ENV.SMTP_URI);
const notFound = () => new AppError(404, 'UPTIME_NOT_FOUND', 'Uptime resource not found.');
const unsafe = () => new AppError(422, 'UNSAFE_URL', 'URL must resolve to a public address.');
const monitorLimitReached = () => new AppError(409, 'UPTIME_MONITOR_LIMIT_REACHED', 'Your plan monitor limit has been reached.');

const isPublicAddress = ({ address }: { address: string }) =>
  !(
    /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(address) ||
    address === '::1' ||
    address.startsWith('fe80:') ||
    address.startsWith('fc') ||
    address.startsWith('fd')
  );
const slugify = ({ label, suffix }: { label: string; suffix: string }) =>
  `${
    label
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'status'
  }-${suffix}`;

export default class UptimeService {
  static async listGroups({ user_id }: { user_id: string }) {
    return UptimeGroupRepository.getem({ user_id }, true);
  }

  static async createGroup({ user_id, label }: IUptime.groupCreate & { user_id: string }) {
    const id = randomUUID();
    return UptimeGroupRepository.create({ user_id, label, slug: slugify({ label, suffix: id.slice(0, 8) }) });
  }

  static async getOwnedGroup({ groupId, user_id }: { groupId: string; user_id: string }) {
    const group = await UptimeGroupRepository.findBy({ id: groupId, user_id });
    if (!group) throw notFound();
    return group;
  }

  static async setPublic({ groupId, user_id, public: isPublic }: { groupId: string; user_id: string; public: boolean }) {
    await UptimeService.getOwnedGroup({ groupId, user_id });
    return UptimeGroupRepository.update(groupId, { public: isPublic });
  }

  static async removeGroup({ groupId, user_id }: { groupId: string; user_id: string }) {
    await UptimeService.getOwnedGroup({ groupId, user_id });
    await UptimeGroupRepository.remove(groupId);
    return { deleted: true as const };
  }

  static async listMonitors({ groupId, user_id }: { groupId: string; user_id: string }) {
    await UptimeService.getOwnedGroup({ groupId, user_id });
    return UptimeMonitorRepository.getem({ group_id: groupId });
  }

  static async createMonitor({ user_id, groupId, ...input }: IUptime.monitorCreate & { user_id: string }) {
    await UptimeService.getOwnedGroup({ groupId, user_id });
    const usage = await UptimeService.getUsage({ user_id });
    if (usage.used >= usage.limit) throw monitorLimitReached();
    await UptimeService.assertSafeUrl({ url: input.url });
    return UptimeMonitorRepository.create({ group_id: groupId, ...input, headers: JSON.stringify(input.headers) as unknown as IUptime.monitor['headers'] });
  }

  static async getUsage({ user_id }: { user_id: string }): Promise<IUptime.usage> {
    const subscription = await BillingService.getSubscription(user_id);
    const plan = subscription?.plan_row ?? (await PlanRepository.getBy({ name: 'free' }));
    const used = await UptimeMonitorRepository.countByUserId({ user_id });
    return { used, limit: plan.max_domains * 3 };
  }

  static async setEnabled({ monitorId, user_id, enabled }: { monitorId: string; user_id: string; enabled: boolean }) {
    const monitor = await UptimeService.getOwnedMonitor({ monitorId, user_id });
    return UptimeMonitorRepository.update(monitor.id, { enabled, state: 'up', failed_at: null, notified_at: null });
  }

  static async removeMonitor({ monitorId, user_id }: { monitorId: string; user_id: string }) {
    const monitor = await UptimeService.getOwnedMonitor({ monitorId, user_id });
    await ch.command({ query: 'ALTER TABLE pings DELETE WHERE monitor_id = {monitorId:UUID}', query_params: { monitorId: monitor.id } });
    await UptimeMonitorRepository.remove(monitor.id);
    return { deleted: true as const };
  }

  static async getOwnedMonitor({ monitorId, user_id }: { monitorId: string; user_id: string }) {
    const monitor = await UptimeMonitorRepository.get(monitorId);
    if (!monitor) throw notFound();
    await UptimeService.getOwnedGroup({ groupId: monitor.group_id, user_id });
    return monitor;
  }

  static async getPublicStatus({ slug, days }: { slug: string; days: number }) {
    const group = await UptimeGroupRepository.findBy({ slug, public: true });
    if (!group) throw notFound();
    const monitors = await UptimeMonitorRepository.getem({ group_id: group.id }, true);
    const result: { label: string; state: 'up' | 'down'; uptime: number; daily: { date: string; state: string }[] }[] = [];
    for (const monitor of monitors) {
      const query = `SELECT toDate(timestamp) AS date, count() AS total, countIf(success) AS healthy FROM pings WHERE monitor_id = {monitorId:UUID} AND timestamp >= now() - INTERVAL ${days} DAY GROUP BY date ORDER BY date`;
      const response = await ch.query({ query, query_params: { monitorId: monitor.id }, format: 'JSONEachRow' });
      const daily = await response.json<{ date: string; total: string; healthy: string }>();
      const total = daily.reduce((sum, row) => sum + Number(row.total), 0);
      const healthy = daily.reduce((sum, row) => sum + Number(row.healthy), 0);
      const dailyByDate = new Map(daily.map((row) => [row.date, row]));
      const availability: { date: string; state: 'up' | 'down' | 'neutral' }[] = [];
      for (let offset = days - 1; offset >= 0; offset -= 1) {
        const date = new Date();
        date.setUTCHours(0, 0, 0, 0);
        date.setUTCDate(date.getUTCDate() - offset);
        const key = date.toISOString().slice(0, 10);
        const row = dailyByDate.get(key);
        availability.push({ date: key, state: !row ? 'neutral' : Number(row.healthy) === Number(row.total) ? 'up' : 'down' });
      }
      result.push({ label: monitor.label, state: monitor.state, uptime: total ? (healthy / total) * 100 : 0, daily: availability });
    }
    return { label: group.label, state: result.length && result.every((monitor) => monitor.state === 'up') ? 'operational' : 'degraded', monitors: result };
  }

  static async assertSafeUrl({ url }: { url: string }) {
    const target = new URL(url);
    if (!['http:', 'https:'].includes(target.protocol)) throw unsafe();
    const addresses = await lookup(target.hostname, { all: true, verbatim: true });
    if (!addresses.length || addresses.some((address) => !isPublicAddress(address))) throw unsafe();
    return addresses[0];
  }

  static async run() {
    const locked = await cache.set('uptime:probe', '1', 'EX', 55, 'NX');
    if (!locked) return;
    try {
      for (const monitor of await UptimeMonitorRepository.getem({ enabled: true })) await UptimeService.probe({ monitor });
    } finally {
      await cache.del('uptime:probe');
    }
  }

  static async probe({ monitor }: { monitor: IUptime.monitor }) {
    const timestamp = new Date().toISOString();
    const started = Date.now();
    let status: number | null = null;
    let failure_reason = '';
    try {
      const address = await UptimeService.assertSafeUrl({ url: monitor.url });
      const target = new URL(monitor.url);
      const client = target.protocol === 'https:' ? https : http;
      status = await new Promise<number>((resolve, reject) => {
        const headers = Object.fromEntries(monitor.headers.map(({ name, value }) => [name, value]));
        const request = client.get(
          {
            hostname: address.address,
            port: target.port || undefined,
            path: `${target.pathname}${target.search}`,
            headers: { ...headers, Host: target.host },
            servername: target.hostname,
            timeout: 3000,
          },
          (response) => {
            response.resume();
            resolve(response.statusCode ?? 0);
          },
        );
        request.on('timeout', () => request.destroy(new Error('Timeout')));
        request.on('error', reject);
      });
    } catch (error) {
      failure_reason = error instanceof Error ? error.message : 'Network error';
    }
    const success = status !== null && status >= 200 && status < 300;
    await ch.insert({ table: 'pings', values: [{ monitor_id: monitor.id, timestamp, success, status, duration_ms: Date.now() - started, failure_reason }], format: 'JSONEachRow' });
    if (success) return UptimeService.recover({ monitor });
    await UptimeService.fail({ monitor, timestamp });
  }

  static async fail({ monitor, timestamp }: { monitor: IUptime.monitor; timestamp: string }) {
    const failed_at = monitor.failed_at ?? timestamp;
    if (Date.parse(timestamp) - Date.parse(failed_at) < monitor.threshold_seconds * 1000) return UptimeMonitorRepository.update(monitor.id, { failed_at });
    if (monitor.notified_at) return UptimeMonitorRepository.update(monitor.id, { state: 'down', failed_at });
    await UptimeService.sendEmail({ monitor, subject: `${monitor.label} is down`, message: 'A monitor is not responding successfully.' });
    return UptimeMonitorRepository.update(monitor.id, { state: 'down', failed_at, notified_at: timestamp });
  }

  static async recover({ monitor }: { monitor: IUptime.monitor }) {
    if (monitor.notified_at) await UptimeService.sendEmail({ monitor, subject: `${monitor.label} recovered`, message: 'A monitor is responding successfully again.' });
    if (monitor.state === 'up' && !monitor.failed_at) return;
    return UptimeMonitorRepository.update(monitor.id, { state: 'up', failed_at: null, notified_at: null });
  }

  static async sendEmail({ monitor, subject, message }: { monitor: IUptime.monitor; subject: string; message: string }) {
    await mailer.sendMail({ from: ENV.EMAIL_FROM, to: monitor.recipients, subject, text: message });
  }
}
