import { getAvailableApiSites } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

function normalizeTitle(title: string) {
  return title.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const title = params.get('title')?.trim();
  const id = params.get('id');
  const year = params.get('year');
  const type = params.get('type');
  if (!title || title.length > 200) {
    return new Response(null, { status: 400 });
  }

  const preferredKeys = ['ruyi', 'bfzy'];
  const available = await getAvailableApiSites();
  const sources = preferredKeys.flatMap((key) =>
    available.filter((site) => site.key === key)
  );
  const results = (
    await Promise.all(sources.map((site) => searchFromApi(site, title, 1)))
  ).flat();
  const target = normalizeTitle(title);
  const candidates = results.filter((item) => {
    if (!/^https:\/\//i.test(item.poster)) return false;
    if (item.douban_id && id) return String(item.douban_id) === id;
    if (normalizeTitle(item.title) !== target) return false;
    if (year && item.year !== year) return false;
    return type !== 'movie' || item.episodes.length === 1;
  });
  const exactId = candidates.find(
    (item) => item.douban_id && String(item.douban_id) === id
  );
  const years = new Set(
    candidates.map((item) => item.year).filter((value) => /^\d{4}$/.test(value))
  );
  const match = exactId ?? (years.size <= 1 ? candidates[0] : undefined);
  if (!match) {
    return new Response(null, {
      status: 404,
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: match.poster,
      'Cache-Control': 'private, max-age=86400',
    },
  });
}
