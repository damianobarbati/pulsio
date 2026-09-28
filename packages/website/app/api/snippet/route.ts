import { readFile } from 'node:fs/promises';

export async function GET() {
  const snippet = await readFile(new URL('../../../components/snippet.sh', import.meta.url), 'utf8');
  return new Response(snippet, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
