import { UptimeSchemas } from 'types/Uptime.ts';
import { describe, expect, it } from 'vitest';
import { UptimeGroupRepository, UptimeMonitorRepository } from '#api/uptime/UptimeRepository.ts';
import UptimeService from '#api/uptime/UptimeService.ts';

describe('UptimeService', () => {
  it('creates a group with a readable unique slug', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Production API' });

    try {
      expect(group).toMatchObject({ user_id: global.user.id, label: 'Production API', public: false });
      expect(group.slug).toMatch(/^production-api-/);
    } finally {
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('rejects a monitor for John Doe’s lvh.me domain', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Local domain' });

    try {
      await expect(
        UptimeService.createMonitor({
          user_id: global.user.id,
          groupId: group.id,
          label: 'John Doe site',
          url: 'https://lvh.me',
          auth_mode: 'none',
          headers: [],
          recipients: ['john.doe@gmail.com'],
          threshold_seconds: 60,
          enabled: true,
        }),
      ).rejects.toMatchObject({ status: 422, code: 'UNSAFE_URL' });
    } finally {
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('lists a monitor created by John Doe', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'John Doe monitors' });
    const originalAssertSafeUrl = UptimeService.assertSafeUrl;
    UptimeService.assertSafeUrl = async () => ({ address: '93.184.216.34', family: 4 });

    try {
      const monitor = await UptimeService.createMonitor({
        user_id: global.user.id,
        groupId: group.id,
        label: 'John Doe site',
        url: 'https://example.com',
        auth_mode: 'none',
        headers: [],
        recipients: ['john.doe@gmail.com'],
        threshold_seconds: 60,
        enabled: true,
      });
      const monitors = await UptimeService.listMonitors({ groupId: group.id, user_id: global.user.id });

      expect(monitors).toMatchObject([{ id: monitor.id, headers: [] }]);
      expect(UptimeSchemas.monitorList.safeParse(monitors).success).toEqual(true);
    } finally {
      UptimeService.assertSafeUrl = originalAssertSafeUrl;
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('returns monitor headers as an array', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Header response' });
    const originalAssertSafeUrl = UptimeService.assertSafeUrl;
    UptimeService.assertSafeUrl = async () => ({ address: '93.184.216.34', family: 4 });

    try {
      const monitor = await UptimeService.createMonitor({
        user_id: global.user.id,
        groupId: group.id,
        label: 'Example',
        url: 'https://example.com',
        auth_mode: 'headers',
        headers: [{ name: 'Authorization', value: 'Bearer token' }],
        recipients: ['ops@example.com'],
        threshold_seconds: 60,
        enabled: true,
      });

      expect(UptimeSchemas.monitor.safeParse(monitor).success).toEqual(true);
    } finally {
      UptimeService.assertSafeUrl = originalAssertSafeUrl;
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('reports account-wide monitor usage from the current plan', async () => {
    const usage = await UptimeService.getUsage({ user_id: global.user.id });
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Usage check' });
    const monitor = await UptimeMonitorRepository.create({
      group_id: group.id,
      label: 'Example',
      url: 'https://example.com',
      auth_mode: 'none',
      headers: [],
      recipients: ['ops@example.com'],
      threshold_seconds: 60,
      enabled: true,
    });

    try {
      const result = await UptimeService.getUsage({ user_id: global.user.id });
      expect(result).toEqual({ used: usage.used + 1, limit: usage.limit });
    } finally {
      await UptimeMonitorRepository.remove(monitor.id);
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('rejects a monitor when the account reaches its plan limit', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Plan limit' });
    const usage = await UptimeService.getUsage({ user_id: global.user.id });

    for (let index = 0; index < usage.limit; index += 1) {
      await UptimeMonitorRepository.create({
        group_id: group.id,
        label: `Monitor ${index}`,
        url: 'https://example.com',
        auth_mode: 'none',
        headers: [],
        recipients: ['ops@example.com'],
        threshold_seconds: 60,
        enabled: true,
      });
    }

    try {
      await expect(
        UptimeService.createMonitor({
          user_id: global.user.id,
          groupId: group.id,
          label: 'Over limit',
          url: 'https://example.com',
          auth_mode: 'none',
          headers: [],
          recipients: ['ops@example.com'],
          threshold_seconds: 60,
          enabled: true,
        }),
      ).rejects.toMatchObject({ status: 409, code: 'UPTIME_MONITOR_LIMIT_REACHED' });
    } finally {
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('allows an owner to enable and disable a monitor', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Monitor state' });
    const monitor = await UptimeMonitorRepository.create({
      group_id: group.id,
      label: 'Example',
      url: 'https://example.com',
      auth_mode: 'none',
      headers: [],
      recipients: ['ops@example.com'],
      threshold_seconds: 60,
      enabled: true,
    });

    try {
      const result = await UptimeService.setEnabled({ monitorId: monitor.id, user_id: global.user.id, enabled: false });
      expect(result).toMatchObject({ id: monitor.id, enabled: false, state: 'up', failed_at: null, notified_at: null });
    } finally {
      await UptimeGroupRepository.remove(group.id);
    }
  });

  it('rejects a monitor owned by another user', async () => {
    const group = await UptimeService.createGroup({ user_id: global.user.id, label: 'Private monitor' });
    const monitor = await UptimeMonitorRepository.create({
      group_id: group.id,
      label: 'Example',
      url: 'https://example.com',
      auth_mode: 'none',
      headers: [],
      recipients: ['ops@example.com'],
      threshold_seconds: 60,
      enabled: true,
    });

    try {
      await expect(UptimeService.setEnabled({ monitorId: monitor.id, user_id: global.user2.id, enabled: false })).rejects.toMatchObject({ status: 404 });
    } finally {
      await UptimeGroupRepository.remove(group.id);
    }
  });
});
