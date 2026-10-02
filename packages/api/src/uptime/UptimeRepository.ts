import Repository from 'nano-fw/database/Repository.ts';
import type { IUptime } from 'types/Uptime.ts';
import { pg } from '#dao/pg.ts';

class UptimeGroupStore extends Repository<IUptime.group, IUptime.group> {}
class UptimeMonitorStore extends Repository<IUptime.monitor, IUptime.monitor> {
  async hydrate(rows: IUptime.monitor[]): Promise<IUptime.monitor[]> {
    return rows.map((monitor) => ({ ...monitor, headers: Array.isArray(monitor.headers) ? monitor.headers : [] }));
  }

  async countByUserId({ user_id }: { user_id: string }): Promise<number> {
    const result = await this.db('uptime_monitors')
      .join('uptime_groups', 'uptime_monitors.group_id', 'uptime_groups.id')
      .where('uptime_groups.user_id', user_id)
      .count<{ count: string }>({ count: 'uptime_monitors.id' })
      .first();
    return Number(result?.count ?? 0);
  }
}

export const UptimeGroupRepository = new UptimeGroupStore({ database: pg, tableName: 'uptime_groups', uniqueSortColumn: 'id' });
export const UptimeMonitorRepository = new UptimeMonitorStore({ database: pg, tableName: 'uptime_monitors', uniqueSortColumn: 'id' });
