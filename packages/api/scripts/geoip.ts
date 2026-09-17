import { createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, stat } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

const month = process.argv[2] || new Date().toISOString().slice(0, 7);

const target = new URL('../GeoLite2-City.mmdb', import.meta.url);
const today = new Date().toISOString().slice(0, 10);

if (existsSync(target)) {
  const db_stats = await stat(target);
  const db_day = db_stats.mtime.toISOString().slice(0, 10);

  if (db_day === today) {
    console.log('GeoIP database already up to date.');
    process.exit(0);
  }
}

await mkdir(new URL('../', import.meta.url), { recursive: true });

const response = await fetch(`https://download.db-ip.com/free/dbip-city-lite-${month}.mmdb.gz`);
if (!response.ok || !response.body) throw new Error(`GeoIP download failed: ${response.status}`);

const tempTarget = new URL('../GeoLite2-City.mmdb.tmp', import.meta.url);

await pipeline(Readable.from(response.body), createGunzip(), createWriteStream(tempTarget));
await rename(tempTarget, target);

console.log('GeoIP database updated');
