import Repository from 'nano-fw/database/Repository.ts';
import { pg } from '#dao/pg.ts';

type UserImageRow = {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  size_bytes: string;
  data: Buffer;
};

class UserImageRepository extends Repository<UserImageRow> {
  async upsert({ user_id, data }: { user_id: string; data: Buffer }): Promise<UserImageRow> {
    const [row] = await this.db<UserImageRow>(this.configuration.tableName)
      .insert({ user_id, size_bytes: String(data.length), data })
      .onConflict('user_id')
      .merge({ size_bytes: String(data.length), data })
      .returning('*');

    return row;
  }
}

export default new UserImageRepository({ database: pg, tableName: 'users_images', uniqueSortColumn: 'id' });
