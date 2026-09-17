import getConfig from 'nano-fw/database/getConfig.ts';
import getDatabase from 'nano-fw/database/getDatabase.ts';
import ENV from '#api/env.ts';

// credentials as defined in README.md test section when spinning the pg docker container
const config = getConfig(ENV.DB_URI);
const database = getDatabase(config);
await database.raw('select 1'); // docker exec -ti pulsio-db psql $DB_URI -c "select 1"

export default config;
export { database };
