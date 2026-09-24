import getConfig from 'nano-fw/database/getConfig.ts';
import getDatabase from 'nano-fw/database/getDatabase.ts';
import ENV from '#api/env.ts';

const config = getConfig(ENV.DB_URI);
const pg = getDatabase(config);
await pg.raw('select 1'); // docker exec -ti pulsio-db psql $DB_URI -c "select 1"

export default config;
export { pg };
