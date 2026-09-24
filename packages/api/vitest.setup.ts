// import { once } from 'node:events';
// import { promisify } from 'node:util';
// import { afterAll, beforeAll, beforeEach } from 'vitest';
// import { ch } from '#dao/ch.ts';
// import { pg } from '#dao/pg.ts';
// import { cache } from './dao/cache.ts';
// import { server } from './src/index.ts';

// beforeEach(async () => {
//   await pg.raw('truncate users cascade');
//   await ch.command({ query: 'TRUNCATE TABLE events' });
//   await cache.flushall();
// });
//
// export let baseUrl: string;
//
// beforeAll(async () => {
//   server.listen(0, '127.0.0.1');
//   await once(server, 'listening');
//   const address = server.address();
//   if (!address || typeof address === 'string') throw new Error('Missing HTTP server address');
//   baseUrl = `http://127.0.0.1:${address.port}`;
// });
