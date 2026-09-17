import { createServer } from 'node:http';
import ENV from './env.ts';
import { requestListener } from './routes.ts';

export const server = createServer(requestListener);

if (ENV.NODE_ENV !== 'test') {
  server.listen(8080, '0.0.0.0', () => console.log('Listening on port 8080'));
}
