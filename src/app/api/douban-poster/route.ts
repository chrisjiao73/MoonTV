export const runtime = 'edge';

export async function GET(request: Request) {
  const source = new URL(request.url).searchParams.get('url') ?? '';
  if (
    !/^https:\/\/img\d+\.doubanio\.com\/view\/[\w/-]+\.jpe?g$/i.test(source)
  ) {
    return new Response(null, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(source, {
      headers: {
        Referer: 'https://movie.douban.com/',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Accept: 'image/*',
      },
      redirect: 'error',
      signal: controller.signal,
    });
    const contentType = upstream.headers.get('content-type');
    if (!upstream.ok || !contentType?.startsWith('image/')) {
      await upstream.body?.cancel();
      return new Response(null, { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
