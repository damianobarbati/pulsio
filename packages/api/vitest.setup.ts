import { once } from 'node:events';
import { beforeAll } from 'vitest';
import { server } from '#api/index.ts';
import UserRepository from '#api/user/UserRepository.ts';
import { FOX_MULDER, JOHN_DOE } from '#dao/seeds/1-seed.ts';

beforeAll(async () => {
  global.user = await UserRepository.get(JOHN_DOE.id);
  global.user2 = await UserRepository.get(FOX_MULDER.id);

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing HTTP server address');
  global.API_URL = `http://127.0.0.1:${address.port}`;
});
