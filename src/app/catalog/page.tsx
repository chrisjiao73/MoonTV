import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getAvailableApiSites } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: { category?: string; source?: string };
}) {
  const { category, source } = searchParams;
  if (category !== 'short' && category !== 'midnight') notFound();

  const title = category === 'short' ? '短剧' : '午夜剧场';
  const activePath = `/catalog?category=${category}`;
  const sources = (await getAvailableApiSites()).filter((site) => {
    const isMidnight = /av/i.test(site.name);
    return category === 'midnight'
      ? isMidnight
      : !isMidnight && /短剧/.test(site.name);
  });
  const selected =
    sources.find((site) => site.key === source) ??
    sources.find((site) => site.key === 'changzhang_short') ??
    sources[0];
  const videos = selected ? await searchFromApi(selected, null) : [];

  return (
    <PageLayout activePath={activePath}>
      <section className='mx-auto max-w-screen-xl px-5 pt-8 sm:px-8'>
        <h1 className='text-3xl font-bold'>{title}</h1>
        {sources.length > 0 && (
          <nav aria-label='选择片源' className='my-5 flex flex-wrap gap-2'>
            {sources.map((site) => (
              <Link
                key={site.key}
                href={`${activePath}&source=${encodeURIComponent(site.key)}`}
                prefetch={false}
                aria-current={site.key === selected?.key ? 'page' : undefined}
                className='rounded-full border border-gray-400/40 px-4 py-2 text-sm aria-[current=page]:bg-green-500/20'
              >
                {site.name}
              </Link>
            ))}
          </nav>
        )}
        {videos.length === 0 && (
          <p className='my-5 text-gray-500 dark:text-gray-400'>
            {selected
              ? '片源暂未返回视频，可切换其他片源。'
              : '暂无已启用的匹配片源。'}
          </p>
        )}
        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5'>
          {videos.map((video) => (
            <VideoCard
              key={`${video.source}-${video.id}`}
              id={video.id}
              title={video.title}
              poster={video.poster}
              episodes={video.episodes.length}
              source={video.source}
              source_name={video.source_name}
              year={video.year}
              from='search'
              type={video.episodes.length > 1 ? 'tv' : 'movie'}
            />
          ))}
        </div>
      </section>
    </PageLayout>
  );
}
