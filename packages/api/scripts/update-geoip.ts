import { createWriteStream } from 'node:fs';
import { mkdir, rename } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createGunzip } from 'node:zlib';

const month = process.argv[2] || new Date().toISOString().slice(0, 7);
if (!/^\d{4}-\d{2}$/.test(month)) throw new Error('Use a YYYY-MM database release.');
const target = new URL('../data/GeoLite2-City.mmdb', import.meta.url);
await mkdir(new URL('../data/', import.meta.url), { recursive: true });
const response = await fetch(`https://download.db-ip.com/free/dbip-city-lite-${month}.mmdb.gz`);
if (!response.ok || !response.body) throw new Error(`GeoIP download failed: ${response.status}`);
await pipeline(Readable.from(response.body), createGunzip(), createWriteStream(`${target.pathname}.tmp`));
await rename(`${target.pathname}.tmp`, target);
console.log('Local GeoIP database updated. Attribution: https://db-ip.com');
